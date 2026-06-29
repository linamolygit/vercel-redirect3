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

  const { email, password, name, username } = req.body;

  if (!email || !password || !name || !username) {
    return res.status(400).json({ error: "All fields (name, username, email, password) are required" });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters long" });
  }

  try {
    // Ensure DB tables exist
    await initDb();

    // Check if email already exists
    const existing = (await query(
      "SELECT id FROM users WHERE email = ?",
      [email]
    )) as any[];

    if (existing && existing.length > 0) {
      return res.status(400).json({ error: "This email is already registered." });
    }

    // Check if username already exists
    const existingUser = (await query(
      "SELECT id FROM users WHERE username = ?",
      [username]
    )) as any[];

    if (existingUser && existingUser.length > 0) {
      return res.status(400).json({ error: "This username is already taken." });
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert user into MySQL
    const result = (await query(
      "INSERT INTO users (email, name, username, password_hash) VALUES (?, ?, ?, ?)",
      [email, name, username, passwordHash]
    )) as any;

    const userId = result.insertId;

    // Automatically sign in the user by setting the JWT cookie
    setAuthCookie(res, { id: userId, email, name, username });

    return res.status(200).json({
      success: true,
      user: { id: userId, email, name, username },
    });
  } catch (error: any) {
    console.error("Sign-up error:", error);
    return res.status(500).json({
      error: `Sign-up failed: ${error.message || error}`,
    });
  }
}
