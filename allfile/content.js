// Monitors playback and handles sequential custom segments
let settings = { enabled: true };
let segmentsPlaying = false;
let activeSequenceId = 0;

chrome.runtime.sendMessage({ type: 'getSettings' }, response => {
    if (response && response.settings) settings = response.settings;
});

function getAudioElement() {
    return document.querySelector('video, audio');
}

function getTrackId() {
    const url = new URL(window.location.href);
    return url.searchParams.get('v') || document.title;
}

// Play segments once in order
async function playSequentialSegments() {
    if (segmentsPlaying || !settings.enabled) return;

    const myId = ++activeSequenceId;
    const trackId = getTrackId();
    const key = 'segments_' + trackId;
    const result = await new Promise(res => chrome.storage.sync.get([key], r => res(r)));
    const segments = result[key] || [];

    const audio = getAudioElement();
    if (!audio) return;

    // If no segments, just let it play normally.
    if (segments.length === 0) {
        return;
    }

    segmentsPlaying = true;
    const originalPauseState = audio.paused;

    for (const seg of segments) {
        if (myId !== activeSequenceId) break;

        const duration = audio.duration || Infinity;
        const start = Math.min(seg.startSec, duration);
        const end = Math.min(seg.endSec, duration);

        if (start >= duration) continue;

        audio.currentTime = start;
        if (originalPauseState === false) audio.play();

        await new Promise(resolve => {
            const observer = () => {
                if (myId !== activeSequenceId) {
                    audio.removeEventListener('timeupdate', observer);
                    resolve();
                    return;
                }
                if (audio.currentTime >= end) {
                    audio.removeEventListener('timeupdate', observer);
                    resolve();
                }
            };
            audio.addEventListener('timeupdate', observer);
        });
    }

    if (myId === activeSequenceId) {
        segmentsPlaying = false;
        // skip to next song - use a more robust selector for the Next button
        const nextBtn = document.querySelector('tp-yt-paper-icon-button[aria-label*="Next"], tp-yt-paper-icon-button[title*="Next"]');
        if (nextBtn) {
            nextBtn.click();
        } else {
            // Fallback: Seek to end to trigger native skip
            audio.currentTime = audio.duration - 0.1;
        }
    }
}

// Initial attachment and observer for dynamic page changes
function init() {
    const audio = getAudioElement();
    if (audio) {
        // If already playing, start immediately
        if (!audio.paused && audio.currentTime > 0) {
            playSequentialSegments();
        }

        // Listen for subsequent playing events
        audio.addEventListener('playing', () => {
            playSequentialSegments();
        }, { once: false });
    }
}

// Handle navigation in SPA
let lastUrl = location.href;
new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
        lastUrl = url;
        setTimeout(init, 2000); // Wait for metadata/audio element to stabilize
    }
}).observe(document, { subtree: true, childList: true });

init();
