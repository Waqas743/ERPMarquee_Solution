import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, Users, CreditCard, Settings, 
  Building2, LogOut, Shield, Globe, Building, 
  CalendarCheck, CheckSquare, X, Utensils, Package, PlusCircle, BarChart3
} from 'lucide-react';
import { getCurrentUser } from '../utils/session';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const user = getCurrentUser() || {};
  const isSuperAdmin = user.role === 'super_admin';

  const handleLogout = () => {
    localStorage.removeItem('adminUser');
    window.location.href = '/login';
  };

  const modules = [
    {
      name: 'Overview',
      items: [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/', permission: 'dashboard.view', roles: ['super_admin', 'admin'] },
        { icon: BarChart3, label: 'Reports', path: '/reports', permission: 'dashboard.view', roles: ['admin'] },
        { icon: CheckSquare, label: 'Approvals', path: '/approvals', permission: 'approvals.view', roles: ['admin'] },
      ]
    },
    
    {
      name: 'Organization',
      items: [
        { icon: Building2, label: 'Branches', path: '/branches', permission: 'branches.view', roles: ['admin'] },
        { icon: Building, label: 'Halls', path: '/halls', permission: 'halls.view', roles: ['admin'] },
      ]
    },
      {
      name: 'Food & Services',
      items: [
        { icon: Utensils, label: 'Menu', path: '/menu', permission: 'menu.view', roles: ['admin'] },
        { icon: Package, label: 'Packages', path: '/packages', permission: 'menu.view', roles: ['admin'] },
        { icon: PlusCircle, label: 'Add-ons', path: '/add-ons', permission: 'menu.view', roles: ['admin'] },
      ]
    },
    {
      name: 'Events & Bookings',
      items: [
        { icon: CalendarCheck, label: 'Bookings', path: '/bookings', permission: 'bookings.view', roles: ['admin'] },
      ]
    },
    {
      name: 'Administration',
      items: [
        { icon: Users, label: 'Users', path: '/users', permission: 'users.view', roles: ['admin'] },
        { icon: Shield, label: 'Roles', path: '/roles', permission: 'roles.view', roles: ['admin'] },
        { icon: Settings, label: 'Settings', path: '/settings', roles: ['super_admin'] },
      ]
    },
    {
      name: 'System',
      items: [
        { icon: Globe, label: 'Tenants', path: '/tenants', roles: ['super_admin'] },
        { icon: CreditCard, label: 'Plans', path: '/plans', roles: ['super_admin'] },
      ]
    }
  ];

  const filteredModules = modules.map(module => ({
    ...module,
    items: module.items.filter(item => {
      // If user is super admin, show only items allowed for super admin
      if (isSuperAdmin) {
        return item.roles.includes('super_admin');
      }
      
      // For tenant users (Marquee Admin / Staff):
      // 1. Item must be allowed for 'admin' role
      if (!item.roles.includes('admin')) {
        return false;
      }
      
      // 2. Check permissions (Tenant Admin sees all tenant items, staff needs specific permission)
      if (user.roleName === 'admin' || (!user.roleName && user.role === 'admin')) {
        return true;
      }

      // Always allow director and manager to see Users tab
      if (item.path === '/users' && (user.roleName === 'director' || user.roleName === 'manager')) {
        return true;
      }
      
      return item.permission && user.permissions?.includes(item.permission);
    })
  })).filter(module => module.items.length > 0);

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 shrink-0 bg-white border-r border-slate-200 flex flex-col h-screen transition-transform duration-300 ease-in-out lg:translate-x-0 lg:sticky lg:top-0 no-print
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            {isSuperAdmin ? (
              <>
                <div className="w-10 h-10 shrink-0 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                  <Building2 size={24} />
                </div>
                <span className="font-bold text-xl tracking-tight truncate">Marquee ERP</span>
              </>
            ) : (
              <>
                {user.tenantLogoUrl ? (
                  <img 
                    src={user.tenantLogoUrl} 
                    alt={user.tenantName} 
                    className="w-10 h-10 shrink-0 rounded-xl object-cover shadow-lg shadow-indigo-100 border border-slate-200 bg-white"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-10 h-10 shrink-0 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100 font-bold text-xl">
                    {user.tenantName ? user.tenantName.charAt(0).toUpperCase() : <Building2 size={24} />}
                  </div>
                )}
                <span className="font-bold text-xl tracking-tight truncate" title={user.tenantName || 'Marquee ERP'}>
                  {user.tenantName || 'Marquee ERP'}
                </span>
              </>
            )}
          </div>
          <button 
            onClick={onClose}
            className="p-2 shrink-0 text-slate-400 hover:text-slate-600 lg:hidden"
          >
            <X size={20} />
          </button>
        </div>
        
        <nav className="flex-1 px-4 space-y-6 overflow-y-auto py-6">
          {filteredModules.map((module, idx) => (
            <div key={idx} className="space-y-1">
              <h3 className="px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                {module.name}
              </h3>
              {module.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => {
                    if (window.innerWidth < 1024) onClose();
                  }}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-sm ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-700 font-bold shadow-sm'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                    }`
                  }
                >
                  <item.icon size={18} />
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100 space-y-2 bg-slate-50/50">
          <div className="flex items-center gap-3 px-4 py-2">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs border border-indigo-200">
              {user.fullName?.charAt(0) || 'A'}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-bold text-slate-900 truncate">{user.fullName || 'Admin User'}</span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                {isSuperAdmin ? 'Super Admin' : user.tenantName || 'Tenant Admin'}
              </span>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
