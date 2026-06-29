import type { NextApiRequest, NextApiResponse } from "next";
import bcrypt from "bcryptjs";
import { query, initDb } from "../../../lib/db";
import { setAuthCookie } from "../../../lib/auth";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    // Ensure DB tables exist
    await initDb();

    // Find user by email
    const users = (await query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    )) as any[];

    if (!users || users.length === 0) {
      return res.status(400).json({ error: "Invalid email or password." });
    }

    const user = users[0];

    // Verify password
    const isPasswordMatch = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordMatch) {
      return res.status(400).json({ error: "Invalid email or password." });
    }

    // Set signed JWT cookie
    setAuthCookie(res, { id: user.id, email: user.email });

    return res.status(200).json({
      success: true,
      user: { id: user.id, email: user.email },
    });
  } catch (error: any) {
    console.error("Sign-in error:", error);
    return res.status(500).json({
      error: `Sign-in failed: ${error.message || error}`,
    });
  }
}
