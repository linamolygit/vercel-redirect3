import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";

/**
 * GET /api/proxy-image?url=https://scontent....fbcdn.net/...
 * Proxies image requests to bypass browser CORS policies for canvas rendering.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const imageUrl = req.query.url as string;

  if (!imageUrl || (!imageUrl.startsWith("http://") && !imageUrl.startsWith("https://"))) {
    return res.status(400).json({ error: "Valid URL required" });
  }

  try {
    const response = await axios.get(imageUrl, {
      responseType: "arraybuffer",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      },
      timeout: 20000,
    });

    const contentType = response.headers["content-type"] || "image/jpeg";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.send(Buffer.from(response.data));
  } catch (err: any) {
    console.error("Proxy image failed:", err?.message || err);
    return res.status(500).json({ error: "Failed to proxy image" });
  }
}
