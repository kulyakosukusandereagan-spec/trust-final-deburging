import React, { useState } from 'react';
import { Truck, Search, Plus, Phone, Mail, MapPin, CheckCircle, Clock, ShieldCheck, DollarSign, ArrowRight } from 'lucide-react';
import { Supplier, PurchaseOrder } from '../types/pharmacy';

interface SuppliersViewProps {
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  onAddSupplier: (supplier: Supplier) => void;
  onAddPurchaseOrder: (po: PurchaseOrder) => void;
}

export const SuppliersView: React.FC<SuppliersViewProps> = ({
  suppliers,
  purchaseOrders,
  onAddSupplier,
  onAddPurchaseOrder
}) => {
  const [activeTab, setActiveTab] = useState<'suppliers' | 'orders'>('suppliers');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);

  // New Supplier Form
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('+254 7');
  const [email, setEmail] = useState('');
  const [location, setLocation] = useState('Nairobi / Kampala Importing Logistics');

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.country.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    const newSupplier: Supplier = {
      id: `sup-${Date.now()}`,
      name,
      contactPerson,
      phone,
      email: email || 'orders@pharmaimport.com',
      location,
      address: location,
      country: 'East Africa Import Network',
      leadTimeDays: 7,
      rating: 4.8
    };

    onAddSupplier(newSupplier);
    setShowAddSupplierModal(false);
    setName('');
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 bg-slate-950 text-slate-100 min-h-[calc(100vh-4rem)]">
      
      {/* Navigation Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Wholesale Suppliers & Purchase Orders</h2>
            <p className="text-xs text-slate-400">Manage East Africa pharmaceutical importers, batch requisitions, and customs clearance tracking</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('suppliers')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'suppliers'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'bg-slate-850 text-slate-400 border border-slate-800'
            }`}
          >
            Registered Importers ({suppliers.length})
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'orders'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'bg-slate-850 text-slate-400 border border-slate-800'
            }`}
          >
            Purchase Orders ({purchaseOrders.length})
          </button>
        </div>
      </div>

      {activeTab === 'suppliers' ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="relative w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search suppliers or origin country..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200"
              />
            </div>

            <button
              onClick={() => setShowAddSupplierModal(true)}
              className="flex items-center space-x-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Add Supplier Partner</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSuppliers.map(sup => (
              <div key={sup.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-md hover:border-slate-700 transition-all">
                <div className="flex justify-between items-start border-b border-slate-800 pb-2.5">
                  <div>
                    <h3 className="font-bold text-sm text-slate-100">{sup.name}</h3>
                    <div className="text-[10px] text-emerald-400 font-semibold">{sup.country}</div>
                  </div>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-300 font-bold px-2 py-0.5 rounded border border-emerald-500/20">
                    Lead: {sup.leadTimeDays} Days
                  </span>
                </div>

                <div className="text-xs space-y-1.5 text-slate-300">
                  <div className="flex items-center space-x-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{sup.phone}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{sup.email}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[11px] text-slate-400">{sup.address}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Purchase Orders Tab */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-sm text-slate-100">Stock Requisition & Import Purchase Orders</h3>
            <span className="text-xs text-slate-400">Track drug imports from Kampala / Nairobi to Juba</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-850 text-slate-400 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3">PO Code</th>
                  <th className="p-3">Supplier Name</th>
                  <th className="p-3">Order Date</th>
                  <th className="p-3">Total Amount (USD)</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {purchaseOrders.map(po => (
                  <tr key={po.id} className="hover:bg-slate-850/60">
                    <td className="p-3 font-mono font-bold text-emerald-400">{po.poNumber}</td>
                    <td className="p-3 font-semibold text-slate-100">{po.supplierName}</td>
                    <td className="p-3">{(po as any).createdAt || (po as any).dateCreated || 'N/A'}</td>
                    <td className="p-3 font-mono font-bold text-amber-400">${((po as any).totalAmount ?? (po as any).totalUSD ?? 0).toFixed(2)}</td>
                    <td className="p-3">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                        po.status === 'Received'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                      }`}>
                        {po.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Supplier Modal */}
      {showAddSupplierModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-md w-full space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-slate-100">Register Supplier / Import Partner</h3>
              <button onClick={() => setShowAddSupplierModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateSupplier} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Company / Importer Name:</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. MedPharm East Africa Ltd"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Contact Representative:</label>
                <input
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  placeholder="e.g. Dr. Francis Ochieng"
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
                  <label className="text-slate-400 block mb-1">Email:</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Warehouse Address / Hub:</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddSupplierModal(false)}
                  className="px-3 py-2 rounded-xl bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold"
                >
                  Save Partner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
