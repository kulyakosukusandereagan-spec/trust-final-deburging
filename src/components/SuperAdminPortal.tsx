import React, { useState } from 'react';
import { 
  Building2, ShieldAlert, ShieldCheck, DollarSign, Server, CheckCircle2, CheckCircle,
  CloudLightning, Users, Settings, Key, Database, Activity, Bell, FileText, 
  RefreshCw, Play, Pause, TrendingUp, Plus, Search, Trash2, Edit3, Filter, 
  Check, Lock, Unlock, Send, Layers, HelpCircle, ArrowRight, Eye, EyeOff, 
  Sparkles, Code, Info, Terminal, LayoutGrid, CheckSquare, XCircle, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// ====================================================================================
// Type Definitions
// ====================================================================================
interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  status: 'active' | 'suspended' | 'trial_expired';
  plan: 'starter' | 'professional' | 'enterprise';
  billingCycle: 'monthly' | 'annual';
  registeredAt: string;
  dbIsolationMode: 'shared_schema_tenant_id' | 'schema_per_tenant' | 'database_per_tenant';
  activePharmacies: number;
  maxPharmacies: number;
  activeUsers: number;
  maxUsers: number;
  apiRequestsToday: number;
  storageMB: number;
  monthlyRevenue: number;
}

interface SaaSPlan {
  id: 'starter' | 'professional' | 'enterprise';
  name: string;
  priceMonthly: number;
  priceAnnual: number;
  maxPharmacies: number;
  maxUsers: number;
  features: string[];
}

interface AdminAuditLog {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  tenant: string;
  ipAddress: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface SuperAdminPortalProps {
  tenants?: any[];
  setTenants?: React.Dispatch<React.SetStateAction<any[]>>;
  activeTenantId?: string;
  setActiveTenantId?: (id: string) => void;
}

export default function SuperAdminPortal({ tenants: propTenants, setTenants: propSetTenants }: SuperAdminPortalProps = {}) {
  // --- Simulated Super Admin State ---
  const [localTenants, setLocalTenants] = useState<Tenant[]>([
    {
      id: "tenant-downtown",
      name: "Downtown Pharma Care",
      subdomain: "downtown",
      status: "active",
      plan: "starter",
      billingCycle: "monthly",
      registeredAt: "2026-03-15T10:00:00Z",
      dbIsolationMode: "shared_schema_tenant_id",
      activePharmacies: 2,
      maxPharmacies: 3,
      activeUsers: 4,
      maxUsers: 5,
      apiRequestsToday: 12450,
      storageMB: 420,
      monthlyRevenue: 149
    },
    {
      id: "tenant-carefirst",
      name: "CareFirst Meds & Wellness",
      subdomain: "carefirst",
      status: "active",
      plan: "professional",
      billingCycle: "annual",
      registeredAt: "2025-07-20T14:30:00Z",
      dbIsolationMode: "schema_per_tenant",
      activePharmacies: 5,
      maxPharmacies: 10,
      activeUsers: 14,
      maxUsers: 25,
      apiRequestsToday: 89430,
      storageMB: 2150,
      monthlyRevenue: 349
    },
    {
      id: "tenant-stjude",
      name: "St. Jude Clinical Pharmacy",
      subdomain: "stjude",
      status: "suspended",
      plan: "enterprise",
      billingCycle: "annual",
      registeredAt: "2024-01-10T08:15:00Z",
      dbIsolationMode: "database_per_tenant",
      activePharmacies: 12,
      maxPharmacies: 999, // unlimited
      activeUsers: 45,
      maxUsers: 999, // unlimited
      apiRequestsToday: 324100,
      storageMB: 12400,
      monthlyRevenue: 999
    },
    {
      id: "tenant-apex",
      name: "Apex Biotech Rx",
      subdomain: "apex-rx",
      status: "active",
      plan: "professional",
      billingCycle: "monthly",
      registeredAt: "2026-05-18T16:20:00Z",
      dbIsolationMode: "schema_per_tenant",
      activePharmacies: 4,
      maxPharmacies: 10,
      activeUsers: 11,
      maxUsers: 25,
      apiRequestsToday: 42100,
      storageMB: 1420,
      monthlyRevenue: 399
    }
  ]);

  const tenants = propTenants || localTenants;
  const setTenants = propSetTenants || setLocalTenants;

  const [plans, setPlans] = useState<SaaSPlan[]>([
    {
      id: 'starter',
      name: 'Starter Tier',
      priceMonthly: 149,
      priceAnnual: 119,
      maxPharmacies: 3,
      maxUsers: 5,
      features: ['Shared schema separation', 'Max 3 stores', 'E-Prescribing standard', 'Local POS logging']
    },
    {
      id: 'professional',
      name: 'Professional Tier',
      priceMonthly: 399,
      priceAnnual: 319,
      maxPharmacies: 10,
      maxUsers: 25,
      features: ['PostgreSQL separate schema', 'Multi-Store inventory sync', 'Custom domain mapping', 'Role-Based access keys']
    },
    {
      id: 'enterprise',
      name: 'Enterprise Tier',
      priceMonthly: 999,
      priceAnnual: 799,
      maxPharmacies: 999,
      maxUsers: 999,
      features: ['Physical database container isolation', 'Unlimited physical locations', 'Custom SLA commitments', 'Full HIPAA compliance logs']
    }
  ]);

  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([
    { id: 'ad-1', timestamp: '2026-07-13T08:12:10Z', actor: 'super.admin@jubupharma.com', action: 'TENANT_SUSPEND', tenant: 'St. Jude Clinical Pharmacy', ipAddress: '198.51.100.12', severity: 'high' },
    { id: 'ad-2', timestamp: '2026-07-13T07:45:20Z', actor: 'super.admin@jubupharma.com', action: 'BROADCAST_EMERGENCY_ALERT', tenant: 'All Tenants', ipAddress: '198.51.100.12', severity: 'critical' },
    { id: 'ad-3', timestamp: '2026-07-13T06:22:15Z', actor: 'system-billing@jubupharma.com', action: 'SUBSCRIPTION_RENEWAL_SUCCESS', tenant: 'CareFirst Meds & Wellness', ipAddress: 'localhost', severity: 'low' },
    { id: 'ad-4', timestamp: '2026-07-12T18:30:11Z', actor: 'super.admin@jubupharma.com', action: 'PLAN_LIMIT_UPDATE', tenant: 'Starter Tier Pricing Update', ipAddress: '198.51.100.12', severity: 'medium' }
  ]);

  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastType, setBroadcastType] = useState<'system_notice' | 'billing' | 'maintenance'>('maintenance');
  const [broadcastTarget, setBroadcastTarget] = useState<'all' | 'starter' | 'professional' | 'enterprise'>('all');
  const [broadcastSuccess, setBroadcastSuccess] = useState(false);

  // --- Sub tabs ---
  const [activeTab, setActiveTab] = useState<'tenants' | 'billing' | 'system' | 'packages' | 'security'>('tenants');
  const [searchQuery, setSearchQuery] = useState('');

  // --- Calculations for Widgets ---
  const totalTenantsCount = tenants.length;
  const activeTenantsCount = tenants.filter(t => t.status === 'active').length;
  const suspendedTenantsCount = tenants.filter(t => t.status === 'suspended').length;
  const totalMonthlyMRR = tenants
    .filter(t => t.status === 'active')
    .reduce((sum, t) => sum + (t.monthlyRevenue ?? 0), 0);

  const totalApiRequests = tenants.reduce((sum, t) => sum + (t.apiRequestsToday ?? 0), 0);
  const totalStorageUsed = (tenants.reduce((sum, t) => sum + (t.storageMB ?? 0), 0) / 1024).toFixed(2);

  // --- Handlers ---
  const handleToggleTenantStatus = (tenantId: string) => {
    setTenants(prev => prev.map(t => {
      if (t.id === tenantId) {
        const nextStatus = t.status === 'active' ? 'suspended' : 'active';
        
        // Log action
        const newLog: AdminAuditLog = {
          id: `ad-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
          actor: 'super.admin@jubupharma.com',
          action: nextStatus === 'suspended' ? 'TENANT_SUSPEND' : 'TENANT_ACTIVATE',
          tenant: t.name,
          ipAddress: '198.51.100.12',
          severity: nextStatus === 'suspended' ? 'high' : 'medium'
        };
        setAuditLogs(logs => [newLog, ...logs]);

        return { ...t, status: nextStatus };
      }
      return t;
    }));
  };

  const handleUpdatePlanLimit = (planId: 'starter' | 'professional' | 'enterprise', field: 'priceMonthly' | 'maxPharmacies' | 'maxUsers', value: number) => {
    setPlans(prev => prev.map(p => {
      if (p.id === planId) {
        // Log action
        const newLog: AdminAuditLog = {
          id: `ad-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
          actor: 'super.admin@jubupharma.com',
          action: 'PLAN_LIMIT_UPDATE',
          tenant: `${p.name} - ${field} set to ${value}`,
          ipAddress: '198.51.100.12',
          severity: 'medium'
        };
        setAuditLogs(logs => [newLog, ...logs]);

        return { ...p, [field]: value };
      }
      return p;
    }));
  };

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMessage) return;

    // Log Action
    const newLog: AdminAuditLog = {
      id: `ad-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      actor: 'super.admin@jubupharma.com',
      action: 'BROADCAST_ALERT',
      tenant: `Target: ${broadcastTarget.toUpperCase()} | Type: ${broadcastType.toUpperCase()}`,
      ipAddress: '198.51.100.12',
      severity: 'critical'
    };
    setAuditLogs(logs => [newLog, ...logs]);

    setBroadcastSuccess(true);
    setTimeout(() => {
      setBroadcastSuccess(false);
      setBroadcastMessage('');
    }, 3000);
  };

  // Filter tenants based on search query
  const filteredTenants = tenants.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.subdomain.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 text-[10px] bg-red-50 text-red-600 font-extrabold uppercase rounded-lg border border-red-100 tracking-wider flex items-center gap-1">
                <ShieldAlert className="h-3 w-3 animate-pulse" />
                SaaS Super Admin Context
              </span>
              <span className="px-2.5 py-1 text-[10px] bg-indigo-50 text-indigo-600 font-extrabold uppercase rounded-lg border border-indigo-100 tracking-wider">
                Multi-Tenant Root Control
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight font-display mt-2">
              Junub Pharmacare Control Center &amp; Tenant Orchestrator
            </h2>
            <p className="text-xs text-slate-500 max-w-4xl font-medium">
              Global operations dashboard for activating tenants, provisioning subscriptions, observing live storage quotas, managing system-wide software pricing matrices, and issuing system-wide notifications.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-slate-50 border border-slate-150 px-3.5 py-2 rounded-xl text-center">
              <p className="text-[9px] font-bold text-slate-400 uppercase">Live Connections</p>
              <p className="text-sm font-extrabold text-slate-900 font-mono flex items-center justify-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                184
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-100 mt-6 gap-2 overflow-x-auto whitespace-nowrap">
          <button
            onClick={() => setActiveTab('tenants')}
            className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
              activeTab === 'tenants'
                ? 'border-red-500 text-red-600 font-extrabold'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Building2 className="h-4 w-4" />
            Tenants Directory ({filteredTenants.length})
          </button>
          <button
            onClick={() => setActiveTab('billing')}
            className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
              activeTab === 'billing'
                ? 'border-red-500 text-red-600 font-extrabold'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <DollarSign className="h-4 w-4" />
            Revenue &amp; Billing
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
              activeTab === 'system'
                ? 'border-red-500 text-red-600 font-extrabold'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Activity className="h-4 w-4" />
            SaaS Infrastructure &amp; Audits
          </button>
          <button
            onClick={() => setActiveTab('packages')}
            className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
              activeTab === 'packages'
                ? 'border-red-500 text-red-600 font-extrabold'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Layers className="h-4 w-4" />
            Subscription Package limits
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
              activeTab === 'security'
                ? 'border-red-500 text-red-600 font-extrabold'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            Global Permission Matrix &amp; APIs
          </button>
        </div>
      </div>

      {/* Analytics KPI Dashboard Widgets Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-500">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Tenant Accounts</p>
            <p className="text-lg font-extrabold text-slate-900 font-mono mt-0.5">
              {activeTenantsCount} <span className="text-slate-300 font-normal">/ {totalTenantsCount} Active</span>
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-500">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">MRR (Active SaaS)</p>
            <p className="text-lg font-extrabold text-slate-900 font-mono mt-0.5">
              ${totalMonthlyMRR.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-cyan-50 border border-cyan-100 rounded-xl text-cyan-500">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">API Actions Today</p>
            <p className="text-lg font-extrabold text-slate-900 font-mono mt-0.5">
              {totalApiRequests.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-amber-500">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Isolated DB Storage</p>
            <p className="text-lg font-extrabold text-slate-900 font-mono mt-0.5">
              {totalStorageUsed} GB
            </p>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* ====================================================================================
            TAB: TENANTS DIRECTORY & STATUS BINDING
            ==================================================================================== */}
        {activeTab === 'tenants' && (
          <motion.div
            key="tenants"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Search and Quick Filters */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search tenants by name, subdomain routing..."
                  className="w-full text-xs pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold">
                <Filter className="h-3.5 w-3.5" />
                <span>Showing {filteredTenants.length} of {tenants.length} Tenant workspaces</span>
              </div>
            </div>

            {/* Tenant Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredTenants.map((t) => (
                <div 
                  key={t.id}
                  className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs relative"
                >
                  {/* Visual Header */}
                  <div className="p-5 border-b border-slate-100 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: t.brandingColor }}>
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-sm tracking-tight">{t.name}</h4>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono mt-0.5">
                          <span>{t.subdomain}.jubupharma.com</span>
                        </div>
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 text-[10px] font-extrabold uppercase rounded-lg border ${
                      t.status === 'active' 
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                        : t.status === 'suspended'
                        ? 'bg-red-50 text-red-600 border-red-100'
                        : 'bg-amber-50 text-amber-600 border-amber-100'
                    }`}>
                      {t.status}
                    </span>
                  </div>

                  {/* Core Content and Usage Stats */}
                  <div className="p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">SaaS License Tier</p>
                        <p className="text-xs font-bold text-slate-800 capitalize mt-0.5 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: t.brandingColor }}></span>
                          {t.plan}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Security Isolation</p>
                        <p className="text-xs font-bold text-slate-600 mt-0.5">
                          {t.dbIsolationMode === 'database_per_tenant' ? 'Isolated Cloud Vault' :
                           t.dbIsolationMode === 'schema_per_tenant' ? 'Schema Shield' :
                           'Row-Level Enforced'}
                        </p>
                      </div>
                    </div>

                    {/* Usage Progress bars */}
                    <div className="space-y-2 pt-2 border-t border-slate-50">
                      <div>
                        <div className="flex justify-between text-[10px] font-bold mb-1">
                          <span className="text-slate-400 uppercase">Pharmacy Stores</span>
                          <span className="text-slate-700 font-mono">{(t.activePharmacies ?? 0)} / {(t.maxPharmacies ?? 3) === 999 ? 'Unlimited' : (t.maxPharmacies ?? 3)}</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-indigo-500 h-full rounded-full transition-all" 
                            style={{ width: `${Math.min(100, ((t.activePharmacies ?? 0) / ((t.maxPharmacies ?? 3) === 999 ? 50 : (t.maxPharmacies ?? 3))) * 100)}%` }}
                          ></div>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[10px] font-bold mb-1">
                          <span className="text-slate-400 uppercase">Staff Accounts</span>
                          <span className="text-slate-700 font-mono">{(t.activeUsers ?? 0)} / {(t.maxUsers ?? 5) === 999 ? 'Unlimited' : (t.maxUsers ?? 5)}</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-cyan-500 h-full rounded-full transition-all" 
                            style={{ width: `${Math.min(100, ((t.activeUsers ?? 0) / ((t.maxUsers ?? 5) === 999 ? 50 : (t.maxUsers ?? 5))) * 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    {/* Operational performance indices */}
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 grid grid-cols-2 gap-2 text-center text-[11px]">
                      <div>
                        <span className="text-slate-400 font-medium">Daily API Actions</span>
                        <p className="font-extrabold text-slate-800 font-mono mt-0.5">{(t.apiRequestsToday ?? 0).toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium">Allocated Files</span>
                        <p className="font-extrabold text-slate-800 font-mono mt-0.5">{t.storageMB ?? 0} MB</p>
                      </div>
                    </div>
                  </div>

                  {/* Pending cash approval option */}
                  {t.cashPaymentAwaitingApproval && (
                    <div className="mx-5 mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <p className="text-xs font-extrabold text-amber-700 uppercase flex items-center gap-1">
                          <DollarSign className="h-3.5 w-3.5 animate-pulse" />
                          Cash Payment Pending Approval
                        </p>
                        <p className="text-[10px] text-slate-500 font-medium">Awaiting manual approval for ${t.cashAmountPaid || 399}</p>
                      </div>
                      <button
                        onClick={() => {
                          // Approve cash payment for this tenant!
                          setTenants(prev => prev.map(item => item.id === t.id ? {
                            ...item,
                            status: 'active',
                            cashPaymentAwaitingApproval: false,
                          } : item));
                          alert(`Success: Cash payment for "${t.name}" has been approved!`);
                        }}
                        className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold text-[10px] rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        Approve Cash
                      </button>
                    </div>
                  )}

                  {/* Actions Bar */}
                  <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex justify-between items-center">
                    <span className="text-[10px] text-slate-400 font-medium">Registered: {new Date(t.registeredAt).toLocaleDateString()}</span>
                    
                    <button
                      onClick={() => handleToggleTenantStatus(t.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer ${
                        t.status === 'active'
                          ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                          : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200'
                      }`}
                    >
                      {t.status === 'active' ? (
                        <>
                          <Pause className="h-3 w-3" />
                          Suspend Account
                        </>
                      ) : (
                        <>
                          <Play className="h-3 w-3" />
                          Restore Access
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ====================================================================================
            TAB: REVENUE & BILLING REPORTING
            ==================================================================================== */}
        {activeTab === 'billing' && (
          <motion.div
            key="billing"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Visual SVG Chart & Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wide flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                    SaaS Monthly Recurring Revenue Projection (MRR)
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Simulated growth index based on active client license contracts</p>
                </div>

                {/* Simulated SVG Area Chart */}
                <div className="h-56 bg-slate-50 rounded-xl p-4 border border-slate-150 relative flex items-end">
                  <div className="absolute inset-0 p-4 flex flex-col justify-between pointer-events-none">
                    <span className="text-[9px] font-mono font-bold text-slate-400">$3,000 MRR</span>
                    <span className="text-[9px] font-mono font-bold text-slate-400">$2,000 MRR</span>
                    <span className="text-[9px] font-mono font-bold text-slate-400">$1,000 MRR</span>
                    <span className="text-[9px] font-mono font-bold text-slate-400">$0 MRR</span>
                  </div>

                  {/* SVG Chart Polyline */}
                  <svg className="w-full h-36 overflow-visible" viewBox="0 0 400 100" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    {/* Grid Lines */}
                    <line x1="0" y1="25" x2="400" y2="25" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3" />
                    <line x1="0" y1="50" x2="400" y2="50" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3" />
                    <line x1="0" y1="75" x2="400" y2="75" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3" />

                    {/* Shaded Area */}
                    <path 
                      d="M 0,90 Q 80,75 160,55 T 320,35 L 400,15 L 400,100 L 0,100 Z" 
                      fill="url(#chartGrad)" 
                    />
                    {/* Line path */}
                    <path 
                      d="M 0,90 Q 80,75 160,55 T 320,35 L 400,15" 
                      fill="none" 
                      stroke="#10b981" 
                      strokeWidth="2.5" 
                    />
                    
                    {/* Dots for quarters */}
                    <circle cx="0" cy="90" r="4" fill="#059669" />
                    <circle cx="100" cy="80" r="4" fill="#059669" />
                    <circle cx="200" cy="50" r="4" fill="#059669" />
                    <circle cx="300" cy="38" r="4" fill="#059669" />
                    <circle cx="400" cy="15" r="4" fill="#059669" />
                  </svg>

                  <div className="absolute bottom-2 inset-x-4 flex justify-between text-[8px] font-mono font-bold text-slate-400">
                    <span>Q2 2025</span>
                    <span>Q3 2025</span>
                    <span>Q4 2025</span>
                    <span>Q1 2026</span>
                    <span>Q2 2026 (Live)</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wide">License Distribution</h3>
                <p className="text-xs text-slate-400">SaaS account tier split percentage share</p>

                <div className="space-y-4 pt-4">
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1 text-slate-700">
                      <span>Starter Tier ($149)</span>
                      <span>25%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-sky-500 h-full rounded-full" style={{ width: '25%' }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1 text-slate-700">
                      <span>Professional Tier ($399)</span>
                      <span>50%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: '50%' }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1 text-slate-700">
                      <span>Enterprise Tier ($999)</span>
                      <span>25%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-indigo-500 h-full rounded-full" style={{ width: '25%' }}></div>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 flex items-start gap-2 text-[10px] text-amber-800 leading-relaxed font-semibold">
                  <Info className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <span>
                    Notice: 1 Tenant accounts (St. Jude Clinical Pharmacy) is suspended due to unpaid invoice balance of $999. Billing cycle suspended automatically.
                  </span>
                </div>
              </div>
            </div>

            {/* Subscriptions Table */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
              <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wide mb-4">SaaS Subscriptions Log</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                      <th className="pb-3 pl-2">Tenant Clinic</th>
                      <th className="pb-3">Active Plan</th>
                      <th className="pb-3">Interval</th>
                      <th className="pb-3">Current Amount</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3">Next Renewal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tenants.map(t => (
                      <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-all font-medium text-slate-700">
                        <td className="py-3 pl-2 font-bold text-slate-950">{t.name}</td>
                        <td className="py-3 capitalize">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold text-white uppercase" style={{ backgroundColor: t.brandingColor }}>
                            {t.plan}
                          </span>
                        </td>
                        <td className="py-3 capitalize">{t.billingCycle}</td>
                        <td className="py-3 font-mono font-bold">${t.monthlyRevenue}/mo</td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold uppercase ${
                            t.status === 'active' 
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                              : 'bg-rose-50 text-rose-600 border border-rose-100'
                          }`}>
                            {t.status === 'active' ? 'active' : 'suspended'}
                          </span>
                        </td>
                        <td className="py-3 text-slate-500 font-mono">2026-08-01</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* ====================================================================================
            TAB: SYSTEM INFRASTRUCTURE & DISPATCH BROADCASTS
            ==================================================================================== */}
        {activeTab === 'system' && (
          <motion.div
            key="system"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6"
          >
            {/* Live System Resource Monitoring */}
            <div className="lg:col-span-8 space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wide">
                      Clinical Cloud Container Infrastructure
                    </h3>
                    <p className="text-xs text-slate-400">Resource metrics for the physical database clusters</p>
                  </div>
                  <span className="flex items-center gap-1 bg-emerald-50 border border-emerald-100 text-emerald-600 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-lg">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Operational
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
                  <div className="space-y-2 text-center p-4 bg-slate-50 rounded-xl border border-slate-150">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Avg DB Query Latency</p>
                    <p className="text-2xl font-extrabold text-slate-800 font-mono">4.2 ms</p>
                    <span className="text-[9px] font-semibold text-emerald-600 font-mono">Within SLA threshold</span>
                  </div>

                  <div className="space-y-2 text-center p-4 bg-slate-50 rounded-xl border border-slate-150">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Active DB Pools</p>
                    <p className="text-2xl font-extrabold text-slate-800 font-mono">42 / 100</p>
                    <span className="text-[9px] font-semibold text-slate-400 font-mono">PgBouncer Active</span>
                  </div>

                  <div className="space-y-2 text-center p-4 bg-slate-50 rounded-xl border border-slate-150">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Daily API Failures</p>
                    <p className="text-2xl font-extrabold text-slate-800 font-mono">0.02%</p>
                    <span className="text-[9px] font-semibold text-emerald-600 font-mono">99.98% Success Ratio</span>
                  </div>
                </div>

                {/* Audit Logs Trail */}
                <div className="mt-8 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Super Administrator Logs</h4>
                    <span className="text-[10px] text-slate-400 font-semibold font-mono">Immutable Log Trail</span>
                  </div>

                  <div className="space-y-2.5">
                    {auditLogs.map(log => (
                      <div 
                        key={log.id} 
                        className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3 text-xs justify-between"
                      >
                        <div className="flex items-start gap-2.5">
                          <span className={`w-2 h-2 rounded-full mt-1.5 ${
                            log.severity === 'critical' ? 'bg-red-500 animate-ping' :
                            log.severity === 'high' ? 'bg-amber-500' : 'bg-slate-400'
                          }`}></span>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-950">{log.actor}</span>
                              <span className="text-slate-400">&bull;</span>
                              <span className="px-1.5 py-0.2 bg-slate-150 text-[10px] rounded-sm font-mono font-bold text-slate-600">{log.action}</span>
                            </div>
                            <p className="text-slate-500 mt-1 font-medium text-[11px]">{log.tenant}</p>
                          </div>
                        </div>

                        <div className="text-right font-mono text-[10px] text-slate-400 space-y-0.5">
                          <p>{new Date(log.timestamp).toLocaleTimeString()}</p>
                          <p>{log.ipAddress}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Broadcast Form Panel */}
            <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-red-600">
                <Bell className="h-4.5 w-4.5" />
                <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wide">
                  Global System Broadcaster
                </h3>
              </div>

              <p className="text-xs text-slate-400">
                Publish system notices or mandatory maintenance banners instantly to clinician terminals and checkout registers.
              </p>

              <form onSubmit={handleSendBroadcast} className="space-y-4 pt-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Notification Scope</label>
                  <select 
                    value={broadcastTarget}
                    onChange={e => setBroadcastTarget(e.target.value as any)}
                    className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-red-500"
                  >
                    <option value="all">All SaaS Subdomains (All Staff)</option>
                    <option value="starter">Starter Plan Tenants Only</option>
                    <option value="professional">Professional Plan Tenants Only</option>
                    <option value="enterprise">Enterprise VIP Partners Only</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Warning Level</label>
                  <select 
                    value={broadcastType}
                    onChange={e => setBroadcastType(e.target.value as any)}
                    className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-red-500"
                  >
                    <option value="maintenance">Planned System Maintenance (Yellow Banner)</option>
                    <option value="system_notice">Product / Feature Update (Blue Info)</option>
                    <option value="billing">Mandatory Billing Past Due Alert (Red Urgent)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Broadcast Banner Content</label>
                  <textarea 
                    rows={4}
                    required
                    value={broadcastMessage}
                    onChange={e => setBroadcastMessage(e.target.value)}
                    placeholder="e.g. PostgreSQL upgrade will occur tonight at 02:00 UTC. System might be inaccessible for up to 3 minutes."
                    className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-red-500 resize-none"
                  ></textarea>
                </div>

                {broadcastSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-[11px] text-emerald-800 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span>Broadcast alert dispatched to redis queue successfully!</span>
                  </div>
                )}

                <button 
                  type="submit"
                  className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Send className="h-4 w-4" />
                  Emit Global Alert Banners
                </button>
              </form>
            </div>
          </motion.div>
        )}

        {/* ====================================================================================
            TAB: SUBSCRIPTION PACKAGES LIMITS CONFIGURATION
            ==================================================================================== */}
        {activeTab === 'packages' && (
          <motion.div
            key="packages"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
              <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wide">
                Configurable SaaS Pricing Plans &amp; Guardrails
              </h3>
              <p className="text-xs text-slate-400 mt-1">Adjust monthly subscriber licensing and physical store limitations</p>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                {plans.map(plan => (
                  <div 
                    key={plan.id}
                    className="bg-slate-50 border border-slate-200 p-5 rounded-2xl flex flex-col justify-between space-y-6"
                  >
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{plan.name}</span>
                        <span className="px-2 py-0.5 rounded bg-indigo-50 border border-indigo-100 text-[10px] font-extrabold text-indigo-600 uppercase font-mono">{plan.id}</span>
                      </div>

                      <div className="space-y-1">
                        <span className="text-2xl font-extrabold text-slate-950 font-mono">${plan.priceMonthly}</span>
                        <span className="text-slate-400 text-xs font-medium"> / month</span>
                      </div>

                      <div className="space-y-3 pt-4 border-t border-slate-150">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase block">Monthly Price ($)</label>
                          <input 
                            type="number"
                            value={plan.priceMonthly}
                            onChange={e => handleUpdatePlanLimit(plan.id, 'priceMonthly', Number(e.target.value))}
                            className="w-full text-xs px-3 py-1.5 border border-slate-200 bg-white rounded-lg focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase block">Store Limit (Pharmacies)</label>
                          <input 
                            type="number"
                            value={plan.maxPharmacies}
                            onChange={e => handleUpdatePlanLimit(plan.id, 'maxPharmacies', Number(e.target.value))}
                            className="w-full text-xs px-3 py-1.5 border border-slate-200 bg-white rounded-lg focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase block">Staff Acc. Limit (Users)</label>
                          <input 
                            type="number"
                            value={plan.maxUsers}
                            onChange={e => handleUpdatePlanLimit(plan.id, 'maxUsers', Number(e.target.value))}
                            className="w-full text-xs px-3 py-1.5 border border-slate-200 bg-white rounded-lg focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 pt-4 border-t border-slate-150">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Included Capabilities</p>
                      <ul className="space-y-1">
                        {plan.features.map((feat, idx) => (
                          <li key={idx} className="text-xs text-slate-600 flex items-center gap-1.5 font-medium">
                            <Check className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ====================================================================================
            TAB: PERMISSION MATRIX & INTEGRATION APIS
            ==================================================================================== */}
        {activeTab === 'security' && (
          <motion.div
            key="security"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Permission Matrix */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="pb-4 border-b border-slate-100">
                <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wide">
                  Multi-Tenant RBAC Permissions Matrix
                </h3>
                <p className="text-xs text-slate-400 mt-1">Detailed structural blueprint of operational actions permitted by roles</p>
              </div>

              <div className="overflow-x-auto mt-6">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                      <th className="pb-3 pl-2">System Action</th>
                      <th className="pb-3 text-center">Super Admin</th>
                      <th className="pb-3 text-center">Pharmacy Admin</th>
                      <th className="pb-3 text-center">Pharmacist</th>
                      <th className="pb-3 text-center">Store Manager</th>
                      <th className="pb-3 text-center">Cashier</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-50 hover:bg-slate-50/50 transition-all text-slate-700 font-medium">
                      <td className="py-3.5 pl-2">
                        <p className="font-bold text-slate-900">Provision SaaS Tenant</p>
                        <span className="text-[10px] text-slate-400">Trigger isolated DDL creation</span>
                      </td>
                      <td className="py-3.5 text-center"><Check className="h-4.5 w-4.5 text-emerald-500 mx-auto" /></td>
                      <td className="py-3.5 text-center"><XCircle className="h-4.5 w-4.5 text-slate-200 mx-auto" /></td>
                      <td className="py-3.5 text-center"><XCircle className="h-4.5 w-4.5 text-slate-200 mx-auto" /></td>
                      <td className="py-3.5 text-center"><XCircle className="h-4.5 w-4.5 text-slate-200 mx-auto" /></td>
                      <td className="py-3.5 text-center"><XCircle className="h-4.5 w-4.5 text-slate-200 mx-auto" /></td>
                    </tr>

                    <tr className="border-b border-slate-50 hover:bg-slate-50/50 transition-all text-slate-700 font-medium">
                      <td className="py-3.5 pl-2">
                        <p className="font-bold text-slate-900">Suspend/Activate Tenant</p>
                        <span className="text-[10px] text-slate-400">Lock database route lookup</span>
                      </td>
                      <td className="py-3.5 text-center"><Check className="h-4.5 w-4.5 text-emerald-500 mx-auto" /></td>
                      <td className="py-3.5 text-center"><XCircle className="h-4.5 w-4.5 text-slate-200 mx-auto" /></td>
                      <td className="py-3.5 text-center"><XCircle className="h-4.5 w-4.5 text-slate-200 mx-auto" /></td>
                      <td className="py-3.5 text-center"><XCircle className="h-4.5 w-4.5 text-slate-200 mx-auto" /></td>
                      <td className="py-3.5 text-center"><XCircle className="h-4.5 w-4.5 text-slate-200 mx-auto" /></td>
                    </tr>

                    <tr className="border-b border-slate-50 hover:bg-slate-50/50 transition-all text-slate-700 font-medium">
                      <td className="py-3.5 pl-2">
                        <p className="font-bold text-slate-900">Manage Tenant Staff</p>
                        <span className="text-[10px] text-slate-400">Create / verify staff accounts</span>
                      </td>
                      <td className="py-3.5 text-center"><Check className="h-4.5 w-4.5 text-emerald-500 mx-auto" /></td>
                      <td className="py-3.5 text-center"><Check className="h-4.5 w-4.5 text-emerald-500 mx-auto" /></td>
                      <td className="py-3.5 text-center"><XCircle className="h-4.5 w-4.5 text-slate-200 mx-auto" /></td>
                      <td className="py-3.5 text-center"><XCircle className="h-4.5 w-4.5 text-slate-200 mx-auto" /></td>
                      <td className="py-3.5 text-center"><XCircle className="h-4.5 w-4.5 text-slate-200 mx-auto" /></td>
                    </tr>

                    <tr className="border-b border-slate-50 hover:bg-slate-50/50 transition-all text-slate-700 font-medium">
                      <td className="py-3.5 pl-2">
                        <p className="font-bold text-slate-900">Approve Prescription</p>
                        <span className="text-[10px] text-slate-400">Validate physician signature credentials</span>
                      </td>
                      <td className="py-3.5 text-center"><XCircle className="h-4.5 w-4.5 text-slate-200 mx-auto" /></td>
                      <td className="py-3.5 text-center"><Check className="h-4.5 w-4.5 text-emerald-500 mx-auto" /></td>
                      <td className="py-3.5 text-center"><Check className="h-4.5 w-4.5 text-emerald-500 mx-auto" /></td>
                      <td className="py-3.5 text-center"><XCircle className="h-4.5 w-4.5 text-slate-200 mx-auto" /></td>
                      <td className="py-3.5 text-center"><XCircle className="h-4.5 w-4.5 text-slate-200 mx-auto" /></td>
                    </tr>

                    <tr className="border-b border-slate-50 hover:bg-slate-50/50 transition-all text-slate-700 font-medium">
                      <td className="py-3.5 pl-2">
                        <p className="font-bold text-slate-900">Adjust Inventory Cost</p>
                        <span className="text-[10px] text-slate-400">Modify wholesale stock pricing basis</span>
                      </td>
                      <td className="py-3.5 text-center"><XCircle className="h-4.5 w-4.5 text-slate-200 mx-auto" /></td>
                      <td className="py-3.5 text-center"><Check className="h-4.5 w-4.5 text-emerald-500 mx-auto" /></td>
                      <td className="py-3.5 text-center"><XCircle className="h-4.5 w-4.5 text-slate-200 mx-auto" /></td>
                      <td className="py-3.5 text-center"><Check className="h-4.5 w-4.5 text-emerald-500 mx-auto" /></td>
                      <td className="py-3.5 text-center"><XCircle className="h-4.5 w-4.5 text-slate-200 mx-auto" /></td>
                    </tr>

                    <tr className="border-b border-slate-50 hover:bg-slate-50/50 transition-all text-slate-700 font-medium">
                      <td className="py-3.5 pl-2">
                        <p className="font-bold text-slate-900">Checkout Sale (POS)</p>
                        <span className="text-[10px] text-slate-400">Record cashier payment transaction</span>
                      </td>
                      <td className="py-3.5 text-center"><XCircle className="h-4.5 w-4.5 text-slate-200 mx-auto" /></td>
                      <td className="py-3.5 text-center"><Check className="h-4.5 w-4.5 text-emerald-500 mx-auto" /></td>
                      <td className="py-3.5 text-center"><Check className="h-4.5 w-4.5 text-emerald-500 mx-auto" /></td>
                      <td className="py-3.5 text-center"><Check className="h-4.5 w-4.5 text-emerald-500 mx-auto" /></td>
                      <td className="py-3.5 text-center"><Check className="h-4.5 w-4.5 text-emerald-500 mx-auto" /></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* REST API Endpoints Specifications */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="pb-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wide">
                    SaaS Core Super Admin REST API Specification
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Administrative JSON endpoints protected by bearer root JWT signatures</p>
                </div>
                <Code className="h-5 w-5 text-indigo-500" />
              </div>

              <div className="space-y-6 mt-6">
                {/* API 1 */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-emerald-500 text-white font-mono font-bold text-[10px] px-2 py-0.5 rounded">GET</span>
                    <span className="font-mono text-xs font-semibold text-slate-800">/api/v1/admin/tenants</span>
                    <span className="text-[11px] text-slate-400 font-medium">&mdash; View all tenants and dynamic usage ratios</span>
                  </div>
                  <div className="bg-slate-900 p-4 rounded-xl text-[11px] text-slate-300 font-mono overflow-x-auto leading-relaxed border border-slate-800">
                    <p className="text-slate-400 font-bold">// Response Payload (HTTP 200 OK)</p>
                    <pre>{JSON.stringify({
                      success: true,
                      tenants: [
                        { id: "tenant-downtown", name: "Downtown Pharma Care", status: "active", plan: "starter" }
                      ]
                    }, null, 2)}</pre>
                  </div>
                </div>

                {/* API 2 */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-amber-500 text-white font-mono font-bold text-[10px] px-2 py-0.5 rounded">PATCH</span>
                    <span className="font-mono text-xs font-semibold text-slate-800">/api/v1/admin/tenants/:id/status</span>
                    <span className="text-[11px] text-slate-400 font-medium">&mdash; Activate or suspend tenant databases</span>
                  </div>
                  <div className="bg-slate-900 p-4 rounded-xl text-[11px] text-slate-300 font-mono overflow-x-auto leading-relaxed border border-slate-800">
                    <p className="text-slate-400 font-bold">// Request Body Schema</p>
                    <pre>{JSON.stringify({
                      status: "suspended",
                      reason: "Unpaid invoice delinquency"
                    }, null, 2)}</pre>
                  </div>
                </div>

                {/* API 3 */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-blue-500 text-white font-mono font-bold text-[10px] px-2 py-0.5 rounded">POST</span>
                    <span className="font-mono text-xs font-semibold text-slate-800">/api/v1/admin/broadcasts</span>
                    <span className="text-[11px] text-slate-400 font-medium">&mdash; Dispatch emergency banner notifications</span>
                  </div>
                  <div className="bg-slate-900 p-4 rounded-xl text-[11px] text-slate-300 font-mono overflow-x-auto leading-relaxed border border-slate-800">
                    <p className="text-slate-400 font-bold">// Response Payload (HTTP 201 Created)</p>
                    <pre>{JSON.stringify({
                      success: true,
                      broadcastId: "bc_998124",
                      active_subdomains_notified: ["downtown", "carefirst"]
                    }, null, 2)}</pre>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
