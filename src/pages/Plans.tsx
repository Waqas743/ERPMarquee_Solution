import React, { useEffect, useState } from 'react';
import { Check, ShieldCheck, Plus, X, Edit2, Trash2 } from 'lucide-react';
import ConfirmationModal from '../components/ConfirmationModal';

const Plans = () => {
  const [plans, setPlans] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean, id: number | null }>({
    isOpen: false,
    id: null
  });
  const [formData, setFormData] = useState({
    name: '',
    priceMonthly: 0,
    priceYearly: 0,
    maxBranches: 1,
    maxUsers: 5,
    storageLimitGB: 5,
    featureJson: '{}',
  });

  const fetchPlans = () => {
    fetch('/api/plans')
      .then(res => res.json())
      .then(data => setPlans(data));
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
    fetchPlans();
  }, []);

  const handleOpenModal = (plan: any = null) => {
    if (plan) {
      setEditingPlan(plan);
      setFormData({
        name: plan.name,
        priceMonthly: plan.priceMonthly,
        priceYearly: plan.priceYearly,
        maxBranches: plan.maxBranches,
        maxUsers: plan.maxUsers,
        storageLimitGB: plan.storageLimitGB,
        featureJson: plan.featureJson || '{}',
      });
    } else {
      setEditingPlan(null);
      setFormData({
        name: '',
        priceMonthly: 0,
        priceYearly: 0,
        maxBranches: 1,
        maxUsers: 5,
        storageLimitGB: 5,
        featureJson: '{}',
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingPlan ? `/api/plans/${editingPlan.id}` : '/api/plans';
    const method = editingPlan ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    if (response.ok) {
      setIsModalOpen(false);
      fetchPlans();
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmation.id) {
      const response = await fetch(`/api/plans/${deleteConfirmation.id}`, { method: 'DELETE' });
      if (response.ok) {
        setDeleteConfirmation({ isOpen: false, id: null });
        fetchPlans();
      }
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Subscription Plans</h1>
          <p className="text-sm sm:text-base text-slate-500">Configure and manage available subscription tiers.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors w-full sm:w-auto"
        >
          <Plus size={20} />
          Add Plan
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
        {plans.map((plan: any) => (
          <div key={plan.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col group">
            <div className="p-8 border-b border-slate-100 relative">
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => handleOpenModal(plan)}
                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={() => setDeleteConfirmation({ isOpen: true, id: plan.id })}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">{plan.name}</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-slate-900">${plan.priceMonthly}</span>
                <span className="text-slate-500 text-sm">/month</span>
              </div>
            </div>
            
            <div className="p-8 flex-1 space-y-4">
              <div className="flex items-center gap-3 text-slate-700">
                <Check size={20} className="text-emerald-500" />
                <span>Up to {plan.maxBranches} Branches</span>
              </div>
              <div className="flex items-center gap-3 text-slate-700">
                <Check size={20} className="text-emerald-500" />
                <span>{plan.maxUsers} User Accounts</span>
              </div>
              <div className="flex items-center gap-3 text-slate-700">
                <Check size={20} className="text-emerald-500" />
                <span>{plan.storageLimitGB}GB Cloud Storage</span>
              </div>
              <div className="flex items-center gap-3 text-slate-700">
                <ShieldCheck size={20} className="text-indigo-500" />
                <span>Premium Support</span>
              </div>
            </div>

            <div className="p-8 bg-slate-50 flex flex-col gap-4">
              <button 
                onClick={() => handleOpenModal(plan)}
                className="w-full py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 hover:bg-slate-100 transition-colors"
              >
                Edit Plan
              </button>

              <div className="space-y-2 pt-2 border-t border-slate-200">
                <div className="grid grid-cols-2 gap-4 text-[11px] text-slate-500">
                  <div className="flex flex-col">
                    <span className="font-medium text-slate-700">Created By</span>
                    <span>{plan.createdByName || 'System'}</span>
                    <span>{plan.createdAt ? fmtDate(plan.createdAt) : 'N/A'}</span>
                  </div>
                  {plan.modifiedAt && (
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-700">Modified By</span>
                      <span>{plan.modifiedByName || 'System'}</span>
                      <span>{fmtDate(plan.modifiedAt)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">
                {editingPlan ? 'Edit Plan' : 'Add New Plan'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Plan Name</label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Monthly Price ($)</label>
                  <input
                    type="number"
                    value={formData.priceMonthly}
                    onChange={e => setFormData({ ...formData, priceMonthly: Number(e.target.value) })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Yearly Price ($)</label>
                  <input
                    type="number"
                    value={formData.priceYearly}
                    onChange={e => setFormData({ ...formData, priceYearly: Number(e.target.value) })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Max Branches</label>
                  <input
                    type="number"
                    value={formData.maxBranches}
                    onChange={e => setFormData({ ...formData, maxBranches: Number(e.target.value) })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Max Users</label>
                  <input
                    type="number"
                    value={formData.maxUsers}
                    onChange={e => setFormData({ ...formData, maxUsers: Number(e.target.value) })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Storage (GB)</label>
                <input
                  type="number"
                  value={formData.storageLimitGB}
                  onChange={e => setFormData({ ...formData, storageLimitGB: Number(e.target.value) })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
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
                  {editingPlan ? 'Save Changes' : 'Create Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        title="Delete Subscription Plan"
        message="Are you sure you want to delete this subscription plan? This action cannot be undone and may affect tenants currently assigned to this plan."
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmation({ isOpen: false, id: null })}
      />
    </div>
  );
};

export default Plans;
