import React, { useEffect, useState } from 'react';
import { Plus, Search, MapPin, Phone, Mail, X, Trash2, Edit2, User, Users as UsersIcon } from 'lucide-react';
import ConfirmationModal from '../components/ConfirmationModal';
import { getCurrentUser, getTenantId } from '../utils/session';

const Branches = () => {
  const user = getCurrentUser();
  const tenantId = getTenantId();
  const isSuperAdmin = user.role === 'super_admin';

  const [branches, setBranches] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [selectedBranchStaff, setSelectedBranchStaff] = useState<any[]>([]);
  const [selectedBranchName, setSelectedBranchName] = useState('');
  const [editingBranch, setEditingBranch] = useState<any>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean, id: number | null }>({
    isOpen: false,
    id: null
  });
  const [formData, setFormData] = useState({
    tenantId: isSuperAdmin ? '' : tenantId,
    name: '',
    address: '',
    city: '',
    phone: '',
    email: '',
    managerId: '',
    isActive: true,
  });

  const fetchManagers = async (tenantId: string) => {
    if (!tenantId) {
      setManagers([]);
      return [];
    }
    const res = await fetch(`/api/users?tenantId=${tenantId}`);
    const data = await res.json();
    setManagers(data);
    return data;
  };

  const fetchBranches = () => {
    setLoading(true);
    const url = isSuperAdmin ? '/api/branches' : `/api/branches?tenantId=${tenantId}`;
    fetch(url)
      .then(res => res.json())
      .then(data => {
        setBranches(data);
        setLoading(false);
      });
  };

  const fmtDate = (value: any) => {
    try {
      const dt = new Date(value);
      if (isNaN(dt.getTime())) return '-';
      return new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).format(dt);
    } catch {
      return '-';
    }
  };

  useEffect(() => {
    fetchBranches();
    if (isSuperAdmin) {
      fetch('/api/tenants')
        .then(res => res.json())
        .then(data => {
          setTenants(data);
          if (data.length > 0) {
            const firstTenantId = data[0].id;
            setFormData(prev => ({ ...prev, tenantId: firstTenantId }));
            fetchManagers(firstTenantId);
          }
        });
    } else {
      fetchManagers(tenantId);
    }
  }, []);

  const handleOpenModal = async (branch: any = null) => {
    if (branch) {
      const tenantId = branch.tenantId || branch.tenantid;
      await fetchManagers(tenantId);
      try {
        const res = await fetch(`/api/branches/${branch.id}`);
        const data = res.ok ? await res.json() : branch;
        setEditingBranch(data);
        setFormData({
          tenantId: data.tenantId ?? data.tenantid,
          name: data.name ?? data.branchname ?? '',
          address: data.address ?? '',
          city: data.city ?? '',
          phone: data.phone ?? '',
          email: data.email ?? '',
          managerId: data.managerId !== undefined && data.managerId !== null
            ? String(data.managerId)
            : (data.managerid !== undefined && data.managerid !== null ? String(data.managerid) : ''),
          isActive: Boolean((data.isActive ?? data.isactive) ?? false),
        });
      } catch {
        setEditingBranch(branch);
        setFormData({
          tenantId: branch.tenantId ?? branch.tenantid,
          name: branch.name ?? branch.branchname ?? '',
          address: branch.address || '',
          city: branch.city || '',
          phone: branch.phone || '',
          email: branch.email || '',
          managerId: branch.managerId !== undefined && branch.managerId !== null
            ? String(branch.managerId)
            : (branch.managerid !== undefined && branch.managerid !== null ? String(branch.managerid) : ''),
          isActive: Boolean((branch.isActive ?? branch.isactive) ?? false),
        });
      }
      setIsModalOpen(true);
    } else {
      const defaultTenantId = isSuperAdmin ? (tenants[0]?.id || '') : tenantId;
      await fetchManagers(defaultTenantId);
      setEditingBranch(null);
      setFormData({
        tenantId: defaultTenantId,
        name: '',
        address: '',
        city: '',
        phone: '',
        email: '',
        managerId: '',
        isActive: true,
      });
      setIsModalOpen(true);
    }
  };

  const handleOpenStaffModal = (branch: any) => {
    setSelectedBranchName(branch.name);
    fetch(`/api/users?tenantId=${tenantId}&branchId=${branch.id}`)
      .then(res => res.json())
      .then(data => {
        setSelectedBranchStaff(data);
        setIsStaffModalOpen(true);
      });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingBranch ? `/api/branches/${editingBranch.id}` : '/api/branches';
    const method = editingBranch ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    if (response.ok) {
      setIsModalOpen(false);
      fetchBranches();
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmation.id) {
      const response = await fetch(`/api/branches/${deleteConfirmation.id}`, { method: 'DELETE' });
      if (response.ok) {
        setDeleteConfirmation({ isOpen: false, id: null });
        fetchBranches();
      }
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Branches</h1>
          <p className="text-slate-500">Manage individual marquee/catering locations.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 hover:bg-indigo-700 transition-colors"
        >
          <Plus size={20} />
          Add Branch
        </button>
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search branches..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Branch</th>
                {isSuperAdmin && <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Tenant</th>}
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Manager</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Audit</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">Loading branches...</td>
                </tr>
              ) : branches.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">No branches found.</td>
                </tr>
              ) : (
                branches.map((branch: any) => (
                  <tr key={branch.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-900">{branch.name}</span>
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <MapPin size={12} /> {branch.city}
                        </span>
                      </div>
                    </td>
                    {isSuperAdmin && (
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-600">{branch.tenantName}</span>
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-slate-700">
                        <User size={14} className="text-slate-400" />
                        {branch.managerName || branch.managername || 'Not Assigned'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-slate-700 flex items-center gap-1">
                          <Phone size={12} className="text-slate-400" /> {branch.phone}
                        </span>
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Mail size={12} className="text-slate-400" /> {branch.email}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        (branch.isActive !== undefined ? branch.isActive : branch.isactive) ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {(branch.isActive !== undefined ? branch.isActive : branch.isactive) ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 text-[11px] text-slate-500">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-700">Created:</span>
                          <span>{branch.createdByName || 'System'}</span>
                          <span>{branch.createdAt ? fmtDate(branch.createdAt) : 'N/A'}</span>
                        </div>
                        {branch.modifiedAt && (
                          <div className="flex flex-col mt-1">
                            <span className="font-medium text-slate-700">Modified:</span>
                            <span>{branch.modifiedByName || 'System'}</span>
                            <span>{fmtDate(branch.modifiedAt)}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleOpenStaffModal(branch)}
                          title="View Branch Staff"
                          className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        >
                          <UsersIcon size={18} />
                        </button>
                        <button 
                          onClick={() => handleOpenModal(branch)}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => setDeleteConfirmation({ isOpen: true, id: branch.id })}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search branches..."
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm shadow-sm"
          />
        </div>
        
        {loading ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-500 font-medium">Loading branches...</p>
          </div>
        ) : branches.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm opacity-50">
            <MapPin size={48} className="mx-auto mb-4 text-slate-300" />
            <p className="text-slate-500 font-medium">No branches found.</p>
          </div>
        ) : (
          branches.map((branch: any) => (
            <div key={branch.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">{branch.name}</h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                    <MapPin size={12} /> {branch.city}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                  (branch.isActive !== undefined ? branch.isActive : branch.isactive) ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-700'
                }`}>
                  {(branch.isActive !== undefined ? branch.isActive : branch.isactive) ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 py-3 border-y border-slate-50">
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <User size={16} className="text-slate-400" />
                  <span className="font-medium">{branch.managerName || branch.managername || 'Not Assigned'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <Phone size={16} className="text-slate-400" />
                  <span>{branch.phone}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <Mail size={16} className="text-slate-400" />
                  <span className="truncate">{branch.email}</span>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-50">
                <div className="grid grid-cols-2 gap-4 text-[11px] text-slate-500">
                  <div className="flex flex-col">
                    <span className="font-medium text-slate-700">Created By</span>
                    <span>{branch.createdByName || 'System'}</span>
                    <span>{branch.createdAt ? fmtDate(branch.createdAt) : 'N/A'}</span>
                  </div>
                  {branch.modifiedAt && (
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-700">Modified By</span>
                      <span>{branch.modifiedByName || 'System'}</span>
                      <span>{fmtDate(branch.modifiedAt)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button 
                  onClick={() => handleOpenStaffModal(branch)}
                  className="flex-1 py-2 bg-emerald-50 text-emerald-600 rounded-lg text-sm font-bold hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2"
                >
                  <UsersIcon size={16} /> Staff
                </button>
                <button 
                  onClick={() => handleOpenModal(branch)}
                  className="flex-1 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-bold hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2"
                >
                  <Edit2 size={16} /> Edit
                </button>
                <button 
                  onClick={() => setDeleteConfirmation({ isOpen: true, id: branch.id })}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">
                {editingBranch ? 'Edit Branch' : 'Add New Branch'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {isSuperAdmin && (
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Tenant</label>
                    <select
                      required
                      value={formData.tenantId}
                      onChange={e => {
                        setFormData({ ...formData, tenantId: e.target.value });
                        fetchManagers(e.target.value);
                      }}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      {tenants.map((tenant: any) => (
                        <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className={`space-y-2 ${!isSuperAdmin ? 'md:col-span-2' : ''}`}>
                  <label className="text-sm font-semibold text-slate-700">Branch Name</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Branch Manager</label>
                  <select
                    required
                    value={formData.managerId}
                    onChange={e => {
                      const managerId = e.target.value;
                      const selectedManager = managers.find((m: any) => String(m.id) === String(managerId));
                      if (selectedManager) {
                        setFormData({ 
                          ...formData, 
                          managerId,
                          phone: selectedManager.contactNo || '',
                          email: selectedManager.email || '',
                          city: selectedManager.city || '',
                          address: selectedManager.address || ''
                        });
                      } else {
                        setFormData({ ...formData, managerId });
                      }
                    }}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="">Select Manager</option>
                    {managers.map((manager: any) => (
                      <option key={manager.id} value={String(manager.id)}>
                        {manager.fullName} ({manager.roleName || 'No Role'})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-semibold text-slate-700">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={e => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Status</label>
                  <div className="flex items-center gap-4 py-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                        className="w-4 h-4 text-indigo-600 rounded"
                      />
                      <span className="text-sm text-slate-700">Active</span>
                    </label>
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-semibold text-slate-700">Address</label>
                  <textarea
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none min-h-[80px]"
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2 border border-slate-200 rounded-xl font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
                >
                  {editingBranch ? 'Save Changes' : 'Create Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isStaffModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-indigo-600 text-white">
              <h2 className="text-xl font-bold">Staff Members - {selectedBranchName}</h2>
              <button onClick={() => setIsStaffModalOpen(false)} className="hover:bg-white/20 p-1 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {selectedBranchStaff.length === 0 ? (
                <div className="text-center py-12 text-slate-500 italic">
                  No staff members assigned to this branch.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedBranchStaff.map((staff: any) => (
                    <div key={staff.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-lg">
                        {staff.fullName?.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 truncate">{staff.fullName}</p>
                        <p className="text-xs text-slate-500 truncate">{staff.roleName}</p>
                        <p className="text-xs text-slate-500 truncate">{staff.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setIsStaffModalOpen(false)}
                className="px-6 py-2 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        title="Delete Branch"
        message="Are you sure you want to delete this branch? This action cannot be undone and all associated data will be permanently removed."
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmation({ isOpen: false, id: null })}
      />
    </div>
  );
};

export default Branches;
