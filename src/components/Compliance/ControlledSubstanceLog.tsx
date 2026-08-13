import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Plus, 
  FileCheck, 
  Lock, 
  UserCheck, 
  Calendar,
  X
} from 'lucide-react';
import { ControlledLogEntry, ControlledSchedule } from '../../types';

interface ControlledSubstanceLogProps {
  logs: ControlledLogEntry[];
  onAddLog: (log: ControlledLogEntry) => void;
}

export const ControlledSubstanceLog: React.FC<ControlledSubstanceLogProps> = ({
  logs,
  onAddLog,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [medicationName, setMedicationName] = useState('Oxycodone-Acetaminophen 5 mg / 325 mg');
  const [ndc, setNdc] = useState('00407-2034-01');
  const [schedule, setSchedule] = useState<ControlledSchedule>('Schedule II');
  const [action, setAction] = useState<'Dispensed' | 'Received Shipment' | 'Inventory Audit Adjustment' | 'Disposed'>('Inventory Audit Adjustment');
  const [qtyChange, setQtyChange] = useState(0);
  const [newBalance, setNewBalance] = useState(45);
  const [pharmacistName, setPharmacistName] = useState('Dr. James Miller, PharmD');
  const [witnessName, setWitnessName] = useState('Evelyn Reed, CPhT');
  const [notes, setNotes] = useState('Routine shift vault count verified');

  const handleCreateLog = (e: React.FormEvent) => {
    e.preventDefault();
    const entry: ControlledLogEntry = {
      id: 'log-' + Date.now(),
      timestamp: new Date().toLocaleString(),
      medicationName,
      ndc,
      schedule,
      action,
      quantityChange: qtyChange,
      newBalance,
      pharmacistName,
      witnessName,
      notes
    };

    onAddLog(entry);
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded bg-purple-500/20 text-purple-300">
              <Lock className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">
              DEA Form 222 & Controlled Substance Vault Compliance
            </span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Perpetual Controlled Substance Vault Register</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Strict DEA Schedule II-V tracking, shift audits, dual-sign witness verification, and vault balance logs.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-slate-950 font-semibold rounded-xl text-xs hover:bg-emerald-400 shadow-md transition"
        >
          <Plus className="w-4 h-4" />
          <span>Record Shift Vault Audit</span>
        </button>
      </div>

      {/* Perpetual Log Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Timestamp & Drug</th>
                <th className="py-3.5 px-4">Schedule & Action</th>
                <th className="py-3.5 px-4">Qty Change</th>
                <th className="py-3.5 px-4">New Vault Balance</th>
                <th className="py-3.5 px-4">Pharmacist & Witness</th>
                <th className="py-3.5 px-4">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-4">
                    <div>
                      <p className="font-bold text-white">{log.medicationName}</p>
                      <p className="text-slate-400 text-[11px] font-mono">{log.timestamp} • NDC: {log.ndc}</p>
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="space-y-0.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        {log.schedule}
                      </span>
                      <p className="text-slate-300 text-[11px] font-medium">{log.action}</p>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 font-bold">
                    <span className={log.quantityChange < 0 ? 'text-red-400' : log.quantityChange > 0 ? 'text-emerald-400' : 'text-slate-400'}>
                      {log.quantityChange > 0 ? `+${log.quantityChange}` : log.quantityChange}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 font-bold text-white text-sm">
                    {log.newBalance} Units
                  </td>

                  <td className="py-3.5 px-4">
                    <p className="text-slate-200 font-medium">{log.pharmacistName}</p>
                    <p className="text-slate-400 text-[11px]">Witness: {log.witnessName}</p>
                  </td>

                  <td className="py-3.5 px-4 text-slate-300 italic">
                    "{log.notes}"
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Vault Audit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Record Vault Controlled Audit</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLog} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Controlled Drug Item</label>
                <input
                  type="text"
                  value={medicationName}
                  onChange={(e) => setMedicationName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Action Type</label>
                <select
                  value={action}
                  onChange={(e) => setAction(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                >
                  <option value="Inventory Audit Adjustment">Inventory Audit Adjustment</option>
                  <option value="Received Shipment">Received Shipment</option>
                  <option value="Dispensed">Dispensed</option>
                  <option value="Disposed">Disposed</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Quantity Adjustment</label>
                  <input
                    type="number"
                    value={qtyChange}
                    onChange={(e) => setQtyChange(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">New Physical Balance</label>
                  <input
                    type="number"
                    value={newBalance}
                    onChange={(e) => setNewBalance(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Witness Name (Required for DEA)</label>
                <input
                  type="text"
                  value={witnessName}
                  onChange={(e) => setWitnessName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Audit Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
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
                  Save Log Entry
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
