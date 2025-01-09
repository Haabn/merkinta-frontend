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

const apiUrl = import.meta.env.VITE_API_URL;

 // Bank Authentication Handling
async function verifySession(token) {
    try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/verify-session`, {
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
        const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/session`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
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
 
    const response = await fetch(`${import.meta.env.VITE_API_URL}/merkinta/decrypt`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'include', // Include credentials like cookies
            body: JSON.stringify(encryptedData)
        });
 
    if (!response.ok) {
        throw new Error('Backend request failed');
    }
 
    return response.json();
 }
 
 async function checkDatabase(payload) {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/merkinta/check-info`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'include', // Include credentials like cookies
            mode: 'cors', // Enable Cross-Origin Resource Sharing
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

   // Show/hide additional info based on database check
   if (databaseCheck) {
       if (investmentType === 'self') {
           elements.selfAdditionalInfoContainer.style.display = 
               databaseCheck.found ? 'none' : 'block';
           // If found, populate hidden fields with database data
           if (databaseCheck.found && databaseCheck.data) {
               Object.keys(databaseCheck.data).forEach(key => {
                   const input = document.querySelector(`input[name="${key}"]`);
                   if (input) input.value = databaseCheck.data[key];
               });
           }
       } else if (investmentType === 'child') {
           elements.childAdditionalInfoContainer.style.display = 
               databaseCheck.found ? 'none' : 'block';
           if (databaseCheck.found && databaseCheck.data) {
               Object.keys(databaseCheck.data).forEach(key => {
                   const input = document.querySelector(`input[name="${key}"]`);
                   if (input) input.value = databaseCheck.data[key];
               });
           }
       } else if (investmentType === 'business') {
           elements.businessAdditionalInfoContainer.style.display = 
               databaseCheck.found ? 'none' : 'block';
           if (databaseCheck.found && databaseCheck.data) {
               Object.keys(databaseCheck.data).forEach(key => {
                   const input = document.querySelector(`input[name="${key}"]`);
                   if (input) input.value = databaseCheck.data[key];
               });
           }
       }
   }

   // Handle additional account ownership info visibility
   if (elements.id3rRadios) {
       elements.id3rRadios.forEach(radio => {
           radio.addEventListener('change', function() {
               elements.id3Container.style.display = 
                   this.value === 'joo' ? 'block' : 'none';
           });
       });
   }

   // Handle form submission
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
               // Create final form data
               const finalFormData = new FormData(this);

               // Add investment type
               finalFormData.append('investmentType', investmentType);

               // Add auth data if it's a self investment
               if (investmentType === 'self' && authData) {
                   finalFormData.append('nationalIdentityNumber', authData.nationalIdentityNumber);
                   finalFormData.append('name', authData.name);
               }

               // Add database data if found
               if (databaseCheck?.found && databaseCheck.data) {
                   Object.entries(databaseCheck.data).forEach(([key, value]) => {
                       if (!finalFormData.has(key)) {
                           finalFormData.append(key, value);
                       }
                   });
               }

               const response = await submitFormData(finalFormData);
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
