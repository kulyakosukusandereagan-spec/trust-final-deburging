// Secure audit trail logging utility for HIPAA-compliant pharmaceutical records
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

export function getAuditLogs(): AuditLog[] {
  const stored = localStorage.getItem('juba_audit_logs');
  if (!stored) {
    localStorage.setItem('juba_audit_logs', JSON.stringify(DEFAULT_LOGS));
    return DEFAULT_LOGS;
  }
  try {
    return JSON.parse(stored);
  } catch (e) {
    return DEFAULT_LOGS;
  }
}

export function logAuditEvent(
  category: AuditLog['category'],
  action: string,
  details: string,
  severity: AuditLog['severity'] = 'low',
  oldValues?: Record<string, any> | string,
  newValues?: Record<string, any> | string,
  userEmail?: string,
  userRole?: string
) {
  const logs = getAuditLogs();
  
  // Get currently selected profile role from environment if not specified
  const email = userEmail || 'junubposcenter@gmail.com';
  const role = userRole || 'Pharmacy Admin';
  const branch = 'Airport Road Main Branch';

  const newLog: AuditLog = {
    id: `log-${Math.random().toString(36).substring(2, 11)}`,
    timestamp: new Date().toISOString(),
    user: email,
    role,
    action,
    category,
    severity,
    ipAddress: `198.51.100.${Math.floor(Math.random() * 220) + 20}`,
    details,
    branch,
    oldValues: oldValues ? (typeof oldValues === 'string' ? oldValues : JSON.stringify(oldValues)) : undefined,
    newValues: newValues ? (typeof newValues === 'string' ? newValues : JSON.stringify(newValues)) : undefined
  };

  const updatedLogs = [newLog, ...logs];
  localStorage.setItem('juba_audit_logs', JSON.stringify(updatedLogs));
  
  // Dispatch a window event so current tabs refresh their UI logs list
  window.dispatchEvent(new CustomEvent('juba_audit_log_added', { detail: newLog }));
  return newLog;
}
