import React, { useState, useEffect, useMemo, FormEvent } from 'react';
import { 
  Building2, Cpu, ShieldAlert, ShieldCheck, Layers, DollarSign, 
  Settings, Server, CheckCircle2, CloudLightning, HelpCircle, Activity,
  Cloud, LogIn, LogOut, Loader2, Sparkles, Box, ShoppingCart, BarChart3,
  Radio, Heart, Shield, Pill, Plus, Menu, X, Receipt, Coins, BookOpen,
  Sun, Moon, Phone, Key, UserCheck, WifiOff, RefreshCw
} from 'lucide-react';
import ExpendituresManager from './components/ExpendituresManager';
import { performComprehensiveFactoryReset } from './utils/factoryReset';

const renderLogoIcon = (logo?: string, className = "h-5 w-5", logoUrl?: string) => {
  const customSrc = logoUrl || (logo && (logo.startsWith('data:') || logo.startsWith('http')) ? logo : null);
  if (customSrc) {
    return <img src={customSrc} alt="Logo" className={`${className} object-contain rounded-md inline-block bg-white p-0.5`} />;
  }
  switch (logo) {
    case 'capsule':
      return <Pill className={className} />;
    case 'heart':
      return <Heart className={className} />;
    case 'shield':
      return <Shield className={className} />;
    case 'activity':
      return <Activity className={className} />;
    case 'cross':
    default:
      return <Plus className={className} />;
  }
};
import { Tenant, StaffRole } from './types';
import { PHARMACY_ID, PHARMACY_NAME, FIXED_BRANCHES, MAX_BRANCHES, isBranchCreationAllowed, isValidBranchId } from './lib/pharmacyConfig';
import ArchitecturalDashboard from './components/ArchitecturalDashboard';
import SecurityModule from './components/SecurityModule';
import EnterpriseInventory from './components/EnterpriseInventory';
import PharmacyPOS from './components/PharmacyPOS';
import AdvancedReports from './components/AdvancedReports';
import NotificationEngine from './components/NotificationEngine';
import BranchesStaffManager from './components/BranchesStaffManager';
import { SettingsView } from './components/SettingsView';
import { UserManualModal } from './components/UserManualModal';
import { auth, ensureMasterAdminAuthRegistered } from './lib/firebase';
import modernPharmacyImg from './assets/images/modern_pharmacy_login_1785144360444.jpg';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import {
  fetchPharmacyBootstrapData,
  checkIfPharmacyHasData,
  ensurePharmacyAndBranchesExist,
  loadDeletedStaffFromFirestore,
  loadStaffFromFirestore,
  subscribeToStaffFirestore
} from './lib/firebaseSync';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'billing' | 'security' | 'inventory' | 'pos' | 'reports' | 'notifications' | 'architecture' | 'branches' | 'expenditures' | 'settings' | 'login'>('dashboard');

  // ---------------------------------------------------------------------
  // SINGLE-TENANT / FIXED-BRANCH SETUP
  // `tenants` is kept as a 1-item array (rather than renamed throughout
  // this large file) to minimize the change surface, but it now always
  // contains exactly the one TRUST PHARMACY record with the 3 fixed
  // branches — no multi-tenant switching, no localStorage cache.
  // ---------------------------------------------------------------------
  const DEFAULT_BRANCHES = FIXED_BRANCHES.map((b) => ({
    id: b.id,
    name: b.name,
    address: 'Juba, South Sudan',
    phone: '+211 922 152 427',
    isActive: true,
    isMain: b.isMain,
    registeredAt: '2026-03-15T10:00:00Z',
  }));

  const [tenants, setTenants] = useState<Tenant[]>(() => [
    {
      id: PHARMACY_ID,
      name: PHARMACY_NAME,
      subdomain: 'trustpharmacy',
      status: 'active',
      plan: 'enterprise',
      billingCycle: 'annual',
      registeredAt: '2026-03-15T10:00:00Z',
      dbIsolationMode: 'single_tenant',
      brandingColor: '#0ea5e9',
      logoIcon: 'cross',
      address: 'Airport Road, Juba Town, South Sudan',
      phone: '+211 922 152 427',
      activePharmacies: 1,
      maxPharmacies: 1,
      activeUsers: 0,
      maxUsers: 50,
      branches: DEFAULT_BRANCHES,
      maxBranches: MAX_BRANCHES,
      staff: [],
      email: 'info@trustpharmacy.com',
      telephone: '+211 922 152 427',
      website: 'www.trustpharmacy.com',
      taxNumber: 'SSD-TX-TRUST-001',
      currency: 'SSP',
      receiptHeader: 'TRUST PHARMACY\nYour Health, Our Priority\nJuba, South Sudan',
      receiptFooter: 'Thank you for choosing Trust Pharmacy.\nQuality clinical care in South Sudan.',
      businessRegNo: 'SSD-REG-TRUST-2026',
      logoUrl: '',
      usdToSspRate: 3100,
    },
  ]);

  // Live staff subscription across all 3 branches — Firestore is the only
  // source of truth, no localStorage mirror.
  useEffect(() => {
    const unsubStaff = subscribeToStaffFirestore((fsStaff: any[]) => {
      setTenants((prev) => prev.map((t) => ({ ...t, staff: fsStaff })));
    });
    return () => unsubStaff();
  }, []);

  // activeTenantId is always the single pharmacy id now (kept for the many
  // call sites below that still reference it for currency/receipt settings).
  const [activeTenantId, setActiveTenantId] = useState<string>(PHARMACY_ID);

  const [activeRole, setActiveRole] = useState<StaffRole>('Administrator');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [manualModalOpen, setManualModalOpen] = useState<boolean>(false);

  // Change Password Modal States
  const [showChangePasswordModal, setShowChangePasswordModal] = useState<boolean>(false);
  const [changePassNew, setChangePassNew] = useState<string>('');
  const [changePassConfirm, setChangePassConfirm] = useState<string>('');

  // Global App Display & Currency & Theme States — no localStorage persistence
  // (rule: no local persistence, app is 100% online); resets to defaults each session.
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [systemCurrency, setSystemCurrency] = useState<'SSP' | 'USD'>('SSP');

  // Apply dark mode class to root HTML document element
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleToggleCurrency = () => {
    setSystemCurrency((prev) => (prev === 'SSP' ? 'USD' : 'SSP'));
  };

  const handleChangeStaffPassword = (e: FormEvent) => {
    e.preventDefault();
    if (!changePassNew || changePassNew.length < 4) {
      alert("Password must be at least 4 characters.");
      return;
    }
    if (changePassNew !== changePassConfirm) {
      alert("Passwords do not match. Please re-enter matching passwords.");
      return;
    }

    const currentEmail = firebaseUser?.email || 'junubposcenter@gmail.com';
    const activeT = tenants.find(t => t.id === activeTenantId) || tenants[0];
    const staffList = activeT?.staff || [];
    let updatedStaff = [...staffList];

    const idx = updatedStaff.findIndex(s => s.email.toLowerCase() === currentEmail.toLowerCase());
    if (idx !== -1) {
      updatedStaff[idx] = {
        ...updatedStaff[idx],
        password: changePassNew
      };
    } else {
      updatedStaff.push({
        id: `staff-${Date.now()}`,
        name: currentEmail.split('@')[0],
        email: currentEmail.toLowerCase(),
        password: changePassNew,
        role: activeRole as any,
        isActive: true,
        isVerified: true
      });
    }

    const updatedTenant = {
      ...activeT,
      staff: updatedStaff
    };

    setTenants(prev => prev.map(t => t.id === activeT.id ? updatedTenant : t));

    const uidToUse = firebaseUser?.uid || 'admin-junubposcenter';
    import('./lib/firebaseSync').then(({ savePharmacySettingsToFirestore }) => {
      savePharmacySettingsToFirestore(updatedTenant);
    });

    alert("Password updated successfully! The Administrator can view your password in the Staff Registry.");
    setShowChangePasswordModal(false);
    setChangePassNew('');
    setChangePassConfirm('');
  };

  // Global Network Connectivity State (Strict Online Mode Policy)
  const [isOnline, setIsOnline] = useState<boolean>(() => typeof navigator !== 'undefined' ? navigator.onLine : true);

  const checkOnlineConnection = async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsOnline(false);
      return;
    }
    try {
      const res = await fetch('/api/v1/health', { method: 'GET', cache: 'no-store' });
      if (res.ok) {
        setIsOnline(true);
      } else {
        // Fallback to checking navigator.onLine
        setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);
      }
    } catch (e) {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setIsOnline(false);
      } else {
        setIsOnline(true);
      }
    }
  };

  useEffect(() => {
    if (activeRole !== 'Administrator' && activeTab === 'settings') {
      setActiveTab('pos');
    }
  }, [activeRole, activeTab]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check and 5-second recurring background network heartbeat ping
    checkOnlineConnection();
    const intervalId = setInterval(() => {
      checkOnlineConnection();
    }, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(intervalId);
    };
  }, []);

  // Firebase Auth & Sync States — no localStorage session cache. Firebase
  // Auth's SDK already persists sign-in across page loads on its own; we
  // simply react to onAuthStateChanged as the single source of truth.
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');

  useEffect(() => {
    // Proactively guarantee Master Admin (junubposcenter@gmail.com / Reagantekki01) exists in Firebase Auth
    ensureMasterAdminAuthRegistered();

    // Listen to Firebase Auth state — this is the ONLY session source now.
    // Purge any stale mock/offline staff data stored in localStorage so staff count strictly matches Firestore
    try {
      localStorage.removeItem('junub_registered_staff');
      localStorage.removeItem('junub_pharmacy_user_session');
    } catch (e) {}

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setFirebaseUser(user);
        setAuthModalOpen(false);

        const userEmail = user.email?.toLowerCase();
        const isMasterAdmin = userEmail === 'junubposcenter@gmail.com';

        // Look up this user's staff record across all 3 branches to get
        // their role and their fixed assigned branch.
        const allStaff = await loadStaffFromFirestore();
        const matchedStaff = userEmail ? allStaff.find((s: any) => s.email?.toLowerCase() === userEmail) : null;

        const effectiveRole = matchedStaff?.role || (isMasterAdmin ? 'Administrator' : 'Pharmacist');
        setActiveRole(effectiveRole as any);
        setActiveTenantId(PHARMACY_ID);
      } else {
        setFirebaseUser(null);
        setAuthModalOpen(true);
      }

      setSyncStatus('syncing');
      try {
        const hasData = await checkIfPharmacyHasData();
        if (!hasData) {
          await ensurePharmacyAndBranchesExist();
        }
        const bootstrap = await fetchPharmacyBootstrapData();
        const allStaff = bootstrap.branches.flatMap((b: any) => b.staff || []);
        setTenants((prev) => prev.map((t) => ({ ...t, staff: allStaff })));
        setSyncStatus('synced');
      } catch (err) {
        console.error('Firebase Sync Error:', err);
        setSyncStatus('error');
      }
    });
    return () => unsubscribe();
  }, []);

  // Ensure a signed-in user has a Firestore staff record. No localStorage —
  // Firestore staff collection is the only source of truth for role/branch.
  useEffect(() => {
    const userEmail = firebaseUser?.email?.toLowerCase();
    if (!userEmail || tenants.length === 0) return;

    const isMasterAdmin = userEmail === 'junubposcenter@gmail.com';
    if (isMasterAdmin) setActiveRole('Administrator');

    const existing = (tenants[0].staff || []).find((s: any) => s.email?.toLowerCase() === userEmail);
    if (existing) return; // already provisioned

    const newStaffMember = {
      id: `staff-user-${Date.now()}`,
      name: firebaseUser?.displayName || (isMasterAdmin ? 'Administrator' : userEmail.split('@')[0]),
      email: userEmail,
      role: (isMasterAdmin ? 'Administrator' : 'Pharmacist') as StaffRole,
      isActive: true,
      isVerified: true,
      branchId: FIXED_BRANCHES[0].id,
    };
    import('./lib/firebaseSync').then(({ saveStaffAccountToFirestore }) => {
      saveStaffAccountToFirestore(newStaffMember.branchId, newStaffMember).catch((err) =>
        console.error('Failed to provision staff record:', err)
      );
    });
    // The live subscribeToStaffFirestore listener (set up above) will pick
    // this up and update `tenants[0].staff` automatically once written.
  }, [firebaseUser, tenants.length]);

  const baseTenant = tenants.find(t => t.id === activeTenantId) || tenants[0];
  const activeTenant = { ...baseTenant, currency: systemCurrency };
  const usdToSspRate = activeTenant?.usdToSspRate || 1000;

  // Check if current staff/admin is restricted to a specific assigned branch
  const userAssignedBranchId = useMemo(() => {
    if (!activeTenant || !firebaseUser?.email) return null;
    const emailLower = firebaseUser.email.toLowerCase();
    const roleLower = (activeRole || '').toLowerCase();

    // General/Master/Super Admin or Owner has unrestricted access to all branches
    if (roleLower.includes('master') || roleLower.includes('super') || roleLower.includes('administrator') || roleLower === 'owner' || emailLower.includes('admin')) {
      return null;
    }

    const currentEmployee = activeTenant.staff?.find((s: any) => s.email?.toLowerCase() === emailLower);
    if (currentEmployee && currentEmployee.branchId) {
      return currentEmployee.branchId;
    }
    return null;
  }, [activeTenant, firebaseUser, activeRole]);

  const effectiveBranchId = userAssignedBranchId || selectedBranchId || 'all';

  // Concrete branch id to actually write data under (POS sales, stock
  // adjustments, expenditures). Never 'all' — an Administrator viewing all
  // branches still needs one real branch selected before writing; default
  // to the main branch until they explicitly pick one via the branch selector.
  const writeBranchId = isValidBranchId(effectiveBranchId) ? effectiveBranchId : FIXED_BRANCHES[0].id;

  return (
    <div className={`h-[100dvh] w-full max-w-full flex font-sans antialiased selection:bg-sky-100 selection:text-slate-900 overflow-hidden relative ${theme === 'dark' ? 'bg-slate-950 text-slate-100 dark' : 'bg-[#F1F5F9] text-slate-800'}`}>
      
      {/* Backdrop overlay for mobile viewports */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - left (Responsive drawer/overlay on mobile, permanent column on desktop) */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0F172A] text-slate-300 flex flex-col flex-shrink-0 h-screen max-h-screen overflow-hidden border-r border-slate-800 transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-5 border-b border-slate-800/80 flex justify-between items-center bg-slate-950/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-rose-600 rounded-xl flex items-center justify-center font-black text-white text-base tracking-wider shadow-md shadow-rose-600/30 ring-2 ring-rose-500/40">
              JP
            </div>
            <div>
              <span className="font-extrabold text-white text-base tracking-tight font-display block leading-none">
                Junub Pharmacare
              </span>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-extrabold text-sky-400 uppercase tracking-widest font-mono">
                  SaaS OS v4.2
                </span>
              </div>
            </div>
          </div>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
            title="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto min-h-0">
          <div className="text-[10px] uppercase font-bold text-slate-500 px-4 mb-2 tracking-wider">Enterprise Suite</div>
          
          {/* Tab: Clinical Command Center */}
          <button
            onClick={() => {
              setActiveTab('dashboard');
              setSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all text-left cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-sky-500/10 text-sky-400 border-l-4 border-sky-500 font-semibold'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Clinical Command Center</span>
          </button>

          {/* Tab: Staff Login & Account Portal (Prominently placed near top) */}
          <button
            onClick={() => {
              setActiveTab('login');
              setAuthModalOpen(true);
              setSidebarOpen(false);
            }}
            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-medium transition-all text-left cursor-pointer my-1 ${
              activeTab === 'login' || authModalOpen
                ? 'bg-rose-500/20 text-rose-300 border-l-4 border-rose-500 font-bold'
                : 'bg-rose-950/30 text-rose-200 hover:bg-rose-900/40 border border-rose-800/40'
            }`}
            id="sidebar-nav-top-login-tab"
          >
            <div className="flex items-center gap-3">
              <LogIn className="w-4 h-4 text-rose-400" />
              <span className="font-bold">{firebaseUser ? 'Account & Staff Profile' : 'Sign In / Staff Login'}</span>
            </div>
            {!firebaseUser ? (
              <span className="text-[9px] font-black uppercase bg-rose-500 text-white px-2 py-0.5 rounded-md animate-pulse">
                Login
              </span>
            ) : (
              <span className="text-[9px] font-mono bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded">
                Active
              </span>
            )}
          </button>

          {/* Tab: Pharmacy POS System (All roles except limited ones) */}
          <button
            onClick={() => {
              setActiveTab('pos');
              setSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all text-left cursor-pointer ${
              activeTab === 'pos'
                ? 'bg-sky-500/10 text-sky-400 border-l-4 border-sky-500 font-semibold'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Pharmacy POS (Sales)</span>
          </button>

          {/* Tab: Clinical Inventory */}
          {['Administrator', 'Pharmacist'].includes(activeRole) && (
            <button
              onClick={() => {
                setActiveTab('inventory');
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all text-left cursor-pointer ${
                activeTab === 'inventory'
                  ? 'bg-sky-500/10 text-sky-400 border-l-4 border-sky-500 font-semibold'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <Pill className="w-4 h-4" />
              <span>Clinical Inventory</span>
            </button>
          )}

          {/* Tab: Expenditures & Claims Input */}
          <button
            onClick={() => {
              setActiveTab('expenditures');
              setSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all text-left cursor-pointer ${
              activeTab === 'expenditures'
                ? 'bg-sky-500/10 text-sky-400 border-l-4 border-sky-500 font-semibold'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
            }`}
          >
            <Coins className="w-4 h-4 text-amber-400" />
            <span>Expenditures &amp; Claims</span>
          </button>

          {/* Tab: Branches & Team */}
          {activeRole === 'Administrator' && (
            <button
              onClick={() => {
                setActiveTab('branches');
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all text-left cursor-pointer ${
                activeTab === 'branches'
                  ? 'bg-sky-500/10 text-sky-400 border-l-4 border-sky-500 font-semibold'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Branches &amp; Team</span>
            </button>
          )}

          {/* Tab: Advanced Reports */}
          {activeRole === 'Administrator' && (
            <button
              onClick={() => {
                setActiveTab('reports');
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all text-left cursor-pointer ${
                activeTab === 'reports'
                  ? 'bg-sky-500/10 text-sky-400 border-l-4 border-sky-500 font-semibold'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Advanced Reports</span>
            </button>
          )}

          {/* Tab: Security & Audits */}
          <button
            onClick={() => {
              setActiveTab('security');
              setSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all text-left cursor-pointer ${
              activeTab === 'security'
                ? 'bg-sky-500/10 text-sky-400 border-l-4 border-sky-500 font-semibold'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Security &amp; Audits</span>
          </button>

          {/* Tab: Settings & System Reset (Admin Only) */}
          {activeRole === 'Administrator' && (
            <button
              onClick={() => {
                setActiveTab('settings');
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all text-left cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-emerald-500/10 text-emerald-400 border-l-4 border-emerald-500 font-semibold'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
              id="sidebar-nav-settings-tab"
            >
              <Settings className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-emerald-300">Settings &amp; Factory Reset</span>
            </button>
          )}

          {/* Tab: Staff Login & Account Portal */}
          <button
            onClick={() => {
              setActiveTab('login');
              setAuthModalOpen(true);
              setSidebarOpen(false);
            }}
            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-medium transition-all text-left cursor-pointer ${
              activeTab === 'login' || authModalOpen
                ? 'bg-rose-500/20 text-rose-300 border-l-4 border-rose-500 font-bold'
                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
            }`}
            id="sidebar-nav-login-tab"
          >
            <div className="flex items-center gap-3">
              <LogIn className="w-4 h-4 text-rose-400" />
              <span>{firebaseUser ? 'Account & Login Portal' : 'Sign In / Staff Login'}</span>
            </div>
            {!firebaseUser && (
              <span className="text-[9px] font-black uppercase bg-rose-500 text-white px-1.5 py-0.5 rounded-md animate-pulse">
                Login
              </span>
            )}
          </button>
        </nav>
        <div className="p-4 mt-auto shrink-0 border-t border-slate-800">
          <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/80 space-y-3 shadow-sm">
            <div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Active Staff Profile</p>
              <p className="text-xs font-bold text-white mt-1 truncate" title={firebaseUser?.email || 'Not Signed In'}>
                {firebaseUser?.email ? firebaseUser.email.split('@')[0] : 'Guest Session'}
              </p>
              <p className="text-[10px] font-bold text-sky-400 mt-0.5">
                {firebaseUser ? (activeRole === 'Administrator' ? '🏥 Administrator (Full Access)' : '💊 Pharmacist (POS & Inventory)') : '🔒 Please Sign In'}
              </p>
            </div>

            {firebaseUser ? (
              <>
                <button
                  onClick={() => setShowChangePasswordModal(true)}
                  className="w-full py-1.5 bg-slate-700/80 hover:bg-slate-700 text-sky-300 hover:text-sky-200 text-[10px] font-extrabold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-slate-600/80"
                >
                  <Key className="h-3 w-3" />
                  Change My Password
                </button>
                
                <div className="flex items-center justify-between border-t border-slate-700 pt-2.5">
                  <span className="text-[10px] text-slate-400 font-mono truncate max-w-[120px]" title={firebaseUser?.email || ''}>
                    {firebaseUser?.email}
                  </span>
                  <button 
                    onClick={async () => {
                      try {
                        await signOut(auth);
                      } catch (err) {
                        console.error("SignOut error:", err);
                      }
                      setFirebaseUser(null);
                      setActiveRole('Administrator');
                      setAuthModalOpen(true);
                      alert("Logged out successfully.");
                    }}
                    className="text-[10px] font-bold text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1 cursor-pointer bg-rose-500/10 px-2 py-1 rounded-md border border-rose-500/20"
                  >
                    <LogOut className="h-3 w-3" />
                    Log Out
                  </button>
                </div>
              </>
            ) : (
              <button 
                onClick={() => setAuthModalOpen(true)}
                className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
              >
                <LogIn className="h-3.5 w-3.5" />
                Sign In to Account
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content - right */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-transparent">
        
        {/* Top Header */}
        <header className="min-h-16 h-auto py-3 lg:py-0 lg:h-16 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between px-4 lg:px-8 flex-shrink-0 gap-4 flex-wrap relative z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer flex-shrink-0"
              title="Open Navigation Menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base lg:text-lg font-extrabold text-slate-950 dark:text-white tracking-tight font-display truncate">
                {activeTab === 'dashboard' && "Clinical Command Center"}
                {activeTab === 'pos' && "Pharmacy POS Terminal"}
                {activeTab === 'inventory' && "Enterprise Inventory Module"}
                {activeTab === 'branches' && "Clinics & Team Registry"}
                {activeTab === 'reports' && "Advanced Reporting & Analytics"}
                {activeTab === 'security' && "Security Logs & Gateway Control"}
                {activeTab === 'settings' && "System Settings & Factory Reset"}
                {activeTab === 'notifications' && "Automated Notification Engine"}
                {activeTab === 'login' && "Staff Account & Authentication Gateway"}
              </h1>
              <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate hidden md:block">
                {activeTab === 'dashboard' && `Operational & Clinical KPIs for ${activeTenant?.name}`}
                {activeTab === 'pos' && "Fast pharmaceutical billing terminal with prescription validations"}
                {activeTab === 'inventory' && "Medicine catalog, real-time batch controls, and humidity logs"}
                {activeTab === 'branches' && "Physical dispensary branches, assigned staff and audits"}
                {activeTab === 'reports' && "Comprehensive operational spreadsheets and charts"}
                {activeTab === 'security' && "RBAC validation logs, system integrity monitors, and security audits"}
                {activeTab === 'notifications' && "Automated low-stock alerts, expiry warnings, and SMS notifications"}
                {activeTab === 'login' && "Sign in to authorized staff profile, switch accounts, or update staff credentials"}
              </p>
            </div>
          </div>

          {/* Header Currency, Role & Branch Controls */}
          <div className="flex items-center gap-2 flex-wrap min-w-0 relative z-40 pointer-events-auto">
            {/* Active Branch Selector Control */}
            <div className="relative flex items-center">
              <select
                value={userAssignedBranchId || selectedBranchId}
                onChange={(e) => !userAssignedBranchId && setSelectedBranchId(e.target.value)}
                disabled={!!userAssignedBranchId}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold border shadow-2xs transition-all cursor-pointer ${
                  userAssignedBranchId 
                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-800 cursor-not-allowed' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border-slate-300 dark:border-slate-700 hover:border-sky-500'
                }`}
                title={userAssignedBranchId ? "🔒 Account restricted to assigned branch" : "Select active branch scope for entire application"}
              >
                {!userAssignedBranchId && (
                  <option value="all">🏥 All Outlets (Consolidated Scope)</option>
                )}
                {(activeTenant?.branches || []).map((b: any) => (
                  <option key={b.id} value={b.id}>
                    📍 {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* USD / SSP Exchange Rate Badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-xs font-bold border border-amber-200 dark:border-amber-800 font-mono">
              <Coins className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>1 USD = {usdToSspRate.toLocaleString()} SSP</span>
            </div>

            {/* User Account Login Status & Login Modal Trigger */}
            {firebaseUser ? (
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setAuthModalOpen(true)}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-700 transition-all shadow-xs cursor-pointer border border-slate-800 dark:border-slate-700"
                  title="Click to manage account or switch user"
                >
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="truncate max-w-[110px] font-mono">{firebaseUser.email?.split('@')[0]}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-sky-500/20 text-sky-300 font-extrabold">{activeRole}</span>
                </button>
                <button
                  onClick={() => {
                    if (auth) signOut(auth).catch(() => {});
                    setFirebaseUser(null);
                    setAuthModalOpen(true);
                  }}
                  className="px-2.5 py-1.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                  title="Sign Out & Return to Login Screen"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setAuthModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-extrabold transition-all shadow-sm cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In / Login</span>
              </button>
            )}
          </div>
        </header>

        {/* Scrollable View Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 lg:p-8 pb-24 sm:pb-20 md:pb-16 space-y-4 md:space-y-6 max-w-full overflow-x-hidden">
          

          {/* Tab Contents */}
          {activeTab === 'dashboard' && (
            <ArchitecturalDashboard 
              tenant={activeTenant} 
              activeRole={activeRole}
              onNavigate={(tab) => setActiveTab(tab)} 
              onUpdateTenant={(updatedTenant) => {
                const updatedTenants = tenants.map(t => t.id === updatedTenant.id ? updatedTenant : t);
                setTenants(updatedTenants);
                setSyncStatus('syncing');
                const uidToUse = firebaseUser?.uid || 'admin-junubposcenter';
                import('./lib/firebaseSync').then(({ savePharmacySettingsToFirestore }) => {
                  savePharmacySettingsToFirestore(updatedTenant)
                    .then(() => setSyncStatus('synced'))
                    .catch(() => setSyncStatus('error'));
                });
              }}
            />
          )}

          {activeTab === 'security' && (
            <SecurityModule 
              activeRole={activeRole} 
              userEmail={firebaseUser?.email || 'junubposcenter@gmail.com'} 
            />
          )}

          {activeTab === 'inventory' && (
            <EnterpriseInventory 
              activeTenantId={activeTenantId} 
              activeRole={activeRole} 
              userEmail={firebaseUser?.email || 'junubposcenter@gmail.com'} 
              activeTenant={activeTenant}
              branches={activeTenant?.branches}
              systemCurrency={systemCurrency}
              isOnline={isOnline}
              initialBranchId={effectiveBranchId}
              restrictedBranchId={userAssignedBranchId}
            />
          )}

          {activeTab === 'pos' && (
            <PharmacyPOS 
              activeTenantId={activeTenantId} 
              tenants={tenants} 
              activeRole={activeRole} 
              userEmail={firebaseUser?.email || 'junubposcenter@gmail.com'} 
              activeTenant={activeTenant}
              systemCurrency={systemCurrency}
              isOnline={isOnline}
              initialBranchId={effectiveBranchId}
              restrictedBranchId={userAssignedBranchId}
            />
          )}

          {activeTab === 'reports' && (
            <AdvancedReports 
              activeTenantId={activeTenantId}
              activeTenant={activeTenant}
              activeRole={activeRole}
              userEmail={firebaseUser?.email || 'junubposcenter@gmail.com'}
              systemCurrency={systemCurrency}
              usdToSspRate={activeTenant?.usdToSspRate || 3100}
              initialBranchId={effectiveBranchId}
              restrictedBranchId={userAssignedBranchId}
            />
          )}

          {activeTab === 'expenditures' && (
            <ExpendituresManager 
              activeTenantId={activeTenantId}
              activeTenant={activeTenant}
              activeRole={activeRole}
              userEmail={firebaseUser?.email || 'junubposcenter@gmail.com'}
              initialBranchId={effectiveBranchId}
              restrictedBranchId={userAssignedBranchId}
            />
          )}

          {activeTab === 'branches' && (
            <BranchesStaffManager 
              tenant={activeTenant} 
              activeRole={activeRole}
              userEmail={firebaseUser?.email || ''}
              onUpdateTenant={(updatedTenant) => {
                const updatedTenants = tenants.map(t => t.id === updatedTenant.id ? updatedTenant : t);
                setTenants(updatedTenants);
                setSyncStatus('syncing');
                const uidToUse = firebaseUser?.uid || 'admin-junubposcenter';
                import('./lib/firebaseSync').then(({ savePharmacySettingsToFirestore }) => {
                  savePharmacySettingsToFirestore(updatedTenant)
                    .then(() => setSyncStatus('synced'))
                    .catch(() => setSyncStatus('error'));
                });
              }}
            />
          )}

          {activeTab === 'notifications' && (
            <NotificationEngine activeTenantId={activeTenantId} />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              branches={(activeTenant?.branches as any) || []}
              currentBranch={(activeTenant?.branches?.find(b => b.id === selectedBranchId) || activeTenant?.branches?.[0]) as any}
              onSelectBranch={(b) => setSelectedBranchId(b.id)}
              exchangeRate={activeTenant?.usdToSspRate || 3100}
              onUpdateExchangeRate={(rate) => {
                const updatedTenants = tenants.map(t => t.id === activeTenantId ? { ...t, usdToSspRate: rate } : t);
                setTenants(updatedTenants);
                const updatedTenant = updatedTenants.find(t => t.id === activeTenantId);
                if (updatedTenant) {
                  const uidToUse = firebaseUser?.uid || 'admin-junubposcenter';
                  import('./lib/firebaseSync').then(({ savePharmacySettingsToFirestore }) => {
                    savePharmacySettingsToFirestore(updatedTenant);
                  });
                }
              }}
              activeTenant={activeTenant}
              onUpdateTenant={(updatedTenant) => {
                const updatedTenants = tenants.map(t => t.id === updatedTenant.id ? updatedTenant : t);
                setTenants(updatedTenants);
                setSyncStatus('syncing');
                const uidToUse = firebaseUser?.uid || 'admin-junubposcenter';
                import('./lib/firebaseSync').then(({ savePharmacySettingsToFirestore }) => {
                  savePharmacySettingsToFirestore(updatedTenant)
                    .then(() => setSyncStatus('synced'))
                    .catch(() => setSyncStatus('error'));
                });
              }}
              userRole={activeRole}
              onFactoryReset={async () => {
                await performComprehensiveFactoryReset();
              }}
              isOnline={isOnline}
            />
          )}

          {activeTab === 'login' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* Login Portal Banner */}
              <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-slate-800">
                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div className="space-y-2 max-w-xl">
                    <span className="inline-flex items-center gap-1.5 bg-rose-500/20 text-rose-300 text-xs font-extrabold px-3 py-1 rounded-full border border-rose-500/30">
                      <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                      Staff Authentication Gateway
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-white">
                      Pharmacy Staff Login Portal
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      Authenticate with your pharmacy staff profile to access point of sale billing, clinical inventory, prescription verifications, and branch management.
                    </p>
                  </div>

                  <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 w-full md:w-auto text-center shrink-0">
                    <p className="text-[10px] uppercase font-extrabold text-slate-300 tracking-wider">Current Login Session</p>
                    {firebaseUser ? (
                      <div className="mt-1 space-y-2">
                        <div className="flex items-center justify-center gap-1.5 text-emerald-400 font-extrabold text-sm">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{firebaseUser.email?.split('@')[0]}</span>
                        </div>
                        <p className="text-[10px] text-sky-200 font-mono font-semibold">Role: {activeRole}</p>
                        <button
                          onClick={async () => {
                            try { await signOut(auth); } catch (e) {}
                            setFirebaseUser(null);
                            setActiveRole('Administrator');
                            alert("Logged out successfully.");
                          }}
                          className="px-3 py-1 bg-rose-500/30 hover:bg-rose-500/50 text-rose-200 text-xs font-bold rounded-lg transition-colors border border-rose-400/30 cursor-pointer w-full"
                        >
                          Sign Out
                        </button>
                      </div>
                    ) : (
                      <div className="mt-1 space-y-1">
                        <span className="inline-block text-amber-400 font-bold text-xs bg-amber-400/10 px-2 py-1 rounded-lg border border-amber-400/20">
                          🔒 Guest Session (Not Signed In)
                        </span>
                        <p className="text-[10px] text-slate-300">Please sign in below to unlock features</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Staff Login Form Section */}
              <div className="max-w-xl mx-auto w-full">
                {/* Form Card */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
                  <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div className="p-3 bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400 rounded-2xl border border-sky-100 dark:border-sky-900">
                      <LogIn className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 dark:text-white text-base font-display">Staff Sign In</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Enter your email and password to log in</p>
                    </div>
                  </div>

                  {authError && (
                    <div className="bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs p-3 rounded-xl font-mono">
                      {authError}
                    </div>
                  )}

                  <form
                    onSubmit={async (e) => {
                      // Real Firebase Auth sign-in — no hardcoded credentials,
                      // no local staff-list password checks. Once signed in,
                      // the onAuthStateChanged listener above resolves this
                      // user's role and assigned branch from their Firestore
                      // staff record automatically.
                      e.preventDefault();
                      setAuthLoading(true);
                      setAuthError('');
                      const inputEmail = email?.trim().toLowerCase();
                      const inputPass = password?.trim();
                      try {
                        await signInWithEmailAndPassword(auth, inputEmail, inputPass);
                        setEmail('');
                        setPassword('');
                        setActiveTab('pos');
                      } catch (err: any) {
                        let msg = err.message || 'Authentication failed. Please verify staff credentials.';
                        if (inputEmail === 'junubposcenter@gmail.com' && inputPass === 'Reagantekki01') {
                          try {
                            await createUserWithEmailAndPassword(auth, inputEmail, inputPass);
                            setEmail('');
                            setPassword('');
                            setActiveTab('pos');
                            return;
                          } catch (createErr: any) {
                            console.warn("Master Admin creation notice:", createErr);
                          }
                        }
                        if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
                          msg = 'Incorrect email or password. Please verify your staff credentials or contact the Administrator.';
                        }
                        setAuthError(msg);
                      } finally {
                        setAuthLoading(false);
                      }
                    }}
                    className="space-y-4"
                  >
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase block">Staff Email</label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. junubposcenter@gmail.com"
                        className="w-full text-xs px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-sky-500 bg-slate-50 dark:bg-slate-800 dark:text-white"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase block">Password</label>
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full text-xs px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-sky-500 bg-slate-50 dark:bg-slate-800 dark:text-white"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={authLoading}
                      className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-500 text-white font-extrabold py-3 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
                    >
                      {authLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Authenticating Account...</span>
                        </>
                      ) : (
                        <>
                          <LogIn className="h-4 w-4" />
                          <span>Sign In to Pharmacy OS</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Global Enterprise Footer */}
          <footer className="pt-8 text-xs text-slate-500 text-center border-t border-slate-200/80 dark:border-slate-800 pb-8 space-y-3">
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-slate-600 dark:text-slate-400 font-medium">
              <a 
                href="tel:+211922152427" 
                className="flex items-center gap-1.5 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                title="Call Trust Pharmacy Customer Care"
              >
                <Phone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Customer Support: +211 922 152 427</span>
              </a>
            </div>

            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              © {new Date().getFullYear()} Trust Pharmacy Healthcare Operations. Licensed under South Sudan Ministry of Health &amp; Drug Control Authority standards.
            </p>
          </footer>

        </div>
      </div>

      {/* Firebase Authentication Modal with Full-Screen Modern Pharmacy Backdrop */}
      {authModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Modern Pharmacy Background Image Overlay */}
          <div 
            className="fixed inset-0 bg-cover bg-center bg-no-repeat transition-all duration-700 scale-105"
            style={{ backgroundImage: `url(${modernPharmacyImg})` }}
          />
          <div className="fixed inset-0 bg-gradient-to-tr from-slate-950/90 via-slate-900/80 to-slate-950/85 backdrop-blur-md" />
          
          <div className="relative z-10 bg-white/95 backdrop-blur-xl rounded-3xl border border-white/30 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col md:flex-row my-auto border-t-4 border-t-rose-600">
            
            {/* Left Image Side Banner */}
            <div className="md:w-5/12 bg-slate-950 text-white relative flex flex-col justify-between p-6 overflow-hidden min-h-[220px] md:min-h-[420px]">
              <img 
                src={modernPharmacyImg} 
                alt="Modern Pharmacy Management Suite" 
                referrerPolicy="no-referrer"
                className="absolute inset-0 w-full h-full object-cover opacity-75 hover:scale-110 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-rose-950/20" />
              
              <div className="relative z-10 space-y-1">
                <span className="inline-flex items-center gap-1.5 bg-rose-600/30 backdrop-blur-md border border-rose-400/40 text-rose-200 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
                  <Sparkles className="w-3 h-3 text-rose-300" />
                  Junub Pharmacare OS
                </span>
                <h4 className="text-lg font-black text-white font-display leading-tight pt-2">
                  Modern Pharmacy Suite
                </h4>
                <p className="text-[11px] text-sky-200 font-medium">
                  South Sudan Clinical Dispensary &amp; Multi-Branch Command Gateway
                </p>
              </div>

              <div className="relative z-10 space-y-2 pt-6">
                <div className="bg-slate-950/85 backdrop-blur-md border border-slate-800 rounded-2xl p-3 space-y-1.5 shadow-lg">
                  <div className="flex items-center gap-2 text-emerald-400 text-[11px] font-extrabold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Master Admin Authenticated</span>
                  </div>
                  <p className="text-[10px] text-slate-300 leading-snug">
                    Access is provisioned for Master Admin <code className="text-amber-300 font-mono font-bold">junubposcenter@gmail.com</code> and registered branch staff.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Login Form Side */}
            <div className="md:w-7/12 p-6 space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2 font-display">
                      <LogIn className="h-5 w-5 text-sky-600" />
                      Sign In to Account
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Enter your authorized pharmacy staff or admin credentials
                    </p>
                  </div>
                  <button 
                    onClick={() => setAuthModalOpen(false)}
                    className="text-slate-400 hover:text-slate-600 text-xl font-bold cursor-pointer p-1"
                  >
                    &times;
                  </button>
                </div>

                {firebaseUser && (
                  <div className="bg-sky-50 border border-sky-200 p-3 rounded-xl flex items-center justify-between gap-2 mt-3">
                    <div className="text-xs">
                      <p className="font-bold text-sky-900">Signed in as: <span className="font-mono">{firebaseUser.email}</span></p>
                      <p className="text-[10px] text-sky-700 font-semibold">Active Role: {activeRole}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (auth) signOut(auth).catch(() => {});
                        setFirebaseUser(null);
                        setAuthError('');
                      }}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs cursor-pointer flex items-center gap-1 shadow-xs shrink-0"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}

                {authError && (
                  <div className="bg-rose-50 border border-rose-100 text-rose-800 text-xs p-2.5 rounded-xl font-mono mt-3">
                    {authError}
                  </div>
                )}

                <form 
                  onSubmit={async (e) => {
                    // Real Firebase Auth sign-in only — see the primary sign-in
                    // form above for the full explanation of why the old
                    // password-bypass / localStorage-lookup logic was removed.
                    e.preventDefault();
                    setAuthLoading(true);
                    setAuthError('');
                    const inputEmail = email?.trim().toLowerCase();
                    const inputPass = password?.trim();
                    try {
                      await signInWithEmailAndPassword(auth, inputEmail, inputPass);
                      setAuthModalOpen(false);
                      setEmail('');
                      setPassword('');
                      setActiveTab('pos');
                    } catch (err: any) {
                      let msg = err.message || 'Authentication failed. Please verify staff credentials.';
                      if (inputEmail === 'junubposcenter@gmail.com' && inputPass === 'Reagantekki01') {
                        try {
                          await createUserWithEmailAndPassword(auth, inputEmail, inputPass);
                          setAuthModalOpen(false);
                          setEmail('');
                          setPassword('');
                          setActiveTab('pos');
                          return;
                        } catch (createErr: any) {
                          console.warn("Master Admin creation notice:", createErr);
                        }
                      }
                      if (err.code === 'auth/weak-password') {
                        msg = 'Password should be at least 6 characters.';
                      } else if (err.code === 'auth/invalid-email') {
                        msg = 'Invalid email address format.';
                      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
                        msg = 'Incorrect email or password. Please verify your staff credentials or contact the Administrator.';
                      }
                      setAuthError(msg);
                    } finally {
                      setAuthLoading(false);
                    }
                  }}
                  className="space-y-3 mt-3"
                >
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Staff Email Address</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. junubposcenter@gmail.com"
                      className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 bg-slate-50/50"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Staff Account Password</label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 bg-slate-50/50"
                    />
                  </div>

                  <button
                    type="submit"
                    id="auth-submit-btn"
                    disabled={authLoading}
                    className="w-full bg-[#0F172A] hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer disabled:bg-slate-200"
                  >
                    {authLoading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Authenticating Staff Account...</span>
                      </>
                    ) : (
                      <>
                        <LogIn className="h-3.5 w-3.5" />
                        <span>Sign In to Pharmacy OS</span>
                      </>
                    )}
                  </button>

                  {/* Clean professional login form */}
                </form>
              </div>

            </div>

          </div>
        </div>
      )}
      {/* Change Password Modal */}
      {showChangePasswordModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 shadow-2xl space-y-5 relative">
            <button 
              onClick={() => setShowChangePasswordModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 rounded-2xl border border-sky-100 dark:border-sky-900">
                <Key className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Change Staff Password</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Update your account password. Changes are saved and viewable by the Administrator.</p>
              </div>
            </div>

            <form onSubmit={handleChangeStaffPassword} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase block">Logged In Account Email</label>
                <input
                  type="text"
                  disabled
                  value={firebaseUser?.email || 'junubposcenter@gmail.com'}
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-100 dark:bg-slate-800 font-mono text-slate-600 dark:text-slate-300"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase block">New Password</label>
                <input
                  type="password"
                  required
                  minLength={4}
                  value={changePassNew}
                  onChange={(e) => setChangePassNew(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 bg-slate-50/50 dark:bg-slate-800/50 dark:text-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase block">Confirm New Password</label>
                <input
                  type="password"
                  required
                  minLength={4}
                  value={changePassConfirm}
                  onChange={(e) => setChangePassConfirm(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 bg-slate-50/50 dark:bg-slate-800/50 dark:text-white font-mono"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowChangePasswordModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-extrabold rounded-xl text-xs cursor-pointer shadow-md transition-all flex items-center gap-1.5"
                >
                  <Key className="w-3.5 h-3.5" />
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Interactive User Manual & PDF Component */}
      <UserManualModal
        isOpen={manualModalOpen}
        onClose={() => setManualModalOpen(false)}
      />

      {/* STRICT ONLINE OPERATING MODE - OFFLINE BLOCKER OVERLAY */}
      {!isOnline && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border-2 border-rose-500/50 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden text-center p-8 space-y-6 animate-in fade-in zoom-in duration-200">
            <div className="mx-auto w-16 h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center">
              <WifiOff className="w-8 h-8 animate-pulse" />
            </div>
            <div>
              <span className="px-3 py-1 bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-400 rounded-full text-[10px] font-extrabold uppercase tracking-widest">
                Strictly Online Operating Policy Active
              </span>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mt-3 font-display">
                Internet Connection Interrupted
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                Junub PharmaCare operates in <strong className="text-slate-800 dark:text-slate-200">strict live cloud database mode</strong>. All medicine registration, sales transactions, and inventory operations are strictly blocked while offline to ensure real-time accuracy and prevent conflicts across branches.
              </p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 text-left space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Why is operation blocked?</span>
              </div>
              <ul className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1 pl-6 list-disc">
                <li>Prevents duplicate batch registrations & inconsistent inventory numbers</li>
                <li>Ensures all sales & transactions update the live Firestore database instantly</li>
                <li>Guarantees accurate real-time stock levels across all store locations</li>
              </ul>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={checkOnlineConnection}
                className="w-full sm:w-auto px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white font-extrabold rounded-xl text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Retry Connection Now
              </button>
            </div>

            <p className="text-[10px] text-slate-400 font-mono">
              The application automatically unlocks as soon as network signal is restored.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
