import { DrugItem, Patient, Prescription, SaleRecord, Supplier, PurchaseOrder, PharmacyBranch } from '../types/pharmacy';

export const DEFAULT_EXCHANGE_RATE = 2850; // 1 USD = 2,850 SSP

export const MOCK_BRANCHES: PharmacyBranch[] = [
  { id: 'b1', name: 'Royal Trust Pharmacy - Main Branch', code: 'MAIN-01', city: 'Juba', address: 'Airport Road, Juba Town, South Sudan', phone: '+211 922 152 427', isMain: true }
];

export const MOCK_DRUGS: DrugItem[] = [];
export const MOCK_PATIENTS: Patient[] = [];
export const MOCK_PRESCRIPTIONS: Prescription[] = [];
export const MOCK_SALES: SaleRecord[] = [];
export const MOCK_SUPPLIERS: Supplier[] = [];
export const MOCK_PURCHASE_ORDERS: PurchaseOrder[] = [];

// Aliases for camelCase and legacy INITIAL_* imports
export const mockDrugs = MOCK_DRUGS;
export const mockPrescriptions = MOCK_PRESCRIPTIONS;
export const mockPatients = MOCK_PATIENTS;
export const mockSales = MOCK_SALES;
export const mockSuppliers = MOCK_SUPPLIERS;
export const mockPurchaseOrders = MOCK_PURCHASE_ORDERS;
export const mockBranches = MOCK_BRANCHES;

export const INITIAL_DRUGS = MOCK_DRUGS;
export const INITIAL_PATIENTS = MOCK_PATIENTS;
export const INITIAL_PRESCRIPTIONS = MOCK_PRESCRIPTIONS;
export const INITIAL_SALES = MOCK_SALES;
export const INITIAL_CONTROLLED_LOGS: any[] = [];

