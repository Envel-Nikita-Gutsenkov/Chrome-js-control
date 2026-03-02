document.addEventListener('DOMContentLoaded', async () => {
    const siteList = document.getElementById('siteList');
    const emptyState = document.getElementById('emptyState');

    async function loadBlockedSites() {
        const { disabledSites } = await chrome.storage.sync.get('disabledSites');
        const sites = disabledSites || [];

        siteList.innerHTML = '';

        if (sites.length === 0) {
            siteList.style.display = 'none';
            emptyState.style.display = 'flex';
            return;
        }

        siteList.style.display = 'block';
        emptyState.style.display = 'none';

        sites.forEach(site => {
            const li = document.createElement('li');

            const urlSpan = document.createElement('span');
            urlSpan.className = 'site-url';
            urlSpan.textContent = site;

            const removeBtn = document.createElement('button');
            removeBtn.className = 'btn-remove';
            removeBtn.textContent = 'Remove';

            removeBtn.addEventListener('click', async () => {
                await chrome.runtime.sendMessage({ action: 'remove_permanent', url: site });
                loadBlockedSites(); // reload
            });

            li.appendChild(urlSpan);
            li.appendChild(removeBtn);
            siteList.appendChild(li);
        });
    }

    loadBlockedSites();
});