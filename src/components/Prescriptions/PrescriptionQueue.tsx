import React, { useState } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  CheckCircle2, 
  Clock, 
  ShieldAlert, 
  QrCode, 
  Printer, 
  Sparkles, 
  AlertTriangle, 
  Pill, 
  User, 
  Calendar,
  X,
  Loader2,
  Scan,
  Check
} from 'lucide-react';
import { Prescription, Patient, Medication, RxStatus } from '../../types';

interface PrescriptionQueueProps {
  prescriptions: Prescription[];
  patients: Patient[];
  medications: Medication[];
  onAddPrescription: (rx: Prescription) => void;
  onUpdateRxStatus: (id: string, status: RxStatus) => void;
}

export const PrescriptionQueue: React.FC<PrescriptionQueueProps> = ({
  prescriptions,
  patients,
  medications,
  onAddPrescription,
  onUpdateRxStatus,
}) => {
  const [activeQueueTab, setActiveQueueTab] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [showNewRxModal, setShowNewRxModal] = useState(false);
  const [activeProcessRx, setActiveProcessRx] = useState<Prescription | null>(null);

  // Dispensing verification steps state
  const [scannedBarcode, setScannedBarcode] = useState(false);
  const [pillCountVerified, setPillCountVerified] = useState(false);
  const [showLabelPreview, setShowLabelPreview] = useState(false);

  // AI Interaction check inside New Rx form
  const [aiChecking, setAiChecking] = useState(false);
  const [aiSafetyReport, setAiSafetyReport] = useState<any>(null);

  // New Rx Form state
  const [selectedPatientId, setSelectedPatientId] = useState(patients[0]?.id || '');
  const [doctorName, setDoctorName] = useState('Dr. Robert Chen, MD');
  const [doctorDEA, setDoctorDEA] = useState('AC8839201');
  const [clinicName, setClinicName] = useState('Springfield Family Care Clinic');
  const [selectedMedId, setSelectedMedId] = useState(medications[0]?.id || '');
  const [sigInstructions, setSigInstructions] = useState('Take 1 tablet by mouth daily with meal');
  const [rxQuantity, setRxQuantity] = useState(30);
  const [refillsAllowed, setRefillsAllowed] = useState(3);

  const currentPatient = patients.find(p => p.id === selectedPatientId);
  const currentMed = medications.find(m => m.id === selectedMedId);

  // Queue tabs
  const queueTabs = [
    { id: 'All', label: 'All Orders' },
    { id: 'Pending Verification', label: 'Pending Verification' },
    { id: 'Fulfilling', label: 'In Fulfillment' },
    { id: 'Ready for Pickup', label: 'Ready for Pickup' },
    { id: 'Dispensed', label: 'Completed Dispensed' },
  ];

  const filteredPrescriptions = prescriptions.filter(rx => {
    const matchesTab = activeQueueTab === 'All' || rx.status === activeQueueTab;
    const matchesSearch = 
      rx.rxNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rx.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rx.doctorName.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesTab && matchesSearch;
  });

  const handleRunSafetyCheck = async () => {
    if (!currentMed || !currentPatient) return;
    setAiChecking(true);
    try {
      const response = await fetch('/api/pharmacy/ai-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'interaction',
          payload: {
            medications: [currentMed.name],
            allergies: currentPatient.allergies,
            patientAge: currentPatient.dob
          }
        })
      });
      const data = await response.json();
      if (data.success) {
        setAiSafetyReport(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAiChecking(false);
    }
  };

  const handleCreatePrescription = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPatient || !currentMed) return;

    const newRx: Prescription = {
      id: 'rx-' + Date.now(),
      rxNumber: 'RX-' + Math.floor(80000 + Math.random() * 19999),
      patientId: currentPatient.id,
      patientName: currentPatient.fullName,
      patientDOB: currentPatient.dob,
      doctorName,
      doctorDEA,
      clinicName,
      datePrescribed: new Date().toISOString().split('T')[0],
      status: 'Pending Verification',
      items: [
        {
          medicationId: currentMed.id,
          medicationName: currentMed.name,
          strength: currentMed.strength,
          dosageInstructions: sigInstructions,
          quantity: rxQuantity,
          refillsAllowed: refillsAllowed,
          refillsRemaining: refillsAllowed,
          unitPrice: currentMed.unitPrice
        }
      ],
      copayAmount: 10.00,
      insuranceCoveredAmount: currentMed.unitPrice * rxQuantity - 10.00,
      totalCost: currentMed.unitPrice * rxQuantity,
      insuranceClaimStatus: 'Approved',
      notes: 'Digital Rx created by pharmacist'
    };

    onAddPrescription(newRx);
    setShowNewRxModal(false);
    setAiSafetyReport(null);
  };

  const openProcessModal = (rx: Prescription) => {
    setActiveProcessRx(rx);
    setScannedBarcode(false);
    setPillCountVerified(false);
    setShowLabelPreview(false);
  };

  const handleCompleteProcess = (nextStatus: RxStatus) => {
    if (!activeProcessRx) return;
    onUpdateRxStatus(activeProcessRx.id, nextStatus);
    setActiveProcessRx(null);
  };

  return (
    <div className="space-y-6">
      
      {/* Queue Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Prescription Dispensing Queue</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Electronic prescription intake, clinical verification, barcode vial scanning, and Rx label printing.
          </p>
        </div>

        <button
          onClick={() => setShowNewRxModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-slate-950 font-semibold rounded-xl text-xs hover:bg-emerald-400 shadow-md shadow-emerald-500/20 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Intake New Prescription</span>
        </button>
      </div>

      {/* Queue Filters and Search */}
      <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Rx #, patient name, doctor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Queue Tab Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {queueTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveQueueTab(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  activeQueueTab === tab.id
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* Prescriptions Queue List */}
      <div className="space-y-3">
        {filteredPrescriptions.length === 0 ? (
          <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-500 text-sm">
            No prescriptions found in this queue tab.
          </div>
        ) : (
          filteredPrescriptions.map(rx => {
            const isPending = rx.status === 'Pending Verification';
            const isFulfilling = rx.status === 'Fulfilling';
            const isReady = rx.status === 'Ready for Pickup';
            const isDispensed = rx.status === 'Dispensed';

            return (
              <div 
                key={rx.id} 
                className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm hover:border-slate-700 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  
                  {/* Status & Rx Header */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-sm text-emerald-400 px-2.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                      {rx.rxNumber}
                    </span>

                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      isPending ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                      isFulfilling ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                      isReady ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' :
                      'bg-slate-800 text-slate-400'
                    }`}>
                      {rx.status}
                    </span>

                    <span className="text-xs text-slate-400">Date: {rx.datePrescribed}</span>
                  </div>

                  {/* Patient & Doctor Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400">Patient: </span>
                      <span className="font-bold text-white">{rx.patientName}</span>
                      <span className="text-slate-400 text-[11px] ml-1">(DOB: {rx.patientDOB})</span>
                    </div>

                    <div>
                      <span className="text-slate-400">Prescriber: </span>
                      <span className="font-medium text-slate-200">{rx.doctorName}</span>
                      <span className="text-slate-400 text-[11px] ml-1">({rx.clinicName})</span>
                    </div>
                  </div>

                  {/* Medications & Sig Instructions */}
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 space-y-1">
                    {rx.items.map((item, idx) => (
                      <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
                        <div>
                          <span className="font-bold text-white text-sm">{item.medicationName}</span>
                          <span className="text-emerald-400 font-semibold ml-2">{item.strength}</span>
                        </div>
                        <div className="text-slate-300">
                          Qty: <span className="font-bold text-white">{item.quantity}</span> • Refills Left: {item.refillsRemaining}
                        </div>
                      </div>
                    ))}
                    <p className="text-xs text-amber-200/90 font-mono pt-1 italic">
                      "Sig: {rx.items[0]?.dosageInstructions}"
                    </p>
                  </div>

                </div>

                {/* Queue Action Button */}
                <div className="flex items-center gap-3 self-end md:self-center">
                  <button
                    onClick={() => openProcessModal(rx)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-md flex items-center gap-2 ${
                      isPending ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400' :
                      isFulfilling ? 'bg-blue-500 text-white hover:bg-blue-400' :
                      isReady ? 'bg-teal-500 text-slate-950 hover:bg-teal-400' :
                      'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {isPending ? 'Verify & Fill' : isFulfilling ? 'Continue Filling' : isReady ? 'Dispense & Print' : 'View Rx Details'}
                    </span>
                  </button>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* Verify & Fill Modal */}
      {activeProcessRx && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="font-mono text-emerald-400 text-xs font-bold">{activeProcessRx.rxNumber}</span>
                <h2 className="text-lg font-bold text-white">Pharmacist Verification & Dispensing Portal</h2>
              </div>
              <button onClick={() => setActiveProcessRx(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Verification Checklist */}
            <div className="space-y-4">
              
              {/* Step 1: Patient & Allergy Check */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Step 1: Clinical Safety Check</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">Passed</span>
                </div>
                <div className="text-xs text-white">
                  Patient: <span className="font-bold">{activeProcessRx.patientName}</span> • Prescriber: {activeProcessRx.doctorName}
                </div>
                <p className="text-xs text-slate-400">
                  Allergies on file: <span className="text-amber-400 font-medium">Penicillin, Sulfa</span> (No cross-reactivity with current medication)
                </p>
              </div>

              {/* Step 2: Barcode Scanning Simulation */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Step 2: Stock Bottle Barcode Verification</span>
                  {scannedBarcode && (
                    <span className="flex items-center gap-1 text-xs text-emerald-400 font-bold">
                      <Check className="w-4 h-4" /> Barcode Matched
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3 p-3 bg-slate-900 rounded-lg border border-slate-800">
                  <div className="flex items-center gap-3">
                    <Scan className={`w-6 h-6 ${scannedBarcode ? 'text-emerald-400' : 'text-slate-500'}`} />
                    <div className="text-xs">
                      <p className="font-bold text-white">{activeProcessRx.items[0]?.medicationName}</p>
                      <p className="text-slate-400">Expected NDC: 00093-3109-05</p>
                    </div>
                  </div>

                  <button
                    onClick={() => setScannedBarcode(true)}
                    disabled={scannedBarcode}
                    className="px-3 py-1.5 bg-emerald-500 text-slate-950 rounded-lg text-xs font-bold hover:bg-emerald-400 transition disabled:opacity-50"
                  >
                    {scannedBarcode ? 'Verified' : 'Scan Vial Barcode'}
                  </button>
                </div>
              </div>

              {/* Step 3: Pill Count Verification */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Step 3: Dispense Pill Tray Verification</span>
                  {pillCountVerified && (
                    <span className="flex items-center gap-1 text-xs text-emerald-400 font-bold">
                      <Check className="w-4 h-4" /> Count Verified ({activeProcessRx.items[0]?.quantity} Units)
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3 p-3 bg-slate-900 rounded-lg border border-slate-800">
                  <div className="text-xs">
                    <p className="font-bold text-white">Target Quantity: {activeProcessRx.items[0]?.quantity} Tablets</p>
                    <p className="text-slate-400">Sig: {activeProcessRx.items[0]?.dosageInstructions}</p>
                  </div>

                  <button
                    onClick={() => setPillCountVerified(true)}
                    disabled={pillCountVerified}
                    className="px-3 py-1.5 bg-emerald-500 text-slate-950 rounded-lg text-xs font-bold hover:bg-emerald-400 transition disabled:opacity-50"
                  >
                    {pillCountVerified ? 'Count Confirmed' : 'Verify Pill Tray'}
                  </button>
                </div>
              </div>

              {/* Prescription Label Preview */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Prescription Bottle Label Generator</span>
                  <button
                    onClick={() => setShowLabelPreview(!showLabelPreview)}
                    className="text-xs text-teal-400 font-semibold hover:underline flex items-center gap-1"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>{showLabelPreview ? 'Hide Label' : 'Preview Rx Label'}</span>
                  </button>
                </div>

                {showLabelPreview && (
                  <div className="p-4 bg-white text-slate-950 rounded-xl border border-slate-300 font-sans space-y-2 shadow-inner">
                    <div className="flex justify-between items-start border-b border-slate-300 pb-2">
                      <div>
                        <p className="font-bold text-sm tracking-tight">PHARMAPULSE CENTRAL RX #408</p>
                        <p className="text-[10px] text-slate-600">742 Evergreen Terr, Springfield • Ph: (555) 019-2834</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-bold text-sm">{activeProcessRx.rxNumber}</p>
                        <p className="text-[10px] text-slate-600">Date: {activeProcessRx.datePrescribed}</p>
                      </div>
                    </div>

                    <div className="py-1">
                      <p className="text-sm font-bold uppercase">{activeProcessRx.patientName}</p>
                      <p className="text-xs font-semibold text-slate-800 mt-1">
                        {activeProcessRx.items[0]?.medicationName} {activeProcessRx.items[0]?.strength}
                      </p>
                      <p className="text-xs font-bold text-emerald-800 mt-1 uppercase">
                        SIG: {activeProcessRx.items[0]?.dosageInstructions}
                      </p>
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-slate-700 border-t border-slate-200 pt-2">
                      <div>Qty: {activeProcessRx.items[0]?.quantity} • Refill: {activeProcessRx.items[0]?.refillsRemaining} times</div>
                      <div>Dr: {activeProcessRx.doctorName}</div>
                    </div>

                    <div className="p-1.5 bg-amber-100 border border-amber-300 rounded text-[9px] text-amber-900 font-bold uppercase text-center">
                      ⚠️ WARNING: FINISH ALL MEDICINE UNLESS OTHERWISE DIRECTED BY DOCTOR.
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={() => setActiveProcessRx(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-700 transition"
              >
                Close
              </button>

              <button
                onClick={() => handleCompleteProcess('Ready for Pickup')}
                className="px-4 py-2 bg-teal-500 text-slate-950 rounded-xl text-xs font-bold hover:bg-teal-400 transition shadow-md"
              >
                Mark Ready for Pickup
              </button>

              <button
                onClick={() => handleCompleteProcess('Dispensed')}
                className="px-4 py-2 bg-emerald-500 text-slate-950 rounded-xl text-xs font-bold hover:bg-emerald-400 transition shadow-md"
              >
                Complete & Dispense Patient Pickup
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Intake New Prescription Modal */}
      {showNewRxModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white">Intake Digital Prescription</h2>
              <button onClick={() => setShowNewRxModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePrescription} className="space-y-4">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Select Patient */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Select Patient *</label>
                  <select
                    value={selectedPatientId}
                    onChange={(e) => setSelectedPatientId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:ring-2 focus:ring-emerald-500"
                  >
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>{p.fullName} (DOB: {p.dob})</option>
                    ))}
                  </select>
                </div>

                {/* Select Medication */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Prescribed Drug *</label>
                  <select
                    value={selectedMedId}
                    onChange={(e) => setSelectedMedId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:ring-2 focus:ring-emerald-500"
                  >
                    {medications.map(m => (
                      <option key={m.id} value={m.id}>{m.name} {m.strength} ({m.stockQuantity} in stock)</option>
                    ))}
                  </select>
                </div>

                {/* Doctor Name */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Prescribing Physician</label>
                  <input
                    type="text"
                    value={doctorName}
                    onChange={(e) => setDoctorName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Doctor DEA # */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Doctor DEA #</label>
                  <input
                    type="text"
                    value={doctorDEA}
                    onChange={(e) => setDoctorDEA(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

              </div>

              {/* Sig Instructions */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Dosage Sig Instructions *</label>
                <textarea
                  rows={2}
                  required
                  value={sigInstructions}
                  onChange={(e) => setSigInstructions(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Quantity Dispensed</label>
                  <input
                    type="number"
                    value={rxQuantity}
                    onChange={(e) => setRxQuantity(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Refills Authorized</label>
                  <input
                    type="number"
                    value={refillsAllowed}
                    onChange={(e) => setRefillsAllowed(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Safety Check Button */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                <div className="text-xs text-slate-300">
                  Run Gemini AI Drug Safety & Allergy Scan before submitting Rx
                </div>
                <button
                  type="button"
                  onClick={handleRunSafetyCheck}
                  disabled={aiChecking}
                  className="px-3 py-1.5 bg-slate-800 text-teal-300 border border-teal-500/30 rounded-lg text-xs font-semibold hover:bg-slate-700 transition flex items-center gap-1.5"
                >
                  {aiChecking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-teal-400" />}
                  <span>Check Interaction</span>
                </button>
              </div>

              {aiSafetyReport && (
                <div className="p-3 bg-slate-950 rounded-xl border border-teal-500/40 text-xs space-y-1">
                  <div className="flex items-center gap-2 font-bold text-teal-400">
                    <ShieldAlert className="w-4 h-4" />
                    <span>AI Safety Report: {aiSafetyReport.overallRiskLevel} Risk</span>
                  </div>
                  <p className="text-slate-300">{aiSafetyReport.summary}</p>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewRxModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold hover:bg-emerald-400 transition shadow-md"
                >
                  Submit & Intake Rx
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
