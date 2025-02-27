// Helper function for rate limiting
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

function shouldCheckDomain(url) {
    return new Promise(resolve => {
        const domain = new URL(url).hostname
            .replace(/^www\./, '');

        chrome.storage.local.get(['watchedDomains'], result => {
            const watchedDomains = result.watchedDomains || [];
            resolve(watchedDomains.some(watched =>
                domain.includes(watched) || watched.includes(domain)
            ));
        });
    });
}

async function getIndexingDate(url) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action: "getAuthToken" }, async (authResponse) => {
            if (!authResponse || !authResponse.token) {
                return reject(new Error("Błąd autoryzacji"));
            }

            try {
                const urlObj = new URL(url);
                // Try these URL variations
                const urlVariations = [
                    url, // Original URL
                    url.replace(/\/$/, ''), // URL without trailing slash
                    `${urlObj.origin}${urlObj.pathname}`, // URL without params
                    urlObj.origin, // Just domain with protocol
                ];

                const domain = urlObj.hostname;
                const apiUrl = "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect";

                for (const inspectionUrl of urlVariations) {
                    try {
                        // Add delay between requests
                        await delay(500);

                        const response = await fetch(apiUrl, {
                            method: "POST",
                            headers: {
                                "Authorization": `Bearer ${authResponse.token}`,
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                inspectionUrl: inspectionUrl,
                                siteUrl: `sc-domain:${domain}`
                            })
                        });

                        const data = await response.json();
                        console.debug('API Response for:', inspectionUrl, data);

                        if (data.inspectionResult?.indexStatusResult) {
                            const status = data.inspectionResult.indexStatusResult.coverageState;
                            const lastCrawled = data.inspectionResult.indexStatusResult.lastCrawlTime;

                            if (lastCrawled) {
                                return resolve(new Date(lastCrawled).toLocaleDateString('pl-PL'));
                            }
                        }
                    } catch (e) {
                        console.debug('Request failed:', e);
                        continue;
                    }
                }

                // No valid data found for any URL variation
                resolve("Nie znaleziono w indeksie");
            } catch (error) {
                console.error("Error:", error);
                resolve("Błąd sprawdzania");
            }
        });
    });
}

async function addIndexDatesToSERP() {
    const MAX_CONCURRENT_REQUESTS = 3;
    const searchResults = Array.from(document.querySelectorAll("div.yuRUbf a"));

    // Filter results for watched domains only
    const watchedResults = [];
    for (const link of searchResults) {
        if (await shouldCheckDomain(link.href)) {
            watchedResults.push(link);
        }
    }

    // Process results in batches
    for (let i = 0; i < watchedResults.length; i += MAX_CONCURRENT_REQUESTS) {
        const batch = watchedResults.slice(i, i + MAX_CONCURRENT_REQUESTS);
        const checks = batch.map(link => {
            const url = link.href;
            const domain = new URL(url).hostname;
            const container = link.closest("div.tF2Cxc");

            if (!container) return null;

            const existingInfo = container.querySelectorAll('.gsc-index-info');
            existingInfo.forEach(el => el.remove());

            const infoSpan = document.createElement("span");
            infoSpan.style.color = "gray";
            infoSpan.style.fontSize = "12px";
            infoSpan.className = 'gsc-index-info';
            infoSpan.innerText = "Sprawdzanie indeksacji...";
            container.appendChild(infoSpan);

            return {
                promise: getIndexingDate(url),
                span: infoSpan,
                domain: domain
            };
        }).filter(Boolean);

        // Process batch
        const results = await Promise.allSettled(checks.map(check => check.promise));
        results.forEach((result, index) => {
            const { span, domain } = checks[index];
            if (result.status === 'fulfilled') {
                span.innerHTML = `Indeksacja: ${result.value} <a href="https://search.google.com/search-console/index/drilldown?resource_id=sc-domain%3A${encodeURIComponent(domain)}" target="_blank" style="color: #1a0dab; font-size: 11px;">(GSC)</a>`;
            } else {
                span.innerHTML = `${result.reason?.message || 'Błąd sprawdzania'} <a href="https://search.google.com/search-console" target="_blank" style="color: #1a0dab; font-size: 11px;">(Otwórz GSC)</a>`;
                span.style.color = "#d93025";
            }
        });

        // Add delay between batches
        await delay(1000);
    }
}

async function checkDomainVerification(url, token) {
    try {
        const domain = new URL(url).hostname;
        const apiUrl = `https://searchconsole.googleapis.com/v1/sites/${encodeURIComponent(domain)}`;
        const response = await fetch(apiUrl, {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });
        const data = await response.json();
        return data.siteVerified === true;
    } catch (error) {
        return false;
    }
}

async function checkSCAccess(token) {
    try {
        const response = await fetch('https://searchconsole.googleapis.com/v1/sites', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        const data = await response.json();
        console.log('Available sites in GSC:', data);
        return data.siteEntry || [];
    } catch (error) {
        console.error('Failed to fetch GSC sites:', error);
        return [];
    }
}

addIndexDatesToSERP();
