import type { NextApiRequest, NextApiResponse } from "next";
import { query, initDb } from "../../lib/db";
import { getAuthUser } from "../../lib/auth";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Get authenticated user
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized. Kripya login karein." });
  }

  try {
    // Ensure DB is initialized
    await initDb();

    // Query 50 most recent redirects for the logged-in user
    const selectQuery = `
      SELECT id, short_id, original_url, wp_post_path, custom_title, custom_desc, custom_image, created_at
      FROM redirects
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 50
    `;
    const links = await query(selectQuery, [user.id]);

    return res.status(200).json(links);
  } catch (error: any) {
    console.error("Failed to retrieve redirects:", error);
    return res.status(500).json({
      error: `Failed to fetch links history: ${error.message || error}`,
    });
  }
}
