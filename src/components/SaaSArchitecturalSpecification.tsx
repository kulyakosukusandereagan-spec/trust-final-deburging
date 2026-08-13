import { useState } from 'react';
import { 
  Folder, File, Database, Key, Terminal, Code, Settings, ShieldCheck, 
  Layers, GitBranch, ArrowRight, CheckCircle2, Server, Cpu, Cloud, 
  Lock, Copy, Check, ListChecks, Radio, Bookmark, HelpCircle, FileText
} from 'lucide-react';

export default function SaaSArchitecturalSpecification() {
  const [activeSubTab, setActiveSubTab] = useState<'folder_structure' | 'database_schema' | 'api_docs' | 'docker_k8s' | 'security_compliance' | 'dev_roadmap' | 'enterprise_saas'>('enterprise_saas');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // 1. Folder Structure Strings
  const folderStructureText = `jubu-pharma-saas/
├── backend/                        # FastAPI Enterprise Backend
│   ├── app/
│   │   ├── api/                    # API Route Handlers
│   │   │   ├── v1/
│   │   │   │   ├── auth.py         # Multi-tenant Auth Gateway
│   │   │   │   ├── inventory.py    # Batch tracking and barcodes
│   │   │   │   ├── pos.py          # POS checkout & validations
│   │   │   │   ├── bills.py        # Billing, invoicing, Stripe
│   │   │   │   ├── prescriptions.py# FDA/EPCS prescription checking
│   │   │   │   └── reports.py      # Real-time multi-tenant aggregator
│   │   │   └── deps.py             # FastAPI dependency injections
│   │   ├── core/
│   │   │   ├── config.py           # Pydantic Global Configurations
│   │   │   ├── security.py         # OAuth2 + JWT encryption (AES-256)
│   │   │   ├── celery_app.py       # Celery Worker Orchestration
│   │   │   └── redis_pool.py       # Redis cache connection manager
│   │   ├── db/
│   │   │   ├── base.py             # SQLAlchemy Declarative Base
│   │   │   ├── session.py          # Thread-safe PostgreSQL connection
│   │   │   └── tenant_middleware.py# Dynamic Tenant schema switcher
│   │   ├── models/                 # SQLAlchemy Database Models
│   │   │   ├── tenant.py           # Tenant details and billing
│   │   │   ├── user.py             # RBAC Federated identities
│   │   │   ├── drug.py             # Inventory, SKU, bar codes
│   │   │   ├── prescription.py     # EPCS / Digitally signed records
│   │   │   └── transaction.py      # Point of Sale transactions
│   │   ├── schemas/                # Pydantic validation schemas
│   │   └── tasks/                  # Async Celery tasks
│   │       ├── expiry_watcher.py   # Daily batch expiry checker
│   │       └── replenishment.py    # Auto-purchase order generator
│   ├── Dockerfile
│   ├── requirements.txt
│   └── alembic.ini                 # DB Migration manager
│
├── frontend/                       # Next.js 14 Web Portal
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── admin/              # Superadmin Multi-tenant Dashboard
│   │   │   ├── inventory/          # Pharmacy inventory, barcode reader
│   │   │   ├── pos/                # POS terminal, local-first queue
│   │   │   └── reports/            # Real-time analytics charts
│   │   ├── components/             # Reusable UI Atoms and Organisms
│   │   ├── lib/
│   │   │   ├── api-client.ts       # Axios wrapper with Tenant interceptor
│   │   │   └── service-worker.ts   # Offline-first Service Worker
│   │   └── types/
│   ├── Dockerfile
│   ├── tailwind.config.js
│   └── package.json
│
├── deploy/                         # Enterprise Infrastructure (IaC)
│   ├── k8s/
│   │   ├── namespace.yaml
│   │   ├── postgresql-stateful.yaml# HA Cluster setup (Stolon/Patroni)
│   │   ├── redis-deployment.yaml   # Distributed Cache deployment
│   │   ├── backend-deployment.yaml # FastAPI cluster auto-scaling
│   │   ├── frontend-deployment.yaml# Next.js serverless/SSR deployment
│   │   └── ingress-nginx.yaml     # SSL certs, rate-limiting rules
│   ├── docker-compose.yml          # Local multi-container stack
│   └── terraform/                  # AWS infrastructure blueprint
└── .github/
    └── workflows/
        └── ci-cd.yml               # GitHub Actions Pipeline`;

  // 2. Database Schema Strings
  const databaseSchemaText = `-- ====================================================================================
-- ENTERPRISE JUBU PHARMA SAAS MULTI-TENANT SCHEMA DESIGN
-- Method: Row Level Security (RLS) + Schema-Per-Tenant hybrid configuration
-- Database: PostgreSQL 15+ / TimescaleDB
-- ====================================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. CENTRAL SYSTEM WORKSPACE: TENANTS
CREATE TABLE public.tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    plan_tier VARCHAR(32) NOT NULL DEFAULT 'starter', -- starter, pro, enterprise
    billing_status VARCHAR(32) NOT NULL DEFAULT 'active', -- active, trial, suspended
    stripe_customer_id VARCHAR(128),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tenants_slug ON public.tenants(slug);

-- 2. SAAS MULTI-TENANT BOUNDED USER IDENTITY TABLE (RBAC)
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(128),
    last_name VARCHAR(128),
    role VARCHAR(64) NOT NULL DEFAULT 'pharmacy_staff', -- superadmin, admin, pharmacist, staff
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_tenant_user_email UNIQUE (tenant_id, email)
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_user_isolation_policy ON public.users 
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- 3. MEDICATIONS & INVENTORY STOCK TABLE (WITH BARCODE INDEXES)
CREATE TABLE public.medications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    barcode VARCHAR(128) NOT NULL, -- UPC/EAN scan input index
    name VARCHAR(255) NOT NULL,
    active_ingredient VARCHAR(255),
    sku VARCHAR(128) NOT NULL,
    category VARCHAR(128),
    dosage_form VARCHAR(64), -- Tablet, Capsule, Liquid, Syrup
    min_safety_stock INT NOT NULL DEFAULT 50, -- Safety limit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_tenant_barcode UNIQUE (tenant_id, barcode),
    CONSTRAINT uq_tenant_sku UNIQUE (tenant_id, sku)
);

ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_medication_isolation ON public.medications 
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- 4. PHYSICAL BATCH STOCKS & REAL-TIME EXPIRY CONTROL (TimescaleDB Ready)
CREATE TABLE public.inventory_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    medication_id UUID NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
    batch_number VARCHAR(128) NOT NULL,
    expiry_date DATE NOT NULL,
    quantity_available INT NOT NULL DEFAULT 0,
    unit_cost_cents INT NOT NULL, -- Store as integer to prevent floating point drift
    unit_sale_cents INT NOT NULL,
    supplier_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_batches_expiry ON public.inventory_batches(expiry_date, quantity_available);
ALTER TABLE public.inventory_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_batch_isolation ON public.inventory_batches 
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- 5. PRESCRIPTION VERIFICATION (EPCS-COMPLIANT DIGITAL SIGNATURES)
CREATE TABLE public.prescriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    patient_name VARCHAR(255) NOT NULL,
    doctor_license_npi VARCHAR(32) NOT NULL, -- National Provider Identifier
    digital_signature_hash VARCHAR(255) NOT NULL, -- SHA256 of encrypted signature
    is_validated BOOLEAN DEFAULT FALSE,
    refills_allowed INT DEFAULT 0,
    refills_remaining INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_prescription_isolation ON public.prescriptions 
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- 6. POS TRANSACTIONS LOGS
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    total_cents INT NOT NULL,
    tax_cents INT NOT NULL,
    discount_cents INT DEFAULT 0,
    payment_method VARCHAR(64) NOT NULL, -- cash, stripe_terminal, insurance
    pharmacist_user_id UUID NOT NULL REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. POS TRANSACTION ITEMS (LINE ITEMS)
CREATE TABLE public.transaction_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL REFERENCES public.inventory_batches(id),
    quantity INT NOT NULL,
    price_cents INT NOT NULL
);`;

  // 3. API Documentation
  const apiDocsText = `# OpenAPI 3.0 Specification Summary
# Base URL: https://api.jubupharma.com/api/v1
# Global Header: X-Tenant-Context-ID: <UUID_OR_SLUG>
# Auth Header: Authorization: Bearer <JWT_TOKEN>

paths:
  /auth/token:
    post:
      summary: Authenticate a multi-tenant staff member
      requestBody:
        content:
          application/json:
            schema:
              type: object
              required: [tenant_slug, email, password]
              properties:
                tenant_slug: { type: string, example: "downtown-ops" }
                email: { type: string, example: "pharmacist@downtown.com" }
                password: { type: string, example: "••••••••" }
      responses:
        200:
          description: Signed JWT Token enclosing role permissions and claims
          content:
            application/json:
              schema:
                type: object
                properties:
                  access_token: { type: string }
                  token_type: { type: string, example: "bearer" }
                  claims: { type: object, properties: { role: { type: string }, tenant_id: { type: string } } }

  /inventory/barcode/{barcode}:
    get:
      summary: Resolve medication info by UPC/EAN barcode scanner input
      parameters:
        - name: barcode
          in: path
          required: true
          schema: { type: string, example: "030005372338" }
      responses:
        200:
          description: Resolved inventory item metadata with live available batch stocks
          content:
            application/json:
              schema:
                type: object
                properties:
                  id: { type: string, format: uuid }
                  name: { type: string, example: "Ibuprofen 400mg" }
                  sku: { type: string, example: "IBU-400-DT" }
                  total_stock: { type: integer, example: 125 }
                  batches:
                    type: array
                    items:
                      type: object
                      properties:
                        batch_number: { type: string, example: "BT-204" }
                        quantity_available: { type: integer, example: 40 }
                        expiry_date: { type: string, format: date }

  /pos/checkout:
    post:
      summary: Record checkout and instantly deduct batch inventory quantities
      requestBody:
        content:
          application/json:
            schema:
              type: object
              required: [items, payment_method]
              properties:
                items:
                  type: array
                  items:
                    type: object
                    properties:
                      batch_id: { type: string, format: uuid }
                      quantity: { type: integer, example: 2 }
                payment_method: { type: string, example: "stripe_terminal" }
                prescription_id: { type: string, format: uuid, nullable: true }
      responses:
        201:
          description: Transaction recorded. Background tasks initiated for invoice push.
          content:
            application/json:
              schema:
                type: object
                properties:
                  transaction_id: { type: string, format: uuid }
                  total_cents: { type: integer }
                  invoice_pdf_url: { type: string }
                  inventory_depletion_success: { type: boolean }`;

  // 4. Docker & K8s Configuration
  const dockerK8sText = `# ====================================================================================
# DOCKERFILE - FASTAPI BACKEND (Enterprise Multi-stage Build)
# ====================================================================================
FROM python:3.11-slim as builder

WORKDIR /app
RUN apt-get update && apt-get install -y build-essential libpq-dev --no-install-recommends

COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

FROM python:3.11-slim as runner
WORKDIR /app
RUN apt-get update && apt-get install -y libpq5 && rm -rf /var/lib/apt/lists/*

COPY --from=builder /root/.local /root/.local
COPY . .

ENV PATH=/root/.local/bin:$PATH
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

# ====================================================================================
# KUBERNETES DEPLOYMENT MANIFEST (SaaS Scaling Blueprint with Pod Topology Constraints)
# ====================================================================================
apiVersion: apps/v1
kind: Deployment
metadata:
  name: jubu-backend-deployment
  namespace: jubu-prod
  labels:
    app: jubu-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: jubu-backend
  template:
    metadata:
      labels:
        app: jubu-backend
    spec:
      containers:
      - name: fastapi-server
        image: gcr.io/jubu-pharma-saas/backend:v1.1.0
        ports:
        - containerPort: 8000
        envFrom:
        - secretRef:
            name: jubu-db-secrets
        - configMapRef:
            name: jubu-global-config
        resources:
          limits:
            cpu: "1"
            memory: 1Gi
          requests:
            cpu: "250m"
            memory: 256Mi
        readinessProbe:
          httpGet:
            path: /api/v1/health
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 10
        livenessProbe:
          httpGet:
            path: /api/v1/health
            port: 8000
          initialDelaySeconds: 15
          periodSeconds: 20
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: jubu-backend-hpa
  namespace: jubu-prod
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: jubu-backend-deployment
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 75`;

  // 5. Security & Compliance Checklist
  const securityChecklistText = `## 🔒 JUBU PHARMA SAAS: HIPAA & SOC2 AUDIT CHECKLIST

### 1. Data Isolation & Access Controls
- [x] **Dynamic Row Level Security (RLS)**: PostgreSQL executes \`ALTER TABLE ... ENABLE ROW LEVEL SECURITY\` to block cross-tenant database leakage.
- [x] **Secure Tenant Injection Middleware**: FastAPI automatically loads tenant UUID from authorized claims in \`Authorization\` headers, injecting it securely into the SQL transaction scope.
- [x] **Strict RBAC Constraints**: Enforce permissions separation between \`superadmin\`, \`pharmacy_manager\`, \`pharmacist\`, and \`cashier_staff\`.

### 2. Encryption Standards
- [x] **Transport Layer Security**: End-to-end SSL encryption. TLS 1.3 enforced by Ingress Nginx with Let's Encrypt automated rotation.
- [x] **Encryption-At-Rest (E2E)**: Database storage disks encrypted using AWS KMS with AES-256 keys.
- [x] **Digitally Signed Prescriptions**: EPCS regulatory compliance requiring electronic signatures signed via RSA-2048 and stored as verified SHA256 hashes inside the immutable ledger.

### 3. Monitoring, Telemetry, and Audit Logs
- [x] **System Audit Trail**: Record all pharmacy checkouts, inventory stock overrides, or prescription checks in an automated audit table (\`system_audit_logs\`) with details of the originating IP address and user-agent.
- [x] **Intrusion Detection System**: Integrated cloud-native tracking triggers notifying engineering of brute force logins or unauthorized cross-tenant API payloads.`;

  // 6. Development Roadmap
  const devRoadmapText = `## 🚀 FROM MVP TO ENTERPRISE SCALE: DEVELOPMENT PHASES

### Phase 1: Bounded MVP (Month 1 - 2)
- Focus: Single tenant core systems.
- Objectives: Implement full PostgreSQL backend schema, initial React component libraries, and basic catalog inventory manager.
- Milestones: Functional inventory catalog, single barcode scanner integration, simple POS transaction ledger, manual PDF invoice download.

### Phase 2: Multi-Tenant Expansion (Month 3 - 4)
- Focus: SaaS partitioning and subscriber portals.
- Objectives: Deploy schema level database partitioning, implement sub-domains routing, add superadmin billing configurations.
- Milestones: Row-level tenant isolation, Stripe recurring billing integration, multi-tenant workspace management dashboard.

### Phase 3: Compliance & Automated Operations (Month 5 - 6)
- Focus: EPCS regulatory compliance and background workers.
- Objectives: Implement digitally signed prescription checkers, deploy Celery background expiry triggers, install TimescaleDB logs.
- Milestones: Fully HIPAA-compliant signature validation checks, automated SMS/email low-stock warnings, offline POS caching.

### Phase 4: Enterprise Scale (Month 7+)
- Focus: High-availability setups and global CDNs.
- Objectives: Migrate infrastructure to multi-region AWS EKS (Kubernetes), configure distributed Redis clustering, deploy edge service workers.
- Milestones: Active-active cross-region database replicas, dynamic load balancer thresholds, custom white-label sub-domains for Enterprise hospitals.`;

  // 7. Dynamic SaaS Enterprise Enhancements Matrix
  const enterpriseSaaSText = `## 🏢 SENIOR ARCHITECT PORTFOLIO: ENTERPRISE SAAS ENHANCEMENTS & COMPLIANCE

### 1. SECURITY AND TENANT ISOLATION
Enforcing absolute security and patient privacy boundaries under HIPAA guidelines:
* **Zero Client Access**: Application source code, raw Postgres schema structures, Swagger/OpenAPI interactive endpoints, direct system configurations (.env, K8s secrets), and raw system telemetry are hidden behind an AWS CloudFront/Cloudflare WAF. Only client-facing JS bundles and authenticated API proxies are exposed.
* **Row-Level Security (RLS)**: Enforced via PostgreSQL policies matching the \`app.current_tenant_id\` thread variable, guaranteeing data isolation even under catastrophic application-level authorization bugs.
* **Sensitive Field Encryption**: Patient identifying names, telephone contacts, and doctor licenses are stored using AES-256-GCM symmetric encryption (Postgres \`pgp_sym_encrypt\` or server-side KMS envelopes) so that a physical database leak yields only cryptographically randomized values.
* **Audit Control Logs**: Every user action (create, edit, delete, dispense, or download) triggers a structured, immutable log written to a write-once, read-many (WORM) audit trail ledger.
* **Explicit Support Impersonation approvals**: Super Admins cannot inspect tenant operational health tables. When support is required, the Tenant Owner must toggle a "Support Impersonation Token" from their settings dashboard. This registers a secure, cryptographic token in Redis expiring automatically in 15m, 1h, or 24h, after which Super Admin session routing immediately reverts to "ACCESS DENIED".

### 2. WHITE-LABEL BRANDING PIPELINE
Complete white-label capability across all customer-facing touchpoints:
* **Tenant Configuration Schema**:
\`\`\`json
{
  "tenantId": "tenant-stjude",
  "businessName": "St. Jude Clinical Pharmacy",
  "logoUrl": "https://cdn.pharmacycloud.com/logos/stjude.png",
  "address": "456 Cathedral Parkway, Suite 10",
  "telephone": "+1 (800) 555-0100",
  "email": "billing@stjudeclinic.com",
  "website": "https://pharmacy.stjudeclinic.com",
  "taxNumber": "TX-99884422-A",
  "currency": "USD",
  "receiptTemplate": {
    "header": "ST. JUDE HEALTHCARE GROUP - DISPENSARY RECEIPT",
    "footer": "Thank you for trusting St. Jude for your care. Keep out of reach of children."
  },
  "reportTemplate": {
    "header": "ST. JUDE CLINICAL SYSTEM ANALYTICS - STRICTLY CONFIDENTIAL",
    "footer": "Report generated by secure cloud microservices. Page 1 of 1."
  }
}
\`\`\`
* **Dynamic Rendering**: All visual subsystems (Login gate, Dashboard layouts, POS receipts, PDF reports, emails, invoices) read this config from Redis cache and dynamically style the primary CSS palette, typography spacing, and headers/footers, hiding all reference to the parent platform brand.

### 3. CUSTOM TENANT URL & RECONCILIATION MIDDLEWARE
Enabling dedicated routing entry-points for SaaS tenants:
* **Access URL Pattern**: Supports custom subdomains (\`https://tenantname.pharmacycloud.com\`) or subfolders (\`https://app.pharmacycloud.com/tenant/tenantname\`).
* **Routing Middleware (Next.js/Express)**:
\`\`\`typescript
export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get("host") || "";
  
  // Isolate subdomain
  const subdomain = hostname.split(".")[0];
  const isBaseDomain = subdomain === "pharmacycloud" || subdomain === "app" || subdomain === "www";
  
  if (!isBaseDomain) {
    // Resolve tenantId from subdomain cache in Redis
    const tenantId = await redis.get(\`subdomain:\${subdomain}:id\`);
    if (tenantId) {
      // Rewrite request internally to the isolated tenant directory
      url.pathname = \`/tenant/\${tenantId}\${url.pathname}\`;
      return NextResponse.rewrite(url);
    }
  }
  return NextResponse.next();
}
\`\`\`
* **Wildcard SSL Configuration**: Deploy an Nginx Ingress Controller on Kubernetes mapped to an Automated Wildcard Let's Encrypt Certificate: \`*.pharmacycloud.com\`. DNS relies on wildcard CNAME records routing all traffic to the load balancer ip.

### 4. MULTI-BRANCH MANAGEMENT
Each pharmacy tenant is permitted up to 3 separate operational branches:
* **Branches List**: Main Branch (Central), Branch 1 (North), Branch 2 (East), Branch 3 (West).
* **Isolated Inventories**: Medicine catalogs share global drug definitions but maintain isolated physical batch quantities per branch store ID.
* **Inter-Branch Stock Transfers**:
  1. Store Keeper initiates transfer from Branch A to Branch B.
  2. Batch quantity in Branch A is placed in "PENDING_TRANSFER" hold state (deducted from active sales shelves).
  3. Branch B receives shipment, scans barcode to verify quantity and expiry, and signs off.
  4. Transfer Ledger is updated and stock is credited to Branch B's physical shelf location.
* **Unified Reports**: Dashboard analytics provide deep toggle views, letting Owners filter revenue, margins, stockouts, and staff rankings on a per-branch level or compile a consolidated company-wide profit-and-loss statement.

### 5. ROLE BASED ACCESS CONTROL (RBAC) MATRIX
Granular permissions mapped across 8 strategic pharmacy operational personas:

| Role | Inventory Control | POS Checkout Sales | Financial Reports | Tenant Settings |
| :--- | :--- | :--- | :--- | :--- |
| **1. Pharmacy Owner** | View, Create, Edit, Delete, Approve | View, Create, Refund, Discount Approve | View Branch, View Company, Download | Full Settings Admin & Billing |
| **2. Pharmacy Administrator** | View, Create, Edit, Delete | View, Create, Refund | View Branch, Download | Manage Users, Settings, No Billing |
| **3. Branch Manager** | View, Create, Edit, Transfer | View, Create, Refund | View Branch Reports | Manage Branch Users only |
| **4. Pharmacist** | View, Create Batches, Expiries | View, Create, Verify Rx | View Expiry Reports | No Access |
| **5. Cashier** | View shelf locations | View, Create (No Refund/Discount) | View Daily Cash Register | No Access |
| **6. Store Keeper** | View, Create, Edit Batches, Transfer | No Access | View Stock Valuation | No Access |
| **7. Accountant** | View Costs & Retail Prices | View Transactions List | View Company P&L, Tax Reports | No Access |
| **8. Auditor** | View All Batches & Movements | View All Checked Invoices | View Audit Logs Ledger, Downloads | No Access |

### 6. BARCODE AND QR CODE INVENTORY WORKFLOWS
Fully automated physical drug handling schemas:
* **Add Medicine Workflow**: Scan EAN/UPC barcode on packaging -> Query FDA National Drug Code (NDC) REST API -> Auto-populate drug name, active ingredients, category, and manufacturer.
* **QR Generation Workflow**: The platform automatically generates a unique, encrypted QR code for every physical stock batch containing: \`{ tenantId, batchNo, sku, expiryDate, unitCost }\`. This QR code is printed as a thermographic sticker and applied directly to the medicine box.
* **Scan to Checkout Sales**: Cashier sweeps the QR code at the checkout desk. The POS parser extracts batch data, verifies active ingredients are not expired, confirms prescription approval status, and decrements stock in Redis instantly.
* **Offline Scanning Cache**: When physical store internet connectivity is lost, mobile scanning apps buffer scans in an IndexedDB browser database. Upon network restoration, the system executes an atomic transaction reconciling the buffered queue.

### 7. PDF REPORTING ENGINE ARCHITECTURE
Automated, branded document compiler:
* **Architecture**: Implemented on the backend utilizing a stateless PDF generation service (Puppeteer/Headless Chrome rendering custom HTML, or native Node-Canvas/jsPDF modules).
* **Dynamic Header Injection**: The generator fetches the tenant's White-Label Branding profile (logo, telephone, receipt footers) and dynamically wraps the reports, producing high-fidelity PDF documents for Daily sales, P&L, Supplier, Expiry, and Audit Logs.
* **Scheduled Deliveries**: Tenants configure scheduled reports (e.g. "Every Sunday at 11:59 PM"). A Celery Beat scheduler triggers a worker, compiles the database data, renders the PDF, and dispatches it via Mailgun/SES to the specified recipient addresses.

### 8. STAFF PERFORMANCE ANALYTICS & SCORING ALGORITHM
Tracking operational velocity, accuracy, and customer satisfaction:
* **Key Metrics**:
  - Total Revenue generated (gross sales).
  - Average transaction ticket size.
  - Number of checkout transactions processed.
  - Expiry and inventory audit logs compiled.
  - Refunds and discount approvals triggered (risk flags).
* **Staff Performance Scoring Formula (KPI score out of 100)**:
  $$\\text{KPI Score} = (0.40 \\times R_{score}) + (0.30 \\times V_{score}) - (0.15 \\times D_{flag}) - (0.15 \\times F_{error})$$
  Where:
  - $R_{score}$ = Revenue performance normalized against the branch staff average.
  - $V_{score}$ = Transaction velocity (volume of checkout items scanned per hour).
  - $D_{flag}$ = Disproportionate discount rates (high percentage of manual discount triggers).
  - $F_{error}$ = Inventory errors (discrepancy rates identified during physical shelf auditing).

### 9. SETTINGS MODULE DESIGN
Comprehensive tenant-configurable configuration trees:
1. **Company Profile Settings**: Name, branding logo upload, sub-domain accessor URL, currency symbols, base tax percentages, timezones.
2. **Operational Settings**: Default expiry warning period (e.g., alert when 90 days remaining), low stock thresholds, prescription override rules, automatic purchase order triggers.
3. **Notification Channels**: Multi-channel toggle switches to activate instant SMS warnings (via Twilio), email newsletters (via SendGrid), WhatsApp notifications, or push reminders.

### 10. ENTERPRISE DEPLOYMENT AND MULTI-TENANT SCALING STRATEGY
Production orchestration architecture for massive scale:
* **Orchestration**: Deployed as containerized microservices on Google Cloud Run (FastAPI + React) scaling dynamically to zero during non-peak clinical hours, minimizing operational cloud costs.
* **Read Replicas**: Write queries are executed on the master PostgreSQL database while complex reporting dashboards route queries to dedicated, read-only replica databases to maintain zero impact on POS checkout response times.
* **In-Memory Caching**: Redis caches tenant configurations, white-label assets, and RBAC user claim lists with brief TTL expirations to minimize database query latency.`;

  return (
    <div className="bg-slate-900 text-slate-100 p-6 rounded-3xl border border-slate-800 shadow-xl space-y-6">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-sky-500 text-white rounded-2xl shadow-lg">
            <Server className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold tracking-tight text-white font-display flex items-center gap-2">
              Enterprise System Architecture Blueprint
              <span className="bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                Production-Ready
              </span>
            </h2>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Comprehensive full-stack architecture specifications for multi-tenant, HIPAA-compliant healthcare SaaS.
            </p>
          </div>
        </div>
      </div>

      {/* Sub tabs selector */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-4">
        <button
          onClick={() => setActiveSubTab('folder_structure')}
          className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'folder_structure'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40'
              : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
          }`}
        >
          <Folder className="h-4 w-4" />
          Directory Layout
        </button>

        <button
          onClick={() => setActiveSubTab('database_schema')}
          className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'database_schema'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40'
              : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
          }`}
        >
          <Database className="h-4 w-4" />
          PostgreSQL Schema
        </button>

        <button
          onClick={() => setActiveSubTab('api_docs')}
          className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'api_docs'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40'
              : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
          }`}
        >
          <Code className="h-4 w-4" />
          OpenAPI Specification
        </button>

        <button
          onClick={() => setActiveSubTab('docker_k8s')}
          className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'docker_k8s'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40'
              : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
          }`}
        >
          <Cloud className="h-4 w-4" />
          Docker &amp; Kubernetes
        </button>

        <button
          onClick={() => setActiveSubTab('security_compliance')}
          className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'security_compliance'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40'
              : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          HIPAA &amp; SOC2 Audit
        </button>

        <button
          onClick={() => setActiveSubTab('dev_roadmap')}
          className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'dev_roadmap'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40'
              : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
          }`}
        >
          <GitBranch className="h-4 w-4" />
          FastMVP Roadmap
        </button>

        <button
          onClick={() => setActiveSubTab('enterprise_saas')}
          className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'enterprise_saas'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40'
              : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
          }`}
        >
          <Layers className="h-4 w-4" />
          SaaS v2 Enhancements
        </button>
      </div>

      {/* Pane Contents */}
      <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 overflow-hidden relative group">
        
        {/* Copy button top-right */}
        <button
          onClick={() => {
            const textToCopy = 
              activeSubTab === 'folder_structure' ? folderStructureText :
              activeSubTab === 'database_schema' ? databaseSchemaText :
              activeSubTab === 'api_docs' ? apiDocsText :
              activeSubTab === 'docker_k8s' ? dockerK8sText :
              activeSubTab === 'security_compliance' ? securityChecklistText :
              activeSubTab === 'dev_roadmap' ? devRoadmapText :
              enterpriseSaaSText;
            handleCopy(textToCopy, activeSubTab);
          }}
          className="absolute top-4 right-4 z-10 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
        >
          {copiedKey === activeSubTab ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              Copied to Clipboard!
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copy Code Block
            </>
          )}
        </button>

        {activeSubTab === 'folder_structure' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Folder className="h-4 w-4 text-sky-400" />
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Comprehensive Monorepo File Layout</span>
            </div>
            <p className="text-xs text-slate-400">
              The structure uses a monorepo setup containing FastAPI backend service endpoints, an enterprise Next.js portal, and ready-to-run Kubernetes Helm/deployment specifications.
            </p>
            <pre className="text-xs font-mono text-emerald-400 bg-slate-950/60 p-4 rounded-xl border border-slate-800/60 overflow-x-auto whitespace-pre leading-relaxed">
              {folderStructureText}
            </pre>
          </div>
        )}

        {activeSubTab === 'database_schema' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-rose-400" />
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">PostgreSQL + Row-Level Security DDL</span>
            </div>
            <p className="text-xs text-slate-400">
              This schema incorporates PostgreSQL Row Level Security (RLS) policies to ensure rigorous logical data isolation within shared database tables under global HIPAA and SOC2 regulations.
            </p>
            <pre className="text-xs font-mono text-indigo-300 bg-slate-950/60 p-4 rounded-xl border border-slate-800/60 overflow-x-auto whitespace-pre leading-relaxed max-h-[500px]">
              {databaseSchemaText}
            </pre>
          </div>
        )}

        {activeSubTab === 'api_docs' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Code className="h-4 w-4 text-yellow-400" />
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Enterprise OpenAPI Specification (REST API)</span>
            </div>
            <p className="text-xs text-slate-400">
              Standardized HTTP payloads with built-in multi-tenant headers context routing for barcode identification and immediate point-of-sale updates.
            </p>
            <pre className="text-xs font-mono text-yellow-200 bg-slate-950/60 p-4 rounded-xl border border-slate-800/60 overflow-x-auto whitespace-pre leading-relaxed max-h-[500px]">
              {apiDocsText}
            </pre>
          </div>
        )}

        {activeSubTab === 'docker_k8s' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Cloud className="h-4 w-4 text-sky-400" />
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Docker Multi-Stage &amp; K8s Autoscale Manifests</span>
            </div>
            <p className="text-xs text-slate-400">
              Production configuration including slim multi-stage image packing and Kubernetes HPA specifications ensuring high availability under varying clinical checkout demands.
            </p>
            <pre className="text-xs font-mono text-sky-300 bg-slate-950/60 p-4 rounded-xl border border-slate-800/60 overflow-x-auto whitespace-pre leading-relaxed max-h-[500px]">
              {dockerK8sText}
            </pre>
          </div>
        )}

        {activeSubTab === 'security_compliance' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">HIPAA and SOC2 SaaS Compliance Matrix</span>
            </div>
            <p className="text-xs text-slate-400">
              Rigorous data encryption, ledger logging trails, and secure signature workflows matching the strict guidelines of pharmaceutical handling and patient privacy standards.
            </p>
            <div className="bg-slate-950/60 p-5 rounded-xl border border-slate-800/60 text-slate-300 text-xs leading-relaxed font-sans max-h-[500px] overflow-y-auto space-y-4">
              <div className="text-rose-400 font-bold border-b border-slate-800 pb-1 flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5" /> Security Controls
              </div>
              <div className="whitespace-pre-line text-slate-300 font-sans">
                {securityChecklistText}
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'dev_roadmap' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-purple-400" />
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Chronological Development Roadmap Phases</span>
            </div>
            <p className="text-xs text-slate-400">
              Phased transition sequence demonstrating clear, progressive expansion from a single-pharmacy offline-first product up to a highly scalable multi-region distributed cluster.
            </p>
            <div className="bg-slate-950/60 p-5 rounded-xl border border-slate-800/60 text-slate-300 text-xs leading-relaxed font-sans max-h-[500px] overflow-y-auto">
              <div className="text-indigo-400 font-bold border-b border-slate-800 pb-1 flex items-center gap-1.5 mb-3">
                <ListChecks className="h-4 w-4" /> Milestones &amp; Cycles
              </div>
              <div className="whitespace-pre-line text-slate-300 font-sans">
                {devRoadmapText}
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'enterprise_saas' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-sky-400" />
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Multi-Tenant v2 SaaS Architecture Portfolio</span>
            </div>
            <p className="text-xs text-slate-400">
              Complete architectural designs, database enhancements, routing configurations, and access matrices addressing the 10 core points of enterprise SaaS scalability.
            </p>
            <div className="bg-slate-950/60 p-5 rounded-xl border border-slate-800/60 text-slate-300 text-xs leading-relaxed font-sans max-h-[500px] overflow-y-auto">
              <div className="text-sky-400 font-bold border-b border-slate-800 pb-1 flex items-center gap-1.5 mb-3">
                <Settings className="h-4 w-4 text-sky-400" /> SaaS v2 Enhancements Ledger
              </div>
              <div className="whitespace-pre-line text-slate-300 font-sans leading-relaxed">
                {enterpriseSaaSText}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Highlights / Technical summary footer inside spec */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-800">
        <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/80 flex items-start gap-2.5">
          <Cpu className="h-5 w-5 text-indigo-400 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-xs font-bold text-slate-200">Shared DB, Row Isolation</h4>
            <p className="text-[11px] text-slate-500 mt-0.5 font-medium">Allows maximum cost-effective performance while enforcing cryptographic row separation policies.</p>
          </div>
        </div>

        <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/80 flex items-start gap-2.5">
          <Radio className="h-5 w-5 text-sky-400 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-xs font-bold text-slate-200">EPCS Prescription Validation</h4>
            <p className="text-[11px] text-slate-500 mt-0.5 font-medium">Guarantees digital verification matching FDA standards, avoiding regulatory penalties.</p>
          </div>
        </div>

        <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/80 flex items-start gap-2.5">
          <Lock className="h-5 w-5 text-rose-400 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-xs font-bold text-slate-200">HIPAA Audit Logs Included</h4>
            <p className="text-[11px] text-slate-500 mt-0.5 font-medium">Every action triggers automated metadata logging with secure storage on AWS S3 / Glacier.</p>
          </div>
        </div>
      </div>

    </div>
  );
}
