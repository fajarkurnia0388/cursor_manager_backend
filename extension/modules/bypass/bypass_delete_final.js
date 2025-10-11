// Bypass Delete Account - Final Version with Error Handling
// Handles error messages and case-sensitive input

(function() {
  'use strict';

  const BypassDelete = {
    
    // Main execution function
    async executeBypass() {
      console.log('='.repeat(60));
      console.log('[BYPASS DELETE] STARTING AUTOMATIC TESTING');
      console.log('[BYPASS DELETE] URL:', window.location.href);
      console.log('[BYPASS DELETE] Time:', new Date().toLocaleTimeString());
      console.log('='.repeat(60));
      
      let results = [];
      
      // First, check for any error messages
      const errorCheck = this.checkForErrors();
      if (errorCheck.hasError) {
        console.warn('[BYPASS DELETE] ⚠️ ERROR DETECTED:', errorCheck.message);
        console.log('[BYPASS DELETE] Attempting to bypass error...');
        
        // Try to remove/hide error
        this.tryRemoveError();
      }
      
      // Check if modal is already open
      const modalCheck = this.checkModalState();
      console.log('[BYPASS DELETE] Modal State:', modalCheck);
      
      if (!modalCheck.isOpen) {
        console.log('[BYPASS DELETE] Modal not open, trying to open...');
        await this.openDeleteModal();
        await this.delay(2000);
      }
      
      // Define techniques
      const techniques = [
        { name: 'Smart Fill & Click', method: this.technique1_SmartFillClick },
        { name: 'Force Override', method: this.technique2_ForceOverride },
        { name: 'Direct API Mock', method: this.technique3_DirectAPIMock },
        { name: 'React State Hack', method: this.technique4_ReactStateHack },
        { name: 'Form Validation Bypass', method: this.technique5_FormValidationBypass },
        { name: 'Event Sequence Attack', method: this.technique6_EventSequenceAttack },
        { name: 'DOM Replace', method: this.technique7_DOMReplace },
        { name: 'Console Execute', method: this.technique8_ConsoleExecute },
        { name: 'Multi-Thread Click', method: this.technique9_MultiThreadClick },
        { name: 'Final Force', method: this.technique10_FinalForce }
      ];
      
      // Execute each technique
      for (let i = 0; i < techniques.length; i++) {
        const tech = techniques[i];
        console.log('\n' + '='.repeat(50));
        console.log(`[TECHNIQUE ${i+1}/10] ${tech.name}`);
        console.log('='.repeat(50));
        
        try {
          const result = await tech.method.call(this);
          result.technique = tech.name;
          results.push(result);
          
          console.log(`[RESULT] ${result.status.toUpperCase()}: ${result.description}`);
          
          // Report progress
          this.reportProgress(i + 1, techniques.length, result);
          
          // Check if successful
          if (result.status === 'success') {
            console.log('✅ SUCCESS! Checking if modal closed...');
            await this.delay(3000);
            
            if (!this.checkModalState().isOpen) {
              console.log('🎉 MODAL CLOSED - DELETION SUCCESSFUL!');
              break;
            }
          }
          
          await this.delay(1000);
          
        } catch (error) {
          console.error(`❌ ERROR in ${tech.name}:`, error);
          results.push({
            technique: tech.name,
            status: 'error',
            description: error.message
          });
        }
      }
      
      // Final summary
      console.log('\n' + '='.repeat(60));
      console.log('[BYPASS DELETE] TESTING COMPLETE');
      console.log('Summary:');
      results.forEach((r, i) => {
        const icon = r.status === 'success' ? '✅' : r.status === 'partial' ? '⚠️' : '❌';
        console.log(`${i+1}. ${icon} ${r.technique}: ${r.status}`);
      });
      console.log('='.repeat(60));
      
      return results;
    },
    
    // Check for error messages
    checkForErrors() {
      const errorSelectors = [
        '.bg-red-100',
        '[class*="red"]',
        '[class*="error"]',
        '[class*="Error"]',
        'div:contains("Error")',
        'div:contains("Please pay")'
      ];
      
      for (const selector of errorSelectors) {
        const error = document.querySelector(selector);
        if (error && error.textContent.includes('Error')) {
          return {
            hasError: true,
            element: error,
            message: error.textContent.trim()
          };
        }
      }
      
      return { hasError: false };
    },
    
    // Try to remove error
    tryRemoveError() {
      const error = this.checkForErrors();
      if (error.hasError && error.element) {
        console.log('[BYPASS] Removing error element...');
        error.element.style.display = 'none';
        error.element.remove();
      }
    },
    
    // Check modal state
    checkModalState() {
      const modal = document.querySelector('div[class*="relative"][class*="flex"][class*="w-"][class*="500px"]');
      const input = document.querySelector('input[placeholder*="Delete"]');
      const deleteBtn = this.findDeleteButton();
      
      return {
        isOpen: !!(modal || input),
        hasInput: !!input,
        inputValue: input?.value || '',
        hasDeleteButton: !!deleteBtn,
        buttonEnabled: deleteBtn ? !deleteBtn.disabled && deleteBtn.getAttribute('aria-disabled') !== 'true' : false
      };
    },
    
    // Find delete button
    findDeleteButton() {
      // Most specific selector first
      let btn = document.querySelector('button[aria-disabled="false"] span:contains("Delete")');
      if (btn) return btn.closest('button');
      
      // Find button with Delete text
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(b => b.textContent.trim() === 'Delete');
    },
    
    // Open delete modal
    async openDeleteModal() {
      const deleteAccountBtn = Array.from(document.querySelectorAll('button, a, div')).find(
        el => el.textContent.includes('Delete Account') || el.textContent.includes('Delete account')
      );
      
      if (deleteAccountBtn) {
        console.log('[BYPASS] Found Delete Account button, clicking...');
        deleteAccountBtn.click();
        return true;
      }
      
      return false;
    },
    
    // Report progress
    reportProgress(current, total, result) {
      chrome.runtime.sendMessage({
        type: 'bypassProgress',
        current: current,
        total: total,
        result: result
      }).catch(() => {});
    },
    
    // Utility: Delay
    delay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    },
    
    // TECHNIQUE 1: Smart Fill & Click
    async technique1_SmartFillClick() {
      console.log('[T1] Smart fill and click...');
      
      const input = document.querySelector('input[placeholder*="Delete"]');
      if (!input) {
        return { status: 'failed', description: 'Input not found' };
      }
      
      // IMPORTANT: Case sensitive - must be "Delete" with capital D
      console.log('[T1] Current value:', input.value);
      console.log('[T1] Setting value to "Delete" (case sensitive)...');
      
      // Clear and set correct value
      input.value = '';
      input.focus();
      
      // Type "Delete" letter by letter
      const word = 'Delete'; // CAPITAL D!
      for (let i = 0; i < word.length; i++) {
        input.value += word[i];
        input.dispatchEvent(new Event('input', { bubbles: true }));
        await this.delay(50);
      }
      
      input.dispatchEvent(new Event('change', { bubbles: true }));
      
      await this.delay(500);
      
      // Find and click delete button
      const deleteBtn = this.findDeleteButton();
      if (deleteBtn) {
        console.log('[T1] Found delete button, enabling and clicking...');
        deleteBtn.disabled = false;
        deleteBtn.setAttribute('aria-disabled', 'false');
        deleteBtn.click();
        
        return { status: 'success', description: 'Filled "Delete" and clicked' };
      }
      
      return { status: 'failed', description: 'Delete button not found' };
    },
    
    // TECHNIQUE 2: Force Override
    async technique2_ForceOverride() {
      console.log('[T2] Force override all...');
      
      // Remove error if exists
      this.tryRemoveError();
      
      // Force fill input
      const input = document.querySelector('input[placeholder*="Delete"]');
      if (input) {
        // Use property descriptor to bypass React
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype, 'value'
        ).set;
        nativeInputValueSetter.call(input, 'Delete');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
      
      // Force enable all buttons
      document.querySelectorAll('button').forEach(btn => {
        btn.disabled = false;
        btn.removeAttribute('disabled');
        btn.removeAttribute('aria-disabled');
        btn.style.pointerEvents = 'auto';
        btn.style.opacity = '1';
      });
      
      await this.delay(500);
      
      // Click delete
      const deleteBtn = this.findDeleteButton();
      if (deleteBtn) {
        deleteBtn.click();
        // Multiple clicks
        for (let i = 0; i < 3; i++) {
          await this.delay(100);
          deleteBtn.click();
        }
        return { status: 'success', description: 'Force overrode and multi-clicked' };
      }
      
      return { status: 'failed', description: 'Could not force override' };
    },
    
    // TECHNIQUE 3: Direct API Mock
    async technique3_DirectAPIMock() {
      console.log('[T3] Attempting direct API call...');
      
      try {
        // Try to call the delete endpoint directly
        const response = await fetch('https://cursor.com/api/dashboard/delete-account', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            confirmation: 'Delete',
            force: true
          })
        });
        
        console.log('[T3] API Response:', response.status);
        
        if (response.ok) {
          return { status: 'success', description: 'Direct API call successful' };
        }
        
        return { status: 'partial', description: `API returned ${response.status}` };
      } catch (error) {
        return { status: 'failed', description: error.message };
      }
    },
    
    // TECHNIQUE 4: React State Hack
    async technique4_ReactStateHack() {
      console.log('[T4] React state manipulation...');
      
      const input = document.querySelector('input[placeholder*="Delete"]');
      const deleteBtn = this.findDeleteButton();
      
      if (!input || !deleteBtn) {
        return { status: 'failed', description: 'Elements not found' };
      }
      
      // Find React instance
      const reactKey = Object.keys(input).find(key => 
        key.startsWith('__reactFiber') || 
        key.startsWith('__reactInternalInstance') ||
        key.startsWith('__reactEventHandlers')
      );
      
      if (reactKey) {
        console.log('[T4] Found React key:', reactKey);
        const fiber = input[reactKey];
        
        // Try to manipulate state
        if (fiber && fiber.memoizedState) {
          fiber.memoizedState = 'Delete';
        }
        
        // Trigger React update
        input.value = 'Delete';
        const event = new Event('input', { bubbles: true });
        input._valueTracker?.setValue('');
        input.dispatchEvent(event);
      }
      
      await this.delay(500);
      
      // Click delete with React handler
      const btnReactKey = Object.keys(deleteBtn).find(key => 
        key.startsWith('__reactFiber') || 
        key.startsWith('__reactInternalInstance')
      );
      
      if (btnReactKey) {
        const btnFiber = deleteBtn[btnReactKey];
        if (btnFiber?.memoizedProps?.onClick) {
          console.log('[T4] Calling React onClick directly');
          btnFiber.memoizedProps.onClick();
          return { status: 'success', description: 'React onClick triggered' };
        }
      }
      
      // Fallback
      deleteBtn.click();
      return { status: 'partial', description: 'Used regular click' };
    },
    
    // TECHNIQUE 5: Form Validation Bypass
    async technique5_FormValidationBypass() {
      console.log('[T5] Bypassing form validation...');
      
      // Remove all validation
      document.querySelectorAll('input').forEach(input => {
        input.removeAttribute('required');
        input.removeAttribute('pattern');
        input.setCustomValidity('');
        if (input.placeholder?.includes('Delete')) {
          input.value = 'Delete';
        }
      });
      
      // Remove error elements
      document.querySelectorAll('[class*="error"], [class*="red"]').forEach(el => {
        if (el.textContent.includes('Error') || el.textContent.includes('pay')) {
          el.remove();
        }
      });
      
      // Find form and submit
      const form = document.querySelector('form') || 
                   document.querySelector('div[class*="modal"]') ||
                   document.querySelector('div[class*="relative"][class*="flex"]');
      
      if (form && form.submit) {
        form.submit();
        return { status: 'success', description: 'Form submitted' };
      }
      
      // Click delete
      const deleteBtn = this.findDeleteButton();
      if (deleteBtn) {
        deleteBtn.formNoValidate = true;
        deleteBtn.click();
        return { status: 'partial', description: 'Clicked with noValidate' };
      }
      
      return { status: 'failed', description: 'Could not bypass validation' };
    },
    
    // TECHNIQUE 6: Event Sequence Attack
    async technique6_EventSequenceAttack() {
      console.log('[T6] Event sequence attack...');
      
      const input = document.querySelector('input[placeholder*="Delete"]');
      if (input) {
        // Simulate complete user interaction
        input.focus();
        
        // Clear
        input.value = '';
        for (let i = 0; i < 10; i++) {
          input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace' }));
        }
        
        // Type "Delete"
        const chars = 'Delete'.split('');
        for (const char of chars) {
          input.value += char;
          input.dispatchEvent(new KeyboardEvent('keydown', { key: char }));
          input.dispatchEvent(new KeyboardEvent('keypress', { key: char }));
          input.dispatchEvent(new KeyboardEvent('keyup', { key: char }));
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
        
        input.blur();
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
      
      await this.delay(500);
      
      const deleteBtn = this.findDeleteButton();
      if (deleteBtn) {
        // Complete mouse sequence
        const rect = deleteBtn.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        
        deleteBtn.dispatchEvent(new MouseEvent('mouseover', { clientX: x, clientY: y }));
        deleteBtn.dispatchEvent(new MouseEvent('mouseenter', { clientX: x, clientY: y }));
        deleteBtn.dispatchEvent(new MouseEvent('mousemove', { clientX: x, clientY: y }));
        deleteBtn.dispatchEvent(new MouseEvent('mousedown', { clientX: x, clientY: y }));
        deleteBtn.dispatchEvent(new MouseEvent('mouseup', { clientX: x, clientY: y }));
        deleteBtn.dispatchEvent(new MouseEvent('click', { clientX: x, clientY: y }));
        
        return { status: 'success', description: 'Complete event sequence executed' };
      }
      
      return { status: 'failed', description: 'Event sequence failed' };
    },
    
    // TECHNIQUE 7: DOM Replace
    async technique7_DOMReplace() {
      console.log('[T7] DOM replacement attack...');
      
      // Replace input with pre-filled one
      const oldInput = document.querySelector('input[placeholder*="Delete"]');
      if (oldInput) {
        const newInput = document.createElement('input');
        newInput.type = 'text';
        newInput.value = 'Delete';
        newInput.className = oldInput.className;
        oldInput.parentNode.replaceChild(newInput, oldInput);
      }
      
      await this.delay(500);
      
      // Replace button with auto-click one
      const oldBtn = this.findDeleteButton();
      if (oldBtn) {
        const newBtn = document.createElement('button');
        newBtn.textContent = 'Delete';
        newBtn.className = oldBtn.className;
        newBtn.onclick = () => {
          console.log('[T7] New button clicked!');
          // Try to trigger original action
          oldBtn.click();
        };
        oldBtn.parentNode.replaceChild(newBtn, oldBtn);
        
        // Auto click
        newBtn.click();
        
        return { status: 'success', description: 'DOM replaced and clicked' };
      }
      
      return { status: 'failed', description: 'DOM replacement failed' };
    },
    
    // TECHNIQUE 8: Console Execute
    async technique8_ConsoleExecute() {
      console.log('[T8] Console execution...');
      
      try {
        // Create and execute script
        const script = document.createElement('script');
        script.textContent = `
          (function() {
            // Fill input
            const input = document.querySelector('input[placeholder*="Delete"]');
            if (input) {
              input.value = 'Delete';
              input.dispatchEvent(new Event('input', { bubbles: true }));
            }
            
            // Enable and click delete
            const deleteBtn = Array.from(document.querySelectorAll('button')).find(
              b => b.textContent.trim() === 'Delete'
            );
            if (deleteBtn) {
              deleteBtn.disabled = false;
              deleteBtn.setAttribute('aria-disabled', 'false');
              deleteBtn.click();
              console.log('[T8] Script executed delete click');
            }
          })();
        `;
        
        document.head.appendChild(script);
        script.remove();
        
        return { status: 'success', description: 'Console script executed' };
      } catch (error) {
        return { status: 'failed', description: error.message };
      }
    },
    
    // TECHNIQUE 9: Multi-Thread Click
    async technique9_MultiThreadClick() {
      console.log('[T9] Multi-thread clicking...');
      
      // Ensure input is filled
      const input = document.querySelector('input[placeholder*="Delete"]');
      if (input && input.value !== 'Delete') {
        input.value = 'Delete';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
      
      const deleteBtn = this.findDeleteButton();
      if (!deleteBtn) {
        return { status: 'failed', description: 'Button not found' };
      }
      
      // Enable button
      deleteBtn.disabled = false;
      deleteBtn.setAttribute('aria-disabled', 'false');
      
      // Multi-thread simulation
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(new Promise(resolve => {
          setTimeout(() => {
            deleteBtn.click();
            console.log(`[T9] Click ${i+1}`);
            resolve();
          }, i * 50);
        }));
      }
      
      await Promise.all(promises);
      
      return { status: 'success', description: 'Multi-thread 10 clicks executed' };
    },
    
    // TECHNIQUE 10: Final Force
    async technique10_FinalForce() {
      console.log('[T10] FINAL FORCE - Everything at once...');
      
      // Remove all obstacles
      document.querySelectorAll('[class*="error"], [class*="red"]').forEach(el => el.remove());
      
      // Force fill
      const input = document.querySelector('input[placeholder*="Delete"]');
      if (input) {
        input.value = 'Delete';
        input.setAttribute('value', 'Delete');
        Object.defineProperty(input, 'value', {
          get: function() { return 'Delete'; },
          configurable: true
        });
      }
      
      // Enable everything
      document.querySelectorAll('button').forEach(btn => {
        btn.disabled = false;
        btn.removeAttribute('disabled');
        btn.removeAttribute('aria-disabled');
        btn.classList.remove('disabled', 'opacity-50');
        btn.style = 'pointer-events: auto !important; opacity: 1 !important; cursor: pointer !important;';
      });
      
      // Find and assault the delete button
      const deleteBtn = this.findDeleteButton();
      if (deleteBtn) {
        console.log('[T10] FINAL ASSAULT ON DELETE BUTTON!');
        
        // Override prototype
        const original = HTMLButtonElement.prototype.click;
        HTMLButtonElement.prototype.click = function() {
          console.log('[T10] Click intercepted and forced!');
          this.disabled = false;
          original.call(this);
        };
        
        // Click in every possible way
        deleteBtn.click();
        deleteBtn.dispatchEvent(new MouseEvent('click'));
        deleteBtn.dispatchEvent(new PointerEvent('click'));
        
        // Restore
        HTMLButtonElement.prototype.click = original;
        
        return { status: 'success', description: 'FINAL FORCE executed!' };
      }
      
      return { status: 'failed', description: 'Even final force failed' };
    }
  };
  
  // Listen for messages
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'executeDeleteBypass') {
      console.log('[BYPASS DELETE] Command received! Starting in 1 second...');
      
      setTimeout(() => {
        BypassDelete.executeBypass().then(results => {
          sendResponse({ success: true, results: results });
        }).catch(error => {
          sendResponse({ success: false, error: error.message });
        });
      }, 1000);
      
      return true; // Keep channel open
    }
  });
  
  console.log('[BYPASS DELETE FINAL] Script loaded and ready!');
  console.log('[BYPASS DELETE FINAL] Waiting for command...');
  
})();
