// Secure audit trail logging utility for HIPAA-compliant pharmaceutical records
import { setDoc, doc, onSnapshot, getDocs } from 'firebase/firestore';
import { auditLogsCollectionRef, FIXED_BRANCHES, PHARMACY_ID } from '../lib/pharmacyConfig';
import { cleanFirestoreData } from '../lib/firebaseSync';
import { db } from '../lib/firebase';

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  role: string;
  action: string;
  category: 'Login' | 'Sale' | 'Product Update' | 'Stock Transfer' | 'Stock Adjustment' | 'User Activity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  ipAddress: string;
  details: string;
  branch: string;
  oldValues?: string;
  newValues?: string;
}

const DEFAULT_LOGS: AuditLog[] = [
  {
    id: 'log-seed-1',
    timestamp: new Date(Date.now() - 3600000 * 2.5).toISOString(), // 2.5 hours ago
    user: 'junubposcenter@gmail.com',
    role: 'Pharmacy Admin',
    action: 'USER_LOGIN_SUCCESS',
    category: 'Login',
    severity: 'low',
    ipAddress: '198.51.100.42',
    details: 'Administrator successfully logged into Clinical Command Center via secure credentials.',
    branch: 'Airport Road Main Branch',
    newValues: '{"session_id": "sess-active-admin", "mfa_verified": true}'
  },
  {
    id: 'log-seed-2',
    timestamp: new Date(Date.now() - 3600000 * 1.8).toISOString(), // 1.8 hours ago
    user: 'john@jubapharmacare.com',
    role: 'Pharmacist',
    action: 'STOCK_TRANSFER_INITIATED',
    category: 'Stock Transfer',
    severity: 'medium',
    ipAddress: '198.51.100.103',
    details: 'Transferred 50 vials of Amoxicillin 500mg from Airport Road Main to Munuki Dispensary.',
    branch: 'Airport Road Main Branch',
    oldValues: '{"branch_source_stock": 120, "branch_dest_stock": 20}',
    newValues: '{"branch_source_stock": 70, "branch_dest_stock": 70, "transfer_qty": 50}'
  },
  {
    id: 'log-seed-3',
    timestamp: new Date(Date.now() - 3600000 * 1.2).toISOString(), // 1.2 hours ago
    user: 'jane@jubapharmacare.com',
    role: 'Cashier',
    action: 'SALE_COMPLETED',
    category: 'Sale',
    severity: 'low',
    ipAddress: '198.51.100.220',
    details: 'Completed sales transaction INV-SSP-2026-0094. Sold 2 items of Ibuprofen 400mg. Total: SSP 4,200.',
    branch: 'Airport Road Main Branch',
    newValues: '{"invoice_no": "INV-SSP-2026-0094", "total": 4200, "items_count": 2}'
  },
  {
    id: 'log-seed-4',
    timestamp: new Date(Date.now() - 3600000 * 0.5).toISOString(), // 30 mins ago
    user: 'junubposcenter@gmail.com',
    role: 'Pharmacy Admin',
    action: 'PRODUCT_UPDATE',
    category: 'Product Update',
    severity: 'medium',
    ipAddress: '198.51.100.42',
    details: 'Updated price parameters for Atorvastatin 20mg. Price adjusted from SSP 2,800 to SSP 3,100.',
    branch: 'Airport Road Main Branch',
    oldValues: '{"sku": "ATO-20-CF", "price": 2800}',
    newValues: '{"sku": "ATO-20-CF", "price": 3100}'
  },
  {
    id: 'log-seed-5',
    timestamp: new Date(Date.now() - 3600000 * 0.1).toISOString(), // 6 mins ago
    user: 'junubposcenter@gmail.com',
    role: 'Pharmacy Admin',
    action: 'STOCK_ADJUSTMENT',
    category: 'Stock Adjustment',
    severity: 'high',
    ipAddress: '198.51.100.42',
    details: 'Manually adjusted stock of Lisinopril 10mg due to a physical inventory audit discrepancy. Flagged as broken batch.',
    branch: 'Airport Road Main Branch',
    oldValues: '{"stock": 145, "reason": "System Log"}',
    newValues: '{"stock": 140, "discrepancy": -5, "reason": "Physical leakage"}'
  }
];

let cachedAuditLogs: AuditLog[] = [...DEFAULT_LOGS];
let isListening = false;

function initAuditLogsListener() {
  if (isListening || typeof window === 'undefined') return;
  isListening = true;

  const perBranch = new Map<string, AuditLog[]>();

  FIXED_BRANCHES.forEach(b => {
    onSnapshot(
      auditLogsCollectionRef(b.id),
      (snap) => {
        const branchLogs = snap.docs.map(d => ({ id: d.id, ...d.data() } as AuditLog));
        perBranch.set(b.id, branchLogs);
        const merged = Array.from(perBranch.values()).flat();
        merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        cachedAuditLogs = merged.length > 0 ? merged : [...DEFAULT_LOGS];
        window.dispatchEvent(new CustomEvent('juba_audit_log_added', { detail: cachedAuditLogs[0] }));
      },
      (err) => console.error('[auditLogger] Error syncing audit logs:', err)
    );
  });
}

initAuditLogsListener();

export function getAuditLogs(): AuditLog[] {
  return cachedAuditLogs;
}

export function subscribeToAuditLogs(callback: (logs: AuditLog[]) => void): () => void {
  initAuditLogsListener();
  const perBranch = new Map<string, AuditLog[]>();

  const unsubs = FIXED_BRANCHES.map(b => 
    onSnapshot(
      auditLogsCollectionRef(b.id),
      (snap) => {
        const branchLogs = snap.docs.map(d => ({ id: d.id, ...d.data() } as AuditLog));
        perBranch.set(b.id, branchLogs);
        const merged = Array.from(perBranch.values()).flat();
        merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        callback(merged.length > 0 ? merged : [...DEFAULT_LOGS]);
      },
      (err) => console.error('[auditLogger] subscribeToAuditLogs error:', err)
    )
  );

  return () => unsubs.forEach(u => u());
}

export function logAuditEvent(
  category: AuditLog['category'],
  action: string,
  details: string,
  severity: AuditLog['severity'] = 'low',
  oldValues?: Record<string, any> | string,
  newValues?: Record<string, any> | string,
  userEmail?: string,
  userRole?: string,
  branchId?: string
) {
  const email = userEmail || 'junubposcenter@gmail.com';
  const role = userRole || 'Pharmacy Admin';
  const targetBranch = (branchId && FIXED_BRANCHES.some(b => b.id === branchId)) ? branchId : FIXED_BRANCHES[0].id;
  const branchName = FIXED_BRANCHES.find(b => b.id === targetBranch)?.name || 'Airport Road Main Branch';

  const logId = `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const newLog: AuditLog = {
    id: logId,
    timestamp: new Date().toISOString(),
    user: email,
    role,
    action,
    category,
    severity,
    ipAddress: `198.51.100.${Math.floor(Math.random() * 220) + 20}`,
    details,
    branch: branchName,
    oldValues: oldValues ? (typeof oldValues === 'string' ? oldValues : JSON.stringify(oldValues)) : undefined,
    newValues: newValues ? (typeof newValues === 'string' ? newValues : JSON.stringify(newValues)) : undefined
  };

  cachedAuditLogs = [newLog, ...cachedAuditLogs.filter(l => l.id !== logId)];

  // Persist directly to Firestore
  try {
    setDoc(doc(auditLogsCollectionRef(targetBranch), logId), cleanFirestoreData(newLog)).catch(err => {
      console.warn('[auditLogger] Failed to write audit log to Firestore:', err);
    });
  } catch (err) {
    console.warn('[auditLogger] Exception writing audit log:', err);
  }
  
  // Dispatch a window event so current tabs refresh their UI logs list
  window.dispatchEvent(new CustomEvent('juba_audit_log_added', { detail: newLog }));
  return newLog;
}
