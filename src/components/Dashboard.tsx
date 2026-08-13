import React from 'react';
import { 
  FileText, 
  AlertCircle, 
  DollarSign, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  ArrowRight,
  ShieldCheck,
  Zap,
  ShoppingBag
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, Cell } from 'recharts';
import { Medication, Prescription, POSTransaction } from '../types';

interface DashboardProps {
  medications: Medication[];
  prescriptions: Prescription[];
  transactions: POSTransaction[];
  setActiveTab: (tab: string) => void;
  onQuickDispense: (rx: Prescription) => void;
  onQuickReorder: (med: Medication) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  medications,
  prescriptions,
  transactions,
  setActiveTab,
  onQuickDispense,
  onQuickReorder,
}) => {
  // Metrics calculations
  const pendingRx = prescriptions.filter(p => p.status === 'Pending Verification');
  const readyRx = prescriptions.filter(p => p.status === 'Ready for Pickup');
  const lowStockMeds = medications.filter(m => m.stockQuantity <= m.minStockLevel);
  
  const todayRevenue = transactions.reduce((acc, t) => acc + t.total, 0);
  const totalStockValue = medications.reduce((acc, m) => acc + (m.stockQuantity * m.costPrice), 0);

  // Mock chart data for weekly dispensing volume
  const dispensingData = [
    { day: 'Mon', count: 42, revenue: 1420 },
    { day: 'Tue', count: 58, revenue: 1980 },
    { day: 'Wed', count: 64, revenue: 2150 },
    { day: 'Thu', count: 71, revenue: 2600 },
    { day: 'Fri', count: 85, revenue: 3100 },
    { day: 'Sat', count: 49, revenue: 1750 },
    { day: 'Sun', count: 32, revenue: 1100 },
  ];

  const categoryBreakdown = [
    { name: 'Cardio', count: 35, color: '#10b981' },
    { name: 'Antibiotics', count: 28, color: '#06b6d4' },
    { name: 'Endocrine', count: 22, color: '#3b82f6' },
    { name: 'Analgesics', count: 18, color: '#f59e0b' },
    { name: 'Resp/Gastro', count: 14, color: '#8b5cf6' },
  ];

  return (
    <div className="space-y-6">
      
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 p-6 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                System Status: Operational
              </span>
              <span className="text-xs text-slate-400">DEA Verified License #PH-992014</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Pharmacy Operations Console
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Real-time monitoring for prescription filling, drug safety checks, inventory thresholds, and clinical AI assist.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('ai_copilot')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 font-semibold text-sm hover:from-teal-400 hover:to-emerald-400 shadow-lg shadow-teal-500/20 transition transform active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span>Launch AI Copilot</span>
            </button>
            <button
              onClick={() => setActiveTab('prescriptions')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-medium text-sm hover:bg-slate-700 transition"
            >
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>Prescription Queue ({pendingRx.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Pending Verification</span>
            <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">{pendingRx.length}</span>
            <span className="text-xs text-slate-400">Rx waiting</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
            <span>Avg process time: 4.2 min</span>
            <button onClick={() => setActiveTab('prescriptions')} className="text-emerald-400 font-medium hover:underline">
              View Queue
            </button>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Low Stock Warnings</span>
            <div className="p-2.5 bg-red-500/10 text-red-400 rounded-xl border border-red-500/20">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">{lowStockMeds.length}</span>
            <span className="text-xs text-red-400 font-medium">Action Required</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
            <span>Total Valuation: ${(totalStockValue).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            <button onClick={() => setActiveTab('inventory')} className="text-emerald-400 font-medium hover:underline">
              Restock
            </button>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Today's Revenue</span>
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">${todayRevenue.toFixed(2)}</span>
            <span className="text-xs text-emerald-400 flex items-center font-medium">
              <TrendingUp className="w-3 h-3 mr-0.5" /> +12.4%
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
            <span>{transactions.length} POS transactions</span>
            <button onClick={() => setActiveTab('pos')} className="text-emerald-400 font-medium hover:underline">
              Open POS
            </button>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Ready For Pickup</span>
            <div className="p-2.5 bg-teal-500/10 text-teal-400 rounded-xl border border-teal-500/20">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">{readyRx.length}</span>
            <span className="text-xs text-teal-400 font-medium">Vials Labeled</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
            <span>SMS Notifications sent</span>
            <button onClick={() => setActiveTab('prescriptions')} className="text-emerald-400 font-medium hover:underline">
              Dispense
            </button>
          </div>
        </div>

      </div>

      {/* Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Dispensing Trend Chart */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-white">Prescription Dispensing Volume</h2>
              <p className="text-xs text-slate-400">Daily count of verified and filled prescriptions this week</p>
            </div>
            <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
              7 Days
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dispensingData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" stroke="#64748b" fontSize={12} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }} 
                  itemStyle={{ color: '#34d399' }}
                />
                <Area type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <h2 className="text-base font-semibold text-white mb-1">Top Dispensed Categories</h2>
          <p className="text-xs text-slate-400 mb-4">Breakdown by pharmacological class</p>

          <div className="h-44 w-full mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryBreakdown} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} width={80} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }} 
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {categoryBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Cardiovascular Drugs
              </span>
              <span className="font-semibold text-white">35%</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
                Antibiotics / Anti-infectives
              </span>
              <span className="font-semibold text-white">28%</span>
            </div>
          </div>
        </div>

      </div>

      {/* Operational Queues Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Pending Verification Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
                <Clock className="w-4 h-4" />
              </div>
              <h2 className="text-base font-semibold text-white">Pending Verification Queue</h2>
            </div>
            <button 
              onClick={() => setActiveTab('prescriptions')}
              className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {pendingRx.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl text-slate-500 text-sm">
              All prescriptions in queue have been processed!
            </div>
          ) : (
            <div className="space-y-3">
              {pendingRx.map((rx) => (
                <div key={rx.id} className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-emerald-400">{rx.rxNumber}</span>
                      <span className="text-xs text-white font-medium">{rx.patientName}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">{rx.datePrescribed}</span>
                    </div>
                    <p className="text-xs text-slate-300 font-medium">
                      {rx.items.map(i => `${i.medicationName} ${i.strength}`).join(', ')}
                    </p>
                    <p className="text-[11px] text-slate-400">Dr: {rx.doctorName} • {rx.clinicName}</p>
                  </div>

                  <button
                    onClick={() => onQuickDispense(rx)}
                    className="px-3 py-1.5 bg-emerald-500 text-slate-950 rounded-lg font-semibold text-xs hover:bg-emerald-400 transition whitespace-nowrap shadow-sm"
                  >
                    Process & Dispense
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low Stock & Expiry Alerts Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-red-500/10 text-red-400 rounded-lg">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <h2 className="text-base font-semibold text-white">Low Stock Replenishment Alerts</h2>
            </div>
            <button 
              onClick={() => setActiveTab('inventory')}
              className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium"
            >
              <span>Manage Inventory</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {lowStockMeds.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl text-slate-500 text-sm">
              All inventory stock levels are above threshold.
            </div>
          ) : (
            <div className="space-y-3">
              {lowStockMeds.map((med) => (
                <div key={med.id} className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{med.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-semibold border border-red-500/30">
                        {med.stockQuantity} Left (Min: {med.minStockLevel})
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      NDC: {med.ndc} • Rack: {med.locationRack} • Mfr: {med.manufacturer}
                    </p>
                  </div>

                  <button
                    onClick={() => onQuickReorder(med)}
                    className="px-3 py-1.5 bg-slate-800 text-teal-300 border border-teal-500/30 rounded-lg font-medium text-xs hover:bg-slate-700 transition whitespace-nowrap"
                  >
                    Quick PO
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
