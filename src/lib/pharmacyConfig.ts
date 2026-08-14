// ============================================================================
// SINGLE-TENANT PHARMACY CONFIGURATION
// ----------------------------------------------------------------------------
// This app was converted from a multi-tenant/SaaS product into a dedicated,
// single-pharmacy deployment. There is exactly ONE pharmacy and a FIXED list
// of at most 3 branches. Nothing in this app should ever create a second
// pharmacy or a 4th branch — see `isBranchCreationAllowed` below.
// ============================================================================

import { collection, doc, CollectionReference, DocumentReference } from 'firebase/firestore';
import { db } from './firebase';

/** Slug used as the Firestore document id for this pharmacy. */
export const PHARMACY_ID = 'trust-pharmacy';

/** Human-readable pharmacy name (shown in the UI). */
export const PHARMACY_NAME = 'TRUST PHARMACY';

export interface FixedBranch {
  id: string;
  name: string;
  isMain: boolean;
}

/**
 * The ONLY branches this deployment may ever have. Hard-capped at 3.
 * Do not add a 4th entry here — see rule enforcement in
 * `isBranchCreationAllowed` and `BranchesStaffManager.tsx`.
 */
export const FIXED_BRANCHES: readonly FixedBranch[] = [
  { id: 'main-branch', name: 'TRUST PHARMACY MAIN BRANCH', isMain: true },
  { id: 'wau-branch', name: 'TRUST PHARMACY WAU BRANCH', isMain: false },
  { id: 'juba-branch', name: 'TRUST PHARMACY JUBA BRANCH', isMain: false },
] as const;

export const MAX_BRANCHES = 3;

export const isValidBranchId = (branchId: string): boolean =>
  FIXED_BRANCHES.some((b) => b.id === branchId);

/**
 * Enforces rule: "Block creation of branch-4". Call this before any branch
 * create operation anywhere in the app (UI and data-layer both check this).
 */
export function isBranchCreationAllowed(existingBranchCount: number): boolean {
  return existingBranchCount < MAX_BRANCHES;
}

// ----------------------------------------------------------------------------
// Firestore path helpers
// New schema (per spec): /pharmacy/{pharmacyId}/branches/{branchId}/products
// All other branch-scoped collections follow the same nesting convention so
// the whole data model stays consistent under the single pharmacy document.
// ----------------------------------------------------------------------------

export const pharmacyDocRef = (): DocumentReference => doc(db, 'pharmacy', PHARMACY_ID);

export const branchDocRef = (branchId: string): DocumentReference =>
  doc(db, 'pharmacy', PHARMACY_ID, 'branches', branchId);

export const branchesCollectionRef = (): CollectionReference =>
  collection(db, 'pharmacy', PHARMACY_ID, 'branches');

/** /pharmacy/{pharmacyId}/branches/{branchId}/products — required exact path */
export const productsCollectionRef = (branchId: string): CollectionReference =>
  collection(db, 'pharmacy', PHARMACY_ID, 'branches', branchId, 'products');

export const productDocRef = (branchId: string, productId: string): DocumentReference =>
  doc(db, 'pharmacy', PHARMACY_ID, 'branches', branchId, 'products', productId);

export const salesCollectionRef = (branchId: string): CollectionReference =>
  collection(db, 'pharmacy', PHARMACY_ID, 'branches', branchId, 'sales');

export const saleDocRef = (branchId: string, saleId: string): DocumentReference =>
  doc(db, 'pharmacy', PHARMACY_ID, 'branches', branchId, 'sales', saleId);

export const staffCollectionRef = (branchId: string): CollectionReference =>
  collection(db, 'pharmacy', PHARMACY_ID, 'branches', branchId, 'staff');

export const staffDocRef = (branchId: string, staffId: string): DocumentReference =>
  doc(db, 'pharmacy', PHARMACY_ID, 'branches', branchId, 'staff', staffId);

export const prescriptionsCollectionRef = (branchId: string): CollectionReference =>
  collection(db, 'pharmacy', PHARMACY_ID, 'branches', branchId, 'prescriptions');

export const patientsCollectionRef = (branchId: string): CollectionReference =>
  collection(db, 'pharmacy', PHARMACY_ID, 'branches', branchId, 'patients');

export const batchesCollectionRef = (branchId: string): CollectionReference =>
  collection(db, 'pharmacy', PHARMACY_ID, 'branches', branchId, 'batches');

export const stockMovementsCollectionRef = (branchId: string): CollectionReference =>
  collection(db, 'pharmacy', PHARMACY_ID, 'branches', branchId, 'stock_movements');

export const expendituresCollectionRef = (branchId: string): CollectionReference =>
  collection(db, 'pharmacy', PHARMACY_ID, 'branches', branchId, 'expenditures');

export const auditLogsCollectionRef = (branchId: string): CollectionReference =>
  collection(db, 'pharmacy', PHARMACY_ID, 'branches', branchId, 'audit_logs');

/** Pharmacy-wide (not branch-scoped) users collection, e.g. auth -> role mapping. */
export const usersCollectionRef = (): CollectionReference =>
  collection(db, 'pharmacy', PHARMACY_ID, 'users');

export const userDocRef = (uid: string): DocumentReference =>
  doc(db, 'pharmacy', PHARMACY_ID, 'users', uid);
