---
name: api-design
description: >
  Expert API design and integration engineering for SaaS and fintech platforms. Trigger this skill whenever
  the user asks about designing APIs, REST vs GraphQL decisions, webhook architecture, API versioning, rate
  limiting, third-party integrations (Stripe, payment gateways, banking APIs, open banking), API documentation,
  SDK design, authentication flows (OAuth 2.0, API keys, JWT), API gateway setup, or building an API-first
  product. Also trigger when discussing how to structure endpoints, handle errors consistently, integrate
  external services, or design public-facing APIs for customers to build on top of.
---

# API Design & Integrations Skill

Senior API architect perspective. Design APIs that are intuitive for developers, safe to evolve,
and performant at scale. API quality directly impacts developer adoption and customer trust.

---

## API Style Decision Matrix

| Use Case | Best Choice | Why |
|---|---|---|
| CRUD resources, public API | **REST** | Simple, cacheable, well-understood |
| Complex dashboards, mobile | **GraphQL** | Fetch exactly what you need, one request |
| Real-time feeds, live data | **WebSockets** | Persistent connection, low latency |
| Service-to-service (internal) | **gRPC** | Binary protocol, 10x faster than REST |
| Event notifications to customers | **Webhooks** | Push model, no polling needed |
| Async background processing | **Message Queue** (Kafka/RabbitMQ) | Resilient, retryable |

**For fintech SaaS:** Use REST for your main API + Webhooks for events + WebSockets for real-time dashboards.

---

## REST API Design Standards

### URL Structure
```
# Resources are nouns, never verbs
GET    /v1/invoices              # List
GET    /v1/invoices/:id          # Get one
POST   /v1/invoices              # Create
PATCH  /v1/invoices/:id          # Partial update
DELETE /v1/invoices/:id          # Delete

# Nested resources (max 2 levels deep)
GET    /v1/subscriptions/:id/invoices

# Actions (when REST doesn't fit)
POST   /v1/invoices/:id/pay      # Not a resource, it's an action
POST   /v1/subscriptions/:id/cancel
```

### Response Format (Consistent — always)
```json
// Success — single resource
{ "data": { "id": "inv_123", "status": "paid", "amount": 5000 } }

// Success — list with pagination
{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "hasMore": true
  }
}

// Error — always this shape
{
  "error": {
    "code": "INVOICE_NOT_FOUND",       // machine-readable
    "message": "Invoice not found",    // human-readable
    "details": { "invoiceId": "inv_x" } // optional context
  }
}
```

### Standard Error Codes
| HTTP Status | Use Case |
|---|---|
| 200 OK | Success |
| 201 Created | Resource created |
| 204 No Content | Success, no body (DELETE) |
| 400 Bad Request | Validation error |
| 401 Unauthorized | Missing/invalid auth |
| 403 Forbidden | Valid auth, but no permission |
| 404 Not Found | Resource doesn't exist |
| 409 Conflict | Duplicate resource, state conflict |
| 422 Unprocessable | Valid format but business logic error |
| 429 Too Many Requests | Rate limit hit |
| 500 Internal Server Error | Unexpected server error |

---

## API Versioning

Use **URL versioning** for public APIs — most visible, easiest for clients:
```
https://api.yourapp.com/v1/invoices
https://api.yourapp.com/v2/invoices  (breaking changes)
```

### Versioning Rules
- **Never break existing clients** — add fields freely, never remove/rename
- Deprecate old versions with minimum 6-month notice
- Send `Deprecation` and `Sunset` headers on deprecated endpoints
- Maintain max 2 versions simultaneously (cost vs. support tradeoff)

---

## Webhook Architecture (Critical for Billing)

Webhooks are how Stripe (and you) notify customers of events.

### Event Naming Convention
```
resource.action
invoice.created
invoice.paid
invoice.payment_failed
subscription.activated
subscription.cancelled
subscription.plan_changed
user.created
```

### Delivery System
```typescript
// 1. Event occurs in your system
// 2. Store in outbox table first (guaranteed delivery)
// 3. Worker picks up and delivers
// 4. Retry with exponential backoff on failure
// 5. Mark as delivered or dead-letter after 5 attempts

interface WebhookDelivery {
  id: string;
  endpoint_url: string;
  event_type: string;
  payload: object;
  attempts: number;           // max 5
  next_retry_at: Date;
  status: 'pending' | 'delivered' | 'failed';
}

// Retry schedule: 1min, 5min, 30min, 2hr, 24hr
const retryDelays = [60, 300, 1800, 7200, 86400]; // seconds
```

### Security (HMAC Signatures)
```typescript
// Sign every webhook payload
const signature = crypto
  .createHmac('sha256', endpoint.signingSecret)
  .update(JSON.stringify(payload))
  .digest('hex');

// Add to request headers
headers['X-Webhook-Signature'] = `sha256=${signature}`;
headers['X-Webhook-Timestamp'] = Date.now().toString();

// Recipient validates (prevent replay attacks)
function verifyWebhook(body: string, signature: string, timestamp: string, secret: string) {
  const age = Date.now() - parseInt(timestamp);
  if (age > 5 * 60 * 1000) throw new Error('Webhook too old (replay attack)');
  
  const expected = crypto.createHmac('sha256', secret)
    .update(`${timestamp}.${body}`).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
```

---

## Rate Limiting

Protect your API from abuse and ensure fair usage:

```typescript
// Tiered rate limits by plan
const rateLimits = {
  free:       { requests: 100,  window: '1m' },
  starter:    { requests: 1000, window: '1m' },
  growth:     { requests: 5000, window: '1m' },
  enterprise: { requests: 50000, window: '1m' },
};

// Always return rate limit headers
headers['X-RateLimit-Limit'] = limit.requests;
headers['X-RateLimit-Remaining'] = remaining;
headers['X-RateLimit-Reset'] = resetTimestamp;
// When exceeded:
headers['Retry-After'] = secondsUntilReset;
```

---

## API Documentation (OpenAPI 3.2)

Every endpoint must be documented. Use **OpenAPI** (formerly Swagger):

```yaml
openapi: 3.2.0
info:
  title: Billing API
  version: 1.0.0

paths:
  /v1/invoices/{id}/pay:
    post:
      summary: Pay an invoice
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string }
      responses:
        '200':
          description: Invoice paid successfully
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Invoice' }
        '422':
          description: Invoice not in payable state
```

Tooling: **Swagger UI** for interactive docs, **Redoc** for beautiful published docs.

---

## Key Third-Party Integrations for Fintech SaaS

### Payment & Billing
- **Stripe** — Payments, subscriptions, invoicing (primary)
- **Stripe Connect** — Marketplace/multi-vendor payments
- **Plaid** — Bank account linking, balance verification
- **Wise / Transferwise API** — International transfers

### Identity & KYC
- **Persona** — ID verification, KYC compliance
- **Onfido** — Document + facial verification
- **Stripe Identity** — If already on Stripe

### Communication
- **Resend / SendGrid** — Transactional emails
- **Twilio** — SMS for MFA, notifications
- **Intercom** — In-app support + chat

### Accounting & ERP
- **Xero API** — Sync invoices and payments
- **QuickBooks API** — For SMB customers
- **NetSuite** — Enterprise ERP integration

### Integration Pattern (for all third-party APIs)
```typescript
// Always wrap third-party calls in an adapter
// Protects you from vendor changes
class StripeAdapter {
  async createCustomer(org: Organization): Promise<string> {
    try {
      const customer = await stripe.customers.create({ email: org.email, name: org.name });
      return customer.id;
    } catch (err) {
      // Translate Stripe errors into your domain errors
      throw new PaymentProviderError('Failed to create customer', { cause: err });
    }
  }
}
// If you ever switch from Stripe → Adyen, you only change this file
```

---

## API Gateway (Production Essential)

Use **AWS API Gateway** or **Kong** in front of all APIs:
- SSL termination
- Rate limiting at the edge
- Request logging
- Auth token validation
- IP allowlisting for enterprise customers
- DDoS protection

---

## Public API Strategy (If You Offer One)

When your customers want to build on top of your platform:
1. **API Keys** — Issue per-customer, revokable, scoped to permissions
2. **Sandbox environment** — Separate from production, test data only
3. **SDKs** — Provide Node.js + Python SDKs (most common for your customers)
4. **Changelog** — Notify customers of all API changes via email + changelog page
5. **Status page** — public uptime tracker (use Statuspage.io or BetterUptime)
