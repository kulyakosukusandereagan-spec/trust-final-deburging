// ============================================================================
// FIRESTORE DATA LAYER — SINGLE-TENANT, FIXED 3-BRANCH MODEL
// ----------------------------------------------------------------------------
// Converted from the previous multi-tenant version:
//  - No more per-user-owned "tenants". There is one pharmacy (PHARMACY_ID)
//    with exactly the 3 branches in FIXED_BRANCHES.
//  - All paths nest under /pharmacy/{PHARMACY_ID}/branches/{branchId}/... —
//    e.g. products live at /pharmacy/{pharmacyId}/branches/{branchId}/products
//    per spec.
//  - Every function validates or resolves the branchId against FIXED_BRANCHES.
//  - If a caller passes tenant.id ("trust-pharmacy"), "all", or an unassigned ID:
//    - Load/Subscribe operations query across ALL 3 fixed branches.
//    - Write operations route safely to the main branch ("main-branch").
//  - No localStorage / sessionStorage anywhere in this file.
// ============================================================================

import { db } from './firebase';
import {
  doc,
  getDoc,
  getDocs,
  getDocsFromServer,
  setDoc,
  deleteDoc,
  query,
  where,
  writeBatch,
  runTransaction,
  onSnapshot,
} from 'firebase/firestore';
import { DrugItem, Prescription, Transaction } from '../types';
import {
  PHARMACY_ID,
  FIXED_BRANCHES,
  isValidBranchId,
  pharmacyDocRef,
  branchDocRef,
  branchesCollectionRef,
  batchesCollectionRef,
  stockMovementsCollectionRef,
  staffCollectionRef,
  productsCollectionRef,
  productDocRef,
  salesCollectionRef,
  expendituresCollectionRef,
} from './pharmacyConfig';

/** Safely resolves a given branchId, falling back to item payload branchId/storeId or 'main-branch' if invalid or unassigned. */
export function resolveBranchId(branchIdOrObj?: any, fallbackObj?: any): string {
  if (typeof branchIdOrObj === 'string' && isValidBranchId(branchIdOrObj)) {
    return branchIdOrObj;
  }
  const obj = (typeof branchIdOrObj === 'object' && branchIdOrObj) ? branchIdOrObj : fallbackObj;
  if (obj && typeof obj === 'object') {
    const candidate = obj.branchId || obj.storeId;
    if (candidate && isValidBranchId(candidate)) {
      return candidate;
    }
  }
  return FIXED_BRANCHES[0].id; // 'main-branch'
}

/** Non-throwing branch validator that logs a notice and returns a valid branch ID. */
function assertValidBranch(branchId: string): string {
  if (!isValidBranchId(branchId)) {
    console.warn(
      `[firebaseSync] Notice: "${branchId}" is not a direct branch ID. Routing operation to "${FIXED_BRANCHES[0].id}".`
    );
    return FIXED_BRANCHES[0].id;
  }
  return branchId;
}

/** Verify network connectivity prior to Firestore operations (app requires internet — no offline mode). */
export function checkIsOnline(isOnlineParam?: boolean): boolean {
  if (isOnlineParam === true) return true;
  if (isOnlineParam === false) {
    return typeof navigator !== 'undefined' ? navigator.onLine : false;
  }
  if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
    return navigator.onLine;
  }
  return true;
}

// ----------------------------------------------------------------------------
// Data Sanitization
// ----------------------------------------------------------------------------

/**
 * Recursively cleans objects before Firestore writes by removing any `undefined` values,
 * which Firestore strictly rejects with 'Unsupported field value: undefined'.
 */
export function cleanFirestoreData<T>(obj: T): T {
  if (obj === undefined) {
    return null as any;
  }
  if (obj === null) {
    return null as any;
  }
  if (Array.isArray(obj)) {
    return obj
      .map((item) => (item === undefined ? null : cleanFirestoreData(item))) as any;
  }
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = cleanFirestoreData(value);
      }
    }
    return cleaned;
  }
  return obj;
}

// ----------------------------------------------------------------------------
// Pharmacy / branch bootstrap
// ----------------------------------------------------------------------------

/** Ensures the single pharmacy document and its 3 fixed branch documents exist. Idempotent. */
export async function ensurePharmacyAndBranchesExist(): Promise<void> {
  await setDoc(
    pharmacyDocRef(),
    cleanFirestoreData({ id: PHARMACY_ID, name: 'TRUST PHARMACY', maxBranches: FIXED_BRANCHES.length, updatedAt: new Date().toISOString() }),
    { merge: true }
  );
  const batch = writeBatch(db);
  for (const b of FIXED_BRANCHES) {
    batch.set(branchDocRef(b.id), cleanFirestoreData({ id: b.id, name: b.name, isMain: b.isMain }), { merge: true });
  }
  await batch.commit();
}

/** Whether the pharmacy has already been bootstrapped in Firestore. */
export async function checkIfPharmacyHasData(): Promise<boolean> {
  try {
    const snap = await getDoc(pharmacyDocRef());
    return snap.exists();
  } catch (err) {
    console.error('[firebaseSync] checkIfPharmacyHasData error:', err);
    return false;
  }
}

/** Fetches the fixed branch list plus each branch's staff, used on app load. */
export async function fetchPharmacyBootstrapData() {
  try {
    const branchesWithStaff = await Promise.all(
      FIXED_BRANCHES.map(async (b) => {
        const staffSnap = await getDocsFromServer(staffCollectionRef(b.id)).catch(() => getDocs(staffCollectionRef(b.id)));
        return {
          id: b.id,
          name: b.name,
          isMain: b.isMain,
          staff: staffSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
        };
      })
    );
    return { pharmacyId: PHARMACY_ID, pharmacyName: 'TRUST PHARMACY', branches: branchesWithStaff };
  } catch (err) {
    console.error('[firebaseSync] fetchPharmacyBootstrapData error:', err);
    return { pharmacyId: PHARMACY_ID, pharmacyName: 'TRUST PHARMACY', branches: FIXED_BRANCHES.map((b) => ({ ...b, staff: [] })) };
  }
}

/** Updates a branch document in Firestore. */
export async function saveBranchToFirestore(branchId: string, branchData: any, isOnlineParam?: boolean): Promise<void> {
  const targetBranch = resolveBranchId(branchId);
  if (!checkIsOnline(isOnlineParam)) return;
  try {
    await setDoc(branchDocRef(targetBranch), cleanFirestoreData({ ...branchData, id: targetBranch }), { merge: true });
  } catch (err) {
    console.error('[firebaseSync] saveBranchToFirestore error:', err);
  }
}

/** Subscribes to all branches in real-time. */
export function subscribeToBranchesFirestore(callback: (branches: any[]) => void): () => void {
  return onSnapshot(
    branchesCollectionRef(),
    (snapshot) => {
      if (snapshot.empty) return;
      const branches = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(branches);
    },
    (err) => console.error('[firebaseSync] subscribeToBranchesFirestore error:', err)
  );
}

// ----------------------------------------------------------------------------
// Staff
// ----------------------------------------------------------------------------

export async function saveStaffAccountsToFirestore(branchId: string, staffList: any[], isOnlineParam?: boolean): Promise<void> {
  const targetBranch = resolveBranchId(branchId);
  if (!checkIsOnline(isOnlineParam)) return;
  try {
    const batch = writeBatch(db);
    staffList.forEach((member) => {
      batch.set(doc(staffCollectionRef(targetBranch), member.id), cleanFirestoreData({ ...member, branchId: targetBranch }), { merge: true });
    });
    await batch.commit();
  } catch (err) {
    console.error('[firebaseSync] saveStaffAccountsToFirestore error:', err);
  }
}

export async function saveStaffAccountToFirestore(branchIdOrStaff: string, staffMember?: any, isOnlineParam?: boolean): Promise<void> {
  const targetBranch = isValidBranchId(branchIdOrStaff) ? branchIdOrStaff : resolveBranchId(staffMember?.branchId);
  const targetStaff = isValidBranchId(branchIdOrStaff) ? staffMember : branchIdOrStaff;
  if (!targetStaff) return;
  if (!checkIsOnline(isOnlineParam)) return;
  try {
    await setDoc(doc(staffCollectionRef(targetBranch), targetStaff.id), cleanFirestoreData({ ...targetStaff, branchId: targetBranch }), { merge: true });
  } catch (err) {
    console.error('[firebaseSync] saveStaffAccountToFirestore error:', err);
  }
}

export async function deleteStaffAccountFromFirestore(branchId: string, staffId: string, staffEmail?: string): Promise<void> {
  try {
    for (const b of FIXED_BRANCHES) {
      if (staffId) {
        try {
          await deleteDoc(doc(staffCollectionRef(b.id), staffId));
        } catch (e) {}
      }
      if (staffEmail) {
        try {
          const snap = await getDocs(staffCollectionRef(b.id));
          for (const d of snap.docs) {
            const data = d.data();
            if (data?.email && data.email.toLowerCase() === staffEmail.toLowerCase()) {
              await deleteDoc(doc(staffCollectionRef(b.id), d.id));
            }
          }
        } catch (e) {}
      }
    }
  } catch (err) {
    console.error('[firebaseSync] deleteStaffAccountFromFirestore error:', err);
  }
}

export async function loadDeletedStaffFromFirestore(_branchId?: string): Promise<{ ids: string[]; emails: string[] }> {
  return { ids: [], emails: [] };
}

export async function loadStaffFromFirestore(branchId?: string): Promise<any[]> {
  try {
    if (branchId && isValidBranchId(branchId)) {
      const snap = await getDocs(staffCollectionRef(branchId));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    }
    const results = await Promise.all(FIXED_BRANCHES.map((b) => getDocs(staffCollectionRef(b.id))));
    const all = results.flatMap((snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    const uniqueMap = new Map<string, any>();
    all.forEach((s: any) => {
      const key = s.email ? s.email.toLowerCase() : s.id;
      if (key && !uniqueMap.has(key)) {
        uniqueMap.set(key, s);
      }
    });
    return Array.from(uniqueMap.values());
  } catch (err) {
    console.error('[firebaseSync] loadStaffFromFirestore error:', err);
    return [];
  }
}

export function subscribeToStaffFirestore(branchIdOrCallback: string | ((staffList: any[]) => void), maybeCallback?: (staffList: any[]) => void): () => void {
  const branchId = typeof branchIdOrCallback === 'string' ? branchIdOrCallback : undefined;
  const callback = typeof branchIdOrCallback === 'function' ? branchIdOrCallback : maybeCallback!;

  if (branchId && isValidBranchId(branchId)) {
    return onSnapshot(
      staffCollectionRef(branchId),
      (snapshot) => callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => console.error('[firebaseSync] subscribeToStaffFirestore error:', err)
    );
  }

  const perBranch = new Map<string, any[]>();
  const unsubs = FIXED_BRANCHES.map((b) =>
    onSnapshot(
      staffCollectionRef(b.id),
      (snapshot) => {
        perBranch.set(b.id, snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        const allRaw = Array.from(perBranch.values()).flat();
        const uniqueMap = new Map<string, any>();
        allRaw.forEach((s) => {
          const key = s.email ? s.email.toLowerCase() : s.id;
          if (key && !uniqueMap.has(key)) {
            uniqueMap.set(key, s);
          }
        });
        callback(Array.from(uniqueMap.values()));
      },
      (err) => console.error('[firebaseSync] subscribeToStaffFirestore error:', err)
    )
  );
  return () => unsubs.forEach((u) => u());
}

// ----------------------------------------------------------------------------
// Products / Drugs — required path: /pharmacy/{pharmacyId}/branches/{branchId}/products
// ----------------------------------------------------------------------------

export async function saveDrugToFirestore(branchId: string, drug: DrugItem, isOnlineParam?: boolean): Promise<void> {
  const targetBranch = resolveBranchId(branchId, drug);
  if (!checkIsOnline(isOnlineParam)) return;
  try {
    await setDoc(productDocRef(targetBranch, drug.id), cleanFirestoreData(drug), { merge: true });
  } catch (err) {
    console.error('[firebaseSync] saveDrugToFirestore error:', err);
  }
}

export async function loadDrugsFromFirestore(branchId?: string): Promise<DrugItem[]> {
  try {
    if (branchId && isValidBranchId(branchId)) {
      const snap = await getDocs(productsCollectionRef(branchId));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as DrugItem));
    }
    const results = await Promise.all(FIXED_BRANCHES.map((b) => getDocs(productsCollectionRef(b.id))));
    return results.flatMap((snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() } as DrugItem)));
  } catch (err) {
    console.error('[firebaseSync] loadDrugsFromFirestore error:', err);
    return [];
  }
}

// ----------------------------------------------------------------------------
// Batches
// ----------------------------------------------------------------------------

export const ALL_DEFAULT_BATCH_IDS: string[] = [];

export async function saveBatchToFirestore(branchId: string, batch: any, isOnlineParam?: boolean): Promise<void> {
  const targetBranch = resolveBranchId(branchId, batch);
  if (!checkIsOnline(isOnlineParam)) return;
  try {
    await setDoc(doc(batchesCollectionRef(targetBranch), batch.id), cleanFirestoreData(batch), { merge: true });
  } catch (err) {
    console.error('[firebaseSync] saveBatchToFirestore error:', err);
  }
}

export async function deleteBatchFromFirestore(branchId: string, batchId: string, _batchName?: string): Promise<void> {
  const targetBranch = resolveBranchId(branchId);
  try {
    await deleteDoc(doc(batchesCollectionRef(targetBranch), batchId));
  } catch (err) {
    console.error('[firebaseSync] deleteBatchFromFirestore error:', err);
  }
}

export async function saveDeletedBatchToFirestore(_branchId: string, _batchId: string, _batchName?: string): Promise<void> {
  return;
}

export async function loadDeletedBatchesFromFirestore(_branchId: string): Promise<string[]> {
  return [];
}

export async function loadBatchesFromFirestore(branchId?: string): Promise<any[]> {
  try {
    if (branchId && isValidBranchId(branchId)) {
      const snap = await getDocs(batchesCollectionRef(branchId));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    }
    const results = await Promise.all(FIXED_BRANCHES.map((b) => getDocs(batchesCollectionRef(b.id))));
    return results.flatMap((snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  } catch (err) {
    console.error('[firebaseSync] loadBatchesFromFirestore error:', err);
    return [];
  }
}

export function subscribeToBatchesFirestore(branchIdOrCallback: string | ((batches: any[]) => void), maybeCallback?: (batches: any[]) => void): () => void {
  const branchId = typeof branchIdOrCallback === 'string' ? branchIdOrCallback : undefined;
  const callback = typeof branchIdOrCallback === 'function' ? branchIdOrCallback : maybeCallback!;

  if (branchId && isValidBranchId(branchId)) {
    return onSnapshot(
      batchesCollectionRef(branchId),
      (snapshot) => callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => console.error('[firebaseSync] subscribeToBatchesFirestore error:', err)
    );
  }

  const perBranch = new Map<string, any[]>();
  const unsubs = FIXED_BRANCHES.map((b) =>
    onSnapshot(
      batchesCollectionRef(b.id),
      (snapshot) => {
        perBranch.set(b.id, snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        callback(Array.from(perBranch.values()).flat());
      },
      (err) => console.error('[firebaseSync] subscribeToBatchesFirestore error:', err)
    )
  );
  return () => unsubs.forEach((u) => u());
}

export async function saveInventoryClearedToFirestore(branchId: string, isCleared: boolean = true): Promise<void> {
  const targetBranch = resolveBranchId(branchId);
  try {
    await setDoc(branchDocRef(targetBranch), cleanFirestoreData({ inventoryCleared: isCleared }), { merge: true });
  } catch (err) {
    console.error('[firebaseSync] saveInventoryClearedToFirestore error:', err);
  }
}

export async function loadInventoryClearedFromFirestore(branchId?: string): Promise<boolean> {
  const targetBranch = resolveBranchId(branchId);
  try {
    const snap = await getDoc(branchDocRef(targetBranch));
    return !!(snap.exists() && (snap.data() as any).inventoryCleared);
  } catch (err) {
    console.error('[firebaseSync] loadInventoryClearedFromFirestore error:', err);
    return false;
  }
}

// ----------------------------------------------------------------------------
// Atomic lapsed write-off
// ----------------------------------------------------------------------------

export async function processLapsedWriteOffInFirestore(
  branchId: string,
  batchId: string,
  adjustmentQty: number,
  notes: string,
  userEmail?: string,
  isOnlineParam?: boolean,
  batchDataFallback?: any
): Promise<{ success: boolean; newQuantity: number }> {
  const targetBranch = resolveBranchId(branchId);
  if (!checkIsOnline(isOnlineParam)) {
    throw new Error('Network connection offline. Lapsed write-off submissions require an active network connection for atomic Firestore transactions.');
  }

  let finalQty = 0;
  await runTransaction(db, async (transaction) => {
    const batchRef = doc(batchesCollectionRef(targetBranch), batchId);
    const batchSnap = await transaction.get(batchRef);
    const currentData = batchSnap.exists() ? batchSnap.data() : batchDataFallback;
    if (!currentData) throw new Error(`Batch ${batchId} not found in branch ${targetBranch}.`);

    const currentQty = Number(currentData.quantity) || 0;
    finalQty = Math.max(0, currentQty + adjustmentQty);
    transaction.set(batchRef, cleanFirestoreData({ ...currentData, quantity: finalQty }), { merge: true });

    const movementRef = doc(stockMovementsCollectionRef(targetBranch));
    transaction.set(
      movementRef,
      cleanFirestoreData({
        branchId: targetBranch,
        batchId,
        adjustmentQty,
        notes,
        userEmail: userEmail || null,
        previousQuantity: currentQty,
        newQuantity: finalQty,
        timestamp: new Date().toISOString(),
      })
    );
  });

  return { success: true, newQuantity: finalQty };
}

// ----------------------------------------------------------------------------
// Transactions (sales)
// ----------------------------------------------------------------------------

export async function saveTransactionToFirestore(branchId: string, tx: Transaction, isOnlineParam?: boolean): Promise<void> {
  const targetBranch = resolveBranchId(branchId, tx);
  if (!checkIsOnline(isOnlineParam)) return;
  try {
    await setDoc(doc(salesCollectionRef(targetBranch), (tx as any).id), cleanFirestoreData(tx), { merge: true });
  } catch (err) {
    console.error('[firebaseSync] saveTransactionToFirestore error:', err);
  }
}

export async function loadTransactionsFromFirestore(branchId?: string): Promise<Transaction[]> {
  try {
    if (branchId && isValidBranchId(branchId)) {
      const snap = await getDocs(salesCollectionRef(branchId));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as unknown as Transaction));
    }
    const results = await Promise.all(FIXED_BRANCHES.map((b) => getDocs(salesCollectionRef(b.id))));
    return results.flatMap((snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() } as unknown as Transaction)));
  } catch (err) {
    console.error('[firebaseSync] loadTransactionsFromFirestore error:', err);
    return [];
  }
}

export function subscribeToTransactionsFirestore(branchIdOrCallback: string | ((transactions: Transaction[]) => void), maybeCallback?: (transactions: Transaction[]) => void): () => void {
  const branchId = typeof branchIdOrCallback === 'string' ? branchIdOrCallback : undefined;
  const callback = typeof branchIdOrCallback === 'function' ? branchIdOrCallback : maybeCallback!;

  if (branchId && isValidBranchId(branchId)) {
    return onSnapshot(
      salesCollectionRef(branchId),
      (snapshot) => callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as unknown as Transaction))),
      (err) => console.error('[firebaseSync] subscribeToTransactionsFirestore error:', err)
    );
  }

  const perBranch = new Map<string, Transaction[]>();
  const unsubs = FIXED_BRANCHES.map((b) =>
    onSnapshot(
      salesCollectionRef(b.id),
      (snapshot) => {
        perBranch.set(b.id, snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as unknown as Transaction)));
        callback(Array.from(perBranch.values()).flat());
      },
      (err) => console.error('[firebaseSync] subscribeToTransactionsFirestore error:', err)
    )
  );
  return () => unsubs.forEach((u) => u());
}

// ----------------------------------------------------------------------------
// Expenditures
// ----------------------------------------------------------------------------

export async function saveExpenditureToFirestore(branchId: string, exp: any, isOnlineParam?: boolean): Promise<void> {
  const targetBranch = resolveBranchId(branchId, exp);
  if (!checkIsOnline(isOnlineParam)) return;
  try {
    await setDoc(doc(expendituresCollectionRef(targetBranch), exp.id), cleanFirestoreData(exp), { merge: true });
  } catch (err) {
    console.error('[firebaseSync] saveExpenditureToFirestore error:', err);
  }
}

export async function loadExpendituresFromFirestore(branchId?: string): Promise<any[]> {
  try {
    if (branchId && isValidBranchId(branchId)) {
      const snap = await getDocs(expendituresCollectionRef(branchId));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    }
    const results = await Promise.all(FIXED_BRANCHES.map((b) => getDocs(expendituresCollectionRef(b.id))));
    return results.flatMap((snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  } catch (err) {
    console.error('[firebaseSync] loadExpendituresFromFirestore error:', err);
    return [];
  }
}

export async function deleteExpenditureFromFirestore(branchId: string, expenditureId: string): Promise<void> {
  const targetBranch = resolveBranchId(branchId);
  try {
    await deleteDoc(doc(expendituresCollectionRef(targetBranch), expenditureId));
  } catch (err) {
    console.error('[firebaseSync] deleteExpenditureFromFirestore error:', err);
  }
}

export function subscribeToExpendituresFirestore(branchIdOrCallback: string | ((items: any[]) => void), maybeCallback?: (items: any[]) => void): () => void {
  const branchId = typeof branchIdOrCallback === 'string' ? branchIdOrCallback : undefined;
  const callback = typeof branchIdOrCallback === 'function' ? branchIdOrCallback : maybeCallback!;

  if (branchId && isValidBranchId(branchId)) {
    return onSnapshot(
      expendituresCollectionRef(branchId),
      (snapshot) => callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => console.error('[firebaseSync] subscribeToExpendituresFirestore error:', err)
    );
  }

  const perBranch = new Map<string, any[]>();
  const unsubs = FIXED_BRANCHES.map((b) =>
    onSnapshot(
      expendituresCollectionRef(b.id),
      (snapshot) => {
        perBranch.set(b.id, snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        callback(Array.from(perBranch.values()).flat());
      },
      (err) => console.error('[firebaseSync] subscribeToExpendituresFirestore error:', err)
    )
  );
  return () => unsubs.forEach((u) => u());
}

// ----------------------------------------------------------------------------
// Prescriptions
// ----------------------------------------------------------------------------

export async function savePrescriptionToFirestore(branchId: string, rx: Prescription, isOnlineParam?: boolean): Promise<void> {
  const targetBranch = resolveBranchId(branchId);
  if (!checkIsOnline(isOnlineParam)) return;
  try {
    const { prescriptionsCollectionRef } = await import('./pharmacyConfig');
    await setDoc(doc(prescriptionsCollectionRef(targetBranch), rx.id), cleanFirestoreData(rx), { merge: true });
  } catch (err) {
    console.error('[firebaseSync] savePrescriptionToFirestore error:', err);
  }
}

/**
 * Persists pharmacy-level settings.
 */
export async function savePharmacySettingsToFirestore(updatedPharmacy: any): Promise<void> {
  try {
    const { branches, staff, id, ...pharmacyFields } = updatedPharmacy || {};
    await setDoc(pharmacyDocRef(), cleanFirestoreData({ ...pharmacyFields, updatedAt: new Date().toISOString() }), { merge: true });

    if (Array.isArray(branches)) {
      const batch = writeBatch(db);
      let wroteAny = false;
      for (const b of branches) {
        if (b && b.id && isValidBranchId(b.id)) {
          batch.set(branchDocRef(b.id), cleanFirestoreData(b), { merge: true });
          wroteAny = true;
        } else if (b && b.id) {
          console.warn(`[firebaseSync] Ignored attempt to save non-fixed branch "${b.id}".`);
        }
      }
      if (wroteAny) await batch.commit();
    }
  } catch (err) {
    console.error('[firebaseSync] savePharmacySettingsToFirestore error:', err);
    throw err;
  }
}

/**
 * Subscribes to live pharmacy-level settings (logo, contact info, exchange rate, etc.)
 */
export function subscribeToPharmacySettingsFirestore(callback: (settings: any) => void): () => void {
  return onSnapshot(
    pharmacyDocRef(),
    (snapshot) => {
      if (snapshot.exists()) {
        callback({ id: snapshot.id, ...snapshot.data() });
      }
    },
    (err) => console.error('[firebaseSync] subscribeToPharmacySettingsFirestore error:', err)
  );
}

// ----------------------------------------------------------------------------
// Factory reset
// ----------------------------------------------------------------------------

export const SYSTEM_RESET_EPOCH = '2026-08-13_single_tenant_v1';

export async function wipeAndResetFirestoreDatabase(): Promise<void> {
  try {
    const subcollections = ['products', 'sales', 'staff', 'batches', 'stock_movements', 'expenditures', 'prescriptions', 'patients', 'audit_logs'];
    for (const b of FIXED_BRANCHES) {
      for (const colName of subcollections) {
        const { collection } = await import('firebase/firestore');
        const colRef = collection(db, 'pharmacy', PHARMACY_ID, 'branches', b.id, colName);
        const snap = await getDocs(colRef);
        const batch = writeBatch(db);
        snap.docs.forEach((d) => batch.delete(d.ref));
        if (snap.docs.length > 0) await batch.commit();
      }
    }
    await ensurePharmacyAndBranchesExist();
    await setDoc(pharmacyDocRef(), cleanFirestoreData({ lastResetAt: new Date().toISOString(), resetEpoch: SYSTEM_RESET_EPOCH }), { merge: true });
  } catch (err) {
    console.error('[firebaseSync] wipeAndResetFirestoreDatabase error:', err);
    throw err;
  }
}

// ----------------------------------------------------------------------------
// Legacy Compatibility Stubs
// ----------------------------------------------------------------------------
export async function saveDeletedBranchToFirestore(..._args: any[]): Promise<void> {}
export async function saveTenantToFirestore(..._args: any[]): Promise<void> {}
export async function fetchUserFirestoreData(..._args: any[]): Promise<any> { return null; }
