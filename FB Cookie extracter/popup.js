// Storage se saved data ko nikal kar UI par load karna
document.addEventListener('DOMContentLoaded', async () => {
  const data = await chrome.storage.local.get(['fb_token', 'fb_user', 'fb_xs', 'last_updated']);
  
  if (data.fb_token) {
    document.getElementById('time').innerText = "Captured at: " + data.last_updated;
    document.getElementById('user').innerText = data.fb_user;
    document.getElementById('xs').innerText = data.fb_xs;
    document.getElementById('token').innerText = data.fb_token;
  }
});
