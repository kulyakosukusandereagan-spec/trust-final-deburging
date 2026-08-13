/**
 * JUBU PHARMA CARE - Core SaaS System Types
 */

export interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string;
  isActive: boolean;
  registeredAt: string;
}

export interface Staff {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  isActive: boolean;
  isVerified?: boolean; // Verified by Administrator
  registeredByRole?: string;
  branchId?: string; // Assigned branch ID
  password?: string; // Encrypted or plain initial password
  deletedAt?: string;
}

export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  status: 'active' | 'suspended' | 'pending' | 'trial_expired';
  plan: 'starter' | 'professional' | 'enterprise';
  billingCycle: 'monthly' | 'annual';
  registeredAt: string;
  dbIsolationMode: 'shared_schema_tenant_id' | 'schema_per_tenant' | 'database_per_tenant';
  brandingColor: string;
  logoIcon?: 'cross' | 'capsule' | 'heart' | 'shield' | 'activity' | string;
  address: string;
  phone: string;
  activePharmacies?: number;
  maxPharmacies?: number;
  activeUsers?: number;
  maxUsers?: number;
  apiRequestsToday?: number;
  storageMB?: number;
  monthlyRevenue?: number;
  cashPaymentAwaitingApproval?: boolean;
  cashAmountPaid?: number;
  branches?: Branch[];
  staff?: Staff[];
  
  // Custom single-tenant pharmacy settings fields:
  email?: string;
  telephone?: string;
  website?: string;
  taxNumber?: string;
  currency?: string;
  receiptHeader?: string;
  receiptFooter?: string;
  businessRegNo?: string;
  logoUrl?: string;
  usdToSspRate?: number;
}

export type StaffRole = 'Administrator' | 'Pharmacist' | 'Pharmacy Admin' | 'Store Manager' | 'Cashier' | 'Super Admin' | 'Master Admin';

export interface User {
  id: string;
  tenantId: string | 'system'; // 'system' means Super Admin
  name: string;
  email: string;
  role: StaffRole;
  isActive: boolean;
}

export const MASTER_DRUG_CATEGORIES = [
  'All',
  'Antibiotics',
  'Analgesics (Pain Relievers)',
  'Antimalarials',
  'Antihypertensives',
  'Antidiabetics',
  'Antifungals',
  'Antivirals',
  'Antihistamines',
  'Gastrointestinal Drugs',
  'Vitamins and Supplements',
  'Vaccines and Immunological Agents',
  'Hormonal Drugs',
  'Respiratory Drugs',
  'Dermatological Drugs',
  'Ophthalmic Drugs (Eye Medications)',
  'Cardiovascular Drugs',
  'Central Nervous System (CNS) Drugs',
  'Intravenous Fluids and Electrolytes',
  'Contraceptives and Reproductive Health Drugs',
  'Controlled Drugs and Narcotics (Controlled Substances)'
];

export interface DrugItem {
  id: string;
  tenantId: string;
  name: string;
  genericName: string;
  sku: string;
  category: 
    | 'Antibiotics'
    | 'Analgesics (Pain Relievers)'
    | 'Antimalarials'
    | 'Antihypertensives'
    | 'Antidiabetics'
    | 'Antifungals'
    | 'Antivirals'
    | 'Antihistamines'
    | 'Gastrointestinal Drugs'
    | 'Vitamins and Supplements'
    | 'Vaccines and Immunological Agents'
    | 'Hormonal Drugs'
    | 'Respiratory Drugs'
    | 'Dermatological Drugs'
    | 'Ophthalmic Drugs (Eye Medications)'
    | 'Cardiovascular Drugs'
    | 'Central Nervous System (CNS) Drugs'
    | 'Intravenous Fluids and Electrolytes'
    | 'Contraceptives and Reproductive Health Drugs'
    | 'Controlled Drugs and Narcotics (Controlled Substances)'
    | string;
  stock: number;
  minStockAlert: number;
  price: number;
  cost: number;
  expiryDate: string;
  shelfLocation: string;
  requiresPrescription: boolean;
}

export interface Prescription {
  id: string;
  rxNumber?: string;
  tenantId?: string;
  patientName?: string;
  doctorName?: string;
  doctorLicense?: string;
  drugName?: string;
  dosage?: string;
  quantity?: number;
  status?: 'pending' | 'approved' | 'rejected' | string;
  pharmacistNotes?: string;
  createdAt?: string;
  items?: any[];
  totalCost?: number;
  copayAmount?: number;
  insuranceCoveredAmount?: number;
  [key: string]: any;
}

export interface Transaction {
  id: string;
  tenantId?: string;
  invoiceNumber?: string;
  receiptNumber?: string;
  items?: Array<{
    drugId?: string;
    name?: string;
    quantity?: number;
    price?: number;
    [key: string]: any;
  }>;
  subtotal?: number;
  tax?: number;
  discount?: number;
  total?: number;
  paymentMethod?: 'cash' | 'card' | 'insurance' | 'digital_wallet' | string;
  insuranceProvider?: string;
  cashierName?: string;
  createdAt?: string;
  [key: string]: any;
}

export interface SaaSMetrics {
  totalTenants: number;
  activeTenants: number;
  monthlyRecurringRevenue: number;
  annualRecurringRevenue: number;
  averageUptime: number;
  databaseSizeGB: number;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: string;
}

export interface NotificationEvent {
  id: string;
  tenantId: string;
  type: 'low_stock' | 'expiry' | 'subscription' | 'payment' | 'broadcast';
  title: string;
  message: string;
  channels: {
    email: boolean;
    push: boolean;
    inApp: boolean;
  };
  deliveryStatus: {
    email: 'sent' | 'failed' | 'not_configured' | 'skipped';
    push: 'sent' | 'failed' | 'not_configured' | 'skipped';
    inApp: 'sent' | 'failed' | 'not_configured' | 'skipped';
  };
  metadata?: any;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationSettings {
  tenantId: string;
  enabledTypes: {
    low_stock: boolean;
    expiry: boolean;
    subscription: boolean;
    payment: boolean;
    broadcast: boolean;
  };
  channels: {
    email: { enabled: boolean; recipient: string };
    push: { enabled: boolean; endpoint: string };
    inApp: { enabled: boolean };
  };
  templates: {
    low_stock: { title: string; body: string };
    expiry: { title: string; body: string };
    subscription: { title: string; body: string };
    payment: { title: string; body: string };
    broadcast: { title: string; body: string };
  };
}

export interface DrugBatch {
  id: string;
  tenantId?: string;
  drugId?: string;
  name?: string;
  genericName?: string;
  sku?: string;
  category?: string;
  batchNumber?: string;
  storeId?: string;
  storeName?: string;
  quantity?: number;
  minStockAlert?: number;
  price?: number;
  cost?: number;
  expiryDate?: string;
  shelfLocation?: string;
  requiresPrescription?: boolean;
  strength?: string;
  dosageForm?: string;
  manufacturer?: string;
  productImage?: string;
  supplierName?: string;
  isSynced?: boolean;
  [key: string]: any;
}

export type Medication = DrugBatch;
export type POSTransaction = Transaction;
export type DrugCategory = string;
export type ControlledSchedule = string;
export type DrugForm = string;
export type RxStatus = 'pending' | 'approved' | 'rejected' | string;

export interface Patient {
  id: string;
  name?: string;
  fullName?: string;
  age?: number;
  gender?: string;
  phone?: string;
  allergies?: string[];
  [key: string]: any;
}

export interface ControlledLogEntry {
  id: string;
  drugName?: string;
  schedule?: string;
  quantity?: number;
  date?: string;
  timestamp?: string;
  dispensedBy?: string;
  [key: string]: any;
}

export interface POSCartItem {
  id: string;
  batchId?: string;
  name?: string;
  quantity?: number;
  unitPrice?: number;
  totalPrice?: number;
  type?: string;
  [key: string]: any;
}

export interface Supplier {
  id: string;
  name?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  [key: string]: any;
}

export interface PurchaseOrder {
  id: string;
  poNumber?: string;
  supplierId?: string;
  items?: any[];
  totalAmount?: number;
  status?: string;
  createdAt?: string;
  [key: string]: any;
}

