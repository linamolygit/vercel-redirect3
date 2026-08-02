import type { NextApiRequest, NextApiResponse } from "next";
import { query } from "../../lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const diagnostics: Record<string, any> = {
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    env: {
      hasDbHost: !!process.env.DB_HOST,
      hasDbUser: !!process.env.DB_USER,
      hasImgbbKey: !!process.env.IMGBB_API_KEY,
      hasFbToken: !!process.env.FB_ADMIN_ACCESS_TOKEN,
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "not set",
    },
  };

  // 1. Test Database connection
  try {
    const dbRes = (await query("SELECT 1 + 1 AS result")) as any[];
    diagnostics.db = {
      connected: true,
      testQueryResult: dbRes[0]?.result,
    };
  } catch (dbErr: any) {
    diagnostics.db = {
      connected: false,
      error: dbErr.message || String(dbErr),
    };
  }

  // 2. Test Sharp availability
  try {
    const sharp = require("sharp");
    diagnostics.sharp = {
      available: true,
      version: sharp.versions?.sharp || "unknown",
    };
  } catch (sharpErr: any) {
    diagnostics.sharp = {
      available: false,
      error: sharpErr.message || String(sharpErr),
    };
  }

  const isHealthy = diagnostics.db.connected;
  return res.status(isHealthy ? 200 : 500).json(diagnostics);
}
