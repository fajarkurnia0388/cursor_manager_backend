/**
 * 📝 TypeScript Definitions for Cursor Account Manager
 * Provides type safety and better development experience
 */

// =============================================================================
// CORE INTERFACES
// =============================================================================

/**
 * Account interface
 */
interface Account {
  id: string;
  email: string;
  cookies: Cookie[];
  status: "free" | "pro trial" | "pro plan" | "business" | "empty" | "";
  createdAt: Date;
  lastUsed?: Date;
  isActive?: boolean;
}

/**
 * Payment Card interface
 */
interface PaymentCard {
  id: string;
  number: string;
  expiry: string;
  cvv: string;
  type: CardType;
  holderName?: string;
  isDefault?: boolean;
  createdAt: Date;
}

/**
 * Card Types
 */
type CardType = "visa" | "mastercard" | "amex" | "discover" | "other";

/**
 * Cookie interface
 */
interface Cookie {
  name: string;
  value: string;
  domain: string;
  path?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: "Strict" | "Lax" | "None";
  expirationDate?: number;
}

// =============================================================================
// SERVICE INTERFACES
// =============================================================================

/**
 * Lazy Loader Service
 */
interface LazyLoader {
  loadedModules: Set<string>;
  loadingPromises: Map<string, Promise<void>>;
  loadScript(src: string, moduleId: string): Promise<void>;
  loadFeature(feature: string): Promise<boolean>;
  preloadCritical(): Promise<void>;
  isLoaded(moduleId: string): boolean;
  getStats(): LazyLoaderStats;
}

interface LazyLoaderStats {
  loadedCount: number;
  loadedModules: string[];
  currentlyLoading: string[];
}

/**
 * Cache Service
 */
interface CacheService {
  cache: Map<string, any>;
  timestamps: Map<string, number>;
  defaultTTL: number;
  maxCacheSize: number;

  set(key: string, value: any, ttl?: number): void;
  get(key: string): any | null;
  getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T>;
  invalidate(key: string): void;
  invalidatePattern(pattern: RegExp | string): void;
  clear(): void;
  getStats(): CacheStats;

  // Specialized methods
  cacheAccount(accountId: string, data: Account, ttl?: number): void;
  getAccount(accountId: string): Account | null;
  cachePaymentCards(cards: PaymentCard[], ttl?: number): void;
  getPaymentCards(): PaymentCard[] | null;
}

interface CacheStats {
  totalEntries: number;
  activeEntries: number;
  expiredEntries: number;
  memoryUsage: string;
  hitRate: string;
}

/**
 * DOM Optimizer Service
 */
interface DOMOptimizer {
  updateQueue: DOMUpdate[];
  isProcessing: boolean;
  batchSize: number;

  scheduleUpdate(
    elementId: string,
    updateFn: (element: Element) => void,
    priority?: number
  ): void;
  updateList(
    containerId: string,
    items: any[],
    renderFn: (item: any, index: number) => Element
  ): void;
  createVirtualList(
    containerId: string,
    items: any[],
    renderFn: (item: any, index: number) => Element,
    itemHeight?: number,
    visibleCount?: number
  ): void;
  updateForm(formId: string, data: Record<string, any>): void;
  cleanup(element: Element): void;
  getStats(): DOMOptimizerStats;
}

interface DOMUpdate {
  elementId: string;
  updateFn: (element: Element) => void;
  priority: number;
  timestamp: number;
}

interface DOMOptimizerStats {
  pendingUpdates: number;
  isProcessing: boolean;
  batchSize: number;
  memoryUsage: string;
}

/**
 * Error Handler Service
 */
interface ErrorHandler {
  errorLog: ErrorEntry[];
  maxLogSize: number;
  errorCallbacks: Map<string, Function[]>;

  logError(errorData: Partial<ErrorEntry>): void;
  wrapWithErrorBoundary<T extends (...args: any[]) => any>(
    fn: T,
    options?: ErrorBoundaryOptions
  ): T;
  boundary<T>(promise: Promise<T>, options?: BoundaryOptions): Promise<T>;
  safeExecute<T>(fn: () => T, options?: SafeExecuteOptions): T | undefined;
  showUserError(error: Error, context?: string): void;
  onError(type: string, callback: (errorData: ErrorEntry) => void): void;
  getStats(): ErrorStats;
  clearErrors(): void;
  exportErrors(): string;
}

interface ErrorEntry {
  id: string;
  type: string;
  message: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  error?: Error;
  context?: string;
  timestamp: string;
  userAgent: string;
  url: string;
  stackTrace?: string;
}

interface ErrorBoundaryOptions {
  context?: string;
  fallback?: any;
  silent?: boolean;
  retries?: number;
}

interface BoundaryOptions {
  context?: string;
  fallback?: any;
  silent?: boolean;
}

interface SafeExecuteOptions {
  context?: string;
  fallback?: any;
}

interface ErrorStats {
  totalErrors: number;
  recentErrors: number;
  todayErrors: number;
  errorsByType: Record<string, number>;
  lastError: ErrorEntry | null;
}

// =============================================================================
// NAMESPACE INTERFACES
// =============================================================================

/**
 * Namespace Manager
 */
interface NamespaceManager {
  namespaces: Map<string, AppNamespace>;
  globalRefs: Map<string, any>;
  initialized: boolean;

  createNamespace(name: string, initialData?: any): AppNamespace;
  getNamespace(name: string): AppNamespace | null;
  registerService(
    serviceName: string,
    service: any,
    namespace?: string
  ): boolean;
  registerUtil(
    utilName: string,
    utilFunction: Function,
    namespace?: string
  ): boolean;
  setConfig(key: string, value: any, namespace?: string): boolean;
  getConfig(key: string, namespace?: string): any;
  getStats(): NamespaceStats;
}

interface AppNamespace {
  __namespace__: string;
  __created__: string;
  services?: Record<string, any>;
  utils?: Record<string, Function>;
  config?: Record<string, any>;
  state?: Record<string, any>;
}

interface NamespaceStats {
  totalNamespaces: number;
  namespaces: Record<
    string,
    {
      services: number;
      utils: number;
      config: number;
      created: string;
    }
  >;
  globalRefs: number;
}

// =============================================================================
// UTILITY INTERFACES
// =============================================================================

/**
 * Performance Utils
 */
interface PerformanceUtils {
  preload(feature: string): Promise<boolean>;
  invalidateCache(pattern: string | RegExp): void;
  batchUpdate(
    elementId: string,
    updateFn: (element: Element) => void,
    priority?: number
  ): void;
  getMetrics(): PerformanceMetrics;
}

interface PerformanceMetrics {
  memory: {
    used: number;
    total: number;
    limit: number;
  } | null;
  timing: PerformanceTiming;
  navigation: PerformanceNavigation;
}

/**
 * Performance Controls
 */
interface PerformanceControls {
  clearCache(): void;
  getStats(): any;
  preloadAll(): Promise<void>;
}

// =============================================================================
// API INTERFACES
// =============================================================================

/**
 * Chrome Extension APIs
 */
interface ChromeStorageResult {
  [key: string]: any;
}

/**
 * Extension Message
 */
interface ExtensionMessage {
  action: string;
  data?: any;
  tabId?: number;
}

// =============================================================================
// EVENT INTERFACES
// =============================================================================

/**
 * Custom Events
 */
interface AccountSwitchEvent extends CustomEvent {
  detail: {
    fromAccount: Account;
    toAccount: Account;
    success: boolean;
  };
}

interface PaymentCardEvent extends CustomEvent {
  detail: {
    card: PaymentCard;
    action: "add" | "remove" | "use";
  };
}

// =============================================================================
// GLOBAL DECLARATIONS
// =============================================================================

declare global {
  interface Window {
    // Services
    lazyLoader: LazyLoader;
    cacheService: CacheService;
    domOptimizer: DOMOptimizer;
    errorHandler: ErrorHandler;
    namespaceManager: NamespaceManager;

    // Utils
    performanceUtils: PerformanceUtils;
    performanceControls: PerformanceControls;
    performanceStats: any;

    // Main namespace
    CursorAccountManager: AppNamespace;
    CAM: AppNamespace;

    // Convenience functions
    safeAsync: <T extends (...args: any[]) => any>(
      fn: T,
      options?: ErrorBoundaryOptions
    ) => T;
    safeBoundary: <T>(
      promise: Promise<T>,
      options?: BoundaryOptions
    ) => Promise<T>;
    safeExecute: <T>(
      fn: () => T,
      options?: SafeExecuteOptions
    ) => T | undefined;

    // Accessors
    getLazyLoader(): LazyLoader;
    getCacheService(): CacheService;
    getDomOptimizer(): DOMOptimizer;
    getErrorHandler(): ErrorHandler;

    // App-specific functions
    getCachedAccounts(): Promise<ChromeStorageResult>;
    getCachedPaymentCards(): Promise<ChromeStorageResult>;
    getCachedUserProfile(): Promise<any>;
    updateAccountsList(accounts: Account[]): void;
    updatePaymentCardsList(cards: PaymentCard[]): void;

    // Notification system
    showNotification?(
      message: string,
      type: "info" | "success" | "warning" | "error"
    ): void;
  }
}

// =============================================================================
// MODULE EXPORTS
// =============================================================================

export {
  Account,
  PaymentCard,
  CardType,
  Cookie,
  LazyLoader,
  LazyLoaderStats,
  CacheService,
  CacheStats,
  DOMOptimizer,
  DOMUpdate,
  DOMOptimizerStats,
  ErrorHandler,
  ErrorEntry,
  ErrorBoundaryOptions,
  BoundaryOptions,
  SafeExecuteOptions,
  ErrorStats,
  NamespaceManager,
  AppNamespace,
  NamespaceStats,
  PerformanceUtils,
  PerformanceMetrics,
  PerformanceControls,
  ChromeStorageResult,
  ExtensionMessage,
  AccountSwitchEvent,
  PaymentCardEvent,
};
