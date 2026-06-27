/**
 * Email HTML builders. Kept free of `server-only` so they can be reused by
 * one-off test scripts (tsx) as well as the server-side mailer in
 * src/services/email.ts.
 */

export function welcomeEmailHtml({
  to,
  name,
  role,
  password,
}: {
  to: string;
  name: string;
  role: string;
  password: string;
}): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
        <tr>
          <td style="background:#ffffff;padding:32px 40px 28px;text-align:center;border-bottom:3px solid #f6821f">
            <img src="https://app.doorsmith.in/logo.png" alt="DoorSmith" style="height:44px;margin-bottom:18px;display:inline-block" />
            <h1 style="margin:0;color:#f6821f;font-size:26px;font-weight:700">Welcome to DoorSmith!</h1>
            <p style="margin:8px 0 0;color:#9ca3af;font-size:14px">Your Karigar Rewards Platform</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px">
            <p style="margin:0 0 16px;color:#374151;font-size:16px">Hi <strong>${name}</strong>,</p>
            <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.6">
              You have been invited to join <strong>DoorSmith</strong> as a <strong style="color:#f6821f">${role}</strong>.
              Your account has been created and is ready to use.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff8f3;border:1px solid #fde8d4;border-radius:8px;margin-bottom:28px">
              <tr><td style="padding:20px">
                <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#f6821f;text-transform:uppercase;letter-spacing:0.5px">Your Login Details</p>
                <table width="100%" cellpadding="6" cellspacing="0">
                  <tr>
                    <td style="font-size:13px;color:#9ca3af;width:80px">Email</td>
                    <td style="font-size:14px;color:#111827;font-weight:600">${to}</td>
                  </tr>
                  <tr>
                    <td style="font-size:13px;color:#9ca3af">Password</td>
                    <td style="font-size:14px;color:#111827;font-family:monospace;font-weight:700;letter-spacing:1px">${password}</td>
                  </tr>
                  <tr>
                    <td style="font-size:13px;color:#9ca3af">Role</td>
                    <td style="font-size:14px;color:#111827">${role}</td>
                  </tr>
                </table>
              </td></tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px">
              <tr><td align="center">
                <a href="https://app.doorsmith.in/login" style="display:inline-block;background:#f6821f;color:#ffffff;font-size:15px;font-weight:700;padding:14px 36px;border-radius:8px;text-decoration:none">
                  Login to DoorSmith →
                </a>
              </td></tr>
            </table>
            <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6">
              For security, please change your password after your first login.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:24px 40px;text-align:center">
            <p style="margin:0 0 4px;font-size:12px;color:#9ca3af">DoorSmith Karigar Rewards Platform</p>
            <p style="margin:0;font-size:12px;color:#d1d5db">LR Enterprises · Hisar, Haryana</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
