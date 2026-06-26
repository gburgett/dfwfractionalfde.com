import nodemailer from 'nodemailer';
import { site } from '../../data/site.js';
import { env } from '../../lib/env.js';

const transporter = nodemailer.createTransport({
  host: 'mailout.easymail.ca',
  port: 587,
  secure: false,  // false = STARTTLS on 587
  auth: {
    user: env.EASYMAIL_EMAIL,
    pass: env.EASYMAIL_PASSWORD,
  },
});

export async function sendEmail(opts: {
  to: string;
  toName: string;
  subject: string;
  text: string;
  html?: string;
  inReplyTo?: string;
  references?: string;
}): Promise<string> {
  const from = env.EASYMAIL_AGENT_EMAIL ?? env.EASYMAIL_EMAIL ?? site.contactEmail;
  const info = await transporter.sendMail({
    from: `"Daneel, AI assistant to ${site.owner.name}" <${from}>`,
    to: `"${opts.toName}" <${opts.to}>`,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
    inReplyTo: opts.inReplyTo,
    references: opts.references,
  });
  return info.messageId;
}
