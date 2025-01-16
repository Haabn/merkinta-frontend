/************************************************************
* merkinta.js
************************************************************/

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

// Session verification (unchanged)
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

        // Important: Only redirect to index if data.valid is explicitly false
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


// In merkinta.js, update the handleBankAuth function
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
                    returnUrl: 'https://sopimus.chatasilo.com/merkinta.html'
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
           'Authorization': `Bearer ${token}`,  // Pass token here
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
           'Authorization': `Bearer ${token}`,  // Pass token here
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



   // Handle form submission

sudo cat << 'EOL' > /var/www/apps/merkinta/signicat-server/app.js
import * as dotenv from 'dotenv';
dotenv.config({ path: new URL('.env', import.meta.url).pathname });

console.log('Env check at startup:', {
    accountId: process.env.SIGNICAT_ACCOUNT_ID?.substring(0,3),
    hasKey: !!process.env.FTN_PRIVATE_KEY,
    hasClientId: !!process.env.SIGNICAT_CLIENT_ID,
    envPath: process.env.NODE_ENV
});

import express from 'express';
import cors from 'cors';
import * as jose from 'jose';
import fetch from 'node-fetch';
import crypto from 'crypto';
import * as fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import forge from 'node-forge';

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(cors({
    origin: [
        'https://sopimus.chatasilo.com',
        'https://id.signicat.com'
    ],
    methods: ['POST', 'GET', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'Authorization'],
    credentials: true
}));

/**
 * Simple logging helper
 */
function log(message, data = '') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`, data);
}

/**
 * GET /auth/test
 * Quick health-check endpoint
 */
app.get('/auth/test', (req, res) => {
    log('Test endpoint hit');
    res.json({ status: 'ok' });
});

/**************************************************
 * Acquire Signicat Access Token
 **************************************************/
let currentToken = null;
let tokenExpiryTime = null;

async function getAccessToken() {
    try {
        // If we already have a token that hasn't expired, reuse it
        if (currentToken && tokenExpiryTime && Date.now() < tokenExpiryTime - 60000) {
            return currentToken;
        }

        const response = await fetch('https://api.signicat.com/auth/open/connect/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                grant_type: 'client_credentials',
                client_id: process.env.SIGNICAT_CLIENT_ID,
                client_secret: process.env.SIGNICAT_CLIENT_SECRET,
                scope: 'signicat-api'
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Token request failed: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        currentToken = data.access_token;
        tokenExpiryTime = Date.now() + (data.expires_in * 1000);
        log('✅ New access token obtained');
        return currentToken;
    } catch (error) {
        log('❌ Error getting access token:', error.message);
        throw error;
    }
}

/**************************************************
 * Decrypt Signicat’s JSON response (JWE)
 **************************************************/
async function decryptResponse(responseText) {
    try {
        // If it starts with 'eyJ', we assume it’s a JWE from Signicat
        if (responseText.startsWith('eyJ')) {
            const privateKeyJwk = JSON.parse(process.env.FTN_PRIVATE_KEY);
            const key = await jose.importJWK(privateKeyJwk, 'RSA-OAEP');
            const decrypted = await jose.compactDecrypt(responseText, key);
            return JSON.parse(new TextDecoder().decode(decrypted.plaintext));
        }
        // Otherwise, it’s probably plain JSON
        return JSON.parse(responseText);
    } catch (error) {
        log('Decryption error:', error);
        throw error;
    }
}

/**************************************************
 * Re-encrypt data for "transferdatabase"
 * using the same approach as merkinta.js
 **************************************************/
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
/**************************************************
 * Create new Signicat session (BankID flow)
 **************************************************/
app.post('/auth/session', async (req, res) => {
    log('🌟 New authentication session requested');
    log('Customer status:', req.body.customerStatus);  // Add logging for new parameter

    try {
        const token = await getAccessToken();
        const accountId = process.env.SIGNICAT_ACCOUNT_ID;
        
        if (!token || !accountId) {
            throw new Error('Missing Signicat configuration');
        }

        // Get returnUrl from request body (will be either merkinta or asiakassopimus path)
        const { returnUrl, customerStatus } = req.body;
        if (!returnUrl || !customerStatus) {
            throw new Error('Missing returnUrl or customerStatus');
        }

        const requestBody = {
            flow: "redirect",
            allowedProviders: ["ftn"],
            requestedAttributes: [
                "name",
                "nin.issuingCountry",
                "ftnHetu"
            ],
            callbackUrls: {
                success: `https://api.chatasilo.com/auth/callback?customerStatus=${customerStatus}`,
                abort: "https://api.chatasilo.com/auth/error",
                error: "https://api.chatasilo.com/auth/error"
            },
            language: "fi",
            encryptionPublicKey: {
                // Optional: If you want Signicat to send encrypted response.
                // This is different from the re-encryption logic for your transferdatabase
                // Make sure this matches your FTN_PRIVATE_KEY if you require encryption from Signicat
                kty: "RSA",
                kid: "NSlaiBZGGt1OgbkbKBBKmo7Hq4f-Rx6oHBdTrzQz9VE",
                use: "enc",
                alg: "RSA-OAEP",
                e: "AQAB",
                n: "j6beaGSD2BrHtWnxs4rB0Fa2x6CQoudaeRrtxfH_SjhdEKzgRV5Q-IRg8HU-EUTM5NEvjfDGzIy-uaUIdaErtiQsppNkQSZ0bACEge9LY8S8lfb8RC7fcpky_y7NMIcQApHLl3uvF6Sf44RkRFaT2hWPqItP6YKl82ehXsxqODOoXKkP1-8O4ytEFLO_ChDLqqHZ2gT87IN7eMVxZ1Vga4lFnaZBsi7XGtAf309GiMGsLaGvd1haACkbGP1Xdt43UGwRI_WIknzHD7L4t5GSMeIZMsDqH90GLgKwdOa8Gpvm9p0ecoTXB6kbMgo_9Pi6o0aU1kFp32JvH6A3UKJDBQ"
            }
        };

        log('Making request with body:', JSON.stringify(requestBody, null, 2));

        const response = await fetch(
            `https://api.signicat.com/auth/rest/sessions?signicat-accountId=${accountId}`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(requestBody)
            }
        );

        const responseText = await response.text();
        log('Response status:', response.status);
        log('Response body:', responseText);

        if (!response.ok) {
            throw new Error(`Signicat API error: ${response.status} - ${responseText}`);
        }

        const sessionData = await decryptResponse(responseText);
        log('Decrypted Signicat session data:', sessionData);

        if (!sessionData.authenticationUrl) {
            throw new Error('No authentication URL in response');
        }

        // Send the BankID (FTN) redirect URL back to the caller (front-end)
        res.json({ url: sessionData.authenticationUrl });
    } catch (error) {
        log('❌ Error creating session:', error.message);
        res.status(500).json({ 
            error: error.message,
            details: error.stack
        });
    }
});

/**************************************************
 * Signicat callback
 * - Decrypt the signicat data
 * - Re-encrypt for transferdatabase
 * - Store into "transferdatabase" + Redirect user
 **************************************************/
app.get('/auth/callback', async (req, res) => {
    log('📥 Callback received from Signicat');
    try {
        const sessionId = req.query.sessionId;
        const customerStatus = req.query.customerStatus;
        log('Session ID:', sessionId);
        log('Customer Status:', customerStatus);

        if (!sessionId || !customerStatus) {
            throw new Error('Missing sessionId or customerStatus in callback query');
        }

        const token = await getAccessToken();
        const accountId = process.env.SIGNICAT_ACCOUNT_ID;

        const response = await fetch(
            `https://api.signicat.com/auth/rest/sessions/${sessionId}?signicat-accountId=${accountId}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': '*/*'
                }
            }
        );

        if (!response.ok) {
            throw new Error(`Failed to retrieve session result: ${response.status}`);
        }

        const responseText = await response.text();
        log('Raw callback response text:', responseText);

        // Decrypt the Signicat result
        const sessionData = await decryptResponse(responseText);
        log('Decrypted session data:', JSON.stringify(sessionData, null, 2));

        if (sessionData.status !== 'SUCCESS') {
            throw new Error(`Authentication failed. Status: ${sessionData.status}`);
        }

        // Split the data into sensitive (for transferdatabase) and non-sensitive (for redirect)
        const timestamp = new Date().toISOString();

        // This is the sensitive data that goes to transferdatabase
        const sensitiveData = {
            name: sessionData.subject?.name,
            nationalIdentityNumber: sessionData.subject?.ftnHetu,
            nationality: sessionData.subject?.nin?.issuingCountry,
            timestamp,
            authenticated: true,
            customerStatus,
            sessionToken: sessionId
        };

        log('Sensitive data to be encrypted:', {
            ...sensitiveData,
            nationalIdentityNumber: '(hidden)',
            name: '(hidden)'
        });

        // Encrypt and store sensitive data in transferdatabase
        const encryptedPayload = encryptDataForTransfer(sensitiveData);
        const dbPath = join(__dirname, 'transferdatabase');
        await fs.mkdir(dbPath, { recursive: true });
        const filePath = join(dbPath, `${sessionId}.json`);
        await fs.writeFile(filePath, JSON.stringify(encryptedPayload, null, 2), 'utf8');
        log('Encrypted sensitive data written to transferdatabase');

        // This is the non-sensitive data for the redirect
        const redirectData = {
            authenticated: true,
            timestamp,
            sessionToken: sessionId
        };

        log('Preparing redirect with data:', redirectData);

        // Base64 encode redirect data (no need to encrypt)
        const encodedData = Buffer.from(JSON.stringify(redirectData)).toString('base64');

        // Determine base URL based on customer status
        const baseUrl = customerStatus === 'hasAgreement' 
            ? 'https://sopimus.chatasilo.com/merkinta.html'
            : 'https://sopimus.chatasilo.com/asiakassopimus.html';

        // Construct final redirect URL with auth_data
        const redirectUrl = `${baseUrl}?auth_data=${encodedData}`;
        log('Redirecting to:', redirectUrl);

        return res.redirect(302, redirectUrl);

    } catch (error) {
        log('❌ Error in Signicat callback:', error.message);
        return res.status(500).json({ error: 'Authentication failed' });
    }
});

app.get('/auth/error', (req, res) => {
    log('❌ Authentication error callback received');
    return res.redirect(302, 'https://sopimus.chatasilo.com/index.html?error=auth_failed');
});

/**************************************************
 * Start server
 **************************************************/
app.listen(PORT, () => {
    log(`🚀 Signicat-server running on http://localhost:${PORT}`);
    log('Environment check:');
    log('- Account ID:', process.env.SIGNICAT_ACCOUNT_ID ? '✅ Present' : '❌ Missing');
    log('- FTN Private Key:', process.env.FTN_PRIVATE_KEY ? '✅ Present' : '❌ Missing');
    log('- Client ID:', process.env.SIGNICAT_CLIENT_ID ? '✅ Present' : '❌ Missing');
    log('- Client Secret:', process.env.SIGNICAT_CLIENT_SECRET ? '✅ Present' : '❌ Missing');
    log('- RSA Public Key:', '✅ Present (hardcoded)');
});
EOL

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
                    type: 'self',
                    ssn: authData.nationalIdentityNumber || ''
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
// Handle merkinta2.html Form
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

   if (currentPage === 'index.html' || currentPage === '') {
       handleBankAuth();
   } else if (currentPage === 'merkinta.html') {
       handleMerkintaForm();
   } else if (currentPage === 'merkinta2.html') {
       handleMerkinta2Form();
   }
});
