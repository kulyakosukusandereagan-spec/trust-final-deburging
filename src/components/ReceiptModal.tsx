import React from 'react';
import { Printer, Copy, Check, X, Usb } from 'lucide-react';
import { SaleRecord } from '../types/pharmacy';
import { printThermalReceipt } from '../utils/printReceipt';
import { getUsbPrinterStatus, requestPairUsbPrinter } from '../utils/webUsbEscPos';

interface ReceiptModalProps {
  sale: SaleRecord | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ sale, onClose }) => {
  const [copied, setCopied] = React.useState(false);
  const [usbStatus, setUsbStatus] = React.useState(getUsbPrinterStatus());
  const [pairMessage, setPairMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    setUsbStatus(getUsbPrinterStatus());
  }, []);

  if (!sale) return null;

  const handlePairUsb = async () => {
    const res = await requestPairUsbPrinter();
    setPairMessage(res.message);
    setUsbStatus(getUsbPrinterStatus());
    setTimeout(() => setPairMessage(null), 5000);
  };

  const handlePrint = () => {
    printThermalReceipt({
      branchName: sale.branchName,
      receiptNo: sale.receiptNo,
      timestamp: sale.timestamp,
      customerName: sale.customerName,
      prescribingDoctor: sale.prescribingDoctor,
      cashierName: sale.cashierName,
      items: sale.items || [],
      subtotal: sale.totalUSD,
      totalUSD: sale.totalUSD,
      totalSSP: sale.totalSSP,
      exchangeRateUsed: sale.exchangeRateUsed,
      paymentMethod: sale.paymentMethod
    });
  };

  const handleCopyText = () => {
    const text = `
=== TRUST PHARMACY ===
Branch: ${sale.branchName || 'Main Branch'}
Receipt #: ${sale.receiptNo}
Date: ${sale.timestamp}
Customer: ${sale.customerName}
----------------------------
${sale.items.map(i => `${i.brandName} x${i.quantity} = $${i.subtotalUSD.toFixed(2)} (${i.subtotalSSP.toLocaleString()} SSP)`).join('\n')}
----------------------------
Total USD: $${sale.totalUSD.toFixed(2)}
Total SSP: ${sale.totalSSP.toLocaleString()} SSP
Exchange Rate: 1 USD = ${sale.exchangeRateUsed} SSP
Payment: ${sale.paymentMethod.toUpperCase()}
Cashier: ${sale.cashierName}
Thank you for trusting Trust Pharmacy!
    `.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white text-slate-900 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200">
        
        {/* Header Actions */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm">Official Sales Receipt</h3>
            <p className="text-xs text-emerald-400 font-mono">{sale.receiptNo}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Thermal Receipt Paper Body */}
        <div className="p-6 bg-amber-50/40 font-mono text-xs space-y-4 max-h-[70vh] overflow-y-auto" id="printable-receipt">
          
          <div className="text-center space-y-2 pb-3 border-b border-dashed border-slate-300">
            {localStorage.getItem('trust_pharmacy_logo') ? (
              <img 
                src={localStorage.getItem('trust_pharmacy_logo')!} 
                alt="Trust Pharmacy Logo" 
                className="h-14 w-auto mx-auto mb-1 object-contain max-w-[180px]" 
              />
            ) : null}
            <h2 className="font-extrabold text-base tracking-tight text-slate-900 font-sans uppercase">
              {(() => {
                const saved = localStorage.getItem('trust_pharmacy_contact');
                if (saved) {
                  try { return JSON.parse(saved).name || "TRUST PHARMACY"; } catch (e) {}
                }
                return "TRUST PHARMACY";
              })()}
            </h2>
            <p className="text-[11px] font-bold text-slate-700 uppercase">{sale.branchName || 'Main Branch'}</p>
            <p className="text-[10px] text-slate-500">
              License: {(() => {
                const saved = localStorage.getItem('trust_pharmacy_contact');
                if (saved) {
                  try { return JSON.parse(saved).license || "SS-MOH-TRUST-2026"; } catch (e) {}
                }
                return "SS-MOH-TRUST-2026";
              })()}
            </p>
            <p className="text-[10px] text-slate-500">
              Tel: {(() => {
                const saved = localStorage.getItem('trust_pharmacy_contact');
                if (saved) {
                  try { return JSON.parse(saved).phone || "+211 922 152 427"; } catch (e) {}
                }
                return "+211 922 152 427";
              })()} • {(() => {
                const saved = localStorage.getItem('trust_pharmacy_contact');
                if (saved) {
                  try { return JSON.parse(saved).address || "Airport Road, Juba, South Sudan"; } catch (e) {}
                }
                return "Airport Road, Juba, South Sudan";
              })()}
            </p>
          </div>

          <div className="space-y-1 text-[11px] text-slate-700">
            <div className="flex justify-between">
              <span className="text-slate-500">Receipt No:</span>
              <span className="font-bold text-slate-900">{sale.receiptNo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Date/Time:</span>
              <span>{sale.timestamp}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Customer:</span>
              <span className="font-semibold text-slate-800">{sale.customerName}</span>
            </div>
            {sale.prescribingDoctor && (
              <div className="flex justify-between">
                <span className="text-slate-500">Doctor / Rx:</span>
                <span>{sale.prescribingDoctor}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">Dispensed By:</span>
              <span>{sale.cashierName}</span>
            </div>
          </div>

          <div className="border-t border-b border-dashed border-slate-300 py-2 space-y-2">
            <div className="grid grid-cols-12 font-bold text-slate-800 text-[10px] uppercase border-b border-slate-200 pb-1">
              <span className="col-span-6">Item / Batch</span>
              <span className="col-span-2 text-center">Qty</span>
              <span className="col-span-4 text-right">Price (USD / SSP)</span>
            </div>

            {sale.items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 text-[11px] py-1">
                <div className="col-span-6">
                  <div className="font-bold text-slate-900">{item.brandName}</div>
                  <div className="text-[9px] text-slate-500">{item.genericName} • Batch: {item.batchNo}</div>
                </div>
                <div className="col-span-2 text-center font-bold text-slate-800">
                  x{item.quantity}
                </div>
                <div className="col-span-4 text-right">
                  <div className="font-bold text-slate-900">${item.subtotalUSD.toFixed(2)}</div>
                  <div className="text-[9px] text-slate-500">{item.subtotalSSP.toLocaleString()} SSP</div>
                </div>
              </div>
            ))}
          </div>

          {/* Receipt Totals Section */}
          <div className="space-y-1 text-xs pt-1">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span>${sale.totalUSD.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Exchange Rate Applied:</span>
              <span>1 USD = {sale.exchangeRateUsed} SSP</span>
            </div>

            <div className="flex justify-between text-base font-extrabold text-slate-900 border-t border-slate-800 pt-2">
              <span>TOTAL (USD):</span>
              <span>${sale.totalUSD.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-sm font-bold text-emerald-700 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
              <span>TOTAL (SSP):</span>
              <span>{sale.totalSSP.toLocaleString()} SSP</span>
            </div>

            <div className="flex justify-between text-[11px] text-slate-600 pt-2">
              <span>Payment Method:</span>
              <span className="font-bold uppercase text-slate-800">{sale.paymentMethod.replace('_', ' ')}</span>
            </div>
          </div>

          {/* Thermal Footer */}
          <div className="text-center text-[10px] text-slate-900 pt-4 border-t border-dashed border-slate-400 space-y-1">
            <p className="font-extrabold text-slate-900">PRESCRIBED MEDICATIONS ARE NOT RETURNABLE</p>
            <p className="font-bold text-slate-800">Always inspect seal and dosage instructions before leaving counter.</p>
            <p className="italic text-emerald-800 font-bold">"Quality Medicines for South Sudan Health"</p>

            <div className="pt-2 mt-2 border-t border-dashed border-slate-400 font-black text-slate-900 text-[10px]">
              <p>Managed by Junub POS Center, Juba South Sudan</p>
              <p className="text-slate-800">junubposcenter@gmail.com</p>
            </div>
          </div>

        </div>

        {/* Modal Bottom Buttons */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 space-y-2">
          {pairMessage && (
            <div className="text-[10px] p-2 rounded-lg bg-sky-50 text-sky-800 border border-sky-200 font-medium">
              {pairMessage}
            </div>
          )}

          <div className="flex items-center justify-between">
            <button
              onClick={handleCopyText}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50 cursor-pointer"
              id="receipt-copy-button"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied Text' : 'Copy Text'}</span>
            </button>

            <div className="flex items-center space-x-2">
              {usbStatus.isSupported && (
                <button
                  onClick={handlePairUsb}
                  title="Connect USB Thermal Printer for Zero-Dialog Direct Printing"
                  className={`flex items-center space-x-1 px-2.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    usbStatus.isConnected 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                      : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                  }`}
                >
                  <Usb className="w-3.5 h-3.5" />
                  <span>{usbStatus.isConnected ? 'USB Printer Ready' : 'Pair USB Printer'}</span>
                </button>
              )}

              <button
                onClick={handlePrint}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 shadow-md cursor-pointer"
                id="receipt-print-button"
              >
                <Printer className="w-4 h-4 text-emerald-400" />
                <span>Print Receipt</span>
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
