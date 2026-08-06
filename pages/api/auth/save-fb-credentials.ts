import type { NextApiRequest, NextApiResponse } from "next";
import jwt from "jsonwebtoken";
import { query, initDb } from "../../../lib/db";

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_key_linkpika_2026";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await initDb();

    const { rawCookie, accessToken, secondaryToken } = req.body;

    let c_user = "";
    let xs = "";

    // Extract c_user and xs from raw cookie string if provided
    if (rawCookie) {
      const cUserMatch = rawCookie.match(/c_user=([0-9]+)/);
      const xsMatch = rawCookie.match(/xs=([^;]+)/);
      if (cUserMatch) c_user = cUserMatch[1];
      if (xsMatch) xs = xsMatch[1];
    }

    let finalAccessToken = accessToken ? accessToken.trim() : "";
    let fbUser: any = null;

    // If Access Token provided, validate with Facebook Graph API /me
    if (finalAccessToken) {
      const meRes = await fetch(`https://graph.facebook.com/v19.0/me?access_token=${encodeURIComponent(finalAccessToken)}`);
      const meData = await meRes.json();
      if (meData.id) {
        fbUser = meData;
      }
    }

    // If no token or invalid token, but cookies exist, convert via cookie-to-token converter
    if (!fbUser && c_user && xs) {
      const cookieRes = await fetch(`${req.headers.origin || "http://localhost:3000"}/api/auth/fb-cookie`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ c_user, xs }),
      });
      const cookieData = await cookieRes.json();
      if (cookieData.access_token) {
        finalAccessToken = cookieData.access_token;
        fbUser = cookieData.fbUser;
      }
    }

    // If logged in via LinkPika JWT session, save to Database
    const token = req.cookies.token;
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; email: string };
        await query(
          "UPDATE users SET fb_access_token = ?, fb_cookie = ?, fb_secondary_token = ? WHERE id = ?",
          [finalAccessToken || null, rawCookie || null, secondaryToken || null, decoded.userId]
        );
      } catch (err) {
        console.warn("JWT Verification failed during FB credentials save:", err);
      }
    }

    // Fetch FB Pages & Ad Accounts if token exists
    let pages: any[] = [];
    let adAccounts: any[] = [];

    if (finalAccessToken) {
      try {
        const accRes = await fetch(`${req.headers.origin || "http://localhost:3000"}/api/fb-accounts?token=${encodeURIComponent(finalAccessToken)}`);
        const accData = await accRes.json();
        if (accData.pages) pages = accData.pages;
        if (accData.adAccounts) adAccounts = accData.adAccounts;
      } catch (err) {
        console.warn("FB Accounts fetch error:", err);
      }
    }

    return res.status(200).json({
      success: true,
      accessToken: finalAccessToken,
      fbUser,
      pages,
      adAccounts,
      c_user,
      xs,
    });
  } catch (err: any) {
    console.error("Save FB Credentials error:", err);
    return res.status(500).json({ error: err.message || "Failed to save Facebook credentials." });
  }
}
