---
name: ai-ml-fintech
description: >
  Expert AI and ML engineering skill for fintech SaaS platforms covering fraud detection, anomaly detection,
  predictive analytics, churn prediction, revenue forecasting, and AI-powered customer insights. Trigger this
  skill whenever the user asks about implementing AI/ML features, fraud detection systems, risk scoring,
  behavioral analytics, anomaly detection in transactions, churn prediction, LLM integration, predictive billing,
  customer segmentation, or building intelligent features into a fintech SaaS product. Also trigger when
  discussing AI strategy, selecting ML tools, integrating third-party AI APIs, or using Claude/GPT APIs
  within the product. Pragmatic approach: start with third-party tools, build custom only when justified.
---

# AI/ML for Fintech SaaS

Senior ML engineer perspective. In fintech, AI isn't hype — it's fraud prevention,
risk reduction, and competitive moat. But build pragmatically: buy before building custom.

---

## Pragmatic AI Strategy: Buy → Configure → Build

```
Phase 1 (MVP): Use Stripe Radar + Sardine.ai → zero ML code, 80% of protection
Phase 2 (Growth): Add custom velocity rules + anomaly detection
Phase 3 (Scale): Train custom models on your own transaction data
```

Don't build a fraud model from scratch before you have data. You need millions of
transactions before custom ML beats off-the-shelf solutions.

---

## Fraud Detection Stack

### Layer 1: Stripe Radar (Start Here — Free)
- Enables automatically on your Stripe account
- ML model trained on billions of Stripe transactions globally
- Custom rules via Radar dashboard (no code):
  ```
  Block if: card_country != billing_country AND amount > 500
  Review if: is_new_user AND amount > 200
  Allow if: customer.subscriptions.count > 12  (loyal customer)
  ```

### Layer 2: Sardine.ai (When You Need More)
- Device fingerprinting + behavioral biometrics
- Catches what Stripe misses: account takeover, synthetic identities
- API integration:
  ```typescript
  const sardineSession = await sardine.createSession({
    userId: user.id,
    sessionKey: generateSessionKey(),
    userIdHash: hashUserId(user.id),
  });
  // Embed sardine JS snippet client-side during payment flow
  // Sardine scores the session before you call Stripe
  ```

### Layer 3: Custom Velocity Rules (Build This Early)
```typescript
class FraudRulesEngine {
  async score(transaction: Transaction): Promise<FraudScore> {
    const signals = await Promise.all([
      this.checkVelocity(transaction),
      this.checkGeoAnomaly(transaction),
      this.checkDeviceRisk(transaction),
      this.checkAccountAge(transaction),
    ]);

    const score = signals.reduce((acc, s) => acc + s.score, 0);
    const reasons = signals.filter(s => s.triggered).map(s => s.reason);

    return {
      score,                          // 0-100, higher = riskier
      action: score > 80 ? 'BLOCK' : score > 50 ? 'REVIEW' : 'ALLOW',
      reasons,
    };
  }

  private async checkVelocity(txn: Transaction) {
    const recentCount = await db.transactions.count({
      where: {
        userId: txn.userId,
        createdAt: { gte: subHours(new Date(), 1) }
      }
    });
    return {
      triggered: recentCount > 10,
      score: Math.min(recentCount * 5, 40),
      reason: 'HIGH_VELOCITY',
    };
  }

  private async checkGeoAnomaly(txn: Transaction) {
    const userCountry = await getUserTypicalCountry(txn.userId);
    const ipCountry = await geolocate(txn.ipAddress);
    const isTor = await checkTorExitNode(txn.ipAddress);
    return {
      triggered: ipCountry !== userCountry || isTor,
      score: isTor ? 60 : ipCountry !== userCountry ? 25 : 0,
      reason: isTor ? 'TOR_EXIT_NODE' : 'GEO_MISMATCH',
    };
  }
}
```

---

## Anomaly Detection (Transaction Monitoring)

Detect unusual patterns automatically:

```typescript
// Statistical approach: flag transactions > 3 standard deviations from user's baseline
async function detectAnomalies(userId: string, amount: number): Promise<boolean> {
  const history = await getTransactionHistory(userId, { days: 90 });
  
  if (history.length < 10) return false; // Not enough data
  
  const amounts = history.map(t => t.amount);
  const mean = amounts.reduce((a, b) => a + b) / amounts.length;
  const variance = amounts.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / amounts.length;
  const stdDev = Math.sqrt(variance);
  
  const zScore = Math.abs((amount - mean) / stdDev);
  return zScore > 3; // 3 standard deviations = very unusual
}

// Time-based anomalies
async function detectTimeAnomaly(userId: string, timestamp: Date): Promise<boolean> {
  const userTimezone = await getUserTimezone(userId);
  const localHour = getLocalHour(timestamp, userTimezone);
  // Flag transactions between 1am-5am local time
  return localHour >= 1 && localHour <= 5;
}
```

---

## Churn Prediction

Predict which customers are likely to cancel before they do:

```typescript
// Churn signal features
interface ChurnFeatures {
  daysSinceLastLogin: number;       // High = bad
  loginFrequencyTrend: number;      // Negative = declining
  supportTicketCount30d: number;    // High = frustrated
  featureAdoptionRate: number;      // Low = not getting value
  invoiceDisputeCount: number;      // High = payment issues
  planDowngradeHistory: boolean;    // Recent downgrade = at risk
  npsScore?: number;                // Low NPS = churn risk
  daysUntilRenewal: number;         // Low = decision point
}

// Simple rule-based churn score (before you have ML)
function calculateChurnRisk(features: ChurnFeatures): 'HIGH' | 'MEDIUM' | 'LOW' {
  let risk = 0;
  if (features.daysSinceLastLogin > 14) risk += 30;
  if (features.loginFrequencyTrend < -0.5) risk += 25;
  if (features.supportTicketCount30d > 3) risk += 20;
  if (features.featureAdoptionRate < 0.2) risk += 15;
  if (features.planDowngradeHistory) risk += 20;
  if (features.npsScore && features.npsScore < 6) risk += 30;
  
  if (risk >= 60) return 'HIGH';
  if (risk >= 30) return 'MEDIUM';
  return 'LOW';
}

// Trigger actions based on risk
async function handleChurnRisk(org: Organization, risk: ChurnRisk) {
  if (risk === 'HIGH') {
    await notifyCustomerSuccess(org, 'URGENT: High churn risk');
    await sendRetentionEmail(org, 'personalized_offer');
  } else if (risk === 'MEDIUM') {
    await scheduleCheckInCall(org);
  }
}
```

---

## Revenue Intelligence (AI-Powered Analytics)

Use Claude API to generate natural language insights from your data:

```typescript
// Generate revenue commentary automatically
async function generateRevenueInsight(metrics: RevenueMetrics): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: `You are a financial analyst. Given these SaaS metrics, write 2 sentences of insight:
          MRR: ${metrics.mrr} (${metrics.mrrGrowth}% vs last month)
          Churn: ${metrics.churnRate}% (${metrics.churnTrend > 0 ? 'up' : 'down'} ${Math.abs(metrics.churnTrend)}%)
          New customers: ${metrics.newCustomers}
          Expansion revenue: ${metrics.expansionRevenue}
          Be specific and actionable. No fluff.`
      }]
    })
  });
  const data = await response.json();
  return data.content[0].text;
}
// Output: "MRR grew 12% driven by 23 new enterprise accounts, but churn increased to 3.2%, 
// suggesting retention needs attention to sustain this growth trajectory."
```

---

## Predictive Analytics for Billing

### Subscription Renewal Forecasting
```typescript
// Predict next month's revenue
function forecastMRR(subscriptions: Subscription[]): MRRForecast {
  const activeRevenue = subscriptions
    .filter(s => s.status === 'active')
    .reduce((sum, s) => sum + s.monthlyAmount, 0);
    
  const atRiskRevenue = subscriptions
    .filter(s => s.churnRisk === 'HIGH')
    .reduce((sum, s) => sum + s.monthlyAmount, 0);
    
  return {
    baseRevenue: activeRevenue,
    expectedChurn: atRiskRevenue * 0.4,   // 40% of high-risk will churn
    forecastedMRR: activeRevenue - (atRiskRevenue * 0.4),
    confidence: 0.85,
  };
}
```

### Payment Failure Prediction
```typescript
// Predict which cards will fail before renewal
interface CardRiskSignals {
  expiresInDays: number;      // < 30 days = high risk
  lastDeclineCount: number;   // Recent declines
  lastUpdatedDays: number;    // Old card = stale
}

function predictPaymentFailure(card: CardRiskSignals): number {
  let probability = 0.05; // 5% base rate
  if (card.expiresInDays < 30) probability += 0.4;
  if (card.expiresInDays < 7) probability += 0.3;
  if (card.lastDeclineCount > 0) probability += 0.25;
  return Math.min(probability, 0.95);
}

// Act on prediction: send email 30 days before expiry
```

---

## AI Feature Ideas for Your SaaS (Prioritized)

| Feature | Value | Effort | Priority |
|---|---|---|---|
| Fraud scoring on payments | Reduce chargebacks | Low (use Stripe Radar) | ✅ Build now |
| Smart dunning (predict best retry time) | Recover failed payments | Medium | ✅ Build now |
| Churn risk alerts to CS team | Proactive retention | Medium | 🔄 Phase 2 |
| AI revenue commentary | Dashboard insight | Low (Claude API) | 🔄 Phase 2 |
| Payment failure prediction | Reduce involuntary churn | Medium | 🔄 Phase 2 |
| Custom fraud ML model | Better accuracy | High (needs data) | 📅 Phase 3 |
| Personalized pricing recommendations | Expansion revenue | High | 📅 Phase 3 |

---

## Smart Dunning (Recover Failed Payments)

One of the highest ROI AI applications in billing SaaS:

```typescript
// Predict optimal retry time based on historical data
async function getOptimalRetryTime(customerId: string): Promise<Date> {
  // Analyze when this customer's payments historically succeed
  const successfulPayments = await getSuccessfulPayments(customerId);
  const mostSuccessfulHour = getMostFrequentHour(successfulPayments);
  
  // Default: retry on Tuesday-Thursday between 10am-2pm customer's timezone
  // These have statistically highest success rates across all card networks
  const nextRetry = getNextBusinessDay(mostSuccessfulHour);
  
  return nextRetry;
}

// Dunning sequence
const dunningSequence = [
  { day: 0,  action: 'retry_payment' },
  { day: 1,  action: 'send_email',    template: 'payment_failed_1' },
  { day: 3,  action: 'retry_payment' },
  { day: 5,  action: 'send_email',    template: 'payment_failed_2' },
  { day: 7,  action: 'retry_payment' },
  { day: 10, action: 'send_sms',      template: 'urgent_action_required' },
  { day: 14, action: 'suspend_access' },
  { day: 30, action: 'cancel_subscription' },
];
```

---

## Data Infrastructure for ML

Before you can do ML, you need clean data:

```
PostgreSQL (operational) → ETL pipeline → Data Warehouse → ML models
                                          (BigQuery / Snowflake)
```

Track these events from day 1 (you'll need them for ML later):
- Every login with timestamp, device, IP, location
- Every feature interaction (what they click, when)
- Every payment attempt with outcome
- Every support conversation topic
- Every plan change and when it occurred

Use **Mixpanel** or **Amplitude** for behavioral data — much easier than building yourself.
