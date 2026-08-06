import React from "react";
import Head from "next/head";
import { GetServerSideProps } from "next";
import { query, initDb } from "../lib/db";

// ─── PERFORMANCE OPTIMIZATION ────────────────────────────────────────────────
// 1. DB Init flag: initDb() runs CREATE TABLE queries — we only need it ONCE
//    per serverless function instance, not on every request.
let dbReady = false;
async function ensureDb() {
  if (!dbReady) {
    await initDb();
    dbReady = true;
  }
}

// 2. In-memory redirect cache: avoids hitting MySQL on every click for the
//    same short ID. TTL = 60 seconds. Cache is per-lambda-instance.
interface CacheEntry {
  data: any;
  expiresAt: number;
}
const redirectCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60_000; // 60 seconds

function getCached(shortId: string): any | null {
  const entry = redirectCache.get(shortId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    redirectCache.delete(shortId);
    return null;
  }
  return entry.data;
}

function setCache(shortId: string, data: any) {
  // Keep cache size reasonable (max 500 entries)
  if (redirectCache.size >= 500) {
    const firstKey = redirectCache.keys().next().value;
    if (firstKey) redirectCache.delete(firstKey);
  }
  redirectCache.set(shortId, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}
// ─────────────────────────────────────────────────────────────────────────────

// User-Agent crawler detection list
const CRAWLER_PATTERNS = [
  "facebookexternalhit",
  "facebot",
  "Twitterbot",
  "WhatsApp",
  "LinkedInBot",
  "TelegramBot",
  "Slackbot",
  "Discordbot",
  "Pinterest",
  "Googlebot",
  "bingbot",
  "Applebot",
  "ia_archiver"
];

function isCrawler(userAgent: string = ""): boolean {
  const ua = userAgent.toLowerCase();
  return CRAWLER_PATTERNS.some(pattern => ua.includes(pattern.toLowerCase()));
}

function isFacebookReferer(referer: string = ""): boolean {
  return referer.includes("facebook.com") || referer.includes("fb.com");
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const { id } = ctx.params as { id: string };
  const userAgent = ctx.req.headers["user-agent"] || "";
  const referer  = ctx.req.headers["referer"]  || "";
  const fbclid   = ctx.query.fbclid || "";

  // ── FAST PATH: Detect crawler/real-user BEFORE any DB work ─────────────────
  // For real users (non-crawlers), we want the redirect to fire as fast as
  // possible. We still need the destination URL from DB, but we skip initDb()
  // on hot paths by using the dbReady flag.
  const crawlerDetected = isCrawler(userAgent) || isFacebookReferer(referer) || !!fbclid;

  try {
    // Only run initDb() once per lambda cold-start
    await ensureDb();

    // ── Try cache first, fall back to DB ──────────────────────────────────────
    let redirectData = getCached(id);
    if (!redirectData) {
      const results = (await query(
        "SELECT id, original_url, custom_title, custom_desc, custom_image, og_image_processed_url FROM redirects WHERE short_id = ?",
        [id]
      )) as any[];

      if (!results || results.length === 0) {
        return { notFound: true };
      }

      redirectData = results[0];
      // Cache the result so subsequent clicks don't hit MySQL
      setCache(id, redirectData);
    }

    const destination = redirectData.original_url;

    // ── 🚀 REAL USER: Redirect immediately, log analytics in background ───────
    if (!crawlerDetected) {
      // Fire-and-forget analytics — runs AFTER redirect is returned to user
      setImmediate(async () => {
        try {
          const ipAddress = (ctx.req.headers["x-forwarded-for"] || ctx.req.socket?.remoteAddress || "").toString().split(",")[0].trim();
          const country   = (ctx.req.headers["x-vercel-ip-country"] || "Unknown").toString();
          const city      = (ctx.req.headers["x-vercel-ip-city"]    || "Unknown").toString();

          const UAParser = require("ua-parser-js");
          const parsedUA = new UAParser(userAgent).getResult();
          const deviceType = parsedUA.device.type   || "Desktop";
          const browser    = parsedUA.browser.name  || "Unknown";
          const os         = parsedUA.os.name       || "Unknown";

          let platform = "Direct";
          if (isFacebookReferer(referer) || !!fbclid || userAgent.toLowerCase().includes("facebook")) platform = "Facebook";
          else if (referer.includes("t.co") || referer.includes("twitter")) platform = "Twitter";
          else if (referer.includes("instagram")) platform = "Instagram";
          else if (referer.includes("linkedin"))  platform = "LinkedIn";
          else if (referer.includes("google"))    platform = "Google";
          else if (referer) {
            try { platform = new URL(referer).hostname.replace("www.", ""); } catch { platform = referer; }
          }

          await query(
            "INSERT INTO analytics (redirect_id, ip_address, user_agent, referrer, country, city, device_type, browser, os, platform) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [redirectData.id, ipAddress, userAgent, referer, country, city, deviceType, browser, os, platform]
          );
        } catch (e) {
          console.error("Analytics insert error:", e);
        }
      });

      // ⚡ Instant redirect — no waiting for analytics!
      return {
        redirect: {
          destination,
          permanent: false,
        },
      };
    }

    // ── 🕷️ CRAWLER: Log analytics synchronously, then serve OG page ──────────
    const ipAddress = (ctx.req.headers["x-forwarded-for"] || ctx.req.socket?.remoteAddress || "").toString().split(",")[0].trim();
    const country   = (ctx.req.headers["x-vercel-ip-country"] || "Unknown").toString();
    const city      = (ctx.req.headers["x-vercel-ip-city"]    || "Unknown").toString();

    const UAParser  = require("ua-parser-js");
    const parsedUA  = new UAParser(userAgent).getResult();
    const deviceType = parsedUA.device.type  || "Desktop";
    const browser    = parsedUA.browser.name || "Unknown";
    const os         = parsedUA.os.name      || "Unknown";

    let platform = "Direct";
    if (isFacebookReferer(referer) || !!fbclid || userAgent.toLowerCase().includes("facebook")) platform = "Facebook";
    else if (referer.includes("t.co") || referer.includes("twitter")) platform = "Twitter";
    else if (referer.includes("instagram")) platform = "Instagram";
    else if (referer.includes("linkedin"))  platform = "LinkedIn";
    else if (referer.includes("google"))    platform = "Google";
    else if (referer) {
      try { platform = new URL(referer).hostname.replace("www.", ""); } catch { platform = referer; }
    }

    query(
      "INSERT INTO analytics (redirect_id, ip_address, user_agent, referrer, country, city, device_type, browser, os, platform) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [redirectData.id, ipAddress, userAgent, referer, country, city, deviceType, browser, os, platform]
    ).catch(e => console.error("Analytics insert error:", e));

    // 🕷️ Crawler Detected: Render OG metadata HTML page
    const host = ctx.req.headers.host || "localhost:3000";
    const protocol = ctx.req.headers["x-forwarded-proto"] || "http";
    const requestUrl = `${protocol}://${host}/${id}`;

    // Resolve pre-cached square image, falling back to original custom image
    const resolvedImageUrl = redirectData.og_image_processed_url || redirectData.custom_image || "";

    return {
      props: {
        destination,
        title: redirectData.custom_title || "Article Preview",
        description: redirectData.custom_desc || "",
        imageUrl: resolvedImageUrl,
        canonicalUrl: requestUrl,
        siteName: host.split(".")[0],
        fbAppId: process.env.FB_APP_ID || "1610945270454998",
      },
    };
  } catch (error) {
    console.error(`Redirect lookup error for id '${id}':`, error);
    // Fallback: If DB fails, try to redirect to WP_BASE_URL if set, or return 404
    const fallbackUrl = process.env.WP_BASE_URL || "/";
    return {
      redirect: {
        destination: fallbackUrl,
        permanent: false,
      },
    };
  }
};

interface RedirectProps {
  destination: string;
  title: string;
  description: string;
  imageUrl: string;
  canonicalUrl: string;
  siteName: string;
  fbAppId: string;
}

const RedirectPage: React.FC<RedirectProps> = ({
  destination,
  title,
  description,
  imageUrl,
  canonicalUrl,
  siteName,
  fbAppId,
}) => {
  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonicalUrl} />

        {/* Facebook App ID */}
        <meta property="fb:app_id" content={fbAppId} />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="article" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        {imageUrl && (
          <>
            <meta property="og:image" content={imageUrl} />
            <meta property="og:image:secure_url" content={imageUrl} />
            <meta property="og:image:width" content="1080" />
            <meta property="og:image:height" content="1080" />
            <meta property="og:image:type" content="image/jpeg" />
            <meta property="og:image:alt" content={title} />
            <meta property="fb:use_square_image" content="true" />
          </>
        )}
        <meta property="og:locale" content="en_US" />
        <meta property="og:site_name" content={siteName} />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        {imageUrl && <meta name="twitter:image" content={imageUrl} />}

        {/* Client-side backup redirects (Use JavaScript redirect to prevent crawlers from following) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== "undefined") {
                window.location.replace(${JSON.stringify(destination)});
              }
            `,
          }}
        />
      </Head>
      <div
        style={{
          fontFamily: "sans-serif",
          textAlign: "center",
          padding: "50px",
          color: "#f3f4f6",
          background: "#0a051b",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <p style={{ fontSize: "1.2rem", color: "#9ca3af" }}>
          Redirecting to <a href={destination} style={{ color: "#818cf8", textDecoration: "none", fontWeight: "bold" }}>{title}</a>...
        </p>
      </div>
    </>
  );
};

export default RedirectPage;
