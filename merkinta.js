/************************************************************
* merkinta.js
************************************************************/

const apiUrl = 'https://api.chatasilo.com';

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
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({})
    });

    logAuth('verifySession:response', {
      status: response.status,
      statusText: response.statusText
    });

    const data = await response.json();
    if (!response.ok || !data.valid) {
      logAuth('verifySession:invalid', { status: response.status, data });
      window.location.href = 'https://sopimus.chatasilo.com/index.html';
      return false;
    }

    if (!window.location.pathname.includes('merkinta.html')) {
      window.location.href = 'https://sopimus.chatasilo.com/merkinta.html';
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
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    returnUrl: 'https://sopimus.chatasilo.com/merkinta.html'  // Full domain URL
                }),
                mode: 'cors',
                credentials: 'include'
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
                url: data?.url?.substring(0, 30) + '...' // Log partial URL for privacy
            });
            
            if (data?.url) {
                logAuth('handleBankAuth:redirecting', { 
                    url: data.url.substring(0, 30) + '...' 
                });
                // Small delay to ensure logs are sent
                setTimeout(() => {
                    window.location.href = data.url;
                }, 100);
            } else {
                throw new Error('No authentication URL received');
            }
        } catch (error) {
            logAuth('handleBankAuth:error', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });

            // Re-enable the button
            authButton.disabled = false;
            logAuth('handleBankAuth:buttonReenabled');

            // Show error message
            const errorElement = document.getElementById('errorMessage');
            if (errorElement) {
                errorElement.textContent = 'Kirjautumisessa tapahtui virhe. Ole hyvä ja yritä uudelleen.';
                errorElement.style.display = 'block';
                logAuth('handleBankAuth:errorDisplayed');
            } else {
                logAuth('handleBankAuth:errorElementMissing');
                alert('Kirjautumisessa tapahtui virhe. Ole hyvä ja yritä uudelleen.');
            }
        }
    });

    // Create error message element if it doesn't exist
    if (!document.getElementById('errorMessage')) {
        const errorDiv = document.createElement('div');
        errorDiv.id = 'errorMessage';
        errorDiv.style.display = 'none';
        errorDiv.className = 'error-message';
        authButton.parentNode.insertBefore(errorDiv, authButton.nextSibling);
        logAuth('handleBankAuth:errorElementCreated');
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
   function handleMerkintaForm() {
   const elements = {
       form: document.getElementById('merkintaForm'),
       investmentTypeRadios: document.getElementsByName('investmentType'),
       childSSNInput: document.getElementById('childSSN'),
       businessIDInput: document.getElementById('businessID'),
       childSSNContainer: document.getElementById('childSSNContainer'),
       businessIDContainer: document.getElementById('businessIDContainer')
   };

   // Extract authData from query string
   const urlParams = new URLSearchParams(window.location.search);
   const authData = urlParams.has('auth_data') 
       ? JSON.parse(atob(urlParams.get('auth_data'))) 
       : null;

   // If we have a sessionToken from Signicat
   if (authData?.sessionToken) {
       verifySession(authData.sessionToken);
   }

   // Investment type toggles
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
           const formData = new FormData(this);
           const investmentType = formData.get('investmentType');

           try {
               let checkResult = null;

               // We must pass authData.sessionToken to checkDatabase for all types:
               if (investmentType === 'self') {
                   if (!authData?.nationalIdentityNumber) {
                       throw new Error('No identification data found');
                   }
                   checkResult = await checkDatabase({
                     type: 'self',
                     ssn: authData.nationalIdentityNumber
                   }, authData.sessionToken);

               } else if (investmentType === 'child') {
                   if (!elements.childSSNInput.value) {
                       alert('Anna lapsen henkilötunnus');
                       return;
                   }
                   checkResult = await checkDatabase({
                       type: 'child',
                       ssn: elements.childSSNInput.value
                   }, authData?.sessionToken); // Also pass token here

               } else if (investmentType === 'business') {
                   if (!elements.businessIDInput.value) {
                       alert('Anna Y-tunnus');
                       return;
                   }
                   checkResult = await checkDatabase({
                       type: 'business',
                       businessId: elements.businessIDInput.value
                   }, authData?.sessionToken);
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
