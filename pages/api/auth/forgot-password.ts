import type { NextApiRequest, NextApiResponse } from "next";
import { query, initDb } from "../../../lib/db";
import { sendMail } from "../../../lib/mail";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    // Ensure DB tables exist
    await initDb();

    // Check if user exists
    const users = (await query(
      "SELECT id FROM users WHERE email = ?",
      [email]
    )) as any[];

    // Security: even if the user doesn't exist, we return a success response
    // to prevent email enumeration attacks, but we log the attempt.
    if (!users || users.length === 0) {
      console.log(`Password reset requested for unregistered email: ${email}`);
      return res.status(200).json({
        success: true,
        message: "If this email is registered, a password reset link has been sent to it.",
      });
    }

    // Generate a random 32-character reset token
    const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    // Token expiry: 1 hour from now
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + 1);
    
    // Format date for MySQL TIMESTAMP (YYYY-MM-DD HH:MM:SS)
    const formattedExpiry = expiry.toISOString().slice(0, 19).replace('T', ' ');

    // Store token and expiry in DB
    await query(
      "UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE email = ?",
      [resetToken, formattedExpiry, email]
    );

    // Build reset link
    const host = req.headers.host || "localhost:3000";
    const protocol = req.headers["x-forwarded-proto"] || "http";
    const resetLink = `${protocol}://${host}/reset-password?token=${resetToken}`;

    // Send email
    const subject = "WP Link Cloaker — Password Reset Request";
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #6366f1; text-align: center;">Password Reset Request</h2>
        <p>Hello,</p>
        <p>You are receiving this email because you requested a password reset for your <b>WP Link Cloaker</b> account. Click the button below to set a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
        </div>
        <p>This link is valid for <b>1 hour</b>. If you did not make this request, you can safely ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 20px 0;" />
        <p style="font-size: 0.8rem; color: #9ca3af; text-align: center;">WP Link Cloaker Engine</p>
      </div>
    `;

    const emailSent = await sendMail({ to: email, subject, html });

    return res.status(200).json({
      success: true,
      message: "If this email is registered, a password reset link has been sent to it.",
      devMode: !emailSent,
    });
  } catch (error: any) {
    console.error("Forgot-password error:", error);
    return res.status(500).json({
      error: `Failed to request password reset: ${error.message || error}`,
    });
  }
}
