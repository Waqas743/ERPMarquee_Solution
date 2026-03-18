import { Pagination } from '../components/Pagination';
import React, { useEffect, useState } from 'react';
import { Plus, Search, MoreVertical, MapPin, Phone, Mail, X, Trash2, Edit2, User, CreditCard } from 'lucide-react';
import ConfirmationModal from '../components/ConfirmationModal';

const Tenants = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [tenants, setTenants] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<any>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean, id: number | null }>({
    isOpen: false,
    id: null
  });
  const [formData, setFormData] = useState({
    name: '',
    type: 'Hall',
    registrationNo: '',
    ntn: '',
    contactPersonName: '',
    contactPhone: '',
    email: '',
    address: '',
    city: '',
    country: 'Pakistan',
    subscriptionPlanId: '',
    subscriptionStartDate: '',
    subscriptionEndDate: '',
    password: '',
    username: '',
    logoUrl: '',
    domain: '',
    isSuspended: false,
    isActive: true,
    maxBranchesAllowed: 1,
    maxUsersAllowed: 5,
  });

  const fetchTenants = () => {
    setLoading(true);
    fetch('/api/tenants')
      .then(res => res.json())
      .then(data => {
        setTenants(data);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchTenants();
    fetch('/api/plans')
      .then(res => res.json())
      .then(data => {
        setPlans(data);
        if (data.length > 0) {
          setFormData(prev => ({ ...prev, subscriptionPlanId: data[0].id }));
        }
      });
  }, []);

  const handleOpenModal = (tenant: any = null) => {
    if (tenant) {
      setEditingTenant(tenant);
      setFormData({
        name: tenant.name,
        type: tenant.type,
        registrationNo: tenant.registrationNo || '',
        ntn: tenant.ntn || '',
        contactPersonName: tenant.contactPersonName || '',
        contactPhone: tenant.contactPhone || '',
        email: tenant.email || '',
        address: tenant.address || '',
        city: tenant.city || '',
        country: tenant.country || 'Pakistan',
        subscriptionPlanId: tenant.subscriptionPlanId || '',
        subscriptionStartDate: tenant.subscriptionStartDate ? tenant.subscriptionStartDate.split('T')[0] : '',
        subscriptionEndDate: tenant.subscriptionEndDate ? tenant.subscriptionEndDate.split('T')[0] : '',
        password: tenant.password || '',
        username: tenant.username || '',
        logoUrl: tenant.logoUrl || '',
        domain: tenant.domain || '',
        isSuspended: !!tenant.isSuspended,
        isActive: !!tenant.isActive,
        maxBranchesAllowed: tenant.maxBranchesAllowed || 1,
        maxUsersAllowed: tenant.maxUsersAllowed || 5,
      });
      setLogoFile(null);
    } else {
      setEditingTenant(null);
      setFormData({
        name: '',
        type: 'Hall',
        registrationNo: '',
        ntn: '',
        contactPersonName: '',
        contactPhone: '',
        email: '',
        address: '',
        city: '',
        country: 'Pakistan',
        subscriptionPlanId: plans[0]?.id || '',
        subscriptionStartDate: new Date().toISOString().split('T')[0],
        subscriptionEndDate: '',
        password: '',
        username: '',
        logoUrl: '',
        domain: '',
        isSuspended: false,
        isActive: true,
        maxBranchesAllowed: 1,
        maxUsersAllowed: 5,
      });
      setLogoFile(null);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingTenant ? `/api/tenants/${editingTenant.id}` : '/api/tenants';
    const method = 'POST';

    const data = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      data.append(key, String(value));
    });
    if (logoFile) {
      data.append('logo', logoFile);
    }

    try {
      const response = await fetch(url, {
        method,
        body: data,
      });

      if (response.ok) {
        setIsModalOpen(false);
        fetchTenants();
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.message || 'Failed to save tenant'}`);
      }
    } catch (error) {
      console.error('Submit error:', error);
      alert('An unexpected error occurred. Please try again.');
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmation.id) {
      const response = await fetch(`/api/tenants/${deleteConfirmation.id}`, { method: 'DELETE' });
      if (response.ok) {
        setDeleteConfirmation({ isOpen: false, id: null });
        fetchTenants();
      }
    }
  };

  
  const paginatedItems = tenants.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Tenants</h1>
          <p className="text-sm sm:text-base text-slate-500">Manage your marquee and catering clients.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors w-full sm:w-auto"
        >
          <Plus size={20} />
          Add Tenant
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search tenants..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Tenant</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Contact Person</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Contact Info</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Password</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Plan</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Audit</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-500">Loading tenants...</td>
                </tr>
              ) : tenants.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-500">No tenants found.</td>
                </tr>
              ) : (
                paginatedItems.map((tenant: any) => (
                  <tr key={tenant.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {tenant.logoUrl ? (
                          <img 
                            src={tenant.logoUrl} 
                            alt={tenant.name} 
                            className="w-10 h-10 rounded-lg object-cover border border-slate-200"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                            {tenant.name.charAt(0)}
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-900">{tenant.name}</span>
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <MapPin size={12} /> {tenant.city}, {tenant.country}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                        tenant.type === 'Both' ? 'bg-purple-100 text-purple-700' :
                        tenant.type === 'Hall' ? 'bg-blue-100 text-blue-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {tenant.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-700">{tenant.contactPersonName || 'N/A'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm text-slate-700 flex items-center gap-1">
                          <Phone size={14} className="text-slate-400" /> {tenant.contactPhone}
                        </span>
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Mail size={14} className="text-slate-400" /> {tenant.email}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        {tenant.password || '********'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-700">
                      {tenant.planName || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold text-center ${
                          tenant.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {tenant.isActive ? 'Active' : 'Inactive'}
                        </span>
                        {tenant.isSuspended && (
                          <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 text-center">
                            Suspended
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 text-[11px] text-slate-500">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-700">Created:</span>
                          <span>{tenant.createdByName || 'System'}</span>
                          <span>{tenant.createdAt ? new Date(tenant.createdAt).toLocaleDateString() : 'N/A'}</span>
                        </div>
                        {tenant.modifiedAt && (
                          <div className="flex flex-col mt-1">
                            <span className="font-medium text-slate-700">Modified:</span>
                            <span>{tenant.modifiedByName || 'System'}</span>
                            <span>{new Date(tenant.modifiedAt).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleOpenModal(tenant)}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => setDeleteConfirmation({ isOpen: true, id: tenant.id })}
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

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading tenants...</div>
          ) : tenants.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No tenants found.</div>
          ) : (
            paginatedItems.map((tenant: any) => (
              <div key={tenant.id} className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {tenant.logoUrl ? (
                      <img 
                        src={tenant.logoUrl} 
                        alt={tenant.name} 
                        className="w-12 h-12 rounded-xl object-cover border border-slate-200"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-lg">
                        {tenant.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-slate-900">{tenant.name}</h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <MapPin size={12} /> {tenant.city}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleOpenModal(tenant)}
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => setDeleteConfirmation({ isOpen: true, id: tenant.id })}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Type</p>
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold mt-1 ${
                      tenant.type === 'Both' ? 'bg-purple-100 text-purple-700' :
                      tenant.type === 'Hall' ? 'bg-blue-100 text-blue-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {tenant.type}
                    </span>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        tenant.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {tenant.isActive ? 'Active' : 'Inactive'}
                      </span>
                      {tenant.isSuspended && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
                          Suspended
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-50">
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <User size={14} className="text-slate-400" />
                    <span className="font-medium">{tenant.contactPersonName || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Phone size={14} className="text-slate-400" />
                    {tenant.contactPhone}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Mail size={14} className="text-slate-400" />
                    <span className="truncate">{tenant.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <CreditCard size={14} className="text-slate-400" />
                    <span className="font-medium text-indigo-600">{tenant.planName || 'N/A'}</span>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-50">
                  <div className="grid grid-cols-2 gap-4 text-[11px] text-slate-500">
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-700">Created By</span>
                      <span>{tenant.createdByName || 'System'}</span>
                      <span>{tenant.createdAt ? new Date(tenant.createdAt).toLocaleDateString() : 'N/A'}</span>
                    </div>
                    {tenant.modifiedAt && (
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-700">Modified By</span>
                        <span>{tenant.modifiedByName || 'System'}</span>
                        <span>{new Date(tenant.modifiedAt).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">
                {editingTenant ? 'Edit Tenant' : 'Add New Tenant'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Tenant Name</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Business Type</label>
                  <select
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="Hall">Hall</option>
                    <option value="Catering">Catering</option>
                    <option value="Both">Both</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Contact Person</label>
                  <input
                    type="text"
                    value={formData.contactPersonName}
                    onChange={e => setFormData({ ...formData, contactPersonName: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Phone</label>
                  <input
                    type="text"
                    value={formData.contactPhone}
                    onChange={e => setFormData({ ...formData, contactPhone: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-semibold text-slate-700">Email Address</label>
                  <input
                    required
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
                  <label className="text-sm font-semibold text-slate-700">Subscription Plan</label>
                  <select
                    value={formData.subscriptionPlanId}
                    onChange={e => setFormData({ ...formData, subscriptionPlanId: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    {plans.map((plan: any) => (
                      <option key={plan.id} value={plan.id}>{plan.name} - ${plan.priceMonthly}/mo</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Subscription Start Date</label>
                  <input
                    type="date"
                    value={formData.subscriptionStartDate}
                    onChange={e => setFormData({ ...formData, subscriptionStartDate: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Subscription End Date</label>
                  <input
                    type="date"
                    value={formData.subscriptionEndDate}
                    onChange={e => setFormData({ ...formData, subscriptionEndDate: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Password</label>
                  <input
                    type="text"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Enter tenant password"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Admin Username</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Initial admin username"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Registration No</label>
                  <input
                    type="text"
                    value={formData.registrationNo}
                    onChange={e => setFormData({ ...formData, registrationNo: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">NTN</label>
                  <input
                    type="text"
                    value={formData.ntn}
                    onChange={e => setFormData({ ...formData, ntn: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Domain</label>
                  <input
                    type="text"
                    value={formData.domain}
                    onChange={e => setFormData({ ...formData, domain: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="example.com"
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
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isSuspended}
                        onChange={e => setFormData({ ...formData, isSuspended: e.target.checked })}
                        className="w-4 h-4 text-red-600 rounded"
                      />
                      <span className="text-sm text-slate-700">Suspended</span>
                    </label>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Max Branches</label>
                  <input
                    type="number"
                    value={formData.maxBranchesAllowed}
                    onChange={e => setFormData({ ...formData, maxBranchesAllowed: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Max Users</label>
                  <input
                    type="number"
                    value={formData.maxUsersAllowed}
                    onChange={e => setFormData({ ...formData, maxUsersAllowed: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-semibold text-slate-700">Address</label>
                  <textarea
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none min-h-[80px]"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-semibold text-slate-700">Tenant Logo</label>
                  <div className="flex items-center gap-4">
                    {formData.logoUrl && !logoFile && (
                      <img 
                        src={formData.logoUrl} 
                        alt="Current Logo" 
                        className="w-16 h-16 rounded-lg object-cover border border-slate-200"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    {logoFile && (
                      <div className="w-16 h-16 rounded-lg bg-slate-100 flex items-center justify-center text-xs text-slate-500 border border-dashed border-slate-300">
                        New File
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => setLogoFile(e.target.files?.[0] || null)}
                      className="flex-1 text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                    />
                  </div>
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
                  {editingTenant ? 'Save Changes' : 'Create Tenant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        title="Delete Tenant"
        message="Are you sure you want to delete this tenant? This action cannot be undone and all associated data will be permanently removed."
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmation({ isOpen: false, id: null })}
      />
    
      <Pagination 
        currentPage={currentPage} 
        totalItems={tenants.length} 
        itemsPerPage={ITEMS_PER_PAGE} 
        onPageChange={setCurrentPage} 
      />
    </div>
  );
};

export default Tenants;
