chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getAuthToken") {
        chrome.identity.getAuthToken({
            interactive: true,
            scopes: ["https://www.googleapis.com/auth/webmasters"]
        }, function (token) {
            if (chrome.runtime.lastError) {
                console.error('Auth error:', chrome.runtime.lastError);
                sendResponse({ error: chrome.runtime.lastError });
                return;
            }

            if (!token) {
                sendResponse({ error: { message: "No token received" } });
                return;
            }

            sendResponse({ token: token });
        });
        return true;
    }
});
