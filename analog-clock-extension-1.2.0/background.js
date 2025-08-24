// background.js (Manifest V3)

// ─────────────────────────────────────────────────────────────────────────────
// Install / Uninstall
// ─────────────────────────────────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  console.log("Analog Clock Extension installed.");
  chrome.tabs.create({ url: chrome.runtime.getURL("welcome.html") });
  setTimeout(() => chrome.tabs.create({ url: "https://github.com/adadarsh23/" }), 3000);
  chrome.runtime.setUninstallURL("https://chromewebstore.google.com/?utm_source=ext_app_menu");
});

// ─────────────────────────────────────────────────────────────────────────────
// Stopwatch state (optional feature you had)
// ─────────────────────────────────────────────────────────────────────────────
let startTime = null;
let elapsedBefore = 0;
let interval = null;

function getElapsed() {
  return startTime ? elapsedBefore + (Date.now() - startTime) : elapsedBefore;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function playSound(soundFile, ms = 3000) {
  return new Promise((resolve, reject) => {
    try {
      const audioContext = new AudioContext();
      fetch(chrome.runtime.getURL(`sounds/${soundFile}`))
        .then((res) => {
          if (!res.ok) throw new Error(`Failed to fetch ${soundFile}: ${res.statusText}`);
          return res.arrayBuffer();
        })
        .then((buf) => audioContext.decodeAudioData(buf))
        .then((buffer) => {
          const source = audioContext.createBufferSource();
          source.buffer = buffer;
          source.connect(audioContext.destination);
          source.start(0);
          setTimeout(() => {
            try {
              source.stop();
              audioContext.close().catch(() => { });
            } catch (e) { }
            resolve();
          }, ms);
        })
        .catch((e) => {
          console.error("playSound error:", e);
          reject(e);
        });
    } catch (e) {
      console.error("AudioContext error:", e);
      reject(e);
    }
  });
}

/**
 * Compute the next occurrence for a repeating alarm.
 * repeatDays: array of 0..6 (Sun..Sat)
 * hours, minutes: 24h clock integers
 */
function nextRecurringDate(hours, minutes, repeatDays, now = new Date()) {
  // 1) Try today or next 6 days with time strictly in the future
  for (let i = 0; i < 7; i++) {
    const candidate = new Date(now);
    candidate.setDate(now.getDate() + i);
    candidate.setHours(hours, minutes, 0, 0);
    if (repeatDays.includes(candidate.getDay()) && candidate > now) {
      return candidate;
    }
  }
  // 2) Fallback: ensure at least tomorrow (avoid scheduling earlier today)
  for (let i = 1; i <= 7; i++) {
    const candidate = new Date(now);
    candidate.setDate(now.getDate() + i);
    candidate.setHours(hours, minutes, 0, 0);
    if (repeatDays.includes(candidate.getDay())) {
      return candidate;
    }
  }
  return null; // should not happen if repeatDays not empty
}

// ─────────────────────────────────────────────────────────────────────────────
// Single unified onMessage listener (avoid duplicates)
// ─────────────────────────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // Stopwatch controls
  if (msg.action === "startCount") {
    if (!startTime) {
      startTime = Date.now();
      interval = setInterval(() => {
        const elapsed = getElapsed();
        chrome.storage.local.set({ elapsed });
      }, 1000);
    }
    return; // no async response

  } else if (msg.action === "stopCount") {
    if (startTime) {
      elapsedBefore += Date.now() - startTime;
      startTime = null;
      clearInterval(interval);
      chrome.storage.local.set({ elapsed: elapsedBefore });
    }
    return; // no async response

  } else if (msg.action === "resetCount") {
    clearInterval(interval);
    startTime = null;
    elapsedBefore = 0;
    chrome.storage.local.set({ elapsed: 0 });
    return; // no async response

  } else if (msg.action === "getTime") {
    chrome.storage.local.get("elapsed", (result) => {
      sendResponse({ elapsed: result.elapsed || 0 });
    });
    return true; // async

    // ...existing code...
  } else if (msg.action === "testSound") {
    const soundFile = msg.sound || "sound1.mp3";
    playSound(soundFile, 3000)
      .then(() => sendResponse({ success: true }))
      .catch((e) => sendResponse({ success: false, error: e.message || String(e) }));
    return true; // async
    // ...existing code...

  } else if (msg.action === "cancelAlarm") {
    chrome.alarms.clear(msg.alarmName, (wasCleared) => {
      if (wasCleared) {
        chrome.storage.local.remove(`alarm_${msg.alarmName}`, () => {
          sendResponse({ success: true });
        });
      } else {
        sendResponse({ success: false });
      }
    });
    return true; // async

  } else if (msg.action === "setAlarm") {
    // Optional: if you decide to set alarms from popup via message
    const { hour12, minute, amPm, repeatDays = [], oneTime = false, sound = "sound1.mp3" } = msg;

    // Convert 12h -> 24h
    let hours = parseInt(hour12, 10) % 12;
    if (amPm === "PM") hours += 12;
    const minutes = parseInt(minute, 10);

    const now = new Date();
    let alarmTime = new Date(now);
    alarmTime.setSeconds(0, 0);

    if (Array.isArray(repeatDays) && repeatDays.length > 0 && !oneTime) {
      const next = nextRecurringDate(hours, minutes, repeatDays, now);
      if (!next) {
        sendResponse({ success: false, error: "No valid repeat day found." });
        return true;
      }
      alarmTime = next;
    } else {
      // One-time
      alarmTime.setHours(hours, minutes, 0, 0);
      if (alarmTime <= now) {
        alarmTime.setDate(alarmTime.getDate() + 1);
      }
    }

    const alarmName = `alarm_${Date.now()}`;
    chrome.alarms.create(alarmName, { when: alarmTime.getTime() }, () => {
      // Save info for onAlarm
      chrome.storage.local.set({
        [`alarm_${alarmName}`]: {
          hours,
          minutes,
          repeatDays: Array.isArray(repeatDays) ? repeatDays : [],
          sound,
          nextTrigger: alarmTime.getTime()
        },
        alarmSound: sound // also store global preference
      }, () => {
        sendResponse({ success: true, name: alarmName, when: alarmTime.getTime() });
      });
    });
    return true; // async
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Alarms
// ─────────────────────────────────────────────────────────────────────────────
chrome.alarms.onAlarm.addListener((alarm) => {
  console.log("Alarm triggered:", alarm.name);

  chrome.notifications.create({
    type: "basic",
    iconUrl: "icons/icons8-time-80.png",
    title: "Alarm!",
    message: "Time to wake up!"
  });

  chrome.storage.local.get([`alarm_${alarm.name}`, "alarmSound"], (data) => {
    const alarmData = data[`alarm_${alarm.name}`];
    const fallbackSound = data.alarmSound || "sound1.mp3";
    const soundFile = (alarmData && alarmData.sound) ? alarmData.sound : fallbackSound;

    // Send message to popup to play sound, repeat 3 times (customize as needed)
    chrome.runtime.sendMessage({ action: "playSound", sound: soundFile, repeatCount: 3 });

    // Handle recurring: schedule the next occurrence
    if (alarmData && Array.isArray(alarmData.repeatDays) && alarmData.repeatDays.length > 0) {
      const now = new Date();
      const next = nextRecurringDate(alarmData.hours, alarmData.minutes, alarmData.repeatDays, now);
      if (next) {
        const newName = `alarm_${Date.now()}`;
        chrome.alarms.create(newName, { when: next.getTime() }, () => {
          const newAlarmData = {
            ...alarmData,
            nextTrigger: next.getTime()
          };
          chrome.storage.local.set({ [`alarm_${newName}`]: newAlarmData });
        });
      }
    }

    // Clean up the fired alarm
    chrome.alarms.clear(alarm.name, () => {
      chrome.storage.local.remove(`alarm_${alarm.name}`);
    });
  });
});
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "playSound") {
    const audioContext = new AudioContext();
    fetch(chrome.runtime.getURL(`sounds/${msg.sound}`))
      .then(res => res.arrayBuffer())
      .then(buf => audioContext.decodeAudioData(buf))
      .then(decoded => {
        const source = audioContext.createBufferSource();
        source.buffer = decoded;
        source.connect(audioContext.destination);
        source.start(0);
      })
      .catch(console.error);
  }
});
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "toggleHttpsWarning") {
    chrome.tabs.get(message.tabId, (tab) => {
      // Only inject if not a chrome:// or extension page
      if (
        tab.url &&
        !tab.url.startsWith("chrome://") &&
        !tab.url.startsWith("chrome-extension://") &&
        !tab.url.startsWith("about:")
      ) {
        chrome.scripting.executeScript({
          target: { tabId: message.tabId },
          func: (isEnabled) => {
            const warning = document.getElementById("https-warning");
            if (isEnabled && window.location.protocol !== "https:") {
              if (!warning) {
                const n = document.createElement("div");
                n.id = "https-warning";
                n.innerText = "⚠ Warning: This page is not loaded over HTTPS. Your connection may not be secure.";
                Object.assign(n.style, {
                  background: "red", color: "white", padding: "10px",
                  position: "fixed", bottom: "0", left: "0", width: "100%",
                  textAlign: "center", fontWeight: "bold", fontSize: "14px", zIndex: "100000"
                });
                document.body.appendChild(n);
              }
            } else {
              if (warning) warning.remove();
            }
          },
          args: [message.isEnabled]
        });
      }
    });
  }
});

