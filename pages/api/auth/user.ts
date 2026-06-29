import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthUser } from "../../../lib/auth";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Retrieve authenticated user from token cookie
  const user = getAuthUser(req);

  if (!user) {
    return res.status(200).json({ user: null });
  }

  return res.status(200).json({ user });
}
