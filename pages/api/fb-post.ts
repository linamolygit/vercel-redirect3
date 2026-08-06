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

  let lastFbError: any = null;

  // ─── STEP 1: RESOLVE PAGE ACCESS TOKEN VIA /me/accounts ───────────────────
  let activeToken = pageAccessToken || "";

  if (!activeToken && userAccessToken) {
    try {
      console.log("FB Post: Resolving Page Access Token via /me/accounts for Page ID:", pageId);
      const meAccountsRes = await axios.get(`${FB_BASE}/me/accounts`, {
        params: {
          fields: "id,name,access_token",
          access_token: userAccessToken,
        },
        headers: customHeaders,
        timeout: 15000,
      });

      const pageList = meAccountsRes.data?.data || [];
      const foundPage = pageList.find((p: any) => String(p.id) === String(pageId));

      if (foundPage?.access_token) {
        activeToken = foundPage.access_token;
        console.log("FB Post SUCCESS: Resolved Page Access Token from /me/accounts!");
      } else if (pageList.length > 0 && pageList[0].access_token) {
        activeToken = pageList[0].access_token;
        console.log("FB Post SUCCESS: Used primary Page Access Token from /me/accounts!");
      }
    } catch (pageErr: any) {
      if (pageErr?.response?.data?.error) lastFbError = pageErr.response.data.error;
      console.warn("FB Post: /me/accounts token lookup failed:", pageErr?.response?.data || pageErr?.message);
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
    const tokensToTry = [activeToken, userAccessToken].filter(Boolean);
    const uniqueTokens = Array.from(new Set(tokensToTry));

    let photoId: string | null = null;

    // Try uploading photo with token sequence
    for (const token of uniqueTokens) {
      try {
        console.log("FB Post Step 1: Uploading Unpublished Photo to Page...");
        const formData = new FormData();
        formData.append("source", imageBuffer, { filename: "card-image.png" });
        formData.append("published", "false");
        formData.append("access_token", token);

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
          break;
        }
      } catch (photoUploadErr: any) {
        if (photoUploadErr?.response?.data?.error) lastFbError = photoUploadErr.response.data.error;
        console.warn(
          `Photo upload to /photos failed with token prefix (${token.slice(0, 10)}...):`,
          photoUploadErr?.response?.data || photoUploadErr?.message
        );
      }
    }

    // STEP 2A: Create Dark Feed Link Post (published: false)
    for (const token of uniqueTokens) {
      try {
        console.log(`FB Post Step 2A: Injecting Dark Feed Post with token (${token.slice(0, 10)}...)...`);
        const feedParams = new URLSearchParams();
        feedParams.append("message", caption || "");
        feedParams.append("link", destinationUrl.trim());
        if (photoId) {
          feedParams.append("object_attachment", photoId);
        }
        feedParams.append("published", "false");
        feedParams.append("access_token", token);

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
      } catch (feedErr: any) {
        if (feedErr?.response?.data?.error) lastFbError = feedErr.response.data.error;
        console.warn(
          `Feed post 2A attempt failed with token (${token.slice(0, 10)}...):`,
          feedErr?.response?.data || feedErr?.message
        );
      }
    }

    // STEP 2B: Try published=0 as alternative URLSearchParam flag
    for (const token of uniqueTokens) {
      try {
        console.log(`FB Post Step 2B: Injecting Dark Feed Post (published=0)...`);
        const feedParams = new URLSearchParams();
        feedParams.append("message", caption || "");
        feedParams.append("link", destinationUrl.trim());
        if (photoId) {
          feedParams.append("object_attachment", photoId);
        }
        feedParams.append("published", "0");
        feedParams.append("access_token", token);

        const feedRes = await axios.post(`${FB_BASE}/${pageId}/feed`, feedParams, {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            ...customHeaders,
          },
          timeout: 30000,
        });

        const postId = feedRes.data?.id;
        if (postId) {
          console.log("FB Post Step 2B SUCCESS! Got Post ID =", postId);
          return res.status(200).json({
            success: true,
            postId,
            postUrl: `https://www.facebook.com/${postId}`,
            photoId,
            engine: "Unpublished Dark Post Bypass Engine (2B)",
            isPublished: false,
          });
        }
      } catch (feedBErr: any) {
        if (feedBErr?.response?.data?.error) lastFbError = feedBErr.response.data.error;
        console.warn(`Feed post 2B attempt failed:`, feedBErr?.response?.data || feedBErr?.message);
      }
    }

    // STEP 2C: Standard Feed Link Post (published: true)
    for (const token of uniqueTokens) {
      try {
        console.log(`FB Post Step 2C (published: true) with token (${token.slice(0, 10)}...)...`);
        const feedParamsC = new URLSearchParams();
        feedParamsC.append("message", caption || "");
        feedParamsC.append("link", destinationUrl.trim());
        if (photoId) {
          feedParamsC.append("object_attachment", photoId);
        }
        feedParamsC.append("access_token", token);

        const feedResC = await axios.post(`${FB_BASE}/${pageId}/feed`, feedParamsC, {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            ...customHeaders,
          },
          timeout: 30000,
        });

        const postIdC = feedResC.data?.id;
        if (postIdC) {
          console.log("FB Post Step 2C SUCCESS! Got Post ID =", postIdC);
          return res.status(200).json({
            success: true,
            postId: postIdC,
            postUrl: `https://www.facebook.com/${postIdC.replace("_", "/posts/")}`,
            photoId,
            engine: "Standard Feed Post Engine (2C)",
            isPublished: true,
          });
        }
      } catch (feedCErr: any) {
        if (feedCErr?.response?.data?.error) lastFbError = feedCErr.response.data.error;
        console.warn(`Feed post 2C attempt failed:`, feedCErr?.response?.data || feedCErr?.message);
      }
    }

    // ─── TIER 2: AD CREATIVE ONE CARD FALLBACK (If adAccountId provided) ───────
    if (adAccountId && userAccessToken) {
      try {
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
      } catch (tier2Err: any) {
        if (tier2Err?.response?.data?.error) lastFbError = tier2Err.response.data.error;
        console.warn("Tier 2 Ad Creative error:", tier2Err?.response?.data || tier2Err?.message);
      }
    }

    if (lastFbError) {
      return res.status(400).json({
        success: false,
        error: lastFbError.message || "Facebook API error",
        fb_error_code: lastFbError.code,
        fb_error_subcode: lastFbError.error_subcode,
        fb_error_type: lastFbError.type,
        fbtrace_id: lastFbError.fbtrace_id,
        hint: getHint(lastFbError.code, lastFbError.message),
      });
    }

    return res.status(400).json({
      success: false,
      error: "Facebook API posting failed. Please ensure your token is active and you have Admin access on the selected Page.",
    });

  } catch (err: any) {
    const fbError = err?.response?.data?.error || lastFbError;
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
    return "Permissions Error: Ensure your account has Admin/Full Control access to the selected Facebook Page, or re-sync token from 'FB Connect'.";
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
