import type { NextApiRequest, NextApiResponse } from "next";
import bcrypt from "bcryptjs";
import { query, initDb } from "../../../lib/db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ error: "Token and password are required" });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters long" });
  }

  try {
    // Ensure DB tables exist
    await initDb();

    // Find user with this reset token
    const users = (await query(
      "SELECT id, reset_token_expiry FROM users WHERE reset_token = ?",
      [token]
    )) as any[];

    if (!users || users.length === 0) {
      return res.status(400).json({ error: "Invalid password reset token." });
    }

    const user = users[0];

    // Check token expiration
    const expiry = new Date(user.reset_token_expiry);
    const now = new Date();

    if (now > expiry) {
      return res.status(400).json({ error: "Reset token has expired. Please request another one." });
    }

    // Hash the new password
    const newPasswordHash = await bcrypt.hash(password, 10);

    // Update password and clear reset token fields
    await query(
      "UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?",
      [newPasswordHash, user.id]
    );

    return res.status(200).json({
      success: true,
      message: "Password reset successful! Ab aap login kar sakte hain.",
    });
  } catch (error: any) {
    console.error("Reset-password error:", error);
    return res.status(500).json({
      error: `Failed to reset password: ${error.message || error}`,
    });
  }
}
