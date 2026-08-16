import React, { useState, useEffect, useMemo } from 'react';
import { 
  Activity, 
  ShoppingCart, 
  Package, 
  Building2, 
  Users, 
  ShieldCheck, 
  TrendingUp, 
  AlertTriangle, 
  ArrowRight,
  FileText,
  Clock,
  HeartHandshake,
  DollarSign,
  Coins,
  Edit3,
  Calendar,
  X,
  BellRing,
  CheckCircle2
} from 'lucide-react';
import { Tenant, DrugItem, Transaction, Prescription } from '../types';
import { loadTransactionsFromFirestore, subscribeToTransactionsFirestore } from '../lib/firebaseSync';
import { getTransactionTotal, getTransactionProfit, getTransactionCost } from '../utils/financialCalculations';

interface ArchitecturalDashboardProps {
  tenant: Tenant;
  activeRole?: string;
  onNavigate: (tab: any) => void;
  onUpdateTenant?: (tenant: Tenant) => void;
}

export default function ArchitecturalDashboard({ tenant, activeRole = 'Administrator', onNavigate, onUpdateTenant }: ArchitecturalDashboardProps) {
  const isAdmin = ['Master Admin', 'Administrator', 'Pharmacy Admin'].includes(activeRole);

  // Branch analysis selection state
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  
  // Currency state
  const [displayCurrency, setDisplayCurrency] = useState<'SSP' | 'USD'>('SSP');
  const [usdToSspRate, setUsdToSspRate] = useState<number>(tenant.usdToSspRate || 3100);
  const [showRateModal, setShowRateModal] = useState<boolean>(false);
  const [newRateInput, setNewRateInput] = useState<string>((tenant.usdToSspRate || 3100).toString());
  const [bannerDismissed, setBannerDismissed] = useState<boolean>(false);

  // Synchronize exchange rate whenever tenant settings update from Firestore
  useEffect(() => {
    if (typeof tenant.usdToSspRate === 'number' && tenant.usdToSspRate > 0) {
      setUsdToSspRate(tenant.usdToSspRate);
      setNewRateInput(tenant.usdToSspRate.toString());
    }
  }, [tenant.usdToSspRate]);

  // Branch clinics list (Active only for operations)
  const branches = useMemo(() => (tenant.branches || []).filter((b: any) => b && b.isActive !== false), [tenant.branches]);

  // Branch Matching Helper
  const isBranchMatch = (itemBranchId?: string, itemBranchName?: string, targetBranchId?: string) => {
    if (!targetBranchId || targetBranchId === 'all' || targetBranchId === 'All') return true;
    if (itemBranchId === targetBranchId) return true;

    const targetBranch = branches.find((b: any) => b.id === targetBranchId);
    if (targetBranch) {
      if (itemBranchId === targetBranch.id) return true;
      if (itemBranchName && targetBranch.name && itemBranchName.trim().toLowerCase() === targetBranch.name.trim().toLowerCase()) {
        return true;
      }
    }

    const targetIndex = branches.findIndex((b: any) => b.id === targetBranchId);
    if (targetIndex !== -1) {
      const legacyStoreId = `store-${targetIndex + 1}`;
      const legacyBranchId = `branch-juba-${targetIndex + 1}`;
      if (itemBranchId === legacyStoreId || itemBranchId === legacyBranchId) return true;
    }

    // If an item lacks branch tags, match only the main branch (first branch)
    if (branches[0] && branches[0].id === targetBranchId && !itemBranchId && !itemBranchName) {
      return true;
    }

    return false;
  };

  // Enforce branch isolation for non-admin staff
  useEffect(() => {
    if (!isAdmin && branches.length > 0 && selectedBranchId === 'all') {
      setSelectedBranchId(branches[0].id);
    }
  }, [isAdmin, branches, selectedBranchId]);

  // Stats calculation
  const branchesCount = tenant.branches?.length || 0;
  const branchFilteredStaff = selectedBranchId === 'all'
    ? (tenant.staff || [])
    : (tenant.staff || []).filter((s: any) => isBranchMatch(s.branchId, undefined, selectedBranchId));
  const staffCount = branchFilteredStaff.length;

  // State for loaded data
  const [loadedBatches, setLoadedBatches] = useState<any[]>([]);
  const [securityLogs, setSecurityLogs] = useState<any[]>([]);
  const [transactionsList, setTransactionsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const safeTxList = Array.isArray(transactionsList) ? transactionsList : [];
  
  const branchFilteredTx = selectedBranchId === 'all'
    ? safeTxList
    : safeTxList.filter((tx: any) => {
        const txBranchId = tx.branchId || tx.storeId;
        const txBranchName = tx.branchName || tx.storeName;
        return isBranchMatch(txBranchId, txBranchName, selectedBranchId);
      });

  const branchFilteredBatches = selectedBranchId === 'all'
    ? loadedBatches
    : loadedBatches.filter((b: any) => isBranchMatch(b.storeId || b.branchId, b.storeName || b.branchName, selectedBranchId));

  const itemsCount = branchFilteredBatches.length;

  const criticalStockAlerts = branchFilteredBatches
    .filter((b: any) => (b.quantity || 0) <= (b.minStockAlert || 15))
    .map((b: any) => ({
      id: b.id,
      name: b.name,
      stock: b.quantity || 0,
      limit: b.minStockAlert || 15,
      branch: b.storeName || b.branchName || 'Main Branch',
      risk: (b.quantity || 0) === 0 ? 'CRITICAL' : 'HIGH'
    }))
    .slice(0, 5);

  const now = new Date();
  const todayYear = now.getFullYear();
  const todayMonth = now.getMonth();
  const todayDate = now.getDate();

  const todayUtcYear = now.getUTCFullYear();
  const todayUtcMonth = now.getUTCMonth();
  const todayUtcDate = now.getUTCDate();

  const todayIsoPrefix = now.toISOString().split('T')[0];

  const todayTx = branchFilteredTx.filter((tx: any) => {
    const txDateStr = tx.createdAt || tx.timestamp || tx.date;
    if (!txDateStr) return false;
    if (typeof txDateStr === 'string' && txDateStr.startsWith(todayIsoPrefix)) {
      return true;
    }
    const d = new Date(txDateStr);
    if (isNaN(d.getTime())) return false;
    const isLocalToday = d.getFullYear() === todayYear && d.getMonth() === todayMonth && d.getDate() === todayDate;
    const isUtcToday = d.getUTCFullYear() === todayUtcYear && d.getUTCMonth() === todayUtcMonth && d.getUTCDate() === todayUtcDate;
    return isLocalToday || isUtcToday;
  });

  // Load operational expenditures and recovered debts from local storage / Firestore, strictly branch filtered
  let totalApprovedExpensesUsd = 0;
  try {
    const expStr = localStorage.getItem('junub_expenditures');
    if (expStr) {
      const expList = JSON.parse(expStr);
      totalApprovedExpensesUsd = expList
        .filter((e: any) => e.status === 'approved' && isBranchMatch(e.branchId || e.storeId, e.branchName || e.storeName, selectedBranchId))
        .reduce((sum: number, e: any) => sum + (Number(e.amountUsd) || 0), 0);
    }
  } catch(e) {}

  let totalRecoveredDebtsUsd = 0;
  try {
    const recStr = localStorage.getItem('junub_recovered_debts');
    if (recStr) {
      const recList = JSON.parse(recStr);
      totalRecoveredDebtsUsd = recList
        .filter((r: any) => isBranchMatch(r.branchId || r.storeId, r.branchName || r.storeName, selectedBranchId))
        .reduce((sum: number, r: any) => sum + (Number(r.amountPaidUsd) || 0), 0);
    }
  } catch(e) {}

  // Direct Sales (Cash, Mobile, Card, Insurance - non-credit sales)
  const todayDirectSales = todayTx
    .filter(tx => !tx.paymentMethod || !['credit', 'debt'].includes(tx.paymentMethod.toLowerCase()))
    .reduce((sum, tx) => sum + getTransactionTotal(tx), 0);

  const todayOutstandingDebts = todayTx
    .filter(tx => tx.paymentMethod && ['credit', 'debt'].includes(tx.paymentMethod.toLowerCase()))
    .reduce((sum, tx) => sum + getTransactionTotal(tx), 0);

  // Gross POS Sales = Direct Cash/Mobile/Card Sales + Outstanding Credit Sales (Matches POS checkout 100%)
  const todayGrossSales = todayDirectSales + todayOutstandingDebts;
  const todayNetTotalSales = Math.max(0, todayDirectSales + totalRecoveredDebtsUsd - totalApprovedExpensesUsd);
  const todayTotalSales = todayGrossSales;
  const todayCashSales = todayDirectSales;
  const todayDebtSales = todayOutstandingDebts;

  const todayOrdersCount = todayTx.length;
  const todayDispensedUnits = todayTx.reduce((sum, tx) => {
    if (Array.isArray(tx.items)) {
      return sum + tx.items.reduce((iSum: number, item: any) => iSum + (Number(item.quantity) || 0), 0);
    }
    return sum;
  }, 0);
  const todayEstProfit = todayTx.reduce((sum, tx) => sum + getTransactionProfit(tx), 0);

  // Monthly stats
  const thisMonthTx = branchFilteredTx.filter((tx: any) => {
    const txDateStr = tx.createdAt || tx.timestamp || tx.date;
    if (!txDateStr) return false;
    const d = new Date(txDateStr);
    if (isNaN(d.getTime())) return false;
    return d.getFullYear() === todayYear && d.getMonth() === todayMonth;
  });

  const monthlyDirectSales = thisMonthTx
    .filter(tx => !tx.paymentMethod || !['credit', 'debt'].includes(tx.paymentMethod.toLowerCase()))
    .reduce((sum, tx) => sum + getTransactionTotal(tx), 0);

  const monthlyOutstandingDebts = thisMonthTx
    .filter(tx => tx.paymentMethod && ['credit', 'debt'].includes(tx.paymentMethod.toLowerCase()))
    .reduce((sum, tx) => sum + getTransactionTotal(tx), 0);

  const monthlyGrossSales = monthlyDirectSales + monthlyOutstandingDebts;
  const monthlyTotalSales = monthlyGrossSales;
  const monthlyOrdersCount = thisMonthTx.length;
  const monthlyEstProfit = thisMonthTx.reduce((sum, tx) => sum + getTransactionProfit(tx), 0);
  const monthlyPrescriptionsFilled = thisMonthTx.filter(tx => tx.prescriptionId || tx.requiresPrescription).length;

  // Last Month stats
  const lastMonthYear = todayMonth === 0 ? todayYear - 1 : todayYear;
  const lastMonthIndex = todayMonth === 0 ? 11 : todayMonth - 1;
  const lastMonthTx = branchFilteredTx.filter((tx: any) => {
    const txDateStr = tx.createdAt || tx.timestamp || tx.date;
    if (!txDateStr) return false;
    const d = new Date(txDateStr);
    if (isNaN(d.getTime())) return false;
    return d.getFullYear() === lastMonthYear && d.getMonth() === lastMonthIndex;
  });
  const lastMonthTotalSales = lastMonthTx.reduce((sum, tx) => sum + getTransactionTotal(tx), 0);
  const lastMonthOrdersCount = lastMonthTx.length;
  const lastMonthEstProfit = lastMonthTx.reduce((sum, tx) => sum + getTransactionProfit(tx), 0);
  const lastMonthAvgOrder = lastMonthOrdersCount > 0 ? (lastMonthTotalSales / lastMonthOrdersCount) : 0;

  // Wholesale vs Retail Channel Sales Metrics Calculation (Today & Monthly)
  let todayWholesaleRevenue = 0;
  let todayRetailRevenue = 0;
  let todayWholesaleUnits = 0;
  let todayRetailUnits = 0;
  let todayWholesaleTxCount = 0;
  let todayRetailTxCount = 0;

  todayTx.forEach((tx: any) => {
    let hasWholesale = false;
    let hasRetail = false;

    if (Array.isArray(tx.items) && tx.items.length > 0) {
      tx.items.forEach((item: any) => {
        const qty = Number(item.quantity) || 1;
        const price = Number(item.price) || 0;
        const itemRev = price * qty;
        const minQty = Number(item.wholesaleLimit || 10);
        const isWholesale = item.pricingType === 'Wholesale' || 
                            qty >= minQty ||
                            (item.retailPrice && price < Number(item.retailPrice));
        if (isWholesale) {
          todayWholesaleRevenue += itemRev;
          todayWholesaleUnits += qty;
          hasWholesale = true;
        } else {
          todayRetailRevenue += itemRev;
          todayRetailUnits += qty;
          hasRetail = true;
        }
      });
    } else {
      todayRetailRevenue += (Number(tx.total) || Number(tx.subtotal) || 0);
      hasRetail = true;
    }

    if (hasWholesale) todayWholesaleTxCount++;
    if (hasRetail) todayRetailTxCount++;
  });

  let monthlyWholesaleRevenue = 0;
  let monthlyRetailRevenue = 0;
  let monthlyWholesaleUnits = 0;
  let monthlyRetailUnits = 0;

  thisMonthTx.forEach((tx: any) => {
    if (Array.isArray(tx.items) && tx.items.length > 0) {
      tx.items.forEach((item: any) => {
        const qty = Number(item.quantity) || 1;
        const price = Number(item.price) || 0;
        const itemRev = price * qty;
        const minQty = Number(item.wholesaleLimit || 10);
        const isWholesale = item.pricingType === 'Wholesale' || 
                            qty >= minQty ||
                            (item.retailPrice && price < Number(item.retailPrice));
        if (isWholesale) {
          monthlyWholesaleRevenue += itemRev;
          monthlyWholesaleUnits += qty;
        } else {
          monthlyRetailRevenue += itemRev;
          monthlyRetailUnits += qty;
        }
      });
    } else {
      monthlyRetailRevenue += (Number(tx.total) || Number(tx.subtotal) || 0);
    }
  });

  const todayCombinedRev = todayWholesaleRevenue + todayRetailRevenue;
  const todayWholesalePct = todayCombinedRev > 0 ? (todayWholesaleRevenue / todayCombinedRev) * 100 : 0;
  const todayRetailPct = todayCombinedRev > 0 ? (todayRetailRevenue / todayCombinedRev) * 100 : 0;

  const handleSaveRate = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(newRateInput);
    if (!parsed || parsed <= 0) return;
    
    setUsdToSspRate(parsed);
    const updatedTenant = {
      ...tenant,
      usdToSspRate: parsed
    };
    if (onUpdateTenant) {
      onUpdateTenant(updatedTenant);
    }
    try {
      const { savePharmacySettingsToFirestore } = await import('../lib/firebaseSync');
      await savePharmacySettingsToFirestore(updatedTenant);
    } catch (err) {
      console.warn('Failed to save rate to Firestore:', err);
    }
    setShowRateModal(false);
  };
  
  // Load dashboard data and simulate/fetch
  useEffect(() => {
    let active = true;
    async function loadDashboardData() {
      setIsLoading(true);
      try {
        // Populate mock security audits
        setSecurityLogs([
          { id: 'sec-1', event: 'Pharmacist Prescription Approved', detail: 'Dr. John Pharmacist approved Rx for Alice Smith', time: '10 mins ago', type: 'info' },
          { id: 'sec-2', event: 'Inventory Stock Level Adjusted', detail: 'Central branch updated Amoxicillin lot (+120 units)', time: '35 mins ago', type: 'success' },
          { id: 'sec-3', event: 'POS Sale Finalized', detail: 'Invoice INV-SSD-00109 completed by Cashier Jane', time: '1 hour ago', type: 'info' },
          { id: 'sec-4', event: 'User Multi-Factor Auth Passed', detail: 'Dr. Sand Reagan logged in from Juba Main Office', time: '2 hours ago', type: 'security' },
          { id: 'sec-5', event: 'Stock Transfer Registered', detail: '15 units transferred from Central to Airport Rd', time: '4 hours ago', type: 'transfer' },
        ]);

        // Fetch batches safely
        let loadedBatchesList: any[] = [];
        try {
          const batchesRes = await fetch(`/api/v1/${tenant.id}/inventory/batches`);
          if (batchesRes.ok) {
            const batchesData = await batchesRes.json();
            loadedBatchesList = Array.isArray(batchesData?.data) ? batchesData.data : (Array.isArray(batchesData) ? batchesData : []);
          }
        } catch (e) {}

        // Always check and merge local batches (which contain reduced quantities from POS checkout)
        const cachedBatchesStr = localStorage.getItem(`junub_inventory_batches_${tenant.id}`);
        if (cachedBatchesStr) {
          try {
            const cachedBatches = JSON.parse(cachedBatchesStr);
            if (Array.isArray(cachedBatches) && cachedBatches.length > 0) {
              const batchMap = new Map();
              loadedBatchesList.forEach((b: any) => batchMap.set(b.id || b.batchNumber || b.name, b));
              cachedBatches.forEach((cb: any) => {
                const key = cb.id || cb.batchNumber || cb.name;
                batchMap.set(key, cb); // Local batch takes precedence for live stock deduction
              });
              loadedBatchesList = Array.from(batchMap.values());
            }
          } catch (err) {}
        }

        if (active) {
          setLoadedBatches(loadedBatchesList);
        }
        
        // Fetch transactions safely from server API, Firestore, and LocalStorage
        let loadedTransactions: any[] = [];
        try {
          const txRes = await fetch(`/api/v1/${tenant.id}/transactions`);
          if (txRes.ok) {
            const txData = await txRes.json();
            loadedTransactions = Array.isArray(txData?.data) ? txData.data : (Array.isArray(txData) ? txData : []);
          }
        } catch (e) {}

        let firestoreTx: any[] = [];
        try {
          firestoreTx = await loadTransactionsFromFirestore(tenant.id);
        } catch (e) {}

        // Merge locally saved sales from POS, server, and Firestore
        const txMap = new Map();
        loadedTransactions.forEach((tx: any) => {
          const k = tx.id || tx.invoiceNumber;
          if (k) txMap.set(k, tx);
        });

        firestoreTx.forEach((tx: any) => {
          const k = tx.id || tx.invoiceNumber;
          if (k && !txMap.has(k)) txMap.set(k, tx);
        });

        [
          'trust_pharmacy_sales', 
          `junub_transactions_${tenant.id}`,
          'junub_transactions_shared-global-tenant-v1',
          `jubu_offline_queue_${tenant.id}`,
          'jubu_offline_queue_shared-global-tenant-v1'
        ].forEach(storeKey => {
          const cachedStr = localStorage.getItem(storeKey);
          if (cachedStr) {
            try {
              const cachedTx = JSON.parse(cachedStr);
              if (Array.isArray(cachedTx)) {
                cachedTx.forEach((tx: any) => {
                  const k = tx.id || tx.invoiceNumber;
                  if (k) {
                    txMap.set(k, tx);
                  }
                });
              }
            } catch (err) {}
          }
        });

        const mergedTx = Array.from(txMap.values());

        if (!active) return;
        
        setTransactionsList(prev => {
          const map = new Map();
          (prev || []).forEach((t: any) => { const k = t.id || t.invoiceNumber; if (k) map.set(k, t); });
          mergedTx.forEach((t: any) => { const k = t.id || t.invoiceNumber; if (k) map.set(k, t); });
          const combined = Array.from(map.values());
          if (combined.length > 0) {
            try {
              localStorage.setItem(`junub_transactions_${tenant.id}`, JSON.stringify(combined));
              localStorage.setItem('trust_pharmacy_sales', JSON.stringify(combined));
            } catch (e) {}
          }
          return combined;
        });

      } catch (err) {
        console.error("Error loading dashboard data:", err);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    loadDashboardData();

    // Subscribe to Firestore live transaction snapshots with active tenant filter
    const handleIncomingTransactions = (incomingTxs: any[]) => {
      if (Array.isArray(incomingTxs) && incomingTxs.length > 0) {
        setTransactionsList(prev => {
          const map = new Map();
          (prev || []).forEach((t: any) => { const k = t.id || t.invoiceNumber; if (k) map.set(k, t); });
          incomingTxs.forEach((t: any) => { const k = t.id || t.invoiceNumber; if (k) map.set(k, t); });
          const merged = Array.from(map.values());
          try {
            localStorage.setItem(`junub_transactions_${tenant.id}`, JSON.stringify(merged));
            localStorage.setItem('trust_pharmacy_sales', JSON.stringify(merged));
          } catch (e) {}
          return merged;
        });
      }
    };

    const unSubFs1 = subscribeToTransactionsFirestore(tenant.id, handleIncomingTransactions);
    const unSubFs2 = tenant.id !== 'shared-global-tenant-v1' 
      ? subscribeToTransactionsFirestore('shared-global-tenant-v1', handleIncomingTransactions)
      : () => {};

    // Listen for live POS sales and inventory changes
    const handleLiveUpdates = () => {
      loadDashboardData();
    };

    window.addEventListener('junub_inventory_updated', handleLiveUpdates);
    window.addEventListener('junub_transaction_added', handleLiveUpdates);
    window.addEventListener('junub_reports_cleared', handleLiveUpdates);
    window.addEventListener('junub_system_reset', handleLiveUpdates);
    window.addEventListener('system_factory_reset', handleLiveUpdates);
    window.addEventListener('trust_pharmacy_reset_complete', handleLiveUpdates);
    window.addEventListener('storage', handleLiveUpdates);

    return () => {
      active = false;
      unSubFs1();
      unSubFs2();
      window.removeEventListener('junub_inventory_updated', handleLiveUpdates);
      window.removeEventListener('junub_transaction_added', handleLiveUpdates);
      window.removeEventListener('junub_reports_cleared', handleLiveUpdates);
      window.removeEventListener('junub_system_reset', handleLiveUpdates);
      window.removeEventListener('system_factory_reset', handleLiveUpdates);
      window.removeEventListener('trust_pharmacy_reset_complete', handleLiveUpdates);
      window.removeEventListener('storage', handleLiveUpdates);
    };
  }, [tenant]);

  return (
    <div id="unified-dashboard-root" className="space-y-6">

      {/* Top Command Bar: Currency Switcher & Exchange Rate Control */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 border border-sky-800/40 p-4 rounded-2xl text-white flex flex-wrap items-center justify-between gap-4 shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-sky-500/20 border border-sky-500/40 rounded-xl text-sky-400">
            <Coins className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-white tracking-wide">Clinical Command Center</h3>
            <p className="text-[11px] text-slate-300">Multi-currency valuation mode &amp; live central exchange rate controller</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Branch Analysis Selector */}
          <div className="flex items-center gap-2 bg-slate-800/90 border border-sky-500/30 px-3 py-1.5 rounded-xl">
            <Building2 className="h-4 w-4 text-sky-400" />
            <span className="text-[10px] font-extrabold uppercase text-sky-300">AnalysisScope:</span>
            {isAdmin ? (
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="bg-slate-900 text-white font-extrabold text-xs px-2 py-1 rounded-lg border border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
              >
                <option value="all">📊 ALL BRANCHES (CONSOLIDATED ANALYSIS)</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>🏥 {b.name.toUpperCase()}</option>
                ))}
              </select>
            ) : (
              <div className="text-white font-extrabold text-xs px-2 py-1 rounded-lg bg-slate-900/90 border border-slate-700 flex items-center gap-1.5">
                <span>🏥 {branches.find(b => b.id === selectedBranchId)?.name.toUpperCase() || branches[0]?.name.toUpperCase() || 'ASSIGNED OUTLET BRANCH'}</span>
                <span className="text-[9px] text-amber-300 bg-amber-950/80 px-1.5 py-0.5 rounded font-mono border border-amber-800/50">STAFF BRANCH SCOPE</span>
              </div>
            )}
          </div>

          {/* Currency Mode Switcher Buttons */}
          <div className="bg-slate-800/80 p-1 rounded-xl border border-slate-700/80 flex items-center gap-1 shadow-inner">
            <button
              onClick={() => {
                setDisplayCurrency('SSP');
                if (tenant) onUpdateTenant?.({ ...tenant, currency: 'SSP' });
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                displayCurrency === 'SSP'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <span>🇸🇸</span>
              <span>SSP (South Sudanese Pound)</span>
            </button>
            <button
              onClick={() => {
                setDisplayCurrency('USD');
                if (tenant) onUpdateTenant?.({ ...tenant, currency: 'USD' });
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                displayCurrency === 'USD'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <DollarSign className="h-3.5 w-3.5" />
              <span>USD ($ Dollar)</span>
            </button>
          </div>

          {/* Exchange Rate Badge & Administrator Edit Control */}
          <div className="flex items-center gap-2 bg-slate-800/60 border border-slate-700/80 px-3 py-1.5 rounded-xl text-xs">
            <span className="text-[10px] uppercase font-bold text-slate-400">Rate:</span>
            <span className="font-extrabold text-emerald-400 font-mono">1 USD = {usdToSspRate.toLocaleString()} SSP</span>
            {['Master Admin', 'Administrator'].includes(activeRole) && (
              <button
                onClick={() => {
                  setNewRateInput(usdToSspRate.toString());
                  setShowRateModal(true);
                }}
                className="ml-1 p-1 bg-sky-500/20 hover:bg-sky-500/40 text-sky-300 rounded-md transition-all cursor-pointer flex items-center gap-1 text-[10px] font-bold"
                title="Update USD to SSP Exchange Rate"
              >
                <Edit3 className="h-3 w-3" />
                <span>Edit Rate</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Prominent Client Notification Banner: MINIMUM STOCK ALERT REACHED */}
      {criticalStockAlerts.length > 0 && !bannerDismissed && (
        <div className="bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-amber-500/15 border-2 border-amber-500/40 rounded-2xl p-4 sm:p-5 text-slate-900 dark:text-slate-100 shadow-md transition-all animate-fade-in relative">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-3 bg-amber-500 text-slate-950 rounded-xl shadow-md flex-shrink-0 animate-bounce">
                <BellRing className="h-6 w-6 stroke-[2.5]" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white px-2 py-0.5 rounded-md font-mono shadow-2xs">
                    ⚠️ MINIMUM STOCK REACHED
                  </span>
                  <span className="text-xs font-black text-amber-950 dark:text-amber-200">
                    Client Alert: {criticalStockAlerts.length} Medication(s) At or Below Safety Limit
                  </span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                  Notice: Stock for {criticalStockAlerts.length === 1 ? '1 medication item' : `${criticalStockAlerts.length} medication items`} has reached the minimum reorder threshold. Please restock immediately to avoid stockouts at POS.
                </p>
                
                {/* Low stock item chips */}
                <div className="flex flex-wrap items-center gap-2 pt-1.5">
                  {criticalStockAlerts.map(alert => (
                    <div 
                      key={alert.id} 
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/90 dark:bg-slate-800/90 border border-amber-300 dark:border-amber-700/80 rounded-lg text-xs font-bold text-slate-900 dark:text-slate-100 shadow-2xs"
                    >
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                      <span>{alert.name}</span>
                      <span className="text-rose-600 dark:text-rose-400 font-mono font-black text-[11px]">
                        [{alert.stock} left • Min: {alert.limit}]
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0 w-full md:w-auto justify-end border-t md:border-t-0 border-amber-200 dark:border-amber-800/60 pt-3 md:pt-0">
              <button
                onClick={() => onNavigate('inventory')}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Package className="w-4 h-4" />
                <span>Restock Inventory Now</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setBannerDismissed(true)}
                className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition-all cursor-pointer"
                title="Dismiss notification"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exchange Rate Edit Modal */}
      {showRateModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-sky-950">
                <Coins className="h-5 w-5 text-sky-600" />
                <h4 className="font-extrabold text-sm">Update USD Exchange Rate</h4>
              </div>
              <button onClick={() => setShowRateModal(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">✕</button>
            </div>

            <p className="text-xs text-slate-600">
              As an Administrator, update the official pharmacy USD to SSP exchange rate. All POS registers, inventory valuations, and financial summaries will adapt instantaneously.
            </p>

            <form onSubmit={handleSaveRate} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  Exchange Value (1 USD = ? SSP)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400 font-mono">SSP</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newRateInput}
                    onChange={(e) => setNewRateInput(e.target.value)}
                    className="w-full pl-12 pr-4 py-2 border border-slate-300 rounded-xl text-sm font-extrabold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
                    placeholder="e.g. 3200"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRateModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer"
                >
                  Save Exchange Rate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Period Cards Section: TODAY, THIS MONTH, LAST MONTH (ARRANGED HORIZONTALLY SIDE-BY-SIDE) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* CARD 1: TODAY */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-sky-50 text-sky-600 rounded-lg border border-sky-100">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                  Today's Analytics
                  <span className="text-[9px] bg-sky-100 text-sky-800 font-bold px-1.5 py-0.5 rounded-full lowercase">real-time</span>
                </h3>
                <p className="text-[10px] text-slate-500">Live POS sales &amp; daily profit</p>
              </div>
            </div>
            
            {/* Critical Alert Icon Badge for Medicines soon running out / expiring soon */}
            <button
              onClick={() => onNavigate('inventory')}
              className="flex items-center gap-1 px-2 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer group shadow-2xs"
              title="Critical Stock & Expiry Alerts"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
              <span>{criticalStockAlerts.length} Critical Alerts</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Today Metric 1: Sales with Cash & Recovered Debts sub-buttons */}
            <div className="bg-slate-50/80 rounded-xl border border-slate-150 p-2.5 space-y-2 col-span-1 sm:col-span-2">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Today's Sales</span>
                  <span className="text-sm sm:text-base font-black text-slate-900 font-display">
                    {displayCurrency === 'SSP'
                      ? `${(todayTotalSales * (usdToSspRate || 3100)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SSP`
                      : `$${todayTotalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`}
                  </span>
                  <span className="text-[9px] text-emerald-600 font-semibold block">
                    {todayOrdersCount > 0 ? `${todayOrdersCount} sale transaction(s)` : 'No sales today'}
                  </span>
                </div>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold flex-shrink-0">
                  <ShoppingCart className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Sub-breakdown: Cash Sales, Credit Sales, Net Register Balance */}
              <div className="grid grid-cols-3 gap-1 pt-1.5 border-t border-slate-200/60">
                <button 
                  onClick={() => onNavigate('pos')} 
                  className="px-1.5 py-1 bg-emerald-50 hover:bg-emerald-100/90 text-emerald-900 border border-emerald-200/80 rounded-lg flex flex-col transition-all cursor-pointer text-left shadow-2xs"
                  title="Direct Cash POS Sales"
                >
                  <span className="text-[8px] font-extrabold text-emerald-700 uppercase tracking-tight truncate">💵 Cash</span>
                  <span className="text-[10px] font-black font-mono text-emerald-950 truncate">
                    {displayCurrency === 'SSP' ? `${(todayCashSales * (usdToSspRate || 3100)).toLocaleString()} SSP` : `$${todayCashSales.toFixed(2)}`}
                  </span>
                </button>

                <button 
                  onClick={() => onNavigate('reports')} 
                  className="px-1.5 py-1 bg-rose-50 hover:bg-rose-100/90 text-rose-900 border border-rose-200/80 rounded-lg flex flex-col transition-all cursor-pointer text-left shadow-2xs"
                  title="Credit & Debt POS Sales"
                >
                  <span className="text-[8px] font-extrabold text-rose-700 uppercase tracking-tight truncate">📜 Credit</span>
                  <span className="text-[10px] font-black font-mono text-rose-950 truncate">
                    {displayCurrency === 'SSP' ? `${(todayDebtSales * (usdToSspRate || 3100)).toLocaleString()} SSP` : `$${todayDebtSales.toFixed(2)}`}
                  </span>
                </button>

                <button 
                  onClick={() => onNavigate('reports')} 
                  className="px-1.5 py-1 bg-sky-50 hover:bg-sky-100/90 text-sky-900 border border-sky-200/80 rounded-lg flex flex-col transition-all cursor-pointer text-left shadow-2xs"
                  title="Net Register Balance = Direct Cash + Recovered Debts - Approved Expenses"
                >
                  <span className="text-[8px] font-extrabold text-sky-700 uppercase tracking-tight truncate">🏦 Net Cash</span>
                  <span className="text-[10px] font-black font-mono text-sky-950 truncate">
                    {displayCurrency === 'SSP' ? `${(todayNetTotalSales * (usdToSspRate || 3100)).toLocaleString()} SSP` : `$${todayNetTotalSales.toFixed(2)}`}
                  </span>
                </button>
              </div>
            </div>

            {/* Today Metric 2: Transactions */}
            <div className="bg-slate-50/80 rounded-xl border border-slate-150 p-2.5 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Today's Orders</span>
                <span className="text-sm font-black text-slate-900 font-display">{todayOrdersCount} orders</span>
                <span className="text-[9px] text-sky-600 font-semibold block">POS Checkout Active</span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center font-bold flex-shrink-0">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Today Metric 3: Net Profit (RESTRICTED TO ADMIN ONLY) */}
            {isAdmin ? (
              <div className="bg-slate-50/80 rounded-xl border border-slate-150 p-2.5 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Est. Net Profit</span>
                  <span className="text-xs sm:text-sm font-black text-slate-900 font-display">
                    {displayCurrency === 'SSP'
                      ? `${(todayEstProfit * (usdToSspRate || 3100)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SSP`
                      : `$${todayEstProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`}
                  </span>
                  <span className="text-[9px] text-indigo-600 font-semibold block">Calculated Margin</span>
                </div>
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold flex-shrink-0">
                  <Coins className="w-3.5 h-3.5" />
                </div>
              </div>
            ) : (
              <div className="bg-slate-50/80 rounded-xl border border-slate-150 p-2.5 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Dispensed Items</span>
                  <span className="text-sm font-black text-slate-900 font-display">{todayDispensedUnits} units</span>
                  <span className="text-[9px] text-emerald-600 font-semibold block">Branch Activity</span>
                </div>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold flex-shrink-0">
                  <Package className="w-3.5 h-3.5" />
                </div>
              </div>
            )}

            {/* Today Metric 4: Outlets & Inventory */}
            <div className="bg-slate-50/80 rounded-xl border border-slate-150 p-2.5 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Outlets &amp; Stock</span>
                <span className="text-sm font-black text-slate-900 font-display">{branchesCount} Outlets</span>
                <span className="text-[9px] text-amber-600 font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 animate-pulse text-amber-500" />
                  {criticalStockAlerts.length} Stock Alerts
                </span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold flex-shrink-0">
                <Building2 className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        </div>

        {/* CARD 2: THIS MONTH */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                  This Month's Performance
                  <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-full lowercase">current</span>
                </h3>
                <p className="text-[10px] text-slate-500">Monthly throughput &amp; enterprise KPIs</p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-slate-400 font-mono">
              {new Date().toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* This Month Metric 1: Sales */}
            <div className="bg-slate-50/80 rounded-xl border border-slate-150 p-2.5 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Monthly Sales</span>
                <span className="text-xs sm:text-sm font-black text-slate-900 font-display">
                  {displayCurrency === 'SSP'
                    ? `${(monthlyTotalSales * (usdToSspRate || 3100)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SSP`
                    : `$${monthlyTotalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`}
                </span>
                <span className="text-[9px] text-slate-400 block">Total POS Volume</span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold flex-shrink-0">
                <ShoppingCart className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* This Month Metric 2: Total Orders */}
            <div className="bg-slate-50/80 rounded-xl border border-slate-150 p-2.5 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Monthly Orders</span>
                <span className="text-sm font-black text-slate-900 font-display">{monthlyOrdersCount} orders</span>
                <span className="text-[9px] text-emerald-600 font-semibold block">Live Monthly Total</span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* This Month Metric 3: Net Profit (RESTRICTED TO ADMIN ONLY) */}
            {isAdmin ? (
              <div className="bg-slate-50/80 rounded-xl border border-slate-150 p-2.5 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Monthly Profit</span>
                  <span className="text-xs sm:text-sm font-black text-slate-900 font-display">
                    {displayCurrency === 'SSP'
                      ? `${(monthlyEstProfit * (usdToSspRate || 3100)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SSP`
                      : `$${monthlyEstProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`}
                  </span>
                  <span className="text-[9px] text-indigo-600 font-semibold block">Net Margin</span>
                </div>
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold flex-shrink-0">
                  <Coins className="w-3.5 h-3.5" />
                </div>
              </div>
            ) : (
              <div className="bg-slate-50/80 rounded-xl border border-slate-150 p-2.5 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Prescriptions Filled</span>
                  <span className="text-sm font-black text-slate-900 font-display">{monthlyPrescriptionsFilled} filled</span>
                  <span className="text-[9px] text-sky-600 font-semibold block">Monthly Dispensary</span>
                </div>
                <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center font-bold flex-shrink-0">
                  <FileText className="w-3.5 h-3.5" />
                </div>
              </div>
            )}

            {/* This Month Metric 4: Enrolled Staff & Inventory */}
            <div className="bg-slate-50/80 rounded-xl border border-slate-150 p-2.5 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Staff &amp; Catalog</span>
                <span className="text-sm font-black text-slate-900 font-display">{staffCount} Staff</span>
                <span className="text-[9px] text-slate-500 font-medium block">{itemsCount} Formulations</span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold flex-shrink-0">
                <Users className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        </div>

        {/* CARD 3: LAST MONTH */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                  Last Month's Benchmarks
                  <span className="text-[9px] bg-slate-100 text-slate-700 font-bold px-1.5 py-0.5 rounded-full lowercase">finalized</span>
                </h3>
                <p className="text-[10px] text-slate-500">Historical financial records</p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-slate-400 font-mono">
              {new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Last Month Metric 1: Sales */}
            <div className="bg-slate-50/80 rounded-xl border border-slate-150 p-2.5 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Last Month Sales</span>
                <span className="text-xs sm:text-sm font-black text-slate-900 font-display">
                  {displayCurrency === 'SSP'
                    ? `${(lastMonthTotalSales * (usdToSspRate || 3100)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SSP`
                    : `$${lastMonthTotalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`}
                </span>
                <span className="text-[9px] text-slate-400 font-medium block">Audited Ledger</span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold flex-shrink-0">
                <ShoppingCart className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Last Month Metric 2: Total Orders */}
            <div className="bg-slate-50/80 rounded-xl border border-slate-150 p-2.5 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Last Month Orders</span>
                <span className="text-sm font-black text-slate-900 font-display">{lastMonthOrdersCount} orders</span>
                <span className="text-[9px] text-slate-500 font-medium block">
                  Avg: {displayCurrency === 'SSP' ? `${(lastMonthAvgOrder * (usdToSspRate || 3100)).toLocaleString(undefined, { maximumFractionDigits: 0 })} SSP` : `$${lastMonthAvgOrder.toFixed(2)} USD`}
                </span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Last Month Metric 3: Net Profit */}
            <div className="bg-slate-50/80 rounded-xl border border-slate-150 p-2.5 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Last Month Profit</span>
                <span className="text-xs sm:text-sm font-black text-slate-900 font-display">
                  {displayCurrency === 'SSP'
                    ? `${(lastMonthEstProfit * (usdToSspRate || 3100)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SSP`
                    : `$${lastMonthEstProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`}
                </span>
                <span className="text-[9px] text-indigo-600 font-semibold block">Audited Margin</span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold flex-shrink-0">
                <Coins className="w-3.5 h-3.5" />
              </div>
            </div>
            {/* Last Month Metric 4: Audit & Outlets */}
            <div className="bg-slate-50/80 rounded-xl border border-slate-150 p-2.5 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Audit Score</span>
                <span className="text-sm font-black text-slate-900 font-display">100% Passed</span>
                <span className="text-[9px] text-emerald-600 font-bold block">Compliance Verified</span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center font-bold flex-shrink-0">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* WHOLESALE VS RETAIL SALES REVENUE REPORTING CARD */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-br from-amber-500 to-sky-600 text-white rounded-xl shadow-xs">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                Wholesale vs. Retail Sales &amp; Revenue Breakdown
                <span className="text-[9px] bg-amber-100 text-amber-900 border border-amber-200 font-extrabold px-2 py-0.5 rounded-full uppercase">Dual Channel Audit</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Automated breakdown comparing bulk wholesale customer orders vs. over-the-counter retail sales.</p>
            </div>
          </div>

          <button
            onClick={() => onNavigate('reports')}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5 text-sky-400" />
            <span>Detailed Ledger Reports</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Dual Channel Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* RETAIL CHANNEL METRICS */}
          <div className="bg-sky-50/50 dark:bg-slate-800/40 border border-sky-200/80 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-sky-950 dark:text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
                <ShoppingCart className="w-4 h-4 text-sky-600" />
                Over-the-Counter Retail Sales
              </span>
              <span className="text-[10px] font-black px-2 py-0.5 bg-sky-100 text-sky-800 rounded-md">
                {todayRetailPct.toFixed(1)}% Daily Share
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="bg-white p-2.5 rounded-xl border border-sky-100">
                <span className="text-[9px] font-bold text-slate-400 uppercase block">Today Retail Rev</span>
                <span className="text-sm font-black text-slate-900 font-mono block mt-0.5">
                  {displayCurrency === 'SSP'
                    ? `${(todayRetailRevenue * (usdToSspRate || 3100)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SSP`
                    : `$${todayRetailRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`}
                </span>
                <span className="text-[9px] text-sky-600 font-semibold block mt-1">
                  {todayRetailUnits} units dispensed
                </span>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-sky-100">
                <span className="text-[9px] font-bold text-slate-400 uppercase block">Monthly Retail Rev</span>
                <span className="text-sm font-black text-slate-900 font-mono block mt-0.5">
                  {displayCurrency === 'SSP'
                    ? `${(monthlyRetailRevenue * (usdToSspRate || 3100)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SSP`
                    : `$${monthlyRetailRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`}
                </span>
                <span className="text-[9px] text-slate-500 font-medium block mt-1">
                  {monthlyRetailUnits} units this month
                </span>
              </div>
            </div>

            {/* Visual Channel Progress Bar */}
            <div className="space-y-1 pt-1">
              <div className="flex justify-between text-[9px] font-extrabold text-slate-600">
                <span>Retail Revenue Share</span>
                <span>{todayRetailPct.toFixed(1)}%</span>
              </div>
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-sky-500 rounded-full transition-all duration-500" style={{ width: `${Math.max(5, todayRetailPct)}%` }} />
              </div>
            </div>
          </div>

          {/* WHOLESALE CHANNEL METRICS */}
          <div className="bg-amber-50/50 dark:bg-slate-800/40 border border-amber-200/80 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-amber-950 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <Package className="w-4 h-4 text-amber-600" />
                Bulk Wholesale Sales
              </span>
              <span className="text-[10px] font-black px-2 py-0.5 bg-amber-100 text-amber-900 rounded-md">
                {todayWholesalePct.toFixed(1)}% Daily Share
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="bg-white p-2.5 rounded-xl border border-amber-100">
                <span className="text-[9px] font-bold text-slate-400 uppercase block">Today Wholesale Rev</span>
                <span className="text-sm font-black text-slate-900 font-mono block mt-0.5">
                  {displayCurrency === 'SSP'
                    ? `${(todayWholesaleRevenue * (usdToSspRate || 3100)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SSP`
                    : `$${todayWholesaleRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`}
                </span>
                <span className="text-[9px] text-amber-700 font-semibold block mt-1">
                  {todayWholesaleUnits} units bulk sold
                </span>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-amber-100">
                <span className="text-[9px] font-bold text-slate-400 uppercase block">Monthly Wholesale Rev</span>
                <span className="text-sm font-black text-slate-900 font-mono block mt-0.5">
                  {displayCurrency === 'SSP'
                    ? `${(monthlyWholesaleRevenue * (usdToSspRate || 3100)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SSP`
                    : `$${monthlyWholesaleRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`}
                </span>
                <span className="text-[9px] text-slate-500 font-medium block mt-1">
                  {monthlyWholesaleUnits} units bulk this month
                </span>
              </div>
            </div>

            {/* Visual Channel Progress Bar */}
            <div className="space-y-1 pt-1">
              <div className="flex justify-between text-[9px] font-extrabold text-slate-600">
                <span>Wholesale Revenue Share</span>
                <span>{todayWholesalePct.toFixed(1)}%</span>
              </div>
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${Math.max(5, todayWholesalePct)}%` }} />
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Main Grid: Left column (Shortcuts, Inventory, Audits), Right column (Clinical AI) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Columns - Spans 2 */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Quick Shortcuts Launchpad */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Quick Operational Launchpad</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { tab: 'inventory', title: 'Inventory', desc: 'Stock batches', icon: <Package className="w-4 h-4" />, color: 'bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100/60' },
                { tab: 'reports', title: 'Reports', desc: 'Financial audit sheets', icon: <FileText className="w-4 h-4" />, color: 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100/60' }
              ].map((link, idx) => (
                <button
                  key={idx}
                  onClick={() => onNavigate(link.tab as any)}
                  className={`p-4 rounded-xl border text-left space-y-2 transition-all cursor-pointer ${link.color}`}
                >
                  <div className="p-1.5 rounded-lg bg-white inline-block shadow-sm">
                    {link.icon}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 tracking-tight">{link.title}</h4>
                    <p className="text-[9px] text-slate-500 leading-normal mt-0.5 font-medium">{link.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Recent Sales & Real-Time Checkout Feed */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-emerald-600" />
                  Recent Sales &amp; Real-Time Checkout Feed
                  <span className="text-[9px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full lowercase">live sync</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Most recent POS transactions showing items dispensed and quantities</p>
              </div>

              <button 
                onClick={() => onNavigate('reports')}
                className="text-[10px] font-extrabold text-sky-600 hover:text-sky-700 flex items-center gap-1 cursor-pointer bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-150"
              >
                <span>View Full Reports</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 uppercase font-bold text-[10px] border-b border-slate-100 font-mono">
                    <th className="py-2.5 px-3">Invoice Ref</th>
                    <th className="py-2.5 px-3">Time</th>
                    <th className="py-2.5 px-3">Items &amp; Quantity</th>
                    <th className="py-2.5 px-3">Payment Mode</th>
                    <th className="py-2.5 px-3 text-right">Total Net</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {branchFilteredTx.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400 italic text-xs">
                        No sales registered yet today for the selected branch. Perform a sale in POS terminal to view live updates here.
                      </td>
                    </tr>
                  ) : (
                    branchFilteredTx.slice().reverse().slice(0, 7).map((tx: any, idx: number) => {
                      const itemsArr = Array.isArray(tx.items) ? tx.items : [];
                      const formattedTime = tx.createdAt ? new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now';
                      const txTotal = Number(tx.total) || Number(tx.subtotal) || 0;
                      
                      return (
                        <tr key={tx.id || idx} className="hover:bg-slate-50 transition-colors text-slate-700">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900 text-[11px]">
                            {tx.invoiceNumber || tx.id || `INV-${1000 + idx}`}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 text-[10px] font-mono">
                            {formattedTime}
                          </td>
                          <td className="py-2.5 px-3 max-w-[260px]">
                            <div className="flex flex-wrap gap-1">
                              {itemsArr.length > 0 ? (
                                itemsArr.map((item: any, iIdx: number) => (
                                  <span key={iIdx} className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-800 rounded text-[10px] font-semibold border border-slate-200">
                                    <span className="font-bold">{item.name || 'Medication'}</span>
                                    <span className="text-sky-600 font-extrabold">(x{item.quantity || 1})</span>
                                  </span>
                                ))
                              ) : (
                                <span className="text-slate-400 italic text-[10px]">Clinical Dispensary Checkout</span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 uppercase font-bold font-mono text-[10px]">
                            <span className={`px-2 py-0.5 rounded ${
                              tx.paymentMethod === 'credit' ? 'bg-rose-50 text-rose-600' :
                              tx.paymentMethod === 'cash' ? 'bg-emerald-50 text-emerald-600' :
                              'bg-sky-50 text-sky-600'
                            }`}>
                              {tx.paymentMethod || 'cash'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-extrabold text-slate-900">
                            {displayCurrency === 'SSP'
                              ? `${(txTotal * (usdToSspRate || 3100)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SSP`
                              : `$${txTotal.toFixed(2)} USD`}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 text-[9px] bg-emerald-50 text-emerald-700 font-extrabold uppercase rounded border border-emerald-200/80">
                              Audited
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Unified Clinical Inventory Alerts */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-500 animate-pulse" />
                Urgent Cold-Chain &amp; Stock Alerts
              </h3>
              <button 
                onClick={() => onNavigate('inventory')}
                className="text-[10px] font-bold text-sky-600 hover:text-sky-700 flex items-center gap-0.5 cursor-pointer"
              >
                Go to Inventory
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {criticalStockAlerts.length === 0 ? (
                <div className="py-6 text-center space-y-1">
                  <div className="inline-flex p-2.5 bg-emerald-50 text-emerald-600 rounded-full mb-1">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-800">All Stock Levels Optimal</h4>
                  <p className="text-[10px] text-slate-500">No medications currently at or below minimum stock limit.</p>
                </div>
              ) : (
                criticalStockAlerts.map((alert) => (
                  <div key={alert.id} className="py-3 flex items-center justify-between gap-2 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-2 rounded-lg font-mono font-bold text-xs flex-shrink-0 ${
                        alert.risk === 'CRITICAL' ? 'bg-red-50 text-red-600 border border-red-200' :
                        alert.risk === 'HIGH' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-slate-50 text-slate-600'
                      }`}>
                        {alert.stock} left
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-950 tracking-tight truncate">{alert.name}</h4>
                        <p className="text-[10px] text-slate-500 font-medium">
                          {alert.branch} • <span className="font-semibold text-rose-600 dark:text-rose-400">Minimum Limit: {alert.limit}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded-md ${
                        alert.risk === 'CRITICAL' ? 'bg-red-500 text-white animate-pulse' :
                        alert.risk === 'HIGH' ? 'bg-amber-500 text-slate-950' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {alert.risk === 'CRITICAL' ? 'OUT OF STOCK' : 'LOW STOCK'}
                      </span>
                      <button
                        onClick={() => onNavigate('inventory')}
                        className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 font-extrabold text-[10px] rounded-lg border border-sky-200/80 transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                      >
                        <span>Restock</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Clinical Security Audits Timeline */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-sky-500" />
              Unified Enterprise Security Audits
            </h3>
            
            <div className="space-y-3 font-medium">
              {securityLogs.map((log) => (
                <div key={log.id} className="flex gap-3 text-xs items-start bg-slate-50 border border-slate-100 rounded-xl p-3">
                  <Clock className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline flex-wrap gap-1">
                      <span className="font-bold text-slate-900">{log.event}</span>
                      <span className="text-[9px] text-slate-400 font-mono font-bold">{log.time}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{log.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column - Spans 1 */}
        <div className="space-y-6">
          
          {/* Quick Active Branch Status */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-3">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Branch Clinician Registry</h4>
            <div className="space-y-2.5">
              {(branches && branches.length > 0 ? branches : [{ id: 'branch-dt-1', name: 'Royal Trust Pharmacy - Main Branch', address: 'Airport Road, Juba Town', phone: '+211 922 152 427' }]).map((branch, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div>
                    <h5 className="font-bold text-slate-900 text-[11px]">{branch.name}</h5>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">Administrator • On duty</p>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Online"></span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
