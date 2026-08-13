import React, { useState } from 'react';
import { 
  Pill, 
  RefreshCw, 
  DollarSign, 
  MapPin, 
  UserCheck, 
  ShoppingCart, 
  Bot, 
  Building2, 
  ChevronDown,
  Sun,
  Moon,
  Coins
} from 'lucide-react';
import { PharmacyBranch } from '../types/pharmacy';

interface HeaderProps {
  branches?: PharmacyBranch[];
  selectedBranch?: PharmacyBranch;
  currentBranch?: PharmacyBranch;
  onSelectBranch?: (branch: PharmacyBranch) => void;
  exchangeRate: number;
  onUpdateExchangeRate?: (newRate: number) => void;
  cartCount?: number;
  onOpenCart?: () => void;
  onOpenAiAssistant?: () => void;
  activeRole?: string;
  currentRole?: string;
  onChangeRole?: (role: string) => void;
  pendingPrescriptionsCount?: number;
  systemCurrency?: 'SSP' | 'USD';
  onToggleCurrency?: () => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  branches = [],
  selectedBranch,
  currentBranch,
  onSelectBranch,
  exchangeRate,
  onUpdateExchangeRate,
  cartCount = 0,
  onOpenCart,
  onOpenAiAssistant,
  activeRole,
  currentRole,
  onChangeRole,
  systemCurrency = 'SSP',
  onToggleCurrency,
  theme = 'dark',
  onToggleTheme
}) => {
  const activeBranch = selectedBranch || currentBranch || branches[0] || { id: 'branch-dt-1', name: 'Royal Trust Pharmacy - Main Branch', code: 'JUB-01', city: 'Juba', address: 'Airport Road, Juba Town, South Sudan', phone: '+211 922 152 427', isMain: true };
  const role = activeRole || currentRole || 'Chief Pharmacist';

  const [isRateEditing, setIsRateEditing] = useState(false);
  const [tempRate, setTempRate] = useState(exchangeRate.toString());
  const [showBranchMenu, setShowBranchMenu] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  const roles = [
    'Chief Pharmacist',
    'Dispensing Technician',
    'Inventory Manager',
    'Branch Admin'
  ];

  const handleRateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(tempRate);
    if (!isNaN(val) && val > 0 && onUpdateExchangeRate) {
      onUpdateExchangeRate(val);
      setIsRateEditing(false);
    }
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand & Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/20">
              <Pill className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg tracking-tight text-emerald-400">
                  TRUST PHARMACY
                </span>
                <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded uppercase tracking-wider">
                  Enterprise
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">South Sudan Healthcare Operations</p>
            </div>
          </div>

          {/* Center Actions: Location Badge & Currency Rate */}
          <div className="hidden md:flex items-center space-x-4">
            
            {/* Single Pharmacy Location Badge */}
            <div className="flex items-center space-x-2 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-200">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span>Trust Pharmacy • Airport Road, Juba</span>
              <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.5 rounded ml-1">HQ</span>
            </div>

            {/* Currency Exchange Rate Widget */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs flex items-center space-x-2">
              <DollarSign className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-400">1 USD =</span>
              {isRateEditing ? (
                <form onSubmit={handleRateSubmit} className="flex items-center space-x-1">
                  <input
                    type="number"
                    value={tempRate}
                    onChange={(e) => setTempRate(e.target.value)}
                    className="w-20 bg-slate-900 border border-amber-500 text-amber-300 px-1 py-0.5 rounded text-xs text-right font-mono focus:outline-none"
                    autoFocus
                  />
                  <button type="submit" className="text-[10px] bg-amber-500 text-slate-950 font-bold px-1.5 py-0.5 rounded hover:bg-amber-400">
                    Save
                  </button>
                </form>
              ) : (
                <button
                  onClick={() => setIsRateEditing(true)}
                  className="font-mono font-bold text-amber-300 hover:underline flex items-center space-x-1"
                  title="Click to update daily exchange rate"
                  id="currency-rate-edit-button"
                >
                  <span>{exchangeRate.toLocaleString()} SSP</span>
                  <RefreshCw className="w-3 h-3 text-slate-400 ml-1 hover:text-amber-300" />
                </button>
              )}
            </div>

            {/* Global Currency Toggle Button (SSP / USD) */}
            {onToggleCurrency && (
              <button
                onClick={onToggleCurrency}
                className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold text-amber-300 transition-all cursor-pointer shadow-sm"
                title="Toggle System Display Currency (SSP / USD)"
                id="currency-toggle-button"
              >
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                <span>Currency: <span className="text-white font-extrabold">{systemCurrency}</span></span>
              </button>
            )}

          </div>

          {/* Right Header Actions */}
          <div className="flex items-center space-x-3">

            {/* Desktop Theme Switcher Button (Dark / Light Mode) */}
            {onToggleTheme && (
              <button
                onClick={onToggleTheme}
                className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 p-2 rounded-lg text-slate-200 transition-colors cursor-pointer"
                title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
                id="theme-toggle-button"
              >
                {theme === 'dark' ? (
                  <>
                    <Sun className="w-4 h-4 text-amber-400" />
                    <span className="hidden xl:inline text-xs font-semibold text-slate-300">Light Mode</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-4 h-4 text-sky-400" />
                    <span className="hidden xl:inline text-xs font-semibold text-slate-300">Dark Mode</span>
                  </>
                )}
              </button>
            )}

            {/* AI Assistant Quick Trigger */}
            <button
              onClick={onOpenAiAssistant}
              className="flex items-center space-x-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-semibold px-3 py-1.5 rounded-lg text-xs shadow-md shadow-emerald-500/10 transition-all transform active:scale-95"
              id="ai-assistant-header-button"
            >
              <Bot className="w-4 h-4" />
              <span className="hidden sm:inline">Clinical AI Assistant</span>
            </button>

            {/* Cart Trigger Button */}
            <button
              onClick={onOpenCart}
              className="relative bg-slate-800 hover:bg-slate-750 border border-slate-700 p-2 rounded-lg text-slate-200 transition-colors"
              title="View Cart & Dispensing Queue"
              id="header-cart-button"
            >
              <ShoppingCart className="w-5 h-5 text-emerald-400" />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center animate-pulse border-2 border-slate-900">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Staff Role Selector */}
            <div className="relative hidden lg:block">
              <button
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                className="flex items-center space-x-2 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-750"
                id="user-role-button"
              >
                <UserCheck className="w-3.5 h-3.5 text-teal-400" />
                <span className="max-w-[150px] truncate">{role}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {showRoleMenu && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-slate-800 border border-slate-700 rounded-xl shadow-xl py-2 z-50">
                  <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Switch Active Staff User
                  </div>
                  {roles.map(r => (
                    <button
                      key={r}
                      onClick={() => {
                        if (onChangeRole) onChangeRole(r);
                        setShowRoleMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-700 text-slate-200 ${
                        r === role ? 'bg-emerald-500/10 text-emerald-400 font-semibold' : ''
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>
      </div>
    </header>
  );
};
