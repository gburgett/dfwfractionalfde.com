---
name: easymail
description: How to send outbound email and read/respond to inbound email using easyDNS EasyMail via SMTP and IMAP. No REST API — uses standard protocols via nodemailer (send) and imapflow (receive).
metadata:
  type: skill
---

# EasyMail Integration

easyDNS EasyMail is a hosted email service using standard SMTP/IMAP protocols. There is **no proprietary REST API** — all access is via standard email protocols.

## Connection Settings

| Protocol | Host | Port | Security |
|----------|------|------|----------|
| SMTP (send) | `mailout.easymail.ca` | 587 | STARTTLS |
| SMTP (send, SSL) | `mailout.easymail.ca` | 465 | SSL/TLS |
| IMAP (read) | `imap.easymail.ca` | 993 | SSL/TLS (recommended) |
| IMAP (read) | `imap.easymail.ca` | 143 | STARTTLS |
| POP3 (read) | `pop.easymail.ca` | 995 | SSL/TLS |

**Authentication:** full email address (e.g. `you@yourdomain.com`) as username + account password.

**Sending limits:** 250 messages/day on the base tier. Max message size: 150 MB.

## Environment Variables

```
EASYMAIL_EMAIL=you@yourdomain.com          # primary account used for IMAP auth
EASYMAIL_PASSWORD=your-account-password
EASYMAIL_AGENT_EMAIL=agent@yourdomain.com  # optional: override From address for agent-sent mail
```

## Required Packages

```bash
pnpm add nodemailer imapflow
pnpm add -D @types/nodemailer
```

## 1. Sending Outbound Email

Use `nodemailer` with the SMTP settings above.

```typescript
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'mailout.easymail.ca',
  port: 587,
  secure: false,     // false = STARTTLS on port 587
  auth: {
    user: process.env.EASYMAIL_EMAIL,
    pass: process.env.EASYMAIL_PASSWORD,
  },
});

export async function sendEmail(opts: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  inReplyTo?: string;  // Message-ID of email being replied to
  references?: string; // Message-ID chain for threading
}) {
  const info = await transporter.sendMail({
    from: `"Gordon Burgett" <${process.env.EASYMAIL_EMAIL}>`,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
    replyTo: opts.replyTo,
    inReplyTo: opts.inReplyTo,
    references: opts.references,
  });
  return info.messageId;
}
```

## 2. Reading Inbound Email via IMAP

Use `imapflow` — it is modern, async/await native, and handles reconnection cleanly.

### Fetch new (unseen) messages

```typescript
import { ImapFlow } from 'imapflow';

const client = new ImapFlow({
  host: 'imap.easymail.ca',
  port: 993,
  secure: true,
  auth: {
    user: process.env.EASYMAIL_EMAIL!,
    pass: process.env.EASYMAIL_PASSWORD!,
  },
  logger: false,  // set to true to debug IMAP traffic
});

export interface InboundEmail {
  uid: number;
  messageId: string;
  from: string;
  subject: string;
  textBody: string;
  htmlBody?: string;
  inReplyTo?: string;
  references?: string;
  date: Date;
}

export async function fetchNewEmails(): Promise<InboundEmail[]> {
  const emails: InboundEmail[] = [];

  await client.connect();
  try {
    await client.mailboxOpen('INBOX');

    // Fetch all UNSEEN messages
    for await (const message of client.fetch('1:*', {
      uid: true,
      envelope: true,
      bodyStructure: true,
      source: false,
    })) {
      if (!message.flags.has('\\Seen')) {
        // Fetch the full message to get body
        const msg = await client.fetchOne(String(message.uid), {
          uid: true,
          envelope: true,
          bodyParts: ['text', 'html'],
        }, { uid: true });

        const textBody = msg.bodyParts?.get('text')?.toString('utf-8') ?? '';
        const htmlBody = msg.bodyParts?.get('html')?.toString('utf-8');

        emails.push({
          uid: message.uid,
          messageId: message.envelope.messageId ?? '',
          from: message.envelope.from?.[0]?.address ?? '',
          subject: message.envelope.subject ?? '',
          textBody,
          htmlBody,
          inReplyTo: message.envelope.inReplyTo,
          references: undefined,  // parse from headers if needed
          date: message.envelope.date ?? new Date(),
        });
      }
    }
  } finally {
    await client.logout();
  }

  return emails;
}
```

### Mark a message as read

```typescript
export async function markAsRead(uid: number) {
  await client.connect();
  try {
    await client.mailboxOpen('INBOX');
    await client.messageFlagsAdd(String(uid), ['\\Seen'], { uid: true });
  } finally {
    await client.logout();
  }
}
```

## 3. Responding to an Inbound Email

To reply, send an outbound email with proper threading headers:

```typescript
export async function replyToEmail(original: InboundEmail, replyText: string) {
  const subject = original.subject.startsWith('Re:')
    ? original.subject
    : `Re: ${original.subject}`;

  return sendEmail({
    to: original.from,
    subject,
    text: replyText,
    inReplyTo: original.messageId,
    references: original.messageId,
  });
}
```

## 4. Tracking with SQLite

Use `better-sqlite3` to track which emails have been processed and prevent double-replies.

```bash
pnpm add better-sqlite3
pnpm add -D @types/better-sqlite3
```

```typescript
import Database from 'better-sqlite3';
import path from 'node:path';

const DB_PATH = process.env.DB_PATH ?? './data/agent.db';
const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS processed_emails (
    uid        INTEGER PRIMARY KEY,
    message_id TEXT NOT NULL,
    from_addr  TEXT NOT NULL,
    subject    TEXT NOT NULL,
    received_at TEXT NOT NULL,
    replied_at  TEXT,
    reply_text  TEXT
  );

  CREATE TABLE IF NOT EXISTS sent_emails (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    to_addr     TEXT NOT NULL,
    subject     TEXT NOT NULL,
    body        TEXT NOT NULL,
    sent_at     TEXT NOT NULL,
    in_reply_to TEXT
  );
`);

export function isAlreadyProcessed(uid: number): boolean {
  return !!db.prepare('SELECT 1 FROM processed_emails WHERE uid = ?').get(uid);
}

export function markProcessed(email: InboundEmail, replyText?: string) {
  db.prepare(`
    INSERT OR IGNORE INTO processed_emails (uid, message_id, from_addr, subject, received_at, replied_at, reply_text)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    email.uid,
    email.messageId,
    email.from,
    email.subject,
    email.date.toISOString(),
    replyText ? new Date().toISOString() : null,
    replyText ?? null,
  );
}

export function recordSentEmail(opts: {
  to: string;
  subject: string;
  body: string;
  inReplyTo?: string;
}) {
  db.prepare(`
    INSERT INTO sent_emails (to_addr, subject, body, sent_at, in_reply_to)
    VALUES (?, ?, ?, ?, ?)
  `).run(opts.to, opts.subject, opts.body, new Date().toISOString(), opts.inReplyTo ?? null);
}
```

## 5. Full Inbound Processing Loop

```typescript
export async function processNewEmails(
  handleEmail: (email: InboundEmail) => Promise<string | null>
) {
  const emails = await fetchNewEmails();

  for (const email of emails) {
    if (isAlreadyProcessed(email.uid)) continue;

    const replyText = await handleEmail(email);

    if (replyText) {
      await replyToEmail(email, replyText);
      recordSentEmail({
        to: email.from,
        subject: `Re: ${email.subject}`,
        body: replyText,
        inReplyTo: email.messageId,
      });
    }

    await markAsRead(email.uid);
    markProcessed(email, replyText ?? undefined);
  }
}
```

## Domain Authorization Notes

- SPF must include easyMail's servers (handled automatically for easyDNS-registered domains).
- DKIM must be configured for your sending domain.
- You can only send from addresses on domains authorized for your easyMail account.
- External domains require contacting easyDNS support or adding a DNS verification record.

## Polling Strategy

EasyMail has no webhook/push support for inbound email. Use a polling approach:

- **Development:** poll every 30–60 seconds via `setInterval` or a cron-style scheduler.
- **Production:** call `processNewEmails()` from a scheduled job or from the API server on a timer.
- Store the last-checked timestamp in SQLite to avoid re-scanning the entire INBOX on each poll (use IMAP `SINCE` search criteria for efficiency).

### Efficient polling with SINCE search

```typescript
import { ImapFlow } from 'imapflow';
import { SearchObject } from 'imapflow';

export async function fetchEmailsSince(since: Date): Promise<InboundEmail[]> {
  const emails: InboundEmail[] = [];
  await client.connect();
  try {
    await client.mailboxOpen('INBOX');
    const searchCriteria: SearchObject = {
      seen: false,
      since,
    };
    const uids = await client.search(searchCriteria, { uid: true });
    for (const uid of uids) {
      const msg = await client.fetchOne(String(uid), {
        uid: true,
        envelope: true,
        bodyParts: ['text', 'html'],
      }, { uid: true });
      if (!msg) continue;
      emails.push({
        uid,
        messageId: msg.envelope.messageId ?? '',
        from: msg.envelope.from?.[0]?.address ?? '',
        subject: msg.envelope.subject ?? '',
        textBody: msg.bodyParts?.get('text')?.toString('utf-8') ?? '',
        htmlBody: msg.bodyParts?.get('html')?.toString('utf-8'),
        inReplyTo: msg.envelope.inReplyTo,
        references: undefined,
        date: msg.envelope.date ?? new Date(),
      });
    }
  } finally {
    await client.logout();
  }
  return emails;
}
```
