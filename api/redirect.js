/**
 * Vercel Edge Function — WordPress OG-Tag Redirect
 * ============================================================
 * Deploy: Vercel (Edge Runtime)
 * Ye file worker.js ka same logic use karta hai,
 * sirf Vercel Edge Function API ke saath compatible hai.
 *
 * Setup:
 * 1. Vercel dashboard → Settings → Environment Variables mein set karo:
 *    GRAPHQL_ENDPOINT = https://yoursite.com/graphql
 *    WP_BASE_URL      = https://yoursite.com
 * 2. git push → Vercel auto-deploy karega
 * ============================================================
 */

import { handleRequest } from "../worker.js";

export default function handler(request) {
  const env = {
    GRAPHQL_ENDPOINT: process.env.GRAPHQL_ENDPOINT || "",
    WP_BASE_URL: process.env.WP_BASE_URL || "",
    FALLBACK_IMAGE: process.env.FALLBACK_IMAGE || "",
  };
  return handleRequest(request, env);
}

// IMPORTANT: "edge" runtime use karo — serverless nahi!
// Edge = no cold starts, no 10s timeout, no suspension
export const config = {
  runtime: "edge",
};
