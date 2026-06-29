import type { NextApiRequest, NextApiResponse } from "next";
import { GraphQLClient, gql } from "graphql-request";

// Helper to remove HTML tags and shortcodes
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

// Check if a GraphQL endpoint is active and supports WPGraphQL
async function tryGraphQLFetch(endpoint: string, postPath: string): Promise<any | null> {
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
              altText
            }
          }
        }
      }
    `;
    const data = await client.request(query, { uri: `/${postPath}/` });
    return data;
  } catch (error) {
    // If query fails, return null so we can try fallback endpoints
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
    
    // Clean path (e.g., "/blog/post-name/" becomes ["blog", "post-name"])
    const pathSegments = urlObj.pathname.split("/").filter(s => s.trim() !== "");
    
    if (pathSegments.length === 0) {
      return res.status(400).json({ error: "Invalid post URL. Cannot convert homepage URLs." });
    }

    let graphqlData: any = null;
    let finalPostPath = "";

    // 🚀 DYNAMIC MULTI-SITE GRAPHQL ENDPOINT RESOLVER
    // Try multiple possible paths to support subdirectory installs (e.g., domain.com/blog/graphql)
    
    // Try 1: Try the most common guess - origin/graphql using the last path segment as the slug
    // e.g. input: https://myblog.com/post-name/ -> try: https://myblog.com/graphql with slug "/post-name/"
    const slugOnly = pathSegments[pathSegments.length - 1];
    let endpoint1 = `${origin}/graphql`;
    graphqlData = await tryGraphQLFetch(endpoint1, slugOnly);
    if (graphqlData && graphqlData.post) {
      finalPostPath = slugOnly;
    }

    // Try 2: If Try 1 fails, try using the full pathname path
    // e.g., if there's a category in path: https://myblog.com/news/post-name/ -> try: https://myblog.com/graphql with slug "/news/post-name/"
    if (!graphqlData || !graphqlData.post) {
      const fullPath = pathSegments.join("/");
      graphqlData = await tryGraphQLFetch(endpoint1, fullPath);
      if (graphqlData && graphqlData.post) {
        finalPostPath = fullPath;
      }
    }

    // Try 3: Try subdirectory-based GraphQL (e.g., if installed in a subdirectory like /blog/)
    // e.g. input: https://site.com/blog/post-name/ -> try: https://site.com/blog/graphql with slug "/post-name/"
    if ((!graphqlData || !graphqlData.post) && pathSegments.length > 1) {
      const subdirectory = pathSegments[0];
      const subslug = pathSegments.slice(1).join("/");
      let endpoint2 = `${origin}/${subdirectory}/graphql`;
      graphqlData = await tryGraphQLFetch(endpoint2, subslug);
      if (graphqlData && graphqlData.post) {
        finalPostPath = subslug;
      }
    }

    // Try 4: Fallback to owner's own GRAPHQL_ENDPOINT environment variable if set
    if ((!graphqlData || !graphqlData.post) && process.env.GRAPHQL_ENDPOINT) {
      const fullPath = pathSegments.join("/");
      graphqlData = await tryGraphQLFetch(process.env.GRAPHQL_ENDPOINT, fullPath);
      if (graphqlData && graphqlData.post) {
        finalPostPath = fullPath;
      }
    }

    if (!graphqlData || !graphqlData.post) {
      return res.status(404).json({
        error: "WordPress site se metadata fetch nahi kiya ja saka. Kripya check karein ki target WordPress site par 'WPGraphQL' plugin active hai ya nahi.",
      });
    }

    const post = graphqlData.post;
    return res.status(200).json({
      title: post.title || "",
      excerpt: cleanExcerpt(post.excerpt || ""),
      imageUrl: post.featuredImage?.node?.sourceUrl || "",
      imageAlt: post.featuredImage?.node?.altText || post.title || "",
      postPath: finalPostPath,
    });
  } catch (error: any) {
    console.error("WordPress metadata fetch error:", error);
    return res.status(500).json({
      error: `WordPress post details process fail ho gayi: ${error.message || error}`,
    });
  }
}
