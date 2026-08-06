import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { query, initDb } from "../../lib/db";
import jwt from "jsonwebtoken";

/**
 * GET /api/fb-accounts
 * Returns user's Facebook Pages and Ad Accounts for the given access token.
 * Also saves the token to the DB if user is logged in.
 *
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
    // 1. Fetch Pages this user manages
    const pagesRes = await axios.get("https://graph.facebook.com/v19.0/me/accounts", {
      params: {
        fields: "id,name,access_token,category,fan_count",
        access_token: accessToken,
        limit: 50,
      },
    });

    const pages = (pagesRes.data?.data || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      access_token: p.access_token, // Page-level token for posting
      category: p.category || "",
      fan_count: p.fan_count || 0,
    }));

    // 2. Fetch Ad Accounts this user has access to
    const adAccountsRes = await axios.get("https://graph.facebook.com/v19.0/me/adaccounts", {
      params: {
        fields: "id,name,account_status,currency",
        access_token: accessToken,
        limit: 50,
      },
    });

    const adAccounts = (adAccountsRes.data?.data || []).map((a: any) => ({
      id: a.id, // Already formatted as act_XXXXXXXX
      name: a.name,
      status: a.account_status, // 1 = Active
      currency: a.currency || "",
    }));

    // 3. Also get basic user info
    const meRes = await axios.get("https://graph.facebook.com/v19.0/me", {
      params: {
        fields: "id,name",
        access_token: accessToken,
      },
    });

    // 4. Save token to DB if user is logged in
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
      fbUser: meRes.data,
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
