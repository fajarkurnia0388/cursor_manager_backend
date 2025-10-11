// Bypass Delete Account Content Script
// Specifically designed for Cursor account deletion bypass
// Auto-sequential testing with automatic retry

(function() {
  'use strict';

  const BypassDelete = {
    
    // Try to bypass the delete confirmation with automatic sequential testing
    async executeBypass() {
      console.log('[Bypass Delete] Starting automatic sequential bypass testing...');
      
      const techniques = [
        { name: 'Fill & Click', method: this.tryFillAndClick },
        { name: 'Force Enable', method: this.tryForceEnable },
        { name: 'React Manipulation', method: this.tryReactManipulation },
        { name: 'Event Injection', method: this.tryEventInjection },
        { name: 'Prototype Override', method: this.tryPrototypeOverride },
        { name: 'DOM Mutation', method: this.tryDOMMutation },
        { name: 'Console Injection', method: this.tryConsoleInjection },
        { name: 'API Direct Call', method: this.tryAPIDirectCall },
        { name: 'Form Submit', method: this.tryFormSubmit },
        { name: 'Storage Bypass', method: this.tryStorageBypass }
      ];
      
      let results = [];
      
      // Wait for modal to be ready
      await this.waitForModal();
      
      for (let i = 0; i < techniques.length; i++) {
        const technique = techniques[i];
        console.log(`[Bypass Delete] Testing technique ${i + 1}/${techniques.length}: ${technique.name}`);
        
        try {
          // Reset modal state before each attempt
          await this.resetModalState();
          
          // Execute technique
          const result = await technique.method.call(this);
          result.technique = technique.name;
          results.push(result);
          
          // Report progress
          chrome.runtime.sendMessage({
            type: 'bypassProgress',
            current: i + 1,
            total: techniques.length,
            result: result
          });
          
          // Check if delete was successful
          if (result.status === 'success') {
            console.log(`[Bypass Delete] SUCCESS with technique: ${technique.name}`);
            // Wait to see if modal closes or confirmation appears
            await this.delay(2000);
          }
          
          // Wait between attempts
          await this.delay(1000);
          
        } catch (error) {
          console.error(`[Bypass Delete] Technique ${technique.name} failed:`, error);
          results.push({
            technique: technique.name,
            status: 'failed',
            error: error.message
          });
        }
      }
      
      console.log('[Bypass Delete] All techniques tested. Results:', results);
      return results;
    },
    
    // Wait for modal to be ready
    async waitForModal() {
      console.log('[Bypass Delete] Waiting for delete modal...');
      
      for (let i = 0; i < 10; i++) {
        const modal = document.querySelector('[class*="Delete Account"]') || 
                      document.querySelector('p:contains("Delete Account")');
        if (modal) {
          console.log('[Bypass Delete] Modal found!');
          return true;
        }
        await this.delay(500);
      }
      
      console.log('[Bypass Delete] Modal not found, continuing anyway...');
      return false;
    },
    
    // Reset modal state
    async resetModalState() {
      // Clear any input values
      const inputs = document.querySelectorAll('input[type="text"]');
      inputs.forEach(input => {
        if (input.placeholder && input.placeholder.toLowerCase().includes('delete')) {
          input.value = '';
        }
      });
    },
    
    // Utility delay function
    delay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    },
    
    // Technique 1: Fill input and click delete button
    async tryFillAndClick() {
      console.log('[Bypass] Technique 1: Fill & Click');
      
      try {
        // Find input field
        const input = document.querySelector('input[placeholder*="Delete" i]') || 
                     document.querySelector('input[type="text"]');
        
        if (input) {
          // Fill the input with "Delete"
          input.value = 'Delete';
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          
          await this.delay(500);
          
          // Find and click delete button
          const deleteBtn = this.findDeleteButton();
          if (deleteBtn) {
            deleteBtn.disabled = false;
            deleteBtn.removeAttribute('aria-disabled');
            deleteBtn.click();
            
            return {
              status: 'success',
              description: 'Filled input with "Delete" and clicked button'
            };
          }
        }
        
        return {
          status: 'failed',
          description: 'Could not find input or button'
        };
      } catch (error) {
        return {
          status: 'failed',
          description: error.message
        };
      }
    },
    
    // Technique 2: Force enable delete button
    async tryForceEnable() {
      console.log('[Bypass] Technique 2: Force Enable');
      
      try {
        // First fill the input
        const input = document.querySelector('input[placeholder*="Delete" i]');
        if (input) {
          input.value = 'Delete';
          
          // Force React to recognize the value
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            'value'
          ).set;
          nativeInputValueSetter.call(input, 'Delete');
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
        
        await this.delay(500);
        
        // Force enable the button
        const deleteBtn = this.findDeleteButton();
        if (deleteBtn) {
          // Remove all disabling attributes
          deleteBtn.disabled = false;
          deleteBtn.removeAttribute('disabled');
          deleteBtn.removeAttribute('aria-disabled');
          deleteBtn.setAttribute('aria-disabled', 'false');
          
          // Remove disabling classes
          deleteBtn.classList.remove('disabled', 'opacity-50', 'pointer-events-none');
          
          // Force style changes
          deleteBtn.style.pointerEvents = 'auto';
          deleteBtn.style.opacity = '1';
          deleteBtn.style.cursor = 'pointer';
          
          // Click the button
          deleteBtn.click();
          
          return {
            status: 'success',
            description: 'Force enabled and clicked delete button'
          };
        }
        
        return {
          status: 'failed',
          description: 'Delete button not found'
        };
      } catch (error) {
        return {
          status: 'failed',
          description: error.message
        };
      }
    },
    
    // Technique 2: Form manipulation
    tryFormManipulation() {
      console.log('[Bypass] Trying form manipulation...');
      
      // Find the confirmation input
      const inputs = document.querySelectorAll('input[placeholder*="Delete"]');
      
      if (inputs.length > 0) {
        inputs.forEach(input => {
          // Set value directly
          input.value = 'Delete';
          
          // Trigger events
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          
          // Force React update
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            'value'
          ).set;
          nativeInputValueSetter.call(input, 'Delete');
          input.dispatchEvent(new Event('input', { bubbles: true }));
        });
        
        // Now try to enable delete button
        setTimeout(() => {
          const deleteBtn = Array.from(document.querySelectorAll('button')).find(
            btn => btn.textContent === 'Delete' && btn !== document.querySelector('button:has(+ button)')
          );
          
          if (deleteBtn) {
            deleteBtn.disabled = false;
            deleteBtn.removeAttribute('aria-disabled');
            deleteBtn.click();
          }
        }, 100);
        
        return {
          technique: 'Form Manipulation',
          status: 'success',
          description: 'Filled confirmation and attempted delete'
        };
      }
      
      return {
        technique: 'Form Manipulation',
        status: 'failed',
        description: 'Confirmation input not found'
      };
    },
    
    // Technique 3: Enable button directly
    tryButtonEnable() {
      console.log('[Bypass] Trying button enable...');
      
      const buttons = document.querySelectorAll('button[disabled], button[aria-disabled="true"]');
      let found = false;
      
      buttons.forEach(btn => {
        if (btn.textContent.includes('Delete')) {
          btn.disabled = false;
          btn.removeAttribute('aria-disabled');
          btn.setAttribute('aria-disabled', 'false');
          btn.classList.remove('disabled', 'opacity-50');
          btn.style.pointerEvents = 'auto';
          btn.style.opacity = '1';
          found = true;
          
          // Try clicking
          btn.click();
        }
      });
      
      return {
        technique: 'Button Enable',
        status: found ? 'success' : 'failed',
        description: found ? 'Enabled delete button' : 'No disabled delete button found'
      };
    },
    
    // Technique 4: Input bypass
    tryInputBypass() {
      console.log('[Bypass] Trying input bypass...');
      
      // Remove input requirement
      const inputs = document.querySelectorAll('input[type="text"]');
      let bypassed = false;
      
      inputs.forEach(input => {
        if (input.placeholder && input.placeholder.toLowerCase().includes('delete')) {
          // Remove all validation
          input.removeAttribute('required');
          input.removeAttribute('pattern');
          input.removeAttribute('minlength');
          
          // Set value using multiple methods
          input.value = 'Delete';
          input.setAttribute('value', 'Delete');
          input.defaultValue = 'Delete';
          
          // Fake validation
          input.setCustomValidity('');
          
          bypassed = true;
        }
      });
      
      return {
        technique: 'Input Bypass',
        status: bypassed ? 'partial' : 'failed',
        description: bypassed ? 'Bypassed input validation' : 'No validation input found'
      };
    },
    
    // Technique 5: Modal manipulation
    tryModalBypass() {
      console.log('[Bypass] Trying modal bypass...');
      
      // Find modal container
      const modals = document.querySelectorAll('[class*="modal"], [class*="dialog"], div[class*="relative"][class*="flex"][class*="flex-col"]');
      
      if (modals.length > 0) {
        modals.forEach(modal => {
          // Look for delete functionality within modal
          const deleteBtn = modal.querySelector('button:last-child');
          if (deleteBtn && deleteBtn.textContent.includes('Delete')) {
            deleteBtn.disabled = false;
            deleteBtn.click();
            
            return {
              technique: 'Modal Bypass',
              status: 'success',
              description: 'Found and clicked delete in modal'
            };
          }
        });
      }
      
      return {
        technique: 'Modal Bypass',
        status: 'failed',
        description: 'No modal with delete found'
      };
    },
    
    // Technique 6: Direct API call
    async tryAPIDirectCall() {
      console.log('[Bypass] Trying direct API call...');
      
      try {
        // Try to find API endpoint
        const response = await fetch('https://cursor.com/api/dashboard/delete-account', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include'
        });
        
        return {
          technique: 'Direct API Call',
          status: response.ok ? 'success' : 'partial',
          description: `API responded with status ${response.status}`
        };
      } catch (error) {
        return {
          technique: 'Direct API Call',
          status: 'failed',
          description: error.message
        };
      }
    },
    
    // Technique 7: Console execution
    tryConsoleExecution() {
      console.log('[Bypass] Trying console execution...');
      
      // Try to execute delete via console
      try {
        // Find React component
        const deleteBtn = document.querySelector('button:last-child');
        if (deleteBtn && deleteBtn.textContent.includes('Delete')) {
          const reactKey = Object.keys(deleteBtn).find(key => key.startsWith('__react'));
          if (reactKey) {
            const reactComponent = deleteBtn[reactKey];
            if (reactComponent && reactComponent.onClick) {
              reactComponent.onClick();
              return {
                technique: 'Console Execution',
                status: 'success',
                description: 'Executed React onClick handler'
              };
            }
          }
        }
      } catch (error) {
        console.error('Console execution failed:', error);
      }
      
      return {
        technique: 'Console Execution',
        status: 'failed',
        description: 'Could not execute via console'
      };
    },
    
    // Technique 8: Event dispatch
    tryEventDispatch() {
      console.log('[Bypass] Trying event dispatch...');
      
      const deleteBtn = Array.from(document.querySelectorAll('button')).find(
        btn => btn.textContent === 'Delete' && !btn.previousElementSibling?.textContent.includes('Cancel')
      );
      
      if (deleteBtn) {
        // Create and dispatch multiple events
        const events = ['click', 'mousedown', 'mouseup', 'pointerdown', 'pointerup'];
        
        events.forEach(eventType => {
          const event = new MouseEvent(eventType, {
            view: window,
            bubbles: true,
            cancelable: true,
            buttons: 1
          });
          deleteBtn.dispatchEvent(event);
        });
        
        return {
          technique: 'Event Dispatch',
          status: 'partial',
          description: 'Dispatched multiple events to delete button'
        };
      }
      
      return {
        technique: 'Event Dispatch',
        status: 'failed',
        description: 'Delete button not found'
      };
    },
    
    // Technique 9: Prototype override
    tryPrototypeOverride() {
      console.log('[Bypass] Trying prototype override...');
      
      try {
        // Override disabled property
        const originalDescriptor = Object.getOwnPropertyDescriptor(HTMLButtonElement.prototype, 'disabled');
        Object.defineProperty(HTMLButtonElement.prototype, 'disabled', {
          get: function() { return false; },
          set: function() { return false; }
        });
        
        // Find and click delete
        const deleteBtn = Array.from(document.querySelectorAll('button')).find(
          btn => btn.textContent === 'Delete'
        );
        
        if (deleteBtn) {
          deleteBtn.click();
        }
        
        // Restore original
        if (originalDescriptor) {
          Object.defineProperty(HTMLButtonElement.prototype, 'disabled', originalDescriptor);
        }
        
        return {
          technique: 'Prototype Override',
          status: 'partial',
          description: 'Overrode button disabled property'
        };
      } catch (error) {
        return {
          technique: 'Prototype Override',
          status: 'failed',
          description: error.message
        };
      }
    },
    
    // Technique 10: Storage manipulation
    tryStorageManipulation() {
      console.log('[Bypass] Trying storage manipulation...');
      
      try {
        // Set flags that might bypass confirmation
        localStorage.setItem('deleteConfirmed', 'true');
        localStorage.setItem('skipDeleteConfirmation', 'true');
        sessionStorage.setItem('deleteConfirmed', 'true');
        sessionStorage.setItem('skipDeleteConfirmation', 'true');
        
        // Try to find and click delete again
        const deleteBtn = Array.from(document.querySelectorAll('button')).find(
          btn => btn.textContent === 'Delete'
        );
        
        if (deleteBtn) {
          deleteBtn.disabled = false;
          deleteBtn.click();
        }
        
        return {
          technique: 'Storage Manipulation',
          status: 'partial',
          description: 'Set storage flags for delete confirmation'
        };
      } catch (error) {
        return {
          technique: 'Storage Manipulation',
          status: 'failed',
          description: error.message
        };
      }
    }
  };
  
  // Listen for messages
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'executeDeleteBypass') {
      console.log('[Bypass Delete] Received execute command');
      
      BypassDelete.executeBypass().then(results => {
        sendResponse({ success: true, results: results });
      }).catch(error => {
        sendResponse({ success: false, error: error.message });
      });
      
      return true; // Keep channel open
    }
  });
  
  console.log('[Bypass Delete] Content script loaded');
  
  // Auto-detect delete modal
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.addedNodes.length) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) { // Element node
            const deleteModal = node.querySelector?.('[class*="Delete Account"]') || 
                               (node.textContent?.includes('Delete Account'));
            if (deleteModal) {
              console.log('[Bypass Delete] Delete modal detected!');
              chrome.runtime.sendMessage({
                type: 'deleteModalDetected',
                url: window.location.href
              });
            }
          }
        });
      }
    });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
})();
