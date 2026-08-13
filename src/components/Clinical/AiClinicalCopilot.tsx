import React, { useState } from 'react';
import { 
  Sparkles, 
  ShieldAlert, 
  BookOpen, 
  FileText, 
  TrendingUp, 
  Loader2, 
  Printer, 
  CheckCircle2, 
  AlertTriangle,
  Pill,
  Brain,
  Copy,
  Check
} from 'lucide-react';
import { Medication, Patient } from '../../types';

interface AiClinicalCopilotProps {
  medications: Medication[];
  patients: Patient[];
}

export const AiClinicalCopilot: React.FC<AiClinicalCopilotProps> = ({
  medications,
  patients,
}) => {
  const [activeCopilotTab, setActiveCopilotTab] = useState<'interaction' | 'counseling' | 'ocr' | 'reorder'>('interaction');
  
  // Loading state
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Interaction tab state
  const [selectedDrugs, setSelectedDrugs] = useState<string[]>([medications[0]?.name || 'Warfarin', medications[8]?.name || 'Ibuprofen']);
  const [customDrugInput, setCustomDrugInput] = useState('');
  const [patientAllergies, setPatientAllergies] = useState<string>('Penicillin, Aspirin');
  const [interactionResult, setInteractionResult] = useState<any>(null);

  // Counseling tab state
  const [counselMedName, setCounselMedName] = useState(medications[0]?.name || 'Amoxicillin');
  const [counselSig, setCounselSig] = useState('Take 1 capsule by mouth every 8 hours for 10 days');
  const [counselPatientName, setCounselPatientName] = useState('Eleanor Vance');
  const [counselResult, setCounselResult] = useState<any>(null);

  // Doctor note tab state
  const [rxRawText, setRxRawText] = useState(`Dr. Robert Chen, MD - Springfield Care
Rx: Lisinopril 10mg tab
Sig: Take 1 tab po qd in morning w/ food
Disp: #30 (thirty) Refills: 3
Pt: Eleanor Vance DOB 04/12/1968`);
  const [parsedRxResult, setParsedRxResult] = useState<any>(null);

  // Reorder tab state
  const [reorderResult, setReorderResult] = useState<any>(null);

  const handleAddDrugToInteractionList = () => {
    if (customDrugInput.trim() && !selectedDrugs.includes(customDrugInput.trim())) {
      setSelectedDrugs([...selectedDrugs, customDrugInput.trim()]);
      setCustomDrugInput('');
    }
  };

  const handleRemoveDrug = (drug: string) => {
    setSelectedDrugs(selectedDrugs.filter(d => d !== drug));
  };

  // 1. Analyze Drug Interactions
  const runInteractionAnalysis = async () => {
    if (selectedDrugs.length === 0) return;
    setLoading(true);
    setInteractionResult(null);

    try {
      const response = await fetch('/api/pharmacy/ai-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'interaction',
          payload: {
            medications: selectedDrugs,
            allergies: patientAllergies.split(',').map(s => s.trim()).filter(Boolean),
            patientAge: '68 years old'
          }
        })
      });
      const data = await response.json();
      if (data.success) {
        setInteractionResult(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // 2. Generate Counseling Leaflet
  const runCounselingGenerator = async () => {
    setLoading(true);
    setCounselResult(null);

    try {
      const response = await fetch('/api/pharmacy/ai-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'counseling',
          payload: {
            medicationName: counselMedName,
            strength: '500 mg',
            dosageInstructions: counselSig,
            patientName: counselPatientName
          }
        })
      });
      const data = await response.json();
      if (data.success) {
        setCounselResult(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // 3. Parse Unstructured Doctor Prescription Note
  const runRxParser = async () => {
    setLoading(true);
    setParsedRxResult(null);

    try {
      const response = await fetch('/api/pharmacy/ai-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'parse_rx',
          payload: { rxText: rxRawText }
        })
      });
      const data = await response.json();
      if (data.success) {
        setParsedRxResult(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // 4. Run Reorder Intelligence Forecast
  const runReorderForecast = async () => {
    setLoading(true);
    setReorderResult(null);

    try {
      const response = await fetch('/api/pharmacy/ai-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reorder_forecast',
          payload: {
            inventoryItems: medications.map(m => ({
              id: m.id,
              name: m.name,
              stock: m.stockQuantity,
              minLevel: m.minStockLevel,
              expiry: m.expiryDate
            }))
          }
        })
      });
      const data = await response.json();
      if (data.success) {
        setReorderResult(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 p-6 rounded-2xl border border-teal-500/30 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1 rounded-lg bg-teal-500/20 text-teal-400">
                <Brain className="w-5 h-5" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-teal-300">
                Clinical Pharmacist AI Copilot (Powered by Gemini 3.6 Flash)
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              AI Clinical Decision Support Engine
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Automated drug-drug interaction risk modeling, patient counseling leaflet creation, prescription note parsing, and predictive restocking.
            </p>
          </div>
        </div>
      </div>

      {/* Tab Selectors */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setActiveCopilotTab('interaction')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeCopilotTab === 'interaction'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Drug Interactions & Allergy Checker</span>
        </button>

        <button
          onClick={() => setActiveCopilotTab('counseling')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeCopilotTab === 'counseling'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Patient Counseling Leaflets</span>
        </button>

        <button
          onClick={() => setActiveCopilotTab('ocr')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeCopilotTab === 'ocr'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Doctor Rx Note Parser</span>
        </button>

        <button
          onClick={() => setActiveCopilotTab('reorder')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeCopilotTab === 'reorder'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Predictive Restock AI</span>
        </button>
      </div>

      {/* TAB 1: DRUG INTERACTIONS */}
      {activeCopilotTab === 'interaction' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Inputs Column */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-white">Configure Drug Combination</h2>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">Active Medications in Combination</label>
              
              <div className="flex flex-wrap gap-2 p-3 bg-slate-950 rounded-xl border border-slate-800 min-h-[80px]">
                {selectedDrugs.map(d => (
                  <span key={d} className="px-2.5 py-1 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-semibold flex items-center gap-1.5">
                    {d}
                    <button onClick={() => handleRemoveDrug(d)} className="hover:text-red-400">×</button>
                  </span>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add another drug (e.g. Aspirin)"
                  value={customDrugInput}
                  onChange={(e) => setCustomDrugInput(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
                <button
                  onClick={handleAddDrugToInteractionList}
                  className="px-3 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-700"
                >
                  Add
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Patient Known Allergies</label>
              <input
                type="text"
                value={patientAllergies}
                onChange={(e) => setPatientAllergies(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
              />
            </div>

            <button
              onClick={runInteractionAnalysis}
              disabled={loading || selectedDrugs.length === 0}
              className="w-full py-3 bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs hover:bg-emerald-400 shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>Run Clinical Gemini Analysis</span>
            </button>
          </div>

          {/* Results Column */}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-white">Clinical Safety & Interaction Report</h2>

            {interactionResult ? (
              <div className="space-y-4">
                
                <div className={`p-4 rounded-xl border flex items-center gap-3 ${
                  interactionResult.overallRiskLevel === 'High' ? 'bg-red-500/10 border-red-500/30 text-red-300' :
                  interactionResult.overallRiskLevel === 'Moderate' ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' :
                  'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                }`}>
                  <ShieldAlert className="w-6 h-6 shrink-0" />
                  <div>
                    <span className="font-bold text-sm">Risk Assessment: {interactionResult.overallRiskLevel} Risk</span>
                    <p className="text-xs mt-0.5">{interactionResult.summary}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Identified Drug-Drug Interactions</h3>
                  {interactionResult.interactions?.map((item: any, idx: number) => (
                    <div key={idx} className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1">
                      <div className="flex items-center justify-between font-bold text-white">
                        <span>{item.drugA} ↔ {item.drugB}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] ${
                          item.severity === 'Severe' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          {item.severity} Severity
                        </span>
                      </div>
                      <p className="text-slate-300"><span className="text-slate-500">Mechanism:</span> {item.mechanism}</p>
                      <p className="text-teal-300 font-semibold"><span className="text-slate-500">Pharmacist Action:</span> {item.recommendation}</p>
                    </div>
                  ))}
                </div>

              </div>
            ) : (
              <p className="text-xs text-slate-500 py-16 text-center border border-dashed border-slate-800 rounded-xl">
                Configure drugs on the left and click "Run Clinical Gemini Analysis".
              </p>
            )}
          </div>

        </div>
      )}

      {/* TAB 2: PATIENT COUNSELING */}
      {activeCopilotTab === 'counseling' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-white">Counseling Leaflet Builder</h2>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Medication Name</label>
              <input
                type="text"
                value={counselMedName}
                onChange={(e) => setCounselMedName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Prescribed Instructions (Sig)</label>
              <textarea
                rows={2}
                value={counselSig}
                onChange={(e) => setCounselSig(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Patient Name</label>
              <input
                type="text"
                value={counselPatientName}
                onChange={(e) => setCounselPatientName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
              />
            </div>

            <button
              onClick={runCounselingGenerator}
              disabled={loading}
              className="w-full py-3 bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs hover:bg-emerald-400 transition flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
              <span>Generate Patient Leaflet</span>
            </button>
          </div>

          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white">Generated Patient Guidance Leaflet</h2>
              {counselResult && (
                <button onClick={() => window.print()} className="text-xs text-teal-400 font-bold flex items-center gap-1 hover:underline">
                  <Printer className="w-3.5 h-3.5" /> Print Leaflet
                </button>
              )}
            </div>

            {counselResult ? (
              <div className="p-5 bg-white text-slate-950 rounded-2xl space-y-3 font-sans shadow-inner text-xs">
                <div className="border-b border-slate-300 pb-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-800">PharmaPulse Patient Care Series</span>
                  <h3 className="text-base font-bold text-slate-950">{counselResult.title}</h3>
                  <p className="text-slate-600 font-semibold">Prepared for: {counselPatientName}</p>
                </div>

                <div>
                  <h4 className="font-bold text-emerald-900 uppercase text-[11px]">Purpose of Medication:</h4>
                  <p className="text-slate-800">{counselResult.purpose}</p>
                </div>

                <div>
                  <h4 className="font-bold text-emerald-900 uppercase text-[11px]">How to Take:</h4>
                  <p className="text-slate-800">{counselResult.howToTake}</p>
                </div>

                <div>
                  <h4 className="font-bold text-emerald-900 uppercase text-[11px]">Food & Beverage Precautions:</h4>
                  <p className="text-slate-800">{counselResult.foodPrecautions}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                  <div>
                    <h4 className="font-bold text-slate-900 text-[11px]">Common Side Effects:</h4>
                    <ul className="list-disc list-inside text-slate-700">
                      {counselResult.commonSideEffects?.map((se: string, i: number) => (
                        <li key={i}>{se}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-bold text-red-800 text-[11px]">Warning Emergency Signals:</h4>
                    <ul className="list-disc list-inside text-red-900 font-medium">
                      {counselResult.warningSignals?.map((ws: string, i: number) => (
                        <li key={i}>{ws}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-900 italic">
                  <strong>Pharmacist Advice:</strong> {counselResult.pharmacistNote}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-16 text-center border border-dashed border-slate-800 rounded-xl">
                Enter details on the left and click "Generate Patient Leaflet".
              </p>
            )}
          </div>

        </div>
      )}

      {/* TAB 3: DOCTOR RX NOTE PARSER */}
      {activeCopilotTab === 'ocr' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-white">Doctor Note / OCR Reader</h2>
            <p className="text-xs text-slate-400">
              Paste messy doctor notes, digital scripts, or fax strings to auto-extract structured Rx fields.
            </p>

            <textarea
              rows={6}
              value={rxRawText}
              onChange={(e) => setRxRawText(e.target.value)}
              className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-emerald-400 focus:ring-2 focus:ring-emerald-500"
            />

            <button
              onClick={runRxParser}
              disabled={loading}
              className="w-full py-3 bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs hover:bg-emerald-400 transition flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>Extract Structured Rx Fields</span>
            </button>
          </div>

          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-white">Parsed Prescription Fields</h2>

            {parsedRxResult ? (
              <div className="space-y-3">
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-slate-500">Doctor: </span>
                      <span className="font-bold text-white">{parsedRxResult.doctorName}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Clinic: </span>
                      <span className="text-slate-200">{parsedRxResult.clinicName}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Medication: </span>
                      <span className="font-bold text-emerald-400">{parsedRxResult.medicationName}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Strength: </span>
                      <span className="text-white font-semibold">{parsedRxResult.strength}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Quantity: </span>
                      <span className="text-white font-bold">{parsedRxResult.quantity}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Refills: </span>
                      <span className="text-white font-bold">{parsedRxResult.refills}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800">
                    <span className="text-slate-500">Sig Instructions: </span>
                    <span className="font-mono text-amber-300 font-semibold">{parsedRxResult.dosageInstructions}</span>
                  </div>
                </div>

                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300 flex items-center justify-between">
                  <span>Structured fields parsed successfully. Ready to populate Rx queue.</span>
                  <button 
                    onClick={() => copyToClipboard(JSON.stringify(parsedRxResult, null, 2))}
                    className="px-2.5 py-1 bg-emerald-500 text-slate-950 font-bold rounded-lg hover:bg-emerald-400"
                  >
                    {copied ? 'Copied!' : 'Copy JSON'}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-16 text-center border border-dashed border-slate-800 rounded-xl">
                Click "Extract Structured Rx Fields" to parse note.
              </p>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: PREDICTIVE RESTOCK */}
      {activeCopilotTab === 'reorder' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Predictive Inventory Reorder Engine</h2>
              <p className="text-xs text-slate-400">Analyses pharmacy stock balances vs historical consumption rate.</p>
            </div>

            <button
              onClick={runReorderForecast}
              disabled={loading}
              className="px-4 py-2 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl hover:bg-emerald-400 transition flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>Generate AI Restock Forecast</span>
            </button>
          </div>

          {reorderResult ? (
            <div className="space-y-3 pt-2">
              <p className="text-xs text-slate-300 p-3 bg-slate-950 rounded-xl border border-slate-800">
                {reorderResult.forecastSummary}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {reorderResult.recommendations?.map((rec: any, idx: number) => (
                  <div key={idx} className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-2">
                    <div className="flex items-center justify-between font-bold text-white">
                      <span>{rec.medicationName}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] ${
                        rec.urgency === 'High' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {rec.urgency} Urgency
                      </span>
                    </div>

                    <div className="text-slate-400">
                      Stock: {rec.currentStock} units • Order: <span className="text-emerald-400 font-bold">+{rec.recommendedOrderQty} units</span>
                    </div>

                    <p className="text-[11px] text-slate-400 italic">"{rec.reasoning}"</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 py-16 text-center border border-dashed border-slate-800 rounded-xl">
              Click "Generate AI Restock Forecast" to run predictive stock analysis.
            </p>
          )}
        </div>
      )}

    </div>
  );
};
