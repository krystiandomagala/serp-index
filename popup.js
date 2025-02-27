document.getElementById("checkButton").addEventListener("click", function () {
    chrome.identity.getAuthToken({ interactive: true }, function (token) {
        if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
            return;
        }

        let url = document.getElementById("urlInput").value;
        getIndexingDate(url, token);
    });
});

document.getElementById('authButton').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: "getAuthToken" }, (response) => {
        const statusDiv = document.getElementById('authStatus');
        if (response.error) {
            statusDiv.textContent = 'Błąd autoryzacji: ' + response.error.message;
            statusDiv.className = 'error';
        } else {
            statusDiv.textContent = 'Zalogowano pomyślnie';
            statusDiv.className = 'success';
        }
    });
});

// Check auth status on popup open
chrome.runtime.sendMessage({ action: "getAuthToken" }, (response) => {
    const statusDiv = document.getElementById('authStatus');
    if (response.token) {
        statusDiv.textContent = 'Zalogowano';
        statusDiv.className = 'success';
    }
});
