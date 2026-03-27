import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, Bell, Search, CheckCircle2, ChevronDown, User, Moon, Sun, LogOut } from 'lucide-react';
import { io } from 'socket.io-client';
import { Link } from 'react-router-dom';
import { getCurrentUser } from '../utils/session';

const Layout = ({ children }: { children: React.ReactNode }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark' || document.documentElement.classList.contains('dark');
  });
  const user = getCurrentUser() || {};

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    fetchNotifications();

    const socket = io(window.location.origin);
    
    socket.on('connect', () => {
      if (user.id) {
        socket.emit('register', user.id);
      }
    });
    
    // Also register immediately in case it's already connected
    if (socket.connected && user.id) {
      socket.emit('register', user.id);
    }

    socket.on('notification', (newNotif: any) => {
      setNotifications(prev => [newNotif, ...prev]);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isread: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch(`/api/notifications/read-all`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, isread: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const unreadCount = notifications.filter(n => !n.isread && !n.isRead).length;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile & Desktop Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30 no-print">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 text-slate-500 hover:bg-slate-50 rounded-lg lg:hidden"
            >
              <Menu size={24} />
            </button>
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-400 w-64">
              <Search size={16} />
              <span className="text-sm">Search anything...</span>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4 relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all relative"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold border-2 border-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            <AnimatePresence>
              {showNotifications && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)}></div>
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden"
                  >
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                      <h3 className="font-bold text-slate-900">Notifications</h3>
                      {unreadCount > 0 && (
                        <button 
                          onClick={markAllAsRead}
                          className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                        >
                          <CheckCircle2 size={14} /> Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-[400px] overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">
                          <Bell size={32} className="mx-auto mb-3 text-slate-300" />
                          <p className="text-sm font-medium">No notifications yet</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-50">
                          {notifications.map((notif) => (
                            <div 
                              key={notif.id} 
                              className={`p-4 hover:bg-slate-50 transition-colors flex gap-3 cursor-pointer ${!notif.isread && !notif.isRead ? 'bg-indigo-50/30' : ''}`}
                              onClick={() => {
                                if (!notif.isread && !notif.isRead) markAsRead(notif.id);
                                if (notif.link) {
                                  window.location.href = notif.link; // or use navigate if available
                                }
                                setShowNotifications(false);
                              }}
                            >
                              <div className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${!notif.isread && !notif.isRead ? 'bg-indigo-600' : 'bg-transparent'}`} />
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-slate-900 mb-0.5">{notif.title}</p>
                                <p className="text-xs text-slate-600 line-clamp-2">{notif.message}</p>
                                <span className="text-[10px] text-slate-400 mt-2 block font-medium">
                                  {new Date(notif.createdat || notif.createdAt).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>

            <div className="h-8 w-px bg-slate-200 mx-1 hidden sm:block"></div>
            <div className="relative">
              <button 
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-3 pl-2 hover:bg-slate-50 p-1.5 rounded-xl transition-colors"
              >
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-sm font-bold text-slate-900 leading-none">{user.fullName}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">{user.role === 'super_admin' ? 'Super Admin' : (user.roleName || 'Tenant Admin')}</span>
                </div>
                {user.profileImage ? (
                  <img src={user.profileImage} alt={user.fullName} className="w-9 h-9 rounded-xl object-cover shadow-lg shadow-indigo-100" />
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-100">
                    {user.fullName?.charAt(0)}
                  </div>
                )}
                <ChevronDown size={16} className={`text-slate-400 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {showProfileMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)}></div>
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden"
                    >
                      <div className="p-3 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                          {user.profileImage ? (
                            <img src={user.profileImage} alt={user.fullName} className="w-10 h-10 rounded-xl object-cover" />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                              {user.fullName?.charAt(0)}
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-bold text-slate-900">{user.fullName || 'Admin User'}</p>
                            <p className="text-xs text-slate-500 truncate">{user.email || user.username || ''}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-2 space-y-1">
                        <Link 
                          to="/profile"
                          onClick={() => setShowProfileMenu(false)}
                          className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <User size={16} />
                          Edit Profile
                        </Link>
                        
                        <button 
                          onClick={() => {
                            setIsDarkMode(!isDarkMode);
                            setShowProfileMenu(false);
                          }}
                          className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
                            {isDarkMode ? 'Light Mode' : 'Dark Mode'}
                          </div>
                        </button>
                      </div>

                      <div className="p-2 border-t border-slate-100">
                        <button 
                          onClick={() => {
                            localStorage.removeItem('adminUser');
                            localStorage.removeItem('authToken');
                            window.location.href = '/login';
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <LogOut size={16} />
                          Sign Out
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-x-hidden">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
