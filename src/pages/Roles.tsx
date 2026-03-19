import { Pagination } from '../components/Pagination';
import React, { useEffect, useState } from 'react';
import { Plus, Search, Shield, X, Trash2, Edit2, CheckCircle2, Circle } from 'lucide-react';
import ConfirmationModal from '../components/ConfirmationModal';
import { getCurrentUser, getTenantId, hasPermission } from '../utils/session';

const Roles = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const user = getCurrentUser();
  const tenantId = getTenantId();
  const [roles, setRoles] = useState([]);
  const [permissionsList, setPermissionsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);
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

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: [] as string[],
  });

  const fetchRoles = () => {
    setLoading(true);
    fetch(`/api/roles?tenantId=${tenantId}`)
      .then(res => res.json())
      .then(data => {
        setRoles(data);
        setLoading(false);
      });
  };

  const fetchPermissions = () => {
    fetch('/api/permissions-list')
      .then(res => res.json())
      .then(data => setPermissionsList(data));
  };

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, []);

  const handleOpenModal = async (targetRole: any = null) => {
    if (targetRole) {
      try {
        const res = await fetch(`/api/roles/${targetRole.id}`);
        if (res.ok) {
          const full = await res.json();
          setEditingRole(full);
          setFormData({
            name: full.name || '',
            description: full.description || '',
            permissions: Array.isArray(full.permissions) ? full.permissions.map((p: any) => String(p)) : [],
          });
        } else {
          setEditingRole(targetRole);
          setFormData({
            name: targetRole.name || '',
            description: targetRole.description || '',
            permissions: Array.isArray(targetRole.permissions) ? targetRole.permissions.map((p: any) => String(p)) : [],
          });
        }
      } catch {
        setEditingRole(targetRole);
        setFormData({
          name: targetRole.name || '',
          description: targetRole.description || '',
          permissions: Array.isArray(targetRole.permissions) ? targetRole.permissions.map((p: any) => String(p)) : [],
        });
      }
      setIsModalOpen(true);
    } else {
      setEditingRole(null);
      setFormData({
        name: '',
        description: '',
        permissions: [],
      });
      setIsModalOpen(true);
    }
  };

  const togglePermission = (key: string) => {
    setFormData(prev => {
      let newPermissions = [...prev.permissions];
      const isCurrentlySelected = newPermissions.includes(key);

      if (isCurrentlySelected) {
        // Uncheck
        newPermissions = newPermissions.filter(p => p !== key);
        
        // If unchecking '.view', we must uncheck '.create', '.edit', '.delete' for the same module
        if (key.endsWith('.view')) {
          const module = key.split('.')[0];
          newPermissions = newPermissions.filter(p => !p.startsWith(`${module}.`));
        }
      } else {
        // Check
        newPermissions.push(key);
        
        // If checking '.create', '.edit', or '.delete', we must check '.view'
        if (key.match(/\.(create|edit|delete)$/)) {
          const module = key.split('.')[0];
          const viewKey = `${module}.view`;
          if (!newPermissions.includes(viewKey)) {
            newPermissions.push(viewKey);
          }
        }
      }

      return { ...prev, permissions: newPermissions };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tenantId && user.role !== 'super_admin') {
      alert('Error: Tenant ID is missing. Please log in again.');
      return;
    }

    const url = editingRole ? `/api/roles/${editingRole.id}` : '/api/roles';
    const method = editingRole ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formData, tenantId }),
    });

    if (response.ok) {
      setIsModalOpen(false);
      fetchRoles();
    } else {
      const data = await response.json();
      alert(data.message || 'Failed to save role');
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmation.id) {
      const response = await fetch(`/api/roles/${deleteConfirmation.id}`, { method: 'DELETE' });
      if (response.ok) {
        setDeleteConfirmation({ isOpen: false, id: null });
        fetchRoles();
      }
    }
  };

  const groupedPermissions = permissionsList.reduce((acc: any, curr: any) => {
    if (!acc[curr.category]) acc[curr.category] = [];
    acc[curr.category].push(curr);
    return acc;
  }, {});

  
  const paginatedItems = roles.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Roles & Permissions</h1>
          <p className="text-sm sm:text-base text-slate-500">Define access levels for your team members.</p>
        </div>
        {hasPermission('roles.create') && (
          <button 
            onClick={() => handleOpenModal()}
            className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors w-full sm:w-auto"
          >
            <Plus size={20} />
            Create Role
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-500">Loading roles...</div>
        ) : roles.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500">No custom roles created yet.</div>
        ) : (
          paginatedItems.map((role: any) => (
            <div key={role.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow group relative">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Shield size={24} />
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {hasPermission('roles.edit') && (
                    <button 
                      onClick={() => handleOpenModal(role)}
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                      <Edit2 size={18} />
                    </button>
                  )}
                  {!role.isSystem && hasPermission('roles.delete') && (
                    <button 
                      onClick={() => setDeleteConfirmation({ isOpen: true, id: role.id })}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">
                {role.name}
                {role.isSystem && (
                  <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium align-middle">
                    Default
                  </span>
                )}
              </h3>
              <p className="text-sm text-slate-500 mb-4 line-clamp-2">{role.description || 'No description provided.'}</p>
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-1 rounded-md">
                  {role.permissions?.length || 0} Permissions
                </span>
              </div>
              
              <div className="space-y-2 pt-4 mt-auto border-t border-slate-50">
                <div className="grid grid-cols-2 gap-4 text-[11px] text-slate-500">
                  <div className="flex flex-col">
                    <span className="font-medium text-slate-700">Created By</span>
                    <span>{role.createdByName || 'System'}</span>
                    <span>{role.createdAt ? fmtDate(role.createdAt) : 'N/A'}</span>
                  </div>
                  {role.modifiedAt && (
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-700">Modified By</span>
                      <span>{role.modifiedByName || 'System'}</span>
                      <span>{fmtDate(role.modifiedAt)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">
                {editingRole ? 'Edit Role' : 'Create New Role'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Role Name</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    disabled={editingRole?.isSystem}
                    className={`w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none ${editingRole?.isSystem ? 'opacity-50 cursor-not-allowed' : ''}`}
                    placeholder="e.g. Branch Manager"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Description</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    disabled={editingRole?.isSystem}
                    className={`w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none ${editingRole?.isSystem ? 'opacity-50 cursor-not-allowed' : ''}`}
                    placeholder="Briefly describe this role's purpose"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900">Permissions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {Object.entries(groupedPermissions).map(([category, perms]: [string, any]) => (
                    <div key={category} className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{category}</h4>
                      <div className="space-y-2">
                        {perms.map((p: any) => (
                          <button
                            key={p.key}
                            type="button"
                            onClick={() => togglePermission(p.key)}
                            className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                              formData.permissions.includes(p.key)
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                : 'bg-white border-slate-100 text-slate-600 hover:border-slate-200'
                            }`}
                          >
                            <span className="text-sm font-medium">{p.label}</span>
                            {formData.permissions.includes(p.key) ? (
                              <CheckCircle2 size={18} className="text-indigo-600" />
                            ) : (
                              <Circle size={18} className="text-slate-300" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
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
                  {editingRole ? 'Save Changes' : 'Create Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        title="Delete Role"
        message="Are you sure you want to delete this role? Users assigned to this role may lose access to certain features."
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmation({ isOpen: false, id: null })}
      />
    
      <Pagination 
        currentPage={currentPage} 
        totalItems={roles.length} 
        itemsPerPage={ITEMS_PER_PAGE} 
        onPageChange={setCurrentPage} 
      />
    </div>
  );
};

export default Roles;
