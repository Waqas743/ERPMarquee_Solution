import React, { useEffect, useState } from 'react';
import { 
  Plus, Search, Edit2, Trash2, XCircle, 
  PlusCircle, MinusCircle, Info, CheckCircle2,
  Settings, DollarSign, FileText
} from 'lucide-react';
import ConfirmationModal from '../components/ConfirmationModal';
import { getCurrentUser, getTenantId } from '../utils/session';

const AddOns = () => {
  const user = getCurrentUser();
  const tenantId = getTenantId();
  const [addOns, setAddOns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddOn, setEditingAddOn] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    isActive: true
  });

  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean, id: number | null }>({
    isOpen: false,
    id: null
  });

  const fmtDate = (value: any) => {
    try {
      const dt = new Date(value);
      if (isNaN(dt.getTime())) return '-';
      return new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).format(dt);
    } catch {
      return '-';
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/add-ons?tenantId=${tenantId}`);
      const data = await res.json();
      setAddOns(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching add-ons:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenModal = async (addOn: any = null) => {
    if (addOn) {
      try {
        const res = await fetch(`/api/add-ons/${addOn.id}`);
        const data = res.ok ? await res.json() : addOn;
        setEditingAddOn(data);
        setFormData({
          name: data.name,
          description: data.description || '',
          price: data.price,
          isActive: data.isActive !== undefined ? data.isActive : (data.isactive !== undefined ? data.isactive : true)
        });
      } catch (error) {
        console.error("Error fetching add-on details:", error);
        setEditingAddOn(addOn);
        setFormData({
          name: addOn.name,
          description: addOn.description || '',
          price: addOn.price,
          isActive: addOn.isActive !== undefined ? addOn.isActive : (addOn.isactive !== undefined ? addOn.isactive : true)
        });
      }
    } else {
      setEditingAddOn(null);
      setFormData({
        name: '',
        description: '',
        price: 0,
        isActive: true
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingAddOn ? `/api/add-ons/${editingAddOn.id}` : '/api/add-ons';
    const method = editingAddOn ? 'PUT' : 'POST';
    
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formData, tenantId })
    });

    if (res.ok) {
      setIsModalOpen(false);
      fetchData();
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmation.id) return;
    const res = await fetch(`/api/add-ons/${deleteConfirmation.id}`, { method: 'DELETE' });
    if (res.ok) {
      setDeleteConfirmation({ isOpen: false, id: null });
      fetchData();
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Add-ons Management</h1>
          <p className="text-sm sm:text-base text-slate-500">Manage extra services and items for events.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors w-full sm:w-auto"
        >
          <Plus size={20} />
          Create Add-on
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-500">Loading add-ons...</div>
        ) : addOns.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500">No add-ons created yet.</div>
        ) : (
          addOns.map((addOn: any) => (
            <div key={addOn.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col group overflow-hidden">
              <div className="p-6 border-b border-slate-100 relative">
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleOpenModal(addOn)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => setDeleteConfirmation({ isOpen: true, id: addOn.id })} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-4">
                  <PlusCircle size={24} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-1">{addOn.name}</h3>
                <p className="text-sm text-slate-500 line-clamp-2 mb-4">{addOn.description || 'No description.'}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-slate-900">Rs. {addOn.price?.toLocaleString()}</span>
                  <span className="text-xs text-slate-500 font-medium">/ guest</span>
                </div>
              </div>
              
              <div className="p-6 flex-1 space-y-3">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <CheckCircle2 size={16} className={(addOn.isActive !== undefined ? addOn.isActive : addOn.isactive) ? "text-emerald-500" : "text-slate-300"} />
                  <span>{(addOn.isActive !== undefined ? addOn.isActive : addOn.isactive) ? 'Active' : 'Inactive'}</span>
                </div>

                <div className="space-y-2 pt-4 mt-4 border-t border-slate-50">
                  <div className="grid grid-cols-2 gap-4 text-[11px] text-slate-500">
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-700">Created By</span>
                      <span>{addOn.createdByName || 'System'}</span>
                      <span>{addOn.createdAt ? fmtDate(addOn.createdAt) : 'N/A'}</span>
                    </div>
                    {addOn.modifiedAt && (
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-700">Modified By</span>
                        <span>{addOn.modifiedByName || 'System'}</span>
                        <span>{fmtDate(addOn.modifiedAt)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100">
                <button onClick={() => handleOpenModal(addOn)} className="w-full py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 hover:bg-slate-100 transition-colors text-sm">
                  Edit Details
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add-on Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">{editingAddOn ? 'Edit Add-on' : 'Create Add-on'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><XCircle size={24} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Add-on Name</label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. Extra AC, DJ System" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Price (Rs. per guest)</label>
                  <input required type="number" value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Description</label>
                  <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none min-h-[100px]" placeholder="Describe the service..." />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} className="w-4 h-4 text-indigo-600 rounded" />
                  <span className="text-sm text-slate-700 font-medium">Is Active</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 border border-slate-200 rounded-xl font-medium text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors">Save Add-on</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        title="Delete Add-on"
        message="Are you sure you want to delete this add-on? It will be removed from all packages and future bookings."
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmation({ isOpen: false, id: null })}
      />
    </div>
  );
};

export default AddOns;
