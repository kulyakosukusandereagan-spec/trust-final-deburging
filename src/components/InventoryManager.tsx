import React, { useState } from 'react';
import { DrugItem, ControlledLogEntry, ControlledSchedule } from '../types';
import { 
  Package, 
  Plus, 
  Search, 
  AlertTriangle, 
  ShieldCheck, 
  RefreshCcw, 
  CheckCircle2,
  Lock,
  Layers,
  Thermometer,
  Calendar,
  Building2
} from 'lucide-react';

interface InventoryManagerProps {
  drugs: DrugItem[];
  controlledLogs: ControlledLogEntry[];
  onAddDrug: (drug: DrugItem) => void;
  onUpdateStock: (drugId: string, newStock: number) => void;
  isOpenAddModal: boolean;
  setIsOpenAddModal: (open: boolean) => void;
}

export const InventoryManager: React.FC<InventoryManagerProps> = ({
  drugs,
  controlledLogs,
  onAddDrug,
  onUpdateStock,
  isOpenAddModal,
  setIsOpenAddModal,
}) => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'controlled-ledger'>('inventory');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // New Drug Modal Form state
  const [brandName, setBrandName] = useState<string>('');
  const [genericName, setGenericName] = useState<string>('');
  const [ndc, setNdc] = useState<string>('');
  const [category, setCategory] = useState<string>('Antibiotic');
  const [dosageForm, setDosageForm] = useState<any>('Tablet');
  const [strength, setStrength] = useState<string>('500 mg');
  const [stockQuantity, setStockQuantity] = useState<number>(100);
  const [reorderLevel, setReorderLevel] = useState<number>(30);
  const [unitPrice, setUnitPrice] = useState<number>(1.50);
  const [isControlled, setIsControlled] = useState<boolean>(false);
  const [scheduleClass, setScheduleClass] = useState<ControlledSchedule>('Non-Controlled');
  const [expiryDate, setExpiryDate] = useState<string>('2028-06-30');
  const [batchNumber, setBatchNumber] = useState<string>('BTH-2026-X1');
  const [manufacturer, setManufacturer] = useState<string>('Pharma Global Inc.');
  const [storageCondition, setStorageCondition] = useState<any>('Room Temp');

  // Filter Categories
  const categories = ['ALL', ...Array.from(new Set(drugs.map((d) => d.category)))];

  // Filtered Drugs
  const filteredDrugs = drugs.filter((drug) => {
    const matchesCat = selectedCategory === 'ALL' || drug.category === selectedCategory;
    const q = searchQuery.toLowerCase();
    const matchesQuery = 
      drug.brandName.toLowerCase().includes(q) ||
      drug.genericName.toLowerCase().includes(q) ||
      drug.ndc.toLowerCase().includes(q) ||
      drug.batchNumber.toLowerCase().includes(q);
    return matchesCat && matchesQuery;
  });

  // Handle Add Drug Submission
  const handleSaveDrug = (e: React.FormEvent) => {
    e.preventDefault();
    const newDrug: DrugItem = {
      id: `drug-${Date.now()}`,
      brandName,
      genericName,
      ndc: ndc || '00000-0000-00',
      category,
      dosageForm,
      strength,
      stockQuantity,
      reorderLevel,
      unitPrice,
      isControlled,
      scheduleClass: isControlled ? scheduleClass : 'Non-Controlled',
      expiryDate,
      batchNumber,
      manufacturer,
      storageCondition,
      activeIngredients: [genericName]
    };

    onAddDrug(newDrug);
    setIsOpenAddModal(false);
    // Reset
    setBrandName('');
    setGenericName('');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 p-5 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-400" /> Inventory Control & Controlled Substance Log
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Track pharmaceutical stock levels, batch expiration forecasts, reorder alerts, and Schedule II-V DEA ledgers.
          </p>
        </div>

        <button
          onClick={() => setIsOpenAddModal(true)}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs shadow-md transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Stock Item</span>
        </button>
      </div>

      {/* Main Mode Tabs */}
      <div className="flex bg-slate-900/60 p-1 rounded-xl border border-slate-800 w-max">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'inventory'
              ? 'bg-emerald-600 text-slate-950 shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Medication Inventory ({drugs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('controlled-ledger')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'controlled-ledger'
              ? 'bg-amber-500 text-slate-950 shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>Controlled Substance Ledger (C-II to C-V)</span>
        </button>
      </div>

      {activeTab === 'inventory' && (
        <div className="space-y-4">
          {/* Controls & Search */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
              <span className="text-xs text-slate-400 font-semibold pl-2">Category:</span>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Filter by brand, generic, NDC..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Drugs Inventory Table */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[11px] text-slate-400 bg-slate-950 border-b border-slate-800 uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4">Medication Name & NDC</th>
                    <th className="py-3 px-4">Class & Form</th>
                    <th className="py-3 px-4">Stock Level</th>
                    <th className="py-3 px-4">Unit Price</th>
                    <th className="py-3 px-4">Batch & Expiry</th>
                    <th className="py-3 px-4 text-right">Stock Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-xs text-slate-300">
                  {filteredDrugs.map((drug) => {
                    const isLowStock = drug.stockQuantity <= drug.reorderLevel;
                    return (
                      <tr key={drug.id} className="hover:bg-slate-800/50 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-100 flex items-center gap-2">
                            {drug.brandName}
                            {drug.isControlled && (
                              <span className="text-[9px] bg-amber-950 text-amber-300 border border-amber-800 px-1.5 py-0.2 rounded font-mono">
                                {drug.scheduleClass}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400">{drug.genericName} • {drug.strength}</div>
                          <div className="text-[10px] font-mono text-slate-500 mt-0.5">NDC: {drug.ndc}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="inline-block bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px]">
                            {drug.category}
                          </span>
                          <div className="text-[10px] text-slate-400 mt-1">{drug.dosageForm}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold font-mono ${isLowStock ? 'text-rose-400' : 'text-slate-100'}`}>
                              {drug.stockQuantity}
                            </span>
                            {isLowStock && (
                              <span className="text-[10px] bg-rose-950 text-rose-300 border border-rose-800 px-1.5 py-0.2 rounded flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 text-rose-400" /> Low
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500">Reorder at: {drug.reorderLevel}</div>
                        </td>

                        <td className="py-3.5 px-4 font-mono font-semibold text-emerald-400">
                          ${drug.unitPrice.toFixed(2)} / unit
                        </td>

                        <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                          <div>Batch: {drug.batchNumber}</div>
                          <div className="text-slate-300">Exp: {drug.expiryDate}</div>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => onUpdateStock(drug.id, drug.stockQuantity + 50)}
                              className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded text-xs transition-colors cursor-pointer"
                              title="Restock +50 units"
                            >
                              +50 Restock
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'controlled-ledger' && (
        <div className="space-y-4">
          <div className="bg-amber-950/30 border border-amber-800/60 p-4 rounded-xl text-xs text-amber-200 flex items-start gap-3">
            <Lock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-amber-300 text-sm">DEA Controlled Substance Dispensing Audit Log</h4>
              <p className="mt-0.5 text-slate-300">
                All Schedule II, III, IV, and V medications are required by federal law to be logged upon every dispensation with starting stock, quantity deducted, remaining stock, prescriber NPI, and pharmacist digital signature.
              </p>
            </div>
          </div>

          <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[11px] text-slate-400 bg-slate-950 border-b border-slate-800 uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Rx Number</th>
                    <th className="py-3 px-4">Controlled Substance</th>
                    <th className="py-3 px-4">Patient & Prescriber NPI</th>
                    <th className="py-3 px-4 font-mono">Qty Dispensed</th>
                    <th className="py-3 px-4">Stock Ledger</th>
                    <th className="py-3 px-4">Pharmacist Signature</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-xs text-slate-300 font-mono">
                  {controlledLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="py-3.5 px-4 text-slate-400 text-[11px]">{log.timestamp}</td>
                      <td className="py-3.5 px-4 font-bold text-amber-400">{log.rxNumber}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-100">{log.drugName}</div>
                        <span className="inline-block text-[9px] bg-amber-950 text-amber-300 border border-amber-800 px-1.5 py-0.2 rounded mt-1">
                          {log.schedule}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-sans">
                        <div className="font-bold text-slate-200">{log.patientName}</div>
                        <div className="text-[10px] text-slate-400">NPI: {log.prescriberNpi}</div>
                      </td>
                      <td className="py-3.5 px-4 text-rose-400 font-bold">
                        -{log.quantityDispensed} units
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">
                        {log.startingStock} → <strong className="text-emerald-400">{log.remainingStock}</strong>
                      </td>
                      <td className="py-3.5 px-4 font-sans text-slate-400">
                        <span className="text-emerald-400 flex items-center gap-1 text-[11px]">
                          <ShieldCheck className="w-3.5 h-3.5" /> Verified
                        </span>
                        <div className="text-[10px] text-slate-500">{log.pharmacistName}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Add New Medication */}
      {isOpenAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden p-6 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Package className="w-5 h-5 text-emerald-400" /> Add New Inventory Item
              </h3>
              <button
                onClick={() => setIsOpenAddModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveDrug} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Brand Name *</label>
                  <input
                    type="text"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    placeholder="e.g. Amoxil"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Generic Name *</label>
                  <input
                    type="text"
                    value={genericName}
                    onChange={(e) => setGenericName(e.target.value)}
                    placeholder="e.g. Amoxicillin"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">NDC Code *</label>
                  <input
                    type="text"
                    value={ndc}
                    onChange={(e) => setNdc(e.target.value)}
                    placeholder="00000-0000-00"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Category</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Dosage Form</label>
                  <select
                    value={dosageForm}
                    onChange={(e) => setDosageForm(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="Tablet">Tablet</option>
                    <option value="Capsule">Capsule</option>
                    <option value="Liquid/Syrup">Liquid/Syrup</option>
                    <option value="Injection">Injection</option>
                    <option value="Inhaler">Inhaler</option>
                    <option value="Ointment/Cream">Ointment/Cream</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Strength</label>
                  <input
                    type="text"
                    value={strength}
                    onChange={(e) => setStrength(e.target.value)}
                    placeholder="e.g. 500 mg"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Initial Stock Quantity</label>
                  <input
                    type="number"
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Reorder Level Threshold</label>
                  <input
                    type="number"
                    value={reorderLevel}
                    onChange={(e) => setReorderLevel(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Unit Retail Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Batch Number</label>
                  <input
                    type="text"
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Controlled Substance Toggle */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-200 block">Controlled Substance?</span>
                  <span className="text-[11px] text-slate-400">Subject to DEA Schedule II-V tracking</span>
                </div>
                <input
                  type="checkbox"
                  checked={isControlled}
                  onChange={(e) => setIsControlled(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 cursor-pointer"
                />
              </div>

              {isControlled && (
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Controlled Schedule Class</label>
                  <select
                    value={scheduleClass}
                    onChange={(e) => setScheduleClass(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="Schedule II">Schedule II (High Potential for Abuse)</option>
                    <option value="Schedule III">Schedule III</option>
                    <option value="Schedule IV">Schedule IV</option>
                    <option value="Schedule V">Schedule V</option>
                  </select>
                </div>
              )}

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
                  Save Item to Inventory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
