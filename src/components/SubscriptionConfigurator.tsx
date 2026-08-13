import React, { useState, useEffect } from 'react';
import { 
  DollarSign, TrendingUp, Cpu, Server, Check, BarChart2, 
  Shield, Milestone, Lightbulb, CreditCard, RefreshCw, Smartphone, 
  Globe, Play, Pause, AlertTriangle, ShieldAlert, FileText, CheckCircle2, 
  ChevronRight, Database, Code, Info, Terminal, Calendar, Send, Sparkles, 
  Clock, Bell, Download, Tag, Copy, ArrowRight, Printer, X, Plus, Building2, CheckCircle, Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Tenant } from '../types';

// ============================================================================
// Types
// ============================================================================
type PlanId = 'starter' | 'professional' | 'enterprise';
type BillingCycle = 'monthly' | 'annual';
type GatewayId = 'visa' | 'mastercard' | 'mobile_money' | 'flutterwave' | 'pesapal' | 'cash';
type SubStatus = 'trial' | 'active' | 'grace_period' | 'suspended';

interface SubscriptionState {
  planId: PlanId;
  cycle: BillingCycle;
  status: SubStatus;
  couponCode: string;
  discountPercent: number;
  daysRemaining: number; // dynamically controlled for demo purposes
  trialUsed: boolean;
  gateway: GatewayId;
}

interface Invoice {
  id: string;
  invoiceNo: string;
  planName: string;
  amount: number;
  discount: number;
  tax: number;
  total: number;
  issuedAt: string;
  dueDate: string;
  status: 'paid' | 'unpaid' | 'overdue';
  paymentMethod: string;
}

interface PaymentHistoryItem {
  id: string;
  timestamp: string;
  amount: number;
  status: 'success' | 'failed' | 'pending';
  gateway: GatewayId;
  reference: string;
}

interface SubscriptionConfiguratorProps {
  activeTenantId?: string;
  setActiveTenantId?: React.Dispatch<React.SetStateAction<string>>;
  tenants?: Tenant[];
  setTenants?: React.Dispatch<React.SetStateAction<Tenant[]>>;
  activeRole?: string;
  setActiveRole?: React.Dispatch<React.SetStateAction<'Super Admin' | 'Pharmacy Admin' | 'Pharmacist' | 'Cashier' | 'Store Manager'>>;
}

export default function SubscriptionConfigurator({
  activeTenantId,
  setActiveTenantId,
  tenants,
  setTenants,
  activeRole,
  setActiveRole
}: SubscriptionConfiguratorProps = {}) {
  const [activeTab, setActiveTab] = useState<'portal' | 'database' | 'api' | 'workflows'>('portal');

  // ============================================================================
  // Subscription Simulation State
  // ============================================================================
  const [sub, setSub] = useState<SubscriptionState>({
    planId: 'professional',
    cycle: 'monthly',
    status: 'active',
    couponCode: '',
    discountPercent: 0,
    daysRemaining: 15,
    trialUsed: false,
    gateway: 'visa'
  });

  const [pharmacyName, setPharmacyName] = useState('Downtown Pharma Care');
  const [pharmacyLogo, setPharmacyLogo] = useState<string>('cross');
  const [customLogoUrl, setCustomLogoUrl] = useState<string>('');
  const [pharmacyAddress, setPharmacyAddress] = useState('742 Evergreen Terrace, Downtown City');
  const [pharmacyPhone, setPharmacyPhone] = useState('+1 (555) 019-2831');

  // Synchronize state with active tenant billing information
  useEffect(() => {
    if (tenants && activeTenantId) {
      const activeTenant = tenants.find(t => t.id === activeTenantId);
      if (activeTenant) {
        setSub(prev => ({
          ...prev,
          planId: activeTenant.plan as PlanId,
          cycle: activeTenant.billingCycle as BillingCycle
        }));
        setPharmacyName(activeTenant.name);
        setPharmacyLogo(activeTenant.logoIcon || 'cross');
        setPharmacyAddress(activeTenant.address);
        setPharmacyPhone(activeTenant.phone);
        setCustomLogoUrl(activeTenant.logoUrl || (activeTenant.logoIcon?.startsWith('data:') ? activeTenant.logoIcon : ''));
      }
    }
  }, [activeTenantId, tenants]);

  const activeTenant = tenants ? tenants.find(t => t.id === activeTenantId) : null;

  const handleUpdatePlan = (plan: PlanId) => {
    setSub(prev => ({ ...prev, planId: plan }));
    if (setTenants && activeTenantId) {
      setTenants(prev => prev.map(t => t.id === activeTenantId ? { 
        ...t, 
        plan: plan,
        dbIsolationMode: plan === 'starter' ? 'shared_schema_tenant_id' : plan === 'professional' ? 'schema_per_tenant' : 'database_per_tenant'
      } : t));
    }
  };

  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryItem[]>([
    { id: 'tx-804', timestamp: '2026-06-14 09:30', amount: 249, status: 'success', gateway: 'visa', reference: 'FLW-TX-90342' },
    { id: 'tx-702', timestamp: '2026-05-14 11:15', amount: 249, status: 'success', gateway: 'visa', reference: 'FLW-TX-84910' },
    { id: 'tx-591', timestamp: '2026-04-14 14:02', amount: 249, status: 'success', gateway: 'visa', reference: 'FLW-TX-71109' }
  ]);

  const [invoices, setInvoices] = useState<Invoice[]>([
    { id: 'inv-804', invoiceNo: 'INV-2026-003', planName: 'Professional Pharmacy', amount: 249, discount: 0, tax: 19.92, total: 268.92, issuedAt: '2026-06-14', dueDate: '2026-06-21', status: 'paid', paymentMethod: 'Visa Card' },
    { id: 'inv-702', invoiceNo: 'INV-2026-002', planName: 'Professional Pharmacy', amount: 249, discount: 0, tax: 19.92, total: 268.92, issuedAt: '2026-05-14', dueDate: '2026-05-21', status: 'paid', paymentMethod: 'Visa Card' },
    { id: 'inv-591', invoiceNo: 'INV-2026-001', planName: 'Professional Pharmacy', amount: 249, discount: 0, tax: 19.92, total: 268.92, issuedAt: '2026-04-14', dueDate: '2026-04-21', status: 'paid', paymentMethod: 'Visa Card' }
  ]);

  // System alert logs for the dashboard
  const [systemLogs, setSystemLogs] = useState<string[]>([
    'System: Account context verified on subdomain "kampala-central".',
    'Billing: Welcome discount promo checked automatically.',
    'Gateway: Verification pipeline set to standard live webhook parsing.'
  ]);

  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');

  // Mobile money carrier state or reference code
  const [momoNumber, setMomoNumber] = useState('');
  const [momoProvider, setMomoProvider] = useState<'mtn' | 'airtel'>('mtn');

  // Selected invoice in modal
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // ============================================================================
  // Pricing Constants
  // ============================================================================
  const PLANS_DATA = {
    starter: {
      name: 'Starter Pharmacy',
      monthlyPrice: 99,
      annualPrice: 79,
      maxPharmacies: 1,
      maxUsers: 3,
      features: ['Basic Point of Sale', 'Single Inventory Store', 'Daily POS PDF Export', 'Standard Email Support']
    },
    professional: {
      name: 'Professional Pharmacy',
      monthlyPrice: 249,
      annualPrice: 199,
      maxPharmacies: 5,
      maxUsers: 15,
      features: ['Advanced Point of Sale', 'Multi-Store Inventory Sync', 'Digital E-Prescription Gateway', 'Automated Drug Interaction Alerts', 'WhatsApp Receipt Integration']
    },
    enterprise: {
      name: 'Enterprise Pharmacy',
      monthlyPrice: 599,
      annualPrice: 479,
      maxPharmacies: 999, // unlimited
      maxUsers: 999, // unlimited
      features: ['Isolated Tenant Database', 'Unlimited Physical Stores', 'Custom Role-Based Security Permissions', 'Dedicated Account Executive', 'Custom HIPAA-Compliant Log Sinks', 'Biometric Employee Login Support']
    }
  };

  const COUPONS: Record<string, number> = {
    'JUBA20': 20, // 20% off
    'MEDIC10': 10, // 10% off
    'PHARMASAVE50': 50 // 50% off
  };

  // ============================================================================
  // Calculate dynamic costs
  // ============================================================================
  const planDetails = PLANS_DATA[sub.planId];
  const basePrice = sub.cycle === 'monthly' ? planDetails.monthlyPrice : planDetails.annualPrice;
  const discountAmount = Math.round(basePrice * (sub.discountPercent / 100));
  const preTaxPrice = basePrice - discountAmount;
  const taxAmount = parseFloat((preTaxPrice * 0.08).toFixed(2)); // 8% local medical tax
  const finalPrice = parseFloat((preTaxPrice + taxAmount).toFixed(2));

  // ============================================================================
  // Reactive Triggers on Expiry Changes
  // ============================================================================
  useEffect(() => {
    // Automatically trigger alerts and status transitions based on simulation slider: "daysRemaining"
    if (sub.daysRemaining > 5) {
      if (sub.status !== 'active') {
        setSub(prev => ({ ...prev, status: 'active' }));
        logSystem('System: Subscription state recovered back to ACTIVE.');
      }
    } else if (sub.daysRemaining > 0 && sub.daysRemaining <= 5) {
      if (sub.status !== 'active') {
        setSub(prev => ({ ...prev, status: 'active' }));
      }
      // Issue notification warning
      const warnMsg = `Renewal Reminder: Subscription for "${planDetails.name}" renews in ${sub.daysRemaining} days.`;
      if (!systemLogs.some(log => log.includes(warnMsg))) {
        logSystem(`Notification: Email/SMS renewal warning dispatched. ("${warnMsg}")`);
      }
    } else if (sub.daysRemaining <= 0 && sub.daysRemaining >= -7) {
      // Grace period (e.g. 7 days of grace period allowed before absolute hard lock)
      if (sub.status !== 'grace_period') {
        setSub(prev => ({ ...prev, status: 'grace_period' }));
        logSystem(`Warning: Tenant account entered the 7-day GRACE PERIOD. Automated invoice INV-2026-004 generated.`);
        
        // Add outstanding unpaid invoice
        const hasInvoice = invoices.some(i => i.invoiceNo === 'INV-2026-004');
        if (!hasInvoice) {
          const unpaidInvoice: Invoice = {
            id: 'inv-805',
            invoiceNo: 'INV-2026-004',
            planName: planDetails.name,
            amount: basePrice,
            discount: discountAmount,
            tax: taxAmount,
            total: finalPrice,
            issuedAt: new Date().toISOString().split('T')[0],
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: 'unpaid',
            paymentMethod: 'Awaiting Gateway Authorization'
          };
          setInvoices(prev => [unpaidInvoice, ...prev]);
        }
      }
    } else if (sub.daysRemaining < -7) {
      // Hard Suspension
      if (sub.status !== 'suspended') {
        setSub(prev => ({ ...prev, status: 'suspended' }));
        logSystem('CRITICAL: Grace period expired. Subscription AUTOMATICALLY SUSPENDED. All cashier terminal locks engaged.');
        // Set outstanding invoice to Overdue
        setInvoices(prev => prev.map(i => i.invoiceNo === 'INV-2026-004' ? { ...i, status: 'overdue' } : i));
      }
    }
  }, [sub.daysRemaining, sub.planId, sub.cycle, sub.discountPercent]);

  const logSystem = (msg: string) => {
    setSystemLogs(prev => [msg, ...prev.slice(0, 8)]);
  };

  // ============================================================================
  // Coupon Validation
  // ============================================================================
  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError('');
    setCouponSuccess('');
    const code = couponInput.trim().toUpperCase();

    if (!code) {
      setCouponError('Please enter a coupon code.');
      return;
    }

    if (COUPONS[code] !== undefined) {
      const disc = COUPONS[code];
      setSub(prev => ({ ...prev, couponCode: code, discountPercent: disc }));
      setCouponSuccess(`Coupon "${code}" applied successfully! ${disc}% discount applied.`);
      logSystem(`Billing: Coupon code "${code}" verified & assigned to tenant configuration.`);
    } else {
      setCouponError('Invalid coupon code. Try JUBA20, MEDIC10, or PHARMASAVE50.');
      logSystem(`Gateway Warning: Rejected invalid coupon attempt: "${code}"`);
    }
  };

  const handleClearCoupon = () => {
    setSub(prev => ({ ...prev, couponCode: '', discountPercent: 0 }));
    setCouponInput('');
    setCouponSuccess('');
    setCouponError('');
    logSystem('Billing: Coupon cleared from registration context.');
  };

  // ============================================================================
  // Payment Simulation
  // ============================================================================
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);

  const handleSimulatePayment = () => {
    setIsProcessingPayment(true);
    setPaymentDone(false);
    logSystem(`Gateway: Initializing secure transaction tunnel with gateway: "${sub.gateway.toUpperCase()}"...`);

    setTimeout(() => {
      setIsProcessingPayment(false);
      
      const txId = `tx-${Math.floor(100 + Math.random() * 900)}`;
      const gatewayRef = `${sub.gateway.substring(0, 3).toUpperCase()}-REF-${Math.floor(10000 + Math.random() * 90000)}`;

      if (sub.gateway === 'cash') {
        // Cash payment requires manual approval!
        setPaymentDone(true);
        
        // Update tenant state to reflect awaiting cash approval
        if (setTenants && activeTenantId) {
          setTenants(prev => prev.map(t => t.id === activeTenantId ? {
            ...t,
            cashPaymentAwaitingApproval: true,
            cashAmountPaid: finalPrice,
            name: pharmacyName,
            logoIcon: pharmacyLogo,
            logoUrl: customLogoUrl || (pharmacyLogo.startsWith('data:') ? pharmacyLogo : undefined),
            address: pharmacyAddress,
            phone: pharmacyPhone
          } : t));
        }

        // Set outstanding invoices to unpaid/pending
        setInvoices(prev => {
          const hasInvoice = prev.some(i => i.invoiceNo === 'INV-2026-004');
          if (hasInvoice) {
            return prev.map(inv => inv.invoiceNo === 'INV-2026-004' ? {
              ...inv,
              status: 'unpaid',
              paymentMethod: 'Pending Cash Approval'
            } : inv);
          } else {
            const pendingInvoice: Invoice = {
              id: 'inv-805',
              invoiceNo: 'INV-2026-004',
              planName: planDetails.name,
              amount: basePrice,
              discount: discountAmount,
              tax: taxAmount,
              total: finalPrice,
              issuedAt: new Date().toISOString().split('T')[0],
              dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              status: 'unpaid',
              paymentMethod: 'Pending Cash Approval'
            };
            return [pendingInvoice, ...prev];
          }
        });

        logSystem(`Gateway Pending: Cash payment request recorded. Awaiting manual Administrator approval for $${finalPrice}.`);
        return;
      }

      // For standard gateways, complete payment automatically!
      setPaymentDone(true);

      const newTx: PaymentHistoryItem = {
        id: txId,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
        amount: finalPrice,
        status: 'success',
        gateway: sub.gateway,
        reference: gatewayRef
      };

      setPaymentHistory(prev => [newTx, ...prev]);

      // Resolve unpaid invoices to paid
      setInvoices(prev => prev.map(inv => {
        if (inv.status === 'unpaid' || inv.status === 'overdue') {
          return { 
            ...inv, 
            status: 'paid', 
            paymentMethod: `${sub.gateway.charAt(0).toUpperCase() + sub.gateway.slice(1)} Channel`
          };
        }
        return inv;
      }));

      // Recover Days Remaining & Status
      setSub(prev => ({
        ...prev,
        daysRemaining: 30,
        status: 'active'
      }));

      // Update Tenant in the global state with Branding and Status!
      if (setTenants && activeTenantId) {
        setTenants(prev => prev.map(t => t.id === activeTenantId ? {
          ...t,
          status: 'active',
          plan: sub.planId,
          billingCycle: sub.cycle,
          name: pharmacyName,
          logoIcon: pharmacyLogo,
          logoUrl: customLogoUrl || (pharmacyLogo.startsWith('data:') ? pharmacyLogo : undefined),
          address: pharmacyAddress,
          phone: pharmacyPhone,
          cashPaymentAwaitingApproval: false,
        } : t));
      }

      // Automatically login as the Pharmacy Admin of this subscribed pharmacy
      if (setActiveRole) {
        setActiveRole('Pharmacy Admin');
      }

      logSystem(`Gateway Success: Payment resolved via ${sub.gateway.toUpperCase()} for $${finalPrice}. Ref: ${gatewayRef}. Local secondary branding configured. Active role updated to Pharmacy Admin.`);
    }, 2000);
  };

  const handleApproveCashPayment = () => {
    const txId = `tx-${Math.floor(100 + Math.random() * 900)}`;
    const gatewayRef = `CASH-APPROVED-${Math.floor(10000 + Math.random() * 90000)}`;

    const newTx: PaymentHistoryItem = {
      id: txId,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      amount: finalPrice,
      status: 'success',
      gateway: 'cash',
      reference: gatewayRef
    };

    setPaymentHistory(prev => [newTx, ...prev]);

    // Resolve unpaid/pending invoices to paid
    setInvoices(prev => prev.map(inv => {
      if (inv.status === 'unpaid' || inv.status === 'overdue' || inv.paymentMethod === 'Pending Cash Approval') {
        return { 
          ...inv, 
          status: 'paid', 
          paymentMethod: 'Approved Cash (Manual Override)'
        };
      }
      return inv;
    }));

    // Recover Days Remaining & Status
    setSub(prev => ({
      ...prev,
      daysRemaining: 30,
      status: 'active'
    }));

    // Update global Tenant
    if (setTenants && activeTenantId) {
      setTenants(prev => prev.map(t => t.id === activeTenantId ? {
        ...t,
        status: 'active',
        plan: sub.planId,
        billingCycle: sub.cycle,
        name: pharmacyName,
        logoIcon: pharmacyLogo,
        logoUrl: customLogoUrl || (pharmacyLogo.startsWith('data:') ? pharmacyLogo : undefined),
        address: pharmacyAddress,
        phone: pharmacyPhone,
        cashPaymentAwaitingApproval: false,
      } : t));
    }

    // Set logged-in role to Pharmacy Admin
    if (setActiveRole) {
      setActiveRole('Pharmacy Admin');
    }

    logSystem(`Manual Success: Administrator approved Cash payment for $${finalPrice}. Ref: ${gatewayRef}. Pharmacy details activated. Active role elevated to Pharmacy Admin.`);
    alert(`Success: Cash payment approved manually! Pharmacy is now active, and you are logged in as the Pharmacy Admin of "${pharmacyName}".`);
  };

  // Manual Trigger Daily Renewal Job Simulation
  const handleTriggerDailyCron = () => {
    logSystem('Cron Worker: Inspecting subscription schedules...');
    if (sub.daysRemaining > 0) {
      setSub(prev => ({ ...prev, daysRemaining: Math.max(-10, prev.daysRemaining - 5) }));
      logSystem('Cron Worker: Simulating passage of 5 days to observe state rules.');
    } else {
      setSub(prev => ({ ...prev, daysRemaining: prev.daysRemaining - 5 }));
      logSystem('Cron Worker: Simulating passage of 5 days of overdue status.');
    }
  };

  const handleTriggerFreeTrial = () => {
    setSub(prev => ({
      ...prev,
      status: 'trial',
      daysRemaining: 14,
      discountPercent: 100, // 100% off for free trial
      couponCode: 'TRIAL-FREE'
    }));
    logSystem('Billing: Activated 14-day zero-risk Free Trial for testing.');
  };

  const handleTriggerReset = () => {
    setSub({
      planId: 'professional',
      cycle: 'monthly',
      status: 'active',
      couponCode: '',
      discountPercent: 0,
      daysRemaining: 15,
      trialUsed: false,
      gateway: 'visa'
    });
    setCouponInput('');
    setCouponError('');
    setCouponSuccess('');
    setInvoices([
      { id: 'inv-804', invoiceNo: 'INV-2026-003', planName: 'Professional Pharmacy', amount: 249, discount: 0, tax: 19.92, total: 268.92, issuedAt: '2026-06-14', dueDate: '2026-06-21', status: 'paid', paymentMethod: 'Visa Card' },
      { id: 'inv-702', invoiceNo: 'INV-2026-002', planName: 'Professional Pharmacy', amount: 249, discount: 0, tax: 19.92, total: 268.92, issuedAt: '2026-05-14', dueDate: '2026-05-21', status: 'paid', paymentMethod: 'Visa Card' },
      { id: 'inv-591', invoiceNo: 'INV-2026-001', planName: 'Professional Pharmacy', amount: 249, discount: 0, tax: 19.92, total: 268.92, issuedAt: '2026-04-14', dueDate: '2026-04-21', status: 'paid', paymentMethod: 'Visa Card' }
    ]);
    setPaymentHistory([
      { id: 'tx-804', timestamp: '2026-06-14 09:30', amount: 249, status: 'success', gateway: 'visa', reference: 'FLW-TX-90342' },
      { id: 'tx-702', timestamp: '2026-05-14 11:15', amount: 249, status: 'success', gateway: 'visa', reference: 'FLW-TX-84910' },
      { id: 'tx-591', timestamp: '2026-04-14 14:02', amount: 249, status: 'success', gateway: 'visa', reference: 'FLW-TX-71109' }
    ]);
    logSystem('Simulation: Re-initialized test context to baseline active subscription.');
  };

  // ============================================================================
  // Interactive REST API Testing Sandbox State
  // ============================================================================
  const [selectedRoute, setSelectedRoute] = useState<'checkout' | 'webhook' | 'coupon' | 'cron' | 'status'>('checkout');
  const [apiPayload, setApiPayload] = useState<string>('');
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [apiHeaders, setApiHeaders] = useState<any>(null);
  const [apiStatus, setApiStatus] = useState<number | null>(null);
  const [apiTiming, setApiTiming] = useState<number | null>(null);
  const [isApiLoading, setIsApiLoading] = useState(false);

  const API_ROUTES_DATA = {
    checkout: {
      method: 'POST',
      url: '/api/v1/subscriptions/checkout',
      desc: 'Registers a new tenant pharmacy workspace and creates their gateway subscription session.',
      defaultPayload: {
        tenantId: "tenant-kampala-central",
        planId: "professional",
        billingCycle: "monthly",
        couponCode: "JUBA20",
        gateway: "flutterwave",
        email: "onboarding@kampalapharma.com",
        momoNumber: "+256 701 987654"
      }
    },
    webhook: {
      method: 'POST',
      url: '/api/v1/subscriptions/gateway/webhook',
      desc: 'Handles asynchronous unified callbacks from payment providers (Flutterwave IPNs, Pesapal events, Cards API captures).',
      defaultPayload: {
        event: "payment.completed",
        gateway: "pesapal",
        transactionId: "TX-PZP-9801452",
        amount: 249.00,
        currency: "USD",
        status: "SUCCESSFUL",
        timestamp: "2026-07-14T10:14:32Z",
        signature: "sha256=fa709ba2c801e0892fbc9c098df241bc3128"
      }
    },
    coupon: {
      method: 'POST',
      url: '/api/v1/subscriptions/coupon/validate',
      desc: 'Validates medical campaign codes and checks expiry constraint indicators.',
      defaultPayload: {
        code: "PHARMASAVE50",
        tenantId: "tenant-kampala-central",
        currentPlanId: "starter"
      }
    },
    cron: {
      method: 'POST',
      url: '/api/v1/subscriptions/cron/process-expiries',
      desc: 'Platform scheduler trigger that sweeps expiring plans, issues warning triggers, grants grace periods, and enforces hard access suspension locks.',
      defaultPayload: {
        securityKey: "JUBA_CRON_SCHEDULER_SECRET_KEY_903",
        dryRun: false,
        maxRecordsToProcess: 100
      }
    },
    status: {
      method: 'GET',
      url: '/api/v1/subscriptions/status/tenant-kampala-central',
      desc: 'Direct microservice endpoint to fetch immediate subscription locks, active limits, and API threshold rates.',
      defaultPayload: {}
    }
  };

  useEffect(() => {
    // Populate payload on route switch
    setApiPayload(JSON.stringify(API_ROUTES_DATA[selectedRoute].defaultPayload, null, 2));
    setApiResponse(null);
    setApiStatus(null);
    setApiHeaders(null);
  }, [selectedRoute]);

  const handleExecuteMockApi = () => {
    setIsApiLoading(true);
    setApiResponse(null);
    const start = performance.now();

    setTimeout(() => {
      let parsedPayload: any = {};
      try {
        if (selectedRoute !== 'status') {
          parsedPayload = JSON.parse(apiPayload);
        }
      } catch (err) {
        setApiResponse({ error: "Malformed payload JSON structure. Please check commas and matching brackets." });
        setApiStatus(400);
        setApiHeaders({
          "content-type": "application/json",
          "x-powered-by": "ExpressJS/JubuCore"
        });
        setApiTiming(12);
        setIsApiLoading(false);
        return;
      }

      // Generate context-aware mock response based on inputs
      let mockRes: any = {};
      let status = 200;

      if (selectedRoute === 'checkout') {
        const plan = parsedPayload.planId || 'starter';
        const price = plan === 'starter' ? 99 : plan === 'professional' ? 249 : 599;
        const discount = parsedPayload.couponCode === 'JUBA20' ? 0.2 : 0;
        const total = price * (1 - discount);

        mockRes = {
          success: true,
          message: "Tenant subscription profile prepared.",
          subscriptionId: `sub-${Math.random().toString(36).substring(2, 9)}`,
          paymentStatus: "AWAITING_AUTH",
          invoiceReference: "INV-2026-ONLINE-98",
          totalDue: total,
          redirectCheckoutUrl: `https://checkout.flutterwave.com/pay/jubu-pharma-tx-${Math.floor(10000 + Math.random() * 90000)}`,
          gatewayUsed: parsedPayload.gateway || 'visa',
          tenantSchemaConfigured: plan === 'starter' ? 'shared_schema_tenant_id' : plan === 'professional' ? 'schema_per_tenant' : 'database_per_tenant'
        };
        status = 201;
      } else if (selectedRoute === 'webhook') {
        mockRes = {
          processed: true,
          eventHandled: parsedPayload.event || "payment.completed",
          signatureVerified: true,
          tenantId: "tenant-kampala-central",
          status: "ACTIVE",
          activeUntil: "2026-08-14T00:00:00Z",
          actionTaken: "GRACE_PERIOD_RESOLVED_LOCKS_DISCHARGED"
        };
      } else if (selectedRoute === 'coupon') {
        const code = parsedPayload.code || '';
        if (COUPONS[code] !== undefined) {
          mockRes = {
            valid: true,
            code: code,
            discountPercent: COUPONS[code],
            applicablePlans: ["starter", "professional", "enterprise"],
            expiresAt: "2026-12-31T23:59:59Z"
          };
        } else {
          mockRes = {
            valid: false,
            error: "Coupon code does not exist or has expired.",
            code: code
          };
          status = 404;
        }
      } else if (selectedRoute === 'cron') {
        mockRes = {
          status: "COMPLETE",
          inspectedRecords: 84,
          renewalsProcessed: 12,
          gracePeriodsEnforced: 2,
          suspensionsEnforced: 1,
          suspendedTenantIds: ["tenant-stjude"],
          unpaidInvoicesEmitted: ["INV-2026-004"]
        };
      } else if (selectedRoute === 'status') {
        mockRes = {
          tenantId: "tenant-kampala-central",
          workspaceSubdomain: "kampala-central",
          licensePlan: "professional",
          subscriptionStatus: "ACTIVE",
          expiryDate: "2026-07-29T10:00:00Z",
          gracePeriodExpiration: "2026-08-05T10:00:00Z",
          limits: {
            pharmaciesActive: 2,
            pharmaciesMax: 5,
            usersActive: 8,
            usersMax: 15,
            apiQuotaRemaining: 142050,
            apiQuotaMax: 200000,
            storageRemainingMB: 8420,
            storageMaxMB: 10000
          },
          lockState: {
            writeLocked: false,
            readLocked: false,
            reason: null
          }
        };
      }

      const end = performance.now();
      setApiStatus(status);
      setApiResponse(mockRes);
      setApiTiming(Math.round(end - start + 45)); // Add realistic network overhead
      setApiHeaders({
        "content-type": "application/json",
        "cache-control": "no-store, max-age=0",
        "x-request-id": `req-${Math.random().toString(36).substring(2, 9)}`,
        "x-processing-time-ms": `${Math.round(end - start)}ms`
      });
      setIsApiLoading(false);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      {/* SaaS Subscription Info Board */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 text-[10px] bg-emerald-50 text-emerald-600 font-extrabold uppercase rounded-lg border border-emerald-100 tracking-wider flex items-center gap-1">
                <Shield className="h-3 w-3" />
                PCI-Compliant Billing Module
              </span>
              <span className="px-2.5 py-1 text-[10px] bg-sky-50 text-sky-600 font-extrabold uppercase rounded-lg border border-sky-100 tracking-wider">
                Multi-Gateway Hub
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight font-display mt-2">
              Pharmacy SaaS Billing, Subscriptions &amp; Payments Hub
            </h2>
            <p className="text-xs text-slate-500 max-w-4xl font-medium">
              Comprehensive architectural portal detailing Starter, Professional, and Enterprise subscription lifecycles. Interactively test coupon application, checkout gateways, automated renewal alerts, grace periods, auto-suspension, and relational database designs.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleTriggerReset}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-250 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="h-3 w-3" />
              Reset Playground
            </button>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-100 mt-6 gap-2 overflow-x-auto whitespace-nowrap">
          <button
            onClick={() => setActiveTab('portal')}
            className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
              activeTab === 'portal'
                ? 'border-emerald-500 text-emerald-600 font-extrabold'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <CreditCard className="h-4 w-4" />
            Interactive Subscription Portal
          </button>
          <button
            onClick={() => setActiveTab('database')}
            className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
              activeTab === 'database'
                ? 'border-emerald-500 text-emerald-600 font-extrabold'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Database className="h-4 w-4" />
            Database Design &amp; Schema
          </button>
          <button
            onClick={() => setActiveTab('api')}
            className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
              activeTab === 'api'
                ? 'border-emerald-500 text-emerald-600 font-extrabold'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Code className="h-4 w-4" />
            API Explorer Playground
          </button>
          <button
            onClick={() => setActiveTab('workflows')}
            className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
              activeTab === 'workflows'
                ? 'border-emerald-500 text-emerald-600 font-extrabold'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Milestone className="h-4 w-4" />
            Architectural Workflow Diagrams
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* ====================================================================================
            TAB: INTERACTIVE SUBSCRIPTION PORTAL
            ==================================================================================== */}
        {activeTab === 'portal' && (
          <motion.div
            key="portal"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6"
          >
            {/* Checkout & Configuration (Left Column) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Step 1: Select Plan Tier */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-150">
                  <span className="w-5 h-5 bg-emerald-50 text-emerald-600 font-extrabold text-xs flex items-center justify-center rounded-md">1</span>
                  <h3 className="font-extrabold text-slate-900 text-sm tracking-tight uppercase">Select Pharmacy License Tier</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {(['starter', 'professional', 'enterprise'] as PlanId[]).map(plan => {
                    const data = PLANS_DATA[plan];
                    const price = sub.cycle === 'monthly' ? data.monthlyPrice : data.annualPrice;
                    const isSelected = sub.planId === plan;

                    return (
                      <button
                        key={plan}
                        onClick={() => handleUpdatePlan(plan)}
                        className={`p-4 rounded-xl text-left transition-all border text-xs cursor-pointer flex flex-col justify-between space-y-4 relative overflow-hidden ${
                          isSelected 
                            ? 'bg-emerald-50/40 border-emerald-500 ring-2 ring-emerald-500/10' 
                            : 'bg-white hover:bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="space-y-1">
                          <p className="font-extrabold text-slate-900">{data.name}</p>
                          <div className="flex items-baseline gap-0.5">
                            <span className="text-lg font-bold text-slate-950 font-mono">${price}</span>
                            <span className="text-[10px] text-slate-400">/mo</span>
                          </div>
                        </div>

                        <div className="text-[10px] text-slate-400 font-mono">
                          <p>{data.maxPharmacies === 999 ? 'Unlimited' : `${data.maxPharmacies} Store`} Cap</p>
                          <p>{data.maxUsers === 999 ? 'Unlimited' : `${data.maxUsers} Staff`} Accounts</p>
                        </div>

                        {isSelected && (
                          <span className="absolute top-2 right-2 bg-emerald-500 text-white rounded-full p-0.5">
                            <Check className="h-3 w-3 stroke-[3px]" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Billing Interval & Coupon */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Billing Interval</label>
                    <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                      <button
                        onClick={() => setSub(prev => ({ ...prev, cycle: 'monthly' }))}
                        className={`flex-1 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                          sub.cycle === 'monthly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-700'
                        }`}
                      >
                        Monthly
                      </button>
                      <button
                        onClick={() => setSub(prev => ({ ...prev, cycle: 'annual' }))}
                        className={`flex-1 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                          sub.cycle === 'annual' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-700'
                        }`}
                      >
                        Annual (20% Off)
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Promo Code / Coupons</label>
                    <form onSubmit={handleApplyCoupon} className="flex gap-1.5">
                      <input 
                        type="text"
                        value={couponInput}
                        onChange={e => setCouponInput(e.target.value)}
                        placeholder="JUBA20, MEDIC10..."
                        disabled={sub.discountPercent > 0}
                        className="flex-1 text-xs px-2.5 py-1 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 disabled:bg-slate-50 font-mono font-bold uppercase"
                      />
                      {sub.discountPercent > 0 ? (
                        <button 
                          type="button" 
                          onClick={handleClearCoupon}
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold rounded-lg border border-rose-150 transition-all cursor-pointer"
                        >
                          Clear
                        </button>
                      ) : (
                        <button 
                          type="submit" 
                          className="px-3 py-1 bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-all cursor-pointer"
                        >
                          Apply
                        </button>
                      )}
                    </form>
                    {couponError && <p className="text-[10px] text-rose-600 font-semibold">{couponError}</p>}
                    {couponSuccess && <p className="text-[10px] text-emerald-600 font-semibold">{couponSuccess}</p>}
                  </div>
                </div>
              </div>

              {/* Step 2: Payment Gateway Selection */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-150">
                  <span className="w-5 h-5 bg-emerald-50 text-emerald-600 font-extrabold text-xs flex items-center justify-center rounded-md">2</span>
                  <h3 className="font-extrabold text-slate-900 text-sm tracking-tight uppercase">Select Checkout Payment Gateway</h3>
                </div>

                {/* Gateway Grid */}
                <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                  {[
                    { id: 'visa', label: 'Visa Card', icon: CreditCard, color: 'text-indigo-600' },
                    { id: 'mastercard', label: 'Mastercard', icon: CreditCard, color: 'text-rose-500' },
                    { id: 'mobile_money', label: 'Mobile Money', icon: Smartphone, color: 'text-yellow-600' },
                    { id: 'flutterwave', label: 'Flutterwave', icon: Globe, color: 'text-orange-500' },
                    { id: 'pesapal', label: 'Pesapal Hub', icon: RefreshCw, color: 'text-sky-600' },
                    { id: 'cash', label: 'Cash Payment', icon: DollarSign, color: 'text-emerald-600' }
                  ].map(gate => {
                    const isSelected = sub.gateway === gate.id;
                    const Icon = gate.icon;

                    return (
                      <button
                        key={gate.id}
                        onClick={() => setSub(prev => ({ ...prev, gateway: gate.id as GatewayId }))}
                        className={`p-2 rounded-xl text-center border text-[10px] font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                          isSelected 
                            ? 'bg-emerald-50/40 border-emerald-500 text-emerald-600 font-extrabold ring-1 ring-emerald-500/20' 
                            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-500'
                        }`}
                      >
                        <Icon className={`h-4.5 w-4.5 ${isSelected ? 'text-emerald-500' : gate.color}`} />
                        <span>{gate.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Dynamic Gateway Forms Simulation */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                  {sub.gateway === 'visa' && (
                    <div className="space-y-2">
                      <p className="font-bold text-slate-700">Direct Visa Merchant Processing</p>
                      <div className="grid grid-cols-3 gap-2">
                        <input type="text" placeholder="Card Number" value="4111 2222 3333 4444" readOnly className="col-span-3 px-2 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none" />
                        <input type="text" placeholder="MM/YY" value="09/29" readOnly className="px-2 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none" />
                        <input type="text" placeholder="CVV" value="123" readOnly className="px-2 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none" />
                        <span className="text-[10px] text-slate-400 flex items-center justify-end font-medium col-span-1">Demo sandbox auto-filled</span>
                      </div>
                    </div>
                  )}

                  {sub.gateway === 'mastercard' && (
                    <div className="space-y-2">
                      <p className="font-bold text-slate-700">Direct Mastercard Processing</p>
                      <div className="grid grid-cols-3 gap-2">
                        <input type="text" placeholder="Card Number" value="5105 1051 0510 5105" readOnly className="col-span-3 px-2 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none" />
                        <input type="text" placeholder="MM/YY" value="12/30" readOnly className="px-2 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none" />
                        <input type="text" placeholder="CVV" value="987" readOnly className="px-2 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none" />
                        <span className="text-[10px] text-slate-400 flex items-center justify-end font-medium col-span-1">Demo sandbox auto-filled</span>
                      </div>
                    </div>
                  )}

                  {sub.gateway === 'mobile_money' && (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <p className="font-bold text-slate-700">Mobile Money Gateway (MTN MoMo &amp; Airtel Money)</p>
                        <div className="flex bg-slate-200 p-0.5 rounded border border-slate-300">
                          <button 
                            type="button" 
                            onClick={() => setMomoProvider('mtn')} 
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${momoProvider === 'mtn' ? 'bg-yellow-500 text-slate-900 shadow-sm' : 'text-slate-500'}`}
                          >
                            MTN
                          </button>
                          <button 
                            type="button" 
                            onClick={() => setMomoProvider('airtel')} 
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${momoProvider === 'airtel' ? 'bg-red-500 text-white shadow-sm' : 'text-slate-500'}`}
                          >
                            Airtel
                          </button>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={momoNumber} 
                          onChange={e => setMomoNumber(e.target.value)} 
                          placeholder="+256 701 987654" 
                          className="flex-1 px-3 py-1.5 border border-slate-200 bg-white rounded-lg focus:outline-none focus:border-emerald-500 font-mono font-bold" 
                        />
                        <button 
                          type="button" 
                          onClick={() => setMomoNumber('+256 701 987654')} 
                          className="px-2 py-1.5 bg-slate-200 text-slate-700 font-bold rounded-lg text-[10px] cursor-pointer"
                        >
                          Auto-Fill Uganda
                        </button>
                      </div>
                    </div>
                  )}

                  {sub.gateway === 'flutterwave' && (
                    <div className="space-y-1.5">
                      <p className="font-bold text-slate-700">Flutterwave Standard Payment Hub (Pan-African)</p>
                      <p className="text-slate-400 text-[10px] leading-relaxed">
                        Redirects the client safely to checkout.flutterwave.com with a dynamic signature. Supports Mastercard, Visa, Verve, USSD codes, mobile money providers (Ghana, Kenya, Uganda, Nigeria, Rwanda).
                      </p>
                    </div>
                  )}

                  {sub.gateway === 'pesapal' && (
                    <div className="space-y-1.5">
                      <p className="font-bold text-slate-700">Pesapal Payment Hub (East-African)</p>
                      <p className="text-slate-400 text-[10px] leading-relaxed">
                        Secure instant redirection mapping local payment channels directly in Kenya, Uganda, Tanzania. Connects Safaricom M-Pesa, Airtel Money, Visa, Tigo Pesa, Mastercard.
                      </p>
                    </div>
                  )}

                  {sub.gateway === 'cash' && (
                    <div className="space-y-2">
                      <p className="font-bold text-emerald-700 flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        Cash Payment Gate (Requires manual validation/override)
                      </p>
                      <p className="text-slate-500 text-[10px] leading-relaxed">
                        Excellent for payments made in cash. Once submitted, the active Tenant's subscription status will switch to <span className="font-bold text-amber-600 uppercase">Awaiting Cash Approval</span>. The administrator can click the manual approval button below to activate.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Step 3: Setup Licensed Pharmacy Profile (Secondary Branding) */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-150">
                  <span className="w-5 h-5 bg-emerald-50 text-emerald-600 font-extrabold text-xs flex items-center justify-center rounded-md">3</span>
                  <h3 className="font-extrabold text-slate-900 text-sm tracking-tight uppercase flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-emerald-500" />
                    Licensed Pharmacy Profile (Secondary Branding)
                  </h3>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  After subscription activation, these details will appear on all client-facing invoices, sales receipts, and printouts as the secondary local branding after the primary software developer details.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Pharmacy Name</label>
                    <input 
                      type="text" 
                      value={pharmacyName} 
                      onChange={e => setPharmacyName(e.target.value)} 
                      placeholder="e.g. South Juba Medicals" 
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500" 
                    />
                  </div>

                  <div className="space-y-1.5 col-span-1 md:col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Custom PNG / Image Logo Upload (Branding)</label>
                    <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/svg+xml,image/webp"
                        id="sub-config-logo-file"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (evt) => {
                              if (evt.target?.result) {
                                const dataUrl = evt.target.result as string;
                                setCustomLogoUrl(dataUrl);
                                setPharmacyLogo(dataUrl);
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <label
                        htmlFor="sub-config-logo-file"
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-2 shadow-xs"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Custom PNG Logo</span>
                      </label>

                      {customLogoUrl ? (
                        <div className="flex items-center gap-3">
                          <img src={customLogoUrl} alt="Custom Branding Logo" className="h-9 w-9 object-contain rounded-md border border-slate-200 p-0.5 bg-white shadow-xs" />
                          <div>
                            <span className="text-xs font-bold text-emerald-700 block">Custom Logo Loaded</span>
                            <button
                              type="button"
                              onClick={() => {
                                setCustomLogoUrl('');
                                setPharmacyLogo('cross');
                              }}
                              className="text-[10px] text-rose-500 hover:underline font-bold"
                            >
                              Remove Custom Logo
                            </button>
                          </div>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">No custom PNG uploaded yet (using icon symbol)</span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase font-mono">Or Select Preset Icon</label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {[
                        { id: 'cross', char: '✚', label: 'Cross' },
                        { id: 'capsule', char: '💊', label: 'Capsule' },
                        { id: 'heart', char: '♥', label: 'Heart' },
                        { id: 'shield', char: '🛡', label: 'Shield' },
                        { id: 'activity', char: '⚡', label: 'Activity' }
                      ].map(logo => {
                        const isSelected = pharmacyLogo === logo.id;
                        return (
                          <button
                            key={logo.id}
                            type="button"
                            onClick={() => {
                              setPharmacyLogo(logo.id);
                              setCustomLogoUrl('');
                            }}
                            className={`py-1.5 rounded-lg border text-xs font-bold transition-all flex flex-col items-center justify-center cursor-pointer ${
                              isSelected 
                                ? 'bg-sky-50 border-sky-500 text-sky-600 ring-1 ring-sky-500/20' 
                                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-500'
                            }`}
                          >
                            <span className="text-sm">{logo.char}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-1.5 col-span-1 md:col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Physical Location / Address</label>
                    <input 
                      type="text" 
                      value={pharmacyAddress} 
                      onChange={e => setPharmacyAddress(e.target.value)} 
                      placeholder="e.g. Block 4, Customs Road, Juba" 
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500" 
                    />
                  </div>

                  <div className="space-y-1.5 col-span-1 md:col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Contact Phone Number</label>
                    <input 
                      type="text" 
                      value={pharmacyPhone} 
                      onChange={e => setPharmacyPhone(e.target.value)} 
                      placeholder="e.g. +211 922 152 427" 
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 font-mono" 
                    />
                  </div>
                </div>
              </div>

              {/* Step 4: Simulation Control Sliders */}
              <div className="bg-amber-50/50 p-5 rounded-2xl border border-amber-200/80 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-amber-200/60">
                  <span className="w-5 h-5 bg-amber-100 text-amber-700 font-extrabold text-xs flex items-center justify-center rounded-md">4</span>
                  <h3 className="font-extrabold text-amber-900 text-sm tracking-tight uppercase flex items-center gap-1.5">
                    <Clock className="h-4 w-4 animate-pulse" />
                    Subscription Life-Cycle Simulator
                  </h3>
                </div>

                <p className="text-xs text-amber-800 leading-relaxed font-medium">
                  Manually slide the active plan's expiry timer to test the platform rules (Automatic Expiry, Grace Periods, Email warnings, and hard lock Suspension).
                </p>

                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-semibold text-amber-900">
                      <span>Days Remaining till Renewal</span>
                      <span className="font-bold font-mono bg-white px-2 py-0.5 rounded border border-amber-200">
                        {sub.daysRemaining} days {sub.daysRemaining < 0 ? '(Expired / Grace)' : ''}
                      </span>
                    </div>

                    <input 
                      type="range"
                      min="-15"
                      max="30"
                      value={sub.daysRemaining}
                      onChange={e => setSub(prev => ({ ...prev, daysRemaining: Number(e.target.value) }))}
                      className="w-full h-2 bg-amber-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
                    />

                    <div className="flex justify-between text-[10px] font-mono text-amber-700">
                      <span>Suspension Hard-Lock (-15 days)</span>
                      <span>Grace Period (-5 days)</span>
                      <span>Alert Level (5 days)</span>
                      <span>Healthy Active (30 days)</span>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={handleTriggerDailyCron}
                      className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 text-[11px] font-bold rounded-lg border border-amber-300 flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Run Daily Expiry sweep (+5 days pass)
                    </button>
                    <button
                      onClick={handleTriggerFreeTrial}
                      className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[11px] font-bold rounded-lg border border-emerald-300 flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Trigger Free Trial
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Dashboard Live Status & Output (Right Column) */}
            <div className="lg:col-span-5 space-y-6">
              {/* Core Status Summary Card */}
              <div className="bg-[#0F172A] text-slate-200 p-6 rounded-2xl border border-slate-800 shadow-lg space-y-5">
                <div className="flex justify-between items-start border-b border-slate-800 pb-4">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Current Subscription Context</span>
                    <h3 className="text-lg font-extrabold text-white font-display mt-0.5">{planDetails.name}</h3>
                  </div>

                  {/* Adaptive Visual Badge */}
                  <span className={`px-2.5 py-0.5 text-[10px] font-extrabold uppercase rounded-md ${
                    activeTenant?.cashPaymentAwaitingApproval ? 'bg-amber-500 text-slate-950 animate-pulse font-extrabold' :
                    sub.status === 'active' ? 'bg-emerald-500/25 text-emerald-400' :
                    sub.status === 'grace_period' ? 'bg-amber-500/25 text-amber-400 animate-pulse' :
                    sub.status === 'trial' ? 'bg-sky-500/25 text-sky-400' :
                    'bg-rose-500/25 text-rose-400 border border-rose-500/40'
                  }`}>
                    {activeTenant?.cashPaymentAwaitingApproval ? 'Awaiting Cash Approval' : 
                     sub.status === 'active' ? 'ACTIVE' :
                     sub.status === 'grace_period' ? 'IN GRACE PERIOD' :
                     sub.status === 'trial' ? 'FREE TRIAL' : 'SUSPENDED'}
                  </span>
                </div>

                {/* Simulated Cash manual approval action banner */}
                {activeTenant?.cashPaymentAwaitingApproval && (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-3 text-xs">
                    <div className="flex items-center gap-1.5 text-amber-400 font-extrabold uppercase">
                      <AlertTriangle className="h-4 w-4 text-amber-500 animate-pulse" />
                      Awaiting Cash Approval
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      Operator registered cash payment. Total due: <span className="font-extrabold text-white">${activeTenant.cashAmountPaid || finalPrice}</span>. Approve below to activate.
                    </p>
                    <button
                      onClick={handleApproveCashPayment}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold py-2 rounded-lg text-xs cursor-pointer shadow transition-all flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Approve Cash Payment (Manual Override)
                    </button>
                  </div>
                )}

                {/* Simulated Hard Suspension Warning Overlay */}
                {sub.status === 'suspended' && (
                  <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-2 text-xs">
                    <p className="font-extrabold text-rose-400 flex items-center gap-1.5">
                      <ShieldAlert className="h-4 w-4 animate-bounce" />
                      TENANT CONTEXT WRITE-LOCKED
                    </p>
                    <p className="text-slate-300 leading-relaxed text-[11px] font-medium">
                      All POS and clinical checkout capabilities are suspended for sub-tenant "kampala-central". Please process payment immediately to avoid database archiving queues.
                    </p>
                  </div>
                )}

                {/* Sub Total Summary Details */}
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Base Contract Amount:</span>
                    <span className="font-mono text-slate-200 font-bold">${basePrice}.00</span>
                  </div>

                  {sub.discountPercent > 0 && (
                    <div className="flex justify-between text-emerald-400 font-semibold">
                      <span>Promo Coupon Discount ({sub.discountPercent}%):</span>
                      <span className="font-mono">-${discountAmount}.00</span>
                    </div>
                  )}

                  <div className="flex justify-between text-slate-400">
                    <span>Medical Surcharge Tax (0%):</span>
                    <span className="font-mono">$0.00</span>
                  </div>

                  <hr className="border-slate-800" />

                  <div className="flex justify-between items-baseline">
                    <span className="text-white font-bold">Total Amount Due:</span>
                    <span className="text-xl font-extrabold text-emerald-400 font-mono">${finalPrice}</span>
                  </div>
                </div>

                {/* Direct Action Trigger */}
                <div className="pt-2">
                  <button
                    onClick={handleSimulatePayment}
                    disabled={isProcessingPayment || (sub.status === 'active' && sub.daysRemaining > 5)}
                    className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      isProcessingPayment
                        ? 'bg-slate-700 text-slate-400'
                        : sub.status === 'suspended' || sub.status === 'grace_period'
                        ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/10'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed'
                    }`}
                  >
                    {isProcessingPayment ? (
                      <>
                        <RefreshCw className="h-4.5 w-4.5 animate-spin" />
                        Validating with {sub.gateway.toUpperCase()} network...
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4" />
                        Authorize &amp; Pay Invoice (${finalPrice})
                      </>
                    )}
                  </button>
                  {paymentDone && (
                    <p className="text-[10px] text-emerald-400 text-center mt-2 font-semibold">✓ Transaction resolved! Status: ACTIVE. Calendar locks cleared.</p>
                  )}
                </div>
              </div>

              {/* Dynamic Invoices list & generation */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wide flex items-center gap-1">
                    <FileText className="h-4 w-4 text-emerald-500" />
                    Generated SaaS Invoices
                  </h4>
                  <span className="text-[10px] text-slate-400 font-bold font-mono">Invoice Queue</span>
                </div>

                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                  {invoices.map(inv => (
                    <div 
                      key={inv.id}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-slate-950 font-mono">{inv.invoiceNo}</span>
                          <span className={`px-1.5 py-0.2 rounded text-[8px] font-extrabold uppercase ${
                            inv.status === 'paid' ? 'bg-emerald-50 text-emerald-600' :
                            inv.status === 'unpaid' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'
                          }`}>
                            {inv.status}
                          </span>
                        </div>
                        <p className="text-slate-400 text-[10px] font-medium">Issued: {inv.issuedAt} | Due: {inv.dueDate}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 font-mono">${inv.total}</span>
                        <button
                          onClick={() => setSelectedInvoice(inv)}
                          className="p-1.5 hover:bg-slate-200 text-slate-500 hover:text-slate-700 rounded-lg transition-all cursor-pointer"
                          title="View &amp; Print Invoice"
                        >
                          <Printer className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* System and Renewal Alerts Terminal Log */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 font-mono text-[10px] text-slate-400 space-y-2">
                <div className="flex items-center justify-between text-slate-500 pb-1.5 border-b border-slate-900">
                  <span className="flex items-center gap-1.5 uppercase font-bold text-[9px] tracking-wider">
                    <Terminal className="h-3.5 w-3.5 text-slate-400" />
                    Billing Cron / Reminders log
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                </div>
                <div className="space-y-1.5 max-h-[110px] overflow-y-auto">
                  {systemLogs.map((log, index) => (
                    <div key={index} className="flex gap-1.5">
                      <span className="text-slate-600 select-none">&gt;</span>
                      <p className="leading-relaxed">{log}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ====================================================================================
            TAB: DATABASE DESIGN & SCHEMA
            ==================================================================================== */}
        {activeTab === 'database' && (
          <motion.div
            key="database"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Database Overview */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wide flex items-center gap-2">
                <Database className="h-4.5 w-4.5 text-emerald-500" />
                Relational Database Design for Multi-Tenant Subscriptions
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed max-w-4xl font-medium">
                Our architecture uses a highly optimized physical schema in PostgreSQL to manage active subscriptions, plan parameters, coupon eligibility indexes, and secure transaction tracking mapping multi-gateway references (such as Flutterwave IPNs and Mobile Money transaction codes).
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                {/* Visual Schema Keys */}
                <div className="space-y-4">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Database Tables &amp; Columns</h4>
                  
                  <div className="space-y-3.5 text-xs">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                      <p className="font-bold text-slate-950 font-mono">1. tenants</p>
                      <ul className="text-[11px] text-slate-500 space-y-1 pl-2 font-medium">
                        <li>🔑 <span className="font-bold text-slate-800">id</span> (UUID, PK)</li>
                        <li>👤 <span className="font-bold text-slate-800">name</span> (VARCHAR)</li>
                        <li>🌐 <span className="font-bold text-slate-800">subdomain</span> (VARCHAR, Unique Router URL)</li>
                        <li>🚦 <span className="font-bold text-slate-800">status</span> ('active' | 'suspended' | 'trial_expired')</li>
                        <li>📅 <span className="font-bold text-slate-800">created_at</span> (TIMESTAMP)</li>
                      </ul>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                      <p className="font-bold text-slate-950 font-mono">2. subscriptions</p>
                      <ul className="text-[11px] text-slate-500 space-y-1 pl-2 font-medium">
                        <li>🔑 <span className="font-bold text-slate-800">id</span> (UUID, PK)</li>
                        <li>🏢 <span className="font-bold text-slate-800">tenant_id</span> (UUID, FK -&gt; tenants.id)</li>
                        <li>🏷️ <span className="font-bold text-slate-800">plan_id</span> ('starter' | 'professional' | 'enterprise')</li>
                        <li>📅 <span className="font-bold text-slate-800">status</span> ('trial' | 'active' | 'grace_period' | 'suspended')</li>
                        <li>⏱️ <span className="font-bold text-slate-800">trial_end</span> (TIMESTAMP)</li>
                        <li>📅 <span className="font-bold text-slate-800">current_period_start</span> (TIMESTAMP)</li>
                        <li>📅 <span className="font-bold text-slate-800">current_period_end</span> (TIMESTAMP)</li>
                        <li>🛡️ <span className="font-bold text-slate-800">grace_period_end</span> (TIMESTAMP)</li>
                      </ul>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                      <p className="font-bold text-slate-950 font-mono">3. payment_transactions</p>
                      <ul className="text-[11px] text-slate-500 space-y-1 pl-2 font-medium">
                        <li>🔑 <span className="font-bold text-slate-800">id</span> (UUID, PK)</li>
                        <li>🏢 <span className="font-bold text-slate-800">tenant_id</span> (UUID, FK)</li>
                        <li>💸 <span className="font-bold text-slate-800">amount</span> (DECIMAL)</li>
                        <li>💳 <span className="font-bold text-slate-800">gateway</span> ('visa' | 'mastercard' | 'momo' | 'flutterwave' | 'pesapal')</li>
                        <li>📜 <span className="font-bold text-slate-800">gateway_ref</span> (VARCHAR, External API validation key)</li>
                        <li>🚥 <span className="font-bold text-slate-800">status</span> ('success' | 'failed' | 'pending')</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* SQL DDL Panel */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">SQL DDL Specifications</h4>
                    <span className="text-[10px] text-slate-400 font-semibold font-mono">PostgreSQL Direct Blueprint</span>
                  </div>

                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 font-mono text-[10px] text-slate-300 overflow-x-auto max-h-[380px]">
                    <pre className="leading-relaxed">
{`-- Create custom ENUMS for constraints
CREATE TYPE tenant_status AS ENUM ('active', 'suspended', 'trial_expired');
CREATE TYPE subscription_status AS ENUM ('trial', 'active', 'grace_period', 'suspended');
CREATE TYPE transaction_status AS ENUM ('success', 'failed', 'pending');

-- 1. Tenants Table
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  subdomain VARCHAR(63) NOT NULL UNIQUE,
  status tenant_status DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Subscriptions Table
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan_id VARCHAR(31) NOT NULL,
  billing_cycle VARCHAR(15) NOT NULL DEFAULT 'monthly',
  status subscription_status DEFAULT 'trial',
  trial_start TIMESTAMP WITH TIME ZONE,
  trial_end TIMESTAMP WITH TIME ZONE,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  grace_period_end TIMESTAMP WITH TIME ZONE,
  coupon_code VARCHAR(31),
  discount_percent INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Payment Transactions
CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id),
  amount DECIMAL(12, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  gateway VARCHAR(31) NOT NULL,
  gateway_ref VARCHAR(255) UNIQUE,
  status transaction_status DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add Index for ultra-fast Cron sweeps & routing
CREATE INDEX idx_subscriptions_expiry ON subscriptions(current_period_end, status);
CREATE INDEX idx_tenants_subdomain ON tenants(subdomain);
`}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ====================================================================================
            TAB: API EXPLORER Sandbox
            ==================================================================================== */}
        {activeTab === 'api' && (
          <motion.div
            key="api"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6"
          >
            {/* Left side: Route selectors & input payload */}
            <div className="lg:col-span-6 space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wide">REST API Playground</h3>
                  <p className="text-xs text-slate-400 mt-1">Select and test live subscription endpoint parameters with visual outputs.</p>
                </div>

                {/* Route Cards */}
                <div className="space-y-2">
                  {(Object.keys(API_ROUTES_DATA) as Array<keyof typeof API_ROUTES_DATA>).map((routeKey) => {
                    const route = API_ROUTES_DATA[routeKey];
                    const isSelected = selectedRoute === routeKey;

                    return (
                      <button
                        key={routeKey}
                        onClick={() => setSelectedRoute(routeKey)}
                        className={`w-full p-3 rounded-xl text-left border text-xs transition-all cursor-pointer flex items-center justify-between ${
                          isSelected 
                            ? 'bg-emerald-50/40 border-emerald-500 ring-1 ring-emerald-500/10' 
                            : 'bg-white hover:bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`px-1.5 py-0.5 text-[8px] font-extrabold rounded font-mono ${
                              route.method === 'POST' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                            }`}>
                              {route.method}
                            </span>
                            <span className="font-bold text-slate-800 font-mono text-[11px]">{route.url}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-medium leading-relaxed">{route.desc}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      </button>
                    );
                  })}
                </div>

                {/* Input Payload Textarea */}
                {selectedRoute !== 'status' && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase block">JSON Request Body</label>
                    <textarea
                      rows={7}
                      value={apiPayload}
                      onChange={e => setApiPayload(e.target.value)}
                      className="w-full text-xs p-3 font-mono border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 resize-none bg-slate-50"
                    ></textarea>
                  </div>
                )}

                <button
                  onClick={handleExecuteMockApi}
                  disabled={isApiLoading}
                  className="w-full py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isApiLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Executing request on port 3000...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Execute Test Request
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Right side: Mock API Response Console */}
            <div className="lg:col-span-6 space-y-4">
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-850 font-mono text-xs text-slate-300 space-y-4 h-full flex flex-col justify-between">
                <div className="space-y-4 flex-1">
                  {/* Console Header */}
                  <div className="flex items-center justify-between text-slate-500 pb-3 border-b border-slate-900">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Live API Response Console</span>
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                      <span className="text-[9px] font-semibold">200 OK Connection Established</span>
                    </div>
                  </div>

                  {/* Latency and Status Info */}
                  {apiStatus !== null && (
                    <div className="flex gap-4 text-[10px] text-slate-400">
                      <div>
                        <span className="text-slate-500">STATUS:</span>
                        <span className={`font-bold ml-1 ${apiStatus < 300 ? 'text-emerald-400' : 'text-rose-400'}`}>{apiStatus}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">LATENCY:</span>
                        <span className="font-bold text-sky-400 ml-1">{apiTiming} ms</span>
                      </div>
                      <div>
                        <span className="text-slate-500">PORT:</span>
                        <span className="font-bold text-yellow-500 ml-1">3000</span>
                      </div>
                    </div>
                  )}

                  {/* Body Log */}
                  <div className="space-y-3">
                    {isApiLoading ? (
                      <div className="py-12 text-center text-slate-500 space-y-2">
                        <RefreshCw className="h-6 w-6 animate-spin mx-auto text-slate-600" />
                        <p className="text-[10px]">Awaiting JSON payload schema resolution...</p>
                      </div>
                    ) : apiResponse ? (
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Response Headers</p>
                          <pre className="text-[10px] text-slate-400 leading-normal p-2.5 bg-slate-900/60 rounded-lg">
                            {JSON.stringify(apiHeaders, null, 2)}
                          </pre>
                        </div>

                        <div className="space-y-1">
                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Response Body (JSON)</p>
                          <pre className="text-[11px] text-white leading-relaxed p-3 bg-slate-900 rounded-lg overflow-x-auto">
                            {JSON.stringify(apiResponse, null, 2)}
                          </pre>
                        </div>
                      </div>
                    ) : (
                      <div className="py-24 text-center text-slate-600 space-y-1">
                        <Terminal className="h-8 w-8 mx-auto text-slate-700 mb-2" />
                        <p className="font-bold">Awaiting Execution Trigger</p>
                        <p className="text-[10px]">Select any route, customize parameters on the left and hit execute.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-[9px] text-slate-600 border-t border-slate-900 pt-3 flex justify-between">
                  <span>Jubu SaaS Core v1.4.1</span>
                  <span>SSL Active (Sandbox mode)</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ====================================================================================
            TAB: WORKFLOW DIAGRAMS
            ==================================================================================== */}
        {activeTab === 'workflows' && (
          <motion.div
            key="workflows"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wide">SaaS Subscription Lifecycle &amp; Gateway Webhook Flow</h3>
                <p className="text-xs text-slate-400 mt-1">Click on any node block to review dynamic state transition rules applied automatically by the core cron tasks.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
                {/* Flow Diagram 1: Subscription Status State Transitions */}
                <div className="space-y-4">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-center">Plan Expiry &amp; Suspension Transitions</h4>
                  
                  {/* SVG Canvas for Status Flow */}
                  <div className="h-64 bg-slate-50 border border-slate-150 rounded-2xl p-4 flex flex-col justify-between items-center relative overflow-hidden">
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                          <path d="M 0 0 L 10 5 L 0 10 z" fill="#cbd5e1" />
                        </marker>
                      </defs>
                      {/* Connection Lines */}
                      <path d="M 120 40 L 260 40" stroke="#cbd5e1" strokeWidth="2" markerEnd="url(#arrow)" strokeDasharray="3" />
                      <path d="M 120 120 L 260 120" stroke="#cbd5e1" strokeWidth="2" markerEnd="url(#arrow)" />
                      <path d="M 260 120 L 120 120" stroke="#10b981" strokeWidth="2" markerEnd="url(#arrow)" strokeDasharray="2" />
                      <path d="M 310 145 L 310 205" stroke="#cbd5e1" strokeWidth="2" markerEnd="url(#arrow)" />
                      <path d="M 260 220 L 120 220" stroke="#cbd5e1" strokeWidth="2" markerEnd="url(#arrow)" />
                      <path d="M 70 205 L 70 145" stroke="#10b981" strokeWidth="2" markerEnd="url(#arrow)" />
                    </svg>

                    <div className="flex justify-between w-full z-10 px-4">
                      {/* 1. Free Trial Node */}
                      <div className="w-24 p-2.5 bg-sky-50 border border-sky-200 text-center rounded-xl text-[10px] space-y-1">
                        <span className="font-extrabold text-sky-700 uppercase">1. Free Trial</span>
                        <p className="text-[9px] text-slate-400">14 Days Limit</p>
                      </div>

                      {/* 2. Active Paid Node */}
                      <div className="w-24 p-2.5 bg-emerald-50 border border-emerald-200 text-center rounded-xl text-[10px] space-y-1">
                        <span className="font-extrabold text-emerald-700 uppercase">2. Active Plan</span>
                        <p className="text-[9px] text-slate-400">Access Healthy</p>
                      </div>
                    </div>

                    <div className="flex justify-between w-full z-10 px-4">
                      {/* 4. Suspended State */}
                      <div className="w-24 p-2.5 bg-rose-50 border border-rose-200 text-center rounded-xl text-[10px] space-y-1">
                        <span className="font-extrabold text-rose-700 uppercase">4. Suspended</span>
                        <p className="text-[9px] text-slate-400">Write-Locked</p>
                      </div>

                      {/* 3. Grace Period Node */}
                      <div className="w-24 p-2.5 bg-amber-50 border border-amber-200 text-center rounded-xl text-[10px] space-y-1">
                        <span className="font-extrabold text-amber-700 uppercase">3. Grace Period</span>
                        <p className="text-[9px] text-slate-400">7 Days warning</p>
                      </div>
                    </div>

                    <div className="text-[9px] text-slate-400 font-medium text-center italic bg-white px-3 py-1 rounded-full border border-slate-100 shadow-3xs">
                      Note: Resolving overdue payment triggers immediate database re-validation instantly.
                    </div>
                  </div>
                </div>

                {/* Flow Diagram 2: Multi-Gateway Webhook Payload Integration */}
                <div className="space-y-4">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-center">Unified Multi-Gateway Webhook Handling</h4>

                  <div className="h-64 bg-slate-50 border border-slate-150 rounded-2xl p-4 flex flex-col justify-between items-center relative overflow-hidden">
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                      {/* Tree branches joining at center */}
                      <path d="M 60 50 L 190 110" stroke="#cbd5e1" strokeWidth="2" />
                      <path d="M 190 50 L 190 100" stroke="#cbd5e1" strokeWidth="2" />
                      <path d="M 320 50 L 210 110" stroke="#cbd5e1" strokeWidth="2" />
                      <path d="M 190 145 L 190 205" stroke="#10b981" strokeWidth="2" strokeDasharray="3" />
                    </svg>

                    <div className="flex justify-between w-full z-10">
                      {/* Gate 1 */}
                      <div className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-[9px] font-bold text-slate-600">
                        Visa / Mastercard IPNs
                      </div>
                      {/* Gate 2 */}
                      <div className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-[9px] font-bold text-slate-600">
                        Flutterwave Webhook
                      </div>
                      {/* Gate 3 */}
                      <div className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-[9px] font-bold text-slate-600">
                        Pesapal Instant Notification
                      </div>
                    </div>

                    {/* Parser Middleman */}
                    <div className="w-48 p-2 bg-indigo-50 border border-indigo-200 text-center rounded-xl z-10 text-[10px] space-y-1">
                      <span className="font-extrabold text-indigo-700 uppercase">Jubu Gateway Adapter</span>
                      <p className="text-[8px] text-slate-500">Unifies payload into Standardized schema</p>
                    </div>

                    {/* Destination Action */}
                    <div className="w-56 p-2 bg-emerald-50 border border-emerald-200 text-center rounded-xl z-10 text-[10px] space-y-1">
                      <span className="font-extrabold text-emerald-700 uppercase">Subscription Record Activated</span>
                      <p className="text-[8px] text-slate-500">Grace lock deleted &bull; Expiry extended by 30 days</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Invoice Modal print overlay */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col"
          >
            {/* Modal Header */}
            <div className="bg-[#0F172A] text-white px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-1.5">
                <FileText className="h-5 w-5 text-emerald-400" />
                <span className="font-extrabold text-sm uppercase tracking-wide">Invoice PDF generation</span>
              </div>
              <button 
                onClick={() => setSelectedInvoice(null)}
                className="p-1 hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
              >
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            {/* Printable Invoice Container */}
            <div className="p-6 space-y-6 flex-1 text-slate-800 text-xs leading-relaxed">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h4 className="font-extrabold text-sm text-[#0F172A]">Junub Pharmacare</h4>
                  <p className="text-slate-400 text-[10px]">A product of Junub Pos Center</p>
                  <p className="text-slate-400 text-[10px]">Juba, South Sudan &bull; Support: support@junubpos.com</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Invoice Number</p>
                  <p className="font-mono text-base font-extrabold text-slate-900">{selectedInvoice.invoiceNo}</p>
                </div>
              </div>

              <hr className="border-slate-100" />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Invoiced To:</p>
                  <p className="font-bold text-slate-950">Juba Central Pharmacy Ltd</p>
                  <p className="text-slate-400 text-[10px] mt-0.5">subdomain: juba-central.jubapharma.com</p>
                </div>

                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Issue and Due Schedule:</p>
                  <p className="font-semibold text-slate-700">Issued: {selectedInvoice.issuedAt}</p>
                  <p className="font-semibold text-slate-700">Due: {selectedInvoice.dueDate}</p>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-150 rounded-xl overflow-hidden mt-4">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-bold text-slate-500 uppercase">
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3 text-right">Pretax Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-100 font-medium text-slate-700">
                      <td className="py-3 px-3">
                        <p className="font-bold text-slate-950">{selectedInvoice.planName} SaaS subscription</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Physical Store locks released, WhatsApp sync enabled</p>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold">${selectedInvoice.amount}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Summary calculations */}
              <div className="w-48 ml-auto space-y-1.5 text-right font-medium">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal:</span>
                  <span className="font-mono">${selectedInvoice.amount}.00</span>
                </div>
                {selectedInvoice.discount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount:</span>
                    <span className="font-mono">-${selectedInvoice.discount}.00</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-500">
                  <span>Surcharge Tax (0%):</span>
                  <span className="font-mono">$0.00</span>
                </div>
                <hr className="border-slate-150" />
                <div className="flex justify-between text-base font-extrabold text-slate-950">
                  <span>Total Paid:</span>
                  <span className="font-mono">${selectedInvoice.total}</span>
                </div>
              </div>

              {/* Stamp overlay */}
              <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Payment Channel Reference</p>
                  <p className="font-mono font-bold text-slate-600">{selectedInvoice.paymentMethod}</p>
                </div>

                <span className={`px-4 py-1.5 text-xs font-extrabold uppercase tracking-widest border-2 rounded-xl rotate-[-4deg] ${
                  selectedInvoice.status === 'paid' 
                    ? 'border-emerald-500 text-emerald-600 bg-emerald-50/50' 
                    : 'border-amber-500 text-amber-600 bg-amber-50/50'
                }`}>
                  {selectedInvoice.status}
                </span>
              </div>
            </div>

            {/* Print trigger button */}
            <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-150 flex justify-end">
              <button 
                onClick={() => window.print()}
                className="px-4 py-2 bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                Print Invoice
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
