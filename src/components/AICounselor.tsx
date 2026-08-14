import React, { useState } from 'react';
import { DrugItem, Patient, DrugInteractionResult, CounselingGuide } from '../types';
import { 
  Sparkles, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  BookOpen, 
  Loader2, 
  Printer, 
  Plus, 
  X,
  FileCheck2,
  BrainCircuit
} from 'lucide-react';

interface AICounselorProps {
  drugs: DrugItem[];
  patients: Patient[];
}

export const AICounselor: React.FC<AICounselorProps> = ({ drugs, patients }) => {
  const [activeTab, setActiveTab] = useState<'checker' | 'counseling'>('checker');

  // Drug Interaction State
  const [selectedMeds, setSelectedMeds] = useState<string[]>([
    'Amoxicillin 500 mg Capsule',
    'Lisinopril 10 mg Tablet'
  ]);
  const [customMedInput, setCustomMedInput] = useState<string>('');
  const [patientAllergies, setPatientAllergies] = useState<string>('Penicillin');
  const [patientAge, setPatientAge] = useState<string>('Elderly (68yo)');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<DrugInteractionResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Counseling Guide State
  const [counselMed, setCounselMed] = useState<string>('Amoxicillin 500 mg');
  const [counselSig, setCounselSig] = useState<string>('Take 1 capsule by mouth 3 times daily for 10 days');
  const [counselLanguage, setCounselLanguage] = useState<string>('English');
  const [isGeneratingGuide, setIsGeneratingGuide] = useState<boolean>(false);
  const [guideResult, setGuideResult] = useState<CounselingGuide | null>(null);

  // Add Medication to Interaction Checker
  const handleAddMed = (drugName: string) => {
    if (!drugName.trim()) return;
    if (!selectedMeds.includes(drugName)) {
      setSelectedMeds(prev => [...prev, drugName]);
    }
    setCustomMedInput('');
  };

  const handleRemoveMed = (index: number) => {
    setSelectedMeds(prev => prev.filter((_, i) => i !== index));
  };

  // Run AI Drug Interaction Analysis
  const handleRunInteractionCheck = async () => {
    if (selectedMeds.length === 0) return;
    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const res = await fetch('/api/ai/check-interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medications: selectedMeds,
          allergies: patientAllergies.split(',').map(s => s.trim()).filter(Boolean),
          patientAge,
        }),
      });

      if (!res.ok) throw new Error('AI Interaction Analysis failed');
      const data = await res.json();
      setAnalysisResult(data);
    } catch (err: any) {
      setAnalysisError(err.message || 'Error executing clinical analysis');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Run AI Counseling Guide Generator
  const handleGenerateCounseling = async () => {
    if (!counselMed) return;
    setIsGeneratingGuide(true);

    try {
      const res = await fetch('/api/ai/counseling-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medicationName: counselMed,
          sig: counselSig,
          patientLanguage: counselLanguage,
        }),
      });

      if (!res.ok) throw new Error('Failed to generate counseling guide');
      const data = await res.json();
      setGuideResult(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsGeneratingGuide(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 p-5 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-emerald-400" /> AI Clinical Pharmacist Suite
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Powered by Google Gemini AI (`gemini-3.6-flash`). Deep interaction analysis, contraindication checks, and plain-language patient counseling sheets.
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex bg-slate-900/60 p-1 rounded-xl border border-slate-800 w-max">
        <button
          onClick={() => setActiveTab('checker')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'checker'
              ? 'bg-emerald-600 text-slate-950 shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Multi-Drug Interaction Analysis</span>
        </button>

        <button
          onClick={() => setActiveTab('counseling')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'counseling'
              ? 'bg-emerald-600 text-slate-950 shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Patient Counseling Sheet Generator</span>
        </button>
      </div>

      {activeTab === 'checker' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input Parameters Column */}
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-100 border-b border-slate-800 pb-2">
              Clinical Assessment Setup
            </h3>

            {/* Selected Meds Chips */}
            <div>
              <label className="block text-xs text-slate-400 font-semibold mb-1">Medication List to Analyze</label>
              <div className="flex flex-wrap gap-1.5 p-2 bg-slate-950 rounded-xl border border-slate-800 min-h-[80px]">
                {selectedMeds.map((med, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 text-slate-200 text-xs rounded-lg border border-slate-700">
                    <span>{med}</span>
                    <button onClick={() => handleRemoveMed(i)} className="text-slate-400 hover:text-rose-400">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Add Med from Inventory Dropdown or Custom Input */}
            <div>
              <label className="block text-xs text-slate-400 font-semibold mb-1">Add Drug to List</label>
              <div className="flex gap-2">
                <select
                  onChange={(e) => {
                    if (e.target.value) handleAddMed(e.target.value);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">Select from Pharmacy Inventory...</option>
                  {drugs.map(d => (
                    <option key={d.id} value={`${d.brandName} (${d.genericName}) ${d.strength}`}>
                      {d.brandName} ({d.genericName}) {d.strength}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  placeholder="Or type custom drug name..."
                  value={customMedInput}
                  onChange={(e) => setCustomMedInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => handleAddMed(customMedInput)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Patient Context */}
            <div>
              <label className="block text-xs text-slate-400 font-semibold mb-1">Known Patient Allergies</label>
              <input
                type="text"
                value={patientAllergies}
                onChange={(e) => setPatientAllergies(e.target.value)}
                placeholder="e.g., Penicillin, Sulfa, Aspirin"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 font-semibold mb-1">Patient Demographic/Age</label>
              <input
                type="text"
                value={patientAge}
                onChange={(e) => setPatientAge(e.target.value)}
                placeholder="e.g., Pediatric (6yo), Adult, Geriatric"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <button
              onClick={handleRunInteractionCheck}
              disabled={isAnalyzing || selectedMeds.length === 0}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Analyzing with Gemini AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Run Clinical Safety Analysis</span>
                </>
              )}
            </button>
          </div>

          {/* Analysis Results Column */}
          <div className="lg:col-span-2 bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-100 border-b border-slate-800 pb-2">
              Clinical Report & Interaction Matrix
            </h3>

            {analysisResult ? (
              <div className="space-y-4">
                {/* Executive Risk Banner */}
                <div className={`p-4 rounded-xl border flex items-center justify-between ${
                  analysisResult.overallRiskLevel === 'HIGH'
                    ? 'bg-rose-950/40 border-rose-800 text-rose-200'
                    : analysisResult.overallRiskLevel === 'MODERATE'
                    ? 'bg-amber-950/40 border-amber-800 text-amber-200'
                    : 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
                }`}>
                  <div>
                    <span className="text-[10px] uppercase font-mono tracking-widest block font-bold">OVERALL RISK EVALUATION</span>
                    <span className="text-lg font-extrabold">{analysisResult.overallRiskLevel} RISK FLAGGED</span>
                    <p className="text-xs mt-1 leading-relaxed opacity-90">{analysisResult.summary}</p>
                  </div>
                </div>

                {/* Drug-Drug Interactions */}
                {analysisResult.interactions && analysisResult.interactions.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-300">Flagged Drug-Drug Interactions</h4>
                    <div className="space-y-2">
                      {analysisResult.interactions.map((it, idx) => (
                        <div key={idx} className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-emerald-400">{it.drugA} ↔ {it.drugB}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              it.severity === 'High' ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-amber-950 text-amber-300 border border-amber-800'
                            }`}>
                              Severity: {it.severity}
                            </span>
                          </div>
                          <p className="text-slate-300"><strong>Clinical Effect:</strong> {it.clinicalEffect}</p>
                          <p className="text-slate-400"><strong>Mechanism:</strong> {it.mechanism}</p>
                          <p className="text-emerald-300 bg-slate-900 p-2 rounded border border-slate-800 mt-1">
                            <strong>Pharmacist Action:</strong> {it.recommendation}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Allergy Warnings */}
                {analysisResult.allergyWarnings && analysisResult.allergyWarnings.length > 0 && (
                  <div className="p-3 bg-rose-950/30 border border-rose-800/60 rounded-xl text-xs space-y-1">
                    <h4 className="font-bold text-rose-300 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-400" /> Patient Allergy Cross-Reactivity
                    </h4>
                    {analysisResult.allergyWarnings.map((alg, idx) => (
                      <p key={idx} className="text-rose-200">
                        <strong>{alg.drug}</strong> conflicts with patient allergy to <strong>{alg.allergen}</strong>: {alg.reactionDetails}
                      </p>
                    ))}
                  </div>
                )}

                {/* Special Precautions */}
                {analysisResult.specialPrecautions && analysisResult.specialPrecautions.length > 0 && (
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1">
                    <h4 className="font-bold text-slate-300">Additional Precautions</h4>
                    <ul className="list-disc pl-4 text-slate-400 space-y-0.5">
                      {analysisResult.specialPrecautions.map((sp, idx) => (
                        <li key={idx}>{sp}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-16 text-slate-500 text-xs">
                Select medications on the left and click 'Run Clinical Safety Analysis' to generate a comprehensive AI interaction report.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'counseling' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Guide Controls Column */}
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-100 border-b border-slate-800 pb-2">
              Patient Guidance Parameters
            </h3>

            <div>
              <label className="block text-xs text-slate-400 font-semibold mb-1">Medication Name</label>
              <input
                type="text"
                value={counselMed}
                onChange={(e) => setCounselMed(e.target.value)}
                placeholder="e.g. Amoxicillin 500 mg"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 font-semibold mb-1">Prescribed SIG Instructions</label>
              <input
                type="text"
                value={counselSig}
                onChange={(e) => setCounselSig(e.target.value)}
                placeholder="e.g. Take 1 capsule by mouth 3 times daily"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 font-semibold mb-1">Patient Preferred Language</label>
              <select
                value={counselLanguage}
                onChange={(e) => setCounselLanguage(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="English">English</option>
                <option value="Spanish">Spanish (Español)</option>
                <option value="French">French (Français)</option>
                <option value="Mandarin">Mandarin (中文)</option>
              </select>
            </div>

            <button
              onClick={handleGenerateCounseling}
              disabled={isGeneratingGuide || !counselMed}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {isGeneratingGuide ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating Patient Sheet...</span>
                </>
              ) : (
                <>
                  <BookOpen className="w-4 h-4" />
                  <span>Generate Counseling Guide</span>
                </>
              )}
            </button>
          </div>

          {/* Printable Counseling Sheet Column */}
          <div className="lg:col-span-2 bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-emerald-400" /> Patient Consultation Information Sheet
              </h3>

              {guideResult && (
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Sheet
                </button>
              )}
            </div>

            {guideResult ? (
              <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 text-xs text-slate-300 space-y-4 font-sans">
                <div className="border-b border-slate-800 pb-3">
                  <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest block">PHARMACARE RX PATIENT EDUCATION</span>
                  <h2 className="text-lg font-bold text-slate-100 mt-1">{counselMed}</h2>
                  <p className="text-slate-400 text-xs italic mt-0.5">SIG: {counselSig}</p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-200 mb-1 text-xs">What is this medication used for?</h4>
                  <p className="text-slate-300 leading-relaxed bg-slate-900 p-3 rounded-xl border border-slate-800">
                    {guideResult.medicationOverview}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-bold text-emerald-400 mb-1 text-xs">How to take this medication:</h4>
                    <ul className="list-disc pl-4 space-y-1 text-slate-300">
                      {Array.isArray(guideResult.howToTake) ? guideResult.howToTake.map((step: any, idx: number) => (
                        <li key={idx}>{step}</li>
                      )) : <li>{guideResult.howToTake}</li>}
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-bold text-amber-400 mb-1 text-xs">Common side effects:</h4>
                    <ul className="list-disc pl-4 space-y-1 text-slate-300">
                      {guideResult.commonSideEffects.map((se, idx) => (
                        <li key={idx}>{se}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {guideResult.foodAndDrinkInteractions && (
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <strong className="text-slate-200 block mb-0.5">Food & Beverage Interactions:</strong>
                    <p className="text-slate-400">{guideResult.foodAndDrinkInteractions}</p>
                  </div>
                )}

                {guideResult.whatIfMissedDose && (
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <strong className="text-slate-200 block mb-0.5">What if you miss a dose?</strong>
                    <p className="text-slate-400">{guideResult.whatIfMissedDose}</p>
                  </div>
                )}

                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                  <strong className="text-slate-200 block mb-0.5">Proper Storage:</strong>
                  <p className="text-slate-400">{guideResult.storageInstructions}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-16 text-slate-500 text-xs">
                Enter medication name and click 'Generate Counseling Guide' to produce a custom patient education sheet.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
