import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Tenants from './pages/Tenants';
import Branches from './pages/Branches';
import Users from './pages/Users';
import Roles from './pages/Roles';
import Halls from './pages/Halls';
import HallBookingCalendar from './pages/HallBookingCalendar';
import Bookings from './pages/Bookings';
import AddBooking from './pages/AddBooking';
import BookingDetail from './pages/BookingDetail';
import Approvals from './pages/Approvals';
import MenuManagement from './pages/MenuManagement';
import Packages from './pages/Packages';
import AddOns from './pages/AddOns';
import Tasks from './pages/Tasks';
import Plans from './pages/Plans';
import Settings from './pages/Settings';
import Login from './pages/Login';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const user = localStorage.getItem('adminUser');
    setIsAuthenticated(!!user);
  }, []);

  if (isAuthenticated === null) return null;

  const user = JSON.parse(localStorage.getItem('adminUser') || '{}');
  const isSuperAdmin = user.role === 'super_admin';

  return (
    <Router>
      <Routes>
        <Route path="/login" element={
          isAuthenticated ? <Navigate to="/" replace /> : <Login />
        } />
        
        <Route path="/*" element={
          isAuthenticated ? (
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                {isSuperAdmin && <Route path="/tenants" element={<Tenants />} />}
                {!isSuperAdmin && <Route path="/branches" element={<Branches />} />}
                {!isSuperAdmin && <Route path="/users" element={<Users />} />}
                {!isSuperAdmin && <Route path="/roles" element={<Roles />} />}
                {!isSuperAdmin && <Route path="/halls" element={<Halls />} />}
                {!isSuperAdmin && <Route path="/bookings" element={<Bookings />} />}
                {!isSuperAdmin && <Route path="/bookings/add" element={<AddBooking />} />}
                {!isSuperAdmin && <Route path="/bookings/edit/:id" element={<AddBooking />} />}
                {!isSuperAdmin && <Route path="/bookings/:id" element={<BookingDetail />} />}
                {!isSuperAdmin && <Route path="/menu" element={<MenuManagement />} />}
                {!isSuperAdmin && <Route path="/packages" element={<Packages />} />}
                {!isSuperAdmin && <Route path="/add-ons" element={<AddOns />} />}
                {!isSuperAdmin && <Route path="/tasks" element={<Tasks />} />}
                {!isSuperAdmin && <Route path="/approvals" element={<Approvals />} />}
                {!isSuperAdmin && <Route path="/halls/:hallId/calendar" element={<HallBookingCalendar />} />}
                {isSuperAdmin && <Route path="/plans" element={<Plans />} />}
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          ) : (
            <Navigate to="/login" replace />
          )
        } />
      </Routes>
    </Router>
  );
}
