const PERMANENT_RULE_ID_OFFSET = 1000;
const HEADER_RULE_ID_OFFSET = 500000;
const TEMP_BLOCK_SCRIPT_RULE_ID = 2;
const TEMP_BLOCK_HEADER_RULE_ID = 3;
const SHOPIFY_CDN = 'cdn.shopifycdn.net';
const VITALS_APP_CDN = 'cdn-sf.vitals.app';
const OXIAPPS_CDN = 'social-login.oxiapps.com';

function getRuleId(url) {
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
        const char = url.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
    }
    return Math.abs(hash) + PERMANENT_RULE_ID_OFFSET;
}

function createRulesForUrl(url, isPermanent) {
    const scriptRuleId = isPermanent ? getRuleId(url) : TEMP_BLOCK_SCRIPT_RULE_ID;
    const headerRuleId = isPermanent ? getRuleId(url) + HEADER_RULE_ID_OFFSET : TEMP_BLOCK_HEADER_RULE_ID;
    const priority = isPermanent ? 10 : 2;

    const scriptRule = {
        id: scriptRuleId,
        priority: priority,
        action: { type: "block" },
        condition: {
            // Block all scripts requested by this domain, to strictly prevent 1st and 3rd party loading
            initiatorDomains: [url],
            resourceTypes: ["script"]
        }
    };

    const headerRule = {
        id: headerRuleId,
        priority: priority,
        action: {
            type: "modifyHeaders",
            responseHeaders: [
                {
                    header: "Content-Security-Policy",
                    operation: "append",
                    value: "script-src 'none';"
                }
            ]
        },
        condition: {
            // Target the main/sub frames of the domain itself
            urlFilter: `||${url}`,
            resourceTypes: ["main_frame", "sub_frame"]
        }
    };

    return [scriptRule, headerRule];
}

async function addBlockRules(urls, isPermanent = false) {
    let allRules = [];
    urls.forEach(url => {
        allRules = allRules.concat(createRulesForUrl(url, isPermanent));
    });

    try {
        const removeRuleIds = allRules.map(rule => rule.id);
        console.log(`Adding strict rules for URLs: ${urls.join(', ')}`);
        await chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: removeRuleIds,
            addRules: allRules
        });
        console.log(`Rules added successfully.`);
    } catch (e) {
        console.error("Failed to add rules:", e);
    }
}

async function removeBlockRule(urls, isPermanent = false) {
    let removeRuleIds = [];
    urls.forEach(url => {
        const scriptRuleId = isPermanent ? getRuleId(url) : TEMP_BLOCK_SCRIPT_RULE_ID;
        const headerRuleId = isPermanent ? getRuleId(url) + HEADER_RULE_ID_OFFSET : TEMP_BLOCK_HEADER_RULE_ID;
        removeRuleIds.push(scriptRuleId, headerRuleId);
    });

    try {
        console.log(`Removing strict rules for URLs: ${urls.join(', ')}`);
        await chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: removeRuleIds
        });
        console.log(`Rules removed successfully.`);
    } catch (e) {
        console.error("Failed to remove rule:", e);
    }
}

async function applyPermanentRules() {
    const { disabledSites } = await chrome.storage.sync.get('disabledSites');
    const sites = disabledSites || [];
    console.log("Applying strict permanent rules for sites:", sites);

    const allUrlsToBlock = new Set();
    sites.forEach(site => {
        allUrlsToBlock.add(site);
        allUrlsToBlock.add(SHOPIFY_CDN);
        allUrlsToBlock.add(VITALS_APP_CDN);
        allUrlsToBlock.add(OXIAPPS_CDN);
    });

    let permanentRules = [];
    allUrlsToBlock.forEach(url => {
        permanentRules = permanentRules.concat(createRulesForUrl(url, true));
    });

    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const permanentRuleIds = existingRules
        .filter(rule => rule.id >= PERMANENT_RULE_ID_OFFSET)
        .map(rule => rule.id);

    try {
        await chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: permanentRuleIds,
            addRules: permanentRules
        });
        console.log("Permanent rules applied successfully.");
    } catch (e) {
        console.error("Failed to apply permanent rules on startup:", e);
    }
}

chrome.runtime.onInstalled.addListener(async () => {
    // Enable badge text matching the block action count
    await chrome.declarativeNetRequest.setExtensionActionOptions({ displayActionCountAsBadgeText: true });

    // Set a sleek dark background for the badge
    await chrome.action.setBadgeBackgroundColor({ color: "#e74c3c" });

    applyPermanentRules();
});

chrome.runtime.onStartup.addListener(async () => {
    await chrome.declarativeNetRequest.setExtensionActionOptions({ displayActionCountAsBadgeText: true });
    await chrome.action.setBadgeBackgroundColor({ color: "#e74c3c" });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    (async () => {
        if (request.action === 'add_permanent') {
            const { disabledSites } = await chrome.storage.sync.get('disabledSites');
            const sites = disabledSites || [];
            if (!sites.includes(request.url)) {
                sites.push(request.url);
                await chrome.storage.sync.set({ disabledSites: sites });
            }
            const urlsToBlock = [request.url, SHOPIFY_CDN, VITALS_APP_CDN, OXIAPPS_CDN];
            await addBlockRules(urlsToBlock, true);
            sendResponse({ status: 'success', message: 'Site added to permanent list.' });
        } else if (request.action === 'remove_permanent') {
            const { disabledSites } = await chrome.storage.sync.get('disabledSites');
            let sites = disabledSites || [];
            sites = sites.filter(site => site !== request.url);
            await chrome.storage.sync.set({ disabledSites: sites });
            const urlsToRemove = [request.url, SHOPIFY_CDN, VITALS_APP_CDN, OXIAPPS_CDN];
            await removeBlockRule(urlsToRemove, true);
            sendResponse({ status: 'success', message: 'Site removed from permanent list.' });
        } else if (request.action === 'disable_temp') {
            await addBlockRules([request.url], false);
            sendResponse({ status: 'success', message: 'JS strictly disabled for this session.' });
        } else if (request.action === 'enable_temp') {
            await removeBlockRule([request.url], false);
            sendResponse({ status: 'success', message: 'JS enabled for this session.' });
        }
    })();
    return true;
});