import type { NextApiRequest, NextApiResponse } from "next";
import jwt from "jsonwebtoken";
import { query, initDb } from "../../../lib/db";
import axios from "axios";

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
    let pages: any[] = [];
    let adAccounts: any[] = [];

    // If Access Token provided, fetch profile + pages + ad accounts via single nested Graph API query
    if (finalAccessToken) {
      try {
        const meRes = await axios.get("https://graph.facebook.com/v19.0/me", {
          params: {
            fields: "id,name,picture.type(large),accounts{id,name,picture.type(small),access_token,category,fan_count},adaccounts{id,account_id,name,account_status,currency}",
            access_token: finalAccessToken,
          },
        });

        const data = meRes.data || {};
        fbUser = {
          id: data.id,
          name: data.name,
          profilePic: data.picture?.data?.url,
        };

        pages = (data.accounts?.data || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          picture: p.picture?.data?.url || "",
          access_token: p.access_token,
          category: p.category || "",
          fan_count: p.fan_count || 0,
        }));

        adAccounts = (data.adaccounts?.data || []).map((a: any) => ({
          id: a.id,
          accountId: a.account_id || a.id,
          name: a.name || a.id,
          status: a.account_status,
          currency: a.currency || "",
        }));
      } catch (err: any) {
        console.warn("FB Token validation error:", err.message);
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
