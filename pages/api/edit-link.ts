import type { NextApiRequest, NextApiResponse } from "next";
import { query, initDb } from "../../lib/db";
import { getAuthUser } from "../../lib/auth";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "PUT") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { id, short_id, original_url } = req.body;

  if (!id || !short_id || !original_url) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Basic validation for short_id (alphanumeric and dashes only)
  const isValidShortId = /^[a-zA-Z0-9-]+$/.test(short_id);
  if (!isValidShortId) {
    return res.status(400).json({ error: "Custom alias can only contain letters, numbers, and hyphens." });
  }

  // Optional: check auth. We'll allow updates if user_id matches, or if user_id IS NULL (guest link).
  const user = getAuthUser(req);
  const userId = user ? user.id : null;

  try {
    await initDb();

    // Check if the requested short_id is already taken by a DIFFERENT record
    const existing = (await query(
      "SELECT id FROM redirects WHERE short_id = ? AND id != ?",
      [short_id, id]
    )) as any[];

    if (existing && existing.length > 0) {
      return res.status(400).json({ error: "This alias is already taken. Please choose another one." });
    }

    // Update the record. Ensure that we only update if the user owns it OR if it's a guest link
    // Note: If userId is null (guest), they can only edit links where user_id IS NULL.
    // If userId is present, they can edit links where user_id = userId.
    let updateResult: any;
    
    if (userId) {
      updateResult = await query(
        "UPDATE redirects SET short_id = ?, original_url = ? WHERE id = ? AND (user_id = ? OR user_id IS NULL)",
        [short_id, original_url, id, userId]
      );
    } else {
      updateResult = await query(
        "UPDATE redirects SET short_id = ?, original_url = ? WHERE id = ? AND user_id IS NULL",
        [short_id, original_url, id]
      );
    }

    if (updateResult.affectedRows === 0) {
      return res.status(403).json({ error: "Unauthorized or link not found" });
    }

    // Also update history in analytics table for consistency if we wanted to, 
    // but analytics is linked by `redirect_id` (the foreign key), so it automatically works!
    
    const host = req.headers.host || "localhost:3000";
    const protocol = req.headers["x-forwarded-proto"] || "http";
    const shortLink = `${protocol}://${host}/${short_id}`;

    return res.status(200).json({
      success: true,
      short_id,
      original_url,
      shortLink,
    });
  } catch (error: any) {
    console.error("Failed to edit redirect link:", error);
    return res.status(500).json({
      error: `Failed to edit link: ${error.message || error}`,
    });
  }
}
