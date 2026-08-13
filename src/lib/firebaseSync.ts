import { db } from './firebase';
import { 
  collection, 
  doc, 
  getDoc,
  getDocs, 
  getDocFromServer,
  getDocsFromServer,
  setDoc, 
  deleteDoc,
  query, 
  where, 
  writeBatch,
  runTransaction,
  onSnapshot
} from 'firebase/firestore';
import { Tenant, DrugItem, Prescription, Transaction } from '../types';

// Helper to verify network connectivity prior to atomic Firestore transactions
export function checkIsOnline(isOnlineParam?: boolean): boolean {
  if (isOnlineParam === true) return true;
  if (isOnlineParam === false) {
    if (typeof navigator !== 'undefined' && navigator.onLine) return true;
    return false;
  }
  if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
    return navigator.onLine;
  }
  return true;
}

// Atomic Firestore transaction helper for Lapsed Write-off submissions
export async function processLapsedWriteOffInFirestore(
  userId: string,
  batchId: string,
  adjustmentQty: number, // e.g. -10 for writing off 10 units
  notes: string,
  userEmail?: string,
  isOnlineParam?: boolean,
  batchDataFallback?: any
): Promise<{ success: boolean; newQuantity: number }> {
  if (!checkIsOnline(isOnlineParam)) {
    throw new Error("Network connection offline. Lapsed write-off submissions require an active network connection for atomic Firestore transactions.");
  }

  try {
    let finalQty = 0;
    await runTransaction(db, async (transaction) => {
      const docRef = doc(db, "batches", `${userId}_${batchId}`);
      const batchSnap = await transaction.get(docRef);

      let currentQty = 0;
      let existingBatchData: any = batchDataFallback || {};

      if (batchSnap.exists()) {
        const snapData = batchSnap.data();
        existingBatchData = { ...batchDataFallback, ...snapData };
        currentQty = Number(snapData.quantity) ?? Number(batchDataFallback?.quantity) ?? 0;
      } else if (batchDataFallback) {
        currentQty = Number(batchDataFallback.quantity) || 0;
      }

      finalQty = Math.max(0, currentQty + adjustmentQty);

      const updatedBatchData = {
        ...existingBatchData,
        quantity: finalQty,
        lastWriteOffAt: new Date().toISOString(),
        lastWriteOffBy: userEmail || 'system',
        userId
      };

      // 1. Update primary tenant batch doc
      transaction.set(docRef, updatedBatchData, { merge: true });

      // 2. Also update shared global tenant doc if applicable
      if (userId !== 'shared-global-tenant-v1') {
        const globalRef = doc(db, "batches", `shared-global-tenant-v1_${batchId}`);
        transaction.set(globalRef, { ...updatedBatchData, userId: 'shared-global-tenant-v1' }, { merge: true });
      }

      // 3. Atomically record the lapsed write-off movement ledger
      const movementId = `writeoff-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const movementRef = doc(db, "stock_movements", `${userId}_${movementId}`);
      const movementPayload = {
        id: movementId,
        tenantId: userId,
        batchId,
        drugName: existingBatchData.name || existingBatchData.drugName || 'Drug Item',
        movementType: 'expired',
        quantity: adjustmentQty,
        notes: notes || 'Lapsed write-off submission',
        userEmail: userEmail || 'admin',
        createdAt: new Date().toISOString(),
        userId
      };
      transaction.set(movementRef, movementPayload);

      if (userId !== 'shared-global-tenant-v1') {
        const globalMovementRef = doc(db, "stock_movements", `shared-global-tenant-v1_${movementId}`);
        transaction.set(globalMovementRef, { ...movementPayload, tenantId: 'shared-global-tenant-v1', userId: 'shared-global-tenant-v1' });
      }
    });

    return { success: true, newQuantity: finalQty };
  } catch (err: any) {
    console.error("Atomic Firestore transaction error during Lapsed Write-off:", err);
    throw new Error(`Lapsed write-off submission failed: ${err?.message || err}`);
  }
}

// Standard seed data for a fresh workspace
const DEFAULT_TENANTS: Tenant[] = [
  {
    id: "tenant-juba",
    name: "Royal Trust Pharmacy",
    subdomain: "royaltrust",
    status: "active",
    plan: "enterprise",
    billingCycle: "annual",
    registeredAt: "2026-03-15T10:00:00Z",
    dbIsolationMode: "shared_schema_tenant_id",
    brandingColor: "#0ea5e9", // Sky Blue
    address: "Airport Road, Juba Town, South Sudan",
    phone: "+211 922 152 427",
    email: "info@royaltrustpharmacy.com",
    website: "www.royaltrustpharmacy.com",
    taxNumber: "SSD-TX-TRUST-001",
    currency: "SSP", // South Sudanese Pound
    receiptHeader: "ROYAL TRUST PHARMACY\nYour Health, Our Priority\nAirport Road, Juba",
    receiptFooter: "Thank you for choosing Royal Trust Pharmacy\nQuality clinical care in South Sudan.",
    businessRegNo: "SSD-REG-TRUST-2026",
    branches: [
      { id: "branch-juba-1", name: "Royal Trust Pharmacy - Main Branch (Juba)", address: "Airport Road, Juba Town, South Sudan", phone: "+211 922 152 427", isActive: true, registeredAt: "2026-03-15T10:00:00Z" },
      { id: "branch-wau-1", name: "Royal Trust Pharmacy - Wau Branch", address: "Hai Daraja, Wau, Western Bahr el Ghazal, South Sudan", phone: "+211 922 888 123", isActive: true, registeredAt: "2026-03-16T10:00:00Z" }
    ],
    staff: [
      { id: "staff-juba-1", name: "Administrator (Sande Reagan)", email: "junubposcenter@gmail.com", password: "Reagantekki01", role: "Administrator", isActive: true, isVerified: true, branchId: "branch-juba-1" }
    ]
  }
];

const DEFAULT_DRUGS: DrugItem[] = [];

const DEFAULT_PRESCRIPTIONS: Prescription[] = [];

const DEFAULT_TRANSACTIONS: Transaction[] = [];

// Helper to run a promise with a timeout so network delays in Firestore don't block the app
function safeFirestoreCall<T>(promise: Promise<T>, timeoutMs = 12000, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    let timer = setTimeout(() => {
      resolve(fallback);
    }, timeoutMs);

    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        console.warn("Firestore network notice:", err?.message || err);
        resolve(fallback);
      });
  });
}

// Helper to check if a user already has data in Firestore
export async function checkIfUserHasData(userId: string): Promise<boolean> {
  try {
    const q = query(collection(db, "tenants"), where("userId", "==", userId));
    const snapshot = await safeFirestoreCall(getDocsFromServer(q), 2500, null);
    return Boolean(snapshot && !snapshot.empty);
  } catch (err) {
    console.warn("Notice checking user data in Firestore:", err);
    return false;
  }
}

// Save or Update Staff Accounts individually in staff collection
export async function saveStaffAccountsToFirestore(userId: string, staffList: any[], isOnlineParam?: boolean): Promise<void> {
  if (!checkIsOnline(isOnlineParam)) {
    console.warn("Offline mode: Staff account updates will sync to Firestore once connection is re-established.");
    return;
  }
  try {
    await runTransaction(db, async (transaction) => {
      for (const member of staffList) {
        const docRef = doc(db, "staff", `${userId}_${member.id}`);
        transaction.set(docRef, { ...member, userId }, { merge: true });

        if (member.email) {
          const cleanEmail = member.email.toLowerCase().replace(/[^a-z0-9]/g, '_');
          const emailRef = doc(db, "staff_accounts", cleanEmail);
          transaction.set(emailRef, { ...member, userId }, { merge: true });
        }

        if (userId !== 'shared-global-tenant-v1') {
          const globalRef = doc(db, "staff", `shared-global-tenant-v1_${member.id}`);
          transaction.set(globalRef, { ...member, userId: 'shared-global-tenant-v1' }, { merge: true });
        }
      }
    });
  } catch (err) {
    console.warn("Notice saving staff accounts to Firestore:", err);
  }
}

// Save or Update a single staff member in Firestore staff collection
export async function saveStaffAccountToFirestore(userId: string, staffMember: any, tenantId?: string, isOnlineParam?: boolean): Promise<void> {
  if (!checkIsOnline(isOnlineParam)) {
    console.warn("Offline mode: Staff role update queued for online sync.");
    return;
  }
  try {
    const tId = tenantId || staffMember.tenantId || 'tenant-juba';
    const payload = {
      ...staffMember,
      userId,
      tenantId: tId,
      email: staffMember.email?.toLowerCase(),
      updatedAt: new Date().toISOString()
    };

    await runTransaction(db, async (transaction) => {
      const docRef = doc(db, "staff", `${userId}_${staffMember.id}`);
      transaction.set(docRef, payload, { merge: true });

      if (staffMember.email) {
        const cleanEmail = staffMember.email.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const emailRef = doc(db, "staff_accounts", cleanEmail);
        transaction.set(emailRef, payload, { merge: true });
      }

      if (userId !== 'shared-global-tenant-v1') {
        const globalDocRef = doc(db, "staff", `shared-global-tenant-v1_${staffMember.id}`);
        transaction.set(globalDocRef, { ...payload, userId: 'shared-global-tenant-v1' }, { merge: true });
      }
    });
  } catch (err) {
    console.warn("Notice saving single staff account to Firestore:", err);
  }
}

// Record deleted staff ID and Email into Firestore deleted_staff collection
export async function saveDeletedStaffToFirestore(userId: string, staffId: string, email?: string): Promise<void> {
  try {
    const cleanEmail = email ? email.toLowerCase() : undefined;
    const docRef = doc(db, "deleted_staff", userId);
    const snap = await safeFirestoreCall(getDoc(docRef), 2000, null);
    
    let existingIds: string[] = [];
    let existingEmails: string[] = [];
    if (snap && snap.exists()) {
      existingIds = snap.data().ids || [];
      existingEmails = snap.data().emails || [];
    }

    const combinedIds = Array.from(new Set([...existingIds, staffId].filter(Boolean)));
    const combinedEmails = Array.from(new Set([...existingEmails, cleanEmail].filter(Boolean)));

    const payload = {
      ids: combinedIds,
      emails: combinedEmails,
      userId,
      updatedAt: new Date().toISOString()
    };

    await safeFirestoreCall(setDoc(docRef, payload, { merge: true }), 2500, undefined);

    const globalRef = doc(db, "deleted_staff", "shared-global-tenant-v1");
    const globalSnap = await safeFirestoreCall(getDoc(globalRef), 2000, null);
    let globalIds: string[] = [];
    let globalEmails: string[] = [];
    if (globalSnap && globalSnap.exists()) {
      globalIds = globalSnap.data().ids || [];
      globalEmails = globalSnap.data().emails || [];
    }
    await safeFirestoreCall(setDoc(globalRef, {
      ids: Array.from(new Set([...globalIds, ...combinedIds])),
      emails: Array.from(new Set([...globalEmails, ...combinedEmails])),
      userId: "shared-global-tenant-v1",
      updatedAt: new Date().toISOString()
    }, { merge: true }), 2500, undefined);
  } catch (err) {
    console.warn("Notice recording deleted staff in Firestore:", err);
  }
}

export async function loadDeletedStaffFromFirestore(userId: string): Promise<{ ids: string[]; emails: string[] }> {
  try {
    const docRef = doc(db, "deleted_staff", userId);
    const globalRef = doc(db, "deleted_staff", "shared-global-tenant-v1");

    const [snap, globalSnap] = await Promise.all([
      safeFirestoreCall(getDoc(docRef), 2000, null),
      safeFirestoreCall(getDoc(globalRef), 2000, null)
    ]);

    let ids: string[] = [];
    let emails: string[] = [];

    if (snap && snap.exists()) {
      ids = [...ids, ...(snap.data().ids || [])];
      emails = [...emails, ...(snap.data().emails || [])];
    }
    if (globalSnap && globalSnap.exists()) {
      ids = [...ids, ...(globalSnap.data().ids || [])];
      emails = [...emails, ...(globalSnap.data().emails || [])];
    }

    const uniqueIds = Array.from(new Set(ids));
    const uniqueEmails = Array.from(new Set(emails.map(e => e.toLowerCase())));

    try {
      localStorage.setItem('junub_deleted_staff_ids', JSON.stringify(uniqueIds));
      localStorage.setItem('junub_deleted_staff_emails', JSON.stringify(uniqueEmails));
    } catch(e) {}

    return { ids: uniqueIds, emails: uniqueEmails };
  } catch (err) {
    console.warn("Notice loading deleted staff from Firestore:", err);
    return { ids: [], emails: [] };
  }
}

// Delete staff member from Firestore
export async function deleteStaffAccountFromFirestore(userId: string, staffId: string, email?: string): Promise<void> {
  try {
    const docRef = doc(db, "staff", `${userId}_${staffId}`);
    await safeFirestoreCall(setDoc(docRef, { deletedAt: new Date().toISOString(), isActive: false }, { merge: true }), 2500, undefined);

    if (email) {
      const cleanEmail = email.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const emailRef = doc(db, "staff_accounts", cleanEmail);
      await safeFirestoreCall(setDoc(emailRef, { deletedAt: new Date().toISOString(), isActive: false }, { merge: true }), 2500, undefined);
    }

    await saveDeletedStaffToFirestore(userId, staffId, email);

    // Sync to Express Server backend
    try {
      await fetch(`/api/v1/${userId}/staff/${staffId}?email=${encodeURIComponent(email || '')}`, { method: 'DELETE' });
      await fetch(`/api/v1/${userId}/staff/deleted`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: staffId, email, ids: [staffId], emails: email ? [email] : [] })
      });
    } catch (err) {}
  } catch (err) {
    console.warn("Notice deleting staff account from Firestore:", err);
  }
}

// Record deleted Branch ID into Firestore & localStorage deleted_branches collection
export async function saveDeletedBranchToFirestore(userId: string, branchId: string): Promise<void> {
  try {
    const docRef = doc(db, "deleted_branches", userId);
    const snap = await safeFirestoreCall(getDoc(docRef), 2000, null);
    let existingIds: string[] = [];
    if (snap && snap.exists()) {
      existingIds = snap.data().ids || [];
    }

    const combinedIds = Array.from(new Set([...existingIds, branchId].filter(Boolean)));

    await safeFirestoreCall(setDoc(docRef, { ids: combinedIds, userId, updatedAt: new Date().toISOString() }, { merge: true }), 2500, undefined);

    const globalRef = doc(db, "deleted_branches", "shared-global-tenant-v1");
    const globalSnap = await safeFirestoreCall(getDoc(globalRef), 2000, null);
    let globalIds: string[] = [];
    if (globalSnap && globalSnap.exists()) {
      globalIds = globalSnap.data().ids || [];
    }

    await safeFirestoreCall(setDoc(globalRef, {
      ids: Array.from(new Set([...globalIds, ...combinedIds])),
      userId: "shared-global-tenant-v1",
      updatedAt: new Date().toISOString()
    }, { merge: true }), 2500, undefined);

    try {
      localStorage.setItem('junub_deleted_branch_ids', JSON.stringify(combinedIds));
    } catch(e) {}
  } catch (err) {
    console.warn("Notice recording deleted branch in Firestore:", err);
  }
}

export async function loadDeletedBranchesFromFirestore(userId: string): Promise<string[]> {
  try {
    const docRef = doc(db, "deleted_branches", userId);
    const globalRef = doc(db, "deleted_branches", "shared-global-tenant-v1");

    const [snap, globalSnap] = await Promise.all([
      safeFirestoreCall(getDoc(docRef), 2000, null),
      safeFirestoreCall(getDoc(globalRef), 2000, null)
    ]);

    let ids: string[] = [];
    if (snap && snap.exists()) ids = [...ids, ...(snap.data().ids || [])];
    if (globalSnap && globalSnap.exists()) ids = [...ids, ...(globalSnap.data().ids || [])];

    let localIds: string[] = [];
    try {
      localIds = JSON.parse(localStorage.getItem('junub_deleted_branch_ids') || '[]');
    } catch(e) {}

    const uniqueIds = Array.from(new Set([...ids, ...localIds].filter(Boolean)));

    try {
      localStorage.setItem('junub_deleted_branch_ids', JSON.stringify(uniqueIds));
    } catch(e) {}

    return uniqueIds;
  } catch (err) {
    console.warn("Notice loading deleted branches from Firestore:", err);
    try {
      return JSON.parse(localStorage.getItem('junub_deleted_branch_ids') || '[]');
    } catch(e) {
      return [];
    }
  }
}

// Seed standard data for a user in Firestore
export async function seedUserData(userId: string): Promise<void> {
  try {
    console.log(`Seeding initial multi-tenant database tables into Firestore for user ${userId}...`);
    const batch = writeBatch(db);

    // Seed Tenants & Staff
    for (const tenant of DEFAULT_TENANTS) {
      const docRef = doc(db, "tenants", `${userId}_${tenant.id}`);
      batch.set(docRef, { ...tenant, userId });

      if (tenant.staff) {
        for (const s of tenant.staff) {
          const staffRef = doc(db, "staff", `${userId}_${s.id}`);
          batch.set(staffRef, { ...s, userId, tenantId: tenant.id });
        }
      }
    }

    // Seed Drugs
    for (const drug of DEFAULT_DRUGS) {
      const docRef = doc(db, "drugs", `${userId}_${drug.id}`);
      batch.set(docRef, { ...drug, userId });
    }

    // Seed Prescriptions
    for (const rx of DEFAULT_PRESCRIPTIONS) {
      const docRef = doc(db, "prescriptions", `${userId}_${rx.id}`);
      batch.set(docRef, { ...rx, userId });
    }

    // Seed Transactions
    for (const tx of DEFAULT_TRANSACTIONS) {
      const docRef = doc(db, "transactions", `${userId}_${tx.id}`);
      batch.set(docRef, { ...tx, userId });
    }

    await safeFirestoreCall(batch.commit(), 3000, undefined);
    console.log("Initial Firestore database seeding complete!");
  } catch (err) {
    console.warn("Notice seeding initial user data to Firestore:", err);
  }
}

export const SYSTEM_RESET_EPOCH = "2026-08-13_completely_clean_v4";

export async function wipeAndResetFirestoreDatabase(userId: string): Promise<void> {
  console.log(`[Database Reset] Wiping all Firestore database records and seeding clean baseline for user ${userId}...`);

  const targetUsers = Array.from(new Set([userId, 'shared-global-tenant-v1', 'guest-user', 'tenant-downtown', 'tenant-juba', 'junubposcenter@gmail.com'].filter(Boolean)));
  const collectionsToPurge = [
    'tenants', 'drugs', 'batches', 'prescriptions', 'transactions', 'staff',
    'deleted_branches', 'deleted_staff', 'expenditures', 'data_locks', 'stock_movements', 'audit_logs',
    'patients', 'sales', 'suppliers', 'purchase_orders', 'barcodes', 'qr_codes', 'inventory_audits', 'stock_transfers', 'staff_accounts'
  ];

  // 1. Purge all Firestore docs for target collections
  for (const colName of collectionsToPurge) {
    try {
      const colRef = collection(db, colName);
      const snap: any = await safeFirestoreCall(getDocsFromServer(colRef), 2500, { docs: [] } as any);
      if (snap && snap.docs && snap.docs.length > 0) {
        for (const d of snap.docs) {
          try {
            await deleteDoc(d.ref);
          } catch(e) {}
        }
      }
    } catch (err) {
      console.warn(`Notice purging Firestore collection ${colName}:`, err);
    }
  }

  // 2. Set database_version in Firestore
  try {
    const versionRef = doc(db, "system_config", "database_version");
    await setDoc(versionRef, {
      resetEpoch: SYSTEM_RESET_EPOCH,
      resetAt: new Date().toISOString(),
      resetBy: userId
    });
  } catch (err) {
    console.warn("Notice updating system_config database_version:", err);
  }

  // 3. Re-seed clean baseline tenants & staff
  const cleanTenants: Tenant[] = [
    {
      id: "tenant-downtown",
      name: "Royal Trust Pharmacy",
      subdomain: "royaltrust",
      status: "active",
      plan: "enterprise",
      billingCycle: "annual",
      registeredAt: "2026-03-15T10:00:00Z",
      dbIsolationMode: "shared_schema_tenant_id",
      brandingColor: "#0ea5e9",
      address: "Airport Road, Juba Town, South Sudan",
      phone: "+211 922 152 427",
      email: "info@royaltrustpharmacy.com",
      website: "www.royaltrustpharmacy.com",
      taxNumber: "SSD-TX-TRUST-001",
      currency: "SSP",
      usdToSspRate: 3100,
      receiptHeader: "ROYAL TRUST PHARMACY\nYour Health, Our Priority\nAirport Road, Juba",
      receiptFooter: "Thank you for choosing Royal Trust Pharmacy\nQuality clinical care in South Sudan.",
      businessRegNo: "SSD-REG-TRUST-2026",
      activePharmacies: 1,
      maxPharmacies: 10,
      activeUsers: 1,
      maxUsers: 50,
      branches: [
        { id: "branch-dt-1", name: "Royal Trust Pharmacy - Main Branch", address: "Airport Road, Juba Town, South Sudan", phone: "+211 922 152 427", isActive: true, registeredAt: "2026-03-15T10:00:00Z" }
      ],
      staff: [
        { id: "staff-dt-1", name: "Administrator (Sande Reagan)", email: "junubposcenter@gmail.com", password: "Reagantekki01", role: "Administrator", isActive: true, isVerified: true, branchId: "branch-dt-1" }
      ]
    }
  ];

  try {
    const seedBatch = writeBatch(db);
    for (const uId of targetUsers) {
      for (const t of cleanTenants) {
        const tenantRef = doc(db, "tenants", `${uId}_${t.id}`);
        seedBatch.set(tenantRef, { ...t, userId: uId });

        if (t.staff) {
          for (const s of t.staff) {
            const staffRef = doc(db, "staff", `${uId}_${s.id}`);
            seedBatch.set(staffRef, { ...s, userId: uId, tenantId: t.id });
          }
        }
      }
    }
    await safeFirestoreCall(seedBatch.commit(), 3000, undefined);
  } catch (err) {
    console.warn("Notice seeding clean baseline tenants to Firestore:", err);
  }

  // 4. Update local storage with reset epoch and clear dirty local keys
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.clear();
      localStorage.setItem('junub_app_reset_epoch', SYSTEM_RESET_EPOCH);
      localStorage.setItem('trust_pharmacy_tenants', JSON.stringify(cleanTenants));
    } catch (e) {}
  }
}

// Fetch user's multi-tenant data from Firestore
export async function fetchUserFirestoreData(userId: string) {
  try {
    // Check if cloud resetEpoch matches local resetEpoch
    try {
      const versionRef = doc(db, "system_config", "database_version");
      const versionSnap = await safeFirestoreCall(getDocFromServer(versionRef), 1500, null);
      if (versionSnap && versionSnap.exists()) {
        const cloudEpoch = versionSnap.data()?.resetEpoch;
        const localEpoch = localStorage.getItem('junub_app_reset_epoch');
        if (cloudEpoch && localEpoch !== cloudEpoch) {
          console.log(`[Reset Epoch Mismatch] Discarding stale local storage cache (Cloud: ${cloudEpoch}, Local: ${localEpoch})...`);
          localStorage.clear();
          localStorage.setItem('junub_app_reset_epoch', cloudEpoch);
        }
      }
    } catch (e) {}

    const tenantsCol = collection(db, "tenants");
    const staffCol = collection(db, "staff");
    const drugsCol = collection(db, "drugs");
    const rxCol = collection(db, "prescriptions");
    const txCol = collection(db, "transactions");

    const tenantsQuery = query(tenantsCol, where("userId", "==", userId));
    const globalTenantsQuery = query(tenantsCol, where("userId", "==", "shared-global-tenant-v1"));

    const [tenantsSnap, globalTenantsSnap, allTenantsSnap, staffSnap, drugsSnap, rxSnap, txSnap] = await Promise.all([
      safeFirestoreCall<any>(getDocsFromServer(tenantsQuery), 2500, { docs: [] }),
      safeFirestoreCall<any>(getDocsFromServer(globalTenantsQuery), 2500, { docs: [] }),
      safeFirestoreCall<any>(getDocsFromServer(tenantsCol), 2500, { docs: [] }),
      safeFirestoreCall<any>(getDocsFromServer(query(staffCol, where("userId", "==", userId))), 2500, { docs: [] }),
      safeFirestoreCall<any>(getDocsFromServer(query(drugsCol, where("userId", "==", userId))), 2500, { docs: [] }),
      safeFirestoreCall<any>(getDocsFromServer(query(rxCol, where("userId", "==", userId))), 2500, { docs: [] }),
      safeFirestoreCall<any>(getDocsFromServer(query(txCol, where("userId", "==", userId))), 2500, { docs: [] })
    ]);

    const rawTenants = [
      ...(tenantsSnap.docs || []).map((doc: any) => doc.data() as Tenant),
      ...(globalTenantsSnap.docs || []).map((doc: any) => doc.data() as Tenant),
      ...(allTenantsSnap.docs || []).map((doc: any) => doc.data() as Tenant)
    ];

    // Also collect local browser tenant copies across all keys
    const localKeys = ['trust_pharmacy_tenants', 'junub_local_tenants', 'junub_pharmacy_tenants'];
    localKeys.forEach(k => {
      try {
        const val = localStorage.getItem(k);
        if (val) {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed)) {
            parsed.forEach(t => { if (t && t.id) rawTenants.push(t); });
          }
        }
      } catch (e) {}
    });

    // Load deleted branches & deleted staff from Firestore & local storage
    const [deletedStaffObj, delBranchIds] = await Promise.all([
      loadDeletedStaffFromFirestore(userId),
      loadDeletedBranchesFromFirestore(userId)
    ]);

    const isValidBranch = (b: any) => b && b.id && !delBranchIds.includes(b.id);

    // Merge duplicate tenant records by ID so branches, usdToSspRate, and config are preserved
    const tenantMap = new Map<string, Tenant>();
    rawTenants.forEach(t => {
      if (!t || !t.id) return;
      const existing = tenantMap.get(t.id);
      if (!existing) {
        const cleanBranches = (t.branches || []).filter(isValidBranch);
        tenantMap.set(t.id, { ...t, branches: cleanBranches });
      } else {
        const branchesMap = new Map();
        (existing.branches || []).forEach((b: any) => { if (isValidBranch(b)) branchesMap.set(b.id, b); });
        (t.branches || []).forEach((b: any) => { if (isValidBranch(b)) branchesMap.set(b.id, b); });

        tenantMap.set(t.id, {
          ...existing,
          ...t,
          usdToSspRate: t.usdToSspRate || existing.usdToSspRate || 3100,
          branches: Array.from(branchesMap.values())
        });
      }
    });

    const tenants = Array.from(tenantMap.values());

    let delIds: string[] = deletedStaffObj.ids;
    let delEmails: string[] = deletedStaffObj.emails;

    try {
      const localIds = JSON.parse(localStorage.getItem('junub_deleted_staff_ids') || '[]');
      const localEmails = JSON.parse(localStorage.getItem('junub_deleted_staff_emails') || '[]');
      localIds.forEach((id: string) => { if (id && !delIds.includes(id)) delIds.push(id); });
      localEmails.forEach((e: string) => { if (e && !delEmails.includes(e.toLowerCase())) delEmails.push(e.toLowerCase()); });
    } catch(e) {}

    const isValidStaff = (s: any) => s && !s.deletedAt && !delIds.includes(s.id) && !delEmails.includes(s.email?.toLowerCase());

    const firestoreStaff = (staffSnap.docs || []).map(doc => doc.data() as any).filter(isValidStaff);

    // Also collect local registered staff from local storage
    let localRegisteredStaff: any[] = [];
    try {
      const regStr = localStorage.getItem('junub_registered_staff');
      if (regStr) {
        const parsed = JSON.parse(regStr);
        if (Array.isArray(parsed)) localRegisteredStaff = parsed.filter(isValidStaff);
      }
    } catch(e) {}

    const drugs = (drugsSnap.docs || []).map(doc => doc.data() as DrugItem);
    const prescriptions = (rxSnap.docs || []).map(doc => doc.data() as Prescription);
    const transactions = (txSnap.docs || []).map(doc => doc.data() as Transaction);

    // Merge staff records into corresponding tenants
    const mergedTenants = tenants.map(t => {
      const staffMap = new Map<string, any>();
      (t.staff || []).forEach(s => {
        if (s.email && isValidStaff(s)) staffMap.set(s.email.toLowerCase(), s);
        else if (s.id && isValidStaff(s)) staffMap.set(s.id, s);
      });
      firestoreStaff.forEach(s => {
        if (s.email && isValidStaff(s)) {
          staffMap.set(s.email.toLowerCase(), s);
        }
      });
      localRegisteredStaff.forEach(s => {
        if (s.email && isValidStaff(s)) {
          staffMap.set(s.email.toLowerCase(), s);
        }
      });
      return { ...t, staff: Array.from(staffMap.values()) };
    });

    return {
      tenants: mergedTenants.sort((a,b) => a.name.localeCompare(b.name)),
      drugs,
      prescriptions,
      transactions
    };
  } catch (err) {
    console.warn("Notice fetching data from Firestore:", err);
    return { tenants: [], drugs: [], prescriptions: [], transactions: [] };
  }
}

// Save or Update a Tenant (and sync staff accounts to staff collection)
export async function saveTenantToFirestore(userId: string, tenant: Tenant, isOnlineParam?: boolean): Promise<void> {
  // Load deleted branch and staff blacklists
  let delBranchIds: string[] = [];
  let delStaffIds: string[] = [];
  let delStaffEmails: string[] = [];
  try {
    delBranchIds = JSON.parse(localStorage.getItem('junub_deleted_branch_ids') || '[]');
    delStaffIds = JSON.parse(localStorage.getItem('junub_deleted_staff_ids') || '[]');
    delStaffEmails = JSON.parse(localStorage.getItem('junub_deleted_staff_emails') || '[]');
  } catch(e) {}

  const isValidBranch = (b: any) => b && b.id && !delBranchIds.includes(b.id);
  const isValidStaff = (s: any) => s && !s.deletedAt && !delStaffIds.includes(s.id) && !delStaffEmails.includes(s.email?.toLowerCase());

  const cleanedTenant: Tenant = {
    ...tenant,
    branches: (tenant.branches || []).filter(isValidBranch),
    staff: (tenant.staff || []).filter(isValidStaff)
  };

  // Sync locally to all storage keys immediately
  try {
    const keys = ['trust_pharmacy_tenants', 'junub_local_tenants', 'junub_pharmacy_tenants'];
    keys.forEach(k => {
      try {
        const existingStr = localStorage.getItem(k);
        let existingList: Tenant[] = existingStr ? JSON.parse(existingStr) : [];
        if (!Array.isArray(existingList)) existingList = [];
        const idx = existingList.findIndex(t => t.id === cleanedTenant.id);
        if (idx !== -1) {
          const branchesMap = new Map();
          (existingList[idx].branches || []).forEach(b => { if (isValidBranch(b)) branchesMap.set(b.id, b); });
          (cleanedTenant.branches || []).forEach(b => { if (isValidBranch(b)) branchesMap.set(b.id, b); });

          const staffMap = new Map();
          (existingList[idx].staff || []).forEach(s => { if (isValidStaff(s)) staffMap.set(s.email?.toLowerCase() || s.id, s); });
          (cleanedTenant.staff || []).forEach(s => { if (isValidStaff(s)) staffMap.set(s.email?.toLowerCase() || s.id, s); });

          existingList[idx] = {
            ...existingList[idx],
            ...cleanedTenant,
            branches: Array.from(branchesMap.values()),
            staff: Array.from(staffMap.values())
          };
        } else {
          existingList.push(cleanedTenant);
        }
        localStorage.setItem(k, JSON.stringify(existingList));
      } catch(e){}
    });
  } catch(e){}

  if (!checkIsOnline(isOnlineParam)) {
    console.warn("Offline mode: Tenant branch changes stored locally; will sync when online.");
    return;
  }
  try {
    await runTransaction(db, async (transaction) => {
      const docRef = doc(db, "tenants", `${userId}_${cleanedTenant.id}`);
      transaction.set(docRef, { ...cleanedTenant, userId }, { merge: true });

      if (userId !== 'shared-global-tenant-v1') {
        const globalRef = doc(db, "tenants", `shared-global-tenant-v1_${cleanedTenant.id}`);
        transaction.set(globalRef, { ...cleanedTenant, userId: 'shared-global-tenant-v1' }, { merge: true });
      }
    });

    if (cleanedTenant.staff && Array.isArray(cleanedTenant.staff)) {
      await saveStaffAccountsToFirestore(userId, cleanedTenant.staff, isOnlineParam);
      if (userId !== 'shared-global-tenant-v1') {
        await saveStaffAccountsToFirestore('shared-global-tenant-v1', cleanedTenant.staff, isOnlineParam);
      }
    }
  } catch (err) {
    console.warn("Notice saving tenant to Firestore:", err);
  }
}

// Save or Update a Drug
export async function saveDrugToFirestore(userId: string, drug: DrugItem, isOnlineParam?: boolean): Promise<void> {
  if (!checkIsOnline(isOnlineParam)) {
    throw new Error("Network connection offline. Atomic Firestore transactions require an active network connection.");
  }
  try {
    await runTransaction(db, async (transaction) => {
      const docRef = doc(db, "drugs", `${userId}_${drug.id}`);
      transaction.set(docRef, { ...drug, userId }, { merge: true });
    });
  } catch (err) {
    console.warn("Notice saving drug to Firestore:", err);
    throw err;
  }
}

// Save or Update a Prescription
export async function savePrescriptionToFirestore(userId: string, rx: Prescription, isOnlineParam?: boolean): Promise<void> {
  if (!checkIsOnline(isOnlineParam)) {
    throw new Error("Network connection offline. Atomic Firestore transactions require an active network connection.");
  }
  try {
    await runTransaction(db, async (transaction) => {
      const docRef = doc(db, "prescriptions", `${userId}_${rx.id}`);
      transaction.set(docRef, { ...rx, userId }, { merge: true });
    });
  } catch (err) {
    console.warn("Notice saving prescription to Firestore:", err);
    throw err;
  }
}

// Save or Update a Transaction
export async function saveTransactionToFirestore(userId: string, tx: Transaction, isOnlineParam?: boolean): Promise<void> {
  if (!checkIsOnline(isOnlineParam)) {
    throw new Error("Network connection offline. Atomic Firestore transactions require an active network connection.");
  }
  try {
    await runTransaction(db, async (transaction) => {
      const docRef = doc(db, "transactions", `${userId}_${tx.id}`);
      transaction.set(docRef, { ...tx, userId }, { merge: true });

      if (userId !== 'shared-global-tenant-v1') {
        const globalRef = doc(db, "transactions", `shared-global-tenant-v1_${tx.id}`);
        transaction.set(globalRef, { ...tx, userId: 'shared-global-tenant-v1' }, { merge: true });
      }
    });
  } catch (err) {
    console.warn("Notice saving transaction to Firestore:", err);
    throw err;
  }
}

// Save or Update an Expenditure
export async function saveExpenditureToFirestore(userId: string, exp: any, isOnlineParam?: boolean): Promise<void> {
  if (!checkIsOnline(isOnlineParam)) {
    throw new Error("Network connection offline. Atomic Firestore transactions require an active network connection.");
  }
  try {
    await runTransaction(db, async (transaction) => {
      const docRef = doc(db, "expenditures", `${userId}_${exp.id}`);
      transaction.set(docRef, { ...exp, userId }, { merge: true });

      if (userId !== 'shared-global-tenant-v1') {
        const globalRef = doc(db, "expenditures", `shared-global-tenant-v1_${exp.id}`);
        transaction.set(globalRef, { ...exp, userId: 'shared-global-tenant-v1' }, { merge: true });
      }
    });
  } catch (err) {
    console.warn("Notice saving expenditure to Firestore:", err);
    throw err;
  }
}

// Save or Update an Inventory Batch
export async function saveBatchToFirestore(userId: string, batch: any, isOnlineParam?: boolean): Promise<void> {
  if (!checkIsOnline(isOnlineParam)) {
    throw new Error("Network connection offline. Atomic Firestore transactions require an active network connection.");
  }
  try {
    await runTransaction(db, async (transaction) => {
      const docRef = doc(db, "batches", `${userId}_${batch.id}`);
      transaction.set(docRef, { ...batch, userId }, { merge: true });

      if (userId !== 'shared-global-tenant-v1') {
        const globalRef = doc(db, "batches", `shared-global-tenant-v1_${batch.id}`);
        transaction.set(globalRef, { ...batch, userId: 'shared-global-tenant-v1' }, { merge: true });
      }
    });
  } catch (err) {
    console.warn("Notice saving batch to Firestore:", err);
    throw err;
  }
}

export const ALL_DEFAULT_BATCH_IDS = [
  'batch-amox-1', 'batch-amox-2', 'batch-para-1', 'batch-para-2', 
  'batch-cipro-1', 'batch-ibup-1', 'batch-art-1', 'batch-ome-1',
  'batch-met-1', 'batch-cet-1', 'batch-ors-1', 'batch-azi-1',
  'batch-m1-1', 'batch-m1-2', 'batch-m2-1', 'batch-m2-2',
  'batch-m3-1', 'batch-m3-2', 'batch-m4-1', 'batch-m4-2',
  'batch-m5-1', 'batch-m5-2', 'batch-m6-1', 'batch-m6-2',
  'batch-m7-1', 'batch-m7-2', 'batch-m8-1', 'batch-m8-2',
  'batch-m9-1', 'batch-m9-2', 'batch-m10-1', 'batch-m10-2',
  'drug-amox', 'drug-para', 'drug-cipro', 'drug-ibup', 'drug-art',
  'm1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm9', 'm10',
  'Amoxicillin 500mg Capsule', 'Paracetamol 500mg Tablet', 'Ciprofloxacin 500mg',
  'Ibuprofen 400mg', 'Omeprazole 20mg', 'Artemether-Lumefantrine 20/120mg',
  'Metronidazole 400mg', 'Cetirizine 10mg', 'Oral Rehydration Salts (ORS)',
  'Azithromycin 500mg', 'Paracetamol', 'Amoxicillin', 'Ciprofloxacin',
  'Ibuprofen', 'Omeprazole', 'Artemether-Lumefantrine', 'Metronidazole',
  'Cetirizine', 'Oral Rehydration Salts', 'Azithromycin'
];

// Save Inventory Cleared state in Firestore
export async function saveInventoryClearedToFirestore(userId: string, isCleared: boolean = true): Promise<void> {
  try {
    const docRef = doc(db, "inventory_status", userId);
    await safeFirestoreCall(setDoc(docRef, { isCleared, clearedAt: new Date().toISOString(), userId }, { merge: true }), 2500, undefined);

    const globalRef = doc(db, "inventory_status", "shared-global-tenant-v1");
    await safeFirestoreCall(setDoc(globalRef, { isCleared, clearedAt: new Date().toISOString(), userId: "shared-global-tenant-v1" }, { merge: true }), 2500, undefined);
  } catch (err) {
    console.warn("Notice recording inventory cleared status in Firestore:", err);
  }
}

export async function loadInventoryClearedFromFirestore(userId: string): Promise<boolean> {
  try {
    const docRef = doc(db, "inventory_status", userId);
    const globalRef = doc(db, "inventory_status", "shared-global-tenant-v1");

    const [snap, globalSnap] = await Promise.all([
      safeFirestoreCall(getDoc(docRef), 2000, null),
      safeFirestoreCall(getDoc(globalRef), 2000, null)
    ]);

    if (snap && snap.exists() && snap.data().isCleared) return true;
    if (globalSnap && globalSnap.exists() && globalSnap.data().isCleared) return true;
    return false;
  } catch (err) {
    console.warn("Notice loading inventory cleared status from Firestore:", err);
    return false;
  }
}

// Delete an Inventory Batch from Firestore permanently and record in global deleted blacklist
export async function saveDeletedBatchToFirestore(userId: string, batchId: string, name?: string, moreIds?: string[]): Promise<void> {
  try {
    const deletedIds: string[] = [batchId].filter(Boolean);
    if (name) deletedIds.push(name);
    if (Array.isArray(moreIds)) deletedIds.push(...moreIds);

    const docRef = doc(db, "deleted_batches", userId);
    const snap = await safeFirestoreCall(getDoc(docRef), 2000, null);
    let existing: string[] = [];
    if (snap && snap.exists()) {
      existing = snap.data().ids || [];
    }
    const combined = Array.from(new Set([...existing, ...deletedIds]));
    await safeFirestoreCall(setDoc(docRef, { ids: combined, userId, updatedAt: new Date().toISOString() }, { merge: true }), 2500, undefined);

    const globalRef = doc(db, "deleted_batches", "shared-global-tenant-v1");
    const globalSnap = await safeFirestoreCall(getDoc(globalRef), 2000, null);
    let globalExisting: string[] = [];
    if (globalSnap && globalSnap.exists()) {
      globalExisting = globalSnap.data().ids || [];
    }
    const globalCombined = Array.from(new Set([...globalExisting, ...deletedIds]));
    await safeFirestoreCall(setDoc(globalRef, { ids: globalCombined, userId: "shared-global-tenant-v1", updatedAt: new Date().toISOString() }, { merge: true }), 2500, undefined);
  } catch (err) {
    console.warn("Notice recording deleted batch in Firestore:", err);
  }
}

export async function loadDeletedBatchesFromFirestore(userId: string): Promise<string[]> {
  try {
    const docRef = doc(db, "deleted_batches", userId);
    const globalRef = doc(db, "deleted_batches", "shared-global-tenant-v1");
    
    const [snap, globalSnap] = await Promise.all([
      safeFirestoreCall(getDoc(docRef), 2000, null),
      safeFirestoreCall(getDoc(globalRef), 2000, null)
    ]);

    let list: string[] = [];
    if (snap && snap.exists()) {
      list = [...list, ...(snap.data().ids || [])];
    }
    if (globalSnap && globalSnap.exists()) {
      list = [...list, ...(globalSnap.data().ids || [])];
    }
    return Array.from(new Set(list));
  } catch (err) {
    console.warn("Notice loading deleted batches from Firestore:", err);
    return [];
  }
}

export async function deleteBatchFromFirestore(userId: string, batchId: string, name?: string): Promise<void> {
  try {
    const docRef = doc(db, "batches", `${userId}_${batchId}`);
    await safeFirestoreCall(setDoc(docRef, { isDeleted: true, deletedAt: new Date().toISOString() }, { merge: true }), 2500, undefined);
    await safeFirestoreCall(deleteDoc(docRef), 2500, undefined);

    const globalRef = doc(db, "batches", `shared-global-tenant-v1_${batchId}`);
    await safeFirestoreCall(setDoc(globalRef, { isDeleted: true, deletedAt: new Date().toISOString() }, { merge: true }), 2500, undefined);
    await safeFirestoreCall(deleteDoc(globalRef), 2500, undefined);

    await saveDeletedBatchToFirestore(userId, batchId, name);
  } catch (err) {
    console.warn("Notice deleting batch from Firestore:", err);
  }
}

// Fetch Inventory Batches from Firestore
export async function loadBatchesFromFirestore(userId: string): Promise<any[]> {
  try {
    const batchesCol = collection(db, "batches");
    const tenantQ = query(batchesCol, where("userId", "==", userId));
    const globalQ = query(batchesCol, where("userId", "==", "shared-global-tenant-v1"));
    const allQ = query(batchesCol);

    const [tenantSnap, globalSnap, allSnap, deletedList] = await Promise.all([
      safeFirestoreCall(getDocsFromServer(tenantQ), 5000, null),
      safeFirestoreCall(getDocsFromServer(globalQ), 5000, null),
      safeFirestoreCall(getDocsFromServer(allQ), 5000, null),
      loadDeletedBatchesFromFirestore(userId)
    ]);

    const batchMap = new Map<string, any>();

    const processDocs = (docs: any[]) => {
      if (!docs) return;
      docs.forEach(d => {
        const data = d.data ? d.data() : d;
        if (data && data.id && !data.isDeleted && !data.deletedAt && !deletedList.includes(data.id) && !deletedList.includes(data.drugId) && !deletedList.includes(data.name)) {
          batchMap.set(data.id, data);
        }
      });
    };

    if (tenantSnap && tenantSnap.docs) processDocs(tenantSnap.docs);
    if (globalSnap && globalSnap.docs) processDocs(globalSnap.docs);
    if (allSnap && allSnap.docs) processDocs(allSnap.docs);

    return Array.from(batchMap.values());
  } catch (err) {
    console.warn("Error loading batches from Firestore:", err);
    return [];
  }
}

// Live real-time Firestore subscriber for inventory batches
export function subscribeToBatchesFirestore(tenantId: string, callback: (batches: any[]) => void): () => void {
  try {
    const batchesCol = collection(db, "batches");
    const qTenant = query(batchesCol, where("tenantId", "==", tenantId));
    const qUser = query(batchesCol, where("userId", "==", tenantId));

    const combinedMap = new Map<string, any>();

    const mergeAndEmit = async (docs: any[]) => {
      const deletedList = await loadDeletedBatchesFromFirestore(tenantId);
      docs.forEach(doc => {
        const data = typeof doc.data === 'function' ? doc.data() : doc;
        if (data && data.id && !data.isDeleted && !data.deletedAt && !deletedList.includes(data.id) && !deletedList.includes(data.drugId) && !deletedList.includes(data.name)) {
          if (!tenantId || data.tenantId === tenantId || data.userId === tenantId || data.tenantId === 'shared-global-tenant-v1' || data.userId === 'shared-global-tenant-v1' || !data.tenantId) {
            combinedMap.set(data.id, data);
          }
        }
      });
      callback(Array.from(combinedMap.values()));
    };

    const unsubAll = onSnapshot(batchesCol, (snapshot) => {
      mergeAndEmit(snapshot.docs);
    }, (err) => {
      console.warn("Firestore batches subscription notice:", err);
    });

    const unsubTenant = onSnapshot(qTenant, (snapshot) => {
      mergeAndEmit(snapshot.docs);
    }, (err) => {
      console.warn("Firestore tenant batches subscription notice:", err);
    });

    const unsubUser = onSnapshot(qUser, (snapshot) => {
      mergeAndEmit(snapshot.docs);
    }, (err) => {
      console.warn("Firestore user batches subscription notice:", err);
    });

    return () => {
      unsubAll();
      unsubTenant();
      unsubUser();
    };
  } catch (e) {
    console.warn("Firestore batches subscription error:", e);
    return () => {};
  }
}

// Fetch Transactions from Firestore
export async function loadTransactionsFromFirestore(tenantId?: string): Promise<Transaction[]> {
  try {
    const txCol = collection(db, "transactions");
    const docsMap = new Map<string, Transaction>();

    // 1. First fetch all transactions in the centralized cloud collection
    const allQ = query(txCol);
    const allSnap = await safeFirestoreCall(getDocsFromServer(allQ), 3000, null);
    if (allSnap && allSnap.docs) {
      allSnap.docs.forEach((d: any) => {
        const data = d.data() as Transaction;
        const k = data.id || data.invoiceNumber;
        if (k) docsMap.set(k, data);
      });
    }

    // 2. Fetch tenant & user specific transactions as supplementary check
    if (tenantId) {
      const q = query(txCol, where("tenantId", "==", tenantId));
      const snap = await safeFirestoreCall(getDocsFromServer(q), 2500, null);
      if (snap && snap.docs) {
        snap.docs.forEach((d: any) => {
          const data = d.data() as Transaction;
          const k = data.id || data.invoiceNumber;
          if (k) docsMap.set(k, data);
        });
      }

      const userQ = query(txCol, where("userId", "==", tenantId));
      const userSnap = await safeFirestoreCall(getDocsFromServer(userQ), 2500, null);
      if (userSnap && userSnap.docs) {
        userSnap.docs.forEach((d: any) => {
          const data = d.data() as Transaction;
          const k = data.id || data.invoiceNumber;
          if (k && !docsMap.has(k)) docsMap.set(k, data);
        });
      }
    }

    const globalQ = query(txCol, where("tenantId", "==", "shared-global-tenant-v1"));
    const globalSnap = await safeFirestoreCall(getDocsFromServer(globalQ), 2500, null);
    if (globalSnap && globalSnap.docs) {
      globalSnap.docs.forEach((d: any) => {
        const data = d.data() as Transaction;
        const k = data.id || data.invoiceNumber;
        if (k && !docsMap.has(k)) docsMap.set(k, data);
      });
    }

    // Return all aggregated branch transactions across the entire enterprise
    return Array.from(docsMap.values());
  } catch (err) {
    console.warn("Error loading transactions from Firestore:", err);
    return [];
  }
}

// Fetch Staff Accounts from Firestore
export async function loadStaffFromFirestore(tenantId?: string): Promise<any[]> {
  try {
    const staffCol = collection(db, "staff");
    let snap: any = null;
    if (tenantId) {
      const q = query(staffCol, where("tenantId", "==", tenantId));
      snap = await safeFirestoreCall(getDocsFromServer(q), 2500, null);
    }
    if (!snap || !snap.docs || snap.docs.length === 0) {
      snap = await safeFirestoreCall(getDocsFromServer(staffCol), 2500, null);
    }
    if (!snap || !snap.docs) return [];
    return snap.docs
      .map((d: any) => d.data())
      .filter((s: any) => !s.deletedAt && (!tenantId || s.tenantId === tenantId || !s.tenantId));
  } catch (err) {
    console.warn("Error loading staff from Firestore:", err);
    return [];
  }
}

// Save or Update a Patient/Customer
export async function saveCustomerToFirestore(userId: string, customer: any): Promise<void> {
  try {
    const docRef = doc(db, "customers", `${userId}_${customer.id}`);
    await safeFirestoreCall(setDoc(docRef, { ...customer, userId }, { merge: true }), 2500, undefined);
  } catch (err) {
    console.warn("Notice saving customer to Firestore:", err);
  }
}

// Live real-time Firestore subscriber for sales transactions
export function subscribeToTransactionsFirestore(userId: string, callback: (transactions: Transaction[]) => void): () => void {
  if (!userId) return () => {};
  try {
    const txCol = collection(db, "transactions");
    const storeMap = new Map<string, Transaction[]>();

    const mergeAndEmit = (sourceKey: string, docs: Transaction[]) => {
      storeMap.set(sourceKey, docs);
      const combinedMap = new Map<string, Transaction>();
      storeMap.forEach((txList) => {
        txList.forEach((tx: any) => {
          const k = tx.id || tx.invoiceNumber;
          if (k) combinedMap.set(k, tx);
        });
      });
      callback(Array.from(combinedMap.values()));
    };

    // Live subscription across all transactions collection for multi-branch real-time sync
    const unsubAll = onSnapshot(txCol, (snapshot) => {
      mergeAndEmit('all', snapshot.docs.map(doc => doc.data() as Transaction));
    }, (err) => {
      console.warn("Firestore all transactions subscription notice:", err);
    });

    // Tenant & User specific queries
    const qTenant = query(txCol, where("tenantId", "==", userId));
    const unsubTenant = onSnapshot(qTenant, (snapshot) => {
      mergeAndEmit('tenant', snapshot.docs.map(doc => doc.data() as Transaction));
    }, (err) => {
      console.warn("Firestore tenant transaction subscription notice:", err);
    });

    const qUser = query(txCol, where("userId", "==", userId));
    const unsubUser = onSnapshot(qUser, (snapshot) => {
      mergeAndEmit('user', snapshot.docs.map(doc => doc.data() as Transaction));
    }, (err) => {
      console.warn("Firestore user transaction subscription notice:", err);
    });

    return () => {
      unsubAll();
      unsubTenant();
      unsubUser();
    };
  } catch (e) {
    console.warn("Firestore transaction subscription error:", e);
    return () => {};
  }
}

// One-time automatic cloud sync migration function to upload all legacy local browser data to Firebase Firestore
export async function migrateLocalStorageToFirestore(tenantId: string): Promise<void> {
  if (typeof window === 'undefined' || !window.localStorage) return;

  try {
    // Scan local inventory batches
    const customBatchesKey = `junub_custom_batches_${tenantId}`;
    const invBatchesKey = `junub_inventory_batches_${tenantId}`;
    const globalInvKey = `junub_inventory_batches_shared-global-tenant-v1`;

    const localBatches: any[] = [];
    [customBatchesKey, invBatchesKey, globalInvKey].forEach(key => {
      const val = localStorage.getItem(key);
      if (val) {
        try {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed)) {
            parsed.forEach(item => {
              if (item && item.id) localBatches.push(item);
            });
          }
        } catch (e) {}
      }
    });

    if (localBatches.length > 0) {
      console.log(`[Cloud Migration] Syncing ${localBatches.length} local inventory items to Firebase...`);
      for (const batch of localBatches) {
        await saveBatchToFirestore(tenantId, batch).catch(() => {});
        await saveBatchToFirestore('shared-global-tenant-v1', batch).catch(() => {});
      }
    }

    // Scan local registered staff
    const staffVal = localStorage.getItem('junub_registered_staff');
    if (staffVal) {
      try {
        const staffList = JSON.parse(staffVal);
        if (Array.isArray(staffList) && staffList.length > 0) {
          console.log(`[Cloud Migration] Syncing ${staffList.length} staff records to Firebase...`);
          await saveStaffAccountsToFirestore(tenantId, staffList).catch(() => {});
        }
      } catch (e) {}
    }

    // Scan local sales transactions
    const txVal = localStorage.getItem(`junub_recent_transactions_${tenantId}`);
    if (txVal) {
      try {
        const txList = JSON.parse(txVal);
        if (Array.isArray(txList) && txList.length > 0) {
          console.log(`[Cloud Migration] Syncing ${txList.length} sales transactions to Firebase...`);
          for (const tx of txList) {
            await saveTransactionToFirestore(tenantId, tx).catch(() => {});
          }
        }
      } catch (e) {}
    }

    localStorage.setItem(`junub_cloud_migrated_${tenantId}`, new Date().toISOString());
  } catch (err) {
    console.warn("Notice during localStorage cloud migration:", err);
  }
}

// Real-time live subscription for staff accounts from Firestore
export function subscribeToStaffFirestore(callback: (staffList: any[]) => void): () => void {
  try {
    const staffCol = collection(db, "staff");
    return onSnapshot(staffCol, (snapshot) => {
      const docs = snapshot.docs.map(d => d.data()).filter((s: any) => s && !s.deletedAt);
      callback(docs);
    }, (err) => {
      console.warn("Notice in subscribeToStaffFirestore:", err);
    });
  } catch (err) {
    console.warn("Error subscribing to staff in Firestore:", err);
    return () => {};
  }
}
