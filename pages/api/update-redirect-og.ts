import type { NextApiRequest, NextApiResponse } from "next";
import { query, initDb } from "../../lib/db";

/**
 * POST /api/update-redirect-og
 * Updates og_image_processed_url for a redirect by its shortId.
 * Called from fb-dark-post before posting to Facebook, so the bridge link
 * serves the canvas image as its 1:1 square OG image to Facebook's scraper.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { shortId, ogImageUrl } = req.body;

  if (!shortId || !ogImageUrl) {
    return res.status(400).json({ error: "Missing shortId or ogImageUrl" });
  }

  try {
    await initDb();

    const result = (await query(
      "UPDATE redirects SET og_image_processed_url = ? WHERE short_id = ?",
      [ogImageUrl, shortId]
    )) as any;

    if (result.affectedRows === 0) {
      // Not found — not a fatal error, just skip (destination may be external)
      return res.status(200).json({ updated: false, message: "Redirect not found for shortId" });
    }

    console.log(`update-redirect-og: Updated OG image for shortId=${shortId} to ${ogImageUrl}`);
    return res.status(200).json({ updated: true, shortId, ogImageUrl });
  } catch (err: any) {
    console.error("update-redirect-og error:", err);
    return res.status(500).json({ error: err.message || "DB update failed" });
  }
}
