import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Phone, 
  Mail, 
  MapPin, 
  ShieldAlert, 
  FileText, 
  Send, 
  CheckCircle2, 
  Calendar,
  X,
  User
} from 'lucide-react';
import { Patient, Prescription } from '../../types';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [smsToast, setSmsToast] = useState<string | null>(null);

  // New Patient Form
  const [newPatient, setNewPatient] = useState<Partial<Patient>>({
    fullName: '',
    dob: '1985-05-15',
    gender: 'Female',
    phone: '(555) 300-1122',
    email: 'patient@example.com',
    address: '100 Main St, Springfield',
    allergies: ['Penicillin'],
    chronicConditions: ['Hypertension'],
    insuranceProvider: 'BlueCross BlueShield',
    insurancePolicyNum: 'BCBS-' + Math.floor(100000 + Math.random() * 900000),
    primaryDoctor: 'Dr. Robert Chen, MD'
  });

  const filteredPatients = patients.filter(p => 
    p.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.phone.includes(searchTerm) ||
    p.insurancePolicyNum.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSendRefillReminder = (patientName: string, phone: string) => {
    setSmsToast(`Refill SMS & Email reminder sent to ${patientName} at ${phone}!`);
    setTimeout(() => setSmsToast(null), 4000);
  };

  const handleCreatePatient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatient.fullName) return;

    const patientToAdd: Patient = {
      id: 'pat-' + Date.now(),
      fullName: newPatient.fullName,
      dob: newPatient.dob || '1990-01-01',
      gender: newPatient.gender as any || 'Other',
      phone: newPatient.phone || '(555) 000-0000',
      email: newPatient.email || 'email@example.com',
      address: newPatient.address || 'Springfield',
      allergies: newPatient.allergies || [],
      chronicConditions: newPatient.chronicConditions || [],
      insuranceProvider: newPatient.insuranceProvider || 'Self-Pay',
      insurancePolicyNum: newPatient.insurancePolicyNum || 'N/A',
      primaryDoctor: newPatient.primaryDoctor || 'Dr. Unassigned',
      createdDate: new Date().toISOString().split('T')[0]
    };

    onAddPatient(patientToAdd);
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Toast Notification */}
      {smsToast && (
        <div className="fixed top-20 right-6 z-50 p-4 bg-emerald-500 text-slate-950 font-bold rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce">
          <CheckCircle2 className="w-5 h-5" />
          <span className="text-xs">{smsToast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Patient Health & Profile Directory</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Electronic patient medical records, documented drug allergies, insurance coverage, and refill reminders.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-slate-950 font-semibold rounded-xl text-xs hover:bg-emerald-400 shadow-md transition"
        >
          <Plus className="w-4 h-4" />
          <span>Register Patient</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search patients by name, phone, or policy number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Patients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredPatients.map((patient) => {
          const patientRx = prescriptions.filter(r => r.patientId === patient.id || r.patientName === patient.fullName);

          return (
            <div 
              key={patient.id} 
              className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm hover:border-slate-700 transition space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20 flex items-center justify-center font-bold text-sm">
                    {patient.fullName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-white">{patient.fullName}</h3>
                    <p className="text-xs text-slate-400">DOB: {patient.dob} ({patient.gender})</p>
                  </div>
                </div>

                <button
                  onClick={() => handleSendRefillReminder(patient.fullName, patient.phone)}
                  className="p-2 bg-slate-800 text-teal-300 hover:bg-teal-500 hover:text-slate-950 rounded-xl transition text-xs flex items-center gap-1.5 font-medium"
                  title="Send Refill SMS Alert"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Refill SMS</span>
                </button>
              </div>

              {/* Patient Attributes */}
              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                <div>
                  <span className="text-slate-500">Phone: </span>
                  <span className="text-slate-200">{patient.phone}</span>
                </div>
                <div>
                  <span className="text-slate-500">Insurance: </span>
                  <span className="text-emerald-400 font-semibold">{patient.insuranceProvider}</span>
                </div>
                <div>
                  <span className="text-slate-500">Primary Physician: </span>
                  <span className="text-slate-200">{patient.primaryDoctor}</span>
                </div>
                <div>
                  <span className="text-slate-500">Policy #: </span>
                  <span className="text-slate-300 font-mono">{patient.insurancePolicyNum}</span>
                </div>
              </div>

              {/* Allergies Highlight Box */}
              <div className="flex items-center gap-2 p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-xs">
                <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
                <span className="text-red-300 font-medium">
                  Documented Allergies: {patient.allergies.length > 0 ? patient.allergies.join(', ') : 'None'}
                </span>
              </div>

              {/* Prescriptions History Summary */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-400">{patientRx.length} Active Prescriptions on File</span>
                <button
                  onClick={() => setSelectedPatient(patient)}
                  className="text-emerald-400 font-semibold hover:underline"
                >
                  View Full Profile & History
                </button>
              </div>

            </div>
          );
        })}
      </div>

      {/* Patient Profile Modal */}
      {selectedPatient && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-lg font-bold text-white">{selectedPatient.fullName}</h2>
                <p className="text-xs text-slate-400">DOB: {selectedPatient.dob} • Policy: {selectedPatient.insurancePolicyNum}</p>
              </div>
              <button onClick={() => setSelectedPatient(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              
              <div className="grid grid-cols-2 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div>
                  <p className="text-slate-500">Contact Email</p>
                  <p className="text-white font-medium">{selectedPatient.email}</p>
                </div>
                <div>
                  <p className="text-slate-500">Phone</p>
                  <p className="text-white font-medium">{selectedPatient.phone}</p>
                </div>
                <div>
                  <p className="text-slate-500">Residential Address</p>
                  <p className="text-white font-medium">{selectedPatient.address}</p>
                </div>
                <div>
                  <p className="text-slate-500">Chronic Conditions</p>
                  <p className="text-white font-medium">{selectedPatient.chronicConditions.join(', ') || 'None'}</p>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-slate-300 mb-2">Prescription History Log</h3>
                <div className="space-y-2">
                  {prescriptions.filter(r => r.patientId === selectedPatient.id || r.patientName === selectedPatient.fullName).map(rx => (
                    <div key={rx.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-white">{rx.items[0]?.medicationName} ({rx.items[0]?.strength})</p>
                        <p className="text-slate-400">Rx #: {rx.rxNumber} • Status: {rx.status}</p>
                      </div>
                      <span className="text-emerald-400 font-semibold">${rx.copayAmount.toFixed(2)} Co-pay</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setSelectedPatient(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold hover:bg-slate-700"
              >
                Close Profile
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Add Patient Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Register Patient File</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePatient} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Eleanor Vance"
                  value={newPatient.fullName}
                  onChange={(e) => setNewPatient({ ...newPatient, fullName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={newPatient.dob}
                    onChange={(e) => setNewPatient({ ...newPatient, dob: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={newPatient.phone}
                    onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Insurance Provider</label>
                <input
                  type="text"
                  placeholder="e.g. BlueCross BlueShield"
                  value={newPatient.insuranceProvider}
                  onChange={(e) => setNewPatient({ ...newPatient, insuranceProvider: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Documented Allergies (comma separated)</label>
                <input
                  type="text"
                  placeholder="Penicillin, Sulfa"
                  onChange={(e) => setNewPatient({ ...newPatient, allergies: e.target.value.split(',').map(s => s.trim()) })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 text-slate-950 text-xs font-bold rounded-xl hover:bg-emerald-400"
                >
                  Save Patient File
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
