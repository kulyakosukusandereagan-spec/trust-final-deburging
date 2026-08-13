import React, { useState } from 'react';
import { Users, Search, Plus, UserCheck, ShieldAlert, Phone, HeartPulse, FileText, Calendar } from 'lucide-react';
import { Patient } from '../types/pharmacy';

interface PatientsViewProps {
  patients: Patient[];
  onAddPatient: (patient: Patient) => void;
}

export const PatientsView: React.FC<PatientsViewProps> = ({ patients, onAddPatient }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // New Patient Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+211 9');
  const [age, setAge] = useState('30');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [allergiesText, setAllergiesText] = useState('');
  const [conditionsText, setConditionsText] = useState('');
  const [notes, setNotes] = useState('');

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.patientCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.phone.includes(searchQuery)
  );

  const handleCreatePatientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    const newPatient: Patient = {
      id: `p-${Date.now()}`,
      patientCode: `JPC-PAT-${Math.floor(100 + Math.random() * 900)}`,
      name,
      phone,
      age: parseInt(age) || 25,
      gender,
      bloodGroup,
      allergies: allergiesText ? allergiesText.split(',').map(s => s.trim()).filter(Boolean) : [],
      chronicConditions: conditionsText ? conditionsText.split(',').map(s => s.trim()).filter(Boolean) : [],
      medicationHistory: [],
      notes,
      createdDate: new Date().toISOString().split('T')[0]
    };

    onAddPatient(newPatient);
    setShowAddModal(false);
    setName('');
    setAllergiesText('');
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 bg-slate-950 text-slate-100 min-h-[calc(100vh-4rem)]">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Patient Medical Records Directory</h2>
            <p className="text-xs text-slate-400">Track patient profiles, documented allergies, chronic conditions, and past dispensing history</p>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs shadow-md"
          id="add-new-patient-button"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Patient</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, patient code, or phone number..."
          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
        />
      </div>

      {/* Patient Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPatients.map(patient => (
          <div key={patient.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 hover:border-slate-700 transition-all shadow-md">
            <div className="flex items-start justify-between border-b border-slate-800 pb-2.5">
              <div>
                <span className="font-mono text-[10px] font-bold text-emerald-400">{patient.patientCode}</span>
                <h3 className="font-bold text-sm text-slate-100">{patient.name}</h3>
              </div>
              <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-semibold">
                {patient.gender}, {patient.age} yrs
              </span>
            </div>

            <div className="text-xs space-y-1.5 text-slate-300">
              <div className="flex items-center space-x-2 text-slate-400">
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span>{patient.phone}</span>
              </div>

              {patient.allergies.length > 0 ? (
                <div className="bg-rose-500/10 border border-rose-500/30 p-2 rounded-xl text-rose-300 text-xs flex items-center space-x-1.5 font-bold">
                  <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>Allergies: {patient.allergies.join(', ')}</span>
                </div>
              ) : (
                <div className="text-emerald-400 text-[11px] font-medium">✓ No documented allergies</div>
              )}

              {patient.chronicConditions.length > 0 && (
                <div className="flex items-center space-x-1 text-amber-300 text-[11px]">
                  <HeartPulse className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Conditions: {patient.chronicConditions.join(', ')}</span>
                </div>
              )}

              {patient.notes && (
                <p className="text-[11px] text-slate-400 italic bg-slate-850 p-2 rounded-lg border border-slate-800">
                  "{patient.notes}"
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Patient Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-md w-full space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-slate-100">Register New Patient Profile</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreatePatientSubmit} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Full Name:</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Deng Majok Garang"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Phone Number:</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Age:</label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Known Allergies (comma separated):</label>
                <input
                  type="text"
                  value={allergiesText}
                  onChange={(e) => setAllergiesText(e.target.value)}
                  placeholder="e.g. Penicillin, Sulfa drugs, Aspirin"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Chronic Conditions:</label>
                <input
                  type="text"
                  value={conditionsText}
                  onChange={(e) => setConditionsText(e.target.value)}
                  placeholder="e.g. Hypertension, Diabetes"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Counseling Notes:</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional patient notes..."
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-2 rounded-xl bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold"
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
