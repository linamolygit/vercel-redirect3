# WordPress OG-Tag Redirect Tool

**Platform-agnostic WordPress social media redirect tool.**
Facebook aur dusre social crawlers ko proper OG tags serve karo,
normal users ko WordPress site par redirect karo.

---

## Ye Kya Karta Hai?

Jab aap Facebook par koi WordPress post share karte ho:
1. Facebook crawler `facebookexternalhit` User-Agent ke saath aata hai
2. Ye tool **OG tags wala HTML** serve karta hai (title, description, image)
3. Normal users ko seedha **WordPress post** par redirect kar deta hai

---

## Architecture

```
User/Crawler → [Cloudflare Worker / Netlify Edge]
                        ↓
               Crawler? → WordPress GraphQL se fetch → OG HTML return
               Normal?  → WordPress post par 302 redirect
```

**Zero dependencies** — koi `npm install` nahi, koi framework nahi.

---

## Deployment Options

### Option 1: Cloudflare Workers (Recommended ✅)

**Free tier: 100,000 requests/day**

#### Step 1: Wrangler install karo
```bash
npm install -g wrangler
wrangler login
```

#### Step 2: `wrangler.toml` mein apna WordPress URL set karo
```toml
[vars]
GRAPHQL_ENDPOINT = "https://YOUR-WORDPRESS-SITE.com/graphql"
WP_BASE_URL      = "https://YOUR-WORDPRESS-SITE.com"
```

#### Step 3: Deploy karo
```bash
wrangler deploy
```

#### Step 4: Local test karo
```bash
wrangler dev
# Browser mein kholo: http://localhost:8787/your-post-slug
```

---

### Option 2: Netlify Edge Functions

#### Step 1: Netlify CLI install karo
```bash
npm install -g netlify-cli
netlify login
```

#### Step 2: Netlify dashboard mein environment variables set karo
```
Site Settings → Environment Variables:
  GRAPHQL_ENDPOINT = https://YOUR-WORDPRESS-SITE.com/graphql
  WP_BASE_URL      = https://YOUR-WORDPRESS-SITE.com
```

#### Step 3: Deploy karo
```bash
netlify deploy --prod
```

#### Step 4: Local test karo
```bash
netlify dev
```

---

### Option 3: Vercel Edge Functions (If needed)

`vercel.json` file banao:
```json
{
  "functions": {
    "api/redirect.js": {
      "runtime": "edge"
    }
  },
  "rewrites": [
    { "source": "/(.*)", "destination": "/api/redirect" }
  ]
}
```

`api/redirect.js` mein:
```javascript
import { handleRequest } from "../worker.js";
export default (req) => handleRequest(req, {
  GRAPHQL_ENDPOINT: process.env.GRAPHQL_ENDPOINT,
  WP_BASE_URL: process.env.WP_BASE_URL,
});
export const config = { runtime: "edge" };
```

---

## WordPress Setup

### WPGraphQL Plugin Install karo

1. WordPress Admin → Plugins → Add New
2. Search: **WPGraphQL**
3. Install & Activate
4. GraphQL endpoint check karo: `https://yoursite.com/graphql`

### Test karo
```bash
curl -X POST https://YOUR-SITE.com/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ post(id: \"/your-post-slug/\", idType: URI) { title } }"}'
```

---

## Facebook OG Tags Test

Deploy ke baad Facebook Sharing Debugger se test karo:
🔗 https://developers.facebook.com/tools/debug/

URL enter karo: `https://your-worker.workers.dev/your-post-slug`

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `GRAPHQL_ENDPOINT` | ✅ Yes | WordPress GraphQL URL |
| `WP_BASE_URL` | ✅ Yes | WordPress base URL |
| `FALLBACK_IMAGE` | No | Default OG image URL |

---

## Bugs Fixed (from old Next.js version)

| Bug | Fix |
|---|---|
| `featuredImage` null → 500 crash | Optional chaining `?.` + fallback |
| No try/catch on GraphQL → 500 | `try/catch` + 8s timeout |
| Broken Facebook redirect URL | Clean URL construction |
| Vercel cold starts + suspension | Cloudflare Workers (edge, always-on) |
| `excerpt` null crash | Optional chaining `?.` |
