import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import FormData from "form-data";

/**
 * POST /api/fb-post
 * Direct Clickable Image Card Publisher Engine for Facebook Pages
 * Strictly creates Clickable Image Link Cards (where clicking the image opens destinationUrl).
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
    let publicImageUrl = imageUrl || "";

    if (base64Image) {
      console.log("FB Post: Processing direct base64 image data...");
      const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");
      imageBuffer = Buffer.from(cleanBase64, "base64");

      // Server-side ImgBB upload for public URL if missing
      if (!publicImageUrl) {
        try {
          const imgFormData = new FormData();
          imgFormData.append("image", cleanBase64);
          const imgbbRes = await axios.post(
            "https://api.imgbb.com/1/upload?key=369527ad0caec6bb3e52adfbcc28b2be",
            imgFormData,
            { headers: imgFormData.getHeaders(), timeout: 10000 }
          );
          if (imgbbRes.data?.data?.url) {
            publicImageUrl = imgbbRes.data.data.url;
            console.log("FB Post SUCCESS: Generated public ImgBB URL =", publicImageUrl);
          }
        } catch (imgbbErr: any) {
          console.warn("Server-side ImgBB upload fallback skipped:", imgbbErr?.message);
        }
      }
    } else {
      console.log("FB Post: Downloading image from:", imageUrl);
      const imgRes = await axios.get(imageUrl, {
        responseType: "arraybuffer",
        timeout: 25000,
      });
      imageBuffer = Buffer.from(imgRes.data);
    }

    const tokensToTry = [activeToken, userAccessToken].filter(Boolean);
    const uniqueTokens = Array.from(new Set(tokensToTry));
    const publishFlag = saveAsDraft ? "false" : "true";

    // ─── ENGINE 1: DIRECT CLICKABLE IMAGE LINK CARD (picture + link) ─────────
    if (publicImageUrl) {
      for (const token of uniqueTokens) {
        try {
          console.log(`FB Post Engine 1: Creating Clickable Link Card (picture: ${publicImageUrl}) with token (${token.slice(0, 10)}...)...`);
          const feedParams = new URLSearchParams();
          feedParams.append("message", caption || "");
          feedParams.append("link", destinationUrl.trim());
          feedParams.append("picture", publicImageUrl);
          feedParams.append("caption", displayUrl);
          feedParams.append("published", publishFlag);
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
            console.log("FB Post Engine 1 SUCCESS! Got Published Clickable Card Post ID =", postId);
            return res.status(200).json({
              success: true,
              postId,
              postUrl: `https://www.facebook.com/${postId.replace("_", "/posts/")}`,
              engine: "Clickable Image Link Card Engine (Engine 1)",
              isPublished: !saveAsDraft,
            });
          }
        } catch (engine1Err: any) {
          if (engine1Err?.response?.data?.error) lastFbError = engine1Err.response.data.error;
          console.warn(`Engine 1 attempt failed with token (${token.slice(0, 10)}...):`, engine1Err?.response?.data || engine1Err?.message);
        }
      }
    }

    // ─── ENGINE 2: OBJECT ATTACHMENT CLICKABLE CARD (object_attachment + link) ─────
    for (const token of uniqueTokens) {
      let photoId: string | null = null;

      // Step A: Upload unpublished photo object with SAME token
      if (publicImageUrl) {
        try {
          console.log("FB Post Engine 2: Uploading 1:1 Photo via URL with token...");
          const photoUrlParams = new URLSearchParams();
          photoUrlParams.append("url", publicImageUrl);
          photoUrlParams.append("published", "false");
          photoUrlParams.append("access_token", token);

          const photoRes = await axios.post(`${FB_BASE}/${pageId}/photos`, photoUrlParams, {
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              ...customHeaders,
            },
            timeout: 30000,
          });
          photoId = photoRes.data?.id || null;
        } catch (urlErr: any) {
          if (urlErr?.response?.data?.error) lastFbError = urlErr.response.data.error;
        }
      }

      if (!photoId) {
        try {
          console.log("FB Post Engine 2: Uploading 1:1 Photo via Buffer with token...");
          const formData = new FormData();
          formData.append("source", imageBuffer, {
            filename: "square-card.jpg",
            contentType: "image/jpeg",
          });
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
        } catch (bufferErr: any) {
          if (bufferErr?.response?.data?.error) lastFbError = bufferErr.response.data.error;
        }
      }

      // Step B: Post to feed using the EXACT SAME token that created photoId
      if (photoId) {
        try {
          console.log(`FB Post Engine 2: Attaching Photo ID (${photoId}) to Link Post with same token...`);
          const feedParams = new URLSearchParams();
          feedParams.append("message", caption || "");
          feedParams.append("link", destinationUrl.trim());
          feedParams.append("object_attachment", photoId);
          feedParams.append("published", "false"); // Dark post required for object_attachment
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
            console.log("FB Post Engine 2 SUCCESS! Got Clickable Card Post ID =", postId);
            return res.status(200).json({
              success: true,
              postId,
              postUrl: `https://www.facebook.com/${postId}`,
              photoId,
              engine: "Object Attachment Clickable Card Engine (Engine 2)",
              isPublished: false,
            });
          }
        } catch (feedErr: any) {
          if (feedErr?.response?.data?.error) lastFbError = feedErr.response.data.error;
          console.warn(`Engine 2 feed post failed with token:`, feedErr?.response?.data || feedErr?.message);
        }
      }
    }

    // ─── ENGINE 3: AD CREATIVE ONE CARD FALLBACK (If adAccountId provided) ─────────
    if (adAccountId && userAccessToken) {
      try {
        console.log("FB Post Engine 3 Fallback: Attempting Ad Creative One Card V2...");

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
                engine: "Ad Creative One Card Fallback (Engine 3)",
                isPublished: !saveAsDraft,
              });
            }
          }
        }
      } catch (tier3Err: any) {
        if (tier3Err?.response?.data?.error) lastFbError = tier3Err.response.data.error;
        console.warn("Engine 3 Ad Creative error:", tier3Err?.response?.data || tier3Err?.message);
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
      error: "Facebook API publishing failed. Ensure your token is active and has Admin rights on the selected Page.",
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
