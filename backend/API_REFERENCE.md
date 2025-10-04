# Backend API Reference

**Version:** 2.0.0  
**Protocol:** JSON-RPC 2.0  
**Communication:** Native Messaging (stdio)

---

## Table of Contents

- [System Methods](#system-methods)
- [Account Methods](#account-methods)
- [Card Methods](#card-methods)
- [Generator Methods](#generator-methods)
- [Bypass Testing Methods](#bypass-testing-methods)
- [Pro Trial Methods](#pro-trial-methods)
- [Export Methods](#export-methods)
- [Import Methods](#import-methods)
- [Status Methods](#status-methods)
- [Batch Operations](#batch-operations)

---

## Request Format

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "service.action",
  "params": {
    "param1": "value1"
  }
}
```

## Response Format

### Success Response

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "success": true,
    "data": {...}
  }
}
```

### Error Response

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32603,
    "message": "Error message"
  }
}
```

---

## System Methods

### system.ping

Check backend availability.

**Request:**

```json
{ "jsonrpc": "2.0", "id": 1, "method": "system.ping", "params": {} }
```

**Response:**

```json
{ "jsonrpc": "2.0", "id": 1, "result": { "status": "ok", "message": "pong" } }
```

### system.version

Get backend version information.

**Request:**

```json
{ "jsonrpc": "2.0", "id": 1, "method": "system.version", "params": {} }
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "version": "2.0.0",
    "schema_version": 2
  }
}
```

---

## Account Methods

### accounts.getAll

Get all accounts with optional status filter.

**Params:**

- `status` (optional): Filter by status (e.g., "active", "inactive")

### accounts.getById

Get account by ID.

**Params:**

- `id` (required): Account ID

### accounts.create

Create new account.

**Params:**

- `email` (required): Email address
- `password` (required): Password
- `cookies` (optional): JSON string of cookies

### accounts.update

Update account.

**Params:**

- `id` (required): Account ID
- Other fields to update

### accounts.delete

Delete account.

**Params:**

- `id` (required): Account ID
- `soft` (optional, default: true): Soft delete flag

---

## Card Methods

### cards.getAll

Get all cards.

### cards.create

Create new card.

**Params:**

- `card_number` (required): Card number
- `card_holder` (required): Cardholder name
- `expiry` (required): Expiry date (MM/YY)
- `cvv` (required): CVV code

---

## Generator Methods

### generator.generateCard

Generate single card.

**Params:**

- `bin` (optional): BIN code (default: "552461")
- `month` (optional): Expiry month (01-12, or "Random")
- `year` (optional): Expiry year (25-33, or "Random")
- `cvv` (optional): CVV (or "Random")

**Response:**

```json
{
  "number": "5524610123456789",
  "month": "12",
  "year": "25",
  "expiry": "12/25",
  "cvv": "123",
  "card_type": "MasterCard"
}
```

### generator.generateMultiple

Generate multiple cards.

**Params:**

- `bin` (optional): BIN code
- `quantity` (required): Number of cards to generate (1-1000)
- `month`, `year`, `cvv` (optional): Same as generateCard

---

## Bypass Testing Methods

### bypass.getTestSuite

Get test suite by type.

**Params:**

- `test_type` (required): "parameter", "header", "method", "storage", "dom"

### bypass.getAllTestSuites

Get all available test suites.

### bypass.storeResult

Store bypass test result.

**Params:**

- `test_type`: Test type
- `payload`: Test payload
- `target_url`: Target URL
- `success`: Boolean
- `response_code`: HTTP status code
- `response_body`: Response body (truncated to 1000 chars)
- `error_message`: Error message if failed
- `execution_time`: Execution time in seconds

### bypass.getResults

Get recent test results.

**Params:**

- `limit` (optional, default: 50): Max results
- `test_type` (optional): Filter by test type

### bypass.getStatistics

Get bypass test statistics.

### bypass.exportResults

Export test results.

**Params:**

- `format` (optional, default: "json"): "json" or "csv"
- `test_type` (optional): Filter by test type

---

## Pro Trial Methods

### proTrial.prepareActivation

Prepare pro trial activation.

**Params:**

- `account_id` (required): Account ID

**Response:**

```json
{
  "success": true,
  "trial_id": 1,
  "trial_token": "...",
  "account_email": "user@example.com",
  "card_data": {
    "number": "5524610123456789",
    "expiry": "12/25",
    "cvv": "123",
    "holder": "Card Holder"
  },
  "stripe_url": "https://cursor.com/settings/billing",
  "expiry_date": "2025-11-01T00:00:00"
}
```

### proTrial.updateStatus

Update trial status after activation attempt.

**Params:**

- `trial_id` (required): Trial ID
- `status` (required): "active", "failed", "expired"
- `error` (optional): Error message

### proTrial.checkStatus

Check if account has active trial.

**Params:**

- `account_id` (required): Account ID

### proTrial.getHistory

Get trial activation history.

**Params:**

- `account_id` (optional): Filter by account
- `limit` (optional, default: 50): Max results

---

## Export Methods

### export.accounts

Export accounts.

**Params:**

- `format` (optional, default: "json"): "json" or "csv"
- `filters` (optional): Filter criteria

### export.cards

Export cards.

**Params:**

- `format` (optional, default: "json"): "json" or "csv"
- `filters` (optional): Filter criteria

### export.all

Export all data (accounts, cards, trials, bypass results).

**Params:**

- `format` (optional, default: "json"): Export format

---

## Import Methods

### import.accounts

Import accounts from JSON.

**Params:**

- `data` (required): JSON string or array of accounts
- `merge_strategy` (optional, default: "skip"): "skip", "update", or "replace"

**Response:**

```json
{
  "success": true,
  "created": 5,
  "updated": 2,
  "skipped": 1,
  "errors": [],
  "total_processed": 8
}
```

### import.cards

Import cards from JSON.

**Params:**

- `data` (required): JSON string or array of cards
- `merge_strategy` (optional): "skip", "update", or "replace"

### import.validate

Validate import data before processing.

**Params:**

- `data` (required): Data to validate
- `data_type` (required): "accounts" or "cards"

---

## Status Methods

### status.refreshAccount

Mark account for status refresh.

**Params:**

- `account_id` (required): Account ID

### status.updateFromApi

Update account status from API response (called by extension).

**Params:**

- `account_id` (required): Account ID
- `api_response` (required): Response from cursor.com API

### status.refreshAll

Mark all accounts for status refresh.

**Params:**

- `limit` (optional): Max accounts to refresh

### status.getHealth

Get account health metrics.

**Params:**

- `account_id` (required): Account ID

**Response:**

```json
{
  "success": true,
  "account_id": 1,
  "email": "user@example.com",
  "health_status": "excellent",
  "health_score": 80,
  "metrics": {
    "has_cookies": true,
    "has_password": true,
    "last_used": "2025-10-04T12:00:00",
    "has_active_trial": false
  },
  "recommendations": []
}
```

### status.getSystemHealth

Get overall system health.

---

## Batch Operations

### batch.createAccounts

Create multiple accounts in batch.

**Params:**

- `accounts_data` (required): Array of account objects

**Response:**

```json
{
  "success": true,
  "batch_id": 1,
  "created": 10,
  "failed": 0,
  "errors": [],
  "total": 10
}
```

### batch.deleteAccounts

Delete multiple accounts.

**Params:**

- `account_ids` (required): Array of account IDs

### batch.updateStatus

Update status for multiple accounts.

**Params:**

- `account_ids` (required): Array of account IDs
- `status` (required): New status value

### batch.createCards

Create multiple cards in batch.

**Params:**

- `cards_data` (required): Array of card objects

### batch.getProgress

Get batch operation progress.

**Params:**

- `batch_id` (required): Batch operation ID

### batch.getHistory

Get batch operation history.

**Params:**

- `limit` (optional, default: 20): Max results

---

## Error Codes

| Code   | Meaning          |
| ------ | ---------------- |
| -32700 | Parse error      |
| -32600 | Invalid Request  |
| -32601 | Method not found |
| -32602 | Invalid params   |
| -32603 | Internal error   |

---

## Usage Examples

### JavaScript (Extension)

```javascript
// Via backend-service.js
const result = await backendService.request("accounts.getAll", {
  status: "active",
});

console.log(result.accounts);
```

### Python (CLI)

```python
from native_host import NativeHost

host = NativeHost()
request = {
    "jsonrpc": "2.0",
    "id": 1,
    "method": "accounts.getAll",
    "params": {"status": "active"}
}

response = host.handle_request(request)
print(response)
```

---

## Rate Limiting

Currently no rate limiting is implemented. All methods execute synchronously.

## Performance Notes

- Account operations: < 100ms
- Card generation: < 50ms per card
- Bypass tests: < 2s per test
- Database queries: Optimized with indexes

---

**Last Updated:** 2025-10-04  
**Backend Version:** 2.0.0
