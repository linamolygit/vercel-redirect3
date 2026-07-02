import { NextApiRequest, NextApiResponse } from "next";
import { query, initDb } from "../../../lib/db";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const token = req.cookies.auth_token || req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    await initDb();
    const decoded: any = jwt.verify(token, JWT_SECRET);
    const userId = decoded.id || decoded.userId; // JWT stores 'id' not 'userId'

    // Get all link IDs owned by this user
    const userLinksRes = await query("SELECT id, short_id FROM redirects WHERE user_id = ?", [userId]) as any[];
    if (userLinksRes.length === 0) {
      return res.status(200).json({
        totalVisits: 0,
        totalLinks: 0,
        topLinks: [],
        platforms: []
      });
    }

    const redirectIds = userLinksRes.map((link: any) => link.id);
    const placeholders = redirectIds.map(() => '?').join(',');

    // 1. Total lifetime visits
    const totalVisitsRes = await query(`SELECT COUNT(*) as total FROM analytics WHERE redirect_id IN (${placeholders})`, redirectIds) as any[];
    const totalVisits = totalVisitsRes[0].total;

    // 2. Top Performing Links
    const topLinks = await query(`
      SELECT r.short_id, COUNT(a.id) as count 
      FROM redirects r 
      LEFT JOIN analytics a ON r.id = a.redirect_id 
      WHERE r.user_id = ? 
      GROUP BY r.id 
      ORDER BY count DESC 
      LIMIT 10
    `, [userId]);

    // 3. Overall Top Platforms
    const platforms = await query(`
      SELECT platform, COUNT(*) as count 
      FROM analytics 
      WHERE redirect_id IN (${placeholders}) 
      GROUP BY platform 
      ORDER BY count DESC
    `, redirectIds);

    res.status(200).json({
      totalVisits,
      totalLinks: redirectIds.length,
      topLinks,
      platforms,
    });

  } catch (error) {
    console.error("Global Analytics API Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
