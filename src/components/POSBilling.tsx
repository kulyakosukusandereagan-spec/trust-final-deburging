import React, { useState } from 'react';
import { Prescription, DrugItem, Patient, SaleTransaction, SaleItem } from '../types';
import { 
  ShoppingCart, 
  Trash2, 
  CreditCard, 
  Printer, 
  CheckCircle2, 
  Search, 
  User, 
  DollarSign, 
  Receipt,
  ShieldCheck,
  Plus
} from 'lucide-react';

interface POSBillingProps {
  prescriptions: Prescription[];
  drugs: DrugItem[];
  patients: Patient[];
  sales: SaleTransaction[];
  onCompleteSale: (sale: SaleTransaction) => void;
  onUpdatePrescriptionStatus: (rxId: string, newStatus: any) => void;
}

export const POSBilling: React.FC<POSBillingProps> = ({
  prescriptions,
  drugs,
  patients,
  sales,
  onCompleteSale,
  onUpdatePrescriptionStatus,
}) => {
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [cartItems, setCartItems] = useState<SaleItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Credit Card' | 'Debit Card' | 'Insurance Direct'>('Credit Card');
  const [completedReceipt, setCompletedReceipt] = useState<SaleTransaction | null>(null);

  // Ready Prescriptions available to load into POS cart
  const readyRxs = prescriptions.filter(p => p.status === 'Ready to Dispense');

  // Add Ready Prescription to Cart
  const handleAddRxToCart = (rx: Prescription) => {
    if (cartItems.some(item => item.rxNumber === rx.rxNumber)) return;

    const newItem: SaleItem = {
      medicationId: rx.medicationId,
      medicationName: rx.medicationName,
      strength: rx.strength,
      quantity: rx.quantityDispensed,
      unitPrice: rx.totalPrice / rx.quantityDispensed,
      totalPrice: rx.totalPrice,
      copay: rx.patientCopay,
      insurancePaid: rx.insuranceCoveredAmount,
      rxNumber: rx.rxNumber
    };

    setCartItems(prev => [...prev, newItem]);
    if (!selectedPatientId && rx.patientId) {
      setSelectedPatientId(rx.patientId);
    }
  };

  // Add OTC Drug to Cart
  const handleAddOTCToCart = (drug: DrugItem) => {
    const existingIndex = cartItems.findIndex(i => i.medicationId === drug.id && !i.rxNumber);
    if (existingIndex >= 0) {
      const updated = [...cartItems];
      updated[existingIndex].quantity += 1;
      updated[existingIndex].totalPrice = updated[existingIndex].quantity * drug.unitPrice;
      updated[existingIndex].copay = updated[existingIndex].totalPrice;
      setCartItems(updated);
    } else {
      const newItem: SaleItem = {
        medicationId: drug.id,
        medicationName: `${drug.brandName} (${drug.genericName})`,
        strength: drug.strength,
        quantity: 1,
        unitPrice: drug.unitPrice,
        totalPrice: drug.unitPrice,
        copay: drug.unitPrice,
        insurancePaid: 0
      };
      setCartItems(prev => [...prev, newItem]);
    }
  };

  const handleRemoveFromCart = (index: number) => {
    setCartItems(prev => prev.filter((_, i) => i !== index));
  };

  // Calculations
  const subtotal = cartItems.reduce((acc, item) => acc + item.totalPrice, 0);
  const patientCopayTotal = cartItems.reduce((acc, item) => acc + item.copay, 0);
  const insurancePaidTotal = cartItems.reduce((acc, item) => acc + item.insurancePaid, 0);
  const tax = patientCopayTotal > 0 ? Number((patientCopayTotal * 0.05).toFixed(2)) : 0;
  const finalPatientAmount = patientCopayTotal + tax;

  // Process Checkout
  const handleCheckout = () => {
    if (cartItems.length === 0) return;

    const patient = patients.find(p => p.id === selectedPatientId);
    const receiptNum = `RCP-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const newSale: SaleTransaction = {
      id: `tx-${Date.now()}`,
      receiptNumber: receiptNum,
      patientId: patient?.id,
      patientName: patient?.fullName || 'Walk-in Counter Customer',
      items: cartItems,
      subtotal,
      tax,
      insurancePaidTotal,
      patientPaidTotal: finalPatientAmount,
      paymentMethod,
      paymentStatus: 'Completed',
      timestamp: new Date().toLocaleString(),
      pharmacistOnDuty: 'PharmD. Sarah Connor, RPh'
    };

    // Update Prescriptions in cart to 'Dispensed'
    cartItems.forEach(item => {
      if (item.rxNumber) {
        const rx = prescriptions.find(p => p.rxNumber === item.rxNumber);
        if (rx) {
          onUpdatePrescriptionStatus(rx.id, 'Dispensed', `Rung up on POS Receipt ${receiptNum}`);
        }
      }
    });

    onCompleteSale(newSale);
    setCompletedReceipt(newSale);
    setCartItems([]);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 p-5 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-emerald-400" /> Point of Sale & Dispense Counter
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Ring up prescriptions ready for pickup, process real-time insurance co-pays, and issue itemized receipts.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Quick Load Ready Prescriptions & OTC Lookup */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ready Prescriptions Queue Box */}
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Prescriptions Ready for Patient Pickup
              </h3>
              <span className="text-xs bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full font-mono">
                {readyRxs.length} Ready
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
              {readyRxs.map((rx) => {
                const isInCart = cartItems.some(i => i.rxNumber === rx.rxNumber);
                return (
                  <div
                    key={rx.id}
                    className={`p-3 rounded-xl border transition-all flex flex-col justify-between ${
                      isInCart
                        ? 'bg-emerald-950/30 border-emerald-500/50'
                        : 'bg-slate-800/60 border-slate-700/80 hover:border-emerald-500/40'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-emerald-400 text-xs">{rx.rxNumber}</span>
                        <span className="text-[10px] text-slate-400 font-semibold">${rx.patientCopay.toFixed(2)} Copay</span>
                      </div>
                      <div className="font-bold text-slate-100 text-xs mt-1">{rx.patientName}</div>
                      <p className="text-[11px] text-slate-300 mt-0.5 line-clamp-1">{rx.medicationName}</p>
                    </div>

                    <button
                      onClick={() => handleAddRxToCart(rx)}
                      disabled={isInCart}
                      className={`mt-2 w-full py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                        isInCart
                          ? 'bg-slate-800 text-emerald-400 border border-emerald-800'
                          : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow'
                      }`}
                    >
                      {isInCart ? 'In Checkout Cart' : '+ Add Rx to POS Cart'}
                    </button>
                  </div>
                );
              })}

              {readyRxs.length === 0 && (
                <div className="col-span-2 text-center py-6 text-slate-400 text-xs">
                  No prescriptions currently marked 'Ready to Dispense'.
                </div>
              )}
            </div>
          </div>

          {/* Quick OTC OTC Search Table */}
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-slate-200">Over-The-Counter (OTC) & Health Product Catalogue</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-56 overflow-y-auto pr-1">
              {drugs.filter(d => !d.isControlled).slice(0, 6).map((drug) => (
                <div key={drug.id} className="p-3 bg-slate-800/40 border border-slate-700/60 rounded-xl flex items-center justify-between gap-2">
                  <div>
                    <div className="font-bold text-slate-200 text-xs">{drug.brandName}</div>
                    <div className="text-[10px] text-slate-400">{drug.strength} • ${drug.unitPrice.toFixed(2)}</div>
                  </div>
                  <button
                    onClick={() => handleAddOTCToCart(drug)}
                    className="p-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs cursor-pointer"
                    title="Add to cart"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Active Cart Terminal & Checkout */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-4 shadow-xl">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-400" /> Checkout Register
              </h3>
              <span className="text-xs text-slate-400">{cartItems.length} Items</span>
            </div>

            {/* Select Patient */}
            <div>
              <label className="block text-[11px] text-slate-400 font-semibold mb-1">Select Patient Profile</label>
              <select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">Walk-In OTC Customer (No Insurance)</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName} ({p.insuranceProvider})
                  </option>
                ))}
              </select>
            </div>

            {/* Itemized Cart List */}
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {cartItems.map((item, idx) => (
                <div key={idx} className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between gap-2 text-xs">
                  <div>
                    <div className="font-bold text-slate-200 flex items-center gap-1.5">
                      {item.medicationName}
                      {item.rxNumber && (
                        <span className="text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-1 rounded font-mono">
                          {item.rxNumber}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Qty: {item.quantity} × ${item.unitPrice.toFixed(2)}
                    </div>
                  </div>

                  <div className="text-right flex items-center gap-2">
                    <div>
                      <div className="font-mono font-bold text-emerald-400">${item.copay.toFixed(2)}</div>
                      {item.insurancePaid > 0 && (
                        <div className="text-[9px] text-slate-500">Ins: ${item.insurancePaid.toFixed(2)}</div>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveFromCart(idx)}
                      className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {cartItems.length === 0 && (
                <div className="text-center py-10 text-slate-500 text-xs italic">
                  Cart is empty. Select a ready prescription on the left to begin checkout.
                </div>
              )}
            </div>
          </div>

          {/* Cart Financial Breakdown */}
          <div className="space-y-3 pt-3 border-t border-slate-800 text-xs font-mono">
            <div className="flex justify-between text-slate-400">
              <span>Gross Total:</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Insurance Claim Paid:</span>
              <span className="text-emerald-400">-${insurancePaidTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Estimated Sales Tax:</span>
              <span>${tax.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-sm font-bold text-slate-100 pt-2 border-t border-slate-800">
              <span>Patient Amount Due:</span>
              <span className="text-emerald-400 font-mono text-base">${finalPatientAmount.toFixed(2)}</span>
            </div>

            {/* Payment Method Selector */}
            <div className="pt-2">
              <label className="block font-sans text-[11px] text-slate-400 mb-1">Payment Method</label>
              <div className="grid grid-cols-2 gap-2 font-sans text-xs">
                {(['Credit Card', 'Cash', 'Debit Card', 'Insurance Direct'] as const).map((pm) => (
                  <button
                    key={pm}
                    onClick={() => setPaymentMethod(pm)}
                    className={`py-1.5 px-2 rounded-lg border text-center transition-all cursor-pointer ${
                      paymentMethod === pm
                        ? 'bg-emerald-600 text-slate-950 font-bold border-emerald-500'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    {pm}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={cartItems.length === 0}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs shadow-lg transition-all cursor-pointer font-sans uppercase tracking-wider mt-3"
            >
              Complete Sale & Print Receipt
            </button>
          </div>
        </div>
      </div>

      {/* MODAL: Printable Receipt */}
      {completedReceipt && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-400" /> Transaction Completed
              </h3>
              <button onClick={() => setCompletedReceipt(null)} className="text-slate-400 hover:text-slate-200">
                ✕
              </button>
            </div>

            {/* Thermal Receipt Paper Layout */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 space-y-2">
              <div className="text-center border-b border-slate-800 pb-2">
                <span className="font-bold text-slate-100 block">PHARMACARE RX CLINICAL PHARMACY</span>
                <span className="text-[10px] text-slate-400">Receipt #: {completedReceipt.receiptNumber}</span>
                <span className="text-[10px] text-slate-500 block">{completedReceipt.timestamp}</span>
              </div>

              <div>
                <span className="text-[10px] text-slate-500">PATIENT:</span> {completedReceipt.patientName}
              </div>

              <div className="border-t border-b border-slate-800 py-2 space-y-1">
                {completedReceipt.items.map((it, i) => (
                  <div key={i} className="flex justify-between text-[11px]">
                    <div>
                      <span>{it.medicationName}</span>
                      <span className="block text-[9px] text-slate-500">Qty {it.quantity}</span>
                    </div>
                    <span className="font-bold">${it.copay.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-1 text-right text-[11px]">
                <div>Insurance Covered: -${completedReceipt.insurancePaidTotal.toFixed(2)}</div>
                <div>Sales Tax: ${completedReceipt.tax.toFixed(2)}</div>
                <div className="font-bold text-emerald-400 text-sm pt-1">
                  TOTAL PAID: ${completedReceipt.patientPaidTotal.toFixed(2)} ({completedReceipt.paymentMethod})
                </div>
              </div>

              <div className="text-center pt-3 border-t border-slate-800 text-[9px] text-slate-500">
                Thank you for trusting PharmaCare RX. For refill requests call (555) 019-2831.
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Print Receipt
              </button>

              <button
                onClick={() => setCompletedReceipt(null)}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
