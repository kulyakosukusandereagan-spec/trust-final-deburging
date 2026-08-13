import React from 'react';
import { 
  Pill, 
  LayoutDashboard, 
  FileText, 
  Package, 
  ShoppingCart, 
  Users, 
  Truck, 
  Sparkles, 
  ShieldAlert, 
  Bell, 
  Search,
  Activity,
  UserCheck
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pendingRxCount: number;
  lowStockCount: number;
  globalSearchQuery: string;
  setGlobalSearchQuery: (query: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  pendingRxCount,
  lowStockCount,
  globalSearchQuery,
  setGlobalSearchQuery,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'prescriptions', label: 'Prescriptions', icon: FileText, badge: pendingRxCount },
    { id: 'inventory', label: 'Inventory', icon: Package, badge: lowStockCount, badgeColor: 'bg-amber-500' },
    { id: 'pos', label: 'POS Checkout', icon: ShoppingCart },
    { id: 'patients', label: 'Patients', icon: Users },
    { id: 'suppliers', label: 'Suppliers', icon: Truck },
    { id: 'ai_copilot', label: 'AI Copilot', icon: Sparkles, highlight: true },
    { id: 'compliance', label: 'Controlled Log', icon: ShieldAlert },
  ];

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-md">
      {/* Top Header Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo & Pharmacy Name */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-emerald-500/20">
              <Pill className="w-6 h-6 transform -rotate-45" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                  PharmaPulse
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Rx Pro
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">Springfield Central Pharmacy #408</p>
            </div>
          </div>

          {/* Quick Search */}
          <div className="flex-1 max-w-md hidden md:block">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search medications, Rx #, patients or doctors..."
                value={globalSearchQuery}
                onChange={(e) => setGlobalSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-sm bg-slate-800/80 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              />
              {globalSearchQuery && (
                <button 
                  onClick={() => setGlobalSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* User & Status Bar */}
          <div className="flex items-center gap-3">
            {/* System Status Indicator */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-slate-800/60 rounded-lg border border-slate-700/60 text-xs text-slate-300">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>DEA Dispenser Active</span>
            </div>

            {/* Notification Bell */}
            <div className="relative cursor-pointer p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
              <Bell className="w-5 h-5" />
              {(pendingRxCount > 0 || lowStockCount > 0) && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-400"></span>
              )}
            </div>

            {/* Shift Pharmacist Avatar */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="w-8 h-8 rounded-full bg-teal-600/30 text-teal-300 border border-teal-500/40 flex items-center justify-center font-semibold text-xs">
                JM
              </div>
              <div className="hidden sm:block text-left text-xs">
                <p className="font-medium text-slate-200">Dr. James Miller</p>
                <p className="text-[11px] text-slate-400">Lead PharmD</p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="bg-slate-950/80 border-t border-slate-800/80 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center gap-1 overflow-x-auto py-1 scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-emerald-500 text-slate-950 font-semibold shadow-sm'
                    : item.highlight
                    ? 'text-teal-300 hover:bg-teal-950/60 hover:text-teal-200 border border-teal-500/30'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : item.highlight ? 'text-teal-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                    isActive
                      ? 'bg-slate-950 text-emerald-400'
                      : item.badgeColor || 'bg-emerald-500 text-slate-950'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
