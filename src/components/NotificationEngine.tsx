import { useState, useEffect } from 'react';
import { 
  Mail, Smartphone, Bell, Send, CheckCircle2, XCircle, AlertTriangle, 
  Activity, Sparkles, RefreshCw, Sliders, Settings, Layers, Globe, 
  ShieldCheck, Trash2, Copy, Check, Info, FileText, ArrowRight, Server, 
  Database, Radio, Volume2, Clock, CheckCircle
} from 'lucide-react';
import { NotificationEvent, NotificationSettings } from '../types';

interface NotificationEngineProps {
  activeTenantId?: string;
}

export default function NotificationEngine({ activeTenantId = 'tenant-downtown' }: NotificationEngineProps) {
  const [selectedTenantId, setSelectedTenantId] = useState<string>(activeTenantId);
  const [logs, setLogs] = useState<NotificationEvent[]>([]);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Tab states: logs vs template manager vs diagram
  const [activeTab, setActiveTab] = useState<'feed' | 'templates' | 'simulator' | 'architecture'>('feed');
  
  // Notification Feed filter
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');

  // Simulator parameters
  const [simType, setSimType] = useState<'low_stock' | 'expiry' | 'subscription' | 'payment' | 'broadcast'>('low_stock');
  const [simParams, setSimParams] = useState<any>({
    drugName: 'Lisinopril 10mg',
    sku: 'LIS-10-DT',
    stock: '12',
    minStock: '50',
    batchNumber: 'AX-9942',
    storeName: 'Front Counter Cabinet',
    expiryDate: '2026-09-10',
    daysRemaining: '58',
    valueAtRisk: '1120.00',
    renewalDate: '2026-08-15',
    invoiceNumber: '891041',
    amount: '299.00',
    broadcastTitle: '⚠️ Urgent System Notice: Medication Recall',
    broadcastMessage: 'Junub Pharmacare Quality Assurance Brokerage: FDA has issued a voluntary recall of Valsartan Batch #VL-2041. Immediately quarantine all matching inventory stock.',
    globalBroadcast: false
  });
  const [simChannels, setSimChannels] = useState({
    email: true,
    push: true,
    inApp: true
  });
  const [dispatchResult, setDispatchResult] = useState<any>(null);
  const [dispatching, setDispatching] = useState<boolean>(false);

  // Template editor state
  const [editingTemplateType, setEditingTemplateType] = useState<'low_stock' | 'expiry' | 'subscription' | 'payment' | 'broadcast'>('low_stock');
  const [editedTitle, setEditedTitle] = useState<string>('');
  const [editedBody, setEditedBody] = useState<string>('');
  const [savingSettings, setSavingSettings] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Copied states
  const [copiedTextKey, setCopiedTextKey] = useState<string | null>(null);

  // Fetch from endpoint
  const loadNotificationData = async (tId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/${tId}/notifications`);
      const data = await res.json();
      if (data.status === 'success') {
        setLogs(data.logs);
        setSettings(data.settings);
        // Set initial values for template editors
        const activeTemplate = data.settings.templates[editingTemplateType];
        setEditedTitle(activeTemplate.title);
        setEditedBody(activeTemplate.body);
      } else {
        setError(data.message || 'Failed to pull notifications data.');
      }
    } catch (err) {
      console.error(err);
      setError('Connection to HIPAA Notification Engine Broker lost. Attempting reconnection...');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSelectedTenantId(activeTenantId);
  }, [activeTenantId]);

  useEffect(() => {
    loadNotificationData(selectedTenantId);
  }, [selectedTenantId]);

  // Sync editing templates state when selected template type changes
  useEffect(() => {
    if (settings) {
      const activeTemplate = settings.templates[editingTemplateType];
      setEditedTitle(activeTemplate.title);
      setEditedBody(activeTemplate.body);
    }
  }, [editingTemplateType, settings]);

  // Handle template updates
  const handleSaveTemplate = async () => {
    if (!settings) return;
    setSavingSettings(true);
    setSaveSuccess(false);
    try {
      const updatedTemplates = {
        ...settings.templates,
        [editingTemplateType]: {
          title: editedTitle,
          body: editedBody
        }
      };

      const res = await fetch(`/api/v1/${selectedTenantId}/notifications/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templates: updatedTemplates })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setSettings(data.settings);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
      } else {
        alert(data.message || 'Error updating template settings.');
      }
    } catch (err) {
      console.error(err);
      alert('Could not synchronize template changes with SaaS edge compiler.');
    } finally {
      setSavingSettings(false);
    }
  };

  // Toggle delivery channel switches
  const handleToggleChannelSetting = async (channelKey: 'email' | 'push' | 'inApp', prop: 'enabled' | 'recipient' | 'endpoint', val: any) => {
    if (!settings) return;
    try {
      const updatedChannels = { ...settings.channels };
      if (channelKey === 'email') {
        updatedChannels.email = { ...updatedChannels.email, [prop]: val };
      } else if (channelKey === 'push') {
        updatedChannels.push = { ...updatedChannels.push, [prop]: val };
      } else if (channelKey === 'inApp') {
        updatedChannels.inApp = { ...updatedChannels.inApp, [prop]: val };
      }

      const res = await fetch(`/api/v1/${selectedTenantId}/notifications/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channels: updatedChannels })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setSettings(data.settings);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle alert type enablement
  const handleToggleTypeSetting = async (typeKey: string, val: boolean) => {
    if (!settings) return;
    try {
      const updatedTypes = { ...settings.enabledTypes, [typeKey]: val };
      const res = await fetch(`/api/v1/${selectedTenantId}/notifications/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabledTypes: updatedTypes })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setSettings(data.settings);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Mark specific log as read
  const handleMarkAsRead = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/${selectedTenantId}/notifications/${id}/read`, {
        method: 'PUT'
      });
      const data = await res.json();
      if (data.status === 'success') {
        setLogs(prev => prev.map(e => e.id === id ? { ...e, isRead: true } : e));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Mark all as read
  const handleMarkAllRead = async () => {
    try {
      const res = await fetch(`/api/v1/${selectedTenantId}/notifications/read-all`, {
        method: 'PUT'
      });
      const data = await res.json();
      if (data.status === 'success') {
        setLogs(prev => prev.map(e => ({ ...e, isRead: true })));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Dispatch mock event trigger
  const handleTriggerNotification = async () => {
    setDispatching(true);
    setDispatchResult(null);
    try {
      let customParams: any = {};
      if (simType === 'low_stock') {
        customParams = {
          drugName: simParams.drugName,
          sku: simParams.sku,
          stock: simParams.stock,
          minStock: simParams.minStock
        };
      } else if (simType === 'expiry') {
        customParams = {
          drugName: simParams.drugName,
          batchNumber: simParams.batchNumber,
          storeName: simParams.storeName,
          expiryDate: simParams.expiryDate,
          daysRemaining: simParams.daysRemaining,
          stock: simParams.stock,
          valueAtRisk: simParams.valueAtRisk
        };
      } else if (simType === 'subscription') {
        customParams = {
          renewalDate: simParams.renewalDate
        };
      } else if (simType === 'payment') {
        customParams = {
          invoiceNumber: simParams.invoiceNumber,
          amount: simParams.amount
        };
      } else if (simType === 'broadcast') {
        customParams = {
          title: simParams.broadcastTitle,
          message: simParams.broadcastMessage,
          globalBroadcast: simParams.globalBroadcast
        };
      }

      const res = await fetch(`/api/v1/${selectedTenantId}/notifications/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: simType,
          customParams,
          selectedChannels: simChannels
        })
      });

      const data = await res.json();
      if (data.status === 'success') {
        setDispatchResult(data);
        // Refresh feed logs
        loadNotificationData(selectedTenantId);
      } else {
        setDispatchResult({
          status: 'error',
          message: data.message
        });
      }
    } catch (err) {
      console.error(err);
      setDispatchResult({
        status: 'error',
        message: 'Network timed out communicating with dispatch broker.'
      });
    } finally {
      setDispatching(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTextKey(key);
    setTimeout(() => setCopiedTextKey(null), 2000);
  };

  const getFilteredLogs = () => {
    return logs.filter(log => {
      const typeMatch = typeFilter === 'all' || log.type === typeFilter;
      const channelMatch = channelFilter === 'all' || 
        (channelFilter === 'email' && log.channels.email) ||
        (channelFilter === 'push' && log.channels.push) ||
        (channelFilter === 'in_app' && log.channels.inApp);
      return typeMatch && channelMatch;
    });
  };

  const filteredLogs = getFilteredLogs();

  // Helper styles/labels
  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'low_stock':
        return <span className="bg-rose-50 text-rose-700 border border-rose-100 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Low Stock</span>;
      case 'expiry':
        return <span className="bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1"><Clock className="h-3 w-3" /> Expiry</span>;
      case 'subscription':
        return <span className="bg-sky-50 text-sky-700 border border-sky-100 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1"><Layers className="h-3 w-3" /> Subscription</span>;
      case 'payment':
        return <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1"><FileText className="h-3 w-3" /> Billing</span>;
      case 'broadcast':
        return <span className="bg-purple-50 text-purple-700 border border-purple-100 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1"><Globe className="h-3 w-3" /> Broadcast</span>;
      default:
        return <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px] font-bold">{type}</span>;
    }
  };

  const getStatusIcon = (status: 'sent' | 'failed' | 'not_configured' | 'skipped') => {
    switch (status) {
      case 'sent':
        return <span title="Delivered successfully"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /></span>;
      case 'failed':
        return <span title="Delivery failed"><XCircle className="h-3.5 w-3.5 text-rose-500 animate-pulse" /></span>;
      case 'not_configured':
        return <span title="Channel not configured"><Info className="h-3.5 w-3.5 text-slate-400" /></span>;
      case 'skipped':
        return <span className="text-[10px] text-slate-400 font-mono" title="Bypassed by preference">Skipped</span>;
    }
  };

  // Metrics calculators
  const statsSent = logs.length;
  const statsRead = logs.filter(l => l.isRead).length;
  const statsEmails = logs.filter(l => l.channels.email && l.deliveryStatus.email === 'sent').length;
  const statsPush = logs.filter(l => l.channels.push && l.deliveryStatus.push === 'sent').length;
  const statsInApp = logs.filter(l => l.channels.inApp && l.deliveryStatus.inApp === 'sent').length;

  return (
    <div className="space-y-6">
      
      {/* Upper Filters & Workspace Panel */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-sky-500 text-white rounded-2xl shadow-md shadow-indigo-150">
            <Radio className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Notification Engine Workspace</h2>
            <p className="text-xs text-slate-500 font-medium">Configure alert triggers, edit live message templates, and simulate micro-channel delivery.</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap md:justify-end">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Tenant Cluster:</span>
            <select
              value={selectedTenantId}
              onChange={(e) => setSelectedTenantId(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
            >
              <option value="tenant-downtown">Downtown Pharmacy (Starter)</option>
              <option value="tenant-carefirst">CareFirst Wellness (Professional)</option>
              <option value="tenant-stjude">St. Jude Hospital (Enterprise)</option>
            </select>
          </div>

          <button
            onClick={() => loadNotificationData(selectedTenantId)}
            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all cursor-pointer"
            title="Refresh Feed"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main Stats Block */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
          <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Engine Log Count</div>
          <div className="text-2xl font-black text-slate-950 mt-1">{statsSent}</div>
          <div className="text-[10px] text-slate-500 font-bold mt-1.5">Total processed alerts</div>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
          <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">In-App Read Rate</div>
          <div className="text-2xl font-black text-indigo-600 mt-1">
            {statsSent > 0 ? `${Math.round((statsRead / statsSent) * 100)}%` : '0%'}
          </div>
          <div className="text-[10px] text-indigo-500 font-bold mt-1.5">{statsRead} of {statsSent} acknowledged</div>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Email Channels</div>
            <div className="text-xl font-black text-slate-950 mt-1">{statsEmails}</div>
            <div className="text-[10px] text-emerald-600 font-bold mt-1">SMTP Outbox Sent</div>
          </div>
          <Mail className="h-7 w-7 text-slate-300" />
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Push Gateway</div>
            <div className="text-xl font-black text-slate-950 mt-1">{statsPush}</div>
            <div className="text-[10px] text-sky-600 font-bold mt-1">FCM Tokens Target</div>
          </div>
          <Smartphone className="h-7 w-7 text-slate-300" />
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between col-span-2 lg:col-span-1">
          <div>
            <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Active Socket Inboxes</div>
            <div className="text-xl font-black text-emerald-600 mt-1">{statsInApp}</div>
            <div className="text-[10px] text-slate-500 font-bold mt-1">Real-time Web Client</div>
          </div>
          <Bell className="h-7 w-7 text-emerald-500 animate-bounce" />
        </div>
      </div>

      {/* Main Split Layout: Workspace Navigation tabs and Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Side Tab Bar */}
        <div className="lg:col-span-1 flex flex-col gap-2 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm h-fit">
          <div className="text-[10px] uppercase font-extrabold text-slate-400 px-3 tracking-widest flex items-center gap-1.5">
            <Sliders className="h-3.5 w-3.5" />
            Notification Modules
          </div>

          <div className="space-y-1">
            <button
              onClick={() => setActiveTab('feed')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                activeTab === 'feed'
                  ? 'bg-indigo-50 text-indigo-600 border-l-4 border-indigo-500 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                <span>Live Alerts Feed</span>
              </div>
              <span className="bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded-full text-[10px] font-black">
                {logs.filter(e => !e.isRead).length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('simulator')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                activeTab === 'simulator'
                  ? 'bg-rose-50 text-rose-600 border-l-4 border-rose-500 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Send className="h-4 w-4" />
                <span>Trigger Simulator</span>
              </div>
              <Sparkles className="h-3.5 w-3.5 text-rose-500" />
            </button>

            <button
              onClick={() => setActiveTab('templates')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                activeTab === 'templates'
                  ? 'bg-sky-50 text-sky-600 border-l-4 border-sky-500 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span>Template Settings</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('architecture')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                activeTab === 'architecture'
                  ? 'bg-emerald-50 text-emerald-600 border-l-4 border-emerald-500 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4" />
                <span>Broker Architecture</span>
              </div>
            </button>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Channel Preferences</div>
            
            {settings ? (
              <div className="space-y-2">
                <label className="flex items-center justify-between text-[11px] font-bold text-slate-600 cursor-pointer">
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    Email Deliveries
                  </span>
                  <input
                    type="checkbox"
                    checked={settings.channels.email.enabled}
                    onChange={(e) => handleToggleChannelSetting('email', 'enabled', e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                </label>

                <label className="flex items-center justify-between text-[11px] font-bold text-slate-600 cursor-pointer">
                  <span className="flex items-center gap-1.5">
                    <Smartphone className="h-3.5 w-3.5 text-slate-400" />
                    Push Gateway (FCM)
                  </span>
                  <input
                    type="checkbox"
                    checked={settings.channels.push.enabled}
                    onChange={(e) => handleToggleChannelSetting('push', 'enabled', e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                </label>

                <label className="flex items-center justify-between text-[11px] font-bold text-slate-600 cursor-pointer">
                  <span className="flex items-center gap-1.5">
                    <Bell className="h-3.5 w-3.5 text-emerald-400" />
                    In-App Real-time
                  </span>
                  <input
                    type="checkbox"
                    checked={settings.channels.inApp.enabled}
                    onChange={(e) => handleToggleChannelSetting('inApp', 'enabled', e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                </label>
              </div>
            ) : (
              <div className="text-xs text-slate-400">Loading settings...</div>
            )}
          </div>
        </div>

        {/* Right Side Working Pane */}
        <div className="lg:col-span-3">
          
          {loading ? (
            <div className="bg-white p-12 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col items-center justify-center space-y-4">
              <RefreshCw className="h-8 w-8 text-indigo-500 animate-spin" />
              <div className="text-sm font-bold text-slate-800">Compiling Notification Broker State...</div>
              <p className="text-xs text-slate-500 text-center">Fetching isolated templates, loading deliverability queues, and checking SMTP connection pools.</p>
            </div>
          ) : error ? (
            <div className="bg-rose-50 border border-rose-200 p-8 rounded-3xl text-center space-y-4">
              <AlertTriangle className="h-10 w-10 text-rose-500 mx-auto animate-bounce" />
              <div className="text-sm font-bold text-rose-950">{error}</div>
              <button 
                onClick={() => loadNotificationData(selectedTenantId)}
                className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-all cursor-pointer"
              >
                Retry Dispatcher Link
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* FEED TAB */}
              {activeTab === 'feed' && (
                <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-950 tracking-tight">Active Deliverability Ledger</h3>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">Comprehensive audit log of triggered alerts, delivery status, and acknowledgement records.</p>
                    </div>

                    <button
                      onClick={handleMarkAllRead}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Mark All as Read
                    </button>
                  </div>

                  {/* Filter controls inside feed */}
                  <div className="flex flex-wrap gap-2.5">
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Type:</span>
                      <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="bg-transparent text-[11px] font-bold text-slate-700 focus:outline-none cursor-pointer"
                      >
                        <option value="all">All Alerts</option>
                        <option value="low_stock">Low Stock Alerts</option>
                        <option value="expiry">Expiry Warnings</option>
                        <option value="subscription">Subscription Notices</option>
                        <option value="payment">Billing Invoices</option>
                        <option value="broadcast">Global Broadcasts</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Channel:</span>
                      <select
                        value={channelFilter}
                        onChange={(e) => setChannelFilter(e.target.value)}
                        className="bg-transparent text-[11px] font-bold text-slate-700 focus:outline-none cursor-pointer"
                      >
                        <option value="all">All Channels</option>
                        <option value="email">Email Only</option>
                        <option value="push">Push Notification Only</option>
                        <option value="in_app">In-App Alerts Only</option>
                      </select>
                    </div>
                  </div>

                  {/* Logs list */}
                  {filteredLogs.length === 0 ? (
                    <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-3xl space-y-2">
                      <Bell className="h-8 w-8 text-slate-300 mx-auto" />
                      <div className="text-xs font-bold text-slate-700">No matching logs processed</div>
                      <p className="text-[11px] text-slate-400 max-w-sm mx-auto">Use the <strong>Trigger Simulator</strong> tab to fire new notifications into the queue and test client receipt routing.</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                      {filteredLogs.map((log) => (
                        <div 
                          key={log.id} 
                          className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-start md:justify-between gap-4 ${
                            log.isRead 
                              ? 'bg-slate-50/60 border-slate-200' 
                              : 'bg-white border-indigo-150 shadow-sm ring-1 ring-indigo-50/50'
                          }`}
                        >
                          <div className="space-y-1.5 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              {getTypeBadge(log.type)}
                              <span className="text-[10px] font-mono text-slate-400">{new Date(log.createdAt).toLocaleTimeString()} · {new Date(log.createdAt).toLocaleDateString()}</span>
                              {!log.isRead && (
                                <span className="bg-indigo-500 text-white font-extrabold px-1.5 py-0.5 rounded text-[9px] animate-pulse">NEW</span>
                              )}
                            </div>
                            
                            <h4 className="text-xs font-extrabold text-slate-900">{log.title}</h4>
                            <p className="text-[11px] text-slate-600 font-medium leading-relaxed">{log.message}</p>
                          </div>

                          {/* Channel Status and Action Grid */}
                          <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-start gap-2 border-t md:border-t-0 border-slate-100 pt-3 md:pt-0">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1" title="Email Outbox Status">
                                <Mail className="h-3.5 w-3.5 text-slate-400" />
                                {getStatusIcon(log.deliveryStatus.email)}
                              </div>
                              <div className="flex items-center gap-1" title="FCM Push Gateway Status">
                                <Smartphone className="h-3.5 w-3.5 text-slate-400" />
                                {getStatusIcon(log.deliveryStatus.push)}
                              </div>
                              <div className="flex items-center gap-1" title="In-App Feed Status">
                                <Bell className="h-3.5 w-3.5 text-slate-400" />
                                {getStatusIcon(log.deliveryStatus.inApp)}
                              </div>
                            </div>

                            {!log.isRead ? (
                              <button
                                onClick={() => handleMarkAsRead(log.id)}
                                className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-lg transition-all cursor-pointer"
                              >
                                Acknowledge
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                                <CheckCircle className="h-3 w-3 text-slate-400" /> Read
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* SIMULATOR TAB */}
              {activeTab === 'simulator' && (
                <div className="space-y-6">
                  
                  {/* Form Card */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-5">
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">Manual Delivery Simulator &amp; Template Dispatcher</h3>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">Test real-time routing logic, database checks, and channel distribution latency on our local SaaS pipeline.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Left: Simulator Controls */}
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Select Alert Feature:</label>
                          <select
                            value={simType}
                            onChange={(e) => setSimType(e.target.value as any)}
                            className="w-full bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer"
                          >
                            <option value="low_stock">Feature 1: Low Stock Alerts (Stock drops below minimum)</option>
                            <option value="expiry">Feature 2: Medication Expiry Warnings (Shelf life warning)</option>
                            <option value="subscription">Feature 3: Subscription Cycle Reminders</option>
                            <option value="payment">Feature 4: Invoice &amp; Payment Reminders</option>
                            <option value="broadcast">Feature 5: Global System Broadcast Message</option>
                          </select>
                        </div>

                        {/* Feature-specific simulator inputs */}
                        {simType === 'low_stock' && (
                          <div className="space-y-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                            <h4 className="text-xs font-bold text-slate-700">Customize Mock Low Stock Metadata</h4>
                            
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Drug Name</label>
                                <input
                                  type="text"
                                  value={simParams.drugName}
                                  onChange={(e) => setSimParams({ ...simParams, drugName: e.target.value })}
                                  className="w-full bg-white border border-slate-200 text-xs text-slate-800 rounded-lg px-2.5 py-1.5 mt-0.5 focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase">SKU Code</label>
                                <input
                                  type="text"
                                  value={simParams.sku}
                                  onChange={(e) => setSimParams({ ...simParams, sku: e.target.value })}
                                  className="w-full bg-white border border-slate-200 text-xs text-slate-800 rounded-lg px-2.5 py-1.5 mt-0.5 focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Stock Remaining</label>
                                <input
                                  type="number"
                                  value={simParams.stock}
                                  onChange={(e) => setSimParams({ ...simParams, stock: e.target.value })}
                                  className="w-full bg-white border border-slate-200 text-xs text-slate-800 rounded-lg px-2.5 py-1.5 mt-0.5 focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Safety Threshold</label>
                                <input
                                  type="number"
                                  value={simParams.minStock}
                                  onChange={(e) => setSimParams({ ...simParams, minStock: e.target.value })}
                                  className="w-full bg-white border border-slate-200 text-xs text-slate-800 rounded-lg px-2.5 py-1.5 mt-0.5 focus:outline-none"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {simType === 'expiry' && (
                          <div className="space-y-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                            <h4 className="text-xs font-bold text-slate-700">Customize Expiry Warning Metadata</h4>
                            
                            <div className="grid grid-cols-2 gap-2">
                              <div className="col-span-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Medication Name</label>
                                <input
                                  type="text"
                                  value={simParams.drugName}
                                  onChange={(e) => setSimParams({ ...simParams, drugName: e.target.value })}
                                  className="w-full bg-white border border-slate-200 text-xs text-slate-800 rounded-lg px-2.5 py-1.5 mt-0.5 focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Batch ID</label>
                                <input
                                  type="text"
                                  value={simParams.batchNumber}
                                  onChange={(e) => setSimParams({ ...simParams, batchNumber: e.target.value })}
                                  className="w-full bg-white border border-slate-200 text-xs text-slate-800 rounded-lg px-2.5 py-1.5 mt-0.5 focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Warehouse Zone</label>
                                <input
                                  type="text"
                                  value={simParams.storeName}
                                  onChange={(e) => setSimParams({ ...simParams, storeName: e.target.value })}
                                  className="w-full bg-white border border-slate-200 text-xs text-slate-800 rounded-lg px-2.5 py-1.5 mt-0.5 focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Expiry Date</label>
                                <input
                                  type="date"
                                  value={simParams.expiryDate}
                                  onChange={(e) => setSimParams({ ...simParams, expiryDate: e.target.value })}
                                  className="w-full bg-white border border-slate-200 text-xs text-slate-800 rounded-lg px-2.5 py-1.5 mt-0.5 focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Days Remaining</label>
                                <input
                                  type="number"
                                  value={simParams.daysRemaining}
                                  onChange={(e) => setSimParams({ ...simParams, daysRemaining: e.target.value })}
                                  className="w-full bg-white border border-slate-200 text-xs text-slate-800 rounded-lg px-2.5 py-1.5 mt-0.5 focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Stock Units</label>
                                <input
                                  type="number"
                                  value={simParams.stock}
                                  onChange={(e) => setSimParams({ ...simParams, stock: e.target.value })}
                                  className="w-full bg-white border border-slate-200 text-xs text-slate-800 rounded-lg px-2.5 py-1.5 mt-0.5 focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Asset Loss Risk ($)</label>
                                <input
                                  type="number"
                                  value={simParams.valueAtRisk}
                                  onChange={(e) => setSimParams({ ...simParams, valueAtRisk: e.target.value })}
                                  className="w-full bg-white border border-slate-200 text-xs text-slate-800 rounded-lg px-2.5 py-1.5 mt-0.5 focus:outline-none"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {simType === 'subscription' && (
                          <div className="space-y-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                            <h4 className="text-xs font-bold text-slate-700">Customize Subscription reminder Parameters</h4>
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Renewal Date</label>
                              <input
                                type="date"
                                value={simParams.renewalDate}
                                onChange={(e) => setSimParams({ ...simParams, renewalDate: e.target.value })}
                                className="w-full bg-white border border-slate-200 text-xs text-slate-800 rounded-lg px-2.5 py-1.5 mt-0.5 focus:outline-none"
                              />
                            </div>
                          </div>
                        )}

                        {simType === 'payment' && (
                          <div className="space-y-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                            <h4 className="text-xs font-bold text-slate-700">Customize Payment reminder Parameters</h4>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Invoice Number</label>
                                <input
                                  type="text"
                                  value={simParams.invoiceNumber}
                                  onChange={(e) => setSimParams({ ...simParams, invoiceNumber: e.target.value })}
                                  className="w-full bg-white border border-slate-200 text-xs text-slate-800 rounded-lg px-2.5 py-1.5 mt-0.5 focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Amount Dues ($)</label>
                                <input
                                  type="text"
                                  value={simParams.amount}
                                  onChange={(e) => setSimParams({ ...simParams, amount: e.target.value })}
                                  className="w-full bg-white border border-slate-200 text-xs text-slate-800 rounded-lg px-2.5 py-1.5 mt-0.5 focus:outline-none"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {simType === 'broadcast' && (
                          <div className="space-y-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                            <h4 className="text-xs font-bold text-slate-700">Draft System Broadcast Alert</h4>
                            <div className="space-y-2">
                              <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Broadcast Title</label>
                                <input
                                  type="text"
                                  value={simParams.broadcastTitle}
                                  onChange={(e) => setSimParams({ ...simParams, broadcastTitle: e.target.value })}
                                  className="w-full bg-white border border-slate-200 text-xs text-slate-800 rounded-lg px-2.5 py-1.5 mt-0.5 focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Broadcast message (Body)</label>
                                <textarea
                                  rows={2}
                                  value={simParams.broadcastMessage}
                                  onChange={(e) => setSimParams({ ...simParams, broadcastMessage: e.target.value })}
                                  className="w-full bg-white border border-slate-200 text-xs text-slate-800 rounded-lg px-2.5 py-1.5 mt-0.5 focus:outline-none font-sans"
                                />
                              </div>
                              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 pt-1 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={simParams.globalBroadcast}
                                  onChange={(e) => setSimParams({ ...simParams, globalBroadcast: e.target.checked })}
                                  className="rounded text-rose-500 focus:ring-rose-500"
                                />
                                <span className="flex items-center gap-1">
                                  <Globe className="h-3.5 w-3.5 text-rose-500 animate-spin" />
                                  Broadcast to ALL 3 Tenants simultaneously
                                </span>
                              </label>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Right: Channel Target Matrix & Trigger Action */}
                      <div className="space-y-4 flex flex-col justify-between">
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Configure Channels to Dispatch:</h4>
                          
                          <div className="space-y-2">
                            <label className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-100/50 transition-all">
                              <span className="flex items-center gap-2.5 text-xs font-bold text-slate-700">
                                <Mail className="h-4 w-4 text-slate-500" />
                                SMTP Email Outbox
                              </span>
                              <input
                                type="checkbox"
                                checked={simChannels.email}
                                onChange={(e) => setSimChannels({ ...simChannels, email: e.target.checked })}
                                className="rounded text-rose-500 focus:ring-rose-500 h-4 w-4 cursor-pointer"
                              />
                            </label>

                            <label className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-100/50 transition-all">
                              <span className="flex items-center gap-2.5 text-xs font-bold text-slate-700">
                                <Smartphone className="h-4 w-4 text-slate-500" />
                                Google FCM Push Node
                              </span>
                              <input
                                type="checkbox"
                                checked={simChannels.push}
                                onChange={(e) => setSimChannels({ ...simChannels, push: e.target.checked })}
                                className="rounded text-rose-500 focus:ring-rose-500 h-4 w-4 cursor-pointer"
                              />
                            </label>

                            <label className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-100/50 transition-all">
                              <span className="flex items-center gap-2.5 text-xs font-bold text-slate-700">
                                <Bell className="h-4 w-4 text-emerald-500" />
                                In-App Live Terminal
                              </span>
                              <input
                                type="checkbox"
                                checked={simChannels.inApp}
                                onChange={(e) => setSimChannels({ ...simChannels, inApp: e.target.checked })}
                                className="rounded text-rose-500 focus:ring-rose-500 h-4 w-4 cursor-pointer"
                              />
                            </label>
                          </div>
                        </div>

                        <button
                          onClick={handleTriggerNotification}
                          disabled={dispatching}
                          className="w-full py-3 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                        >
                          {dispatching ? (
                            <>
                              <RefreshCw className="h-4 w-4 animate-spin" />
                              Compiling &amp; Dispatching...
                            </>
                          ) : (
                            <>
                              <Send className="h-4 w-4" />
                              Dispatch Notification Event
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Simulator Execution Output logs */}
                  {dispatchResult && (
                    <div className="bg-slate-950 text-slate-100 rounded-3xl border border-slate-800 p-6 space-y-4 shadow-xl font-mono">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full ${dispatchResult.status === 'success' ? 'bg-emerald-500 animate-ping' : 'bg-rose-500'}`}></div>
                          <span className="text-xs font-bold uppercase text-slate-300">Broker Execution Trace Log</span>
                        </div>
                        <span className="text-[10px] text-slate-500">Node-Express Engine Broker</span>
                      </div>

                      {dispatchResult.status === 'success' ? (
                        <div className="space-y-3 text-xs">
                          <p className="text-emerald-400 font-bold">✓ {dispatchResult.message}</p>
                          
                          <div className="space-y-1 pt-1 text-slate-300">
                            <div><strong className="text-slate-400">Trigger Type:</strong> {simType.toUpperCase()}</div>
                            <div><strong className="text-slate-400">SMTP Recipient:</strong> {dispatchResult.deliverySimulationMetrics.emailRecipient || 'N/A'}</div>
                            <div><strong className="text-slate-400">FCM Push URL:</strong> {dispatchResult.deliverySimulationMetrics.pushGatewayEndpoint || 'N/A'}</div>
                            <div><strong className="text-slate-400">Socket Latency:</strong> {dispatchResult.deliverySimulationMetrics.latencyMs} ms (Sub-second Edge Dispatch)</div>
                          </div>

                          <div className="bg-slate-900/80 p-3.5 rounded-xl text-[11px] text-sky-300 overflow-x-auto border border-slate-800 whitespace-pre">
                            {JSON.stringify(dispatchResult.dispatchedEvents, null, 2)}
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-rose-400">
                          <strong>Error:</strong> {dispatchResult.message}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TEMPLATES TAB */}
              {activeTab === 'templates' && (
                <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
                  
                  {/* Select template type to edit */}
                  <div className="border-b border-slate-100 pb-4">
                    <h3 className="text-sm font-extrabold text-slate-950 tracking-tight">Isolated Template Customizer</h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">Customize specific triggers using token substitutions. Edits are isolated to the active tenant workspace.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                      onClick={() => setEditingTemplateType('low_stock')}
                      className={`p-3 text-xs font-bold rounded-2xl border text-left transition-all cursor-pointer ${
                        editingTemplateType === 'low_stock' ? 'bg-sky-50 border-sky-300 text-sky-800' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      Low Stock Alerts
                    </button>
                    <button
                      onClick={() => setEditingTemplateType('expiry')}
                      className={`p-3 text-xs font-bold rounded-2xl border text-left transition-all cursor-pointer ${
                        editingTemplateType === 'expiry' ? 'bg-amber-50 border-amber-300 text-amber-800' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      Expiry Warnings
                    </button>
                    <button
                      onClick={() => setEditingTemplateType('subscription')}
                      className={`p-3 text-xs font-bold rounded-2xl border text-left transition-all cursor-pointer ${
                        editingTemplateType === 'subscription' ? 'bg-sky-50 border-sky-300 text-sky-800' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      Subscription Reminders
                    </button>
                    <button
                      onClick={() => setEditingTemplateType('payment')}
                      className={`p-3 text-xs font-bold rounded-2xl border text-left transition-all cursor-pointer ${
                        editingTemplateType === 'payment' ? 'bg-indigo-50 border-indigo-300 text-indigo-800' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      Payment Reminders
                    </button>
                    <button
                      onClick={() => setEditingTemplateType('broadcast')}
                      className={`p-3 text-xs font-bold rounded-2xl border text-left transition-all cursor-pointer ${
                        editingTemplateType === 'broadcast' ? 'bg-purple-50 border-purple-300 text-purple-800' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      System Broadcast Template
                    </button>
                  </div>

                  {/* Editor workspace */}
                  <div className="space-y-4 border border-slate-200 p-5 rounded-2xl">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Settings className="h-4 w-4 text-sky-500" />
                      Template Editor: {editingTemplateType.toUpperCase()}
                    </h4>

                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Alert Header Subject</label>
                        <input
                          type="text"
                          value={editedTitle}
                          onChange={(e) => setEditedTitle(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 font-bold rounded-lg px-3 py-2 mt-0.5 focus:outline-none focus:ring-2 focus:ring-sky-500"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Alert Message Body Text</label>
                        <textarea
                          rows={4}
                          value={editedBody}
                          onChange={(e) => setEditedBody(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 rounded-lg px-3 py-2 mt-0.5 focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
                        />
                      </div>

                      {/* Display replacement keys guidelines */}
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5 text-[10px] font-mono leading-relaxed text-slate-500">
                        <div className="font-bold uppercase text-slate-700">Supported Compiler Substitution Keys:</div>
                        {editingTemplateType === 'low_stock' && (
                          <div><code>{'{DRUG_NAME}'}</code>, <code>{'{SKU}'}</code>, <code>{'{CURRENT_STOCK}'}</code>, <code>{'{MIN_STOCK}'}</code></div>
                        )}
                        {editingTemplateType === 'expiry' && (
                          <div><code>{'{DRUG_NAME}'}</code>, <code>{'{BATCH_NUMBER}'}</code>, <code>{'{STORE_NAME}'}</code>, <code>{'{EXPIRY_DATE}'}</code>, <code>{'{DAYS_REMAINING}'}</code>, <code>{'{STOCK}'}</code>, <code>{'{VALUE_AT_RISK}'}</code></div>
                        )}
                        {editingTemplateType === 'subscription' && (
                          <div><code>{'{PLAN_NAME}'}</code>, <code>{'{RENEWAL_DATE}'}</code></div>
                        )}
                        {editingTemplateType === 'payment' && (
                          <div><code>{'{INVOICE_NUMBER}'}</code>, <code>{'{AMOUNT}'}</code></div>
                        )}
                        {editingTemplateType === 'broadcast' && (
                          <div>Supports direct raw text broadcasts to tenant terminals.</div>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={handleSaveTemplate}
                          disabled={savingSettings}
                          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                        >
                          {savingSettings ? 'Compiling Code...' : 'Save Draft Settings'}
                        </button>
                        
                        {saveSuccess && (
                          <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                            <CheckCircle2 className="h-4 w-4" /> Customized template compiled &amp; saved!
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ARCHITECTURE TAB */}
              {activeTab === 'architecture' && (
                <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
                  <div className="border-b border-slate-100 pb-4">
                    <h3 className="text-sm font-extrabold text-slate-950 tracking-tight">Notification Engine Architecture</h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">High-fidelity visualization of the event ingress pipelines, template tokenizers, and multi-channel delivery nodes.</p>
                  </div>

                  {/* Flow Diagram */}
                  <div className="p-6 bg-slate-900 text-slate-100 rounded-3xl space-y-6 font-mono border border-slate-800 overflow-x-auto">
                    <div className="text-xs text-emerald-400 border-b border-slate-800 pb-2">JUBA MULTI-CHANNEL DISPATCH WORKFLOW</div>
                    
                    <div className="flex flex-col space-y-8 items-center min-w-[600px] py-4">
                      
                      {/* Step 1: Ingress */}
                      <div className="flex gap-4">
                        <div className="bg-slate-800 border border-slate-700 p-3 rounded-xl text-center text-xs w-48 shadow-sm">
                          <div className="font-bold text-sky-400">API Events / Crons</div>
                          <div className="text-[10px] text-slate-400 mt-1">Automatic Low Stock / Expiry Scheduler</div>
                        </div>
                        <div className="bg-rose-950/40 border border-rose-900/60 p-3 rounded-xl text-center text-xs w-48 shadow-sm">
                          <div className="font-bold text-rose-400">Manual Triggers</div>
                          <div className="text-[10px] text-slate-400 mt-1">Simulator Panel / admin overrides</div>
                        </div>
                      </div>

                      <div className="text-slate-500 text-xs">▼</div>

                      {/* Step 2: Queue Broker */}
                      <div className="bg-indigo-950/40 border border-indigo-900/60 p-4 rounded-2xl text-center text-xs w-96">
                        <div className="font-bold text-indigo-400 flex items-center justify-center gap-1.5">
                          <Server className="h-4 w-4" />
                          Central Event Broker Engine
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">Ingests parameters, checks tenant isolation keys, and loads settings template models.</div>
                        
                        <div className="grid grid-cols-2 gap-2 mt-3 text-[9px] text-slate-500 font-bold border-t border-indigo-900/30 pt-2.5">
                          <div>Isolation Key: VERIFIED</div>
                          <div>MFA / RBAC Verified</div>
                        </div>
                      </div>

                      <div className="text-slate-500 text-xs">▼</div>

                      {/* Step 3: Template compiler */}
                      <div className="bg-emerald-950/40 border border-emerald-900/60 p-3.5 rounded-xl text-center text-xs w-80">
                        <div className="font-bold text-emerald-400 flex items-center justify-center gap-1.5">
                          <Sliders className="h-4 w-4" />
                          Template Token Compiler
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">Parses string replacements: replaces <code>{'{DRUG_NAME}'}</code>, <code>{'{MIN_STOCK}'}</code> with isolated catalog metadata.</div>
                      </div>

                      <div className="text-slate-500 text-xs">▼</div>

                      {/* Step 4: Split Channels */}
                      <div className="grid grid-cols-3 gap-4 w-full text-center text-xs">
                        
                        {/* SMTP */}
                        <div className="bg-slate-800/80 border border-slate-700 p-3 rounded-xl">
                          <div className="font-bold text-amber-400 flex items-center justify-center gap-1">
                            <Mail className="h-3.5 w-3.5" />
                            SMTP Relay
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1">Dispatches email drafts to target managers.</div>
                          <div className="bg-emerald-950/40 text-emerald-400 text-[9px] font-bold py-0.5 rounded mt-2 uppercase">Status: Connected</div>
                        </div>

                        {/* FCM */}
                        <div className="bg-slate-800/80 border border-slate-700 p-3 rounded-xl">
                          <div className="font-bold text-sky-400 flex items-center justify-center gap-1">
                            <Smartphone className="h-3.5 w-3.5" />
                            FCM Push Node
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1">Pushes secure tokens to Android/iOS/Desktop.</div>
                          <div className="bg-emerald-950/40 text-emerald-400 text-[9px] font-bold py-0.5 rounded mt-2 uppercase">Status: Live Gateway</div>
                        </div>

                        {/* In-App */}
                        <div className="bg-slate-800/80 border border-slate-700 p-3 rounded-xl">
                          <div className="font-bold text-purple-400 flex items-center justify-center gap-1">
                            <Bell className="h-3.5 w-3.5" />
                            In-App Socket
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1">Updates browser state feed instantaneously.</div>
                          <div className="bg-emerald-950/40 text-emerald-400 text-[9px] font-bold py-0.5 rounded mt-2 uppercase">Status: Streaming</div>
                        </div>

                      </div>

                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>
      </div>

    </div>
  );
}
