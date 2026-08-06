import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import FormData from "form-data";

/**
 * POST /api/fb-post
 * 4-Engine Facebook Publisher — Tries every viable method in order.
 * Engine 1: Page Token + Dark Post (published:false) — ideal clickable card
 * Engine 2: Any Token + Published Post (published:true) — bypasses #200 restriction
 * Engine 3: Ad Creative (adimages + adcreatives) — works with user token only
 * Engine 4: Simple Feed Link Post — last resort
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

  // ─── TOKEN RESOLUTION: Always resolve fresh Page Token ─────────────────────
  let resolvedPageToken = "";
  const primaryToken = userAccessToken || pageAccessToken;

  if (primaryToken) {
    // Attempt 1: /me/accounts — most reliable source for Page Access Token
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
        console.log("Token: Using first page token from /me/accounts");
      }
    } catch (e: any) {
      console.warn("Token: /me/accounts failed:", e?.response?.data?.error?.message || e?.message);
    }

    // Attempt 2: GET /{pageId}?fields=access_token
    if (!resolvedPageToken) {
      try {
        const pageRes = await axios.get(`${FB_BASE}/${pageId}`, {
          params: { fields: "access_token", access_token: primaryToken },
          headers: customHeaders,
          timeout: 10000,
        });
        if (pageRes.data?.access_token) {
          resolvedPageToken = pageRes.data.access_token;
          console.log("Token: Resolved Page Token from GET /{pageId}!");
        }
      } catch (e: any) {
        console.warn("Token: Direct page token fetch failed:", e?.response?.data?.error?.message || e?.message);
      }
    }
  }

  // Token priority: resolved page token > frontend pageAccessToken > userAccessToken
  const pageToken = resolvedPageToken || pageAccessToken || userAccessToken;
  const userToken = userAccessToken || pageAccessToken;

  console.log("Token: pageToken prefix:", pageToken?.slice(0, 15));

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
            console.log("ImgBB: Uploaded public URL =", publicImageUrl);
          }
        } catch (e: any) {
          console.warn("ImgBB upload skipped:", e?.message);
        }
      }
    } else {
      const imgRes = await axios.get(imageUrl, { responseType: "arraybuffer", timeout: 25000 });
      imageBuffer = Buffer.from(imgRes.data);
    }

    // ─── FB SCRAPE CACHE CLEAR ────────────────────────────────────────────────
    try {
      await axios.post(`${FB_BASE}/`, null, {
        params: { id: destinationUrl.trim(), scrape: "true", access_token: pageToken },
        headers: customHeaders,
        timeout: 10000,
      });
      console.log("Scrape: Cache cleared for", destinationUrl.trim());
    } catch (e: any) {
      console.warn("Scrape: Cache clear skipped:", e?.response?.data?.error?.message || e?.message);
    }

    // ─── HELPER: Upload photo to page ────────────────────────────────────────
    const uploadPhoto = async (token: string, published: "false" | "true"): Promise<string | null> => {
      // Try URL upload first (faster)
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
      // Fallback: buffer multipart upload
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
    // ENGINE 1: Page Token + published:false (Dark Post — ideal clickable card)
    // ════════════════════════════════════════════════════════════════════════════
    if (resolvedPageToken) {
      console.log("Engine 1: Dark Post with resolved Page Token...");
      const photoId = await uploadPhoto(resolvedPageToken, "false");
      if (photoId) {
        console.log("Engine 1: Photo uploaded, photoId =", photoId);
        const postId = await postFeed(resolvedPageToken, photoId, "false");
        if (postId) {
          console.log("Engine 1 SUCCESS! postId =", postId);
          return res.status(200).json({
            success: true,
            postId,
            postUrl: `https://www.facebook.com/${postId}`,
            photoId,
            engine: "Dark Post Clickable Card Engine (Engine 1)",
            isPublished: false,
          });
        }
      }
    }

    // ════════════════════════════════════════════════════════════════════════════
    // ENGINE 2: Any token + published:true (Direct Published — bypasses #200)
    // This is the permanent fix for Permissions Error #200.
    // published:true doesn't require "page as itself" — works with user token.
    // ════════════════════════════════════════════════════════════════════════════
    const tokensToTry = [pageToken, userToken].filter(Boolean);
    const uniqueTokens = Array.from(new Set(tokensToTry));

    for (const token of uniqueTokens) {
      console.log(`Engine 2: Published Post with token (${token.slice(0, 12)}...)...`);
      const photoId = await uploadPhoto(token, "true");
      if (photoId) {
        console.log("Engine 2: Photo uploaded, photoId =", photoId);
        const postId = await postFeed(token, photoId, "true");
        if (postId) {
          console.log("Engine 2 SUCCESS! postId =", postId);
          return res.status(200).json({
            success: true,
            postId,
            postUrl: `https://www.facebook.com/${postId}`,
            photoId,
            engine: "Published Clickable Card Engine (Engine 2)",
            isPublished: true,
          });
        }
      }
    }

    // ════════════════════════════════════════════════════════════════════════════
    // ENGINE 3: Ad Creative (Works with User Token only — no page token needed)
    // ════════════════════════════════════════════════════════════════════════════
    let activeAdAccountId = adAccountId || "";
    if (!activeAdAccountId && userToken) {
      try {
        const adAccRes = await axios.get(`${FB_BASE}/me/adaccounts`, {
          params: { fields: "id,account_id", access_token: userToken },
          headers: customHeaders,
          timeout: 10000,
        });
        const adList = adAccRes.data?.data || [];
        if (adList.length > 0 && adList[0].id) {
          activeAdAccountId = adList[0].id;
          console.log("Engine 3: Auto-resolved Ad Account =", activeAdAccountId);
        }
      } catch (e: any) {
        console.warn("Engine 3: Ad account lookup failed:", e?.message);
      }
    }

    if (activeAdAccountId && userToken) {
      try {
        console.log(`Engine 3 (Ad Creative): Uploading to Ad Account (${activeAdAccountId})...`);
        const adImagesParams = new URLSearchParams({
          bytes: imageBuffer.toString("base64"),
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
            const storyRes = await axios.get(`${FB_BASE}/${creativeId}`, {
              params: { fields: "effective_object_story_id,object_story_id", access_token: userToken },
              headers: customHeaders,
              timeout: 15000,
            });
            const storyId = storyRes.data?.effective_object_story_id || storyRes.data?.object_story_id;
            if (storyId) {
              console.log("Engine 3 SUCCESS! storyId =", storyId);
              return res.status(200).json({
                success: true,
                postId: storyId,
                postUrl: `https://www.facebook.com/${storyId.replace("_", "/posts/")}`,
                creativeId,
                engine: "Ad Creative Square Card Engine (Engine 3)",
                isPublished: true,
              });
            }
          }
        }
      } catch (e: any) {
        if (e?.response?.data?.error) lastFbError = e.response.data.error;
        console.warn("Engine 3 Ad Creative failed:", e?.response?.data?.error?.message || e?.message);
      }
    }

    // ════════════════════════════════════════════════════════════════════════════
    // ENGINE 4: Simple Feed Link Post (last resort — no custom image, but works)
    // ════════════════════════════════════════════════════════════════════════════
    for (const token of uniqueTokens) {
      try {
        console.log(`Engine 4: Simple Feed Link Post with token (${token.slice(0, 12)}...)...`);
        const params = new URLSearchParams({
          link: destinationUrl.trim(),
          published: "true",
          access_token: token,
        });
        if (caption) params.append("message", caption);
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
            engine: "Simple Feed Link Engine (Engine 4)",
            isPublished: true,
          });
        }
      } catch (e: any) {
        if (e?.response?.data?.error) lastFbError = e.response.data.error;
        console.warn("Engine 4 simple feed failed:", e?.response?.data?.error?.message || e?.message);
      }
    }

    // All engines exhausted
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
      error: "All publishing engines exhausted. Ensure your token is active and you are Admin of the selected Page.",
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
    return "Meta Permissions Error: Your token may lack 'pages_manage_posts' permission. Re-sync from 'FB Connect', or ensure you are Page Admin.";
  }
  const hints: Record<number, string> = {
    190: "Access token invalid/expired. Re-sync from 'FB Connect'.",
    100: "Invalid parameter. Ensure a valid Facebook Page is selected.",
    368: "Account temporarily blocked. Log in to Facebook and try again.",
    17: "API rate limit hit. Wait a few minutes and retry.",
    2635: "Ad account requires an active payment method.",
  };
  return hints[code] || "Ensure you are Admin of the selected Facebook Page and re-sync from 'FB Connect'.";
}
