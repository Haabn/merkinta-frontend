/************************************************************
* merkinta.js
************************************************************/

// Error Handlers for Cookie-Related Issues
window.addEventListener('error', function (e) {
    if (e.message && (e.message.includes('cookie') || e.message.includes('Cookie') || 
        e.message.includes('__vercel_live_token') || e.message.includes('SameSite'))) {
        e.preventDefault();
    }
 });
 
 window.addEventListener('warning', function (e) {
    if (e.message && (e.message.includes('cookie') || e.message.includes('Cookie') ||
        e.message.includes('__vercel_live_token') || e.message.includes('SameSite'))) {
        e.preventDefault();
    }
 });
 
 // Bank Authentication Handling
 async function verifySession(token) {
    try {
        const response = await fetch('https://sopimus.chatasilo.com/auth/verify-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token })
        });
 
        if (!response.ok || !(await response.json()).valid) {
            window.location.href = 'index.html';
        }
    } catch (error) {
        console.error('Session verification failed:', error);
        window.location.href = 'index.html';
    }
 }
 
 function handleBankAuth() {
    const authButton = document.getElementById('startAuth');
    if (authButton) {
        authButton.addEventListener('click', async function () {
            try {
                const response = await fetch('https://sopimus.chatasilo.com/auth/session', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json'
                    },
                    body: JSON.stringify({}),
                    mode: 'cors',
                    credentials: 'include'
                });
 
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const data = await response.json();
                
                if (data?.url) {
                    window.location.href = data.url;
                } else {
                    throw new Error('No authentication URL received');
                }
            } catch (error) {
                console.error('Authentication error:', error);
                if (document.getElementById('errorMessage')) {
                    document.getElementById('errorMessage').style.display = 'block';
                }
            }
        });
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
 
 async function submitFormData(formData) {
    const formDataObj = Object.fromEntries(formData.entries());
    const encryptedData = encryptDataForTransmission(formDataObj);
 
    const response = await fetch('https://sopimus.chatasilo.com/merkinta/decrypt', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(encryptedData)
    });
 
    if (!response.ok) {
        throw new Error('Backend request failed');
    }
 
    return response.json();
 }
 
 async function checkDatabase(payload) {
    const response = await fetch('https://sopimus.chatasilo.com/merkinta/check-info', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json'
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
 
 // Handle merkinta.html Form
 function handleMerkintaForm() {
    const elements = {
        form: document.getElementById('merkintaForm'),
        investmentTypeRadios: document.getElementsByName('investmentType'),
        childSSNInput: document.getElementById('childSSN'),
        businessIDInput: document.getElementById('businessID'),
        childSSNContainer: document.getElementById('childSSNContainer'),
        businessIDContainer: document.getElementById('businessIDContainer')
    };
 
    // Handle auth data
    const urlParams = new URLSearchParams(window.location.search);
    const authData = urlParams.has('auth_data') ? 
        JSON.parse(atob(urlParams.get('auth_data'))) : null;
 
    if (authData?.sessionToken) {
        verifySession(authData.sessionToken);
    }
 
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
 
    // Handle form submission
    if (elements.form) {
        elements.form.addEventListener('submit', async function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            const investmentType = formData.get('investmentType');
 
            try {
                let checkResult;
                
                if (investmentType === 'self') {
                    if (!authData?.nationalIdentityNumber) {
                        throw new Error('No identification data found');
                    }
                    checkResult = await checkDatabase({
                        type: 'self',
                        ssn: authData.nationalIdentityNumber
                    });
                }
                else if (investmentType === 'child') {
                    if (!elements.childSSNInput.value) {
                        alert('Anna lapsen henkilötunnus');
                        return;
                    }
                    checkResult = await checkDatabase({
                        type: 'child',
                        ssn: elements.childSSNInput.value
                    });
                }
                else if (investmentType === 'business') {
                    if (!elements.businessIDInput.value) {
                        alert('Anna Y-tunnus');
                        return;
                    }
                    checkResult = await checkDatabase({
                        type: 'business',
                        businessId: elements.businessIDInput.value
                    });
                }
 
                sessionStorage.setItem('merkintaData', JSON.stringify({
                    authData,
                    databaseCheck: checkResult,
                    formData: Object.fromEntries(formData)
                }));
                
                window.location.href = 'merkinta2.html';
            } catch (error) {
                console.error('Error during form submission:', error);
                alert('Jotain meni pieleen. Yritä uudelleen.');
            }
        });
    }
 }
 
 // Handle merkinta2.html Form
 function handleMerkinta2Form() {
    const storedData = JSON.parse(sessionStorage.getItem('merkintaData') || '{}');
    if (!storedData.formData) {
        window.location.href = 'merkinta.html';
        return;
    }
 
    const { formData, databaseCheck } = storedData;
    const elements = {
        form: document.getElementById('merkintaForm2'),
        childAdditionalInfoContainer: document.getElementById('childAdditionalInfoContainer'),
        businessAdditionalInfoContainer: document.getElementById('additionalInfoContainer'),
        selfAdditionalInfoContainer: document.getElementById('selfAdditionalInfoContainer')
    };
 
    // Show/hide additional info based on database check
    if (databaseCheck) {
        if (formData.investmentType === 'self') {
            elements.selfAdditionalInfoContainer.style.display = 
                databaseCheck.found ? 'none' : 'block';
        } else if (formData.investmentType === 'child') {
            elements.childAdditionalInfoContainer.style.display = 
                databaseCheck.found ? 'none' : 'block';
        } else if (formData.investmentType === 'business') {
            elements.businessAdditionalInfoContainer.style.display = 
                databaseCheck.found ? 'none' : 'block';
        }
    }
 
    if (elements.form) {
        elements.form.addEventListener('submit', async function(e) {
            e.preventDefault();
            try {
                const response = await submitFormData(new FormData(this));
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
 
 // Session Cleanup
 window.addEventListener('beforeunload', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('auth_data')) {
        try {
            const authData = JSON.parse(atob(urlParams.get('auth_data')));
            await fetch('https://sopimus.chatasilo.com/auth/clear-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: authData.sessionToken })
            });
        } catch (error) {
            console.error('Error clearing session:', error);
        }
    }
 });
 
 // Initialize
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