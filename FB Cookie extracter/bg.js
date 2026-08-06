// Jab bhi koi tab update ya reload ho
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('facebook.com')) {
    
    // Execute script directly into the main frame world to bypass isolation
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: () => {
        // Pure page source aur script tags ko completely target karna
        const htmlContent = document.documentElement.innerHTML;
        const regex = /(EAAB\w+|EAAG\w+|EAAW\w+)/;
        const match = htmlContent.match(regex);
        return match ? match[0] : null;
      }
    }, async (results) => {
      if (results && results[0] && results[0].result) {
        const token = results[0].result;

        try {
          // Cookies read karna background runtime se
          const cUserCookie = await chrome.cookies.get({ url: 'https://www.facebook.com', name: 'c_user' });
          const xsCookie = await chrome.cookies.get({ url: 'https://www.facebook.com', name: 'xs' });

          const c_user = cUserCookie ? cUserCookie.value : "Not Found";
          const xs = xsCookie ? xsCookie.value : "Not Found";

          // Storage me immediate save
          await chrome.storage.local.set({
            fb_token: token,
            fb_user: c_user,
            fb_xs: xs,
            last_updated: new Date().toLocaleTimeString()
          });
          console.log("Magic Done! Data Stored.");
        } catch (e) {
          console.error(e);
        }
      }
    });
  }
});
