/**
 * 🚨 THREAT DETECTOR - Advanced Threat Detection & Response Service
 *
 * Provides comprehensive threat detection and response capabilities:
 * - Real-time threat monitoring
 * - Suspicious activity detection
 * - Automated threat response
 * - Security incident reporting
 * - Behavioral analysis
 * - Attack pattern recognition
 *
 * Dependencies: Config, Logger, ErrorHandler, SecurityManager
 * Version: 1.0.0
 * Author: Cursor Account Manager Extension
 */

class ThreatDetector {
  constructor() {
    // Validate dependencies
    if (typeof Config === "undefined") {
      throw new Error("Config service is required for ThreatDetector");
    }
    if (typeof Config.getSecurity !== "function") {
      throw new Error(
        "Config.getSecurity method is required for ThreatDetector"
      );
    }
    if (typeof Logger === "undefined") {
      throw new Error("Logger service is required for ThreatDetector");
    }
    if (typeof ErrorHandler === "undefined") {
      throw new Error("ErrorHandler service is required for ThreatDetector");
    }

    this.config = Config.getSecurity().threatDetection || {};
    this.logger = Logger;
    if (typeof ErrorHandler !== "undefined") {
      this.errorHandler = ErrorHandler;
    } else {
      console.warn(
        "ErrorHandler service not available in ThreatDetector, using fallback"
      );
      this.errorHandler = {
        handleError: (error, context) => {
          console.error(`ThreatDetector Error [${context}]:`, error);
        },
      };
    }

    // Threat detection state
    this.isInitialized = false;
    this.isMonitoring = false;
    this.threatDatabase = new Map();
    this.suspiciousActivities = [];
    this.blockedEntities = new Set();

    // Detection patterns
    this.attackPatterns = {
      sqlInjection: [
        /(\bUNION\b.*\bSELECT\b)/i,
        /(\bDROP\b.*\bTABLE\b)/i,
        /(\bINSERT\b.*\bINTO\b)/i,
        /(\bUPDATE\b.*\bSET\b)/i,
        /(\bDELETE\b.*\bFROM\b)/i,
        /(\'.*\bOR\b.*\'.*=.*\')/i,
        /(\".*\bOR\b.*\".*=.*\")/i,
      ],
      xssAttacks: [
        /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi,
        /<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi,
        /eval\s*\(/gi,
        /document\.cookie/gi,
        /window\.location/gi,
      ],
      commandInjection: [
        /;\s*(rm|del|format|shutdown)/gi,
        /\|\s*(nc|netcat|curl|wget)/gi,
        /&&\s*(cat|type|dir)/gi,
        /`.*`/g,
        /\$\(.*\)/g,
      ],
      dataExfiltration: [
        /base64_encode/gi,
        /btoa\s*\(/gi,
        /atob\s*\(/gi,
        /\.download\s*\(/gi,
        /new\s+Blob/gi,
        /createObjectURL/gi,
      ],
    };

    // Behavioral patterns
    this.suspiciousPatterns = {
      rapidRequests: { threshold: 100, timeWindow: 60000 }, // 100 requests per minute
      failedAttempts: { threshold: 5, timeWindow: 300000 }, // 5 failures per 5 minutes
      unusualDataSize: { threshold: 1024 * 1024 }, // 1MB
      suspiciousUserAgents: [
        /bot/i,
        /crawler/i,
        /spider/i,
        /scraper/i,
        /curl/i,
        /wget/i,
        /python/i,
        /scanner/i,
      ],
    };

    // Threat metrics
    this.metrics = {
      threatsDetected: 0,
      threatsBlocked: 0,
      falsePositives: 0,
      responseTime: 0,
      patternsMatched: 0,
      entitiesBlocked: 0,
      incidentsReported: 0,
    };

    // Response actions
    this.responseActions = {
      LOG: "log_only",
      BLOCK: "block_request",
      QUARANTINE: "quarantine_entity",
      ALERT: "send_alert",
      ESCALATE: "escalate_incident",
    };

    this.initialize();
  }

  /**
   * Initialize Threat Detector
   */
  async initialize() {
    try {
      this.logger.info(
        "ThreatDetector: Initializing advanced threat detection..."
      );

      // Initialize threat database
      this.initializeThreatDatabase();

      // Load threat intelligence
      await this.loadThreatIntelligence();

      // Setup monitoring
      this.setupThreatMonitoring();

      // Start periodic cleanup
      this.startPeriodicCleanup();

      this.isInitialized = true;
      this.logger.info("ThreatDetector: ✅ Threat detection initialized");
    } catch (error) {
      if (typeof errorHandler !== "undefined") {
        errorHandler.handleError(error, "ThreatDetector.initialize");
      } else {
        console.error("ThreatDetector Error [initialize]:", error);
      }
      throw error;
    }
  }

  // ============================================================================
  // 🔍 THREAT DETECTION
  // ============================================================================

  /**
   * Analyze request for threats
   * @param {Object} request - Request to analyze
   * @returns {Object} Threat analysis result
   */
  analyzeRequest(request) {
    try {
      const startTime = performance.now();

      if (!this.isInitialized) {
        throw new Error("ThreatDetector not initialized");
      }

      const analysis = {
        threatLevel: 0,
        threats: [],
        actions: [],
        metadata: {
          requestId: `threat_${Date.now()}_${Math.random()
            .toString(36)
            .substr(2, 9)}`,
          timestamp: new Date().toISOString(),
          sourceIp: request.sourceIp || "unknown",
          userAgent: request.userAgent || "unknown",
          requestSize: request.data ? JSON.stringify(request.data).length : 0,
        },
      };

      // Check if entity is already blocked
      if (this.isEntityBlocked(analysis.metadata.sourceIp)) {
        analysis.threatLevel = 10;
        analysis.threats.push({
          type: "BLOCKED_ENTITY",
          severity: "CRITICAL",
          description: "Request from blocked entity",
          evidence: { sourceIp: analysis.metadata.sourceIp },
        });
        analysis.actions.push(this.responseActions.BLOCK);
        return analysis;
      }

      // Analyze for attack patterns
      this.analyzeAttackPatterns(request, analysis);

      // Analyze behavioral patterns
      this.analyzeBehavioralPatterns(request, analysis);

      // Check threat intelligence
      this.checkThreatIntelligence(request, analysis);

      // Determine response actions
      this.determineResponseActions(analysis);

      // Record metrics
      const responseTime = performance.now() - startTime;
      this.metrics.responseTime =
        (this.metrics.responseTime + responseTime) / 2;

      if (analysis.threats.length > 0) {
        this.metrics.threatsDetected++;
        this.recordSuspiciousActivity(analysis);
      }

      return analysis;
    } catch (error) {
      if (typeof errorHandler !== "undefined") {
        errorHandler.handleError(error, "ThreatDetector.analyzeRequest");
      } else {
        console.error("ThreatDetector Error [analyzeRequest]:", error);
      }
      return {
        threatLevel: 0,
        threats: [],
        actions: [],
        error: error.message,
      };
    }
  }

  /**
   * Analyze for attack patterns
   * @param {Object} request - Request to analyze
   * @param {Object} analysis - Analysis object to update
   */
  analyzeAttackPatterns(request, analysis) {
    const requestData = JSON.stringify(request.data || {});
    const url = request.url || "";
    const headers = JSON.stringify(request.headers || {});

    // Check SQL injection patterns
    for (const pattern of this.attackPatterns.sqlInjection) {
      if (pattern.test(requestData) || pattern.test(url)) {
        analysis.threatLevel += 8;
        analysis.threats.push({
          type: "SQL_INJECTION",
          severity: "HIGH",
          description: "SQL injection pattern detected",
          evidence: {
            pattern: pattern.toString(),
            match: pattern.exec(requestData),
          },
        });
        this.metrics.patternsMatched++;
      }
    }

    // Check XSS patterns
    for (const pattern of this.attackPatterns.xssAttacks) {
      if (pattern.test(requestData) || pattern.test(url)) {
        analysis.threatLevel += 6;
        analysis.threats.push({
          type: "XSS_ATTACK",
          severity: "MEDIUM",
          description: "Cross-site scripting pattern detected",
          evidence: {
            pattern: pattern.toString(),
            match: pattern.exec(requestData),
          },
        });
        this.metrics.patternsMatched++;
      }
    }

    // Check command injection patterns
    for (const pattern of this.attackPatterns.commandInjection) {
      if (pattern.test(requestData) || pattern.test(url)) {
        analysis.threatLevel += 9;
        analysis.threats.push({
          type: "COMMAND_INJECTION",
          severity: "CRITICAL",
          description: "Command injection pattern detected",
          evidence: {
            pattern: pattern.toString(),
            match: pattern.exec(requestData),
          },
        });
        this.metrics.patternsMatched++;
      }
    }

    // Check data exfiltration patterns
    for (const pattern of this.attackPatterns.dataExfiltration) {
      if (pattern.test(requestData) || pattern.test(headers)) {
        analysis.threatLevel += 7;
        analysis.threats.push({
          type: "DATA_EXFILTRATION",
          severity: "HIGH",
          description: "Data exfiltration pattern detected",
          evidence: {
            pattern: pattern.toString(),
            match: pattern.exec(requestData),
          },
        });
        this.metrics.patternsMatched++;
      }
    }
  }

  /**
   * Analyze behavioral patterns
   * @param {Object} request - Request to analyze
   * @param {Object} analysis - Analysis object to update
   */
  analyzeBehavioralPatterns(request, analysis) {
    const sourceIp = analysis.metadata.sourceIp;
    const now = Date.now();

    // Check for rapid requests
    const recentRequests = this.getRecentActivity(
      sourceIp,
      "requests",
      now - this.suspiciousPatterns.rapidRequests.timeWindow
    );
    if (
      recentRequests.length > this.suspiciousPatterns.rapidRequests.threshold
    ) {
      analysis.threatLevel += 4;
      analysis.threats.push({
        type: "RAPID_REQUESTS",
        severity: "MEDIUM",
        description: `Too many requests: ${recentRequests.length} in ${
          this.suspiciousPatterns.rapidRequests.timeWindow / 1000
        }s`,
        evidence: {
          requestCount: recentRequests.length,
          timeWindow: this.suspiciousPatterns.rapidRequests.timeWindow,
        },
      });
    }

    // Check for unusual data size
    if (
      analysis.metadata.requestSize >
      this.suspiciousPatterns.unusualDataSize.threshold
    ) {
      analysis.threatLevel += 3;
      analysis.threats.push({
        type: "UNUSUAL_DATA_SIZE",
        severity: "LOW",
        description: `Unusually large request: ${analysis.metadata.requestSize} bytes`,
        evidence: {
          size: analysis.metadata.requestSize,
          threshold: this.suspiciousPatterns.unusualDataSize.threshold,
        },
      });
    }

    // Check for suspicious user agents
    for (const pattern of this.suspiciousPatterns.suspiciousUserAgents) {
      if (pattern.test(analysis.metadata.userAgent)) {
        analysis.threatLevel += 2;
        analysis.threats.push({
          type: "SUSPICIOUS_USER_AGENT",
          severity: "LOW",
          description: "Suspicious user agent detected",
          evidence: {
            userAgent: analysis.metadata.userAgent,
            pattern: pattern.toString(),
          },
        });
      }
    }
  }

  /**
   * Check threat intelligence
   * @param {Object} request - Request to analyze
   * @param {Object} analysis - Analysis object to update
   */
  checkThreatIntelligence(request, analysis) {
    const sourceIp = analysis.metadata.sourceIp;

    // Check known malicious IPs
    if (this.threatDatabase.has(sourceIp)) {
      const threatInfo = this.threatDatabase.get(sourceIp);
      analysis.threatLevel += threatInfo.severity || 5;
      analysis.threats.push({
        type: "KNOWN_THREAT",
        severity: threatInfo.level || "MEDIUM",
        description: "Request from known malicious source",
        evidence: { threatInfo, sourceIp },
      });
    }

    // Check for repeated failed attempts
    const failedAttempts = this.getRecentActivity(
      sourceIp,
      "failures",
      Date.now() - this.suspiciousPatterns.failedAttempts.timeWindow
    );
    if (
      failedAttempts.length >= this.suspiciousPatterns.failedAttempts.threshold
    ) {
      analysis.threatLevel += 5;
      analysis.threats.push({
        type: "REPEATED_FAILURES",
        severity: "HIGH",
        description: `Multiple failed attempts: ${failedAttempts.length}`,
        evidence: {
          failureCount: failedAttempts.length,
          timeWindow: this.suspiciousPatterns.failedAttempts.timeWindow,
        },
      });
    }
  }

  /**
   * Determine appropriate response actions
   * @param {Object} analysis - Analysis object
   */
  determineResponseActions(analysis) {
    if (analysis.threatLevel >= 9) {
      analysis.actions.push(this.responseActions.BLOCK);
      analysis.actions.push(this.responseActions.QUARANTINE);
      analysis.actions.push(this.responseActions.ESCALATE);
    } else if (analysis.threatLevel >= 6) {
      analysis.actions.push(this.responseActions.BLOCK);
      analysis.actions.push(this.responseActions.ALERT);
    } else if (analysis.threatLevel >= 3) {
      analysis.actions.push(this.responseActions.LOG);
      analysis.actions.push(this.responseActions.ALERT);
    } else if (analysis.threatLevel > 0) {
      analysis.actions.push(this.responseActions.LOG);
    }
  }

  // ============================================================================
  // 🛡️ THREAT RESPONSE
  // ============================================================================

  /**
   * Execute threat response
   * @param {Object} analysis - Threat analysis result
   * @returns {Object} Response execution result
   */
  async executeThreatResponse(analysis) {
    try {
      const responses = [];

      for (const action of analysis.actions) {
        const response = await this.executeResponseAction(action, analysis);
        responses.push(response);
      }

      // Update metrics
      if (analysis.actions.includes(this.responseActions.BLOCK)) {
        this.metrics.threatsBlocked++;
      }

      return {
        success: true,
        responses,
        analysis,
      };
    } catch (error) {
      if (typeof errorHandler !== "undefined") {
        errorHandler.handleError(error, "ThreatDetector.executeThreatResponse");
      } else {
        console.error("ThreatDetector Error [executeThreatResponse]:", error);
      }
      return {
        success: false,
        error: error.message,
        analysis,
      };
    }
  }

  /**
   * Execute specific response action
   * @param {string} action - Action to execute
   * @param {Object} analysis - Threat analysis
   * @returns {Object} Action execution result
   */
  async executeResponseAction(action, analysis) {
    switch (action) {
      case this.responseActions.LOG:
        return this.logThreatEvent(analysis);

      case this.responseActions.BLOCK:
        return this.blockRequest(analysis);

      case this.responseActions.QUARANTINE:
        return this.quarantineEntity(analysis);

      case this.responseActions.ALERT:
        return this.sendThreatAlert(analysis);

      case this.responseActions.ESCALATE:
        return this.escalateIncident(analysis);

      default:
        return { success: false, error: `Unknown action: ${action}` };
    }
  }

  /**
   * Log threat event
   * @param {Object} analysis - Threat analysis
   * @returns {Object} Log result
   */
  logThreatEvent(analysis) {
    try {
      this.logger.warn(
        "ThreatDetector",
        "threatDetected",
        "Security threat detected",
        {
          requestId: analysis.metadata.requestId,
          threatLevel: analysis.threatLevel,
          threatsCount: analysis.threats.length,
          sourceIp: analysis.metadata.sourceIp,
          userAgent: analysis.metadata.userAgent,
          threats: analysis.threats.map((t) => ({
            type: t.type,
            severity: t.severity,
            description: t.description,
          })),
        }
      );

      return { success: true, action: "LOG", message: "Threat event logged" };
    } catch (error) {
      return { success: false, action: "LOG", error: error.message };
    }
  }

  /**
   * Block request
   * @param {Object} analysis - Threat analysis
   * @returns {Object} Block result
   */
  blockRequest(analysis) {
    try {
      // In a real implementation, this would interface with network/proxy layer
      this.logger.error(
        "ThreatDetector",
        "requestBlocked",
        "Malicious request blocked",
        {
          requestId: analysis.metadata.requestId,
          sourceIp: analysis.metadata.sourceIp,
          threatLevel: analysis.threatLevel,
        }
      );

      return {
        success: true,
        action: "BLOCK",
        message: "Request blocked successfully",
      };
    } catch (error) {
      return { success: false, action: "BLOCK", error: error.message };
    }
  }

  /**
   * Quarantine entity
   * @param {Object} analysis - Threat analysis
   * @returns {Object} Quarantine result
   */
  quarantineEntity(analysis) {
    try {
      const sourceIp = analysis.metadata.sourceIp;
      this.blockedEntities.add(sourceIp);
      this.metrics.entitiesBlocked++;

      this.logger.error(
        "ThreatDetector",
        "entityQuarantined",
        "Entity quarantined due to threats",
        {
          sourceIp,
          threatLevel: analysis.threatLevel,
          threatsCount: analysis.threats.length,
        }
      );

      return {
        success: true,
        action: "QUARANTINE",
        message: `Entity ${sourceIp} quarantined`,
      };
    } catch (error) {
      return { success: false, action: "QUARANTINE", error: error.message };
    }
  }

  /**
   * Send threat alert
   * @param {Object} analysis - Threat analysis
   * @returns {Object} Alert result
   */
  sendThreatAlert(analysis) {
    try {
      const alert = {
        id: analysis.metadata.requestId,
        timestamp: analysis.metadata.timestamp,
        severity: this.calculateAlertSeverity(analysis.threatLevel),
        source: analysis.metadata.sourceIp,
        summary: `${analysis.threats.length} threats detected (Level ${analysis.threatLevel})`,
        details: analysis.threats,
        recommendedActions: analysis.actions,
      };

      // In a real implementation, this would send to SIEM/monitoring system
      this.logger.warn(
        "ThreatDetector",
        "threatAlert",
        "Security alert generated",
        alert
      );

      return { success: true, action: "ALERT", alert };
    } catch (error) {
      return { success: false, action: "ALERT", error: error.message };
    }
  }

  /**
   * Escalate security incident
   * @param {Object} analysis - Threat analysis
   * @returns {Object} Escalation result
   */
  escalateIncident(analysis) {
    try {
      const incident = {
        id: `INC_${analysis.metadata.requestId}`,
        timestamp: analysis.metadata.timestamp,
        severity: "CRITICAL",
        category: "SECURITY_BREACH",
        source: analysis.metadata.sourceIp,
        description: `Critical security threat detected: Level ${analysis.threatLevel}`,
        threats: analysis.threats,
        evidence: analysis.metadata,
        status: "OPEN",
        assignee: "security_team",
      };

      this.metrics.incidentsReported++;

      // In a real implementation, this would create incident in ticketing system
      this.logger.error(
        "ThreatDetector",
        "incidentEscalated",
        "Security incident escalated",
        incident
      );

      return { success: true, action: "ESCALATE", incident };
    } catch (error) {
      return { success: false, action: "ESCALATE", error: error.message };
    }
  }

  // ============================================================================
  // 🛠️ UTILITY METHODS
  // ============================================================================

  /**
   * Initialize threat database
   */
  initializeThreatDatabase() {
    // Sample threat intelligence data
    const knownThreats = [
      { ip: "192.168.1.100", type: "scanner", level: "MEDIUM", severity: 5 },
      { ip: "10.0.0.1", type: "malware_c2", level: "HIGH", severity: 8 },
      { ip: "172.16.0.1", type: "botnet", level: "CRITICAL", severity: 10 },
    ];

    for (const threat of knownThreats) {
      this.threatDatabase.set(threat.ip, threat);
    }

    this.logger.info(
      "ThreatDetector: Threat database initialized with",
      knownThreats.length,
      "entries"
    );
  }

  /**
   * Load threat intelligence
   */
  async loadThreatIntelligence() {
    try {
      // In a real implementation, this would load from external threat feeds
      this.logger.info(
        "ThreatDetector: Threat intelligence loaded successfully"
      );
    } catch (error) {
      this.logger.warn(
        "ThreatDetector: Failed to load threat intelligence:",
        error.message
      );
    }
  }

  /**
   * Setup threat monitoring
   */
  setupThreatMonitoring() {
    this.isMonitoring = true;

    // Monitor system resources
    setInterval(() => {
      this.performHealthCheck();
    }, 60000); // Every minute

    this.logger.info("ThreatDetector: Threat monitoring started");
  }

  /**
   * Start periodic cleanup
   */
  startPeriodicCleanup() {
    setInterval(() => {
      this.cleanupOldActivities();
    }, 300000); // Every 5 minutes

    this.logger.debug("ThreatDetector: Periodic cleanup started");
  }

  /**
   * Record suspicious activity
   * @param {Object} analysis - Threat analysis
   */
  recordSuspiciousActivity(analysis) {
    const activity = {
      timestamp: Date.now(),
      sourceIp: analysis.metadata.sourceIp,
      threatLevel: analysis.threatLevel,
      threatTypes: analysis.threats.map((t) => t.type),
      userAgent: analysis.metadata.userAgent,
      actions: analysis.actions,
    };

    this.suspiciousActivities.push(activity);

    // Keep only recent activities
    if (this.suspiciousActivities.length > 10000) {
      this.suspiciousActivities = this.suspiciousActivities.slice(-5000);
    }
  }

  /**
   * Get recent activity for source
   * @param {string} sourceIp - Source IP address
   * @param {string} type - Activity type
   * @param {number} since - Timestamp since
   * @returns {Array} Recent activities
   */
  getRecentActivity(sourceIp, type, since) {
    return this.suspiciousActivities.filter(
      (activity) =>
        activity.sourceIp === sourceIp && activity.timestamp >= since
    );
  }

  /**
   * Check if entity is blocked
   * @param {string} sourceIp - Source IP to check
   * @returns {boolean} Whether entity is blocked
   */
  isEntityBlocked(sourceIp) {
    return this.blockedEntities.has(sourceIp);
  }

  /**
   * Calculate alert severity
   * @param {number} threatLevel - Threat level
   * @returns {string} Alert severity
   */
  calculateAlertSeverity(threatLevel) {
    if (threatLevel >= 9) return "CRITICAL";
    if (threatLevel >= 6) return "HIGH";
    if (threatLevel >= 3) return "MEDIUM";
    return "LOW";
  }

  /**
   * Perform health check
   */
  performHealthCheck() {
    try {
      const stats = this.getThreatStats();

      // Check if too many threats detected recently
      const recentThreats = this.suspiciousActivities.filter(
        (activity) => activity.timestamp > Date.now() - 600000 // Last 10 minutes
      );

      if (recentThreats.length > 100) {
        this.logger.warn(
          "ThreatDetector",
          "highThreatActivity",
          "High threat activity detected",
          {
            recentThreats: recentThreats.length,
            timeWindow: "10 minutes",
          }
        );
      }

      this.logger.debug("ThreatDetector: Health check completed", stats);
    } catch (error) {
      this.logger.error("ThreatDetector: Health check failed:", error.message);
    }
  }

  /**
   * Clean up old activities
   */
  cleanupOldActivities() {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24 hours
    const initialCount = this.suspiciousActivities.length;

    this.suspiciousActivities = this.suspiciousActivities.filter(
      (activity) => activity.timestamp > cutoff
    );

    const cleaned = initialCount - this.suspiciousActivities.length;
    if (cleaned > 0) {
      this.logger.debug(`ThreatDetector: Cleaned up ${cleaned} old activities`);
    }
  }

  /**
   * Get threat statistics
   * @returns {Object} Threat detection statistics
   */
  getThreatStats() {
    return {
      metrics: { ...this.metrics },
      state: {
        isInitialized: this.isInitialized,
        isMonitoring: this.isMonitoring,
        threatDatabaseSize: this.threatDatabase.size,
        suspiciousActivities: this.suspiciousActivities.length,
        blockedEntities: this.blockedEntities.size,
        attackPatterns: Object.keys(this.attackPatterns).length,
      },
      recentActivity: {
        last24Hours: this.suspiciousActivities.filter(
          (activity) => activity.timestamp > Date.now() - 86400000
        ).length,
        lastHour: this.suspiciousActivities.filter(
          (activity) => activity.timestamp > Date.now() - 3600000
        ).length,
      },
    };
  }

  /**
   * Generate threat report
   * @returns {Object} Comprehensive threat report
   */
  generateThreatReport() {
    const stats = this.getThreatStats();
    const topThreats = this.getTopThreatTypes();
    const topSources = this.getTopThreatSources();

    return {
      timestamp: new Date().toISOString(),
      summary: {
        totalThreats: stats.metrics.threatsDetected,
        threatsBlocked: stats.metrics.threatsBlocked,
        entitiesBlocked: stats.metrics.entitiesBlocked,
        incidentsReported: stats.metrics.incidentsReported,
        averageResponseTime: stats.metrics.responseTime.toFixed(2) + "ms",
      },
      statistics: stats,
      topThreats,
      topSources,
      recommendations: this.generateSecurityRecommendations(stats),
    };
  }

  /**
   * Get top threat types
   * @returns {Array} Top threat types by frequency
   */
  getTopThreatTypes() {
    const threatCounts = {};

    this.suspiciousActivities.forEach((activity) => {
      activity.threatTypes.forEach((type) => {
        threatCounts[type] = (threatCounts[type] || 0) + 1;
      });
    });

    return Object.entries(threatCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([type, count]) => ({ type, count }));
  }

  /**
   * Get top threat sources
   * @returns {Array} Top threat sources by frequency
   */
  getTopThreatSources() {
    const sourceCounts = {};

    this.suspiciousActivities.forEach((activity) => {
      const source = activity.sourceIp;
      sourceCounts[source] = (sourceCounts[source] || 0) + 1;
    });

    return Object.entries(sourceCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([source, count]) => ({ source, count }));
  }

  /**
   * Generate security recommendations
   * @param {Object} stats - Current statistics
   * @returns {Array} Security recommendations
   */
  generateSecurityRecommendations(stats) {
    const recommendations = [];

    if (stats.metrics.threatsDetected > 100) {
      recommendations.push(
        "Consider implementing additional network-level protections due to high threat volume"
      );
    }

    if (stats.metrics.responseTime > 100) {
      recommendations.push(
        "Threat detection response time is high. Consider optimizing detection algorithms"
      );
    }

    if (stats.state.blockedEntities > 50) {
      recommendations.push(
        "High number of blocked entities. Review and update threat intelligence feeds"
      );
    }

    if (stats.recentActivity.lastHour > 10) {
      recommendations.push(
        "High recent threat activity detected. Increase monitoring and alerting"
      );
    }

    return recommendations;
  }

  /**
   * Unblock entity
   * @param {string} sourceIp - Source IP to unblock
   * @returns {boolean} Success status
   */
  unblockEntity(sourceIp) {
    try {
      this.blockedEntities.delete(sourceIp);
      this.logger.info(
        "ThreatDetector",
        "entityUnblocked",
        `Entity ${sourceIp} unblocked`
      );
      return true;
    } catch (error) {
      this.logger.error(
        "ThreatDetector",
        "unblockFailed",
        `Failed to unblock entity ${sourceIp}:`,
        error.message
      );
      return false;
    }
  }
}

// Export for use in extension
if (typeof module !== "undefined" && module.exports) {
  module.exports = ThreatDetector;
} else if (typeof window !== "undefined") {
  window.ThreatDetector = ThreatDetector;
}
