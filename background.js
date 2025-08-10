const PERMANENT_RULE_ID_OFFSET = 1000;
const TEMP_BLOCK_RULE_ID = 2;
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

async function addBlockRules(urls, isPermanent = false) {
    const rules = urls.map(url => {
        const ruleId = isPermanent ? getRuleId(url) : TEMP_BLOCK_RULE_ID;
        const priority = isPermanent ? 10 : 2;

        return {
            id: ruleId,
            priority: priority,
            action: { type: "block" },
            condition: {
                urlFilter: `*://*${url}/*`,
                resourceTypes: ["script"]
            }
        };
    });

    try {
        const removeRuleIds = rules.map(rule => rule.id);
        console.log(`Adding rules for URLs: ${urls.join(', ')} with IDs: ${removeRuleIds.join(', ')}`);
        await chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: removeRuleIds,
            addRules: rules
        });
        console.log(`Rules added successfully.`);
    } catch (e) {
        console.error("Failed to add rules:", e);
    }
}

async function removeBlockRule(url, isPermanent = false) {
    const ruleId = isPermanent ? getRuleId(url) : TEMP_BLOCK_RULE_ID;
    try {
        console.log(`Removing rule for URL: ${url} with ID: ${ruleId}`);
        await chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: [ruleId]
        });
        console.log(`Rule removed successfully.`);
    } catch (e) {
        console.error("Failed to remove rule:", e);
    }
}

async function applyPermanentRules() {
    const { disabledSites } = await chrome.storage.sync.get('disabledSites');
    const sites = disabledSites || [];
    console.log("Applying permanent rules for sites:", sites);

    const allUrlsToBlock = new Set();
    sites.forEach(site => {
        allUrlsToBlock.add(site);
        // Добавляем связанные CDN
        allUrlsToBlock.add(SHOPIFY_CDN);
        allUrlsToBlock.add(VITALS_APP_CDN);
        allUrlsToBlock.add(OXIAPPS_CDN);
    });

    const permanentRules = [...allUrlsToBlock].map(url => ({
        id: getRuleId(url),
        priority: 10,
        action: { type: "block" },
        condition: {
            urlFilter: `*://*${url}/*`,
            resourceTypes: ["script"]
        }
    }));

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

chrome.runtime.onInstalled.addListener(() => {
    applyPermanentRules();
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
            await removeBlockRule(request.url, true);
            sendResponse({ status: 'success', message: 'Site removed from permanent list.' });
        } else if (request.action === 'disable_temp') {
            await addBlockRules([request.url], false);
            sendResponse({ status: 'success', message: 'JS disabled for this session.' });
        } else if (request.action === 'enable_temp') {
            await removeBlockRule(request.url, false);
            sendResponse({ status: 'success', message: 'JS enabled for this session.' });
        }
    })();
    return true;
});