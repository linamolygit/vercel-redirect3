import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { query, initDb } from "../../lib/db";
import { processSquareImage } from "../../lib/processSquareImage";

/**
 * GET  /api/debug-link?id=6hxkt1
 *   → Shows what's in the DB for a given short_id
 *
 * POST /api/debug-link?id=6hxkt1
 *   → Force-reprocesses the square image for that link, updates DB,
 *     and triggers a fresh Facebook Graph API scrape
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await initDb();

    const shortId = (req.query.id as string) || "";
    if (!shortId) {
      return res.status(400).json({ error: "Missing ?id= query parameter" });
    }

    const rows = (await query(
      "SELECT id, short_id, original_url, custom_title, custom_image, og_image_processed_url, created_at FROM redirects WHERE short_id = ?",
      [shortId]
    )) as any[];

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: `No redirect found for short_id: ${shortId}` });
    }

    const row = rows[0];

    // ── GET: Just return the DB state ─────────────────────────────────────────
    if (req.method === "GET") {
      return res.status(200).json({
        short_id: row.short_id,
        original_url: row.original_url,
        custom_title: row.custom_title,
        custom_image: row.custom_image || null,
        og_image_processed_url: row.og_image_processed_url || null,
        og_image_is_square: !!row.og_image_processed_url && row.og_image_processed_url !== row.custom_image,
        created_at: row.created_at,
      });
    }

    // ── POST: Force-reprocess the square image & FB scrape ────────────────────
    if (req.method === "POST") {
      const imageSource = row.custom_image;
      if (!imageSource) {
        return res.status(400).json({ error: "This link has no custom_image to process." });
      }

      let newProcessedUrl: string | null = null;
      let sharpError: string | null = null;

      try {
        const imgRes = await axios.get(imageSource, {
          responseType: "arraybuffer",
          timeout: 15000,
        });
        const imageBuffer = Buffer.from(imgRes.data);
        newProcessedUrl = await processSquareImage(imageBuffer);

        // Save new processed URL to DB
        await query(
          "UPDATE redirects SET og_image_processed_url = ? WHERE short_id = ?",
          [newProcessedUrl, shortId]
        );
      } catch (err: any) {
        sharpError = err?.message || String(err);
        console.error("Reprocess failed:", sharpError);
      }

      // Force Facebook cache refresh
      let fbScrapeResult: any = null;
      if (process.env.FB_ADMIN_ACCESS_TOKEN) {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `https://${req.headers.host}`;
        const urlToScrape = `${siteUrl.replace(/\/$/, "")}/${shortId}`;
        try {
          const fbRes = await axios.post("https://graph.facebook.com/v19.0/", null, {
            params: {
              id: urlToScrape,
              scrape: true,
              access_token: process.env.FB_ADMIN_ACCESS_TOKEN,
            },
          });
          fbScrapeResult = fbRes.data;
        } catch (fbErr: any) {
          fbScrapeResult = { error: fbErr?.response?.data || fbErr?.message };
        }
      }

      return res.status(200).json({
        short_id: shortId,
        reprocessed: !sharpError,
        sharp_error: sharpError,
        new_og_image_processed_url: newProcessedUrl,
        original_custom_image: imageSource,
        facebook_scrape_result: fbScrapeResult,
      });
    }

    return res.status(405).json({ error: "Method not allowed. Use GET or POST." });
  } catch (error: any) {
    console.error("Debug link handler error:", error);
    return res.status(500).json({
      error: error.message || String(error),
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
}
