// Account Deletion Service untuk Cursor Account Manager
class AccountDeletionService {
  constructor() {
    this.cursorBaseUrl = "https://cursor.com";
    this.billingUrl = "https://billing.stripe.com";
    this.deletionInProgress = false;
  }

  // Delete Free Account - Workflow 1
  async deleteFreeAccount() {
    if (this.deletionInProgress) {
      throw new Error("Account deletion already in progress");
    }

    try {
      this.deletionInProgress = true;

      // Step 1: Open settings page
      const settingsUrl = `${this.cursorBaseUrl}/dashboard?tab=settings`;
      const settingsTab = await chrome.tabs.create({
        url: settingsUrl,
        active: true,
      });

      // Wait for page to load and execute deletion workflow
      return new Promise((resolve, reject) => {
        const listener = (tabId, changeInfo) => {
          if (tabId === settingsTab.id && changeInfo.status === "complete") {
            chrome.tabs.onUpdated.removeListener(listener);

            // Execute deletion steps
            setTimeout(async () => {
              try {
                await this.executeFreeAccountDeletion(settingsTab.id);
                resolve({
                  success: true,
                  message: "Free account deletion initiated",
                });
              } catch (error) {
                reject(error);
              } finally {
                this.deletionInProgress = false;
              }
            }, 2000); // Wait 2 seconds for page to fully load
          }
        };

        chrome.tabs.onUpdated.addListener(listener);

        // Timeout after 30 seconds
        setTimeout(() => {
          chrome.tabs.onUpdated.removeListener(listener);
          this.deletionInProgress = false;
          reject(new Error("Timeout waiting for settings page to load"));
        }, 30000);
      });
    } catch (error) {
      this.deletionInProgress = false;
      throw error;
    }
  }

  // Delete Pro Trial Account - Workflow 2
  async deleteProTrialAccount() {
    if (this.deletionInProgress) {
      throw new Error("Account deletion already in progress");
    }

    try {
      this.deletionInProgress = true;

      // Step 1: Open billing page
      const billingUrl = `${this.cursorBaseUrl}/dashboard?tab=billing`;
      const billingTab = await chrome.tabs.create({
        url: billingUrl,
        active: true,
      });

      // Wait for billing page and handle subscription cancellation
      return new Promise((resolve, reject) => {
        const listener = (tabId, changeInfo) => {
          if (tabId === billingTab.id && changeInfo.status === "complete") {
            chrome.tabs.onUpdated.removeListener(listener);

            setTimeout(async () => {
              try {
                await this.executeProTrialDeletion(billingTab.id);
                resolve({
                  success: true,
                  message: "Pro trial account deletion initiated",
                });
              } catch (error) {
                reject(error);
              } finally {
                this.deletionInProgress = false;
              }
            }, 2000);
          }
        };

        chrome.tabs.onUpdated.addListener(listener);

        // Timeout after 30 seconds
        setTimeout(() => {
          chrome.tabs.onUpdated.removeListener(listener);
          this.deletionInProgress = false;
          reject(new Error("Timeout waiting for billing page to load"));
        }, 30000);
      });
    } catch (error) {
      this.deletionInProgress = false;
      throw error;
    }
  }

  // Execute free account deletion steps
  async executeFreeAccountDeletion(tabId) {
    return new Promise((resolve, reject) => {
      chrome.scripting.executeScript(
        {
          target: { tabId: tabId },
          func: () => {
            return new Promise((resolve, reject) => {
              let step = 1;
              const maxRetries = 10;
              let retries = 0;

              const executeStep = () => {
                retries++;

                if (retries > maxRetries) {
                  reject(new Error(`Max retries reached at step ${step}`));
                  return;
                }

                switch (step) {
                  case 1:
                    // Click Delete button
                    const deleteButtons = Array.from(
                      document.querySelectorAll(
                        "span.dashboard-outline-button-text"
                      )
                    ).filter((span) => span.textContent.trim() === "Delete");

                    if (deleteButtons.length > 0) {
                      const deleteBtn = deleteButtons[0].closest("button");
                      if (deleteBtn) {
                        deleteBtn.click();
                        step = 2;
                        retries = 0;
                        setTimeout(executeStep, 1000);
                        return;
                      }
                    }

                    console.log("Delete button not found, retrying...");
                    setTimeout(executeStep, 1000);
                    break;

                  case 2:
                    // Fill confirmation input
                    const confirmInput = document.querySelector(
                      'input[placeholder*="Delete"], input[placeholder*="delete"]'
                    );
                    if (confirmInput) {
                      confirmInput.focus();
                      confirmInput.value = "delete";
                      confirmInput.dispatchEvent(
                        new Event("input", { bubbles: true })
                      );
                      confirmInput.dispatchEvent(
                        new Event("change", { bubbles: true })
                      );
                      step = 3;
                      retries = 0;
                      setTimeout(executeStep, 1000);
                      return;
                    }

                    console.log("Confirmation input not found, retrying...");
                    setTimeout(executeStep, 1000);
                    break;

                  case 3:
                    // Click final Delete button
                    const finalDeleteBtns = Array.from(
                      document.querySelectorAll("button")
                    ).filter((btn) => {
                      const span = btn.querySelector("span");
                      return (
                        span &&
                        span.textContent.trim() === "Delete" &&
                        !btn.disabled &&
                        btn.getAttribute("aria-disabled") !== "true"
                      );
                    });

                    if (finalDeleteBtns.length > 0) {
                      finalDeleteBtns[0].click();
                      resolve({
                        success: true,
                        step: "Account deletion confirmed",
                      });
                      return;
                    }

                    console.log(
                      "Final delete button not found or disabled, retrying..."
                    );
                    setTimeout(executeStep, 1000);
                    break;

                  default:
                    reject(new Error("Unknown step"));
                }
              };

              // Start execution
              setTimeout(executeStep, 500);
            });
          },
        },
        (results) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (results && results[0] && results[0].result) {
            resolve(results[0].result);
          } else {
            reject(new Error("Script execution failed"));
          }
        }
      );
    });
  }

  // Execute pro trial deletion steps
  async executeProTrialDeletion(tabId) {
    return new Promise((resolve, reject) => {
      chrome.scripting.executeScript(
        {
          target: { tabId: tabId },
          func: () => {
            return new Promise((resolve, reject) => {
              let step = 1;
              const maxRetries = 10;
              let retries = 0;

              const executeStep = () => {
                retries++;

                if (retries > maxRetries) {
                  reject(new Error(`Max retries reached at step ${step}`));
                  return;
                }

                switch (step) {
                  case 1:
                    // Click Manage Subscription button
                    const manageButtons = Array.from(
                      document.querySelectorAll(
                        "span.dashboard-outline-button-text"
                      )
                    ).filter(
                      (span) =>
                        span.textContent.trim() === "Manage Subscription"
                    );

                    if (manageButtons.length > 0) {
                      const manageBtn = manageButtons[0].closest("button");
                      if (manageBtn) {
                        // This will open Stripe billing in new tab
                        manageBtn.click();

                        // Wait for Stripe tab to open, then continue with cancellation
                        setTimeout(() => {
                          resolve({
                            success: true,
                            step: "Manage Subscription clicked",
                            nextAction: "waitForStripe",
                          });
                        }, 2000);
                        return;
                      }
                    }

                    console.log(
                      "Manage Subscription button not found, retrying..."
                    );
                    setTimeout(executeStep, 1000);
                    break;

                  default:
                    reject(new Error("Unknown step"));
                }
              };

              setTimeout(executeStep, 500);
            });
          },
        },
        async (results) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (results && results[0] && results[0].result) {
            const result = results[0].result;

            if (result.nextAction === "waitForStripe") {
              // Wait for Stripe tab to open and handle subscription cancellation
              try {
                await this.handleStripeCancellation();
                // After stripe cancellation, proceed with account deletion
                await new Promise((resolve) => setTimeout(resolve, 3000)); // Wait 3 seconds

                // Now proceed with free account deletion workflow
                const settingsUrl = `${this.cursorBaseUrl}/dashboard?tab=settings`;
                const settingsTab = await chrome.tabs.create({
                  url: settingsUrl,
                  active: true,
                });

                setTimeout(async () => {
                  await this.executeFreeAccountDeletion(settingsTab.id);
                  resolve({
                    success: true,
                    step: "Pro trial deletion completed",
                  });
                }, 2000);
              } catch (error) {
                reject(error);
              }
            } else {
              resolve(result);
            }
          } else {
            reject(new Error("Script execution failed"));
          }
        }
      );
    });
  }

  // Handle Stripe subscription cancellation
  async handleStripeCancellation() {
    return new Promise((resolve, reject) => {
      // Monitor for new tabs (Stripe billing)
      const tabCreatedListener = (tab) => {
        if (tab.url && tab.url.includes("billing.stripe.com")) {
          chrome.tabs.onCreated.removeListener(tabCreatedListener);

          // Wait for Stripe page to load
          const updateListener = (tabId, changeInfo) => {
            if (tabId === tab.id && changeInfo.status === "complete") {
              chrome.tabs.onUpdated.removeListener(updateListener);

              setTimeout(async () => {
                try {
                  await this.executeStripeCancellation(tab.id);
                  resolve({ success: true });
                } catch (error) {
                  reject(error);
                }
              }, 2000);
            }
          };

          chrome.tabs.onUpdated.addListener(updateListener);
        }
      };

      chrome.tabs.onCreated.addListener(tabCreatedListener);

      // Timeout after 30 seconds
      setTimeout(() => {
        chrome.tabs.onCreated.removeListener(tabCreatedListener);
        reject(new Error("Timeout waiting for Stripe tab"));
      }, 30000);
    });
  }

  // Execute Stripe cancellation steps
  async executeStripeCancellation(tabId) {
    return new Promise((resolve, reject) => {
      chrome.scripting.executeScript(
        {
          target: { tabId: tabId },
          func: () => {
            return new Promise((resolve, reject) => {
              let step = 1;
              const maxRetries = 10;
              let retries = 0;

              const executeStep = () => {
                retries++;

                if (retries > maxRetries) {
                  reject(new Error(`Max retries reached at step ${step}`));
                  return;
                }

                switch (step) {
                  case 1:
                    // Click Cancel subscription
                    const cancelSpans = Array.from(
                      document.querySelectorAll("span")
                    ).filter(
                      (span) =>
                        span.textContent.trim() === "Cancel subscription"
                    );

                    if (cancelSpans.length > 0) {
                      const cancelBtn =
                        cancelSpans[0].closest("button") ||
                        cancelSpans[0].closest("a");
                      if (cancelBtn) {
                        cancelBtn.click();
                        step = 2;
                        retries = 0;
                        setTimeout(executeStep, 1000);
                        return;
                      }
                    }

                    console.log(
                      "Cancel subscription button not found, retrying..."
                    );
                    setTimeout(executeStep, 1000);
                    break;

                  case 2:
                    // Click confirmation Cancel subscription button
                    const confirmCancelBtns = Array.from(
                      document.querySelectorAll('button, [role="button"]')
                    ).filter((btn) => {
                      const text = btn.textContent || btn.innerText;
                      return (
                        text &&
                        text.includes("Cancel") &&
                        text.includes("subscription")
                      );
                    });

                    if (confirmCancelBtns.length > 0) {
                      confirmCancelBtns[0].click();
                      resolve({
                        success: true,
                        step: "Subscription cancelled",
                      });
                      return;
                    }

                    console.log("Confirm cancel button not found, retrying...");
                    setTimeout(executeStep, 1000);
                    break;

                  default:
                    reject(new Error("Unknown step"));
                }
              };

              setTimeout(executeStep, 500);
            });
          },
        },
        (results) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (results && results[0] && results[0].result) {
            resolve(results[0].result);
          } else {
            reject(new Error("Stripe cancellation script execution failed"));
          }
        }
      );
    });
  }

  // Check if deletion is in progress
  isDeletionInProgress() {
    return this.deletionInProgress;
  }

  // Cancel deletion process
  cancelDeletion() {
    this.deletionInProgress = false;
  }
}

// Export instance
const accountDeletionService = new AccountDeletionService();

// For service worker context
if (typeof self !== "undefined") {
  self.accountDeletionService = accountDeletionService;
}

