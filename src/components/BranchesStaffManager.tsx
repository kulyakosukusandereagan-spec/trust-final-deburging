import React, { useState, useEffect } from 'react';
import { auth } from '../lib/firebase';
import { loadDeletedStaffFromFirestore, deleteStaffAccountFromFirestore } from '../lib/firebaseSync';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { 
  Plus, 
  MapPin, 
  Phone, 
  Users, 
  ShieldAlert, 
  Check, 
  Trash2, 
  UserPlus, 
  Building2, 
  ShieldCheck, 
  Edit3,
  X,
  Lock
} from 'lucide-react';
import { Tenant, Branch, Staff, StaffRole } from '../types';

interface BranchesStaffManagerProps {
  tenant: Tenant;
  activeRole?: string;
  onUpdateTenant: (updatedTenant: Tenant) => void;
}

export default function BranchesStaffManager({ tenant, activeRole = 'Administrator', onUpdateTenant }: BranchesStaffManagerProps) {
  const [activeSubTab, setActiveSubTab] = useState<'branches' | 'staff'>('branches');
  
  // Modals state
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  
  // Branch form state
  const [branchName, setBranchName] = useState('');
  const [branchAddress, setBranchAddress] = useState('');
  const [branchPhone, setBranchPhone] = useState('');
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  
  // Staff form state
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [staffRole, setStaffRole] = useState<StaffRole>('Pharmacist');
  const [staffBranchId, setStaffBranchId] = useState('');
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);

  const [deletedStaffTick, setDeletedStaffTick] = useState(0);

  useEffect(() => {
    let isMounted = true;
    async function syncDeletedStaff() {
      try {
        const uidToUse = auth?.currentUser?.uid || tenant.id || 'shared-global-tenant-v1';
        const [fsDeleted, apiDelRes] = await Promise.all([
          loadDeletedStaffFromFirestore(uidToUse),
          fetch(`/api/v1/${tenant.id}/staff/deleted`).then(r => r.ok ? r.json() : null).catch(() => null)
        ]);

        let delIds = fsDeleted.ids || [];
        let delEmails = fsDeleted.emails || [];

        if (apiDelRes && apiDelRes.status === 'success' && apiDelRes.data) {
          if (Array.isArray(apiDelRes.data.ids)) {
            apiDelRes.data.ids.forEach((id: string) => { if (id && !delIds.includes(id)) delIds.push(id); });
          }
          if (Array.isArray(apiDelRes.data.emails)) {
            apiDelRes.data.emails.forEach((e: string) => { if (e && !delEmails.includes(e.toLowerCase())) delEmails.push(e.toLowerCase()); });
          }
        }

        localStorage.setItem('junub_deleted_staff_ids', JSON.stringify(delIds));
        localStorage.setItem('junub_deleted_staff_emails', JSON.stringify(delEmails));
        if (isMounted) setDeletedStaffTick(t => t + 1);
      } catch(e) {}
    }
    syncDeletedStaff();

    const handleStaffOrBranchUpdate = () => {
      if (isMounted) setDeletedStaffTick(t => t + 1);
    };
    window.addEventListener('junub_staff_updated', handleStaffOrBranchUpdate);
    window.addEventListener('junub_branch_updated', handleStaffOrBranchUpdate);

    return () => { 
      isMounted = false; 
      window.removeEventListener('junub_staff_updated', handleStaffOrBranchUpdate);
      window.removeEventListener('junub_branch_updated', handleStaffOrBranchUpdate);
    };
  }, [tenant.id]);

  const branches = React.useMemo(() => {
    let delBranchIds: string[] = [];
    try {
      delBranchIds = JSON.parse(localStorage.getItem('junub_deleted_branch_ids') || '[]');
    } catch (e) {}
    return (tenant.branches || []).filter(b => b && b.id && !delBranchIds.includes(b.id));
  }, [tenant.branches, deletedStaffTick]);

  const staff = React.useMemo(() => {
    const staffMap = new Map<string, Staff>();

    // 1. Tenant staff
    (tenant.staff || []).forEach(s => {
      if (s.email) staffMap.set(s.email.toLowerCase(), s);
      else if (s.id) staffMap.set(s.id, s);
    });

    // 2. Master registered staff from localStorage
    try {
      const regStr = localStorage.getItem('junub_registered_staff');
      if (regStr) {
        const regList = JSON.parse(regStr);
        regList.forEach((s: any) => {
          if (s.email) {
            const key = s.email.toLowerCase();
            const existing = staffMap.get(key);
            staffMap.set(key, { ...existing, ...s });
          }
        });
      }
    } catch (e) {}

    // 3. User session staff
    try {
      const sessionStr = localStorage.getItem('junub_pharmacy_user_session');
      if (sessionStr) {
        const session = JSON.parse(sessionStr);
        if (session.email) {
          const key = session.email.toLowerCase();
          if (!staffMap.has(key)) {
            staffMap.set(key, {
              id: session.uid || `staff-session-${Date.now()}`,
              name: session.name || session.email.split('@')[0],
              email: key,
              role: session.role || 'Pharmacist',
              isActive: true,
              isVerified: true,
              branchId: session.branchId || (branches[0] ? branches[0].id : undefined)
            });
          }
        }
      }
    } catch (e) {}

    let delIds: string[] = [];
    let delEmails: string[] = [];
    try {
      delIds = JSON.parse(localStorage.getItem('junub_deleted_staff_ids') || '[]');
      delEmails = JSON.parse(localStorage.getItem('junub_deleted_staff_emails') || '[]');
    } catch (e) {}

    return Array.from(staffMap.values()).filter(s => 
      !s.deletedAt && 
      !delIds.includes(s.id) && 
      !delEmails.includes(s.email?.toLowerCase())
    );
  }, [tenant.staff, branches, deletedStaffTick]);

  const handleStartEditStaff = (member: Staff) => {
    setEditingStaff(member);
    setStaffName(member.name);
    setStaffEmail(member.email);
    setStaffPassword((member as any).password || '');
    setStaffRole(member.role);
    setStaffBranchId(member.branchId || '');
    setShowStaffModal(true);
  };

  const handleSaveEditStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    if (!staffName.trim() || !staffEmail.trim()) return;

    const updatedMember: Staff = {
      ...editingStaff,
      name: staffName,
      email: staffEmail.toLowerCase(),
      password: staffPassword || (editingStaff as any).password || 'Staff123!',
      role: staffRole,
      branchId: staffBranchId || undefined
    };

    const updatedStaff = staff.map(s => 
      s.id === editingStaff.id ? updatedMember : s
    );

    const updatedTenant: Tenant = {
      ...tenant,
      staff: updatedStaff
    };

    onUpdateTenant(updatedTenant);

    // Save directly to Firestore staff collection
    const uidToUse = auth?.currentUser?.uid || 'shared-global-tenant-v1';
    import('../lib/firebaseSync').then(({ saveStaffAccountToFirestore }) => {
      saveStaffAccountToFirestore(uidToUse, updatedMember, tenant.id)
        .catch(err => console.warn("Notice saving updated staff to Firestore:", err));
    });

    // Update active user session if the edited staff is currently logged in
    try {
      const activeSessionStr = localStorage.getItem('junub_pharmacy_user_session');
      if (activeSessionStr) {
        const activeSession = JSON.parse(activeSessionStr);
        if (activeSession.email?.toLowerCase() === updatedMember.email.toLowerCase()) {
          const updatedSession = { ...activeSession, role: updatedMember.role, name: updatedMember.name };
          localStorage.setItem('junub_pharmacy_user_session', JSON.stringify(updatedSession));
        }
      }
    } catch (e) {}

    // Update in local registered staff store
    try {
      const existingRegistered = JSON.parse(localStorage.getItem('junub_registered_staff') || '[]');
      const filtered = existingRegistered.filter((s: any) => s.id !== updatedMember.id && s.email?.toLowerCase() !== updatedMember.email.toLowerCase());
      localStorage.setItem('junub_registered_staff', JSON.stringify([...filtered, updatedMember]));
      window.dispatchEvent(new Event('junub_staff_updated'));
    } catch(e) {}

    // Send to backend server API & Server API Gateway Proxy
    fetch(`/api/v1/tenants/${tenant.id}/staff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedMember)
    }).catch(err => console.warn("Notice syncing updated staff to backend:", err));

    fetch('/api/staff/update-role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        staffId: updatedMember.id,
        tenantId: tenant.id,
        newRole: updatedMember.role,
        updatedBy: auth?.currentUser?.email || 'admin'
      })
    }).catch(err => console.warn("Notice updating role via API Gateway:", err));

    closeStaffModal();
  };

  const closeStaffModal = () => {
    setStaffName('');
    setStaffEmail('');
    setStaffPassword('');
    setShowPassword(false);
    setStaffRole('Pharmacist');
    setStaffBranchId('');
    setEditingStaff(null);
    setShowStaffModal(false);
  };

  // Start editing a branch clinic
  const handleStartEditBranch = (branch: Branch) => {
    setEditingBranch(branch);
    setBranchName(branch.name);
    setBranchAddress(branch.address || '');
    setBranchPhone(branch.phone || '');
    setShowBranchModal(true);
  };

  // Save edited branch clinic
  const handleSaveEditBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBranch || !branchName.trim()) return;

    const updatedBranches = branches.map(b => 
      b.id === editingBranch.id 
        ? { ...b, name: branchName, address: branchAddress || 'N/A', phone: branchPhone || 'N/A' }
        : b
    );

    onUpdateTenant({
      ...tenant,
      branches: updatedBranches
    });

    closeBranchModal();
  };

  const closeBranchModal = () => {
    setBranchName('');
    setBranchAddress('');
    setBranchPhone('');
    setEditingBranch(null);
    setShowBranchModal(false);
  };

  // Register New Branch Clinic
  const handleAddBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchName.trim()) return;

    // Strictly enforce maximum 3 branches limit for the pharmacy
    if (branches.length >= 3) {
      alert(`Maximum Branch Limit Reached! The pharmacy supports a maximum of 3 branches total (Main Branch + up to 2 Secondary Branches).`);
      return;
    }

    const newBranch: Branch = {
      id: `branch-${Date.now()}`,
      name: branchName,
      address: branchAddress || 'N/A',
      phone: branchPhone || 'N/A',
      isActive: true,
      registeredAt: new Date().toISOString()
    };

    const updatedTenant: Tenant = {
      ...tenant,
      maxPharmacies: 3,
      activePharmacies: Math.min(3, (tenant.activePharmacies || 0) + 1),
      branches: [...branches, newBranch]
    };

    onUpdateTenant(updatedTenant);
    closeBranchModal();
  };

  // Logo PNG Upload Handler
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('png') && !file.type.includes('image')) {
      alert('Please select a PNG logo image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Logo = event.target?.result as string;
      onUpdateTenant({
        ...tenant,
        logoUrl: base64Logo
      });
    };
    reader.readAsDataURL(file);
  };

  // Register New Staff Member & Role (Administrator Only)
  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = staffEmail.trim().toLowerCase();
    if (!staffName.trim() || !cleanEmail) return;

    // 1. Mandatory Branch Selection Check
    if (!staffBranchId) {
      alert('Branch Assignment Required! Please select a pharmacy branch for this staff member (e.g. Main Branch or Branch 2).');
      return;
    }

    // 2. Strict Unique Email Enforcement (No duplicate accounts per email)
    const existingMatch = staff.find(s => s.email?.toLowerCase() === cleanEmail);
    if (existingMatch) {
      alert(`Account Registration Blocked! An account with the email address "${cleanEmail}" is already registered to Trust Pharmacy. Strictly one account is allowed per email address.`);
      return;
    }

    // Check plan limits
    const maxUsers = tenant.maxUsers || 50;
    if (staff.length >= maxUsers) {
      alert(`Staff Limit Reached! Your license supports a maximum of ${maxUsers} staff members.`);
      return;
    }

    const isAdminOrOwner = ['Master Admin', 'Administrator'].includes(activeRole);

    const newStaff: Staff = {
      id: `staff-${Date.now()}`,
      name: staffName.trim(),
      email: cleanEmail,
      password: staffPassword || 'Staff123!',
      role: staffRole,
      isActive: true,
      isVerified: isAdminOrOwner ? true : false,
      branchId: staffBranchId
    };

    const updatedTenant: Tenant = {
      ...tenant,
      activeUsers: (tenant.activeUsers || 0) + 1,
      staff: [...staff, newStaff]
    };

    onUpdateTenant(updatedTenant);

    // Save directly to Firestore staff collection online so staff can log in from any device instantly
    const uidToUse = auth?.currentUser?.uid || 'shared-global-tenant-v1';
    import('../lib/firebaseSync').then(({ saveStaffAccountToFirestore }) => {
      saveStaffAccountToFirestore(uidToUse, newStaff, tenant.id)
        .catch(err => console.warn("Notice saving staff to Firestore:", err));
      saveStaffAccountToFirestore('shared-global-tenant-v1', newStaff, 'tenant-downtown')
        .catch(err => console.warn("Notice saving staff to global Firestore collection:", err));
    });

    // Save to master standalone local registered staff store
    try {
      const existingRegistered = JSON.parse(localStorage.getItem('junub_registered_staff') || '[]');
      const filtered = existingRegistered.filter((s: any) => s.email?.toLowerCase() !== newStaff.email.toLowerCase());
      localStorage.setItem('junub_registered_staff', JSON.stringify([...filtered, newStaff]));
    } catch(e) {}

    // Send to backend server API
    fetch(`/api/v1/tenants/${tenant.id}/staff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newStaff)
    }).catch(err => console.warn("Notice syncing staff to backend:", err));

    // Fire-and-forget background Firebase Auth account creation
    if (auth && staffEmail) {
      createUserWithEmailAndPassword(auth, staffEmail.toLowerCase(), staffPassword || 'Staff123!')
        .catch(() => {
          // Account might already exist in Firebase Auth or network offline
        });
    }

    // Reset form
    setStaffName('');
    setStaffEmail('');
    setStaffRole('Pharmacist');
    setStaffBranchId('');
    setShowStaffModal(false);
  };

  // Toggle branch active state
  const toggleBranchActive = (branchId: string) => {
    const updatedBranches = branches.map(b => 
      b.id === branchId ? { ...b, isActive: !b.isActive } : b
    );
    
    onUpdateTenant({
      ...tenant,
      branches: updatedBranches
    });
  };

  // Verify staff member
  const handleVerifyStaff = (staffId: string) => {
    const updatedStaff = staff.map(s => 
      s.id === staffId ? { ...s, isVerified: true } : s
    );
    
    onUpdateTenant({
      ...tenant,
      staff: updatedStaff
    });
  };

  // Toggle staff active state
  const toggleStaffActive = (staffId: string) => {
    const updatedStaff = staff.map(s => 
      s.id === staffId ? { ...s, isActive: !s.isActive } : s
    );
    
    onUpdateTenant({
      ...tenant,
      staff: updatedStaff
    });
  };

  // Permanently remove branch clinic
  const handleRemoveBranch = (branchId: string) => {
    const targetBranch = branches.find(b => b.id === branchId);
    if (window.confirm(`Are you sure you want to permanently delete "${targetBranch?.name || 'this branch'}"? Once deleted, it will never appear anywhere.`)) {
      try {
        const delBranchIds = JSON.parse(localStorage.getItem('junub_deleted_branch_ids') || '[]');
        if (branchId && !delBranchIds.includes(branchId)) delBranchIds.push(branchId);
        localStorage.setItem('junub_deleted_branch_ids', JSON.stringify(delBranchIds));
        window.dispatchEvent(new Event('junub_branch_updated'));
      } catch(e) {}

      const updatedBranches = branches.filter(b => b.id !== branchId);
      const updatedTenant: Tenant = {
        ...tenant,
        activePharmacies: Math.max(0, (tenant.activePharmacies || 1) - 1),
        branches: updatedBranches
      };

      onUpdateTenant(updatedTenant);

      const uidToUse = auth?.currentUser?.uid || 'shared-global-tenant-v1';
      import('../lib/firebaseSync').then(({ saveDeletedBranchToFirestore, saveTenantToFirestore }) => {
        saveDeletedBranchToFirestore(uidToUse, branchId).catch(err => console.warn(err));
        saveTenantToFirestore(uidToUse, updatedTenant).catch(err => console.warn(err));
      });
    }
  };

  // Permanently remove staff member
  const handleRemoveStaff = (staffId: string) => {
    const removedMember = staff.find(s => s.id === staffId);
    if (window.confirm(`Are you sure you want to permanently delete staff account "${removedMember?.name || removedMember?.email || 'this staff member'}"? Once deleted, it will never appear anywhere.`)) {
      const updatedStaff = staff.filter(s => s.id !== staffId && s.email?.toLowerCase() !== removedMember?.email?.toLowerCase());
      
      // Save to global deleted staff blacklist in localStorage so deleted staff NEVER reappears
      try {
        const delIds = JSON.parse(localStorage.getItem('junub_deleted_staff_ids') || '[]');
        const delEmails = JSON.parse(localStorage.getItem('junub_deleted_staff_emails') || '[]');

        if (staffId && !delIds.includes(staffId)) delIds.push(staffId);
        if (removedMember?.id && !delIds.includes(removedMember.id)) delIds.push(removedMember.id);
        if (removedMember?.email && !delEmails.includes(removedMember.email.toLowerCase())) {
          delEmails.push(removedMember.email.toLowerCase());
        }

        localStorage.setItem('junub_deleted_staff_ids', JSON.stringify(delIds));
        localStorage.setItem('junub_deleted_staff_emails', JSON.stringify(delEmails));

        const existingRegistered = JSON.parse(localStorage.getItem('junub_registered_staff') || '[]');
        const filtered = existingRegistered.filter((s: any) => 
          s.id !== staffId && s.email?.toLowerCase() !== removedMember?.email?.toLowerCase()
        );
        localStorage.setItem('junub_registered_staff', JSON.stringify(filtered));
        window.dispatchEvent(new Event('junub_staff_updated'));
      } catch(e) {}

      const updatedTenant: Tenant = {
        ...tenant,
        activeUsers: Math.max(0, (tenant.activeUsers || 1) - 1),
        staff: updatedStaff
      };

      onUpdateTenant(updatedTenant);

      const uidToUse = auth?.currentUser?.uid || 'shared-global-tenant-v1';
      import('../lib/firebaseSync').then(({ deleteStaffAccountFromFirestore }) => {
        deleteStaffAccountFromFirestore(uidToUse, staffId, removedMember?.email)
          .catch(err => console.warn("Notice deleting staff from Firestore:", err));
      });
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Overview stats & Pharmacy PNG Logo Branding */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Clinic Branches</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-900">{branches.length}</span>
              <span className="text-xs font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-100">Max 3 Branches</span>
            </div>
          </div>
          <div className="p-3.5 bg-blue-50 text-blue-500 rounded-2xl">
            <Building2 className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Active Staff</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-900">{staff.length}</span>
              <span className="text-xs font-semibold text-slate-400">/ {tenant.maxUsers || 10} limit</span>
            </div>
          </div>
          <div className="p-3.5 bg-indigo-50 text-indigo-500 rounded-2xl">
            <Users className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Current License</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-black text-slate-900 capitalize">{tenant.plan}</span>
              <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded text-[9px] font-extrabold">Licensed</span>
            </div>
          </div>
          <div className="p-3.5 bg-emerald-50 text-emerald-500 rounded-2xl">
            <ShieldCheck className="h-5 w-5" />
          </div>
        </div>

        {/* PNG Logo Branding Upload Card */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-3xl border border-slate-700 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-sky-400">Pharmacy Branding Logo</span>
              <h4 className="text-xs font-bold text-slate-200 mt-0.5">Upload Official PNG Logo</h4>
            </div>
            {tenant.logoUrl ? (
              <img src={tenant.logoUrl} alt="Pharmacy Logo" className="w-10 h-10 object-contain rounded-lg bg-white p-1 border border-slate-600" />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sky-400 text-xs">
                PNG
              </div>
            )}
          </div>
          <div className="mt-3">
            <label className="w-full px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-white font-extrabold text-[11px] rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm">
              <span>{tenant.logoUrl ? 'Change PNG Logo' : 'Upload PNG Logo'}</span>
              <input type="file" accept="image/png, image/*" onChange={handleLogoUpload} className="hidden" />
            </label>
          </div>
        </div>
      </div>

      {/* Tabs selector */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveSubTab('branches')}
          className={`px-6 py-3 text-xs font-bold transition-all cursor-pointer border-b-2 ${
            activeSubTab === 'branches'
              ? 'border-sky-500 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Branch Clinics
        </button>
        <button
          onClick={() => setActiveSubTab('staff')}
          className={`px-6 py-3 text-xs font-bold transition-all cursor-pointer border-b-2 ${
            activeSubTab === 'staff'
              ? 'border-sky-500 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Staff & Role Assignment
        </button>
      </div>

      {/* Branches Panel */}
      {activeSubTab === 'branches' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Registered Branches</h3>
              <p className="text-[11px] text-slate-500">Decommission, activate, or register clinical locations.</p>
            </div>
            {branches.length >= 3 ? (
              <div className="bg-slate-100 text-slate-500 border border-slate-200 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-not-allowed">
                <span>🔒 Max 3 Branches Reached</span>
              </div>
            ) : (
              <button
                onClick={() => setShowBranchModal(true)}
                className="bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Register New Branch ({branches.length}/3)
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {branches.map(branch => (
              <div 
                key={branch.id} 
                className={`bg-white p-5 rounded-2xl border transition-all ${
                  branch.isActive ? 'border-slate-200/80' : 'border-slate-100 bg-slate-50/40 opacity-75'
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-sm">{branch.name}</h4>
                    <span className="text-[9px] font-bold text-slate-400">ID: {branch.id}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase ${
                    branch.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {branch.isActive ? 'Operating' : 'Deactivated'}
                  </span>
                </div>

                <div className="space-y-2.5 my-4 text-xs font-medium text-slate-600">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>{branch.address}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>{branch.phone}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleBranchActive(branch.id)}
                      className="text-[10px] font-bold text-sky-600 hover:text-sky-700 hover:underline cursor-pointer"
                    >
                      {branch.isActive ? 'Deactivate' : 'Activate Branch'}
                    </button>
                    <button
                      onClick={() => handleStartEditBranch(branch)}
                      className="text-[11px] font-extrabold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100"
                      title="Edit Branch Location Details"
                    >
                      <Edit3 className="h-3 w-3" />
                      <span>Edit</span>
                    </button>
                  </div>
                  <button
                    onClick={() => handleRemoveBranch(branch.id)}
                    className="text-red-500 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                    title="Delete Branch"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {branches.length === 0 && (
              <div className="col-span-full bg-slate-50 border border-dashed border-slate-200 text-center py-12 rounded-2xl">
                <Building2 className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-500">No Branch Clinics Registered</p>
                <p className="text-[11px] text-slate-400 mt-1">Register branches to assign pharmacists and cashiers.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Staff Panel */}
      {activeSubTab === 'staff' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Staff Registry & Role Allocation</h3>
              <p className="text-[11px] text-slate-500">Assign roles, emails, and clinic branches to your team.</p>
            </div>
            <button
              onClick={() => setShowStaffModal(true)}
              className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <UserPlus className="h-4 w-4" />
              Register New Staff
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-3.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Full Name</th>
                    <th className="px-6 py-3.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Gmail / Email Address</th>
                    <th className="px-6 py-3.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Assigned Role</th>
                    <th className="px-6 py-3.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Assigned Branch Clinic</th>
                    <th className="px-6 py-3.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Password (Admin View)</th>
                    <th className="px-6 py-3.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Account Status</th>
                    <th className="px-6 py-3.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Admin Verification</th>
                    <th className="px-6 py-3.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {staff.map(member => {
                    const assignedBranch = branches.find(b => b.id === member.branchId);
                    const isAdminOrOwner = ['Master Admin', 'Administrator'].includes(activeRole);
                    const isVerified = member.isVerified !== false;

                    return (
                      <tr key={member.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-extrabold text-slate-900">{member.name}</td>
                        <td className="px-6 py-4 font-mono text-slate-600">{member.email}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-xl text-[9px] font-black tracking-wider uppercase ${
                            member.role === 'Administrator' ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' :
                            'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}>
                            {member.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-700">
                          {assignedBranch ? assignedBranch.name : 'Universal / All Branches'}
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-xs px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-800 rounded-lg font-bold">
                            {(member as any).password || 'Staff123!'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => toggleStaffActive(member.id)}
                            className={`px-2.5 py-1 rounded-full text-[9px] font-black tracking-wide cursor-pointer transition-colors ${
                              member.isActive 
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200' 
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200'
                            }`}
                          >
                            {member.isActive ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          {isVerified ? (
                            <span className="px-2.5 py-1 rounded-full text-[9px] font-black tracking-wide bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 w-fit">
                              <ShieldCheck className="h-3 w-3" /> Certified
                            </span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-1 rounded-full text-[9px] font-black tracking-wide bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                                <ShieldAlert className="h-3 w-3" /> Unverified
                              </span>
                              {isAdminOrOwner && (
                                <button
                                  onClick={() => handleVerifyStaff(member.id)}
                                  className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[9px] rounded-lg transition-all cursor-pointer flex items-center gap-1"
                                >
                                  <Check className="h-3 w-3" /> Verify Staff
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 flex items-center gap-2">
                          {isAdminOrOwner ? (
                            <>
                              <button
                                onClick={() => handleStartEditStaff(member)}
                                className="text-indigo-500 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-indigo-50 transition-colors cursor-pointer"
                                title="Edit Staff Member / Role"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleRemoveStaff(member.id)}
                                className="text-red-500 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                                title="Delete Staff"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-bold italic">Admin Restricted</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {staff.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-slate-400 font-medium font-mono">
                        No team members registered under this pharmacy domain.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Register / Edit Branch Modal */}
      {showBranchModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-sky-500" />
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                  {editingBranch ? 'Edit Branch Clinic Location' : 'Register Branch Clinic'}
                </h4>
              </div>
              <button 
                onClick={closeBranchModal}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={editingBranch ? handleSaveEditBranch : handleAddBranch} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide block">Branch Clinic Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Airport Road Junction Branch"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide block">Location Address</label>
                <input
                  type="text"
                  placeholder="e.g. Building 12, Airport Road, Juba"
                  value={branchAddress}
                  onChange={(e) => setBranchAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide block">Contact Phone Number</label>
                <input
                  type="text"
                  placeholder="e.g. +211 922 152 427"
                  value={branchPhone}
                  onChange={(e) => setBranchPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs py-2.5 rounded-xl transition-colors cursor-pointer"
              >
                {editingBranch ? 'Save Branch Changes' : 'Create Branch Location'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Register New Staff Modal */}
      {showStaffModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-indigo-500" />
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                  {editingStaff ? 'Edit Staff Member Details' : 'Register Staff Member'}
                </h4>
              </div>
              <button 
                onClick={closeStaffModal}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={editingStaff ? handleSaveEditStaff : handleAddStaff} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide block">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Ronald Maker"
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide block">Gmail / Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. maker@gmail.com"
                  value={staffEmail}
                  onChange={(e) => setStaffEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
                <p className="text-[9px] text-slate-400">Required for Firebase domain role allocation.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide block">Staff Account Password *</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required={!editingStaff}
                    placeholder="Enter staff login password"
                    value={staffPassword}
                    onChange={(e) => setStaffPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-indigo-600 hover:underline"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                <p className="text-[9px] text-slate-400">Set initial password for staff system access.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide block">Assign Security Role *</label>
                <select
                  value={staffRole}
                  onChange={(e) => setStaffRole(e.target.value as StaffRole)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  <option value="Administrator">Administrator (General Pharmacy &amp; All Branches Admin)</option>
                  <option value="Pharmacist">Pharmacist (Clinical Sales &amp; Dispensing)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide block">Assign Branch Clinic Clinic Location</label>
                <select
                  value={staffBranchId}
                  onChange={(e) => setStaffBranchId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  <option value="">Universal / All Branches</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-xs py-2.5 rounded-xl transition-colors cursor-pointer"
              >
                {editingStaff ? 'Save Staff Changes' : 'Register Staff Account'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
