document.addEventListener('DOMContentLoaded', () => {
    const domainInput = document.getElementById('domainInput');
    const addButton = document.getElementById('addDomain');
    const statusDiv = document.getElementById('status');
    const domainsList = document.getElementById('domainsList');

    // Initialize storage if needed
    chrome.storage.local.get(['watchedDomains'], result => {
        if (!result.watchedDomains) {
            chrome.storage.local.set({ watchedDomains: [] });
        }
        loadDomains();
    });

    function showStatus(message, type = '') {
        statusDiv.textContent = message;
        statusDiv.className = type;
        setTimeout(() => {
            statusDiv.textContent = '';
            statusDiv.className = '';
        }, 3000);
    }

    function loadDomains() {
        chrome.storage.local.get(['watchedDomains'], result => {
            const domains = result.watchedDomains || [];
            domainsList.innerHTML = '';

            if (domains.length === 0) {
                domainsList.innerHTML = '<div style="color: #666;">Brak zapisanych domen</div>';
                return;
            }

            domains.forEach(domain => {
                const item = document.createElement('div');
                item.className = 'domain-item';
                item.innerHTML = `
                    <span>${domain}</span>
                    <button class="remove-btn" data-domain="${domain}">Usuń</button>
                `;
                domainsList.appendChild(item);
            });
        });
    }

    addButton.addEventListener('click', () => {
        const domain = domainInput.value.trim()
            .replace(/^(https?:\/\/)?(www\.)?/, '')
            .replace(/\/+$/, '');

        if (!domain) {
            showStatus('Wprowadź nazwę domeny', 'error');
            return;
        }

        if (!/^[a-zA-Z0-9][a-zA-Z0-9-._]*\.[a-zA-Z]{2,}$/.test(domain)) {
            showStatus('Nieprawidłowy format domeny', 'error');
            return;
        }

        chrome.storage.local.get(['watchedDomains'], result => {
            const domains = result.watchedDomains || [];
            if (domains.includes(domain)) {
                showStatus('Ta domena jest już dodana', 'error');
                return;
            }

            domains.push(domain);
            chrome.storage.local.set({ watchedDomains: domains }, () => {
                showStatus('Domena dodana pomyślnie', 'success');
                domainInput.value = '';
                loadDomains();
            });
        });
    });

    domainsList.addEventListener('click', e => {
        if (e.target.classList.contains('remove-btn')) {
            const domainToRemove = e.target.dataset.domain;
            chrome.storage.local.get(['watchedDomains'], result => {
                const domains = result.watchedDomains || [];
                const newDomains = domains.filter(d => d !== domainToRemove);
                chrome.storage.local.set({ watchedDomains: newDomains }, () => {
                    showStatus('Domena usunięta', 'success');
                    loadDomains();
                });
            });
        }
    });

    domainInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addButton.click();
        }
    });

    // Clear status on input
    domainInput.addEventListener('input', () => {
        statusDiv.textContent = '';
        statusDiv.className = '';
    });
});
