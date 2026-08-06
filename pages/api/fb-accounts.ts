import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { query, initDb } from "../../lib/db";
import jwt from "jsonwebtoken";

/**
 * GET /api/fb-accounts
 * Returns user's Facebook Profile, Pages (with pictures), and Ad Accounts.
 * Uses Graph API nested field querying.
 * Query params: ?token=USER_ACCESS_TOKEN
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const accessToken = req.query.token as string;
  if (!accessToken) {
    return res.status(400).json({ error: "Missing ?token= query parameter" });
  }

  try {
    // Single nested API query to fetch profile + pages + ad accounts with pictures
    const meRes = await axios.get("https://graph.facebook.com/v19.0/me", {
      params: {
        fields: "id,name,picture.type(large),accounts{id,name,picture.type(small),access_token,category,fan_count},adaccounts{id,account_id,name,account_status,currency}",
        access_token: accessToken,
      },
    });

    const data = meRes.data || {};

    const fbUser = {
      id: data.id,
      name: data.name,
      profilePic: data.picture?.data?.url,
    };

    const pages = (data.accounts?.data || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      picture: p.picture?.data?.url || "",
      access_token: p.access_token,
      category: p.category || "",
      fan_count: p.fan_count || 0,
    }));

    const adAccounts = (data.adaccounts?.data || []).map((a: any) => ({
      id: a.id,
      accountId: a.account_id || a.id,
      name: a.name || a.id,
      status: a.account_status,
      currency: a.currency || "",
    }));

    // Save token to DB if user is logged in
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
        // Not logged in or invalid token — skip save
      }
    }

    return res.status(200).json({
      fbUser,
      pages,
      adAccounts,
    });
  } catch (err: any) {
    const fbError = err?.response?.data?.error;
    if (fbError) {
      return res.status(400).json({
        error: fbError.message || "Facebook API error",
        code: fbError.code,
        fbtrace_id: fbError.fbtrace_id,
      });
    }
    return res.status(500).json({ error: err.message || String(err) });
  }
}
