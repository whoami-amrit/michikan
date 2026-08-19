const ICON_URL = 'https://www.michikan.dev/icon-email.png';
const BRAND_COLOR = '#8c52ff';

interface OtpVerificationEmailContent {
  subject: string;
  html: string;
  text: string;
}

export function buildOtpVerificationEmail(
  otp: number,
  expiryMinutes: number,
): OtpVerificationEmailContent {
  const subject = 'Your Michikan verification code';

  const html = `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${subject}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:12px;overflow:hidden;">
            <tr>
              <td align="center" style="padding:32px 32px 8px 32px;">
                <img src="${ICON_URL}" alt="Michikan" width="40" height="40" style="display:block;" />
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:8px 32px 0 32px;">
                <h1 style="margin:0;font-size:20px;line-height:28px;color:#111111;font-weight:600;">Verify your email</h1>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:8px 32px 0 32px;">
                <p style="margin:0;font-size:14px;line-height:22px;color:#555555;">Enter this code to verify your email address.</p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:24px 32px;">
                <span style="display:inline-block;font-size:32px;font-weight:700;letter-spacing:8px;color:${BRAND_COLOR};background-color:#f4f0ff;border-radius:8px;padding:12px 24px;">${otp}</span>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:0 32px;">
                <p style="margin:0;font-size:13px;line-height:20px;color:#777777;">This code expires in ${expiryMinutes} minutes.</p>
                <p style="margin:8px 0 0 0;font-size:13px;line-height:20px;color:#777777;">If you didn't request this, you can ignore this email.</p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:32px 32px 24px 32px;">
                <p style="margin:0;font-size:12px;line-height:18px;color:#aaaaaa;">Michikan</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`.trim();

  const text = [
    'Verify your email',
    '',
    `Your Michikan verification code is: ${otp}`,
    '',
    `This code expires in ${expiryMinutes} minutes.`,
    "If you didn't request this, you can ignore this email.",
  ].join('\n');

  return { subject, html, text };
}
