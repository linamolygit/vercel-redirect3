// ─── CLOUDFLARE R2 SECURE S3 SIGNER (SigV4) ──────────────────────────────────
async function hmac(key, data) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    typeof key === "string" ? new TextEncoder().encode(key) : key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    typeof data === "string" ? new TextEncoder().encode(data) : data
  );
  return signature;
}

async function sha256(data) {
  const hash = await crypto.subtle.digest("SHA-256", typeof data === "string" ? new TextEncoder().encode(data) : data);
  return new Uint8Array(hash);
}

function bufToHex(buf) {
  return Array.prototype.map.call(new Uint8Array(buf), x => ('0' + x.toString(16)).slice(-2)).join('');
}

async function uploadToR2S3(fileData, fileName, contentType, env) {
  const accessKeyId = env.R2_ACCESS_KEY_ID || "";
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY || "";
  const endpoint = env.R2_ENDPOINT || "";
  const bucketName = env.R2_BUCKET_NAME || "";
  
  if (!accessKeyId || !secretAccessKey || !endpoint || !bucketName) {
    throw new Error("Cloudflare R2 Credentials missing (R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT, R2_BUCKET_NAME) in environment variables.");
  }
  
  const cleanEndpoint = endpoint.replace(/\/$/, "");
  const url = new URL(`${cleanEndpoint}/${bucketName}/${fileName}`);
  const method = "PUT";
  
  const datetime = new Date().toISOString().replace(/[:\-]|\.\d{3}/g, '');
  const date = datetime.substring(0, 8);
  const region = "auto";
  const service = "s3";
  
  const hashedPayload = bufToHex(await sha256(fileData));
  
  const headers = {
    "host": url.host,
    "x-amz-content-sha256": hashedPayload,
    "x-amz-date": datetime,
    "content-type": contentType
  };
  
  const canonicalHeaders = Object.keys(headers).sort().map(k => `${k}:${headers[k]}`).join('\n') + '\n';
  const signedHeaders = Object.keys(headers).sort().join(';');
  
  const canonicalRequest = [
    method,
    url.pathname,
    "",
    canonicalHeaders,
    signedHeaders,
    hashedPayload
  ].join('\n');
  
  const hashedCanonicalRequest = bufToHex(await sha256(canonicalRequest));
  
  const credentialScope = [date, region, service, "aws4_request"].join('/');
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    datetime,
    credentialScope,
    hashedCanonicalRequest
  ].join('\n');
  
  const kDate = await hmac("AWS4" + secretAccessKey, date);
  const kRegion = await hmac(kDate, region);
  const kService = await hmac(kRegion, service);
  const kSigning = await hmac(kService, "aws4_request");
  
  const signature = bufToHex(await hmac(kSigning, stringToSign));
  
  const authHeader = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  
  const uploadResponse = await fetch(url.toString(), {
    method: method,
    headers: {
      ...headers,
      "Authorization": authHeader
    },
    body: fileData
  });
  
  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    throw new Error(`Cloudflare R2 storage error: ${uploadResponse.status} - ${errorText}`);
  }
  
  const publicUrlBase = env.R2_PUBLIC_URL || `${cleanEndpoint}/${bucketName}`;
  return `${publicUrlBase.replace(/\/$/, "")}/${fileName}`;
}

// ─── CONFIGURATION ───────────────────────────────────────────────────────────
// Inhe environment variables se set karo (wrangler.toml ya Netlify dashboard)
const CONFIG = {
  // WordPress GraphQL endpoint (WPGraphQL plugin required)
  // Example: "https://myblog.com/graphql"
  GRAPHQL_ENDPOINT: typeof GRAPHQL_ENDPOINT !== "undefined" ? GRAPHQL_ENDPOINT : "",

  // WordPress site ka base URL (redirect ke liye)
  // Example: "https://myblog.com"
  WP_BASE_URL: typeof WP_BASE_URL !== "undefined" ? WP_BASE_URL : "",

  // GraphQL request timeout (milliseconds)
  FETCH_TIMEOUT_MS: 8000,

  // Fallback image URL (agar post mein featured image nahi hai)
  FALLBACK_IMAGE: typeof FALLBACK_IMAGE !== "undefined" ? FALLBACK_IMAGE : "",
};

// ─── SOCIAL CRAWLER USER-AGENT DETECTION ─────────────────────────────────────
const CRAWLER_PATTERNS = [
  "facebookexternalhit",
  "facebot",
  "Twitterbot",
  "WhatsApp",
  "LinkedInBot",
  "TelegramBot",
  "Slackbot",
  "Discordbot",
  "Pinterest",
  "Googlebot",
  "bingbot",
  "Applebot",
  "ia_archiver", // Alexa
];

function isCrawler(userAgent = "") {
  const ua = userAgent.toLowerCase();
  return CRAWLER_PATTERNS.some((pattern) => ua.includes(pattern.toLowerCase()));
}

function isFacebookReferer(referer = "") {
  return referer.includes("facebook.com") || referer.includes("fb.com");
}

// ─── GRAPHQL QUERY ───────────────────────────────────────────────────────────
function buildGraphQLQuery(postPath) {
  return JSON.stringify({
    query: `
      {
        post(id: "/${postPath}/", idType: URI) {
          id
          title
          excerpt
          link
          dateGmt
          modifiedGmt
          author {
            node {
              name
            }
          }
          featuredImage {
            node {
              sourceUrl
              altText
            }
          }
        }
      }
    `,
  });
}

// ─── FETCH WITH TIMEOUT ───────────────────────────────────────────────────────
async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timer);
    return response;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

// ─── FETCH WORDPRESS POST DATA ────────────────────────────────────────────────
async function fetchPostData(postPath, graphqlEndpoint) {
  let response;
  try {
    response = await fetchWithTimeout(
      graphqlEndpoint,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: buildGraphQLQuery(postPath),
      },
      CONFIG.FETCH_TIMEOUT_MS
    );
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("TIMEOUT");
    }
    throw new Error("CONNECTION_ERROR: " + err.message);
  }

  if (response.status === 404) {
    throw new Error("WPGRAPHQL_MISSING");
  }

  if (!response.ok) {
    throw new Error(`HTTP_ERROR_${response.status}`);
  }

  let json;
  try {
    json = await response.json();
  } catch (e) {
    // Agar response JSON nahi hai (jaise default HTML error output), iska matlab WPGraphQL installed nahi hai
    throw new Error("WPGRAPHQL_MISSING");
  }

  // GraphQL errors check
  if (json.errors && json.errors.length > 0) {
    throw new Error(`GRAPHQL_ERROR: ${json.errors[0].message}`);
  }

  return json.data?.post || null;
}

// ─── HTML SANITIZER (XSS prevention) ─────────────────────────────────────────
function stripTags(str) {
  if (!str) return "";
  return str
    .replace(/<[^>]+>/g, "")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .trim();
}

function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ─── OG TAG HTML BUILDER ──────────────────────────────────────────────────────
function buildOGHtml({ post, requestUrl, siteHost }) {
  const imageUrl =
    post.featuredImage?.node?.sourceUrl || CONFIG.FALLBACK_IMAGE || "";
  const imageAlt = escapeHtml(
    post.featuredImage?.node?.altText || post.title || ""
  );

  const description = escapeHtml(stripTags(post.excerpt || ""));
  const title = escapeHtml(post.title || "");
  const canonicalUrl = escapeHtml(requestUrl);
  const siteName = escapeHtml(siteHost.split(".")[0]);
  const authorName = escapeHtml(post.author?.node?.name || "");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <!-- Primary Meta Tags -->
  <title>${title}</title>
  <meta name="description" content="${description}" />
  ${authorName ? `<meta name="author" content="${authorName}" />` : ""}
  <link rel="canonical" href="${canonicalUrl}" />

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="article" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  ${imageUrl ? `<meta property="og:image" content="${escapeHtml(imageUrl)}" />` : ""}
  ${imageUrl ? `<meta property="og:image:alt" content="${imageAlt}" />` : ""}
  <meta property="og:locale" content="en_US" />
  <meta property="og:site_name" content="${siteName}" />
  ${post.dateGmt ? `<meta property="article:published_time" content="${escapeHtml(post.dateGmt)}" />` : ""}
  ${post.modifiedGmt ? `<meta property="article:modified_time" content="${escapeHtml(post.modifiedGmt)}" />` : ""}

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  ${imageUrl ? `<meta name="twitter:image" content="${escapeHtml(imageUrl)}" />` : ""}

  <!-- Auto-redirect normal users to the real WordPress post -->
  <meta http-equiv="refresh" content="0; url=${escapeHtml(post.link)}" />
  <script>
    if (typeof window !== "undefined") {
      window.location.replace(${JSON.stringify(post.link)});
    }
  </script>
</head>
<body>
  <p>Redirecting to <a href="${escapeHtml(post.link)}">${title}</a>...</p>
</body>
</html>`;
}

// ─── ERROR PAGES ──────────────────────────────────────────────────────────────
function build404Html(path) {
  return `<!DOCTYPE html>
<html lang="hi">
<head>
  <meta charset="UTF-8" />
  <title>404 — Post Nahi Mili</title>
  <style>
    body { font-family: sans-serif; text-align: center; padding: 60px 20px; color: #f3f4f6; background: #0a051b; }
    h1 { font-size: 4rem; margin: 0; color: #e74c3c; }
    p { font-size: 1.2rem; margin-top: 1rem; color: #9ca3af; }
    a { color: #818cf8; text-decoration: none; font-weight: 600; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>404</h1>
  <p>Post <strong>${escapeHtml(path)}</strong> WordPress par nahi mili.</p>
  <p>Kripya check karen ki URL slug sahi hai ya nahi.</p>
  <p><a href="/">← Dashboard par wapas jao</a></p>
</body>
</html>`;
}

function build500Html(errorType, rawMessage, graphqlEndpoint) {
  let errorTitle = "Server Error ⚠️";
  let errorMessage = "WordPress se data fetch karne mein problem aayi.";
  let troubleshootingSteps = "";

  if (errorType === "WPGRAPHQL_MISSING") {
    errorTitle = "WPGraphQL Plugin Missing 🔌";
    errorMessage = "Aapki WordPress site par 'WPGraphQL' plugin active nahi hai ya access blocked hai.";
    troubleshootingSteps = `
      <div class="steps-box">
        <h3>Kaise theek karen (3 simple steps):</h3>
        <ol>
          <li>Apne <b>WordPress Admin Dashboard</b> me login karen.</li>
          <li><b>Plugins &gt; Add New</b> me jayein aur search karen: <b>WPGraphQL</b></li>
          <li>Us plugin ko <b>Install</b> aur <b>Activate</b> kar dein.</li>
        </ol>
        <p style="margin-top: 12px; font-size: 0.9rem;">
          <b>Verify:</b> check karen ki kya <u>${escapeHtml(graphqlEndpoint)}</u> open karne par JSON screen load ho rahi hai.
        </p>
      </div>
    `;
  } else if (errorType === "TIMEOUT") {
    errorTitle = "Connection Timeout ⏳";
    errorMessage = "Aapki WordPress site ne response dene me zyada time (8 seconds se zyada) laga diya.";
    troubleshootingSteps = `
      <div class="steps-box">
        <h3>Kaise theek karen:</h3>
        <ul>
          <li>Check karen ki kya aapki WordPress site live hai aur sahi se open ho rahi hai.</li>
          <li>Agar site ka server slow hai, to speed optimization ya cache plugin (jaise WP Rocket / LiteSpeed Cache) use karen.</li>
        </ul>
      </div>
    `;
  } else {
    // Baaki normal error handling
    troubleshootingSteps = `
      <div class="error-box">
        <code>${escapeHtml(rawMessage)}</code>
      </div>
    `;
  }

  return `<!DOCTYPE html>
<html lang="hi">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(errorTitle)}</title>
  <style>
    body { font-family: sans-serif; text-align: center; padding: 60px 20px; color: #f3f4f6; background: #0a051b; line-height: 1.6; }
    h1 { font-size: 2.2rem; color: #ef4444; margin-bottom: 10px; }
    p { font-size: 1.1rem; color: #9ca3af; margin-top: 10px; }
    .container { max-width: 600px; margin: 0 auto; text-align: left; }
    .steps-box { background: rgba(255,255,255,0.03); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 12px;
                 padding: 24px; margin: 30px 0; text-align: left; box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
    .steps-box h3 { color: #f3f4f6; margin-top: 0; margin-bottom: 15px; }
    .steps-box ol, .steps-box ul { padding-left: 20px; margin-bottom: 0; }
    .steps-box li { margin-bottom: 10px; color: #d1d5db; }
    .error-box { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px;
                 padding: 16px; margin: 20px 0; text-align: left; }
    code { font-size: 0.9rem; color: #ef4444; word-break: break-all; font-family: monospace; }
    a { color: #818cf8; text-decoration: none; font-weight: 600; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <div style="text-align: center; margin-bottom: 20px; font-size: 3rem;">⚠️</div>
    <h1 style="text-align: center;">${escapeHtml(errorTitle)}</h1>
    <p style="text-align: center;">${escapeHtml(errorMessage)}</p>
    ${troubleshootingSteps}
    <p style="text-align: center; margin-top: 20px;"><a href="/">← Dashboard par wapas jao</a></p>
  </div>
</body>
</html>`;
}

// ─── HOMEPAGE CONVERTER TOOL HTML ─────────────────────────────────────────────
function buildHomepageHtml(originUrl, defaultWpBaseUrl) {
  return `<!DOCTYPE html>
<html lang="hi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WP Link Converter (Open Source)</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0a051b;
      --card-bg: rgba(255, 255, 255, 0.03);
      --card-border: rgba(255, 255, 255, 0.08);
      --accent: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
      --accent-hover: linear-gradient(135deg, #4f46e5 0%, #9333ea 100%);
      --text: #f3f4f6;
      --text-muted: #9ca3af;
      --success: #22c55e;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Outfit', sans-serif;
      background: var(--bg);
      background-image: 
        radial-gradient(at 10% 20%, rgba(99, 102, 241, 0.15) 0px, transparent 50%),
        radial-gradient(at 90% 80%, rgba(168, 85, 247, 0.15) 0px, transparent 50%);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 20px;
      overflow-x: hidden;
    }
    .container {
      width: 100%;
      max-width: 600px;
      position: relative;
    }
    .glow {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 300px;
      height: 300px;
      background: #a855f7;
      filter: blur(120px);
      opacity: 0.2;
      pointer-events: none;
      z-index: -1;
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border-radius: 24px;
      padding: 40px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
      animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .header {
      text-align: center;
      margin-bottom: 25px;
    }
    .logo-icon {
      font-size: 3rem;
      margin-bottom: 12px;
      display: inline-block;
      animation: bounce 2s infinite alternate;
    }
    @keyframes bounce {
      0% { transform: translateY(0); }
      100% { transform: translateY(-6px); }
    }
    h1 {
      font-size: 2.2rem;
      font-weight: 800;
      letter-spacing: -0.5px;
      background: var(--accent);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 8px;
    }
    .description {
      font-size: 0.95rem;
      color: var(--text-muted);
      line-height: 1.6;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 99px;
      font-size: 0.75rem;
      font-weight: 600;
      background: rgba(99, 102, 241, 0.15);
      color: #818cf8;
      border: 1px solid rgba(99, 102, 241, 0.3);
      margin-top: 8px;
    }
    .settings-panel {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 25px;
    }
    .settings-title {
      font-size: 0.9rem;
      font-weight: 600;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .input-group {
      margin-bottom: 20px;
      position: relative;
    }
    .input-group:last-child {
      margin-bottom: 0;
    }
    label {
      display: block;
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--text-muted);
      margin-bottom: 8px;
    }
    input[type="url"], input[type="text"] {
      width: 100%;
      padding: 14px 18px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 10px;
      color: var(--text);
      font-size: 0.95rem;
      font-family: inherit;
      outline: none;
      transition: all 0.3s ease;
    }
    input[type="url"]:focus, input[type="text"]:focus {
      border-color: #a855f7;
      box-shadow: 0 0 12px rgba(168, 85, 247, 0.2);
      background: rgba(255, 255, 255, 0.04);
    }
    .btn {
      width: 100%;
      padding: 16px;
      border: none;
      border-radius: 12px;
      background: var(--accent);
      color: white;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      box-shadow: 0 4px 20px rgba(99, 102, 241, 0.3);
    }
    .btn:hover {
      background: var(--accent-hover);
      transform: translateY(-2px);
      box-shadow: 0 6px 24px rgba(99, 102, 241, 0.4);
    }
    .btn:active {
      transform: translateY(1px);
    }
    .result-section {
      margin-top: 30px;
      padding-top: 30px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      display: none;
      animation: slideDown 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .result-wrapper {
      display: flex;
      gap: 10px;
      background: rgba(255, 255, 255, 0.01);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 6px;
      align-items: center;
      margin-top: 8px;
    }
    .result-url {
      flex: 1;
      padding: 10px 14px;
      font-size: 0.95rem;
      color: #818cf8;
      overflow-x: auto;
      white-space: nowrap;
      scrollbar-width: none;
    }
    .result-url::-webkit-scrollbar { display: none; }
    .btn-copy {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: var(--text);
      cursor: pointer;
      border-radius: 8px;
      padding: 10px 16px;
      font-size: 0.85rem;
      font-weight: 600;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 6px;
      white-space: nowrap;
    }
    .btn-copy:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.2);
    }
    .btn-copy.copied {
      background: rgba(34, 197, 94, 0.15);
      border-color: rgba(34, 197, 94, 0.3);
      color: #4ade80;
    }
    .footer-info {
      text-align: center;
      margin-top: 30px;
      font-size: 0.8rem;
      color: var(--text-muted);
    }
    .footer-info a {
      color: #818cf8;
      text-decoration: none;
    }
    .footer-info a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <div class="glow"></div>
    <div class="card">
      <div class="header">
        <span class="logo-icon">🌐</span>
        <h1>WP Link Converter</h1>
        <p class="description">Apne WordPress posts ke URL convert karein taki social media crawler par perfect previews load hon.</p>
        <span class="badge" id="modeBadge">Public Multi-Site Mode</span>
      </div>

      <!-- Settings panel - localstorage based configuration -->
      <div class="settings-panel">
        <div class="settings-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
          <span>WordPress Setup Settings</span>
        </div>
        
        <div class="input-group">
          <label for="wpBaseUrl">WordPress Base URL</label>
          <input type="url" id="wpBaseUrl" placeholder="https://yourwordpress.com" oninput="saveSettings()" />
        </div>
      </div>

      <!-- Advanced marketing options panel -->
      <div class="settings-panel">
        <div class="settings-title" style="color: #a855f7;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
          <span>Facebook OG Tags Override (Optional)</span>
        </div>
        <p style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 12px; line-height: 1.4;">
          Agar aap Facebook preview me custom title, description ya alag image lagana chahte hain (Clickbait optimize karne ke liye):
        </p>
        
        <div class="input-group" style="margin-bottom: 12px;">
          <label for="customTitle">Custom Title</label>
          <input type="text" id="customTitle" placeholder="Facebook ke liye clickbait title..." />
        </div>
        
        <div class="input-group" style="margin-bottom: 12px;">
          <label for="customDesc">Custom Description</label>
          <input type="text" id="customDesc" placeholder="e.g. Dekhiye kya hua sab hairan ho gaye..." />
        </div>
        
        <div class="input-group" style="margin-bottom: 12px;">
          <label for="customImg">Custom Image URL</label>
          <input type="url" id="customImg" placeholder="https://domain.com/social-photo.jpg" />
        </div>
        
        <div class="input-group" style="margin-bottom: 0;">
          <label>Or Upload Image from Device</label>
          <input type="file" id="customImgFile" accept="image/*" onchange="uploadImage()" style="background: none; border: none; padding: 4px 0; cursor: pointer;" />
          <span id="uploadStatus" style="font-size: 0.75rem; color: var(--text-muted); display: block; margin-top: 6px;"></span>
        </div>
      </div>

      <div class="input-group">
        <label for="wpUrl">WordPress Post URL</label>
        <input type="url" id="wpUrl" placeholder="https://yourwordpress.com/my-post-slug/" required />
      </div>

      <button class="btn" onclick="convertLink()">
        <span>Link Convert Karen</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
      </button>

      <div class="result-section" id="resultSec">
        <label>Generated Link (Facebook par share karne ke liye)</label>
        <div class="result-wrapper">
          <div class="result-url" id="resultUrl"></div>
          <button class="btn-copy" id="btnCopy" onclick="copyLink()">
            <svg id="copySvg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            <span id="copyText">Copy Karen</span>
          </button>
        </div>
      </div>
    </div>
  </div>

  <div class="footer-info">
    Open Source Redirect Engine | <a href="https://github.com" target="_blank">GitHub code</a>
  </div>

  <script>
    const origin = "${originUrl}";
    const defaultWp = "${defaultWpBaseUrl || ''}";
    
    // Load saved settings on load
    window.onload = function() {
      const savedWp = localStorage.getItem("wp_base_url");
      const modeBadge = document.getElementById("modeBadge");
      
      if (defaultWp) {
        // Single site mode (pre-configured via backend env variables)
        document.getElementById("wpBaseUrl").value = defaultWp;
        document.getElementById("wpBaseUrl").disabled = true;
        modeBadge.innerText = "Single-Site Mode";
        modeBadge.style.background = "rgba(34, 197, 94, 0.15)";
        modeBadge.style.color = "#4ade80";
        modeBadge.style.borderColor = "rgba(34, 197, 94, 0.3)";
      } else if (savedWp) {
        // Multi site mode with saved localStorage
        document.getElementById("wpBaseUrl").value = savedWp;
      }
    };
    
    function saveSettings() {
      if (defaultWp) return; // Skip in single site mode
      const wpVal = document.getElementById("wpBaseUrl").value.trim();
      if (wpVal) {
        localStorage.setItem("wp_base_url", wpVal);
      } else {
        localStorage.removeItem("wp_base_url");
      }
    }
    
    function convertLink() {
      const wpBase = document.getElementById("wpBaseUrl").value.trim();
      const postUrl = document.getElementById("wpUrl").value.trim();
      const resultSec = document.getElementById("resultSec");
      const resultUrl = document.getElementById("resultUrl");
      
      if (!wpBase) {
        alert("Kripya pehle apna 'WordPress Base URL' settings me fill karen.");
        return;
      }
      
      if (!postUrl) {
        alert("Kripya ek valid Post URL daalein.");
        return;
      }
      
      try {
        const wpBaseObj = new URL(wpBase);
        const cleanWpBase = wpBaseObj.origin + wpBaseObj.pathname.replace(/\\/$/, "");
        
        const postObj = new URL(postUrl);
        // Clean leading/trailing slashes from path
        let path = postObj.pathname.replace(/^\\/|\\/$/g, "");
        
        // Agar post URL me subfolder include hai to use handle karein
        const wpPathname = wpBaseObj.pathname.replace(/^\\/|\\/$/g, "");
        if (wpPathname && path.startsWith(wpPathname)) {
          path = path.substring(wpPathname.length).replace(/^\\/|\\/$/g, "");
        }
        
        if (!path) {
          alert("Kripya post ka full inner link daalein (homepage ke alawa).");
          return;
        }
        
        let converted = "";
        const customT = document.getElementById("customTitle").value.trim();
        const customD = document.getElementById("customDesc").value.trim();
        const customI = document.getElementById("customImg").value.trim();
        
        // Generate random unique 6-character token to bypass Facebook caching/spam filters
        const randomToken = Math.random().toString(36).substring(2, 8);

        if (defaultWp) {
          // Single-Site Mode: /post-slug/?ref=randomToken
          converted = origin.replace(/\\/$/, "") + "/" + path + "/?ref=" + randomToken;
        } else {
          // Public Multi-Site Mode: /post-slug/?wp=domain&ref=randomToken
          converted = origin.replace(/\\/$/, "") + "/" + path + "/?wp=" + encodeURIComponent(cleanWpBase) + "&ref=" + randomToken;
        }

        // Add custom overrides if specified
        if (customT) converted += "&t=" + encodeURIComponent(customT);
        if (customD) converted += "&d=" + encodeURIComponent(customD);
        if (customI) converted += "&i=" + encodeURIComponent(customI);
        
        resultUrl.innerText = converted;
        resultSec.style.display = "block";
      } catch (err) {
        alert("URL format galat hai. Kripya correct protocols (https://) ke sath fill karen.");
      }
    }
    
    function copyLink() {
      const textToCopy = document.getElementById("resultUrl").innerText;
      const btn = document.getElementById("btnCopy");
      const copyText = document.getElementById("copyText");
      const svg = document.getElementById("copySvg");
      
      navigator.clipboard.writeText(textToCopy).then(() => {
        btn.classList.add("copied");
        copyText.innerText = "Copied! ✅";
        svg.innerHTML = '<polyline points="20 6 9 17 4 12"></polyline>';
        
        setTimeout(() => {
          btn.classList.remove("copied");
          copyText.innerText = "Copy Karen";
          svg.innerHTML = '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>';
        }, 2000);
      }).catch(err => {
        console.error("Copy failed:", err);
      });
    }

    async function uploadImage() {
      const fileInput = document.getElementById("customImgFile");
      const file = fileInput.files[0];
      if (!file) return;

      const uploadStatus = document.getElementById("uploadStatus");
      const customImgInput = document.getElementById("customImg");

      uploadStatus.innerText = "Uploading... ⏳";
      uploadStatus.style.color = "var(--text-muted)";

      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(errText || "Server error");
        }

        const data = await res.json();
        customImgInput.value = data.url;
        uploadStatus.innerText = "Upload successful! ✅";
        uploadStatus.style.color = "var(--success)";
      } catch (err) {
        console.error("Upload error:", err);
        uploadStatus.innerText = "Upload failed: " + err.message;
        uploadStatus.style.color = "#ef4444";
      }
    }
  </script>
</body>
</html>`;
}

// ─── VALIDATE CONFIGURATION ───────────────────────────────────────────────────
function buildConfigErrorHtml(missingVars) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Configuration Error</title>
  <style>
    body { font-family: monospace; padding: 40px; background: #1a1a2e; color: #eee; }
    h1 { color: #e94560; }
    .var { background: #16213e; padding: 8px 16px; border-radius: 4px;
           border-left: 4px solid #e94560; margin: 8px 0; }
  </style>
</head>
<body>
  <h1>⚙️ Configuration Error</h1>
  <p>Ye environment variables set nahi hain:</p>
  ${missingVars.map((v) => `<div class="var">${escapeHtml(v)}</div>`).join("")}
  <p>wrangler.toml ya Netlify dashboard mein set karo.</p>
</body>
</html>`;
}

// ─── MAIN REQUEST HANDLER ─────────────────────────────────────────────────────
export async function handleRequest(request, env = {}) {
  const url = new URL(request.url);

  // ─── FILE UPLOAD TO CLOUDFLARE R2 ENDPOINT ──────────────────────────────────
  if (url.pathname === "/api/upload" && request.method === "POST") {
    try {
      const formData = await request.formData();
      const file = formData.get("file");
      if (!file) {
        return new Response("No file provided", { status: 400 });
      }

      // Unique filename logic
      const fileExt = file.name.split('.').pop() || "jpg";
      const randomName = `${Math.random().toString(36).substring(2, 12)}.${fileExt}`;
      const fileData = await file.arrayBuffer();

      let imageUrl = "";

      // Check if native Cloudflare R2 binding is available
      if (env.R2_BUCKET) {
        await env.R2_BUCKET.put(randomName, fileData, {
          httpMetadata: { contentType: file.type }
        });
        const publicUrlBase = env.R2_PUBLIC_URL || `https://pub-your-domain.com`;
        imageUrl = `${publicUrlBase.replace(/\/$/, "")}/${randomName}`;
      } else {
        // Fallback to S3 API (for Vercel/Netlify)
        imageUrl = await uploadToR2S3(fileData, randomName, file.type, env);
      }

      return new Response(JSON.stringify({ url: imageUrl }), {
        status: 200,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*" 
        }
      });
    } catch (err) {
      return new Response("R2 Upload failed: " + err.message, { status: 500 });
    }
  }

  const userAgent = request.headers.get("User-Agent") || "";
  const referer = request.headers.get("Referer") || "";
  const fbclid = url.searchParams.get("fbclid");

  // Dynamic Query Parameter Check (Public multi-site mode check)
  const wpParam = url.searchParams.get("wp");
  let graphqlEndpoint = "";
  let wpBaseUrl = "";

  if (wpParam) {
    try {
      const cleanWp = wpParam.replace(/\/$/, "");
      wpBaseUrl = cleanWp;
      graphqlEndpoint = `${cleanWp}/graphql`;
    } catch (e) {
      // Invalid URL passed in query parameter
    }
  }

  // Fallback to Env variables (Single-Site Mode)
  if (!graphqlEndpoint) {
    graphqlEndpoint = env.GRAPHQL_ENDPOINT || CONFIG.GRAPHQL_ENDPOINT;
    wpBaseUrl = env.WP_BASE_URL || CONFIG.WP_BASE_URL;
  }

  // Path extraction — leading/trailing slashes clean karo
  let postPath = url.pathname.replace(/^\/|\/$/g, "");

  // Root path handle karo (Home page par link converter tool dikhao)
  if (!postPath) {
    // Agar single site base configured hai to frontend me use enforce karo, nahi to default blank
    const defaultWp = (env.WP_BASE_URL || CONFIG.WP_BASE_URL) || "";
    return new Response(buildHomepageHtml(url.origin, defaultWp), {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // Config validation (Sirf tabs check ke baad apply karo agar wp base target nahi mila)
  if (!graphqlEndpoint) {
    return new Response(
      buildConfigErrorHtml(["GRAPHQL_ENDPOINT"]),
      {
        status: 500,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }
    );
  }

  // Static assets skip karo
  if (
    postPath.startsWith("_next/") ||
    postPath.startsWith("static/") ||
    postPath.endsWith(".ico") ||
    postPath.endsWith(".png") ||
    postPath.endsWith(".jpg") ||
    postPath.endsWith(".css") ||
    postPath.endsWith(".js")
  ) {
    return new Response("Not found", { status: 404 });
  }

  // ─── HYBRID DATABASE REDIRECT LOOKUP (Vercel API) ──────────────────────────
  const isShortId = /^[a-z0-9]{6}$/i.test(postPath);
  let dbRedirectData = null;

  if (isShortId && env.VERCEL_APP_URL) {
    try {
      const vercelApiUrl = `${env.VERCEL_APP_URL.replace(/\/$/, "")}/api/get-redirect?id=${postPath}`;
      const apiRes = await fetch(vercelApiUrl);
      if (apiRes.ok) {
        dbRedirectData = await apiRes.json();
      }
    } catch (e) {
      console.error("[WP-Redirect Worker] Vercel DB Lookup failed:", e.message);
    }
  }

  if (dbRedirectData) {
    const crawlerDetected = isCrawler(userAgent) || isFacebookReferer(referer) || !!fbclid;

    if (!crawlerDetected) {
      return Response.redirect(dbRedirectData.original_url, 302);
    }

    const mockPost = {
      title: dbRedirectData.custom_title || "",
      excerpt: dbRedirectData.custom_desc || "",
      featuredImage: dbRedirectData.custom_image ? { node: { sourceUrl: dbRedirectData.custom_image } } : null,
      link: dbRedirectData.original_url,
    };

    const html = buildOGHtml({
      post: mockPost,
      requestUrl: request.url,
      siteHost: url.hostname,
      fallbackImage: env.FALLBACK_IMAGE,
    });

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=60, s-maxage=60",
      },
    });
  }

  const crawlerDetected = isCrawler(userAgent) || isFacebookReferer(referer) || !!fbclid;

  // Normal users ko directly WordPress par redirect karo (GraphQL call skip)
  if (!crawlerDetected) {
    const baseUrl = wpBaseUrl || graphqlEndpoint.replace(/\/graphql\/?$/, "");
    const destination = `${baseUrl.replace(/\/$/, "")}/${postPath}/`;
    return Response.redirect(destination, 302);
  }

  // Extract optional custom overrides to bypass GraphQL query
  const customT = url.searchParams.get("t");
  const customD = url.searchParams.get("d");
  const customI = url.searchParams.get("i");

  if (customT || customD || customI) {
    // Generate OG page instantly using custom parameters
    const mockPost = {
      title: customT || "",
      excerpt: customD || "",
      featuredImage: customI ? { node: { sourceUrl: customI, altText: customT || "" } } : null,
      link: `${wpBaseUrl.replace(/\/$/, "")}/${postPath}/`,
    };
    const html = buildOGHtml({
      post: mockPost,
      requestUrl: request.url,
      siteHost: url.hostname,
    });
    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=60, s-maxage=60",
      },
    });
  }

  // ─── CRAWLER PATH: Fetch post data & return OG HTML ───────────────────────
  try {
    const post = await fetchPostData(postPath, graphqlEndpoint);

    if (!post) {
      return new Response(build404Html(postPath), {
        status: 404,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    const html = buildOGHtml({
      post,
      requestUrl: request.url,
      siteHost: url.hostname,
    });

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=60, s-maxage=60",
        Vary: "User-Agent",
      },
    });
  } catch (err) {
    const rawMsg = err.message || "";
    let errorType = "SERVER_ERROR";

    if (rawMsg.includes("WPGRAPHQL_MISSING")) {
      errorType = "WPGRAPHQL_MISSING";
    } else if (rawMsg.includes("TIMEOUT")) {
      errorType = "TIMEOUT";
    }

    console.error("[WP-Redirect Worker] Error:", rawMsg);

    return new Response(build500Html(errorType, rawMsg, graphqlEndpoint), {
      status: 503,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Retry-After": "30",
      },
    });
  }
}

// ─── CLOUDFLARE WORKERS ENTRY POINT ──────────────────────────────────────────
export default {
  async fetch(request, env, ctx) {
    return handleRequest(request, env);
  },
};
