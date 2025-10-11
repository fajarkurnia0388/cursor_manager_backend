/**
 * Bypass Settings Manager for Sidebar_C_Manager
 * Handles bypass testing configuration, presets, and storage
 */

class BypassSettingsManager {
    constructor() {
        this.storageKey = 'bypassSettings';
        this.presetsKey = 'bypassPresets';
        this.defaultSettings = {
            requestDelay: 500,
            timeout: 10,
            concurrency: 5,
            verboseLog: true,
            autoExport: false,
            defaultTechniques: {
                parameter: true,
                header: true,
                method: true,
                content: true,
                auth: true,
                storage: true,
                frontend: true,
                race: true,
                encoding: true,
                endpoint: true
            }
        };
        this.defaultPresets = [
            { id: '1', name: 'Cursor Dashboard', url: 'https://cursor.com/api/dashboard/delete-account' },
            { id: '2', name: 'Cursor Auth', url: 'https://cursor.com/api/auth/logout' },
            { id: '3', name: 'Cursor Settings', url: 'https://cursor.com/api/settings/update' }
        ];
        
        this.init();
    }

    async init() {
        await this.loadSettings();
        await this.loadPresets();
        this.setupEventListeners();
    }

    async loadSettings() {
        try {
            const stored = await chrome.storage.local.get(this.storageKey);
            this.settings = stored[this.storageKey] || this.defaultSettings;
            this.applySettingsToUI();
        } catch (error) {
            console.error('Error loading bypass settings:', error);
            this.settings = this.defaultSettings;
        }
    }

    async loadPresets() {
        try {
            const stored = await chrome.storage.local.get(this.presetsKey);
            this.presets = stored[this.presetsKey] || this.defaultPresets;
            this.renderPresets();
        } catch (error) {
            console.error('Error loading bypass presets:', error);
            this.presets = this.defaultPresets;
        }
    }

    async saveSettings() {
        try {
            await chrome.storage.local.set({ [this.storageKey]: this.settings });
            this.showNotification('Settings saved successfully!', 'success');
        } catch (error) {
            console.error('Error saving bypass settings:', error);
            this.showNotification('Failed to save settings', 'error');
        }
    }

    async savePresets() {
        try {
            await chrome.storage.local.set({ [this.presetsKey]: this.presets });
        } catch (error) {
            console.error('Error saving bypass presets:', error);
        }
    }

    applySettingsToUI() {
        // Apply advanced options
        document.getElementById('bypassRequestDelay').value = this.settings.requestDelay;
        document.getElementById('bypassTimeout').value = this.settings.timeout;
        document.getElementById('bypassConcurrency').value = this.settings.concurrency;
        document.getElementById('bypassVerboseLog').checked = this.settings.verboseLog;
        document.getElementById('bypassAutoExport').checked = this.settings.autoExport;

        // Apply default techniques
        const techniques = this.settings.defaultTechniques;
        document.getElementById('defaultTechParam').checked = techniques.parameter;
        document.getElementById('defaultTechHeader').checked = techniques.header;
        document.getElementById('defaultTechMethod').checked = techniques.method;
        document.getElementById('defaultTechContent').checked = techniques.content;
        document.getElementById('defaultTechAuth').checked = techniques.auth;
        document.getElementById('defaultTechStorage').checked = techniques.storage;
        document.getElementById('defaultTechFrontend').checked = techniques.frontend;
        document.getElementById('defaultTechRace').checked = techniques.race;
        document.getElementById('defaultTechEncoding').checked = techniques.encoding;
        document.getElementById('defaultTechEndpoint').checked = techniques.endpoint;

        // Apply default techniques to main bypass tab
        this.applyDefaultTechniques();
    }

    applyDefaultTechniques() {
        const techniques = this.settings.defaultTechniques;
        for (const [key, value] of Object.entries(techniques)) {
            const checkbox = document.querySelector(`#tech-${key}`);
            if (checkbox) {
                checkbox.checked = value;
            }
        }
        this.updateTotalTests();
    }

    updateTotalTests() {
        const testCounts = {
            parameter: 15,
            header: 15,
            method: 20,
            content: 9,
            auth: 6,
            storage: 20,
            frontend: 5,
            race: 10,
            encoding: 9,
            endpoint: 7
        };

        let total = 0;
        document.querySelectorAll('.technique-item input[type="checkbox"]:checked').forEach(checkbox => {
            const technique = checkbox.dataset.technique;
            if (testCounts[technique]) {
                total += testCounts[technique];
            }
        });

        const totalTestsElement = document.getElementById('bypassTotalTests');
        if (totalTestsElement) {
            totalTestsElement.textContent = `${total} tests selected`;
        }
    }

    renderPresets() {
        const container = document.getElementById('bypassPresetsList');
        if (!container) return;

        container.innerHTML = '';
        
        if (this.presets.length === 0) {
            container.innerHTML = '<p style="color: var(--text-secondary); font-size: 12px;">No presets saved</p>';
            return;
        }

        this.presets.forEach(preset => {
            const presetElement = document.createElement('div');
            presetElement.className = 'preset-item';
            presetElement.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 8px; background: var(--bg-tertiary); border-radius: 6px; margin-bottom: 8px;';
            
            presetElement.innerHTML = `
                <div style="flex: 1;">
                    <div style="font-weight: 500; font-size: 13px; color: var(--text-primary);">${preset.name}</div>
                    <div style="font-size: 11px; color: var(--text-secondary); word-break: break-all;">${preset.url}</div>
                </div>
                <div style="display: flex; gap: 4px;">
                    <button class="btn btn-sm use-preset-btn" data-url="${preset.url}" title="Use this preset">✅</button>
                    <button class="btn btn-sm delete-preset-btn" data-id="${preset.id}" title="Delete preset">🗑️</button>
                </div>
            `;
            
            container.appendChild(presetElement);
        });

        // Add event listeners for preset buttons
        container.querySelectorAll('.use-preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const url = e.target.dataset.url;
                document.getElementById('bypassTargetUrl').value = url;
                this.showNotification('Preset applied!', 'success');
                this.closeSettingsModal();
            });
        });

        container.querySelectorAll('.delete-preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                this.deletePreset(id);
            });
        });
    }

    addPreset() {
        const nameInput = document.getElementById('bypassPresetName');
        const urlInput = document.getElementById('bypassPresetUrl');
        
        const name = nameInput.value.trim();
        const url = urlInput.value.trim();
        
        if (!name || !url) {
            this.showNotification('Please enter both name and URL', 'error');
            return;
        }

        // Validate URL
        try {
            new URL(url);
        } catch (e) {
            this.showNotification('Invalid URL format', 'error');
            return;
        }

        const preset = {
            id: Date.now().toString(),
            name: name,
            url: url
        };

        this.presets.push(preset);
        this.savePresets();
        this.renderPresets();

        // Clear inputs
        nameInput.value = '';
        urlInput.value = '';
        
        this.showNotification('Preset added successfully!', 'success');
    }

    deletePreset(id) {
        this.presets = this.presets.filter(p => p.id !== id);
        this.savePresets();
        this.renderPresets();
        this.showNotification('Preset deleted', 'info');
    }

    setupEventListeners() {
        // Settings modal controls
        const settingsBtn = document.getElementById('bypassSettingsBtn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.openSettingsModal());
        }

        const closeBtn = document.getElementById('closeBypassSettingsModal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeSettingsModal());
        }

        const saveBtn = document.getElementById('saveBypassSettings');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveSettingsFromUI());
        }

        const resetBtn = document.getElementById('resetBypassSettings');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetSettings());
        }

        const cancelBtn = document.getElementById('cancelBypassSettings');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.closeSettingsModal());
        }

        // Add preset button
        const addPresetBtn = document.getElementById('addBypassPreset');
        if (addPresetBtn) {
            addPresetBtn.addEventListener('click', () => this.addPreset());
        }

        // Technique checkboxes in main tab
        document.querySelectorAll('.technique-item input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => this.updateTotalTests());
        });

        // Select all button
        const selectAllBtn = document.getElementById('bypassSelectAll');
        if (selectAllBtn) {
            selectAllBtn.addEventListener('click', () => this.toggleAllTechniques());
        }
    }

    toggleAllTechniques() {
        const checkboxes = document.querySelectorAll('.technique-item input[type="checkbox"]');
        const allChecked = Array.from(checkboxes).every(cb => cb.checked);
        
        checkboxes.forEach(checkbox => {
            checkbox.checked = !allChecked;
        });
        
        const selectAllBtn = document.getElementById('bypassSelectAll');
        if (selectAllBtn) {
            selectAllBtn.textContent = allChecked ? 'Select All' : 'Deselect All';
        }
        
        this.updateTotalTests();
    }

    saveSettingsFromUI() {
        // Gather settings from UI
        this.settings.requestDelay = parseInt(document.getElementById('bypassRequestDelay').value);
        this.settings.timeout = parseInt(document.getElementById('bypassTimeout').value);
        this.settings.concurrency = parseInt(document.getElementById('bypassConcurrency').value);
        this.settings.verboseLog = document.getElementById('bypassVerboseLog').checked;
        this.settings.autoExport = document.getElementById('bypassAutoExport').checked;

        // Gather default techniques
        this.settings.defaultTechniques = {
            parameter: document.getElementById('defaultTechParam').checked,
            header: document.getElementById('defaultTechHeader').checked,
            method: document.getElementById('defaultTechMethod').checked,
            content: document.getElementById('defaultTechContent').checked,
            auth: document.getElementById('defaultTechAuth').checked,
            storage: document.getElementById('defaultTechStorage').checked,
            frontend: document.getElementById('defaultTechFrontend').checked,
            race: document.getElementById('defaultTechRace').checked,
            encoding: document.getElementById('defaultTechEncoding').checked,
            endpoint: document.getElementById('defaultTechEndpoint').checked
        };

        this.saveSettings();
        this.applyDefaultTechniques();
        this.closeSettingsModal();
    }

    resetSettings() {
        if (confirm('Are you sure you want to reset all bypass settings to default?')) {
            this.settings = this.defaultSettings;
            this.presets = this.defaultPresets;
            this.saveSettings();
            this.savePresets();
            this.applySettingsToUI();
            this.renderPresets();
            this.showNotification('Settings reset to default', 'info');
        }
    }

    openSettingsModal() {
        const modal = document.getElementById('bypassSettingsModal');
        if (modal) {
            modal.style.display = 'block';
            this.loadSettings(); // Refresh settings
            this.loadPresets(); // Refresh presets
        }
    }

    closeSettingsModal() {
        const modal = document.getElementById('bypassSettingsModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        const notificationText = document.getElementById('notificationText');
        
        if (notification && notificationText) {
            notificationText.textContent = message;
            notification.className = `notification ${type}`;
            notification.style.display = 'block';
            
            setTimeout(() => {
                notification.classList.add('show');
            }, 10);
            
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => {
                    notification.style.display = 'none';
                }, 300);
            }, 3000);
        }
    }

    // Get current settings for bypass testing
    getSettings() {
        return this.settings;
    }

    // Get selected techniques from main tab
    getSelectedTechniques() {
        const techniques = [];
        document.querySelectorAll('.technique-item input[type="checkbox"]:checked').forEach(checkbox => {
            techniques.push(checkbox.dataset.technique);
        });
        return techniques;
    }
}

// Export for use in other scripts
window.BypassSettingsManager = BypassSettingsManager;
