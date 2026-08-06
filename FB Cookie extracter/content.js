// Jaise hi page load ho, token dhoondho
(function() {
  const regex = /(EAAG\w+|EAAW\w+|EAAB\w+)/;
  const match = document.documentElement.innerHTML.match(regex);

  if (match) {
    const token = match[0];
    // Background script (bg.js) ko token bhej do
    chrome.runtime.sendMessage({ action: "TOKEN_FOUND", token: token });
  }
})();
