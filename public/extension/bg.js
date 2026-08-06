/**
 * FbVirall Extension Background Service Worker (bg.js)
 * Extract Facebook cookies and fetches active EAAB Access Token from AdsManager
 */

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "FBVIRALL_PING") {
    sendResponse({ active: true, version: "2.0.0" });
    return true;
  }

  if (request.type === "FBVIRALL_FETCH_TOKEN") {
    handleFetchToken()
      .then((data) => sendResponse(data))
      .catch((err) => sendResponse({ error: err.message || String(err) }));
    return true; // Keep message channel open for async response
  }
});

async function handleFetchToken() {
  // 1. Read Facebook Cookies
  const cookies = await chrome.cookies.getAll({ domain: ".facebook.com" });
  if (!cookies || cookies.length === 0) {
    throw new Error("No Facebook cookies found. Please log in to Facebook.com first!");
  }

  const cookieMap = {};
  cookies.forEach((c) => {
    cookieMap[c.name] = c.value;
  });

  const cUser = cookieMap["c_user"];
  const xs = cookieMap["xs"];

  if (!cUser || !xs) {
    throw new Error("Facebook session cookie (c_user/xs) missing. Please log into Facebook.com in this browser!");
  }

  const cookieString = `c_user=${cUser}; xs=${xs};`;

  // 2. Fetch active EAAB Access Token from AdsManager HTML
  try {
    const res = await fetch("https://adsmanager.facebook.com/adsmanager/manage/campaigns", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Cookie: cookieString,
      },
    });

    const htmlText = await res.text();

    let accessToken = null;
    const tokenMatch = htmlText.match(/accessToken\s*:\s*["'](EAAB[^"']+)["']/);
    if (tokenMatch && tokenMatch[1]) {
      accessToken = tokenMatch[1];
    } else {
      const fallbackMatch = htmlText.match(/(EAAB[a-zA-Z0-9]+)/);
      if (fallbackMatch && fallbackMatch[1]) {
        accessToken = fallbackMatch[1];
      }
    }

    if (!accessToken) {
      throw new Error("Logged into Facebook, but could not extract AdsManager EAAB Token. Open AdsManager once!");
    }

    // 3. Fetch User Info using Graph API
    const meRes = await fetch(`https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${accessToken}`);
    const meData = await meRes.json();

    return {
      success: true,
      accessToken,
      user: meData,
      cUser,
    };
  } catch (err) {
    throw new Error("Token extraction failed: " + (err.message || String(err)));
  }
}
