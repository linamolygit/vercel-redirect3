import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import FormData from "form-data";

/**
 * POST /api/fb-post
 * Metus.vn One Card V2 Publisher
 *
 * Engine 1: Meta Ad Creative Engine — uploads image to /adimages (multipart + base64 fallback),
 *           creates adcreative with object_story_spec + link_data + image_hash,
 *           returns effective_object_story_id (the real clickable dark post).
 *
 * Engine 2: Pure Metus Bridge Link Engine — posts link: bridgeLink to /{page_id}/feed.
 *           Facebook scrapes 1080x1080 og:image from bridge link → single clickable card.
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
    imageHash: inputImageHash,
    manualImageHash,
    destinationUrl,
    caption,
    displayUrl = "facebook.com",
    saveAsDraft = false,
    rawCookie = "",
  } = req.body;

  const providedHash = inputImageHash || manualImageHash || "";

  if ((!userAccessToken && !pageAccessToken) || !pageId || (!imageUrl && !base64Image && !providedHash) || !destinationUrl) {
    return res.status(400).json({
      error: "Missing required fields",
      required: ["pageId", "destinationUrl", "imageUrl OR base64Image OR imageHash"],
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

  // ─── TOKEN RESOLUTION ──────────────────────────────────────────────────────
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
        console.log("Token: Resolved page token from /me/accounts for page", pageId);
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
          console.log("Token: Resolved page token via GET /{pageId}");
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
    // NOTE: Frontend already uploads to ImgBB and passes imageUrl.
    // Only upload here if imageUrl was NOT provided (safety fallback).
    let imageBuffer: Buffer;
    let publicImageUrl = imageUrl || "";

    if (base64Image) {
      const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");
      imageBuffer = Buffer.from(cleanBase64, "base64");

      // ✅ Skip ImgBB upload if frontend already provided a public URL
      if (!publicImageUrl) {
        console.log("ImgBB: No imageUrl from frontend — uploading now (fallback)...");
        try {
          const imgFormData = new FormData();
          imgFormData.append("image", cleanBase64);
          const imgbbRes = await axios.post(
            "https://api.imgbb.com/1/upload?key=7acb2b5955d0a1e35ba91e981a8d1da8",
            imgFormData,
            { headers: imgFormData.getHeaders(), timeout: 20000 }
          );
          if (imgbbRes.data?.data?.url) {
            publicImageUrl = imgbbRes.data.data.url;
            console.log("ImgBB: public URL =", publicImageUrl);
          }
        } catch (e: any) {
          console.warn("ImgBB upload skipped:", e?.message);
        }
      } else {
        console.log("ImgBB: Skipping upload — frontend already provided imageUrl:", publicImageUrl);
      }
    } else {
      const imgRes = await axios.get(imageUrl, { responseType: "arraybuffer", timeout: 25000 });
      imageBuffer = Buffer.from(imgRes.data);
    }

    // ─── SCRAPE CLEAR — fire-and-forget (don't block the post flow) ───────────
    axios.post(`${FB_BASE}/`, null, {
      params: { id: destinationUrl.trim(), scrape: "true", access_token: pageToken },
      headers: customHeaders,
      timeout: 8000,
    }).then(() => {
      console.log("Scrape: Cache cleared for", destinationUrl.trim());
    }).catch((e: any) => {
      console.warn("Scrape: Clear skipped:", e?.response?.data?.error?.message || e?.message);
    });

    // ════════════════════════════════════════════════════════════════════════════
    // ENGINE 1: META AD CREATIVE ONE CARD V2
    // Real Metus.vn method — image_hash via /adimages + adcreative with
    // object_story_spec → effective_object_story_id = the dark post clickable card
    // ════════════════════════════════════════════════════════════════════════════
    let activeAdAccountId = adAccountId || "";

    // ✅ Auto-resolve ad account IN PARALLEL with nothing (no blocking dependency yet)
    if (!activeAdAccountId && userToken) {
      try {
        console.log("Engine 1: Resolving ad account via /me/adaccounts...");
        const adAccRes = await axios.get(`${FB_BASE}/me/adaccounts`, {
          params: { fields: "id,name,account_status", access_token: userToken },
          headers: customHeaders,
          timeout: 8000, // reduced from 12s → 8s
        });
        const adList: any[] = adAccRes.data?.data || [];
        const activeAcc = adList.find((a: any) => a.account_status === 1) || adList[0];
        if (activeAcc?.id) {
          activeAdAccountId = activeAcc.id;
          console.log("Engine 1: Resolved ad account =", activeAdAccountId, "status =", activeAcc.account_status);
        } else {
          console.warn("Engine 1: No ad accounts found for this user token.");
        }
      } catch (e: any) {
        console.warn("Engine 1: Ad account lookup failed:", e?.response?.data?.error?.message || e?.message);
      }
    }

    if (activeAdAccountId && userToken) {
      let imageHash: string | null = providedHash ? providedHash.trim() : null;

      if (imageHash) {
        console.log("Engine 1: Using provided manual image_hash =", imageHash);
      }

      // ── METHOD A: Multipart /adimages upload (proper Meta API format) ──────
      if (!imageHash && imageBuffer) {
        try {
        console.log(`Engine 1: Uploading via multipart to ${activeAdAccountId}/adimages...`);
        const fd = new FormData();
        fd.append("filename", imageBuffer, {
          filename: `canvas_${Date.now()}.jpg`,
          contentType: "image/jpeg",
        });
        fd.append("access_token", userToken);

        const adImgRes = await axios.post(`${FB_BASE}/${activeAdAccountId}/adimages`, fd, {
          headers: { ...fd.getHeaders(), ...customHeaders },
          timeout: 40000,
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        });

        const imagesData = adImgRes.data?.images;
        const hashKey = imagesData ? Object.keys(imagesData)[0] : null;
        imageHash = hashKey ? imagesData[hashKey]?.hash : null;
        if (imageHash) {
          console.log("Engine 1 [Method A]: Got image_hash =", imageHash);
        }
        } catch (e: any) {
          console.warn("Engine 1 [Method A] multipart failed:", e?.response?.data?.error?.message || e?.message);
        }
      }

      // ── METHOD B: Base64 encoded bytes (fallback) ──────────────────────────
      if (!imageHash) {
        try {
          console.log("Engine 1 [Method B]: Trying base64 bytes upload to /adimages...");
          const base64Str = imageBuffer.toString("base64");
          const fd2 = new FormData();
          fd2.append("bytes", base64Str);
          fd2.append("access_token", userToken);

          const adImgRes2 = await axios.post(`${FB_BASE}/${activeAdAccountId}/adimages`, fd2, {
            headers: { ...fd2.getHeaders(), ...customHeaders },
            timeout: 40000,
          });

          const imagesData2 = adImgRes2.data?.images;
          const hashKey2 = imagesData2 ? Object.keys(imagesData2)[0] : null;
          imageHash = hashKey2 ? imagesData2[hashKey2]?.hash : null;
          if (imageHash) {
            console.log("Engine 1 [Method B]: Got image_hash =", imageHash);
          }
        } catch (e: any) {
          if (e?.response?.data?.error) lastFbError = e.response.data.error;
          console.warn("Engine 1 [Method B] base64 failed:", e?.response?.data?.error?.message || e?.message);
        }
      }

      // ── Method C: Upload via public URL (if ImgBB succeeded) ──────────────
      if (!imageHash && publicImageUrl) {
        try {
          console.log("Engine 1 [Method C]: Trying URL-based upload to /adimages...");
          const fd3 = new FormData();
          fd3.append("url", publicImageUrl);
          fd3.append("access_token", userToken);

          const adImgRes3 = await axios.post(`${FB_BASE}/${activeAdAccountId}/adimages`, fd3, {
            headers: { ...fd3.getHeaders(), ...customHeaders },
            timeout: 30000,
          });

          const imagesData3 = adImgRes3.data?.images;
          const hashKey3 = imagesData3 ? Object.keys(imagesData3)[0] : null;
          imageHash = hashKey3 ? imagesData3[hashKey3]?.hash : null;
          if (imageHash) {
            console.log("Engine 1 [Method C]: Got image_hash =", imageHash);
          }
        } catch (e: any) {
          if (e?.response?.data?.error) lastFbError = e.response.data.error;
          console.warn("Engine 1 [Method C] URL upload failed:", e?.response?.data?.error?.message || e?.message);
        }
      }

      // ── Create Ad Creative if we got image_hash ────────────────────────────
      if (imageHash) {
        try {
          console.log("Engine 1: Creating Ad Creative with object_story_spec...");
          const creativePayload = {
            name: `OneCard_${Date.now()}`,
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
            degrees_of_freedom_spec: {
              creative_features_spec: {
                standard_enhancements: { enroll_status: "OPT_OUT" },
              },
            },
            access_token: userToken,
          };

          const creativeRes = await axios.post(
            `${FB_BASE}/${activeAdAccountId}/adcreatives`,
            creativePayload,
            { headers: { "Content-Type": "application/json", ...customHeaders }, timeout: 35000 }
          );

          const creativeId = creativeRes.data?.id;
          if (creativeId) {
            console.log("Engine 1: Ad Creative ID =", creativeId);

            // ── Fetch effective_object_story_id (the real dark post) ──────────
            let storyId: string | null = null;

            for (let attempt = 0; attempt < 5; attempt++) {
              if (attempt > 0) {
                await new Promise((r) => setTimeout(r, 2000));
              }

              try {
                const storyRes = await axios.get(`${FB_BASE}/${creativeId}`, {
                  params: {
                    fields: "effective_object_story_id,object_story_id,status",
                    access_token: userToken,
                  },
                  headers: customHeaders,
                  timeout: 15000,
                });

                storyId =
                  storyRes.data?.effective_object_story_id ||
                  storyRes.data?.object_story_id ||
                  null;

                console.log(`Engine 1 storyId poll attempt ${attempt + 1}:`, storyId || storyRes.data?.status || "pending");

                if (storyId) break;
              } catch (e: any) {
                console.warn(`Engine 1 story fetch attempt ${attempt + 1} failed:`, e?.message);
              }
            }

            // Fallback: If storyId is still null, create a PAUSED Ad to force Facebook story generation
            if (!storyId && activeAdAccountId) {
              console.log("Engine 1: storyId null after 5 attempts → creating Paused Ad to force story generation...");
              storyId = await forceStoryGenerationViaPausedAdBackend(
                creativeId,
                activeAdAccountId,
                userToken,
                FB_BASE,
                customHeaders
              );
            }

            if (storyId) {
              console.log("Engine 1 SUCCESS! Dark Post story ID =", storyId);
              return res.status(200).json({
                success: true,
                postId: storyId,
                postUrl: `https://www.facebook.com/${storyId.replace("_", "/posts/")}`,
                creativeId,
                imageHash,
                engine: "Metus One Card V2 — Ad Creative Engine (Engine 1)",
                isPublished: false, // dark post — visible via URL, not on timeline
              });
            }

            // Fallback: publish creative directly to page feed via object_attachment
            try {
              console.log("Engine 1: Attaching creative to page feed...");
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
                console.log("Engine 1 (Feed Attach) SUCCESS! postId =", postId);
                return res.status(200).json({
                  success: true,
                  postId,
                  postUrl: `https://www.facebook.com/${postId.replace("_", "/posts/")}`,
                  creativeId,
                  imageHash,
                  engine: "Metus One Card V2 — Ad Creative Feed Attach (Engine 1b)",
                  isPublished: !saveAsDraft,
                });
              }
            } catch (feedErr: any) {
              if (feedErr?.response?.data?.error) lastFbError = feedErr.response.data.error;
              console.warn(
                "Engine 1: Feed attach failed:",
                feedErr?.response?.data?.error?.message || feedErr?.message
              );
            }
          }
        } catch (creativeErr: any) {
          if (creativeErr?.response?.data?.error) lastFbError = creativeErr.response.data.error;
          console.warn(
            "Engine 1: Ad Creative creation failed:",
            creativeErr?.response?.data?.error?.message || creativeErr?.message
          );
        }
      } else {
        console.warn(
          "Engine 1: Could not get image_hash — ad account may have no active payment method, or token lacks ads_management permission. Falling through to Engine 2."
        );
      }
    } else {
      console.warn("Engine 1: No ad account or user token — skipping Ad Creative engine.");
    }

    // ════════════════════════════════════════════════════════════════════════════
    // ENGINE 2: METUS BRIDGE LINK ENGINE (Pure link post — no photo upload)
    // Posts ONLY link: bridgeLink to /{page_id}/feed.
    // Facebook scrapes bridge link → sees 1080x1080 og:image → single clickable card.
    // Zero photo uploads, zero object_attachment, zero double posts.
    // ════════════════════════════════════════════════════════════════════════════
    const tokensToTry = Array.from(new Set([pageToken, userToken].filter(Boolean)));

    for (const token of tokensToTry) {
      try {
        console.log(`Engine 2 (Bridge Link): Posting link-only to /${pageId}/feed (token: ${token.slice(0, 12)}...)...`);
        const params = new URLSearchParams({ link: destinationUrl.trim(), access_token: token });
        if (caption) params.append("message", caption);
        params.append("published", saveAsDraft ? "false" : "true");

        const r = await axios.post(`${FB_BASE}/${pageId}/feed`, params.toString(), {
          headers: { "Content-Type": "application/x-www-form-urlencoded", ...customHeaders },
          timeout: 30000,
        });

        if (r.data?.id) {
          console.log("Engine 2 (Bridge Link) SUCCESS! postId =", r.data.id);
          return res.status(200).json({
            success: true,
            postId: r.data.id,
            postUrl: `https://www.facebook.com/${r.data.id.replace("_", "/posts/")}`,
            engine: "Metus Bridge Link Engine (Engine 2)",
            isPublished: !saveAsDraft,
          });
        }
      } catch (e: any) {
        if (e?.response?.data?.error) lastFbError = e.response.data.error;
        console.warn(
          `Engine 2 failed (token ${token.slice(0, 12)}...):`,
          e?.response?.data?.error?.message || e?.message
        );
      }
    }

    // ─── ALL ENGINES FAILED — Return best error info ──────────────────────────
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
      error:
        "All publishing engines failed. Ensure your Facebook account has Admin access to the Page, and your ad account has an active payment method.",
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
    return "Permissions Error: Your account must have Admin/Full Control access to the selected Facebook Page, or re-sync token from 'FB Connect'.";
  }
  const hints: Record<number, string> = {
    190: "Access token is invalid or expired. Re-sync from 'FB Connect'.",
    100: "Invalid parameter. Ensure a valid Facebook Page is selected.",
    368: "Your account has been temporarily blocked by Facebook. Log in to Facebook and resolve.",
    17: "API rate limit hit. Wait a few minutes and retry.",
    2635: "Your ad account has no active payment method. Add a payment method in Meta Ads Manager.",
    278: "Reading ad account permissions failed. Ensure your token has ads_management permission.",
  };
  return (
    hints[code] ||
    "Ensure you are Admin of the selected Facebook Page and your ad account has an active payment method. Re-sync from 'FB Connect'."
  );
}

async function forceStoryGenerationViaPausedAdBackend(
  creativeId: string,
  adAccountId: string,
  userToken: string,
  FB_BASE: string,
  customHeaders: Record<string, string>
): Promise<string | null> {
  const adAccPath = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;

  try {
    console.log("Backend Forcing story: Step A - Creating PAUSED Campaign...");
    const campRes = await axios.post(
      `${FB_BASE}/${adAccPath}/campaigns`,
      {
        name: `OneCard_Campaign_Temp_${Date.now()}`,
        objective: "OUTCOME_TRAFFIC",
        status: "PAUSED",
        special_ad_categories: [],
        access_token: userToken,
      },
      { headers: customHeaders, timeout: 15000 }
    );

    const campaignId = campRes.data?.id;
    if (!campaignId) return null;

    console.log("Backend Forcing story: Step B - Creating PAUSED AdSet...");
    const adsetRes = await axios.post(
      `${FB_BASE}/${adAccPath}/adsets`,
      {
        name: `OneCard_Adset_Temp_${Date.now()}`,
        campaign_id: campaignId,
        status: "PAUSED",
        billing_event: "IMPRESSIONS",
        optimization_goal: "LINK_CLICKS",
        bid_amount: 100,
        daily_budget: 1000,
        targeting: { geo_locations: { countries: ["IN"] } },
        access_token: userToken,
      },
      { headers: customHeaders, timeout: 15000 }
    );

    const adsetId = adsetRes.data?.id;
    if (!adsetId) return null;

    console.log("Backend Forcing story: Step C - Creating PAUSED Ad with creative_id =", creativeId);
    const adRes = await axios.post(
      `${FB_BASE}/${adAccPath}/ads`,
      {
        name: `OneCard_Ad_Temp_${Date.now()}`,
        adset_id: adsetId,
        creative: { creative_id: creativeId },
        status: "PAUSED",
        access_token: userToken,
      },
      { headers: customHeaders, timeout: 15000 }
    );

    const adId = adRes.data?.id;
    console.log("Backend Forcing story: PAUSED Ad created =", adId || "failed");
    await new Promise((r) => setTimeout(r, 3000));

    const finalRes = await axios.get(`${FB_BASE}/${creativeId}`, {
      params: { fields: "effective_object_story_id,object_story_id", access_token: userToken },
      headers: customHeaders,
      timeout: 10000,
    });

    let foundStory = finalRes.data?.effective_object_story_id || finalRes.data?.object_story_id || null;

    if (!foundStory && adId) {
      const adStoryRes = await axios.get(`${FB_BASE}/${adId}`, {
        params: {
          fields: "effective_object_story_id,creative{effective_object_story_id,object_story_id}",
          access_token: userToken,
        },
        headers: customHeaders,
        timeout: 10000,
      });
      foundStory =
        adStoryRes.data?.effective_object_story_id ||
        adStoryRes.data?.creative?.effective_object_story_id ||
        adStoryRes.data?.creative?.object_story_id ||
        null;
    }

    console.log("Backend Forcing story: Final storyId result =", foundStory);
    return foundStory;
  } catch (err: any) {
    console.warn("Backend Forcing story exception:", err?.response?.data?.error?.message || err?.message);
    return null;
  }
}
