document.addEventListener('DOMContentLoaded', () => {
    const disabledSitesList = document.getElementById('disabledSitesList');
    const statusMessage = document.getElementById('status-message');

    function loadDisabledSites() {
        chrome.storage.sync.get('disabledSites', (data) => {
            const sites = data.disabledSites || [];
            disabledSitesList.innerHTML = '';
            if (sites.length === 0) {
                statusMessage.textContent = 'List is empty.';
                return;
            } else {
                statusMessage.textContent = '';
            }

            sites.forEach(site => {
                const li = document.createElement('li');
                li.innerHTML = `<span class="site-name">${site}</span><button class="remove-btn">Remove</button>`;
                li.querySelector('.remove-btn').addEventListener('click', () => {
                    removeSite(site);
                });
                disabledSitesList.appendChild(li);
            });
        });
    }

    function removeSite(siteToRemove) {
        chrome.storage.sync.get('disabledSites', (data) => {
            let sites = data.disabledSites || [];
            sites = sites.filter(site => site !== siteToRemove);
            chrome.storage.sync.set({ disabledSites: sites }, () => {
                loadDisabledSites();
                chrome.runtime.sendMessage({ action: 'remove_permanent', url: siteToRemove });
            });
        });
    }

    loadDisabledSites();
});