import React, { useState, useEffect } from 'react';
import { 
  Users, Layers, DollarSign, Plus, CheckCircle, XCircle, AlertTriangle, 
  Search, ShoppingCart, CreditCard, ShieldCheck, RefreshCw, Eye, Trash2, Sliders, Box, AlertOctagon, HelpCircle,
  CheckCircle2, Upload
} from 'lucide-react';
import { Tenant, DrugItem, Prescription, Transaction } from '../types';
import { 
  saveTenantToFirestore, 
  saveDrugToFirestore, 
  savePrescriptionToFirestore, 
  saveTransactionToFirestore,
  fetchUserFirestoreData,
  deleteStaffAccountFromFirestore,
  loadDeletedStaffFromFirestore
} from '../lib/firebaseSync';

interface SaaSSimulatorProps {
  tenants: Tenant[];
  setTenants: React.Dispatch<React.SetStateAction<Tenant[]>>;
  activeTenantId: string;
  setActiveTenantId: (id: string) => void;
  activeRole: string;
  setActiveRole: (role: any) => void;
  firebaseUser?: any;
  setSyncStatus?: (status: 'idle' | 'syncing' | 'synced' | 'error') => void;
}

export default function SaaSSimulator({
  tenants,
  setTenants,
  activeTenantId,
  setActiveTenantId,
  activeRole,
  setActiveRole,
  firebaseUser,
  setSyncStatus
}: SaaSSimulatorProps) {
  
  // Isolated States
  const [drugs, setDrugs] = useState<DrugItem[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Independent Employees Roster State
  const [employees, setEmployees] = useState<Array<{ id: string; tenantId: string; name: string; role: string; mail: string }>>([
    // tenant-downtown
    { id: 'emp-1', tenantId: 'tenant-downtown', name: "Sarah Pharmacist", role: "Pharmacist", mail: "sarah@downtown.jubupharma.com" },
    { id: 'emp-2', tenantId: 'tenant-downtown', name: "John Cashier", role: "Cashier", mail: "john@downtown.jubupharma.com" },
    { id: 'emp-3', tenantId: 'tenant-downtown', name: "Mark Storekeeper", role: "Store Manager", mail: "mark@downtown.jubupharma.com" },
    
    // tenant-carefirst
    { id: 'emp-4', tenantId: 'tenant-carefirst', name: "Alice Pharmacist", role: "Pharmacist", mail: "alice@carefirst.jubupharma.com" },
    { id: 'emp-5', tenantId: 'tenant-carefirst', name: "Bob Cashier", role: "Cashier", mail: "bob@carefirst.jubupharma.com" },
    { id: 'emp-6', tenantId: 'tenant-carefirst', name: "Charlie Storekeeper", role: "Store Manager", mail: "charlie@carefirst.jubupharma.com" },

    // tenant-stjude
    { id: 'emp-7', tenantId: 'tenant-stjude', name: "David Pharmacist", role: "Pharmacist", mail: "david@stjude.jubupharma.com" },
    { id: 'emp-8', tenantId: 'tenant-stjude', name: "Emma Cashier", role: "Cashier", mail: "emma@stjude.jubupharma.com" },
    { id: 'emp-9', tenantId: 'tenant-stjude', name: "Frank Storekeeper", role: "Store Manager", mail: "frank@stjude.jubupharma.com" },
  ]);

  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [newEmployeeForm, setNewEmployeeForm] = useState({
    name: '',
    role: 'Pharmacist',
    prefix: ''
  });
  
  // Loading indicators
  const [loading, setLoading] = useState(false);
  const [checkingInteractions, setCheckingInteractions] = useState(false);
  
  // Forms & Inputs
  const [newTenantForm, setNewTenantForm] = useState({
    name: '',
    subdomain: '',
    plan: 'professional' as 'starter' | 'professional' | 'enterprise',
    billingCycle: 'monthly' as 'monthly' | 'annual',
    address: '',
    phone: ''
  });
  const [showAddTenant, setShowAddTenant] = useState(false);
  const [tenantStatusMsg, setTenantStatusMsg] = useState('');

  // Drug Interaction Form
  const [drugA, setDrugA] = useState('');
  const [drugB, setDrugB] = useState('');
  const [interactionResult, setInteractionResult] = useState<string | null>(null);

  // POS State
  const [posCart, setPosCart] = useState<Array<{ drug: DrugItem; quantity: number }>>([]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'insurance' | 'digital_wallet'>('cash');
  const [insuranceProvider, setInsuranceProvider] = useState('BlueCross BlueShield');
  const [showReceipt, setShowReceipt] = useState<Transaction | null>(null);
  const [posSearchQuery, setPosSearchQuery] = useState('');

  // Inventory Manager State
  const [newInventoryForm, setNewInventoryForm] = useState({
    name: '',
    genericName: '',
    category: 'Antibiotics' as any,
    stock: '',
    minStockAlert: '',
    price: '',
    cost: '',
    expiryDate: '',
    shelfLocation: '',
    requiresPrescription: false
  });
  const [showAddInventory, setShowAddInventory] = useState(false);

  // Active Tenant Details
  const activeTenant = tenants.find(t => t.id === activeTenantId) || tenants[0];

  // Load Isolated Tenant Database Data whenever Tenant changes
  const loadTenantData = async () => {
    if (!activeTenantId || activeRole === 'Super Admin') return;
    setLoading(true);

    if (firebaseUser) {
      if (setSyncStatus) setSyncStatus('syncing');
      try {
        const cloudData = await fetchUserFirestoreData(firebaseUser.uid);
        
        // Filter by active tenant
        const filteredDrugs = cloudData.drugs.filter(d => d.tenantId === activeTenantId);
        const filteredPrescriptions = cloudData.prescriptions.filter(p => p.tenantId === activeTenantId);
        const filteredTransactions = cloudData.transactions.filter(t => t.tenantId === activeTenantId);
        
        setDrugs(filteredDrugs);
        setPrescriptions(filteredPrescriptions.sort((a,b) => b.createdAt.localeCompare(a.createdAt)));
        setTransactions(filteredTransactions.sort((a,b) => b.createdAt.localeCompare(a.createdAt)));
        
        if (setSyncStatus) setSyncStatus('synced');
      } catch (err) {
        console.error("Error reading Firestore data:", err);
        if (setSyncStatus) setSyncStatus('error');
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      // Load inventory
      const invRes = await fetch(`/api/v1/${activeTenantId}/inventory`);
      const invData = await invRes.json();
      if (invData.status === 'success') setDrugs(invData.data);

      // Load prescriptions
      const rxRes = await fetch(`/api/v1/${activeTenantId}/prescriptions`);
      const rxData = await rxRes.json();
      if (rxData.status === 'success') setPrescriptions(rxData.data);

      // Load transactions
      const txRes = await fetch(`/api/v1/${activeTenantId}/transactions`);
      const txData = await txRes.json();
      if (txData.status === 'success') setTransactions(txData.data);
    } catch (e) {
      console.error("Error loading tenant isolated database data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTenantData();
    // Clear state
    setPosCart([]);
    setInteractionResult(null);
    setDrugA('');
    setDrugB('');
    setShowReceipt(null);
  }, [activeTenantId, activeRole]);

  // Handle Tenant Registration (Super Admin)
  const handleAddTenantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenantForm.name || !newTenantForm.subdomain) return;

    if (tenants.length >= 2) {
      alert("Subscription limit exceeded: Your current plan only allows registering at most 2 pharmacies. Please upgrade your enterprise subscription to register more.");
      setTenantStatusMsg("Subscription Limit Receeded: Maximum of 2 Registered Pharmacies allowed.");
      return;
    }

    setTenantStatusMsg('Registering tenant & provisioning secure database schema...');

    if (firebaseUser) {
      if (setSyncStatus) setSyncStatus('syncing');
      try {
        const subdomainLower = newTenantForm.subdomain.toLowerCase().trim();
        const tenantId = `tenant-${subdomainLower}`;
        
        let dbIsolationMode: "shared_schema_tenant_id" | "schema_per_tenant" | "database_per_tenant" = "shared_schema_tenant_id";
        if (newTenantForm.plan === "professional") {
          dbIsolationMode = "schema_per_tenant";
        } else if (newTenantForm.plan === "enterprise") {
          dbIsolationMode = "database_per_tenant";
        }
        
        const colors = ["#0ea5e9", "#10b981", "#6366f1", "#f59e0b", "#ec4899", "#8b5cf6"];
        const brandingColor = colors[Math.floor(Math.random() * colors.length)];
        
        const newTenant: Tenant = {
          id: tenantId,
          name: newTenantForm.name,
          subdomain: subdomainLower,
          status: "active",
          plan: newTenantForm.plan,
          billingCycle: newTenantForm.billingCycle,
          registeredAt: new Date().toISOString(),
          dbIsolationMode,
          brandingColor,
          address: newTenantForm.address || "123 Healthcare Way",
          phone: newTenantForm.phone || "+1 (555) 000-0000"
        };
        
        const uidToUse = firebaseUser?.uid || 'admin-junubposcenter';
        await saveTenantToFirestore(uidToUse, newTenant);
        setTenants(prev => [...prev, newTenant]);
        
        setNewTenantForm({
          name: '',
          subdomain: '',
          plan: 'professional',
          billingCycle: 'monthly',
          address: '',
          phone: ''
        });
        setShowAddTenant(false);
        setTenantStatusMsg('');
        if (setSyncStatus) setSyncStatus('synced');
        alert(`Success! Firebase isolated Firestore space provisioned with mode '${dbIsolationMode}' for '${newTenant.name}'.`);
      } catch (err: any) {
        setTenantStatusMsg(`Firestore registration failed: ${err.message}`);
        if (setSyncStatus) setSyncStatus('error');
      }
      return;
    }

    try {
      const res = await fetch('/api/v1/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTenantForm)
      });
      const data = await res.json();
      
      if (data.status === 'success') {
        setTenants(prev => [...prev, data.data]);
        setNewTenantForm({
          name: '',
          subdomain: '',
          plan: 'professional',
          billingCycle: 'monthly',
          address: '',
          phone: ''
        });
        setShowAddTenant(false);
        setTenantStatusMsg('');
        
        // Let the user know
        alert(`Success! Secure database schema '${data.data.dbIsolationMode}' provisioned for '${data.data.name}'.`);
      } else {
        setTenantStatusMsg(`Error: ${data.message}`);
      }
    } catch (err: any) {
      setTenantStatusMsg(`Onboarding pipeline failed: ${err.message}`);
    }
  };

  // Add Item to Inventory (Store Manager)
  const handleAddInventorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInventoryForm.name || !newInventoryForm.price || !newInventoryForm.stock) return;

    if (firebaseUser) {
      if (setSyncStatus) setSyncStatus('syncing');
      try {
        const skuSuffix = newInventoryForm.name.substring(0,3).toUpperCase() + Math.floor(Math.random() * 900 + 100);
        const sku = `${skuSuffix}-${activeTenantId.substring(7,10).toUpperCase()}`;
        const newDrug: DrugItem = {
          id: `drug-${Math.random().toString(36).substr(2, 9)}`,
          tenantId: activeTenantId,
          name: newInventoryForm.name,
          genericName: newInventoryForm.genericName || newInventoryForm.name,
          sku,
          category: newInventoryForm.category || "Other",
          stock: Number(newInventoryForm.stock),
          minStockAlert: Number(newInventoryForm.minStockAlert || 10),
          price: Number(newInventoryForm.price),
          cost: Number(newInventoryForm.cost || Number(newInventoryForm.price) * 0.5),
          expiryDate: newInventoryForm.expiryDate || "2027-12-31",
          shelfLocation: newInventoryForm.shelfLocation || "Unassigned",
          requiresPrescription: !!newInventoryForm.requiresPrescription
        };

        await saveDrugToFirestore(firebaseUser.uid, newDrug);
        setDrugs(prev => [...prev, newDrug]);
        setNewInventoryForm({
          name: '',
          genericName: '',
          category: 'Antibiotics',
          stock: '',
          minStockAlert: '',
          price: '',
          cost: '',
          expiryDate: '',
          shelfLocation: '',
          requiresPrescription: false
        });
        setShowAddInventory(false);
        if (setSyncStatus) setSyncStatus('synced');
      } catch (err) {
        console.error("Firestore Add Inventory Error:", err);
        if (setSyncStatus) setSyncStatus('error');
      }
      return;
    }

    try {
      const res = await fetch(`/api/v1/${activeTenantId}/inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newInventoryForm)
      });
      const data = await res.json();
      
      if (data.status === 'success') {
        setDrugs(prev => [...prev, data.data]);
        setNewInventoryForm({
          name: '',
          genericName: '',
          category: 'Antibiotics',
          stock: '',
          minStockAlert: '',
          price: '',
          cost: '',
          expiryDate: '',
          shelfLocation: '',
          requiresPrescription: false
        });
        setShowAddInventory(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Restock drug (Store Manager)
  const handleRestockDrug = async (drugId: string, qty: number) => {
    if (firebaseUser) {
      if (setSyncStatus) setSyncStatus('syncing');
      try {
        const drugToUpdate = drugs.find(d => d.id === drugId);
        if (!drugToUpdate) return;
        const updatedDrug = { ...drugToUpdate, stock: drugToUpdate.stock + qty };
        await saveDrugToFirestore(firebaseUser.uid, updatedDrug);
        setDrugs(prev => prev.map(d => d.id === drugId ? updatedDrug : d));
        if (setSyncStatus) setSyncStatus('synced');
      } catch (err) {
        console.error("Firestore Restock Error:", err);
        if (setSyncStatus) setSyncStatus('error');
      }
      return;
    }

    try {
      const res = await fetch(`/api/v1/${activeTenantId}/inventory/${drugId}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: qty })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setDrugs(prev => prev.map(d => d.id === drugId ? { ...d, stock: d.stock + qty } : d));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Pharmacist reviews prescription
  const handleReviewPrescription = async (rxId: string, status: 'approved' | 'rejected') => {
    const notes = status === 'approved' 
      ? 'Approved after checking systemic history. Dosage is correct.' 
      : 'Rejected: Contraindicated due to risk profile.';

    if (firebaseUser) {
      if (setSyncStatus) setSyncStatus('syncing');
      try {
        const rx = prescriptions.find(p => p.id === rxId);
        if (!rx) return;
        const updatedRx = { ...rx, status, pharmacistNotes: notes };
        await savePrescriptionToFirestore(firebaseUser.uid, updatedRx);
        setPrescriptions(prev => prev.map(p => p.id === rxId ? updatedRx : p));
        
        // If approved, trigger stock deduction on matching drug name
        if (status === 'approved') {
          const matchedDrug = drugs.find(d => d.name === rx.drugName);
          if (matchedDrug) {
            await handleRestockDrug(matchedDrug.id, -Number(rx.quantity));
          }
        }
        if (setSyncStatus) setSyncStatus('synced');
      } catch (err) {
        console.error("Firestore Review Rx Error:", err);
        if (setSyncStatus) setSyncStatus('error');
      }
      return;
    }

    try {
      const res = await fetch(`/api/v1/${activeTenantId}/prescriptions/${rxId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, pharmacistNotes: notes })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setPrescriptions(prev => prev.map(p => p.id === rxId ? { ...p, status, pharmacistNotes: notes } : p));
        // If approved, trigger stock deduction on matching drug name
        if (status === 'approved') {
          const rx = prescriptions.find(p => p.id === rxId);
          const matchedDrug = drugs.find(d => d.name === rx?.drugName);
          if (matchedDrug) {
            handleRestockDrug(matchedDrug.id, -Number(rx!.quantity));
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // AI Drug Interaction Check
  const handleCheckInteractions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!drugA || !drugB) return;

    setCheckingInteractions(true);
    setInteractionResult('Analyzing biochemical interactions...');

    try {
      const res = await fetch('/api/v1/ai/check-interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drugA, drugB })
      });
      const data = await res.json();
      setInteractionResult(data.text || 'Check finished.');
    } catch (err: any) {
      setInteractionResult('Clinical database lookup failed.');
    } finally {
      setCheckingInteractions(false);
    }
  };

  // POS Add to Cart
  const handlePosAddToCart = (drug: DrugItem) => {
    if (drug.stock <= 0) return;
    const existing = posCart.find(item => item.drug.id === drug.id);
    if (existing) {
      if (existing.quantity >= drug.stock) return;
      setPosCart(prev => prev.map(item => item.drug.id === drug.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setPosCart(prev => [...prev, { drug, quantity: 1 }]);
    }
  };

  const handlePosRemoveFromCart = (drugId: string) => {
    setPosCart(prev => prev.filter(item => item.drug.id !== drugId));
  };

  // POS Checkout Submission
  const handlePosCheckout = async () => {
    if (!posCart.length) return;

    const reqItems = posCart.map(item => ({
      drugId: item.drug.id,
      name: item.drug.name,
      quantity: item.quantity,
      price: item.drug.price
    }));

    const subtotal = posCart.reduce((sum, item) => sum + (item.drug.price * item.quantity), 0);
    const tax = subtotal * 0.08;
    const discount = paymentMethod === 'insurance' ? subtotal * 0.5 : 0;
    const total = subtotal + tax - discount;

    if (firebaseUser) {
      if (setSyncStatus) setSyncStatus('syncing');
      try {
        const invoiceNumber = `INV-${activeTenantId.substring(7,9).toUpperCase()}-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`;
        const newTx: Transaction = {
          id: `tx-${Math.random().toString(36).substr(2, 9)}`,
          tenantId: activeTenantId,
          invoiceNumber,
          items: reqItems,
          subtotal,
          tax,
          discount,
          total,
          paymentMethod,
          insuranceProvider: paymentMethod === 'insurance' ? insuranceProvider : undefined,
          cashierName: 'Jane cashier',
          createdAt: new Date().toISOString()
        };

        await saveTransactionToFirestore(firebaseUser.uid, newTx);
        
        // Deduct inventory stock for each drug in cart
        for (const item of posCart) {
          const updatedDrug = { ...item.drug, stock: item.drug.stock - item.quantity };
          await saveDrugToFirestore(firebaseUser.uid, updatedDrug);
        }

        setTransactions(prev => [newTx, ...prev]);
        setShowReceipt(newTx);
        setPosCart([]);
        if (setSyncStatus) setSyncStatus('synced');
        
        // Reload drugs to reflect new stock levels
        loadTenantData();
      } catch (err: any) {
        alert(`POS transaction Firestore update failed: ${err.message}`);
        if (setSyncStatus) setSyncStatus('error');
      }
      return;
    }

    try {
      const res = await fetch(`/api/v1/${activeTenantId}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: reqItems,
          paymentMethod,
          insuranceProvider: paymentMethod === 'insurance' ? insuranceProvider : undefined,
          cashierName: 'Jane cashier'
        })
      });
      
      const data = await res.json();
      if (data.status === 'success') {
        setTransactions(prev => [data.data, ...prev]);
        setShowReceipt(data.data);
        setPosCart([]);
        // Reload drugs to reflect new stock levels
        loadTenantData();
      } else {
        alert(`POS Error: ${data.message}`);
      }
    } catch (err: any) {
      alert(`POS transaction failed: ${err.message}`);
    }
  };

  // Calculate MRR, Active counts
  const totalTenants = tenants.length;
  const starterCount = tenants.filter(t => t.plan === 'starter').length;
  const professionalCount = tenants.filter(t => t.plan === 'professional').length;
  const enterpriseCount = tenants.filter(t => t.plan === 'enterprise').length;

  const calculateGlobalMRR = () => {
    let sum = 0;
    tenants.forEach(t => {
      const basePrice = t.plan === 'starter' ? 99 : t.plan === 'professional' ? 249 : 599;
      sum += t.billingCycle === 'annual' ? basePrice * 0.8 : basePrice; // 20% annual discount
    });
    return sum;
  };

  const globalMRR = calculateGlobalMRR();

  return (
    <div className="space-y-6">
      
      {/* Simulation Selector Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <Sliders className="h-5 w-5 text-slate-800" />
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Interactive SaaS Playground</span>
            <span className="text-xs text-slate-600">Simulate multi-tenant scenarios by switching roles and tenant contexts below:</span>
          </div>
        </div>

        <div className="flex gap-4 items-center flex-wrap">
          {/* Tenant Selector */}
          {activeRole !== 'Super Admin' && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500">Active Tenant:</span>
              <select
                value={activeTenantId}
                onChange={(e) => setActiveTenantId(e.target.value)}
                className="text-xs font-semibold border border-slate-200 bg-white px-3 py-1.5 rounded-lg focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 cursor-pointer text-slate-700 shadow-xs"
              >
                {tenants.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.subdomain}.jubu)</option>
                ))}
              </select>
            </div>
          )}

          {/* Role Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500">Staff Role:</span>
            <select
              value={activeRole}
              onChange={(e) => setActiveRole(e.target.value)}
              className="text-xs font-semibold border border-slate-200 bg-white px-3 py-1.5 rounded-lg focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 cursor-pointer text-slate-700 shadow-xs"
            >
              <option value="Administrator">🏥 Administrator (Full System Controller)</option>
              <option value="Pharmacist">💊 Pharmacist (POS Terminal & Inventory)</option>
            </select>
          </div>
        </div>
      </div>

      {/* ----------------- TIER 1: SUPER ADMIN PANEL ----------------- */}
      {activeRole === 'Super Admin' && (
        <div className="space-y-6">
          {/* Global SaaS KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-[#0F172A] text-slate-100 p-5 rounded-2xl border border-slate-800 shadow-sm">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Global Platform MRR</span>
              <span className="text-2xl font-bold text-white block mt-1 font-mono">${globalMRR.toLocaleString()}/mo</span>
              <span className="text-[10px] text-sky-400 flex items-center gap-1 mt-1 font-mono">
                Annual commitment: ${(globalMRR * 12).toLocaleString()}/yr
              </span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Active Tenants</span>
              <span className="text-2xl font-bold text-slate-800 block mt-1">{totalTenants} Pharmacies</span>
              <span className="text-[10px] text-slate-400 mt-1 block">
                {starterCount} Starter | {professionalCount} Pro | {enterpriseCount} Ent
              </span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">System Health Status</span>
              <span className="text-2xl font-bold text-emerald-600 block mt-1 flex items-center gap-1.5">
                <CheckCircle className="h-5 w-5 text-emerald-500" />
                99.98% Healthy
              </span>
              <span className="text-[10px] text-slate-400 mt-1 block">3 Active Kubernetes Container Pods</span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Global Database Weight</span>
              <span className="text-2xl font-bold text-slate-800 block mt-1">1.42 GB</span>
              <span className="text-[10px] text-sky-500 block font-semibold mt-1">PostgreSQL Shared Engine hosting</span>
            </div>
          </div>

          {/* Tenant List & Signup Form */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2 font-display">
                  <Layers className="h-5 w-5 text-sky-500" />
                  Registered SaaS Pharmacy Tenants
                </h3>
                <p className="text-slate-500 text-xs mt-0.5">Manage subscriptions, audit databases, and register new pharmacies</p>
              </div>
              <button
                onClick={() => setShowAddTenant(!showAddTenant)}
                className="bg-[#0F172A] text-white hover:bg-slate-800 font-semibold text-xs px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Plus className="h-4 w-4" />
                Register New Pharmacy Tenant
              </button>
            </div>

            {tenantStatusMsg && (
              <div className="bg-emerald-50 text-emerald-800 border border-emerald-100 p-3 rounded-lg text-xs font-mono mb-4">
                {tenantStatusMsg}
              </div>
            )}

            {/* Register Tenant Panel Form */}
            {showAddTenant && (
              <form onSubmit={handleAddTenantSubmit} className="bg-slate-50 p-4 rounded-xl border border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Pharmacy Name</label>
                  <input
                    type="text"
                    required
                    value={newTenantForm.name}
                    onChange={(e) => setNewTenantForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Hope Community Pharmacy"
                    className="w-full text-xs px-3 py-2 border border-slate-200 bg-white rounded-lg focus:outline-none focus:border-slate-800"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Subdomain Prefix</label>
                  <div className="flex">
                    <input
                      type="text"
                      required
                      value={newTenantForm.subdomain}
                      onChange={(e) => setNewTenantForm(prev => ({ ...prev, subdomain: e.target.value }))}
                      placeholder="hope"
                      className="flex-1 text-xs px-3 py-2 border border-slate-200 bg-white rounded-l-lg focus:outline-none focus:border-slate-800 font-mono"
                    />
                    <span className="bg-slate-200 border border-slate-200 border-l-0 text-slate-600 px-2.5 py-2 rounded-r-lg text-xs font-mono">
                      .jubu.care
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Subscription Plan</label>
                  <select
                    value={newTenantForm.plan}
                    onChange={(e: any) => setNewTenantForm(prev => ({ ...prev, plan: e.target.value }))}
                    className="w-full text-xs px-3 py-2 border border-slate-200 bg-white rounded-lg focus:outline-none focus:border-slate-800"
                  >
                    <option value="starter">Starter Plan ($99/mo)</option>
                    <option value="professional">Professional Plan ($249/mo)</option>
                    <option value="enterprise">Enterprise Plan ($599/mo)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Billing Cycle</label>
                  <select
                    value={newTenantForm.billingCycle}
                    onChange={(e: any) => setNewTenantForm(prev => ({ ...prev, billingCycle: e.target.value }))}
                    className="w-full text-xs px-3 py-2 border border-slate-200 bg-white rounded-lg focus:outline-none focus:border-slate-800"
                  >
                    <option value="monthly">Monthly Recurring</option>
                    <option value="annual">Annual Commitment (20% Off)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Address Location</label>
                  <input
                    type="text"
                    value={newTenantForm.address}
                    onChange={(e) => setNewTenantForm(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="123 Hospital Blvd"
                    className="w-full text-xs px-3 py-2 border border-slate-200 bg-white rounded-lg focus:outline-none focus:border-slate-800"
                  />
                </div>
                <div className="space-y-1 flex items-end">
                  <button
                    type="submit"
                    className="w-full bg-sky-500 text-white font-semibold text-xs py-2 rounded-lg hover:bg-sky-600 transition-all cursor-pointer shadow-sm"
                  >
                    Deploy Tenant Resources
                  </button>
                </div>
              </form>
            )}

            {/* Tenant Table Grid */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] uppercase font-bold text-slate-400">
                    <th className="py-3 px-2">Pharmacy Name</th>
                    <th className="py-3 px-2">Subdomain</th>
                    <th className="py-3 px-2">Security Compliance</th>
                    <th className="py-3 px-2">Tier / Sub Plan</th>
                    <th className="py-3 px-2">Billing Cycle</th>
                    <th className="py-3 px-2">Onboarding Date</th>
                    <th className="py-3 px-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {tenants.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50/60 transition-all">
                      <td className="py-3.5 px-2 font-bold text-slate-800 flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: t.brandingColor }}></div>
                        {t.name}
                      </td>
                      <td className="py-3.5 px-2 font-mono text-sky-600">{t.subdomain}.jubupharma.com</td>
                      <td className="py-3.5 px-2 font-mono">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          t.dbIsolationMode === 'database_per_tenant' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                          t.dbIsolationMode === 'schema_per_tenant' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                          'bg-sky-50 text-sky-700 border border-sky-100'
                        }`}>
                          {t.dbIsolationMode === 'database_per_tenant' ? 'Dedicated Vault' :
                           t.dbIsolationMode === 'schema_per_tenant' ? 'Isolated Shield' :
                           'Row Protected'}
                        </span>
                      </td>
                      <td className="py-3.5 px-2 capitalize font-semibold">{t.plan}</td>
                      <td className="py-3.5 px-2 capitalize">{t.billingCycle}</td>
                      <td className="py-3.5 px-2 text-slate-400">{new Date(t.registeredAt).toLocaleDateString()}</td>
                      <td className="py-3.5 px-2">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-bold uppercase">
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- TIER 2: PHARMACY ADMIN PANEL ----------------- */}
      {(activeRole === 'Pharmacy Admin' || activeRole === 'Master Admin') && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1 border-r border-slate-100 pr-6 space-y-4">
              <div>
                <h3 className="font-bold text-slate-800">Pharmacy Tenant Settings</h3>
                <p className="text-slate-500 text-xs">Configure pharmacy details, branding colors, and view billing</p>
              </div>

              <div className="space-y-3 pt-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Tenant Name</label>
                  <input
                    type="text"
                    value={activeTenant.name}
                    onChange={(e) => {
                      const updated = tenants.map(t => t.id === activeTenant.id ? { ...t, name: e.target.value } : t);
                      setTenants(updated);
                    }}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Custom Theme Accent Color</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={activeTenant.brandingColor}
                      onChange={(e) => {
                        const updated = tenants.map(t => t.id === activeTenant.id ? { ...t, brandingColor: e.target.value } : t);
                        setTenants(updated);
                      }}
                      className="h-8 w-12 border border-slate-200 rounded p-0 cursor-pointer"
                    />
                    <span className="text-xs font-mono text-slate-500 flex items-center">{activeTenant.brandingColor}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Custom PNG Brand Logo Upload</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml,image/webp"
                      id="saas-sim-logo-file"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (evt) => {
                            if (evt.target?.result) {
                              const dataUrl = evt.target.result as string;
                              const updated = tenants.map(t => t.id === activeTenant.id ? { ...t, logoUrl: dataUrl, logoIcon: dataUrl as any } : t);
                              setTenants(updated);
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    <label
                      htmlFor="saas-sim-logo-file"
                      className="px-3 py-2 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload PNG Logo</span>
                    </label>
                    {(activeTenant.logoUrl || (activeTenant.logoIcon && activeTenant.logoIcon.startsWith('data:'))) && (
                      <div className="flex items-center gap-2">
                        <img src={activeTenant.logoUrl || activeTenant.logoIcon} alt="Custom Logo" className="h-8 w-8 object-contain rounded border border-slate-200 p-0.5 bg-white shadow-2xs" />
                        <button
                          type="button"
                          onClick={() => {
                            const updated = tenants.map(t => t.id === activeTenant.id ? { ...t, logoUrl: undefined, logoIcon: 'cross' } : t);
                            setTenants(updated);
                          }}
                          className="text-[10px] text-rose-500 hover:underline font-bold cursor-pointer"
                        >
                          Remove PNG
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Or Select Preset Icon</label>
                  <select
                    value={activeTenant.logoIcon && !activeTenant.logoIcon.startsWith('data:') ? activeTenant.logoIcon : 'cross'}
                    onChange={(e) => {
                      const updated = tenants.map(t => t.id === activeTenant.id ? { ...t, logoUrl: undefined, logoIcon: e.target.value as any } : t);
                      setTenants(updated);
                    }}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-800 bg-white"
                  >
                    <option value="cross">➕ Plus / Medical Cross</option>
                    <option value="capsule">💊 Capsule / Pill</option>
                    <option value="heart">❤️ Heart / Pulse</option>
                    <option value="activity">⚡ EKG Activity Line</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Pharmacy Address</label>
                  <textarea
                    value={activeTenant.address}
                    onChange={(e) => {
                      const updated = tenants.map(t => t.id === activeTenant.id ? { ...t, address: e.target.value } : t);
                      setTenants(updated);
                    }}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-800 h-16"
                  />
                </div>
              </div>
            </div>

            {/* Isolated database model detail */}
            <div className="md:col-span-2 space-y-6">
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider block mb-1">Compliance &amp; Data Shielding</span>
                <h4 className="font-bold text-slate-800 text-sm mb-2 capitalize">
                  {activeTenant.dbIsolationMode === 'database_per_tenant' ? 'Dedicated Cloud Vault (High Isolation)' :
                   activeTenant.dbIsolationMode === 'schema_per_tenant' ? 'Isolated Compliance Shield' :
                   'Standard Secured Row Vault'}
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed mb-4">
                  As an administrative owner of <span className="font-semibold text-slate-700">{activeTenant.name}</span>, your workspace is fully secured using Junub Pharmacare's advanced multi-tenant isolation safeguards. Your medicine catalogs, patient records, prescriptions, and financial audit logs are completely isolated from all other pharmacies. No other customer or organization can query or access your records, keeping you in full alignment with global clinical HIPAA patient safeguards.
                </p>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="bg-white p-3 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block mb-1">Onboarding Package</span>
                    <span className="font-bold text-slate-800 uppercase block">{activeTenant.plan} tier</span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block mb-1">Current Billing Cycle</span>
                    <span className="font-bold text-slate-800 uppercase block">{activeTenant.billingCycle} recurring</span>
                  </div>
                </div>
              </div>

              {/* Mock Staff Audit logs */}
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Authorized Tenant Employees & RBAC</span>
                    <span className="text-[10px] text-slate-400 font-mono">Independent Roles & Permissions</span>
                  </div>
                  <button
                    onClick={() => setShowAddEmployee(!showAddEmployee)}
                    className="px-2.5 py-1 text-[10px] font-bold text-white rounded-lg shadow-xs hover:opacity-90 flex items-center gap-1 transition-all cursor-pointer"
                    style={{ backgroundColor: activeTenant.brandingColor }}
                  >
                    {showAddEmployee ? 'Cancel' : '➕ Add Employee'}
                  </button>
                </div>

                {showAddEmployee && (
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!newEmployeeForm.name || !newEmployeeForm.prefix) {
                        alert("Please complete all employee fields.");
                        return;
                      }
                      const newEmp = {
                        id: `emp-${Date.now()}`,
                        tenantId: activeTenant.id,
                        name: newEmployeeForm.name,
                        role: newEmployeeForm.role,
                        mail: `${newEmployeeForm.prefix.toLowerCase()}@${activeTenant.subdomain}.jubupharma.com`
                      };
                      setEmployees(prev => [...prev, newEmp]);
                      setNewEmployeeForm({ name: '', role: 'Pharmacist', prefix: '' });
                      setShowAddEmployee(false);
                    }}
                    className="p-3 bg-slate-50 border border-slate-150 rounded-xl space-y-3"
                  >
                    <p className="text-[10px] font-bold uppercase text-slate-500">Register New Tenant User</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] text-slate-500 block">Full Name</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Dr. Sarah Miller"
                          value={newEmployeeForm.name}
                          onChange={e => setNewEmployeeForm(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full text-xs px-2 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:border-slate-800 bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] text-slate-500 block">Assigned Role</label>
                        <select
                          value={newEmployeeForm.role}
                          onChange={e => setNewEmployeeForm(prev => ({ ...prev, role: e.target.value }))}
                          className="w-full text-xs px-2 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:border-slate-800 bg-white"
                        >
                          <option value="Pharmacist">Pharmacist</option>
                          <option value="Cashier">Cashier</option>
                          <option value="Store Manager">Store Manager</option>
                          <option value="Pharmacy Admin">Pharmacy Admin</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-500 block">User Email Address Prefix</label>
                      <div className="flex items-center">
                        <input
                          type="text"
                          required
                          placeholder="miller"
                          value={newEmployeeForm.prefix}
                          onChange={e => setNewEmployeeForm(prev => ({ ...prev, prefix: e.target.value.replace(/\s+/g, '') }))}
                          className="w-1/2 text-xs px-2 py-1.5 border border-slate-200 rounded-l-md focus:outline-none focus:border-slate-800 bg-white"
                        />
                        <span className="w-1/2 text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-1.5 border-y border-r border-slate-200 rounded-r-md overflow-hidden text-ellipsis">
                          @{activeTenant.subdomain}.jubupharma.com
                        </span>
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="w-full py-1.5 text-white text-xs font-bold rounded-lg shadow-xs hover:opacity-95 cursor-pointer"
                      style={{ backgroundColor: activeTenant.brandingColor }}
                    >
                      Provision Secure RBAC Credentials
                    </button>
                  </form>
                )}

                <div className="space-y-2">
                  {employees.filter(emp => emp.tenantId === activeTenant.id).map((staff) => (
                    <div key={staff.id} className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg text-xs hover:bg-slate-100/50 transition-all">
                      <div>
                        <span className="font-semibold text-slate-800 block">{staff.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{staff.mail}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[9px] font-bold uppercase tracking-wider">
                          {staff.role}
                        </span>
                        <button
                          onClick={() => {
                            if (employees.filter(emp => emp.tenantId === activeTenant.id).length <= 1) {
                              alert("Cannot remove the last staff member of this tenant. Each pharmacy requires at least 1 authorized administrator/staff.");
                              return;
                            }
                            try {
                              const delIds = JSON.parse(localStorage.getItem('junub_deleted_staff_ids') || '[]');
                              const delEmails = JSON.parse(localStorage.getItem('junub_deleted_staff_emails') || '[]');
                              if (staff.id && !delIds.includes(staff.id)) delIds.push(staff.id);
                              if (staff.mail && !delEmails.includes(staff.mail.toLowerCase())) delEmails.push(staff.mail.toLowerCase());
                              localStorage.setItem('junub_deleted_staff_ids', JSON.stringify(delIds));
                              localStorage.setItem('junub_deleted_staff_emails', JSON.stringify(delEmails));

                              const regStaff = JSON.parse(localStorage.getItem('junub_registered_staff') || '[]');
                              const filtered = regStaff.filter((s: any) => s.id !== staff.id && s.email?.toLowerCase() !== staff.mail?.toLowerCase());
                              localStorage.setItem('junub_registered_staff', JSON.stringify(filtered));
                              window.dispatchEvent(new Event('junub_staff_updated'));
                            } catch(e) {}

                            // Persist staff deletion to Firestore & Express API
                            const uidToUse = firebaseUser?.uid || activeTenant.id || 'shared-global-tenant-v1';
                            deleteStaffAccountFromFirestore(uidToUse, staff.id, staff.mail).catch(() => {});

                            setEmployees(prev => prev.filter(emp => emp.id !== staff.id));
                          }}
                          className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Revoke access"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- TIER 3: PHARMACIST VIEW ----------------- */}
      {activeRole === 'Pharmacist' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Prescriptions Queue */}
          <div className="lg:col-span-7 bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col h-[520px]">
            <div className="border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-bold text-slate-800">Pharmacist Prescription Queue</h3>
              <p className="text-slate-500 text-xs">Verify doctor license credentials and approve prescriptions for release</p>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {prescriptions.length === 0 ? (
                <div className="text-center py-12 text-slate-400 italic text-xs">
                  No prescriptions submitted in this tenant database schema yet. Submit one using the REST API explorer or checkout.
                </div>
              ) : (
                prescriptions.map((rx) => (
                  <div key={rx.id} className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                    <div className="flex justify-between items-start flex-wrap gap-2">
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">{rx.patientName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">ID: {rx.id} | Sub: {new Date(rx.createdAt).toLocaleTimeString()}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                        rx.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                        rx.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-amber-100 text-amber-800 animate-pulse'
                      }`}>
                        {rx.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs border-t border-slate-100 pt-2.5">
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-semibold block">Prescribed Medication</span>
                        <span className="font-medium text-slate-700">{rx.drugName} (Qty: {rx.quantity})</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-semibold block">Doctor Authorization</span>
                        <span className="font-medium text-slate-700">{rx.doctorName} <span className="text-slate-400 text-[10px]">({rx.doctorLicense})</span></span>
                      </div>
                    </div>

                    <div className="bg-white p-2.5 rounded border border-slate-100 text-xs text-slate-600">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase block">Instruction Dosage</span>
                      {rx.dosage}
                    </div>

                    {rx.pharmacistNotes && (
                      <div className="text-[11px] text-emerald-700 font-mono italic">
                        * Notes: {rx.pharmacistNotes}
                      </div>
                    )}

                    {rx.status === 'pending' && (
                      <div className="flex gap-2 pt-1 justify-end">
                        <button
                          onClick={() => handleReviewPrescription(rx.id, 'rejected')}
                          className="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-700 text-xs font-semibold hover:bg-rose-50 transition-all flex items-center gap-1 cursor-pointer font-display"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Reject Release
                        </button>
                        <button
                          onClick={() => handleReviewPrescription(rx.id, 'approved')}
                          className="px-3 py-1.5 rounded-lg bg-[#0F172A] text-white text-xs font-semibold hover:bg-slate-800 transition-all flex items-center gap-1 cursor-pointer font-display shadow-xs"
                        >
                          <CheckCircle className="h-3.5 w-3.5 text-sky-400" />
                          Verify & Approve
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Clinical Drug Interaction Checker */}
          <div className="lg:col-span-5 bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 flex flex-col h-[520px]">
            <div className="border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2 font-display">
                <Box className="h-5 w-5 text-sky-500 animate-pulse" />
                Clinical Drug Interaction Checker
              </h3>
              <p className="text-slate-500 text-xs mt-0.5">Run real-time biochemistry verification before dispensing combination therapies</p>
            </div>

            <form onSubmit={handleCheckInteractions} className="space-y-4 mb-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Drug A Name</label>
                  <select
                    value={drugA}
                    onChange={(e) => setDrugA(e.target.value)}
                    className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-slate-700 cursor-pointer shadow-xs font-medium"
                  >
                    <option value="">Select Drug A</option>
                    <option value="Sildenafil">Sildenafil (Viagra)</option>
                    <option value="Warfarin">Warfarin (Coumadin)</option>
                    <option value="Amoxicillin 500mg">Amoxicillin</option>
                    <option value="Ibuprofen 400mg">Ibuprofen</option>
                    <option value="Metformin">Metformin</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Drug B Name</label>
                  <select
                    value={drugB}
                    onChange={(e) => setDrugB(e.target.value)}
                    className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-slate-700 cursor-pointer shadow-xs font-medium"
                  >
                    <option value="">Select Drug B</option>
                    <option value="Nitroglycerin">Nitroglycerin (Nitrostat)</option>
                    <option value="Ibuprofen 400mg">Ibuprofen (Advil)</option>
                    <option value="Sildenafil">Sildenafil (Viagra)</option>
                    <option value="Vitamin D3">Vitamin D3</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={drugA && drugB ? '' : drugA || drugB}
                  onChange={(e) => {
                    // Let them write manually if not selected
                    if (!drugA) setDrugA(e.target.value);
                    else setDrugB(e.target.value);
                  }}
                  placeholder="Or type drugs manually..."
                  className="flex-1 text-xs px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-slate-700"
                />
                <button
                  type="submit"
                  disabled={checkingInteractions || !drugA || !drugB}
                  className="bg-[#0F172A] text-white text-xs px-4 py-2 rounded-lg hover:bg-slate-800 transition-all disabled:bg-slate-200 cursor-pointer shadow-xs font-semibold"
                >
                  {checkingInteractions ? 'Evaluating...' : 'Check Interaction'}
                </button>
              </div>
            </form>

            {/* Results Console */}
            <div className="flex-1 bg-slate-50 border border-slate-100 rounded-xl p-4 overflow-y-auto font-sans text-xs text-slate-700">
              {interactionResult ? (
                <div className="space-y-3">
                  {interactionResult.split('\n').map((line, idx) => {
                    if (line.startsWith('### ')) {
                      const isRed = line.includes('🔴') || line.includes('CONTRAINDICATED') || line.includes('MAJOR');
                      return (
                        <h4 key={idx} className={`font-bold mt-2 pb-1 border-b border-slate-200/60 ${
                          isRed ? 'text-red-600' : 'text-slate-800'
                        }`}>
                          {line.replace('### ', '')}
                        </h4>
                      );
                    }
                    return <p key={idx} className="leading-relaxed text-slate-600">{line}</p>;
                  })}
                </div>
              ) : (
                <div className="h-full flex flex-col justify-center items-center text-slate-400 italic text-center space-y-2">
                  <AlertOctagon className="h-8 w-8 text-slate-300" />
                  <p>Select two drugs (try Sildenafil + Nitroglycerin or Warfarin + Ibuprofen) to evaluate contraindications and clinical warnings.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ----------------- TIER 4: CASHIER (POS) VIEW ----------------- */}
      {['Cashier', 'Pharmacist', 'Pharmacy Admin', 'Master Admin'].includes(activeRole) && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* POS Catalog & Search */}
          <div className="lg:col-span-7 bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col h-[520px]">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="font-bold text-slate-800">Point of Sale Terminal</h3>
                <p className="text-slate-500 text-xs">Add isolated tenant stocks directly to customer's cart</p>
              </div>
              <div className="relative max-w-xs w-full">
                <Search className="absolute left-2.5 top-2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search drug list..."
                  value={posSearchQuery}
                  onChange={(e) => setPosSearchQuery(e.target.value)}
                  className="text-xs pl-8 pr-3 py-1.5 border border-slate-200 bg-slate-50 rounded-lg w-full focus:outline-none focus:border-slate-800"
                />
              </div>
            </div>

            {/* Drugs Grid list */}
            <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3 pr-2 align-baseline">
              {drugs
                .filter(d => d.name.toLowerCase().includes(posSearchQuery.toLowerCase()) || d.genericName.toLowerCase().includes(posSearchQuery.toLowerCase()))
                .map(drug => (
                  <button
                    key={drug.id}
                    onClick={() => handlePosAddToCart(drug)}
                    disabled={drug.stock <= 0}
                    className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                      drug.stock <= 0
                        ? 'border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed'
                        : 'border-slate-100 hover:border-slate-300 hover:shadow-sm bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-slate-800 text-xs truncate max-w-[150px]">{drug.name}</span>
                        <span className="font-mono text-xs font-semibold text-emerald-600">${drug.price.toFixed(2)}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block truncate font-medium">{drug.genericName}</span>
                      <span className="text-[9px] text-slate-400 font-mono">SKU: {drug.sku}</span>
                    </div>

                    <div className="flex justify-between items-center mt-3 border-t border-slate-50 pt-2.5 w-full">
                      <span className={`text-[10px] font-semibold ${drug.stock < drug.minStockAlert ? 'text-rose-500' : 'text-slate-500'}`}>
                        Stock: {drug.stock} units
                      </span>
                      {drug.requiresPrescription && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 text-[8px] font-bold uppercase border border-amber-100">
                          Prescription Rx
                        </span>
                      )}
                    </div>
                  </button>
                ))}
            </div>
          </div>

          {/* Cart & Checkout Invoice */}
          <div className="lg:col-span-5 bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col h-[520px]">
            <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-slate-800" />
              Customer Cart Checkout
            </h3>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto space-y-2 mb-4">
              {posCart.length === 0 ? (
                <div className="h-full flex flex-col justify-center items-center text-slate-400 italic text-xs text-center">
                  Cart is empty.<br />Click catalog items to add them.
                </div>
              ) : (
                posCart.map(item => (
                  <div key={item.drug.id} className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg text-xs">
                    <div>
                      <span className="font-bold text-slate-800 block">{item.drug.name}</span>
                      <span className="text-slate-400 text-[10px]">
                        ${item.drug.price.toFixed(2)} x {item.quantity}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-800">${(item.drug.price * item.quantity).toFixed(2)}</span>
                      <button
                        onClick={() => handlePosRemoveFromCart(item.drug.id)}
                        className="text-rose-400 hover:text-rose-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Calculations & Checkout Settings */}
            <div className="border-t border-slate-100 pt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Pay Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e: any) => setPaymentMethod(e.target.value)}
                    className="w-full border border-slate-200 px-2 py-1 bg-white rounded focus:outline-none"
                  >
                    <option value="cash">Cash Checkout</option>
                    <option value="card">Card Reader</option>
                    <option value="insurance">Insurance Coverage</option>
                    <option value="digital_wallet">Digital Wallet</option>
                  </select>
                </div>
                {paymentMethod === 'insurance' && (
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Provider</label>
                    <input
                      type="text"
                      value={insuranceProvider}
                      onChange={(e) => setInsuranceProvider(e.target.value)}
                      className="w-full border border-slate-200 px-2 py-1 bg-white rounded focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Subtotal logs */}
              {posCart.length > 0 && (
                <div className="space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs font-mono">
                  <div className="flex justify-between text-slate-500">
                    <span>Subtotal:</span>
                    <span>${posCart.reduce((sum, item) => sum + (item.drug.price * item.quantity), 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Tax (8%):</span>
                    <span>${(posCart.reduce((sum, item) => sum + (item.drug.price * item.quantity), 0) * 0.08).toFixed(2)}</span>
                  </div>
                  {paymentMethod === 'insurance' && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Ins Discount (50%):</span>
                      <span>-${(posCart.reduce((sum, item) => sum + (item.drug.price * item.quantity), 0) * 0.5).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-slate-800 border-t border-slate-200 pt-1 text-sm">
                    <span>Invoice Total:</span>
                    <span>
                      ${(
                        posCart.reduce((sum, item) => sum + (item.drug.price * item.quantity), 0) * 1.08 - 
                        (paymentMethod === 'insurance' ? posCart.reduce((sum, item) => sum + (item.drug.price * item.quantity), 0) * 0.5 : 0)
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              <button
                onClick={handlePosCheckout}
                disabled={!posCart.length}
                className="w-full bg-[#0F172A] text-white hover:bg-slate-800 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 disabled:bg-slate-200 cursor-pointer shadow-sm"
              >
                <CreditCard className="h-4 w-4 text-sky-400" />
                Complete Transaction (Pay)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POS Receipt Modal dialog */}
      {showReceipt && (
        <div className="fixed inset-0 bg-slate-900/60 flex justify-center items-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="text-center space-y-1">
              <h4 className="font-extrabold text-xs uppercase text-slate-900 tracking-tight">Junub Pharmacare</h4>
              <p className="text-[9px] text-slate-500 font-bold uppercase">Product of Junub Pos Center</p>
              <p className="text-[9px] text-slate-400">Juba, South Sudan | Tel: +211922152427</p>
              <p className="text-[9px] text-slate-400">Email: junubposcenter@gmail.com</p>
            </div>

            {/* Secondary branding for the active pharmacy operator */}
            <div className="border-y border-dashed border-slate-200 py-2 text-center bg-slate-50/70 space-y-1 rounded-lg">
              <p className="text-[8px] uppercase tracking-widest font-extrabold text-slate-400">Licensed Local Operator</p>
              <div className="flex items-center justify-center gap-1">
                <span className="text-[11px]">
                  {activeTenant?.logoIcon === 'cross' ? '✚' : 
                   activeTenant?.logoIcon === 'capsule' ? '💊' : 
                   activeTenant?.logoIcon === 'heart' ? '♥' : 
                   activeTenant?.logoIcon === 'shield' ? '🛡' : '⚡'}
                </span>
                <span className="font-extrabold text-slate-800 text-xs uppercase tracking-tight">
                  {activeTenant.name}
                </span>
              </div>
              <p className="text-slate-500 text-[9px] px-1 truncate">📍 {activeTenant.address}</p>
              <p className="text-slate-500 text-[9px]">📞 Tel: {activeTenant.phone}</p>
            </div>

            <div className="border-t border-dashed border-slate-200 pt-3 text-xs font-mono text-slate-600 space-y-1">
              <div className="flex justify-between">
                <span>INVOICE:</span>
                <span>{showReceipt.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>DATE:</span>
                <span>{new Date(showReceipt.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>CASHIER:</span>
                <span>{showReceipt.cashierName}</span>
              </div>
            </div>

            <div className="border-t border-dashed border-slate-200 pt-3 text-xs space-y-2">
              {showReceipt.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-slate-700">
                  <span>{item.name} (x{item.quantity})</span>
                  <span className="font-mono">${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-slate-200 pt-3 text-xs font-mono text-slate-600 space-y-1">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>${showReceipt.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax:</span>
                <span>${showReceipt.tax.toFixed(2)}</span>
              </div>
              {showReceipt.discount > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Discount:</span>
                  <span>-${showReceipt.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-800 font-bold text-sm border-t border-slate-100 pt-1.5">
                <span>TOTAL PAID:</span>
                <span>${showReceipt.total.toFixed(2)}</span>
              </div>
              <div className="text-center text-[10px] text-slate-400 uppercase pt-2">
                Pay Method: {showReceipt.paymentMethod}
              </div>
            </div>

            <div className="bg-slate-50 p-2.5 rounded border border-slate-100 text-center text-[10px] text-slate-400 font-mono">
              Workspace secured via End-to-End Cryptography &amp; HIPAA Shield
            </div>

            <button
              onClick={() => setShowReceipt(null)}
              className="w-full bg-[#0F172A] hover:bg-slate-800 text-white font-semibold py-2.5 rounded-xl text-xs cursor-pointer shadow-sm transition-all"
            >
              Print & Dismiss
            </button>
          </div>
        </div>
      )}

      {/* ----------------- TIER 5: STORE MANAGER VIEW ----------------- */}
      {['Store Manager', 'Pharmacy Admin', 'Master Admin'].includes(activeRole) && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
              <div>
                <h3 className="font-bold text-slate-800">Tenant Drug Inventory Catalog</h3>
                <p className="text-slate-500 text-xs">Isolated tablespace inventory for {activeTenant.name}</p>
              </div>
              <button
                onClick={() => setShowAddInventory(!showAddInventory)}
                className="bg-[#0F172A] text-white hover:bg-slate-800 font-semibold text-xs px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Plus className="h-4 w-4" />
                Add New Drug Catalog Item
              </button>
            </div>

            {/* Add Catalog Form */}
            {showAddInventory && (
              <form onSubmit={handleAddInventorySubmit} className="bg-slate-50 p-4 rounded-xl border border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Medication Name</label>
                  <input
                    type="text"
                    required
                    value={newInventoryForm.name}
                    onChange={(e) => setNewInventoryForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Lipitor 20mg"
                    className="w-full text-xs px-3 py-2 border border-slate-200 bg-white rounded-lg focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Generic Formula</label>
                  <input
                    type="text"
                    value={newInventoryForm.genericName}
                    onChange={(e) => setNewInventoryForm(prev => ({ ...prev, genericName: e.target.value }))}
                    placeholder="Atorvastatin Calcium"
                    className="w-full text-xs px-3 py-2 border border-slate-200 bg-white rounded-lg focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Category</label>
                  <select
                    value={newInventoryForm.category}
                    onChange={(e: any) => setNewInventoryForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full text-xs px-3 py-2 border border-slate-200 bg-white rounded-lg focus:outline-none"
                  >
                    {[
                      'Antibiotics',
                      'Analgesics (Pain Relievers)',
                      'Antimalarials',
                      'Antihypertensives',
                      'Antidiabetics',
                      'Antifungals',
                      'Antivirals',
                      'Antihistamines',
                      'Gastrointestinal Drugs',
                      'Vitamins and Supplements',
                      'Vaccines and Immunological Agents',
                      'Hormonal Drugs',
                      'Respiratory Drugs',
                      'Dermatological Drugs',
                      'Ophthalmic Drugs (Eye Medications)',
                      'Cardiovascular Drugs',
                      'Central Nervous System (CNS) Drugs',
                      'Intravenous Fluids and Electrolytes',
                      'Contraceptives and Reproductive Health Drugs',
                      'Controlled Drugs and Narcotics (Controlled Substances)'
                    ].map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Initial Stock</label>
                  <input
                    type="number"
                    required
                    value={newInventoryForm.stock}
                    onChange={(e) => setNewInventoryForm(prev => ({ ...prev, stock: e.target.value }))}
                    placeholder="250"
                    className="w-full text-xs px-3 py-2 border border-slate-200 bg-white rounded-lg focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Price per unit ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newInventoryForm.price}
                    onChange={(e) => setNewInventoryForm(prev => ({ ...prev, price: e.target.value }))}
                    placeholder="24.99"
                    className="w-full text-xs px-3 py-2 border border-slate-200 bg-white rounded-lg focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Low Stock Threshold</label>
                  <input
                    type="number"
                    value={newInventoryForm.minStockAlert}
                    onChange={(e) => setNewInventoryForm(prev => ({ ...prev, minStockAlert: e.target.value }))}
                    placeholder="30"
                    className="w-full text-xs px-3 py-2 border border-slate-200 bg-white rounded-lg focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Expiry Date</label>
                  <input
                    type="date"
                    value={newInventoryForm.expiryDate}
                    onChange={(e) => setNewInventoryForm(prev => ({ ...prev, expiryDate: e.target.value }))}
                    className="w-full text-xs px-3 py-2 border border-slate-200 bg-white rounded-lg focus:outline-none"
                  />
                </div>
                <div className="space-y-1 flex items-center pt-5">
                  <input
                    type="checkbox"
                    id="reqRx"
                    checked={newInventoryForm.requiresPrescription}
                    onChange={(e) => setNewInventoryForm(prev => ({ ...prev, requiresPrescription: e.target.checked }))}
                    className="mr-2"
                  />
                  <label htmlFor="reqRx" className="text-xs font-bold text-slate-500 uppercase">Requires Rx Prescription</label>
                </div>
                <div className="col-span-1 md:col-span-4 flex justify-end">
                  <button
                    type="submit"
                    className="bg-[#0F172A] text-white text-xs font-semibold px-5 py-2 rounded-lg hover:bg-slate-800 transition-all cursor-pointer shadow-sm"
                  >
                    Deploy Item to Catalog
                  </button>
                </div>
              </form>
            )}

            {/* Inventory table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] uppercase font-bold text-slate-400">
                    <th className="py-3 px-2">Drug Name</th>
                    <th className="py-3 px-2">Sku</th>
                    <th className="py-3 px-2">Category</th>
                    <th className="py-3 px-2">Stock Level</th>
                    <th className="py-3 px-2">Cost / Price</th>
                    <th className="py-3 px-2">Expiry</th>
                    <th className="py-3 px-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-medium">
                  {drugs.map(drug => {
                    const isLow = drug.stock < drug.minStockAlert;
                    return (
                      <tr key={drug.id} className="hover:bg-slate-50/60 transition-all">
                        <td className="py-3.5 px-2">
                          <span className="font-bold text-slate-800 block">{drug.name}</span>
                          <span className="text-[10px] text-slate-400">{drug.genericName}</span>
                        </td>
                        <td className="py-3.5 px-2 font-mono text-slate-500">{drug.sku}</td>
                        <td className="py-3.5 px-2">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[9px] font-semibold">
                            {drug.category}
                          </span>
                        </td>
                        <td className="py-3.5 px-2">
                          <div className="flex items-center gap-1.5">
                            <span className={`font-bold ${isLow ? 'text-rose-600' : 'text-slate-800'}`}>
                              {drug.stock} units
                            </span>
                            {isLow && (
                              <span className="text-rose-500 flex items-center gap-0.5" title="Low stock warning!">
                                <AlertTriangle className="h-3.5 w-3.5 animate-bounce" />
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-2 font-mono">
                          <span className="text-slate-400 text-[10px]">${drug.cost.toFixed(2)} cost</span> / <span className="text-slate-800">${drug.price.toFixed(2)}</span>
                        </td>
                        <td className="py-3.5 px-2 text-slate-400">{drug.expiryDate}</td>
                        <td className="py-3.5 px-2">
                          <button
                            onClick={() => handleRestockDrug(drug.id, 50)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-2 py-1 rounded text-[10px] transition-all"
                          >
                            Order +50 units
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
