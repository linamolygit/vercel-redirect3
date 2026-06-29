import { NextApiRequest, NextApiResponse } from "next";
import jwt from "jsonwebtoken";

const COOKIE_NAME = "auth_token";
const JWT_SECRET = process.env.JWT_SECRET || "rishav_super_secret_jwt_key_999";

export interface AuthUser {
  id: number;
  email: string;
  name?: string;
  username?: string;
}

// Simple cookie parser helper
export function parseCookies(req: NextApiRequest) {
  const list: { [key: string]: string } = {};
  const cookieHeader = req.headers.cookie;

  if (cookieHeader) {
    cookieHeader.split(";").forEach((cookie) => {
      const parts = cookie.split("=");
      const name = parts.shift()?.trim();
      if (name) {
        list[name] = decodeURIComponent(parts.join("="));
      }
    });
  }

  return list;
}

// Decode and verify auth token from cookie
export function getAuthUser(req: NextApiRequest): AuthUser | null {
  try {
    const cookies = parseCookies(req);
    const token = cookies[COOKIE_NAME];
    if (!token) return null;

    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    return decoded;
  } catch (error) {
    return null;
  }
}

// Set httpOnly secure JWT cookie on login/signup
export function setAuthCookie(res: NextApiResponse, user: AuthUser) {
  const token = jwt.sign(
    { id: user.id, email: user.email, name: user.name, username: user.username },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  const secure = process.env.NODE_ENV === "production" ? "Secure;" : "";
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=${7 * 24 * 60 * 60}; ${secure} SameSite=Lax`
  );
}

// Clear cookie on logout
export function clearAuthCookie(res: NextApiResponse) {
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`
  );
}
