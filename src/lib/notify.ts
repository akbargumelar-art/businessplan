/**
 * Notification helper — sends email + creates in-app Notification row.
 * Email transport:
 *   - Dev (default): console-only, just logs the email
 *   - Prod: SMTP via env (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM)
 *
 * In-app notifications stored in `notifications` table (always).
 */

import { prisma } from './prisma';

type EmailRecipient = { email: string; name?: string | null };

type SendOpts = {
  to: EmailRecipient[];
  subject: string;
  html: string;
  text?: string;
};

const SMTP_ENABLED =
  !!process.env.SMTP_HOST && !!process.env.SMTP_USER && !!process.env.SMTP_PASS;

async function sendViaSmtp(opts: SendOpts): Promise<void> {
  // Dynamic import so dev without nodemailer dep still works.
  // Use Function-based dynamic import to avoid TS resolving the module at compile time.
  // To enable: `npm install nodemailer @types/nodemailer` and set SMTP_* env vars.
  const dynImport = new Function('m', 'return import(m)');
  const mod = await dynImport('nodemailer').catch(() => null);
  const nodemailer = mod?.default ?? mod;
  if (!nodemailer || typeof nodemailer.createTransport !== 'function') {
    console.warn('[notify] SMTP env present but nodemailer not installed — falling back to console');
    return logToConsole(opts);
  }
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? `"${process.env.APP_NAME ?? 'Business Plan'}" <noreply@local>`,
    to: opts.to.map((r) => (r.name ? `"${r.name}" <${r.email}>` : r.email)).join(', '),
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  });
}

function logToConsole(opts: SendOpts) {
  const lines = [
    `┌─ EMAIL (dev console transport) ${'─'.repeat(40)}`,
    `│ To: ${opts.to.map((r) => `${r.name ?? ''} <${r.email}>`).join(', ')}`,
    `│ Subject: ${opts.subject}`,
    `│`,
    ...(opts.text ?? opts.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()).split('\n').map((l) => `│ ${l}`),
    `└${'─'.repeat(70)}`,
  ];
  console.log(lines.join('\n'));
}

export async function sendEmail(opts: SendOpts) {
  if (SMTP_ENABLED) {
    try { await sendViaSmtp(opts); return; }
    catch (e) { console.error('[notify] SMTP failed, fallback to console:', e); }
  }
  logToConsole(opts);
}

/**
 * Create in-app notification + send email.
 */
export async function notify(opts: {
  userIds: number[];
  type: string;
  title: string;
  body?: string;
  link?: string;
  emailHtml?: string;
}) {
  if (opts.userIds.length === 0) return;

  const users = await prisma.user.findMany({
    where: { id: { in: opts.userIds }, active: true },
    select: { id: true, email: true, name: true },
  });
  if (users.length === 0) return;

  // In-app
  await prisma.notification.createMany({
    data: users.map((u) => ({
      userId: u.id,
      type: opts.type,
      title: opts.title,
      body: opts.body ?? null,
      link: opts.link ?? null,
    })),
  });

  // Email
  await sendEmail({
    to: users.map((u) => ({ email: u.email, name: u.name })),
    subject: opts.title,
    html: opts.emailHtml ?? `<p>${opts.body ?? opts.title}</p>${opts.link ? `<p><a href="${opts.link}">Buka di sistem</a></p>` : ''}`,
    text: `${opts.body ?? opts.title}${opts.link ? `\n\nLink: ${opts.link}` : ''}`,
  });
}

/**
 * Helper: find next-in-flow approver(s) for LPJ workflow.
 */
export async function getNextLpjApprovers(
  newStatus: 'submitted' | 'supervisor_reviewed' | 'admin_approved' | 'rejected',
  creatorId: number,
): Promise<number[]> {
  if (newStatus === 'submitted') {
    // Notify supervisor (creator's supervisor) + admins
    const creator = await prisma.user.findUnique({
      where: { id: creatorId },
      select: { supervisorId: true },
    });
    const supIds = creator?.supervisorId ? [creator.supervisorId] : [];
    const admins = await prisma.user.findMany({ where: { role: 'admin', active: true }, select: { id: true } });
    return Array.from(new Set([...supIds, ...admins.map((a) => a.id)]));
  }
  if (newStatus === 'supervisor_reviewed') {
    // Notify admins
    const admins = await prisma.user.findMany({ where: { role: 'admin', active: true }, select: { id: true } });
    return admins.map((a) => a.id);
  }
  if (newStatus === 'admin_approved' || newStatus === 'rejected') {
    // Notify creator
    return [creatorId];
  }
  return [];
}

export async function getNextReallocationApprovers(
  newStatus: 'submitted' | 'supervisor_reviewed' | 'admin_approved' | 'rejected',
  requesterId: number,
): Promise<number[]> {
  // same flow as LPJ
  return getNextLpjApprovers(newStatus, requesterId);
}
