import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";

/**
 * POST /api/force-fb-scrape
 * Forces Facebook OpenGraph Crawler to re-scrape a Bridge Link URL,
 * purging any old/cached OG image previews so FB gets the fresh 1:1 canvas image.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { url, token } = req.body;
  if (!url) {
    return res.status(400).json({ error: "Missing url parameter" });
  }

  const activeToken = token || process.env.FB_ADMIN_ACCESS_TOKEN || "";

  if (!activeToken) {
    console.warn("force-fb-scrape: No access token provided or set in env");
    return res.status(200).json({ scraped: false, message: "No access token provided" });
  }

  try {
    console.log("force-fb-scrape: Triggering FB Graph API scrape for URL:", url);

    const scrapeRes = await axios.post("https://graph.facebook.com/v19.0/", null, {
      params: {
        id: url,
        scrape: "true",
        access_token: activeToken,
      },
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      },
      timeout: 15000,
    });

    console.log("force-fb-scrape SUCCESS! FB Scrape response:", scrapeRes.data?.id || scrapeRes.data);
    return res.status(200).json({ scraped: true, url, data: scrapeRes.data });
  } catch (err: any) {
    const fbError = err?.response?.data?.error?.message || err.message;
    console.warn("force-fb-scrape error:", fbError);
    return res.status(200).json({
      scraped: false,
      error: fbError,
    });
  }
}
