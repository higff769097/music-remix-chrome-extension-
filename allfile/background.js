// background.js
// Handles messages for sequential custom segment storage
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'getSettings') {
        chrome.storage.sync.get({ enabled: true }, items => {
            sendResponse({ settings: items });
        });
        return true; // keep channel open
    }

    if (msg.type === 'saveSegment') {
        const key = 'segments_' + msg.trackId;
        chrome.storage.sync.get([key], (result) => {
            let segments = result[key] || [];
            segments.push({ startSec: msg.startSec, endSec: msg.endSec });

            // Merge Overlapping Intervals
            segments.sort((a, b) => a.startSec - b.startSec);
            const merged = [];
            if (segments.length > 0) {
                let current = segments[0];
                for (let i = 1; i < segments.length; i++) {
                    let next = segments[i];
                    // If next starts before or at current end, they overlap
                    if (next.startSec <= current.endSec) {
                        current.endSec = Math.max(current.endSec, next.endSec);
                    } else {
                        merged.push(current);
                        current = next;
                    }
                }
                merged.push(current);
            }

            chrome.storage.sync.set({ [key]: merged }, () => {
                sendResponse({ success: true, segments: merged });
            });
        });
        return true;
    }

    if (msg.type === 'clearSegments') {
        const key = 'segments_' + msg.trackId;
        chrome.storage.sync.remove([key], () => {
            sendResponse({ success: true });
        });
        return true;
    }
});
