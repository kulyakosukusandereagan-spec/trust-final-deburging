import React, { useState } from 'react';
import { 
  Search, 
  Barcode, 
  Plus, 
  Minus, 
  Trash2, 
  ShoppingCart, 
  User, 
  AlertTriangle, 
  CheckCircle2, 
  DollarSign, 
  Calendar, 
  ShieldAlert, 
  Clock, 
  Sparkles,
  FileCheck2,
  Phone
} from 'lucide-react';
import { DrugItem, CartItem, Patient, DrugCategory, PaymentMethod, SaleRecord } from '../types/pharmacy';

interface POSViewProps {
  drugs: DrugItem[];
  patients: Patient[];
  cart: CartItem[];
  onAddToCart: (drug: DrugItem, batchNo?: string) => void;
  onUpdateCartQty: (drugId: string, batchNo: string, delta: number) => void;
  onRemoveFromCart: (drugId: string, batchNo: string) => void;
  onClearCart: () => void;
  selectedPatient: Patient | null;
  onSelectPatient: (patient: Patient | null) => void;
  exchangeRate: number;
  onCompleteCheckout: (sale: SaleRecord) => void;
  activeBranchName: string;
  activeCashierName: string;
}

export const POSView: React.FC<POSViewProps> = ({
  drugs,
  patients,
  cart,
  onAddToCart,
  onUpdateCartQty,
  onRemoveFromCart,
  onClearCart,
  selectedPatient,
  onSelectPatient,
  exchangeRate,
  onCompleteCheckout,
  activeBranchName,
  activeCashierName
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash_ssp');
  const [doctorName, setDoctorName] = useState('Dr. Walk-In / Self Care');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);

  const categories = [
    'All',
    'Antimalarials',
    'Antibiotics',
    'Analgesics & Antipyretics',
    'Diabetes & Endocrine',
    'Respiratory',
    'Gastrointestinal',
    'Cardiovascular',
    'Pediatric Care',
    'Injections & IV Fluids'
  ];

  // Filter drugs based on query & category
  const filteredDrugs = drugs.filter(drug => {
    const matchesSearch = 
      drug.brandName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      drug.genericName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      drug.barcode.includes(searchQuery);

    const matchesCategory = selectedCategory === 'All' || drug.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Calculate cart totals
  const subtotalUSD = cart.reduce((sum, item) => sum + (item.drug.priceUSD * item.quantity), 0);
  const totalUSD = subtotalUSD * (1 - discountPercent / 100);
  const totalSSP = totalUSD * exchangeRate;

  // Check patient allergy conflicts against drugs in cart
  const allergyAlerts = cart.reduce((alerts: string[], item) => {
    if (selectedPatient && selectedPatient.allergies.length > 0) {
      selectedPatient.allergies.forEach(allergy => {
        const alg = allergy.toLowerCase();
        const brand = item.drug.brandName.toLowerCase();
        const generic = item.drug.genericName.toLowerCase();

        if (brand.includes(alg) || generic.includes(alg)) {
          alerts.push(`WARNING: Patient ${selectedPatient.name} is allergic to ${allergy}, contained in ${item.drug.brandName}!`);
        }
      });
    }
    return alerts;
  }, []);

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput) return;
    const match = drugs.find(d => d.barcode === barcodeInput || d.id === barcodeInput);
    if (match) {
      onAddToCart(match);
      setBarcodeInput('');
      setShowBarcodeModal(false);
    } else {
      alert(`No drug found with barcode "${barcodeInput}"`);
    }
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;

    const sale: SaleRecord = {
      id: `sale-${Date.now()}`,
      receiptNo: `JPC-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
      timestamp: new Date().toLocaleString(),
      customerName: selectedPatient ? selectedPatient.name : 'Walk-In Customer',
      patientId: selectedPatient?.id,
      items: cart.map(item => ({
        drugId: item.drug.id,
        brandName: item.drug.brandName,
        genericName: item.drug.genericName,
        batchNo: item.selectedBatchNo,
        unitPriceUSD: item.drug.priceUSD,
        unitPriceSSP: item.drug.priceUSD * exchangeRate,
        quantity: item.quantity,
        subtotalUSD: item.drug.priceUSD * item.quantity,
        subtotalSSP: item.drug.priceUSD * item.quantity * exchangeRate
      })),
      totalUSD,
      totalSSP,
      exchangeRateUsed: exchangeRate,
      paymentMethod,
      cashierName: activeCashierName,
      branchName: activeBranchName,
      prescribingDoctor: doctorName
    };

    onCompleteCheckout(sale);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full p-4 lg:p-6 bg-slate-950 text-slate-100 min-h-[calc(100vh-4rem)]">
      
      {/* Left Catalog Section (7 Cols) */}
      <div className="lg:col-span-7 space-y-4 flex flex-col justify-between">
        <div className="space-y-4">
          
          {/* Top Bar: Search & Quick Barcode */}
          <div className="flex items-center space-x-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search drug by brand name, generic (e.g. Artemether, Paracetamol)..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                id="pos-search-input"
              />
            </div>

            <button
              onClick={() => setShowBarcodeModal(true)}
              className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-emerald-400 transition-colors"
              title="Barcode Scanner Simulation"
              id="barcode-scan-button"
            >
              <Barcode className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Scan Barcode</span>
            </button>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-thin">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                    : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Drug Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[calc(100vh-18rem)] overflow-y-auto pr-1">
            {filteredDrugs.map((drug) => {
              const earliestBatch = drug.batches[0];
              const isLowStock = drug.totalStock <= drug.reorderLevel;

              return (
                <div
                  key={drug.id}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-3.5 flex flex-col justify-between transition-all hover:shadow-lg group"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase">
                          {drug.category}
                        </span>
                        <h4 className="font-bold text-sm text-slate-100 group-hover:text-emerald-300 transition-colors mt-1">
                          {drug.brandName}
                        </h4>
                        <p className="text-xs text-slate-400 italic">
                          {drug.genericName} • {drug.strength}
                        </p>
                      </div>

                      <div className="text-right font-mono">
                        <div className="text-sm font-black text-amber-400">${drug.priceUSD.toFixed(2)}</div>
                        <div className="text-[10px] text-slate-500">{(drug.priceUSD * exchangeRate).toLocaleString()} SSP</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800 text-slate-400">
                      <span className="flex items-center space-x-1">
                        <span className={`w-2 h-2 rounded-full ${isLowStock ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                        <span>Stock: <strong className={isLowStock ? 'text-rose-400 font-bold' : 'text-slate-200'}>{drug.totalStock} {drug.form}</strong></span>
                      </span>

                      {earliestBatch && (
                        <span className="flex items-center space-x-1 text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                          <Clock className="w-3 h-3 text-amber-400" />
                          <span>Exp: {earliestBatch.expiryDate}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => onAddToCart(drug)}
                    disabled={drug.totalStock <= 0}
                    className={`mt-3 w-full flex items-center justify-center space-x-2 py-2 rounded-lg text-xs font-bold transition-all ${
                      drug.totalStock > 0
                        ? 'bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-emerald-400 border border-slate-700 hover:border-emerald-400'
                        : 'bg-slate-850 text-slate-600 cursor-not-allowed border border-slate-800'
                    }`}
                    id={`add-to-cart-${drug.id}`}
                  >
                    <Plus className="w-4 h-4" />
                    <span>{drug.totalStock > 0 ? 'Add to Dispensing Cart' : 'Out of Stock'}</span>
                  </button>
                </div>
              );
            })}
          </div>

        </div>
      </div>

      {/* Right Cart & Checkout Section (5 Cols) */}
      <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-4 lg:p-5 flex flex-col justify-between shadow-xl">
        
        <div className="space-y-4">
          
          {/* Cart Header & Patient Attachment */}
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-100">Dispensing Queue</h3>
                <p className="text-[11px] text-slate-400">{cart.length} medications ready</p>
              </div>
            </div>

            {cart.length > 0 && (
              <button
                onClick={onClearCart}
                className="text-[11px] text-rose-400 hover:text-rose-300 hover:underline"
              >
                Clear All
              </button>
            )}
          </div>

          {/* Patient Selector */}
          <div className="bg-slate-850 border border-slate-800 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <span className="flex items-center space-x-1.5">
                <User className="w-4 h-4 text-emerald-400" />
                <span>Patient Assignment</span>
              </span>

              {selectedPatient && (
                <button
                  onClick={() => onSelectPatient(null)}
                  className="text-[10px] text-slate-400 hover:text-slate-200"
                >
                  Detach Patient
                </button>
              )}
            </div>

            <select
              value={selectedPatient?.id || ''}
              onChange={(e) => {
                const match = patients.find(p => p.id === e.target.value) || null;
                onSelectPatient(match);
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              id="patient-select-dropdown"
            >
              <option value="">Walk-In Customer (Unregistered)</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.patientCode}) - {p.allergies.length > 0 ? `⚠️ Allergies: ${p.allergies.join(', ')}` : 'No known allergies'}
                </option>
              ))}
            </select>

            {selectedPatient && (
              <div className="text-[11px] bg-slate-900 p-2 rounded-lg border border-slate-800 space-y-1">
                <div className="flex justify-between text-slate-300">
                  <span>Contact: {selectedPatient.phone}</span>
                  <span>Age: {selectedPatient.age} yrs</span>
                </div>
                {selectedPatient.allergies.length > 0 && (
                  <div className="text-rose-400 font-bold flex items-center space-x-1">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span>Allergies: {selectedPatient.allergies.join(', ')}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Prescribing Doctor Field */}
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-400 text-[11px]">Doctor / Prescriber:</span>
            <input
              type="text"
              value={doctorName}
              onChange={(e) => setDoctorName(e.target.value)}
              placeholder="e.g. Dr. Peter Lual (MD)"
              className="flex-1 bg-slate-850 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Allergy Conflict Banner */}
          {allergyAlerts.length > 0 && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-3 rounded-xl text-xs space-y-1 animate-pulse">
              <div className="font-bold flex items-center space-x-1.5 text-rose-400">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>SAFETY WARNING: ALLERGY CONFLICT</span>
              </div>
              {allergyAlerts.map((msg, i) => (
                <p key={i} className="text-[11px] leading-relaxed">{msg}</p>
              ))}
            </div>
          )}

          {/* Cart Items List */}
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {cart.length === 0 ? (
              <div className="py-8 text-center text-slate-500 space-y-2">
                <ShoppingCart className="w-8 h-8 mx-auto opacity-30 text-emerald-400" />
                <p className="text-xs">No medications in cart yet.</p>
                <p className="text-[10px]">Select items from the catalog to begin dispensing.</p>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={`${item.drug.id}-${item.selectedBatchNo}`}
                  className="bg-slate-850 border border-slate-800 p-2.5 rounded-xl flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <h5 className="font-bold text-slate-100">{item.drug.brandName}</h5>
                    <p className="text-[10px] text-slate-400">{item.drug.genericName} • Batch: {item.selectedBatchNo}</p>
                    <div className="font-mono text-emerald-400 font-semibold text-[11px]">
                      ${(item.drug.priceUSD * item.quantity).toFixed(2)} USD / {((item.drug.priceUSD * item.quantity) * exchangeRate).toLocaleString()} SSP
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
                      <button
                        onClick={() => onUpdateCartQty(item.drug.id, item.selectedBatchNo, -1)}
                        className="p-1 hover:bg-slate-800 rounded text-slate-300"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-mono font-bold w-6 text-center text-slate-100">{item.quantity}</span>
                      <button
                        onClick={() => onUpdateCartQty(item.drug.id, item.selectedBatchNo, 1)}
                        className="p-1 hover:bg-slate-800 rounded text-slate-300"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <button
                      onClick={() => onRemoveFromCart(item.drug.id, item.selectedBatchNo)}
                      className="text-slate-500 hover:text-rose-400 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>

        {/* Payment & Totals Footer */}
        <div className="pt-4 border-t border-slate-800 space-y-3">
          
          {/* Payment Method Toggle */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Select Payment Method
            </label>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <button
                onClick={() => setPaymentMethod('cash_ssp')}
                className={`p-2 rounded-lg font-semibold flex items-center justify-center space-x-1.5 transition-all ${
                  paymentMethod === 'cash_ssp'
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-md'
                    : 'bg-slate-850 text-slate-300 border border-slate-800 hover:bg-slate-800'
                }`}
              >
                <span>Cash (SSP)</span>
              </button>

              <button
                onClick={() => setPaymentMethod('cash_usd')}
                className={`p-2 rounded-lg font-semibold flex items-center justify-center space-x-1.5 transition-all ${
                  paymentMethod === 'cash_usd'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                    : 'bg-slate-850 text-slate-300 border border-slate-800 hover:bg-slate-800'
                }`}
              >
                <span>Cash (USD $)</span>
              </button>

              <button
                onClick={() => setPaymentMethod('mgurush')}
                className={`p-2 rounded-lg font-semibold flex items-center justify-center space-x-1.5 transition-all ${
                  paymentMethod === 'mgurush'
                    ? 'bg-purple-500 text-white font-bold shadow-md'
                    : 'bg-slate-850 text-slate-300 border border-slate-800 hover:bg-slate-800'
                }`}
              >
                <Phone className="w-3.5 h-3.5" />
                <span>m-GURUSH Mobile</span>
              </button>

              <button
                onClick={() => setPaymentMethod('bank_transfer')}
                className={`p-2 rounded-lg font-semibold flex items-center justify-center space-x-1.5 transition-all ${
                  paymentMethod === 'bank_transfer'
                    ? 'bg-blue-500 text-white font-bold shadow-md'
                    : 'bg-slate-850 text-slate-300 border border-slate-800 hover:bg-slate-800'
                }`}
              >
                <span>Bank Transfer</span>
              </button>
            </div>
          </div>

          {/* Grand Totals Display */}
          <div className="bg-slate-850 p-3 rounded-xl border border-slate-800 space-y-1.5">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Subtotal USD:</span>
              <span className="font-mono text-slate-200">${subtotalUSD.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between text-xs text-slate-400">
              <span>Exchange Rate:</span>
              <span className="font-mono text-slate-300">1 USD = {exchangeRate.toLocaleString()} SSP</span>
            </div>

            <div className="flex justify-between text-sm font-black text-slate-100 border-t border-slate-800 pt-1.5">
              <span>TOTAL (USD):</span>
              <span className="font-mono text-amber-400">${totalUSD.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-base font-extrabold text-emerald-400 bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
              <span>TOTAL (SSP):</span>
              <span className="font-mono">{totalSSP.toLocaleString()} SSP</span>
            </div>
          </div>

          {/* Checkout Button */}
          <button
            onClick={handleCheckout}
            disabled={cart.length === 0}
            className={`w-full py-3 rounded-xl font-black text-sm flex items-center justify-center space-x-2 shadow-lg transition-all ${
              cart.length > 0
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 active:scale-98'
                : 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700'
            }`}
            id="complete-checkout-button"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>Complete Sale & Print Receipt</span>
          </button>

        </div>

      </div>

      {/* Barcode Simulation Modal */}
      {showBarcodeModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-sm w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-100 flex items-center space-x-2">
                <Barcode className="w-5 h-5 text-emerald-400" />
                <span>Barcode Scanner Simulator</span>
              </h3>
              <button onClick={() => setShowBarcodeModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <p className="text-xs text-slate-400">
              Enter or paste medication barcode (e.g., <code className="text-emerald-300">890102030401</code> for Coartem, <code className="text-emerald-300">890102030403</code> for Panadol):
            </p>

            <form onSubmit={handleBarcodeSubmit} className="space-y-3">
              <input
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="Scan or type barcode..."
                className="w-full bg-slate-950 border border-emerald-500/50 text-emerald-300 px-3 py-2 rounded-xl font-mono text-sm focus:outline-none"
                autoFocus
              />

              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowBarcodeModal(false)}
                  className="px-3 py-2 rounded-xl bg-slate-800 text-xs text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs"
                >
                  Scan & Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
