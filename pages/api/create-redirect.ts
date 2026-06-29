import type { NextApiRequest, NextApiResponse } from "next";
import { query, initDb } from "../../lib/db";
import { getAuthUser } from "../../lib/auth";

// Generate unique 6-character alphanumeric short ID
async function generateUniqueShortId(): Promise<string> {
  let shortId = "";
  let isUnique = false;
  let attempts = 0;

  while (!isUnique && attempts < 10) {
    // Generate 6 character random alphanumeric string
    shortId = Math.random().toString(36).substring(2, 8);
    
    // Check if it already exists in database
    const existing = (await query(
      "SELECT id FROM redirects WHERE short_id = ?",
      [shortId]
    )) as any[];

    if (!existing || existing.length === 0) {
      isUnique = true;
    }
    attempts++;
  }

  if (!isUnique) {
    // Fallback if random generator collides persistently
    shortId = Date.now().toString(36).slice(-6);
  }

  return shortId;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // 1. Get authenticated user from session cookie (Optional)
  const user = getAuthUser(req);
  const userId = user ? user.id : null;

  const {
    originalUrl,
    wpPostPath,
    customTitle,
    customDesc,
    customImage,
  } = req.body;

  if (!originalUrl) {
    return res.status(400).json({ error: "Missing original redirect URL" });
  }

  try {
    // Ensure DB is initialized
    await initDb();

    // Generate unique short ID
    const shortId = await generateUniqueShortId();

    // Insert redirect entry into MySQL linked to the user's ID
    const insertQuery = `
      INSERT INTO redirects (short_id, original_url, wp_post_path, custom_title, custom_desc, custom_image, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    await query(insertQuery, [
      shortId,
      originalUrl,
      wpPostPath || null,
      customTitle || null,
      customDesc || null,
      customImage || null,
      userId,
    ]);

    // Construct the short link
    const host = req.headers.host || "localhost:3000";
    const protocol = req.headers["x-forwarded-proto"] || "http";
    const shortLink = `${protocol}://${host}/${shortId}`;

    return res.status(200).json({
      success: true,
      shortId,
      shortLink,
    });
  } catch (error: any) {
    console.error("Failed to create redirect link:", error);
    return res.status(500).json({
      error: `Failed to save redirect: ${error.message || error}`,
    });
  }
}
