---
name: testing-qa
description: >
  Expert testing and QA engineering skill for fintech SaaS covering unit tests, integration tests, E2E tests,
  payment flow testing, security testing, performance testing, and CI/CD quality gates. Trigger this skill
  whenever the user asks about writing tests, test strategy, QA processes, testing payments or billing flows,
  preventing regressions, test coverage, mocking APIs, load testing, security testing, or ensuring code quality
  before deployment. Also trigger when discussing how to test Stripe integrations, webhook handling, multi-tenant
  isolation, or any quality assurance concern. In fintech, a bug in a payment flow = real money lost. Testing
  is not optional.
---

# Testing & QA Skill — Fintech SaaS

Senior QA engineer perspective. In fintech, bugs cost money — literally.
A double-charge bug, a failed webhook handler, or a broken invoice calculation
can destroy customer trust overnight. Test everything that touches money.

---

## Testing Pyramid for Fintech SaaS

```
          /\
         /E2E\          ← 10% — Slow, expensive, critical paths only
        /──────\
       /  Integ  \      ← 30% — API endpoints, DB queries, service boundaries
      /────────────\
     /  Unit Tests  \   ← 60% — Business logic, calculations, transformations
    /────────────────\
```

**Rule of thumb:** If it touches money → integration test minimum, E2E preferred.

---

## Unit Testing (Jest + TypeScript)

### What to Unit Test
- Billing calculations (proration, tax, discounts)
- Fraud scoring logic
- Business rule validations
- Data transformations
- Utility functions

```typescript
// Test billing calculations exhaustively
describe('calculateProration', () => {
  it('should calculate mid-cycle upgrade correctly', () => {
    const result = calculateProration({
      currentPlan: { price: 49, billingCycle: 'monthly' },
      newPlan: { price: 149, billingCycle: 'monthly' },
      daysRemainingInCycle: 15,
      daysInCycle: 30,
    });
    // 15/30 days remaining × (149-49) = €50 proration credit
    expect(result.creditAmount).toBe(50);
    expect(result.chargeAmount).toBe(149);
  });

  it('should handle annual-to-monthly downgrade', () => { ... });
  it('should handle zero days remaining', () => { ... });
  it('should handle currency rounding correctly', () => { ... });
});

// Test fraud rules
describe('FraudRulesEngine', () => {
  it('should block TOR exit node transactions', async () => {
    mockIsKnownTorIP.mockResolvedValue(true);
    const score = await engine.score(mockTransaction);
    expect(score.action).toBe('BLOCK');
    expect(score.reasons).toContain('TOR_EXIT_NODE');
  });

  it('should allow trusted repeat customers', async () => {
    const score = await engine.score({ ...mockTransaction, customerAge: 365, successfulPayments: 24 });
    expect(score.action).toBe('ALLOW');
  });
});
```

### Coverage Targets
```
Overall: > 80%
Payment/billing logic: 100%
Auth/permission logic: 100%
Fraud detection: 95%+
API controllers: 70%+
Utility functions: 90%+
```

---

## Integration Testing (API + Database)

Test your actual HTTP endpoints against a real test database.

```typescript
// Setup: test database + test Stripe account
beforeAll(async () => {
  app = await createTestApp();
  db = await createTestDatabase(); // Separate test DB, not production!
  stripe = new Stripe(process.env.STRIPE_TEST_SECRET_KEY); // Test mode key
});

afterEach(async () => {
  await db.cleanDatabase(); // Reset between tests
});

describe('POST /v1/invoices/:id/pay', () => {
  it('returns 401 without auth token', async () => {
    const response = await request(app)
      .post('/v1/invoices/inv_123/pay')
      .expect(401);

    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 403 when user lacks billing_manager role', async () => {
    const { token } = await createTestUser({ role: 'viewer' });
    await request(app)
      .post('/v1/invoices/inv_123/pay')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('cannot pay invoice from different organization (tenant isolation)', async () => {
    const org1 = await createTestOrg();
    const org2 = await createTestOrg();
    const invoice = await createTestInvoice({ orgId: org1.id });
    const { token } = await createTestUser({ orgId: org2.id, role: 'admin' });

    await request(app)
      .post(`/v1/invoices/${invoice.id}/pay`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404); // Not 403 — don't reveal existence of other org's data
  });

  it('successfully pays a valid open invoice', async () => {
    const { org, token } = await createTestOrgWithAdmin();
    const invoice = await createTestInvoice({ orgId: org.id, status: 'open', amountDue: 5000 });

    const response = await request(app)
      .post(`/v1/invoices/${invoice.id}/pay`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.data.status).toBe('paid');
    expect(response.body.data.paidAt).toBeDefined();

    // Verify audit log was created
    const auditLog = await db.auditLogs.findFirst({
      where: { resourceId: invoice.id, action: 'invoice.paid' }
    });
    expect(auditLog).toBeDefined();
  });
});
```

---

## Stripe Testing (Critical — Use Test Mode)

Stripe provides test card numbers for every scenario:

```typescript
// Test card numbers — never use real cards in tests
const TEST_CARDS = {
  success: '4242424242424242',
  declined: '4000000000000002',
  insufficientFunds: '4000000000009995',
  requiresAuth: '4000002500003155',  // 3D Secure
  expiredCard: '4000000000000069',
  processingError: '4000000000000119',
};

// Test Stripe webhook handling
describe('Stripe Webhook Handler', () => {
  it('handles invoice.payment_failed and starts dunning', async () => {
    const event = stripe.webhooks.generateTestHeaderString({
      payload: JSON.stringify({
        type: 'invoice.payment_failed',
        data: { object: { id: 'in_test123', customer: 'cus_test123' } }
      }),
      secret: process.env.STRIPE_WEBHOOK_SECRET,
    });

    await request(app)
      .post('/webhooks/stripe')
      .set('stripe-signature', event)
      .expect(200);

    // Verify dunning was triggered
    const dunningJob = await queue.getJob('dunning:cus_test123');
    expect(dunningJob).toBeDefined();
  });

  it('rejects webhook with invalid signature', async () => {
    await request(app)
      .post('/webhooks/stripe')
      .set('stripe-signature', 'invalid_signature')
      .expect(400);
  });
});
```

---

## E2E Testing (Playwright)

Full browser automation for critical user journeys:

```typescript
// tests/e2e/payment-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Invoice Payment Flow', () => {
  test('customer can pay invoice end-to-end', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[name=email]', 'test@company.com');
    await page.fill('[name=password]', 'TestPass123!');
    await page.click('button[type=submit]');

    // Navigate to invoice
    await page.goto('/invoices');
    await page.click('[data-testid=invoice-row]:first-child');

    // Pay invoice
    await page.click('[data-testid=pay-now-btn]');
    await expect(page.locator('[data-testid=payment-modal]')).toBeVisible();
    await expect(page.locator('[data-testid=payment-amount]')).toContainText('€');

    // Fill Stripe test card (via Stripe iframe)
    const stripeFrame = page.frameLocator('iframe[name*=stripe]');
    await stripeFrame.locator('[name=cardnumber]').fill('4242424242424242');
    await stripeFrame.locator('[name=exp-date]').fill('12/30');
    await stripeFrame.locator('[name=cvc]').fill('123');

    await page.click('[data-testid=confirm-payment-btn]');

    // Verify success
    await expect(page.locator('[data-testid=payment-success]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid=invoice-status]')).toContainText('Paid');
  });

  test('shows clear error for declined card', async ({ page }) => {
    // ... setup ...
    await stripeFrame.locator('[name=cardnumber]').fill('4000000000000002'); // Decline card
    await page.click('[data-testid=confirm-payment-btn]');

    await expect(page.locator('[data-testid=payment-error]'))
      .toContainText('Your card was declined');
    await expect(page.locator('[data-testid=update-card-link]')).toBeVisible();
  });
});

// Critical paths to cover with E2E:
// - Full signup → onboarding → first invoice → payment
// - Subscription upgrade flow
// - Failed payment → retry → success
// - MFA setup and login
// - Team member invitation and role assignment
```

---

## Multi-Tenant Isolation Tests

This is fintech-critical. One org must NEVER access another's data.

```typescript
describe('Multi-Tenant Data Isolation', () => {
  let org1: Org, org2: Org, token1: string, token2: string;

  beforeEach(async () => {
    ({ org: org1, token: token1 } = await createTestOrgWithAdmin());
    ({ org: org2, token: token2 } = await createTestOrgWithAdmin());
  });

  const ENDPOINTS = [
    ['GET',    '/v1/invoices'],
    ['GET',    '/v1/subscriptions'],
    ['GET',    '/v1/transactions'],
    ['GET',    '/v1/users'],
    ['GET',    '/v1/audit-logs'],
  ];

  // Parametric test: all list endpoints must only return org's own data
  test.each(ENDPOINTS)('%s %s returns only requester\'s org data', async (method, path) => {
    await createTestData(org1.id); // Create data for org1
    await createTestData(org2.id); // Create data for org2

    const res = await request(app)[method.toLowerCase()](path)
      .set('Authorization', `Bearer ${token1}`)
      .expect(200);

    const ids = res.body.data.map((item: any) => item.orgId);
    expect(ids.every((id: string) => id === org1.id)).toBe(true);
    expect(ids).not.toContain(org2.id);
  });
});
```

---

## Performance Testing (k6)

Test your API under realistic load before launch:

```javascript
// load-test.js — run with: k6 run load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 50 },   // Ramp up to 50 users
    { duration: '5m', target: 50 },   // Stay at 50 users
    { duration: '2m', target: 200 },  // Spike to 200
    { duration: '5m', target: 200 },  // Stay at 200
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(99)<500'],  // 99% of requests < 500ms
    http_req_failed: ['rate<0.01'],    // Error rate < 1%
  },
};

export default function () {
  const res = http.get('https://api.yourapp.com/v1/invoices', {
    headers: { Authorization: `Bearer ${__ENV.TEST_TOKEN}` },
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });
  sleep(1);
}
```

**When to run load tests:**
- Before every major release
- After any infrastructure change
- Monthly as part of performance budget

---

## Security Testing Checklist

Run before every release touching auth or payments:

```
Authentication:
☐ JWT expired tokens are rejected
☐ JWT with wrong signature is rejected
☐ Brute force protection on login (lockout after 5 attempts)
☐ MFA cannot be bypassed
☐ Password reset tokens expire in 1 hour

Authorization:
☐ Viewer cannot perform write actions
☐ Member cannot access billing endpoints
☐ Admin of Org A cannot access Org B data
☐ API keys are scoped correctly

Payments:
☐ Webhook signature is always validated
☐ Payment amounts cannot be manipulated client-side
☐ Idempotency keys prevent double charges
☐ Refund amount cannot exceed original charge

Input Validation:
☐ SQL injection attempts return 400, not 500
☐ XSS payloads are sanitized
☐ File upload types are validated
☐ Request body size limits enforced
```

Tools: **OWASP ZAP** (free, automated), **Snyk** (dependency vulnerabilities in CI/CD)

---

## CI/CD Quality Gates

Nothing merges without passing all gates:

```yaml
# .github/workflows/ci.yml
name: CI Quality Gates

on: [push, pull_request]

jobs:
  quality:
    steps:
      - name: TypeScript check
        run: npx tsc --noEmit

      - name: Lint
        run: npx eslint . --max-warnings 0

      - name: Unit tests + coverage
        run: npx jest --coverage
        # Fail if coverage drops below threshold

      - name: Integration tests
        run: npx jest --testPathPattern=integration
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test_db
          STRIPE_SECRET_KEY: ${{ secrets.STRIPE_TEST_KEY }}

      - name: Security scan
        run: npx snyk test

      - name: Build
        run: npm run build

  e2e:
    needs: quality
    steps:
      - name: E2E tests (staging)
        run: npx playwright test
        # Only on merge to main
        if: github.ref == 'refs/heads/main'
```
