import React, { useEffect, useState } from 'react';
import { 
  Plus, Search, MoreVertical, Edit2, Trash2, 
  ChevronRight, Utensils, Tag, Clock, CheckCircle2, 
  XCircle, Filter, ChevronDown
} from 'lucide-react';
import ConfirmationModal from '../components/ConfirmationModal';
import { getCurrentUser, getTenantId } from '../utils/session';

const MenuManagement = () => {
  const user = getCurrentUser();
  const tenantId = getTenantId();
  const [activeTab, setActiveTab] = useState<'items' | 'categories' | 'reports'>('items');
  const [loading, setLoading] = useState(true);
  
  // Categories State
  const [categories, setCategories] = useState<any[]>([]);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    description: '',
    isActive: true
  });

  // Items State
  const [items, setItems] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [itemFormData, setItemFormData] = useState({
    categoryId: '',
    name: '',
    description: '',
    isActive: true
  });

  // Reports State
  const [reports, setReports] = useState({
    revenue: [] as any[],
    popular: [] as any[],
    costAnalysis: [] as any[]
  });

  const [deleteConfirmation, setDeleteConfirmation] = useState<{ 
    isOpen: boolean, 
    type: 'category' | 'item', 
    id: number | null 
  }>({
    isOpen: false,
    type: 'item',
    id: null
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [catRes, itemRes, revRes, popRes] = await Promise.all([
        fetch(`/api/menu-categories?tenantId=${tenantId}`),
        fetch(`/api/menu-items?tenantId=${tenantId}`),
        fetch(`/api/reports/package-revenue?tenantId=${tenantId}`),
        fetch(`/api/reports/popular-items?tenantId=${tenantId}`)
      ]);
      setCategories(await catRes.json());
      setItems(await itemRes.json());
      setReports({
        revenue: await revRes.json(),
        popular: await popRes.json(),
        costAnalysis: []
      });
    } catch (error) {
      console.error("Error fetching menu data:", error);
    } finally {
      setLoading(false);
    }
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
    fetchData();
  }, []);

  // Category Handlers
  const handleOpenCategoryModal = async (cat: any = null) => {
    if (cat) {
      try {
        const res = await fetch(`/api/menu-categories/${cat.id}`);
        const data = res.ok ? await res.json() : cat;
        setEditingCategory(data);
        setCategoryFormData({
          name: data.name || '',
          description: data.description || '',
          isActive: data.isActive !== undefined ? data.isActive : (data.isactive !== undefined ? data.isactive : true)
        });
      } catch {
        setEditingCategory(cat);
        setCategoryFormData({
          name: cat.name || '',
          description: cat.description || '',
          isActive: cat.isActive !== undefined ? cat.isActive : (cat.isactive !== undefined ? cat.isactive : true)
        });
      }
    } else {
      setEditingCategory(null);
      setCategoryFormData({ name: '', description: '', isActive: true });
    }
    setIsCategoryModalOpen(true);
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingCategory ? `/api/menu-categories/${editingCategory.id}` : '/api/menu-categories';
    const method = editingCategory ? 'PUT' : 'POST';
    
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...categoryFormData, tenantId })
    });

    if (res.ok) {
      setIsCategoryModalOpen(false);
      fetchData();
    }
  };

  // Item Handlers
  const handleOpenItemModal = async (item: any = null) => {
    if (item) {
      try {
        const res = await fetch(`/api/menu-items/${item.id}`);
        const data = res.ok ? await res.json() : item;
        setEditingItem(data);
        setItemFormData({
          categoryId: (data.categoryId || data.categoryid)?.toString() || '',
          name: data.name || '',
          description: data.description || '',
          isActive: data.isActive !== undefined ? data.isActive : (data.isactive !== undefined ? data.isactive : true)
        });
      } catch {
        setEditingItem(item);
        setItemFormData({
          categoryId: (item.categoryId || item.categoryid)?.toString() || '',
          name: item.name || '',
          description: item.description || '',
          isActive: item.isActive !== undefined ? item.isActive : (item.isactive !== undefined ? item.isactive : true)
        });
      }
    } else {
      setEditingItem(null);
      setItemFormData({
        categoryId: categories[0]?.id ? String(categories[0].id) : '',
        name: '',
        description: '',
        isActive: true
      });
    }
    setIsItemModalOpen(true);
  };

  const handleItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingItem ? `/api/menu-items/${editingItem.id}` : '/api/menu-items';
    const method = editingItem ? 'PUT' : 'POST';
    
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...itemFormData, tenantId })
    });

    if (res.ok) {
      setIsItemModalOpen(false);
      fetchData();
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmation.id) return;
    const endpoint = deleteConfirmation.type === 'category' ? 'menu-categories' : 'menu-items';
    const res = await fetch(`/api/${endpoint}/${deleteConfirmation.id}`, { method: 'DELETE' });
    if (res.ok) {
      setDeleteConfirmation({ isOpen: false, type: 'item', id: null });
      fetchData();
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = (item.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                         (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = categoryFilter === '' || (item.categoryId || item.categoryid) == categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Menu Management</h1>
          <p className="text-sm sm:text-base text-slate-500">Manage your catering dishes and categories.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => activeTab === 'items' ? handleOpenItemModal() : handleOpenCategoryModal()}
            className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors w-full sm:w-auto"
          >
            <Plus size={20} />
            {activeTab === 'items' ? 'Add Item' : 'Add Category'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('items')}
          className={`px-6 py-4 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'items' 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Menu Items
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`px-6 py-4 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'categories' 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Categories
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`px-6 py-4 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'reports' 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Reports
        </button>
      </div>

      {activeTab === 'items' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select 
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-4 py-2 bg-slate-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-full"
              >
                <option value="">All Categories</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Item Name</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Audit</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">Loading...</td></tr>
                ) : filteredItems.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">No items found.</td></tr>
                ) : (
                  filteredItems.map((item: any) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-900">{item.name}</span>
                          </div>
                          <span className="text-xs text-slate-500 line-clamp-1">{item.description}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-600">{item.categoryName || item.categoryname}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                          (item.isActive !== undefined ? item.isActive : item.isactive) ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {(item.isActive !== undefined ? item.isActive : item.isactive) ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 text-[11px] text-slate-500">
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-700">Created:</span>
                            <span>{item.createdByName || 'System'}</span>
                            <span>{item.createdAt ? fmtDate(item.createdAt) : 'N/A'}</span>
                          </div>
                          {item.modifiedAt && (
                            <div className="flex flex-col mt-1">
                              <span className="font-medium text-slate-700">Modified:</span>
                              <span>{item.modifiedByName || 'System'}</span>
                              <span>{fmtDate(item.modifiedAt)}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleOpenItemModal(item)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => setDeleteConfirmation({ isOpen: true, type: 'item', id: item.id })} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 size={16} />
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
      ) : activeTab === 'categories' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full py-12 text-center text-slate-500">Loading...</div>
          ) : categories.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-500">No categories found.</div>
          ) : (
            categories.map((cat: any) => (
              <div key={cat.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow group relative">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <Tag size={24} />
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleOpenCategoryModal(cat)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => setDeleteConfirmation({ isOpen: true, type: 'category', id: cat.id })} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">{cat.name}</h3>
                <p className="text-sm text-slate-500 mb-4 line-clamp-2">{cat.description || 'No description.'}</p>
                <div className="flex items-center justify-between mb-4">
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                    (cat.isActive !== undefined ? cat.isActive : cat.isactive) ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {(cat.isActive !== undefined ? cat.isActive : cat.isactive) ? 'Active' : 'Inactive'}
                  </span>
                  <span className="text-xs font-medium text-slate-400">
                    {items.filter(i => (i.categoryId || i.categoryid) == cat.id).length} Items
                  </span>
                </div>
                
                <div className="space-y-2 pt-4 border-t border-slate-50">
                  <div className="grid grid-cols-2 gap-4 text-[11px] text-slate-500">
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-700">Created By</span>
                      <span>{cat.createdByName || 'System'}</span>
                      <span>{cat.createdAt ? fmtDate(cat.createdAt) : 'N/A'}</span>
                    </div>
                    {cat.modifiedAt && (
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-700">Modified By</span>
                        <span>{cat.modifiedByName || 'System'}</span>
                        <span>{fmtDate(cat.modifiedAt)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          ))}
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Total Categories</p>
              <p className="text-3xl font-black text-slate-900">{categories.length}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Total Menu Items</p>
              <p className="text-3xl font-black text-slate-900">{items.length}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Package Revenue */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <h3 className="font-bold text-slate-900">Package-wise Revenue</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {reports.revenue.map((r, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-slate-700">{r.name}</span>
                        <span className="font-bold text-slate-900">Rs. {r.revenue?.toLocaleString()}</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-600 rounded-full" 
                          style={{ width: `${(r.revenue / Math.max(...reports.revenue.map(x => x.revenue), 1)) * 100}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{r.bookingCount} Bookings</p>
                    </div>
                  ))}
                  {reports.revenue.length === 0 && <p className="text-center py-8 text-slate-400 text-sm">No revenue data yet.</p>}
                </div>
              </div>
            </div>

            {/* Popular Items */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <h3 className="font-bold text-slate-900">Most Popular Items</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {reports.popular.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{item.name}</p>
                        <p className="text-[10px] text-slate-500 uppercase font-bold">{item.categoryName}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-indigo-600">{item.totalQty?.toLocaleString()}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Units Served</p>
                      </div>
                    </div>
                  ))}
                  {reports.popular.length === 0 && <p className="text-center py-8 text-slate-400 text-sm">No items served yet.</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">{editingCategory ? 'Edit Category' : 'Add Category'}</h2>
              <button onClick={() => setIsCategoryModalOpen(false)} className="text-slate-400 hover:text-slate-600"><XCircle size={24} /></button>
            </div>
            <form onSubmit={handleCategorySubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Category Name</label>
                <input required type="text" value={categoryFormData.name} onChange={e => setCategoryFormData({...categoryFormData, name: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Description</label>
                <textarea value={categoryFormData.description} onChange={e => setCategoryFormData({...categoryFormData, description: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none min-h-[80px]" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={categoryFormData.isActive} onChange={e => setCategoryFormData({...categoryFormData, isActive: e.target.checked})} className="w-4 h-4 text-indigo-600 rounded" />
                <span className="text-sm text-slate-700">Is Active</span>
              </label>
              <div className="flex items-center justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsCategoryModalOpen(false)} className="px-6 py-2 border border-slate-200 rounded-xl font-medium text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors">Save Category</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Item Modal */}
      {isItemModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">{editingItem ? 'Edit Menu Item' : 'Add Menu Item'}</h2>
              <button onClick={() => setIsItemModalOpen(false)} className="text-slate-400 hover:text-slate-600"><XCircle size={24} /></button>
            </div>
            <form onSubmit={handleItemSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Category</label>
                  <select required value={itemFormData.categoryId} onChange={e => setItemFormData({...itemFormData, categoryId: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                    <option value="">Select Category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Item Name</label>
                  <input required type="text" value={itemFormData.name} onChange={e => setItemFormData({...itemFormData, name: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Description</label>
                  <textarea value={itemFormData.description} onChange={e => setItemFormData({...itemFormData, description: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none min-h-[80px]" />
                </div>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={itemFormData.isActive} onChange={e => setItemFormData({...itemFormData, isActive: e.target.checked})} className="w-4 h-4 text-indigo-600 rounded" />
                    <span className="text-sm text-slate-700">Is Active</span>
                  </label>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsItemModalOpen(false)} className="px-6 py-2 border border-slate-200 rounded-xl font-medium text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors">Save Item</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        title={`Delete ${deleteConfirmation.type === 'category' ? 'Category' : 'Item'}`}
        message={`Are you sure you want to delete this ${deleteConfirmation.type}? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmation({ isOpen: false, type: 'item', id: null })}
      />
    </div>
  );
};

export default MenuManagement;
