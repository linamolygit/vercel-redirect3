import type { NextApiRequest, NextApiResponse } from "next";
import { GraphQLClient, gql } from "graphql-request";

// Helper to remove HTML tags and clean text
function cleanExcerpt(excerpt: string): string {
  if (!excerpt) return "";
  return excerpt
    .replace(/<[^>]+>/g, "")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .trim();
}

// 🌐 1. WP-JSON REST API Fetcher (Built-in on 99% of WP sites, no plugins needed!)
async function fetchFromWPJson(baseUrl: string, slug: string): Promise<any | null> {
  try {
    // Try posts endpoint
    const postsUrl = `${baseUrl.replace(/\/$/, "")}/wp-json/wp/v2/posts?slug=${slug}&_embed`;
    const res = await fetch(postsUrl);
    if (res.ok) {
      const posts = await res.json();
      if (Array.isArray(posts) && posts.length > 0) {
        const post = posts[0];
        const imageUrl = post._embedded?.["wp:featuredmedia"]?.[0]?.source_url || "";
        return {
          title: post.title?.rendered || "",
          excerpt: post.excerpt?.rendered || "",
          imageUrl,
          postPath: slug,
        };
      }
    }

    // Try pages endpoint (in case the link is a WordPress Page, not a Post)
    const pagesUrl = `${baseUrl.replace(/\/$/, "")}/wp-json/wp/v2/pages?slug=${slug}&_embed`;
    const pagesRes = await fetch(pagesUrl);
    if (pagesRes.ok) {
      const pages = await pagesRes.json();
      if (Array.isArray(pages) && pages.length > 0) {
        const page = pages[0];
        const imageUrl = page._embedded?.["wp:featuredmedia"]?.[0]?.source_url || "";
        return {
          title: page.title?.rendered || "",
          excerpt: page.excerpt?.rendered || "",
          imageUrl,
          postPath: slug,
        };
      }
    }

    return null;
  } catch (error) {
    console.error("WP-JSON Fetch failed for", baseUrl, slug, error);
    return null;
  }
}

// 🕸️ 2. GraphQL Fetcher (Fallback in case WP-JSON is custom/disabled)
async function fetchFromGraphQL(endpoint: string, postPath: string): Promise<any | null> {
  try {
    const client = new GraphQLClient(endpoint, { timeout: 6000 });
    const query = gql`
      query GetPostByUri($uri: ID!) {
        post(id: $uri, idType: URI) {
          title
          excerpt
          featuredImage {
            node {
              sourceUrl
            }
          }
        }
      }
    `;
    const data: any = await client.request(query, { uri: `/${postPath}/` });
    if (data && data.post) {
      return {
        title: data.post.title || "",
        excerpt: data.post.excerpt || "",
        imageUrl: data.post.featuredImage?.node?.sourceUrl || "",
        postPath,
      };
    }
    return null;
  } catch (error) {
    return null;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const targetUrl = (req.query.url as string) || req.body.url;
  if (!targetUrl) {
    return res.status(400).json({ error: "Missing WordPress post URL" });
  }

  try {
    const urlObj = new URL(targetUrl);
    const origin = urlObj.origin;
    
    // Clean path (e.g. "/post-name/" becomes ["post-name"])
    const pathSegments = urlObj.pathname.split("/").filter(s => s.trim() !== "");
    
    if (pathSegments.length === 0) {
      return res.status(400).json({ error: "Invalid post URL. Cannot convert homepage URLs." });
    }

    const slug = pathSegments[pathSegments.length - 1];
    let resultData: any = null;

    // ─── TRY 1: Native WP-JSON REST API (Primary, No plugins required!) ───────
    resultData = await fetchFromWPJson(origin, slug);

    // If WordPress is in a subdirectory (e.g., origin/blog/post-slug)
    if (!resultData && pathSegments.length > 1) {
      const subDir = pathSegments[0];
      resultData = await fetchFromWPJson(`${origin}/${subDir}`, slug);
    }

    // ─── TRY 2: GraphQL Fallback (If REST API is disabled) ───────────────────
    if (!resultData) {
      const fullPath = pathSegments.join("/");
      resultData = await fetchFromGraphQL(`${origin}/graphql`, fullPath);
      
      if (!resultData && pathSegments.length > 1) {
        const subDir = pathSegments[0];
        resultData = await fetchFromGraphQL(`${origin}/${subDir}/graphql`, slug);
      }
    }

    // ─── TRY 3: Secondary Env Fallback ──────────────────────────────────────
    if (!resultData && process.env.GRAPHQL_ENDPOINT) {
      const fullPath = pathSegments.join("/");
      resultData = await fetchFromGraphQL(process.env.GRAPHQL_ENDPOINT, fullPath);
    }

    if (!resultData) {
      return res.status(404).json({
        error: "Could not fetch metadata from the WordPress site. Please verify the target WordPress URL and settings.",
      });
    }

    return res.status(200).json({
      title: resultData.title || "",
      excerpt: cleanExcerpt(resultData.excerpt || ""),
      imageUrl: resultData.imageUrl || "",
      postPath: resultData.postPath || slug,
    });
  } catch (error: any) {
    console.error("WordPress metadata fetch error:", error);
    return res.status(500).json({
      error: `Failed to process WordPress post details: ${error.message || error}`,
    });
  }
}
