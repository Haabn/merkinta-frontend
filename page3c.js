// Error handling for cookies
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

document.addEventListener('DOMContentLoaded', function() {
    const page3Elements = {
        fileInput: document.getElementById('passport'),
        hasDocument: document.getElementById('hasDocument'),
        proceedButton: document.getElementById('proceedButton'),
        previewSection: document.getElementById('preview'),
        form: document.getElementById('page3Form'),
        successBanner: document.getElementById('successBanner'),
        cameraButton: document.getElementById('cameraButton'),
        cameraUI: document.getElementById('cameraUI'),
        camera: document.getElementById('camera'),
        canvas: document.getElementById('canvas'),
        captureButton: document.getElementById('captureButton'),
        retakeButton: document.getElementById('retakeButton')
    };

    let convertedPdfBase64 = null;
    let stream = null;

    /**
     * Validates file size
     * @param {File|Blob} file - File or Blob to validate
     * @throws {Error} If file is too large
     */
    async function validateFileSize(file) {
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            throw new Error('Tiedoston maksimikoko on 5MB');
        }
    }

    /**
     * Reads a file as Data URL
     * @param {File|Blob} file - File or Blob to read
     * @returns {Promise<string>} Data URL string
     */
    function readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
        });
    }

    /**
     * Gets image dimensions
     * @param {string} dataUrl - Image data URL
     * @returns {Promise<{width: number, height: number}>} Image dimensions
     */
    function getImageDimensions(dataUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve({ width: img.width, height: img.height });
            img.onerror = reject;
            img.src = dataUrl;
        });
    }

    /**
     * Converts image file to PDF and returns base64 string
     * @param {File} file - Image file (PNG or JPEG)
     * @returns {Promise<string>} - Base64 string of the PDF
     */
    async function convertImageToPDF(file) {
        try {
            // Validate file size
            await validateFileSize(file);

            // Read the file
            const imgDataUrl = await readFileAsDataURL(file);
            
            // Initialize jsPDF
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm'
            });

            // Get PDF page dimensions in mm
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();

            // Get image dimensions
            const imgDimensions = await getImageDimensions(imgDataUrl);

            // Convert image dimensions to mm (assuming 96 DPI)
            const mmPerPx = 25.4 / 96;
            const imgWidthMm = imgDimensions.width * mmPerPx;
            const imgHeightMm = imgDimensions.height * mmPerPx;

            // Calculate scaling to fit page while maintaining aspect ratio
            const ratio = Math.min(
                pdfWidth / imgWidthMm,
                pdfHeight / imgHeightMm
            );

            // Calculate centered position
            const scaledWidth = imgWidthMm * ratio;
            const scaledHeight = imgHeightMm * ratio;
            const x = (pdfWidth - scaledWidth) / 2;
            const y = (pdfHeight - scaledHeight) / 2;

            // Add image to PDF with high quality
            pdf.addImage(imgDataUrl, 'JPEG', x, y, scaledWidth, scaledHeight, undefined, 'MEDIUM');

            // Get base64 string
            const pdfBase64 = pdf.output('datauristring').split(',')[1];

            // Validate final PDF size
            const pdfBlob = new Blob([pdf.output('arraybuffer')], { type: 'application/pdf' });
            await validateFileSize(pdfBlob);

            return pdfBase64;

        } catch (error) {
            console.error('Error converting image to PDF:', error);
            throw new Error(
                error.message === 'Tiedoston maksimikoko on 5MB' 
                    ? error.message 
                    : 'Virhe kuvan muuntamisessa PDF-muotoon.'
            );
        }
    }

    // Camera handling
    page3Elements.cameraButton.addEventListener('click', async function() {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: "environment" }, 
                audio: false 
            });
            page3Elements.camera.srcObject = stream;
            page3Elements.cameraUI.style.display = 'block';
            page3Elements.previewSection.innerHTML = '';
            convertedPdfBase64 = null;
            page3Elements.hasDocument.value = '';
            page3Elements.proceedButton.disabled = true;
            page3Elements.fileInput.value = '';
        } catch (error) {
            console.error('Error accessing camera:', error);
            alert('Kameran käyttöönotto epäonnistui. Varmista, että selaimella on oikeus käyttää kameraa.');
        }
    });

    // Capture photo
    page3Elements.captureButton.addEventListener('click', function() {
        const context = page3Elements.canvas.getContext('2d');
        page3Elements.canvas.width = page3Elements.camera.videoWidth;
        page3Elements.canvas.height = page3Elements.camera.videoHeight;
        context.drawImage(page3Elements.camera, 0, 0);
        
        page3Elements.canvas.toBlob(async function(blob) {
            const file = new File([blob], "passport-photo.jpg", { type: "image/jpeg" });
            
            try {
                await validateFileSize(file);
                const pdfBase64 = await convertImageToPDF(file);
                convertedPdfBase64 = pdfBase64;

                // Create preview image
                const img = new Image();
                img.src = URL.createObjectURL(blob);
                img.className = 'preview-image';
                
                // Update UI
                page3Elements.previewSection.innerHTML = '';
                page3Elements.previewSection.appendChild(img);
                
                // Show retake button and enable proceed
                page3Elements.retakeButton.style.display = 'block';
                page3Elements.captureButton.style.display = 'none';
                page3Elements.proceedButton.disabled = false;
                page3Elements.hasDocument.value = 'camera';

                // Stop camera stream
                if (stream) {
                    stream.getTracks().forEach(track => track.stop());
                }
            } catch (error) {
                console.error('Error processing captured image:', error);
                alert(error.message);
            }
        }, 'image/jpeg', 0.95);
    });
    // File input handling
if (page3Elements.fileInput) {
    page3Elements.fileInput.addEventListener('change', async function(e) {
        const file = e.target.files[0];
        if (file) {
            try {
                // Validate file size first
                await validateFileSize(file);

                if (stream) {
                    stream.getTracks().forEach(track => track.stop());
                    page3Elements.cameraUI.style.display = 'none';
                }
                
                page3Elements.proceedButton.disabled = false;
                page3Elements.hasDocument.value = 'file';
                
                page3Elements.previewSection.innerHTML = '';
                convertedPdfBase64 = null;

                // Show file info
                const fileInfo = document.createElement('div');
                fileInfo.className = 'file-info';
                fileInfo.innerHTML = `
                    <p>Tiedoston nimi: ${file.name}</p>
                    <p>Tiedoston tyyppi: ${file.type}</p>
                    <p>Tiedoston koko: ${(file.size / 1024).toFixed(2)} KB</p>
                `;
                page3Elements.previewSection.appendChild(fileInfo);
                
                if (file.type === 'application/pdf') {
                    // For PDFs, create an iframe preview
                    const iframe = document.createElement('iframe');
                    iframe.className = 'pdf-preview-frame';
                    iframe.src = URL.createObjectURL(file);
                    page3Elements.previewSection.appendChild(iframe);
                    convertedPdfBase64 = await readFileAsBase64(file);
                } else if (file.type === 'image/png' || file.type === 'image/jpeg') {
                    try {
                        // For images, show image preview first
                        const img = document.createElement('img');
                        img.src = URL.createObjectURL(file);
                        img.className = 'preview-image';
                        page3Elements.previewSection.appendChild(img);
                        
                        // Then convert to PDF
                        convertedPdfBase64 = await convertImageToPDF(file);
                    } catch (error) {
                        console.error('Error converting image to PDF:', error);
                        alert('Virhe kuvan muuntamisessa PDF-muotoon.');
                        page3Elements.proceedButton.disabled = true;
                        page3Elements.previewSection.innerHTML = '';
                        page3Elements.hasDocument.value = '';
                        return;
                    }
                } else {
                    alert('Sallitut tiedostotyypit: PNG, JPG, PDF');
                    page3Elements.proceedButton.disabled = true;
                    page3Elements.previewSection.innerHTML = '';
                    page3Elements.hasDocument.value = '';
                    return;
                }
            } catch (error) {
                console.error('Error processing file:', error);
                alert(error.message);
                page3Elements.proceedButton.disabled = true;
                page3Elements.previewSection.innerHTML = '';
                page3Elements.hasDocument.value = '';
                page3Elements.fileInput.value = '';
                return;
            }
        } else {
            page3Elements.proceedButton.disabled = true;
            page3Elements.previewSection.innerHTML = '';
            convertedPdfBase64 = null;
            page3Elements.hasDocument.value = '';
        }
    });
}
    
    // Form submission
    if (page3Elements.form) {
        page3Elements.form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            if (!page3Elements.hasDocument.value) {
                alert('Valitse tiedosto tai ota kuva ennen lähettämistä.');
                return;
            }

            try {
                page3Elements.proceedButton.disabled = true;
                
                if (!convertedPdfBase64) {
                    throw new Error('Ei tiedostoa käsiteltäväksi');
                }

                await encryptAndSubmitFile(convertedPdfBase64, 'application/pdf');

            } catch (error) {
                console.error('Error:', error);
                alert('Virhe tiedoston lähetyksessä: ' + error.message);
                page3Elements.proceedButton.disabled = false;
            }
        });
    }

    /**
     * Convert image file to PDF and return base64 string
     * @param {File} file - Image file (PNG or JPEG)
     * @returns {Promise<string>} - Base64 string of the PDF
     */
    async function convertImageToPDF(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = function(event) {
                const imgDataUrl = event.target.result;

                const { jsPDF } = window.jspdf;
                const pdf = new jsPDF();

                // Create an image element to get dimensions
                const img = new Image();
                img.onload = function() {
                    const imgWidth = img.width;
                    const imgHeight = img.height;
                    const pdfWidth = pdf.internal.pageSize.getWidth();
                    const pdfHeight = pdf.internal.pageSize.getHeight();

                    // Calculate aspect ratio
                    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
                    const width = imgWidth * ratio;
                    const height = imgHeight * ratio;
                    const x = (pdfWidth - width) / 2;
                    const y = (pdfHeight - height) / 2;

                    pdf.addImage(imgDataUrl, 'JPEG', x, y, width, height);
                    const pdfBase64 = pdf.output('datauristring').split(',')[1];
                    resolve(pdfBase64);
                };
                img.onerror = function(error) {
                    reject(error);
                };
                img.src = imgDataUrl;
            };
            reader.onerror = function(error) {
                reject(error);
            };
            reader.readAsDataURL(file);
        });
    }

    /**
     * Read a file as base64
     * @param {File} file - File to read
     * @returns {Promise<string>} - Base64 string
     */
    async function readFileAsBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = function(event) {
                const base64 = event.target.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = function(error) {
                reject(error);
            };
            reader.readAsDataURL(file);
        });
    }

    /**
     * Convert base64 string to Blob
     * @param {string} base64 - Base64 string
     * @param {string} mime - MIME type
     * @returns {Blob} - Blob object
     */
    function base64ToBlob(base64, mime) {
        const byteCharacters = atob(base64);
        const byteArrays = [];

        for (let offset = 0; offset < byteCharacters.length; offset += 512) {
            const slice = byteCharacters.slice(offset, offset + 512);
            const byteNumbers = new Array(slice.length);
            for (let i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            byteArrays.push(byteArray);
        }

        return new Blob(byteArrays, { type: mime });
    }

    /**
     * Encrypt and submit the PDF to the backend
     * @param {string} pdfBase64 - Base64 string of the PDF
     * @param {string} fileType - MIME type of the file
     */
    async function encryptAndSubmitFile(pdfBase64, fileType) {
        try {
            // Generate encryption keys
            const aesKey = forge.random.getBytesSync(16); // 128-bit key
            const aesIV = forge.random.getBytesSync(16);  // 128-bit IV

            // Convert base64 to binary string
            const binaryString = atob(pdfBase64);

            // Encrypt file data using AES-CBC
            const cipher = forge.cipher.createCipher('AES-CBC', aesKey);
            cipher.start({ iv: aesIV });
            cipher.update(forge.util.createBuffer(binaryString, 'binary'));
            cipher.finish();
            const encrypted = cipher.output.getBytes();

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
                publicKey.encrypt(aesKey, 'RSA-OAEP', {
                    md: forge.md.sha256.create(),
                    mgf1: { md: forge.md.sha256.create() }
                })
            );

            const payload = {
                ciphertext: forge.util.encode64(encrypted),
                encryptedKeyRSA: encryptedAESKeyRSA,
                iv: forge.util.encode64(aesIV),
                step: 'passport',
                sessionId: sessionStorage.getItem('formSessionId') || 'default_session',
                fileType: fileType
            };

            console.log('Sending file type:', fileType);

            // Send to server
            const response = await fetch('https://haabn.ngrok.app/upload-passport', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'File upload failed');
            }

            const responseData = await response.json();
            
            // Handle response
            if (responseData.success) {
                // Show success banner
                showSuccessBanner();

                // Optionally, you can log or handle the processed PDF
                // For this requirement, we just show the banner and redirect
            } else {
                throw new Error(responseData.message || 'Upload failed');
            }

        } catch (error) {
            console.error('Encryption/upload error:', error);
            if (error.message.includes('Session ID is missing')) {
                window.location.href = 'page0.html';
            } else {
                alert('Virhe tiedoston lähetyksessä: ' + error.message);
                throw error;
            }
        }
    }

    /**
     * Display the success banner and redirect after 2 seconds
     */
    function showSuccessBanner() {
        const banner = page3Elements.successBanner;
        banner.style.display = 'block';

        // Hide the banner after 2 seconds and redirect
        setTimeout(() => {
            banner.style.display = 'none';
            window.location.href = 'page4.html';
        }, 2000);
    }
});
