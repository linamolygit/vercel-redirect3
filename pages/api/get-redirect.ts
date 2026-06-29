import type { NextApiRequest, NextApiResponse } from "next";
import { query, initDb } from "../../lib/db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: "Missing redirect ID" });
  }

  try {
    // Ensure DB is initialized
    await initDb();

    // Query redirect data by short ID
    const results = (await query(
      "SELECT original_url, custom_title, custom_desc, custom_image FROM redirects WHERE short_id = ?",
      [id]
    )) as any[];

    if (!results || results.length === 0) {
      return res.status(404).json({ error: "Redirect link not found" });
    }

    // Return redirect details (publicly accessible for redirection engines)
    return res.status(200).json(results[0]);
  } catch (error: any) {
    console.error("Fetch redirect error:", error);
    return res.status(500).json({
      error: `Database fetch failed: ${error.message || error}`,
    });
  }
}
