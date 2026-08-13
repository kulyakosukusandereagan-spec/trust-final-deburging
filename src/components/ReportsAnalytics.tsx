import React from 'react';
import { DrugItem, Prescription, SaleTransaction, ControlledLogEntry } from '../types';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Package, 
  FileCheck2, 
  ShieldCheck,
  PieChart as PieIcon,
  ShieldAlert
} from 'lucide-react';

interface ReportsAnalyticsProps {
  drugs: DrugItem[];
  prescriptions: Prescription[];
  sales: SaleTransaction[];
  controlledLogs: ControlledLogEntry[];
}

export const ReportsAnalytics: React.FC<ReportsAnalyticsProps> = ({
  drugs,
  prescriptions,
  sales,
  controlledLogs,
}) => {
  const totalSalesVolume = sales.reduce((acc, curr) => acc + curr.patientPaidTotal + curr.insurancePaidTotal, 0);
  const patientPaidTotal = sales.reduce((acc, curr) => acc + curr.patientPaidTotal, 0);
  const insuranceClaimedTotal = sales.reduce((acc, curr) => acc + curr.insurancePaidTotal, 0);

  const controlledCount = drugs.filter(d => d.isControlled).length;
  const lowStockCount = drugs.filter(d => d.stockQuantity <= d.reorderLevel).length;

  // Category counts
  const categoryCounts: Record<string, number> = {};
  drugs.forEach(d => {
    categoryCounts[d.category] = (categoryCounts[d.category] || 0) + 1;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 p-5 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-400" /> Executive Analytics & Compliance Audits
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Financial revenue breakdown, insurance claim ratios, inventory valuation, and DEA regulatory log summaries.
          </p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-md">
          <span className="text-xs text-slate-400 font-semibold block">Gross Pharmacy Revenue</span>
          <div className="text-2xl font-bold text-slate-100 mt-2">${totalSalesVolume.toFixed(2)}</div>
          <div className="text-[10px] text-emerald-400 mt-1 font-mono">
            Direct Copays: ${patientPaidTotal.toFixed(2)} | Claims: ${insuranceClaimedTotal.toFixed(2)}
          </div>
        </div>

        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-md">
          <span className="text-xs text-slate-400 font-semibold block">Total Dispensed Prescriptions</span>
          <div className="text-2xl font-bold text-slate-100 mt-2">{prescriptions.length} Prescriptions</div>
          <div className="text-[10px] text-teal-400 mt-1">
            {prescriptions.filter(p => p.status === 'Dispensed').length} Filled & Rung Up
          </div>
        </div>

        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-md">
          <span className="text-xs text-slate-400 font-semibold block">Catalogue Drug SKU Count</span>
          <div className="text-2xl font-bold text-slate-100 mt-2">{drugs.length} Active SKUs</div>
          <div className="text-[10px] text-rose-400 mt-1">
            {lowStockCount} Items Below Reorder Point
          </div>
        </div>

        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-md">
          <span className="text-xs text-slate-400 font-semibold block">DEA Controlled Items</span>
          <div className="text-2xl font-bold text-slate-100 mt-2">{controlledCount} Controlled Drugs</div>
          <div className="text-[10px] text-amber-400 mt-1">
            {controlledLogs.length} Audit Ledger Events Logged
          </div>
        </div>
      </div>

      {/* Visual Charts & Category Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <PieIcon className="w-4 h-4 text-emerald-400" /> Inventory by Therapeutic Category
          </h3>

          <div className="space-y-3">
            {Object.entries(categoryCounts).map(([cat, count]) => {
              const percent = Math.round((count / drugs.length) * 100);
              return (
                <div key={cat} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-200">{cat}</span>
                    <span className="text-emerald-400 font-mono">{count} SKUs ({percent}%)</span>
                  </div>
                  <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* DEA Compliance Audit Summary */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400" /> DEA Controlled Substance Log Summary
          </h3>

          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {controlledLogs.map((log) => (
              <div key={log.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1 font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>{log.timestamp}</span>
                  <span className="text-amber-400 font-bold">{log.schedule}</span>
                </div>
                <div className="text-slate-100 font-bold font-sans">{log.drugName}</div>
                <div className="text-slate-300 font-sans">
                  Patient: {log.patientName} | Prescriber NPI: {log.prescriberNpi}
                </div>
                <div className="text-emerald-400 font-semibold pt-0.5">
                  Dispensed -{log.quantityDispensed} units (Stock: {log.startingStock} → {log.remainingStock})
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
