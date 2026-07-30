/**
 * Download face-api.js model weights into /public/models/
 * Run once: node scripts/download-face-models.js
 */
const https = require("https");
const fs = require("fs");
const path = require("path");

const BASE_URL =
  "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights";

const FILES = [
  // TinyFaceDetector — fast, ~190KB, works great for face centering
  "tiny_face_detector_model-shard1",
  "tiny_face_detector_model-weights_manifest.json",
  // SsdMobilenetv1 — optional fallback, better accuracy
  // "ssd_mobilenetv1_model-shard1",
  // "ssd_mobilenetv1_model-shard2",
  // "ssd_mobilenetv1_model-weights_manifest.json",
];

const MODELS_DIR = path.join(__dirname, "..", "public", "models");

if (!fs.existsSync(MODELS_DIR)) {
  fs.mkdirSync(MODELS_DIR, { recursive: true });
  console.log("Created /public/models/");
}

function downloadFile(filename) {
  return new Promise((resolve, reject) => {
    const url = `${BASE_URL}/${filename}`;
    const dest = path.join(MODELS_DIR, filename);

    if (fs.existsSync(dest)) {
      console.log(`  ✓ Already exists: ${filename}`);
      return resolve();
    }

    const file = fs.createWriteStream(dest);
    console.log(`  ↓ Downloading: ${filename}`);

    https
      .get(url, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          // follow redirect
          https.get(response.headers.location, (r2) => {
            r2.pipe(file);
            file.on("finish", () => {
              file.close();
              console.log(`  ✓ Done: ${filename}`);
              resolve();
            });
          });
        } else if (response.statusCode !== 200) {
          reject(new Error(`Failed to download ${filename}: HTTP ${response.statusCode}`));
        } else {
          response.pipe(file);
          file.on("finish", () => {
            file.close();
            console.log(`  ✓ Done: ${filename}`);
            resolve();
          });
        }
      })
      .on("error", (err) => {
        fs.unlink(dest, () => {});
        reject(err);
      });
  });
}

(async () => {
  console.log("\n🤖 Downloading face-api.js model weights...\n");
  for (const file of FILES) {
    try {
      await downloadFile(file);
    } catch (err) {
      console.error(`  ✗ Error: ${err.message}`);
    }
  }
  console.log("\n✅ Models ready in /public/models/\n");
})();
