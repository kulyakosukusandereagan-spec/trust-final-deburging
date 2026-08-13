import React, { useState } from 'react';
import { Patient, Prescription } from '../types';
import { 
  Users, 
  Plus, 
  Search, 
  UserCheck, 
  AlertTriangle, 
  Phone, 
  Mail, 
  MapPin, 
  ShieldCheck, 
  FileText,
  Calendar
} from 'lucide-react';

interface PatientDirectoryProps {
  patients: Patient[];
  prescriptions: Prescription[];
  onAddPatient: (patient: Patient) => void;
}

export const PatientDirectory: React.FC<PatientDirectoryProps> = ({
  patients,
  prescriptions,
  onAddPatient,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(patients[0] || null);
  const [isOpenAddModal, setIsOpenAddModal] = useState<boolean>(false);

  // New Patient Form state
  const [fullName, setFullName] = useState<string>('');
  const [dob, setDob] = useState<string>('1985-05-15');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Female');
  const [phone, setPhone] = useState<string>('(555) 000-1234');
  const [email, setEmail] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [allergiesText, setAllergiesText] = useState<string>('Penicillin');
  const [conditionsText, setConditionsText] = useState<string>('Asthma');
  const [insuranceProvider, setInsuranceProvider] = useState<string>('Blue Cross Blue Shield');
  const [policyNumber, setPolicyNumber] = useState<string>('BCBS-1029384');
  const [copayAmount, setCopayAmount] = useState<number>(15.00);

  const filteredPatients = patients.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      p.fullName.toLowerCase().includes(q) ||
      p.phone.includes(q) ||
      p.insuranceProvider.toLowerCase().includes(q) ||
      p.policyNumber.toLowerCase().includes(q)
    );
  });

  const handleSavePatient = (e: React.FormEvent) => {
    e.preventDefault();
    const allergies = allergiesText.split(',').map(s => s.trim()).filter(Boolean);
    const conditions = conditionsText.split(',').map(s => s.trim()).filter(Boolean);

    const newPatient: Patient = {
      id: `pat-${Date.now()}`,
      fullName,
      dob,
      gender,
      phone,
      email: email || `${fullName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
      address: address || '123 Main Street, City, ST',
      knownAllergies: allergies,
      chronicConditions: conditions,
      insuranceProvider,
      policyNumber,
      groupNumber: 'GRP-9900',
      copayAmount,
      createdDate: new Date().toISOString().split('T')[0]
    };

    onAddPatient(newPatient);
    setSelectedPatient(newPatient);
    setIsOpenAddModal(false);
    setFullName('');
  };

  // Get active prescriptions for selected patient
  const patientRxs = selectedPatient
    ? prescriptions.filter(p => p.patientId === selectedPatient.id)
    : [];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 p-5 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" /> Patient Medical & Allergy Roster
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Maintain patient profiles, insurance copay details, allergy logs, and longitudinal medication histories.
          </p>
        </div>

        <button
          onClick={() => setIsOpenAddModal(true)}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs shadow-md transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Patient</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Search & Patient List */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search patient name, phone, or insurance..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {filteredPatients.map((p) => {
              const isSelected = selectedPatient?.id === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedPatient(p)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-950/40 border-emerald-500/50 shadow-md'
                      : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-100 text-xs">{p.fullName}</span>
                    <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                      DOB: {p.dob}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-3">
                    <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-emerald-400" /> {p.phone}</span>
                  </div>

                  {p.knownAllergies.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {p.knownAllergies.map((alg, i) => (
                        <span key={i} className="text-[9px] bg-rose-950 text-rose-300 border border-rose-800 px-1.5 py-0.2 rounded">
                          Allergy: {alg}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Detailed Patient Profile */}
        <div className="lg:col-span-2 bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-6">
          {selectedPatient ? (
            <>
              {/* Profile Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-slate-950 font-extrabold text-lg flex items-center justify-center shadow-lg">
                    {selectedPatient.fullName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-100">{selectedPatient.fullName}</h3>
                    <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>DOB: {selectedPatient.dob} ({selectedPatient.gender})</span> • 
                      <span>Registered: {selectedPatient.createdDate}</span>
                    </p>
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl text-right">
                  <span className="text-[10px] text-slate-400 block uppercase">Default Copay</span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">${selectedPatient.copayAmount.toFixed(2)}</span>
                </div>
              </div>

              {/* Personal Info & Insurance Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Contact & Address */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <span className="font-bold text-slate-300 text-[11px] uppercase tracking-wider block border-b border-slate-800 pb-1">
                    Contact Information
                  </span>
                  <div className="text-slate-300 space-y-1.5">
                    <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-emerald-400" /> {selectedPatient.phone}</p>
                    <p className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-emerald-400" /> {selectedPatient.email}</p>
                    <p className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-emerald-400" /> {selectedPatient.address}</p>
                  </div>
                </div>

                {/* Insurance Details */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <span className="font-bold text-slate-300 text-[11px] uppercase tracking-wider block border-b border-slate-800 pb-1">
                    Primary Health Insurance
                  </span>
                  <div className="text-slate-300 space-y-1 font-mono">
                    <p><strong className="font-sans text-slate-400">Provider:</strong> {selectedPatient.insuranceProvider}</p>
                    <p><strong className="font-sans text-slate-400">Policy #:</strong> {selectedPatient.policyNumber}</p>
                    <p><strong className="font-sans text-slate-400">Group #:</strong> {selectedPatient.groupNumber}</p>
                  </div>
                </div>
              </div>

              {/* Allergies & Conditions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Known Allergies */}
                <div className="bg-rose-950/20 border border-rose-800/40 p-4 rounded-xl space-y-2">
                  <span className="font-bold text-rose-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-400" /> Documented Drug Allergies
                  </span>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {selectedPatient.knownAllergies.map((alg, i) => (
                      <span key={i} className="px-2 py-0.5 bg-rose-950 text-rose-300 border border-rose-800 rounded font-semibold text-[11px]">
                        {alg}
                      </span>
                    ))}
                    {selectedPatient.knownAllergies.length === 0 && (
                      <span className="text-slate-400 italic">No known drug allergies (NKDA).</span>
                    )}
                  </div>
                </div>

                {/* Chronic Conditions */}
                <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-2">
                  <span className="font-bold text-slate-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" /> Chronic Conditions
                  </span>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {selectedPatient.chronicConditions.map((cond, i) => (
                      <span key={i} className="px-2 py-0.5 bg-slate-800 text-slate-300 border border-slate-700 rounded text-[11px]">
                        {cond}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Patient Prescription History */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" /> Medication Dispensation History
                </h4>

                <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-[10px] text-slate-400 bg-slate-900 uppercase font-semibold border-b border-slate-800">
                        <th className="py-2.5 px-3">Rx #</th>
                        <th className="py-2.5 px-3">Medication</th>
                        <th className="py-2.5 px-3">SIG Instructions</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-xs text-slate-300">
                      {patientRxs.map((rx) => (
                        <tr key={rx.id}>
                          <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">{rx.rxNumber}</td>
                          <td className="py-2.5 px-3 font-medium text-slate-200">{rx.medicationName}</td>
                          <td className="py-2.5 px-3 text-slate-400 italic line-clamp-1">{rx.sigInstructions}</td>
                          <td className="py-2.5 px-3 font-semibold text-[10px]">{rx.status}</td>
                        </tr>
                      ))}

                      {patientRxs.length === 0 && (
                        <tr>
                          <td colSpan={4} className="text-center py-6 text-slate-500 text-xs">
                            No prescription history found for this patient.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-slate-500 text-xs">
              Select a patient from the list on the left to view details.
            </div>
          )}
        </div>
      </div>

      {/* MODAL: Register New Patient */}
      {isOpenAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden p-6 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-400" /> Register New Patient
              </h3>
              <button
                onClick={() => setIsOpenAddModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePatient} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Johnathan Vance"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Date of Birth *</label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Phone Number *</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john@example.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Known Drug Allergies (comma separated)</label>
                  <input
                    type="text"
                    value={allergiesText}
                    onChange={(e) => setAllergiesText(e.target.value)}
                    placeholder="e.g. Penicillin, Codeine"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Chronic Medical Conditions</label>
                  <input
                    type="text"
                    value={conditionsText}
                    onChange={(e) => setConditionsText(e.target.value)}
                    placeholder="e.g. Hypertension, Diabetes"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Insurance Provider</label>
                  <input
                    type="text"
                    value={insuranceProvider}
                    onChange={(e) => setInsuranceProvider(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Policy Number</label>
                  <input
                    type="text"
                    value={policyNumber}
                    onChange={(e) => setPolicyNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsOpenAddModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow-lg transition-all cursor-pointer"
                >
                  Save Patient Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
