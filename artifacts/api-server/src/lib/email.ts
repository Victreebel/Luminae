import { Resend } from "resend";

let resendClient: Resend | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!resendClient) resendClient = new Resend(process.env.RESEND_API_KEY);
  return resendClient;
}

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string,
): Promise<void> {
  const resend = getResend();

  if (!resend) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[email] RESEND_API_KEY not set — reset URL: ${resetUrl}`);
    } else {
      console.warn(`[email] RESEND_API_KEY not set — password reset email not sent to ${to}`);
    }
    return;
  }

  const { data, error } = await resend.emails.send({
    from: "Luminae <noreply@luminae.game>",
    to,
    subject: "Reset your Luminae password",
    text: `Reset your Luminae password\n\nSomeone requested a password reset for your Luminae account.\n\nClick the link below to choose a new password. This link expires in 1 hour.\n\n${resetUrl}\n\nIf you didn't request this, you can safely ignore this email. Your password won't change.\n\n— Luminae`,
    html: `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family:sans-serif;background:#0a0a12;color:#e8e0ff;padding:40px 20px;margin:0">
          <div style="max-width:480px;margin:0 auto;background:#13111f;border:1px solid #2a2550;border-radius:16px;padding:40px">
            <h1 style="color:#a78bfa;margin:0 0 8px;font-size:24px">Luminae</h1>
            <p style="color:#9ca3af;margin:0 0 32px;font-size:14px">Cosmic Engine-Building Game</p>
            <h2 style="color:#e8e0ff;margin:0 0 16px;font-size:20px">Reset your password</h2>
            <p style="color:#c4b5fd;margin:0 0 24px;line-height:1.6">
              Someone requested a password reset for your Luminae account. Click the button below to choose a new password. This link expires in 1 hour.
            </p>
            <a href="${resetUrl}"
               style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:700;font-size:15px;margin-bottom:24px">
              Reset Password
            </a>
            <p style="color:#6b7280;font-size:12px;margin:0">
              If you didn't request this, you can safely ignore this email. Your password won't change.
            </p>
            <hr style="border:none;border-top:1px solid #2a2550;margin:24px 0">
            <p style="color:#4b5563;font-size:11px;margin:0">
              Link expires in 1 hour · Luminae
            </p>
          </div>
        </body>
      </html>
    `,
  });

  if (error) {
    throw new Error(`Resend error: ${error.name} — ${error.message}`);
  }

  if (!data?.id) {
    throw new Error("Resend returned no message ID — email may not have been queued");
  }
}
