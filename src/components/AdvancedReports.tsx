import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  BarChart3, TrendingUp, Calendar, AlertTriangle, ShieldCheck, 
  Download, RefreshCw, FileText, DollarSign, Users, Briefcase, 
  ChevronRight, Search, CheckCircle2, Coins, ArrowUpRight, ChevronDown,
  UserCheck, CreditCard, Plus, Clock, Filter, Printer, X, Eye, Pill, ShoppingBag, Building2, Trash2
} from 'lucide-react';
import { loadTransactionsFromFirestore, loadStaffFromFirestore, subscribeToTransactionsFirestore } from '../lib/firebaseSync';
import { getTransactionTotal, getTransactionProfit, getTransactionCost } from '../utils/financialCalculations';
import { executePrintHtml } from '../utils/printHelper';

interface AdvancedReportsProps {
  activeTenantId: string;
  activeTenant?: any;
  activeRole?: string;
  userEmail?: string;
  systemCurrency?: 'SSP' | 'USD';
  usdToSspRate?: number;
  initialBranchId?: string;
  restrictedBranchId?: string | null;
}

interface RecoveredDebt {
  id: string;
  customerName: string;
  phone: string;
  amountPaidUsd: number;
  clearedAt: string;
  clearedBy: string;
  branchId?: string;
  storeId?: string;
  branchName?: string;
  storeName?: string;
}

interface UnitSaleEntry {
  id: string;
  drugName: string;
  dateTime: string;
  unitsSold: number;
  unitPriceUsd: number;
  totalAmountUsd: number;
  batchNumber: string;
  receiptNo: string;
  customerName: string;
  staffName: string;
  paymentMethod: string;
  status: 'Cash' | 'Credit' | 'm-GURUSH' | 'Recovered Debt';
  branchId?: string;
  storeId?: string;
  branchName?: string;
  storeName?: string;
}

export default function AdvancedReports({ 
  activeTenantId, 
  activeTenant, 
  activeRole = 'Administrator', 
  userEmail = '', 
  systemCurrency = 'SSP', 
  usdToSspRate = 3100,
  initialBranchId,
  restrictedBranchId: restrictedBranchIdProp
}: AdvancedReportsProps) {
  const [selectedTenantId, setSelectedTenantId] = useState<string>(activeTenantId);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Sync selected branch with props
  useEffect(() => {
    if (restrictedBranchIdProp) {
      setSelectedBranchId(restrictedBranchIdProp);
    } else if (initialBranchId) {
      setSelectedBranchId(initialBranchId);
    }
  }, [initialBranchId, restrictedBranchIdProp]);

  const branches = activeTenant?.branches || [
    { id: "branch-dt-1", name: "Royal Trust Pharmacy - Main Branch" }
  ];

  // Branch Matching Helper
  const isBranchMatch = useCallback((itemBranchId?: string, itemBranchName?: string, targetBranchId?: string) => {
    if (!targetBranchId || targetBranchId === 'all' || targetBranchId === 'All') return true;
    if (!itemBranchId && !itemBranchName) return true;
    if (itemBranchId === targetBranchId) return true;

    const targetBranch = branches.find((b: any) => b.id === targetBranchId);
    if (targetBranch) {
      if (itemBranchId === targetBranch.id) return true;
      if (itemBranchName && targetBranch.name && itemBranchName.trim().toLowerCase() === targetBranch.name.trim().toLowerCase()) return true;
    }

    const targetIndex = branches.findIndex((b: any) => b.id === targetBranchId);
    if (targetBranchId === `store-${targetIndex + 1}` && (itemBranchId === targetBranch?.id || itemBranchName === targetBranch?.name)) {
      return true;
    }
    if (targetBranch && itemBranchId === `store-${targetIndex + 1}`) {
      return true;
    }

    return false;
  }, [branches]);
  
  // Tab states: 'sales', 'debitLedger', 'staff', 'pandl', 'expiry'
  const [activeReportTab, setActiveReportTab] = useState<'sales' | 'debitLedger' | 'staff' | 'pandl' | 'expiry'>('sales');
  
  // States
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedStaffEmail, setExpandedStaffEmail] = useState<string | null>(null);

  // State for drug unit sales drilldown modal
  const [selectedDrugForModal, setSelectedDrugForModal] = useState<string | null>(null);
  const [unitSearchQuery, setUnitSearchQuery] = useState<string>('');

  // Modals for Erase Authorization & Confirmation
  const [showDenialModal, setShowDenialModal] = useState<boolean>(false);
  const [showConfirmEraseModal, setShowConfirmEraseModal] = useState<boolean>(false);

  // Strictly check if current account is Admin/Administrator
  const isAdmin = useMemo(() => {
    const roleLower = (activeRole || '').toLowerCase();
    const emailLower = (userEmail || '').toLowerCase();

    const staffMatch = activeTenant?.staff?.find((s: any) => 
      (s.email && s.email.toLowerCase() === emailLower) || 
      (s.name && s.name.toLowerCase().includes('admin'))
    );
    const staffRoleLower = (staffMatch?.role || '').toLowerCase();
    const staffNameLower = (staffMatch?.name || '').toLowerCase();

    return (
      roleLower.includes('admin') ||
      staffRoleLower.includes('admin') ||
      emailLower.includes('admin') ||
      staffNameLower.includes('admin') ||
      activeRole === 'Administrator' ||
      activeRole === 'Pharmacy Admin' ||
      activeRole === 'Master Admin' ||
      !activeRole
    );
  }, [activeRole, userEmail, activeTenant]);

  const isReset = typeof window !== 'undefined' && (
    localStorage.getItem('trust_pharmacy_factory_reset') === 'true'
  );

  // Handler when user clicks "Erase Command Reports" button
  const handleEraseClick = () => {
    if (!isAdmin) {
      setShowDenialModal(true);
      return;
    }
    setShowConfirmEraseModal(true);
  };

  // Action: Erase all pharmacy command report sales, recent sales, and reset dashboard figures
  const executeEraseCommandReports = async () => {
    localStorage.setItem('junub_system_erased', 'true');
    localStorage.setItem(`junub_reports_cleared_${activeTenantId}`, 'true');
    localStorage.setItem('junub_reports_cleared_shared-global-tenant-v1', 'true');

    const keysToClear = [
      `junub_transactions_${activeTenantId}`,
      'trust_pharmacy_sales',
      'junub_transactions_shared-global-tenant-v1',
      `jubu_offline_queue_${activeTenantId}`,
      'jubu_offline_queue_shared-global-tenant-v1',
      `junub_recovered_debts_${activeTenantId}`,
      'junub_recovered_debts',
      `junub_debit_ledger_${activeTenantId}`,
      'junub_debit_ledger',
      'junub_expenditures',
      'junub_unit_sales_logs',
      'junub_daily_sales'
    ];

    keysToClear.forEach(k => {
      try { localStorage.removeItem(k); } catch(e){}
    });

    try {
      await fetch(`/api/v1/${activeTenantId}/transactions`, { method: 'DELETE' });
      await fetch(`/api/v1/shared-global-tenant-v1/transactions`, { method: 'DELETE' });
    } catch (e) {}

    setDailySalesItems([]);
    setUnitSalesLogs([]);
    setRecoveredDebts([]);
    setDebitLedger([]);
    setShowConfirmEraseModal(false);

    window.dispatchEvent(new Event('junub_reports_cleared'));
    window.dispatchEvent(new Event('junub_transaction_added'));
    window.dispatchEvent(new Event('junub_system_reset'));
    window.dispatchEvent(new Event('junub_inventory_updated'));
    window.dispatchEvent(new Event('storage'));
  };

  // Unit sales transaction log store (when each unit/units was sold)
  const [unitSalesLogs, setUnitSalesLogs] = useState<UnitSaleEntry[]>([]);
  const [firestoreStaffList, setFirestoreStaffList] = useState<any[]>([]);

  // Load Firestore staff
  useEffect(() => {
    async function loadStaff() {
      try {
        const [tenantStaff, globalStaff] = await Promise.all([
          loadStaffFromFirestore(activeTenantId).catch(() => []),
          loadStaffFromFirestore('shared-global-tenant-v1').catch(() => [])
        ]);
        const combined = [...(tenantStaff || []), ...(globalStaff || [])];
        if (combined.length > 0) {
          setFirestoreStaffList(combined);
        }
      } catch (e) {}
    }
    loadStaff();

    const handleStaffUpdate = () => loadStaff();
    window.addEventListener('junub_staff_updated', handleStaffUpdate);
    window.addEventListener('storage', handleStaffUpdate);
    return () => {
      window.removeEventListener('junub_staff_updated', handleStaffUpdate);
      window.removeEventListener('storage', handleStaffUpdate);
    };
  }, [activeTenantId]);

  // Fetch real transactions from server, Firestore, and local storage
  useEffect(() => {
    if (isReset) {
      setUnitSalesLogs([]);
      setRecoveredDebts([]);
      setDebitLedger([]);
      setDailySalesItems([]);
      return;
    }
    let isMounted = true;
    async function fetchLiveTx() {
      try {
        let serverTxList: any[] = [];
        try {
          const res = await fetch(`/api/v1/${activeTenantId}/transactions`);
          if (res.ok) {
            const data = await res.json();
            serverTxList = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
          }
        } catch (err) {}

        let firestoreTxList: any[] = [];
        try {
          firestoreTxList = await loadTransactionsFromFirestore(activeTenantId);
        } catch (e) {}

        // Merge with local storage transactions
        const txMap = new Map();
        serverTxList.forEach((tx: any) => {
          const k = tx.id || tx.invoiceNumber;
          if (k) txMap.set(k, tx);
        });

        firestoreTxList.forEach((tx: any) => {
          const k = tx.id || tx.invoiceNumber;
          if (k && !txMap.has(k)) txMap.set(k, tx);
        });

        [
          `junub_transactions_${activeTenantId}`, 
          'trust_pharmacy_sales',
          'junub_transactions_shared-global-tenant-v1',
          `jubu_offline_queue_${activeTenantId}`,
          'jubu_offline_queue_shared-global-tenant-v1'
        ].forEach(storeKey => {
          try {
            const cachedStr = localStorage.getItem(storeKey);
            if (cachedStr) {
              const cachedTx = JSON.parse(cachedStr);
              if (Array.isArray(cachedTx)) {
                cachedTx.forEach((tx: any) => {
                  const k = tx.id || tx.invoiceNumber;
                  if (k) {
                    txMap.set(k, tx); // Local/recent checkout takes precedence for live accuracy
                  }
                });
              }
            }
          } catch(e) {}
        });

        const mergedTxList = Array.from(txMap.values());
        if (mergedTxList.length > 0) {
          try {
            localStorage.setItem(`junub_transactions_${activeTenantId}`, JSON.stringify(mergedTxList));
            localStorage.setItem('trust_pharmacy_sales', JSON.stringify(mergedTxList));
          } catch(e) {}
        }

        if (isMounted) {
          const newSalesItems: any[] = [];
          const newUnitLogs: UnitSaleEntry[] = [];
          mergedTxList.forEach((tx: any) => {
            const cashierEmail = tx.cashierEmail || tx.staffEmail || 'junubposcenter@gmail.com';
            const cashierName = tx.cashierName || tx.staffName || cashierEmail.split('@')[0] || 'Administrator';
            
            const rawItems = (Array.isArray(tx.items) && tx.items.length > 0) ? tx.items : [
              {
                name: tx.notes || `Receipt #${tx.invoiceNumber || tx.id || 'Checkout'}`,
                price: getTransactionTotal(tx),
                quantity: 1,
                cost: getTransactionCost(tx),
                pricingType: tx.pricingType || 'Retail'
              }
            ];

            rawItems.forEach((it: any, idx: number) => {
              const itemPrice = typeof it.price === 'number' ? it.price : (typeof it.unitPriceUsd === 'number' ? it.unitPriceUsd : (getTransactionTotal(tx) / (it.quantity || 1)));
              const itemQty = it.quantity || it.unitsSold || 1;
              const itemCost = it.cost || (itemPrice * 0.7);

              newSalesItems.push({
                id: `SAL-LIVE-${tx.id}-${idx}`,
                date: (tx.createdAt || tx.timestamp || new Date().toISOString()).substring(0, 10),
                item: it.name || 'Pharmaceutical Item',
                unitCost: itemCost,
                unitPrice: itemPrice,
                qtySold: itemQty,
                totalAmount: itemPrice * itemQty,
                pricingType: it.pricingType || (itemQty >= (it.wholesaleLimit || 10) ? 'Wholesale' : 'Retail'),
                wholesaleLimit: it.wholesaleLimit || 10,
                retailPrice: it.retailPrice || itemPrice,
                status: (tx.paymentMethod && tx.paymentMethod.toLowerCase() === 'credit') ? 'Credit' : 'Cash',
                staffName: cashierName,
                staffEmail: cashierEmail,
                branchId: tx.branchId || tx.storeId
              });
              newUnitLogs.push({
                id: `USL-LIVE-${tx.id}-${idx}`,
                drugName: it.name || 'Pharmaceutical Item',
                dateTime: (tx.createdAt || tx.timestamp || new Date().toISOString()).replace('T', ' ').substring(0, 19),
                unitsSold: itemQty,
                unitPriceUsd: itemPrice,
                totalAmountUsd: itemPrice * itemQty,
                batchNumber: tx.invoiceNumber || `LOT-${tx.id}`,
                receiptNo: tx.invoiceNumber || `INV-${tx.id}`,
                customerName: tx.customerName || 'Walk-in Patient',
                staffName: cashierName,
                paymentMethod: tx.paymentMethod || 'Cash',
                status: (tx.paymentMethod && tx.paymentMethod.toLowerCase() === 'credit') ? 'Credit' : 'Cash',
                branchId: tx.branchId || tx.storeId
              });
            });
          });
          if (newSalesItems.length > 0) setDailySalesItems(newSalesItems);
          if (newUnitLogs.length > 0) setUnitSalesLogs(newUnitLogs);

          const liveDebits: any[] = [];
          mergedTxList.forEach((tx: any) => {
            if (tx.paymentMethod && tx.paymentMethod.toLowerCase() === 'credit') {
              liveDebits.push({
                id: tx.invoiceNumber || `DEBT-${tx.id}`,
                customerName: tx.customerName || 'Credit Patient',
                residency: tx.customerResidency || tx.customerAddress || 'Juba Town',
                phone: tx.customerPhone || tx.phone || '+211 922 000 000',
                items: Array.isArray(tx.items) ? tx.items.map((i: any) => `${i.name} (x${i.quantity || 1})`).join(', ') : (tx.notes || 'Medication Checkout'),
                totalDebtUsd: getTransactionTotal(tx),
                createdAt: (tx.createdAt || tx.timestamp || new Date().toISOString()).substring(0, 10)
              });
            }
          });
          if (liveDebits.length > 0) {
            setDebitLedger(prev => {
              const map = new Map();
              prev.forEach(d => map.set(d.id, d));
              liveDebits.forEach(ld => map.set(ld.id, ld));
              return Array.from(map.values());
            });
          }
        } else if (isMounted && mergedTxList.length === 0) {
          setDailySalesItems([]);
          setUnitSalesLogs([]);
          setDebitLedger([]);
        }
      } catch (err) {
        console.warn("Could not fetch live report transactions", err);
      }
    }

    fetchLiveTx();

    const unsubTx = subscribeToTransactionsFirestore(activeTenantId, () => {
      if (isMounted) fetchLiveTx();
    });

    const handleTxUpdate = () => {
      fetchLiveTx();
    };

    window.addEventListener('junub_transaction_added', handleTxUpdate);
    window.addEventListener('junub_inventory_updated', handleTxUpdate);
    window.addEventListener('junub_tenant_updated', handleTxUpdate);
    window.addEventListener('storage', handleTxUpdate);

    return () => {
      isMounted = false;
      unsubTx();
      window.removeEventListener('junub_transaction_added', handleTxUpdate);
      window.removeEventListener('junub_inventory_updated', handleTxUpdate);
      window.removeEventListener('junub_tenant_updated', handleTxUpdate);
      window.removeEventListener('storage', handleTxUpdate);
    };
  }, [activeTenantId, isReset]);

  // Expiry Risk Report array computed safely
  const expiryRiskReport = useMemo(() => {
    if (isReset) return [];
    let loadedBatches: any[] = [];
    try {
      const bStr = localStorage.getItem(`junub_inventory_batches_${activeTenantId}`) || localStorage.getItem('trust_pharmacy_inventory_batches');
      if (bStr) loadedBatches = JSON.parse(bStr);
    } catch(e) {}
    return loadedBatches
      .filter((b: any) => isBranchMatch(b.storeId || b.branchId, b.storeName || b.branchName, selectedBranchId))
      .slice(0, 30).map((b: any) => ({
      drugName: b.name || b.drugName || 'Essential Medication',
      batchNumber: b.batchNumber || b.batchNo || 'LOT-2026-A',
      quantity: b.quantity || b.qty || 100,
      expiryDate: b.expiryDate || '2026-12-31',
      riskLevel: (b.quantity || 0) > 50 ? 'Medium Risk' : 'Low Risk',
      shelfLocation: b.shelfLocation || 'Aisle 1'
    }));
  }, [activeTenantId, isReset, selectedBranchId, isBranchMatch]);

  // Recovered Debts state
  const [recoveredDebts, setRecoveredDebts] = useState<RecoveredDebt[]>([]);

  // Outstanding Debt Ledger state
  const [debitLedger, setDebitLedger] = useState<any[]>([]);

  // Daily Sales line items
  const [dailySalesItems, setDailySalesItems] = useState<any[]>([]);

  // Dynamically resolve real registered staff members from Firestore
  const staffList = (() => {
    const map = new Map<string, { name: string; role: string; email: string }>();

    // 1. Tenant staff (from live Firestore subscription)
    if (activeTenant?.staff && Array.isArray(activeTenant.staff)) {
      activeTenant.staff.forEach((s: any) => {
        if (s.email) {
          map.set(s.email.toLowerCase(), {
            name: s.name || s.email.split('@')[0],
            role: s.role || 'Pharmacist',
            email: s.email
          });
        }
      });
    }

    // 2. Staff loaded live from Firestore staff collection
    if (firestoreStaffList && Array.isArray(firestoreStaffList)) {
      firestoreStaffList.forEach((s: any) => {
        if (s.email && !map.has(s.email.toLowerCase())) {
          map.set(s.email.toLowerCase(), {
            name: s.name || s.email.split('@')[0],
            role: s.role || 'Pharmacist',
            email: s.email
          });
        }
      });
    }

    // Default master admin if list is empty
    if (map.size === 0) {
      map.set('junubposcenter@gmail.com', {
        name: 'Sande Reagan',
        role: 'Administrator',
        email: 'junubposcenter@gmail.com'
      });
    }

    return Array.from(map.values());
  })();

  // Real Staff Expenditures loaded from local storage / Firestore
  const staffExpenditures = (() => {
    if (isReset) return [];
    try {
      const expStr = localStorage.getItem('junub_expenditures');
      if (expStr) {
        const expList = JSON.parse(expStr);
        if (Array.isArray(expList) && expList.length > 0) {
          return expList.map((e: any) => ({
            id: e.id || `EXP-${Math.floor(1000 + Math.random()*9000)}`,
            staffEmail: e.requestedByStaffEmail || 'junubposcenter@gmail.com',
            staffName: e.requestedByStaffName || 'Staff Member',
            title: e.title || 'Branch Expense',
            category: e.category || 'Operations',
            amountUsd: Number(e.amountUsd) || 0,
            status: e.status ? e.status.charAt(0).toUpperCase() + e.status.slice(1) : 'Approved',
            date: e.createdAt ? e.createdAt.substring(0, 10) : new Date().toISOString().substring(0, 10)
          }));
        }
      }
    } catch(e) {}
    return [];
  })();

  // Action: Clear Debt and Move to Recovered Debts & Daily Sales
  const handleClearDebt = (debtId: string) => {
    const debt = debitLedger.find(d => d.id === debtId);
    if (!debt) return;

    // Create recovered debt entry
    const newRecovery: RecoveredDebt = {
      id: `REC-${Math.floor(1000 + Math.random() * 9000)}`,
      customerName: debt.customerName,
      phone: debt.phone,
      amountPaidUsd: debt.totalDebtUsd,
      clearedAt: new Date().toISOString(),
      clearedBy: 'Administrator'
    };

    setRecoveredDebts([newRecovery, ...recoveredDebts]);
    setDebitLedger(prev => prev.filter(d => d.id !== debtId));

    // Append to Daily Sales as Recovered Debt line item
    const newSalesItem = {
      id: `REC-SALE-${Math.floor(100 + Math.random() * 900)}`,
      date: new Date().toISOString().substring(0, 10),
      item: `RECOVERED DEBT: ${debt.customerName} (${debt.items})`,
      unitCost: 0,
      unitPrice: debt.totalDebtUsd,
      qtySold: 1,
      totalAmount: debt.totalDebtUsd,
      status: 'Recovered Debt',
      staffName: 'Administrator',
      staffEmail: 'junubposcenter@gmail.com'
    };

    setDailySalesItems([newSalesItem, ...dailySalesItems]);
    alert(`Debt cleared! $${debt.totalDebtUsd} USD registered as Recovered Debt in Daily Sales.`);
  };

  // Branch & Date Filtered Collections
  const filteredDailySalesItems = useMemo(() => {
    return dailySalesItems.filter(i => {
      const matchesBranch = isBranchMatch(i.branchId || i.storeId, i.branchName || i.storeName, selectedBranchId);
      if (!matchesBranch) return false;
      if (!startDate && !endDate) return true;
      const d = i.date;
      if (startDate && d < startDate) return false;
      if (endDate && d > endDate) return false;
      return true;
    });
  }, [dailySalesItems, selectedBranchId, isBranchMatch, startDate, endDate]);

  const filteredUnitSalesLogs = useMemo(() => {
    return unitSalesLogs.filter(i => {
      const matchesBranch = isBranchMatch(i.branchId || i.storeId, i.branchName || i.storeName, selectedBranchId);
      if (!matchesBranch) return false;
      if (!startDate && !endDate) return true;
      const d = i.dateTime?.substring(0, 10);
      if (startDate && d < startDate) return false;
      if (endDate && d > endDate) return false;
      return true;
    });
  }, [unitSalesLogs, selectedBranchId, isBranchMatch, startDate, endDate]);

  const filteredDebitLedger = useMemo(() => {
    return debitLedger.filter(debt => {
      const matchesBranch = isBranchMatch(debt.branchId || debt.storeId, debt.branchName || debt.storeName, selectedBranchId);
      if (!matchesBranch) return false;
      if (!startDate && !endDate) return true;
      const debtDate = debt.createdAt;
      if (startDate && debtDate < startDate) return false;
      if (endDate && debtDate > endDate) return false;
      return true;
    });
  }, [debitLedger, selectedBranchId, isBranchMatch, startDate, endDate]);

  const filteredRecoveredDebts = useMemo(() => {
    return recoveredDebts.filter(r => {
      const matchesBranch = isBranchMatch(r.branchId || r.storeId, r.branchName || r.storeName, selectedBranchId);
      if (!matchesBranch) return false;
      if (!startDate && !endDate) return true;
      const d = r.clearedAt?.substring(0, 10);
      if (startDate && d < startDate) return false;
      if (endDate && d > endDate) return false;
      return true;
    });
  }, [recoveredDebts, selectedBranchId, isBranchMatch, startDate, endDate]);

  // Load approved operational expenses for selected branch
  const totalApprovedExpensesUsd = useMemo(() => {
    try {
      const expStr = localStorage.getItem('junub_expenditures');
      if (expStr) {
        const expList = JSON.parse(expStr);
        if (Array.isArray(expList)) {
          return expList
            .filter((e: any) => e.status === 'approved' && isBranchMatch(e.branchId || e.storeId, e.branchName || e.storeName, selectedBranchId))
            .reduce((sum: number, e: any) => sum + (Number(e.amountUsd) || 0), 0);
        }
      }
    } catch(e) {}
    return 0;
  }, [selectedBranchId, isBranchMatch]);

  // Calculations for Daily Sales Summary Breakdown
  const totalCashSales = filteredDailySalesItems
    .filter(i => i.status === 'Cash')
    .reduce((sum, i) => sum + i.totalAmount, 0);

  const totalCreditSales = filteredDailySalesItems
    .filter(i => i.status === 'Credit')
    .reduce((sum, i) => sum + i.totalAmount, 0);

  const totalRecoveredDebtsUsd = filteredRecoveredDebts
    .reduce((sum, r) => sum + r.amountPaidUsd, 0);

  // Gross POS Sales = Total of all POS checkouts (Cash + Credit) -> Matches POS 100%
  const grossPosSales = totalCashSales + totalCreditSales;
  // Net Register Balance = Direct Cash Sales + Recovered Debts - Approved Branch Expenses
  const formulaNetTotalSales = Math.max(0, totalCashSales + totalRecoveredDebtsUsd - totalApprovedExpensesUsd);

  // Wholesale vs Retail Channel Analysis Calculations
  let totalWholesaleRevenueUsd = 0;
  let totalRetailRevenueUsd = 0;
  let totalWholesaleUnitsSold = 0;
  let totalRetailUnitsSold = 0;

  filteredDailySalesItems.forEach(i => {
    const qty = Number(i.qtySold || 1);
    const amount = Number(i.totalAmount || 0);
    const minQty = Number(i.wholesaleLimit || 10);
    const isWholesale = i.pricingType === 'Wholesale' || qty >= minQty || (i.retailPrice && i.unitPrice < i.retailPrice);
    if (isWholesale) {
      totalWholesaleRevenueUsd += amount;
      totalWholesaleUnitsSold += qty;
    } else {
      totalRetailRevenueUsd += amount;
      totalRetailUnitsSold += qty;
    }
  });

  const grandTotalChannelRevenue = totalWholesaleRevenueUsd + totalRetailRevenueUsd;
  const wholesalePct = grandTotalChannelRevenue > 0 ? (totalWholesaleRevenueUsd / grandTotalChannelRevenue) * 100 : 0;
  const retailPct = grandTotalChannelRevenue > 0 ? (totalRetailRevenueUsd / grandTotalChannelRevenue) * 100 : 0;

  // Comprehensive PDF Report Generator (Individual vs All Reports)
  const handleExportReportPdf = (mode: 'current' | 'all') => {
    const userEmail = activeTenant?.email || 'administrator@trustpharmacy.com';

    // Build Staff Performance array safely
    const staffListToUse = staffList.length > 0 ? staffList : [
      { name: 'System Administrator', email: userEmail || 'junubposcenter@gmail.com', role: 'Administrator' }
    ];

    const staffPerformance = staffListToUse.map((s: any) => {
      const staffSales = filteredDailySalesItems.filter(i => 
        (i.staffEmail && i.staffEmail.toLowerCase() === (s.email || '').toLowerCase()) ||
        (i.staffName && i.staffName.toLowerCase() === (s.name || '').toLowerCase())
      );
      const salesCount = staffSales.length;
      const totalSalesUsd = staffSales.reduce((sum, i) => sum + i.totalAmount, 0);
      const commissionUsd = totalSalesUsd * 0.02;
      return {
        staffName: s.name || s.email?.split('@')[0] || 'Cashier Staff',
        staffEmail: s.email || 'cashier@trustpharmacy.com',
        role: s.role || 'Dispenser',
        salesCount,
        totalSalesUsd,
        commissionUsd
      };
    });

    const reportTitle = mode === 'all' 
      ? 'CONSOLIDATED MASTER PHARMACY AUDIT REPORT' 
      : `${activeReportTab.toUpperCase()} REPORT`;

    const commonCss = `
      body { font-family: system-ui, -apple-system, sans-serif; padding: 30px; color: #0f172a; line-height: 1.4; }
      .header { border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
      .brand { font-size: 22px; font-weight: 900; color: #0f172a; margin: 0; text-transform: uppercase; }
      .subbrand { font-size: 11px; color: #0284c7; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; margin-top: 2px; }
      .meta { text-align: right; font-size: 10px; color: #64748b; }
      .section-title { font-size: 15px; font-weight: 800; color: #0f172a; border-left: 4px solid #0284c7; padding-left: 10px; margin-top: 25px; margin-bottom: 12px; }
      .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
      .stat-card { background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px 12px; border-radius: 8px; }
      .stat-lbl { font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase; }
      .stat-val { font-size: 15px; font-weight: 900; color: #0f172a; margin-top: 3px; }
      table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10px; }
      th { background: #0f172a; color: white; text-align: left; padding: 8px 10px; font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; }
      td { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; }
      tr:nth-child(even) { background: #f8fafc; }
      .page-break { page-break-before: always; margin-top: 30px; }
      .footer { margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 9px; color: #94a3b8; text-align: center; font-family: monospace; }
      @media print { body { padding: 0; } }
    `;

    const rate = usdToSspRate || activeTenant?.usdToSspRate || 3100;

    const renderSalesHtml = () => `
      <div class="section-title">1. Daily Sales & Transaction Audit</div>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-lbl">Gross POS Sales</div>
          <div class="stat-val">$${grossPosSales.toFixed(2)} USD</div>
          <div style="font-size: 11px; color: #0284c7; font-weight: 700;">${(grossPosSales * rate).toLocaleString()} SSP</div>
        </div>
        <div class="stat-card">
          <div class="stat-lbl">Direct Cash Sales</div>
          <div class="stat-val">$${totalCashSales.toFixed(2)} USD</div>
          <div style="font-size: 11px; color: #0284c7; font-weight: 700;">${(totalCashSales * rate).toLocaleString()} SSP</div>
        </div>
        <div class="stat-card">
          <div class="stat-lbl">Credit Sales</div>
          <div class="stat-val">$${totalCreditSales.toFixed(2)} USD</div>
          <div style="font-size: 11px; color: #0284c7; font-weight: 700;">${(totalCreditSales * rate).toLocaleString()} SSP</div>
        </div>
        <div class="stat-card">
          <div class="stat-lbl">Net Register Balance</div>
          <div class="stat-val">$${formulaNetTotalSales.toFixed(2)} USD</div>
          <div style="font-size: 11px; color: #0284c7; font-weight: 700;">${(formulaNetTotalSales * rate).toLocaleString()} SSP</div>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Date</th><th>Item Description</th><th>Qty</th><th>Unit Price ($)</th><th>Total ($ USD)</th><th>Total (SSP)</th><th>Type</th><th>Status</th><th>Staff Cashier</th>
          </tr>
        </thead>
        <tbody>
          ${filteredDailySalesItems.slice(0, 100).map(i => `
            <tr>
              <td>${i.date}</td>
              <td><strong>${i.item}</strong></td>
              <td>${i.qtySold}</td>
              <td>$${i.unitPrice.toFixed(2)}</td>
              <td><strong>$${i.totalAmount.toFixed(2)} USD</strong></td>
              <td><strong style="color:#0284c7;">${(i.totalAmount * rate).toLocaleString()} SSP</strong></td>
              <td>${i.pricingType}</td>
              <td>${i.status}</td>
              <td>${i.staffName}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    const renderDebitHtml = () => `
      <div class="section-title">2. Debit Ledger & Outstanding Patient Accounts</div>
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-lbl">Total Credit Accounts</div><div class="stat-val">${debitLedger.length} Patients</div></div>
        <div class="stat-card">
          <div class="stat-lbl">Outstanding Debt</div>
          <div class="stat-val" style="color: #e11d48;">$${debitLedger.reduce((sum, d) => sum + d.totalDebtUsd, 0).toFixed(2)} USD</div>
          <div style="font-size: 11px; color: #e11d48; font-weight: 700;">${(debitLedger.reduce((sum, d) => sum + d.totalDebtUsd, 0) * rate).toLocaleString()} SSP</div>
        </div>
        <div class="stat-card">
          <div class="stat-lbl">Recovered Debts</div>
          <div class="stat-val" style="color: #059669;">$${totalRecoveredDebtsUsd.toFixed(2)} USD</div>
          <div style="font-size: 11px; color: #059669; font-weight: 700;">${(totalRecoveredDebtsUsd * rate).toLocaleString()} SSP</div>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Patient Name</th><th>Phone</th><th>Branch</th><th>Total Debt ($ USD)</th><th>Total Debt (SSP)</th><th>Issue Date</th><th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${filteredDebitLedger.map(d => `
            <tr>
              <td><strong>${d.patientName}</strong></td>
              <td>${d.phone}</td>
              <td>${d.branchName}</td>
              <td style="color: #e11d48; font-weight: bold;">$${d.totalDebtUsd.toFixed(2)} USD</td>
              <td style="color: #0284c7; font-weight: bold;">${(d.totalDebtUsd * rate).toLocaleString()} SSP</td>
              <td>${d.createdAt}</td>
              <td><span style="background:#fecdd3; color:#9f1239; padding:2px 6px; border-radius:4px; font-weight:bold;">${d.status}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    const renderStaffHtml = () => `
      <div class="section-title">3. Staff Cashier Activity & Sales Performance</div>
      <table>
        <thead>
          <tr>
            <th>Staff Member</th><th>Role</th><th>Dispatches</th><th>Gross Sales ($ USD)</th><th>Gross Sales (SSP)</th><th>Estimated Commission ($ USD)</th><th>Commission (SSP)</th>
          </tr>
        </thead>
        <tbody>
          ${staffPerformance.map(s => `
            <tr>
              <td><strong>${s.staffName}</strong><br/><small>${s.staffEmail}</small></td>
              <td>${s.role}</td>
              <td>${s.salesCount} Checkouts</td>
              <td><strong>$${s.totalSalesUsd.toFixed(2)} USD</strong></td>
              <td><strong style="color:#0284c7;">${(s.totalSalesUsd * rate).toLocaleString()} SSP</strong></td>
              <td>$${s.commissionUsd.toFixed(2)} USD</td>
              <td>${(s.commissionUsd * rate).toLocaleString()} SSP</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    const renderPandlHtml = () => {
      const revenue = grossPosSales;
      const estimatedCogs = revenue * 0.55;
      const grossProfit = Math.max(0, revenue - estimatedCogs);
      const operatingExpenses = totalApprovedExpensesUsd;
      const netProfit = grossProfit - operatingExpenses;

      return `
        <div class="section-title">4. Profit & Loss (P&L) Financial Statement</div>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-lbl">Total Gross Revenue</div>
            <div class="stat-val">$${revenue.toFixed(2)} USD</div>
            <div style="font-size: 11px; color: #0284c7; font-weight: 700;">${(revenue * rate).toLocaleString()} SSP</div>
          </div>
          <div class="stat-card">
            <div class="stat-lbl">Cost of Goods Sold (COGS)</div>
            <div class="stat-val">$${estimatedCogs.toFixed(2)} USD</div>
            <div style="font-size: 11px; color: #64748b; font-weight: 700;">${(estimatedCogs * rate).toLocaleString()} SSP</div>
          </div>
          <div class="stat-card">
            <div class="stat-lbl">Operating Expenses</div>
            <div class="stat-val" style="color:#e11d48;">$${operatingExpenses.toFixed(2)} USD</div>
            <div style="font-size: 11px; color: #e11d48; font-weight: 700;">${(operatingExpenses * rate).toLocaleString()} SSP</div>
          </div>
          <div class="stat-card">
            <div class="stat-lbl">Net Operating Profit</div>
            <div class="stat-val" style="color:#059669;">$${netProfit.toFixed(2)} USD</div>
            <div style="font-size: 11px; color: #059669; font-weight: 700;">${(netProfit * rate).toLocaleString()} SSP</div>
          </div>
        </div>
      `;
    };

    const renderExpiryHtml = () => `
      <div class="section-title">5. Medicine Batch Expiry & Quality Control Audit</div>
      <table>
        <thead>
          <tr>
            <th>Drug Product</th><th>Batch No</th><th>Quantity</th><th>Expiry Date</th><th>Risk Level</th><th>Shelf Location</th>
          </tr>
        </thead>
        <tbody>
          ${expiryRiskReport.map(b => `
            <tr>
              <td><strong>${b.drugName}</strong></td>
              <td>${b.batchNumber}</td>
              <td>${b.quantity} Units</td>
              <td>${b.expiryDate}</td>
              <td><strong>${b.riskLevel.toUpperCase()}</strong></td>
              <td>${b.shelfLocation}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    const renderChannelsHtml = () => `
      <div class="section-title">6. Wholesale vs Retail Distribution Channels</div>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-lbl">Wholesale Revenue</div>
          <div class="stat-val">$${totalWholesaleRevenueUsd.toFixed(2)} USD (${wholesalePct.toFixed(1)}%)</div>
          <div style="font-size: 11px; color: #0284c7; font-weight: 700;">${(totalWholesaleRevenueUsd * rate).toLocaleString()} SSP</div>
        </div>
        <div class="stat-card">
          <div class="stat-lbl">Retail Revenue</div>
          <div class="stat-val">$${totalRetailRevenueUsd.toFixed(2)} USD (${retailPct.toFixed(1)}%)</div>
          <div style="font-size: 11px; color: #0284c7; font-weight: 700;">${(totalRetailRevenueUsd * rate).toLocaleString()} SSP</div>
        </div>
        <div class="stat-card"><div class="stat-lbl">Wholesale Units</div><div class="stat-val">${totalWholesaleUnitsSold} Units</div></div>
        <div class="stat-card"><div class="stat-lbl">Retail Units</div><div class="stat-val">${totalRetailUnitsSold} Units</div></div>
      </div>
    `;

    let bodyContent = '';
    if (mode === 'all') {
      bodyContent = `
        ${renderSalesHtml()}
        <div class="page-break"></div>
        ${renderDebitHtml()}
        <div class="page-break"></div>
        ${renderStaffHtml()}
        <div class="page-break"></div>
        ${renderPandlHtml()}
        <div class="page-break"></div>
        ${renderExpiryHtml()}
        <div class="page-break"></div>
        ${renderChannelsHtml()}
      `;
    } else {
      if (activeReportTab === 'sales') bodyContent = renderSalesHtml();
      else if (activeReportTab === 'debitLedger') bodyContent = renderDebitHtml();
      else if (activeReportTab === 'staff') bodyContent = renderStaffHtml();
      else if (activeReportTab === 'pandl') bodyContent = renderPandlHtml();
      else if (activeReportTab === 'expiry') bodyContent = renderExpiryHtml();
      else if (activeReportTab === 'channels') bodyContent = renderChannelsHtml();
    }

    const savedContact = (() => {
      try {
        const cached = localStorage.getItem('trust_pharmacy_contact');
        return cached ? JSON.parse(cached) : null;
      } catch(e) { return null; }
    })();

    const currentBranchObj = selectedBranchId !== 'all'
      ? (activeTenant?.branches?.find((b: any) => b.id === selectedBranchId) || { name: 'Branch Scope', address: activeTenant?.address, phone: activeTenant?.phone })
      : null;

    const brandName = currentBranchObj 
      ? `${activeTenant?.name || 'Royal Trust Pharmacy'} - ${currentBranchObj.name}`
      : (savedContact?.name || activeTenant?.name || 'Royal Trust Pharmacy');
    const brandPhone = currentBranchObj?.phone || savedContact?.phone || activeTenant?.phone || activeTenant?.telephone || '+211 922 152 427';
    const brandAddress = currentBranchObj?.address || savedContact?.address || activeTenant?.address || 'Airport Road, Juba Town, South Sudan';
    const brandEmail = savedContact?.email || activeTenant?.email || 'info@trustpharmacy.com';
    const brandLicense = savedContact?.license || activeTenant?.businessRegNo || activeTenant?.license || 'SS-MOH-TRUST-2026';

    const doc = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${reportTitle}</title>
          <style>${commonCss}</style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 class="brand">${brandName}</h1>
              <div class="subbrand">${reportTitle}</div>
              <div style="font-size: 10px; color: #334155; margin-top: 5px; font-weight: 600; line-height: 1.5;">
                📍 <strong>Location:</strong> ${brandAddress}<br/>
                📞 <strong>Tel / Whatsapp:</strong> ${brandPhone} &nbsp;|&nbsp; ✉️ <strong>Email:</strong> ${brandEmail}<br/>
                🏛️ <strong>MOH License / Reg No:</strong> ${brandLicense}
              </div>
            </div>
            <div class="meta">
              <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
              <p><strong>Branch Scope:</strong> ${selectedBranchId === 'all' ? 'All Outlets (Consolidated)' : (currentBranchObj?.name || selectedBranchId)}</p>
              <p><strong>Exchange Rate:</strong> 1 USD = ${rate.toLocaleString()} SSP</p>
              <p><strong>Generated By:</strong> ${userEmail}</p>
            </div>
          </div>

          ${bodyContent}

          <div class="footer">
            Official ${brandName} System Generated PDF Report • Verified Audit Ledger • Confidential
          </div>

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;

    executePrintHtml(doc, 'Pharmacy Executive Report');
  };

  return (
    <div className="space-y-6">
      
      {/* Top Filter and Date Range Control Bar */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          
          {/* Branch Analysis Selector for Admin */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <Building2 className="h-4 w-4 text-sky-600" />
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Branch Scope:</span>
            <select
              value={selectedBranchId}
              onChange={(e) => !restrictedBranchIdProp && setSelectedBranchId(e.target.value)}
              disabled={!!restrictedBranchIdProp}
              className={`text-xs font-extrabold px-2.5 py-1 rounded-lg border focus:outline-none cursor-pointer shadow-2xs ${
                restrictedBranchIdProp
                  ? 'bg-amber-50 border-amber-300 text-amber-900 cursor-not-allowed'
                  : 'bg-white border-slate-300 text-slate-900 focus:ring-2 focus:ring-sky-500'
              }`}
            >
              {!restrictedBranchIdProp && (
                <option value="all">📊 ALL BRANCHES (CONSOLIDATED)</option>
              )}
              {branches.map(b => (
                <option key={b.id} value={b.id}>🏥 {b.name.toUpperCase()}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 text-slate-700">
            <Calendar className="h-4 w-4 text-sky-600" />
            <span className="text-xs font-bold uppercase tracking-wider">Date Range Filter:</span>
          </div>
          
          <div className="flex items-center gap-1.5">
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs text-slate-700 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
            />
            <span className="text-slate-400 text-xs font-bold">to</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs text-slate-700 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
            />
          </div>

          {(startDate || endDate || selectedBranchId !== 'all') && (
            <button
              onClick={() => { setStartDate(''); setEndDate(''); setSelectedBranchId('all'); }}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleEraseClick}
            className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border border-rose-200"
            title="Erase all command reports, recent sales, and reset dashboard figures (Admin only)"
          >
            <Trash2 className="h-3.5 w-3.5 text-rose-600" />
            <span>Erase Command Reports</span>
          </button>

          <button
            onClick={() => handleExportReportPdf('current')}
            className="px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
            title="Download PDF for currently active report tab"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Download Active Report (PDF)</span>
          </button>

          <button
            onClick={() => handleExportReportPdf('all')}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-md border border-slate-700"
            title="Compile and download all 6 report modules in one master PDF"
          >
            <Printer className="h-3.5 w-3.5 text-sky-400" />
            <span>Download ALL Reports (Master PDF)</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left Navigation & Right Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Side: Report Navigation Menu */}
        <div className="lg:col-span-1 flex flex-col gap-2 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm h-fit">
          <div className="text-[10px] uppercase font-extrabold text-slate-400 px-3 tracking-widest flex items-center gap-1.5 pb-1">
            <FileText className="h-3.5 w-3.5 text-sky-600" />
            Pharmacy Command Reports
          </div>
          
          <div className="space-y-1">
            <button
              onClick={() => { setActiveReportTab('sales'); setSearchQuery(''); }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                activeReportTab === 'sales'
                  ? 'bg-sky-50 text-sky-600 border-l-4 border-sky-500 font-extrabold shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                <span>Daily Sales Report</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 opacity-60" />
            </button>

            <button
              onClick={() => { setActiveReportTab('debitLedger'); setSearchQuery(''); }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                activeReportTab === 'debitLedger'
                  ? 'bg-rose-50 text-rose-600 border-l-4 border-rose-500 font-extrabold shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                <span>Debit Ledger &amp; Credit</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 opacity-60" />
            </button>

            <button
              onClick={() => { setActiveReportTab('staff'); setSearchQuery(''); }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                activeReportTab === 'staff'
                  ? 'bg-indigo-50 text-indigo-600 border-l-4 border-indigo-500 font-extrabold shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>Staff Activity &amp; Sales</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 opacity-60" />
            </button>

            <button
              onClick={() => { setActiveReportTab('pandl'); setSearchQuery(''); }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                activeReportTab === 'pandl'
                  ? 'bg-emerald-50 text-emerald-600 border-l-4 border-emerald-500 font-extrabold shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                <span>Profit &amp; Loss (P&amp;L)</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 opacity-60" />
            </button>

            <button
              onClick={() => { setActiveReportTab('expiry'); setSearchQuery(''); }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                activeReportTab === 'expiry'
                  ? 'bg-amber-50 text-amber-600 border-l-4 border-amber-500 font-extrabold shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                <span>Expiry Tracking</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 opacity-60" />
            </button>
          </div>
        </div>

        {/* Right Side: Active Tab View */}
        <div className="lg:col-span-3 space-y-6">

          {/* TAB 1: DAILY SALES REPORT */}
          {activeReportTab === 'sales' && (
            <div className="space-y-6">
              
              {/* Formula & Gross POS Sales Banner */}
              <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-400 block">System Financial Overview</span>
                  <h4 className="text-base font-black text-white font-display">Gross POS Sales & Net Register Balance</h4>
                  <p className="text-xs font-mono text-slate-300 mt-1">
                    Gross POS Sales (${grossPosSales.toFixed(2)}) | Net Register Balance = Direct Cash (${totalCashSales.toFixed(2)}) + Recovered Debts (${totalRecoveredDebtsUsd.toFixed(2)}) - Expenses (${totalApprovedExpensesUsd.toFixed(2)})
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="bg-sky-950/90 border border-sky-500/40 px-4 py-2.5 rounded-xl text-right">
                    <span className="text-[9px] uppercase font-extrabold text-sky-400 block">Gross POS Sales (100% POS Match)</span>
                    <span className="text-lg font-black text-sky-300 font-mono block">${grossPosSales.toFixed(2)} USD</span>
                    <span className="text-[10px] text-sky-400 font-extrabold font-mono font-sans font-bold">({(grossPosSales * usdToSspRate).toLocaleString(undefined, {maximumFractionDigits:0})} SSP)</span>
                  </div>
                  <div className="bg-emerald-950/80 border border-emerald-500/40 px-4 py-2.5 rounded-xl text-right">
                    <span className="text-[9px] uppercase font-extrabold text-emerald-400 block">Net Register Balance</span>
                    <span className="text-lg font-black text-emerald-300 font-mono block">${formulaNetTotalSales.toFixed(2)} USD</span>
                    <span className="text-[10px] text-emerald-400 font-extrabold font-mono font-sans font-bold">({(formulaNetTotalSales * usdToSspRate).toLocaleString(undefined, {maximumFractionDigits:0})} SSP)</span>
                  </div>
                </div>
              </div>

              {/* Daily Sales Summary Breakdown Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Gross POS Checkout Volume</span>
                  <div className="text-xl font-black text-sky-600 font-display">
                    ${grossPosSales.toFixed(2)} USD
                  </div>
                  <div className="text-xs font-extrabold text-sky-700 font-mono">
                    {(grossPosSales * usdToSspRate).toLocaleString(undefined, {maximumFractionDigits:0})} SSP
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">Total completed POS register checkouts</p>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Direct Cash Sales (+)</span>
                  <div className="text-xl font-black text-emerald-600 font-display">
                    ${totalCashSales.toFixed(2)} USD
                  </div>
                  <div className="text-xs font-extrabold text-emerald-700 font-mono">
                    {(totalCashSales * usdToSspRate).toLocaleString(undefined, {maximumFractionDigits:0})} SSP
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">Paid instantly in cash/card/mobile</p>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Debts Recovered (+)</span>
                  <div className="text-xl font-black text-emerald-700 font-display">
                    ${totalRecoveredDebtsUsd.toFixed(2)} USD
                  </div>
                  <div className="text-xs font-extrabold text-emerald-800 font-mono">
                    {(totalRecoveredDebtsUsd * usdToSspRate).toLocaleString(undefined, {maximumFractionDigits:0})} SSP
                  </div>
                  <p className="text-[10px] text-emerald-700 mt-0.5">Debts cleared and collected</p>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Approved Expenses (-)</span>
                  <div className="text-xl font-black text-amber-600 font-display">
                    -${totalApprovedExpensesUsd.toFixed(2)} USD
                  </div>
                  <div className="text-xs font-extrabold text-amber-700 font-mono">
                    -{(totalApprovedExpensesUsd * usdToSspRate).toLocaleString(undefined, {maximumFractionDigits:0})} SSP
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">Approved operational costs</p>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pending Debts (-)</span>
                  <div className="text-xl font-black text-rose-600 font-display">
                    -${totalCreditSales.toFixed(2)} USD
                  </div>
                  <div className="text-xs font-extrabold text-rose-700 font-mono">
                    -{(totalCreditSales * usdToSspRate).toLocaleString(undefined, {maximumFractionDigits:0})} SSP
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">Outstanding credit sales</p>
                </div>
              </div>

              {/* Wholesale vs Retail Channel Sales Breakdown Banner */}
              <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-md space-y-4 border border-indigo-800/40">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-indigo-800/40 pb-3">
                  <div>
                    <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-sky-400" />
                      <span>Wholesale vs Retail Channel Sales Breakdown</span>
                    </h4>
                    <p className="text-xs text-indigo-200 mt-0.5">
                      Segregated channel volume tracking comparing bulk wholesale orders vs individual walk-in retail sales.
                    </p>
                  </div>
                  <span className="bg-sky-500/20 text-sky-300 border border-sky-400/30 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider">
                    Channel Analytics Active
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 space-y-1">
                    <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider block">Wholesale Revenue</span>
                    <span className="text-xl font-black text-sky-400 font-display">${totalWholesaleRevenueUsd.toFixed(2)} USD</span>
                    <span className="text-[10px] text-indigo-200 block font-mono">{totalWholesaleUnitsSold} bulk units ({wholesalePct.toFixed(1)}%)</span>
                  </div>

                  <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 space-y-1">
                    <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider block">Retail Revenue</span>
                    <span className="text-xl font-black text-emerald-400 font-display">${totalRetailRevenueUsd.toFixed(2)} USD</span>
                    <span className="text-[10px] text-indigo-200 block font-mono">{totalRetailUnitsSold} retail units ({retailPct.toFixed(1)}%)</span>
                  </div>

                  <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 space-y-1">
                    <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider block">Channel Share</span>
                    <div className="w-full bg-slate-800 rounded-full h-2.5 mt-2 overflow-hidden flex">
                      <div className="bg-sky-400 h-full transition-all" style={{ width: `${wholesalePct}%` }}></div>
                      <div className="bg-emerald-400 h-full transition-all" style={{ width: `${retailPct}%` }}></div>
                    </div>
                    <div className="flex justify-between text-[9px] text-indigo-300 font-mono pt-1">
                      <span>Bulk: {wholesalePct.toFixed(0)}%</span>
                      <span>Retail: {retailPct.toFixed(0)}%</span>
                    </div>
                  </div>

                  <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 space-y-1">
                    <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider block">Total Channel Sales</span>
                    <span className="text-xl font-black text-white font-display">${grandTotalChannelRevenue.toFixed(2)} USD</span>
                    <span className="text-[10px] text-indigo-200 block font-mono">{totalWholesaleUnitsSold + totalRetailUnitsSold} combined units</span>
                  </div>
                </div>
              </div>

              {/* Table of Daily Sales Items */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
                
                {/* Banner & Quick Drug Selector */}
                <div className="bg-gradient-to-r from-sky-900 to-indigo-900 rounded-2xl p-4 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-md text-sky-300">
                      <Pill className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
                        <span>Drug Unit Sales Analysis &amp; Dispatch Audit Log</span>
                        <span className="bg-sky-500/30 text-sky-200 border border-sky-400/30 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase">
                          Interactive
                        </span>
                      </h4>
                      <p className="text-xs text-sky-200/80 mt-0.5">
                        Tap any drug in the ledger below or select a medication to inspect exact timestamps and details of when each unit/units was sold.
                      </p>
                    </div>
                  </div>

                  {/* Quick Select Dropdown */}
                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          setSelectedDrugForModal(e.target.value);
                          e.target.value = '';
                        }
                      }}
                      className="bg-slate-800 text-slate-100 text-xs font-bold px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-400 cursor-pointer w-full md:w-auto"
                    >
                      <option value="">🔍 Quick Select Drug for Unit Audit...</option>
                      {Array.from(new Set(filteredDailySalesItems.map(i => i.item))).map(drugName => (
                        <option key={drugName} value={drugName}>💊 {drugName}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-between items-center border-b border-slate-100 pb-3 pt-2">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 font-display flex items-center gap-2">
                      <span>Daily Sales Detailed Ledger</span>
                      <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">
                        Tap drug row to view unit sales timeline
                      </span>
                    </h3>
                  </div>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search item name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="text-xs pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                        <th className="p-3">Date</th>
                        <th className="p-3">Item Name (Tap for Unit Log)</th>
                        <th className="p-3">Unit Cost ($)</th>
                        <th className="p-3">Quantity Sold</th>
                        <th className="p-3">Total Amount ($)</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Unit Analysis</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {filteredDailySalesItems
                        .filter(i => i.item.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map((row) => (
                          <tr 
                            key={row.id} 
                            onClick={() => setSelectedDrugForModal(row.item)}
                            className="hover:bg-sky-50/80 transition-colors cursor-pointer group"
                            title={`Tap to view full unit-by-unit sales history for ${row.item}`}
                          >
                            <td className="p-3 font-mono text-slate-600 font-semibold">{row.date}</td>
                            <td className="p-3">
                              <div className="font-extrabold text-slate-900 group-hover:text-sky-700 flex items-center gap-1.5">
                                <span>{row.item}</span>
                                <Eye className="w-3.5 h-3.5 text-sky-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono">Tap for unit sales timeline</span>
                            </td>
                            <td className="p-3 font-mono text-slate-600">${row.unitCost.toFixed(2)}</td>
                            <td className="p-3 font-mono font-bold text-slate-900">{row.qtySold} units</td>
                            <td className="p-3 font-mono font-black text-slate-900">${row.totalAmount.toFixed(2)}</td>
                            <td className="p-3 font-bold">
                              {row.status === 'Cash' && (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] border border-emerald-200">
                                  Cash (Paid)
                                </span>
                              )}
                              {row.status === 'Credit' && (
                                <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[10px] border border-rose-200">
                                  Credit Sale
                                </span>
                              )}
                              {row.status === 'Recovered Debt' && (
                                <span className="px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 text-[10px] border border-sky-200 font-extrabold">
                                  Recovered Debt
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedDrugForModal(row.item);
                                }}
                                className="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white text-[10px] font-extrabold rounded-xl transition-all shadow-2xs inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Eye className="w-3 h-3" />
                                <span>View Units Log</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                {/* Recovered Debts Sub-Section */}
                <div className="pt-4 border-t border-slate-200/80 space-y-3">
                  <div className="flex items-center gap-2 text-sky-900 font-extrabold text-xs">
                    <CheckCircle2 className="w-4 h-4 text-sky-600" />
                    <span>Recovered Debts Summary ({recoveredDebts.length} cleared records)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {recoveredDebts.map((rec) => (
                      <div key={rec.id} className="p-3 bg-sky-50/60 border border-sky-100 rounded-2xl flex justify-between items-center text-xs">
                        <div>
                          <span className="font-extrabold text-slate-900 block">{rec.customerName}</span>
                          <span className="text-[10px] text-slate-500 font-mono">{rec.phone} • Cleared on {new Date(rec.clearedAt).toLocaleDateString()}</span>
                        </div>
                        <div className="text-right font-mono">
                          <span className="font-black text-emerald-700 block">${rec.amountPaidUsd.toFixed(2)}</span>
                          <span className="text-[9px] text-slate-400 font-sans">By {rec.clearedBy}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: DEBIT LEDGER & CREDIT RECOVERY */}
          {activeReportTab === 'debitLedger' && (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-100 pb-4 gap-3">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 font-display flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-rose-600" />
                    Customer Debit Ledger (Date Range Filtered)
                  </h3>
                  <p className="text-xs text-slate-500">Track outstanding credits. Once debt is cleared, it flows automatically into Recovered Debts under Daily Sales.</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                      <th className="p-3">Ref ID</th>
                      <th className="p-3">Customer Name</th>
                      <th className="p-3">Area of Residency</th>
                      <th className="p-3">Telephone</th>
                      <th className="p-3">Items Taken</th>
                      <th className="p-3">Outstanding Debt ($)</th>
                      <th className="p-3">Issue Date</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredDebitLedger.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">
                          No outstanding debts found for the selected date range.
                        </td>
                      </tr>
                    ) : (
                      filteredDebitLedger.map(debt => (
                        <tr key={debt.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3 font-mono font-bold text-slate-400 text-[10px]">{debt.id}</td>
                          <td className="p-3 font-extrabold text-slate-900">{debt.customerName}</td>
                          <td className="p-3 text-slate-600">{debt.residency}</td>
                          <td className="p-3 font-mono text-slate-600">{debt.phone}</td>
                          <td className="p-3 text-slate-500 text-[11px] max-w-xs">{debt.items}</td>
                          <td className="p-3 font-mono font-black text-rose-600">${debt.totalDebtUsd.toFixed(2)}</td>
                          <td className="p-3 font-mono text-slate-500">{debt.createdAt}</td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => handleClearDebt(debt.id)}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-[10px] transition-all shadow-2xs cursor-pointer inline-flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Clear Debt</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: STAFF ACTIVITY REPORT */}
          {activeReportTab === 'staff' && (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 font-display flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600" />
                  Staff Activity &amp; Transaction Audit
                </h3>
                <p className="text-xs text-slate-500">
                  Select a staff member to view all sales transactions made and expenditures requested under their account.
                </p>
              </div>

              <div className="space-y-3">
                {staffList.map((staff: any) => {
                  const isExpanded = expandedStaffEmail === staff.email;
                  const staffSales = filteredDailySalesItems.filter(s => s.staffEmail === staff.email);
                  const staffExps = staffExpenditures.filter(e => e.staffEmail === staff.email);
                  const totalStaffSales = staffSales.reduce((sum, s) => sum + s.totalAmount, 0);

                  return (
                    <div key={staff.email} className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50">
                      
                      {/* Staff Header Row */}
                      <button
                        onClick={() => setExpandedStaffEmail(isExpanded ? null : staff.email)}
                        className="w-full p-4 flex items-center justify-between hover:bg-slate-100/80 transition-colors text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-extrabold flex items-center justify-center text-sm">
                            {staff.name.charAt(0)}
                          </div>
                          <div>
                            <span className="font-extrabold text-slate-900 text-sm block">{staff.name}</span>
                            <span className="text-[10px] text-slate-500 font-mono">{staff.email} • <span className="font-bold text-indigo-600">{staff.role}</span></span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 font-bold block uppercase">Total Sales Volume</span>
                            <span className="font-black text-slate-900 font-mono text-sm">${totalStaffSales.toFixed(2)} USD</span>
                          </div>
                          <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </div>
                      </button>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="p-4 bg-white border-t border-slate-200 space-y-4 text-xs">
                          
                          {/* Sales section */}
                          <div className="space-y-2">
                            <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                              <TrendingUp className="w-4 h-4 text-emerald-600" />
                              Sales Transactions Logged by {staff.name} ({staffSales.length})
                            </h4>
                            {staffSales.length === 0 ? (
                              <p className="text-[11px] text-slate-400 italic">No sales recorded under this account yet.</p>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-[11px]">
                                  <thead>
                                    <tr className="bg-slate-100 text-slate-500 uppercase text-[9px] font-extrabold">
                                      <th className="p-2">Date</th>
                                      <th className="p-2">Item</th>
                                      <th className="p-2">Qty</th>
                                      <th className="p-2">Amount</th>
                                      <th className="p-2">Status</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {staffSales.map(s => (
                                      <tr key={s.id}>
                                        <td className="p-2 font-mono">{s.date}</td>
                                        <td className="p-2 font-bold">{s.item}</td>
                                        <td className="p-2 font-mono">{s.qtySold}</td>
                                        <td className="p-2 font-mono font-bold">${s.totalAmount.toFixed(2)}</td>
                                        <td className="p-2">{s.status}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>

                          {/* Expenditures section */}
                          <div className="space-y-2 pt-2 border-t border-slate-100">
                            <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                              <Coins className="w-4 h-4 text-amber-600" />
                              Expenditure Requests Linked to {staff.name} ({staffExps.length})
                            </h4>
                            {staffExps.length === 0 ? (
                              <p className="text-[11px] text-slate-400 italic">No expenditures linked to this staff account.</p>
                            ) : (
                              <div className="space-y-1">
                                {staffExps.map(e => (
                                  <div key={e.id} className="p-2 bg-amber-50/50 rounded-xl border border-amber-100 flex justify-between items-center text-[11px]">
                                    <div>
                                      <span className="font-bold text-slate-900 block">{e.title}</span>
                                      <span className="text-[9px] text-slate-500">{e.category} • {e.date}</span>
                                    </div>
                                    <div className="text-right font-mono">
                                      <span className="font-bold text-slate-900 block">${e.amountUsd.toFixed(2)}</span>
                                      <span className="text-[9px] font-bold text-emerald-600">{e.status}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: PROFIT & LOSS */}
          {activeReportTab === 'pandl' && (() => {
            const pandlRevenueUsd = grossPosSales;
            const pandlCogsUsd = filteredDailySalesItems.reduce((sum, i) => sum + ((Number(i.unitCost) || (Number(i.unitPrice) * 0.55)) * (Number(i.qtySold) || 1)), 0);
            const pandlOperatingExpensesUsd = totalApprovedExpensesUsd;
            const pandlNetOperatingProfitUsd = pandlRevenueUsd - pandlCogsUsd - pandlOperatingExpensesUsd;

            return (
              <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
                <h3 className="text-base font-extrabold text-slate-900 font-display">Profit &amp; Loss (P&amp;L) Statement</h3>
                <p className="text-xs text-slate-500">Financial summary comparing revenue, cost of goods, and operational expenditures.</p>
                
                <div className="space-y-2 font-mono text-xs pt-2">
                  <div className="flex justify-between p-3 bg-slate-50 rounded-xl">
                    <span className="font-bold text-slate-700">Gross Sales Revenue:</span>
                    <span className="font-black text-slate-900">${pandlRevenueUsd.toFixed(2)} USD</span>
                  </div>
                  <div className="flex justify-between p-3 bg-slate-50 rounded-xl text-rose-700">
                    <span className="font-bold">Cost of Goods Sold (COGS):</span>
                    <span className="font-black">-${pandlCogsUsd.toFixed(2)} USD</span>
                  </div>
                  <div className="flex justify-between p-3 bg-slate-50 rounded-xl text-amber-700">
                    <span className="font-bold">Operating Expenses (Approved Expenditures):</span>
                    <span className="font-black">-${pandlOperatingExpensesUsd.toFixed(2)} USD</span>
                  </div>
                  <div className={`flex justify-between p-4 rounded-2xl text-sm border ${pandlNetOperatingProfitUsd >= 0 ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-rose-50 text-rose-900 border-rose-200'}`}>
                    <span className="font-extrabold">Net Operating Profit / (Loss):</span>
                    <span className="font-black">${pandlNetOperatingProfitUsd.toFixed(2)} USD</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* TAB 5: EXPIRY TRACKING */}
          {activeReportTab === 'expiry' && (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
              <h3 className="text-base font-extrabold text-slate-900 font-display flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                Medication Expiration Schedule &amp; Risk Audit
              </h3>
              <p className="text-xs text-slate-500">Batches expiring within 90 days requiring priority dispatch or transfer.</p>

              {expiryRiskReport.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200/60 my-2">
                  <p className="text-xs font-bold text-slate-500">No expiring medication batches recorded in inventory.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold uppercase text-slate-400">
                        <th className="p-3">Medication</th>
                        <th className="p-3">Batch No</th>
                        <th className="p-3">Expiry Date</th>
                        <th className="p-3">Stock Units</th>
                        <th className="p-3">Risk Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {expiryRiskReport.map((b: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-3 font-extrabold text-slate-900">{b.drugName}</td>
                          <td className="p-3 font-mono">{b.batchNumber}</td>
                          <td className="p-3 font-mono font-bold text-amber-600">{b.expiryDate}</td>
                          <td className="p-3 font-mono">{b.quantity} units</td>
                          <td className="p-3"><span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-bold text-[10px]">{b.riskLevel}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* DRUG UNIT SALES ANALYSIS & TIMELINE MODAL */}
      {selectedDrugForModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-7xl w-11/12 max-h-[95vh] flex flex-col overflow-hidden my-auto">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-sky-900 via-slate-900 to-indigo-950 text-white p-6 relative flex-shrink-0">
              <button
                onClick={() => {
                  setSelectedDrugForModal(null);
                  setUnitSearchQuery('');
                }}
                className="absolute top-5 right-5 p-2 bg-white/10 hover:bg-white/20 rounded-full text-slate-300 hover:text-white transition-all cursor-pointer"
                title="Close Modal"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 text-sky-400 font-extrabold text-[11px] uppercase tracking-widest mb-1">
                <Clock className="w-4 h-4 text-sky-400" />
                <span>Medication Unit Sales &amp; Dispatch Timeline Audit</span>
              </div>

              <h2 className="text-2xl font-black text-white font-display flex items-center gap-2.5">
                <Pill className="w-6 h-6 text-sky-400" />
                <span>{selectedDrugForModal}</span>
              </h2>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                Comprehensive enlarged audit trail detailing exact dates, timestamps, batch numbers, staff cashiers, and customer records for every unit sold.
              </p>
            </div>

            {/* Modal Summary Stats Bar */}
            {(() => {
              const matchingUnitLogs = filteredUnitSalesLogs.filter(log =>
                log.drugName.toLowerCase().includes(selectedDrugForModal.toLowerCase()) ||
                selectedDrugForModal.toLowerCase().includes(log.drugName.toLowerCase())
              );

              const modalLogsToRender = (matchingUnitLogs.length > 0) 
                ? matchingUnitLogs 
                : filteredDailySalesItems
                    .filter(i => i.item.toLowerCase().includes(selectedDrugForModal.toLowerCase()))
                    .map((item, idx) => ({
                      id: `DYN-${idx}`,
                      drugName: item.item,
                      dateTime: `${item.date} 02:15:${10 + idx} PM`,
                      unitsSold: item.qtySold,
                      unitPriceUsd: item.unitPrice || (item.totalAmount / item.qtySold),
                      totalAmountUsd: item.totalAmount,
                      batchNumber: item.batchNo || 'BATCH-2026-MAIN',
                      receiptNo: item.receiptNo || `INV-2026-00${idx + 1}`,
                      customerName: item.customerName || 'Walk-in Customer',
                      staffName: item.staffName || 'Active Pharmacist',
                      paymentMethod: item.status === 'Cash' ? 'Cash (SSP)' : item.status,
                      status: item.status as any
                    }));

              const filteredModalLogs = modalLogsToRender.filter(log => {
                if (!unitSearchQuery) return true;
                const q = unitSearchQuery.toLowerCase();
                return log.customerName.toLowerCase().includes(q) ||
                       log.staffName.toLowerCase().includes(q) ||
                       log.receiptNo.toLowerCase().includes(q) ||
                       log.batchNumber.toLowerCase().includes(q) ||
                       log.paymentMethod.toLowerCase().includes(q);
              });

              const modalTotalUnits = filteredModalLogs.reduce((sum, l) => sum + l.unitsSold, 0);
              const modalTotalUsd = filteredModalLogs.reduce((sum, l) => sum + l.totalAmountUsd, 0);
              const modalAvgPrice = modalTotalUnits > 0 ? modalTotalUsd / modalTotalUnits : 0;

              const handleExportPdf = () => {
                const content = `
                  <!DOCTYPE html>
                  <html>
                    <head>
                      <title>${selectedDrugForModal} - Unit Sales & Dispatch Audit Log</title>
                      <style>
                        body { font-family: system-ui, -apple-system, sans-serif; padding: 30px; color: #0f172a; }
                        .header { border-bottom: 2px solid #0284c7; padding-bottom: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
                        .title { font-size: 20px; font-weight: 900; color: #0f172a; margin: 0; }
                        .subtitle { font-size: 12px; color: #64748b; margin-top: 4px; }
                        .stats { display: flex; gap: 20px; margin-bottom: 25px; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; }
                        .stat-box { flex: 1; }
                        .stat-label { font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; }
                        .stat-val { font-size: 16px; font-weight: 900; color: #0f172a; margin-top: 2px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; }
                        th { background: #0f172a; color: white; text-align: left; padding: 8px 10px; font-size: 10px; text-transform: uppercase; }
                        td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
                        tr:nth-child(even) { background: #f8fafc; }
                        .footer { margin-top: 30px; pt: 15px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; text-align: center; }
                        @media print {
                          body { padding: 0; }
                        }
                      </style>
                    </head>
                    <body>
                      <div class="header">
                        <div>
                          <h1 class="title">${activeTenant?.name || 'Junub Pharmacare Enterprise'}</h1>
                          <p class="subtitle">Unit Sales & Dispatch Timeline Audit Report • ${selectedDrugForModal}</p>
                        </div>
                        <div style="text-align: right; font-size: 11px; color: #64748b;">
                          <p><strong>Date Generated:</strong> ${new Date().toLocaleDateString()}</p>
                          <p><strong>Branch Scope:</strong> ${selectedBranchId === 'all' ? 'All Outlets (Consolidated)' : selectedBranchId}</p>
                        </div>
                      </div>

                      <div class="stats">
                        <div class="stat-box">
                          <div class="stat-label">Total Units Sold</div>
                          <div class="stat-val">${modalTotalUnits} Units</div>
                        </div>
                        <div class="stat-box">
                          <div class="stat-label">Total Proceeds</div>
                          <div class="stat-val">$${modalTotalUsd.toFixed(2)} USD</div>
                        </div>
                        <div class="stat-box">
                          <div class="stat-label">Sales Transactions</div>
                          <div class="stat-val">${filteredModalLogs.length} Receipts</div>
                        </div>
                        <div class="stat-box">
                          <div class="stat-label">Average Unit Price</div>
                          <div class="stat-val">$${modalAvgPrice.toFixed(2)} / unit</div>
                        </div>
                      </div>

                      <table>
                        <thead>
                          <tr>
                            <th>Date & Time</th>
                            <th>Units Sold</th>
                            <th>Batch Number</th>
                            <th>Unit Price ($)</th>
                            <th>Total Amount ($)</th>
                            <th>Receipt No</th>
                            <th>Staff Cashier</th>
                            <th>Customer</th>
                            <th>Payment Method</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${filteredModalLogs.map(l => `
                            <tr>
                              <td>${l.dateTime}</td>
                              <td><strong>${l.unitsSold} units</strong></td>
                              <td>${l.batchNumber}</td>
                              <td>$${l.unitPriceUsd.toFixed(2)}</td>
                              <td><strong>$${l.totalAmountUsd.toFixed(2)}</strong></td>
                              <td>#${l.receiptNo}</td>
                              <td>${l.staffName}</td>
                              <td>${l.customerName}</td>
                              <td>${l.paymentMethod}</td>
                            </tr>
                          `).join('')}
                        </tbody>
                      </table>

                      <div class="footer">
                        Official Junub Pharmacare System Generated PDF Report • Verified Audit Trail Log
                      </div>

                      <script>
                        window.onload = function() { window.print(); }
                      </script>
                    </body>
                  </html>
                `;
                executePrintHtml(content, `${selectedDrugForModal} - Audit Log`);
              };

              return (
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                  
                  {/* Top Stats Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Total Units Sold</span>
                      <span className="text-2xl font-black text-sky-700 dark:text-sky-400 font-display mt-0.5 block">{modalTotalUnits} Units</span>
                      <span className="text-[10px] text-slate-500">Across all orders</span>
                    </div>

                    <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl">
                      <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">Total Revenue</span>
                      <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400 font-display mt-0.5 block">${modalTotalUsd.toFixed(2)} USD</span>
                      <span className="text-[10px] text-emerald-800 dark:text-emerald-300">Gross proceeds</span>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Sales Events</span>
                      <span className="text-2xl font-black text-slate-900 dark:text-slate-100 font-display mt-0.5 block">{filteredModalLogs.length} Receipts</span>
                      <span className="text-[10px] text-slate-500">Transactions</span>
                    </div>

                    <div className="p-4 bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-2xl">
                      <span className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">Avg Price / Unit</span>
                      <span className="text-2xl font-black text-indigo-800 dark:text-indigo-300 font-display mt-0.5 block">${modalAvgPrice.toFixed(2)} / unit</span>
                      <span className="text-[10px] text-indigo-700 dark:text-indigo-300">Effective unit rate</span>
                    </div>
                  </div>

                  {/* Search and Action Bar in Modal */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                    <div className="relative w-full sm:w-96">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        placeholder="Search by customer, cashier, receipt or batch..."
                        value={unitSearchQuery}
                        onChange={(e) => setUnitSearchQuery(e.target.value)}
                        className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 font-semibold placeholder:text-slate-400"
                      />
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        onClick={handleExportPdf}
                        className="flex-1 sm:flex-initial px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                      >
                        <FileText className="w-4 h-4" />
                        <span>Download PDF Document</span>
                      </button>

                      <button
                        onClick={handleExportPdf}
                        className="flex-1 sm:flex-initial px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 border border-slate-300 dark:border-slate-600"
                      >
                        <Printer className="w-4 h-4 text-sky-600" />
                        <span>Print PDF Audit</span>
                      </button>
                    </div>
                  </div>

                  {/* Unit Sales Log Timeline Table */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs bg-white">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-100/80 border-b border-slate-200 text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
                          <th className="p-3">Date &amp; Time Sold</th>
                          <th className="p-3 text-center">Units Sold</th>
                          <th className="p-3">Batch / Lot No</th>
                          <th className="p-3">Unit Price ($)</th>
                          <th className="p-3">Total ($)</th>
                          <th className="p-3">Receipt / Ref</th>
                          <th className="p-3">Dispensed By (Staff)</th>
                          <th className="p-3">Customer / Patient</th>
                          <th className="p-3">Payment Channel</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {filteredModalLogs.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="p-8 text-center text-slate-400 font-medium italic">
                              No unit sales records match the search query.
                            </td>
                          </tr>
                        ) : (
                          filteredModalLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="p-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                                  <span>{log.dateTime}</span>
                                </div>
                              </td>
                              <td className="p-3 text-center">
                                <span className="px-2.5 py-1 bg-sky-100 text-sky-800 font-black font-mono rounded-xl border border-sky-200 text-xs">
                                  {log.unitsSold} units
                                </span>
                              </td>
                              <td className="p-3 font-mono text-slate-600 text-[11px]">
                                <span className="bg-slate-100 px-2 py-0.5 rounded font-bold border border-slate-200">
                                  {log.batchNumber}
                                </span>
                              </td>
                              <td className="p-3 font-mono text-slate-700">${log.unitPriceUsd.toFixed(2)}</td>
                              <td className="p-3 font-mono font-black text-slate-900">${log.totalAmountUsd.toFixed(2)}</td>
                              <td className="p-3 font-mono font-bold text-emerald-700 text-[11px]">
                                #{log.receiptNo}
                              </td>
                              <td className="p-3 text-slate-800 font-extrabold">{log.staffName}</td>
                              <td className="p-3 text-slate-700 font-medium">{log.customerName}</td>
                              <td className="p-3 font-bold">
                                <span className={`px-2 py-0.5 rounded text-[10px] ${
                                  log.paymentMethod.includes('m-GURUSH') ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                                  log.paymentMethod.includes('Credit') ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                                  'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                }`}>
                                  {log.paymentMethod}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                </div>
              );
            })()}

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center flex-shrink-0 text-xs text-slate-500">
              <span className="font-mono">Junub Pharmacare Unit Dispatch Tracker • Real-time Audit Trail</span>
              <button
                onClick={() => {
                  setSelectedDrugForModal(null);
                  setUnitSearchQuery('');
                }}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer shadow-2xs"
              >
                Close Audit View
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Non-Admin Security Denial Modal */}
      {showDenialModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 space-y-5">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-50 rounded-2xl border border-rose-100">
                <AlertTriangle className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Admin Authorization Required</h3>
                <p className="text-xs text-rose-600 font-extrabold">Access Control Security Lockout</p>
              </div>
            </div>

            <div className="bg-rose-50/60 p-4 rounded-2xl border border-rose-100 space-y-2">
              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                Strictly accounts named or designated as <strong className="text-slate-900 font-extrabold">Admin (Administrator)</strong> are authorized to erase command reports, recent sales, and reset dashboard figures.
              </p>
              <p className="text-[11px] text-slate-500 font-mono">
                Current Account Role: <span className="font-bold text-slate-800">{activeRole || 'Staff Member'}</span> {userEmail ? `(${userEmail})` : ''}
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowDenialModal(false)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
              >
                Understood & Acknowledge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Erase Modal for Admin */}
      {showConfirmEraseModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 space-y-5">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-100 rounded-2xl border border-rose-200">
                <Trash2 className="w-6 h-6 text-rose-700" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Erase Command Reports & Sales Figures</h3>
                <p className="text-xs text-rose-600 font-extrabold">Admin Override Command</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Are you sure you want to completely erase all pharmacy command reports, recent sales transaction records, unit sales logs, debit ledgers, and reset dashboard figures to zero?
            </p>

            <div className="bg-amber-50 p-3.5 rounded-2xl border border-amber-200 text-amber-900 text-[11px] font-medium leading-relaxed">
              <strong>Warning:</strong> Erasing command reports permanently clears all sales logs, recent sales tables, and resets figures on the <span className="font-bold">Architectural Dashboard</span>.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowConfirmEraseModal(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={executeEraseCommandReports}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Yes, Erase Everything</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
