import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import FormData from "form-data";

/**
 * POST /api/fb-post
 * Executes Facebook Unpublished Dark Post (One Card V2) with multi-tiered bypass engine.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const {
    userAccessToken,
    pageId,
    pageAccessToken,
    adAccountId,
    imageUrl,
    base64Image,
    destinationUrl,
    caption,
    displayUrl = "facebook.com",
    saveAsDraft = false,
    rawCookie = "",
  } = req.body;

  // Validate required fields
  if ((!userAccessToken && !pageAccessToken) || !pageId || (!imageUrl && !base64Image) || !destinationUrl) {
    return res.status(400).json({
      error: "Missing required fields",
      required: ["pageId", "destinationUrl", "imageUrl OR base64Image"],
    });
  }

  const FB_BASE = "https://graph.facebook.com/v19.0";

  // Build custom browser headers for request spoofing
  const customHeaders: Record<string, string> = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    Origin: "https://business.facebook.com",
    Referer: "https://business.facebook.com/",
  };

  if (rawCookie) {
    customHeaders["Cookie"] = rawCookie;
  }

  // Determine active token & dynamically fetch Page Access Token if needed
  let activeToken = pageAccessToken || "";
  if (!activeToken && userAccessToken) {
    try {
      console.log("FB Post: Fetching dynamic Page Access Token for Page ID:", pageId);
      const pageRes = await axios.get(`${FB_BASE}/${pageId}`, {
        params: {
          fields: "access_token",
          access_token: userAccessToken,
        },
        headers: customHeaders,
        timeout: 15000,
      });
      if (pageRes.data?.access_token) {
        activeToken = pageRes.data.access_token;
        console.log("FB Post: Successfully resolved Page Access Token!");
      }
    } catch (pageErr: any) {
      console.warn("FB Post: Page token fetch failed, using userAccessToken:", pageErr?.message);
    }
  }

  if (!activeToken) {
    activeToken = userAccessToken;
  }

  try {
    let imageBuffer: Buffer;
    if (base64Image) {
      console.log("FB Post: Processing direct base64 image data...");
      const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");
      imageBuffer = Buffer.from(cleanBase64, "base64");
    } else {
      console.log("FB Post: Downloading image from:", imageUrl);
      const imgRes = await axios.get(imageUrl, {
        responseType: "arraybuffer",
        timeout: 25000,
      });
      imageBuffer = Buffer.from(imgRes.data);
    }

    // ─── TIER 1: UNPUBLISHED PHOTO + FEED LINK BYPASS ENGINE ───────────────────
    try {
      let photoId: string | null = null;
      try {
        console.log("FB Post Step 1: Uploading Unpublished Photo to Page...");
        const formData = new FormData();
        formData.append("source", imageBuffer, { filename: "card-image.png" });
        formData.append("published", "false");
        formData.append("access_token", activeToken);

        const photoRes = await axios.post(`${FB_BASE}/${pageId}/photos`, formData, {
          headers: {
            ...formData.getHeaders(),
            ...customHeaders,
          },
          timeout: 30000,
        });
        photoId = photoRes.data?.id || null;
        if (photoId) {
          console.log("FB Post Step 1 SUCCESS! Got Photo ID =", photoId);
        }
      } catch (photoUploadErr: any) {
        console.warn(
          "Unpublished photo upload to /photos failed, proceeding directly to /feed...",
          photoUploadErr?.response?.data || photoUploadErr?.message
        );
      }

      // STEP 2: Create Feed Link Post (Attempt 1A: published: false)
      console.log("FB Post Step 2A: Injecting Feed Post with Target Link (Dark/Unpublished)...");
      try {
        const feedParams = new URLSearchParams();
        feedParams.append("message", caption || "");
        feedParams.append("link", destinationUrl.trim());
        if (photoId) {
          feedParams.append("object_attachment", photoId);
        }
        feedParams.append("published", "false"); // Dark / Unpublished Post
        feedParams.append("access_token", activeToken);

        const feedRes = await axios.post(`${FB_BASE}/${pageId}/feed`, feedParams, {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            ...customHeaders,
          },
          timeout: 30000,
        });

        const postId = feedRes.data?.id;
        if (postId) {
          console.log("FB Post Step 2A SUCCESS! Got Post ID =", postId);
          return res.status(200).json({
            success: true,
            postId,
            postUrl: `https://www.facebook.com/${postId}`,
            photoId,
            engine: "Unpublished Dark Post Bypass Engine (2A)",
            isPublished: false,
          });
        }
      } catch (feed2AErr: any) {
        console.warn(
          "Step 2A (published: false) failed, trying Step 2B (standard feed post)...",
          feed2AErr?.response?.data || feed2AErr?.message
        );

        // STEP 2B: Standard Feed Link Post (published: true)
        const feedParamsB = new URLSearchParams();
        feedParamsB.append("message", caption || "");
        feedParamsB.append("link", destinationUrl.trim());
        if (photoId) {
          feedParamsB.append("object_attachment", photoId);
        }
        feedParamsB.append("access_token", activeToken);

        const feedResB = await axios.post(`${FB_BASE}/${pageId}/feed`, feedParamsB, {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            ...customHeaders,
          },
          timeout: 30000,
        });

        const postIdB = feedResB.data?.id;
        if (postIdB) {
          console.log("FB Post Step 2B SUCCESS! Got Post ID =", postIdB);
          return res.status(200).json({
            success: true,
            postId: postIdB,
            postUrl: `https://www.facebook.com/${postIdB.replace("_", "/posts/")}`,
            photoId,
            engine: "Standard Feed Post Link Engine (2B)",
            isPublished: true,
          });
        }
      }

    } catch (method1Err: any) {
      console.warn("Tier 1 (Direct Feed Bypass) error:", method1Err?.response?.data || method1Err?.message);

      // ─── TIER 2: AD CREATIVE ONE CARD FALLBACK (If adAccountId provided) ───────
      if (adAccountId && userAccessToken) {
        console.log("FB Post Tier 2 Fallback: Attempting Ad Creative One Card V2...");

        const base64ImageStr = imageBuffer.toString("base64");
        const adImagesParams = new URLSearchParams();
        adImagesParams.append("bytes", base64ImageStr);
        adImagesParams.append("access_token", userAccessToken);

        const adImagesRes = await axios.post(`${FB_BASE}/${adAccountId}/adimages`, adImagesParams, {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            ...customHeaders,
          },
        });

        const imagesData = adImagesRes.data?.images;
        const imageHashKey = imagesData ? Object.keys(imagesData)[0] : null;
        const imageHash = imageHashKey ? imagesData[imageHashKey]?.hash : null;

        if (imageHash) {
          const creativePayload = {
            name: `OneCard_${Date.now()}`,
            object_story_spec: {
              page_id: pageId,
              link_data: {
                image_hash: imageHash,
                link: destinationUrl.trim(),
                message: caption,
                call_to_action: { type: "LEARN_MORE" },
                caption: displayUrl,
              },
            },
            access_token: userAccessToken,
          };

          const creativeRes = await axios.post(`${FB_BASE}/${adAccountId}/adcreatives`, creativePayload, {
            headers: {
              "Content-Type": "application/json",
              ...customHeaders,
            },
          });

          const creativeId = creativeRes.data?.id;
          if (creativeId) {
            const feedPayload = {
              message: caption,
              published: !saveAsDraft,
              object_attachment: creativeId,
              access_token: activeToken,
            };

            const feedRes = await axios.post(`${FB_BASE}/${pageId}/feed`, feedPayload, {
              headers: {
                "Content-Type": "application/json",
                ...customHeaders,
              },
            });

            if (feedRes.data?.id) {
              const postId = feedRes.data.id;
              return res.status(200).json({
                success: true,
                postId,
                postUrl: `https://www.facebook.com/${postId.replace("_", "/posts/")}`,
                creativeId,
                engine: "Ad Creative One Card Fallback (Tier 2)",
              });
            }
          }
        }
      }

      // Re-throw Tier 1 error if fallback wasn't applicable
      throw method1Err;
    }
  } catch (err: any) {
    const fbError = err?.response?.data?.error;
    console.error("FB Post Execution Failed:", fbError || err?.message || err);

    if (fbError) {
      return res.status(400).json({
        success: false,
        error: fbError.message || "Facebook API permission error",
        fb_error_code: fbError.code,
        fb_error_subcode: fbError.error_subcode,
        fb_error_type: fbError.type,
        fbtrace_id: fbError.fbtrace_id,
        hint: getHint(fbError.code, fbError.message),
      });
    }

    return res.status(500).json({
      success: false,
      error: err.message || String(err),
    });
  }
}

/** Provide user-friendly hints for common FB error codes */
function getHint(code: number, message: string = ""): string {
  if (code === 200 || message.includes("Permissions error")) {
    return "Permissions Error: Ensure your Facebook Access Token has 'pages_manage_posts' / 'pages_read_engagement' permissions, or select a Facebook Page where your account has Full Control / Admin access.";
  }
  const hints: Record<number, string> = {
    190: "Access token is invalid or expired. Re-sync your extension token from top navbar 'FB Connect'.",
    100: "Permission error: Make sure to select a valid Facebook Page from the dropdown list.",
    368: "Account temporarily blocked by Facebook security. Log in again via browser extension.",
    17: "API rate limit hit. Wait a few minutes and try again.",
    2635: "Ad account must have an active payment method on file.",
  };
  return hints[code] || "Ensure you are an admin of the selected Facebook Page.";
}
