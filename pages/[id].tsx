import React from "react";
import Head from "next/head";
import { GetServerSideProps } from "next";
import { query, initDb } from "../lib/db";

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
  const referer = ctx.req.headers["referer"] || "";
  const fbclid = ctx.query.fbclid || "";

  try {
    // Ensure database table exists
    await initDb();

    // Query database for the short redirect ID
    const results = (await query(
      "SELECT id, original_url, custom_title, custom_desc, custom_image FROM redirects WHERE short_id = ?",
      [id]
    )) as any[];

    if (!results || results.length === 0) {
      return {
        notFound: true,
      };
    }

    const redirectData = results[0];
    const destination = redirectData.original_url;

    // Track Analytics
    const ipAddress = (ctx.req.headers["x-forwarded-for"] || ctx.req.socket.remoteAddress || "").toString().split(",")[0].trim();
    const country = (ctx.req.headers["x-vercel-ip-country"] || ctx.req.headers["cf-ipcountry"] || "Unknown").toString();
    const city = (ctx.req.headers["x-vercel-ip-city"] || ctx.req.headers["cf-ipcity"] || "Unknown").toString();

    // Parse User-Agent
    const UAParser = require("ua-parser-js");
    const parser = new UAParser(userAgent);
    const parsedUA = parser.getResult();
    const deviceType = parsedUA.device.type || "Desktop";
    const browser = parsedUA.browser.name || "Unknown";
    const os = parsedUA.os.name || "Unknown";

    // Detect Social Platforms from Referer & UA
    let platform = "Direct";
    if (isFacebookReferer(referer) || !!fbclid || userAgent.toLowerCase().includes("facebook")) {
      platform = "Facebook";
    } else if (referer.includes("t.co") || referer.includes("twitter")) {
      platform = "Twitter";
    } else if (referer.includes("instagram")) {
      platform = "Instagram";
    } else if (referer.includes("linkedin")) {
      platform = "LinkedIn";
    } else if (referer.includes("google")) {
      platform = "Google";
    } else if (referer) {
      try {
        platform = new URL(referer).hostname.replace("www.", "");
      } catch (e) {
        platform = referer;
      }
    }

    // Insert asynchronously (fire and forget)
    query(
      "INSERT INTO analytics (redirect_id, ip_address, user_agent, referrer, country, city, device_type, browser, os, platform) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [redirectData.id, ipAddress, userAgent, referer, country, city, deviceType, browser, os, platform]
    ).catch(e => console.error("Analytics insert error:", e));

    const crawlerDetected = isCrawler(userAgent) || isFacebookReferer(referer) || !!fbclid;

    // 🚀 Normal Users: Instant server-side 302 redirect to target WordPress post
    if (!crawlerDetected) {
      return {
        redirect: {
          destination: destination,
          permanent: false,
        },
      };
    }

    // 🕷️ Crawler Detected: Render OG metadata HTML page
    const host = ctx.req.headers.host || "localhost:3000";
    const protocol = ctx.req.headers["x-forwarded-proto"] || "http";
    const requestUrl = `${protocol}://${host}/${id}`;

    return {
      props: {
        destination,
        title: redirectData.custom_title || "Article Preview",
        description: redirectData.custom_desc || "",
        imageUrl: redirectData.custom_image || "",
        canonicalUrl: requestUrl,
        siteName: host.split(".")[0],
        fbAppId: process.env.FB_APP_ID || "966882222",
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
        {imageUrl && <meta property="og:image" content={imageUrl} />}
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
