import React, { useEffect, useState } from 'react';
import { Plus, Search, Building, MapPin, Users, DollarSign, Clock, ShieldCheck, X, Trash2, Edit2, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ConfirmationModal from '../components/ConfirmationModal';
import { getCurrentUser, getTenantId } from '../utils/session';

const Halls = () => {
  const user = getCurrentUser();
  const tenantId = getTenantId();
  const navigate = useNavigate();
  const [halls, setHalls] = useState([]);
  const [branches, setBranches] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHall, setEditingHall] = useState<any>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean, id: number | null }>({
    isOpen: false,
    id: null
  });

  const [formData, setFormData] = useState({
    branchId: '',
    hallManagerId: '',
    hallName: '',
    capacity: '',
    isDecorationAllowedExternally: true,
  });

  const fetchStaff = () => {
    fetch(`/api/users?tenantId=${tenantId}`)
      .then(res => res.json())
      .then(data => setStaff(data));
  };

  const fetchBranches = () => {
    fetch(`/api/branches?tenantId=${tenantId}`)
      .then(res => res.json())
      .then(data => setBranches(data));
  };

  const fetchHalls = () => {
    setLoading(true);
    fetch(`/api/halls?tenantId=${tenantId}`)
      .then(res => res.json())
      .then(data => {
        setHalls(data);
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
    fetchHalls();
    fetchBranches();
    fetchStaff();
  }, []);

  const handleOpenModal = async (hall: any = null) => {
    if (hall) {
      try {
        const res = await fetch(`/api/halls/${hall.id}`);
        const data = res.ok ? await res.json() : hall;
        setEditingHall(data);
        setFormData({
          branchId: (data.branchId || data.branchid)?.toString() || '',
          hallManagerId: (data.hallManagerId || data.hallmanagerid)?.toString() || '',
          hallName: data.hallName || data.hallname || '',
          capacity: (data.capacity || '').toString(),
          isDecorationAllowedExternally: data.isDecorationAllowedExternally !== undefined ? data.isDecorationAllowedExternally : (data.isdecorationallowedexternally !== undefined ? data.isdecorationallowedexternally : true),
        });
      } catch {
        setEditingHall(hall);
        setFormData({
          branchId: (hall.branchId || hall.branchid)?.toString() || '',
          hallManagerId: (hall.hallManagerId || hall.hallmanagerid)?.toString() || '',
          hallName: hall.hallName || hall.hallname || '',
          capacity: (hall.capacity || '').toString(),
          isDecorationAllowedExternally: hall.isDecorationAllowedExternally !== undefined ? hall.isDecorationAllowedExternally : (hall.isdecorationallowedexternally !== undefined ? hall.isdecorationallowedexternally : true),
        });
      }
    } else {
      setEditingHall(null);
      setFormData({
        branchId: branches[0]?.id?.toString() || '',
        hallManagerId: '',
        hallName: '',
        capacity: '',
        isDecorationAllowedExternally: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingHall ? `/api/halls/${editingHall.id}` : '/api/halls';
    const method = editingHall ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formData, tenantId }),
    });

    if (response.ok) {
      setIsModalOpen(false);
      fetchHalls();
    } else {
      const data = await response.json();
      alert(data.message || 'Failed to save hall');
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmation.id) {
      const response = await fetch(`/api/halls/${deleteConfirmation.id}`, { method: 'DELETE' });
      if (response.ok) {
        setDeleteConfirmation({ isOpen: false, id: null });
        fetchHalls();
      }
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Marriage Halls</h1>
          <p className="text-slate-500">Manage your venues and their configurations.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 hover:bg-indigo-700 transition-colors"
        >
          <Plus size={20} />
          Add Hall
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-500">Loading halls...</div>
        ) : halls.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500">No halls found. Add your first venue to get started.</div>
        ) : (
          halls.map((hall: any) => (
            <div key={hall.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow group">
              <div className="p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <Building size={24} />
                  </div>
                  <div className="flex items-center gap-2 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleOpenModal(hall)}
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => setDeleteConfirmation({ isOpen: true, id: hall.id })}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-slate-900">{hall.hallName || hall.hallname}</h3>
                  <div className="flex flex-col gap-1 mt-1">
                    <div className="flex items-center gap-1 text-xs font-bold text-indigo-600 uppercase tracking-wider">
                      <Building size={12} />
                      {hall.branchName || hall.branchname}
                    </div>
                    {(hall.managerName || hall.managername) && (
                      <div className="flex items-center gap-1 text-xs font-medium text-slate-600">
                        <Users size={12} className="text-slate-400" />
                        Manager: {hall.managerName || hall.managername}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Users size={16} className="text-slate-400" />
                    <span>{hall.capacity} Capacity</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  {(hall.isDecorationAllowedExternally !== undefined ? hall.isDecorationAllowedExternally : hall.isdecorationallowedexternally) && (
                    <span className="px-2 py-1 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-md flex items-center gap-1">
                      <ShieldCheck size={12} /> External Decor OK
                    </span>
                  )}
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-50">
                  <div className="grid grid-cols-2 gap-4 text-[11px] text-slate-500">
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-700">Created By</span>
                      <span>{hall.createdByName || 'System'}</span>
                      <span>{hall.createdAt ? fmtDate(hall.createdAt) : 'N/A'}</span>
                    </div>
                    {hall.modifiedAt && (
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-700">Modified By</span>
                        <span>{hall.modifiedByName || 'System'}</span>
                        <span>{fmtDate(hall.modifiedAt)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <button 
                    onClick={() => navigate(`/halls/${hall.id}/calendar`)}
                    className="w-full flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-slate-50 transition-colors group/btn"
                  >
                    <Calendar size={20} className="text-slate-400 group-hover/btn:text-indigo-600" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Calendar</span>
                  </button>
                </div>
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
                {editingHall ? 'Edit Hall' : 'Add New Hall'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-semibold text-slate-700">Branch</label>
                  <select
                    required
                    value={formData.branchId}
                    onChange={e => setFormData({ ...formData, branchId: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="">Select a Branch</option>
                    {branches.map((b: any) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Hall Manager</label>
                  <select
                    value={formData.hallManagerId}
                    onChange={e => setFormData({ ...formData, hallManagerId: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="">Select a Manager (Optional)</option>
                    {staff.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.fullName}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Hall Name</label>
                  <input
                    required
                    type="text"
                    value={formData.hallName}
                    onChange={e => setFormData({ ...formData, hallName: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="e.g. Royal Grand Ballroom"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Capacity (Persons)</label>
                  <input
                    required
                    type="number"
                    value={formData.capacity}
                    onChange={e => setFormData({ ...formData, capacity: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="e.g. 500"
                  />
                </div>
                <div className="flex items-center gap-2 py-2 md:col-span-2">
                  <input
                    type="checkbox"
                    id="isDecorationAllowedExternally"
                    checked={formData.isDecorationAllowedExternally}
                    onChange={e => setFormData({ ...formData, isDecorationAllowedExternally: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <label htmlFor="isDecorationAllowedExternally" className="text-sm text-slate-700 cursor-pointer">Allow External Decoration</label>
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
                  {editingHall ? 'Save Changes' : 'Create Hall'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        title="Delete Hall"
        message="Are you sure you want to delete this hall? All associated sections, packages, and calendar entries will be lost."
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmation({ isOpen: false, id: null })}
      />
    </div>
  );
};

export default Halls;
