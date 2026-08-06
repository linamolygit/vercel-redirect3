import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { query, initDb } from "../../lib/db";
import { getAuthUser } from "../../lib/auth";

/**
 * GET /api/fb-accounts
 * Returns user's Facebook Profile, Pages (with pictures), and Ad Accounts.
 * Uses Graph API nested field querying with direct fallback endpoints.
 * Query params: ?token=USER_ACCESS_TOKEN&cookie=RAW_COOKIE
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let accessToken = (req.query.token as string) || "";
  let rawCookie = (req.query.cookie as string) || "";

  // If token or cookie is missing, check logged-in DB user
  const authUser = getAuthUser(req);
  if (authUser && (!accessToken || !rawCookie)) {
    try {
      await initDb();
      const rows: any = await query(
        "SELECT fb_access_token, fb_cookie FROM users WHERE id = ?",
        [authUser.id]
      );
      if (Array.isArray(rows) && rows.length > 0) {
        if (!accessToken && rows[0].fb_access_token) {
          accessToken = rows[0].fb_access_token;
        }
        if (!rawCookie && rows[0].fb_cookie) {
          rawCookie = rows[0].fb_cookie;
        }
      }
    } catch (dbErr) {
      console.warn("DB user lookup error in fb-accounts:", dbErr);
    }
  }

  if (!accessToken) {
    return res.status(400).json({ error: "Missing Facebook Access Token" });
  }

  const customHeaders: Record<string, string> = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    Origin: "https://business.facebook.com",
    Referer: "https://business.facebook.com/",
  };
  if (rawCookie) {
    customHeaders["Cookie"] = rawCookie;
  }

  try {
    // Single nested API query to fetch profile + pages + ad accounts with pictures
    let meData: any = {};
    try {
      const meRes = await axios.get("https://graph.facebook.com/v19.0/me", {
        params: {
          fields:
            "id,name,picture.type(large),accounts{id,name,picture.type(small),access_token,category,fan_count},adaccounts{id,account_id,name,account_status,currency}",
          access_token: accessToken,
        },
        headers: customHeaders,
        timeout: 15000,
      });
      meData = meRes.data || {};
    } catch (nestedErr: any) {
      console.warn("Nested query failed, trying direct /me lookup...", nestedErr?.message);
      const simpleMe = await axios.get("https://graph.facebook.com/v19.0/me", {
        params: { fields: "id,name,picture.type(large)", access_token: accessToken },
        headers: customHeaders,
        timeout: 15000,
      });
      meData = simpleMe.data || {};
    }

    const fbUser = {
      id: meData.id || "",
      name: meData.name || "Facebook User",
      profilePic: meData.picture?.data?.url || "",
    };

    let pages: any[] = (meData.accounts?.data || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      picture: p.picture?.data?.url || "",
      access_token: p.access_token || "",
      category: p.category || "",
      fan_count: p.fan_count || 0,
    }));

    // Fallback: If nested accounts list is empty, call /me/accounts directly
    if (pages.length === 0) {
      try {
        const pagesRes = await axios.get("https://graph.facebook.com/v19.0/me/accounts", {
          params: {
            fields: "id,name,picture.type(small),access_token,category,fan_count",
            access_token: accessToken,
          },
          headers: customHeaders,
          timeout: 15000,
        });
        if (pagesRes.data?.data) {
          pages = pagesRes.data.data.map((p: any) => ({
            id: p.id,
            name: p.name,
            picture: p.picture?.data?.url || "",
            access_token: p.access_token || "",
            category: p.category || "",
            fan_count: p.fan_count || 0,
          }));
        }
      } catch (pagesErr: any) {
        console.warn("Direct /me/accounts fetch error:", pagesErr?.message);
      }
    }


    let adAccounts: any[] = (meData.adaccounts?.data || []).map((a: any) => ({
      id: a.id,
      accountId: a.account_id || a.id,
      name: a.name || a.id,
      status: a.account_status,
      currency: a.currency || "",
    }));

    // Fallback: If nested adaccounts list is empty, call /me/adaccounts directly
    if (adAccounts.length === 0) {
      try {
        const adRes = await axios.get("https://graph.facebook.com/v19.0/me/adaccounts", {
          params: {
            fields: "id,account_id,name,account_status,currency",
            access_token: accessToken,
          },
          headers: customHeaders,
          timeout: 15000,
        });
        if (adRes.data?.data) {
          adAccounts = adRes.data.data.map((a: any) => ({
            id: a.id,
            accountId: a.account_id || a.id,
            name: a.name || a.id,
            status: a.account_status,
            currency: a.currency || "",
          }));
        }
      } catch (adErr: any) {
        console.warn("Direct /me/adaccounts fetch error:", adErr?.message);
      }
    }

    // Save token to DB if user is logged in
    if (authUser?.id) {
      try {
        await initDb();
        await query("UPDATE users SET fb_access_token = ? WHERE id = ?", [
          accessToken,
          authUser.id,
        ]);
        if (rawCookie) {
          await query("UPDATE users SET fb_cookie = ? WHERE id = ?", [
            rawCookie,
            authUser.id,
          ]);
        }
      } catch (dbSaveErr) {
        console.warn("Save token to DB error:", dbSaveErr);
      }
    }

    return res.status(200).json({
      success: true,
      fbUser,
      pages,
      adAccounts,
    });
  } catch (err: any) {
    const fbError = err?.response?.data?.error;
    if (fbError) {
      return res.status(400).json({
        success: false,
        error: fbError.message || "Facebook API error",
        code: fbError.code,
        fbtrace_id: fbError.fbtrace_id,
      });
    }
    return res.status(500).json({ success: false, error: err.message || String(err) });
  }
}
