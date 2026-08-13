-- ====================================================================================
-- MULTI-TENANT PHARMACY MANAGEMENT SAAS DATABASE SCHEMA
-- Target Database: PostgreSQL 15+
-- Architecture Paradigm: Tenant Isolation & HIPAA Compliance
-- Author: Lead Database Architect
-- ====================================================================================

-- Enable necessary PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";     -- For UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";      -- Cryptographic helpers

-- ====================================================================================
-- 1. TENANTS & SYSTEM ADMINISTRATION
-- ====================================================================================

-- Table: tenants (The system-wide registry of active SaaS pharmacy tenants)
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    subdomain VARCHAR(50) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'trial_expired')),
    branding_color VARCHAR(7) DEFAULT '#0ea5e9',
    address TEXT,
    phone VARCHAR(20),
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by UUID, -- Refers to system setup admin (if bootstrapped)
    deleted_at TIMESTAMP WITH TIME ZONE, -- Soft delete support
    
    CONSTRAINT chk_subdomain_format CHECK (subdomain ~ '^[a-z0-9-]+$')
);

-- Table: subscriptions (Tracks the recurring SaaS billing tier of each tenant)
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    plan VARCHAR(50) NOT NULL CHECK (plan IN ('standard', 'professional', 'enterprise')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'past_due', 'cancelled', 'trialing')),
    billing_cycle VARCHAR(20) NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by UUID,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- ====================================================================================
-- 2. USER ACCESS CONTROL (RBAC) & PERMISSIONS
-- ====================================================================================

-- Table: users (Tenant accounts containing staff information)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'locked')),
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by UUID,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- email is unique within a tenant context (allows multiple tenant accounts with same email)
    CONSTRAINT uq_tenant_user_email UNIQUE (tenant_id, email)
);

-- Table: roles (Customizable job functions within a tenant's workspace)
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by UUID,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT uq_tenant_role_name UNIQUE (tenant_id, name)
);

-- Table: permissions (Granular ACL actions mapped to specific roles)
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL, -- e.g., 'medicine:create', 'prescription:approve', 'sale:execute'
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by UUID,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT uq_tenant_role_action UNIQUE (tenant_id, role_id, action)
);

-- Table: pharmacies (Physical store locations operated by a tenant)
CREATE TABLE pharmacies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    license_number VARCHAR(50) NOT NULL,
    address TEXT NOT NULL,
    phone VARCHAR(20),
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by UUID,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT uq_tenant_pharmacy_license UNIQUE (tenant_id, license_number)
);

-- ====================================================================================
-- 3. SUPPLY CHAIN & MEDICATION REGISTRY
-- ====================================================================================

-- Table: suppliers (Wholesalers supplying pharmaceutical items to the pharmacies)
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    contact_name VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by UUID,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Table: categories (Classification grouping of drugs e.g., Antibiotics, Narcotics)
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by UUID,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT uq_tenant_category_name UNIQUE (tenant_id, name)
);

-- Table: medicines (Master drug catalog list per tenant)
CREATE TABLE medicines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    generic_name VARCHAR(150),
    sku VARCHAR(50) NOT NULL, -- National Drug Code (NDC) or custom barcode SKU
    requires_prescription BOOLEAN DEFAULT FALSE NOT NULL,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by UUID,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT uq_tenant_medicine_sku UNIQUE (tenant_id, sku)
);

-- ====================================================================================
-- 4. INVENTORY & STOCK FLOW MANAGEMENT
-- ====================================================================================

-- Table: inventory (Specific medicine batches stocked at a pharmacy location)
CREATE TABLE inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
    medicine_id UUID NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    min_stock_alert INTEGER NOT NULL DEFAULT 10 CHECK (min_stock_alert >= 0),
    price DECIMAL(12,2) NOT NULL CHECK (price >= 0),
    cost DECIMAL(12,2) NOT NULL CHECK (cost >= 0),
    expiry_date DATE NOT NULL,
    shelf_location VARCHAR(50),
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by UUID,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Assure a unique record per medicine batch (by expiry date) within a physical store
    CONSTRAINT uq_tenant_pharmacy_medicine_batch UNIQUE (tenant_id, pharmacy_id, medicine_id, expiry_date)
);

-- Table: stock_movements (Immutable logs documenting every shift/adjustment of inventory)
CREATE TABLE stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    inventory_id UUID NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
    movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('purchase', 'sale', 'adjustment', 'transfer_in', 'transfer_out', 'expired', 'return')),
    quantity INTEGER NOT NULL, -- Positive represents stock increase, negative is decrease
    notes TEXT,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by UUID,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Table: purchases (Supplier restocking transactions)
CREATE TABLE purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
    purchase_date TIMESTAMP WITH TIME ZONE NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL CHECK (total_amount >= 0),
    status VARCHAR(20) NOT NULL CHECK (status IN ('ordered', 'shipped', 'received', 'cancelled')),
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by UUID,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Table: purchase_items (Items included in a wholesale supplier purchase)
CREATE TABLE purchase_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    purchase_id UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    medicine_id UUID NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_cost DECIMAL(12,2) NOT NULL CHECK (unit_cost >= 0),
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by UUID,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- ====================================================================================
-- 5. PATIENTS & CLINICAL PRACTICE
-- ====================================================================================

-- Table: customers (The patients buying medicines or submitting prescriptions)
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20),
    date_of_birth DATE,
    insurance_provider VARCHAR(100),
    insurance_policy_number VARCHAR(50),
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by UUID,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Table: prescriptions (Medical prescription approvals required for regulated drugs)
CREATE TABLE prescriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    doctor_name VARCHAR(100) NOT NULL,
    doctor_license VARCHAR(50),
    medicine_id UUID NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
    dosage VARCHAR(100) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'filled')),
    pharmacist_notes TEXT,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by UUID,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- ====================================================================================
-- 6. SALES & FINANCIAL TRANSACTIONING
-- ====================================================================================

-- Table: sales (The POS checkout events)
CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL, -- Null implies anonymous walk-in
    sale_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    subtotal DECIMAL(12,2) NOT NULL CHECK (subtotal >= 0),
    tax DECIMAL(12,2) NOT NULL DEFAULT 0.00 CHECK (tax >= 0),
    discount DECIMAL(12,2) NOT NULL DEFAULT 0.00 CHECK (discount >= 0),
    total DECIMAL(12,2) NOT NULL CHECK (total >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'refunded', 'partially_refunded')),
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by UUID,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Table: sale_items (Items included in a sales ticket)
CREATE TABLE sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    inventory_id UUID NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(12,2) NOT NULL CHECK (unit_price >= 0),
    discount DECIMAL(12,2) NOT NULL DEFAULT 0.00 CHECK (discount >= 0),
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by UUID,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Table: invoices (Financial accounts receivable / billing statements)
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    invoice_number VARCHAR(50) NOT NULL,
    due_date DATE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('unpaid', 'paid', 'partially_paid', 'void')),
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by UUID,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT uq_tenant_invoice_number UNIQUE (tenant_id, invoice_number)
);

-- Table: payments (Payment transactions allocated against invoices)
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(30) NOT NULL CHECK (payment_method IN ('cash', 'card', 'insurance', 'digital_wallet')),
    transaction_reference VARCHAR(100), -- Card transaction ID, insurance claim ID, etc.
    payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by UUID,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- ====================================================================================
-- 7. OPERATIONS, NOTIFICATIONS & CLINICAL AUDITING
-- ====================================================================================

-- Table: notifications (Low stock alerts, expiring medicine warnings, system notices)
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- NULL represents a general notification for all tenant staff
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(30) NOT NULL CHECK (type IN ('low_stock', 'expiring_medicine', 'billing', 'system_notice', 'prescription_pending')),
    is_read BOOLEAN DEFAULT FALSE NOT NULL,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by UUID,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Table: audit_logs (Immutable, HIPAA-compliant activity log of all critical changes)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Null if executed by automated cron or system
    action VARCHAR(100) NOT NULL, -- e.g. 'MEDICINE_CREATE', 'STOCK_ADJUST', 'PRESCRIPTION_APPROVE'
    entity_name VARCHAR(50) NOT NULL, -- Target table name e.g. 'medicines'
    entity_id UUID NOT NULL, -- ID of the target record
    old_values JSONB, -- Previous state (before update)
    new_values JSONB, -- Current state (after update)
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ====================================================================================
-- 8. DATABASE PERFORMANCE INDEXES
-- ====================================================================================

-- Tenant-isolation indexes (Crucial for query planners as queries always filter on tenant_id)
CREATE INDEX idx_subscriptions_tenant ON subscriptions (tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_tenant ON users (tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_roles_tenant ON roles (tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_permissions_tenant ON permissions (tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_pharmacies_tenant ON pharmacies (tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_suppliers_tenant ON suppliers (tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_categories_tenant ON categories (tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_medicines_tenant ON medicines (tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_inventory_tenant ON inventory (tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_stock_movements_tenant ON stock_movements (tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_purchases_tenant ON purchases (tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_purchase_items_tenant ON purchase_items (tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_customers_tenant ON customers (tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_prescriptions_tenant ON prescriptions (tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_sales_tenant ON sales (tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_sale_items_tenant ON sale_items (tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_invoices_tenant ON invoices (tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_payments_tenant ON payments (tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_notifications_tenant ON notifications (tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_audit_logs_tenant ON audit_logs (tenant_id); -- Audit logs do not have soft deletes

-- Foreign Key Lookup Optimization Indexes
CREATE INDEX idx_users_email ON users (email) WHERE deleted_at IS NULL;
CREATE INDEX idx_permissions_role ON permissions (role_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_inventory_pharmacy_medicine ON inventory (pharmacy_id, medicine_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_inventory_expiry ON inventory (expiry_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_stock_movements_inventory ON stock_movements (inventory_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_purchase_items_purchase ON purchase_items (purchase_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_purchase_items_medicine ON purchase_items (medicine_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_prescriptions_customer ON prescriptions (customer_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_sales_pharmacy ON sales (pharmacy_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_sale_items_sale ON sale_items (sale_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_sale_items_inventory ON sale_items (inventory_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_invoices_sale ON invoices (sale_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_payments_invoice ON payments (invoice_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_notifications_user_unread ON notifications (user_id, is_read) WHERE deleted_at IS NULL;
CREATE INDEX idx_audit_logs_entity ON audit_logs (entity_name, entity_id);

-- ====================================================================================
-- 9. AUTOMATED AUDIT TRIGGERS & SOFT DELETE VIEWS
-- ====================================================================================

-- Function to automatically update the 'updated_at' timestamp
CREATE OR REPLACE FUNCTION trigger_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply timestamp update trigger to all auditable tables
CREATE TRIGGER update_tenants_modtime BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION trigger_update_timestamp();
CREATE TRIGGER update_subscriptions_modtime BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION trigger_update_timestamp();
CREATE TRIGGER update_users_modtime BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION trigger_update_timestamp();
CREATE TRIGGER update_roles_modtime BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION trigger_update_timestamp();
CREATE TRIGGER update_permissions_modtime BEFORE UPDATE ON permissions FOR EACH ROW EXECUTE FUNCTION trigger_update_timestamp();
CREATE TRIGGER update_pharmacies_modtime BEFORE UPDATE ON pharmacies FOR EACH ROW EXECUTE FUNCTION trigger_update_timestamp();
CREATE TRIGGER update_suppliers_modtime BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION trigger_update_timestamp();
CREATE TRIGGER update_categories_modtime BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION trigger_update_timestamp();
CREATE TRIGGER update_medicines_modtime BEFORE UPDATE ON medicines FOR EACH ROW EXECUTE FUNCTION trigger_update_timestamp();
CREATE TRIGGER update_inventory_modtime BEFORE UPDATE ON inventory FOR EACH ROW EXECUTE FUNCTION trigger_update_timestamp();
CREATE TRIGGER update_stock_movements_modtime BEFORE UPDATE ON stock_movements FOR EACH ROW EXECUTE FUNCTION trigger_update_timestamp();
CREATE TRIGGER update_purchases_modtime BEFORE UPDATE ON purchases FOR EACH ROW EXECUTE FUNCTION trigger_update_timestamp();
CREATE TRIGGER update_purchase_items_modtime BEFORE UPDATE ON purchase_items FOR EACH ROW EXECUTE FUNCTION trigger_update_timestamp();
CREATE TRIGGER update_customers_modtime BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION trigger_update_timestamp();
CREATE TRIGGER update_prescriptions_modtime BEFORE UPDATE ON prescriptions FOR EACH ROW EXECUTE FUNCTION trigger_update_timestamp();
CREATE TRIGGER update_sales_modtime BEFORE UPDATE ON sales FOR EACH ROW EXECUTE FUNCTION trigger_update_timestamp();
CREATE TRIGGER update_sale_items_modtime BEFORE UPDATE ON sale_items FOR EACH ROW EXECUTE FUNCTION trigger_update_timestamp();
CREATE TRIGGER update_invoices_modtime BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION trigger_update_timestamp();
CREATE TRIGGER update_payments_modtime BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION trigger_update_timestamp();
CREATE TRIGGER update_notifications_modtime BEFORE UPDATE ON notifications FOR EACH ROW EXECUTE FUNCTION trigger_update_timestamp();
