// Bypass Invoice Validation - Educational Lab Script
// Designed to bypass "outstanding invoice" validation

(function() {
  'use strict';

  console.log('[BYPASS INVOICE] Lab script loaded - Educational purposes only');

  const InvoiceBypass = {
    
    async execute() {
      console.log('='.repeat(70));
      console.log('[BYPASS INVOICE] STARTING AGGRESSIVE BYPASS ATTACK');
      console.log('[BYPASS INVOICE] Target: Outstanding invoice validation');
      console.log('='.repeat(70));
      
      // Phase 1: Remove all validation barriers
      await this.phase1_RemoveBarriers();
      
      // Phase 2: Manipulate validation state
      await this.phase2_ManipulateState();
      
      // Phase 3: Override network responses
      await this.phase3_OverrideNetwork();
      
      // Phase 4: Direct form manipulation
      await this.phase4_DirectManipulation();
      
      // Phase 5: Force delete execution
      await this.phase5_ForceExecution();
      
      console.log('[BYPASS INVOICE] All phases executed');
      return true;
    },
    
    // PHASE 1: Remove all barriers
    async phase1_RemoveBarriers() {
      console.log('\n[PHASE 1] REMOVING ALL BARRIERS...');
      
      // 1. Remove error messages
      const errorElements = document.querySelectorAll(
        '.bg-red-100, [class*="error"], [class*="Error"], [class*="red"]'
      );
      
      errorElements.forEach(el => {
        if (el.textContent.includes('invoice') || 
            el.textContent.includes('pay') || 
            el.textContent.includes('Error')) {
          console.log('[P1] Removing error:', el.textContent.substring(0, 50));
          el.remove();
        }
      });
      
      // 2. Override validation functions
      window.validateInvoice = () => true;
      window.checkOutstandingPayments = () => false;
      window.hasUnpaidInvoices = () => false;
      
      // 3. Clear validation attributes
      document.querySelectorAll('[data-validation]').forEach(el => {
        el.removeAttribute('data-validation');
      });
      
      // 4. Disable form validation
      document.querySelectorAll('form').forEach(form => {
        form.noValidate = true;
        form.checkValidity = () => true;
      });
      
      console.log('[P1] Barriers removed');
      await this.delay(500);
    },
    
    // PHASE 2: Manipulate validation state
    async phase2_ManipulateState() {
      console.log('\n[PHASE 2] MANIPULATING VALIDATION STATE...');
      
      // 1. Set localStorage/sessionStorage flags
      const paymentFlags = [
        'invoicesPaid', 'paymentsComplete', 'accountClear',
        'no_outstanding_invoices', 'bypass_payment_check',
        'admin_override', 'force_delete_enabled'
      ];
      
      paymentFlags.forEach(flag => {
        localStorage.setItem(flag, 'true');
        sessionStorage.setItem(flag, 'true');
        localStorage.setItem(`cursor_${flag}`, 'true');
        sessionStorage.setItem(`cursor_${flag}`, 'true');
      });
      
      // 2. Manipulate cookies
      document.cookie = "invoice_paid=true; path=/";
      document.cookie = "bypass_validation=true; path=/";
      document.cookie = "admin_mode=true; path=/";
      document.cookie = "force_delete=true; path=/";
      
      // 3. Override window properties
      Object.defineProperty(window, 'OUTSTANDING_INVOICES', {
        get: () => false,
        set: () => {},
        configurable: true
      });
      
      Object.defineProperty(window, 'PAYMENT_REQUIRED', {
        get: () => false,
        set: () => {},
        configurable: true
      });
      
      // 4. Inject global bypass flag
      window.__BYPASS_INVOICE_CHECK__ = true;
      window.__FORCE_DELETE__ = true;
      
      console.log('[P2] State manipulated');
      await this.delay(500);
    },
    
    // PHASE 3: Override network responses
    async phase3_OverrideNetwork() {
      console.log('\n[PHASE 3] OVERRIDING NETWORK LAYER...');
      
      // 1. Override fetch to intercept invoice checks
      const originalFetch = window.fetch;
      window.fetch = async function(...args) {
        const url = args[0];
        
        console.log('[P3] Intercepting fetch:', url);
        
        // If checking invoice status, return paid
        if (url.includes('invoice') || url.includes('payment') || url.includes('billing')) {
          console.log('[P3] Returning fake success for invoice check');
          return {
            ok: true,
            status: 200,
            json: async () => ({ 
              paid: true, 
              outstanding: false,
              amount: 0,
              canDelete: true 
            }),
            text: async () => 'OK'
          };
        }
        
        // If delete request, force success
        if (url.includes('delete')) {
          console.log('[P3] Forcing delete success');
          
          // Try real delete first
          try {
            const response = await originalFetch.apply(this, args);
            if (!response.ok) {
              // Override failed response
              return {
                ok: true,
                status: 200,
                json: async () => ({ success: true, deleted: true }),
                text: async () => 'Account deleted'
              };
            }
            return response;
          } catch (error) {
            // Return fake success on error
            return {
              ok: true,
              status: 200,
              json: async () => ({ success: true }),
              text: async () => 'OK'
            };
          }
        }
        
        return originalFetch.apply(this, args);
      };
      
      // 2. Override XMLHttpRequest
      const originalXHR = window.XMLHttpRequest.prototype.open;
      window.XMLHttpRequest.prototype.open = function(method, url, ...rest) {
        console.log('[P3] Intercepting XHR:', method, url);
        
        if (url.includes('invoice') || url.includes('payment')) {
          // Override response
          this.addEventListener('readystatechange', function() {
            if (this.readyState === 4) {
              Object.defineProperty(this, 'responseText', {
                get: () => JSON.stringify({ paid: true, outstanding: false })
              });
              Object.defineProperty(this, 'status', {
                get: () => 200
              });
            }
          });
        }
        
        return originalXHR.apply(this, [method, url, ...rest]);
      };
      
      console.log('[P3] Network layer overridden');
      await this.delay(500);
    },
    
    // PHASE 4: Direct form manipulation
    async phase4_DirectManipulation() {
      console.log('\n[PHASE 4] DIRECT FORM MANIPULATION...');
      
      // 1. Fill the input correctly
      const input = document.querySelector('input[placeholder*="Delete"]');
      if (input) {
        console.log('[P4] Filling input with "Delete"');
        
        // Multiple methods to set value
        input.value = 'Delete';
        input.setAttribute('value', 'Delete');
        input.defaultValue = 'Delete';
        
        // Override property
        Object.defineProperty(input, 'value', {
          get: () => 'Delete',
          set: () => {},
          configurable: true
        });
        
        // Trigger all events
        ['input', 'change', 'keyup', 'keydown', 'blur'].forEach(eventType => {
          input.dispatchEvent(new Event(eventType, { bubbles: true }));
        });
        
        // Force React update
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype, 'value'
        ).set;
        nativeInputValueSetter.call(input, 'Delete');
        
        const inputEvent = new Event('input', { bubbles: true });
        input.dispatchEvent(inputEvent);
      }
      
      // 2. Remove ALL disabled states
      document.querySelectorAll('button').forEach(btn => {
        btn.disabled = false;
        btn.removeAttribute('disabled');
        btn.removeAttribute('aria-disabled');
        btn.setAttribute('aria-disabled', 'false');
        
        // Remove all blocking classes
        btn.classList.remove('disabled', 'opacity-50', 'pointer-events-none', 'cursor-not-allowed');
        
        // Force enable styles
        btn.style.cssText = `
          pointer-events: auto !important;
          opacity: 1 !important;
          cursor: pointer !important;
          filter: none !important;
        `;
      });
      
      // 3. Create fake validation bypass
      window.bypassValidation = true;
      document.body.setAttribute('data-bypass', 'true');
      
      console.log('[P4] Form manipulated');
      await this.delay(500);
    },
    
    // PHASE 5: Force execution
    async phase5_ForceExecution() {
      console.log('\n[PHASE 5] FORCING DELETE EXECUTION...');
      
      // Find delete button
      const deleteBtn = Array.from(document.querySelectorAll('button')).find(
        btn => btn.textContent.trim() === 'Delete' && 
               !btn.textContent.includes('Account')
      );
      
      if (!deleteBtn) {
        console.log('[P5] Delete button not found, creating one...');
        
        // Create our own delete button
        const modal = document.querySelector('div[class*="modal"], div[class*="relative"][class*="flex"]');
        if (modal) {
          const forceBtn = document.createElement('button');
          forceBtn.textContent = 'FORCE DELETE';
          forceBtn.style.cssText = `
            background: red;
            color: white;
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            margin: 10px;
          `;
          
          forceBtn.onclick = async () => {
            console.log('[P5] Force delete clicked!');
            
            // Direct API call
            try {
              const response = await fetch('https://cursor.com/api/dashboard/delete-account', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-Bypass-Invoice': 'true',
                  'X-Force-Delete': 'true',
                  'X-Admin-Override': 'true'
                },
                credentials: 'include',
                body: JSON.stringify({
                  confirmation: 'Delete',
                  force: true,
                  skipInvoiceCheck: true,
                  adminOverride: true
                })
              });
              
              console.log('[P5] Delete API response:', response.status);
            } catch (error) {
              console.log('[P5] API error (expected):', error.message);
            }
          };
          
          modal.appendChild(forceBtn);
        }
      } else {
        console.log('[P5] Delete button found, executing multi-attack...');
        
        // 1. Override click handler
        const originalClick = deleteBtn.click;
        deleteBtn.click = function() {
          console.log('[P5] Click intercepted and enhanced');
          
          // Remove invoice check
          window.checkInvoices = () => true;
          window.validatePayment = () => true;
          
          // Call original
          originalClick.call(this);
        };
        
        // 2. Try React handler
        const reactKeys = Object.keys(deleteBtn).filter(key => 
          key.startsWith('__react') || key.includes('Fiber')
        );
        
        reactKeys.forEach(key => {
          const fiber = deleteBtn[key];
          if (fiber?.memoizedProps?.onClick) {
            console.log('[P5] Calling React onClick directly');
            
            // Wrap onClick to bypass checks
            const originalOnClick = fiber.memoizedProps.onClick;
            fiber.memoizedProps.onClick = function(...args) {
              window.__BYPASS_ALL__ = true;
              originalOnClick.apply(this, args);
            };
            
            fiber.memoizedProps.onClick();
          }
        });
        
        // 3. Multiple click attempts
        for (let i = 0; i < 5; i++) {
          await this.delay(200);
          console.log(`[P5] Click attempt ${i + 1}`);
          
          deleteBtn.disabled = false;
          deleteBtn.click();
          deleteBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          deleteBtn.dispatchEvent(new PointerEvent('click', { bubbles: true }));
        }
        
        // 4. Form submit bypass
        const form = deleteBtn.closest('form') || deleteBtn.closest('div');
        if (form && form.submit) {
          console.log('[P5] Submitting form directly');
          form.submit();
        }
        
        // 5. Create and dispatch custom event
        const deleteEvent = new CustomEvent('force-delete', {
          detail: { bypass: true, force: true },
          bubbles: true
        });
        document.dispatchEvent(deleteEvent);
        deleteBtn.dispatchEvent(deleteEvent);
      }
      
      console.log('[P5] Force execution completed');
    },
    
    // Utility delay
    delay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
  };
  
  // Auto-execute on load
  window.addEventListener('load', () => {
    setTimeout(() => {
      console.log('[BYPASS INVOICE] Auto-executing in 2 seconds...');
      InvoiceBypass.execute();
    }, 2000);
  });
  
  // Listen for manual trigger
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'executeDeleteBypass') {
      console.log('[BYPASS INVOICE] Manual trigger received');
      
      InvoiceBypass.execute().then(() => {
        sendResponse({ success: true, message: 'Invoice bypass executed' });
      });
      
      return true;
    }
  });
  
  // Expose to console for manual testing
  window.InvoiceBypass = InvoiceBypass;
  console.log('[BYPASS INVOICE] Ready! Use window.InvoiceBypass.execute() to run manually');
  
  // Monitor for invoice errors and auto-remove
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) {
          const text = node.textContent || '';
          if (text.includes('invoice') || text.includes('pay')) {
            console.log('[BYPASS INVOICE] Detected and removing invoice error');
            node.remove();
          }
        }
      });
    });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
})();
