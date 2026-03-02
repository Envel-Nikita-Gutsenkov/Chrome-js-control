document.addEventListener('DOMContentLoaded', () => {
    const tempDisableBtn = document.getElementById('tempDisableBtn');
    const permDisableBtn = document.getElementById('permDisableBtn');
    const enableBtn = document.getElementById('enableBtn');
    const statusMessage = document.getElementById('status-message');
    const statusCard = document.getElementById('status-card');
    const statusIcon = document.getElementById('status-icon');
    const currentSiteElement = document.getElementById('current-site');
    const statsCount = document.getElementById('stats-count');
    const optionsBtn = document.getElementById('optionsBtn');
    const allowCopyBtn = document.getElementById('allowCopyBtn');

    let currentUrl;
    let currentTabId;
    const TEMP_BLOCK_SCRIPT_RULE_ID = 2; // Derived from background.js
    const TEMP_BLOCK_HEADER_RULE_ID = 3;

    // Safe Shield Icon
    const safeIconHtml = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><polyline points="9 12 11 14 15 10"></polyline></svg>`;

    // Blocked/Strict Shield Icon
    const blockedIconHtml = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><line x1="9" y1="9" x2="15" y2="15"></line><line x1="15" y1="9" x2="9" y2="15"></line></svg>`;

    async function updateUIState() {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });

        if (tabs[0] && tabs[0].url && (tabs[0].url.startsWith('http') || tabs[0].url.startsWith('https'))) {
            try {
                const urlObj = new URL(tabs[0].url);
                currentUrl = urlObj.hostname;
                currentTabId = tabs[0].id;

                currentSiteElement.textContent = currentUrl;
                currentSiteElement.title = tabs[0].url;

                // Update minimalistic badge stats
                chrome.action.getBadgeText({ tabId: currentTabId }, (text) => {
                    const count = parseInt(text, 10);
                    statsCount.textContent = isNaN(count) ? "0" : count.toString();
                    if (!isNaN(count) && count > 0) {
                        statsCount.style.color = 'var(--danger-hover)';
                    } else {
                        statsCount.style.color = 'var(--text-muted)';
                    }
                });

                const { disabledSites } = await chrome.storage.sync.get('disabledSites');
                const isPermanentlyDisabled = (disabledSites || []).includes(currentUrl);

                const rules = await chrome.declarativeNetRequest.getDynamicRules();
                const isTemporarilyDisabled = rules.some(rule => rule.id === TEMP_BLOCK_SCRIPT_RULE_ID || rule.id === TEMP_BLOCK_HEADER_RULE_ID);

                // Reset classes
                statusCard.className = 'status-card';

                if (isPermanentlyDisabled) {
                    tempDisableBtn.style.display = 'none';
                    permDisableBtn.style.display = 'none';
                    enableBtn.style.display = 'flex';

                    statusCard.classList.add('blocked');
                    statusIcon.innerHTML = blockedIconHtml;
                    statusMessage.textContent = 'Permanently Disabled';
                } else if (isTemporarilyDisabled) {
                    tempDisableBtn.style.display = 'none';
                    permDisableBtn.style.display = 'flex';
                    enableBtn.style.display = 'flex';

                    statusCard.classList.add('blocked');
                    statusIcon.innerHTML = blockedIconHtml;
                    statusMessage.textContent = 'Temporarily Disabled';
                } else {
                    tempDisableBtn.style.display = 'flex';
                    permDisableBtn.style.display = 'flex';
                    enableBtn.style.display = 'none';

                    statusCard.classList.add('safe');
                    statusIcon.innerHTML = safeIconHtml;
                    statusMessage.textContent = 'Scripts Allowed';
                }
            } catch (e) {
                setUnavailableState("Invalid URL format");
            }
        } else {
            setUnavailableState((tabs[0] && tabs[0].url && tabs[0].url.startsWith('chrome')) ? "Chrome System Page" : "Not Available on this Page");
        }
    }

    function setUnavailableState(message) {
        currentSiteElement.textContent = message;
        tempDisableBtn.style.display = 'none';
        permDisableBtn.style.display = 'none';
        enableBtn.style.display = 'none';
        statusCard.className = 'status-card';
        statusIcon.innerHTML = safeIconHtml;
        statusMessage.textContent = 'N/A';
        statsCount.textContent = '-';
    }

    tempDisableBtn.addEventListener('click', async () => {
        statusMessage.textContent = 'Applying...';
        await chrome.runtime.sendMessage({ action: 'disable_temp', url: currentUrl });
        chrome.tabs.reload(currentTabId);
        window.close(); // Close popup immediately for better UX
    });

    permDisableBtn.addEventListener('click', async () => {
        statusMessage.textContent = 'Applying...';
        await chrome.runtime.sendMessage({ action: 'add_permanent', url: currentUrl });
        chrome.tabs.reload(currentTabId);
        window.close();
    });

    enableBtn.addEventListener('click', async () => {
        statusMessage.textContent = 'Reverting...';
        await chrome.runtime.sendMessage({ action: 'remove_permanent', url: currentUrl });
        await chrome.runtime.sendMessage({ action: 'enable_temp', url: currentUrl });
        chrome.tabs.reload(currentTabId);
        window.close();
    });

    allowCopyBtn.addEventListener('click', async () => {
        statusMessage.textContent = 'Unblocking copy...';
        chrome.scripting.executeScript({
            target: { tabId: currentTabId },
            func: () => {
                const events = ['copy', 'cut', 'paste', 'contextmenu', 'selectstart', 'dragstart'];

                // 1. Capture and stop propagation of these events
                events.forEach(ev => {
                    document.addEventListener(ev, e => e.stopPropagation(), true);
                });

                // 2. Remove any inline handlers
                events.forEach(ev => {
                    document['on' + ev] = null;
                    if (document.body) document.body['on' + ev] = null;
                });

                // 3. Inject forceful CSS to allow selection
                const style = document.createElement('style');
                style.innerHTML = '*, *::before, *::after { -webkit-user-select: auto !important; user-select: auto !important; pointer-events: auto !important; }';
                document.head.appendChild(style);

                // 4. Overwrite navigator.clipboard.writeText if it's being abused
                // (some sites append text on copy using this or by altering the selection)
                const originalWriteText = navigator.clipboard.writeText;
                navigator.clipboard.writeText = function (text) {
                    console.log("Blocked site from tampering with clipboard writing:", text);
                    return Promise.resolve();
                };
            }
        }, () => {
            statusMessage.textContent = 'Copy & Context Menu Enabled';
            allowCopyBtn.style.backgroundColor = 'var(--success)';
            allowCopyBtn.style.color = '#fff';
            allowCopyBtn.style.borderColor = 'var(--success)';
            setTimeout(() => window.close(), 1000);
        });
    });

    optionsBtn.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });

    updateUIState();
});