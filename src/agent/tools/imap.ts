import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import type Database from 'better-sqlite3';
import { env } from '../../lib/env.js';

export interface InboundEmail {
  id: number;
  messageId: string;
  fromEmail: string;
  fromName: string;
  toEmail?: string;
  subject: string;
  bodyText: string;
  inReplyTo?: string;
  references?: string;
  receivedAt: string;
}

function makeClient(): ImapFlow {
  return new ImapFlow({
    host: 'imap.easymail.ca',
    port: 993,
    secure: true,
    auth: {
      user: env.EASYMAIL_EMAIL!,
      pass: env.EASYMAIL_PASSWORD!,
    },
    logger: false,
  });
}

/** Pulls UNSEEN messages from INBOX into SQLite, marks them \Seen. */
export async function syncInbox(db: Database.Database): Promise<void> {
  const client = makeClient();
  await client.connect();

  try {
    const lock = await client.getMailboxLock('INBOX');
    try {
      const uids = await client.search({ seen: false }, { uid: true });
      if (uids.length === 0) return;

      const insert = db.prepare(`
        INSERT OR IGNORE INTO inbound_emails
          (message_id, imap_uid, received_at, from_email, from_name, to_email, subject, body_text, in_reply_to, ref_chain)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const seenUids: number[] = [];

      for await (const msg of client.fetch(uids, { uid: true, source: true }, { uid: true })) {
        const parsed = await simpleParser(msg.source);
        const messageId = parsed.messageId ?? `uid-${msg.uid}@imap`;
        const fromAddr = parsed.from?.value?.[0];
        const toAddr = parsed.to?.value?.[0];
        const refs = parsed.references;

        insert.run(
          messageId,
          msg.uid,
          (parsed.date ?? new Date()).toISOString(),
          fromAddr?.address ?? '',
          fromAddr?.name ?? '',
          toAddr?.address ?? null,
          parsed.subject ?? '(no subject)',
          parsed.text ?? '',
          parsed.inReplyTo ?? null,
          Array.isArray(refs) ? refs.join(' ') : (refs ?? null),
        );

        seenUids.push(msg.uid);
      }

      if (seenUids.length > 0) {
        await client.messageFlagsAdd(seenUids, ['\\Seen'], { uid: true });
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }
}

/** Returns unprocessed rows, optionally filtered to a specific recipient. */
export function getPendingEmails(db: Database.Database, toEmail?: string): InboundEmail[] {
  type Row = {
    id: number; message_id: string; from_email: string; from_name: string | null;
    to_email: string | null; subject: string | null; body_text: string | null;
    in_reply_to: string | null; ref_chain: string | null; received_at: string;
  };

  const sql = toEmail
    ? `SELECT id, message_id, from_email, from_name, to_email, subject, body_text,
              in_reply_to, ref_chain, received_at
       FROM inbound_emails
       WHERE processed_at IS NULL AND to_email = ?
       ORDER BY received_at ASC`
    : `SELECT id, message_id, from_email, from_name, to_email, subject, body_text,
              in_reply_to, ref_chain, received_at
       FROM inbound_emails
       WHERE processed_at IS NULL
       ORDER BY received_at ASC`;

  const params = toEmail ? [toEmail] : [];
  const rows = db.prepare(sql).all(...params) as Row[];

  return rows.map(r => ({
    id: r.id,
    messageId: r.message_id,
    fromEmail: r.from_email,
    fromName: r.from_name ?? '',
    toEmail: r.to_email ?? undefined,
    subject: r.subject ?? '(no subject)',
    bodyText: r.body_text ?? '',
    inReplyTo: r.in_reply_to ?? undefined,
    references: r.ref_chain ?? undefined,
    receivedAt: r.received_at,
  }));
}
