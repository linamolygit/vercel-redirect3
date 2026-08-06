import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthUser } from "../../../lib/auth";
import { query, initDb } from "../../../lib/db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const authUser = getAuthUser(req);
  if (!authUser) {
    return res.status(200).json({ user: null });
  }

  try {
    await initDb();
    const rows: any = await query(
      "SELECT id, email, name, username, fb_access_token, fb_cookie, fb_secondary_token FROM users WHERE id = ?",
      [authUser.id]
    );

    if (Array.isArray(rows) && rows.length > 0) {
      const user = rows[0];
      return res.status(200).json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          username: user.username,
          fbAccessToken: user.fb_access_token,
          fbCookie: user.fb_cookie,
          fbSecondaryToken: user.fb_secondary_token,
        },
      });
    }

    return res.status(200).json({ user: authUser });
  } catch (err: any) {
    console.error("Fetch DB User error:", err);
    return res.status(200).json({ user: authUser });
  }
}
