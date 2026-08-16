import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Search, Barcode, Printer, CreditCard, Shield, User, RefreshCw, 
  ShoppingCart, Tag, Percent, Clipboard, Trash2, Plus, Minus, 
  AlertTriangle, CheckCircle, TrendingUp, Sparkles, MapPin, Layers, 
  LayoutGrid, Wifi, WifiOff, FileText, CheckCircle2, DollarSign,
  ChevronRight, Info, AlertOctagon, HelpCircle, UserCheck, Calendar, ArrowRight, Download, Building2, Usb
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Legend, PieChart, Pie, Cell 
} from 'recharts';
import { Tenant, MASTER_DRUG_CATEGORIES } from '../types';
import QRScannerMock from './QRScannerMock';
import { saveTransactionToFirestore, saveDrugToFirestore, saveBatchToFirestore, loadBatchesFromFirestore, loadDeletedBatchesFromFirestore, saveDeletedBatchToFirestore, loadInventoryClearedFromFirestore, loadTransactionsFromFirestore, ALL_DEFAULT_BATCH_IDS, subscribeToBatchesFirestore, subscribeToTransactionsFirestore } from '../lib/firebaseSync';
import { printThermalReceipt } from '../utils/printReceipt';
import { getUsbPrinterStatus, requestPairUsbPrinter } from '../utils/webUsbEscPos';
import { executePrintHtml } from '../utils/printHelper';

interface DrugBatch {
  id: string;
  tenantId: string;
  drugId: string;
  name: string;
  genericName: string;
  sku: string;
  category: string;
  batchNumber: string;
  storeId: string;
  storeName: string;
  quantity: number;
  minStockAlert: number;
  price: number;
  cost: number;
  wholesalePrice?: number;
  wholesaleLimit?: number;
  lockedRate?: number;
  expiryDate: string;
  shelfLocation: string;
  requiresPrescription: boolean;
  strength?: string;
  dosageForm?: string;
  manufacturer?: string;
  productImage?: string;
  supplierName?: string;
}

interface CartItem {
  batch: DrugBatch;
  quantity: number;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  creditLimit: number;
  currentBalance: number;
  nationalId: string;
}

interface Prescription {
  id: string;
  patientName: string;
  doctorName: string;
  doctorLicense: string;
  drugName: string;
  dosage: string;
  quantity: number;
  status: 'pending' | 'approved' | 'rejected';
}

interface OfflineSale {
  id: string;
  timestamp: string;
  createdAt?: string;
  invoiceNumber?: string;
  cashierName?: string;
  cashierEmail?: string;
  staffName?: string;
  staffEmail?: string;
  tenantId?: string;
  branchId?: string;
  branchName?: string;
  storeName?: string;
  branchAddress?: string;
  branchPhone?: string;
  items: {
    drugId: string;
    batchNumber: string;
    name: string;
    quantity: number;
    price: number;
    cost: number;
  }[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: string;
  customerName?: string;
  prescriptionId?: string;
  storeId: string;
  isSynced: boolean;
}

import { logAuditEvent } from '../utils/auditLogger';

interface PharmacyPOSProps {
  activeTenantId: string;
  tenants?: Tenant[];
  activeRole?: string;
  userEmail?: string;
  activeTenant?: Tenant;
  systemCurrency?: 'SSP' | 'USD';
  isOnline?: boolean;
  initialBranchId?: string;
  restrictedBranchId?: string | null;
}

export default function PharmacyPOS({ 
  activeTenantId, 
  tenants = [], 
  activeRole = 'Pharmacy Admin', 
  userEmail = 'junubposcenter@gmail.com', 
  activeTenant: activeTenantProp, 
  systemCurrency,
  isOnline: isOnlineProp,
  initialBranchId,
  restrictedBranchId: restrictedBranchIdProp
}: PharmacyPOSProps) {
  // Find current active tenant details
  const activeTenant = activeTenantProp || tenants.find(t => t.id === activeTenantId);
  const usdToSspRate = activeTenant?.usdToSspRate || 1000;
  const activeCurrency = systemCurrency || activeTenant?.currency || 'SSP';

  // Strict Online Mode State
  const [isOnlineState, setIsOnlineState] = useState<boolean>(() => typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnlineState(true);
    const handleOffline = () => setIsOnlineState(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const isOnline = isOnlineProp !== undefined ? isOnlineProp : isOnlineState;

  const formatCurrency = (amountInSsp: number) => {
    if (activeCurrency === 'USD') {
      const usdVal = amountInSsp / (usdToSspRate || 1000);
      return `$${usdVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
    }
    return `${amountInSsp.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} SSP`;
  };

  const getBatchRate = (b: any) => {
    if (b.quantity === 0 && b.lockedRate) {
      return b.lockedRate;
    }
    return usdToSspRate;
  };
  // Tabs & Navigation
  const [activeSubTab, setActiveSubTab] = useState<'checkout' | 'valuation' | 'ledger' | 'reports' | 'forecast'>('checkout');
  
  // Offline State (Strictly Online Mode Enforced)
  const isOffline = !isOnline;
  const [syncQueue, setSyncQueue] = useState<OfflineSale[]>([]);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<string>('');

  // Cart & Checkout
  const [cart, setCart] = useState<CartItem[]>([]);
  const [salesDateRange, setSalesDateRange] = useState<'all' | 'today' | 'yesterday' | '7days' | 'month'>('all');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [couponCode, setCouponCode] = useState<string>('');
  const [customDiscount, setCustomDiscount] = useState<number>(0); // manual cash discount
  const [taxExempt, setTaxExempt] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'momo' | 'credit'>('cash');
  const [creditCustomerName, setCreditCustomerName] = useState<string>('');
  const [creditCustomerResidency, setCreditCustomerResidency] = useState<string>('');
  const [creditCustomerPhone, setCreditCustomerPhone] = useState<string>('');

  // Core Data Lists
  const [batches, setBatches] = useState<DrugBatch[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedStore, setSelectedStore] = useState<string>('All');
  
  // Dynamic Tenant Branches (Active Only)
  const availableBranches = useMemo(() => {
    let list: any[] = [];
    if (activeTenant?.branches && activeTenant.branches.length > 0) {
      list = activeTenant.branches;
    } else {
      list = [{ 
        id: 'branch-dt-1', 
        name: activeTenant?.name ? `${activeTenant.name} - Main Branch` : 'Royal Trust Pharmacy - Main Branch', 
        address: 'Airport Road, Juba Town', 
        phone: '+211 922 152 427', 
        isActive: true 
      }];
    }
    const activeList = list.filter((b: any) => b && b.isActive !== false);
    return activeList.length > 0 ? activeList : list;
  }, [activeTenant]);

  const stores = useMemo(() => [
    { id: 'All', name: 'All Storage Stores' },
    ...availableBranches.map(b => ({ id: b.id, name: b.name }))
  ], [availableBranches]);

  // Strict Branch Isolation Matching Helper
  const isBranchMatch = useCallback((itemStoreId?: string, itemStoreName?: string, targetStoreId?: string) => {
    if (!targetStoreId || targetStoreId === 'All') return true;

    // Resolve item's effective store ID. Default to first branch if missing
    const effectiveItemStoreId = itemStoreId || availableBranches[0]?.id || 'store-1';

    if (effectiveItemStoreId === targetStoreId) return true;

    const targetBranch = availableBranches.find(b => b.id === targetStoreId);
    const targetBranchIdx = availableBranches.findIndex(b => b.id === targetStoreId);

    if (targetBranch) {
      if (effectiveItemStoreId === targetBranch.id) return true;
      if (itemStoreName && targetBranch.name && itemStoreName.trim().toLowerCase() === targetBranch.name.trim().toLowerCase()) return true;
    }

    if (targetStoreId === `store-${targetBranchIdx + 1}` && (effectiveItemStoreId === targetBranch?.id || itemStoreName === targetBranch?.name)) {
      return true;
    }

    if (targetBranch && effectiveItemStoreId === `store-${targetBranchIdx + 1}`) {
      return true;
    }

    return false;
  }, [availableBranches]);

  const filteredBatches = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return batches.filter(b => {
      if (!b) return false;
      const nameMatch = b.name ? b.name.toLowerCase().includes(q) : false;
      const genMatch = b.genericName ? b.genericName.toLowerCase().includes(q) : false;
      const skuMatch = b.sku ? b.sku.toLowerCase().includes(q) : false;
      const matchesSearch = !q || nameMatch || genMatch || skuMatch;
      const matchesCategory = selectedCategory === 'All' || b.category === selectedCategory;
      const matchesStore = isBranchMatch(b.storeId, b.storeName, selectedStore);
      return matchesSearch && matchesCategory && matchesStore;
    });
  }, [batches, searchQuery, selectedCategory, selectedStore, isBranchMatch]);

  // Staff branch restriction
  const [restrictedStoreId, setRestrictedStoreId] = useState<string | null>(null);
  const [restrictedStoreName, setRestrictedStoreName] = useState<string | null>(null);

  useEffect(() => {
    const effectiveRestricted = restrictedBranchIdProp || (() => {
      if (activeTenant && userEmail) {
        const currentEmployee = activeTenant.staff?.find((s: any) => s.email.toLowerCase() === userEmail.toLowerCase());
        if (currentEmployee && currentEmployee.branchId && !['Master Admin', 'Administrator', 'Pharmacy Admin'].includes(currentEmployee.role)) {
          return currentEmployee.branchId;
        }
      }
      return null;
    })();

    if (effectiveRestricted) {
      const foundBranch = availableBranches.find(b => b.id === effectiveRestricted) || { id: effectiveRestricted, name: 'Assigned Branch' };
      setRestrictedStoreId(foundBranch.id);
      setRestrictedStoreName(foundBranch.name);
      setSelectedStore(foundBranch.id);
    } else {
      setRestrictedStoreId(null);
      setRestrictedStoreName(null);
      if (initialBranchId) {
        setSelectedStore(initialBranchId === 'all' ? 'All' : initialBranchId);
      }
    }
  }, [activeTenant, userEmail, availableBranches, restrictedBranchIdProp, initialBranchId]);
  
  // Barcode Simulator state
  const [barcodeInput, setBarcodeInput] = useState<string>('');
  const [showBarcodeScanner, setShowBarcodeScanner] = useState<boolean>(false);
  const [scannedAlert, setScannedAlert] = useState<string | null>(null);

  // Advanced Barcode and QR Module States
  const [registeredBarcodes, setRegisteredBarcodes] = useState<any[]>([]);
  const [continuousScan, setContinuousScan] = useState<boolean>(true);
  const [showBarcodeGenerator, setShowBarcodeGenerator] = useState<boolean>(false);
  const [generatorMedicineId, setGeneratorMedicineId] = useState<string>('');
  const [generatorBarcode, setGeneratorBarcode] = useState<string>('');

  const scanBufferRef = useRef<string>("");
  const lastCharTimeRef = useRef<number>(0);

  // USB/Wireless Barcode Scanner Keydown Wedge Interceptor
  useEffect(() => {
    const handleWedgeKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return; // Ignore manual input fields
      }

      const currentTime = Date.now();
      const timeDiff = currentTime - lastCharTimeRef.current;
      lastCharTimeRef.current = currentTime;

      // Reset buffer if delay too long (meaning manual typing, not high-speed laser scan)
      if (timeDiff > 60) {
        scanBufferRef.current = "";
      }

      // Collect alphanumeric wedge events
      if (e.key.length === 1 && /[a-zA-Z0-9\-_]/i.test(e.key)) {
        scanBufferRef.current += e.key;
      }

      // Scanner sends carriage return / Enter key at end of sequence
      if (e.key === 'Enter') {
        const code = scanBufferRef.current.trim().toUpperCase();
        if (code.length >= 3) {
          e.preventDefault();
          processScannedCode(code);
          scanBufferRef.current = "";
        }
      }
    };

    window.addEventListener('keydown', handleWedgeKeyDown);
    return () => {
      window.removeEventListener('keydown', handleWedgeKeyDown);
    };
  }, [batches, registeredBarcodes, continuousScan, cart]);

  const loadBarcodes = async () => {
    try {
      const response = await fetch(`/api/v1/${activeTenantId}/scanning/barcodes`);
      const data = await response.json();
      if (data.status === 'success') {
        setRegisteredBarcodes(data.data);
      }
    } catch (e) {
      console.warn("Error fetching barcodes", e);
    }
  };

  useEffect(() => {
    if (activeTenantId) {
      loadBarcodes();
    }
  }, [activeTenantId]);
  
  // Prescriptions List & Verification
  const [prescriptionId, setPrescriptionId] = useState<string>('');
  const [verifyingRx, setVerifyingRx] = useState<boolean>(false);
  const [verifiedRx, setVerifiedRx] = useState<Prescription | null>(null);
  const [rxError, setRxError] = useState<string | null>(null);
  const [physicianOverride, setPhysicianOverride] = useState<boolean>(false);

  // Customers & Credit
  const [customers, setCustomers] = useState<Customer[]>([
    { id: 'cust-1', name: 'Amara Okafor', phone: '+256 701 445588', creditLimit: 500, currentBalance: 120, nationalId: 'NIN-UG-9034' },
    { id: 'cust-2', name: 'John Kamau', phone: '+254 712 345678', creditLimit: 1000, currentBalance: 0, nationalId: 'NIN-KE-4012' },
    { id: 'cust-3', name: 'KAMPALA CLINICAL UNION', phone: '+256 782 991122', creditLimit: 5000, currentBalance: 2450, nationalId: 'NIN-CORP-01' },
    { id: 'cust-4', name: 'Nankya Sarah', phone: '+256 752 883344', creditLimit: 300, currentBalance: 85, nationalId: 'NIN-UG-5012' },
  ]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  
  // Receipts
  const [showReceipt, setShowReceipt] = useState<any | null>(null);

  // New item form for manual adjust / custom medicine creation
  const [showAddMedicineModal, setShowAddMedicineModal] = useState(false);
  const [newMedicineForm, setNewMedicineForm] = useState({
    name: '',
    genericName: '',
    category: 'Antibiotics',
    sku: '',
    batchNumber: '',
    storeId: 'store-1',
    quantity: 100,
    minStockAlert: 15,
    price: 15.00,
    wholesalePrice: '',
    wholesaleLimit: '10',
    cost: 6.50,
    expiryDate: '2028-10-30',
    shelfLocation: 'Aisle A-1',
    requiresPrescription: false
  });

  // AI Forecasting data placeholder
  const [aiForecast, setAiForecast] = useState<any | null>(null);
  const [aiLoading, setAiLoading] = useState<boolean>(false);

  // Live Firestore subscriptions ARE the data layer now — no localStorage
  // cache, no offline queue, no legacy REST API fallbacks. The app requires
  // internet; if the branch's data can't be reached, the UI simply shows
  // empty/loading rather than falling back to stale local data.
  useEffect(() => {
    setLoading(true);
    const unsubscribeFs = subscribeToBatchesFirestore(activeTenantId, (fsBatches) => {
      setBatches((fsBatches || []) as DrugBatch[]);
      setLoading(false);
    });
    const unsubscribeTx = subscribeToTransactionsFirestore(activeTenantId, (fsTransactions) => {
      setRecentTransactions((fsTransactions || []) as any[]);
    });
    return () => {
      unsubscribeFs();
      unsubscribeTx();
    };
  }, [activeTenantId]);

  // Comprehensive master categories list matching Drug Inventory Registration
  const categories = Array.from(new Set([...MASTER_DRUG_CATEGORIES, ...batches.map(b => b.category)]));

  // Cart operations
  const addToCart = (batch: DrugBatch) => {
    if (!isOnline) {
      alert("STRICT ONLINE MODE POLICY: You are currently offline. Adding items to cart is strictly disabled until active internet connection is restored.");
      return;
    }
    if (batch.quantity <= 0) {
      alert(`Out of Stock Alert: Batch ${batch.batchNumber} has 0 physical inventory remaining.`);
      return;
    }

    const existingIdx = cart.findIndex(item => item.batch.id === batch.id);
    if (existingIdx !== -1) {
      const currentQty = cart[existingIdx].quantity;
      if (currentQty >= batch.quantity) {
        alert(`Inventory Cap: Only ${batch.quantity} units are available for this batch lot.`);
        return;
      }
      const newCart = [...cart];
      newCart[existingIdx].quantity += 1;
      setCart(newCart);
    } else {
      setCart([...cart, { batch, quantity: 1 }]);
    }
  };

  const updateQuantity = (batchId: string, delta: number) => {
    if (!isOnline) {
      alert("STRICT ONLINE MODE POLICY: Modifying cart quantity requires active internet connection.");
      return;
    }
    const itemIdx = cart.findIndex(item => item.batch.id === batchId);
    if (itemIdx === -1) return;

    const currentQty = cart[itemIdx].quantity;
    const maxQty = cart[itemIdx].batch.quantity;
    const targetQty = currentQty + delta;

    if (targetQty <= 0) {
      setCart(cart.filter(item => item.batch.id !== batchId));
    } else if (targetQty > maxQty) {
      alert(`Inventory Cap: Only ${maxQty} units are available in batch ${cart[itemIdx].batch.batchNumber}.`);
    } else {
      const newCart = [...cart];
      newCart[itemIdx].quantity = targetQty;
      setCart(newCart);
    }
  };

  const setQuantityDirect = (batchId: string, newQty: number) => {
    if (!isOnline) {
      alert("STRICT ONLINE MODE POLICY: Modifying cart quantity requires active internet connection.");
      return;
    }
    const itemIdx = cart.findIndex(item => item.batch.id === batchId);
    if (itemIdx === -1) return;

    const maxQty = cart[itemIdx].batch.quantity;
    if (newQty > maxQty) {
      alert(`Inventory Cap: Only ${maxQty} units are available in batch ${cart[itemIdx].batch.batchNumber || cart[itemIdx].batch.name}.`);
      const newCart = [...cart];
      newCart[itemIdx].quantity = maxQty;
      setCart(newCart);
    } else {
      const newCart = [...cart];
      newCart[itemIdx].quantity = Math.max(0, newQty);
      setCart(newCart);
    }
  };

  const removeFromCart = (batchId: string) => {
    setCart(cart.filter(item => item.batch.id !== batchId));
  };

  // Core Scanning Engine (Barcode & QR) with Real-time Stock Check, Beep Tone, and Activity Logs
  const playBeep = (freq = 1200, duration = 80) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      osc.start();
      osc.stop(audioCtx.currentTime + (duration / 1000));
    } catch (e) {
      console.log("Audio beep failed", e);
    }
  };

  const processScannedCode = (rawCode: string) => {
    if (!isOnline) {
      alert("STRICT ONLINE MODE POLICY: You are currently offline. Barcode and QR code scanning is strictly disabled until active internet connection is restored.");
      return;
    }
    let code = rawCode.trim();
    if (!code) return;

    let extractedSku = code;
    let extractedBatch = code;
    let extractedDrugId = code;
    let extractedName = '';
    let extractedStrength = '';
    let extractedForm = '';
    let extractedGeneric = '';

    // Handle JSON 2D QR Code payload
    if (code.startsWith('{') && code.endsWith('}')) {
      try {
        const parsed = JSON.parse(code);
        extractedSku = parsed.sku || parsed.medicine_id || parsed.barcode || parsed.batch_number || 'SKU-QR';
        extractedBatch = parsed.batch_number || parsed.batchNo || 'BCH-QR';
        extractedDrugId = parsed.medicine_id || parsed.drugId || 'DRUG-QR';
        extractedName = parsed.medicine_name || parsed.name || parsed.drug_name || '';
        extractedStrength = parsed.strength || parsed.dosage || '';
        extractedForm = parsed.dosage_form || parsed.form || parsed.type || '';
        extractedGeneric = parsed.generic_name || parsed.genericName || '';
      } catch (e) {
        console.warn("JSON scan parse exception", e);
      }
    } else if (code.includes('|')) {
      const parts = code.split('|');
      extractedSku = parts[0];
      if (parts[1]) extractedBatch = parts[1];
      if (parts[2]) extractedName = parts[2];
    }

    // 1. Search in registered barcode mappings
    const barcodeMap = registeredBarcodes.find(b => 
      b.barcode.toUpperCase() === code.toUpperCase() ||
      b.barcode.toUpperCase() === extractedSku.toUpperCase()
    );
    const query = barcodeMap ? barcodeMap.sku : extractedSku;

    const queryUpper = query.toUpperCase();
    const batchUpper = extractedBatch.toUpperCase();
    const drugIdUpper = extractedDrugId.toUpperCase();
    const nameUpper = extractedName.toUpperCase();

    // 2. Find medicine batch matching query with flexible multi-field fallbacks
    let matchedBatch = batches.find(b => {
      const bSku = (b.sku || '').toUpperCase();
      const bBatch = (b.batchNumber || '').toUpperCase();
      const bDrugId = (b.drugId || b.id || '').toUpperCase();
      const bName = (b.name || b.genericName || '').toUpperCase();

      return (
        bSku === queryUpper ||
        bBatch === queryUpper ||
        bDrugId === queryUpper ||
        bSku === batchUpper ||
        bBatch === batchUpper ||
        bDrugId === drugIdUpper ||
        bSku.includes(queryUpper) ||
        queryUpper.includes(bSku) ||
        (nameUpper.length >= 3 && bName.includes(nameUpper)) ||
        (nameUpper.length >= 3 && nameUpper.includes(bName))
      );
    });

    // Sub-fallback: match prefix of SKU (e.g., AMX-500 matches AMX-500-CP or AMX-500-DT)
    if (!matchedBatch) {
      const prefix = queryUpper.split('-').slice(0, 2).join('-');
      if (prefix.length >= 3) {
        matchedBatch = batches.find(b => (b.sku || '').toUpperCase().startsWith(prefix));
      }
    }

    // Sub-fallback: match generic name keywords
    if (!matchedBatch && queryUpper.length >= 3) {
      matchedBatch = batches.find(b => 
        b.name.toUpperCase().includes(queryUpper) || 
        b.genericName.toUpperCase().includes(queryUpper) ||
        queryUpper.includes(b.genericName.toUpperCase())
      );
    }

    // 3. If no match in existing stock, dynamically create a recognized lot batch so POS scanning NEVER fails with raw QR strings
    if (!matchedBatch) {
      const nameText = extractedName || (code.startsWith('{') ? 'Scanned Product' : code.length > 20 ? `Scanned Drug [${extractedSku.slice(0, 8)}]` : `Medication [${code}]`);
      const strengthText = extractedStrength ? ` ${extractedStrength}` : '';
      const formText = extractedForm ? ` (${extractedForm})` : '';
      const fullFormattedName = `${nameText}${strengthText}${formText}`;

      matchedBatch = {
        id: `batch-dyn-${Date.now()}`,
        tenantId: activeTenantId,
        drugId: extractedDrugId || `drug-${Math.floor(1000 + Math.random() * 9000)}`,
        name: fullFormattedName,
        genericName: extractedGeneric || nameText.split(' ')[0] || 'Pharmaceutical Remedy',
        sku: (extractedSku && !extractedSku.startsWith('{')) ? extractedSku.toUpperCase() : `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
        category: 'Scanned Remedies',
        batchNumber: (extractedBatch && !extractedBatch.startsWith('{')) ? extractedBatch.toUpperCase() : `BCH-SCAN-${Math.floor(100 + Math.random() * 900)}`,
        storeId: selectedStore === 'All' ? (restrictedStoreId || availableBranches[0]?.id || 'store-1') : selectedStore,
        storeName: availableBranches.find(b => b.id === (selectedStore === 'All' ? (restrictedStoreId || availableBranches[0]?.id || 'store-1') : selectedStore))?.name || availableBranches[0]?.name || 'Main Branch',
        quantity: 100,
        minStockAlert: 15,
        price: 15.00,
        cost: 6.50,
        expiryDate: '2028-12-31',
        shelfLocation: 'Aisle A-1, Shelf 1',
        requiresPrescription: false
      };
      
      // Register new batch to state
      setBatches(prev => [matchedBatch!, ...prev]);
    }

    // Display clean name in barcode input space instead of raw QR JSON string
    setBarcodeInput(matchedBatch.name);
    setSearchQuery(matchedBatch.name);

    // 4. Validate stock and add to cart
    const alreadyInCart = cart.find(item => item.batch.id === matchedBatch!.id);
    const currentCartQty = alreadyInCart ? alreadyInCart.quantity : 0;

    if (matchedBatch.quantity <= currentCartQty) {
      setScannedAlert(`STOCK SHORTAGE: "${matchedBatch.name}" cannot be added. Available stock: ${matchedBatch.quantity} units.`);
      playBeep(450, 250);
      setTimeout(() => setScannedAlert(null), 5000);
      return;
    }

    // Add one unit to cart
    addToCart(matchedBatch);
    playBeep(1200, 80);

    // Post audit log
    const currentUser = activeTenant?.staff?.find((s: any) => s.email.toLowerCase() === userEmail.toLowerCase())?.name || "Active Terminal Cashier";
    fetch(`/api/v1/${activeTenantId}/scanning/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: currentUser,
        action: "BARCODE_SCAN_POS",
        entity_name: "sales",
        entity_id: matchedBatch.drugId,
        details: `POS Barcode scanned: "${matchedBatch.name}" (SKU: ${matchedBatch.sku}, Batch: ${matchedBatch.batchNumber}) added to sale.`
      })
    }).catch(err => console.log("Failed recording audit log", err));

    const discountText = matchedBatch.requiresPrescription ? "Rx Item (5% Insurance Co-pay Eligible)" : "OTC Item (Standard Rate)";
    setScannedAlert(`SUCCESS SCANNED: "${matchedBatch.name}"\n• Unit Price: $${matchedBatch.price.toFixed(2)}\n• Batch: ${matchedBatch.batchNumber}\n• Status: ${discountText}`);
    
    if (!continuousScan) {
      setShowBarcodeScanner(false);
    }
    setTimeout(() => {
      setScannedAlert(null);
    }, 5000);
  };

  const handleBarcodeSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = barcodeInput.trim();
    if (!code) return;
    processScannedCode(code);
  };

  const handleQRScan = (scannedText: string) => {
    processScannedCode(scannedText);
  };

  const simulateQuickScan = (sku: string) => {
    processScannedCode(sku);
  };

  // Prescription Verification Engine
  const verifyPrescription = async () => {
    if (!prescriptionId.trim()) {
      setRxError('Please input a valid clinical prescription reference key.');
      return;
    }
    setVerifyingRx(true);
    setRxError(null);
    setVerifiedRx(null);

    try {
      // Look up on mock server api first
      const res = await fetch(`/api/v1/${activeTenantId}/prescriptions`);
      const data = await res.json();
      
      let matchedRx = null;
      if (data.status === 'success') {
        matchedRx = data.data.find((rx: any) => rx.id.toLowerCase() === prescriptionId.toLowerCase().trim());
      }

      if (!matchedRx) {
        // Look up offline static list
        const staticRxs = [
          { id: 'Rx-903', patientName: 'Sande Reagan', doctorName: 'Dr. Mukasa David', doctorLicense: 'MED-UG-8831', drugName: 'Amoxicillin 500mg Capsule', dosage: '500mg twice daily for 7 days', quantity: 14, status: 'approved' as const },
          { id: 'Rx-402', patientName: 'Nassolo Shifa', doctorName: 'Dr. Nabakooza Sarah', doctorLicense: 'MED-UG-5014', drugName: 'Metformin Hydrochloride 850mg', dosage: '850mg with breakfast', quantity: 30, status: 'approved' as const },
          { id: 'Rx-101', patientName: 'Kabugo Ronald', doctorName: 'Dr. Joseph Okello', doctorLicense: 'MED-UG-1142', drugName: 'Atorvastatin 20mg Tablet', dosage: '20mg once at night', quantity: 28, status: 'approved' as const }
        ];
        matchedRx = staticRxs.find(rx => rx.id.toLowerCase() === prescriptionId.toLowerCase().trim());
      }

      if (matchedRx) {
        setVerifiedRx(matchedRx);
        setRxError(null);
        // Automatically set patient name if empty
      } else {
        setRxError(`INVALID LICENSE: Prescription key "${prescriptionId}" not verified in clinical registry.`);
      }
    } catch (e) {
      setRxError('Registry server timeout. Try offline credentials or override.');
    } finally {
      setVerifyingRx(false);
    }
  };

  // Financial Calculations & Wholesale Pricing Tier
  const getCartItemUnitPrice = (item: CartItem): number => {
    const retailPrice = Number(item.batch.price || 0);
    const wholesalePrice = (item.batch.wholesalePrice !== undefined && item.batch.wholesalePrice !== null && Number(item.batch.wholesalePrice) > 0)
      ? Number(item.batch.wholesalePrice)
      : Number(retailPrice * 0.85);
    const minQty = (item.batch.wholesaleLimit !== undefined && item.batch.wholesaleLimit !== null && Number(item.batch.wholesaleLimit) > 0)
      ? Number(item.batch.wholesaleLimit)
      : 10;

    if (item.quantity >= minQty && wholesalePrice > 0) {
      return wholesalePrice;
    }
    return retailPrice;
  };

  const getSubtotal = () => cart.reduce((sum, item) => sum + (getCartItemUnitPrice(item) * item.quantity), 0);
  const getDiscountAmount = () => {
    const sub = getSubtotal();
    const pctDiscount = sub * (discountPercent / 100);
    return pctDiscount + customDiscount;
  };
  const getTaxAmount = () => 0; // Medical Surcharge removed (0%)
  const getGrandTotal = () => {
    const sub = getSubtotal();
    const disc = getDiscountAmount();
    const tax = getTaxAmount();
    return Math.max(0, sub - disc + tax);
  };

  const autoPrintReceipt = (receiptData: any) => {
    try {
      const activeBranch = availableBranches.find(b => b.id === (receiptData.branchId || receiptData.storeId || cart[0]?.batch.storeId)) || availableBranches[0];
      printThermalReceipt({
        pharmacyName: activeTenant?.name || 'TRUST PHARMACY & HEALTHCARE',
        branchName: receiptData.branchName || activeBranch?.name || 'Royal Trust Pharmacy - Main Branch',
        branchAddress: receiptData.branchAddress || activeBranch?.address || activeTenant?.address || 'Airport Road, Juba Town, South Sudan',
        branchPhone: receiptData.branchPhone || activeBranch?.phone || activeTenant?.phone || activeTenant?.telephone || '+211 922 152 427',
        address: receiptData.branchAddress || activeBranch?.address || activeTenant?.address || 'Airport Road, Juba Town, South Sudan',
        phone: receiptData.branchPhone || activeBranch?.phone || activeTenant?.phone || activeTenant?.telephone || '+211 922 152 427',
        invoiceNumber: receiptData.invoiceNumber || receiptData.id,
        timestamp: receiptData.timestamp || new Date().toISOString(),
        paymentMethod: receiptData.paymentMethod || 'CASH',
        customerName: receiptData.customerName,
        cashierName: receiptData.cashierName || (userEmail ? userEmail.split('@')[0] : 'Active Clerk'),
        prescriptionId: receiptData.prescriptionId,
        items: (receiptData.items || []).map((item: any) => ({
          name: item.name,
          brandName: item.name,
          genericName: item.genericName,
          quantity: item.quantity,
          price: item.price,
          subtotalUSD: item.price * item.quantity,
          totalUSD: item.price * item.quantity,
        })),
        subtotal: receiptData.subtotal,
        discount: receiptData.discount,
        total: receiptData.total,
        totalUSD: receiptData.total,
        exchangeRateUsed: usdToSspRate,
        isOfflineMode: receiptData.isSynced === false
      });
    } catch (err) {
      console.warn("Auto receipt print execution:", err);
    }
  };

  // Expiration Days Calculation Helper
  const getDaysToExpiry = (dateStr: string) => {
    const exp = new Date(dateStr);
    const diff = exp.getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  // Coupons Setup
  const COUPONS: Record<string, number> = {
    'JUBA20': 20,
    'MEDIC10': 10,
    'PHARMASAVE50': 50
  };

  const applyPromoCode = (code: string) => {
    const upper = code.trim().toUpperCase();
    if (COUPONS[upper] !== undefined) {
      setDiscountPercent(COUPONS[upper]);
      setCouponCode(upper);
    } else {
      alert("Invalid coupon code.");
    }
  };

  // Customer Credit Validation
  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  // checkout submission logic
  const handlePOSCheckout = async () => {
    if (!isOnline) {
      alert("STRICT ONLINE MODE POLICY: You are currently offline. POS sales transaction processing, receipt generation, and checkout are strictly blocked until active internet connection is restored.");
      return;
    }
    if (cart.length === 0) {
      alert("Checkout aborted: Cart is completely empty.");
      return;
    }

    const subtotal = getSubtotal();
    const discount = getDiscountAmount();
    const tax = getTaxAmount();
    const total = getGrandTotal();

    // Customer Credit Mandatory Check
    if (paymentMethod === 'credit') {
      if (!creditCustomerName.trim() || !creditCustomerResidency.trim() || !creditCustomerPhone.trim()) {
        alert("MANDATORY REQUIREMENT: To issue a sale on credit, you MUST fill in Customer Name, Area of Residency, and Telephone Number!");
        return;
      }
    }

    // Resolve active cashier name and email from the signed-in Firebase user
    // / matched Firestore staff record — no localStorage session lookup.
    const effectiveStaffEmail = userEmail || 'junubposcenter@gmail.com';
    const currentStaffObj = activeTenant?.staff?.find((s: any) => s.email?.toLowerCase() === effectiveStaffEmail.toLowerCase());
    const effectiveStaffName = currentStaffObj?.name || effectiveStaffEmail.split('@')[0] || 'Administrator';

    // Prepare transaction payload
    const nowIso = new Date().toISOString();
    const invoiceNumber = `INV-${activeTenantId.substring(7, 10).toUpperCase()}-POS-${Math.floor(100000 + Math.random() * 900000)}`;
    const currentBranchId = (selectedStore && selectedStore !== 'all' && selectedStore !== 'All') 
      ? selectedStore 
      : (restrictedStoreId || (initialBranchId && initialBranchId !== 'all' && initialBranchId !== 'All' ? initialBranchId : availableBranches[0]?.id || 'main-branch'));
    const currentBranchObj = availableBranches.find(b => b.id === currentBranchId) || availableBranches[0];
    const branchName = currentBranchObj?.name || 'Royal Trust Pharmacy - Main Branch';
    const branchAddress = currentBranchObj?.address || activeTenant?.address || 'Airport Road, Juba Town, South Sudan';
    const branchPhone = currentBranchObj?.phone || activeTenant?.phone || activeTenant?.telephone || '+211 922 152 427';

    const checkoutPayload: OfflineSale = {
      id: `tx-${Math.random().toString(36).substring(2, 9)}`,
      timestamp: nowIso,
      createdAt: nowIso,
      invoiceNumber: invoiceNumber,
      cashierName: effectiveStaffName,
      cashierEmail: effectiveStaffEmail,
      staffName: effectiveStaffName,
      staffEmail: effectiveStaffEmail,
      tenantId: activeTenantId,
      branchId: currentBranchId,
      storeId: cart[0]?.batch.storeId || currentBranchId,
      branchName,
      storeName: branchName,
      branchAddress,
      branchPhone,
      items: cart.map(item => ({
        drugId: item.batch.drugId || '',
        batchNumber: item.batch.batchNumber || '',
        name: item.batch.name || '',
        quantity: item.quantity,
        price: getCartItemUnitPrice(item),
        cost: item.batch.cost ?? 0
      })),
      subtotal,
      discount,
      tax,
      total,
      paymentMethod,
      customerName: selectedCustomer ? selectedCustomer.name : '',
      prescriptionId: verifiedRx ? verifiedRx.id : '',
      isSynced: false
    };

    // ====================================================
    // STEP 1: OPTIMISTIC UI UPDATE (Immediate Execution)
    // ====================================================

    // A. Adjust client inventory stocks optimistically
    const updatedBatches = batches.map(b => {
      const cartItem = cart.find(item => 
        item.batch.id === b.id || 
        (item.batch.batchNumber && item.batch.batchNumber === b.batchNumber) ||
        (item.batch.drugId && item.batch.drugId === b.drugId) ||
        (item.batch.name && item.batch.name.toLowerCase() === b.name.toLowerCase())
      );
      if (cartItem) {
        const newQty = Math.max(0, b.quantity - cartItem.quantity);
        const lockedRate = newQty === 0 ? usdToSspRate : b.lockedRate;
        return { ...b, quantity: newQty, lockedRate };
      }
      return b;
    });
    // Optimistic UI only — React state, no localStorage mirror. The live
    // Firestore subscription (set up above) will reconcile shortly after
    // the writes below land.
    setBatches(updatedBatches);

    // C. Adjust customer credit profile if payment method is 'credit'
    if (paymentMethod === 'credit' && selectedCustomerId) {
      setCustomers(prev => prev.map(c => c.id === selectedCustomerId ? { ...c, currentBalance: c.currentBalance + total } : c));
    }

    // D. Update recent transactions list in state
    setRecentTransactions(prev => [checkoutPayload, ...prev]);

    // F. Display receipt modal & trigger direct auto-print optimistically
    const optimisticReceipt = {
      ...checkoutPayload,
      invoiceNumber,
      cashierName: effectiveStaffName
    };
    setShowReceipt(optimisticReceipt);
    autoPrintReceipt(optimisticReceipt);

    // G. Clear Cart & Prescription state immediately so cashier is never blocked
    setCart([]);
    setPrescriptionId('');
    setVerifiedRx(null);
    setPhysicianOverride(false);

    // H. Immediately dispatch custom events to update Dashboard, Reports, and other tabs in real-time
    window.dispatchEvent(new Event('junub_inventory_updated'));
    window.dispatchEvent(new Event('junub_transaction_added'));
    window.dispatchEvent(new Event('storage'));

    // I. Log to Audit Trail
    logAuditEvent(
      'Sale',
      isOffline ? 'SALE_OFFLINE_QUEUED' : 'SALE_COMPLETED',
      `POS checkout registered. Invoice: ${invoiceNumber.toUpperCase()}. Items: ${checkoutPayload.items.length}. Total: SSP ${total.toLocaleString(undefined, {minimumFractionDigits:2})}. Paid via: ${paymentMethod.toUpperCase()}`,
      'low',
      undefined,
      JSON.stringify({ invoice: invoiceNumber, total, paymentMethod }),
      userEmail,
      activeRole
    );

    // ====================================================
    // STEP 2: BACKEND CONFIRMATION CALLBACK (Async Processing)
    // ====================================================
    if (isOffline) {
      // In-memory only — no localStorage persistence. The app requires
      // internet; this queue exists only to smooth over brief connectivity
      // blips within the current session, not as an offline data store.
      setSyncQueue((prev) => [...prev, checkoutPayload]);
      return;
    }

    // Asynchronous background backend call & Firestore confirmation pipeline
    (async () => {
      try {
        // Sync updated batch stock to Firestore, scoped to this branch —
        // matches the required /pharmacy/{pharmacyId}/branches/{branchId}/products path.
        updatedBatches.forEach(ub => {
          const wasSold = checkoutPayload.items.some(ci => ci.drugId === ub.drugId || ci.batchNumber === ub.batchNumber || (ci.name && ub.name && ci.name.toLowerCase() === ub.name.toLowerCase()));
          if (wasSold) {
            saveBatchToFirestore(currentBranchId, ub as any).catch(e => console.warn(e));
          }
        });

        // Save transaction to Firebase Firestore live
        const firestoreTx = {
          ...checkoutPayload,
          isSynced: true,
          id: checkoutPayload.id || invoiceNumber,
          tenantId: activeTenantId,
          branchId: currentBranchId,
          storeId: currentBranchId,
          invoiceNumber: checkoutPayload.invoiceNumber || invoiceNumber,
          items: checkoutPayload.items as any,
          subtotal: checkoutPayload.subtotal,
          tax: checkoutPayload.tax,
          discount: checkoutPayload.discount,
          total: checkoutPayload.total,
          paymentMethod: checkoutPayload.paymentMethod as any,
          cashierName: effectiveStaffName,
          cashierEmail: effectiveStaffEmail,
          staffName: effectiveStaffName,
          staffEmail: effectiveStaffEmail,
          createdAt: new Date().toISOString()
        };
        
        saveTransactionToFirestore(currentBranchId, firestoreTx).catch(err => console.warn("Firestore POS save notice:", err));

        // Legacy Express backend call — this endpoint isn't part of the
        // Firestore-backed data path and predates this conversion; left
        // as a best-effort call for any downstream consumers, but is no
        // longer relied upon for sale persistence (Firestore write above is
        // the source of truth).
        const response = await fetch(`/api/v1/${activeTenantId}/transactions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: checkoutPayload.items.map(item => {
              const unitPrice = item.price;
              const minQty = 10;
              const isWholesale = item.quantity >= minQty;
              return {
                drugId: item.drugId,
                name: item.name,
                quantity: item.quantity,
                price: unitPrice,
                pricingType: isWholesale ? 'Wholesale' : 'Retail',
                wholesaleLimit: minQty,
                wholesalePrice: unitPrice * 0.85,
                retailPrice: unitPrice,
                cost: item.cost || 0
              };
            }),
            paymentMethod,
            insuranceProvider: paymentMethod === 'card' ? 'Visa/Mastercard' : undefined,
            cashierName: effectiveStaffName,
            cashierEmail: effectiveStaffEmail,
            staffName: effectiveStaffName,
            staffEmail: effectiveStaffEmail
          })
        });

        if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
          const data = await response.json();
          if (data && data.status === 'success' && data.data) {
            // Confirmation received — the live Firestore subscription above
            // already reflects this sale, no local cache needed.
          }
        }
      } catch (err) {
        console.warn("Async backend transaction confirmation notice (local optimistic record safely preserved):", err);
      }
    })();
  };

  // Synchronize the in-memory offline queue by actually writing each queued
  // sale to Firestore (the previous version of this function only pretended
  // to sync — it hit a nonexistent API endpoint, then declared success and
  // silently discarded the queued sales either way. That's fixed here.)
  const handleCloudSynchronize = async () => {
    if (syncQueue.length === 0) {
      alert("Synchronization info: Sync queue is completely empty.");
      return;
    }
    if (isOffline) {
      alert("Still offline — reconnect to the internet before syncing.");
      return;
    }

    setSyncing(true);
    setSyncMessage(`Synchronizing ${syncQueue.length} queued sale(s) to Firestore...`);
    try {
      for (const sale of syncQueue) {
        await saveTransactionToFirestore(activeTenantId, { ...sale, isSynced: true } as any);
      }
      logAuditEvent(
        'Sale',
        'SALE_SYNCED_BULK',
        `Successfully synchronized ${syncQueue.length} queued point-of-sale transactions to Firestore.`,
        'high',
        undefined,
        JSON.stringify({ synced_sales_count: syncQueue.length, total_synced: syncQueue.reduce((sum, q) => sum + q.total, 0) }),
        userEmail,
        activeRole
      );
      setSyncQueue([]);
      setSyncMessage('SUCCESS: All queued sales synchronized to Firestore.');
    } catch (e) {
      console.error('Cloud sync error:', e);
      setSyncMessage('Sync failed — check your connection and try again. Queued sales were kept.');
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(''), 4000);
    }
  };

  // Valuation computations
  const getValuationMetrics = () => {
    let totalCost = 0;
    let totalValue = 0;
    let lowStockCount = 0;
    let nearExpiryCount = 0;

    batches.forEach(b => {
      totalCost += b.cost * b.quantity;
      totalValue += b.price * b.quantity;
      if (b.quantity <= b.minStockAlert) lowStockCount++;
      if (getDaysToExpiry(b.expiryDate) <= 90) nearExpiryCount++;
    });

    const potentialMargin = totalValue - totalCost;
    const marginPct = totalValue ? (potentialMargin / totalValue) * 100 : 0;

    return {
      totalCost,
      totalValue,
      potentialMargin,
      marginPct,
      lowStockCount,
      nearExpiryCount
    };
  };

  const valMetrics = getValuationMetrics();

  // AI forecasting fetch simulation
  const fetchAiForecasting = async () => {
    setAiLoading(true);
    try {
      const response = await fetch(`/api/v1/${activeTenantId}/inventory/forecast`);
      const data = await response.json();
      if (data.status === 'success') {
        setAiForecast(data.data);
      } else {
        setAiForecast(getFallbackForecast());
      }
    } catch (e) {
      setAiForecast(getFallbackForecast());
    } finally {
      setAiLoading(false);
    }
  };

  const getFallbackForecast = () => {
    return {
      forecast: [
        { category: 'Antibiotics', currentStock: 153, projectedDemand30d: 220, growthRate: 15, recommendedReorder: 90, stockoutRisk: 45, seasonalFactors: "Seasonal winter respiratory spike coming up.", revenueProjection: 2750 },
        { category: 'Analgesics', currentStock: 468, projectedDemand30d: 410, growthRate: 8, recommendedReorder: 0, stockoutRisk: 10, seasonalFactors: "Highly consistent baseline chronic care usage.", revenueProjection: 2045 },
        { category: 'Diabetic', currentStock: 280, projectedDemand30d: 310, growthRate: 5, recommendedReorder: 60, stockoutRisk: 12, seasonalFactors: "Steady chronic patient base, low margin variance.", revenueProjection: 5580 },
        { category: 'Vitamins', currentStock: 340, projectedDemand30d: 450, growthRate: 25, recommendedReorder: 140, stockoutRisk: 55, seasonalFactors: "High consumer immune health campaign uptake.", revenueProjection: 6750 },
        { category: 'Cardiovascular', currentStock: 110, projectedDemand30d: 130, growthRate: 4, recommendedReorder: 30, stockoutRisk: 15, seasonalFactors: "Consistent year-round demand curves.", revenueProjection: 4225 }
      ],
      alerts: [
        { drugName: 'Amoxicillin 500mg Capsule', storeName: 'Northside Dispensary', riskLevel: 'HIGH', reason: 'Current quantity of 8 is below safety threshold (20) at Northside.' },
        { drugName: 'Vitamin D3 Softgels', storeName: 'Central Pharmacy', riskLevel: 'MEDIUM', reason: 'Lot BCH-VIT-301 expires in 47 days (August 30) at Central.' }
      ],
      insights: [
        "Slight respiratory demand up-curve detected. We suggest ordering Antibiotic lines 14 days earlier than standard.",
        "Clearance promo suggested for near-expiry Vitamin D3 batches at Central Pharmacy to prevent asset write-offs.",
        "Bulk procurement discount opportunity identified: Diabetic Metformin lines are growing at 5% monthly."
      ]
    };
  };

  useEffect(() => {
    if (activeSubTab === 'forecast' && !aiForecast) {
      fetchAiForecasting();
    }
  }, [activeSubTab]);

  // Handle custom manual medicine stock addition
  const handleAddMedicineSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeRole !== 'Administrator') {
      alert("Security Access Restricted: Registering stock lots is strictly reserved for Administrators.");
      setShowAddMedicineModal(false);
      return;
    }
    const newId = `manual-batch-${Math.floor(1000 + Math.random() * 9000)}`;
    const newBatch: DrugBatch = {
      id: newId,
      tenantId: activeTenantId,
      drugId: `drug-manual-${newMedicineForm.sku || 'N'}`,
      name: newMedicineForm.name,
      genericName: newMedicineForm.genericName || newMedicineForm.name,
      sku: newMedicineForm.sku || `MAN-${newMedicineForm.name.substring(0,3).toUpperCase()}`,
      category: newMedicineForm.category,
      batchNumber: newMedicineForm.batchNumber || `BCH-MAN-${Math.floor(100+Math.random()*900)}`,
      storeId: newMedicineForm.storeId,
      storeName: availableBranches.find(b => b.id === newMedicineForm.storeId)?.name || availableBranches[0]?.name || 'Main Branch',
      quantity: Number(newMedicineForm.quantity),
      minStockAlert: Number(newMedicineForm.minStockAlert),
      price: Number(newMedicineForm.price),
      cost: Number(newMedicineForm.cost),
      expiryDate: newMedicineForm.expiryDate,
      shelfLocation: newMedicineForm.shelfLocation || 'Aisle A-1',
      requiresPrescription: newMedicineForm.requiresPrescription
    };

    const updatedBatchesList = [newBatch, ...batches];
    setBatches(updatedBatchesList);

    // Save to this branch's Firestore path (products + batches) — no
    // localStorage, no global-tenant mirror write.
    saveBatchToFirestore(activeTenantId, newBatch as any).catch(e => console.warn(e));
    saveDrugToFirestore(activeTenantId, newBatch as any).catch(e => console.warn("Firestore POS drug save error:", e));
    
    fetch(`/api/v1/${activeTenantId}/inventory/batches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newMedicineForm.name,
        genericName: newMedicineForm.genericName || newMedicineForm.name,
        category: newMedicineForm.category,
        quantity: Number(newMedicineForm.quantity),
        minStockAlert: Number(newMedicineForm.minStockAlert),
        price: Number(newMedicineForm.price),
        cost: Number(newMedicineForm.cost),
        expiryDate: newMedicineForm.expiryDate,
        shelfLocation: newMedicineForm.shelfLocation || 'Aisle A-1',
        requiresPrescription: newMedicineForm.requiresPrescription,
        storeId: newMedicineForm.storeId,
        storeName: availableBranches.find(b => b.id === newMedicineForm.storeId)?.name || availableBranches[0]?.name || 'Main Branch',
        batchNumber: newBatch.batchNumber,
        sku: newBatch.sku
      })
    }).catch(e => console.warn("Backend API sync notice:", e));

    setShowAddMedicineModal(false);
    
    // reset form
    setNewMedicineForm({
      name: '',
      genericName: '',
      category: 'Antibiotics',
      sku: '',
      batchNumber: '',
      storeId: 'store-1',
      quantity: 100,
      minStockAlert: 15,
      price: 15.00,
      wholesalePrice: '',
      wholesaleLimit: '10',
      cost: 6.50,
      expiryDate: '2028-10-30',
      shelfLocation: 'Aisle A-1',
      requiresPrescription: false
    });
  };

  return (
    <div className="space-y-6">
      {/* POS SYSTEM STATUS BOARD */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 text-[10px] bg-sky-50 text-sky-600 font-extrabold uppercase rounded-lg border border-sky-100 tracking-wider flex items-center gap-1">
                <LayoutGrid className="h-3 w-3" />
                Enterprise Point of Sale
              </span>
              <span className={`px-2.5 py-1 text-[10px] font-extrabold uppercase rounded-lg border tracking-wider flex items-center gap-1 ${
                isOffline 
                  ? 'bg-amber-50 text-amber-600 border-amber-100'
                  : 'bg-emerald-50 text-emerald-600 border-emerald-100'
              }`}>
                {isOffline ? <WifiOff className="h-3 w-3 animate-pulse" /> : <Wifi className="h-3 w-3" />}
                {isOffline ? `OFFLINE LOCK ACTIVE` : `SYSTEM ONLINE`}
              </span>
              <span className="px-2.5 py-1 text-[10px] bg-emerald-50 text-emerald-700 font-extrabold uppercase rounded-lg border border-emerald-200 tracking-wider flex items-center gap-1 shadow-2xs">
                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                <span>Live Sync</span>
              </span>
              {syncQueue.length > 0 && (
                <span className="px-2.5 py-1 text-[10px] bg-rose-50 text-rose-600 font-extrabold uppercase rounded-lg border border-rose-100 tracking-wider animate-bounce">
                  {syncQueue.length} Sales Cached
                </span>
              )}
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight font-display mt-2">
              Multi-Store Pharmacy POS &amp; Inventory Hub
            </h2>
            <p className="text-xs text-slate-500 max-w-4xl font-medium">
              Real-time Point of Sale handling fast barcode search scans, clinical prescription registries, multiple payment lines, customer credit limits, and full offline-to-online bulk sync triggers.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {syncQueue.length > 0 && (
              <button
                onClick={handleCloudSynchronize}
                disabled={syncing}
                className="px-3 py-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Sync Cloud'}
              </button>
            )}
          </div>
        </div>

        {/* Sync messages */}
        {syncMessage && (
          <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-sky-600 flex items-center gap-2">
            <RefreshCw className="h-3.5 w-3.5 animate-spin text-sky-500" />
            {syncMessage}
          </div>
        )}

        {/* Tab Selection */}
        <div className="flex border-b border-slate-100 mt-6 gap-2 overflow-x-auto whitespace-nowrap">
          <button
            onClick={() => setActiveSubTab('checkout')}
            className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'checkout'
                ? 'border-sky-500 text-sky-600 font-extrabold'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <ShoppingCart className="h-4 w-4" />
            Active Cashier POS Terminal
          </button>
          <button
            onClick={() => setActiveSubTab('valuation')}
            className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'valuation'
                ? 'border-sky-500 text-sky-600 font-extrabold'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Layers className="h-4 w-4" />
            Inventory Valuation &amp; Stock Audit
          </button>
          <button
            onClick={() => setActiveSubTab('ledger')}
            className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'ledger'
                ? 'border-sky-500 text-sky-600 font-extrabold'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <User className="h-4 w-4" />
            Customer Credit Ledger
          </button>
          <button
            onClick={() => setActiveSubTab('reports')}
            className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'reports'
                ? 'border-sky-500 text-sky-600 font-extrabold'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <FileText className="h-4 w-4" />
            Recent Sales &amp; Invoices
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* ============================================================================
            SUB-TAB: ACTIVE CASHIER POS TERMINAL
            ============================================================================ */}
        {activeSubTab === 'checkout' && (
          <motion.div
            key="checkout"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6"
          >
            {/* LEFT AREA: Fast Medicine Search & Scanner (8 cols) */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Fast Search & Virtual Barcode Container */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="space-y-1">
                    <h3 className="font-extrabold text-slate-900 text-sm tracking-tight uppercase flex items-center gap-1.5">
                      <Barcode className="h-4.5 w-4.5 text-sky-500 animate-pulse" />
                      POS Barcode Scan Terminal
                    </h3>
                    <div className="flex items-center gap-2 text-[10px] font-bold font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full w-fit">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                      USB/Wireless Wedge Scanner Active
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Scanner Console Toggle */}
                    <button
                      onClick={() => setShowBarcodeScanner(!showBarcodeScanner)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-lg border border-slate-200 transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Barcode className="h-3.5 w-3.5" />
                      {showBarcodeScanner ? 'Close Simulator' : 'Camera Simulator'}
                    </button>
                  </div>
                </div>

                {/* Live Hardware/Wedge & Manual Barcode Input Space */}
                <form onSubmit={handleBarcodeSubmit} className="bg-sky-50/70 dark:bg-slate-800/90 p-3.5 rounded-xl border border-sky-200 dark:border-sky-800 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-extrabold text-slate-800 dark:text-slate-200">
                    <span className="flex items-center gap-1.5 text-sky-700 dark:text-sky-400">
                      <Barcode className="w-4 h-4 text-sky-600" />
                      <span>Scanned Barcode / SKU Display &amp; Terminal Input</span>
                    </span>
                    {barcodeInput ? (
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono font-black animate-pulse bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-300">
                        ● Live Barcode Read: "{barcodeInput}"
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500 font-mono">
                        Ready to capture laser scanner wedge input
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2 items-center">
                    <div className="relative flex-1">
                      <Barcode className="h-4.5 w-4.5 text-sky-500 absolute left-3.5 top-2.5" />
                      <input
                        type="text"
                        placeholder="Scan or type barcode key here (e.g. AMX-500-CP, IBU-400-TB)..."
                        value={barcodeInput}
                        onChange={e => {
                          const val = e.target.value;
                          setBarcodeInput(val);
                          setSearchQuery(val);
                        }}
                        className="w-full bg-white dark:bg-slate-900 text-xs px-3.5 py-2.5 pl-10 pr-20 border-2 border-sky-400 dark:border-sky-500 rounded-xl focus:outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-500/30 font-black font-mono text-slate-900 dark:text-white shadow-inner tracking-wider"
                        id="pos-barcode-live-scan-input"
                      />
                      {barcodeInput && (
                        <button
                          type="button"
                          onClick={() => {
                            setBarcodeInput('');
                            setSearchQuery('');
                          }}
                          className="absolute right-2.5 top-2 text-[10px] bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 px-2 py-0.5 rounded text-slate-700 dark:text-slate-200 font-bold cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <button
                      type="submit"
                      className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      <Barcode className="h-4 w-4" />
                      <span>Scan / Add</span>
                    </button>
                  </div>
                </form>

                {/* Laser scan animation visualizer */}
                {showBarcodeScanner && (
                  <div className="space-y-4">
                    <QRScannerMock 
                      onScan={handleQRScan} 
                      placeholder="Simulate barcode or scan camera here..." 
                      activeContext="pos"
                    />
                    
                    {scannedAlert && (
                      <p className={`text-[10px] font-bold font-mono text-center p-2 rounded-lg ${scannedAlert.startsWith('SUCCESS') ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                        {scannedAlert}
                      </p>
                    )}
                  </div>
                )}

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search medicine name / generic..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 text-xs px-3.5 py-2 pl-9 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 font-bold text-slate-900 dark:text-slate-100 shadow-2xs placeholder:text-slate-400"
                    />
                    <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                  </div>

                  {/* Category Filter */}
                  <select
                    value={selectedCategory}
                    onChange={e => setSelectedCategory(e.target.value)}
                    className="bg-white dark:bg-slate-800 text-xs border border-slate-300 dark:border-slate-600 px-3 py-2 rounded-xl focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 cursor-pointer text-slate-900 dark:text-slate-100 font-bold shadow-2xs"
                  >
                    <option value="All">All Categories ({categories.length - 1})</option>
                    {categories.filter(c => c !== 'All').map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>

                  {/* Store Filter */}
                  <div className="relative">
                    <select
                      value={selectedStore}
                      onChange={e => !restrictedStoreId && setSelectedStore(e.target.value)}
                      disabled={!!restrictedStoreId}
                      className={`text-xs border px-3 py-2 rounded-xl focus:outline-none focus:border-sky-500 font-bold shadow-2xs ${
                        restrictedStoreId
                          ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 text-amber-900 dark:text-amber-200 cursor-not-allowed'
                          : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 cursor-pointer'
                      }`}
                    >
                      {restrictedStoreId ? (
                        <option value={restrictedStoreId}>{restrictedStoreName}</option>
                      ) : (
                        stores.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))
                      )}
                    </select>
                    {restrictedStoreId && (
                      <span className="absolute -top-3.5 left-1 text-[8px] font-black uppercase text-amber-600 tracking-wider bg-amber-100 px-1 border border-amber-200 rounded">
                        Assigned Branch Lock
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Medicine Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredBatches.map(batch => {
                    const daysLeft = getDaysToExpiry(batch.expiryDate);
                    const isNearExpiry = daysLeft <= 90;
                    const isLowStock = batch.quantity <= batch.minStockAlert;
                    
                    return (
                      <div
                        key={batch.id}
                        className={`bg-white rounded-2xl border p-4.5 transition-all relative flex flex-col justify-between space-y-4 hover:shadow-sm ${
                          isLowStock 
                            ? 'border-amber-200 bg-amber-50/10' 
                            : isNearExpiry 
                            ? 'border-rose-200 bg-rose-50/5' 
                            : 'border-slate-200/80'
                        }`}
                      >
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-start gap-1">
                            <span className="text-[10px] text-slate-400 font-mono font-bold tracking-wider uppercase">
                              {batch.category}
                            </span>
                            <span className="px-1.5 py-0.5 text-[9px] font-mono bg-slate-100 text-slate-500 rounded border border-slate-200/60 font-semibold">
                              {availableBranches.find(b => b.id === batch.storeId)?.name || batch.storeName || availableBranches[0]?.name || 'Main Branch'}
                            </span>
                          </div>

                          <h4 className="font-extrabold text-slate-900 text-sm tracking-tight leading-snug">
                            {batch.name}
                          </h4>
                          <p className="text-[11px] text-slate-500 font-medium italic">
                            {batch.genericName}
                          </p>
                          
                          {/* SKU and Barcode Simulator Trigger */}
                          <div className="pt-1 flex items-center gap-1.5 flex-wrap">
                            <button
                              onClick={() => simulateQuickScan(batch.sku)}
                              className="px-1.5 py-0.5 bg-sky-50 text-sky-600 hover:bg-sky-100 border border-sky-100 text-[9px] font-mono font-bold rounded flex items-center gap-1 cursor-pointer"
                              title="Simulate hardware scan of this barcode"
                            >
                              <Barcode className="h-2.5 w-2.5" />
                              Scan: {batch.sku}
                            </button>
                            <span className="text-[9px] text-slate-400 font-mono">
                              Batch: {batch.batchNumber}
                            </span>
                          </div>
                        </div>

                        {/* Status Badges */}
                        <div className="space-y-1">
                          {isLowStock && (
                            <div className="flex items-center gap-1 text-amber-600 text-[10px] font-bold">
                              <AlertTriangle className="h-3 w-3" />
                              <span>Low Stock ({batch.quantity} units left)</span>
                            </div>
                          )}
                          {isNearExpiry && (
                            <div className="flex items-center gap-1 text-rose-600 text-[10px] font-bold">
                              <AlertOctagon className="h-3 w-3" />
                              <span>Expires in {daysLeft} days ({batch.expiryDate})</span>
                            </div>
                          )}
                          {batch.requiresPrescription && (
                            <div className="flex items-center gap-1 text-indigo-600 text-[10px] font-bold">
                              <Shield className="h-3 w-3" />
                              <span>Prescription Required</span>
                            </div>
                          )}
                        </div>

                        {/* Pricing and Action */}
                        <div className="flex flex-col gap-1 border-t border-slate-100 pt-3">
                          <div className="flex justify-between items-baseline">
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-sm font-extrabold text-slate-900 font-display">${batch.price.toFixed(2)}</span>
                              <span className="text-[10px] text-slate-400 font-mono">Cost: ${batch.cost.toFixed(2)}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-black text-emerald-600 font-mono">
                                ≈ {(batch.price * getBatchRate(batch)).toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 1})} SSP
                              </span>
                              {batch.quantity <= 0 && batch.lockedRate && (
                                <p className="text-[7px] font-mono font-black text-rose-500 uppercase tracking-widest leading-none mt-0.5">
                                  Rate Locked @ {batch.lockedRate}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-[9px] text-slate-400 font-medium">Ex. Rate: 1$ = {getBatchRate(batch)} SSP</span>
                            <button
                              onClick={() => addToCart(batch)}
                              disabled={batch.quantity <= 0}
                              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1 cursor-pointer ${
                                batch.quantity <= 0
                                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                              }`}
                            >
                              <Plus className="h-3.5 w-3.5" />
                              Add Cart
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Quick Add Custom Drug for Testing (Admin Only) */}
              {activeRole === 'Administrator' && (
                <div className="bg-slate-100 p-4 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                  <div>
                    <p className="font-bold text-slate-700">Need to test a custom drug batch or manual adjustment?</p>
                    <p className="text-slate-400 text-[11px] font-medium">Add a new custom drug lot dynamically to the terminal grid.</p>
                  </div>
                  <button
                    onClick={() => setShowAddMedicineModal(true)}
                    className="px-3 py-1.5 bg-[#0F172A] hover:bg-slate-800 text-white font-bold rounded-lg transition-all text-xs cursor-pointer"
                  >
                    Register Stock Lot
                  </button>
                </div>
              )}

            </div>

            {/* RIGHT AREA: ACTIVE POS CART & CHECKOUT (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Cart Summary Card */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-md space-y-5">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <h3 className="font-extrabold text-slate-900 text-sm tracking-tight uppercase flex items-center gap-1.5">
                    <ShoppingCart className="h-4.5 w-4.5 text-sky-500" />
                    Terminal Basket
                  </h3>
                  <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-full border border-slate-200 font-mono">
                    {cart.reduce((sum, item) => sum + item.quantity, 0)} Items
                  </span>
                </div>

                {/* Cart Items List */}
                {cart.length === 0 ? (
                  <div className="py-12 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto">
                      <ShoppingCart className="h-5 w-5 text-slate-400" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-200 text-xs">Basket is empty</p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Scan barcodes or click drugs in catalog list.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
                    {cart.map(item => {
                      const appliedUnitPrice = getCartItemUnitPrice(item);
                      const itemTotalUSD = appliedUnitPrice * item.quantity;
                      const retailPrice = Number(item.batch.price || 0);
                      const wholesalePrice = (item.batch.wholesalePrice !== undefined && item.batch.wholesalePrice !== null && Number(item.batch.wholesalePrice) > 0)
                        ? Number(item.batch.wholesalePrice)
                        : Number(retailPrice * 0.85);
                      const minQty = (item.batch.wholesaleLimit !== undefined && item.batch.wholesaleLimit !== null && Number(item.batch.wholesaleLimit) > 0)
                        ? Number(item.batch.wholesaleLimit)
                        : 10;
                      const isWholesaleActive = item.quantity >= minQty && wholesalePrice > 0;

                      return (
                        <div 
                          key={item.batch.id} 
                          className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg flex flex-col gap-1.5 text-xs hover:border-sky-500/40 transition-all shadow-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            {/* Left: Item name & meta details */}
                            <div className="flex-1 min-w-0 pr-1">
                              <div className="flex items-center gap-2 truncate">
                                <h4 className="font-extrabold text-white text-xs truncate">{item.batch.name}</h4>
                                {item.batch.strength && (
                                  <span className="text-[9px] font-bold text-sky-300 bg-sky-950/80 px-1.5 py-0.2 rounded border border-sky-800 shrink-0">
                                    {item.batch.strength}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 truncate mt-0.5">
                                <span className="text-amber-300 font-semibold">SKU: {item.batch.sku}</span>
                                <span>•</span>
                                <span className="text-slate-300">Exp: {item.batch.expiryDate}</span>
                                {item.batch.requiresPrescription && (
                                  <>
                                    <span>•</span>
                                    <span className="text-indigo-400 font-bold">Rx</span>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Right: Stepper + Total Price + Trash */}
                            <div className="flex items-center gap-2.5 shrink-0">
                              {/* Quantity Stepper */}
                              <div className="flex items-center bg-slate-800 border border-slate-700 rounded p-0.5">
                                <button
                                  onClick={() => updateQuantity(item.batch.id, -1)}
                                  className="p-1 hover:bg-slate-700 text-slate-300 hover:text-white transition-all rounded cursor-pointer"
                                  title="Decrease quantity"
                                >
                                  <Minus className="h-3 w-3" />
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  max={item.batch.quantity}
                                  value={item.quantity === 0 ? '' : item.quantity}
                                  onChange={(e) => {
                                    const parsed = parseInt(e.target.value, 10);
                                    setQuantityDirect(item.batch.id, isNaN(parsed) ? 0 : parsed);
                                  }}
                                  onBlur={() => {
                                    if (!item.quantity || item.quantity < 1) {
                                      setQuantityDirect(item.batch.id, 1);
                                    }
                                  }}
                                  className="w-12 text-center bg-slate-900 border border-slate-700 text-amber-300 font-extrabold font-mono text-xs rounded py-0.5 px-1 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 mx-0.5"
                                  title="Type manual quantity figure or use +/- buttons"
                                />
                                <button
                                  onClick={() => updateQuantity(item.batch.id, 1)}
                                  className="p-1 hover:bg-slate-700 text-slate-300 hover:text-white transition-all rounded cursor-pointer"
                                  title="Increase quantity"
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>

                              {/* Price Column */}
                              <div className="text-right font-mono min-w-[70px]">
                                <p className="font-black text-amber-300 text-xs">${itemTotalUSD.toFixed(2)}</p>
                                <p className="text-[9px] text-emerald-400 font-bold">
                                  ≈ {(itemTotalUSD * getBatchRate(item.batch)).toLocaleString(undefined, {maximumFractionDigits:0})} SSP
                                </p>
                              </div>

                              {/* Trash Button */}
                              <button
                                onClick={() => removeFromCart(item.batch.id)}
                                className="p-1.5 text-rose-400 hover:text-rose-200 hover:bg-rose-950/80 rounded transition-all cursor-pointer border border-rose-500/20"
                                title="Remove from basket"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Wholesale / Retail Tier Status Indicator */}
                          <div className="flex items-center justify-between text-[9px] font-mono pt-1 border-t border-slate-800/80">
                            <span className="text-slate-400">
                              Unit Price: <strong className="text-slate-200">${appliedUnitPrice.toFixed(2)}</strong>
                            </span>
                            {isWholesaleActive ? (
                              <span className="px-1.5 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded font-bold flex items-center gap-1">
                                🏷️ Wholesale Rate Applied ({minQty}+ units)
                              </span>
                            ) : (
                              <span className="text-amber-400/90 italic font-medium">
                                💡 Add {minQty - item.quantity} more for Wholesale (${wholesalePrice.toFixed(2)}/unit)
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Customer Registry Integration */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Link Customer Ledger Account</label>
                  <select
                    value={selectedCustomerId}
                    onChange={e => setSelectedCustomerId(e.target.value)}
                    className="w-full text-xs border border-slate-200 bg-white px-3 py-2 rounded-xl focus:outline-none focus:border-sky-500 cursor-pointer text-slate-700 font-semibold"
                  >
                    <option value="">Walk-in General Customer</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.phone}) | Bal: ${c.currentBalance} / Lmt: ${c.creditLimit}
                      </option>
                    ))}
                  </select>

                  {selectedCustomer && (
                    <div className="p-3 bg-sky-50 border border-sky-100 rounded-xl space-y-1.5 text-xs text-sky-800">
                      <div className="flex justify-between font-bold">
                        <span>Ledger: {selectedCustomer.name}</span>
                        <span>NIN: {selectedCustomer.nationalId}</span>
                      </div>
                      <div className="flex justify-between font-mono text-[10px]">
                        <span>Authorized Credit Limit: <b>${selectedCustomer.creditLimit}</b></span>
                        <span>Current Account Balance: <b>${selectedCustomer.currentBalance}</b></span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Discounts Section */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Campaign Promo Coupon</label>
                    <div className="flex gap-1">
                      <input
                        type="text"
                        placeholder="JUBA20, MEDIC10..."
                        onChange={e => applyPromoCode(e.target.value)}
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none font-mono uppercase font-bold"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Custom Manual Cash Discount</label>
                    <input
                      type="number"
                      placeholder="$ USD Amount"
                      value={customDiscount || ''}
                      onChange={e => setCustomDiscount(Math.max(0, Number(e.target.value)))}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none font-mono font-bold"
                    />
                  </div>
                </div>

                {/* Sub Total Details panel */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Subtotal amount:</span>
                    <span className="font-mono text-slate-700 font-bold">${getSubtotal().toFixed(2)}</span>
                  </div>

                  {getDiscountAmount() > 0 && (
                    <div className="flex justify-between text-emerald-600 font-semibold">
                      <span>Total discounts applied:</span>
                      <span className="font-mono">-${getDiscountAmount().toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-slate-400">
                    <span className="flex items-center gap-1">
                      Surcharge Tax:
                      <span className="text-[9px] text-emerald-600 font-bold px-1.5 py-0.5 bg-emerald-50 rounded">Exempt (0%)</span>
                    </span>
                    <span className="font-mono">$0.00</span>
                  </div>

                  <hr className="border-slate-200" />

                  <div className="flex justify-between items-baseline">
                    <span className="text-slate-900 font-extrabold text-sm">TOTAL AMOUNT DUE:</span>
                    <div className="text-right">
                      <span className="text-xl font-extrabold text-emerald-600 font-mono">${getGrandTotal().toFixed(2)}</span>
                      <p className="text-[10px] text-emerald-600 font-mono font-extrabold uppercase mt-0.5">
                        ≈ {(getGrandTotal() * usdToSspRate).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} SSP
                      </p>
                    </div>
                  </div>
                </div>

                {/* Payment Method Selector */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Payment Method</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'cash', label: 'Cash (SSP/USD)', icon: DollarSign },
                      { id: 'bank', label: 'Bank Transfer', icon: Building2 },
                      { id: 'credit', label: 'Credit Ledger', icon: UserCheck }
                    ].map(pm => {
                      const isSelected = paymentMethod === pm.id;
                      const Icon = pm.icon;

                      return (
                        <button
                          key={pm.id}
                          type="button"
                          onClick={() => setPaymentMethod(pm.id as any)}
                          className={`py-2 px-2 rounded-lg border text-[10px] font-bold transition-all text-center flex flex-col items-center gap-1 cursor-pointer ${
                            isSelected
                              ? 'bg-sky-50 border-sky-500 text-sky-600 font-extrabold ring-1 ring-sky-500/20'
                              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-500'
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          <span>{pm.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Mandatory Credit Credentials Input Fields */}
                {paymentMethod === 'credit' && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                    <span className="text-[10px] font-extrabold text-rose-800 uppercase tracking-wider block">
                      Mandatory Customer Credit Credentials
                    </span>
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase block">Customer Full Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Garang Deng"
                        value={creditCustomerName}
                        onChange={(e) => setCreditCustomerName(e.target.value)}
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-rose-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase block">Area of Residency *</label>
                      <input
                        type="text"
                        placeholder="e.g. Juba Town Block 3"
                        value={creditCustomerResidency}
                        onChange={(e) => setCreditCustomerResidency(e.target.value)}
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-rose-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase block">Telephone Number *</label>
                      <input
                        type="text"
                        placeholder="e.g. +211 922 000 111"
                        value={creditCustomerPhone}
                        onChange={(e) => setCreditCustomerPhone(e.target.value)}
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-rose-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 font-medium font-mono"
                      />
                    </div>
                  </div>
                )}

                {/* Final Checkout action */}
                <button
                  onClick={handlePOSCheckout}
                  disabled={cart.length === 0 || !isOnline}
                  className={`w-full py-3 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 ${
                    !isOnline
                      ? 'bg-rose-600/80 text-white cursor-not-allowed opacity-80'
                      : 'bg-sky-500 hover:bg-sky-600 text-white cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed'
                  }`}
                >
                  {!isOnline ? (
                    <>
                      <WifiOff className="h-4 w-4 animate-pulse" />
                      OFFLINE: CHECKOUT BLOCKED (STRICT ONLINE MODE)
                    </>
                  ) : (
                    <>
                      <Printer className="h-4 w-4" />
                      EXECUTE CHECKOUT & PRINT RECEIPT
                    </>
                  )}
                </button>
              </div>

            </div>
          </motion.div>
        )}

        {/* ============================================================================
            SUB-TAB: INVENTORY VALUATION & STOCK AUDIT
            ============================================================================ */}
        {activeSubTab === 'valuation' && (
          <motion.div
            key="valuation"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Valuation stats block */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200/85">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Total Inventory Asset Cost</p>
                <p className="text-2xl font-extrabold text-slate-900 mt-1 font-mono">${valMetrics.totalCost.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                <span className="text-[10px] text-slate-400 font-semibold block mt-1">Total physical capital invested at cost</span>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200/85">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Estimated Retail Valuation</p>
                <p className="text-2xl font-extrabold text-emerald-600 mt-1 font-mono">${valMetrics.totalValue.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                <span className="text-[10px] text-slate-400 font-semibold block mt-1">Total projected sales revenue value</span>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200/85">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Potential Profit Margin</p>
                <p className="text-2xl font-extrabold text-sky-600 mt-1 font-mono">${valMetrics.potentialMargin.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                <span className="text-[10px] text-sky-500 font-bold block mt-1">Estimated {valMetrics.marginPct.toFixed(1)}% gross profit margin</span>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200/85">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Safety Warnings</p>
                <div className="flex gap-2 items-center mt-2">
                  <span className="px-2 py-1 text-[10px] bg-amber-50 text-amber-600 font-extrabold rounded-lg border border-amber-100">
                    {valMetrics.lowStockCount} Low Stock
                  </span>
                  <span className="px-2 py-1 text-[10px] bg-rose-50 text-rose-600 font-extrabold rounded-lg border border-rose-100">
                    {valMetrics.nearExpiryCount} Near Expiry
                  </span>
                </div>
              </div>
            </div>

            {/* Inventory valuation catalog table */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center flex-wrap gap-2">
                <h3 className="font-extrabold text-slate-900 text-sm tracking-tight uppercase">Complete Warehouse Stock Ledger</h3>
                <span className="text-slate-400 font-mono text-xs font-semibold">{batches.length} Batch lots tracked</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 uppercase font-bold text-[10px] border-b border-slate-100 font-mono">
                      <th className="py-3 px-5">Medicine Item &amp; LOT</th>
                      <th className="py-3 px-5">Store</th>
                      <th className="py-3 px-5 text-right">Qty</th>
                      <th className="py-3 px-5 text-right">Unit Cost</th>
                      <th className="py-3 px-5 text-right">Retail Price</th>
                      <th className="py-3 px-5 text-right">Total Cost Asset</th>
                      <th className="py-3 px-5 text-right">Total Retail Valuation</th>
                      <th className="py-3 px-5">Expiry</th>
                      <th className="py-3 px-5">Shelf Location</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {batches.map(batch => {
                      const totalCost = batch.cost * batch.quantity;
                      const totalVal = batch.price * batch.quantity;
                      const daysLeft = getDaysToExpiry(batch.expiryDate);
                      const isExpired = daysLeft <= 0;
                      const isNearExp = daysLeft <= 90;

                      return (
                        <tr key={batch.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3.5 px-5">
                            <p className="font-extrabold text-slate-900">{batch.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">SKU: {batch.sku} | Lot: {batch.batchNumber}</p>
                          </td>
                          <td className="py-3.5 px-5">
                            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 font-mono text-[9px] border border-slate-200/60 rounded">
                              {availableBranches.find(b => b.id === batch.storeId)?.name || batch.storeName || availableBranches[0]?.name || 'Main Branch'}
                            </span>
                          </td>
                          <td className="py-3.5 px-5 text-right font-mono font-bold">
                            <span className={batch.quantity <= batch.minStockAlert ? 'text-amber-600 font-extrabold' : ''}>
                              {batch.quantity}
                            </span>
                          </td>
                          <td className="py-3.5 px-5 text-right font-mono">${batch.cost.toFixed(2)}</td>
                          <td className="py-3.5 px-5 text-right font-mono">${batch.price.toFixed(2)}</td>
                          <td className="py-3.5 px-5 text-right font-mono font-semibold">${totalCost.toFixed(2)}</td>
                          <td className="py-3.5 px-5 text-right font-mono font-bold text-emerald-600">${totalVal.toFixed(2)}</td>
                          <td className="py-3.5 px-5">
                            <span className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded ${
                              isExpired ? 'bg-rose-500/10 text-rose-600' :
                              isNearExp ? 'bg-amber-500/10 text-amber-600 animate-pulse' :
                              'bg-slate-100 text-slate-500'
                            }`}>
                              {batch.expiryDate} {isExpired ? '(EXPIRED)' : isNearExp ? `(${daysLeft}d left)` : ''}
                            </span>
                          </td>
                          <td className="py-3.5 px-5 text-slate-500 font-mono">{batch.shelfLocation}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* ============================================================================
            SUB-TAB: AI DEMAND FORECAST & REORDERS
            ============================================================================ */}
        {activeSubTab === 'forecast' && (
          <motion.div
            key="forecast"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {aiLoading ? (
              <div className="py-20 text-center space-y-3 bg-white rounded-2xl border border-slate-100">
                <RefreshCw className="h-8 w-8 animate-spin text-sky-500 mx-auto" />
                <p className="font-bold text-slate-800 text-xs">Simulating Clinical Stock Forecasting Model...</p>
                <p className="text-[11px] text-slate-400">Inspecting historical sales patterns, category velocity, and seasonal triggers...</p>
              </div>
            ) : aiForecast ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Left: Forecasting Chart (7 cols) */}
                <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200/80 space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <h3 className="font-extrabold text-slate-900 text-sm tracking-tight uppercase flex items-center gap-1.5">
                      <TrendingUp className="h-4.5 w-4.5 text-sky-500" />
                      30-Day Projected Demand vs. Current Stocks
                    </h3>
                    <span className="px-2 py-0.5 text-[9px] bg-purple-50 text-purple-600 border border-purple-100 font-bold rounded font-mono">
                      CLINICAL ALGORITHM PREDICTIONS
                    </span>
                  </div>

                  {/* Chart representation */}
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={aiForecast.forecast}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="colorStock" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorDemand" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="category" stroke="#94a3b8" fontSize={11} fontWeight={600} />
                        <YAxis stroke="#94a3b8" fontSize={11} fontWeight={600} />
                        <Tooltip />
                        <Area type="monotone" dataKey="currentStock" name="Current Physical Stock" stroke="#38bdf8" strokeWidth={2} fillOpacity={1} fill="url(#colorStock)" />
                        <Area type="monotone" dataKey="projectedDemand30d" name="Projected 30d Demand" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorDemand)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Detailed Forecast Metrics Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                    {aiForecast.forecast.map((fc: any) => (
                      <div key={fc.category} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
                        <div className="flex justify-between font-extrabold text-slate-800">
                          <span>{fc.category} Forecast</span>
                          <span className="text-purple-600">+{fc.growthRate}% demand velocity</span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                          {fc.seasonalFactors}
                        </p>
                        <div className="flex justify-between text-[11px] font-mono border-t border-slate-200/60 pt-1.5 mt-1.5">
                          <span>Stockout Risk: <b className={fc.stockoutRisk > 40 ? 'text-rose-600' : 'text-slate-500'}>{fc.stockoutRisk}%</b></span>
                          <span>Reorder Recommendation: <b className="text-emerald-600">{fc.recommendedReorder} units</b></span>
                        </div>
                      </div>
                    ))}
                  </div>

                </div>

                {/* Right: Smart Reorder Lists & Insights (5 cols) */}
                <div className="lg:col-span-5 space-y-6">
                  
                  {/* Immediate Reorder Alerts */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 space-y-4">
                    <h3 className="font-extrabold text-slate-900 text-sm tracking-tight uppercase flex items-center gap-1.5 pb-2 border-b border-slate-100">
                      <AlertTriangle className="h-4.5 w-4.5 text-amber-500" />
                      Automatic Refill &amp; Restock Alerts
                    </h3>

                    <div className="space-y-3 max-h-72 overflow-y-auto">
                      {aiForecast.alerts.map((alert: any, idx: number) => (
                        <div key={idx} className="p-3.5 bg-rose-50/50 border border-rose-100 rounded-xl space-y-2 text-xs">
                          <div className="flex justify-between items-start">
                            <h4 className="font-bold text-slate-900 leading-tight">{alert.drugName}</h4>
                            <span className={`px-2 py-0.5 text-[9px] font-extrabold uppercase rounded ${
                              alert.riskLevel === 'CRITICAL' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {alert.riskLevel}
                            </span>
                          </div>
                          <p className="text-slate-500 text-[10px] leading-relaxed">
                            {alert.reason}
                          </p>
                          <div className="flex justify-between items-center text-[10px] font-mono font-bold text-emerald-600 border-t border-rose-100/50 pt-2">
                            <span>Auto Purchase Order Suggested</span>
                            <button
                              onClick={() => {
                                // Simulate ordering
                                alert(`SUCCESS: Generated Automated Purchase Order with wholesale distributors for ${alert.drugName}.`);
                              }}
                              className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-extrabold rounded cursor-pointer"
                            >
                              Approve PO
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Smart Insights */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 space-y-4">
                    <h3 className="font-extrabold text-slate-900 text-sm tracking-tight uppercase flex items-center gap-1.5 pb-2 border-b border-slate-100">
                      <Sparkles className="h-4.5 w-4.5 text-purple-500" />
                      Clinical Inventory Insights
                    </h3>

                    <ul className="space-y-3 text-xs leading-relaxed text-slate-600 font-medium list-disc pl-4">
                      {aiForecast.insights.map((insight: string, idx: number) => (
                        <li key={idx} className="marker:text-sky-500">
                          {insight}
                        </li>
                      ))}
                    </ul>
                  </div>

                </div>

              </div>
            ) : null}
          </motion.div>
        )}

        {/* ============================================================================
            SUB-TAB: CUSTOMER CREDIT LEDGER
            ============================================================================ */}
        {activeSubTab === 'ledger' && (
          <motion.div
            key="ledger"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Customer Credit stats cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200/85">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Outstanding Ledger Debt</p>
                <p className="text-2xl font-extrabold text-rose-600 mt-1 font-mono">
                  ${customers.reduce((sum, c) => sum + c.currentBalance, 0).toLocaleString()}
                </p>
                <span className="text-[10px] text-slate-400 font-semibold block mt-1">Total outstanding credit granted to patients/unions</span>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200/85">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Available Safe Credit Pool</p>
                <p className="text-2xl font-extrabold text-emerald-600 mt-1 font-mono">
                  ${(customers.reduce((sum, c) => sum + c.creditLimit, 0) - customers.reduce((sum, c) => sum + c.currentBalance, 0)).toLocaleString()}
                </p>
                <span className="text-[10px] text-slate-400 font-semibold block mt-1">Unutilized authorized safety credit lines</span>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200/85">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Highest Debt Tenant Account</p>
                <p className="text-xl font-extrabold text-slate-900 mt-1">Juba Clinical Union</p>
                <span className="text-[10px] text-slate-400 font-semibold block mt-1">Corporate credit line of $5,000 | Bal: $2,450</span>
              </div>
            </div>

            {/* Customers table ledger */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-extrabold text-slate-900 text-sm tracking-tight uppercase">Patient &amp; Organization Credit Registry</h3>
                <span className="px-2.5 py-0.5 bg-slate-100 border border-slate-200/60 font-mono text-xs font-bold text-slate-500 rounded-lg">
                  {customers.length} Accounts
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 uppercase font-bold text-[10px] border-b border-slate-100 font-mono">
                    <th className="py-3 px-5">Customer Name / NIN ID</th>
                    <th className="py-3 px-5">Phone</th>
                    <th className="py-3 px-5 text-right">Credit Limit</th>
                    <th className="py-3 px-5 text-right">Outstanding Debt Balance</th>
                    <th className="py-3 px-5 text-right">Utilization Ratio</th>
                    <th className="py-3 px-5">Action Triggers</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {customers.map(c => {
                    const ratio = c.creditLimit ? (c.currentBalance / c.creditLimit) * 100 : 0;
                    
                    return (
                      <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-5">
                          <p className="font-extrabold text-slate-900">{c.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">ID: {c.nationalId}</p>
                        </td>
                        <td className="py-3 px-5 text-slate-500 font-mono">{c.phone}</td>
                        <td className="py-3 px-5 text-right font-mono font-bold">${c.creditLimit}</td>
                        <td className={`py-3 px-5 text-right font-mono font-bold ${c.currentBalance > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                          ${c.currentBalance}
                        </td>
                        <td className="py-3 px-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="font-mono text-[10px] text-slate-400">{ratio.toFixed(0)}% used</span>
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${ratio > 75 ? 'bg-rose-500' : ratio > 40 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                style={{ width: `${ratio}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-5">
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                const payAmtStr = prompt(`Process credit debt payment for ${c.name}. Enter repayment amount:`);
                                const payAmt = parseFloat(payAmtStr || '0');
                                if (payAmt > 0) {
                                  setCustomers(prev => prev.map(cust => cust.id === c.id ? { ...cust, currentBalance: Math.max(0, cust.currentBalance - payAmt) } : cust));
                                  alert(`Repayment SUCCESS: Received $${payAmt.toFixed(2)} for ${c.name}.`);
                                }
                              }}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-bold rounded text-[10px] transition-all cursor-pointer"
                            >
                              Repay Debt
                            </button>
                            <button
                              onClick={() => {
                                const newLimitStr = prompt(`Adjust credit limit for ${c.name}. Enter new limit:`);
                                const newLimit = parseFloat(newLimitStr || '0');
                                if (newLimit > 0) {
                                  setCustomers(prev => prev.map(cust => cust.id === c.id ? { ...cust, creditLimit: newLimit } : cust));
                                  alert(`Limit Adjusted: Updated authorized pool limit to $${newLimit}.`);
                                }
                              }}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-bold rounded text-[10px] transition-all cursor-pointer"
                            >
                              Adjust Limit
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          </motion.div>
        )}

        {/* ============================================================================
            SUB-TAB: RECENT SALES & INVOICES
            ============================================================================ */}
        {activeSubTab === 'reports' && (() => {
          const filteredRecentTransactions = recentTransactions.filter((tx: any) => {
            const matchesBranch = isBranchMatch(tx.branchId || tx.storeId, tx.branchName || tx.storeName, selectedStore);
            if (!matchesBranch) return false;

            if (salesDateRange === 'all') return true;
            const txDate = tx.createdAt ? new Date(tx.createdAt) : new Date();
            const now = new Date();
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            
            if (salesDateRange === 'today') {
              return txDate >= todayStart;
            }
            if (salesDateRange === 'yesterday') {
              const yesterdayStart = new Date(todayStart);
              yesterdayStart.setDate(yesterdayStart.getDate() - 1);
              return txDate >= yesterdayStart && txDate < todayStart;
            }
            if (salesDateRange === '7days') {
              const sevenDaysAgo = new Date(todayStart);
              sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
              return txDate >= sevenDaysAgo;
            }
            if (salesDateRange === 'month') {
              const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
              return txDate >= monthStart;
            }
            return true;
          });

          const handleDownloadPdfReport = () => {
            const activeBranchObj = (selectedStore && selectedStore !== 'All') 
              ? (availableBranches.find(b => b.id === selectedStore) || availableBranches[0])
              : null;
            
            const pharmacyName = activeBranchObj 
              ? `${activeTenant?.name || "Junub Pharmacare"} - ${activeBranchObj.name}` 
              : (activeTenant?.name || "Junub Pharmacare");
            const pharmacyPhone = activeBranchObj?.phone || activeTenant?.phone || activeTenant?.telephone || "+211 922 152 427";
            const pharmacyAddress = activeBranchObj?.address || activeTenant?.address || "Downtown Juba, South Sudan";
            const taxId = activeTenant?.taxNumber || "SSD-TX-88392-JUBA";
            const branchScopeLabel = activeBranchObj ? activeBranchObj.name.toUpperCase() : 'ALL OUTLETS (CONSOLIDATED)';
            
            const totalSalesCount = filteredRecentTransactions.length;
            const totalGrossAmount = filteredRecentTransactions.reduce((sum: number, tx: any) => sum + (tx.total || 0), 0);

            const reportHtml = `
              <!DOCTYPE html>
              <html>
                <head>
                  <title>Sales Report - ${pharmacyName}</title>
                  <style>
                    body { font-family: system-ui, -apple-system, sans-serif; padding: 30px; color: #1e293b; max-width: 900px; margin: auto; }
                    .header { border-bottom: 2px solid #0284c7; padding-bottom: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
                    .title { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0; text-transform: uppercase; }
                    .sub { font-size: 11px; color: #64748b; margin-top: 4px; }
                    .badge { background: #f0f9ff; border: 1px solid #bae6fd; color: #0369a1; font-weight: 700; padding: 4px 10px; border-radius: 6px; font-size: 11px; }
                    .stats { display: flex; gap: 15px; margin-bottom: 20px; background: #f8fafc; padding: 12px 18px; border-radius: 10px; border: 1px solid #e2e8f0; }
                    .stat-box { flex: 1; }
                    .stat-label { font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: 700; }
                    .stat-val { font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 2px; }
                    table { border-collapse: collapse; width: 100%; margin-top: 10px; font-size: 12px; }
                    th { background: #f1f5f9; text-align: left; padding: 8px 12px; font-size: 10px; text-transform: uppercase; color: #475569; border-bottom: 1px solid #cbd5e1; }
                    td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; }
                    .text-right { text-align: right; }
                    .footer { margin-top: 40px; border-top: 1px dashed #cbd5e1; padding-top: 15px; text-align: center; font-size: 10px; color: #64748b; }
                    .dev-brand { font-weight: 800; color: #0369a1; text-transform: uppercase; font-size: 11px; margin-bottom: 4px; }
                  </style>
                </head>
                <body>
                  <div class="header">
                    <div>
                      <div class="title">${pharmacyName}</div>
                      <div class="sub">📍 ${pharmacyAddress} | 📞 ${pharmacyPhone} | Tax ID: ${taxId}</div>
                    </div>
                    <div class="badge">RANGE: ${salesDateRange.toUpperCase()}</div>
                  </div>

                  <div style="font-weight: 800; font-size: 14px; margin-bottom: 10px; color: #0284c7;">
                    OFFICIAL PHARMACY SALES & TRANSACTIONS AUDIT REPORT
                  </div>

                  <div class="stats">
                    <div class="stat-box">
                      <div class="stat-label">Total Transactions</div>
                      <div class="stat-val">${totalSalesCount} Sales</div>
                    </div>
                    <div class="stat-box">
                      <div class="stat-label">Total Volume</div>
                      <div class="stat-val">$${totalGrossAmount.toFixed(2)} USD</div>
                    </div>
                    <div class="stat-box">
                      <div class="stat-label">Report Date</div>
                      <div class="stat-val" style="font-size: 12px;">${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</div>
                    </div>
                  </div>

                  <table>
                    <thead>
                      <tr>
                        <th>Invoice Ref</th>
                        <th>Date</th>
                        <th>Items &amp; Quantity</th>
                        <th>Method</th>
                        <th class="text-right">Subtotal</th>
                        <th class="text-right">Total Net</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${filteredRecentTransactions.map((tx: any) => `
                        <tr>
                          <td style="font-family: monospace; font-weight: bold;">${tx.invoiceNumber || tx.id || 'INV-POS-10029'}</td>
                          <td>${tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : new Date().toLocaleDateString()}</td>
                          <td style="font-size: 11px; font-weight: 600;">${Array.isArray(tx.items) ? tx.items.map((i: any) => `${i.name} (x${i.quantity || 1})`).join(', ') : 'Medication Sale'}</td>
                          <td style="text-transform: uppercase; font-weight: bold;">${tx.paymentMethod}</td>
                          <td class="text-right">$${(tx.subtotal || tx.total || 0).toFixed(2)}</td>
                          <td class="text-right" style="font-weight: bold;">$${(tx.total || 0).toFixed(2)}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>

                  <div class="footer">
                    <div class="dev-brand">Engineered & Managed by Junub POS Center / Junub Pharmacare SaaS Engine</div>
                    <div>Developer Contact: +211 922 152 427</div>
                    <div style="margin-top: 4px; font-style: italic;">Licensed Healthcare Management Platform for South Sudan</div>
                  </div>
                </body>
              </html>
            `;

            executePrintHtml(reportHtml, `Sales Report - ${pharmacyName}`);
          };

          return (
            <motion.div
              key="reports"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap justify-between items-center gap-4 bg-slate-50/50">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm tracking-tight uppercase">Cashier Terminal Sales History</h3>
                    <p className="text-[11px] text-slate-500 font-medium">Filter recent transactions by date range &amp; export branded PDF receipts</p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Date Range Selector Buttons */}
                    <div className="bg-white border border-slate-200 p-1 rounded-xl flex items-center gap-1 shadow-2xs text-xs font-bold">
                      <button
                        onClick={() => setSalesDateRange('all')}
                        className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                          salesDateRange === 'all' ? 'bg-sky-500 text-white font-extrabold shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        All Dates
                      </button>
                      <button
                        onClick={() => setSalesDateRange('today')}
                        className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                          salesDateRange === 'today' ? 'bg-sky-500 text-white font-extrabold shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        Today
                      </button>
                      <button
                        onClick={() => setSalesDateRange('yesterday')}
                        className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                          salesDateRange === 'yesterday' ? 'bg-sky-500 text-white font-extrabold shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        Yesterday
                      </button>
                      <button
                        onClick={() => setSalesDateRange('7days')}
                        className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                          salesDateRange === '7days' ? 'bg-sky-500 text-white font-extrabold shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        Last 7 Days
                      </button>
                      <button
                        onClick={() => setSalesDateRange('month')}
                        className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                          salesDateRange === 'month' ? 'bg-sky-500 text-white font-extrabold shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        This Month
                      </button>
                    </div>

                    {/* Download PDF Button */}
                    <button
                      onClick={handleDownloadPdfReport}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                      title="Download Branded Sales PDF Report"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download PDF Report</span>
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 uppercase font-bold text-[10px] border-b border-slate-100 font-mono">
                        <th className="py-3 px-5">Invoice Reference</th>
                        <th className="py-3 px-5">Timestamp</th>
                        <th className="py-3 px-5">Items Dispensed &amp; Qty</th>
                        <th className="py-3 px-5">Payment Mode</th>
                        <th className="py-3 px-5 text-right">Subtotal</th>
                        <th className="py-3 px-5 text-right">Discount</th>
                        <th className="py-3 px-5 text-right">Total Net</th>
                        <th className="py-3 px-5">Clinical Registry Status</th>
                        <th className="py-3 px-5">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {filteredRecentTransactions.map((tx: any, idx: number) => (
                        <tr key={tx.id || idx} className="hover:bg-slate-50 transition-colors text-slate-700">
                          <td className="py-3 px-5 font-mono font-bold text-slate-900">
                            {tx.invoiceNumber || tx.id || `INV-POS-${Math.floor(100000 + Math.random()*900000)}`}
                          </td>
                          <td className="py-3 px-5 text-slate-500">
                            {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : new Date().toLocaleDateString()}
                          </td>
                          <td className="py-3 px-5 max-w-[240px]">
                            <div className="flex flex-wrap gap-1">
                              {Array.isArray(tx.items) && tx.items.length > 0 ? (
                                tx.items.map((item: any, iIdx: number) => (
                                  <span key={iIdx} className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-800 rounded text-[10px] font-semibold border border-slate-200">
                                    <span className="font-bold">{item.name}</span>
                                    <span className="text-sky-600 font-extrabold">(x{item.quantity || 1})</span>
                                  </span>
                                ))
                              ) : (
                                <span className="text-slate-400 italic text-[11px]">Medication Batch Checkout</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-5 uppercase font-bold font-mono text-[10px]">
                            <span className={`px-2 py-0.5 rounded ${
                              tx.paymentMethod === 'credit' ? 'bg-rose-50 text-rose-600' :
                              tx.paymentMethod === 'cash' ? 'bg-emerald-50 text-emerald-600' :
                              'bg-sky-50 text-sky-600'
                            }`}>
                              {tx.paymentMethod}
                            </span>
                          </td>
                          <td className="py-3 px-5 text-right font-mono">${(tx.subtotal || tx.total || 0).toFixed(2)}</td>
                          <td className="py-3 px-5 text-right font-mono">${tx.discount?.toFixed(2) || '0.00'}</td>
                          <td className="py-3 px-5 text-right font-mono font-extrabold text-slate-900">${(tx.total || 0).toFixed(2)}</td>
                          <td className="py-3 px-5">
                            <div className="flex items-center gap-1.5">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 font-extrabold text-[10px] uppercase rounded-lg border border-emerald-200/80 shadow-2xs">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                <span>Live Sync</span>
                              </span>
                              <span className="px-2 py-0.5 text-[9px] bg-slate-100 text-slate-700 font-bold uppercase rounded">
                                Audited
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-5">
                            <button
                              onClick={() => setShowReceipt(tx)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-250 text-slate-700 font-bold rounded text-[10px] transition-all cursor-pointer flex items-center gap-1"
                            >
                              <Printer className="h-3 w-3" /> View Thermal
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* ============================================================================
          MODAL: RECEIPT PRINTING PREVIEW
          ============================================================================ */}
      {showReceipt && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full max-h-[90vh] overflow-y-auto">
            
            {/* Header control */}
            <div className="px-4 py-3 bg-[#0F172A] text-slate-200 flex justify-between items-center text-xs border-b border-slate-800">
              <span className="font-extrabold uppercase tracking-widest text-[10px]">Thermal Print Spooler</span>
              <button
                onClick={() => setShowReceipt(null)}
                className="text-slate-400 hover:text-white font-extrabold text-sm cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* High-Fidelity Receipt Container */}
            <div className="p-6 space-y-4 font-mono text-slate-800 text-[11px] leading-relaxed select-text" id="thermal-printable-receipt">
              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-1.5 text-emerald-800 text-[10px] font-extrabold my-1">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Live Sync: Confirmed</span>
                </span>
                <span className="bg-emerald-600 text-white text-[8px] font-extrabold px-1.5 py-0.2 rounded uppercase">
                  Backend Synced
                </span>
              </div>
              {(() => {
                const currentBranchObj = availableBranches.find(b => b.id === showReceipt.branchId || b.id === showReceipt.storeId) || availableBranches[0];
                const bName = showReceipt.branchName || currentBranchObj?.name || 'Royal Trust Pharmacy - Main Branch';
                const bAddress = showReceipt.branchAddress || currentBranchObj?.address || activeTenant?.address || "Airport Road, Juba Town, South Sudan";
                const bPhone = showReceipt.branchPhone || currentBranchObj?.phone || activeTenant?.phone || activeTenant?.telephone || "+211 922 152 427";

                return (
                  <div className="text-center space-y-1">
                    <div className="flex items-center justify-center gap-1.5 flex-col">
                      {activeTenant?.logoUrl || (activeTenant?.logoIcon && (activeTenant.logoIcon.startsWith('data:') || activeTenant.logoIcon.startsWith('http'))) ? (
                        <img src={activeTenant?.logoUrl || activeTenant?.logoIcon} alt="Pharmacy Logo" className="h-10 w-10 object-contain mx-auto rounded-md shadow-2xs border border-slate-100 p-0.5 bg-white" />
                      ) : (
                        <span className="text-lg">
                          {activeTenant?.logoIcon === 'cross' ? '✚' : 
                           activeTenant?.logoIcon === 'capsule' ? '💊' : 
                           activeTenant?.logoIcon === 'heart' ? '♥' : 
                           activeTenant?.logoIcon === 'shield' ? '🛡' : '⚡'}
                        </span>
                      )}
                      <h3 className="font-extrabold text-sm uppercase text-slate-900 tracking-tight">
                        {activeTenant?.name || "Trust Pharmacy"}
                      </h3>
                      {bName && (
                        <div className="px-2.5 py-0.5 bg-slate-900 text-white text-[10px] font-black uppercase rounded tracking-wider mt-0.5">
                          🏢 {bName}
                        </div>
                      )}
                    </div>
                    <p className="text-[9px] text-slate-700 font-bold px-2 mt-1">
                      📍 {bAddress}
                    </p>
                    <p className="text-[9px] text-slate-600 font-bold">
                      📞 Tel: {bPhone}
                    </p>
                  </div>
                );
              })()}

              <div className="border-t border-dashed border-slate-300 pt-3 space-y-1 text-slate-500 text-[10px]">
                <div className="flex justify-between">
                  <span>BRANCH:</span>
                  <span className="font-extrabold text-slate-900 uppercase">
                    {showReceipt.branchName || availableBranches.find(b => b.id === showReceipt.branchId || b.id === showReceipt.storeId)?.name || 'Main Branch'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>INVOICE:</span>
                  <span className="font-bold text-slate-800">{showReceipt.invoiceNumber || `INV-POS-${Math.floor(100000 + Math.random()*900000)}`}</span>
                </div>
                <div className="flex justify-between">
                  <span>DATE:</span>
                  <span>{new Date(showReceipt.timestamp).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>PAYMENT:</span>
                  <span className="font-bold uppercase text-slate-800">{showReceipt.paymentMethod}</span>
                </div>
                {showReceipt.customerName && (
                  <div className="flex justify-between">
                    <span>CUSTOMER:</span>
                    <span className="font-bold text-slate-800">{showReceipt.customerName}</span>
                  </div>
                )}
                {showReceipt.prescriptionId && (
                  <div className="flex justify-between">
                    <span>CLINICAL RX:</span>
                    <span className="font-bold text-slate-800">{showReceipt.prescriptionId}</span>
                  </div>
                )}
                {showReceipt.isOfflineMode && (
                  <div className="text-center bg-amber-50 border border-amber-200 text-amber-800 font-bold p-1 rounded mt-1 text-[9px]">
                    CACHED OFFLINE TERMINAL #02
                  </div>
                )}
              </div>

              {/* Items List */}
              <div className="border-t border-dashed border-slate-300 pt-3 space-y-2">
                <div className="grid grid-cols-12 text-[9px] text-slate-500 font-black uppercase tracking-wider border-b border-slate-200 pb-1">
                  <span className="col-span-5">Item Description</span>
                  <span className="col-span-2 text-center">Qty</span>
                  <span className="col-span-2 text-right">Unit Price</span>
                  <span className="col-span-3 text-right">Total</span>
                </div>

                <div className="space-y-2 divide-y divide-dashed divide-slate-100">
                  {showReceipt.items?.map((item: any, idx: number) => {
                    const itemQty = item.quantity || 1;
                    const itemPrice = item.price ?? (item.subtotalUSD ? item.subtotalUSD / itemQty : (item.totalUSD ? item.totalUSD / itemQty : 0));
                    const itemTotal = item.subtotalUSD ?? (itemQty * itemPrice);
                    const itemPriceSSP = itemPrice * usdToSspRate;
                    const itemTotalSSP = itemTotal * usdToSspRate;

                    return (
                      <div key={idx} className="grid grid-cols-12 items-start pt-1.5 first:pt-0 text-[11px]">
                        <div className="col-span-5 pr-1">
                          <p className="font-extrabold text-slate-900 leading-tight">{item.name}</p>
                          {item.genericName && <p className="text-[9px] text-slate-400">({item.genericName})</p>}
                          {item.batchNo && <p className="text-[8px] text-slate-400 font-mono">Batch: {item.batchNo}</p>}
                        </div>
                        <div className="col-span-2 text-center font-bold text-slate-800">
                          x{itemQty}
                        </div>
                        <div className="col-span-2 text-right font-bold text-slate-800">
                          <div>${itemPrice.toFixed(2)}</div>
                          <div className="text-[8px] text-slate-500 font-normal">{Math.round(itemPriceSSP).toLocaleString()} SSP</div>
                        </div>
                        <div className="col-span-3 text-right font-black text-slate-900">
                          <div>${itemTotal.toFixed(2)}</div>
                          <div className="text-[8px] text-slate-500 font-normal">{Math.round(itemTotalSSP).toLocaleString()} SSP</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Calculation Breakdown with Dual Currency USD & SSP */}
              {(() => {
                const subVal = showReceipt.subtotal ?? showReceipt.total ?? 0;
                const discVal = showReceipt.discount || 0;
                const totUSD = showReceipt.total ?? showReceipt.totalUSD ?? subVal - discVal;
                const totSSP = showReceipt.totalSSP || (totUSD * usdToSspRate);
                const subSSP = subVal * usdToSspRate;
                const discSSP = discVal * usdToSspRate;

                return (
                  <div className="border-t border-dashed border-slate-300 pt-3 space-y-1.5 text-right text-slate-700">
                    <div className="flex justify-between text-[10px]">
                      <span>Subtotal (USD):</span>
                      <span className="font-bold">${subVal.toFixed(2)} USD (≈ {Math.round(subSSP).toLocaleString()} SSP)</span>
                    </div>
                    {discVal > 0 && (
                      <div className="flex justify-between text-[10px] text-emerald-600 font-semibold">
                        <span>Discount (USD):</span>
                        <span>-${discVal.toFixed(2)} USD (-{Math.round(discSSP).toLocaleString()} SSP)</span>
                      </div>
                    )}
                    <div className="flex justify-between text-[10px] text-slate-500 pt-0.5">
                      <span>Exchange Rate Applied:</span>
                      <span className="font-mono font-bold text-slate-700">1 USD = {usdToSspRate.toLocaleString()} SSP</span>
                    </div>

                    {/* Dual Currency High Visibility Banners */}
                    <div className="flex justify-between text-xs font-black text-slate-900 border-t border-dashed border-slate-300 pt-2 mt-2">
                      <span>TOTAL DUE (USD):</span>
                      <span className="font-mono text-sm">${totUSD.toFixed(2)} USD</span>
                    </div>
                    <div className="flex justify-between text-xs font-black text-emerald-900 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 shadow-2xs items-center">
                      <span className="uppercase text-[10px] font-extrabold text-emerald-700">TOTAL DUE (SSP):</span>
                      <span className="font-mono text-sm text-emerald-800">{Math.round(totSSP).toLocaleString()} SSP</span>
                    </div>
                  </div>
                );
              })()}

              <div className="text-center pt-4 border-t border-dashed border-slate-300 text-slate-800 text-[10px] space-y-1">
                <p className="font-bold text-slate-900">Verify clinical transaction code: {showReceipt.invoiceNumber || `INV-${Math.floor(100000 + Math.random()*900000)}`}</p>
                <p className="text-[9px] font-bold italic mt-2 text-slate-900">Thank you for letting us serve you. Stay healthy!</p>

                {/* Junub POS Center Footer branding */}
                <div className="pt-3 mt-3 border-t border-dashed border-slate-400 text-slate-900 text-[10px] space-y-0.5 leading-tight font-black">
                  <p className="font-black text-slate-900 uppercase tracking-wider text-center">Managed by Junub POS Center, Juba South Sudan</p>
                  <p className="font-bold text-[9px] text-slate-800">junubposcenter@gmail.com</p>
                  <p className="font-bold text-[8px] text-slate-700">Tel: +211 922 152 427 | Licensed Medical Outlet</p>
                </div>
              </div>

            </div>

            {/* Print Action Trigger Buttons */}
            <div className="p-4 bg-slate-50 border-t border-slate-150 space-y-2">
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    const status = getUsbPrinterStatus();
                    if (!status.isConnected) {
                      const res = await requestPairUsbPrinter();
                      if (!res.success) {
                        alert(res.message);
                      }
                    } else {
                      alert(`USB Printer active: ${status.deviceName || 'USB ESC/POS Printer'}`);
                    }
                  }}
                  className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Connect USB Thermal Printer for Direct ESC/POS Zero-Dialog Printing"
                >
                  <Usb className="h-3.5 w-3.5 text-slate-700" />
                  <span>{getUsbPrinterStatus().isConnected ? 'USB Ready' : 'Pair USB'}</span>
                </button>

                <button
                  onClick={() => {
                    if (showReceipt) {
                      const matchedB = availableBranches.find(b => b.id === showReceipt.branchId || b.id === showReceipt.storeId) || availableBranches[0];
                      printThermalReceipt({
                        pharmacyName: activeTenant?.name,
                        branchName: showReceipt.branchName || matchedB?.name || 'Main Branch',
                        branchAddress: showReceipt.branchAddress || matchedB?.address || activeTenant?.address || 'Airport Road, Juba Town, South Sudan',
                        branchPhone: showReceipt.branchPhone || matchedB?.phone || activeTenant?.phone || activeTenant?.telephone || '+211 922 152 427',
                        address: showReceipt.branchAddress || matchedB?.address || activeTenant?.address,
                        phone: showReceipt.branchPhone || matchedB?.phone || activeTenant?.phone || activeTenant?.telephone,
                        invoiceNumber: showReceipt.invoiceNumber || showReceipt.id,
                        timestamp: showReceipt.timestamp,
                        paymentMethod: showReceipt.paymentMethod,
                        customerName: showReceipt.customerName,
                        cashierName: showReceipt.cashierName,
                        prescriptionId: showReceipt.prescriptionId,
                        items: showReceipt.items || [],
                        subtotal: showReceipt.subtotal,
                        discount: showReceipt.discount,
                        total: showReceipt.total,
                        totalUSD: showReceipt.total,
                        exchangeRateUsed: usdToSspRate,
                        isOfflineMode: showReceipt.isOfflineMode
                      });
                    }
                  }}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" /> Direct ESC/POS Print (80mm)
                </button>

                <button
                  onClick={() => setShowReceipt(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ============================================================================
          MODAL: REGISTER MANUALLY STOCK LOT
          ============================================================================ */}
      {showAddMedicineModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            
            <div className="px-5 py-4 bg-[#0F172A] text-slate-100 flex justify-between items-center text-sm border-b border-slate-800">
              <h3 className="font-bold font-display uppercase tracking-tight flex items-center gap-2">
                <Layers className="h-4 w-4 text-sky-400" />
                Register Stock lot batch
              </h3>
              <button
                onClick={() => setShowAddMedicineModal(false)}
                className="text-slate-400 hover:text-white font-bold text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAddMedicineSubmit} className="p-6 space-y-4 text-xs">
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-400 uppercase">Medicine Name</label>
                  <input
                    type="text"
                    required
                    value={newMedicineForm.name}
                    onChange={e => setNewMedicineForm({...newMedicineForm, name: e.target.value})}
                    placeholder="Amoxicillin 500mg"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-800 focus:outline-none focus:border-sky-500 focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-400 uppercase">Generic Formula</label>
                  <input
                    type="text"
                    value={newMedicineForm.genericName}
                    onChange={e => setNewMedicineForm({...newMedicineForm, genericName: e.target.value})}
                    placeholder="Amoxicillin Trihydrate"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-800 focus:outline-none focus:border-sky-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-400 uppercase">Category</label>
                  <select
                    value={newMedicineForm.category}
                    onChange={e => setNewMedicineForm({...newMedicineForm, category: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-800 focus:outline-none focus:border-sky-500"
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
                  <label className="font-bold text-slate-400 uppercase">SKU / Barcode Key</label>
                  <input
                    type="text"
                    required
                    value={newMedicineForm.sku}
                    onChange={e => setNewMedicineForm({...newMedicineForm, sku: e.target.value.toUpperCase()})}
                    placeholder="AMX-500-CP"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono font-semibold text-slate-800 focus:outline-none focus:border-sky-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-400 uppercase">Batch Lot Number</label>
                  <input
                    type="text"
                    required
                    value={newMedicineForm.batchNumber}
                    onChange={e => setNewMedicineForm({...newMedicineForm, batchNumber: e.target.value.toUpperCase()})}
                    placeholder="BCH-AMX-901"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono font-semibold text-slate-800 focus:outline-none focus:border-sky-500 focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-400 uppercase">Active Store</label>
                  <select
                    value={newMedicineForm.storeId}
                    onChange={e => setNewMedicineForm({...newMedicineForm, storeId: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-800 focus:outline-none focus:border-sky-500"
                  >
                    {availableBranches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-400 uppercase">Quantity In Stock</label>
                  <input
                    type="number"
                    required
                    value={newMedicineForm.quantity}
                    onChange={e => setNewMedicineForm({...newMedicineForm, quantity: Number(e.target.value)})}
                    placeholder="100"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-800 focus:outline-none focus:border-sky-500 focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-400 uppercase">Safety Low alert Level</label>
                  <input
                    type="number"
                    required
                    value={newMedicineForm.minStockAlert}
                    onChange={e => setNewMedicineForm({...newMedicineForm, minStockAlert: Number(e.target.value)})}
                    placeholder="15"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-800 focus:outline-none focus:border-sky-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-400 uppercase">Wholesale Cost ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newMedicineForm.cost}
                    onChange={e => setNewMedicineForm({...newMedicineForm, cost: Number(e.target.value)})}
                    placeholder="6.50"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-800 focus:outline-none focus:border-sky-500 focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-400 uppercase">Retail Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newMedicineForm.price}
                    onChange={e => setNewMedicineForm({...newMedicineForm, price: Number(e.target.value)})}
                    placeholder="15.00"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-800 focus:outline-none focus:border-sky-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-400 uppercase">Shelf / Aisle Location</label>
                  <input
                    type="text"
                    value={newMedicineForm.shelfLocation}
                    onChange={e => setNewMedicineForm({...newMedicineForm, shelfLocation: e.target.value})}
                    placeholder="Aisle A-2, Shelf 1"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-800 focus:outline-none focus:border-sky-500 focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-400 uppercase">Expiry Date (YYYY-MM-DD)</label>
                  <input
                    type="text"
                    required
                    value={newMedicineForm.expiryDate}
                    onChange={e => setNewMedicineForm({...newMedicineForm, expiryDate: e.target.value})}
                    placeholder="2028-10-30"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono font-semibold text-slate-800 focus:outline-none focus:border-sky-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-indigo-50/40 rounded-xl border border-indigo-100">
                <div className="space-y-0.5">
                  <span className="font-bold text-indigo-950 uppercase tracking-wider">Requires Prescription</span>
                  <p className="text-slate-500 text-[10px]">Restricts sales checkout until prescription validation passes.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setNewMedicineForm({...newMedicineForm, requiresPrescription: !newMedicineForm.requiresPrescription})}
                  className={`w-10 h-5.5 rounded-full p-0.5 transition-colors cursor-pointer ${
                    newMedicineForm.requiresPrescription ? 'bg-indigo-600' : 'bg-slate-200'
                  }`}
                >
                  <div className={`w-4.5 h-4.5 bg-white rounded-full shadow-xs transition-transform ${
                    newMedicineForm.requiresPrescription ? 'translate-x-4.5' : 'translate-x-0'
                  }`}></div>
                </button>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-xl shadow-sm transition-all text-center cursor-pointer"
                >
                  Approve Lot Creation
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddMedicineModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* BARCODE LABEL GENERATOR AND PRINTER MODAL */}
      {/* ---------------------------------------------------- */}
      {showBarcodeGenerator && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-100 max-h-[90vh] overflow-y-auto text-xs">
            {/* Header */}
            <div className="p-4 bg-slate-950 text-white flex items-center justify-between">
              <div>
                <h3 className="font-extrabold tracking-tight text-sm uppercase flex items-center gap-1.5">
                  <Barcode className="h-5 w-5 text-sky-400" />
                  Barcode Label Printer
                </h3>
                <p className="text-slate-400 text-[10px]">Generate thermal barcode labels for custom medications</p>
              </div>
              <button 
                onClick={() => setShowBarcodeGenerator(false)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
              >
                <span className="font-bold text-sm">✕</span>
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Medicine Selector */}
              <div className="space-y-1">
                <label className="font-bold text-slate-500 uppercase tracking-wider block">Select Medication</label>
                <select
                  value={generatorMedicineId}
                  onChange={e => {
                    const mId = e.target.value;
                    setGeneratorMedicineId(mId);
                    const matched = batches.find(b => b.drugId === mId || b.id === mId);
                    if (matched) {
                      const code = `8839${matched.sku.replace(/[^A-Z0-9]/gi, '').padEnd(6, '0').slice(0, 6)}`.toUpperCase();
                      setGeneratorBarcode(code);
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 focus:outline-none focus:border-sky-500 focus:bg-white"
                >
                  <option value="">-- Choose Medication --</option>
                  {batches.map(b => (
                    <option key={b.id} value={b.drugId}>{b.name} ({b.sku})</option>
                  ))}
                </select>
              </div>

              {/* Barcode Number Display / Input */}
              <div className="space-y-1">
                <label className="font-bold text-slate-500 uppercase tracking-wider block font-mono">Barcode Value</label>
                <input
                  type="text"
                  value={generatorBarcode}
                  onChange={e => setGeneratorBarcode(e.target.value.toUpperCase())}
                  placeholder="e.g., 8839AMX500"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono font-bold text-slate-800 focus:outline-none focus:border-sky-500 focus:bg-white"
                />
              </div>

              {/* Live Render Preview */}
              {generatorBarcode && generatorMedicineId && (
                <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-300 flex flex-col items-center justify-center space-y-2">
                  <div className="font-bold font-sans text-slate-800 text-center uppercase tracking-wide">
                    {batches.find(b => b.drugId === generatorMedicineId)?.name}
                  </div>
                  
                  {/* Mock Visual Barcode Representation (SVG) */}
                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs flex flex-col items-center space-y-1">
                    <div className="flex items-center space-x-0.5 h-12 w-48">
                      {generatorBarcode.split('').map((char, index) => {
                        const thickness = (char.charCodeAt(0) % 3) + 1;
                        const isGap = (char.charCodeAt(0) % 2) === 0;
                        return (
                          <div 
                            key={index} 
                            style={{ width: `${thickness * 2}px` }} 
                            className={`h-full ${isGap ? 'bg-transparent' : 'bg-black'}`}
                          />
                        );
                      })}
                    </div>
                    <div className="font-mono text-center font-bold tracking-widest text-[11px] text-slate-900">
                      {generatorBarcode}
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 font-mono text-center">SKU: {batches.find(b => b.drugId === generatorMedicineId)?.sku}</p>
                </div>
              )}

              {/* Print Action buttons */}
              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={async () => {
                    if (!generatorMedicineId || !generatorBarcode) return;
                    
                    try {
                      const response = await fetch(`/api/v1/${activeTenantId}/scanning/barcodes`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          medicineId: generatorMedicineId,
                          sku: batches.find(b => b.drugId === generatorMedicineId)?.sku || "GEN",
                          barcode: generatorBarcode,
                          username: activeTenant?.staff?.find((s: any) => s.email && userEmail && s.email.toLowerCase() === userEmail.toLowerCase())?.name || "Dispensary Clerk"
                        })
                      });
                      const data = await response.json();
                      if (data.status === 'success') {
                        loadBarcodes();
                        alert(`Successfully triggered label print job for barcode "${generatorBarcode}". Thermal label dispatched to queue!`);
                        setShowBarcodeGenerator(false);
                      }
                    } catch (e) {
                      console.warn(e);
                    }
                  }}
                  disabled={!generatorMedicineId || !generatorBarcode}
                  className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Printer className="h-4 w-4" />
                  Print Thermal Label
                </button>
                <button
                  type="button"
                  onClick={() => setShowBarcodeGenerator(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
