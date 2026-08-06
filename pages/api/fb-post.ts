import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import FormData from "form-data";

/**
 * POST /api/fb-post
 * Executes Facebook Unpublished Dark Post (One Card V2) with direct bypass engine.
 * Payload:
 * {
 *   userAccessToken: string,
 *   pageId: string,
 *   pageAccessToken?: string,
 *   adAccountId?: string,
 *   imageUrl?: string,
 *   base64Image?: string,
 *   destinationUrl: string,
 *   caption?: string,
 *   displayUrl?: string,
 *   saveAsDraft?: boolean,
 *   rawCookie?: string
 * }
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
      console.warn("FB Post: Page token fetch failed, falling back to userAccessToken...", pageErr?.message);
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

    // ─── METHOD 1: UNPUBLISHED PHOTO + FEED LINK BYPASS ENGINE ─────────────────
    try {
      let photoId: string | null = null;
      try {
        console.log("FB Post Step 1: Uploading Unpublished Photo to Page...");
        const formData = new FormData();
        formData.append("source", imageBuffer, { filename: "card-image.png" });
        formData.append("published", "false"); // Photo hidden from timeline
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
          "Unpublished photo upload to /photos failed (permissions restriction), proceeding directly to /feed...",
          photoUploadErr?.response?.data || photoUploadErr?.message
        );
      }

      // STEP 2: Create Feed Link Post
      console.log("FB Post Step 2: Injecting Feed Post with Target Link...");
      const feedParams = new URLSearchParams();
      feedParams.append("message", caption || "");
      feedParams.append("link", destinationUrl.trim());
      if (photoId) {
        feedParams.append("object_attachment", photoId);
      }
      feedParams.append("published", saveAsDraft ? "false" : "false"); // Dark / Unpublished Post
      feedParams.append("access_token", activeToken);

      const feedRes = await axios.post(`${FB_BASE}/${pageId}/feed`, feedParams, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          ...customHeaders,
        },
        timeout: 30000,
      });

      const postId = feedRes.data?.id;
      if (!postId) {
        throw new Error(`Page feed publish failed: ${JSON.stringify(feedRes.data)}`);
      }

      console.log("FB Post Step 2 SUCCESS! Got Post ID =", postId);

      const postUrl = `https://www.facebook.com/${postId}`;

      return res.status(200).json({
        success: true,
        postId,
        postUrl,
        photoId,
        engine: "Unpublished Post Direct Bypass Engine",
        isPublished: false,
      });

    } catch (method1Err: any) {
      console.warn("Method 1 (Direct Feed Bypass) error:", method1Err?.response?.data || method1Err?.message);

      // ─── METHOD 2: AD CREATIVE ONE CARD FALLBACK (If adAccountId provided) ─────
      if (adAccountId && userAccessToken) {
        console.log("FB Post Method 2 Fallback: Attempting Ad Creative One Card V2...");

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
                engine: "Ad Creative One Card Fallback",
              });
            }
          }
        }
      }

      // Re-throw Method 1 error if fallback wasn't applicable
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
        hint: getHint(fbError.code),
      });
    }

    return res.status(500).json({
      success: false,
      error: err.message || String(err),
    });
  }
}

/** Provide user-friendly hints for common FB error codes */
function getHint(code: number): string {
  const hints: Record<number, string> = {
    190: "Access token is invalid or expired. Re-sync your extension token.",
    100: "Permission error: Make sure to select a Facebook Page from the dropdown so the Page Access Token is loaded.",
    200: "Permission error: The selected page requires Page Admin privileges or Page Access Token.",
    368: "Temporarily blocked by Facebook. Log in again from browser extension.",
    17: "API rate limit hit. Wait a few minutes and try again.",
    2635: "Ad account must have an active payment method on file.",
  };
  return hints[code] || "Ensure you are an admin of the selected Facebook Page.";
}
