# 📖 Site ka Pura A to Z Explanation

---

## 🏗️ Tech Stack

| Layer | Technology | Kya karta hai |
|---|---|---|
| **Framework** | **Next.js 13** | Frontend + Backend dono ek jagah |
| **Language** | **TypeScript** | Type-safe JavaScript |
| **Database** | **MySQL** (Hostinger par) | Users, Links, Analytics store karna |
| **Authentication** | **JWT (JSON Web Token)** | Login session manage karna |
| **Password** | **bcryptjs** | Password ko securely hash karna |
| **WP Data Fetch** | **WP-JSON REST API + GraphQL** | WordPress se title/image fetch karna |
| **Deployment** | **Vercel** | Serverless hosting |

---

## 🗄️ Database Structure (3 Tables)

```
users            redirects           analytics
─────────        ─────────────       ─────────────────
id               id                  id
email            short_id            redirect_id → redirects.id
name             original_url        ip_address
username         custom_title        country
password_hash    custom_desc         city
reset_token      custom_image        device_type
                 user_id → users.id  browser
                 created_at          platform
                                     created_at
```

---

## 🔄 Site ka Pura Flow: A to Z

### STEP 1️⃣ — User Register/Login karta hai

```
User → /register page → POST /api/auth/signup

Server:
1. email aur username duplicate check karta hai
2. Password ko bcrypt se hash karta hai (salt=10)
3. MySQL users table me insert karta hai
4. JWT token banata hai (7 din valid)
5. HttpOnly cookie me set karta hai
6. User automatically logged in ho jata hai!
```

Login me bhi same cheez hoti hai — JWT verify hota hai, cookie set hoti hai.

---

### STEP 2️⃣ — Dashboard me Link Generate karna

```
User → /dashboard → WordPress post URL paste karta hai
         ↓
"Auto Fetch Details" Button Click
         ↓
GET /api/fetch-wp?url=https://yoursite.com/post-name
         ↓
Server (fetch-wp.ts) 3 tarike se WordPress se data fetch karta hai:

TRY 1 → WP-JSON REST API:
  yoursite.com/wp-json/wp/v2/posts?slug=post-name&_embed
  → Title, Excerpt, Featured Image milta hai (99% sites par kaam karta hai)

TRY 2 → GraphQL Fallback (agar REST disabled hai):
  yoursite.com/graphql se query karta hai
  → Same data milta hai

TRY 3 → Environment variable GRAPHQL_ENDPOINT fallback

Response: { title, excerpt, imageUrl } → Form me auto-fill ho jata hai
```

---

### STEP 3️⃣ — Link Create hona (The Core Magic!)

```
User → "Generate Link" button dabata hai
         ↓
POST /api/create-redirect
  Body: { originalUrl, customTitle, customDesc, customImage, customShortId }
         ↓
Server (create-redirect.ts):

1. JWT cookie se user ka ID nikalta hai (logged in hai ya nahi)

2. Custom Alias check:
   ├── Agar user ne custom alias diya (jaise "my-video"):
   │     → Sirf letters/numbers/hyphens allowed hai
   │     → Database me check karta hai ki pehle se exist to nahi
   └── Agar nahi diya:
         → Auto generate: Math.random().toString(36).substring(2,8)
         → Example: "a3f9x2"
         → Collision check karta hai (10 attempts tak)

3. MySQL redirects table me INSERT:
   (short_id, original_url, custom_title, custom_desc, custom_image, user_id)

4. Short link banata hai:
   https://yourdomain.com/a3f9x2

Response: { shortLink: "https://yourdomain.com/a3f9x2" } ← User ko ye deta hai!
```

---

### STEP 4️⃣ — Facebook par Link Share karna (THE HEART OF THE SITE!)

Yeh sabse important aur complex part hai. Jab koi link Facebook par share karta hai do alag cheezein hoti hain:

#### 🤖 CASE A: Facebook Bot (Crawler) aata hai

```
Facebook Server → GET yourdomain.com/a3f9x2
  User-Agent: "facebookexternalhit/1.1"
         ↓
[id].tsx → getServerSideProps runs on SERVER

1. User-Agent read karta hai → "facebookexternalhit" detect hota hai!
2. isCrawler() = TRUE
3. Database se record fetch karta hai:
   SELECT original_url, custom_title, custom_desc, custom_image
   FROM redirects WHERE short_id = 'a3f9x2'
4. Analytics bhi log karta hai (platform = "Facebook")
5. REDIRECT NAHI KARTA!
   Instead HTML page return karta hai jisme sirf meta tags hain:

<meta property="og:title" content="Tumhara Custom Title" />
<meta property="og:description" content="Tumhara Description" />
<meta property="og:image" content="https://image-url.jpg" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:secure_url" content="https://image-url.jpg" />
<meta name="twitter:card" content="summary_large_image" />

Facebook in tags ko read karta hai aur post me
BADA HD IMAGE + TITLE + DESCRIPTION dikhata hai! ✅
```

#### 👤 CASE B: Real User click karta hai Facebook se

```
User Browser → GET yourdomain.com/a3f9x2
  User-Agent: "Mozilla/5.0 Chrome/..."
  Referer: "facebook.com"
         ↓
[id].tsx → getServerSideProps runs on SERVER

1. User-Agent check → normal browser hai
2. Referer check → "facebook.com" included hai!
   → isFacebookReferer() = TRUE → crawlerDetected = TRUE

   ⚠️ NOTE: Facebook se aane wale users ko bhi
   OG page dikhata hai (taki Facebook ka redirect tracking na ho)
   + JavaScript window.location.replace() se instantly redirect karta hai!

3. Agar bilkul normal user hai (direct link):
   → 302 Server-Side Redirect → original_url par seedha bhej deta hai!

4. Analytics INSERT (country, city, device, browser, platform)
```

---

### STEP 5️⃣ — Analytics System

```
Har ek click par [id].tsx yeh data collect karta hai:

Headers se:
├── x-forwarded-for → Real IP address
├── x-vercel-ip-country → Country (Vercel se automatic)
├── x-vercel-ip-city → City (Vercel se automatic)
└── user-agent → Browser/Device info

ua-parser-js library:
└── User-Agent parse karke nikalta hai:
    ├── Device Type: Mobile/Desktop/Tablet
    ├── Browser: Chrome/Firefox/Safari
    └── OS: Android/iOS/Windows

Platform Detection (Referer se):
├── facebook.com → "Facebook"
├── t.co/twitter → "Twitter"
├── instagram → "Instagram"
├── linkedin → "LinkedIn"
├── google → "Google"
└── kuch nahi → "Direct"

Sab kuch analytics table me INSERT ho jata hai!
```

---

### STEP 6️⃣ — Analytics Dashboard

```
User → /analytics/[id] page

GET /api/analytics/[id]
└── Database se us specific link ka sara data
    └── Total Clicks, Country breakdown, Device breakdown,
        Platform breakdown, Timeline graph
```

---

## 🔑 Security Mechanism

| Cheez | Kaise secure hai |
|---|---|
| **Passwords** | bcryptjs hash (irreversible) |
| **Sessions** | JWT token, HttpOnly cookie (JavaScript access nahi kar sakta) |
| **SQL Injection** | MySQL2 Prepared Statements (`?` placeholders) |
| **CSRF** | SameSite=Lax cookie |
| **Token Expiry** | 7 din baad auto logout |

---

## 📁 File Structure Summary

```
pages/
├── index.tsx          → Dashboard (Link generate karne ka form)
├── [id].tsx           → THE MAGIC FILE (Bot detection + Redirect)
├── [...postpath].tsx  → WordPress direct post path (legacy)
├── login.tsx          → Login page
├── register.tsx       → Register page
├── profile.tsx        → User profile page
├── analytics/[id].tsx → Analytics dashboard
└── api/
    ├── create-redirect.ts  → Naya link banao
    ├── edit-link.ts        → Link edit karo
    ├── links.ts            → Apne sare links dekho
    ├── fetch-wp.ts         → WordPress se data fetch karo
    ├── analytics/[id].ts   → Analytics data fetch
    └── auth/
        ├── signup.ts          → Register
        ├── signin.ts          → Login
        ├── signout.ts         → Logout
        └── forgot-password.ts → Password reset

lib/
├── db.ts    → MySQL connection pool + Table creation
└── auth.ts  → JWT helper functions
```

---

## 🎯 Ek Line Summary

> **Yeh site ek "Facebook OG Image Redirect Tool" hai** — jisme tum kisi bhi URL ko ek chhote link me convert karte ho, us link par custom title/image/description lagakar Facebook par share karte ho (taki bada preview aaye), aur real users ko directly original page par bhej deta hai — sab kuch track karte hue!

