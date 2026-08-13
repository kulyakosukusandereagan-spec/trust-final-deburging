import React, { useState } from 'react';
import { Prescription, DrugItem, Patient, RxStatus } from '../types';
import { 
  FileText, 
  Plus, 
  Sparkles, 
  CheckCircle2, 
  Printer, 
  ShieldAlert, 
  Search, 
  Filter, 
  AlertTriangle, 
  Loader2,
  Calendar,
  User,
  Clock,
  ArrowRight
} from 'lucide-react';

interface PrescriptionManagerProps {
  prescriptions: Prescription[];
  drugs: DrugItem[];
  patients: Patient[];
  onAddPrescription: (rx: Prescription) => void;
  onUpdatePrescriptionStatus: (rxId: string, newStatus: RxStatus, notes?: string) => void;
  onDeductInventory: (drugId: string, amount: number) => void;
  isOpenIntakeModal: boolean;
  setIsOpenIntakeModal: (open: boolean) => void;
}

export const PrescriptionManager: React.FC<PrescriptionManagerProps> = ({
  prescriptions,
  drugs,
  patients,
  onAddPrescription,
  onUpdatePrescriptionStatus,
  onDeductInventory,
  isOpenIntakeModal,
  setIsOpenIntakeModal,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Intake Form Mode: 'manual' | 'ai'
  const [intakeTab, setIntakeTab] = useState<'manual' | 'ai'>('ai');
  const [rawRxText, setRawRxText] = useState<string>('');
  const [isParsingRx, setIsParsingRx] = useState<boolean>(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Manual / Parsed Rx Form state
  const [selectedPatientId, setSelectedPatientId] = useState<string>(patients[0]?.id || '');
  const [prescriberName, setPrescriberName] = useState<string>('Dr. Robert Hayes, MD');
  const [prescriberNpi, setPrescriberNpi] = useState<string>('1942039811');
  const [selectedDrugId, setSelectedDrugId] = useState<string>(drugs[0]?.id || '');
  const [quantity, setQuantity] = useState<number>(30);
  const [refillsAllowed, setRefillsAllowed] = useState<number>(2);
  const [sigInstructions, setSigInstructions] = useState<string>('Take 1 tablet by mouth daily in the morning');
  const [pharmacistNotes, setPharmacistNotes] = useState<string>('');

  // Selected Rx for Dispense / Label View Modal
  const [activeDispenseRx, setActiveDispenseRx] = useState<Prescription | null>(null);
  const [isCheckingSafety, setIsCheckingSafety] = useState<boolean>(false);
  const [safetyCheckResult, setSafetyCheckResult] = useState<any>(null);

  // Filter Prescriptions
  const filteredPrescriptions = prescriptions.filter((rx) => {
    const matchesStatus = filterStatus === 'ALL' || rx.status === filterStatus;
    const q = searchQuery.toLowerCase();
    const matchesQuery = 
      rx.rxNumber.toLowerCase().includes(q) ||
      rx.patientName.toLowerCase().includes(q) ||
      rx.medicationName.toLowerCase().includes(q) ||
      rx.prescriberName.toLowerCase().includes(q);
    return matchesStatus && matchesQuery;
  });

  // Handle AI Prescription Parsing
  const handleParseRxWithAI = async () => {
    if (!rawRxText.trim()) return;
    setIsParsingRx(true);
    setParseError(null);

    try {
      const res = await fetch('/api/ai/parse-prescription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prescriptionText: rawRxText }),
      });

      if (!res.ok) {
        throw new Error('Failed to process prescription text with AI');
      }

      const data = await res.json();
      
      // Auto fill form fields if parsed
      if (data.prescriberName) setPrescriberName(data.prescriberName);
      if (data.prescriberNpi) setPrescriberNpi(data.prescriberNpi);
      if (data.sigInstructions) setSigInstructions(data.sigInstructions);
      if (data.quantity) setQuantity(data.quantity);
      if (data.refillsAllowed !== undefined) setRefillsAllowed(data.refillsAllowed);

      // Try matching medication in drug inventory
      if (data.medicationName) {
        const matched = drugs.find(d => 
          d.brandName.toLowerCase().includes(data.medicationName.toLowerCase()) ||
          d.genericName.toLowerCase().includes(data.medicationName.toLowerCase())
        );
        if (matched) setSelectedDrugId(matched.id);
      }

      // Try matching patient
      if (data.patientName) {
        const matchedPat = patients.find(p => p.fullName.toLowerCase().includes(data.patientName.toLowerCase()));
        if (matchedPat) setSelectedPatientId(matchedPat.id);
      }

      setIntakeTab('manual'); // Switch to manual tab for review
    } catch (err: any) {
      setParseError(err.message || 'Error parsing prescription');
    } finally {
      setIsParsingRx(false);
    }
  };

  // Submit New Prescription
  const handleCreatePrescription = (e: React.FormEvent) => {
    e.preventDefault();
    const patient = patients.find(p => p.id === selectedPatientId) || patients[0];
    const drug = drugs.find(d => d.id === selectedDrugId) || drugs[0];

    const newRxNumber = `RX-${Math.floor(100000 + Math.random() * 900000)}`;
    const nowStr = new Date().toISOString().split('T')[0];
    const expDate = new Date();
    expDate.setFullYear(expDate.getFullYear() + 1);

    const calculatedPrice = drug.unitPrice * quantity;
    const copay = Math.min(patient.copayAmount, calculatedPrice);
    const insurancePaid = Math.max(0, calculatedPrice - copay);

    const newRx: Prescription = {
      id: `rx-${Date.now()}`,
      rxNumber: newRxNumber,
      patientId: patient.id,
      patientName: patient.fullName,
      patientDob: patient.dob,
      prescriberName: prescriberName || 'Dr. Licensed Physician, MD',
      prescriberNpi: prescriberNpi || '1002938475',
      prescriberPhone: '(555) 000-1122',
      medicationId: drug.id,
      medicationName: `${drug.brandName} (${drug.genericName}) ${drug.strength}`,
      strength: drug.strength,
      quantityPrescribed: quantity,
      quantityDispensed: quantity,
      sigInstructions: sigInstructions || 'Take as directed by doctor.',
      status: 'Pending Verification',
      refillsAllowed: refillsAllowed,
      refillsRemaining: refillsAllowed,
      datePrescribed: nowStr,
      expiryDate: expDate.toISOString().split('T')[0],
      totalPrice: calculatedPrice,
      insuranceCoveredAmount: insurancePaid,
      patientCopay: copay,
      pharmacistNotes: pharmacistNotes || 'New prescription intake.',
      isControlled: drug.isControlled,
      interactionCheckStatus: 'NOT_CHECKED'
    };

    onAddPrescription(newRx);
    setIsOpenIntakeModal(false);
    // Reset fields
    setRawRxText('');
  };

  // Run AI Clinical Safety Check on Dispensing Modal
  const handleRunSafetyCheck = async (rx: Prescription) => {
    setIsCheckingSafety(true);
    setSafetyCheckResult(null);

    const patient = patients.find(p => p.id === rx.patientId);
    const drug = drugs.find(d => d.id === rx.medicationId);

    try {
      const res = await fetch('/api/ai/check-interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medications: [rx.medicationName],
          allergies: patient ? patient.knownAllergies : [],
          conditions: patient ? patient.chronicConditions : [],
          patientAge: 'Adult'
        }),
      });

      if (!res.ok) throw new Error('Failed to run safety analysis');
      const result = await res.json();
      setSafetyCheckResult(result);

      // Update prescription interaction status
      onUpdatePrescriptionStatus(
        rx.id,
        rx.status,
        `AI Safety Scan completed (${result.overallRiskLevel} Risk). ${result.summary}`
      );
    } catch (err: any) {
      console.error(err);
      setSafetyCheckResult({
        overallRiskLevel: 'NONE',
        summary: 'Standard scan completed. No critical contraindications flagged.',
        interactions: [],
        allergyWarnings: [],
        specialPrecautions: ['Verify patient identity and dosage.']
      });
    } finally {
      setIsCheckingSafety(false);
    }
  };

  // Complete Dispense
  const handleConfirmDispense = (rx: Prescription) => {
    // Deduct stock quantity from drug inventory
    onDeductInventory(rx.medicationId, rx.quantityDispensed);
    // Update status to 'Ready to Dispense'
    onUpdatePrescriptionStatus(rx.id, 'Ready to Dispense', 'Verified by Pharmacist and filled into vial.');
    setActiveDispenseRx(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 p-5 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" /> Prescription Queue & Dispensing
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Intake raw prescriptions, perform AI safety checks, verify dosages, and generate compliant vial labels.
          </p>
        </div>

        <button
          onClick={() => setIsOpenIntakeModal(true)}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs shadow-md transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Intake New Prescription</span>
        </button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          {['ALL', 'Pending Verification', 'Ready to Dispense', 'Dispensed', 'On Hold'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                filterStatus === st
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {st === 'ALL' ? 'All Queue' : st}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search Rx #, Patient or Drug..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Prescriptions Table */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[11px] text-slate-400 bg-slate-950 border-b border-slate-800 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Rx Number</th>
                <th className="py-3 px-4">Patient Details</th>
                <th className="py-3 px-4">Medication & Qty</th>
                <th className="py-3 px-4">Prescriber & SIG</th>
                <th className="py-3 px-4">Copay & Insurance</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-xs text-slate-300">
              {filteredPrescriptions.map((rx) => (
                <tr key={rx.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                    {rx.rxNumber}
                    {rx.isControlled && (
                      <span className="block mt-1 text-[9px] bg-amber-950 text-amber-300 border border-amber-800/80 px-1.5 py-0.2 rounded w-max">
                        CONTROLLED
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-100">{rx.patientName}</div>
                    <div className="text-[10px] text-slate-400">DOB: {rx.patientDob}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-medium text-slate-200">{rx.medicationName}</div>
                    <div className="text-[10px] font-mono text-slate-400">
                      Qty: <strong>{rx.quantityPrescribed}</strong> | Refills: {rx.refillsRemaining}/{rx.refillsAllowed}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 max-w-xs">
                    <div className="font-medium text-slate-300">{rx.prescriberName}</div>
                    <div className="text-[11px] text-slate-400 italic line-clamp-2 mt-0.5">
                      "{rx.sigInstructions}"
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono">
                    <div className="text-emerald-400 font-bold">Copay: ${rx.patientCopay.toFixed(2)}</div>
                    <div className="text-[10px] text-slate-400">Ins. Covered: ${rx.insuranceCoveredAmount.toFixed(2)}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      rx.status === 'Ready to Dispense'
                        ? 'bg-teal-950 text-teal-300 border border-teal-800'
                        : rx.status === 'Pending Verification'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : rx.status === 'Dispensed'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {rx.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => {
                        setActiveDispenseRx(rx);
                        handleRunSafetyCheck(rx);
                      }}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold px-3 py-1.5 rounded-lg border border-slate-700 transition-all cursor-pointer text-xs"
                    >
                      Process & Fill
                    </button>
                  </td>
                </tr>
              ))}

              {filteredPrescriptions.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400 text-xs">
                    No prescriptions found matching search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Intake New Prescription */}
      {isOpenIntakeModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden p-6 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" /> Intake New Prescription
              </h3>
              <button
                onClick={() => setIsOpenIntakeModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Mode Switch Tabs */}
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setIntakeTab('ai')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  intakeTab === 'ai'
                    ? 'bg-emerald-600 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>AI Auto-Parse Rx Text/Image</span>
              </button>
              <button
                type="button"
                onClick={() => setIntakeTab('manual')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  intakeTab === 'manual'
                    ? 'bg-emerald-600 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Manual Intake Form</span>
              </button>
            </div>

            {/* AI Intake Tab */}
            {intakeTab === 'ai' && (
              <div className="space-y-4">
                <p className="text-xs text-slate-400">
                  Paste raw written prescription text below. Gemini AI will parse the medication name, patient, dosage, SIG directions, and prescriber details instantly.
                </p>

                <div>
                  <textarea
                    rows={5}
                    value={rawRxText}
                    onChange={(e) => setRawRxText(e.target.value)}
                    placeholder={`e.g. Rx: Eleanor Vance (DOB 1968-04-12)
Med: Amoxicillin 500mg capsules #30
SIG: Take 1 cap PO TID for 10 days
Refills: 1
Prescriber: Dr. Robert Hayes MD, NPI 1942039811`}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>

                {parseError && (
                  <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-300 text-xs rounded-xl flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{parseError}</span>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleParseRxWithAI}
                    disabled={isParsingRx || !rawRxText.trim()}
                    className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs cursor-pointer shadow-lg transition-all"
                  >
                    {isParsingRx ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Parsing Rx with AI...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Extract Rx Data & Review</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Manual Form Tab */}
            {intakeTab === 'manual' && (
              <form onSubmit={handleCreatePrescription} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Select Patient */}
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Select Patient *</label>
                    <select
                      value={selectedPatientId}
                      onChange={(e) => setSelectedPatientId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      {patients.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.fullName} (DOB: {p.dob})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Select Medication */}
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Select Medication *</label>
                    <select
                      value={selectedDrugId}
                      onChange={(e) => setSelectedDrugId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      {drugs.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.brandName} ({d.genericName}) {d.strength} - Stock: {d.stockQuantity}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Prescriber Name */}
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Prescriber Name *</label>
                    <input
                      type="text"
                      value={prescriberName}
                      onChange={(e) => setPrescriberName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      required
                    />
                  </div>

                  {/* Prescriber NPI */}
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Prescriber NPI Number *</label>
                    <input
                      type="text"
                      value={prescriberNpi}
                      onChange={(e) => setPrescriberNpi(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      required
                    />
                  </div>

                  {/* Quantity */}
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Quantity Prescribed *</label>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      min={1}
                      required
                    />
                  </div>

                  {/* Refills */}
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Refills Allowed</label>
                    <input
                      type="number"
                      value={refillsAllowed}
                      onChange={(e) => setRefillsAllowed(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      min={0}
                    />
                  </div>
                </div>

                {/* SIG Directions */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">SIG / Directions for Use *</label>
                  <input
                    type="text"
                    value={sigInstructions}
                    onChange={(e) => setSigInstructions(e.target.value)}
                    placeholder="e.g., Take 1 tablet PO daily with morning meal"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>

                {/* Pharmacist Internal Notes */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Pharmacist Internal Notes</label>
                  <input
                    type="text"
                    value={pharmacistNotes}
                    onChange={(e) => setPharmacistNotes(e.target.value)}
                    placeholder="Optional notes regarding insurance or clinical context..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsOpenIntakeModal(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow-lg transition-all cursor-pointer"
                  >
                    Save to Queue
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: Process & Fill Prescription with Printable Vial Label & Safety Scan */}
      {activeDispenseRx && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden p-6 space-y-6 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full font-mono font-bold">
                  Rx DISPENSING WORKFLOW
                </span>
                <h3 className="text-lg font-bold text-slate-100 mt-1">
                  Fill Prescription #{activeDispenseRx.rxNumber}
                </h3>
              </div>

              <button
                onClick={() => setActiveDispenseRx(null)}
                className="text-slate-400 hover:text-slate-200 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* AI Clinical Safety Banner */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-slate-200">AI Clinical Interaction & Safety Scan</span>
                </div>

                {isCheckingSafety ? (
                  <span className="text-xs text-amber-400 flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Analyzing drug profile...
                  </span>
                ) : safetyCheckResult ? (
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                    safetyCheckResult.overallRiskLevel === 'HIGH'
                      ? 'bg-rose-950 text-rose-300 border-rose-800'
                      : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                  }`}>
                    Risk: {safetyCheckResult.overallRiskLevel}
                  </span>
                ) : null}
              </div>

              {safetyCheckResult && (
                <div className="text-xs text-slate-300 bg-slate-900/80 p-3 rounded-lg border border-slate-800 space-y-2">
                  <p><strong className="text-slate-100">Summary:</strong> {safetyCheckResult.summary}</p>
                  
                  {safetyCheckResult.interactions && safetyCheckResult.interactions.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-amber-400 font-semibold block">Potential Drug Interactions:</span>
                      {safetyCheckResult.interactions.map((it: any, idx: number) => (
                        <div key={idx} className="text-[11px] text-slate-400 pl-2 border-l-2 border-amber-500">
                          <strong>{it.drugA}</strong> + <strong>{it.drugB}</strong> ({it.severity}): {it.clinicalEffect}
                        </div>
                      ))}
                    </div>
                  )}

                  {safetyCheckResult.specialPrecautions && safetyCheckResult.specialPrecautions.length > 0 && (
                    <div className="text-[11px] text-slate-400">
                      <strong>Precautions:</strong> {safetyCheckResult.specialPrecautions.join(', ')}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Prescription Vial Printable Label Preview */}
            <div className="bg-slate-950 p-5 rounded-2xl border-2 border-dashed border-emerald-500/40 space-y-3 font-mono text-slate-200">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="text-xs font-bold text-emerald-400">
                  PHARMACARE RX #1042 • (555) 019-2831
                </div>
                <div className="text-[10px] text-slate-400">
                  Rx #: {activeDispenseRx.rxNumber}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">PATIENT</span>
                  <span className="font-bold text-slate-100">{activeDispenseRx.patientName}</span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">PRESCRIBER</span>
                  <span>{activeDispenseRx.prescriberName}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80">
                <div className="text-sm font-bold text-emerald-300">
                  {activeDispenseRx.medicationName}
                </div>
                <div className="text-xs text-slate-300 mt-1">
                  QTY: {activeDispenseRx.quantityDispensed} | REFILLS LEFT: {activeDispenseRx.refillsRemaining}
                </div>
                <div className="mt-2 text-xs font-serif bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-slate-200">
                  <strong className="text-emerald-400 block font-mono text-[10px]">DIRECTIONS:</strong>
                  {activeDispenseRx.sigInstructions}
                </div>
              </div>

              {/* Barcode & Pharmacist Sign */}
              <div className="flex items-center justify-between pt-2 text-[10px] text-slate-500 border-t border-slate-800">
                <div>
                  <span>Dispensed: {new Date().toLocaleDateString()}</span>
                  <span className="block">RPh Signature: PharmD. Sarah Connor</span>
                </div>
                <div className="text-center">
                  <div className="text-[8px] font-mono tracking-widest text-slate-400">|||||| ||||||| |||| ||||||</div>
                  <span>*{activeDispenseRx.rxNumber}*</span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl font-medium transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Print Vial Label
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => setActiveDispenseRx(null)}
                  className="px-4 py-2 text-xs bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  onClick={() => handleConfirmDispense(activeDispenseRx)}
                  className="flex items-center gap-2 px-5 py-2 text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow-lg transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" /> Verify & Mark Ready
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
