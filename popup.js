document.addEventListener('DOMContentLoaded', () => {
    const tempDisableBtn = document.getElementById('tempDisableBtn');
    const permDisableBtn = document.getElementById('permDisableBtn');
    const enableBtn = document.getElementById('enableBtn');
    const statusMessage = document.getElementById('status-message');
    const currentSiteElement = document.getElementById('current-site');
    const optionsBtn = document.getElementById('optionsBtn');

    let currentUrl;
    let currentTabId;

    function getRuleId(url) {
        let hash = 0;
        for (let i = 0; i < url.length; i++) {
            const char = url.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0;
        }
        return Math.abs(hash) + 1000;
    }

    async function updateUIState() {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs[0] && tabs[0].url && (tabs[0].url.startsWith('http') || tabs[0].url.startsWith('https'))) {
            try {
                const url = new URL(tabs[0].url);
                currentUrl = url.hostname;
                currentTabId = tabs[0].id;
                currentSiteElement.textContent = `Current site: ${currentUrl}`;
                
                const { disabledSites } = await chrome.storage.sync.get('disabledSites');
                const isPermanentlyDisabled = (disabledSites || []).includes(currentUrl);

                const rules = await chrome.declarativeNetRequest.getDynamicRules();
                const isTemporarilyDisabled = rules.some(rule => rule.id === 2);

                if (isPermanentlyDisabled) {
                    tempDisableBtn.disabled = true;
                    permDisableBtn.disabled = true;
                    enableBtn.disabled = false;
                    statusMessage.textContent = 'JS is permanently disabled.';
                } else if (isTemporarilyDisabled) {
                    tempDisableBtn.disabled = true;
                    permDisableBtn.disabled = false;
                    enableBtn.disabled = false;
                    statusMessage.textContent = 'JS is temporarily disabled.';
                }
                else {
                    tempDisableBtn.disabled = false;
                    permDisableBtn.disabled = false;
                    enableBtn.disabled = true;
                    statusMessage.textContent = '';
                }
            } catch (e) {
                currentSiteElement.textContent = `Not a valid URL`;
                tempDisableBtn.disabled = true;
                permDisableBtn.disabled = true;
                enableBtn.disabled = true;
                statusMessage.textContent = '';
            }
        } else {
            currentSiteElement.textContent = `Not available`;
            tempDisableBtn.disabled = true;
            permDisableBtn.disabled = true;
            enableBtn.disabled = true;
            statusMessage.textContent = '';
        }
    }

    tempDisableBtn.addEventListener('click', async () => {
        await chrome.runtime.sendMessage({ action: 'disable_temp', url: currentUrl });
        chrome.tabs.reload(currentTabId);
        updateUIState();
    });

    permDisableBtn.addEventListener('click', async () => {
        await chrome.runtime.sendMessage({ action: 'add_permanent', url: currentUrl });
        chrome.tabs.reload(currentTabId);
        updateUIState();
    });

    enableBtn.addEventListener('click', async () => {
        await chrome.runtime.sendMessage({ action: 'remove_permanent', url: currentUrl });
        await chrome.runtime.sendMessage({ action: 'enable_temp', url: currentUrl });
        chrome.tabs.reload(currentTabId);
        updateUIState();
    });
    
    optionsBtn.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });

    updateUIState();
});