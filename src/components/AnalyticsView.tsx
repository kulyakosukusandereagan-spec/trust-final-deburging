import React from 'react';
import { 
  BarChart3, 
  DollarSign, 
  TrendingUp, 
  CreditCard, 
  Calendar, 
  ArrowUpRight, 
  ShieldCheck, 
  ShoppingBag,
  FileSpreadsheet
} from 'lucide-react';
import { SaleRecord } from '../types/pharmacy';

interface AnalyticsViewProps {
  sales: SaleRecord[];
  exchangeRate: number;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ sales, exchangeRate }) => {
  const totalUSD = sales.reduce((sum, s) => sum + s.totalUSD, 0);
  const totalSSP = sales.reduce((sum, s) => sum + s.totalSSP, 0);
  const totalTransactions = sales.length;
  const avgBasketUSD = totalTransactions > 0 ? totalUSD / totalTransactions : 0;

  // Breakdown by payment method
  const paymentBreakdown = sales.reduce((acc, s) => {
    acc[s.paymentMethod] = (acc[s.paymentMethod] || 0) + s.totalUSD;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="p-4 lg:p-6 space-y-6 bg-slate-950 text-slate-100 min-h-[calc(100vh-4rem)]">
      
      {/* Top Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-medium">Total Gross Revenue (USD)</span>
            <div className="text-2xl font-black text-amber-400 mt-1">${totalUSD.toFixed(2)} USD</div>
            <div className="text-[10px] text-emerald-400 flex items-center mt-0.5">
              <ArrowUpRight className="w-3 h-3 mr-0.5" />
              <span>+14.2% vs previous week</span>
            </div>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-medium">South Sudanese Pound Total</span>
            <div className="text-xl font-black text-emerald-400 mt-1">{totalSSP.toLocaleString()} SSP</div>
            <div className="text-[10px] text-slate-500 font-mono">Rate: 1 USD = {exchangeRate} SSP</div>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-medium">Dispensed Sales Count</span>
            <div className="text-2xl font-black text-slate-100 mt-1">{totalTransactions} Receipts</div>
            <div className="text-[10px] text-slate-400">Avg Basket: ${avgBasketUSD.toFixed(2)}</div>
          </div>
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
            <ShoppingBag className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-medium">m-GURUSH Mobile Volume</span>
            <div className="text-2xl font-black text-purple-400 mt-1">
              ${(paymentBreakdown['mgurush'] || 0).toFixed(2)} USD
            </div>
            <div className="text-[10px] text-purple-300">{( (paymentBreakdown['mgurush'] || 0) * exchangeRate ).toLocaleString()} SSP</div>
          </div>
          <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Payment Channel Breakdown & Revenue Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Payment Channel Distribution (5 Cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
          <h3 className="font-bold text-sm text-slate-100 flex items-center space-x-2">
            <CreditCard className="w-4 h-4 text-emerald-400" />
            <span>Revenue Split by Payment Method</span>
          </h3>

          <div className="space-y-3 pt-2">
            {[
              { id: 'cash_ssp', label: 'Cash (SSP)', color: 'bg-emerald-500', val: paymentBreakdown['cash_ssp'] || 0 },
              { id: 'cash_usd', label: 'Cash (USD $)', color: 'bg-amber-500', val: paymentBreakdown['cash_usd'] || 0 },
              { id: 'mgurush', label: 'm-GURUSH Mobile Money', color: 'bg-purple-500', val: paymentBreakdown['mgurush'] || 0 },
              { id: 'bank_transfer', label: 'Bank Transfer / Cheque', color: 'bg-blue-500', val: paymentBreakdown['bank_transfer'] || 0 }
            ].map(channel => {
              const pct = totalUSD > 0 ? (channel.val / totalUSD) * 100 : 0;
              return (
                <div key={channel.id} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-300">{channel.label}</span>
                    <span className="font-mono text-slate-100">${channel.val.toFixed(2)} ({pct.toFixed(1)}%)</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full ${channel.color}`} style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Recent Transactions Table (7 Cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-100 flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              <span>Recent Sales Audit Log</span>
            </h3>
            <span className="text-xs text-slate-400">Showing last {sales.length} transactions</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-850 text-slate-400 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-2.5">Receipt #</th>
                  <th className="p-2.5">Customer / Rx</th>
                  <th className="p-2.5">Payment</th>
                  <th className="p-2.5 text-right">Total USD</th>
                  <th className="p-2.5 text-right">Total SSP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {sales.map(s => (
                  <tr key={s.id} className="hover:bg-slate-850/60">
                    <td className="p-2.5 font-mono text-emerald-400 font-bold">{s.receiptNo}</td>
                    <td className="p-2.5">
                      <div className="font-semibold text-slate-200">{s.customerName}</div>
                      <div className="text-[10px] text-slate-500">{s.timestamp}</div>
                    </td>
                    <td className="p-2.5 font-semibold uppercase text-[10px]">
                      <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                        {s.paymentMethod.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold text-amber-400">${s.totalUSD.toFixed(2)}</td>
                    <td className="p-2.5 text-right font-mono text-slate-300">{s.totalSSP.toLocaleString()} SSP</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
};
