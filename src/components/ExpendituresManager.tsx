import React, { useState, useEffect } from 'react';
import { 
  FileText, Plus, CheckCircle2, XCircle, Clock, Filter, Search, 
  Download, Printer, DollarSign, ShieldAlert, CheckSquare, Square, 
  Building2, Users, AlertCircle, Coins, Sparkles, Sliders, Trash2,
  RefreshCw, RotateCcw
} from 'lucide-react';
import { saveExpenditureToFirestore } from '../lib/firebaseSync';

export interface ExpenditureItem {
  id: string;
  tenantId: string;
  title: string;
  description: string;
  category: string;
  amountUsd: number;
  amountSsp: number;
  requestedByStaffId: string;
  requestedByStaffName: string;
  branchId: string;
  branchName: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  rejectedBy?: string;
  notes?: string;
  createdAt: string;
}

interface ExpendituresManagerProps {
  activeTenantId: string;
  activeTenant: any;
  activeRole: string;
  userEmail: string;
  initialBranchId?: string;
  restrictedBranchId?: string | null;
}

export default function ExpendituresManager({
  activeTenantId,
  activeTenant,
  activeRole = 'Administrator',
  userEmail = 'junubposcenter@gmail.com',
  initialBranchId,
  restrictedBranchId: restrictedBranchIdProp
}: ExpendituresManagerProps) {
  const usdToSspRate = activeTenant?.usdToSspRate || 3100;
  
  // Branch Filter State
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');

  useEffect(() => {
    if (restrictedBranchIdProp) {
      setSelectedBranchId(restrictedBranchIdProp);
    } else if (initialBranchId) {
      setSelectedBranchId(initialBranchId);
    }
  }, [initialBranchId, restrictedBranchIdProp]);
  
  // Manager expenditure approval limit configured by Administrator
  const [managerApprovalLimitUsd, setManagerApprovalLimitUsd] = useState<number>(200);
  const [showLimitConfigModal, setShowLimitConfigModal] = useState<boolean>(false);
  const [newLimitInput, setNewLimitInput] = useState<string>('200');
  const [showClearAllModal, setShowClearAllModal] = useState<boolean>(false);

  // Initial Sample Data Helper
  const getInitialSampleExpenditures = (): ExpenditureItem[] => [
    {
      id: 'EXP-9001',
      tenantId: activeTenantId,
      title: 'Dispensary Air Conditioning Refrigerant Top-up',
      description: 'Urgent cooling repair for cold-chain vaccine preservation in Main Store',
      category: 'Operational Maintenance',
      amountUsd: 140,
      amountSsp: 140 * usdToSspRate,
      requestedByStaffId: 'staff-1',
      requestedByStaffName: 'Moses Deng (Senior Pharmacist)',
      branchId: 'branch-1',
      branchName: 'Juba Town Main Clinic',
      status: 'approved',
      approvedBy: 'Administrator',
      createdAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString()
    },
    {
      id: 'EXP-9002',
      tenantId: activeTenantId,
      title: 'Emergency Fuel Purchase for Back-up Generator',
      description: '100 Liters Diesel for unannounced municipal power cut',
      category: 'Utilities & Power',
      amountUsd: 250,
      amountSsp: 250 * usdToSspRate,
      requestedByStaffId: 'staff-2',
      requestedByStaffName: 'Grace Kiden (Dispensary Staff)',
      branchId: 'branch-1',
      branchName: 'Juba Town Main Clinic',
      status: 'pending',
      createdAt: new Date(Date.now() - 3600000 * 5).toISOString()
    },
    {
      id: 'EXP-9003',
      tenantId: activeTenantId,
      title: 'Motorbike Courier Logistics for Northside Branch Stock',
      description: 'Transfer fee for 50 boxes of Antibiotics to Northside Dispensary',
      category: 'Logistics & Transport',
      amountUsd: 45,
      amountSsp: 45 * usdToSspRate,
      requestedByStaffId: 'staff-3',
      requestedByStaffName: 'Ronald Okello (Store Manager)',
      branchId: 'branch-2',
      branchName: 'Northside Branch',
      status: 'approved',
      approvedBy: 'Manager',
      createdAt: new Date(Date.now() - 3600000 * 12).toISOString()
    }
  ];

  // Persistent Expenditures State
  const [expenditures, setExpenditures] = useState<ExpenditureItem[]>(() => {
    const isReset = typeof window !== 'undefined' && localStorage.getItem('trust_pharmacy_factory_reset') === 'true';
    const saved = localStorage.getItem('junub_expenditures');
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.warn("Failed parsing cached expenditures:", e);
      }
    }
    if (isReset) {
      return [];
    }
    return getInitialSampleExpenditures();
  });

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('junub_expenditures', JSON.stringify(expenditures));
  }, [expenditures]);

  // Listen to system factory reset and global reset events
  useEffect(() => {
    const handleSystemReset = () => {
      setExpenditures([]);
      setSelectedIds([]);
      localStorage.setItem('junub_expenditures', JSON.stringify([]));
    };

    window.addEventListener('junub_system_reset', handleSystemReset);
    window.addEventListener('system_factory_reset', handleSystemReset);
    return () => {
      window.removeEventListener('junub_system_reset', handleSystemReset);
      window.removeEventListener('system_factory_reset', handleSystemReset);
    };
  }, []);

  // Modal & Selection States
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [receiptPrintItem, setReceiptPrintItem] = useState<ExpenditureItem | null>(null);

  // New Expenditure Form State
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'Operational Maintenance',
    amountUsd: '',
    currencyInput: 'USD', // 'USD' or 'SSP'
    requestedByStaffName: userEmail ? userEmail.split('@')[0] : 'Pharmacist',
    branchName: activeTenant?.branches?.[0]?.name || 'Juba Town Main Clinic'
  });

  const staffList = activeTenant?.staff || [
    { name: 'Sande Reagan (Pharmacy Owner)' },
    { name: 'Moses Deng (Senior Pharmacist)' },
    { name: 'Grace Kiden (Pharmacist Assistant)' },
    { name: 'Ronald Okello (Branch Manager)' }
  ];

  const categories = [
    'Operational Maintenance',
    'Utilities & Power',
    'Logistics & Transport',
    'Drug Procurement & Supplies',
    'Licensing & Regulatory Fees',
    'Staff Emergency & Allowances',
    'Miscellaneous'
  ];

  // Submit New Request
  const handleCreateExpenditure = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.amountUsd) {
      alert("Please fill in the expenditure title and valid amount.");
      return;
    }

    let usdVal = parseFloat(form.amountUsd);
    if (form.currencyInput === 'SSP') {
      usdVal = usdVal / usdToSspRate;
    }

    const newItem: ExpenditureItem = {
      id: `EXP-${Math.floor(1000 + Math.random() * 9000)}`,
      tenantId: activeTenantId,
      title: form.title,
      description: form.description,
      category: form.category,
      amountUsd: usdVal,
      amountSsp: usdVal * usdToSspRate,
      requestedByStaffId: `staff-${Date.now()}`,
      requestedByStaffName: form.requestedByStaffName,
      branchId: 'branch-1',
      branchName: form.branchName,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    saveExpenditureToFirestore('shared-global-tenant-v1', newItem as any)
      .catch(err => console.warn("Firestore expenditure save notice:", err));

    setExpenditures([newItem, ...expenditures]);
    setShowAddModal(false);
    setForm({
      title: '',
      description: '',
      category: 'Operational Maintenance',
      amountUsd: '',
      currencyInput: 'USD',
      requestedByStaffName: userEmail ? userEmail.split('@')[0] : 'Pharmacist',
      branchName: activeTenant?.branches?.[0]?.name || 'Juba Town Main Clinic'
    });
    alert(`Expenditure request ${newItem.id} submitted for review!`);
  };

  // Single Approval
  const handleApprove = (id: string) => {
    if (activeRole !== 'Administrator' && activeRole !== 'Master Admin') {
      alert("APPROVAL RESTRICTED: Only Pharmacy Administrators can approve expenditure requests.");
      return;
    }
    const item = expenditures.find(e => e.id === id);
    if (!item) return;

    setExpenditures(prev => prev.map(e => e.id === id ? { ...e, status: 'approved', approvedBy: activeRole } : e));
  };

  // Single Rejection
  const handleReject = (id: string) => {
    if (activeRole !== 'Administrator' && activeRole !== 'Master Admin') {
      alert("REJECTION RESTRICTED: Only Pharmacy Administrators can reject expenditure requests.");
      return;
    }
    setExpenditures(prev => prev.map(e => e.id === id ? { ...e, status: 'rejected', rejectedBy: activeRole } : e));
  };

  // Batch Selection Toggle
  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const selectAllFiltered = () => {
    const ids = filteredExpenditures.map(e => e.id);
    if (selectedIds.length === ids.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(ids);
    }
  };

  // Batch Approval / Rejection
  const handleBatchApprove = () => {
    if (selectedIds.length === 0) return;
    
    // Check limit if Manager
    let skippedCount = 0;
    setExpenditures(prev => prev.map(e => {
      if (selectedIds.includes(e.id) && e.status === 'pending') {
        if (activeRole === 'Manager' && e.amountUsd > managerApprovalLimitUsd) {
          skippedCount++;
          return e;
        }
        return { ...e, status: 'approved', approvedBy: activeRole };
      }
      return e;
    }));

    if (skippedCount > 0) {
      alert(`Batch Approved with exception: ${skippedCount} items exceeded Manager threshold ($${managerApprovalLimitUsd} USD) and require Administrator approval.`);
    } else {
      alert(`Successfully approved ${selectedIds.length} expenditure requests!`);
    }
    setSelectedIds([]);
  };

  const handleBatchReject = () => {
    if (selectedIds.length === 0) return;
    setExpenditures(prev => prev.map(e => {
      if (selectedIds.includes(e.id) && e.status === 'pending') {
        return { ...e, status: 'rejected', rejectedBy: activeRole };
      }
      return e;
    }));
    alert(`Batch rejected ${selectedIds.length} expenditure requests.`);
    setSelectedIds([]);
  };

  // Single Record Deletion
  const handleDeleteSingle = (id: string) => {
    setExpenditures(prev => prev.filter(item => item.id !== id));
    setSelectedIds(prev => prev.filter(i => i !== id));
  };

  // Batch Deletion
  const handleBatchDelete = () => {
    if (selectedIds.length === 0) return;
    setExpenditures(prev => prev.filter(item => !selectedIds.includes(item.id)));
    setSelectedIds([]);
  };

  // Clear Entire Ledger
  const handleClearAllExpenditures = () => {
    setExpenditures([]);
    setSelectedIds([]);
    localStorage.setItem('junub_expenditures', JSON.stringify([]));
    setShowClearAllModal(false);
    alert("Expenditure ledger has been completely erased and reset!");
  };

  // Repopulate Sample Records
  const handleSeedDemoExpenditures = () => {
    const samples = getInitialSampleExpenditures();
    setExpenditures(samples);
    localStorage.setItem('junub_expenditures', JSON.stringify(samples));
    alert("Loaded standard sample expenditure records!");
  };

  // Filtered List
  const filteredExpenditures = expenditures.filter(item => {
    const matchesBranch = selectedBranchId === 'all' || !item.branchId || item.branchId === selectedBranchId || item.branchId === `branch-${selectedBranchId}` || (selectedBranchId.startsWith('branch-') && item.branchId === selectedBranchId);
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.requestedByStaffName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesBranch && matchesStatus && matchesCategory && matchesSearch;
  });

  const branchExpenditures = expenditures.filter(item => {
    return selectedBranchId === 'all' || !item.branchId || item.branchId === selectedBranchId || item.branchId === `branch-${selectedBranchId}` || (selectedBranchId.startsWith('branch-') && item.branchId === selectedBranchId);
  });
  const totalApprovedUsd = branchExpenditures.filter(e => e.status === 'approved').reduce((sum, e) => sum + e.amountUsd, 0);
  const totalPendingUsd = branchExpenditures.filter(e => e.status === 'pending').reduce((sum, e) => sum + e.amountUsd, 0);

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      {activeRole === 'Pharmacist' && (
        <div className="bg-amber-500/10 border border-amber-500/20 px-4 py-3 rounded-2xl flex items-center gap-2 text-xs font-bold text-amber-900 shadow-2xs">
          <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>Pharmacist Role: You can submit expenditure requests for review. Approval &amp; payout authorization is restricted to Administrators.</span>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
              <Coins className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 font-display">
                Pharmacy Expenditure &amp; Outflow Ledger
              </h2>
              <p className="text-xs text-slate-500">
                Submit, review, approve, and print official petty cash &amp; operational expenses
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Manager Limit Controls (Admin Only) */}
          {['Administrator'].includes(activeRole) && (
            <>
              <button
                onClick={() => {
                  setNewLimitInput(managerApprovalLimitUsd.toString());
                  setShowLimitConfigModal(true);
                }}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl border border-slate-200 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5 text-slate-600" />
                <span>Manager Limit: ${managerApprovalLimitUsd} USD</span>
              </button>

              {expenditures.length > 0 ? (
                <button
                  onClick={() => setShowClearAllModal(true)}
                  className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold text-xs rounded-2xl border border-rose-200 transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Erase & reset all expenditure records"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Erase All Records</span>
                </button>
              ) : (
                <button
                  onClick={handleSeedDemoExpenditures}
                  className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-xs rounded-2xl border border-indigo-200 transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Load initial sample expenditure data"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Load Sample Records</span>
                </button>
              )}
            </>
          )}

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs rounded-2xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Request Expenditure</span>
          </button>
        </div>
      </div>

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Approved Expenditures</span>
            <span className="text-lg font-black text-slate-900 font-display">
              ${totalApprovedUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD
            </span>
            <span className="text-[10px] text-slate-500 block font-mono">
              ≈ {(totalApprovedUsd * usdToSspRate).toLocaleString()} SSP
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pending Approval Requests</span>
            <span className="text-lg font-black text-amber-600 font-display">
              ${totalPendingUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD
            </span>
            <span className="text-[10px] text-amber-700 block font-mono">
              {expenditures.filter(e => e.status === 'pending').length} Requests Awaiting
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5 animate-pulse" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Approval Authority Rules</span>
            <span className="text-xs font-extrabold text-slate-800 block mt-0.5">
              Manager Limit: <span className="text-sky-600 font-mono">${managerApprovalLimitUsd} USD</span>
            </span>
            <span className="text-[10px] text-slate-500 block">
              Above ${managerApprovalLimitUsd} requires Administrator
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          
          {/* Status Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {(['all', 'pending', 'approved', 'rejected'] as const).map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                  statusFilter === st 
                    ? 'bg-white text-slate-900 shadow-2xs font-extrabold' 
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Search and Category Filter */}
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search requests by title, staff..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 bg-slate-50/50"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 bg-white font-medium"
            >
              <option value="All">All Categories</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

        </div>

        {/* Batch Action Toolbar */}
        {['Administrator', 'Manager'].includes(activeRole) && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-2">
              <button
                onClick={selectAllFiltered}
                className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 font-bold cursor-pointer"
              >
                {selectedIds.length > 0 && selectedIds.length === filteredExpenditures.length ? (
                  <CheckSquare className="w-4 h-4 text-sky-600" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400" />
                )}
                <span>Select All ({selectedIds.length} selected)</span>
              </button>
            </div>

            {selectedIds.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleBatchApprove}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Approve Selected ({selectedIds.length})</span>
                </button>

                <button
                  onClick={handleBatchReject}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Reject Selected ({selectedIds.length})</span>
                </button>

                {['Administrator'].includes(activeRole) && (
                  <button
                    onClick={handleBatchDelete}
                    className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                    title="Erase selected records"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Erase Selected ({selectedIds.length})</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Expenditures Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/80 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                <th className="p-4 w-10">Select</th>
                <th className="p-4">Reference &amp; Title</th>
                <th className="p-4">Category</th>
                <th className="p-4">Requested By</th>
                <th className="p-4">Amount ($ USD)</th>
                <th className="p-4">Amount (SSP)</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpenditures.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">
                    No expenditure records match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredExpenditures.map(item => {
                  const isExceedingManagerLimit = activeRole === 'Manager' && item.amountUsd > managerApprovalLimitUsd;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4">
                        <button onClick={() => toggleSelect(item.id)} className="cursor-pointer">
                          {selectedIds.includes(item.id) ? (
                            <CheckSquare className="w-4 h-4 text-sky-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300" />
                          )}
                        </button>
                      </td>

                      <td className="p-4">
                        <div className="font-mono text-[10px] font-bold text-slate-400">{item.id}</div>
                        <div className="font-extrabold text-slate-900">{item.title}</div>
                        <div className="text-[10px] text-slate-500 line-clamp-1">{item.description}</div>
                      </td>

                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700">
                          {item.category}
                        </span>
                      </td>

                      <td className="p-4 font-medium text-slate-800">
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          <span>{item.requestedByStaffName}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">{item.branchName}</span>
                      </td>

                      <td className="p-4 font-black text-slate-900 font-mono text-sm">
                        ${item.amountUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>

                      <td className="p-4 font-bold text-slate-600 font-mono">
                        {item.amountSsp.toLocaleString()} SSP
                      </td>

                      <td className="p-4">
                        {item.status === 'approved' && (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-extrabold inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Approved ({item.approvedBy})
                          </span>
                        )}
                        {item.status === 'rejected' && (
                          <span className="px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-extrabold inline-flex items-center gap-1">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            Rejected ({item.rejectedBy})
                          </span>
                        )}
                        {item.status === 'pending' && (
                          <div className="space-y-1">
                            <span className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-extrabold inline-flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
                              Pending Approval
                            </span>
                            {isExceedingManagerLimit && (
                              <span className="block text-[9px] text-rose-600 font-bold">
                                Exceeds Manager ${managerApprovalLimitUsd} limit
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {item.status === 'pending' && ['Administrator', 'Manager'].includes(activeRole) && (
                            <>
                              <button
                                onClick={() => handleApprove(item.id)}
                                disabled={isExceedingManagerLimit}
                                className={`px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold rounded-lg text-[10px] transition-all cursor-pointer ${
                                  isExceedingManagerLimit ? 'opacity-40 cursor-not-allowed' : ''
                                }`}
                                title={isExceedingManagerLimit ? "Exceeds Manager Limit. Requires Administrator." : "Approve Expenditure"}
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleReject(item.id)}
                                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold rounded-lg text-[10px] transition-all cursor-pointer border border-rose-200"
                              >
                                Reject
                              </button>
                            </>
                          )}

                          <button
                            onClick={() => setReceiptPrintItem(item)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all cursor-pointer"
                            title="Download/Print Branded Expenditure Receipt"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {['Administrator'].includes(activeRole) && (
                            <button
                              onClick={() => handleDeleteSingle(item.id)}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-all cursor-pointer border border-rose-200/60"
                              title="Permanently Erase Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Expenditure Request Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base font-display flex items-center gap-2">
                  <Coins className="w-5 h-5 text-sky-600" />
                  Submit Expenditure Request
                </h3>
                <p className="text-xs text-slate-500">Record cash outflow or logistics expense for management approval</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">&times;</button>
            </div>

            <form onSubmit={handleCreateExpenditure} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase block">Expense Title / Item Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Disinfectant Supplies or Courier Delivery"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase block">Category *</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 bg-white"
                >
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Amount *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={form.amountUsd}
                    onChange={(e) => setForm({ ...form, amountUsd: e.target.value })}
                    className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Currency</label>
                  <select
                    value={form.currencyInput}
                    onChange={(e) => setForm({ ...form, currencyInput: e.target.value })}
                    className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 bg-white font-bold"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="SSP">SSP (South Sudanese Pound)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase block">Linked Staff Member *</label>
                <select
                  value={form.requestedByStaffName}
                  onChange={(e) => setForm({ ...form, requestedByStaffName: e.target.value })}
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 bg-white"
                >
                  {staffList.map((s: any, idx: number) => (
                    <option key={idx} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase block">Detailed Reason &amp; Description</label>
                <textarea
                  rows={2}
                  placeholder="Provide justification or invoice details..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-sky-600 hover:bg-sky-700 text-white font-bold py-2.5 rounded-xl text-xs transition-all shadow-sm cursor-pointer"
                >
                  Submit Expenditure Request
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Administrator Manager Limit Config Modal */}
      {showLimitConfigModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm font-display flex items-center gap-2">
                <Sliders className="w-4 h-4 text-sky-600" />
                Configure Manager Approval Limit
              </h3>
              <button onClick={() => setShowLimitConfigModal(false)} className="text-slate-400 font-bold">&times;</button>
            </div>

            <div className="space-y-2 text-xs">
              <p className="text-slate-600">
                Set maximum dollar limit ($ USD) that Managers can approve independently. Requests exceeding this threshold require Administrator sign-off.
              </p>
              <div className="space-y-1 pt-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase block">Manager Max Limit ($ USD)</label>
                <input
                  type="number"
                  value={newLimitInput}
                  onChange={(e) => setNewLimitInput(e.target.value)}
                  className="w-full text-sm font-black p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  const val = parseFloat(newLimitInput);
                  if (!isNaN(val) && val >= 0) {
                    setManagerApprovalLimitUsd(val);
                    setShowLimitConfigModal(false);
                    alert(`Manager expenditure approval threshold set to $${val} USD!`);
                  }
                }}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 rounded-xl text-xs cursor-pointer"
              >
                Save Threshold
              </button>
              <button
                onClick={() => setShowLimitConfigModal(false)}
                className="px-3 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Expenditures Confirmation Modal */}
      {showClearAllModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-rose-200">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-100 rounded-2xl">
                <Trash2 className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Erase Entire Expenditure Ledger?</h3>
                <p className="text-xs text-slate-500">Action cannot be undone</p>
              </div>
            </div>

            <div className="bg-rose-50 border border-rose-200/80 p-3.5 rounded-2xl text-xs text-rose-800 space-y-1">
              <p className="font-bold">This operation will permanently purge all {expenditures.length} recorded petty cash and operational expenses from local storage and memory.</p>
              <p className="text-[11px] text-rose-700">All category totals, status logs, and receipt histories will be wiped completely.</p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleClearAllExpenditures}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-extrabold py-2.5 rounded-xl text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Yes, Erase Everything</span>
              </button>
              <button
                onClick={() => setShowClearAllModal(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable / Downloadable Official Receipt Modal */}
      {receiptPrintItem && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4">
            {/* Printable Receipt Content */}
            <div id="expenditure-receipt-print" className="p-6 border border-slate-200 rounded-2xl bg-white space-y-4 text-slate-900">
              
              {/* Branding Header */}
              <div className="text-center space-y-1 border-b border-slate-200 pb-4">
                <h2 className="text-lg font-black font-display text-slate-900 uppercase tracking-tight">
                  {activeTenant?.name || 'JUNUB PHARMACARE ENTERPRISE'}
                </h2>
                <p className="text-[10px] font-bold text-slate-500">
                  {activeTenant?.address || 'Plot 14, Main University Road, Juba, South Sudan'}
                </p>
                <p className="text-[10px] text-slate-500 font-mono">
                  Tel: {activeTenant?.phone || '+211 920 000 111'} | Reg No: {activeTenant?.businessRegNo || 'SSD-DFCA-2026-9901'}
                </p>
                <div className="mt-2 inline-block px-3 py-0.5 bg-slate-900 text-white rounded-full text-[10px] font-extrabold uppercase tracking-wider">
                  Official Expenditure Voucher
                </div>
              </div>

              {/* Expenditure Details */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans font-bold">VOUCHER REF:</span>
                  <span className="font-bold text-slate-900">{receiptPrintItem.id}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-sans font-bold">DATE:</span>
                  <span>{new Date(receiptPrintItem.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 border border-slate-100 text-xs">
                <div className="flex justify-between">
                  <span className="font-bold text-slate-500">Title:</span>
                  <span className="font-extrabold text-slate-900">{receiptPrintItem.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-slate-500">Category:</span>
                  <span className="font-semibold">{receiptPrintItem.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-slate-500">Branch:</span>
                  <span>{receiptPrintItem.branchName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-slate-500">Requested By:</span>
                  <span>{receiptPrintItem.requestedByStaffName}</span>
                </div>
              </div>

              <div className="border-t border-b border-slate-200 py-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-bold text-slate-700">Amount USD:</span>
                  <span className="font-black text-slate-900 font-mono">
                    ${receiptPrintItem.amountUsd.toFixed(2)} USD
                  </span>
                </div>
                <div className="flex justify-between text-xs text-slate-500 font-mono">
                  <span>Amount SSP (Exchange Rate @ {usdToSspRate}):</span>
                  <span className="font-bold text-slate-800">
                    {receiptPrintItem.amountSsp.toLocaleString()} SSP
                  </span>
                </div>
              </div>

              <div className="pt-2 flex justify-between items-center text-[10px] text-slate-500">
                <div>
                  <span className="block font-bold">AUTHORIZATION STATUS:</span>
                  <span className="uppercase font-black text-emerald-600 font-mono">{receiptPrintItem.status} BY {receiptPrintItem.approvedBy || activeRole}</span>
                </div>
                <div className="text-right">
                  <span className="block font-bold">OFFICIAL STAMP:</span>
                  <span className="font-mono text-[9px] text-slate-400">[VERIFIED DIGITAL AUDIT]</span>
                </div>
              </div>

            </div>

            {/* Modal Controls */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  window.print();
                }}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print / Download Voucher PDF</span>
              </button>
              <button
                onClick={() => setReceiptPrintItem(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
