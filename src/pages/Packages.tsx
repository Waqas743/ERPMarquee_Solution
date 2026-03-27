import { Pagination } from '../components/Pagination';
import React, { useEffect, useState } from 'react';
import { 
  Plus, Search, Edit2, Trash2, XCircle, 
  Package, Users, CreditCard, CheckCircle2, 
  ChevronRight, Info, PlusCircle, MinusCircle, Filter
} from 'lucide-react';
import ConfirmationModal from '../components/ConfirmationModal';
import { getCurrentUser, getTenantId, hasPermission } from '../utils/session';
import { SearchableSelect } from '../components/SearchableSelect';

const Packages = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const user = getCurrentUser();
  const tenantId = getTenantId();
  const [packages, setPackages] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [availableAddOns, setAvailableAddOns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<any>(null);
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>('all');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    basePrice: 0,
    maxGuests: 0,
    isActive: true,
    menuItems: [] as any[], // { menuItemId, quantity, notes }
    addOns: [] as any[] // { name, price, description, isActive }
  });

  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean, id: number | null }>({
    isOpen: false,
    id: null
  });

  const fmtDate = (value: any) => {
    if (!value) return 'N/A';
    try {
      const dt = new Date(value);
      if (isNaN(dt.getTime())) return 'N/A';
      return new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).format(dt);
    } catch {
      return 'N/A';
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pkgRes, itemRes, addOnRes, catRes] = await Promise.all([
        fetch(`/api/event-packages?tenantId=${tenantId}`),
        fetch(`/api/menu-items?tenantId=${tenantId}`),
        fetch(`/api/add-ons?tenantId=${tenantId}`),
        fetch(`/api/menu-categories?tenantId=${tenantId}`)
      ]);
      setPackages(await pkgRes.json());
      setMenuItems(await itemRes.json());
      setAvailableAddOns(await addOnRes.json());
      setCategories(await catRes.json());
    } catch (error) {
      console.error("Error fetching package data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenModal = async (pkg: any = null) => {
    if (pkg) {
      const res = await fetch(`/api/event-packages/${pkg.id}`);
      const fullPkg = await res.json();
      setEditingPackage(fullPkg);
      setFormData({
        name: fullPkg.name,
        description: fullPkg.description || '',
        basePrice: fullPkg.basePrice || fullPkg.baseprice || 0,
        maxGuests: fullPkg.maxGuests || fullPkg.maxguests || 0,
        isActive: fullPkg.isActive !== undefined ? fullPkg.isActive : (fullPkg.isactive !== undefined ? fullPkg.isactive : true),
        menuItems: (fullPkg.menuItems || []).map((mi: any) => ({
          ...mi,
          menuItemId: mi.menuItemId || mi.menuitemid || mi.menuItemid // Normalize key
        })),
        addOns: (fullPkg.addOns || []).map((ao: any) => ({
            ...ao,
            addOnId: ao.addOnId || ao.addonid || ao.addOnid // Normalize key
        }))
      });
    } else {
      setEditingPackage(null);
      setFormData({
        name: '',
        description: '',
        basePrice: 0,
        maxGuests: 0,
        isActive: true,
        menuItems: [],
        addOns: []
      });
    }
    setSelectedCategoryTab('all');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingPackage ? `/api/event-packages/${editingPackage.id}` : '/api/event-packages';
    const method = editingPackage ? 'PUT' : 'POST';
    
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
    const res = await fetch(`/api/event-packages/${deleteConfirmation.id}`, { method: 'DELETE' });
    if (res.ok) {
      setDeleteConfirmation({ isOpen: false, id: null });
      fetchData();
    }
  };

  const toggleMenuItem = (menuItemId: string) => {
    setFormData(prev => {
      // Normalize comparison to handle string/number mismatch
      const exists = prev.menuItems.find(mi => 
        String(mi.menuItemId || mi.menuitemid) === String(menuItemId)
      );
      
      if (exists) {
        return {
          ...prev,
          menuItems: prev.menuItems.filter(mi => 
            String(mi.menuItemId || mi.menuitemid) !== String(menuItemId)
          )
        };
      } else {
        return {
          ...prev,
          menuItems: [...prev.menuItems, { menuItemId, quantity: 1, notes: '' }]
        };
      }
    });
  };

  const updateMenuItem = (menuItemId: string, field: string, value: any) => {
    setFormData(prev => {
      const newItems = prev.menuItems.map(mi => {
        if (String(mi.menuItemId) === String(menuItemId)) {
          return { ...mi, [field]: value };
        }
        return mi;
      });
      return { ...prev, menuItems: newItems };
    });
  };

  const addAddon = () => {
    setFormData(prev => ({
      ...prev,
      addOns: [...prev.addOns, { addOnId: availableAddOns[0]?.id || '', isActive: true }]
    }));
  };

  const removeAddon = (index: number) => {
    setFormData(prev => ({
      ...prev,
      addOns: prev.addOns.filter((_, i) => i !== index)
    }));
  };

  const updateAddon = (index: number, field: string, value: any) => {
    setFormData(prev => {
      const newAddons = [...prev.addOns];
      newAddons[index] = { ...newAddons[index], [field]: value };
      return { ...prev, addOns: newAddons };
    });
  };


                              
                              
  const paginatedItems = packages.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Event Packages</h1>
          <p className="text-sm sm:text-base text-slate-500">Manage standard packages, menus, and add-ons.</p>
        </div>
        {hasPermission('menu.create') && (
          <button 
            onClick={() => handleOpenModal()}
            className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors w-full sm:w-auto"
          >
            <Plus size={20} />
            Create Package
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-500">Loading packages...</div>
        ) : packages.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500">No packages created yet.</div>
        ) : (
          paginatedItems.map((pkg: any) => (
            <div key={pkg.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col group overflow-hidden">
              <div className="p-6 border-b border-slate-100 relative">
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {hasPermission('menu.edit') && (
                    <button onClick={() => handleOpenModal(pkg)} title="Edit" className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                      <Edit2 size={16} />
                    </button>
                  )}
                  {hasPermission('menu.delete') && (
                    <button onClick={() => setDeleteConfirmation({ isOpen: true, id: pkg.id })} title="Delete" className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-4">
                  <Package size={24} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-1">{pkg.name}</h3>
                <p className="text-sm text-slate-500 line-clamp-2 mb-4">{pkg.description || 'No description.'}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-slate-900">Rs. {(pkg.basePrice || pkg.baseprice || 0).toLocaleString()}</span>
                  <span className="text-slate-500 text-xs">per guest</span>
                </div>
              </div>
              
              <div className="p-6 flex-1 space-y-3">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Users size={16} className="text-slate-400" />
                  <span>Up to {pkg.maxGuests || pkg.maxguests || 0} Guests</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  <span>Customizable Menu</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${(pkg.isActive !== undefined ? pkg.isActive : pkg.isactive) ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                    {(pkg.isActive !== undefined ? pkg.isActive : pkg.isactive) ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="space-y-2 pt-4 mt-4 border-t border-slate-50">
                  <div className="grid grid-cols-2 gap-4 text-[11px] text-slate-500">
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-700">Created By</span>
                      <span>{pkg.createdByName || 'System'}</span>
                      <span>{pkg.createdAt ? fmtDate(pkg.createdAt) : 'N/A'}</span>
                    </div>
                    {pkg.modifiedAt && (
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-700">Modified By</span>
                        <span>{pkg.modifiedByName || 'System'}</span>
                        <span>{fmtDate(pkg.modifiedAt)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100">
                {hasPermission('menu.edit') ? (
                  <button onClick={() => handleOpenModal(pkg)} className="w-full py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 hover:bg-slate-100 transition-colors text-sm">
                    View Details
                  </button>
                ) : (
                  <button disabled className="w-full py-2.5 bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-400 cursor-not-allowed text-sm">
                    View Only
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Package Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">{editingPackage ? 'Edit Package' : 'Create Package'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><XCircle size={24} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-8">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Package Name</label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. Gold Wedding Package" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Price Per Guest (Rs.)</label>
                  <input required type="number" value={formData.basePrice} onChange={e => setFormData({...formData, basePrice: Number(e.target.value)})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Max Guests</label>
                  <input required type="number" value={formData.maxGuests} onChange={e => setFormData({...formData, maxGuests: Number(e.target.value)})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Description</label>
                  <input type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>

              {/* Menu Items Mapping */}
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h3 className="text-lg font-bold text-slate-900">Included Menu Items</h3>
                  <div className="flex items-center gap-2">
                    <Filter size={16} className="text-slate-400" />
                    <SearchableSelect
                      options={[
                        { value: 'all', label: 'All Categories' },
                        ...categories.map(cat => ({ value: String(cat.id), label: cat.name }))
                      ]}
                      value={selectedCategoryTab}
                      onChange={(value) => setSelectedCategoryTab(value)}
                      placeholder="All Categories"
                      className="w-48"
                    />
                  </div>
                </div>
                
                <div className="space-y-8">
                  {categories
                    .filter(cat => selectedCategoryTab === 'all' || String(cat.id) === String(selectedCategoryTab))
                    .map(category => {
                      const categoryItems = menuItems.filter(mi => mi.categoryId === category.id);
                      if (categoryItems.length === 0) return null;

                      return (
                        <div key={category.id} className="space-y-4">
                          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                            <div className="w-2 h-2 rounded-full bg-indigo-600"></div>
                            <h4 className="font-bold text-slate-800 uppercase tracking-wider text-xs">{category.name}</h4>
                          </div>
                          
                          <div className="grid grid-cols-1 gap-3">
                            {categoryItems.map(item => {
                              const selectedItem = formData.menuItems.find(mi => 
                                String(mi.menuItemId || mi.menuitemid) === String(item.id)
                              );  return (
                                <div 
                                  key={item.id} 
                                  className={`p-4 rounded-xl border transition-all ${
                                    selectedItem 
                                      ? 'bg-indigo-50/50 border-indigo-200 shadow-sm' 
                                      : 'bg-white border-slate-100 hover:border-slate-200'
                                  }`}
                                >
                                  <div className="flex items-start gap-4">
                                    <div className="pt-1">
                                      <input 
                                        type="checkbox" 
                                        checked={!!selectedItem}
                                        onChange={() => toggleMenuItem(item.id)}
                                        className="w-5 h-5 text-indigo-600 rounded-lg border-slate-300 focus:ring-indigo-500 cursor-pointer"
                                      />
                                    </div>
                                    
                                    <div className="flex-1 space-y-3">
                                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <div>
                                          <p className="font-bold text-slate-900">{item.name}</p>
                                          {item.description && <p className="text-xs text-slate-500">{item.description}</p>}
                                        </div>
                                      </div>

                                      {selectedItem && (
                                        <div className="flex flex-col sm:flex-row gap-3 pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                          <div className="w-full sm:w-24">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Quantity</label>
                                            <input 
                                              type="number" 
                                              step="0.1"
                                              value={selectedItem.quantity}
                                              onChange={e => updateMenuItem(item.id, 'quantity', Number(e.target.value))}
                                              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                            />
                                          </div>
                                          <div className="flex-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Notes / Serving Style</label>
                                            <input 
                                              type="text" 
                                              placeholder="e.g. Served in bowls, Extra spicy..."
                                              value={selectedItem.notes}
                                              onChange={e => updateMenuItem(item.id, 'notes', e.target.value)}
                                              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                            />
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Add-ons */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900">Optional Add-ons</h3>
                  <button type="button" onClick={addAddon} className="text-indigo-600 text-sm font-bold flex items-center gap-1 hover:text-indigo-700">
                    <PlusCircle size={16} /> Add Addon
                  </button>
                </div>
                <div className="space-y-3">
                  {formData.addOns.map((addon, index) => (
                    <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <SearchableSelect
                        options={[
                          { value: '', label: 'Select Add-on' },
                          ...availableAddOns.map(ao => ({ value: String(ao.id), label: `${ao.name} (Rs. ${ao.price} / guest)` }))
                        ]}
                        value={addon.addOnId}
                        onChange={(value) => updateAddon(index, 'addOnId', value)}
                        placeholder="Select Add-on"
                        className="flex-1"
                      />
                      <button type="button" onClick={() => removeAddon(index)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <MinusCircle size={20} />
                      </button>
                    </div>
                  ))}
                  {formData.addOns.length === 0 && (
                    <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-sm">
                      No add-ons linked to this package yet.
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 border border-slate-200 rounded-xl font-medium text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors">Save Package</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        title="Delete Package"
        message="Are you sure you want to delete this event package? This will not affect existing bookings."
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmation({ isOpen: false, id: null })}
      />
    
      <Pagination 
        currentPage={currentPage} 
        totalItems={packages.length} 
        itemsPerPage={ITEMS_PER_PAGE} 
        onPageChange={setCurrentPage} 
      />
    </div>
  );
};

export default Packages;
