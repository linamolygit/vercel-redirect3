import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import FormData from "form-data";

/**
 * POST /api/fb-post
 * Dark Post Execution with Meta API Error #200 Fix (Page Access Token Requirement)
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

  // ─── STEP 1: RESOLVE DEDICATED PAGE ACCESS TOKEN (EAA...) ──────────────────
  // Meta Error #200 Fix: Must use Page Token (EAA...), NOT User Token (EAAG...) for unpublished posts!
  let resolvedPageToken = "";
  if (pageAccessToken && !pageAccessToken.startsWith("EAAG")) {
    resolvedPageToken = pageAccessToken;
  }

  if (!resolvedPageToken && userAccessToken) {
    try {
      console.log("FB Post: Fetching dedicated Page Access Token via /me/accounts for Page ID:", pageId);
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
        resolvedPageToken = foundPage.access_token;
        console.log("FB Post SUCCESS: Resolved dedicated Page Access Token (EAA...)!");
      } else if (pageList.length > 0 && pageList[0].access_token) {
        resolvedPageToken = pageList[0].access_token;
      }
    } catch (pageErr: any) {
      if (pageErr?.response?.data?.error) lastFbError = pageErr.response.data.error;
      console.warn("FB Post: /me/accounts page token lookup failed:", pageErr?.response?.data || pageErr?.message);
    }
  }

  const activePageToken = resolvedPageToken || pageAccessToken || userAccessToken;

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

    // ─── METHOD 1: META API ERROR #200 FIX (DARK POST ENGINE VIA PAGE TOKEN) ──
    try {
      console.log("FB Post Method 1: Uploading Unpublished Photo using Page Access Token...");
      let photoId: string | null = null;

      // 1. Photo Upload using Page Access Token
      if (publicImageUrl) {
        try {
          const photoUrlParams = new URLSearchParams({
            url: publicImageUrl,
            published: "false",
            access_token: activePageToken,
          });
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
        const form = new FormData();
        form.append("source", imageBuffer, { filename: "card.jpg", contentType: "image/jpeg" });
        form.append("published", "false");
        form.append("access_token", activePageToken); // <-- PAGE TOKEN HERE

        const photoRes = await axios.post(`${FB_BASE}/${pageId}/photos`, form, {
          headers: {
            ...form.getHeaders(),
            ...customHeaders,
          },
          timeout: 30000,
        });

        photoId = photoRes.data?.id || null;
      }

      if (photoId) {
        console.log("FB Post Method 1: Photo uploaded successfully! Photo ID =", photoId);

        // 2. Feed Post Creation using Page Access Token
        const postPayload = new URLSearchParams({
          link: destinationUrl.trim(),
          object_attachment: photoId,
          published: "false",
          access_token: activePageToken, // <-- PAGE TOKEN HERE
        });

        if (caption) {
          postPayload.append("message", caption);
        }

        const postRes = await axios.post(`${FB_BASE}/${pageId}/feed`, postPayload.toString(), {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            ...customHeaders,
          },
          timeout: 30000,
        });

        const postId = postRes.data?.id;
        if (postId) {
          console.log("Meta API Error #200 Fix SUCCESS! Got Dark Post ID =", postId);
          return res.status(200).json({
            success: true,
            postId,
            postUrl: `https://www.facebook.com/${postId}`,
            photoId,
            engine: "Meta API Error #200 Fix Dark Post Engine",
            isPublished: false,
          });
        }
      }
    } catch (m1Err: any) {
      if (m1Err?.response?.data?.error) lastFbError = m1Err.response.data.error;
      console.warn("FB Post Method 1 (Error #200 Fix) failed:", m1Err?.response?.data || m1Err?.message);
    }

    // ─── METHOD 2: META AD CREATIVE ENGINE (Ad Account Fallback) ────────────────
    let activeAdAccountId = adAccountId || "";
    if (!activeAdAccountId && userAccessToken) {
      try {
        const adAccRes = await axios.get(`${FB_BASE}/me/adaccounts`, {
          params: { fields: "id,account_id", access_token: userAccessToken },
          headers: customHeaders,
          timeout: 10000,
        });
        const adList = adAccRes.data?.data || [];
        if (adList.length > 0 && adList[0].id) {
          activeAdAccountId = adList[0].id;
        }
      } catch (e: any) {
        console.warn("Ad account lookup skipped:", e?.message);
      }
    }

    if (activeAdAccountId && userAccessToken) {
      try {
        console.log(`FB Post Method 2 (Ad Creative): Uploading image to Ad Account (${activeAdAccountId})...`);

        const base64ImageStr = imageBuffer.toString("base64");
        const adImagesParams = new URLSearchParams();
        adImagesParams.append("bytes", base64ImageStr);
        adImagesParams.append("access_token", userAccessToken);

        const adImagesRes = await axios.post(`${FB_BASE}/${activeAdAccountId}/adimages`, adImagesParams, {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            ...customHeaders,
          },
          timeout: 30000,
        });

        const imagesData = adImagesRes.data?.images;
        const imageHashKey = imagesData ? Object.keys(imagesData)[0] : null;
        const imageHash = imageHashKey ? imagesData[imageHashKey]?.hash : null;

        if (imageHash) {
          const creativePayload = {
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
            access_token: userAccessToken,
          };

          const creativeRes = await axios.post(`${FB_BASE}/${activeAdAccountId}/adcreatives`, creativePayload, {
            headers: {
              "Content-Type": "application/json",
              ...customHeaders,
            },
            timeout: 30000,
          });

          const creativeId = creativeRes.data?.id;
          if (creativeId) {
            const creativeObjRes = await axios.get(`${FB_BASE}/${creativeId}`, {
              params: {
                fields: "effective_object_story_id,object_story_id",
                access_token: userAccessToken,
              },
              headers: customHeaders,
              timeout: 15000,
            });

            const storyId = creativeObjRes.data?.effective_object_story_id || creativeObjRes.data?.object_story_id;

            if (storyId) {
              return res.status(200).json({
                success: true,
                postId: storyId,
                postUrl: `https://www.facebook.com/${storyId.replace("_", "/posts/")}`,
                creativeId,
                engine: "Facebook Ad Creative Clickable Square Card Engine",
                isPublished: true,
              });
            }
          }
        }
      } catch (adErr: any) {
        if (adErr?.response?.data?.error) lastFbError = adErr.response.data.error;
        console.warn("Method 2 Ad Creative error:", adErr?.response?.data || adErr?.message);
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
