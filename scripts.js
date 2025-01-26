const API_URL = 'https://api.chatasilo.com/sopimus-api/consent';

// Add both of these at the very top of your file
window.addEventListener('error', function(e) {
    if (e.message && (
        e.message.includes('cookie') || 
        e.message.includes('Cookie') ||
        e.message.includes('__vercel_live_token') ||
        e.message.includes('SameSite')
    )) {
        e.preventDefault();
    }
});

window.addEventListener('warning', function(e) {
    if (e.message && (
        e.message.includes('cookie') || 
        e.message.includes('Cookie') ||
        e.message.includes('__vercel_live_token') ||
        e.message.includes('SameSite')
    )) {
        e.preventDefault();
    }
});

// Main script for handling form encryption and navigation
// sopimus.html DOMContentLoaded listener
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const token = getAuthToken();
    if (!token) {
      console.error("No auth token found");
      window.location.href = 'index.html';
      return;
    }

    console.log("Attempting verification with token:", token);

    const response = await fetch('https://api.chatasilo.com/sopimus-api/consent/verify', {
      method: 'POST', 
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) throw new Error('Verification failed');

    // Initialize UI after verification
    const consentCheckbox = document.getElementById('concent');
    const proceedButton = document.getElementById('proceedButton');
    if (consentCheckbox && proceedButton) {
      consentCheckbox.addEventListener('change', () => {
        proceedButton.disabled = !consentCheckbox.checked;
      });
    }

  } catch (error) {
    console.error("Error:", error);
    window.location.href = 'index.html';
  }
});
    function checkSessionValidity() {
    const authToken = sessionStorage.getItem('authToken');
    const timestamp = sessionStorage.getItem('authTimestamp');
    
    if (!authToken || !timestamp) {
        window.location.href = 'index.html';
        return false;
    }

    const timeDiff = Date.now() - parseInt(timestamp);
    const timeoutMinutes = 60;
    
    if (timeDiff > timeoutMinutes * 60 * 1000) {
        sessionStorage.clear();
        window.location.href = 'index.html';
        return false;
    }
    
    return true;
}
function checkSession() {
    const token = getAuthToken();
    if (!token || !checkSessionValidity()) {
        window.location.href = 'index.html';
    }
}

    function handleSessionResponse(responseData, step) {
    console.log('handleSessionResponse:', { responseData, step });
    if (responseData.nextPage) {
        window.location.href = responseData.nextPage;
    }
}

// DOM Elements - Common across all pages
const outputDiv = document.getElementById('outputDiv');
const outputSection = document.getElementById('output-section');
const loadingSection = document.getElementById('loading-section');
const customerForm = document.getElementById('customerForm');
const currentPage = window.location.pathname;
const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
const maxFileSize = 5 * 1024 * 1024; // 5MB
const tempStorage = new Map();

const sopimusElements = {
    consentCheckbox: document.getElementById('concent'),
    proceedButton: document.getElementById('proceedButton')
};

const page1aElements = {
    form: document.getElementById('page1aForm'),
    liite3Checkbox: document.getElementById('liite3'),
    liite4Checkbox: document.getElementById('liite4'),
    errorMessage: document.getElementById('errorMessage'),
    submitButton: document.getElementById('submitButton')
};

const page1bElements = {
    liite1Input: document.getElementById('liite1'),
    proceedButton: document.getElementById('proceedButton'),
    form: document.getElementById('page1bForm')
};

// Page1c elements and handlers
const page1cElements = {
    liiteRAInput: document.getElementById('liiteRA'),
    proceedButton: document.getElementById('proceedButton'),
    form: document.getElementById('page1cForm')
};

// Page2c specific elements
const page2cElements = {
    pepRadios: document.getElementsByName('pep'),
    pepDetailsField: document.getElementById('pepDetailsField'),
    pepDetailsInput: document.getElementById('pepDetails'),
    veromaaContainer: document.getElementById('veromaaContainer'),
    veromaaTableBody: document.getElementById('veromaaTableBody'),
    addVeromaaBtn: document.getElementById('addVeromaaBtn'),
    veromaa1Input: document.getElementById('veromaa1'),
    tin1Input: document.getElementById('tin1'),
    jooveroCheckbox: document.getElementById('joovero'),  
    USAdetaljiGroup: document.getElementById('USAdetaljiGroup'),
    USAdetaljiInput: document.getElementById('USAdetalji'),
    USARadios: document.getElementsByName('USA'), 
    muutahoRadios: document.getElementsByName('muutaho'),
    behalfDetailsGroup: document.getElementById('behalfDetailsGroup'),
    behalfNameInput: document.getElementById('Name2'),
    behalfIdInput: document.getElementById('ID2'),
    muuLiikeCheckbox: document.getElementById('muuliike'),
    muuLiikeTextContainer: document.getElementById('muuliikeTextContainer'),
    muuLiikeText: document.getElementById('muuliiketext'),
    TVKRadios: document.getElementsByName('TVK'),  // Changed from individual selectors
    TVKvuosiGroup: document.getElementById('TVKvuosiGroup'),
    TVKvuosi: document.getElementById('TVKvuosi'),
    konsRadios: document.getElementsByName('kons'),  // Changed from individual selectors
    konsvuosiGroup: document.getElementById('konsvuosiGroup'),
    konsvuosi: document.getElementById('konsvuosi'),
    itseRadios: document.getElementsByName('itse'),  // Changed from individual selectors
    itsevuosiGroup: document.getElementById('itsevuosiGroup'),
    itsevuosi: document.getElementById('itsevuosi')

};

    // Page2d specific elements
    const page2dElements = {
        // Investment knowledge radio buttons for each investment type
        sijoitusrahastotRadios: document.getElementsByName('sijoitusrahastot_knowledge'),
        vaihtoehtorahastotRadios: document.getElementsByName('vaihtoehtorahastot_knowledge'),
        osakkeetRadios: document.getElementsByName('osakkeet_knowledge'),
        joukkovelkakirjalainatRadios: document.getElementsByName('joukkovelkakirjalainat_knowledge'),
        johdannaisetRadios: document.getElementsByName('johdannaiset_knowledge'),
        paaomaturvatutRadios: document.getElementsByName('paaomaturvatut_knowledge'),
        kiinteistotRadios: document.getElementsByName('kiinteistot_knowledge'),
        talletuksetRadios: document.getElementsByName('talletukset_knowledge'),

        // Text inputs for each investment type - years
        sijoitusrahastotYears: document.getElementsByName('sijoitusrahastot_years')[0],
        vaihtoehtorahastotYears: document.getElementsByName('vaihtoehtorahastot_years')[0],
        osakkeetYears: document.getElementsByName('osakkeet_years')[0],
        joukkovelkakirjalainatYears: document.getElementsByName('joukkovelkakirjalainat_years')[0],
        johdannaisetYears: document.getElementsByName('johdannaiset_years')[0],
        paaomaturvatutYears: document.getElementsByName('paaomaturvatut_years')[0],
        kiinteistotYears: document.getElementsByName('kiinteistot_years')[0],
        talletuksetYears: document.getElementsByName('talletukset_years')[0],

        // Count inputs
        sijoitusrahastotCount: document.getElementsByName('sijoitusrahastot_count')[0],
        vaihtoehtorahastotCount: document.getElementsByName('vaihtoehtorahastot_count')[0],
        osakkeetCount: document.getElementsByName('osakkeet_count')[0],
        joukkovelkakirjalainatCount: document.getElementsByName('joukkovelkakirjalainat_count')[0],
        johdannaisetCount: document.getElementsByName('johdannaiset_count')[0],
        paaomaturvatutCount: document.getElementsByName('paaomaturvatut_count')[0],
        kiinteistotCount: document.getElementsByName('kiinteistot_count')[0],
        talletuksetCount: document.getElementsByName('talletukset_count')[0],

        // Last trade inputs
        sijoitusrahastotLast: document.getElementsByName('sijoitusrahastot_last')[0],
        vaihtoehtorahastotLast: document.getElementsByName('vaihtoehtorahastot_last')[0],
        osakkeetLast: document.getElementsByName('osakkeet_last')[0],
        joukkovelkakirjalainatLast: document.getElementsByName('joukkovelkakirjalainat_last')[0],
        johdannaisetLast: document.getElementsByName('johdannaiset_last')[0],
        paaomaturvatutLast: document.getElementsByName('paaomaturvatut_last')[0],
        kiinteistotLast: document.getElementsByName('kiinteistot_last')[0],
        talletuksetLast: document.getElementsByName('talletukset_last')[0],

        // Total trade inputs
        sijoitusrahastotTotal: document.getElementsByName('sijoitusrahastot_total')[0],
        vaihtoehtorahastotTotal: document.getElementsByName('vaihtoehtorahastot_total')[0],
        osakkeetTotal: document.getElementsByName('osakkeet_total')[0],
        joukkovelkakirjalainatTotal: document.getElementsByName('joukkovelkakirjalainat_total')[0],
        johdannaisetTotal: document.getElementsByName('johdannaiset_total')[0],
        paaomaturvatutTotal: document.getElementsByName('paaomaturvatut_total')[0],
        kiinteistotTotal: document.getElementsByName('kiinteistot_total')[0],
        talletuksetTotal: document.getElementsByName('talletukset_total')[0],
        // Text input for 'Muu sijoituskokemus' details
        kokemusmuudetalji: document.getElementsByName('kokemusmuudetalji')[0],
    };
// Page3 elements
const page3Elements = {
    fileInput: document.getElementById('passport'),
    proceedButton: document.getElementById('proceedButton'),
    previewSection: document.getElementById('preview'),
    form: document.getElementById('page3Form')
};


// Define the function at the top of your script

   // Page1a Handler Functions
   function handleCheckboxChange(checkedBox, otherCheckbox) {
    if (checkedBox.checked) {
        otherCheckbox.checked = false;
    }
    validateForm();
}

function validateForm() {
    const isValid = page1aElements.liite3Checkbox.checked || page1aElements.liite4Checkbox.checked;
    if (page1aElements.errorMessage) {
        page1aElements.errorMessage.textContent = isValid ? '' : 'Valitse yksi vaihtoehto jatkaaksesi';
        page1aElements.errorMessage.style.display = isValid ? 'none' : 'block';
    }
    if (page1aElements.submitButton) {
        page1aElements.submitButton.disabled = !isValid;
    }
    return isValid;
}

  if (sopimusForm) {
  sopimusForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Add loading state
    const submitButton = this.querySelector('button[type="submit"]');
    if (submitButton) submitButton.disabled = true;
    
    try {
      const formData = new FormData(this);
      await performEncryption(formData);
    } catch (error) {
      console.error('Form submission error:', error);
      // Show error to user
      alert('Virhe lomakkeen lähetyksessä. Yritä uudelleen.');
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });
}

// Page1a form handling
if (window.location.pathname.includes('page1a.html')) {
    // Checkbox Listeners
    if (page1aElements.liite3Checkbox && page1aElements.liite4Checkbox) {
        page1aElements.liite3Checkbox.addEventListener('change', function() {
            handleCheckboxChange(page1aElements.liite3Checkbox, page1aElements.liite4Checkbox);
        });
        
        page1aElements.liite4Checkbox.addEventListener('change', function() {
            handleCheckboxChange(page1aElements.liite4Checkbox, page1aElements.liite3Checkbox);
        });
    }

    // Form Submission
    if (page1aElements.form) {
        page1aElements.form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            if (validateForm()) {
                // Store selection in sessionStorage
                const selectedType = page1aElements.liite3Checkbox.checked ? 'private' : 'business';
                sessionStorage.setItem('customerType', selectedType);
                
                // Use the existing encryption function
                const formData = new FormData(this);
                performEncryption(formData);
            }
        });
    }
}
if (window.location.pathname.includes('page1b.html')) {
    // Enable/disable proceed button based on checkbox
    if (page1bElements.liite1Input) {
        page1bElements.liite1Input.addEventListener('change', function() {
            if (page1bElements.proceedButton) {
                page1bElements.proceedButton.disabled = !this.checked;
            }
        });
    }

    // Form submission
    if (page1bElements.form) {
        page1bElements.form.addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            performEncryption(formData);
        });
    }
}
if (window.location.pathname.includes('page1c.html')) {
    // Enable/disable proceed button based on checkbox
    if (page1cElements.liiteRAInput) {
        page1cElements.liiteRAInput.addEventListener('change', function() {
            if (page1cElements.proceedButton) {
                page1cElements.proceedButton.disabled = !this.checked;
            }
        });
    }

    // Form submission
    if (page1cElements.form) {
        page1cElements.form.addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            performEncryption(formData);
        });
    }
}

    // UI Update Functions
    function updateOutput(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.innerHTML = `<strong>${element.querySelector('strong').innerText}:</strong> ${value}`;
        } else {
            console.warn(`Element with id "${id}" not found.`);
        }
    }

    function displayError(message) {
        console.error("Error:", message);  // Always log to console
        const outputDiv = document.getElementById('outputDiv');
        if (outputDiv) {  // Only try to append if element exists
            const errorPara = document.createElement('p');
            errorPara.classList.add('error');
            errorPara.innerHTML = `<strong>Error:</strong> ${message}`;
            outputDiv.appendChild(errorPara);
        }
    }

    function updateUIState() {
        if (loadingSection) loadingSection.classList.add('hidden');
        if (outputSection) outputSection.classList.remove('hidden');
    }

    function handleUIError(error) {
        displayError(error.message);
        updateUIState();
    }
// PEP handling
function handlePepDisplay(isPep) {
    if (page2cElements.pepDetailsField) {
        page2cElements.pepDetailsField.style.display = isPep ? 'block' : 'none';
        if (!isPep) {
            page2cElements.pepDetailsInput.value = '';
        }
    }
}
   // Tax Information Functions
   function handleTinInput(veromaaInput, tinInput) {
    const country = veromaaInput.value.trim().toLowerCase();
    if (country === 'suomi' || country === 'finland') {
        tinInput.value = 'Ei vaadittu';
        tinInput.readOnly = true;
    } else {
        tinInput.value = '';
        tinInput.readOnly = false;
        tinInput.placeholder = 'Anna TIN';
    }
}

// Tax Information Listeners and Functions
function initializeTaxCountryTable() {
    const veromaaContainer = document.getElementById('veromaaContainer');
    const veromaaTableBody = document.getElementById('veromaaTableBody');
    const addVeromaaBtn = document.getElementById('addVeromaaBtn');
    const jooveroCheckbox = document.getElementById('joovero');

    // Clear existing rows
    veromaaTableBody.innerHTML = '';

    // Add first row by default
    addNewCountryRow(1);

    // Initialize checkbox listener
    if (jooveroCheckbox) {
        jooveroCheckbox.addEventListener('change', function() {
            veromaaContainer.style.display = this.checked ? 'block' : 'none';
            if (!this.checked) {
                // Reset table when unchecked
                veromaaTableBody.innerHTML = '';
                addNewCountryRow(1);
                currentRowCount = 1;
            }
        });
    }

    let currentRowCount = 1;

    // Add button listener
    if (addVeromaaBtn) {
        addVeromaaBtn.addEventListener('click', function() {
            currentRowCount++;
            if (currentRowCount <= 3) {
                addNewCountryRow(currentRowCount);
                
                // Hide button if maximum rows reached
                if (currentRowCount === 3) {
                    addVeromaaBtn.style.display = 'none';
                }
            }
        });
    }

    function addNewCountryRow(index) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <input type="text" name="veromaa${index}" id="veromaa${index}" 
                    class="veromaa-input" placeholder="Verovelvollisuuden maa">
            </td>
            <td>
                <input type="text" name="tin${index}" id="tin${index}" 
                    class="tin-input" placeholder="Anna TIN">
            </td>
        `;
        veromaaTableBody.appendChild(row);

        // Add input listener for TIN handling
        const veromaaInput = document.getElementById(`veromaa${index}`);
        const tinInput = document.getElementById(`tin${index}`);
        
        if (veromaaInput && tinInput) {
            veromaaInput.addEventListener('input', function() {
                handleTinInput(this, tinInput);
            });
        }
    }

    function handleTinInput(veromaaInput, tinInput) {
        const country = veromaaInput.value.trim().toLowerCase();
        if (country === 'suomi' || country === 'finland') {
            tinInput.value = 'Ei vaadittu';
            tinInput.readOnly = true;
        } else {
            tinInput.value = '';
            tinInput.readOnly = false;
            tinInput.placeholder = 'Anna TIN';
        }
    }
}

function handleUSADisplay(isUSA) {
    if (page2cElements.USAdetaljiGroup) {
        page2cElements.USAdetaljiGroup.style.display = isUSA ? 'block' : 'none';
        if (!isUSA && page2cElements.USAdetaljiInput) {
            page2cElements.USAdetaljiInput.value = '';
        }
    }
}
function handleBehalfDisplay(isBehalfOf) {
    if (page2cElements.behalfDetailsGroup) {
        page2cElements.behalfDetailsGroup.style.display = isBehalfOf ? 'block' : 'none';
        if (!isBehalfOf) {
            page2cElements.behalfNameInput.value = '';
            page2cElements.behalfIdInput.value = '';
        }
    }
}
function handleMuuLiikeDisplay(isChecked) {
    if (page2cElements.muuLiikeTextContainer) {
        page2cElements.muuLiikeTextContainer.style.display = isChecked ? 'block' : 'none';
        if (!isChecked && page2cElements.muuLiikeText) {
            page2cElements.muuLiikeText.value = '';
        }
    }
}
// Add this function to handle service year display
function handleServiceYearDisplay(yearGroupElement, yearInput, isVisible) {
    if (yearGroupElement) {
        yearGroupElement.style.display = isVisible ? 'block' : 'none';
        if (!isVisible && yearInput) {
            yearInput.value = '';
        }
    }
}
// Add this function with your other handler functions
function validateYearInput(event) {
    // Remove non-numeric characters
    event.target.value = event.target.value.replace(/[^\d]/g, '');
    
    // Ensure the value is within a reasonable range (1-50 years)
    const numValue = parseInt(event.target.value);
    if (numValue > 50) {
        event.target.value = '50';
    }
}
// Handle radio button selections and their related input fields
function handleInvestmentKnowledge(investmentType, isKnown) {
    const yearInput = document.getElementsByName(`${investmentType}_years`)[0];
    const countInput = document.getElementsByName(`${investmentType}_count`)[0];
    const lastInput = document.getElementsByName(`${investmentType}_last`)[0];
    const totalInput = document.getElementsByName(`${investmentType}_total`)[0];
    
    // Array of inputs to manage
    const inputs = [yearInput, countInput, lastInput, totalInput];
    
    inputs.forEach(input => {
        if (input) {
            input.disabled = !isKnown;
            input.required = isKnown;
            if (!isKnown) {
                input.value = '';
            }
        }
    });
}

// Check if any investments are selected
function checkInvestmentSelections() {
    const radioGroups = document.querySelectorAll('input[type="radio"][value="Kyllä"]:checked');
    return radioGroups.length > 0;
}
if (window.location.pathname.includes('page3.html')) {
    if (page3Elements.fileInput) {
        page3Elements.fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                page3Elements.proceedButton.disabled = false;
                
                // Clear previous preview
                page3Elements.previewSection.innerHTML = '';
                
                // Show preview based on file type
                if (file.type.startsWith('image/')) {
                    const img = document.createElement('img');
                    img.style.display = 'block';
                    img.src = URL.createObjectURL(file);
                    page3Elements.previewSection.appendChild(img);
                } else if (file.type === 'application/pdf') {
                    const div = document.createElement('div');
                    div.className = 'pdf-preview';
                    div.style.display = 'block';
                    div.textContent = `PDF valittu: ${file.name}`;
                    page3Elements.previewSection.appendChild(div);
                }
            } else {
                page3Elements.proceedButton.disabled = true;
                page3Elements.previewSection.innerHTML = '';
            }
        });
    }

// Form submission
if (page3Elements.form) {
    page3Elements.form.addEventListener('submit', async function(e) {
        e.preventDefault();
        const file = page3Elements.fileInput.files[0];
        if (!file) {
            alert('Valitse tiedosto ennen lähettämistä.');
            return;
        }

        try {
            // Read file as base64
            const reader = new FileReader();
            reader.onload = async function() {
                const fileBase64 = reader.result.split(',')[1];
                
                // Use the existing encryption function
                await performEncryption(fileBase64, 'passport');

                // Note: performEncryption will handle the navigation to page4.html
                // based on the server response
            };

            reader.readAsDataURL(file);

        } catch (error) {
            console.error('Error:', error);
            alert('Virhe tiedoston lähetyksessä: ' + error.message);
        }
    });
}
}
                
function createFormDataObject(formData) {
    const currentPage = window.location.pathname;
    let formDataObj = {};
    
    if (currentPage.includes('sopimus.html')) {
        formDataObj = {
            concent: formData.has('concent')
        };
        console.log('sopimus.html form data:', formDataObj);
        return formDataObj;
    }
    else if (currentPage.includes('page1a.html')) {
        formDataObj = {
            liite3: formData.has('liite3'),
            liite4: formData.has('liite4')
        };
    }
    else if (currentPage.includes('page1b.html')) {
        formDataObj = {
            liite1: formData.has('liite1')
        };
    }
    else if (currentPage.includes('page1c.html')) {
        formDataObj = {
            liiteRA: formData.has('liiteRA')
        };
    }
    else if (currentPage.includes('page2a.html')) {
        // Page 2a - Personal Information only
        formDataObj = {
            Adress: formData.get('Adress'),
            postinumero: formData.get('postinumero'),
            postitoimipaikka: formData.get('postitoimipaikka'),
            puh: formData.get('puh'),
            email: formData.get('email'),
            tilinumero: formData.get('tilinumero'),
            nimibic: formData.get('nimibic')
        };
    } 
    else if (currentPage.includes('page2b.html')) {
        // Page 2b - Financial Information
        formDataObj = {
            varat: formData.get('varat'),
            palkka: formData.has('palkka'),
            perinto: formData.has('perinto'),
            sijoitukset: formData.has('sijoitukset'),
            lahja: formData.has('lahja'),
            saasto: formData.has('saasto'),
            tulot: formData.get('tulot'),
            muuvaraorig: formData.has('muuvaraorig'),
            muuvaradetalji: formData.get('muuvaradetalji'),
            rahastot: formData.get('rahastot'),
            osakkeet: formData.get('osakkeet'),
            joukkolainat: formData.get('joukkolainat'),
            talletukset: formData.get('talletukset'),
            asunnot: formData.get('asunnot'),
            muuvarajako: formData.get('muuvarajako')
        };
    }
    else if (currentPage.includes('page2c.html')) {
        // Get values needed for conditional logic
        const muutahoValue = formData.get('muutaho');
        
        // Page 2c - Tax and Other Information
        formDataObj = {
            // Tax Information
            joovero: formData.has('joovero'),
            veromaa1: formData.get('veromaa1'),
            tin1: formData.get('tin1') || '',
            veromaa2: formData.get('veromaa2'),
            tin2: formData.get('tin2') || '',
            veromaa3: formData.get('veromaa3'),
            tin3: formData.get('tin3') || '',
            USAvero: formData.get('USA'),
            USAdetalji: formData.get('USAdetalji'),
            jooAsilo: formData.has('jooAsilo'),
            
            // Acting on Behalf
            muutaho: muutahoValue,
            Name2: muutahoValue === 'joominor' ? formData.get('Name2') : '',
            ID2: muutahoValue === 'joominor' ? formData.get('ID2') : '',
            
            // PEP Status
            pep: formData.get('pep'),
            pepDetails: formData.get('pepDetails'),

            // Education and Classification
            yleinensij: formData.has('yleinensij'),
            saastaminen: formData.has('saastaminen'),
            muuliike: formData.has('muuliike'),
            TVK: formData.get('TVK'), 
            TVKvuosi: formData.get('TVKvuosi'),
            kons: formData.get('kons'),  
            konsvuosi: formData.get('konsvuosi'),
    
            // Independent Investment (itse)
            itse: formData.get('itse'),  // Will be 'itsejoo' or 'itsei'
            itsevuosi: formData.get('itsevuosi'),
            muuliiketext: formData.get('muuliiketext'),
            educationLevel: formData.get('educationLevel'),
            tutkinto: formData.get('tutkinto'),
            muukoulutus: formData.get('muukoulutus'),
            ammatti: formData.get('ammatti'),
            luokittelu: formData.get('luokittelu')
        };
    }
    else if (currentPage.includes('page2d.html')) {
        // Page 2d - Investment Experience
        formDataObj = {
            // Sijoitusrahastot (Investment Funds)
            sijoitusrahastot_knowledge: formData.get('sijoitusrahastot_knowledge'),
            sijoitusrahastot_years: formData.get('sijoitusrahastot_years'),
            sijoitusrahastot_count: formData.get('sijoitusrahastot_count'),
            sijoitusrahastot_last: formData.get('sijoitusrahastot_last'),
            sijoitusrahastot_total: formData.get('sijoitusrahastot_total'),
    
            // Vaihtoehtorahastot (Alternative Funds)
            vaihtoehtorahastot_knowledge: formData.get('vaihtoehtorahastot_knowledge'),
            vaihtoehtorahastot_years: formData.get('vaihtoehtorahastot_years'),
            vaihtoehtorahastot_count: formData.get('vaihtoehtorahastot_count'),
            vaihtoehtorahastot_last: formData.get('vaihtoehtorahastot_last'),
            vaihtoehtorahastot_total: formData.get('vaihtoehtorahastot_total'),
    
            // Osakkeet (Stocks)
            osakkeet_knowledge: formData.get('osakkeet_knowledge'),
            osakkeet_years: formData.get('osakkeet_years'),
            osakkeet_count: formData.get('osakkeet_count'),
            osakkeet_last: formData.get('osakkeet_last'),
            osakkeet_total: formData.get('osakkeet_total'),
    
            // Joukkovelkakirjalainat (Bonds)
            joukkovelkakirjalainat_knowledge: formData.get('joukkovelkakirjalainat_knowledge'),
            joukkovelkakirjalainat_years: formData.get('joukkovelkakirjalainat_years'),
            joukkovelkakirjalainat_count: formData.get('joukkovelkakirjalainat_count'),
            joukkovelkakirjalainat_last: formData.get('joukkovelkakirjalainat_last'),
            joukkovelkakirjalainat_total: formData.get('joukkovelkakirjalainat_total'),
    
            // Johdannaiset (Derivatives)
            johdannaiset_knowledge: formData.get('johdannaiset_knowledge'),
            johdannaiset_years: formData.get('johdannaiset_years'),
            johdannaiset_count: formData.get('johdannaiset_count'),
            johdannaiset_last: formData.get('johdannaiset_last'),
            johdannaiset_total: formData.get('johdannaiset_total'),
    
            // Pääomaturvatut (Capital Protected)
            paaomaturvatut_knowledge: formData.get('paaomaturvatut_knowledge'),
            paaomaturvatut_years: formData.get('paaomaturvatut_years'),
            paaomaturvatut_count: formData.get('paaomaturvatut_count'),
            paaomaturvatut_last: formData.get('paaomaturvatut_last'),
            paaomaturvatut_total: formData.get('paaomaturvatut_total'),
    
            // Kiinteistöt (Real Estate)
            kiinteistot_knowledge: formData.get('kiinteistot_knowledge'),
            kiinteistot_years: formData.get('kiinteistot_years'),
            kiinteistot_count: formData.get('kiinteistot_count'),
            kiinteistot_last: formData.get('kiinteistot_last'),
            kiinteistot_total: formData.get('kiinteistot_total'),
    
            // Talletukset (Deposits)
            talletukset_knowledge: formData.get('talletukset_knowledge'),
            talletukset_years: formData.get('talletukset_years'),
            talletukset_count: formData.get('talletukset_count'),
            talletukset_last: formData.get('talletukset_last'),
            talletukset_total: formData.get('talletukset_total'),

            // **Muu sijoituskokemus (Other Investment Experience)**
            kokemusmuudetalji: formData.get('kokemusmuudetalji')
        };
    }
    return formDataObj;
}

    // Encryption and Submission Functions
    async function performEncryption(formData, type = 'form') {
        try {
            const authToken = getAuthToken();
        if (!authToken) {
            throw new Error('Authentication token missing');
            }
            // Show loading and hide output
            if (loadingSection) loadingSection.classList.remove('hidden');
            if (outputSection) outputSection.classList.add('hidden');
    
            // Generate encryption keys
            const aesKey = forge.random.getBytesSync(16);
            const aesIV = forge.random.getBytesSync(16);
            const aesKeyHex = forge.util.bytesToHex(aesKey);
            const aesIVHex = forge.util.bytesToHex(aesIV);
    
            // Determine current step based on page
            const currentPage = window.location.pathname;
            const step = type === 'passport' ? 'passport' :
                currentPage.includes('sopimus.html') ? 'sopimus' :
                currentPage.includes('page1a.html') ? 'page1a' :
                currentPage.includes('page1b.html') ? 'page1b' :
                currentPage.includes('page1c.html') ? 'page1c' :
                currentPage.includes('page2a.html') ? 'page2a' :
                currentPage.includes('page2b.html') ? 'page2b' :
                currentPage.includes('page2c.html') ? 'page2c' :
                currentPage.includes('page2d.html') ? 'page2d' :
                currentPage.includes('page3.html') ? 'page3' :
                'unknown';
    
    
            let jsonString;
if (type === 'passport') {
    jsonString = formData; // Change from data to formData
} else {
    const formDataObj = createFormDataObject(formData);
    jsonString = JSON.stringify(formDataObj);
}
            console.log("Data to be encrypted:", jsonString.substring(0, 100) + "...");
    
            // Encrypt the serialized data using AES-CBC
            const cipher = forge.cipher.createCipher('AES-CBC', aesKey);
            cipher.start({ iv: aesIV });
            cipher.update(forge.util.createBuffer(jsonString, 'utf8'));
            cipher.finish();
            const encrypted = forge.util.encode64(cipher.output.getBytes());
    
            // RSA Encryption of AES Key
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
    
            // Build the payload
            const payload = {
                ciphertext: encrypted,
                encryptedKeyRSA: encryptedAESKeyRSA,
                iv: aesIVHex,
                step: step,
                sessionId: authToken 
            };
    
            console.log("Sending payload to backend:", payload);

            const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        };
            
            // Send to backend
             const response = await fetch(`${API_URL}/decrypt`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(payload)
        });
            
            console.log('Raw response:', response);
            console.log('Response status:', response.status);

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Server response:', errorData);
            throw new Error(errorData.message || 'Backend request failed');
        }
    
             const responseData = await response.json();
        console.log('Server response:', responseData);
        
        if (responseData.nextPage) {
            window.location.href = responseData.nextPage;
        } else {
            throw new Error('No next page specified in response');
        }

    } catch (error) {
        console.error('Encryption error:', error);
        if (error.message.includes('Authentication required')) {
            window.location.href = 'index.html';
        } else {
            handleUIError(error);
        }
    }
}
           

// Event Listeners (all listeners together)
if (window.location.pathname.includes('page2c.html')) {
    // Initialize tax country table
    initializeTaxCountryTable();

    // PEP Listeners
    if (page2cElements.pepRadios) {
        page2cElements.pepRadios.forEach(radio => {
            radio.addEventListener('change', function() {
                handlePepDisplay(this.value === 'pepjoo');
            });
        });
    }

    // Tax Information Listeners
    if (page2cElements.jooveroCheckbox) {
        page2cElements.jooveroCheckbox.addEventListener('change', function() {
            page2cElements.veromaaContainer.style.display = this.checked ? 'block' : 'none';
        });
    }

    if (page2cElements.veromaa1Input) {
        page2cElements.veromaa1Input.addEventListener('input', function() {
            handleTinInput(this, page2cElements.tin1Input);
        });
    }

    if (page2cElements.addVeromaaBtn) {
        page2cElements.addVeromaaBtn.addEventListener('click', function() {
            const rowCount = page2cElements.veromaaTableBody.getElementsByTagName('tr').length;
            if (rowCount < 3) {
                const newIndex = rowCount + 1;
                const newRow = createNewCountryRow(newIndex);
                page2cElements.veromaaTableBody.appendChild(newRow);
                
                // Add event listener to the new country input
                document.getElementById(`veromaa${newIndex}`).addEventListener('input', function() {
                    const tinInput = document.getElementById(`tin${newIndex}`);
                    handleTinInput(this, tinInput);
                });
                
                // Hide the add button if we've reached 3 countries
                if (newIndex === 3) {
                    page2cElements.addVeromaaBtn.style.display = 'none';
                }
            }
        });
    }

    // USA Details Listeners
    if (page2cElements.USARadios) {
        page2cElements.USARadios.forEach(radio => {
            radio.addEventListener('change', function() {
                handleUSADisplay(this.value === 'jooUSA');
            });
        });
    }

    // Acting on Behalf Listeners
    if (page2cElements.muutahoRadios) {
        page2cElements.muutahoRadios.forEach(radio => {
            radio.addEventListener('change', function() {
                handleBehalfDisplay(this.value === 'joominor');
            });
        });
    }

    // Transaction Purpose Listeners
    if (page2cElements.muuLiikeCheckbox) {
        page2cElements.muuLiikeCheckbox.addEventListener('change', function() {
            handleMuuLiikeDisplay(this.checked);
        });
    }

    // Full Power of Attorney Listeners
    if (page2cElements.TVKRadios) {
        page2cElements.TVKRadios.forEach(radio => {
            radio.addEventListener('change', function() {
                handleServiceYearDisplay(
                    page2cElements.TVKvuosiGroup,
                    page2cElements.TVKvuosi,
                    this.value === 'TVKjoo'
                );
            });
        });
    }

    if (page2cElements.TVKvuosi) {
        page2cElements.TVKvuosi.addEventListener('input', validateYearInput);
    }

    // Consultative Asset Management Listeners
    if (page2cElements.konsRadios) {
        page2cElements.konsRadios.forEach(radio => {
            radio.addEventListener('change', function() {
                handleServiceYearDisplay(
                    page2cElements.konsvuosiGroup,
                    page2cElements.konsvuosi,
                    this.value === 'konsjoo'
                );
            });
        });
    }

    if (page2cElements.konsvuosi) {
        page2cElements.konsvuosi.addEventListener('input', validateYearInput);
    }

    // Independent Investment Listeners
    if (page2cElements.itseRadios) {
        page2cElements.itseRadios.forEach(radio => {
            radio.addEventListener('change', function() {
                handleServiceYearDisplay(
                    page2cElements.itsevuosiGroup,
                    page2cElements.itsevuosi,
                    this.value === 'itsejoo'
                );
            });
        });
    }

    if (page2cElements.itsevuosi) {
        page2cElements.itsevuosi.addEventListener('input', validateYearInput);
    }
}

 // End of page2c specific listeners
 // Setup listeners for each investment type
function setupInvestmentListeners() {
    const investmentTypes = [
        'sijoitusrahastot',
        'vaihtoehtorahastot',
        'osakkeet',
        'joukkovelkakirjalainat',
        'johdannaiset',
        'paaomaturvatut',
        'kiinteistot',
        'talletukset'
    ];

    investmentTypes.forEach(type => {
        // Radio button listeners
        const radios = document.getElementsByName(`${type}_knowledge`);
        radios.forEach(radio => {
            radio.addEventListener('change', function() {
                handleInvestmentKnowledge(type, this.value === 'Kyllä');
            });
        });
    }); // Closing brace for investmentTypes.forEach

} // Closing brace for setupInvestmentListeners function

// Call setup function when DOM is loaded
if (currentPage.includes('page2d.html')) {
    setupInvestmentListeners();
}

// Common form submission (outside page2c check)
if (customerForm) {
    customerForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(this);
        performEncryption(formData);
    });
}
// Initialization (all initialization together)
checkSession();

// Only initialize page2c elements if we're on page2c
if (window.location.pathname.includes('page2c.html')) {
    // Check if PEP radio is already selected
    const selectedPepRadio = document.querySelector('input[name="pep"]:checked');
    if (selectedPepRadio && page2cElements.pepDetailsField) {
        handlePepDisplay(selectedPepRadio.value === 'pepjoo');
    }

    // Check initial state of tax residency checkbox
    if (page2cElements.jooveroCheckbox && page2cElements.jooveroCheckbox.checked) {
        page2cElements.veromaaContainer.style.display = 'block';
    }
    // Add this: Check initial state of USA radio
    const selectedUSARadio = document.querySelector('input[name="USA"]:checked');
    if (selectedUSARadio) {
        handleUSADisplay(selectedUSARadio.value === 'jooUSA');
    }
    // Check initial state of behalf radio
    const selectedMuutahoRadio = document.querySelector('input[name="muutaho"]:checked');
    if (selectedMuutahoRadio) {
        handleBehalfDisplay(selectedMuutahoRadio.value === 'joominor');
    }
    if (page2cElements.muuLiikeCheckbox && page2cElements.muuLiikeCheckbox.checked) {
        handleMuuLiikeDisplay(true);
    }
    // Check initial state of Full Power of Attorney radio
    const selectedTVKRadio = document.querySelector('input[name="TVK"]:checked');
    if (selectedTVKRadio && page2cElements.TVKvuosiGroup) {
        handleServiceYearDisplay(
            page2cElements.TVKvuosiGroup,
            page2cElements.TVKvuosi,
            selectedTVKRadio.value === 'TVKjoo'
        );
    }

    // Check initial state of Consultative Asset Management radio
    const selectedKonsRadio = document.querySelector('input[name="kons"]:checked');
    if (selectedKonsRadio && page2cElements.konsvuosiGroup) {
        handleServiceYearDisplay(
            page2cElements.konsvuosiGroup,
            page2cElements.konsvuosi,
            selectedKonsRadio.value === 'konsjoo'
        );
    }

    // Check initial state of Independent Investment radio
    const selectedItseRadio = document.querySelector('input[name="itse"]:checked');
    if (selectedItseRadio && page2cElements.itsevuosiGroup) {
        handleServiceYearDisplay(
            page2cElements.itsevuosiGroup,
            page2cElements.itsevuosi,
            selectedItseRadio.value === 'itsejoo'
        );
    }
}

if (window.location.pathname.includes('page2d.html')) {
    // Function to handle investment controls
    function setupInvestmentControls(type) {
        // Get all elements for this investment type
        const radioButtons = document.getElementsByName(`${type}_knowledge`);
        const inputContainer = document.querySelector(`.${type}-inputs`);
        const allInputs = inputContainer ? inputContainer.querySelectorAll('input[type="text"]') : [];

        // Listen only to the 'change' event
        radioButtons.forEach(radio => {
            radio.addEventListener('change', function(e) {
                const isKnown = this.value === 'Kyllä';

                // Enable/disable and manage inputs
                allInputs.forEach(input => {
                    input.disabled = !isKnown;
                    input.required = isKnown;
                    if (!isKnown) {
                        input.value = '';
                    }

                    // Adjust styling for mobile
                    input.style.opacity = isKnown ? '1' : '0.5';
                    input.style.pointerEvents = isKnown ? 'auto' : 'none';
                });

                // Show/hide the input container with animation
                if (inputContainer) {
                    inputContainer.style.display = isKnown ? 'block' : 'none';
                    inputContainer.style.transition = 'opacity 0.3s';
                    inputContainer.style.opacity = isKnown ? '1' : '0';
                }
            });
        });
    } 
        

    // Setup mobile-friendly validation
    const investmentTypes = [
        'sijoitusrahastot',
        'vaihtoehtorahastot',
        'osakkeet',
        'joukkovelkakirjalainat',
        'johdannaiset',
        'paaomaturvatut',
        'kiinteistot',
        'talletukset'
    ];

    // Initialize controls for each investment type
    investmentTypes.forEach(type => setupInvestmentControls(type));

    // Mobile-friendly form submission
    if (customerForm) {
        customerForm.addEventListener('submit', function(e) {
            e.preventDefault();

            // Check selections with visual feedback
            let hasSelection = false;
            let firstError = null;

            investmentTypes.forEach(type => {
                const yesRadio = document.querySelector(`input[name="${type}_knowledge"][value="Kyllä"]:checked`);
                if (yesRadio) {
                    hasSelection = true;
                    const inputs = document.querySelectorAll(`input[name^="${type}_"][type="text"]`);
                    inputs.forEach(input => {
                        if (!input.value.trim()) {
                            input.classList.add('error');
                            if (!firstError) firstError = input;
                        } else {
                            input.classList.remove('error');
                        }
                    });
                }
            });

            if (!hasSelection) {
                alert('Valitse vähintään yksi sijoituskohde vastaamalla "Kyllä".');
                return;
            }

            if (firstError) {
                alert('Täytä kaikki vaaditut kentät valituille sijoituskohteille.');
                firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setTimeout(() => firstError.focus(), 500);
                return;
            }

            // If validation passes, proceed with form submission
            const formData = new FormData(this);
            performEncryption(formData);
       });
    }
} // closing bracket for page2d.html conditional

}); // closing bracket for DOMContentLoaded event listener
