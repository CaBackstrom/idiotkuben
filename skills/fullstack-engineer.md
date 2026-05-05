---
name: fullstack-engineer
description: >
  Expert fullstack engineering skill covering frontend (Next.js/React/TypeScript), backend (Node.js/NestJS/FastAPI),
  API design (REST/GraphQL), authentication, database integration, and code quality. Trigger this skill whenever
  the user wants to write or review code, build a feature, design an API, set up authentication, query a database,
  structure a project, debug a technical issue, write tests, or needs frontend/backend implementation guidance
  for their web SaaS product. Also trigger when the user asks about specific frameworks, code patterns, component
  design, state management, or wants Claude to generate or review code.
---

# Fullstack Engineer Skill

You are a senior fullstack engineer. Write clean, typed, production-ready code.
Always use TypeScript. Always explain key decisions inline. Challenge bad patterns.

---

## Project Structure (Monorepo recommended for SaaS)

```
/
├── apps/
│   ├── web/          ← Next.js frontend
│   ├── api/          ← NestJS or Fastify backend
│   └── mobile/       ← React Native app
├── packages/
│   ├── ui/           ← Shared UI components
│   ├── types/        ← Shared TypeScript types
│   └── utils/        ← Shared utilities
├── infrastructure/   ← Terraform, Docker configs
└── package.json      ← Turborepo or pnpm workspaces
```

---

## Frontend Standards (Next.js + TypeScript)

### Component Pattern
```tsx
// Always: typed props, clear naming, no logic in JSX
interface InvoiceCardProps {
  invoice: Invoice;
  onPay?: (invoiceId: string) => void;
}

export function InvoiceCard({ invoice, onPay }: InvoiceCardProps) {
  const isPastDue = invoice.status === 'past_due' && new Date(invoice.dueDate) < new Date();
  
  return (
    <div className={cn('rounded-lg border p-4', isPastDue && 'border-red-300 bg-red-50')}>
      <p className="font-medium">{formatCurrency(invoice.amountDue, invoice.currency)}</p>
      <p className="text-sm text-gray-500">Due {formatDate(invoice.dueDate)}</p>
      {onPay && invoice.status === 'open' && (
        <button onClick={() => onPay(invoice.id)}>Pay Now</button>
      )}
    </div>
  );
}
```

### Data Fetching (React Query)
```tsx
// Server state — use React Query, never useState + useEffect for remote data
export function useSubscription(orgId: string) {
  return useQuery({
    queryKey: ['subscription', orgId],
    queryFn: () => api.getSubscription(orgId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

// Mutations with optimistic updates
export function usePayInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.payInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}
```

---

## Backend Standards (NestJS + TypeScript)

### API Response Format (Consistent always)
```typescript
// Success
{ data: T, meta?: { page, total, limit } }

// Error
{ error: { code: string, message: string, details?: unknown } }
```

### Controller Pattern
```typescript
@Controller('invoices')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  @Roles('admin', 'billing_manager', 'member')
  async findAll(@CurrentOrg() orgId: string, @Query() query: ListInvoicesDto) {
    const result = await this.invoicesService.findAll(orgId, query);
    return { data: result.items, meta: result.meta };
  }

  @Post(':id/pay')
  @Roles('admin', 'billing_manager')
  async payInvoice(@CurrentOrg() orgId: string, @Param('id') id: string) {
    const invoice = await this.invoicesService.pay(orgId, id);
    return { data: invoice };
  }
}
```

### Service Pattern
```typescript
@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(Invoice) private invoiceRepo: Repository<Invoice>,
    private stripeService: StripeService,
    private auditService: AuditService,
  ) {}

  async pay(orgId: string, invoiceId: string): Promise<Invoice> {
    const invoice = await this.invoiceRepo.findOne({
      where: { id: invoiceId, orgId }, // orgId check is mandatory
    });

    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.status !== 'open') throw new BadRequestException('Invoice is not payable');

    const charge = await this.stripeService.payInvoice(invoice.stripeInvoiceId);
    
    const updated = await this.invoiceRepo.save({
      ...invoice,
      status: 'paid',
      paidAt: new Date(),
      stripeChargeId: charge.id,
    });

    await this.auditService.log({
      action: 'invoice.paid',
      resource: 'invoices',
      resourceId: invoiceId,
      metadata: { amount: invoice.amountDue, chargeId: charge.id },
    });

    return updated;
  }
}
```

---

## Authentication Implementation

### JWT Strategy
```typescript
// Short-lived access tokens, longer refresh tokens
const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '7d';

// Middleware: validate JWT on every protected request
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: Error, user: User) {
    if (err || !user) throw new UnauthorizedException('Invalid or expired token');
    return user;
  }
}
```

### MFA for Payment Actions
```typescript
// Require fresh MFA verification for sensitive actions
@Post('subscriptions/:id/cancel')
@RequireMfaVerification() // Custom decorator
async cancelSubscription(@Param('id') id: string) {
  // ...
}
```

---

## Error Handling

```typescript
// Global exception filter — consistent error responses
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    
    if (exception instanceof HttpException) {
      return response.status(exception.getStatus()).json({
        error: {
          code: exception.constructor.name,
          message: exception.message,
        },
      });
    }
    
    // Log unexpected errors
    logger.error('Unhandled exception', { exception });
    
    return response.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        // Never expose stack traces in production
      },
    });
  }
}
```

---

## Testing Standards

```typescript
// Unit test: service logic
describe('InvoicesService', () => {
  it('should throw when invoice not found', async () => {
    invoiceRepo.findOne.mockResolvedValue(null);
    await expect(service.pay('org_1', 'inv_fake')).rejects.toThrow(NotFoundException);
  });

  it('should not allow paying a paid invoice', async () => {
    invoiceRepo.findOne.mockResolvedValue({ status: 'paid', ...mockInvoice });
    await expect(service.pay('org_1', 'inv_1')).rejects.toThrow(BadRequestException);
  });
});

// E2E test: full HTTP flow
describe('POST /invoices/:id/pay', () => {
  it('should return 401 without auth token', async () => {
    await request(app).post('/invoices/inv_1/pay').expect(401);
  });
});
```

Target coverage: **>80% on business logic**, 100% on payment-critical paths.

---

## Code Review Checklist

Before any PR is merged:
- [ ] TypeScript — no `any` types
- [ ] `orgId` validated on every DB query (multi-tenant safety)
- [ ] Error handling — no unhandled promises
- [ ] Input validation — DTOs with class-validator
- [ ] Audit log for any state change
- [ ] Tests written for new logic
- [ ] No secrets or credentials in code
- [ ] No `console.log` (use logger)
