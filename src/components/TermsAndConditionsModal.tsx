import React, { useState } from 'react';
import { ShieldCheck, FileText, Check, X, AlertTriangle, Building2, Lock, Scale, Stethoscope } from 'lucide-react';

interface TermsAndConditionsModalProps {
  isOpen: boolean;
  onAccept: () => void;
  onDecline: () => void;
  userRole?: string;
  userName?: string;
}

export const TermsAndConditionsModal: React.FC<TermsAndConditionsModalProps> = ({
  isOpen,
  onAccept,
  onDecline,
  userRole = 'Administrator',
  userName = 'Pharmacy Manager'
}) => {
  const [agreed, setAgreed] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-extrabold">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
                Standard Terms & Conditions
                <span className="text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30 px-2 py-0.5 rounded-full uppercase">
                  Multi-Tenant SaaS
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Junub Pharmacare Operating & Security Agreement for Administrators & Managers
              </p>
            </div>
          </div>
          <div className="text-right hidden sm:block">
            <span className="text-[11px] font-mono text-emerald-400 font-bold block">{userName}</span>
            <span className="text-[10px] text-slate-400">{userRole} Credentials</span>
          </div>
        </div>

        {/* Device Alert Banner */}
        <div className="bg-amber-50 border-b border-amber-200 p-3 px-6 text-amber-900 text-xs flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>
            <strong>New Device / Session Authorization Required:</strong> As a logged-in Administrator or Manager, you must accept the standard multi-tenant pharmacy operating agreement before accessing prescription POS and inventory records.
          </span>
        </div>

        {/* Scrollable Terms Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs text-slate-700 leading-relaxed font-sans">
          
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Building2 className="w-4 h-4 text-sky-600" />
              1. Multi-Tenant Platform Scope & Data Isolation
            </h3>
            <p className="text-slate-600">
              Junub Pharmacare is a cloud-hosted multi-tenant pharmacy management SaaS platform operating in South Sudan. Each registered pharmacy entity (tenant) is provided with isolated database structures, encrypted branch store ledgers, and role-based staff authorization controls. Tenant data is strictly confidential and inaccessible to other organizations.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-emerald-600" />
              2. Clinical Dispensing & Professional Responsibility
            </h3>
            <p className="text-slate-600">
              While the platform provides automated drug interaction alerts, weight-based pediatric dosage tools, and First-Expired, First-Out (FEFO) inventory tracking, <strong>licensed pharmacists and pharmacy managers maintain sole professional and legal responsibility</strong> for inspecting physical drug quality, verifying doctor prescriptions, confirming dosage safety, and complying with South Sudan Ministry of Health pharmaceutical standards.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-600" />
              3. Branch Licensing & Staff Security Controls
            </h3>
            <ul className="list-disc pl-5 space-y-1 text-slate-600">
              <li>Each pharmacy tenant is licensed for up to 3 active branch clinic nodes (inclusive of HQ).</li>
              <li>Administrators and Managers are responsible for setting unique passwords for all staff members.</li>
              <li>Staff credentials must not be shared. All POS checkouts, inventory adjustments, and voided sales are bound to the active user ID and recorded in the audit ledger.</li>
            </ul>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Lock className="w-4 h-4 text-rose-600" />
              4. Patient Record Confidentiality & Audit Compliance
            </h3>
            <p className="text-slate-600">
              All patient personal health information, prescription histories, and credit ledgers stored within the system must be handled in strict accordance with professional medical confidentiality guidelines. Unauthorized disclosure or export of patient medical files is strictly prohibited under pharmacy licensing regulations.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-600" />
              5. Local Storage & Offline Operations
            </h3>
            <p className="text-slate-600">
              To support continuous pharmacy operations during internet disruptions in South Sudan, sales checkouts and inventory updates are cached locally in secure browser storage and synchronized to the central cloud server upon reconnection. Managers must ensure local device hardware is physically secured.
            </p>
          </div>

        </div>

        {/* Modal Footer & Confirmation Checkbox */}
        <div className="bg-slate-50 border-t border-slate-200 p-6 space-y-4">
          <label className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
            />
            <span className="text-xs text-slate-800 font-medium leading-tight">
              I certify that I am an authorized Administrator or Pharmacy Manager for Junub Pharmacare. I have read, understood, and agree to abide by these standard multi-tenant pharmacy operating terms and regulatory guidelines.
            </span>
          </label>

          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-1">
            <button
              onClick={onDecline}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Decline & Sign Out
            </button>
            <button
              disabled={!agreed}
              onClick={onAccept}
              className={`px-6 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
                agreed
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>Accept Terms & Proceed</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
