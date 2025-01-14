const apiUrl = 'https://api.chatasilo.com';
const fetchConfig = {
    credentials: 'include',
    mode: 'cors',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
};

function handleAuthError(button) {
    button.disabled = false;
    logAuth('handleBankAuth:buttonReenabled');

    const errorElement = document.getElementById('errorMessage') || createErrorElement(button);
    errorElement.textContent = 'Kirjautumisessa tapahtui virhe. Ole hyvä ja yritä uudelleen.';
    errorElement.style.display = 'block';
    logAuth('handleBankAuth:errorDisplayed');
}

function createErrorElement(button) {
    const errorDiv = document.createElement('div');
    errorDiv.id = 'errorMessage';
    errorDiv.style.display = 'none';
    errorDiv.className = 'error-message';
    button.parentNode.insertBefore(errorDiv, button.nextSibling);
    logAuth('handleBankAuth:errorElementCreated');
    return errorDiv;
}

function logAuth(action, details = null) {
    const timestamp = new Date().toISOString();
    const logData = {
        timestamp,
        action,
        details,
        url: window.location.href
    };
    console.log('[Auth]', JSON.stringify(logData));
}

function handleBankAuth() {
    const authButton = document.getElementById('startAuth');
    
    if (!authButton) {
        logAuth('handleBankAuth:error', 'Start auth button not found');
        return;
    }

    logAuth('handleBankAuth:initialized');

    authButton.addEventListener('click', async function (event) {
        event.preventDefault();
        logAuth('handleBankAuth:buttonClicked');

        // Check if customer status is selected
        const customerStatus = document.querySelector('input[name="customerStatus"]:checked');
        if (!customerStatus) {
            const errorElement = document.getElementById('errorMessage') || createErrorElement(authButton);
            errorElement.textContent = 'Valitse asiakassopimuksen tila ennen jatkamista.';
            errorElement.style.display = 'block';
            return;
        }

        authButton.disabled = true;
        logAuth('handleBankAuth:buttonDisabled');

        try {
            logAuth('handleBankAuth:fetchingSession');
            
            // Determine return URL based on customer status
            const returnUrl = customerStatus.value === 'hasAgreement' 
                ? 'https://sopimus.chatasilo.com/merkinta.html'
                : 'https://sopimus.chatasilo.com/asiakassopimus.html';

            const response = await fetch(`${apiUrl}/auth/session`, {
                method: 'POST',
                ...fetchConfig,
                body: JSON.stringify({
                    returnUrl,
                    customerStatus: customerStatus.value
                })
            });

            logAuth('handleBankAuth:sessionResponse', {
                status: response.status,
                statusText: response.statusText,
                headers: Object.fromEntries(response.headers.entries())
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            logAuth('handleBankAuth:sessionData', { 
                hasUrl: Boolean(data?.url),
                url: data?.url?.substring(0, 30) + '...'
            });
            
            if (data?.url) {
                logAuth('handleBankAuth:redirecting', { 
                    url: data.url.substring(0, 30) + '...' 
                });
                window.location.href = data.url;
            } else {
                throw new Error('No authentication URL received');
            }
        } catch (error) {
            logAuth('handleBankAuth:error', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            handleAuthError(authButton);
        }
    });
}

document.addEventListener('DOMContentLoaded', function () {
    const currentPage = window.location.pathname.split('/').pop();
    if (currentPage === 'index.html' || currentPage === '') {
        handleBankAuth();
    }
});
