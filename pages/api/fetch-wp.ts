import type { NextApiRequest, NextApiResponse } from "next";
import { GraphQLClient, gql } from "graphql-request";

// Function to remove HTML tags and WordPress shortcodes from excerpt
function cleanExcerpt(excerpt: string): string {
  if (!excerpt) return "";
  return excerpt
    .replace(/<[^>]+>/g, "") // remove HTML tags
    .replace(/\[[^\]]*\]/g, "") // remove shortcodes like [caption]
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .trim();
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
    const graphqlEndpoint = process.env.GRAPHQL_ENDPOINT;
    if (!graphqlEndpoint) {
      return res.status(500).json({
        error: "Server configuration missing: GRAPHQL_ENDPOINT environment variable is not set.",
      });
    }

    const wpBaseUrl = process.env.WP_BASE_URL || graphqlEndpoint.replace(/\/graphql\/?$/, "");

    // Extract path from the target URL
    const urlObj = new URL(targetUrl);
    let postPath = urlObj.pathname.replace(/^\/|\/$/g, "");

    // If WordPress is installed in a subdirectory, remove that directory prefix
    try {
      const wpBaseObj = new URL(wpBaseUrl);
      const wpSubdir = wpBaseObj.pathname.replace(/^\/|\/$/g, "");
      if (wpSubdir && postPath.startsWith(wpSubdir)) {
        postPath = postPath.substring(wpSubdir.length).replace(/^\/|\/$/g, "");
      }
    } catch (e) {
      // Ignore URL parsing errors of base URL
    }

    if (!postPath) {
      return res.status(400).json({ error: "Invalid post path. Cannot convert homepage URL." });
    }

    // Initialize GraphQL client
    const client = new GraphQLClient(graphqlEndpoint, { timeout: 8000 });

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

    // Query WPGraphQL with leading and trailing slashes
    const data: any = await client.request(query, { uri: `/${postPath}/` });

    if (!data || !data.post) {
      return res.status(404).json({ error: "Post not found on WordPress. Please verify the URL slug." });
    }

    const post = data.post;
    return res.status(200).json({
      title: post.title || "",
      excerpt: cleanExcerpt(post.excerpt || ""),
      imageUrl: post.featuredImage?.node?.sourceUrl || "",
      imageAlt: post.featuredImage?.node?.altText || post.title || "",
      postPath: postPath,
    });
  } catch (error: any) {
    console.error("WordPress metadata fetch error:", error);
    return res.status(500).json({
      error: `Failed to fetch WordPress post: ${error.message || error}`,
    });
  }
}
