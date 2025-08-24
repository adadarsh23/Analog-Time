document.addEventListener('DOMContentLoaded', () => {
    const display = document.getElementById("countup");

    function formatTime(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
        const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
        const s = String(totalSeconds % 60).padStart(2, '0');
        return `${h}h ${m}m ${s}s`;
    }

    function updateDisplay() {
        chrome.runtime.sendMessage({ action: "getTime" }, (response) => {
            if (response && response.elapsed != null) {
                display.textContent = formatTime(response.elapsed);
            }
        });
    }

    document.getElementById("startCountup").addEventListener("click", () => {
        chrome.runtime.sendMessage({ action: "startCount" });
    });

    document.getElementById("stopCountup").addEventListener("click", () => {
        chrome.runtime.sendMessage({ action: "stopCount" });
    });

    document.getElementById("resetCountup").addEventListener("click", () => {
        chrome.runtime.sendMessage({ action: "resetCount" });
        display.textContent = "00h 00m 00s";
    });

    setInterval(updateDisplay, 1000);
    updateDisplay(); // Initial load
});
