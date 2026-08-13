import React, { useState } from 'react';
import { 
  PackageCheck, 
  Search, 
  AlertTriangle, 
  Clock, 
  Plus, 
  Barcode, 
  Filter, 
  Layers, 
  ShieldAlert, 
  DollarSign, 
  TrendingDown,
  Printer,
  ChevronRight
} from 'lucide-react';
import { DrugItem, BatchInfo, DrugCategory } from '../types/pharmacy';

interface InventoryViewProps {
  drugs: DrugItem[];
  onAddDrug: (drug: DrugItem) => void;
  onAddBatch: (drugId: string, batch: BatchInfo) => void;
  exchangeRate: number;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  drugs,
  onAddDrug,
  onAddBatch,
  exchangeRate
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'low_stock' | 'expiring'>('all');
  const [showAddDrugModal, setShowAddDrugModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState<string | null>(null);

  // New Drug Form State
  const [newBrand, setNewBrand] = useState('');
  const [newGeneric, setNewGeneric] = useState('');
  const [newCategory, setNewCategory] = useState<DrugCategory>('Antibiotics');
  const [newStrength, setNewStrength] = useState('500mg');
  const [newForm, setNewForm] = useState('Tablets');
  const [newPriceUSD, setNewPriceUSD] = useState('3.50');
  const [newStock, setNewStock] = useState('100');
  const [newBarcode, setNewBarcode] = useState(`890${Math.floor(100000000 + Math.random() * 900000000)}`);

  // New Batch Form State
  const [batchNo, setBatchNo] = useState('');
  const [batchExpiry, setBatchExpiry] = useState('2027-12-31');
  const [batchQty, setBatchQty] = useState('50');

  const lowStockDrugs = drugs.filter(d => d.totalStock <= d.reorderLevel);
  const expiringDrugs = drugs.filter(d => 
    d.batches.some(b => new Date(b.expiryDate).getTime() - new Date().getTime() < 90 * 24 * 60 * 60 * 1000)
  );

  const filteredDrugs = drugs.filter(drug => {
    const matchesSearch = 
      drug.brandName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      drug.genericName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      drug.category.toLowerCase().includes(searchQuery.toLowerCase());

    if (selectedFilter === 'low_stock') return matchesSearch && drug.totalStock <= drug.reorderLevel;
    if (selectedFilter === 'expiring') {
      return matchesSearch && drug.batches.some(b => new Date(b.expiryDate).getTime() - new Date().getTime() < 90 * 24 * 60 * 60 * 1000);
    }
    return matchesSearch;
  });

  const handleCreateDrugSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrand || !newGeneric) return;

    const drug: DrugItem = {
      id: `d-${Date.now()}`,
      brandName: newBrand,
      genericName: newGeneric,
      category: newCategory,
      form: newForm as any,
      strength: newStrength,
      priceUSD: parseFloat(newPriceUSD) || 1.0,
      priceSSP: (parseFloat(newPriceUSD) || 1.0) * exchangeRate,
      totalStock: parseInt(newStock) || 50,
      unit: 'Box',
      reorderLevel: 20,
      barcode: newBarcode,
      requiresPrescription: true,
      manufacturer: 'Juba Pharma Imports',
      storageConditions: 'Store below 30°C',
      description: 'Pharmaceutical product added to inventory.',
      batches: [
        {
          batchNo: `BAT-${Math.floor(1000 + Math.random() * 9000)}`,
          expiryDate: '2027-09-30',
          quantity: parseInt(newStock) || 50,
          costPriceUSD: (parseFloat(newPriceUSD) || 1.0) * 0.6,
          sellingPriceUSD: parseFloat(newPriceUSD) || 1.0,
          supplierName: 'MedPharm East Africa'
        }
      ]
    };

    onAddDrug(drug);
    setShowAddDrugModal(false);
    setNewBrand('');
    setNewGeneric('');
  };

  const handleAddBatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showBatchModal || !batchNo) return;

    const batch: BatchInfo = {
      batchNo,
      expiryDate: batchExpiry,
      quantity: parseInt(batchQty) || 50,
      costPriceUSD: 2.00,
      sellingPriceUSD: 3.50,
      supplierName: 'Nile Pharma Supplies'
    };

    onAddBatch(showBatchModal, batch);
    setShowBatchModal(null);
    setBatchNo('');
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 bg-slate-950 text-slate-100 min-h-[calc(100vh-4rem)]">
      
      {/* Top Inventory Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-medium">Total Medication SKUs</span>
            <div className="text-2xl font-black text-slate-100 mt-1">{drugs.length} Types</div>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <PackageCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-medium">Inventory Valuation</span>
            <div className="text-xl font-black text-amber-400 mt-1">
              ${drugs.reduce((s, d) => s + (d.priceUSD * d.totalStock), 0).toLocaleString()} USD
            </div>
            <div className="text-[10px] text-slate-500">
              ({(drugs.reduce((s, d) => s + (d.priceUSD * d.totalStock), 0) * exchangeRate).toLocaleString()} SSP)
            </div>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-medium">Low Stock Alerts</span>
            <div className="text-2xl font-black text-rose-400 mt-1">{lowStockDrugs.length} Items</div>
          </div>
          <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-medium">FEFO Expiry Warnings</span>
            <div className="text-2xl font-black text-amber-300 mt-1">{expiringDrugs.length} Batches</div>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-300 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Action Bar & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search inventory..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setSelectedFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
              selectedFilter === 'all' ? 'bg-emerald-500 text-slate-950 font-bold' : 'bg-slate-850 text-slate-400'
            }`}
          >
            All Stock
          </button>

          <button
            onClick={() => setSelectedFilter('low_stock')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
              selectedFilter === 'low_stock' ? 'bg-rose-500 text-white font-bold' : 'bg-slate-850 text-slate-400'
            }`}
          >
            Low Stock ({lowStockDrugs.length})
          </button>

          <button
            onClick={() => setSelectedFilter('expiring')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
              selectedFilter === 'expiring' ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-850 text-slate-400'
            }`}
          >
            FEFO Expiring ({expiringDrugs.length})
          </button>

          <button
            onClick={() => setShowAddDrugModal(true)}
            className="flex items-center space-x-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs shadow-md"
            id="add-new-medication-button"
          >
            <Plus className="w-4 h-4" />
            <span>Add Medication SKU</span>
          </button>
        </div>

      </div>

      {/* Inventory Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-850 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3.5">Medication & Generic</th>
                <th className="p-3.5">Category & Form</th>
                <th className="p-3.5">Unit Price (USD / SSP)</th>
                <th className="p-3.5">Stock Quantity</th>
                <th className="p-3.5">FEFO Batches</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredDrugs.map((drug) => {
                const isLowStock = drug.totalStock <= drug.reorderLevel;

                return (
                  <tr key={drug.id} className="hover:bg-slate-850/60 transition-colors">
                    
                    <td className="p-3.5">
                      <div className="font-bold text-slate-100 text-sm">{drug.brandName}</div>
                      <div className="text-[11px] text-slate-400 italic">{drug.genericName} • {drug.strength}</div>
                      <div className="text-[9px] font-mono text-slate-500">Barcode: {drug.barcode}</div>
                    </td>

                    <td className="p-3.5">
                      <span className="bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-[10px] font-semibold text-emerald-400">
                        {drug.category}
                      </span>
                      <div className="text-[11px] text-slate-400 mt-0.5">{drug.form}</div>
                    </td>

                    <td className="p-3.5 font-mono">
                      <div className="font-bold text-amber-400">${drug.priceUSD.toFixed(2)}</div>
                      <div className="text-[10px] text-slate-500">{(drug.priceUSD * exchangeRate).toLocaleString()} SSP</div>
                    </td>

                    <td className="p-3.5">
                      <span className={`font-mono font-extrabold text-sm ${isLowStock ? 'text-rose-400' : 'text-slate-100'}`}>
                        {drug.totalStock} {drug.form}
                      </span>
                      {isLowStock && (
                        <div className="text-[10px] text-rose-400 font-bold flex items-center space-x-1 mt-0.5">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Reorder Alert!</span>
                        </div>
                      )}
                    </td>

                    <td className="p-3.5">
                      <div className="space-y-1">
                        {drug.batches.map((b, i) => (
                          <div key={i} className="text-[10px] bg-slate-850 p-1 rounded border border-slate-800 flex justify-between font-mono">
                            <span>#{b.batchNo}</span>
                            <span className="text-amber-300">Exp: {b.expiryDate} ({b.quantity} qty)</span>
                          </div>
                        ))}
                      </div>
                    </td>

                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => setShowBatchModal(drug.id)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 font-bold text-[11px] transition-all"
                      >
                        + Intake Batch
                      </button>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add New Medication Modal */}
      {showAddDrugModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-slate-100">Add New Medication to Inventory</h3>
              <button onClick={() => setShowAddDrugModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateDrugSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Brand Name:</label>
                  <input
                    type="text"
                    required
                    value={newBrand}
                    onChange={(e) => setNewBrand(e.target.value)}
                    placeholder="e.g. Coartem"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Generic Active Ingredient:</label>
                  <input
                    type="text"
                    required
                    value={newGeneric}
                    onChange={(e) => setNewGeneric(e.target.value)}
                    placeholder="e.g. Artemether/Lumefantrine"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Category:</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
                  >
                    <option value="Antimalarials">Antimalarials</option>
                    <option value="Antibiotics">Antibiotics</option>
                    <option value="Analgesics & Antipyretics">Analgesics</option>
                    <option value="Diabetes & Endocrine">Diabetes Care</option>
                    <option value="Cardiovascular">Cardiovascular</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Strength:</label>
                  <input
                    type="text"
                    value={newStrength}
                    onChange={(e) => setNewStrength(e.target.value)}
                    placeholder="500mg"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Selling Price (USD):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newPriceUSD}
                    onChange={(e) => setNewPriceUSD(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Initial Stock Qty:</label>
                  <input
                    type="number"
                    value={newStock}
                    onChange={(e) => setNewStock(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Barcode Code:</label>
                  <input
                    type="text"
                    value={newBarcode}
                    onChange={(e) => setNewBarcode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddDrugModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold"
                >
                  Save Medication SKU
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Batch Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-sm w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-100">Intake New Batch Supply</h3>
              <button onClick={() => setShowBatchModal(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleAddBatchSubmit} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Batch Number:</label>
                <input
                  type="text"
                  required
                  value={batchNo}
                  onChange={(e) => setBatchNo(e.target.value)}
                  placeholder="e.g. BAT-2026-901"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Expiry Date:</label>
                <input
                  type="date"
                  required
                  value={batchExpiry}
                  onChange={(e) => setBatchExpiry(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Quantity Received:</label>
                <input
                  type="number"
                  required
                  value={batchQty}
                  onChange={(e) => setBatchQty(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowBatchModal(null)}
                  className="px-3 py-2 rounded-xl bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold"
                >
                  Add Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
