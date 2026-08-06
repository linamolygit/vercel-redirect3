import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { query, initDb } from "../../../lib/db";
import jwt from "jsonwebtoken";

/**
 * POST /api/auth/fb-cookie
 * Converts extracted Facebook Session Cookies (c_user + xs) into a valid User Access Token
 * using Meta's internal token generator mechanism.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { c_user, xs } = req.body;
  if (!c_user || !xs) {
    return res.status(400).json({ error: "Missing required cookies: c_user and xs" });
  }

  try {
    // Construct Facebook Cookie Header String
    const cookieHeader = `c_user=${c_user}; xs=${xs};`;

    // Fetch Facebook Business Manager / Ads Manager Access Token using session cookie
    const tokenRes = await axios.get("https://adsmanager.facebook.com/adsmanager/manage/campaigns", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Cookie": cookieHeader,
      },
      timeout: 15000,
    });

    const htmlContent = tokenRes.data || "";

    // Extract access_token from AdsManager HTML page window.__accessToken or regex
    let accessToken: string | null = null;

    const tokenMatch = htmlContent.match(/accessToken\s*:\s*["'](EAAB[^"']+)["']/);
    if (tokenMatch && tokenMatch[1]) {
      accessToken = tokenMatch[1];
    } else {
      // Fallback regex pattern for EAAB tokens in page source
      const fallbackMatch = htmlContent.match(/(EAAB[a-zA-Z0-9]+)/);
      if (fallbackMatch && fallbackMatch[1]) {
        accessToken = fallbackMatch[1];
      }
    }

    if (!accessToken) {
      return res.status(400).json({
        error: "Could not extract valid EAAB Access Token from active session. Please make sure you are logged into Facebook Ads Manager in your browser.",
      });
    }

    // Verify token & fetch User Info from Graph API
    const meRes = await axios.get("https://graph.facebook.com/v19.0/me", {
      params: {
        fields: "id,name,email",
        access_token: accessToken,
      },
    });

    const fbUser = meRes.data;

    // Save access token to user's DB row if logged in
    const JWT_SECRET = process.env.JWT_SECRET || "rishav_super_secret_jwt_key_999";
    const authCookie = req.cookies?.auth_token;
    if (authCookie) {
      try {
        const decoded = jwt.verify(authCookie, JWT_SECRET) as any;
        if (decoded?.userId) {
          await initDb();
          await query(
            "UPDATE users SET fb_access_token = ? WHERE id = ?",
            [accessToken, decoded.userId]
          );
        }
      } catch (_) {
        // Guest user sync
      }
    }

    return res.status(200).json({
      success: true,
      access_token: accessToken,
      fbUser,
    });
  } catch (err: any) {
    console.error("Cookie to token conversion error:", err?.message || err);
    return res.status(500).json({
      error: "Cookie session expired or invalid. " + (err.message || String(err)),
    });
  }
}
