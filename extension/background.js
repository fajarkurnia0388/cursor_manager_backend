// Background script for Cursor Account Manager extension

// Import SQL.js library first
importScripts("libs/sql.js");

// Import services
importScripts("services/account.js");
importScripts("services/payment.js");
importScripts("services/account-deletion.js");
importScripts("services/generator.js");
importScripts("services/database-sync.js");
importScripts("services/json-to-db-converter.js");

// Initialize generator service
const generatorService = new GeneratorService();

// Stripe API monitoring for automatic card switching
const STRIPE_API_URL = "https://api.stripe.com/v1/payment_methods";

// Check if webRequest API is available before using it
if (
  chrome.webRequest &&
  chrome.webRequest.onCompleted &&
  chrome.webRequest.onErrorOccurred
) {
  console.log("✅ WebRequest API available, setting up Stripe monitoring...");

  try {
    // Monitor Stripe API responses for pro trial activation
    chrome.webRequest.onCompleted.addListener(
      (details) => {
        console.log("Stripe API Response:", {
          url: details.url,
          statusCode: details.statusCode,
          method: details.method,
        });

        if (typeof details.tabId === "number" && details.tabId >= 0) {
          try {
            chrome.tabs.sendMessage(details.tabId, {
              type: "stripe-response",
              statusCode: details.statusCode,
              url: details.url,
            });
          } catch (error) {
            console.log("Failed to send stripe response to tab:", error);
          }
        }
      },
      { urls: [STRIPE_API_URL] }
    );

    chrome.webRequest.onErrorOccurred.addListener(
      (details) => {
        console.log("Stripe API Error:", {
          url: details.url,
          error: details.error,
          method: details.method,
        });

        if (typeof details.tabId === "number" && details.tabId >= 0) {
          try {
            chrome.tabs.sendMessage(details.tabId, {
              type: "stripe-response",
              statusCode: 0,
              error: details.error,
              url: details.url,
            });
          } catch (error) {
            console.log("Failed to send stripe error to tab:", error);
          }
        }
      },
      { urls: [STRIPE_API_URL] }
    );

    console.log("✅ Stripe API monitoring setup completed");
  } catch (error) {
    console.error("❌ Failed to setup WebRequest listeners:", error);
  }
} else {
  console.warn("⚠️ WebRequest API not available - Stripe monitoring disabled");
}

// Initialize on install
chrome.runtime.onInstalled.addListener(async () => {
  console.log("Cursor Account Manager extension installed");

  try {
    // Enable side panel for all tabs (if supported)
    if (chrome.sidePanel) {
      console.log("Side Panel API available");
      await chrome.sidePanel.setPanelBehavior({
        openPanelOnActionClick: true, // Always open sidebar on click
      });
    } else {
      console.log("Side Panel API not available - requires Chrome 114+");
    }

    // Check if there's an active session
    const cookies = await accountService.getCurrentCookies();
    console.log("Found cookies:", cookies.length);

    if (cookies.length > 0) {
      const username = await accountService.autoDetectAccount();
      console.log("Auto-detected username:", username);

      if (username) {
        await accountService.updateBadge(username);
      }
    }
  } catch (error) {
    console.error("Error during initialization:", error);
  }
});

// Sync accounts when cookies change
chrome.cookies.onChanged.addListener(async (changeInfo) => {
  if (changeInfo.cookie.domain.includes("cursor.com")) {
    // If cookie was added and we don't have an active account, auto-detect
    if (!changeInfo.removed) {
      const activeAccount = await accountService.getActiveAccount();
      if (!activeAccount) {
        await accountService.autoDetectAccount();
      }
    }
  }
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    try {
      console.log("Received message:", request.type);
      switch (request.type) {
        case "ping":
          sendResponse({ success: true });
          break;

        case "getAccounts":
          // Use the same approach as getAllAccounts - get data from database with cookies
          try {
            const allAccounts = await accountService.getAll();
            console.log("📊 Background: getAccounts response:", allAccounts);

            // Transform to expected format with real cookies from database
            const accountsWithCookies = allAccounts.map((account) => ({
              name: account.name,
              email: account.email || account.name,
              cookies: account.cookies || [],
              active: account.active || false,
              avatarUrl: account.avatarUrl || null,
              expiresAt: account.expiresAt || null,
              status: account.status || "",
            }));

            console.log(
              "📊 Background: Transformed getAccounts data:",
              accountsWithCookies.length,
              "accounts"
            );
            sendResponse({ success: true, data: accountsWithCookies });
          } catch (error) {
            console.error("❌ Background: Error in getAccounts:", error);
            sendResponse({ success: false, error: error.message });
          }
          break;

        case "getAllAccounts":
          // Get all accounts with their details for database viewer
          const allAccounts = await accountService.getAll();
          console.log("📊 Background: getAllAccounts response:", allAccounts);

          // Transform to expected format - accountService.getAll() already returns full objects
          const accountDetails = allAccounts.map((account) => ({
            email: account.email || account.name,
            name: account.name,
            cookies: account.cookies || [],
            isActive: account.active || false,
            plan: account.status || "Free",
            dateAdded: account.dateAdded || Date.now(),
            info: account.info || {},
          }));

          console.log(
            "📊 Background: Transformed account details:",
            accountDetails
          );
          sendResponse({ success: true, data: accountDetails });
          break;

        case "exportAccount":
          // Export single account as JSON
          const accountToExport = await accountService.getAccountDetails(
            request.email
          );
          if (accountToExport) {
            sendResponse({ success: true, data: accountToExport });
          } else {
            sendResponse({ success: false, error: "Account not found" });
          }
          break;

        case "deleteAccount":
          // Delete account from storage
          await accountService.remove(request.email, false);
          sendResponse({ success: true });
          break;

        case "switchAccount":
          await accountService.switchTo(request.account);
          sendResponse({ success: true });
          break;

        case "removeAccount":
          await accountService.remove(
            request.account,
            request.deleteFile || false
          );
          sendResponse({ success: true });
          break;

        case "addCurrentAccount":
          const username = await accountService.autoDetectAccount();
          sendResponse({ success: true, data: username });
          break;

        case "getActiveAccount":
          const active = await accountService.getActiveAccount();
          sendResponse({ success: true, data: active });
          break;

        case "importAccount":
          await accountService.upsert(
            request.account.name,
            request.account.cookies
          );
          sendResponse({ success: true });
          break;

        case "checkSwitchSuccess":
          // Verify if the account switch was successful
          const currentActive = await accountService.getActiveAccount();
          const expectedAccount = request.expectedAccount;
          sendResponse({
            success: true,
            switchSuccessful: currentActive === expectedAccount,
            currentActive: currentActive,
          });
          break;

        case "scanDownloadsFolder":
          // Scan Downloads folder for account files
          const downloadFiles = await accountService.scanDownloadsForAccounts();
          sendResponse({ success: true, data: downloadFiles });
          break;

        case "importAccountJSON":
          console.log("📥 Received importAccountJSON request");
          try {
            // ULTRA SAFE VALIDATION
            if (!request) {
              throw new Error("No request data provided");
            }

            if (!request.jsonText || typeof request.jsonText !== "string") {
              console.error(
                "❌ Invalid JSON data type:",
                typeof request.jsonText
              );
              throw new Error("Invalid JSON data provided");
            }

            // VERY CONSERVATIVE size limit - 512KB
            if (request.jsonText.length > 512 * 1024) {
              console.error(
                "❌ JSON too large:",
                request.jsonText.length,
                "bytes"
              );
              throw new Error(
                `JSON file too large (${Math.round(
                  request.jsonText.length / 1024
                )}KB > 512KB limit)`
              );
            }

            console.log(
              "✅ JSON size validation passed:",
              request.jsonText.length,
              "bytes"
            );

            // Parse and validate JSON before processing
            let jsonData;
            try {
              jsonData = JSON.parse(request.jsonText);
              console.log("✅ JSON parsing successful");
            } catch (parseError) {
              console.error("❌ JSON parse error:", parseError);
              throw new Error(`Invalid JSON format: ${parseError.message}`);
            }

            // Validate JSON structure
            if (!jsonData || typeof jsonData !== "object") {
              throw new Error("Invalid JSON structure - not an object");
            }

            console.log("📤 Calling accountService.importAccountFromJSON");
            const accountName = await accountService.importAccountFromJSON(
              request.jsonText,
              request.customName,
              request.overrideExisting || false
            );

            console.log("🎉 Import successful:", accountName);
            sendResponse({ success: true, data: accountName });
          } catch (error) {
            console.error("💥 Import error:", error);

            // Safe error response
            const errorResponse = {
              success: false,
              error: error.message || "Unknown import error",
              isDuplicate: error.isDuplicate || false,
              existingAccount: error.existingAccount || null,
            };

            console.log("📤 Sending error response:", errorResponse);
            sendResponse(errorResponse);
          }
          break;

        case "exportAccount":
          await accountService.exportAccountToFile(request.account);
          sendResponse({ success: true });
          break;

        case "revealAccountFile":
          const revealResult = await accountService.revealAccountFile(
            request.account
          );
          if (typeof revealResult === "boolean") {
            // Legacy support
            sendResponse({ success: revealResult });
          } else {
            // New detailed response
            sendResponse(revealResult);
          }
          break;

        case "clearAllData":
          const cleared = await accountService.clearAllData();
          sendResponse({ success: cleared });
          break;

        case "getAllStoredData":
          const allData = await accountService.getAllStoredData();
          sendResponse({ success: true, data: allData });
          break;

        case "checkDuplicateAccount":
          const duplicate = await accountService.findDuplicateAccount(
            request.cookies
          );
          sendResponse({ success: true, duplicate: duplicate });
          break;

        case "consolidateDuplicates":
          const consolidationResult =
            await accountService.consolidateDuplicates();
          sendResponse(consolidationResult);
          break;

        case "updateAccountInfo":
          await accountService.saveAccountInfo(
            request.account,
            request.email,
            request.status
          );
          sendResponse({ success: true });
          break;

        case "getAccountDatabaseInfo":
          // Get detailed database info for specific account
          try {
            const accountInfo = await accountService.getAccountDatabaseInfo(
              request.account
            );
            sendResponse({ success: true, data: accountInfo });
          } catch (error) {
            console.error("Error getting account database info:", error);
            sendResponse({ success: false, error: error.message });
          }
          break;

        // Database sync handlers
        case "exportDatabaseToFile":
          try {
            const exportResult =
              await databaseSyncService.exportDatabaseToFile();
            sendResponse({ success: true, data: exportResult });
          } catch (error) {
            console.error("Error exporting database:", error);
            sendResponse({ success: false, error: error.message });
          }
          break;

        case "importDatabaseFromFile":
          try {
            const importResult =
              await databaseSyncService.importDatabaseFromFile(
                request.fileData
              );
            sendResponse({ success: true, data: importResult });
          } catch (error) {
            console.error("Error importing database:", error);
            sendResponse({ success: false, error: error.message });
          }
          break;

        case "openDatabaseLocation":
          try {
            const locationResult =
              await databaseSyncService.openDatabaseLocation();
            sendResponse({ success: true, data: locationResult });
          } catch (error) {
            console.error("Error opening database location:", error);
            sendResponse({ success: false, error: error.message });
          }
          break;

        case "getDatabaseSyncStatus":
          try {
            const status = await databaseSyncService.getSyncStatus();
            sendResponse({ success: true, data: status });
          } catch (error) {
            console.error("Error getting sync status:", error);
            sendResponse({ success: false, error: error.message });
          }
          break;

        case "enableDatabaseAutoSync":
          try {
            await databaseSyncService.enableAutoSync(request.interval || 30);
            sendResponse({ success: true });
          } catch (error) {
            console.error("Error enabling auto-sync:", error);
            sendResponse({ success: false, error: error.message });
          }
          break;

        // JSON to Database Converter handlers
        case "convertJsonToDatabase":
          try {
            // Initialize converter with existing database or create new
            const existingDb = await chrome.storage.local.get("sqlite_db");
            await jsonToDbConverter.initializeDatabase(
              existingDb.sqlite_db || null
            );

            // Convert JSON files
            const conversionResult =
              await jsonToDbConverter.convertMultipleJsonToDb(request.files);

            // Get statistics
            const stats = jsonToDbConverter.getDatabaseStats();

            // Save to storage or export to file based on request
            if (request.saveToStorage) {
              await jsonToDbConverter.saveDatabaseToStorage();
            }

            if (request.exportToFile) {
              const exportResult =
                await jsonToDbConverter.exportDatabaseToFile();
              conversionResult.exportedFile = exportResult.filename;
            }

            // Close converter database
            jsonToDbConverter.close();

            sendResponse({
              success: true,
              data: {
                ...conversionResult,
                stats,
              },
            });
          } catch (error) {
            console.error("Error converting JSON to database:", error);
            jsonToDbConverter.close();
            sendResponse({ success: false, error: error.message });
          }
          break;

        case "disableDatabaseAutoSync":
          try {
            await databaseSyncService.disableAutoSync();
            sendResponse({ success: true });
          } catch (error) {
            console.error("Error disabling auto-sync:", error);
            sendResponse({ success: false, error: error.message });
          }
          break;

        case "getAccountInfo":
          // Extract info from current page
          const [tab] = await chrome.tabs.query({
            active: true,
            currentWindow: true,
          });
          // Only process if we're on any cursor.com page (broaden scope)
          if (tab && tab.url && tab.url.includes("cursor.com")) {
            const result = await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: () => {
                // This runs in the page context
                const extractInfo = () => {
                  let email = null;
                  let username = null;
                  let status = "unknown";

                  // Find username first (names without @)
                  const nameSelectors = [
                    'p[class*="truncate"][class*="text-sm"][class*="font-medium"]',
                    "p.truncate.text-sm.font-medium",
                    '[class*="font-medium"][class*="truncate"]',
                    'p[class*="truncate"]', // More flexible selector
                    'div[title*="@"] p', // Target p inside div with email title
                  ];

                  for (const selector of nameSelectors) {
                    const nameEls = document.querySelectorAll(selector);
                    for (const el of nameEls) {
                      const text = el.textContent.trim();
                      // Look for username (non-email text)
                      // PERBAIKAN: Skip jika text mengandung @ atau terlalu panjang (>50 char) atau ada pattern email
                      const hasEmailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text);
                      if (text && !text.includes("@") && !hasEmailPattern && text.length > 1 && text.length < 50) {
                        username = text;
                        break;
                      }
                    }
                    if (username) break;
                  }

                  // Step 1: Try to find email from title attributes first (most reliable)
                  const divsWithEmailTitle =
                    document.querySelectorAll('div[title*="@"]');

                  for (const div of divsWithEmailTitle) {
                    const title = div.getAttribute("title");
                    if (title && title.includes("@")) {
                      const emailMatch = title.match(
                        /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/
                      );
                      if (emailMatch) {
                        // PERBAIKAN: Ambil hanya exact email match, trim whitespace
                        email = emailMatch[1].trim();
                        break;
                      }
                    }
                  }

                  // Step 2: If no email from title, try text content from p tags
                  if (!email) {
                    const allPTags = document.querySelectorAll("p");

                    for (const p of allPTags) {
                      const text = p.textContent?.trim();
                      // PERBAIKAN: Pastikan text tidak terlalu panjang (avoid mixed content)
                      if (text && text.includes("@") && text.length < 100) {
                        const emailMatch = text.match(
                          /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/
                        );
                        if (emailMatch) {
                          email = emailMatch[1].trim();
                          // PERBAIKAN: Verifikasi bahwa email adalah exact match atau sangat dekat
                          // Skip jika ada banyak text lain di sekitar email
                          const cleanedText = text.replace(/\s+/g, '');
                          const cleanedEmail = emailMatch[1].replace(/\s+/g, '');
                          if (cleanedText === cleanedEmail || cleanedText.includes(cleanedEmail)) {
                            break;
                          }
                        }
                      }
                    }

                    // Fallback: Try other elements containing @
                    if (!email) {
                      const allElements = document.querySelectorAll("*");
                      for (const el of allElements) {
                        const text = el.textContent?.trim();
                        // PERBAIKAN: Skip large elements dan pastikan exact match
                        if (text && text.includes("@") && text.length < 50) {
                          const emailMatch = text.match(
                            /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/
                          );
                          if (emailMatch) {
                            email = emailMatch[1].trim();
                            break;
                          }
                        }
                      }
                    }
                  }

                  // Last-resort fallback: scan entire document text for first email-like string
                  if (!email) {
                    try {
                      const walker = document.createTreeWalker(
                        document.body,
                        NodeFilter.SHOW_TEXT
                      );
                      let node;
                      const emailRegex =
                        /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
                      while ((node = walker.nextNode())) {
                        const nodeText = node.textContent?.trim();
                        // PERBAIKAN: Skip jika text node terlalu panjang
                        if (nodeText && nodeText.length < 50) {
                          const m = nodeText.match(emailRegex);
                          if (m) {
                            email = m[0].trim();
                            break;
                          }
                        }
                      }
                    } catch (e) {
                      // ignore
                    }
                  }

                  console.log("Looking for account status on page...");

                  // Find status - UPDATED WITH SPECIFIC SELECTORS FROM USER
                  const statusSelectors = [
                    // HIGHEST PRIORITY: User-provided specific selectors
                    'div[class*="flex min-w-0 items-center gap-1"][title*="Pro Trial"]',
                    'div[class*="flex min-w-0 items-center gap-1"][title*="Free"]',
                    'div[class*="flex min-w-0 items-center gap-1"][title*="Pro Plan"]',
                    'div[class*="flex min-w-0 items-center gap-1"][title*="Business"]',
                    // Specific p tag from user example
                    'p[class*="flex-shrink-0"][class*="text-sm"][class*="text-brand-gray-300"]',
                    // More flexible versions of the above
                    'div.flex.min-w-0.items-center.gap-1[title*="Trial"]',
                    'div.flex.min-w-0.items-center.gap-1[title*="Free"]',
                    'div.flex.min-w-0.items-center.gap-1[title*="Pro"]',
                    'div.flex.min-w-0.items-center.gap-1[title*="Business"]',
                    // Exact class selectors
                    "p.flex-shrink-0.text-sm.text-brand-gray-300",
                    // FALLBACK: Previous selectors
                    'div[title="Pro Trial"] p',
                    'div[title*="Trial"] p',
                    'div[title*="Free"] p',
                    'div[title*="Pro"] p',
                    'div[title*="Business"] p',
                    'div[title="Pro Trial"]',
                    'div[title="Free Plan"]',
                    'div[title="Pro Plan"]',
                    'div[title="Business Plan"]',
                    '[class*="text-brand-gray-300"]',
                    'div[title*="Plan"] p',
                    'div[title*="plan"] p',
                    "div.flex.min-w-0.items-center.gap-1 p",
                    // Manual :contains() implementation
                    'p:contains("Trial")',
                    'p:contains("Free")',
                    'p:contains("Pro")',
                    'span[class*="text-brand-gray-300"]',
                    '[class*="text-sm"]:contains("Trial")',
                    '[class*="text-sm"]:contains("Free")',
                    '[class*="text-sm"]:contains("Pro")',
                  ];

                  for (const selector of statusSelectors) {
                    let statusEls;

                    // Handle :contains() pseudo-selector manually since it's not supported in all browsers
                    if (selector.includes(":contains(")) {
                      const baseSelector = selector.split(":contains(")[0];
                      const searchText = selector
                        .split(":contains(")[1]
                        .replace(")", "")
                        .replace(/"/g, "");
                      statusEls = Array.from(
                        document.querySelectorAll(baseSelector)
                      ).filter((el) =>
                        el.textContent
                          .toLowerCase()
                          .includes(searchText.toLowerCase())
                      );
                    } else {
                      statusEls = document.querySelectorAll(selector);
                    }

                    for (const el of statusEls) {
                      const text = el.textContent.trim().toLowerCase();
                      const title = el.getAttribute("title") || "";
                      const titleLower = title.toLowerCase();

                      if (text || title) {
                        console.log(
                          `Found status element with text: "${text}", title: "${title}"`
                        );

                        // PERBAIKAN: Check title attribute first (more reliable) dengan priority yang benar
                        // Priority: Pro Trial > Free > Business > Pro Plan
                        if (
                          titleLower.includes("pro trial") ||
                          titleLower === "pro trial" ||
                          titleLower.includes("trial")
                        ) {
                          status = "pro trial";
                          break;
                        } else if (titleLower.includes("free")) {
                          status = "free";
                          break;
                        } else if (titleLower.includes("business")) {
                          status = "business";
                          break;
                        } else if (
                          titleLower.includes("pro plan") ||
                          titleLower === "pro plan"
                        ) {
                          status = "pro plan";
                          break;
                        }

                        // Then check text content with same priority
                        else if (
                          text.includes("pro trial") ||
                          text.includes("trial")
                        ) {
                          status = "pro trial";
                          break;
                        } else if (text.includes("free")) {
                          status = "free";
                          break;
                        } else if (text.includes("business")) {
                          status = "business";
                          break;
                        } else if (text.includes("pro")) {
                          // PERBAIKAN: Hanya set "pro plan" jika tidak ada "trial" di text
                          if (!text.includes("trial")) {
                            status = "pro plan";
                            break;
                          }
                        }
                      }
                    }
                    if (status !== "unknown") break;
                  }

                  // Fallback: check title attributes and aria-labels
                  if (status === "unknown") {
                    const titleEls = document.querySelectorAll(
                      '[title*="Plan"], [title*="plan"], [title*="Trial"], [title*="trial"]'
                    );
                    for (const el of titleEls) {
                      const title = el.getAttribute("title").toLowerCase();
                      // PERBAIKAN: Priority yang benar
                      if (
                        title.includes("pro trial") ||
                        title.includes("trial")
                      ) {
                        status = "pro trial";
                        break;
                      } else if (title.includes("free")) {
                        status = "free";
                        break;
                      } else if (title.includes("business")) {
                        status = "business";
                        break;
                      } else if (title.includes("pro") && !title.includes("trial")) {
                        status = "pro plan";
                        break;
                      }
                    }
                  }

                  // Additional fallback: search all text containing status keywords
                  if (status === "unknown") {
                    const allTextElements =
                      document.querySelectorAll("p, span, div");
                    for (const el of allTextElements) {
                      const text = el.textContent.trim().toLowerCase();
                      if (
                        text === "pro trial" ||
                        text === "free plan" ||
                        text === "free" ||
                        text === "pro plan" ||
                        text === "business plan" ||
                        text === "business"
                      ) {
                        console.log(`Found status in fallback: "${text}"`);
                        // PERBAIKAN: Priority dan exact match
                        if (
                          text === "pro trial" ||
                          text.includes("trial")
                        ) {
                          status = "pro trial";
                          break;
                        } else if (text === "free" || text === "free plan") {
                          status = "free";
                          break;
                        } else if (text === "business" || text === "business plan") {
                          status = "business";
                          break;
                        } else if ((text === "pro plan" || text === "pro") && !text.includes("trial")) {
                          status = "pro plan";
                          break;
                        }
                      }
                    }
                  }

                  // PERBAIKAN: Clean up extracted data sebelum return
                  // Remove common UI text yang mungkin tercampur
                  const cleanupText = (text) => {
                    if (!text) return text;
                    // Remove common words yang bisa tercampur
                    const contaminations = [
                      'English', 'Settings', 'Dashboard', 'Profile',
                      'Sign out', 'Logout', 'Menu', 'Account'
                    ];
                    let cleaned = text;
                    for (const word of contaminations) {
                      cleaned = cleaned.replace(new RegExp(word, 'gi'), '').trim();
                    }
                    return cleaned;
                  };

                  // Clean email dan username
                  if (email) {
                    email = cleanupText(email);
                    // Validate email format sekali lagi
                    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
                    if (!emailRegex.test(email)) {
                      console.warn(`Invalid email after cleanup: "${email}"`);
                      email = null; // Reset jika tidak valid
                    }
                  }

                  if (username) {
                    username = cleanupText(username);
                  }

                  // Debug logging (can be removed in production)
                  console.log("Extracted account info:", {
                    username,
                    email,
                    status,
                  });

                  // Fallback logic for username and email
                  if (!email && username) {
                    email = username;
                  }

                  // Extract username from email if no separate username found
                  if (email && !username) {
                    const emailParts = email.split("@");
                    if (emailParts.length > 1 && emailParts[0].length > 2) {
                      username = emailParts[0]; // e.g., "vogogek963" from "vogogek963@namestal.com"
                    } else {
                      username = email; // Fallback to full email
                    }
                  }

                  // Final fallback: if still no username, use email
                  if (!username && email) {
                    username = email;
                  }

                  return { username, email, status };
                };

                return extractInfo();
              },
            });

            if (result && result[0] && result[0].result) {
              sendResponse({ success: true, data: result[0].result });
            } else {
              sendResponse({ success: false, error: "Could not extract info" });
            }
          } else {
            sendResponse({ success: false, error: "Not on cursor.com" });
          }
          break;

        // Payment service handlers
        case "importPaymentCards":
          await paymentService.initializeDB();
          const importedCount = await paymentService.importCards(
            request.cardData,
            request.replace || false
          );
          sendResponse({ success: true, data: importedCount });
          break;

        case "exportPaymentCards":
          await paymentService.initializeDB();
          const exportData = await paymentService.exportCards();
          sendResponse({ success: true, data: exportData });
          break;

        case "getPaymentCards":
          await paymentService.initializeDB();
          const cards = await paymentService.getCards();
          sendResponse({ success: true, data: cards });
          break;

        case "removePaymentCard":
          await paymentService.initializeDB();
          await paymentService.removeCard(request.cardId);
          sendResponse({ success: true });
          break;

        case "clearPaymentCards":
          await paymentService.initializeDB();
          await paymentService.clearAllCards();
          sendResponse({ success: true });
          break;

        case "autoFillPayment":
          // Get card data first
          await paymentService.initializeDB();
          const cardData = await paymentService.getCard(request.cardId);
          if (!cardData) {
            sendResponse({ success: false, error: "Card not found" });
            break;
          }

          // Execute auto-fill in the current tab
          const [currentTab] = await chrome.tabs.query({
            active: true,
            currentWindow: true,
          });

          if (!currentTab) {
            sendResponse({ success: false, error: "No active tab found" });
            break;
          }

          try {
            const result = await chrome.scripting.executeScript({
              target: { tabId: currentTab.id },
              func: (card) => {
                // Auto-fill payment fields with improved Stripe support
                const fillInput = (element, value) => {
                  if (!element || !value) return false;

                  // Focus the element first
                  element.focus();

                  // Clear existing value
                  element.value = "";

                  // Simulate typing for React/Stripe forms
                  for (let i = 0; i < value.length; i++) {
                    const char = value[i];

                    // KeyDown event
                    const keyDownEvent = new KeyboardEvent("keydown", {
                      key: char,
                      keyCode: char.charCodeAt(0),
                      which: char.charCodeAt(0),
                      bubbles: true,
                      cancelable: true,
                    });
                    element.dispatchEvent(keyDownEvent);

                    // Update value progressively
                    element.value = value.substring(0, i + 1);

                    // Input event after each character
                    const inputEvent = new Event("input", { bubbles: true });
                    element.dispatchEvent(inputEvent);

                    // KeyUp event
                    const keyUpEvent = new KeyboardEvent("keyup", {
                      key: char,
                      keyCode: char.charCodeAt(0),
                      which: char.charCodeAt(0),
                      bubbles: true,
                      cancelable: true,
                    });
                    element.dispatchEvent(keyUpEvent);
                  }

                  // Final events
                  const events = ["change", "blur"];
                  events.forEach((eventType) => {
                    const event = new Event(eventType, { bubbles: true });
                    element.dispatchEvent(event);
                  });

                  return true;
                };

                let filledCount = 0;

                // Stripe-specific selectors first, then generic
                const cardNumberSelectors = [
                  "#cardNumber",
                  'input[name="cardNumber"]',
                  'input[autocomplete="cc-number"]',
                  'input[aria-label*="Card number"]',
                  'input.CheckoutInput[autocomplete="cc-number"]',
                ];

                const expirySelectors = [
                  "#cardExpiry",
                  'input[name="cardExpiry"]',
                  'input[autocomplete="cc-exp"]',
                  'input[aria-label*="Expiration"]',
                  'input.CheckoutInput[autocomplete="cc-exp"]',
                ];

                const cvcSelectors = [
                  "#cardCvc",
                  'input[name="cardCvc"]',
                  'input[autocomplete="cc-csc"]',
                  'input[aria-label*="CVC"]',
                  'input.CheckoutInput[autocomplete="cc-csc"]',
                ];

                // Fill card number
                for (const selector of cardNumberSelectors) {
                  const element = document.querySelector(selector);
                  if (element && element.offsetParent !== null) {
                    if (fillInput(element, card.number)) filledCount++;
                    break;
                  }
                }

                // Fill expiry
                for (const selector of expirySelectors) {
                  const element = document.querySelector(selector);
                  if (element && element.offsetParent !== null) {
                    if (fillInput(element, card.expiry)) filledCount++;
                    break;
                  }
                }

                // Fill CVC
                for (const selector of cvcSelectors) {
                  const element = document.querySelector(selector);
                  if (element && element.offsetParent !== null) {
                    if (fillInput(element, card.cvc)) filledCount++;
                    break;
                  }
                }

                return { filled: filledCount, cardType: card.type };
              },
              args: [cardData],
            });

            if (result && result[0] && result[0].result.filled > 0) {
              sendResponse({
                success: true,
                data: {
                  filled: result[0].result.filled,
                  cardType: result[0].result.cardType,
                },
              });
            } else {
              sendResponse({
                success: false,
                error: "No payment fields found or filled",
              });
            }
          } catch (error) {
            sendResponse({ success: false, error: error.message });
          }
          break;

        case "findPaymentFields":
          // Find payment fields in current tab
          const [activeTab] = await chrome.tabs.query({
            active: true,
            currentWindow: true,
          });

          if (!activeTab) {
            sendResponse({ success: false, error: "No active tab found" });
            break;
          }

          try {
            const result = await chrome.scripting.executeScript({
              target: { tabId: activeTab.id },
              func: () => {
                // Find payment form fields
                const fields = {
                  cardNumber: null,
                  expiry: null,
                  cvc: null,
                  name: null,
                };

                const cardNumberSelectors = [
                  'input[name*="card"]',
                  'input[name*="number"]',
                  'input[placeholder*="card"]',
                  'input[autocomplete="cc-number"]',
                  "#card-number",
                ];

                for (const selector of cardNumberSelectors) {
                  const element = document.querySelector(selector);
                  if (element && element.offsetParent !== null) {
                    fields.cardNumber = true;
                    break;
                  }
                }

                // Similar logic for other fields...
                const expirySelectors = [
                  'input[name*="expir"]',
                  'input[placeholder*="MM/YY"]',
                ];
                for (const selector of expirySelectors) {
                  const element = document.querySelector(selector);
                  if (element && element.offsetParent !== null) {
                    fields.expiry = true;
                    break;
                  }
                }

                const cvcSelectors = [
                  'input[name*="cvc"]',
                  'input[name*="cvv"]',
                ];
                for (const selector of cvcSelectors) {
                  const element = document.querySelector(selector);
                  if (element && element.offsetParent !== null) {
                    fields.cvc = true;
                    break;
                  }
                }

                return {
                  found: Object.values(fields).filter(Boolean).length,
                  fields: fields,
                };
              },
            });

            sendResponse({ success: true, data: result[0].result });
          } catch (error) {
            sendResponse({ success: false, error: error.message });
          }
          break;

        case "deleteFreeAccount":
          try {
            const result = await accountDeletionService.deleteFreeAccount();
            sendResponse(result);
          } catch (error) {
            sendResponse({ success: false, error: error.message });
          }
          break;

        case "deleteProTrialAccount":
          try {
            const result = await accountDeletionService.deleteProTrialAccount();
            sendResponse(result);
          } catch (error) {
            sendResponse({ success: false, error: error.message });
          }
          break;

        case "checkDeletionStatus":
          sendResponse({
            success: true,
            inProgress: accountDeletionService.isDeletionInProgress(),
          });
          break;

        case "cancelDeletion":
          accountDeletionService.cancelDeletion();
          sendResponse({ success: true, message: "Deletion cancelled" });
          break;

        // ============= BYPASS TESTING HANDLERS =============
        case "startBypassTest":
          try {
            console.log(
              "[Background] Starting bypass test with URL:",
              request.targetUrl
            );

            // Initialize bypass testing
            const bypassTestId = Date.now().toString();

            // Store initial test state
            await chrome.storage.local.set({
              bypassTest: {
                id: bypassTestId,
                targetUrl:
                  request.targetUrl ||
                  "https://cursor.com/dashboard?tab=settings",
                techniques: request.techniques || ["all"],
                running: true,
                progress: 0,
                total: 10, // We have 10 techniques
                current: "Initializing...",
                results: [],
              },
            });

            // Open the target URL or navigate to settings page
            const targetUrl =
              request.targetUrl || "https://cursor.com/dashboard?tab=settings";

            // Check if tab already exists with cursor.com
            const existingTabs = await chrome.tabs.query({
              url: "https://*.cursor.com/*",
            });

            let tab;
            if (existingTabs.length > 0) {
              // Use existing tab
              tab = existingTabs[0];
              await chrome.tabs.update(tab.id, {
                url: targetUrl,
                active: true,
              });
            } else {
              // Create new tab
              tab = await chrome.tabs.create({
                url: targetUrl,
                active: true,
              });
            }

            // Wait for page to load then inject script
            setTimeout(async () => {
              try {
                // Inject the working bypass script
                await chrome.scripting.executeScript({
                  target: { tabId: tab.id },
                  files: ["bypass_working.js"],
                });

                console.log("[Background] Bypass script injected");

                // Wait a bit for modal to appear, then execute
                setTimeout(() => {
                  chrome.tabs.sendMessage(
                    tab.id,
                    {
                      type: "executeDeleteBypass",
                    },
                    (response) => {
                      if (response && response.success) {
                        // Update storage with results
                        chrome.storage.local.get("bypassTest", (data) => {
                          if (data.bypassTest) {
                            data.bypassTest.running = false;
                            data.bypassTest.progress = 10;
                            data.bypassTest.results = response.results;
                            chrome.storage.local.set({
                              bypassTest: data.bypassTest,
                            });
                          }
                        });
                      }
                    }
                  );
                }, 3000); // Wait 3 seconds for page/modal to load
              } catch (error) {
                console.error("[Background] Error injecting script:", error);
              }
            }, 2000); // Wait 2 seconds for initial page load

            sendResponse({ success: true, testId: bypassTestId });
          } catch (error) {
            console.error("[Background] Error starting bypass test:", error);
            sendResponse({ success: false, error: error.message });
          }
          break;

        case "stopBypassTest":
          try {
            // Stop the running bypass test
            await chrome.storage.local.set({
              bypassTest: {
                running: false,
              },
            });

            sendResponse({ success: true });
          } catch (error) {
            sendResponse({ success: false, error: error.message });
          }
          break;

        case "getBypassProgress":
          try {
            // Get current bypass test progress
            const { bypassTest } = await chrome.storage.local.get("bypassTest");

            if (bypassTest) {
              sendResponse({
                success: true,
                data: {
                  progress: bypassTest.progress || 0,
                  total: bypassTest.total || 0,
                  current: bypassTest.current || null,
                  results: bypassTest.results || [],
                },
              });
            } else {
              sendResponse({
                success: true,
                data: {
                  progress: 0,
                  total: 0,
                  current: null,
                  results: [],
                },
              });
            }
          } catch (error) {
            sendResponse({ success: false, error: error.message });
          }
          break;

        case "updateBypassProgress":
          try {
            // Update bypass test progress (called from content script)
            const { bypassTest } = await chrome.storage.local.get("bypassTest");

            if (bypassTest && bypassTest.running) {
              bypassTest.progress = request.progress || bypassTest.progress;
              bypassTest.total = request.total || bypassTest.total;
              bypassTest.current = request.current || bypassTest.current;

              if (request.result) {
                bypassTest.results = bypassTest.results || [];
                bypassTest.results.push(request.result);
              }

              await chrome.storage.local.set({ bypassTest });
            }

            sendResponse({ success: true });
          } catch (error) {
            sendResponse({ success: false, error: error.message });
          }
          break;

        case "bypassProgress":
          // Update progress from content script
          try {
            const { bypassTest } = await chrome.storage.local.get("bypassTest");

            if (bypassTest) {
              bypassTest.progress = request.current || bypassTest.progress;
              bypassTest.current = `Testing technique ${request.current}/${request.total}`;

              if (request.result) {
                bypassTest.results.push(request.result);
              }

              await chrome.storage.local.set({ bypassTest });
            }

            sendResponse({ success: true });
          } catch (error) {
            sendResponse({ success: false, error: error.message });
          }
          break;

        case "deleteModalDetected":
          // Modal detected, auto-start bypass
          console.log("[Background] Delete modal detected at:", request.url);
          sendResponse({ success: true });
          break;

        case "detectApiEndpoints":
          // This will be handled by content script
          sendResponse({
            success: false,
            error: "Should be handled by content script",
          });
          break;

        case "bypassResultsJSON":
          // Handle bypass results JSON from content script
          try {
            console.log("[Background] Received bypass results JSON");

            // Store the results
            await chrome.storage.local.set({
              lastBypassResults: {
                data: request.data,
                timestamp: new Date().toISOString(),
              },
            });

            // Forward to sidepanel if open
            try {
              const views = await chrome.extension.getViews({ type: "popup" });
              const sidepanelViews = chrome.runtime.getContexts
                ? await chrome.runtime.getContexts({
                    contextTypes: ["SIDE_PANEL"],
                  })
                : [];

              if (views.length > 0 || sidepanelViews.length > 0) {
                // Send to sidepanel
                chrome.runtime.sendMessage({
                  type: "displayBypassJSON",
                  data: request.data,
                });
              }
            } catch (e) {
              console.log("[Background] Could not forward to sidepanel:", e);
            }

            sendResponse({ success: true });
          } catch (error) {
            sendResponse({ success: false, error: error.message });
          }
          break;

        case "generateCards":
          try {
            const cards = generatorService.generateMultipleCards(
              request.quantity || 10,
              request.bin || "552461"
            );
            const formatted = generatorService.formatCardsForDisplay(cards);
            sendResponse({
              success: true,
              data: { cards: cards, formatted: formatted },
            });
          } catch (error) {
            sendResponse({ success: false, error: error.message });
          }
          break;

        case "generateAddress":
          try {
            const address = generatorService.generateAddress(
              request.country || "US"
            );
            const name = generatorService.generateName();
            const formatted = generatorService.formatAddressForDisplay(address);
            sendResponse({
              success: true,
              data: { address: address, name: name, formatted: formatted },
            });
          } catch (error) {
            sendResponse({ success: false, error: error.message });
          }
          break;

        case "generatePaymentData":
          try {
            const options = request.options || {};
            const paymentData = generatorService.generatePaymentData(options);
            sendResponse({
              success: true,
              data: paymentData,
            });
          } catch (error) {
            sendResponse({ success: false, error: error.message });
          }
          break;

        default:
          sendResponse({ success: false, error: "Unknown message type" });
      }
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  })();

  return true; // Keep channel open for async response
});

// Update badge on startup
chrome.runtime.onStartup.addListener(async () => {
  await accountService.initializeDB();
  const activeAccount = await accountService.getActiveAccount();
  if (activeAccount) {
    await accountService.updateBadge(activeAccount);
  }
});
