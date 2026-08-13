import React, { useState } from 'react';
import { 
  Stethoscope, 
  Sparkles, 
  AlertOctagon, 
  Calculator, 
  Search, 
  MessageSquare, 
  CheckCircle2, 
  ShieldAlert, 
  ArrowRight,
  Bot,
  Send,
  BookOpen
} from 'lucide-react';
import { DrugItem } from '../types/pharmacy';
import { checkDrugInteractions, calculateDosage, askPharmacistAssistant, InteractionResult, DosageCalcResult } from '../services/geminiService';

interface ClinicalAiViewProps {
  drugs: DrugItem[];
}

export const ClinicalAiView: React.FC<ClinicalAiViewProps> = ({ drugs }) => {
  const [activeTab, setActiveTab] = useState<'interaction' | 'dosage' | 'consult'>('interaction');

  // Interaction Checker State
  const [selectedDrugIds, setSelectedDrugIds] = useState<string[]>(['d1', 'd3']);
  const [patientAllergiesInput, setPatientAllergiesInput] = useState('Penicillin');
  const [isCheckingInteractions, setIsCheckingInteractions] = useState(false);
  const [interactionResult, setInteractionResult] = useState<InteractionResult | null>(null);

  // Dosage Calculator State
  const [selectedDrugForCalc, setSelectedDrugForCalc] = useState<string>('d1');
  const [patientAge, setPatientAge] = useState<number>(8);
  const [weightKg, setWeightKg] = useState<number>(22);
  const [indication, setIndication] = useState('Uncomplicated Falciparum Malaria');
  const [isCalculatingDose, setIsCalculatingDose] = useState(false);
  const [dosageResult, setDosageResult] = useState<DosageCalcResult | null>(null);

  // Pharmacist Consult Chat State
  const [consultQuery, setConsultQuery] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'assistant'; text: string }[]>([
    {
      role: 'assistant',
      text: 'Hello! I am your Chief Clinical Pharmacist AI for Junub Pharma Care. Ask me any clinical questions regarding WHO malaria guidelines, antibiotic dosing, drug storage, or pediatric administration in South Sudan.'
    }
  ]);
  const [isConsulting, setIsConsulting] = useState(false);

  // Toggle selection of drugs for interaction checking
  const handleToggleDrugSelection = (id: string) => {
    if (selectedDrugIds.includes(id)) {
      setSelectedDrugIds(selectedDrugIds.filter(d => d !== id));
    } else {
      setSelectedDrugIds([...selectedDrugIds, id]);
    }
  };

  const handleRunInteractionCheck = async () => {
    if (selectedDrugIds.length === 0) return;
    setIsCheckingInteractions(true);

    const chosenDrugs = drugs.filter(d => selectedDrugIds.includes(d.id));
    const allergies = patientAllergiesInput.split(',').map(a => a.trim()).filter(Boolean);

    try {
      const res = await checkDrugInteractions(chosenDrugs, allergies);
      setInteractionResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsCheckingInteractions(false);
    }
  };

  const handleRunDosageCalc = async () => {
    const drug = drugs.find(d => d.id === selectedDrugForCalc);
    if (!drug) return;
    setIsCalculatingDose(true);

    try {
      const res = await calculateDosage(drug, patientAge, weightKg, indication);
      setDosageResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsCalculatingDose(false);
    }
  };

  const handleSendConsult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consultQuery.trim()) return;

    const q = consultQuery;
    setConsultQuery('');
    setChatHistory(prev => [...prev, { role: 'user', text: q }]);
    setIsConsulting(true);

    try {
      const ans = await askPharmacistAssistant(q);
      setChatHistory(prev => [...prev, { role: 'assistant', text: ans }]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsConsulting(false);
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 bg-slate-950 text-slate-100 min-h-[calc(100vh-4rem)]">
      
      {/* Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 rounded-xl font-bold shadow-md shadow-emerald-500/10">
            <Stethoscope className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Clinical AI & Drug Safety Suite</h2>
            <p className="text-xs text-slate-400">Powered by Gemini 3.6 Flash • WHO Clinical Guidelines & Drug Safety Engine</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('interaction')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'interaction'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'bg-slate-850 text-slate-400 border border-slate-800 hover:text-white'
            }`}
          >
            Interaction Matrix
          </button>

          <button
            onClick={() => setActiveTab('dosage')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'dosage'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'bg-slate-850 text-slate-400 border border-slate-800 hover:text-white'
            }`}
          >
            Dosage Calculator
          </button>

          <button
            onClick={() => setActiveTab('consult')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1 transition-all ${
              activeTab === 'consult'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'bg-slate-850 text-slate-400 border border-slate-800 hover:text-white'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Clinical Chat</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Drug Interaction Checker */}
      {activeTab === 'interaction' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Selection Column (5 Cols) */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-slate-100 flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 text-emerald-400" />
                <span>Select Medications to Check</span>
              </h3>
              <p className="text-xs text-slate-400">Pick 2 or more drugs to evaluate potential drug-drug interactions and patient contraindications.</p>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {drugs.map(drug => {
                const isSelected = selectedDrugIds.includes(drug.id);
                return (
                  <button
                    key={drug.id}
                    onClick={() => handleToggleDrugSelection(drug.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between text-xs ${
                      isSelected
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 font-bold'
                        : 'bg-slate-850 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-slate-100">{drug.brandName}</div>
                      <div className="text-[10px] text-slate-400">{drug.genericName} • {drug.strength}</div>
                    </div>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  </button>
                );
              })}
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-semibold">Patient Reported Allergies:</label>
              <input
                type="text"
                value={patientAllergiesInput}
                onChange={(e) => setPatientAllergiesInput(e.target.value)}
                placeholder="e.g. Penicillin, Sulfa"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              onClick={handleRunInteractionCheck}
              disabled={isCheckingInteractions || selectedDrugIds.length < 1}
              className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 shadow-lg transition-all ${
                isCheckingInteractions || selectedDrugIds.length < 1
                  ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                  : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 active:scale-98'
              }`}
              id="run-interaction-check-button"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isCheckingInteractions ? 'Evaluating with Gemini AI...' : `Analyze Interactions (${selectedDrugIds.length} Drugs)`}</span>
            </button>
          </div>

          {/* Right Results Column (7 Cols) */}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
            <h3 className="font-bold text-sm text-slate-100 flex items-center space-x-2">
              <AlertOctagon className="w-4 h-4 text-emerald-400" />
              <span>Clinical Pharmacological Analysis</span>
            </h3>

            {interactionResult ? (
              <div className="space-y-4">
                
                {/* Severity Badge */}
                <div className={`p-4 rounded-xl border flex items-center justify-between ${
                  interactionResult.severity === 'Contraindicated' || interactionResult.severity === 'Severe'
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    : interactionResult.severity === 'Moderate'
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                }`}>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75">Interaction Severity Level</span>
                    <span className="text-lg font-black">{interactionResult.severity}</span>
                  </div>
                  <div className="font-bold text-xs px-3 py-1 rounded-full border bg-slate-900/50">
                    {interactionResult.summary}
                  </div>
                </div>

                {/* Detailed Mechanism */}
                <div className="bg-slate-850 p-4 rounded-xl border border-slate-800 space-y-1 text-xs">
                  <span className="font-bold text-slate-300 block">Pharmacological Mechanism:</span>
                  <p className="text-slate-300 leading-relaxed text-xs">{interactionResult.detailedExplanation}</p>
                </div>

                {/* Recommendation */}
                <div className="bg-slate-850 p-4 rounded-xl border border-slate-800 space-y-1 text-xs">
                  <span className="font-bold text-emerald-400 block">Pharmacist Recommendation & Guidance:</span>
                  <p className="text-slate-200 leading-relaxed text-xs">{interactionResult.recommendation}</p>
                </div>

                {/* Monitored Parameters */}
                {interactionResult.monitoredParameters && interactionResult.monitoredParameters.length > 0 && (
                  <div className="bg-slate-850 p-3 rounded-xl border border-slate-800 space-y-1 text-xs">
                    <span className="font-bold text-slate-400 block text-[11px]">Key Monitoring Parameters:</span>
                    <ul className="list-disc list-inside text-slate-300 space-y-0.5">
                      {interactionResult.monitoredParameters.map((param, idx) => (
                        <li key={idx}>{param}</li>
                      ))}
                    </ul>
                  </div>
                )}

              </div>
            ) : (
              <div className="py-20 text-center text-slate-500 space-y-2">
                <Sparkles className="w-10 h-10 mx-auto opacity-30 text-emerald-400" />
                <p className="text-xs">No analysis performed yet.</p>
                <p className="text-[10px]">Select medications on the left and click "Analyze Interactions".</p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* Tab 2: Dosage Calculator */}
      {activeTab === 'dosage' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
            <h3 className="font-bold text-sm text-slate-100 flex items-center space-x-2">
              <Calculator className="w-4 h-4 text-emerald-400" />
              <span>Patient Parameters & Medication</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Select Medication:</label>
                <select
                  value={selectedDrugForCalc}
                  onChange={(e) => setSelectedDrugForCalc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  {drugs.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.brandName} ({d.genericName}) - {d.strength}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Patient Age (Years):</label>
                  <input
                    type="number"
                    value={patientAge}
                    onChange={(e) => setPatientAge(parseInt(e.target.value) || 1)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Patient Weight (Kg):</label>
                  <input
                    type="number"
                    value={weightKg}
                    onChange={(e) => setWeightKg(parseFloat(e.target.value) || 10)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Indication / Diagnosis:</label>
                <input
                  type="text"
                  value={indication}
                  onChange={(e) => setIndication(e.target.value)}
                  placeholder="e.g. Uncomplicated Malaria"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200"
                />
              </div>

              <button
                onClick={handleRunDosageCalc}
                disabled={isCalculatingDose}
                className="w-full py-3 rounded-xl font-bold text-xs bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-lg"
                id="calculate-dosage-button"
              >
                {isCalculatingDose ? 'Calculating Dosage...' : 'Calculate Clinical Dose'}
              </button>
            </div>
          </div>

          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
            <h3 className="font-bold text-sm text-slate-100 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Calculated Dosage Protocol</span>
            </h3>

            {dosageResult ? (
              <div className="space-y-4 text-xs">
                <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-emerald-400 block">Recommended Dosage:</span>
                  <div className="text-lg font-black text-slate-100 mt-1">{dosageResult.calculatedDosage}</div>
                  <div className="text-xs text-emerald-300 font-semibold mt-1">Frequency: {dosageResult.frequency}</div>
                  <div className="text-xs text-slate-300">Duration: {dosageResult.duration}</div>
                </div>

                <div className="bg-slate-850 p-4 rounded-xl border border-slate-800 space-y-2">
                  <span className="font-bold text-amber-400 block">Counseling Instructions:</span>
                  <p className="text-slate-200 leading-relaxed">{dosageResult.counselingNotes}</p>
                </div>

                {dosageResult.specialPrecautions && dosageResult.specialPrecautions.length > 0 && (
                  <div className="bg-slate-850 p-3 rounded-xl border border-slate-800 space-y-1">
                    <span className="font-bold text-slate-400 block text-[11px]">Administration Precautions:</span>
                    <ul className="list-disc list-inside text-slate-300 space-y-1">
                      {dosageResult.specialPrecautions.map((p, i) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-20 text-center text-slate-500 space-y-2">
                <Calculator className="w-10 h-10 mx-auto opacity-30 text-emerald-400" />
                <p className="text-xs">Select patient weight/age and click "Calculate Clinical Dose".</p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* Tab 3: Pharmacist Clinical Chat */}
      {activeTab === 'consult' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 lg:p-5 flex flex-col justify-between h-[600px]">
          
          <div className="space-y-4 overflow-y-auto pr-2 flex-1">
            {chatHistory.map((msg, i) => (
              <div
                key={i}
                className={`flex items-start space-x-3 text-xs ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.role === 'assistant' && (
                  <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`p-3.5 rounded-2xl max-w-xl leading-relaxed whitespace-pre-line ${
                    msg.role === 'user'
                      ? 'bg-emerald-500 text-slate-950 font-medium'
                      : 'bg-slate-850 text-slate-200 border border-slate-800'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleSendConsult} className="pt-3 border-t border-slate-800 flex items-center space-x-2">
            <input
              type="text"
              value={consultQuery}
              onChange={(e) => setConsultQuery(e.target.value)}
              placeholder="Ask Chief Pharmacist AI (e.g., 'What is the second line treatment for severe malaria if ACT fails?')"
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              id="pharmacist-chat-input"
            />
            <button
              type="submit"
              disabled={isConsulting || !consultQuery.trim()}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 p-2.5 rounded-xl font-bold transition-all disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

        </div>
      )}

    </div>
  );
};
