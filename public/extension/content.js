/**
 * FbVirall Extension Content Script (The Bridge)
 * Injected automatically on fbvirall.vercel.app & localhost:3000
 * Listens for window postMessages from our SaaS frontend & forwards to bg.js
 */
(function () {
  console.log("⚡ FbVirall V2 Extension Bridge Active!");

  // Notify SaaS Web Page that Extension is installed and active
  window.postMessage({ type: "FBVIRALL_EXTENSION_INSTALLED", version: "2.0.0" }, "*");

  // Listen for requests from SaaS Page DOM
  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    const { type, payload, requestId } = event.data || {};

    if (type === "FBVIRALL_FETCH_TOKEN" || type === "FBVIRALL_PING") {
      // Forward request to background service worker (bg.js)
      chrome.runtime.sendMessage({ type, payload }, (response) => {
        const lastErr = chrome.runtime.lastError;
        window.postMessage(
          {
            type: "FBVIRALL_EXTENSION_RESPONSE",
            originalType: type,
            requestId,
            data: response,
            error: lastErr ? lastErr.message : response?.error,
          },
          "*"
        );
      });
    }
  });
})();
