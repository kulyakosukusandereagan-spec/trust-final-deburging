import React, { useState } from 'react';
import { 
  Package, 
  Search, 
  Plus, 
  Filter, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle, 
  Edit, 
  Calendar, 
  DollarSign,
  Tag,
  Layers,
  MapPin,
  TrendingUp,
  X,
  Loader2
} from 'lucide-react';
import { Medication, DrugCategory, ControlledSchedule, DrugForm } from '../../types';

interface InventoryManagerProps {
  medications: Medication[];
  onAddMedication: (med: Medication) => void;
  onUpdateStock: (id: string, newStock: number) => void;
}

export const InventoryManager: React.FC<InventoryManagerProps> = ({
  medications,
  onAddMedication,
  onUpdateStock,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [stockFilter, setStockFilter] = useState<'All' | 'LowStock' | 'Expiring'>('All');
  
  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedMed, setSelectedMed] = useState<Medication | null>(null);
  const [editStockValue, setEditStockValue] = useState<number>(0);
  const [showEditStockModal, setShowEditStockModal] = useState(false);

  // AI Reorder Forecast State
  const [aiLoading, setAiLoading] = useState(false);
  const [aiForecastResult, setAiForecastResult] = useState<any>(null);

  // New Medication Form State
  const [newMed, setNewMed] = useState<Partial<Medication>>({
    name: '',
    genericName: '',
    brandName: '',
    ndc: '',
    category: 'Antibiotics',
    form: 'Tablet',
    strength: '500 mg',
    stockQuantity: 100,
    minStockLevel: 50,
    unitPrice: 15.00,
    costPrice: 5.00,
    manufacturer: 'Teva Pharmaceuticals',
    expiryDate: '2027-12-31',
    batchNumber: 'LOT-' + Math.floor(100000 + Math.random() * 900000),
    locationRack: 'Bay 1 - Shelf A',
    schedule: 'Non-Controlled',
    rxRequired: true,
    activeIngredients: []
  });

  const categories: string[] = [
    'All',
    'Antibiotics',
    'Cardiovascular',
    'Analgesics / Pain',
    'Respiratory',
    'Endocrine / Diabetes',
    'Gastrointestinal',
    'Psychiatric',
    'OTC General'
  ];

  // Filtered meds
  const filteredMeds = medications.filter(med => {
    const matchesSearch = 
      med.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      med.genericName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      med.ndc.includes(searchTerm) ||
      (med.brandName && med.brandName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = selectedCategory === 'All' || med.category === selectedCategory;

    let matchesStock = true;
    if (stockFilter === 'LowStock') {
      matchesStock = med.stockQuantity <= med.minStockLevel;
    } else if (stockFilter === 'Expiring') {
      const expYear = new Date(med.expiryDate).getFullYear();
      matchesStock = expYear <= 2026;
    }

    return matchesSearch && matchesCategory && matchesStock;
  });

  const handleRunAiForecast = async () => {
    setAiLoading(true);
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
      const resData = await response.json();
      if (resData.success) {
        setAiForecastResult(resData.data);
      }
    } catch (error) {
      console.error('Failed to run AI reorder forecast', error);
    } finally {
      setAiLoading(false);
    }
  };

  const handleSaveNewMed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMed.name || !newMed.ndc) return;

    const medToAdd: Medication = {
      id: 'med-' + Date.now(),
      name: newMed.name || 'Unknown Drug',
      genericName: newMed.genericName || newMed.name || 'Generic',
      brandName: newMed.brandName || '',
      ndc: newMed.ndc || '00000-0000-00',
      category: (newMed.category as DrugCategory) || 'OTC General',
      form: (newMed.form as DrugForm) || 'Tablet',
      strength: newMed.strength || '10mg',
      stockQuantity: Number(newMed.stockQuantity) || 0,
      minStockLevel: Number(newMed.minStockLevel) || 20,
      unitPrice: Number(newMed.unitPrice) || 10.00,
      costPrice: Number(newMed.costPrice) || 3.00,
      manufacturer: newMed.manufacturer || 'Generic Mfr',
      expiryDate: newMed.expiryDate || '2027-12-31',
      batchNumber: newMed.batchNumber || 'LOT-100201',
      locationRack: newMed.locationRack || 'Shelf A1',
      schedule: (newMed.schedule as ControlledSchedule) || 'Non-Controlled',
      rxRequired: newMed.rxRequired ?? true,
      activeIngredients: newMed.name ? [newMed.name] : ['Active Ingredient']
    };

    onAddMedication(medToAdd);
    setShowAddModal(false);
  };

  const handleSaveStockAdjustment = () => {
    if (!selectedMed) return;
    onUpdateStock(selectedMed.id, editStockValue);
    setShowEditStockModal(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Medication Inventory & Stock Catalog</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time stock tracking, batch numbers, NDC codes, shelf positions, and automated reorder intelligence.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRunAiForecast}
            disabled={aiLoading}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-500/20 to-emerald-500/20 text-teal-300 border border-teal-500/40 rounded-xl font-semibold text-xs hover:bg-teal-500/30 transition disabled:opacity-50"
          >
            {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-teal-400" />}
            <span>AI Restock Forecast</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-slate-950 font-semibold rounded-xl text-xs hover:bg-emerald-400 shadow-md shadow-emerald-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Medication</span>
          </button>
        </div>
      </div>

      {/* AI Restock Forecast Results Banner */}
      {aiForecastResult && (
        <div className="p-4 bg-slate-900 border border-teal-500/40 rounded-2xl shadow-lg relative">
          <button 
            onClick={() => setAiForecastResult(null)}
            className="absolute top-3 right-3 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
          
          <div className="flex items-center gap-2 text-teal-400 font-bold text-sm mb-2">
            <Sparkles className="w-4 h-4" />
            <span>AI Pharmacy Restock Intelligence Analysis</span>
          </div>

          <p className="text-xs text-slate-300 mb-3">{aiForecastResult.forecastSummary}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {aiForecastResult.recommendations?.map((item: any, idx: number) => (
              <div key={idx} className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1">
                <div className="flex items-center justify-between font-semibold text-white">
                  <span>{item.medicationName}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                    item.urgency === 'High' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {item.urgency} Urgency
                  </span>
                </div>
                <div className="text-slate-400">Current: {item.currentStock} units • Reorder: <span className="text-emerald-400 font-bold">+{item.recommendedOrderQty} units</span></div>
                <p className="text-[11px] text-slate-400 italic">"{item.reasoning}"</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by drug name, brand, generic, or NDC code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Quick Filter Buttons */}
          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => setStockFilter('All')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                stockFilter === 'All' ? 'bg-slate-800 text-white border border-slate-700' : 'text-slate-400 hover:bg-slate-800/60'
              }`}
            >
              All Items ({medications.length})
            </button>
            <button
              onClick={() => setStockFilter('LowStock')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition ${
                stockFilter === 'LowStock' ? 'bg-red-500/20 text-red-300 border border-red-500/40' : 'text-slate-400 hover:bg-slate-800/60'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              <span>Low Stock Alerts</span>
            </button>
            <button
              onClick={() => setStockFilter('Expiring')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition ${
                stockFilter === 'Expiring' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:bg-slate-800/60'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>Expiring Soon</span>
            </button>
          </div>

        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-slate-800/60 scrollbar-none">
          <span className="text-xs text-slate-500 font-medium mr-2">Category:</span>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-lg text-xs whitespace-nowrap transition ${
                selectedCategory === cat
                  ? 'bg-emerald-500 text-slate-950 font-semibold'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Medication Inventory Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Drug & Strength</th>
                <th className="py-3.5 px-4">NDC & Category</th>
                <th className="py-3.5 px-4">Stock Level</th>
                <th className="py-3.5 px-4">Unit Price</th>
                <th className="py-3.5 px-4">Expiry & Batch</th>
                <th className="py-3.5 px-4">Location</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {filteredMeds.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No medications found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredMeds.map((med) => {
                  const isLow = med.stockQuantity <= med.minStockLevel;
                  const isExpiring = new Date(med.expiryDate).getFullYear() <= 2026;

                  return (
                    <tr key={med.id} className="hover:bg-slate-800/40 transition">
                      
                      {/* Drug Name & Brand */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white text-sm">{med.name}</span>
                            {med.schedule !== 'Non-Controlled' && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                {med.schedule}
                              </span>
                            )}
                          </div>
                          <p className="text-slate-400 text-xs">
                            {med.genericName} • <span className="text-slate-300 font-medium">{med.strength}</span> ({med.form})
                          </p>
                        </div>
                      </td>

                      {/* NDC & Category */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <span className="font-mono text-slate-300 text-xs">{med.ndc}</span>
                          <p className="text-slate-400 text-[11px]">{med.category}</p>
                        </div>
                      </td>

                      {/* Stock Level Badge */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-sm ${
                            isLow ? 'text-red-400' : 'text-white'
                          }`}>
                            {med.stockQuantity}
                          </span>
                          <span className="text-slate-500 text-[11px]">/ min {med.minStockLevel}</span>

                          {isLow && (
                            <span className="px-2 py-0.5 text-[10px] font-semibold bg-red-500/20 text-red-400 rounded border border-red-500/30">
                              Low
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Pricing & Margin */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <span className="font-medium text-emerald-400 text-xs">${med.unitPrice.toFixed(2)}</span>
                          <p className="text-slate-500 text-[11px]">Cost: ${med.costPrice.toFixed(2)}</p>
                        </div>
                      </td>

                      {/* Expiry & Lot */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <span className={`font-medium ${isExpiring ? 'text-amber-400 font-semibold' : 'text-slate-300'}`}>
                            {med.expiryDate}
                          </span>
                          <p className="text-slate-500 text-[11px]">Batch: {med.batchNumber}</p>
                        </div>
                      </td>

                      {/* Rack Location */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 text-slate-300 font-medium bg-slate-800/80 px-2 py-1 rounded-md text-[11px] border border-slate-700/60">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {med.locationRack}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedMed(med);
                              setEditStockValue(med.stockQuantity);
                              setShowEditStockModal(true);
                            }}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                            title="Adjust Stock"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjust Stock Modal */}
      {showEditStockModal && selectedMed && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Adjust Stock Count</h3>
              <button onClick={() => setShowEditStockModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-white">{selectedMed.name} ({selectedMed.strength})</p>
              <p className="text-xs text-slate-400">NDC: {selectedMed.ndc} • Current Stock: {selectedMed.stockQuantity} units</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">New Inventory Balance</label>
              <input
                type="number"
                value={editStockValue}
                onChange={(e) => setEditStockValue(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowEditStockModal(false)}
                className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveStockAdjustment}
                className="flex-1 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-semibold hover:bg-emerald-400 transition"
              >
                Update Stock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Medication Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Add New Pharmaceutical Item</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewMed} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Medication Trade Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Amoxicillin Trihydrate"
                    value={newMed.name}
                    onChange={(e) => setNewMed({ ...newMed, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Generic Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Amoxicillin"
                    value={newMed.genericName}
                    onChange={(e) => setNewMed({ ...newMed, genericName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">National Drug Code (NDC) *</label>
                  <input
                    type="text"
                    required
                    placeholder="00093-3109-05"
                    value={newMed.ndc}
                    onChange={(e) => setNewMed({ ...newMed, ndc: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Category</label>
                  <select
                    value={newMed.category}
                    onChange={(e) => setNewMed({ ...newMed, category: e.target.value as DrugCategory })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:ring-2 focus:ring-emerald-500"
                  >
                    {categories.filter(c => c !== 'All').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Strength</label>
                  <input
                    type="text"
                    placeholder="e.g. 500 mg"
                    value={newMed.strength}
                    onChange={(e) => setNewMed({ ...newMed, strength: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Dosage Form</label>
                  <select
                    value={newMed.form}
                    onChange={(e) => setNewMed({ ...newMed, form: e.target.value as DrugForm })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Tablet">Tablet</option>
                    <option value="Capsule">Capsule</option>
                    <option value="Syrup">Syrup</option>
                    <option value="Injection">Injection</option>
                    <option value="Inhaler">Inhaler</option>
                    <option value="Ointment">Ointment</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Initial Stock Qty</label>
                  <input
                    type="number"
                    value={newMed.stockQuantity}
                    onChange={(e) => setNewMed({ ...newMed, stockQuantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Retail Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newMed.unitPrice}
                    onChange={(e) => setNewMed({ ...newMed, unitPrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Cost Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newMed.costPrice}
                    onChange={(e) => setNewMed({ ...newMed, costPrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Shelf Rack Location</label>
                  <input
                    type="text"
                    placeholder="Bay 2 - Shelf B3"
                    value={newMed.locationRack}
                    onChange={(e) => setNewMed({ ...newMed, locationRack: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-semibold hover:bg-emerald-400 transition shadow-md"
                >
                  Save Medication
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
