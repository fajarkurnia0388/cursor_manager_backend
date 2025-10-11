// Bypass Delete Account - Automatic Sequential Testing
// Tests each technique automatically with fill & click

(function() {
  'use strict';

  const BypassDelete = {
    
    // Main execution function
    async executeBypass() {
      console.log('[Bypass Delete] Starting automatic sequential testing...');
      console.log('[Bypass Delete] Current URL:', window.location.href);
      
      const techniques = [
        { name: 'Fill & Click', method: this.tryFillAndClick },
        { name: 'Force Enable', method: this.tryForceEnable },
        { name: 'React Manipulation', method: this.tryReactManipulation },
        { name: 'Event Injection', method: this.tryEventInjection },
        { name: 'Remove Validation', method: this.tryRemoveValidation },
        { name: 'DOM Mutation', method: this.tryDOMMutation },
        { name: 'Console Injection', method: this.tryConsoleInjection },
        { name: 'Prototype Override', method: this.tryPrototypeOverride },
        { name: 'Direct Submit', method: this.tryDirectSubmit },
        { name: 'Multiple Clicks', method: this.tryMultipleClicks }
      ];
      
      let results = [];
      
      // Wait for page to be ready
      console.log('[Bypass Delete] Waiting for page to load...');
      await this.delay(3000);
      
      // Open delete modal if needed
      const modalOpened = await this.openDeleteModal();
      
      if (!modalOpened && !this.isModalOpen()) {
        console.error('[Bypass Delete] CRITICAL: Could not open delete modal!');
        console.log('[Bypass Delete] Please manually click "Delete Account" button');
        await this.delay(5000); // Give user time to manually open
      }
      
      for (let i = 0; i < techniques.length; i++) {
        const technique = techniques[i];
        console.log(`\n[Bypass] Testing Technique ${i + 1}/${techniques.length}: ${technique.name}`);
        console.log('='.repeat(50));
        
        try {
          // Execute technique
          const result = await technique.method.call(this);
          result.technique = technique.name;
          results.push(result);
          
          console.log(`[Bypass] Result: ${result.status} - ${result.description}`);
          
          // Report progress
          chrome.runtime.sendMessage({
            type: 'bypassProgress',
            current: i + 1,
            total: techniques.length,
            result: result
          });
          
          // If success, wait to see result
          if (result.status === 'success') {
            console.log(`✅ SUCCESS with: ${technique.name}`);
            await this.delay(3000);
            
            // Check if modal is still open
            if (!this.isModalOpen()) {
              console.log('Modal closed - deletion might be successful!');
              break;
            }
          }
          
          // Wait between attempts
          await this.delay(1500);
          
        } catch (error) {
          console.error(`❌ Error in ${technique.name}:`, error);
          results.push({
            technique: technique.name,
            status: 'failed',
            description: error.message
          });
        }
      }
      
      console.log('\n[Bypass Delete] Testing complete. Summary:');
      results.forEach((r, i) => {
        console.log(`${i + 1}. ${r.technique}: ${r.status}`);
      });
      
      return results;
    },
    
    // Helper: Find delete button (improved)
    findDeleteButton() {
      console.log('[Helper] Looking for delete button...');
      
      // Method 1: Find button with exact text "Delete"
      const allButtons = Array.from(document.querySelectorAll('button'));
      
      // First try: exact match "Delete"
      let deleteBtn = allButtons.find(btn => {
        const text = btn.textContent.trim();
        return text === 'Delete' && !btn.textContent.includes('Account');
      });
      
      if (deleteBtn) {
        console.log('[Helper] Found delete button by exact match');
        return deleteBtn;
      }
      
      // Method 2: Find button with span containing "Delete"
      deleteBtn = document.querySelector('button span.relative.z-10')?.closest('button');
      if (deleteBtn && deleteBtn.textContent.includes('Delete')) {
        console.log('[Helper] Found delete button by span');
        return deleteBtn;
      }
      
      // Method 3: Find last button in modal (often the delete button)
      const modal = document.querySelector('div[class*="modal"], div[class*="dialog"], div[class*="relative"][class*="flex"][class*="flex-col"]');
      if (modal) {
        const modalButtons = modal.querySelectorAll('button');
        if (modalButtons.length >= 2) {
          deleteBtn = modalButtons[modalButtons.length - 1]; // Last button
          if (deleteBtn.textContent.includes('Delete')) {
            console.log('[Helper] Found delete button as last in modal');
            return deleteBtn;
          }
        }
      }
      
      // Method 4: Find by aria-disabled="false" or aria-disabled="true"
      deleteBtn = document.querySelector('button[aria-disabled]');
      if (deleteBtn && deleteBtn.textContent.includes('Delete') && !deleteBtn.textContent.includes('Account')) {
        console.log('[Helper] Found delete button by aria-disabled');
        return deleteBtn;
      }
      
      console.log('[Helper] Delete button not found');
      return null;
    },
    
    // Helper: Find and fill input
    findAndFillInput() {
      console.log('[Helper] Looking for input field...');
      
      // Method 1: Find by placeholder
      let input = document.querySelector('input[placeholder*="Delete" i], input[placeholder*="Type" i]');
      
      // Method 2: Find any text input in modal
      if (!input) {
        const modal = document.querySelector('div[class*="modal"], div[class*="dialog"], div[class*="relative"][class*="flex"][class*="flex-col"]');
        if (modal) {
          input = modal.querySelector('input[type="text"]');
        }
      }
      
      // Method 3: Find any visible text input
      if (!input) {
        const inputs = document.querySelectorAll('input[type="text"]');
        for (const i of inputs) {
          const rect = i.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            input = i;
            break;
          }
        }
      }
      
      if (input) {
        console.log('[Helper] Found input, filling with "Delete"');
        
        // Clear and fill
        input.focus();
        input.value = '';
        
        // Simulate typing
        const word = 'Delete';
        for (let i = 0; i < word.length; i++) {
          input.value += word[i];
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
        
        // Additional events
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.dispatchEvent(new Event('blur', { bubbles: true }));
        
        return input;
      }
      
      console.log('[Helper] Input field not found');
      return null;
    },
    
    // Helper: Open delete modal
    async openDeleteModal() {
      console.log('[Bypass] Looking for delete account option...');
      
      // First check if modal is already open
      if (this.isModalOpen()) {
        console.log('[Bypass] Delete modal is already open');
        return true;
      }
      
      // Method 1: Look for "Delete Account" text in buttons
      const deleteAccountButtons = Array.from(document.querySelectorAll('button, div[role="button"], a')).filter(el => 
        el.textContent.includes('Delete Account') || 
        el.textContent.includes('Delete account') ||
        el.textContent.includes('delete account')
      );
      
      if (deleteAccountButtons.length > 0) {
        console.log('[Bypass] Found delete account button, clicking...');
        deleteAccountButtons[0].click();
        await this.delay(2000);
        
        if (this.isModalOpen()) {
          console.log('[Bypass] Modal opened successfully');
          return true;
        }
      }
      
      // Method 2: Look in settings sections
      const dangerZone = document.querySelector('[class*="danger"], [class*="Danger"], section:has(button:contains("Delete"))');
      if (dangerZone) {
        const deleteBtn = dangerZone.querySelector('button');
        if (deleteBtn) {
          console.log('[Bypass] Found delete button in danger zone');
          deleteBtn.click();
          await this.delay(2000);
          return true;
        }
      }
      
      // Method 3: Scroll and look for delete option
      window.scrollTo(0, document.body.scrollHeight);
      await this.delay(1000);
      
      const allButtons = document.querySelectorAll('button');
      for (const btn of allButtons) {
        if (btn.textContent.toLowerCase().includes('delete') && 
            btn.textContent.toLowerCase().includes('account')) {
          console.log('[Bypass] Found delete account after scroll');
          btn.click();
          await this.delay(2000);
          return true;
        }
      }
      
      console.log('[Bypass] Could not find delete account option');
      return false;
    },
    
    // Helper: Check if modal is open
    isModalOpen() {
      const modal = document.querySelector('[class*="Delete Account"]') ||
                   document.querySelector('input[placeholder*="Delete"]') ||
                   document.querySelector('p:contains("Delete Account")');
      return !!modal;
    },
    
    // Helper: Delay function
    delay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    },
    
    // Technique 1: Fill & Click
    async tryFillAndClick() {
      console.log('[Technique 1] Fill input and click delete...');
      
      const input = this.findAndFillInput();
      await this.delay(500);
      
      const deleteBtn = this.findDeleteButton();
      
      if (input && deleteBtn) {
        // Enable and click delete
        deleteBtn.disabled = false;
        deleteBtn.removeAttribute('aria-disabled');
        deleteBtn.click();
        
        await this.delay(1000);
        
        // Try clicking again in case first didn't work
        deleteBtn.click();
        
        return {
          status: 'success',
          description: 'Filled "Delete" and clicked button'
        };
      }
      
      return {
        status: 'failed',
        description: `Input: ${input ? 'found' : 'not found'}, Button: ${deleteBtn ? 'found' : 'not found'}`
      };
    },
    
    // Technique 2: Force Enable
    async tryForceEnable() {
      console.log('[Technique 2] Force enable and click...');
      
      const input = document.querySelector('input[placeholder*="Delete" i]');
      if (input) {
        input.value = 'Delete';
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype, 'value'
        ).set;
        nativeInputValueSetter.call(input, 'Delete');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
      
      await this.delay(500);
      
      const deleteBtn = this.findDeleteButton();
      if (deleteBtn) {
        // Remove all disable properties
        deleteBtn.disabled = false;
        deleteBtn.removeAttribute('disabled');
        deleteBtn.removeAttribute('aria-disabled');
        deleteBtn.setAttribute('aria-disabled', 'false');
        deleteBtn.classList.remove('disabled', 'opacity-50', 'pointer-events-none');
        deleteBtn.style.pointerEvents = 'auto';
        deleteBtn.style.opacity = '1';
        
        deleteBtn.click();
        
        return {
          status: 'success',
          description: 'Force enabled and clicked'
        };
      }
      
      return {
        status: 'failed',
        description: 'Could not force enable'
      };
    },
    
    // Technique 3: React Manipulation
    async tryReactManipulation() {
      console.log('[Technique 3] React component manipulation...');
      
      const input = document.querySelector('input[placeholder*="Delete" i]');
      if (input) {
        // Set value via React
        const lastValue = input.value;
        input.value = 'Delete';
        const event = new Event('input', { bubbles: true });
        const tracker = input._valueTracker;
        if (tracker) {
          tracker.setValue(lastValue);
        }
        input.dispatchEvent(event);
      }
      
      await this.delay(500);
      
      const deleteBtn = this.findDeleteButton();
      if (deleteBtn) {
        // Find React fiber
        const reactKey = Object.keys(deleteBtn).find(key => 
          key.startsWith('__reactFiber') || key.startsWith('__reactInternalInstance')
        );
        
        if (reactKey) {
          const fiber = deleteBtn[reactKey];
          if (fiber && fiber.memoizedProps && fiber.memoizedProps.onClick) {
            fiber.memoizedProps.onClick();
            return {
              status: 'success',
              description: 'Triggered React onClick'
            };
          }
        }
        
        // Fallback to regular click
        deleteBtn.disabled = false;
        deleteBtn.click();
        
        return {
          status: 'partial',
          description: 'Used regular click instead of React'
        };
      }
      
      return {
        status: 'failed',
        description: 'Could not manipulate React component'
      };
    },
    
    // Technique 4: Event Injection
    async tryEventInjection() {
      console.log('[Technique 4] Event injection...');
      
      const input = document.querySelector('input[placeholder*="Delete" i]');
      if (input) {
        // Inject multiple events
        input.value = 'Delete';
        ['keydown', 'keypress', 'keyup', 'input', 'change'].forEach(eventType => {
          const event = new Event(eventType, { bubbles: true, cancelable: true });
          input.dispatchEvent(event);
        });
      }
      
      await this.delay(500);
      
      const deleteBtn = this.findDeleteButton();
      if (deleteBtn) {
        deleteBtn.disabled = false;
        
        // Inject multiple click events
        const events = [
          new MouseEvent('mousedown', { bubbles: true }),
          new MouseEvent('mouseup', { bubbles: true }),
          new MouseEvent('click', { bubbles: true }),
          new PointerEvent('pointerdown', { bubbles: true }),
          new PointerEvent('pointerup', { bubbles: true }),
          new PointerEvent('click', { bubbles: true })
        ];
        
        events.forEach(e => deleteBtn.dispatchEvent(e));
        
        return {
          status: 'success',
          description: 'Injected multiple events'
        };
      }
      
      return {
        status: 'failed',
        description: 'Event injection failed'
      };
    },
    
    // Technique 5: Remove Validation
    async tryRemoveValidation() {
      console.log('[Technique 5] Remove validation...');
      
      const input = document.querySelector('input[placeholder*="Delete" i]');
      if (input) {
        // Remove all validation attributes
        input.removeAttribute('required');
        input.removeAttribute('pattern');
        input.removeAttribute('minlength');
        input.removeAttribute('maxlength');
        input.setCustomValidity('');
        
        input.value = 'Delete';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
      
      await this.delay(500);
      
      const deleteBtn = this.findDeleteButton();
      if (deleteBtn) {
        // Remove button validation
        deleteBtn.removeAttribute('disabled');
        deleteBtn.removeAttribute('aria-disabled');
        deleteBtn.formNoValidate = true;
        
        deleteBtn.click();
        
        return {
          status: 'success',
          description: 'Removed validation and clicked'
        };
      }
      
      return {
        status: 'failed',
        description: 'Could not remove validation'
      };
    },
    
    // Technique 6: DOM Mutation
    async tryDOMMutation() {
      console.log('[Technique 6] DOM mutation...');
      
      const input = document.querySelector('input[placeholder*="Delete" i]');
      if (input) {
        // Clone and replace input to remove listeners
        const newInput = input.cloneNode(true);
        newInput.value = 'Delete';
        input.parentNode.replaceChild(newInput, input);
        newInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      
      await this.delay(500);
      
      const deleteBtn = this.findDeleteButton();
      if (deleteBtn) {
        // Clone and modify button
        const newBtn = deleteBtn.cloneNode(true);
        newBtn.disabled = false;
        newBtn.removeAttribute('aria-disabled');
        deleteBtn.parentNode.replaceChild(newBtn, deleteBtn);
        
        newBtn.click();
        
        return {
          status: 'success',
          description: 'Mutated DOM and clicked'
        };
      }
      
      return {
        status: 'failed',
        description: 'DOM mutation failed'
      };
    },
    
    // Technique 7: Console Injection
    async tryConsoleInjection() {
      console.log('[Technique 7] Console injection...');
      
      try {
        // Try to execute in page context
        const script = document.createElement('script');
        script.textContent = `
          const input = document.querySelector('input[placeholder*="Delete" i]');
          if (input) input.value = 'Delete';
          const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent === 'Delete');
          if (btn) {
            btn.disabled = false;
            btn.click();
          }
        `;
        document.head.appendChild(script);
        script.remove();
        
        await this.delay(1000);
        
        return {
          status: 'partial',
          description: 'Injected console script'
        };
      } catch (error) {
        return {
          status: 'failed',
          description: 'Console injection blocked'
        };
      }
    },
    
    // Technique 8: Prototype Override
    async tryPrototypeOverride() {
      console.log('[Technique 8] Prototype override...');
      
      try {
        // Override disabled property
        const originalDescriptor = Object.getOwnPropertyDescriptor(HTMLButtonElement.prototype, 'disabled');
        Object.defineProperty(HTMLButtonElement.prototype, 'disabled', {
          get: function() { return false; },
          set: function(val) { return false; },
          configurable: true
        });
        
        const input = document.querySelector('input[placeholder*="Delete" i]');
        if (input) input.value = 'Delete';
        
        await this.delay(500);
        
        const deleteBtn = this.findDeleteButton();
        if (deleteBtn) {
          deleteBtn.click();
        }
        
        // Restore original
        if (originalDescriptor) {
          Object.defineProperty(HTMLButtonElement.prototype, 'disabled', originalDescriptor);
        }
        
        return {
          status: 'success',
          description: 'Overrode prototype and clicked'
        };
      } catch (error) {
        return {
          status: 'failed',
          description: 'Prototype override failed'
        };
      }
    },
    
    // Technique 9: Direct Submit
    async tryDirectSubmit() {
      console.log('[Technique 9] Direct form submit...');
      
      const input = document.querySelector('input[placeholder*="Delete" i]');
      if (input) {
        input.value = 'Delete';
        
        // Find parent form
        let form = input.closest('form');
        if (!form) {
          // Look for div that acts like form
          form = input.closest('div[class*="modal"], div[class*="dialog"]');
        }
        
        if (form) {
          // Try to submit
          if (form.submit) {
            form.submit();
            return {
              status: 'success',
              description: 'Submitted form directly'
            };
          } else {
            // Simulate form submission
            const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
            form.dispatchEvent(submitEvent);
            
            return {
              status: 'partial',
              description: 'Dispatched submit event'
            };
          }
        }
      }
      
      // Fallback to button click
      const deleteBtn = this.findDeleteButton();
      if (deleteBtn) {
        deleteBtn.disabled = false;
        deleteBtn.click();
        return {
          status: 'partial',
          description: 'Used button click instead'
        };
      }
      
      return {
        status: 'failed',
        description: 'Could not submit form'
      };
    },
    
    // Technique 10: Multiple Clicks
    async tryMultipleClicks() {
      console.log('[Technique 10] Multiple rapid clicks...');
      
      const input = document.querySelector('input[placeholder*="Delete" i]');
      if (input) {
        input.value = 'Delete';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
      
      await this.delay(300);
      
      const deleteBtn = this.findDeleteButton();
      if (deleteBtn) {
        deleteBtn.disabled = false;
        deleteBtn.removeAttribute('aria-disabled');
        
        // Click multiple times rapidly
        for (let i = 0; i < 5; i++) {
          deleteBtn.click();
          await this.delay(100);
        }
        
        return {
          status: 'success',
          description: 'Clicked button 5 times rapidly'
        };
      }
      
      return {
        status: 'failed',
        description: 'Could not perform multiple clicks'
      };
    }
  };
  
  // Listen for commands
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'executeDeleteBypass') {
      console.log('[Bypass Delete] Received command to start testing');
      
      BypassDelete.executeBypass().then(results => {
        sendResponse({ success: true, results: results });
      }).catch(error => {
        sendResponse({ success: false, error: error.message });
      });
      
      return true; // Keep channel open
    }
  });
  
  console.log('[Bypass Delete Auto] Content script loaded and ready');
  
})();
