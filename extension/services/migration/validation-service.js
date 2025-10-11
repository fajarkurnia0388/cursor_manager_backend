/**
 * ✅ Validation Service
 * Memvalidasi hasil migrasi dan memastikan data integrity
 *
 * Features:
 * - Validate migration results
 * - Data consistency checks
 * - Performance verification
 * - Error detection and reporting
 * - Rollback recommendations
 */

class ValidationService {
  constructor(databaseManager) {
    this.databaseManager = databaseManager;
    this.accountsDB = null;
    this.cardsDB = null;
  }

  /**
   * Initialize validation service
   */
  async initialize() {
    this.accountsDB = this.databaseManager.getAccountsDB();
    this.cardsDB = this.databaseManager.getCardsDB();
  }

  /**
   * Validate complete migration
   */
  async validateMigration(accountsResult, cardsResult) {
    console.log("🔍 Starting migration validation...");

    if (!this.accountsDB) {
      await this.initialize();
    }

    const startTime = Date.now();
    const validation = {
      success: true,
      score: 100,
      errors: [],
      warnings: [],
      checks: {},
      executionTime: 0,
      timestamp: new Date().toISOString(),
    };

    try {
      // Run all validation checks
      const checks = await Promise.all([
        this.validateAccountsMigration(accountsResult),
        this.validateCardsMigration(cardsResult),
        this.validateDataIntegrity(),
        this.validateDatabaseHealth(),
        this.validatePerformance(),
      ]);

      // Combine results
      validation.checks = {
        accounts: checks[0],
        cards: checks[1],
        integrity: checks[2],
        health: checks[3],
        performance: checks[4],
      };

      // Calculate overall score and status
      const { score, errors, warnings } = this.calculateOverallScore(
        validation.checks
      );
      validation.score = score;
      validation.errors = errors;
      validation.warnings = warnings;
      validation.success = errors.length === 0 && score >= 80;

      validation.executionTime = Date.now() - startTime;

      if (validation.success) {
        console.log(
          `✅ Migration validation passed with score ${validation.score}/100 in ${validation.executionTime}ms`
        );
      } else {
        console.warn(
          `⚠️ Migration validation failed with score ${validation.score}/100`
        );
        console.warn("Errors:", validation.errors);
        console.warn("Warnings:", validation.warnings);
      }

      return validation;
    } catch (error) {
      console.error("❌ Migration validation error:", error);
      validation.success = false;
      validation.errors.push(`Validation error: ${error.message}`);
      validation.executionTime = Date.now() - startTime;
      return validation;
    }
  }

  /**
   * Validate accounts migration
   */
  async validateAccountsMigration(accountsResult) {
    const validation = {
      success: true,
      score: 100,
      errors: [],
      warnings: [],
      checks: [],
    };

    try {
      console.log("👥 Validating accounts migration...");

      // Check 1: Migration results structure
      if (!accountsResult || typeof accountsResult !== "object") {
        validation.errors.push("Invalid accounts migration result structure");
        validation.score -= 30;
      } else {
        validation.checks.push({
          name: "Migration Result Structure",
          status: "pass",
          message: "Valid result structure",
        });
      }

      // Check 2: Migration success rate
      if (accountsResult.totalAccounts > 0) {
        const successRate =
          (accountsResult.migratedAccounts / accountsResult.totalAccounts) *
          100;

        if (successRate < 90) {
          validation.errors.push(
            `Low migration success rate: ${successRate.toFixed(1)}%`
          );
          validation.score -= 25;
        } else if (successRate < 100) {
          validation.warnings.push(
            `Some accounts failed to migrate: ${successRate.toFixed(1)}%`
          );
          validation.score -= 10;
        }

        validation.checks.push({
          name: "Migration Success Rate",
          status: successRate >= 90 ? "pass" : "fail",
          message: `${successRate.toFixed(1)}% success rate`,
          value: successRate,
        });
      }

      // Check 3: Database content validation
      const dbAccounts = await this.accountsDB.getAllAccounts();
      const expectedCount = accountsResult.migratedAccounts || 0;

      if (dbAccounts.length !== expectedCount) {
        validation.errors.push(
          `Account count mismatch: expected ${expectedCount}, found ${dbAccounts.length}`
        );
        validation.score -= 20;
      }

      validation.checks.push({
        name: "Database Content Count",
        status: dbAccounts.length === expectedCount ? "pass" : "fail",
        message: `${dbAccounts.length}/${expectedCount} accounts in database`,
        expected: expectedCount,
        actual: dbAccounts.length,
      });

      // Check 4: Account data completeness
      let completeAccounts = 0;
      let incompleteAccounts = [];

      for (const account of dbAccounts) {
        if (account.email && account.cookies && account.cookies.length > 0) {
          completeAccounts++;
        } else {
          incompleteAccounts.push({
            name: account.name,
            issues: [
              !account.email && "missing email",
              !account.cookies && "missing cookies",
              account.cookies?.length === 0 && "no cookies",
            ].filter(Boolean),
          });
        }
      }

      if (incompleteAccounts.length > 0) {
        validation.warnings.push(
          `${incompleteAccounts.length} accounts have incomplete data`
        );
        validation.score -= 5;
      }

      validation.checks.push({
        name: "Account Data Completeness",
        status: incompleteAccounts.length === 0 ? "pass" : "warning",
        message: `${completeAccounts}/${dbAccounts.length} complete accounts`,
        incompleteAccounts,
      });

      // Check 5: Active account validation
      const activeAccount = await this.accountsDB.getActiveAccount();
      if (dbAccounts.length > 0 && !activeAccount) {
        validation.warnings.push("No active account set");
        validation.score -= 5;
      }

      validation.checks.push({
        name: "Active Account",
        status: activeAccount ? "pass" : "warning",
        message: activeAccount
          ? `Active: ${activeAccount}`
          : "No active account",
        activeAccount,
      });

      validation.success = validation.errors.length === 0;
    } catch (error) {
      console.error("❌ Accounts validation error:", error);
      validation.success = false;
      validation.errors.push(`Accounts validation error: ${error.message}`);
      validation.score -= 50;
    }

    return validation;
  }

  /**
   * Validate cards migration
   */
  async validateCardsMigration(cardsResult) {
    const validation = {
      success: true,
      score: 100,
      errors: [],
      warnings: [],
      checks: [],
    };

    try {
      console.log("💳 Validating cards migration...");

      // Check 1: Migration results structure
      if (!cardsResult || typeof cardsResult !== "object") {
        validation.errors.push("Invalid cards migration result structure");
        validation.score -= 30;
      } else {
        validation.checks.push({
          name: "Migration Result Structure",
          status: "pass",
          message: "Valid result structure",
        });
      }

      // Check 2: Migration success rate (if cards existed)
      if (cardsResult.totalCards > 0) {
        const successRate =
          (cardsResult.migratedCards / cardsResult.totalCards) * 100;

        if (successRate < 90) {
          validation.errors.push(
            `Low migration success rate: ${successRate.toFixed(1)}%`
          );
          validation.score -= 25;
        } else if (successRate < 100) {
          validation.warnings.push(
            `Some cards failed to migrate: ${successRate.toFixed(1)}%`
          );
          validation.score -= 10;
        }

        validation.checks.push({
          name: "Migration Success Rate",
          status: successRate >= 90 ? "pass" : "fail",
          message: `${successRate.toFixed(1)}% success rate`,
          value: successRate,
        });
      } else {
        validation.checks.push({
          name: "Migration Success Rate",
          status: "skip",
          message: "No cards to migrate",
        });
      }

      // Check 3: Database content validation
      const dbCards = await this.cardsDB.getAllCards();
      const expectedCount = cardsResult.migratedCards || 0;

      if (dbCards.length !== expectedCount) {
        validation.errors.push(
          `Card count mismatch: expected ${expectedCount}, found ${dbCards.length}`
        );
        validation.score -= 20;
      }

      validation.checks.push({
        name: "Database Content Count",
        status: dbCards.length === expectedCount ? "pass" : "fail",
        message: `${dbCards.length}/${expectedCount} cards in database`,
        expected: expectedCount,
        actual: dbCards.length,
      });

      // Check 4: Card data completeness
      let completeCards = 0;
      let incompleteCards = [];

      for (const card of dbCards) {
        if (card.card_number_masked && card.expiry_display && card.card_type) {
          completeCards++;
        } else {
          incompleteCards.push({
            id: card.id,
            issues: [
              !card.card_number_masked && "missing masked number",
              !card.expiry_display && "missing expiry",
              !card.card_type && "missing type",
            ].filter(Boolean),
          });
        }
      }

      if (incompleteCards.length > 0) {
        validation.warnings.push(
          `${incompleteCards.length} cards have incomplete data`
        );
        validation.score -= 5;
      }

      validation.checks.push({
        name: "Card Data Completeness",
        status: incompleteCards.length === 0 ? "pass" : "warning",
        message: `${completeCards}/${dbCards.length} complete cards`,
        incompleteCards,
      });

      validation.success = validation.errors.length === 0;
    } catch (error) {
      console.error("❌ Cards validation error:", error);
      validation.success = false;
      validation.errors.push(`Cards validation error: ${error.message}`);
      validation.score -= 50;
    }

    return validation;
  }

  /**
   * Validate data integrity
   */
  async validateDataIntegrity() {
    const validation = {
      success: true,
      score: 100,
      errors: [],
      warnings: [],
      checks: [],
    };

    try {
      console.log("🔒 Validating data integrity...");

      // Check 1: Database connections
      const healthCheck = await this.databaseManager.healthCheck();

      if (healthCheck.status !== "healthy") {
        validation.errors.push("Database health check failed");
        validation.score -= 40;
      }

      validation.checks.push({
        name: "Database Health",
        status: healthCheck.status === "healthy" ? "pass" : "fail",
        message: `Database status: ${healthCheck.status}`,
        details: healthCheck,
      });

      // Check 2: Foreign key constraints (for cards with categories)
      // This would check if all foreign key relationships are valid

      // Check 3: Data consistency checks
      const stats = await this.databaseManager.getStats();

      validation.checks.push({
        name: "Database Statistics",
        status: "pass",
        message: "Database statistics collected",
        stats: {
          accounts: stats.databases.accounts.total_accounts,
          cards: stats.databases.cards.total_cards,
          queries: stats.total.queries,
          errors: stats.total.errors,
        },
      });

      validation.success = validation.errors.length === 0;
    } catch (error) {
      console.error("❌ Data integrity validation error:", error);
      validation.success = false;
      validation.errors.push(
        `Data integrity validation error: ${error.message}`
      );
      validation.score -= 50;
    }

    return validation;
  }

  /**
   * Validate database health
   */
  async validateDatabaseHealth() {
    const validation = {
      success: true,
      score: 100,
      errors: [],
      warnings: [],
      checks: [],
    };

    try {
      console.log("💓 Validating database health...");

      const healthCheck = await this.databaseManager.healthCheck();

      // Overall health check
      if (healthCheck.status === "healthy") {
        validation.checks.push({
          name: "Overall Health",
          status: "pass",
          message: "All databases are healthy",
          score: healthCheck.score,
        });
      } else {
        validation.errors.push(
          `Database health issues detected: ${healthCheck.status}`
        );
        validation.score -= 30;

        validation.checks.push({
          name: "Overall Health",
          status: "fail",
          message: `Health status: ${healthCheck.status}`,
          score: healthCheck.score,
        });
      }

      // Individual database checks
      if (healthCheck.databases) {
        // Accounts database health
        const accountsHealth = healthCheck.databases.accounts;
        validation.checks.push({
          name: "Accounts Database Health",
          status: accountsHealth.status === "healthy" ? "pass" : "warning",
          message: `Status: ${accountsHealth.status}`,
          stats: accountsHealth.stats,
        });

        // Cards database health
        const cardsHealth = healthCheck.databases.cards;
        validation.checks.push({
          name: "Cards Database Health",
          status: cardsHealth.status === "healthy" ? "pass" : "warning",
          message: `Status: ${cardsHealth.status}`,
          stats: cardsHealth.stats,
        });
      }

      validation.success = validation.errors.length === 0;
    } catch (error) {
      console.error("❌ Database health validation error:", error);
      validation.success = false;
      validation.errors.push(
        `Database health validation error: ${error.message}`
      );
      validation.score -= 50;
    }

    return validation;
  }

  /**
   * Validate performance
   */
  async validatePerformance() {
    const validation = {
      success: true,
      score: 100,
      errors: [],
      warnings: [],
      checks: [],
    };

    try {
      console.log("⚡ Validating performance...");

      // Test basic query performance
      const startTime = Date.now();

      const [accounts, cards] = await Promise.all([
        this.accountsDB.getAllAccounts(),
        this.cardsDB.getAllCards(),
      ]);

      const queryTime = Date.now() - startTime;

      // Check if queries are reasonably fast (< 1 second for normal datasets)
      if (queryTime > 1000) {
        validation.warnings.push(`Slow query performance: ${queryTime}ms`);
        validation.score -= 15;
      }

      validation.checks.push({
        name: "Query Performance",
        status: queryTime <= 1000 ? "pass" : "warning",
        message: `Query time: ${queryTime}ms`,
        queryTime,
        recordsReturned: accounts.length + cards.length,
      });

      // Check database stats for error rates
      const stats = await this.databaseManager.getStats();
      const totalQueries = stats.total.queries;
      const totalErrors = stats.total.errors;
      const errorRate =
        totalQueries > 0 ? (totalErrors / totalQueries) * 100 : 0;

      if (errorRate > 5) {
        validation.errors.push(`High error rate: ${errorRate.toFixed(2)}%`);
        validation.score -= 25;
      } else if (errorRate > 1) {
        validation.warnings.push(
          `Elevated error rate: ${errorRate.toFixed(2)}%`
        );
        validation.score -= 10;
      }

      validation.checks.push({
        name: "Error Rate",
        status: errorRate <= 1 ? "pass" : errorRate <= 5 ? "warning" : "fail",
        message: `${errorRate.toFixed(2)}% error rate`,
        errorRate,
        totalQueries,
        totalErrors,
      });

      validation.success = validation.errors.length === 0;
    } catch (error) {
      console.error("❌ Performance validation error:", error);
      validation.success = false;
      validation.errors.push(`Performance validation error: ${error.message}`);
      validation.score -= 50;
    }

    return validation;
  }

  /**
   * Calculate overall validation score
   */
  calculateOverallScore(checks) {
    const errors = [];
    const warnings = [];
    let totalScore = 0;
    let checkCount = 0;

    for (const [category, check] of Object.entries(checks)) {
      if (check.errors)
        errors.push(...check.errors.map((e) => `${category}: ${e}`));
      if (check.warnings)
        warnings.push(...check.warnings.map((w) => `${category}: ${w}`));

      if (typeof check.score === "number") {
        totalScore += check.score;
        checkCount++;
      }
    }

    const averageScore = checkCount > 0 ? totalScore / checkCount : 0;

    return {
      score: Math.round(Math.max(0, Math.min(100, averageScore))),
      errors,
      warnings,
    };
  }

  /**
   * Generate validation report
   */
  generateReport(validation) {
    const report = {
      summary: {
        success: validation.success,
        score: validation.score,
        executionTime: validation.executionTime,
        timestamp: validation.timestamp,
      },
      overview: {
        totalErrors: validation.errors.length,
        totalWarnings: validation.warnings.length,
        checksRun: Object.keys(validation.checks).length,
      },
      recommendations: this.generateRecommendations(validation),
      details: validation.checks,
    };

    return report;
  }

  /**
   * Generate recommendations based on validation results
   */
  generateRecommendations(validation) {
    const recommendations = [];

    if (!validation.success) {
      recommendations.push({
        priority: "high",
        action: "Consider rolling back the migration",
        reason: "Critical validation errors detected",
      });
    }

    if (validation.score < 90) {
      recommendations.push({
        priority: "medium",
        action: "Review migration issues and consider re-migration",
        reason: `Low validation score: ${validation.score}/100`,
      });
    }

    if (validation.warnings.length > 0) {
      recommendations.push({
        priority: "low",
        action: "Address validation warnings",
        reason: `${validation.warnings.length} warnings detected`,
        warnings: validation.warnings.slice(0, 3), // Show first 3
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        priority: "info",
        action: "Migration validation passed successfully",
        reason: "No issues detected",
      });
    }

    return recommendations;
  }
}

// Export untuk digunakan di extension
if (typeof module !== "undefined") {
  module.exports = ValidationService;
}

// For service worker context
if (typeof self !== "undefined") {
  self.ValidationService = ValidationService;
}


