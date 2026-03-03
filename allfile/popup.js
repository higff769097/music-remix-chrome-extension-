document.addEventListener('DOMContentLoaded', () => {
    const enabledInput = document.getElementById('enabled');

    const startMinInput = document.getElementById('startMin');
    const startSecInput = document.getElementById('startSec');
    const endMinInput = document.getElementById('endMin');
    const endSecInput = document.getElementById('endSec');
    const segmentList = document.getElementById('segmentList');

    // Helper: seconds to mm:ss
    const formatTime = (s) => {
        const mins = Math.floor(s / 60);
        const secs = s % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Load general settings
    chrome.storage.sync.get({
        enabled: true
    }, (items) => {
        enabledInput.checked = items.enabled;
    });

    const updateSegmentList = (trackId) => {
        const key = 'segments_' + trackId;
        chrome.storage.sync.get([key], (result) => {
            const segments = result[key] || [];
            segmentList.innerHTML = '';

            if (segments.length === 0) {
                const li = document.createElement('li');
                li.textContent = 'No segments saved for this song.';
                li.style.color = '#888';
                li.style.fontStyle = 'italic';
                segmentList.appendChild(li);
                return;
            }

            segments.forEach(seg => {
                const li = document.createElement('li');
                li.textContent = `${formatTime(seg.startSec)} -> ${formatTime(seg.endSec)}`;
                segmentList.appendChild(li);
            });
        });
    };

    // Get active track context
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];
        if (activeTab && activeTab.url.includes('music.youtube.com')) {
            const url = new URL(activeTab.url);
            const trackId = url.searchParams.get('v') || activeTab.title;
            updateSegmentList(trackId);

            // Add Segment Button
            document.getElementById('addSegmentBtn').addEventListener('click', () => {
                const startSec = (parseInt(startMinInput.value, 10) * 60) + parseInt(startSecInput.value, 10);
                const endSec = (parseInt(endMinInput.value, 10) * 60) + parseInt(endSecInput.value, 10);

                if (endSec <= startSec) {
                    alert('End time must be after start time.');
                    return;
                }

                chrome.runtime.sendMessage({
                    type: 'saveSegment',
                    trackId,
                    startSec,
                    endSec
                }, (resp) => {
                    if (resp && resp.success) {
                        updateSegmentList(trackId);
                    }
                });
            });

            // Clear Segments Button
            document.getElementById('clearSegmentsBtn').addEventListener('click', () => {
                chrome.runtime.sendMessage({ type: 'clearSegments', trackId }, (resp) => {
                    if (resp && resp.success) updateSegmentList(trackId);
                });
            });
        }
    });

    // Save General Settings
    document.getElementById('saveBtn').addEventListener('click', () => {
        const enabled = enabledInput.checked;
        chrome.storage.sync.set({ enabled }, () => {
            alert('Settings saved');
        });
    });
});
