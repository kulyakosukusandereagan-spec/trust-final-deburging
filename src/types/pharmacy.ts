export type Currency = 'USD' | 'SSP';

export type DrugCategory = 
  | 'Antibiotics'
  | 'Antimalarials'
  | 'Analgesics & Antipyretics'
  | 'Cardiovascular'
  | 'Gastrointestinal'
  | 'Respiratory'
  | 'Diabetes & Endocrine'
  | 'Vitamins & Supplements'
  | 'Topical & Dermatological'
  | 'Injections & IV Fluids'
  | 'Pediatric Care';

export type DrugForm = 
  | 'Tablets'
  | 'Capsules'
  | 'Syrup'
  | 'Suspension'
  | 'Injection'
  | 'IV Infusion'
  | 'Ointment / Cream'
  | 'Inhaler'
  | 'Eye / Ear Drops';

export interface BatchInfo {
  batchNo: string;
  expiryDate: string; // YYYY-MM-DD
  quantity: number;
  costPriceUSD: number;
  sellingPriceUSD: number;
  supplierName: string;
}

export interface DrugItem {
  id: string;
  brandName: string;
  genericName: string;
  category: DrugCategory;
  form: DrugForm;
  strength: string; // e.g. "500mg", "80/480mg", "100ml"
  priceUSD: number;
  priceSSP: number;
  totalStock: number;
  unit: string; // e.g. "Box of 100", "Bottle", "Vial", "Strip of 10"
  reorderLevel: number;
  barcode: string;
  requiresPrescription: boolean;
  batches: BatchInfo[];
  manufacturer: string;
  storageConditions: string;
  sideEffects?: string[];
  contraindications?: string[];
  description: string;
}

export interface CartItem {
  drug: DrugItem;
  quantity: number;
  selectedBatchNo: string;
  discountPercentage: number;
  notes?: string;
}

export interface Patient {
  id: string;
  patientCode: string; // e.g. "PAT-2026-089"
  name: string;
  phone: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  bloodGroup?: string;
  allergies: string[];
  chronicConditions: string[];
  medicationHistory: string[];
  notes?: string;
  createdDate: string;
}

export interface PrescribedMedication {
  drugName: string;
  dosage: string; // e.g. "1 tab 3x daily"
  duration: string; // e.g. "7 days"
  quantityRequested: number;
  refillsAllowed: number;
  status: 'Pending' | 'Dispensed' | 'Substituted' | 'Rejected';
  notes?: string;
}

export interface Prescription {
  id: string;
  prescriptionNo: string;
  patientName: string;
  patientPhone?: string;
  doctorName: string;
  doctorLicenseNo?: string;
  clinicOrHospital: string;
  datePrescribed: string;
  medications: PrescribedMedication[];
  status: 'Pending' | 'Verifying' | 'Dispensed' | 'Cancelled';
  scannedImageUrl?: string;
  aiVerificationNotes?: string;
  interactionAlerts?: string[];
}

export type PaymentMethod = 'cash_ssp' | 'cash_usd' | 'mgurush' | 'bank_transfer' | 'insurance';

export interface SaleRecord {
  id: string;
  receiptNo: string;
  timestamp: string;
  customerName: string;
  patientId?: string;
  items: {
    drugId: string;
    brandName: string;
    genericName: string;
    batchNo: string;
    unitPriceUSD?: number;
    unitPriceSSP?: number;
    priceUSD?: number;
    priceSSP?: number;
    quantity: number;
    subtotalUSD?: number;
    subtotalSSP?: number;
  }[];
  subtotalUSD?: number;
  discountUSD?: number;
  totalUSD: number;
  totalSSP: number;
  exchangeRateUsed: number;
  exchangeRate?: number;
  paymentMethod: PaymentMethod;
  cashierName?: string;
  cashierRole?: string;
  branchName: string;
  prescribingDoctor?: string;
  doctorName?: string;
  prescriptionNo?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  location: string;
  address?: string;
  country?: string;
  leadTimeDays: number;
  rating: number;
  activeContracts?: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierName: string;
  orderDate: string;
  expectedDelivery: string;
  status: 'Draft' | 'Sent' | 'Received' | 'Cancelled';
  items: {
    drugName: string;
    quantity: number;
    estimatedCostUSD: number;
  }[];
  totalCostUSD: number;
}

export interface PharmacyBranch {
  id: string;
  name: string;
  code: string;
  city: string;
  address: string;
  phone: string;
  isMain: boolean;
  location?: string;
  managerName?: string;
}

export type BranchInfo = PharmacyBranch;

export type UserRole = 'Chief Pharmacist' | 'Dispensing Technician' | 'Inventory Manager' | 'Branch Admin';

