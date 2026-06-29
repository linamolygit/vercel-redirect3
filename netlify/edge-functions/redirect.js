/**
 * Netlify Edge Function — WordPress OG-Tag Redirect
 * ============================================================
 * Ye file worker.js ka same logic use karta hai,
 * sirf Netlify Edge Function API ke saath compatible hai.
 *
 * Deploy: Netlify automatically is file ko detect karta hai
 * netlify.toml mein edge_functions config ke zariye.
 * ============================================================
 */

import { handleRequest } from "../../worker.js";

export default async (request, context) => {
  // Netlify env vars Deno.env.get se aate hain
  const env = {
    GRAPHQL_ENDPOINT:
      Deno.env.get("GRAPHQL_ENDPOINT") ||
      "https://YOUR-WORDPRESS-SITE.com/graphql",
    WP_BASE_URL:
      Deno.env.get("WP_BASE_URL") || "https://YOUR-WORDPRESS-SITE.com",
    FALLBACK_IMAGE: Deno.env.get("FALLBACK_IMAGE") || "",
  };

  return handleRequest(request, env);
};

// Har route pe apply karo
export const config = {
  path: "/*",
};
