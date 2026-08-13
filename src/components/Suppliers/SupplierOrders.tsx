import React, { useState } from 'react';
import { 
  Truck, 
  Plus, 
  CheckCircle2, 
  Clock, 
  PackageCheck, 
  Building2, 
  Phone, 
  Mail,
  X
} from 'lucide-react';
import { Supplier, PurchaseOrder, Medication } from '../../types';

interface SupplierOrdersProps {
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  medications: Medication[];
  onCreatePO: (po: PurchaseOrder) => void;
  onReceivePO: (poId: string) => void;
}

export const SupplierOrders: React.FC<SupplierOrdersProps> = ({
  suppliers,
  purchaseOrders,
  medications,
  onCreatePO,
  onReceivePO,
}) => {
  const [showNewPoModal, setShowNewPoModal] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState(suppliers[0]?.id || '');
  const [selectedMedId, setSelectedMedId] = useState(medications[0]?.id || '');
  const [orderQty, setOrderQty] = useState(200);

  const handleCreatePO = (e: React.FormEvent) => {
    e.preventDefault();
    const supp = suppliers.find(s => s.id === selectedSupplierId);
    const med = medications.find(m => m.id === selectedMedId);
    if (!supp || !med) return;

    const newPO: PurchaseOrder = {
      id: 'po-' + Date.now(),
      poNumber: 'PO-2026-' + Math.floor(1000 + Math.random() * 9000),
      supplierId: supp.id,
      supplierName: supp.name,
      orderDate: new Date().toISOString().split('T')[0],
      expectedDelivery: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
      status: 'Submitted',
      items: [
        {
          medicationId: med.id,
          medicationName: `${med.name} ${med.strength}`,
          quantityOrdered: orderQty,
          quantityReceived: 0,
          unitCost: med.costPrice
        }
      ],
      totalAmount: med.costPrice * orderQty
    };

    onCreatePO(newPO);
    setShowNewPoModal(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Suppliers & Purchase Orders</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Wholesale distributor procurement, purchase order tracking, and stock intake receiving.
          </p>
        </div>

        <button
          onClick={() => setShowNewPoModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-slate-950 font-semibold rounded-xl text-xs hover:bg-emerald-400 shadow-md transition"
        >
          <Plus className="w-4 h-4" />
          <span>Create Purchase Order</span>
        </button>
      </div>

      {/* Distributors Directory Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {suppliers.map((supp) => (
          <div key={supp.id} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-white">{supp.name}</span>
              <span className="text-[10px] px-2 py-0.5 bg-teal-500/20 text-teal-300 rounded font-semibold">
                ⭐ {supp.rating} Rating
              </span>
            </div>
            <p className="text-xs text-slate-400">Contact: {supp.contactPerson}</p>
            <div className="text-xs text-slate-300 space-y-0.5 pt-2 border-t border-slate-800/80">
              <p>Ph: {supp.phone}</p>
              <p>Lead Time: {supp.leadTimeDays} Business Day(s)</p>
            </div>
          </div>
        ))}
      </div>

      {/* Purchase Orders Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-white">Active Purchase Orders</h2>

        <div className="space-y-3">
          {purchaseOrders.length === 0 ? (
            <p className="text-xs text-slate-500 p-8 text-center border border-dashed border-slate-800 rounded-xl">
              No active purchase orders.
            </p>
          ) : (
            purchaseOrders.map((po) => {
              const isReceived = po.status === 'Received';

              return (
                <div key={po.id} className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-emerald-400">{po.poNumber}</span>
                      <span className="font-bold text-xs text-white">{po.supplierName}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        isReceived ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {po.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300">
                      Ordered: {po.orderDate} • Expected Delivery: {po.expectedDelivery}
                    </p>

                    <p className="text-xs text-slate-400">
                      Items: {po.items.map(i => `${i.medicationName} (${i.quantityOrdered} units)`).join(', ')}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-bold text-emerald-400 text-sm">${po.totalAmount.toFixed(2)}</span>

                    {!isReceived && (
                      <button
                        onClick={() => onReceivePO(po.id)}
                        className="px-3 py-2 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl hover:bg-emerald-400 transition flex items-center gap-1.5"
                      >
                        <PackageCheck className="w-4 h-4" />
                        <span>Receive Shipment & Restock</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* New Purchase Order Modal */}
      {showNewPoModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Create Purchase Order</h3>
              <button onClick={() => setShowNewPoModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePO} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Select Supplier Distributor</label>
                <select
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                >
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Medication Item to Restock</label>
                <select
                  value={selectedMedId}
                  onChange={(e) => setSelectedMedId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                >
                  {medications.map(m => (
                    <option key={m.id} value={m.id}>{m.name} {m.strength} (Stock: {m.stockQuantity})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Order Quantity (Units)</label>
                <input
                  type="number"
                  value={orderQty}
                  onChange={(e) => setOrderQty(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewPoModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 text-slate-950 text-xs font-bold rounded-xl hover:bg-emerald-400"
                >
                  Submit Purchase Order
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
