const toggleBtn = document.getElementById("toggleBtn");

// Load saved state
chrome.storage.sync.get("httpsWarningEnabled", ({ httpsWarningEnabled }) => {
  const isEnabled = httpsWarningEnabled ?? true; // default ON
  updateButton(isEnabled);
});

// Toggle button click
toggleBtn.addEventListener("click", () => {
  chrome.storage.sync.get("httpsWarningEnabled", ({ httpsWarningEnabled }) => {
    const newState = !(httpsWarningEnabled ?? true);

    chrome.storage.sync.set({ httpsWarningEnabled: newState }, () => {
      updateButton(newState);

      // Reload current tab so content.js reflects new state
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) chrome.tabs.reload(tabs[0].id);
      });
    });
  });
});

// Update button UI
function updateButton(isEnabled) {
  toggleBtn.textContent = isEnabled ? "Turn OFF" : "Turn ON";
  toggleBtn.className = isEnabled ? "on" : "off";
}
