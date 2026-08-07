import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import FormData from "form-data";

/**
 * POST /api/fb-post
 * Primary Engine: Meta Ad Creative One Card V2 Engine
 * Creates exact Facebook Ad-style Clickable 1:1 Image Cards with custom image_hash + destination link.
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

  if ((!userAccessToken && !pageAccessToken) || !pageId || (!imageUrl && !base64Image) || !destinationUrl) {
    return res.status(400).json({
      error: "Missing required fields",
      required: ["pageId", "destinationUrl", "imageUrl OR base64Image"],
    });
  }

  const FB_BASE = "https://graph.facebook.com/v19.0";

  const customHeaders: Record<string, string> = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    Origin: "https://business.facebook.com",
    Referer: "https://business.facebook.com/",
  };
  if (rawCookie) customHeaders["Cookie"] = rawCookie;

  let lastFbError: any = null;

  // ─── TOKEN RESOLUTION: Page Token + User Token ───────────────────────────────
  let resolvedPageToken = "";
  const primaryToken = userAccessToken || pageAccessToken;

  if (primaryToken) {
    try {
      const meAccRes = await axios.get(`${FB_BASE}/me/accounts`, {
        params: { fields: "id,name,access_token", access_token: primaryToken },
        headers: customHeaders,
        timeout: 15000,
      });
      const pageList = meAccRes.data?.data || [];
      const found = pageList.find((p: any) => String(p.id) === String(pageId));
      if (found?.access_token) {
        resolvedPageToken = found.access_token;
        console.log("Token: Resolved Page Token from /me/accounts for page", pageId);
      } else if (pageList.length > 0 && pageList[0].access_token) {
        resolvedPageToken = pageList[0].access_token;
      }
    } catch (e: any) {
      console.warn("Token: /me/accounts failed:", e?.response?.data?.error?.message || e?.message);
    }

    if (!resolvedPageToken) {
      try {
        const pageRes = await axios.get(`${FB_BASE}/${pageId}`, {
          params: { fields: "access_token", access_token: primaryToken },
          headers: customHeaders,
          timeout: 10000,
        });
        if (pageRes.data?.access_token) {
          resolvedPageToken = pageRes.data.access_token;
        }
      } catch (e: any) {
        console.warn("Token: Direct page token fetch failed:", e?.response?.data?.error?.message || e?.message);
      }
    }
  }

  const pageToken = resolvedPageToken || pageAccessToken || userAccessToken;
  const userToken = userAccessToken || pageAccessToken;

  try {
    // ─── IMAGE PREPARATION ────────────────────────────────────────────────────
    let imageBuffer: Buffer;
    let publicImageUrl = imageUrl || "";

    if (base64Image) {
      const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");
      imageBuffer = Buffer.from(cleanBase64, "base64");

      if (!publicImageUrl) {
        try {
          const imgFormData = new FormData();
          imgFormData.append("image", cleanBase64);
          const imgbbRes = await axios.post(
            "https://api.imgbb.com/1/upload?key=369527ad0caec6bb3e52adfbcc28b2be",
            imgFormData,
            { headers: imgFormData.getHeaders(), timeout: 15000 }
          );
          if (imgbbRes.data?.data?.url) {
            publicImageUrl = imgbbRes.data.data.url;
          }
        } catch (e: any) {
          console.warn("ImgBB upload skipped:", e?.message);
        }
      }
    } else {
      const imgRes = await axios.get(imageUrl, { responseType: "arraybuffer", timeout: 25000 });
      imageBuffer = Buffer.from(imgRes.data);
    }

    // ─── HELPER: Upload photo to page ────────────────────────────────────────
    const uploadPhoto = async (token: string, published: "false" | "true"): Promise<string | null> => {
      if (publicImageUrl) {
        try {
          const params = new URLSearchParams({
            url: publicImageUrl,
            published,
            access_token: token,
          });
          const r = await axios.post(`${FB_BASE}/${pageId}/photos`, params, {
            headers: { "Content-Type": "application/x-www-form-urlencoded", ...customHeaders },
            timeout: 30000,
          });
          if (r.data?.id) return r.data.id;
        } catch (e: any) {
          if (e?.response?.data?.error) lastFbError = e.response.data.error;
        }
      }
      try {
        const fd = new FormData();
        fd.append("source", imageBuffer, { filename: "card.jpg", contentType: "image/jpeg" });
        fd.append("published", published);
        fd.append("access_token", token);
        const r = await axios.post(`${FB_BASE}/${pageId}/photos`, fd, {
          headers: { ...fd.getHeaders(), ...customHeaders },
          timeout: 30000,
        });
        if (r.data?.id) return r.data.id;
      } catch (e: any) {
        if (e?.response?.data?.error) lastFbError = e.response.data.error;
      }
      return null;
    };

    // ─── HELPER: Post to feed with object_attachment ──────────────────────────
    const postFeed = async (token: string, photoId: string, published: "false" | "true"): Promise<string | null> => {
      try {
        const params = new URLSearchParams({
          link: destinationUrl.trim(),
          object_attachment: photoId,
          published,
          access_token: token,
        });
        if (caption) params.append("message", caption);
        const r = await axios.post(`${FB_BASE}/${pageId}/feed`, params.toString(), {
          headers: { "Content-Type": "application/x-www-form-urlencoded", ...customHeaders },
          timeout: 30000,
        });
        return r.data?.id || null;
      } catch (e: any) {
        if (e?.response?.data?.error) lastFbError = e.response.data.error;
        console.warn(`Feed post failed (published=${published}):`, e?.response?.data?.error?.message || e?.message);
        return null;
      }
    };

    // ════════════════════════════════════════════════════════════════════════════
    // ENGINE 1 (PRIMARY): META AD CREATIVE ONE CARD V2 ENGINE
    // Creates exact Facebook Ad-style Clickable 1:1 Image Cards with image_hash.
    // ════════════════════════════════════════════════════════════════════════════
    let activeAdAccountId = adAccountId || "";
    if (!activeAdAccountId && userToken) {
      try {
        console.log("Engine 1: Auto-resolving Ad Account ID via /me/adaccounts...");
        const adAccRes = await axios.get(`${FB_BASE}/me/adaccounts`, {
          params: { fields: "id,account_id", access_token: userToken },
          headers: customHeaders,
          timeout: 10000,
        });
        const adList = adAccRes.data?.data || [];
        if (adList.length > 0 && adList[0].id) {
          activeAdAccountId = adList[0].id;
          console.log("Engine 1: Resolved Ad Account ID =", activeAdAccountId);
        }
      } catch (e: any) {
        console.warn("Engine 1: Ad account lookup failed:", e?.message);
      }
    }

    if (activeAdAccountId && userToken) {
      try {
        console.log(`Engine 1 (Ad Creative): Uploading canvas image to Ad Account (${activeAdAccountId})...`);
        const base64ImageStr = imageBuffer.toString("base64");
        const adImagesParams = new URLSearchParams({
          bytes: base64ImageStr,
          access_token: userToken,
        });

        const adImgRes = await axios.post(`${FB_BASE}/${activeAdAccountId}/adimages`, adImagesParams, {
          headers: { "Content-Type": "application/x-www-form-urlencoded", ...customHeaders },
          timeout: 30000,
        });

        const imagesData = adImgRes.data?.images;
        const hashKey = imagesData ? Object.keys(imagesData)[0] : null;
        const imageHash = hashKey ? imagesData[hashKey]?.hash : null;

        if (imageHash) {
          console.log("Engine 1: Got Ad Image Hash =", imageHash);

          const creativeRes = await axios.post(
            `${FB_BASE}/${activeAdAccountId}/adcreatives`,
            {
              name: `SquareCard_${Date.now()}`,
              object_story_spec: {
                page_id: pageId,
                link_data: {
                  image_hash: imageHash,
                  link: destinationUrl.trim(),
                  message: caption || "",
                  call_to_action: { type: "LEARN_MORE" },
                  caption: displayUrl,
                },
              },
              access_token: userToken,
            },
            { headers: { "Content-Type": "application/json", ...customHeaders }, timeout: 30000 }
          );

          const creativeId = creativeRes.data?.id;
          if (creativeId) {
            console.log("Engine 1: Created Ad Creative ID =", creativeId);

            // Fetch effective_object_story_id directly from the Ad Creative
            try {
              const storyRes = await axios.get(`${FB_BASE}/${creativeId}`, {
                params: { fields: "effective_object_story_id,object_story_id", access_token: userToken },
                headers: customHeaders,
                timeout: 15000,
              });
              const storyId = storyRes.data?.effective_object_story_id || storyRes.data?.object_story_id;
              if (storyId) {
                console.log("Engine 1 SUCCESS! Direct Ad Story Post ID =", storyId);
                return res.status(200).json({
                  success: true,
                  postId: storyId,
                  postUrl: `https://www.facebook.com/${storyId.replace("_", "/posts/")}`,
                  creativeId,
                  engine: "Meta Ad Creative One Card Engine (Engine 1)",
                  isPublished: true,
                });
              }
            } catch (storyErr: any) {
              console.warn("Engine 1 storyId fetch skipped:", storyErr?.message);
            }

            // Publish creative object_attachment to page feed
            try {
              const feedParams = new URLSearchParams({
                message: caption || "",
                object_attachment: creativeId,
                published: saveAsDraft ? "false" : "true",
                access_token: pageToken || userToken,
              });
              const feedRes = await axios.post(`${FB_BASE}/${pageId}/feed`, feedParams.toString(), {
                headers: { "Content-Type": "application/x-www-form-urlencoded", ...customHeaders },
                timeout: 30000,
              });
              if (feedRes.data?.id) {
                const postId = feedRes.data.id;
                console.log("Engine 1 Feed SUCCESS! Got Post ID =", postId);
                return res.status(200).json({
                  success: true,
                  postId,
                  postUrl: `https://www.facebook.com/${postId.replace("_", "/posts/")}`,
                  creativeId,
                  engine: "Published Ad Creative Feed Engine (Engine 1)",
                  isPublished: !saveAsDraft,
                });
              }
            } catch (feedErr: any) {
              if (feedErr?.response?.data?.error) lastFbError = feedErr.response.data.error;
              console.warn("Engine 1 feed post skipped:", feedErr?.response?.data?.error?.message || feedErr?.message);
            }
          }
        }
      } catch (adCreativeErr: any) {
        if (adCreativeErr?.response?.data?.error) lastFbError = adCreativeErr.response.data.error;
        console.warn("Engine 1 Ad Creative failed:", adCreativeErr?.response?.data?.error?.message || adCreativeErr?.message);
      }
    }

    // ════════════════════════════════════════════════════════════════════════════
    // ENGINE 2: OBJECT ATTACHMENT DARK POST (Unpublished Photo Attachment)
    // ════════════════════════════════════════════════════════════════════════════
    if (resolvedPageToken) {
      console.log("Engine 2: Dark Post with resolved Page Token...");
      const photoId = await uploadPhoto(resolvedPageToken, "false");
      if (photoId) {
        const postId = await postFeed(resolvedPageToken, photoId, "false");
        if (postId) {
          console.log("Engine 2 SUCCESS! Dark Post ID =", postId);
          return res.status(200).json({
            success: true,
            postId,
            postUrl: `https://www.facebook.com/${postId}`,
            photoId,
            engine: "Dark Post Clickable Card Engine (Engine 2)",
            isPublished: false,
          });
        }
      }
    }

    // ════════════════════════════════════════════════════════════════════════════
    // ENGINE 3: PUBLISHED OBJECT ATTACHMENT CARD
    // ════════════════════════════════════════════════════════════════════════════
    const tokensToTry = [pageToken, userToken].filter(Boolean);
    const uniqueTokens = Array.from(new Set(tokensToTry));

    for (const token of uniqueTokens) {
      console.log(`Engine 3: Published Post with token (${token.slice(0, 12)}...)...`);
      const photoId = await uploadPhoto(token, "true");
      if (photoId) {
        const postId = await postFeed(token, photoId, "true");
        if (postId) {
          console.log("Engine 3 SUCCESS! Post ID =", postId);
          return res.status(200).json({
            success: true,
            postId,
            postUrl: `https://www.facebook.com/${postId}`,
            photoId,
            engine: "Published Clickable Card Engine (Engine 3)",
            isPublished: true,
          });
        }
      }
    }

    // ════════════════════════════════════════════════════════════════════════════
    // ENGINE 4: METUS BRIDGE LINK FALLBACK
    // ════════════════════════════════════════════════════════════════════════════
    for (const token of uniqueTokens) {
      try {
        console.log(`Engine 4 (Bridge Link): Posting link-only to /${pageId}/feed...`);
        const params = new URLSearchParams({ link: destinationUrl.trim(), access_token: token });
        if (caption) params.append("message", caption);
        params.append("published", saveAsDraft ? "false" : "true");

        const r = await axios.post(`${FB_BASE}/${pageId}/feed`, params.toString(), {
          headers: { "Content-Type": "application/x-www-form-urlencoded", ...customHeaders },
          timeout: 30000,
        });
        if (r.data?.id) {
          console.log("Engine 4 SUCCESS! postId =", r.data.id);
          return res.status(200).json({
            success: true,
            postId: r.data.id,
            postUrl: `https://www.facebook.com/${r.data.id.replace("_", "/posts/")}`,
            engine: "Metus Bridge Link Engine (Engine 4)",
            isPublished: !saveAsDraft,
          });
        }
      } catch (e: any) {
        if (e?.response?.data?.error) lastFbError = e.response.data.error;
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
      error: "All publishing engines failed. Ensure your Facebook account has Admin access to the selected Page.",
    });

  } catch (err: any) {
    const fbError = err?.response?.data?.error || lastFbError;
    if (fbError) {
      return res.status(400).json({
        success: false,
        error: fbError.message || "Facebook API error",
        fb_error_code: fbError.code,
        fb_error_subcode: fbError.error_subcode,
        fb_error_type: fbError.type,
        fbtrace_id: fbError.fbtrace_id,
        hint: getHint(fbError.code, fbError.message),
      });
    }
    return res.status(500).json({ success: false, error: err.message || String(err) });
  }
}

function getHint(code: number, message: string = ""): string {
  if (code === 200) {
    return "Meta Permissions Error: Your account must have Admin / Full Control access to the selected Facebook Page, or re-sync token from 'FB Connect'.";
  }
  const hints: Record<number, string> = {
    190: "Access token invalid or expired. Re-sync from 'FB Connect'.",
    100: "Invalid parameter. Ensure a valid Facebook Page is selected.",
    368: "Account temporarily blocked by Facebook. Log in to Facebook and try again.",
    17: "API rate limit hit. Wait a few minutes and retry.",
    2635: "Ad account requires an active payment method.",
  };
  return hints[code] || "Ensure you are Admin of the selected Facebook Page and re-sync from 'FB Connect'.";
}
