import React, { useState } from 'react';
import { 
  BookOpen, 
  Download, 
  Printer, 
  X, 
  Search, 
  Pill, 
  ShoppingCart, 
  FileText, 
  PackageCheck, 
  Stethoscope, 
  Users, 
  BarChart3, 
  Truck, 
  ShieldCheck, 
  Building2, 
  Coins, 
  CheckCircle2, 
  HelpCircle, 
  ChevronRight,
  Globe,
  Sparkles,
  Lock,
  ArrowRight
} from 'lucide-react';

interface UserManualModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserManualModal: React.FC<UserManualModalProps> = ({ isOpen, onClose }) => {
  const [activeSection, setActiveSection] = useState<string>('overview');
  const [searchQuery, setSearchQuery] = useState<string>('');

  if (!isOpen) return null;

  const handlePrintPdf = () => {
    window.print();
  };

  const manualSections = [
    {
      id: 'overview',
      title: '1. Executive Overview & Architecture',
      icon: Building2,
      content: (
        <div className="space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-emerald-950">
            <h4 className="font-extrabold text-base flex items-center gap-2 text-emerald-900">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              Welcome to Junub Pharmacare SaaS OS v4.2
            </h4>
            <p className="text-xs text-emerald-800 leading-relaxed mt-1">
              Junub Pharmacare is a multi-branch, enterprise-grade Pharmaceutical Management & Clinical Point-of-Sale System tailored specifically for South Sudan and regional healthcare operations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-sky-600" /> Dual-Currency Engine
              </span>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Operates dynamically in both <strong>South Sudanese Pound (SSP)</strong> and <strong>US Dollars (USD)</strong> with real-time exchange rate conversions across all modules.
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <PackageCheck className="w-4 h-4 text-emerald-600" /> FEFO Inventory Control
              </span>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                First-Expiry-First-Out (FEFO) batch tracking prevents drug expiration loss and ensures strict compliance with pharmaceutical safety guidelines.
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Stethoscope className="w-4 h-4 text-rose-600" /> Clinical AI Assistant
              </span>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Integrated Gemini AI powers prescription image scanning (OCR), drug-drug interaction detection, side-effect checking, and pediatric dosage guidance.
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-600" /> Firebase Multi-Tenant Security
              </span>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Master Admin provisioning (<code className="text-rose-700 font-mono font-bold">junubposcenter@gmail.com</code>) ensures locked security, audit logging, and branch staff authentication.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'currency',
      title: '2. Currency Switching & Daily Exchange Rates',
      icon: Coins,
      content: (
        <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
          <p>
            Junub Pharmacare supports seamless <strong>SSP / USD dual-currency transactions</strong>. Pharmacists and administrators can switch system display currency instantly or adjust daily exchange rates.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-900 space-y-2">
            <h5 className="font-bold text-xs uppercase tracking-wider text-amber-950 flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-600" /> How to Change Currency &amp; Rates:
            </h5>
            <ol className="list-decimal list-inside space-y-1.5 text-xs text-amber-800">
              <li><strong>Top Header Switcher:</strong> Tap the 🇸🇸 <strong>SSP</strong> or 💵 <strong>USD</strong> pill at the top of the screen to change the entire system view instantly.</li>
              <li><strong>Exchange Rate Widget:</strong> Click on the <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono text-amber-900 font-bold">1 USD = [Rate] SSP</code> field in the top header bar to update the daily rate (e.g., 1,000 SSP).</li>
              <li><strong>POS Checkout:</strong> Customers can pay in cash, Mobile Money (m-Gurush / MoMo), or Bank Transfer in either SSP or USD. The receipt automatically displays both currencies for audit clarity.</li>
            </ol>
          </div>
        </div>
      )
    },
    {
      id: 'pos',
      title: '3. Point of Sale (POS) & Dispensing Workflow',
      icon: ShoppingCart,
      content: (
        <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
          <p>
            The POS module enables rapid drug lookup, barcode scanning, FEFO batch selection, prescription verification, and custom discount application.
          </p>
          <div className="space-y-2">
            <h5 className="font-bold text-slate-900 text-xs">Step-by-Step Checkout Process:</h5>
            <ul className="space-y-2">
              <li className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-black shrink-0">1</span>
                <div>
                  <strong>Search / Scan Item:</strong> Type the medicine name or scan its barcode. The system automatically prioritizes the batch closest to expiration (FEFO).
                </div>
              </li>
              <li className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-black shrink-0">2</span>
                <div>
                  <strong>Prescription Attachment:</strong> For prescription-only drugs (e.g. Antibiotics, Narcotics), attach a valid patient prescription ID or scan a doctor note.
                </div>
              </li>
              <li className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-black shrink-0">3</span>
                <div>
                  <strong>Payment Selection:</strong> Select Cash (SSP / USD), m-Gurush, Airtel Money, or Card. Print or export a receipt with full tax, batch numbers, and barcode.
                </div>
              </li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'prescriptions',
      title: '4. Prescription Queue & Dispensing Verification',
      icon: FileText,
      content: (
        <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
          <p>
            Process electronic prescriptions, verify dosage safety, and queue orders for pharmacist dispensing.
          </p>
        </div>
      )
    },
    {
      id: 'inventory',
      title: '5. Inventory & FEFO Expiry Tracking',
      icon: PackageCheck,
      content: (
        <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
          <p>
            Manage stock levels across multiple branch warehouses with FEFO expiration alerts (30, 60, 90 days), batch locks, and reorder point notifications.
          </p>
        </div>
      )
    },
    {
      id: 'branch_admin',
      title: '6. Branch Management & Staff Operations',
      icon: ShieldCheck,
      content: (
        <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
          <div className="bg-slate-900 text-white rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>Branch Security & Management</span>
            </div>
            <p className="text-[11px] text-slate-300">
              Provision new branches (Juba HQ, Nimule, Wau, Malakal, Yei), configure staff roles, view tenant revenue, and manage pharmacy operations securely.
            </p>
          </div>
        </div>
      )
    }
  ];

  const filteredSections = manualSections.filter(sec => 
    sec.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sec.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto">
      
      {/* Printable CSS Rules */}
      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .print-full {
            width: 100% !important;
            max-width: 100% !important;
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden print-full">
        
        {/* Header - Hidden on PDF Print */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0 no-print">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-600 flex items-center justify-center font-black text-white shadow-md shadow-rose-600/30">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black font-display text-white tracking-tight">
                  Junub Pharmacare System Manual
                </h3>
                <span className="text-[10px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-full uppercase font-mono">
                  Official PDF Guide
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Comprehensive Operating Instructions for Staff &amp; Master Admins
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Download as PDF Button */}
            <button
              onClick={handlePrintPdf}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2 ring-2 ring-emerald-400/40 active:scale-95"
              title="Click to print or save this manual as PDF document"
            >
              <Printer className="w-4 h-4" />
              <span>Download PDF Manual</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Header - Visible ONLY in Printed PDF */}
        <div className="hidden print:block p-8 border-b-2 border-slate-900 space-y-2">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-black text-slate-900 font-display">
                JUNUB PHARMACARE SaaS OS v4.2
              </h1>
              <p className="text-sm text-slate-600 font-bold">
                Official Staff Operating &amp; System Administration Manual
              </p>
              <p className="text-xs text-slate-500 mt-1">
                South Sudan Healthcare Network • Master Admin: junubposcenter@gmail.com
              </p>
            </div>
            <div className="text-right text-xs text-slate-500">
              <p>Generated: {new Date().toLocaleDateString('en-US', { dateStyle: 'full' })}</p>
              <p className="font-mono text-[10px]">Doc Ref: JP-MANUAL-2026-PDF</p>
            </div>
          </div>
        </div>

        {/* Body Layout */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Sidebar Table of Contents - Hidden on Print */}
          <div className="w-72 bg-slate-50 border-r border-slate-200 p-4 space-y-3 shrink-0 hidden md:block overflow-y-auto no-print">
            {/* Search filter */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search manual topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 pl-8 pr-3 py-1.5 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/30"
              />
            </div>

            <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider px-1">
              Table of Contents
            </div>

            <nav className="space-y-1">
              {filteredSections.map((sec) => {
                const Icon = sec.icon;
                const isActive = activeSection === sec.id;
                return (
                  <button
                    key={sec.id}
                    onClick={() => setActiveSection(sec.id)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all ${
                      isActive
                        ? 'bg-rose-600 text-white font-extrabold shadow-sm'
                        : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                      <span className="text-xs truncate">{sec.title}</span>
                    </div>
                    <ChevronRight className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  </button>
                );
              })}
            </nav>

            <div className="pt-4 border-t border-slate-200 space-y-2">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-emerald-900 text-[11px] space-y-1">
                <span className="font-extrabold flex items-center gap-1 text-emerald-800">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Quick Tip
                </span>
                <p className="text-emerald-700 leading-tight">
                  Click <strong>Download PDF Manual</strong> above to print or save a PDF copy directly to your computer.
                </p>
              </div>
            </div>
          </div>

          {/* Main Content Pane */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6 print:p-0 print:overflow-visible">
            
            {/* Show all sections if printed or selected section in viewer */}
            <div className="space-y-8">
              {manualSections
                .filter(sec => searchQuery ? filteredSections.some(f => f.id === sec.id) : true)
                .map((sec) => {
                  const isHighlighted = activeSection === sec.id;
                  const Icon = sec.icon;
                  return (
                    <div 
                      key={sec.id}
                      id={`sec-${sec.id}`}
                      className={`space-y-3 pb-6 border-b border-slate-200 last:border-b-0 ${
                        !isHighlighted && !searchQuery ? 'hidden md:hidden print:block' : 'block'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-slate-100 text-slate-800 print:bg-slate-200">
                          <Icon className="w-5 h-5 text-rose-600" />
                        </div>
                        <h3 className="text-base font-extrabold text-slate-900 font-display">
                          {sec.title}
                        </h3>
                      </div>

                      <div className="pl-1 space-y-3">
                        {sec.content}
                      </div>
                    </div>
                  );
                })}
            </div>

          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2 shrink-0 no-print">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-slate-400" />
            <span>Need additional assistance? Contact Master Admin: <code className="font-mono font-bold text-slate-700">junubposcenter@gmail.com</code></span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintPdf}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Save as PDF</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
