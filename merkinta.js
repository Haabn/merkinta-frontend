const apiUrl = 'https://api.chatasilo.com';
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

// Logging utility
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

// Session verification
async function verifySession(token) {
    logAuth('verifySession:start', { token: token?.slice(0, 4) + '...' });
    
    try {
        const response = await fetch(`${apiUrl}/auth/verify-session`, {
            method: 'POST',
            ...fetchConfig,
            headers: {
                ...fetchConfig.headers,
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ token })
        });

        logAuth('verifySession:response', {
            status: response.status,
            statusText: response.statusText
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        logAuth('verifySession:data', { data });

        if (data.valid === false) {
            logAuth('verifySession:invalid', { data });
            window.location.href = 'https://sopimus.chatasilo.com/index.html';
            return false;
        }

        logAuth('verifySession:success');
        return true;
    } catch (error) {
        logAuth('verifySession:error', {
            message: error.message,
            stack: error.stack,
        });
        window.location.href = 'https://sopimus.chatasilo.com/index.html';
        return false;
    }
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
            // Decode base64 auth data
            const decodedData = atob(authDataParam);
            const parsedData = JSON.parse(decodedData);
            
            // Validate the parsed data has required fields
            if (!parsedData.authenticated || !parsedData.sessionToken) {
                throw new Error('Invalid authentication data');
            }
            
            authData = parsedData;
            logAuth('parseAuthData:success', { 
                authenticated: authData.authenticated,
                hasToken: !!authData.sessionToken,
                timestamp: authData.timestamp
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
// Encryption & Submission Logic
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
    const formDataObj = Object.fromEntries(formData.entries());
    const encryptedData = encryptDataForTransmission(formDataObj);

    const response = await fetch(`${apiUrl}/merkinta/decrypt`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(encryptedData)
    });

    if (!response.ok) {
        throw new Error('Backend request failed');
    }

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
    const elements = {
        form: document.getElementById('merkintaForm'),
        childSSNContainer: document.getElementById('childSSNContainer'),
        businessIDContainer: document.getElementById('businessIDContainer'),
        childSSNInput: document.getElementById('childSSN'),
        businessIDInput: document.getElementById('businessID'),
        investmentTypeRadios: document.getElementsByName('investmentType')
    };

    // Handle investment type changes
    if (elements.investmentTypeRadios) {
        elements.investmentTypeRadios.forEach(radio => {
            radio.addEventListener('change', function() {
                elements.childSSNContainer.style.display = 'none';
                elements.businessIDContainer.style.display = 'none';

                if (this.value === 'child') {
                    elements.childSSNContainer.style.display = 'block';
                } else if (this.value === 'business') {
                    elements.businessIDContainer.style.display = 'block';
                }
            });
        });
    }

    // Form submission
    if (elements.form) {
        elements.form.addEventListener('submit', async function(e) {
            e.preventDefault();
            logAuth('handleMerkintaForm:submitAttempt');

            const formData = new FormData(this);
            const investmentType = formData.get('investmentType');

            try {
                if (!authData?.authenticated) {
                    throw new Error('Not authenticated');
                }

                logAuth('handleMerkintaForm:submitting', { 
                    investmentType,
                    hasAuthData: !!authData,
                    hasSessionToken: !!authData.sessionToken
                });

                let checkResult = null;

                if (investmentType === 'self') {
                checkResult = await checkDatabase({
                type: 'self'
                // No SSN needed - backend will lookup using sessionToken
                }, authData.sessionToken);
                
                } else if (investmentType === 'child') {
                    if (!elements.childSSNInput.value) {
                        alert('Anna lapsen henkilötunnus');
                        return;
                    }
                    checkResult = await checkDatabase({
                        type: 'child',
                        ssn: elements.childSSNInput.value
                    }, authData.sessionToken);
                } else if (investmentType === 'business') {
                    if (!elements.businessIDInput.value) {
                        alert('Anna Y-tunnus');
                        return;
                    }
                    checkResult = await checkDatabase({
                        type: 'business',
                        businessId: elements.businessIDInput.value
                    }, authData.sessionToken);
                }

                logAuth('handleMerkintaForm:databaseCheck', { 
                    success: true,
                    result: checkResult 
                });

                sessionStorage.setItem('merkintaData', JSON.stringify({
                    authData,
                    databaseCheck: checkResult,
                    formData: Object.fromEntries(formData)
                }));

                window.location.href = 'merkinta2.html';
            } catch (error) {
                logAuth('handleMerkintaForm:error', {
                    message: error.message,
                    stack: error.stack
                });
                alert('Jotain meni pieleen: ' + error.message);
            }
        });
    }
}

    function handleMerkinta2Form() {
   const storedData = JSON.parse(sessionStorage.getItem('merkintaData') || '{}');
   if (!storedData.formData) {
       window.location.href = 'merkinta.html';
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
                   sessionStorage.removeItem('merkintaData');
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

// DOM load
document.addEventListener('DOMContentLoaded', function () {
    const currentPage = window.location.pathname.split('/').pop();

    // Parse auth data for any page that needs authentication
    if (currentPage === 'merkinta.html' || currentPage === 'merkinta2.html') {
        parseAuthData();  // Parse the auth data first
    }

    // Then initialize the appropriate page handler
    if (currentPage === 'index.html' || currentPage === '') {
        handleBankAuth();
    } else if (currentPage === 'merkinta.html') {
        handleMerkintaForm();
    } else if (currentPage === 'merkinta2.html') {
        handleMerkinta2Form();
    }
});






