import React, { useState } from 'react';
import { 
  ShoppingCart, 
  Search, 
  Trash2, 
  CreditCard, 
  DollarSign, 
  CheckCircle, 
  Printer, 
  Plus, 
  Minus,
  UserCheck,
  Receipt,
  Pill,
  X
} from 'lucide-react';
import { Medication, Prescription, POSCartItem, POSTransaction } from '../../types';

interface POSCheckoutProps {
  prescriptions: Prescription[];
  medications: Medication[];
  onCompleteSale: (transaction: POSTransaction) => void;
}

export const POSCheckout: React.FC<POSCheckoutProps> = ({
  prescriptions,
  medications,
  onCompleteSale,
}) => {
  const [patientSearch, setPatientSearch] = useState('');
  const [cart, setCart] = useState<POSCartItem[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'Credit Card' | 'Cash' | 'Insurance Co-pay' | 'Digital Wallet'>('Credit Card');
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [activeReceipt, setActiveReceipt] = useState<POSTransaction | null>(null);

  // Ready prescriptions to pull into register
  const readyPrescriptions = prescriptions.filter(p => p.status === 'Ready for Pickup');

  const addRxToCart = (rx: Prescription) => {
    // Check if already in cart
    if (cart.some(item => item.rxId === rx.id)) return;

    const cartItem: POSCartItem = {
      id: 'cart-' + Date.now(),
      type: 'Rx',
      rxId: rx.id,
      name: `[Rx] ${rx.items[0]?.medicationName} ${rx.items[0]?.strength}`,
      quantity: 1,
      unitPrice: rx.totalCost,
      copay: rx.copayAmount,
      insuranceCovered: rx.insuranceCoveredAmount
    };

    setCart([...cart, cartItem]);
    if (rx.patientName) setCustomerName(rx.patientName);
  };

  const addOtcToCart = (med: Medication) => {
    const existing = cart.find(item => item.medicationId === med.id);
    if (existing) {
      setCart(cart.map(i => i.medicationId === med.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      const cartItem: POSCartItem = {
        id: 'cart-' + Date.now(),
        type: 'OTC',
        medicationId: med.id,
        name: med.name,
        quantity: 1,
        unitPrice: med.unitPrice
      };
      setCart([...cart, cartItem]);
    }
  };

  const removeItem = (id: string) => {
    setCart(cart.filter(i => i.id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  // Pricing calculations
  const subtotal = cart.reduce((acc, item) => {
    if (item.type === 'Rx' && item.copay !== undefined) {
      return acc + item.copay * item.quantity;
    }
    return acc + (item.unitPrice * item.quantity);
  }, 0);

  const insuranceCoveredTotal = cart.reduce((acc, item) => acc + (item.insuranceCovered || 0), 0);
  const tax = subtotal * 0.05; // 5% OTC tax
  const totalAmount = subtotal + tax;

  const handleCheckout = () => {
    if (cart.length === 0) return;

    const transaction: POSTransaction = {
      id: 'pos-' + Date.now(),
      receiptNumber: 'RCP-2026-' + Math.floor(1000 + Math.random() * 9000),
      timestamp: new Date().toLocaleString(),
      patientName: customerName,
      items: cart,
      subtotal,
      tax,
      discount: 0,
      total: totalAmount,
      paymentMethod: selectedPaymentMethod,
      cashierName: 'Evelyn Reed, CPhT'
    };

    onCompleteSale(transaction);
    setActiveReceipt(transaction);
    setCart([]);
    setCustomerName('Walk-in Customer');
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Pharmacy Point-of-Sale Register</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Process patient prescription co-pays, insurance claim deductions, and OTC medicine sales.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Ready Prescriptions & OTC Catalog Search (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Ready Prescriptions Queue Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-teal-500/10 text-teal-400 rounded-lg">
                  <UserCheck className="w-4 h-4" />
                </div>
                <h2 className="text-base font-semibold text-white">Prescriptions Ready for Pickup</h2>
              </div>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                {readyPrescriptions.length} Vials Prepared
              </span>
            </div>

            {readyPrescriptions.length === 0 ? (
              <p className="text-xs text-slate-500 p-4 text-center border border-dashed border-slate-800 rounded-xl">
                No prescriptions currently awaiting pickup.
              </p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {readyPrescriptions.map((rx) => {
                  const isAdded = cart.some(i => i.rxId === rx.id);
                  return (
                    <div 
                      key={rx.id} 
                      className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-emerald-400">{rx.rxNumber}</span>
                          <span className="font-bold text-xs text-white">{rx.patientName}</span>
                        </div>
                        <p className="text-xs text-slate-300">
                          {rx.items[0]?.medicationName} {rx.items[0]?.strength}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Insurance Covered: <span className="text-emerald-400">${rx.insuranceCoveredAmount.toFixed(2)}</span> • Patient Co-pay: <span className="text-white font-bold">${rx.copayAmount.toFixed(2)}</span>
                        </p>
                      </div>

                      <button
                        onClick={() => addRxToCart(rx)}
                        disabled={isAdded}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                          isAdded 
                            ? 'bg-slate-800 text-slate-500' 
                            : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                        }`}
                      >
                        {isAdded ? 'In Register' : 'Add to Register'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* OTC Medication Items Grid */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">Over-the-Counter & General Catalog</h2>
              <span className="text-xs text-slate-400">Click item to add to bill</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {medications.map((med) => (
                <div 
                  key={med.id}
                  onClick={() => addOtcToCart(med)}
                  className="p-3 bg-slate-950 border border-slate-800 hover:border-emerald-500/50 rounded-xl cursor-pointer transition flex items-center justify-between gap-2 group"
                >
                  <div>
                    <p className="font-bold text-xs text-white group-hover:text-emerald-400 transition">{med.name}</p>
                    <p className="text-[11px] text-slate-400">{med.strength} • {med.category}</p>
                    <p className="text-xs text-emerald-400 font-semibold mt-1">${med.unitPrice.toFixed(2)}</p>
                  </div>
                  <div className="p-2 bg-slate-900 rounded-lg text-slate-400 group-hover:bg-emerald-500 group-hover:text-slate-950 transition">
                    <Plus className="w-4 h-4" />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: Cart Register Terminal (5 Cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between h-full space-y-6">
          
          <div className="space-y-4">
            
            {/* Customer Name Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-400" />
                <h2 className="text-base font-bold text-white">Checkout Terminal</h2>
              </div>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Patient Name"
                className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-right"
              />
            </div>

            {/* Register Itemized List */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {cart.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                  Register is empty. Add ready prescriptions or OTC products above.
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between gap-2">
                    <div className="space-y-0.5 flex-1">
                      <p className="text-xs font-semibold text-white">{item.name}</p>
                      {item.copay !== undefined ? (
                        <p className="text-[11px] text-teal-400 font-medium">
                          Insurance Co-pay Rate applied
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-400">${item.unitPrice.toFixed(2)} each</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center border border-slate-800 rounded-lg bg-slate-900">
                        <button 
                          onClick={() => updateQuantity(item.id, -1)}
                          className="px-2 py-1 text-slate-400 hover:text-white text-xs"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 font-bold text-xs text-white">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.id, 1)}
                          className="px-2 py-1 text-slate-400 hover:text-white text-xs"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <span className="font-bold text-xs text-emerald-400 w-16 text-right">
                        ${((item.copay !== undefined ? item.copay : item.unitPrice) * item.quantity).toFixed(2)}
                      </span>

                      <button onClick={() => removeItem(item.id)} className="text-slate-500 hover:text-red-400 transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>

          {/* Payment Summary Box */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            
            <div className="space-y-2 text-xs">
              {insuranceCoveredTotal > 0 && (
                <div className="flex justify-between text-teal-400">
                  <span>Insurance Primary Claim Benefit</span>
                  <span>-${insuranceCoveredTotal.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-400">
                <span>Subtotal (Co-pay / Retail)</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Tax (5% OTC)</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-slate-800">
                <span>Total Amount Due</span>
                <span className="text-emerald-400 text-xl">${totalAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-400">Select Payment Method</label>
              <div className="grid grid-cols-2 gap-2">
                {(['Credit Card', 'Cash', 'Insurance Co-pay', 'Digital Wallet'] as const).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setSelectedPaymentMethod(method)}
                    className={`p-2 rounded-xl text-xs font-semibold border text-center transition ${
                      selectedPaymentMethod === method
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={cart.length === 0}
              className="w-full py-3 bg-emerald-500 text-slate-950 font-bold rounded-xl text-sm hover:bg-emerald-400 shadow-lg shadow-emerald-500/20 transition disabled:opacity-50"
            >
              Complete POS Sale (${totalAmount.toFixed(2)})
            </button>

          </div>

        </div>

      </div>

      {/* Digital Receipt Modal */}
      {activeReceipt && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">POS Transaction Receipt</h3>
              <button onClick={() => setActiveReceipt(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-white text-slate-950 rounded-xl font-mono text-xs space-y-2 shadow-inner">
              <div className="text-center border-b border-slate-300 pb-2">
                <p className="font-bold text-sm tracking-tight">PHARMAPULSE CENTRAL #408</p>
                <p className="text-[10px] text-slate-600">Receipt #: {activeReceipt.receiptNumber}</p>
                <p className="text-[10px] text-slate-600">Date: {activeReceipt.timestamp}</p>
              </div>

              <p className="font-bold text-xs pt-1">Patient: {activeReceipt.patientName}</p>

              <div className="border-t border-b border-slate-200 py-2 space-y-1">
                {activeReceipt.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-[11px]">
                    <span>{item.name} x{item.quantity}</span>
                    <span>${((item.copay !== undefined ? item.copay : item.unitPrice) * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-0.5 pt-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>${activeReceipt.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax:</span>
                  <span>${activeReceipt.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm border-t border-slate-300 pt-1">
                  <span>TOTAL PAID:</span>
                  <span>${activeReceipt.total.toFixed(2)}</span>
                </div>
                <p className="text-[10px] text-slate-600">Method: {activeReceipt.paymentMethod}</p>
              </div>

              <div className="text-center text-[10px] text-slate-500 border-t border-slate-200 pt-2 italic">
                Thank you for visiting PharmaPulse Central Pharmacy!
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-200 font-semibold text-xs hover:bg-slate-700 transition flex items-center justify-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Paper Receipt</span>
              </button>
              <button
                onClick={() => setActiveReceipt(null)}
                className="flex-1 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition"
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
