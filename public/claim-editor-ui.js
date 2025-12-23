/**
 * UAE Claim Editor UI Module
 * Interactive drawer for claim review and XML export
 */

class UAEClaimEditor {
    constructor() {
        this.currentClaim = null;
        this.validationResult = null;
        this.init();
    }

    init() {
        // Create drawer HTML if not exists
        if (!document.getElementById('claimEditorDrawer')) {
            this.createDrawerHTML();
        }

        // Attach event listeners
        this.attachEventListeners();
    }

    createDrawerHTML() {
        const drawerHTML = `
          <!-- UAE Claim Editor Drawer -->
          <div id="claimEditorDrawer" class="fixed inset-y-0 right-0 w-full md:w-2/3 lg:w-1/2 bg-white shadow-2xl transform translate-x-full transition-transform duration-300 z-50 overflow-hidden flex flex-col">
            <!-- Use the structure from previous artifact -->
            <div class="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-4 flex justify-between items-center">
              <div>
                <h2 class="text-xl font-bold flex items-center gap-2">
                  <i class="fa-solid fa-file-export"></i> UAE Claim Editor
                </h2>
                <p class="text-sm text-emerald-100 mt-0.5">Review & Export XML</p>
              </div>
              <button id="closeClaimEditor" class="p-2 hover:bg-white/20 rounded-lg transition-colors">
                <i class="fa-solid fa-times text-xl"></i>
              </button>
            </div>
            <div id="validationStatus" class="hidden"></div>
            <div class="flex-1 overflow-y-auto p-6" id="claimEditorContent">
              <!-- Content will be populated -->
            </div>
            <div class="border-t border-slate-200 p-4 bg-white">
              <div class="flex flex-col gap-3">
                <div class="flex items-center gap-2">
                  <label class="text-sm font-medium text-slate-700">Region:</label>
                  <select id="xmlRegion" class="px-3 py-1.5 border border-slate-300 rounded-lg text-sm">
                    <option value="abudhabi">Abu Dhabi (Shafafiya)</option>
                    <option value="dubai">Dubai (e-ClaimLink)</option>
                  </select>
                  <label class="flex items-center gap-2 ml-4">
                    <input type="checkbox" id="isProduction" class="rounded border-slate-300">
                    <span class="text-sm font-medium text-slate-700">Production Mode</span>
                  </label>
                </div>
                <div class="flex gap-2">
                  <button id="validateClaimBtn" class="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
                    <i class="fa-solid fa-check-circle"></i> Validate Claim
                  </button>
                  <button id="downloadXMLBtn" disabled class="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    <i class="fa-solid fa-download"></i> Download XML
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div id="claimEditorOverlay" class="fixed inset-0 bg-black/50 z-40 hidden"></div>
        `;

        document.body.insertAdjacentHTML('beforeend', drawerHTML);
    }

    attachEventListeners() {
        document.getElementById('closeClaimEditor')?.addEventListener('click', () => this.close());
        document.getElementById('claimEditorOverlay')?.addEventListener('click', () => this.close());
        document.getElementById('validateClaimBtn')?.addEventListener('click', () => this.validateClaim());
        document.getElementById('downloadXMLBtn')?.addEventListener('click', () => this.downloadXML());
    }

    open(encodingResult) {
        // Extract claim data from encoding result
        this.currentClaim = this.buildClaimFromEncoding(encodingResult);

        // Populate fields
        this.populateClaimEditor();

        // Show drawable
        const drawer = document.getElementById('claimEditorDrawer');
        const overlay = document.getElementById('claimEditorOverlay');

        drawer.classList.remove('translate-x-full');
        overlay.classList.remove('hidden');

        // Auto-validate on open
        setTimeout(() => this.validateClaim(), 300);
    }

    close() {
        const drawer = document.getElementById('claimEditorDrawer');
        const overlay = document.getElementById('claimEditorOverlay');

        drawer.classList.add('translate-x-full');
        overlay.classList.add('hidden');
    }

    buildClaimFromEncoding(result) {
        const today = new Date();
        const ddmmyyyy = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

        return {
            patient: {
                emiratesID: '',
                memberID: '',
                birthDate: '',
                gender: '',
                name: ''
            },
            provider: {
                senderID: '',
                clinicianID: '',
                clinicianName: ''
            },
            financial: {
                net: 0,
                currency: 'AED'
            },
            encounterType: '1', // Default: Outpatient
            encounterDate: ddmmyyyy,
            diagnoses: this.extractDiagnoses(result),
            activities: this.extractActivities(result)
        };
    }

    extractDiagnoses(result) {
        const diagnoses = [];

        if (result.primary) {
            diagnoses.push({
                code: result.primary,
                description: result.primaryDescription || 'Primary diagnosis',
                sequence: 1,
                type: 'principal'
            });
        }

        if (result.secondary && Array.isArray(result.secondary)) {
            result.secondary.forEach((sec, index) => {
                diagnoses.push({
                    code: sec.code || sec,
                    description: sec.description || 'Secondary diagnosis',
                    sequence: index + 2,
                    type: 'secondary'
                });
            });
        }

        return diagnoses;
    }

    extractActivities(result) {
        // If CPT codes exist in result, extract them
        // This is a placeholder - actual implementation depends on your data structure
        const activities = [];

        // Default: link all diagnoses to first activity
        if (activities.length === 0 && result.primary) {
            activities.push({
                code: '99213',  // Example CPT code
                description: 'Office visit',
                quantity: 1,
                net: 0,
                diagnosisCodeReference: [1], // Links to primary diagnosis
                modifiers: []
            });
        }

        return activities;
    }

    populateClaimEditor() {
        const content = document.getElementById('claimEditorContent');
        const claim = this.currentClaim;

        content.innerHTML = `
          <!-- Patient -->
          <div class="mb-6">
            <h3 class="text-lg font-bold mb-3"><i class="fa-solid fa-user text-blue-500"></i> Patient</h3>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium mb-1">Emirates ID <span class="text-red-500">*</span></label>
                <input type="text" id="emiratesID" placeholder="784-XXXX-XXXXXXX-X" class="w-full px-3 py-2 border rounded-lg" value="${claim.patient.emiratesID}">
              </div>
              <div>
                <label class="block text-sm font-medium mb-1">Member ID <span class="text-red-500">*</span></label>
                <input type="text" id="memberID" placeholder="Insurance Card" class="w-full px-3 py-2 border rounded-lg" value="${claim.patient.memberID}">
              </div>
              <div>
                <label class="block text-sm font-medium mb-1">Birth Date <span class="text-red-500">*</span></label>
                <input type="text" id="birthDate" placeholder="DD/MM/YYYY" class="w-full px-3 py-2 border rounded-lg" value="${claim.patient.birthDate}">
              </div>
              <div>
                <label class="block text-sm font-medium mb-1">Gender <span class="text-red-500">*</span></label>
                <select id="gender" class="w-full px-3 py-2 border rounded-lg">
                  <option value="">Select...</option>
                  <option value="M" ${claim.patient.gender === 'M' ? 'selected' : ''}>Male</option>
                  <option value="F" ${claim.patient.gender === 'F' ? 'selected' : ''}>Female</option>
                </select>
              </div>
            </div>
          </div>
          
          <!-- Provider -->
          <div class="mb-6">
            <h3 class="text-lg font-bold mb-3"><i class="fa-solid fa-hospital text-blue-500"></i> Provider</h3>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium mb-1">Facility License <span class="text-red-500">*</span></label>
                <input type="text" id="senderID" placeholder="License Number" class="w-full px-3 py-2 border rounded-lg" value="${claim.provider.senderID}">
              </div>
              <div>
                <label class="block text-sm font-medium mb-1">Doctor License <span class="text-red-500">*</span></label>
                <input type="text" id="clinicianID" placeholder="License Number" class="w-full px-3 py-2 border rounded-lg" value="${claim.provider.clinicianID}">
              </div>
            </div>
          </div>
          
          <!-- Financial -->
          <div class="mb-6">
            <h3 class="text-lg font-bold mb-3"><i class="fa-solid fa-money-bill text-green-500"></i> Financial</h3>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium mb-1">Net Amount <span class="text-red-500">*</span></label>
                <input type="number" id="net" step="0.01" placeholder="0.00" class="w-full px-3 py-2 border rounded-lg" value="${claim.financial.net}">
              </div>
              <div>
                <label class="block text-sm font-medium mb-1">Currency</label>
                <input type="text" value="AED" readonly class="w-full px-3 py-2 border rounded-lg bg-slate-100">
              </div>
            </div>
          </div>
          
          <!-- Encounter -->
          <div class="mb-6">
            <h3 class="text-lg font-bold mb-3"><i class="fa-solid fa-calendar-check text-purple-500"></i> Encounter</h3>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium mb-1">Type <span class="text-red-500">*</span></label>
                <select id="encounterType" class="w-full px-3 py-2 border rounded-lg">
                  <option value="1" ${claim.encounterType === '1' ? 'selected' : ''}>Outpatient</option>
                  <option value="2" ${claim.encounterType === '2' ? 'selected' : ''}>Inpatient</option>
                  <option value="3" ${claim.encounterType === '3' ? 'selected' : ''}>Emergency</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium mb-1">Date <span class="text-red-500">*</span></label>
                <input type="text" id="encounterDate" placeholder="DD/MM/YYYY" class="w-full px-3 py-2 border rounded-lg" value="${claim.encounterDate}">
              </div>
            </div>
          </div>
          
          <!-- Diagnoses -->
          <div class="mb-6">
            <h3 class="text-lg font-bold mb-3"><i class="fa-solid fa-notes-medical text-red-500"></i> Diagnoses</h3>
            <div class="space-y-2">
              ${claim.diagnoses.map(d => `
                <div class="flex items-center gap-2 p-2 bg-slate-50 rounded">
                  <span class="font-mono text-sm font-bold">${d.code}</span>
                  <span class="text-sm text-slate-600">${d.description}</span>
                  <span class="text-xs px-2 py-0.5 rounded-full ${d.type === 'principal' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}">${d.type}</span>
                </div>
              `).join('')}
            </div>
          </div>
        `;

        // Add real-time validation on input change
        content.querySelectorAll('input, select').forEach(input => {
            input.addEventListener('change', () => this.validateClaim());
        });
    }

    async validateClaim() {
        // Gather current values
        const claim = {
            patient: {
                emiratesID: document.getElementById('emiratesID')?.value || '',
                memberID: document.getElementById('memberID')?.value || '',
                birthDate: document.getElementById('birthDate')?.value || '',
                gender: document.getElementById('gender')?.value || ''
            },
            provider: {
                senderID: document.getElementById('senderID')?.value || '',
                clinicianID: document.getElementById('clinicianID')?.value || ''
            },
            financial: {
                net: parseFloat(document.getElementById('net')?.value || 0),
                currency: 'AED'
            },
            encounterType: document.getElementById('encounterType')?.value || '',
            encounterDate: document.getElementById('encounterDate')?.value || '',
            diagnoses: this.currentClaim.diagnoses,
            activities: this.currentClaim.activities
        };

        try {
            // Call validation API
            const response = await fetch('/api/claim-export/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(claim)
            });

            const result = await response.json();
            this.validationResult = result.validation;

            // Update UI
            this.displayValidationStatus();

        } catch (error) {
            console.error('Validation failed:', error);
            this.showError('Validation failed. Please try again.');
        }
    }

    displayValidationStatus() {
        const statusDiv = document.getElementById('validationStatus');
        const downloadBtn = document.getElementById('downloadXMLBtn');
        const validation = this.validationResult;

        if (!validation) return;

        statusDiv.classList.remove('hidden');

        if (validation.isValid) {
            // Green state
            statusDiv.className = 'p-4 bg-green-50 border-l-4 border-green-500';
            statusDiv.innerHTML = `
              <div class="flex items-center gap-2">
                <i class="fa-solid fa-check-circle text-green-600 text-xl"></i>
                <div>
                  <p class="font-bold text-green-900">${validation.message}</p>
                  <p class="text-sm text-green-700">Ready to download XML</p>
                </div>
              </div>
            `;
            downloadBtn.disabled = false;
        } else {
            // Red state
            statusDiv.className = 'p-4 bg-red-50 border-l-4 border-red-500';
            statusDiv.innerHTML = `
              <div class="flex items-center gap-2">
                <i class="fa-solid fa-exclamation-triangle text-red-600 text-xl"></i>
                <div>
                  <p class="font-bold text-red-900">${validation.message}</p>
                  <ul class="text-sm text-red-700 mt-2 space-y-1">
                    ${validation.errors.map(e => `<li>• ${e.error || e.message}</li>`).join('')}
                  </ul>
                </div>
              </div>
            `;
            downloadBtn.disabled = true;
        }
    }

    async downloadXML() {
        if (!this.validationResult || !this.validationResult.isValid) {
            alert('Please fix validation errors first');
            return;
        }

        // Gather final claim data
        const claim = {
            patient: {
                emiratesID: document.getElementById('emiratesID').value,
                memberID: document.getElementById('memberID').value,
                birthDate: document.getElementById('birthDate').value,
                gender: document.getElementById('gender').value,
                name: document.getElementById('patientName')?.value || 'PATIENT NAME'
            },
            provider: {
                senderID: document.getElementById('senderID').value,
                clinicianID: document.getElementById('clinicianID').value,
                clinicianName: document.getElementById('clinicianName')?.value || 'DOCTOR NAME'
            },
            financial: {
                net: parseFloat(document.getElementById('net').value),
                currency: 'AED'
            },
            encounterType: document.getElementById('encounterType').value,
            encounterDate: document.getElementById('encounterDate').value,
            diagnoses: this.currentClaim.diagnoses,
            activities: this.currentClaim.activities
        };

        const region = document.getElementById('xmlRegion').value;
        const isProduction = document.getElementById('isProduction').checked;

        try {
            const response = await fetch('/api/claim-export/generate-xml', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    claims: [claim],
                    region,
                    isProduction
                })
            });

            const result = await response.json();

            if (result.success) {
                // Download XML
                this.triggerDownload(result.xml, result.filename);

                // Show success
                alert(`✅ XML downloaded successfully!\n\nRegion: ${region}\nEnvironment: ${isProduction ? 'PRODUCTION' : 'TEST'}\nFilename: ${result.filename}`);

                // Close drawer
                this.close();
            } else {
                alert('XML generation failed: ' + (result.error || 'Unknown error'));
            }

        } catch (error) {
            console.error('XML download failed:', error);
            alert('XML download failed. Please try again.');
        }
    }

    triggerDownload(xmlContent, filename) {
        const blob = new Blob([xmlContent], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    showError(message) {
        alert(message);
    }
}

// Export for use in app.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UAEClaimEditor;
}

// Auto-initialize for browser
if (typeof window !== 'undefined') {
    window.UAEClaimEditor = UAEClaimEditor;
}
