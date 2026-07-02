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
    const userId = decoded.userId;
    const { id } = req.query; // this is the short_id

    // Find the redirect by short_id
    // Allow access if: (a) user owns the link (user_id matches), OR (b) link has no owner (user_id IS NULL — legacy links)
    const redirectRes = await query(
      "SELECT id, user_id FROM redirects WHERE short_id = ?",
      [id]
    ) as any[];

    if (redirectRes.length === 0) {
      return res.status(404).json({ message: "Link not found" });
    }

    const link = redirectRes[0];

    // Only allow if the link belongs to this user, OR if link has no owner (legacy)
    if (link.user_id !== null && link.user_id !== userId) {
      return res.status(403).json({ message: "You don't have permission to view this link's analytics" });
    }

    const redirectId = link.id;

    // Fetch Analytics Data
    // 1. Total visits
    const totalVisitsRes = await query(
      "SELECT COUNT(*) as total FROM analytics WHERE redirect_id = ?",
      [redirectId]
    ) as any[];
    const totalVisits = totalVisitsRes[0].total;

    // 2. Visits over time (by date)
    const visitsByDate = await query(`
      SELECT DATE(created_at) as date, COUNT(*) as count 
      FROM analytics 
      WHERE redirect_id = ? 
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `, [redirectId]);

    // 3. Top Countries
    const topCountries = await query(`
      SELECT country, COUNT(*) as count 
      FROM analytics 
      WHERE redirect_id = ? 
      GROUP BY country 
      ORDER BY count DESC 
      LIMIT 10
    `, [redirectId]);

    // 4. Platforms
    const platforms = await query(`
      SELECT platform, COUNT(*) as count 
      FROM analytics 
      WHERE redirect_id = ? 
      GROUP BY platform 
      ORDER BY count DESC
    `, [redirectId]);

    // 5. Referrers
    const referrers = await query(`
      SELECT referrer, COUNT(*) as count 
      FROM analytics 
      WHERE redirect_id = ? AND referrer != '' AND referrer IS NOT NULL
      GROUP BY referrer 
      ORDER BY count DESC 
      LIMIT 10
    `, [redirectId]);

    // 6. Devices
    const devices = await query(`
      SELECT device_type as device, COUNT(*) as count 
      FROM analytics 
      WHERE redirect_id = ? 
      GROUP BY device_type 
      ORDER BY count DESC
    `, [redirectId]);

    // 7. Recent visits (last 10)
    const recentVisits = await query(`
      SELECT country, platform, device_type, referrer, created_at
      FROM analytics
      WHERE redirect_id = ?
      ORDER BY created_at DESC
      LIMIT 10
    `, [redirectId]);

    res.status(200).json({
      totalVisits,
      visitsByDate,
      topCountries,
      platforms,
      referrers,
      devices,
      recentVisits,
      shortId: id,
    });

  } catch (error) {
    console.error("Analytics API Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
