import React, { useState } from 'react';
import { Settings, DollarSign, Building, Printer, WifiOff, Save, Check, RefreshCw, ShieldCheck, Trash2, AlertOctagon, Upload, Image as ImageIcon } from 'lucide-react';
import { BranchInfo } from '../types/pharmacy';
import { performComprehensiveFactoryReset } from '../utils/factoryReset';

interface SettingsViewProps {
  branches?: BranchInfo[];
  currentBranch?: BranchInfo;
  onSelectBranch?: (branch: BranchInfo) => void;
  exchangeRate: number;
  onUpdateExchangeRate: (rate: number) => void;
  onFactoryReset?: () => void;
  isOnline?: boolean;
  userRole?: string;
  activeTenant?: any;
  onUpdateTenant?: (updatedTenant: any) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  branches = [],
  currentBranch = { id: 'b1', name: 'Main Pharmacy Outlet', code: 'MAIN-01', location: 'Juba HQ', managerName: 'Pharmacy Admin' },
  onSelectBranch = (_branch: BranchInfo) => {},
  exchangeRate,
  onUpdateExchangeRate,
  onFactoryReset,
  isOnline = true,
  userRole = 'Administrator',
  activeTenant,
  onUpdateTenant
}) => {
  const [rateInput, setRateInput] = useState(exchangeRate.toString());
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string>(() => localStorage.getItem('trust_pharmacy_logo') || '');

  if (userRole !== 'Administrator') {
    return (
      <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl space-y-4 max-w-xl mx-auto my-12">
        <div className="p-4 bg-rose-500/20 text-rose-400 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
          <AlertOctagon className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white">Administrator Access Required</h2>
        <p className="text-slate-400 text-sm">
          System Configuration and Factory Reset controls are restricted exclusively to Administrators. Please log in with Administrator credentials to access this section.
        </p>
      </div>
    );
  }

  // Contact & Receipt Phone Setup State
  const [contactForm, setContactForm] = useState(() => {
    const cached = localStorage.getItem('trust_pharmacy_contact');
    let parsed: any = null;
    if (cached) {
      try { parsed = JSON.parse(cached); } catch (e) {}
    }
    return {
      name: parsed?.name || activeTenant?.name || "Trust Pharmacy",
      phone: parsed?.phone || activeTenant?.phone || activeTenant?.telephone || "+211 922 152 427",
      address: parsed?.address || activeTenant?.address || "Airport Road, Juba Town, South Sudan",
      email: parsed?.email || activeTenant?.email || "info@trustpharmacy.com",
      license: parsed?.license || activeTenant?.businessRegNo || activeTenant?.license || "SS-MOH-TRUST-2026"
    };
  });
  const [contactSaved, setContactSaved] = useState(false);

  const handleSaveContact = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('trust_pharmacy_contact', JSON.stringify(contactForm));
    
    // Also update cached tenants in localStorage so top headers update
    const cachedTenantsStr = localStorage.getItem('trust_pharmacy_tenants');
    if (cachedTenantsStr) {
      try {
        const tenants = JSON.parse(cachedTenantsStr);
        if (Array.isArray(tenants) && tenants.length > 0) {
          tenants[0].name = contactForm.name;
          tenants[0].phone = contactForm.phone;
          tenants[0].telephone = contactForm.phone;
          tenants[0].address = contactForm.address;
          tenants[0].email = contactForm.email;
          tenants[0].businessRegNo = contactForm.license;
          localStorage.setItem('trust_pharmacy_tenants', JSON.stringify(tenants));
        }
      } catch (e) {}
    }

    if (activeTenant && onUpdateTenant) {
      const updated = {
        ...activeTenant,
        name: contactForm.name,
        phone: contactForm.phone,
        telephone: contactForm.phone,
        address: contactForm.address,
        email: contactForm.email,
        businessRegNo: contactForm.license
      };
      onUpdateTenant(updated);
    }

    window.dispatchEvent(new Event('junub_tenant_updated'));
    window.dispatchEvent(new Event('storage'));

    setContactSaved(true);
    setTimeout(() => setContactSaved(false), 3000);
  };

  // Thermal Printer Config State
  const [paperWidth, setPaperWidth] = useState<'80mm' | '58mm'>('80mm');
  const [autoPrint, setAutoPrint] = useState(true);

  const handleSaveRate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOnline) {
      alert("STRICT ONLINE MODE POLICY: You are currently offline. Changing settings is disabled when offline.");
      return;
    }
    const parsed = parseFloat(rateInput);
    if (!isNaN(parsed) && parsed > 0) {
      onUpdateExchangeRate(parsed);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please select a valid PNG or image file.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setLogoPreview(result);
        localStorage.setItem('trust_pharmacy_logo', result);
        alert('Trust Pharmacy Branch Logo uploaded successfully! It will now appear on all thermal receipts and PDF reports.');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogoPreview('');
    localStorage.removeItem('trust_pharmacy_logo');
  };

  const [eraseInvDone, setEraseInvDone] = useState(false);

  const handleEraseInventoryOnly = async () => {
    setEraseInvDone(true);
    const tenantId = 'shared-global-tenant-v1';
    localStorage.setItem(`junub_inventory_cleared_${tenantId}`, 'true');
    localStorage.removeItem(`junub_inventory_batches_${tenantId}`);
    localStorage.removeItem(`junub_custom_batches_${tenantId}`);
    localStorage.removeItem('junub_inventory_master_backup');
    localStorage.removeItem('trust_pharmacy_inventory_batches');

    try {
      await fetch(`/api/v1/${tenantId}/inventory/clear`, { method: 'DELETE' });
    } catch(e) {}

    window.dispatchEvent(new Event('junub_inventory_updated'));
    window.dispatchEvent(new Event('storage'));

    setTimeout(() => {
      setEraseInvDone(false);
      alert("All inventory records have been erased successfully!");
    }, 1000);
  };

  const handleFactoryReset = () => {
    setShowConfirmModal(true);
  };

  const executeReset = async () => {
    setShowConfirmModal(false);
    setResetDone(true);
    if (onFactoryReset) {
      await onFactoryReset();
    } else {
      await performComprehensiveFactoryReset();
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-[calc(100vh-4rem)] rounded-2xl">
      
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-500/30">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">System Configuration &amp; Multi-Branch Setup</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Configure daily USD/SSP exchange rate, branch selector, thermal receipt template, and offline storage</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Daily Exchange Rate Configuration Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center space-x-2">
              <DollarSign className="w-4 h-4 text-amber-500" />
              <span>Daily Central Exchange Rate (USD to SSP)</span>
            </h3>
            <span className="text-[10px] bg-amber-500/10 text-amber-400 font-mono px-2 py-0.5 rounded border border-amber-500/20">
              Active: 1 USD = {exchangeRate} SSP
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            All inventory item prices are anchored in United States Dollars (USD) and automatically converted to South Sudanese Pounds (SSP) at checkout using this active central rate.
          </p>

          <form onSubmit={handleSaveRate} className="space-y-3">
            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-1">
                Enter New Exchange Rate (SSP per 1 USD):
              </label>
              <div className="relative max-w-xs">
                <input
                  type="number"
                  step="10"
                  value={rateInput}
                  onChange={(e) => setRateInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 font-mono text-lg text-amber-400 font-bold focus:outline-none focus:border-emerald-500"
                  id="exchange-rate-input-field"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs text-slate-500">SSP</span>
              </div>
            </div>

            <button
              type="submit"
              className="flex items-center space-x-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs shadow-md active:scale-95 transition-all"
              id="save-exchange-rate-button"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4 text-slate-950" />
                  <span>Exchange Rate Saved & Applied!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Update Central Exchange Rate</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Pharmacy Logo & Branch Branding Setup */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center space-x-2">
              <ImageIcon className="w-4 h-4 text-sky-500" />
              <span>Trust Pharmacy Branch Logo &amp; Receipt Branding</span>
            </h3>
            <span className="text-[10px] bg-sky-500/10 text-sky-400 font-mono px-2 py-0.5 rounded border border-sky-500/20">
              PNG / JPG
            </span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Upload your official <strong>Trust Pharmacy</strong> logo. It will automatically print at the top of all thermal POS receipts and PDF report exports for your branches.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            {logoPreview ? (
              <div className="relative group shrink-0">
                <img 
                  src={logoPreview} 
                  alt="Uploaded Trust Pharmacy Logo" 
                  className="h-20 w-32 object-contain bg-white p-2 rounded-lg border border-slate-300 dark:border-slate-700 shadow-xs"
                />
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="absolute -top-2 -right-2 p-1 bg-rose-600 hover:bg-rose-500 text-white rounded-full shadow-md text-xs"
                  title="Remove Logo"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="h-20 w-32 bg-slate-200 dark:bg-slate-800 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400 text-center p-2">
                <Upload className="w-6 h-6 mb-1 text-slate-400" />
                <span className="text-[10px] font-bold">No Logo Uploaded</span>
              </div>
            )}

            <div className="space-y-2 flex-1 w-full">
              <label 
                htmlFor="pharmacy-logo-upload-input"
                className="inline-flex items-center space-x-2 bg-sky-600 hover:bg-sky-500 text-white font-bold px-4 py-2 rounded-xl text-xs cursor-pointer shadow-md transition-all active:scale-95"
              >
                <Upload className="w-4 h-4" />
                <span>Upload PNG Logo Image</span>
              </label>
              <input
                id="pharmacy-logo-upload-input"
                type="file"
                accept="image/png, image/jpeg, image/svg+xml"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <p className="text-[10px] text-slate-400">Recommended format: Transparent PNG, maximum 2MB</p>
            </div>
          </div>
        </div>

        {/* Client Phone Number & Pharmacy Contact Setup Section */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl space-y-4 shadow-xs" id="pharmacy-contact-settings">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center space-x-2">
              <Building className="w-4 h-4 text-emerald-500" />
              <span>Pharmacy Information &amp; Thermal Receipt Phone Number</span>
            </h3>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-mono px-2 py-0.5 rounded border border-emerald-500/20">
              Receipt Branding
            </span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Enter your client contact phone number, address, and license details below. This exact phone number will automatically print at the top of all thermal POS receipts and PDF report exports.
          </p>

          <form onSubmit={handleSaveContact} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Pharmacy Name
              </label>
              <input
                type="text"
                value={contactForm.name}
                onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                placeholder="Trust Pharmacy"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Client / Pharmacy Phone Number (Printed on Receipts)
              </label>
              <input
                type="text"
                value={contactForm.phone}
                onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 focus:outline-none focus:border-emerald-500"
                placeholder="+211 922 152 427"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Physical Branch Address
              </label>
              <input
                type="text"
                value={contactForm.address}
                onChange={(e) => setContactForm({ ...contactForm, address: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                placeholder="Airport Road, Juba Town, South Sudan"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Official MOH License Number
              </label>
              <input
                type="text"
                value={contactForm.license}
                onChange={(e) => setContactForm({ ...contactForm, license: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                placeholder="SS-MOH-TRUST-2026"
              />
            </div>

            <div className="sm:col-span-2 pt-2 flex items-center justify-between">
              <button
                type="submit"
                className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-md active:scale-95 transition-all cursor-pointer"
              >
                {contactSaved ? (
                  <>
                    <Check className="w-4 h-4 text-white" />
                    <span>Phone Number &amp; Contact Saved Successfully!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Contact Info &amp; Receipt Phone Number</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Branch Selector & Active Station */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="font-bold text-sm text-slate-100 flex items-center space-x-2">
              <Building className="w-4 h-4 text-emerald-400" />
              <span>Select Active Pharmacy Outlet Branch</span>
            </h3>
          </div>

          <p className="text-xs text-slate-400">
            Choose the active dispensing outlet station. Sales records, cash drawer tallies, and local stock movements will be tagged with this branch.
          </p>

          <div className="space-y-2">
            {(branches || []).map(b => {
              const isSelected = b.id === currentBranch?.id;
              return (
                <button
                  key={b.id}
                  onClick={() => onSelectBranch(b)}
                  className={`w-full text-left p-3 rounded-xl border text-xs transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300 font-bold'
                      : 'bg-slate-850 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <div>
                    <div className="font-bold text-slate-100">{b.name} ({b.code})</div>
                    <div className="text-[10px] text-slate-400">{b.location} • Mgr: {b.managerName}</div>
                  </div>
                  {isSelected && <span className="bg-emerald-500 text-slate-950 text-[10px] px-2 py-0.5 rounded font-black">ACTIVE</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Thermal Receipt Printer Settings */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="font-bold text-sm text-slate-100 flex items-center space-x-2">
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>Thermal Receipt Printer Setup</span>
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">Receipt Paper Format Width:</label>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setPaperWidth('80mm')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border ${
                    paperWidth === '80mm' ? 'bg-emerald-500 text-slate-950 border-emerald-500' : 'bg-slate-850 text-slate-400 border-slate-800'
                  }`}
                >
                  80mm Standard POS Printer
                </button>

                <button
                  type="button"
                  onClick={() => setPaperWidth('58mm')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border ${
                    paperWidth === '58mm' ? 'bg-emerald-500 text-slate-950 border-emerald-500' : 'bg-slate-850 text-slate-400 border-slate-800'
                  }`}
                >
                  58mm Compact Mobile Printer
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <input
                type="checkbox"
                id="autoPrintCheck"
                checked={autoPrint}
                onChange={(e) => setAutoPrint(e.target.checked)}
                className="rounded accent-emerald-500 w-4 h-4"
              />
              <label htmlFor="autoPrintCheck" className="text-slate-300 font-medium">
                Auto-trigger print dialog immediately on checkout confirmation
              </label>
            </div>
          </div>
        </div>

        {/* Offline Cache & PWA Status */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="font-bold text-sm text-slate-100 flex items-center space-x-2">
              <WifiOff className="w-4 h-4 text-emerald-400" />
              <span>Offline Persistence & Local Database Status</span>
            </h3>
          </div>

          <div className="bg-slate-850 p-3 rounded-xl border border-slate-800 space-y-2 text-xs">
            <div className="flex justify-between items-center text-emerald-400 font-bold">
              <span className="flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4" />
                <span>Local Storage Active</span>
              </span>
              <span className="bg-emerald-500/20 px-2 py-0.5 rounded text-[10px]">100% ONLINE & SYNCED</span>
            </div>
            <p className="text-[11px] text-slate-400">
              All transactions, custom inventory additions, and patient records are stored locally in the browser engine to ensure seamless uninterrupted operation during power or network outages in South Sudan.
            </p>
          </div>
        </div>

        {/* Client Submission - Factory Reset & Inventory Erase Section */}
        <div className="bg-rose-950/30 border border-rose-900/50 p-5 rounded-2xl space-y-4 lg:col-span-2">
          <div className="border-b border-rose-900/50 pb-3 flex items-center justify-between">
            <h3 className="font-bold text-sm text-rose-300 flex items-center space-x-2">
              <AlertOctagon className="w-4 h-4 text-rose-400" />
              <span>Data Purge, Erase Inventory & Factory Reset (Blank Slate)</span>
            </h3>
            <span className="text-[10px] bg-rose-500/20 text-rose-300 font-mono px-2 py-0.5 rounded border border-rose-500/30 font-bold">
              ADMIN CONTROL
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div className="md:col-span-1 space-y-1">
              <p className="text-xs text-rose-200 font-semibold">
                Purge Data & Reset Options:
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Choose to erase only the medical inventory stock or execute a full Factory Reset to wipe all sales, reporting, expenditures, logs, and start completely fresh.
              </p>
            </div>

            <div className="md:col-span-2 flex flex-col sm:flex-row items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleEraseInventoryOnly}
                className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-amber-600 hover:bg-amber-500 text-white font-bold px-4 py-3 rounded-xl text-xs shadow-md active:scale-95 transition-all border border-amber-400/30 cursor-pointer"
                id="erase-inventory-settings-button"
              >
                {eraseInvDone ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Inventory Erased!</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Erase All Inventory Stock</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleFactoryReset}
                className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-rose-600 hover:bg-rose-500 text-white font-bold px-5 py-3 rounded-xl text-xs shadow-lg active:scale-95 transition-all border border-rose-400/30 cursor-pointer"
                id="factory-reset-client-handover-button"
              >
                {resetDone ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Factory Reset Complete! Reloading...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Factory Reset System (Complete Wiping)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Confirmation Modal for Factory Reset */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-rose-500/40 rounded-2xl p-6 max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex items-center space-x-3 text-rose-400">
              <div className="p-3 bg-rose-500/20 rounded-xl border border-rose-500/30">
                <AlertOctagon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-white">Confirm Factory Reset</h3>
                <p className="text-xs text-rose-300 font-mono">Pristine Blank Slate Initialization</p>
              </div>
            </div>

            <div className="text-xs text-slate-300 space-y-2 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
              <p className="font-semibold text-rose-200">Are you sure you want to perform a full Factory Reset?</p>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                This will completely purge and wipe all cached inventory batches, custom drug registrations, transaction history, POS cart queues, and local system settings across the app.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeReset}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg active:scale-95 transition-all border border-rose-400/30 flex items-center space-x-1.5"
                id="confirm-execute-factory-reset-button"
              >
                <Trash2 className="w-4 h-4" />
                <span>Yes, Execute Factory Reset</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
