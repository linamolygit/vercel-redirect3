import axios from "axios";

/**
 * Processes an input image buffer:
 * 1. Resizes to 1080x1080 px (cover fit, centered).
 * 2. Compresses as JPEG with quality 90.
 * 3. Uploads to ImgBB API and returns the uploaded image URL.
 *
 * @param imageBuffer - Raw image Buffer
 * @returns Promise<string> - ImgBB hosted image URL
 */
export async function processSquareImage(imageBuffer: Buffer): Promise<string> {
  const apiKey = process.env.IMGBB_API_KEY;
  if (!apiKey) {
    throw new Error("IMGBB_API_KEY is not defined in environment variables.");
  }

  let sharp: any = null;
  try {
    sharp = require("sharp");
  } catch (e) {
    throw new Error("Sharp module unavailable on serverless runtime.");
  }

  try {
    // 1. Resize image to 1080x1080 (cover, centered) & convert to JPEG (quality 90)
    const resizedBuffer = await sharp(imageBuffer)
      .resize(1080, 1080, { fit: "cover", position: "center" })
      .jpeg({ quality: 90 })
      .toBuffer();

    // 2. Convert buffer to base64 string
    const base64Image = resizedBuffer.toString("base64");

    // 3. Post to ImgBB API using URLSearchParams
    const params = new URLSearchParams();
    params.append("image", base64Image);

    const response = await axios.post(
      `https://api.imgbb.com/1/upload?key=${apiKey}`,
      params,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    if (!response.data || !response.data.data || !response.data.data.url) {
      throw new Error("Invalid response format received from ImgBB API.");
    }

    // 4. Return hosted image URL
    return response.data.data.url;
  } catch (error: any) {
    const errorDetails = error.response?.data?.error?.message || error.message || error;
    console.error("Failed to process and upload square image:", errorDetails);
    throw new Error(`Square image processing and upload failed: ${errorDetails}`);
  }
}
