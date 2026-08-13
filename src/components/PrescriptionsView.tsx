import React, { useState } from 'react';
import { 
  FileText, 
  Sparkles, 
  Upload, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Search, 
  Plus, 
  User, 
  Stethoscope, 
  ArrowRight, 
  ShieldCheck, 
  Image as ImageIcon 
} from 'lucide-react';
import { Prescription, DrugItem } from '../types/pharmacy';
import { digitizePrescriptionNotes } from '../services/geminiService';

interface PrescriptionsViewProps {
  prescriptions: Prescription[];
  onAddPrescription: (rx: Prescription) => void;
  onDispensePrescription: (rx: Prescription) => void;
  inventoryDrugs: DrugItem[];
}

export const PrescriptionsView: React.FC<PrescriptionsViewProps> = ({
  prescriptions,
  onAddPrescription,
  onDispensePrescription,
  inventoryDrugs
}) => {
  const [activeTab, setActiveTab] = useState<'queue' | 'ai_scanner'>('queue');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // AI Scanner state
  const [rawNotes, setRawNotes] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedResult, setScannedResult] = useState<any | null>(null);

  const filteredRx = prescriptions.filter(rx => {
    const matchesSearch = 
      rx.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rx.prescriptionNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rx.doctorName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = filterStatus === 'All' || rx.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRunAiScanner = async () => {
    if (!rawNotes && !imagePreview) return;
    setIsScanning(true);

    try {
      // Base64 string without header prefix if present
      const base64Data = imagePreview ? imagePreview.split(',')[1] : undefined;
      const result = await digitizePrescriptionNotes(rawNotes, base64Data);
      setScannedResult(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleSaveScannedRx = () => {
    if (!scannedResult) return;

    const newRx: Prescription = {
      id: `rx-${Date.now()}`,
      prescriptionNo: `RX-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      patientName: scannedResult.patientName || 'Deng Majok Garang',
      doctorName: scannedResult.doctorName || 'Dr. Peter Lual (MD)',
      clinicOrHospital: scannedResult.hospitalName || 'Juba Teaching Hospital',
      datePrescribed: scannedResult.date || new Date().toISOString().split('T')[0],
      status: 'Pending',
      medications: scannedResult.detectedMedications.map((m: any) => ({
        drugName: m.drugName,
        dosage: m.dosage || '1 tablet twice daily',
        duration: m.duration || '5 days',
        quantityRequested: m.quantity || 1,
        refillsAllowed: 0,
        status: 'Pending',
        notes: m.safetyNote
      })),
      aiVerificationNotes: scannedResult.rawSummary,
      interactionAlerts: scannedResult.clinicalWarnings || []
    };

    onAddPrescription(newRx);
    setScannedResult(null);
    setRawNotes('');
    setImagePreview(null);
    setActiveTab('queue');
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 bg-slate-950 text-slate-100 min-h-[calc(100vh-4rem)]">
      
      {/* Top Navigation & Action Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Prescription Processing & Verification</h2>
            <p className="text-xs text-slate-400">Manage clinical prescription verification and dispensing queues</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('queue')}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 text-slate-950 shadow-md"
          >
            Prescription Queue ({prescriptions.length})
          </button>
        </div>
      </div>

      <div className="space-y-4">
          
          {/* Search & Filter Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Rx #, patient or doctor..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400">Filter Status:</span>
              {['All', 'Pending', 'Verifying', 'Dispensed'].map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                    filterStatus === st
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'bg-slate-900 text-slate-400 border border-slate-800'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Prescriptions List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRx.map((rx) => (
              <div
                key={rx.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4 shadow-lg hover:border-slate-700 transition-all"
              >
                <div className="flex items-start justify-between border-b border-slate-800 pb-3">
                  <div>
                    <span className="font-mono text-xs font-bold text-emerald-400">{rx.prescriptionNo}</span>
                    <h3 className="font-bold text-sm text-slate-100 flex items-center space-x-2 mt-0.5">
                      <User className="w-4 h-4 text-slate-400" />
                      <span>{rx.patientName}</span>
                    </h3>
                  </div>

                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                    rx.status === 'Dispensed'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : rx.status === 'Verifying'
                      ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                      : 'bg-blue-500/10 text-blue-300 border-blue-500/20'
                  }`}>
                    {rx.status}
                  </span>
                </div>

                <div className="text-xs text-slate-400 space-y-1 bg-slate-850 p-2.5 rounded-xl border border-slate-800">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Prescriber:</span>
                    <span className="font-semibold text-slate-200">{rx.doctorName} ({rx.doctorLicenseNo || 'Licensed Doctor'})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Hospital:</span>
                    <span>{rx.clinicOrHospital}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Date:</span>
                    <span>{rx.datePrescribed}</span>
                  </div>
                </div>

                {/* Medications Items */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Prescribed Medications:</span>
                  <div className="space-y-1.5">
                    {rx.medications.map((m, idx) => (
                      <div key={idx} className="bg-slate-800/80 p-2 rounded-lg text-xs flex justify-between items-center border border-slate-750">
                        <div>
                          <div className="font-bold text-slate-200">{m.drugName}</div>
                          <div className="text-[10px] text-slate-400">{m.dosage} • {m.duration}</div>
                        </div>
                        <span className="font-mono text-emerald-400 font-bold text-xs">Qty: {m.quantityRequested}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI Safety Verification Notes */}
                {rx.aiVerificationNotes && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl text-xs space-y-1">
                    <div className="font-bold text-emerald-300 flex items-center space-x-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>AI Clinical Safety Verification:</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">{rx.aiVerificationNotes}</p>
                  </div>
                )}

                {/* Dispense Action Button */}
                <div className="pt-2 border-t border-slate-800 flex justify-end">
                  <button
                    onClick={() => onDispensePrescription(rx)}
                    disabled={rx.status === 'Dispensed'}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      rx.status === 'Dispensed'
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md active:scale-95'
                    }`}
                    id={`dispense-prescription-${rx.id}`}
                  >
                    <span>{rx.status === 'Dispensed' ? 'Already Dispensed' : 'Load into POS Cart'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

              </div>
            ))}
          </div>

        </div>
      ) : (
        /* AI Scanner Tab */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Left Input Section */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-slate-100 flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Input Doctor Clinical Notes or Prescription Scan</span>
              </h3>
              <p className="text-xs text-slate-400">
                Paste handwritten notes or upload prescription image. Gemini 3.6 Flash will extract medications, check dosages, and structure the prescription automatically.
              </p>
            </div>

            {/* Photo Upload Area */}
            <div className="border-2 border-dashed border-slate-700 hover:border-emerald-500/50 rounded-xl p-4 text-center space-y-2 bg-slate-850 transition-colors">
              {imagePreview ? (
                <div className="relative">
                  <img src={imagePreview} alt="Prescription" className="max-h-48 mx-auto rounded-lg object-contain" />
                  <button
                    onClick={() => setImagePreview(null)}
                    className="absolute top-1 right-1 bg-rose-500 text-white p-1 rounded-full text-xs"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer block space-y-2">
                  <ImageIcon className="w-8 h-8 text-slate-400 mx-auto" />
                  <span className="text-xs text-emerald-400 font-semibold block">Click to upload prescription photo</span>
                  <span className="text-[10px] text-slate-500 block">PNG, JPG, WEBP formats supported</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Text Notes Input */}
            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-semibold">Or Paste Doctor Clinical Notes / Handwriting Text:</label>
              <textarea
                value={rawNotes}
                onChange={(e) => setRawNotes(e.target.value)}
                placeholder="e.g., Rx: Patient Deng Majok, Juba Teaching Hospital. Coartem 80/480 tab ii bd x 3 days. Panadol Extra 2 tab tid prn fever..."
                rows={4}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              onClick={handleRunAiScanner}
              disabled={isScanning || (!rawNotes && !imagePreview)}
              className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 shadow-lg transition-all ${
                isScanning || (!rawNotes && !imagePreview)
                  ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 hover:from-emerald-400 hover:to-teal-400'
              }`}
              id="run-ai-digitizer-button"
            >
              <Sparkles className="w-4 h-4 animate-spin-slow" />
              <span>{isScanning ? 'Digitizing with Gemini 3.6 Flash...' : 'Digitize & Parse Prescription'}</span>
            </button>
          </div>

          {/* Right Scanned Output Result */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
            <h3 className="font-bold text-sm text-slate-100 flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>AI Extraction & Verification Result</span>
            </h3>

            {scannedResult ? (
              <div className="space-y-4">
                <div className="bg-slate-850 p-3 rounded-xl border border-slate-800 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Patient:</span>
                    <span className="font-bold text-slate-100">{scannedResult.patientName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Prescriber:</span>
                    <span className="text-slate-200">{scannedResult.doctorName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Hospital:</span>
                    <span className="text-slate-200">{scannedResult.hospitalName}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-300">Detected Medications:</span>
                  <div className="space-y-2">
                    {scannedResult.detectedMedications.map((m: any, idx: number) => (
                      <div key={idx} className="bg-slate-800 p-3 rounded-xl border border-slate-700 text-xs space-y-1">
                        <div className="flex justify-between font-bold text-emerald-300">
                          <span>{m.drugName}</span>
                          <span>Qty: {m.quantity}</span>
                        </div>
                        <div className="text-slate-300">Dosage: {m.dosage} ({m.frequency})</div>
                        <div className="text-slate-400 text-[11px]">Duration: {m.duration}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleSaveScannedRx}
                  className="w-full py-3 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs hover:bg-emerald-400 shadow-md"
                >
                  Save & Add to Active Prescriptions
                </button>
              </div>
            ) : (
              <div className="py-16 text-center text-slate-500 space-y-2">
                <Stethoscope className="w-10 h-10 mx-auto opacity-30 text-emerald-400" />
                <p className="text-xs">No active prescription scanned.</p>
                <p className="text-[10px]">Provide image or notes on the left and click "Digitize & Parse".</p>
              </div>
            )}
          </div>

        </div>

    </div>
  );
};
