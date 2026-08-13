import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { initializeFirestore, doc, setDoc, deleteDoc, writeBatch, collection, getDocs } from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";

async function runReset() {
  console.log("Connecting to Firestore database for reset...");
  const app = initializeApp(firebaseConfig as any);
  const auth = getAuth(app);
  
  try {
    await signInWithEmailAndPassword(auth, "junubposcenter@gmail.com", "Reagantekki01");
    console.log("Successfully authenticated reset runner as junubposcenter@gmail.com");
  } catch (err: any) {
    console.warn("Auth signin notice (proceeding):", err?.message || err);
  }

  const db = initializeFirestore(app, {}, firebaseConfig.firestoreDatabaseId);

  const SYSTEM_RESET_EPOCH = "2026-08-13_completely_clean_v3";
  const targetUsers = ['shared-global-tenant-v1', 'guest-user', 'tenant-downtown', 'tenant-juba', 'junubposcenter@gmail.com'];
  
  const collectionsToPurge = [
    'tenants', 'drugs', 'batches', 'prescriptions', 'transactions', 'staff',
    'deleted_branches', 'deleted_staff', 'expenditures', 'data_locks', 'stock_movements', 'audit_logs'
  ];

  console.log("Purging all old documents across collections...");
  for (const colName of collectionsToPurge) {
    try {
      const colRef = collection(db, colName);
      const snap = await getDocs(colRef);
      if (snap.docs.length > 0) {
        console.log(`Deleting ${snap.docs.length} docs from ${colName}...`);
        for (const d of snap.docs) {
          try {
            await deleteDoc(d.ref);
          } catch(e) {}
        }
      }
    } catch (err: any) {
      console.warn(`Purging ${colName} notice:`, err?.message || err);
    }
  }

  console.log("Setting database_version system_config...");
  try {
    const versionRef = doc(db, "system_config", "database_version");
    await setDoc(versionRef, {
      resetEpoch: SYSTEM_RESET_EPOCH,
      resetAt: new Date().toISOString(),
      resetBy: "admin_wipe"
    });
  } catch (err: any) {
    console.warn("Setting system_config notice:", err?.message || err);
  }

  console.log("Writing clean baseline tenant and staff records...");
  const cleanTenants = [
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
  await seedBatch.commit();
  console.log("Firestore database successfully wiped and reset to clean baseline!");
  process.exit(0);
}

runReset().catch(err => {
  console.error("Reset error:", err);
  process.exit(1);
});
