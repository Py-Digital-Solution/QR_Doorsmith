import "server-only";
import nodemailer from "nodemailer";
import { env } from "@/lib/env";

function getTransport() {
  if (!env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT ?? 587,
    secure: (env.SMTP_PORT ?? 587) === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });
}

export async function sendWelcomeEmail({
  to,
  name,
  role,
  password,
}: {
  to: string;
  name: string;
  role: string;
  password: string;
}): Promise<void> {
  const transport = getTransport();
  const from = env.SMTP_FROM ?? "DoorSmith <no-reply@doorsmith.app>";

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
      <h2 style="color:#0f2444">Welcome to DoorSmith, ${name}!</h2>
      <p>Your <strong>${role}</strong> account has been created.</p>
      <table style="border-collapse:collapse;width:100%;margin:16px 0">
        <tr><td style="padding:8px;color:#666;font-size:14px">Email</td><td style="padding:8px;font-size:14px"><strong>${to}</strong></td></tr>
        <tr style="background:#f9f9f9"><td style="padding:8px;color:#666;font-size:14px">Password</td><td style="padding:8px;font-size:14px;font-family:monospace"><strong>${password}</strong></td></tr>
      </table>
      <p style="font-size:13px;color:#888">Please log in and change your password as soon as possible.</p>
      <p style="font-size:12px;color:#aaa;margin-top:32px">DoorSmith Khati Rewards Platform</p>
    </div>
  `;

  if (!transport) {
    console.log(
      `\n[EMAIL][dev] Welcome email to ${to} (${name} / ${role})\nPassword: ${password}\n`,
    );
    return;
  }

  await transport.sendMail({ from, to, subject: `Welcome to DoorSmith — your account details`, html });
}

export async function sendWaFailureAlert({
  to,
  phone,
  type,
  error,
  message,
}: {
  to: string;
  phone: string;
  type: string;
  error: string;
  message: string;
}): Promise<void> {
  const transport = getTransport();
  const from = env.SMTP_FROM ?? "DoorSmith <no-reply@doorsmith.app>";

  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
      <h2 style="color:#b91c1c">WhatsApp message failed</h2>
      <table style="border-collapse:collapse;width:100%;margin:16px 0;font-size:14px">
        <tr><td style="padding:8px;color:#666;width:100px">Type</td><td style="padding:8px"><strong>${type}</strong></td></tr>
        <tr style="background:#f9f9f9"><td style="padding:8px;color:#666">Phone</td><td style="padding:8px;font-family:monospace">${phone}</td></tr>
        <tr><td style="padding:8px;color:#666">Error</td><td style="padding:8px;color:#b91c1c">${error}</td></tr>
        <tr style="background:#f9f9f9"><td style="padding:8px;color:#666;vertical-align:top">Message</td><td style="padding:8px;white-space:pre-wrap;color:#374151">${message.slice(0, 300)}</td></tr>
      </table>
      <p style="font-size:12px;color:#aaa;margin-top:32px">DoorSmith — WhatsApp audit alert</p>
    </div>
  `;

  if (!transport) {
    console.error(`[EMAIL][dev] WA failure alert to ${to}: ${error}`);
    return;
  }

  await transport.sendMail({ from, to, subject: `[DoorSmith] WhatsApp message failed — ${type}`, html });
}
