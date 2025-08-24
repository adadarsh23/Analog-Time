chrome.runtime.onInstalled.addListener(() => {
  console.log("Analog Clock Extension installed.");
  chrome.tabs.create({ url: chrome.runtime.getURL("welcome.html") });
  setTimeout(() => chrome.tabs.create({ url: "https://github.com/adadarsh23/" }), 3000);

  chrome.runtime.setUninstallURL("https://chromewebstore.google.com/?utm_source=ext_app_menu");
});

let startTime = null;
let elapsedBefore = 0;
let interval = null;

function getElapsed() {
    return startTime ? elapsedBefore + (Date.now() - startTime) : elapsedBefore;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "startCount") {
        if (!startTime) {
            startTime = Date.now();
            interval = setInterval(() => {
                const elapsed = getElapsed();
                chrome.storage.local.set({ elapsed });
            }, 1000);
        }
    } else if (request.action === "stopCount") {
        if (startTime) {
            elapsedBefore += Date.now() - startTime;
            startTime = null;
            clearInterval(interval);
            chrome.storage.local.set({ elapsed: elapsedBefore });
        }
    } else if (request.action === "resetCount") {
        clearInterval(interval);
        startTime = null;
        elapsedBefore = 0;
        chrome.storage.local.set({ elapsed: 0 });
    } else if (request.action === "getTime") {
        chrome.storage.local.get("elapsed", (result) => {
            sendResponse({ elapsed: result.elapsed || 0 });
        });
        return true; // required for async sendResponse
    }
});

