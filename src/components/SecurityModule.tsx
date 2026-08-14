import React, { useState, useEffect } from 'react';
import { 
  Lock, Unlock, Key, Shield, ShieldCheck, Users, RefreshCw, FileText, 
  CheckCircle2, XCircle, AlertTriangle, Database, Activity, Fingerprint, 
  Globe, Terminal, ArrowRight, Eye, EyeOff, Clipboard, Plus, History, 
  BookOpen, HelpCircle, Server, Copy, Check, Info, ShieldAlert, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getAuditLogs, logAuditEvent, subscribeToAuditLogs } from '../utils/auditLogger';

// ====================================================================================
// Types and Interfaces for the Security Simulation
// ====================================================================================
interface SecurityModuleProps {
  activeRole?: string;
  userEmail?: string;
}
interface SimulatedTenant {
  id: string;
  name: string;
  subdomain: string;
  plan: 'standard' | 'professional' | 'enterprise';
  dbIsolationMode: 'shared_schema_tenant_id' | 'schema_per_tenant' | 'database_per_tenant';
  status: 'active' | 'suspended';
}

interface SimulatedUser {
  id: string;
  tenantId: string;
  email: string;
  role: 'Super Admin' | 'Pharmacy Admin' | 'Pharmacist' | 'Cashier' | 'Store Manager';
  verified: boolean;
  mfaEnabled: boolean;
  mfaSecret: string;
}

interface SimulatedSession {
  id: string;
  userId: string;
  email: string;
  tenantId: string;
  subdomain: string;
  role: string;
  ipAddress: string;
  device: string;
  location: string;
  loginTime: string;
}

interface SecurityAuditLog {
  id: string;
  timestamp: string;
  tenantId: string;
  user: string;
  action: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  ipAddress: string;
  details: string;
}

export default function SecurityModule({ activeRole = 'Pharmacy Admin', userEmail = 'junubposcenter@gmail.com' }: SecurityModuleProps) {
  // --- Simulation In-Memory State ---
  const [tenants, setTenants] = useState<SimulatedTenant[]>([
    { id: 'tenant-downtown', name: 'Downtown Pharma Care', subdomain: 'downtown', plan: 'standard', dbIsolationMode: 'shared_schema_tenant_id', status: 'active' },
    { id: 'tenant-carefirst', name: 'CareFirst Meds & Wellness', subdomain: 'carefirst', plan: 'professional', dbIsolationMode: 'schema_per_tenant', status: 'active' },
    { id: 'tenant-stjude', name: 'St. Jude Clinical Pharmacy', subdomain: 'stjude', plan: 'enterprise', dbIsolationMode: 'database_per_tenant', status: 'active' }
  ]);

  const [users, setUsers] = useState<SimulatedUser[]>([
    { id: 'usr-1', tenantId: 'tenant-downtown', email: 'sarah.lin@downtownpharma.com', role: 'Pharmacy Admin', verified: true, mfaEnabled: true, mfaSecret: 'J4YV K3TX O5PZ L9QD' },
    { id: 'usr-2', tenantId: 'tenant-downtown', email: 'james.cash@downtownpharma.com', role: 'Cashier', verified: true, mfaEnabled: false, mfaSecret: 'K8UX N2WY Z4PL M1AQ' },
    { id: 'usr-3', tenantId: 'tenant-carefirst', email: 'dr.strange@carefirstmeds.com', role: 'Pharmacist', verified: true, mfaEnabled: true, mfaSecret: 'M9QZ P3XW L6YT V2BK' },
    { id: 'usr-4', tenantId: 'tenant-stjude', email: 'junubposcenter@gmail.com', role: 'Super Admin', verified: true, mfaEnabled: false, mfaSecret: 'A7VT O2LZ W9QX N5KY' }
  ]);

  const [sessions, setSessions] = useState<SimulatedSession[]>([
    { id: 'sess-1', userId: 'usr-1', email: 'sarah.lin@downtownpharma.com', tenantId: 'tenant-downtown', subdomain: 'downtown', role: 'Pharmacy Admin', ipAddress: '198.51.100.42', device: 'Chrome / macOS (14.2)', location: 'New York, USA', loginTime: '2026-07-13T08:02:15Z' },
    { id: 'sess-2', userId: 'usr-3', email: 'dr.strange@carefirstmeds.com', tenantId: 'tenant-carefirst', subdomain: 'carefirst', role: 'Pharmacist', ipAddress: '203.0.113.89', device: 'Safari / iPhone 15 Pro', location: 'San Francisco, USA', loginTime: '2026-07-13T08:14:30Z' }
  ]);

  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  useEffect(() => {
    const unsub = subscribeToAuditLogs((logs) => {
      const formatted = logs.map((log: any) => ({
        id: log.id,
        timestamp: log.timestamp,
        tenantId: 'trust-pharmacy',
        user: log.user || log.userEmail,
        action: log.action,
        severity: log.severity,
        ipAddress: log.ipAddress,
        details: log.details
      }));
      setAuditLogs(formatted);
    });

    return () => unsub();
  }, []);

  // --- active flow state ---
  const [activeSubTab, setActiveSubTab] = useState<'playground' | 'schema' | 'comparison'>('playground');
  
  // --- New Tenant Registration Form State ---
  const [newTenant, setNewTenant] = useState({
    name: '',
    subdomain: '',
    plan: 'professional' as 'standard' | 'professional' | 'enterprise',
    adminEmail: '',
    adminPassword: ''
  });
  const [registerStatus, setRegisterStatus] = useState<'idle' | 'provisioning' | 'complete'>('idle');

  // --- Auth Flow Simulation State ---
  const [loginEmail, setLoginEmail] = useState('sarah.lin@downtownpharma.com');
  const [loginPassword, setLoginPassword] = useState('••••••••');
  const [currentStep, setCurrentStep] = useState<'input' | 'verify_email' | 'mfa' | 'jwt'>('input');
  const [selectedUser, setSelectedUser] = useState<SimulatedUser | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaError, setMfaError] = useState('');
  const [jwtToken, setJwtToken] = useState<string>('');
  const [copiedToken, setCopiedToken] = useState(false);

  // --- Tenant Switching State ---
  const [userJoinedTenants, setUserJoinedTenants] = useState<Array<{id: string, name: string, subdomain: string, role: string}>>([
    { id: 'tenant-downtown', name: 'Downtown Pharma Care', subdomain: 'downtown', role: 'Pharmacy Admin' },
    { id: 'tenant-carefirst', name: 'CareFirst Meds', subdomain: 'carefirst', role: 'Consulting Pharmacist' }
  ]);
  const [selectedActiveTenant, setSelectedActiveTenant] = useState('tenant-downtown');

  // --- Active Schema Table Selection ---
  const [selectedTable, setSelectedTable] = useState('tenants');

  // --- Helper to log auditable events ---
  const logSecurityEvent = (tenantId: string, user: string, action: string, severity: 'low' | 'medium' | 'high' | 'critical', details: string) => {
    const newLog: SecurityAuditLog = {
      id: `log-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      tenantId,
      user,
      action,
      severity,
      ipAddress: '198.51.100.' + Math.floor(Math.random() * 250 + 1),
      details
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  // --- Handle Registration Sim ---
  const handleRegisterTenant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenant.name || !newTenant.subdomain || !newTenant.adminEmail) return;

    setRegisterStatus('provisioning');
    
    setTimeout(() => {
      const tenantId = `tenant-${newTenant.subdomain.toLowerCase()}`;
      const dbModes = {
        standard: 'shared_schema_tenant_id' as const,
        professional: 'schema_per_tenant' as const,
        enterprise: 'database_per_tenant' as const
      };

      const addedTenant: SimulatedTenant = {
        id: tenantId,
        name: newTenant.name,
        subdomain: newTenant.subdomain.toLowerCase(),
        plan: newTenant.plan,
        dbIsolationMode: dbModes[newTenant.plan],
        status: 'active'
      };

      const addedUser: SimulatedUser = {
        id: `usr-${Math.random().toString(36).substr(2, 9)}`,
        tenantId: tenantId,
        email: newTenant.adminEmail,
        role: 'Pharmacy Admin',
        verified: false, // Starts unverified to show email verification flow!
        mfaEnabled: true,
        mfaSecret: 'M4PT R2XW Y1BZ O9KL'
      };

      setTenants(prev => [...prev, addedTenant]);
      setUsers(prev => [...prev, addedUser]);
      
      logSecurityEvent(tenantId, newTenant.adminEmail, 'TENANT_REGISTERED', 'high', 
        `New tenant registered. Plan: ${newTenant.plan}. Isolated schema setup triggered automatically.`);
      
      logSecurityEvent(tenantId, newTenant.adminEmail, 'USER_CREATED', 'medium', 
        `Primary administrative user account created. Pending email verification.`);

      setRegisterStatus('complete');
      
      // Auto fill login box
      setLoginEmail(newTenant.adminEmail);
      setLoginPassword('PasswordSetByAdmin');
    }, 2000);
  };

  // --- Reset registration form ---
  const resetRegistrationForm = () => {
    setNewTenant({
      name: '',
      subdomain: '',
      plan: 'professional',
      adminEmail: '',
      adminPassword: ''
    });
    setRegisterStatus('idle');
  };

  // --- Handle Login Click Sim ---
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const foundUser = users.find(u => u.email.toLowerCase() === loginEmail.toLowerCase().trim());
    
    if (!foundUser) {
      alert("Security Gateway: User account not found.");
      return;
    }

    setSelectedUser(foundUser);
    
    if (!foundUser.verified) {
      // Prompt Verification Simulation
      setCurrentStep('verify_email');
      logSecurityEvent(foundUser.tenantId, foundUser.email, 'LOGIN_ATTEMPT_UNVERIFIED', 'medium', 
        `Login blocked. Account requires mandatory email verification.`);
    } else if (foundUser.mfaEnabled) {
      // Transition to Multi-factor
      setCurrentStep('mfa');
      setMfaCode('');
      setMfaError('');
      logSecurityEvent(foundUser.tenantId, foundUser.email, 'MFA_CHALLENGE_ISSUED', 'low', 
        `Login details verified. Multi-factor (TOTP) challenge dispatched.`);
    } else {
      // Direct token issuance
      issueSimulatedJWT(foundUser);
    }
  };

  // --- Simulate Email Verification ---
  const simulateEmailClick = () => {
    if (!selectedUser) return;
    
    setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, verified: true } : u));
    const updatedUser = { ...selectedUser, verified: true };
    setSelectedUser(updatedUser);
    
    logSecurityEvent(updatedUser.tenantId, updatedUser.email, 'EMAIL_VERIFIED_SUCCESS', 'medium', 
      `User clicked cryptographic verification link. Status updated to verified.`);

    alert("Cryptographic confirmation verified! Account is now active. Please complete login.");
    setCurrentStep('input');
  };

  // --- TOTP Validation Sim ---
  const handleVerifyTOTP = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    if (mfaCode === '123456' || mfaCode.length === 6) {
      setMfaError('');
      issueSimulatedJWT(selectedUser);
    } else {
      setMfaError('Invalid 6-digit TOTP validation code. Please retry.');
      logSecurityEvent(selectedUser.tenantId, selectedUser.email, 'MFA_VERIFY_FAILED', 'medium', 
        `Incorrect 2FA passcode submitted.`);
    }
  };

  // --- JWT Simulation Generator ---
  const issueSimulatedJWT = (user: SimulatedUser) => {
    const userTenant = tenants.find(t => t.id === user.tenantId) || tenants[0];
    const session_id = `sess-${Math.random().toString(36).substr(2, 9)}`;
    
    // Simulate claims payload
    const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" })).replace(/=/g, '');
    const payloadObj = {
      iss: "jubupharma-identity",
      sub: user.id,
      email: user.email,
      tenant_id: user.tenantId,
      subdomain: userTenant.subdomain,
      role: user.role,
      permissions: getPermissionsForRole(user.role),
      mfa_verified: user.mfaEnabled,
      session_id,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour
    };
    const payload = btoa(JSON.stringify(payloadObj)).replace(/=/g, '');
    const signature = btoa("hmac_sha256_cryptographic_signature_matching_environment_secret_key").replace(/=/g, '').substring(0, 32);
    
    const signedJWT = `${header}.${payload}.${signature}`;
    setJwtToken(signedJWT);
    setCurrentStep('jwt');

    // Add session
    const newSession: SimulatedSession = {
      id: session_id,
      userId: user.id,
      email: user.email,
      tenantId: user.tenantId,
      subdomain: userTenant.subdomain,
      role: user.role,
      ipAddress: '198.51.100.' + Math.floor(Math.random() * 250 + 1),
      device: 'Chrome / Windows 11 Pro',
      location: 'Chicago, USA',
      loginTime: new Date().toISOString()
    };
    setSessions(prev => [newSession, ...prev]);

    logSecurityEvent(user.tenantId, user.email, 'USER_LOGIN_SUCCESS', 'low', 
      `JSON Web Token issued successfully. Role Context: ${user.role}.`);
  };

  const getPermissionsForRole = (role: string): string[] => {
    switch (role) {
      case 'Super Admin':
        return ['*'];
      case 'Master Admin':
        return ['*'];
      case 'Pharmacy Admin':
        return ['tenant:write', 'user:write', 'inventory:write', 'medicine:write', 'purchase:write', 'prescription:write', 'sale:write', 'sale:read', 'audit:read', 'store:manage'];
      case 'Pharmacist':
        return ['inventory:read', 'medicine:read', 'prescription:write', 'prescription:approve', 'sale:write', 'sale:read', 'customer:write', 'pos:checkout'];
      case 'Store Manager':
        return ['inventory:write', 'medicine:write', 'purchase:write', 'sale:read'];
      case 'Cashier':
        return ['inventory:read', 'sale:write', 'customer:write', 'pos:checkout'];
      default:
        return ['inventory:read'];
    }
  };

  const handleCopyToken = () => {
    navigator.clipboard.writeText(jwtToken);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  // --- Decoded JWT logic for rendering ---
  const getDecodedPayload = () => {
    if (!jwtToken) return null;
    try {
      const parts = jwtToken.split('.');
      if (parts.length < 2) return null;
      return JSON.parse(atob(parts[1]));
    } catch {
      return null;
    }
  };

  const decodedPayload = getDecodedPayload();

  // --- Simulate Tenant Switch ---
  const handleTenantSwitch = (tenantId: string) => {
    const matched = userJoinedTenants.find(t => t.id === tenantId);
    if (!matched) return;

    setSelectedActiveTenant(tenantId);
    
    // Simulate reissue token for new tenant context
    if (decodedPayload) {
      const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" })).replace(/=/g, '');
      const updatedPayload = {
        ...decodedPayload,
        tenant_id: matched.id,
        subdomain: matched.subdomain,
        role: matched.role,
        permissions: getPermissionsForRole(matched.role),
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      };
      const payload = btoa(JSON.stringify(updatedPayload)).replace(/=/g, '');
      const signature = btoa("hmac_sha256_cryptographic_signature_matching_environment_secret_key").replace(/=/g, '').substring(0, 32);
      setJwtToken(`${header}.${payload}.${signature}`);

      logSecurityEvent(matched.id, decodedPayload.email, 'TENANT_SWITCH_SUCCESS', 'medium', 
        `User hot-switched database context to subdomain: ${matched.subdomain}. Clean isolation constraints verified.`);

      alert(`Security Gateway: Context Switched to '${matched.name}' (${matched.subdomain}). New isolated token generated.`);
    }
  };

  // --- Schema Table Content catalog ---
  const schemaTables = {
    tenants: {
      desc: 'Top-level global tenants registration directory. Stores unique identifier, branding, subdomain domain routes, and status state.',
      columns: [
        { name: 'id', type: 'UUID', constraint: 'PRIMARY KEY DEFAULT uuid_generate_v4()', desc: 'Immutable, globally unique key' },
        { name: 'name', type: 'VARCHAR(100)', constraint: 'NOT NULL', desc: 'Formal pharmaceutical company brand name' },
        { name: 'subdomain', type: 'VARCHAR(50)', constraint: 'NOT NULL UNIQUE', desc: 'DNS namespace routing key, regex validated [a-z0-9-]' },
        { name: 'status', type: 'VARCHAR(20)', constraint: "DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'trial_expired'))", desc: 'Monetization block lifecycle' },
        { name: 'branding_color', type: 'VARCHAR(7)', constraint: "DEFAULT '#0ea5e9'", desc: 'Hex custom UI branding code for login themes' },
        { name: 'address', type: 'TEXT', constraint: '', desc: 'Headquarters postal physical address' },
        { name: 'phone', type: 'VARCHAR(20)', constraint: '', desc: 'Contact corporate telephone' },
        { name: 'created_at', type: 'TIMESTAMP WITH TIME ZONE', constraint: 'DEFAULT CURRENT_TIMESTAMP NOT NULL', desc: 'Audit creation' },
        { name: 'updated_at', type: 'TIMESTAMP WITH TIME ZONE', constraint: 'DEFAULT CURRENT_TIMESTAMP NOT NULL', desc: 'Audit update' },
        { name: 'deleted_at', type: 'TIMESTAMP WITH TIME ZONE', constraint: 'NULL', desc: 'Soft-delete marker to support HIPAA compliance' }
      ],
      indexes: [
        { name: 'tenants_pkey', def: 'PRIMARY KEY (id)' },
        { name: 'uq_subdomain', def: 'UNIQUE INDEX (subdomain)' }
      ]
    },
    users: {
      desc: 'The corporate account ledger for pharmaceutical staff. Records are strictly locked within the parent tenant context.',
      columns: [
        { name: 'id', type: 'UUID', constraint: 'PRIMARY KEY', desc: 'Staff unique key' },
        { name: 'tenant_id', type: 'UUID', constraint: 'REFERENCES tenants(id) ON DELETE CASCADE', desc: 'Tenant isolation key' },
        { name: 'email', type: 'VARCHAR(100)', constraint: 'NOT NULL', desc: 'Account username' },
        { name: 'password_hash', type: 'VARCHAR(255)', constraint: 'NOT NULL', desc: 'Bcrypt encrypted credential storage' },
        { name: 'first_name', type: 'VARCHAR(50)', constraint: 'NOT NULL', desc: 'Staff given name' },
        { name: 'last_name', type: 'VARCHAR(50)', constraint: 'NOT NULL', desc: 'Staff family name' },
        { name: 'status', type: 'VARCHAR(20)', constraint: "DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'locked'))", desc: 'Verification status' },
        { name: 'created_at', type: 'TIMESTAMP WITH TIME ZONE', constraint: 'NOT NULL', desc: 'Audit creation' },
        { name: 'updated_at', type: 'TIMESTAMP WITH TIME ZONE', constraint: 'NOT NULL', desc: 'Audit update' },
        { name: 'deleted_at', type: 'TIMESTAMP WITH TIME ZONE', constraint: 'NULL', desc: 'Soft-delete marker' }
      ],
      indexes: [
        { name: 'idx_users_tenant', def: 'CREATE INDEX idx_users_tenant ON users (tenant_id) WHERE deleted_at IS NULL' },
        { name: 'uq_tenant_user_email', def: 'UNIQUE CONSTRAINT (tenant_id, email)' }
      ]
    },
    roles: {
      desc: 'System roles configured on a per-tenant basis. Controls system navigation access and authorization bindings.',
      columns: [
        { name: 'id', type: 'UUID', constraint: 'PRIMARY KEY', desc: 'Role key' },
        { name: 'tenant_id', type: 'UUID', constraint: 'REFERENCES tenants(id)', desc: 'Tenant isolation key' },
        { name: 'name', type: 'VARCHAR(50)', constraint: 'NOT NULL', desc: 'Role name e.g., Pharmacist, Store Manager' },
        { name: 'description', type: 'TEXT', constraint: '', desc: 'Role capabilities summary' },
        { name: 'deleted_at', type: 'TIMESTAMP WITH TIME ZONE', constraint: '', desc: 'Soft delete' }
      ],
      indexes: [
        { name: 'idx_roles_tenant', def: 'CREATE INDEX idx_roles_tenant ON roles (tenant_id) WHERE deleted_at IS NULL' },
        { name: 'uq_tenant_role_name', def: 'UNIQUE CONSTRAINT (tenant_id, name)' }
      ]
    },
    permissions: {
      desc: 'Granular ACL mappings linking permissions (such as medicine:create, sale:execute) to specific tenant roles.',
      columns: [
        { name: 'id', type: 'UUID', constraint: 'PRIMARY KEY', desc: 'Permission unique key' },
        { name: 'tenant_id', type: 'UUID', constraint: 'REFERENCES tenants(id)', desc: 'Tenant isolation key' },
        { name: 'role_id', type: 'UUID', constraint: 'REFERENCES roles(id)', desc: 'Role mapping reference' },
        { name: 'action', type: 'VARCHAR(100)', constraint: 'NOT NULL', desc: 'The specific permission claim string' }
      ],
      indexes: [
        { name: 'idx_permissions_tenant', def: 'CREATE INDEX idx_permissions_tenant ON permissions (tenant_id)' },
        { name: 'uq_tenant_role_action', def: 'UNIQUE CONSTRAINT (tenant_id, role_id, action)' }
      ]
    },
    inventory: {
      desc: 'The active physical batch storage of medicines tracked inside physical stores, isolated at tenant boundaries.',
      columns: [
        { name: 'id', type: 'UUID', constraint: 'PRIMARY KEY', desc: 'Inventory batch key' },
        { name: 'tenant_id', type: 'UUID', constraint: 'REFERENCES tenants(id)', desc: 'Tenant isolation key' },
        { name: 'pharmacy_id', type: 'UUID', constraint: 'REFERENCES pharmacies(id)', desc: 'Physical pharmacy store link' },
        { name: 'medicine_id', type: 'UUID', constraint: 'REFERENCES medicines(id)', desc: 'Drug master file reference' },
        { name: 'quantity', type: 'INTEGER', constraint: 'DEFAULT 0 CHECK (quantity >= 0)', desc: 'Active units in stock' },
        { name: 'price', type: 'DECIMAL(12,2)', constraint: 'NOT NULL', desc: 'POS checkout price' },
        { name: 'cost', type: 'DECIMAL(12,2)', constraint: 'NOT NULL', desc: 'Wholesale cost basis' },
        { name: 'expiry_date', type: 'DATE', constraint: 'NOT NULL', desc: 'Critical clinical expiry tracking' },
        { name: 'shelf_location', type: 'VARCHAR(50)', constraint: '', desc: 'Physical shelf map location code' }
      ],
      indexes: [
        { name: 'idx_inventory_tenant', def: 'CREATE INDEX idx_inventory_tenant ON inventory (tenant_id) WHERE deleted_at IS NULL' },
        { name: 'uq_batch_pharmacy_medicine_expiry', def: 'UNIQUE CONSTRAINT (tenant_id, pharmacy_id, medicine_id, expiry_date)' }
      ]
    },
    audit_logs: {
      desc: 'Immutable HIPAA-compliant ledger. Absolutely vital for tracking access to Protected Health Information (PHI) and clinical records.',
      columns: [
        { name: 'id', type: 'UUID', constraint: 'PRIMARY KEY DEFAULT uuid_generate_v4()', desc: 'Log item uuid' },
        { name: 'tenant_id', type: 'UUID', constraint: 'REFERENCES tenants(id) ON DELETE CASCADE', desc: 'Tenant context' },
        { name: 'user_id', type: 'UUID', constraint: 'REFERENCES users(id)', desc: 'Executing staff identifier' },
        { name: 'action', type: 'VARCHAR(100)', constraint: 'NOT NULL', desc: 'Audit claim action string' },
        { name: 'entity_name', type: 'VARCHAR(50)', constraint: 'NOT NULL', desc: 'Affected database table' },
        { name: 'entity_id', type: 'UUID', constraint: 'NOT NULL', desc: 'Primary key of modified record' },
        { name: 'old_values', type: 'JSONB', constraint: '', desc: 'Immutable snapshot of values before mutation' },
        { name: 'new_values', type: 'JSONB', constraint: '', desc: 'Immutable snapshot of values after mutation' },
        { name: 'ip_address', type: 'VARCHAR(45)', constraint: '', desc: 'IPv4/IPv6 address' },
        { name: 'created_at', type: 'TIMESTAMP WITH TIME ZONE', constraint: 'DEFAULT CURRENT_TIMESTAMP', desc: 'Log timestamp' }
      ],
      indexes: [
        { name: 'idx_audit_logs_tenant', def: 'CREATE INDEX idx_audit_logs_tenant ON audit_logs (tenant_id)' },
        { name: 'idx_audit_logs_entity', def: 'CREATE INDEX idx_audit_logs_entity ON audit_logs (entity_name, entity_id)' }
      ]
    }
  };

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 text-[10px] bg-indigo-50 text-indigo-600 font-extrabold uppercase rounded-lg border border-indigo-100 tracking-wider">
                SaaS Security Gate
              </span>
              <span className="px-2.5 py-1 text-[10px] bg-emerald-50 text-emerald-600 font-extrabold uppercase rounded-lg border border-emerald-100 tracking-wider">
                HIPAA Compliant
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight font-display mt-2">
              Multi-Tenant Security &amp; Cryptographic Identity Gateway
            </h2>
            <p className="text-xs text-slate-500 max-w-4xl font-medium">
              A comprehensive blueprint architecture simulating tenant registration, granular roles, JWT multi-tenant token validation, physical/logical data isolation boundaries, and real-time HIPAA clinical audit logs.
            </p>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl hidden md:block">
            <Fingerprint className="h-8 w-8 text-indigo-500 animate-pulse" />
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-100 mt-6 gap-2">
          <button
            onClick={() => setActiveSubTab('playground')}
            className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'playground'
                ? 'border-indigo-500 text-indigo-600 font-extrabold'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Terminal className="h-4 w-4" />
            Active Security Playground
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* ====================================================================================
            TAB: INTERACTIVE SECURITY PLAYGROUND
            ==================================================================================== */}
        {activeSubTab === 'playground' && (
          <motion.div
            key="playground"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6"
          >
            {/* LEFT COLUMN: ACTIVE INTERACTIVE SIMULATION CONTROL PANELS */}
            <div className="lg:col-span-8 space-y-6">

              {/* Box 2: Auth Flow Sim Card */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs relative">
                <div className="absolute top-4 right-4 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span>
                  <span className="text-[9px] font-mono font-bold text-slate-400">ACTIVE GATEWAY</span>
                </div>

                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <Lock className="h-5 w-5 text-indigo-500" />
                  <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wide">
                    Logical Access Authentication Pipeline
                  </h3>
                </div>

                {/* STEP 2.1: Basic User Credentials Form */}
                {currentStep === 'input' && (
                  <form onSubmit={handleLoginSubmit} className="space-y-4 mt-4">
                    <p className="text-xs text-slate-400">
                      Simulate a pharmacy clinician logging in. Try changing emails to see different security rules (e.g., unverified vs 2FA requirements).
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase block">Clinician Email Address</label>
                        <input 
                          type="email" 
                          required
                          value={loginEmail}
                          onChange={e => setLoginEmail(e.target.value)}
                          placeholder="user@pharmacy.com"
                          className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase block">Password</label>
                        <input 
                          type="password" 
                          required
                          value={loginPassword}
                          onChange={e => setLoginPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 flex items-start gap-2 text-[10px] text-slate-500">
                      <Info className="h-4 w-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-bold text-slate-700">Pre-seeded simulation accounts:</span>
                        <ul className="list-disc pl-3.5 mt-0.5 space-y-0.5">
                          <li><strong>sarah.lin@downtownpharma.com</strong> (Verified + 2FA Enforced, Pharmacy Admin)</li>
                          <li><strong>james.cash@downtownpharma.com</strong> (Verified, No 2FA, Cashier)</li>
                          <li><strong>dr.strange@carefirstmeds.com</strong> (Verified + 2FA Enforced, Pharmacist)</li>
                          <li><strong>junubposcenter@gmail.com</strong> (password: Reagantekki01, Master Admin Account)</li>
                        </ul>
                      </div>
                    </div>

                    <button 
                      type="submit"
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2"
                    >
                      Authenticate Credentials &rarr;
                    </button>
                  </form>
                )}

                {/* STEP 2.2: Email Verification Sim */}
                {currentStep === 'verify_email' && selectedUser && (
                  <div className="space-y-4 mt-4 text-center p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                    <div className="w-12 h-12 bg-amber-50 border border-amber-100 text-amber-500 rounded-full flex items-center justify-center mx-auto shadow-xs">
                      <ShieldAlert className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-900 text-sm">Mandatory Email Verification Required</h4>
                      <p className="text-xs text-slate-500 max-w-md mx-auto">
                        For HIPAA compliance, staff accounts created by pharmacy administrators cannot access the systems until their registration email ownership is cryptographically validated.
                      </p>
                    </div>

                    <div className="bg-white p-4 border border-slate-150 rounded-xl inline-block text-left w-full max-w-sm">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Simulated Outbox</p>
                      <div className="border-t border-slate-100 pt-2 mt-1 space-y-1 font-mono text-[11px]">
                        <p><strong>To:</strong> {selectedUser.email}</p>
                        <p><strong>Subject:</strong> [Junub Pharmacare] Action Required: Verify Account</p>
                        <p className="text-sky-600 font-bold underline mt-2 cursor-pointer" onClick={simulateEmailClick}>
                          https://auth.junubpharmacare.com/verify?token=cryptographic_token_verify_staff_uuid
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3 justify-center pt-2">
                      <button 
                        onClick={() => setCurrentStep('input')}
                        className="px-4 py-2 border border-slate-200 hover:bg-white text-slate-600 text-xs font-bold rounded-xl transition-all"
                      >
                        &larr; Back to login
                      </button>
                      <button 
                        onClick={simulateEmailClick}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
                      >
                        Simulate Link Click
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 2.3: MFA/TOTP Code Input */}
                {currentStep === 'mfa' && selectedUser && (
                  <form onSubmit={handleVerifyTOTP} className="space-y-4 mt-4">
                    <div className="flex items-center gap-3 bg-indigo-50 p-3.5 border border-indigo-100 rounded-xl">
                      <div className="bg-indigo-500 text-white p-2 rounded-lg">
                        <Fingerprint className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-indigo-950 text-xs">Two-Factor Authenticator Enforced (TOTP)</h4>
                        <p className="text-[10px] text-indigo-700">Account security policy dictates secondary validation.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                      <div className="space-y-2 text-center md:text-left border-b md:border-b-0 md:border-r border-slate-100 pb-4 md:pb-0 md:pr-4">
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Scan this simulated key in Google Authenticator or Microsoft Authenticator, or type the numeric validation code.
                        </p>
                        <div className="inline-block p-2.5 bg-white border border-slate-250 rounded-xl mt-1 shadow-xs">
                          {/* Simulated QR Code graphic */}
                          <div className="w-24 h-24 bg-slate-900 rounded-lg flex items-center justify-center text-white border-2 border-slate-800">
                            <span className="text-[10px] font-mono tracking-widest leading-none text-center">
                              [QR]<br/>TOTP_JP<br/>CODE
                            </span>
                          </div>
                        </div>
                        <p className="text-[10px] font-mono font-bold text-slate-400 uppercase mt-1">
                          Secret: {selectedUser.mfaSecret}
                        </p>
                      </div>

                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase block">6-Digit Verification Code</label>
                          <input 
                            type="text" 
                            required
                            maxLength={6}
                            value={mfaCode}
                            onChange={e => setMfaCode(e.target.value.replace(/[^0-9]/g, ''))}
                            placeholder="e.g. 123456"
                            className="w-full text-center text-lg font-mono tracking-widest px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                          />
                        </div>

                        {mfaError && (
                          <p className="text-[10px] font-semibold text-rose-600 bg-rose-50 border border-rose-100 p-2 rounded-lg text-center font-mono">
                            {mfaError}
                          </p>
                        )}

                        <div className="bg-slate-50 p-2.5 rounded-xl text-[10px] text-slate-400 font-mono text-center">
                          Simulation: Type any 6-digit code or <span className="font-bold text-slate-600">123456</span> to pass.
                        </div>

                        <div className="flex gap-2">
                          <button 
                            type="button"
                            onClick={() => setCurrentStep('input')}
                            className="flex-1 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl transition-all"
                          >
                            Cancel
                          </button>
                          <button 
                            type="submit"
                            className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
                          >
                            Verify TOTP &rarr;
                          </button>
                        </div>
                      </div>
                    </div>
                  </form>
                )}

                {/* STEP 2.4: Token Issuance / JWT Inspection */}
                {currentStep === 'jwt' && decodedPayload && (
                  <div className="space-y-4 mt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-emerald-700 text-[11px] font-mono bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-xl">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        <span>Authentication Granted</span>
                      </div>
                      <button 
                        onClick={() => setCurrentStep('input')}
                        className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                      >
                        Reset &amp; Login Again
                      </button>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Multi-Tenant JWT Cryptographic Token</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        The backend signs an immutable JSON Web Token (JWT) on success. It contains structural security claims ensuring absolute isolation.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                      {/* Token Copy Column */}
                      <div className="md:col-span-5 space-y-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Encoded Token</span>
                        <div className="p-3 bg-slate-950 text-slate-200 rounded-xl font-mono text-[9px] break-all border border-slate-900 leading-normal max-h-48 overflow-y-auto relative select-all">
                          <button 
                            onClick={handleCopyToken}
                            className="absolute top-2 right-2 p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 transition-all cursor-pointer"
                            title="Copy encoded JWT"
                          >
                            {copiedToken ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                          </button>
                          <span className="text-red-400">{jwtToken.split('.')[0]}</span>.
                          <span className="text-sky-400">{jwtToken.split('.')[1]}</span>.
                          <span className="text-emerald-400">{jwtToken.split('.')[2]}</span>
                        </div>
                        <div className="text-[9px] text-slate-400 leading-relaxed flex items-start gap-1 font-mono">
                          <Info className="h-3 w-3 text-sky-500 flex-shrink-0 mt-0.5" />
                          <span>Colors mark: <strong className="text-red-400">Header</strong>, <strong className="text-sky-400">Claims Payload</strong>, &amp; <strong className="text-emerald-400">HmacSignature</strong>.</span>
                        </div>
                      </div>

                      {/* Claims Decoder Column */}
                      <div className="md:col-span-7 space-y-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Decoded Active Security Claims</span>
                        <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl space-y-3">
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div className="space-y-1">
                              <span className="text-[9px] font-extrabold text-slate-400 block uppercase tracking-wider">Tenant Isolation Key</span>
                              <div className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono text-[11px] text-indigo-700 font-bold">
                                tenant_id: "{decodedPayload.tenant_id}"
                              </div>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[9px] font-extrabold text-slate-400 block uppercase tracking-wider">Role Context</span>
                              <div className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono text-[11px] text-slate-800 font-bold">
                                role: "{decodedPayload.role}"
                              </div>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <span className="text-[9px] font-extrabold text-slate-400 block uppercase tracking-wider">Granular RBAC Claims</span>
                            <div className="flex flex-wrap gap-1">
                              {decodedPayload.permissions.map((p: string) => (
                                <span key={p} className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-md font-mono text-[10px] font-bold">
                                  {p}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="border-t border-slate-100 pt-3 space-y-1 font-mono text-[10px] text-slate-400">
                            <p><strong>Subdomain Route:</strong> {decodedPayload.subdomain}.jubupharma.com</p>
                            <p><strong>Clinician:</strong> {decodedPayload.email}</p>
                            <p><strong>Session ID:</strong> {decodedPayload.session_id}</p>
                            <p><strong>Expires At:</strong> {new Date(decodedPayload.exp * 1000).toLocaleTimeString()}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Step 2.5: Simulate Multi-Tenant Switching */}
                    <div className="bg-slate-900 text-slate-200 p-4 rounded-xl border border-slate-800 mt-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 text-sky-400 animate-spin" />
                        <h5 className="text-xs font-bold uppercase tracking-wider text-white">Cross-Tenant Identity Switching</h5>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Many clinical pharmacists consult across multiple drug networks. Rather than logging out, the control gate permits swapping tenant context if pre-authorized, instantly generating a new cryptographic token.
                      </p>
                      
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-extrabold uppercase text-slate-400">Switch Context:</span>
                        <div className="flex-1 grid grid-cols-2 gap-2">
                          {userJoinedTenants.map(t => (
                            <button
                              key={t.id}
                              onClick={() => handleTenantSwitch(t.id)}
                              className={`py-1.5 px-3 rounded-lg text-left text-[11px] font-mono transition-all flex items-center justify-between border cursor-pointer ${
                                selectedActiveTenant === t.id 
                                  ? 'bg-sky-500/10 border-sky-500/40 text-sky-400 font-bold' 
                                  : 'bg-slate-800 border-slate-700 hover:border-slate-600 text-slate-300'
                              }`}
                            >
                              <span>{t.subdomain} ({t.role.split(' ')[0]})</span>
                              {selectedActiveTenant === t.id && <div className="w-1.5 h-1.5 bg-sky-400 rounded-full"></div>}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: REALTTIME HIPAA SECURITY AUDIT LOG LEDGER */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs h-full flex flex-col min-h-[500px]">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-rose-500 animate-pulse" />
                    <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wide">
                      HIPAA Audit Logs
                    </h3>
                  </div>
                  <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-600 rounded text-[9px] font-mono font-bold uppercase">
                    IMMUTABLE
                  </span>
                </div>

                <p className="text-[11px] text-slate-500 mt-2">
                  HIPAA Section §164.312(b) dictates absolute tracking of logical access. Every validation, sign-on attempt, and metadata switch must be securely logged.
                </p>

                <div className="flex-1 overflow-y-auto mt-4 space-y-3 max-h-[420px] pr-1.5 font-mono">
                  {auditLogs.map(log => (
                    <div 
                      key={log.id} 
                      className={`p-3 rounded-xl border text-[10px] space-y-1.5 transition-all relative ${
                        log.severity === 'critical' ? 'bg-rose-50/70 border-rose-150 text-rose-950' :
                        log.severity === 'high' ? 'bg-orange-50/70 border-orange-150 text-orange-950' :
                        log.severity === 'medium' ? 'bg-amber-50/70 border-amber-150 text-amber-950' :
                        'bg-slate-50 border-slate-150 text-slate-700'
                      }`}
                    >
                      {/* Log meta header */}
                      <div className="flex justify-between items-center text-[9px] text-slate-400 font-bold border-b border-slate-100 pb-1">
                        <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                        <span>IP: {log.ipAddress}</span>
                      </div>

                      {/* Action status */}
                      <div className="flex items-center justify-between">
                        <strong className="font-extrabold tracking-tight">{log.action}</strong>
                        <span className={`px-1.5 py-0.25 text-[8px] font-bold uppercase rounded-md border ${
                          log.severity === 'critical' ? 'bg-rose-100 border-rose-200 text-rose-700' :
                          log.severity === 'high' ? 'bg-orange-100 border-orange-200 text-orange-700' :
                          log.severity === 'medium' ? 'bg-amber-100 border-amber-200 text-amber-700' :
                          'bg-slate-200 border-slate-250 text-slate-600'
                        }`}>
                          {log.severity}
                        </span>
                      </div>

                      {/* Detail */}
                      <p className="text-[10px] text-slate-600 leading-normal">{log.details}</p>

                      {/* Actor */}
                      <div className="text-[9px] text-indigo-700 font-semibold truncate pt-1">
                        Actor: {log.user}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-slate-100 pt-3 mt-4 text-[10px] text-slate-400 flex items-center justify-between font-mono">
                  <span>Logs Saved: {auditLogs.length}</span>
                  <button 
                    onClick={() => {
                      logAuditEvent('User Activity', 'AUDIT_LOGS_VIEW_RESET', 'Cleared UI filter view on clinical audit ledger', 'low');
                    }}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer underline text-[9px]"
                  >
                    Reset View
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ====================================================================================
            TAB: SQL SCHEMA INSPECTOR
            ==================================================================================== */}
        {activeSubTab === 'schema' && (
          <motion.div
            key="schema"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6"
          >
            {/* Table Selection Sidebar */}
            <div className="lg:col-span-3 space-y-2">
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Database Tables Catalog
                </span>
                <nav className="space-y-1">
                  {Object.keys(schemaTables).map((tabName) => (
                    <button
                      key={tabName}
                      onClick={() => setSelectedTable(tabName)}
                      className={`w-full text-left text-xs px-3 py-2.5 rounded-lg transition-all font-mono font-medium flex items-center justify-between border cursor-pointer ${
                        selectedTable === tabName
                          ? 'bg-indigo-50 border-indigo-150 text-indigo-700 font-bold'
                          : 'bg-transparent border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-950'
                      }`}
                    >
                      <span>{tabName}</span>
                      <ArrowRight className={`h-3 w-3 opacity-0 transition-opacity ${selectedTable === tabName ? 'opacity-100' : ''}`} />
                    </button>
                  ))}
                </nav>
              </div>

              <div className="bg-slate-900 text-slate-300 p-4 rounded-2xl space-y-2">
                <span className="text-[10px] font-mono font-bold text-sky-400 uppercase block tracking-wider">
                  PostgreSQL Context
                </span>
                <p className="text-[10px] leading-relaxed text-slate-400">
                  The complete 21-table SQL schema is deployed inside <span className="font-mono text-slate-200">/src/db/pharmacy_schema.sql</span>. 
                  Every database record integrates soft delete vectors and isolated indexes.
                </p>
              </div>
            </div>

            {/* Columns Inspection & Index panel */}
            <div className="lg:col-span-9 space-y-6">
              {/* Table Schema breakdown */}
              {Object.entries(schemaTables).map(([tableName, tableDetails]) => {
                if (selectedTable !== tableName) return null;
                return (
                  <div key={tableName} className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                    <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="text-base font-extrabold text-slate-900 font-mono flex items-center gap-2">
                          <Database className="h-5 w-5 text-indigo-500" />
                          TABLE {tableName}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1 max-w-2xl">{tableDetails.desc}</p>
                      </div>
                      <span className="px-2.5 py-1 text-[10px] bg-slate-50 border border-slate-200 text-slate-600 rounded-lg font-mono">
                        Columns: {tableDetails.columns.length}
                      </span>
                    </div>

                    {/* Columns table representation */}
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 font-bold border-b border-slate-200 text-slate-700">
                            <th className="p-3">Column Name</th>
                            <th className="p-3">Data Type</th>
                            <th className="p-3">Constraint / Default</th>
                            <th className="p-3">Architect Notes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {tableDetails.columns.map(col => (
                            <tr key={col.name} className="hover:bg-slate-50/50 font-mono text-[11px]">
                              <td className="p-3 font-bold text-slate-900">{col.name}</td>
                              <td className="p-3 text-indigo-600 font-bold">{col.type}</td>
                              <td className="p-3 text-slate-500">{col.constraint || <span className="text-slate-300">-</span>}</td>
                              <td className="p-3 text-slate-400 font-sans">{col.desc}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Indexes summary */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                        Performance &amp; Isolation Indexes
                      </h4>
                      <div className="space-y-1">
                        {tableDetails.indexes.map(idx => (
                          <div key={idx.name} className="p-3 bg-slate-50 border border-slate-150 rounded-xl flex items-center justify-between font-mono text-[10px]">
                            <div className="flex items-center gap-1.5">
                              <Terminal className="h-3.5 w-3.5 text-slate-400" />
                              <strong className="text-slate-700">{idx.name}:</strong>
                              <span className="text-slate-500">{idx.def}</span>
                            </div>
                            <span className="text-[9px] bg-sky-50 text-sky-700 px-2 rounded-md font-sans border border-sky-100 font-bold uppercase">
                              Active
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* General 21 Tables Schema blueprint outline */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
                <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wide mb-4">
                  Full 21 Tables Architectural Relationships (ERD)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl space-y-2">
                    <span className="text-[10px] font-bold text-indigo-600 block uppercase tracking-wider">1. Tenant Registry &amp; RBAC</span>
                    <ul className="text-xs text-slate-500 space-y-1 pl-4 list-disc font-medium">
                      <li><strong>tenants:</strong> The SaaS root account</li>
                      <li><strong>subscriptions:</strong> Licenses mapping billing</li>
                      <li><strong>users:</strong> Staff identities</li>
                      <li><strong>roles:</strong> Staff permission groups</li>
                      <li><strong>permissions:</strong> Actions (e.g., drug:create)</li>
                    </ul>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl space-y-2">
                    <span className="text-[10px] font-bold text-indigo-600 block uppercase tracking-wider">2. Supply Chain &amp; Clinicals</span>
                    <ul className="text-xs text-slate-500 space-y-1 pl-4 list-disc font-medium">
                      <li><strong>pharmacies:</strong> Location physical branches</li>
                      <li><strong>suppliers:</strong> restock wholesalers</li>
                      <li><strong>medicines:</strong> Master catalog of drugs</li>
                      <li><strong>categories:</strong> classifications</li>
                      <li><strong>inventory:</strong> batches with expiry dates</li>
                    </ul>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl space-y-2">
                    <span className="text-[10px] font-bold text-indigo-600 block uppercase tracking-wider">3. Transactions &amp; Auditing</span>
                    <ul className="text-xs text-slate-500 space-y-1 pl-4 list-disc font-medium">
                      <li><strong>sales &amp; items:</strong> Checkout tracking</li>
                      <li><strong>purchases:</strong> stock restocking orders</li>
                      <li><strong>prescriptions:</strong> Doctor clearances</li>
                      <li><strong>invoices &amp; payments:</strong> Cash registers</li>
                      <li><strong>audit_logs:</strong> HIPAA immutable trail</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ====================================================================================
            TAB: ISOLATION COMPARISON
            ==================================================================================== */}
        {activeSubTab === 'comparison' && (
          <motion.div
            key="comparison"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            {/* Rationale Comparison Header */}
            <div className="bg-indigo-950 text-indigo-100 p-6 rounded-2xl border border-indigo-900 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <Server className="h-48 w-48 text-indigo-300" />
              </div>
              <h3 className="text-base font-extrabold uppercase tracking-wider text-sky-400">
                Architectural Rationale: Multi-Tenant Schema Separation Tiers
              </h3>
              <p className="text-xs text-indigo-200 max-w-4xl mt-1.5 leading-relaxed">
                As a Principal Database Architect, determining how to partition clinical data depends entirely on compliance requirements (HIPAA, GDPR), security policies, and target operational cost. We implement three separate tiers inside our Pharmacy SaaS platform.
              </p>
            </div>

            {/* Three Blocks Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Tier 1 */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-600 text-[9px] font-bold rounded">
                      STARTER PLAN
                    </span>
                    <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                  </div>
                  <h4 className="text-sm font-extrabold text-slate-900 uppercase">
                    Shared Database / Shared Table Schema
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    All tenant records are grouped within identical global tables. Records are filtered strictly in the query planner using a composite <code className="bg-slate-50 px-1 py-0.5 rounded font-mono text-[11px]">tenant_id</code> column.
                  </p>
                  
                  <div className="border-t border-slate-100 pt-3 space-y-1.5">
                    <span className="text-[10px] font-bold text-emerald-600 block uppercase">Pros:</span>
                    <p className="text-[11px] text-slate-500">Maximum compute density, fast backups of a single global file, simple migrations.</p>
                    <span className="text-[10px] font-bold text-rose-600 block uppercase">Cons:</span>
                    <p className="text-[11px] text-slate-500">Risk of programmatic bugs leaking data (cross-tenant leakage) if the developer forgets to append tenant clauses.</p>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 mt-4 text-[10px] font-semibold text-indigo-700 font-mono text-center">
                  dbIsolationMode: shared_schema_tenant_id
                </div>
              </div>

              {/* Tier 2 */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between border-t-4 border-t-indigo-500">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-600 text-[9px] font-bold rounded">
                      PROFESSIONAL (RECOMMENDED)
                    </span>
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                  </div>
                  <h4 className="text-sm font-extrabold text-slate-900 uppercase">
                    Shared Database / Separate Postgres Schema
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    One unified database file, but every tenant is provisioned with a secure, isolated PostgreSQL namespace schema (<code className="bg-slate-50 px-1 py-0.5 rounded font-mono text-[11px]">tenant_name</code>). Search path restricts access.
                  </p>
                  
                  <div className="border-t border-slate-100 pt-3 space-y-1.5">
                    <span className="text-[10px] font-bold text-emerald-600 block uppercase">Pros:</span>
                    <p className="text-[11px] text-slate-500">Harder separation: schemas are secured at database level. Zero chance of simple SQL queries accidentally leaking rows.</p>
                    <span className="text-[10px] font-bold text-rose-600 block uppercase">Cons:</span>
                    <p className="text-[11px] text-slate-500">Database migrations are tedious as DDL tables must be altered individually across hundreds of schemas.</p>
                  </div>
                </div>

                <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-150 mt-4 text-[10px] font-semibold text-indigo-700 font-mono text-center">
                  dbIsolationMode: schema_per_tenant
                </div>
              </div>

              {/* Tier 3 */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-sky-50 border border-sky-100 text-sky-600 text-[9px] font-bold rounded">
                      ENTERPRISE / HIGH-COMPLIANCE
                    </span>
                    <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                  </div>
                  <h4 className="text-sm font-extrabold text-slate-900 uppercase">
                    Fully Separate Database per Tenant
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Absolute boundaries. Every pharmacy enterprise has a dedicated Google Cloud SQL instance, isolated file storage disk, and individual backup procedures.
                  </p>
                  
                  <div className="border-t border-slate-100 pt-3 space-y-1.5">
                    <span className="text-[10px] font-bold text-emerald-600 block uppercase">Pros:</span>
                    <p className="text-[11px] text-slate-500">Ultimate security guarantees. HIPAA / Hospital Network approval is rapid. Supports custom keys (BYOK).</p>
                    <span className="text-[10px] font-bold text-rose-600 block uppercase">Cons:</span>
                    <p className="text-[11px] text-slate-500">Extremely expensive. High resource footprint. Running consolidated tenant dashboards is highly complex.</p>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 mt-4 text-[10px] font-semibold text-indigo-700 font-mono text-center">
                  dbIsolationMode: database_per_tenant
                </div>
              </div>

            </div>

            {/* Verdict */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Architect Verdict &amp; Industry Norms</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                For a standard pharmacy SaaS, the **Shared Database / Separate Schema** (Professional Tier) represents the optimal balance of speed, cost, and safety. PostgreSQL schemas allow you to safely run multiple tenants under single database computing constraints while guaranteeing that an authorization bug in your web app code can never query patient health information (PHI) belonging to another clinical brand.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
