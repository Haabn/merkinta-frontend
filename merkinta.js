const apiUrl = 'https://api.chatasilo.com';
const MAX_STORAGE_TIME = 30 * 60 * 1000; // 30 minutes timeout
const fetchConfig = {
    credentials: 'include',
    mode: 'cors',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
};
let authData = null;

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

        authButton.disabled = true;
        logAuth('handleBankAuth:buttonDisabled');

        try {
            logAuth('handleBankAuth:fetchingSession');
            
            const response = await fetch(`${apiUrl}/auth/session`, {
                method: 'POST',
                ...fetchConfig,
                body: JSON.stringify({
                    returnUrl: 'https://sopimus.chatasilo.com/merkinta.html',
                    customerStatus: 'hasAgreement'
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

function parseAuthData() {
    const urlParams = new URLSearchParams(window.location.search);
    const authDataParam = urlParams.get('auth_data');
    
    if (authDataParam) {
        try {
            const decodedData = atob(authDataParam);
            const parsedData = JSON.parse(decodedData);
            
            if (!parsedData.authenticated || !parsedData.sessionToken) {
                throw new Error('Invalid authentication data');
            }
            
            authData = {
                ...parsedData,
                storedAt: new Date().getTime() // Add timestamp for timeout tracking
            };
            
            logAuth('parseAuthData:success', { 
                authenticated: authData.authenticated,
                hasToken: !!authData.sessionToken,
                timestamp: authData.timestamp,
                storedAt: authData.storedAt
            });
            
            return true;
        } catch (error) {
            logAuth('parseAuthData:error', { 
                message: error.message,
                stack: error.stack 
            });
            window.location.href = 'https://sopimus.chatasilo.com/index.html';
            return false;
        }
    } else {
        logAuth('parseAuthData:noData');
        window.location.href = 'https://sopimus.chatasilo.com/index.html';
        return false;
    }
}

function encryptDataForTransmission(dataToEncrypt) {
    const aesKey = forge.random.getBytesSync(16);
    const aesIV = forge.random.getBytesSync(16);
    const aesKeyHex = forge.util.bytesToHex(aesKey);
    const aesIVHex = forge.util.bytesToHex(aesIV);

    const jsonString = JSON.stringify(dataToEncrypt);
    const cipher = forge.cipher.createCipher('AES-CBC', aesKey);
    cipher.start({ iv: aesIV });
    cipher.update(forge.util.createBuffer(jsonString, 'utf8'));
    cipher.finish();
    const encrypted = forge.util.encode64(cipher.output.getBytes());

    const publicKeyPem = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAhv+WOxHp2iNJkp1IhVKO
b1L6HniwUXuZyGoEbn96Qx5u8R+PnTIyGpuHKgWe5dUB1LKWLMm6Q2BgryCuUm/4
lAYNFJ+dli7C/JF6qkjARUwhHK2E6na0gerduW5dlYZsPvFoW25y3pBKK45AgPPW
qc/O7dFs/4bjWhLt8z4pyk6BV1e5ovSb80mFsuvEUH6P1PtTowcNG3TgAW0EkXLa
eG3Ma507zr8c5DYyhTzX/F3/o2CjtYhl6cHy2UUbMKdglgZrZDT/WQWZnaDFUm3t
4Hkt3wIwDccCVcO3TRfuw5wTJCSvfP/bSfmdqbMnotP5//XE0pVF7nDdKihxW4WT
2QIDAQAB
-----END PUBLIC KEY-----`;
    const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);
    const encryptedAESKeyRSA = forge.util.encode64(
        publicKey.encrypt(aesKeyHex, 'RSA-OAEP', {
            md: forge.md.sha256.create(),
            mgf1: { md: forge.md.sha256.create() }
        })
    );

    return {
        ciphertext: encrypted,
        encryptedKeyRSA: encryptedAESKeyRSA,
        iv: aesIVHex
    };
}

async function submitFormData(formData, token) {
    console.log('Submitting form data:', formData);
    console.log('Using token:', token);

    const formDataObj = Object.fromEntries(formData.entries());
    const encryptedData = encryptDataForTransmission(formDataObj);
    
    const response = await fetch(`${apiUrl}/merkinta/decrypt`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(encryptedData)
    });
    
    console.log('Response:', response);
    return response.json();
}

async function checkDatabase(payload, token) {
    const response = await fetch(`${apiUrl}/merkinta/check-info`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        credentials: 'include',
        mode: 'cors',
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        throw new Error('Database check failed');
    }

    return response.json();
}

function handleMerkintaForm() {
    if (!authData?.storedAt || (Date.now() - authData.storedAt > MAX_STORAGE_TIME)) {
        window.location.href = 'https://sopimus.chatasilo.com/index.html';
        return;
    }

    const elements = {
        form: document.getElementById('merkintaForm'),
        childSSNContainer: document.getElementById('childSSNContainer'),
        businessIDContainer: document.getElementById('businessIDContainer'),
        childSSNInput: document.getElementById('childSSN'),
        businessIDInput: document.getElementById('businessID'),
        investmentTypeRadios: document.getElementsByName('investmentType')
    };

    elements.investmentTypeRadios?.forEach(radio => {
        radio.addEventListener('change', function() {
            elements.childSSNContainer.style.display = 'none';
            elements.businessIDContainer.style.display = 'none';
            if (this.value === 'child') elements.childSSNContainer.style.display = 'block';
            if (this.value === 'business') elements.businessIDContainer.style.display = 'block';
        });
    });

    elements.form?.addEventListener('submit', async function(e) {
        e.preventDefault();

        if (Date.now() - authData.storedAt > MAX_STORAGE_TIME) {
            window.location.href = 'https://sopimus.chatasilo.com/index.html';
            return;
        }

        const formData = new FormData(this);
        const investmentType = formData.get('investmentType');

        try {
            if (!authData?.authenticated) throw new Error('Not authenticated');

            const checkResult = await checkDatabase({
                type: investmentType,
                ssn: investmentType === 'child' ? elements.childSSNInput.value : undefined,
                businessId: investmentType === 'business' ? elements.businessIDInput.value : undefined
            }, authData.sessionToken);

            sessionStorage.setItem('merkintaData', JSON.stringify({
                sessionToken: checkResult.sessionToken,
                found: checkResult.found,
                investmentType
            }));

            window.location.href = 'merkinta2.html';
        } catch (error) {
            alert('Error: ' + error.message);
        }
    });
}
function handleMerkinta2Form() {
    
    const storedData = JSON.parse(sessionStorage.getItem('merkintaData') || '{}');
    console.log('Debug stored data:', {
        hasFormData: !!storedData.formData,
        hasAuthData: !!storedData.authData,
        storedAt: storedData.authData?.storedAt,
        timeDiff: Date.now() - (storedData.authData?.storedAt || 0),
        maxTime: MAX_STORAGE_TIME
    });
    
    // Check both stored data and timeout
    if (!storedData.formData || !storedData.authData?.storedAt || 
        (Date.now() - storedData.authData.storedAt > MAX_STORAGE_TIME)) {
        logAuth('handleMerkinta2Form:timeout');
        sessionStorage.removeItem('merkintaData');
        window.location.href = 'https://sopimus.chatasilo.com/index.html';
        return;
    }

    const { formData, databaseCheck, authData } = storedData;
    const investmentType = formData.investmentType;

    const elements = {
        form: document.getElementById('merkintaForm2'),
        childAdditionalInfoContainer: document.getElementById('childAdditionalInfoContainer'),
        businessAdditionalInfoContainer: document.getElementById('additionalInfoContainer'),
        selfAdditionalInfoContainer: document.getElementById('selfAdditionalInfoContainer'),
        id3rRadios: document.getElementsByName('id3r'),
        id3Container: document.getElementById('id3Container'),
        merkintaSumma: document.getElementById('merkintaSumma'),
        summaError: document.getElementById('summaError')
    };

    // Show/hide additional info based on DB check result
    if (databaseCheck) {
        if (investmentType === 'self') {
            elements.selfAdditionalInfoContainer.style.display = databaseCheck.found ? 'none' : 'block';
            if (databaseCheck.found && databaseCheck.data) {
                Object.keys(databaseCheck.data).forEach(key => {
                    const input = document.querySelector(`input[name="${key}"]`);
                    if (input) input.value = databaseCheck.data[key];
                });
            }
        } else if (investmentType === 'child') {
            elements.childAdditionalInfoContainer.style.display = databaseCheck.found ? 'none' : 'block';
            if (databaseCheck.found && databaseCheck.data) {
                Object.keys(databaseCheck.data).forEach(key => {
                    const input = document.querySelector(`input[name="${key}"]`);
                    if (input) input.value = databaseCheck.data[key];
                });
            }
        } else if (investmentType === 'business') {
            elements.businessAdditionalInfoContainer.style.display = databaseCheck.found ? 'none' : 'block';
            if (databaseCheck.found && databaseCheck.data) {
                Object.keys(databaseCheck.data).forEach(key => {
                    const input = document.querySelector(`input[name="${key}"]`);
                    if (input) input.value = databaseCheck.data[key];
                });
            }
        }
    }

    // Additional account ownership info 
    if (elements.id3rRadios) {
        elements.id3rRadios.forEach(radio => {
            radio.addEventListener('change', function() {
                elements.id3Container.style.display = this.value === 'joo' ? 'block' : 'none';
            });
        });
    }

    // Submit final data
    if (elements.form) {
        elements.form.addEventListener('submit', async function(e) {
            e.preventDefault();

            // Check timeout before submission
            if (Date.now() - storedData.authData.storedAt > MAX_STORAGE_TIME) {
                logAuth('handleMerkinta2Form:timeoutDuringSubmission');
                sessionStorage.removeItem('merkintaData');
                window.location.href = 'https://sopimus.chatasilo.com/index.html';
                return;
            }

            // Validate merkintä amount
            const amount = parseFloat(elements.merkintaSumma.value);
            if (Math.abs(amount) < 1000) {
                elements.summaError.style.display = 'block';
                return;
            }

            try {
                // Gather final form data
                const finalFormData = new FormData(this);
                finalFormData.append('investmentType', investmentType);

                if (investmentType === 'self' && authData) {
                    finalFormData.append('nationalIdentityNumber', authData.nationalIdentityNumber);
                    finalFormData.append('name', authData.name);
                }

                // If DB data found, fill in any missing fields
                if (databaseCheck?.found && databaseCheck.data) {
                    Object.entries(databaseCheck.data).forEach(([key, value]) => {
                        if (!finalFormData.has(key)) {
                            finalFormData.append(key, value);
                        }
                    });
                }

                // Pass token here, too
                const response = await submitFormData(finalFormData, authData?.sessionToken);
                if (response.status === 'success') {
                    sessionStorage.removeItem('merkintaData'); // Clean up stored data
                    window.location.href = 'page12.html';
                } else {
                    throw new Error(response.message || 'Submission failed');
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Virhe lomakkeen lähetyksessä: ' + error.message);
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', function () {
    const currentPage = window.location.pathname.split('/').pop();

    if (currentPage === 'index.html' || currentPage === '') {
        handleBankAuth();
    } else if (currentPage === 'merkinta.html') {
        parseAuthData();  // Parse URL auth data
        handleMerkintaForm();
    } else if (currentPage === 'merkinta2.html') {
        // Don't parse URL auth data again for merkinta2, use stored data only
        handleMerkinta2Form();
    }
});
