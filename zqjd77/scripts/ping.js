(function() {
    function setBadgeState(el, state) {
        if (!el) return;
        el.classList && el.classList.remove('badge-online', 'badge-offline', 'badge-checking', 'badge-warning');
        switch (state) {
            case 'online':
                if (el.classList) el.classList.add('badge-online');
                else el.style.color = '#28a745';
                break;
            case 'offline':
                if (el.classList) el.classList.add('badge-offline');
                else el.style.color = '#dc3545';
                break;
            case 'warning':
                if (el.classList) el.classList.add('badge-warning');
                break;
            default:
                if (el.classList) el.classList.add('badge-checking');
                else el.style.color = '#666';
        }
    }

    async function checkServerStatus(options = {}) {
        const {
            targetId = 'server-status',
            buttonSelector = 'button[onclick="testServerConnection()"]',
            url = 'https://psa.jcvi.org:3001/api/health',
            onlineText = 'Server Status: Online',
            offlineText = 'Server Status: Offline - Contact Admin Email: rbiltz@jcvi.org'
        } = options;

        const statusEl = document.getElementById(targetId);
        const button = document.querySelector(buttonSelector);
        if (!statusEl) return;

        if (button) {
            button.disabled = true;
            button.textContent = 'Testing...';
        }
        statusEl.textContent = 'Server Status: Checking...';
        setBadgeState(statusEl, 'checking');

        try {
            const response = await fetch(url);
            if (response.ok) {
                statusEl.textContent = onlineText;
                setBadgeState(statusEl, 'online');
            } else {
                statusEl.textContent = offlineText;
                setBadgeState(statusEl, 'offline');
            }
        } catch (e) {
            statusEl.textContent = offlineText;
            setBadgeState(statusEl, 'offline');
        } finally {
            if (button) {
                button.disabled = false;
                button.textContent = 'Check Status';
            }
        }
    }

    async function checkColabFoldQueue(options = {}) {
        const {
            targetId = 'colabfold-queue-status',
            buttonSelector = 'button[onclick="checkColabFoldQueue()"]',
            url = 'https://api.colabfold.com/queue'
        } = options;

        const statusEl = document.getElementById(targetId);
        const button = document.querySelector(buttonSelector);
        if (!statusEl) return;

        if (button) {
            button.disabled = true;
            button.textContent = 'Checking...';
        }
        statusEl.textContent = 'ColabFold Queue Status: Checking...';
        setBadgeState(statusEl, 'checking');

        try {
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                const queueLoad = data.queued;
                if (queueLoad > 100) {
                    statusEl.textContent = 'ColabFold Queue Load: Busy - ' + queueLoad;
                    setBadgeState(statusEl, 'offline');
                } else if (queueLoad > 50) {
                    statusEl.textContent = 'ColabFold Queue Load: Moderate - ' + queueLoad;
                    setBadgeState(statusEl, 'warning');
                } else {
                    statusEl.textContent = 'ColabFold Queue Load: Idle - ' + queueLoad;
                    setBadgeState(statusEl, 'online');
                }
            } else {
                statusEl.textContent = 'ColabFold Queue Status: Offline';
                setBadgeState(statusEl, 'offline');
            }
        } catch (e) {
            statusEl.textContent = 'ColabFold Queue Status: Offline';
            setBadgeState(statusEl, 'offline');
        } finally {
            if (button) {
                button.disabled = false;
                button.textContent = 'Check ColabFold Queue';
            }
        }
    }

    // Expose API and backward-compatible function names
    window.Ping = { checkServerStatus, checkColabFoldQueue };
    window.testServerConnection = function() { return checkServerStatus(); };
    window.checkColabFoldQueue = function() { return checkColabFoldQueue(); };

    document.addEventListener('DOMContentLoaded', function() {
        if (document.getElementById('server-status')) checkServerStatus();
        if (document.getElementById('colabfold-queue-status')) checkColabFoldQueue();
    });
})();


