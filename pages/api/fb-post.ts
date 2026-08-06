import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";

/**
 * POST /api/fb-post
 *
 * Publishes a Square 1080x1080 image to a Facebook Page using the
 * Facebook Marketing API — exactly like FewFeed's "One Card V2".
 *
 * STEP A: Upload image to FB Ad Images library → get image_hash
 * STEP B: Create Ad Creative → get creative_id (image + destination URL click target)
 * STEP C: Publish creative as Page Story to the Facebook Page Feed
 *
 * Body (JSON):
 * {
 *   userAccessToken: string,   // User's FB Access Token
 *   pageId:          string,   // Facebook Page ID (e.g. "105550589064990")
 *   pageAccessToken: string,   // Page-level Access Token (from fb-accounts)
 *   adAccountId:     string,   // Ad Account ID (e.g. "act_621181569724674")
 *   imageUrl:        string,   // 1080x1080 ImgBB URL
 *   destinationUrl:  string,   // Where to redirect on click (short link)
 *   caption:         string,   // Post caption/message
 *   displayUrl?:     string,   // Display URL shown in post (default: "facebook.com")
 * }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  const {
    userAccessToken,
    pageId,
    pageAccessToken,
    adAccountId,
    imageUrl,
    destinationUrl,
    caption,
    displayUrl = "facebook.com",
  } = req.body;

  // Validate required fields
  if (!userAccessToken || !pageId || !pageAccessToken || !adAccountId || !imageUrl || !destinationUrl || !caption) {
    return res.status(400).json({
      error: "Missing required fields",
      required: ["userAccessToken", "pageId", "pageAccessToken", "adAccountId", "imageUrl", "destinationUrl", "caption"],
    });
  }

  const FB_BASE = "https://graph.facebook.com/v19.0";

  try {
    // ─── STEP A: Download image buffer and upload to Facebook Ad Images ────────────
    console.log("FB Post Step A: Downloading image from:", imageUrl);
    const imgRes = await axios.get(imageUrl, {
      responseType: "arraybuffer",
      timeout: 20000,
    });

    const imageBuffer = Buffer.from(imgRes.data);
    const base64Image = imageBuffer.toString("base64");

    console.log("FB Post Step A: Uploading to Facebook Ad Images Library...");
    const adImagesFormData = new URLSearchParams();
    adImagesFormData.append("bytes", base64Image);
    adImagesFormData.append("access_token", userAccessToken);

    const adImagesRes = await axios.post(
      `${FB_BASE}/${adAccountId}/adimages`,
      adImagesFormData,
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    // Extract image_hash from response
    const imagesData = adImagesRes.data?.images;
    if (!imagesData) {
      throw new Error(`Facebook adimages upload failed: ${JSON.stringify(adImagesRes.data)}`);
    }

    // The hash is keyed by filename — get first key
    const imageHashKey = Object.keys(imagesData)[0];
    const imageHash = imagesData[imageHashKey]?.hash;
    if (!imageHash) {
      throw new Error(`Could not extract image_hash from response: ${JSON.stringify(imagesData)}`);
    }

    console.log("FB Post Step A: Got image_hash =", imageHash);

    // ─── STEP B: Create Ad Creative with the image_hash + destination link ─────────
    console.log("FB Post Step B: Creating Ad Creative...");
    const creativePayload = {
      name: `OneCard_${Date.now()}`,
      object_story_spec: {
        page_id: pageId,
        link_data: {
          image_hash: imageHash,
          link: destinationUrl,
          message: caption,
          call_to_action: { type: "LEARN_MORE" },
          caption: displayUrl,
        },
      },
      access_token: userAccessToken,
    };

    const creativeRes = await axios.post(
      `${FB_BASE}/${adAccountId}/adcreatives`,
      creativePayload,
      { headers: { "Content-Type": "application/json" } }
    );

    const creativeId = creativeRes.data?.id;
    if (!creativeId) {
      throw new Error(`Ad Creative creation failed: ${JSON.stringify(creativeRes.data)}`);
    }

    console.log("FB Post Step B: Got creative_id =", creativeId);

    // ─── STEP C: Publish the creative as a Page Story (Dark Post → Real Feed Post) ──
    console.log("FB Post Step C: Publishing to Facebook Page Feed...");
    const feedPayload = {
      message: caption,
      published: true,
      object_attachment: creativeId,
      access_token: pageAccessToken,
    };

    const feedRes = await axios.post(
      `${FB_BASE}/${pageId}/feed`,
      feedPayload,
      { headers: { "Content-Type": "application/json" } }
    );

    const postId = feedRes.data?.id;
    if (!postId) {
      throw new Error(`Page feed publish failed: ${JSON.stringify(feedRes.data)}`);
    }

    console.log("FB Post Step C: SUCCESS! Post ID =", postId);

    // Build the post URL (format: pageId_postId)
    const postUrl = `https://www.facebook.com/${postId.replace("_", "/posts/")}`;

    return res.status(200).json({
      success: true,
      postId,
      postUrl,
      imageHash,
      creativeId,
      steps: {
        adImageUpload: "✅ Success",
        adCreativeCreate: "✅ Success",
        pagePublish: "✅ Success",
      },
    });
  } catch (err: any) {
    const fbError = err?.response?.data?.error;
    console.error("FB Post failed:", fbError || err?.message || err);

    if (fbError) {
      return res.status(400).json({
        success: false,
        error: fbError.message || "Facebook API error",
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
    190: "Access token is invalid or expired. Please generate a new one from Facebook Graph API Explorer.",
    100: "Invalid parameter. Make sure your Ad Account ID format is 'act_XXXXXXXX'.",
    200: "Missing permissions. Your token needs 'ads_management' and 'pages_manage_posts' permissions.",
    368: "Temporarily blocked. This token may have been flagged by Facebook. Try a fresh token.",
    17: "API rate limit hit. Wait a few minutes and try again.",
    2635: "Ad account must have an active payment method on file.",
  };
  return hints[code] || "Check the Facebook Developer Dashboard for error details.";
}
