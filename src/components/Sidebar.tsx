import React from 'react';
import { 
  ShoppingCart, 
  FileText, 
  PackageCheck, 
  Stethoscope, 
  Users, 
  BarChart3, 
  Truck, 
  Settings, 
  AlertTriangle,
  Clock
} from 'lucide-react';

export type NavTab = 
  | 'pos'
  | 'prescriptions'
  | 'inventory'
  | 'patients'
  | 'analytics'
  | 'suppliers'
  | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  pendingRxCount: number;
  lowStockCount: number;
  expiringCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  pendingRxCount,
  lowStockCount,
  expiringCount
}) => {
  const navItems = [
    {
      id: 'pos' as NavTab,
      label: 'Point of Sale (POS)',
      sub: 'Dispense & Checkout',
      icon: ShoppingCart,
      badge: null
    },
    {
      id: 'prescriptions' as NavTab,
      label: 'Prescriptions',
      sub: 'Queue & Verification',
      icon: FileText,
      badge: pendingRxCount > 0 ? { count: pendingRxCount, color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' } : null
    },
    {
      id: 'inventory' as NavTab,
      label: 'Inventory & Stock',
      sub: 'FEFO Batches & Expiry',
      icon: PackageCheck,
      badge: (lowStockCount > 0 || expiringCount > 0) ? { 
        count: lowStockCount + expiringCount, 
        color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' 
      } : null
    },
    {
      id: 'patients' as NavTab,
      label: 'Patients Directory',
      sub: 'Medical Profiles & History',
      icon: Users,
      badge: null
    },
    {
      id: 'analytics' as NavTab,
      label: 'Sales & Financials',
      sub: 'USD / SSP Revenue Reports',
      icon: BarChart3,
      badge: null
    },
    {
      id: 'suppliers' as NavTab,
      label: 'Suppliers & POs',
      sub: 'Orders & Restocking',
      icon: Truck,
      badge: null
    },
    {
      id: 'settings' as NavTab,
      label: 'Pharmacy Settings',
      sub: 'Exchange Rate & Store Config',
      icon: Settings,
      badge: null
    }
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="p-3 space-y-1">
        <div className="px-3 py-2 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
          Pharmacy Operations
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all group ${
                isActive
                  ? 'bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/30 shadow-sm'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
              id={`nav-item-${item.id}`}
            >
              <div className="flex items-center space-x-3">
                <div className={`p-1.5 rounded-lg ${isActive ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400 group-hover:text-slate-200'}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold leading-tight">{item.label}</div>
                  <div className="text-[10px] text-slate-500 leading-tight font-normal">{item.sub}</div>
                </div>
              </div>

              {item.badge && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${item.badge.color}`}>
                  {item.badge.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Stock Quick Safety Alerts Footer */}
      <div className="p-3 m-3 bg-slate-800/60 border border-slate-700/60 rounded-xl space-y-2">
        <div className="text-[11px] font-bold text-slate-300 flex items-center space-x-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          <span>Active Stock Safety Status</span>
        </div>

        <div className="space-y-1 text-[11px]">
          <div className="flex items-center justify-between text-slate-400">
            <span className="flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block"></span>
              <span>Low Stock SKUs</span>
            </span>
            <span className="font-mono font-bold text-rose-400">{lowStockCount} items</span>
          </div>

          <div className="flex items-center justify-between text-slate-400">
            <span className="flex items-center space-x-1">
              <Clock className="w-3 h-3 text-amber-400" />
              <span>FEFO Expiry Alert</span>
            </span>
            <span className="font-mono font-bold text-amber-400">{expiringCount} batches</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
