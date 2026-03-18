import { Pagination } from '../components/Pagination';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Calendar, Filter, ChevronRight, MoreVertical, CheckCircle2, Clock, XCircle, AlertCircle, Download, FileText, Utensils, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { getCurrentUser, getTenantId } from '../utils/session';

const Bookings = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [branches, setBranches] = useState([]);

  const user = getCurrentUser();
  const tenantId = getTenantId();

  const fetchData = async () => {
    setLoading(true);
    try {
      const bookingsRes = await fetch(`/api/bookings?tenantId=${tenantId}${branchFilter ? `&branchId=${branchFilter}` : ''}${statusFilter ? `&status=${statusFilter}` : ''}`);
      const bookingsData = await bookingsRes.json();
      setBookings(bookingsData);

      const branchesRes = await fetch(`/api/branches?tenantId=${tenantId}`);
      const branchesData = await branchesRes.json();
      setBranches(branchesData);
    } catch (error) {
      console.error("Error fetching bookings:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [branchFilter, statusFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'Pending': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'Rejected': return 'bg-red-50 text-red-700 border-red-100';
      default: return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Approved': return <CheckCircle2 size={14} />;
      case 'Pending': return <Clock size={14} />;
      case 'Rejected': return <XCircle size={14} />;
      default: return null;
    }
  };

  const fmtDate = (value: any) => {
    try {
      const dt = new Date(value);
      if (isNaN(dt.getTime())) return '-';
      return format(dt, 'MMM dd, yyyy');
    } catch {
      return '-';
    }
  };

  const filteredBookings = bookings.filter((b: any) => {
    const bookingNumber = (b?.bookingNumber ?? '').toString().toLowerCase();
    const customerName = (b?.customerName ?? '').toString().toLowerCase();
    const term = (searchTerm ?? '').toLowerCase();
    return bookingNumber.includes(term) || customerName.includes(term);
  });

  
  const paginatedItems = filteredBookings.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Bookings</h1>
          <p className="text-slate-500">Manage all hall bookings, payments, and approvals.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              window.focus();
              window.print();
            }}
            className="bg-white text-slate-700 border border-slate-200 px-6 py-3 rounded-xl font-medium flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm no-print"
          >
            <Printer size={20} />
            Print List
          </button>
          {(user.role === 'admin' || user.permissions?.includes('menu.view')) && (
            <button 
              onClick={() => navigate('/menu')}
              className="bg-white text-slate-700 border border-slate-200 px-6 py-3 rounded-xl font-medium flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm"
            >
              <Utensils size={20} />
              Menu Management
            </button>
          )}
          <button 
            onClick={() => navigate('/bookings/add')}
            className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
          >
            <Plus size={20} />
            New Booking
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 no-print">
        <div className="sm:col-span-2 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text"
            placeholder="Search by Booking ID or Customer Name..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <select 
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none appearance-none shadow-sm"
          >
            <option value="">All Branches</option>
            {branches.map((b: any) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
        <div className="relative">
          <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none appearance-none shadow-sm"
          >
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden print:block print:border-none print:shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100 print:bg-white print:border-slate-300">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider print:text-slate-900">Booking Info</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider print:text-slate-900">Event Details</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider print:text-slate-900">Location</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider print:text-slate-900">Amount</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider print:text-slate-900">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider print:text-slate-900">Audit</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right no-print">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 print:divide-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-slate-500 font-medium">Loading bookings...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 opacity-40">
                      <Calendar size={48} />
                      <p className="text-slate-500 font-medium">No bookings found matching your criteria.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedItems.map((booking: any) => (
                  <tr key={booking.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">#{booking.bookingNumber}</span>
                        <span className="text-sm text-slate-600">{booking.customerName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-900">{booking.eventType}</span>
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Calendar size={12} />
                          {fmtDate(booking.eventDate)} • {booking.slot}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-900">{booking.hallName}</span>
                        <span className="text-xs text-slate-500">{booking.branchName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-900">Rs. {booking.grandTotal?.toLocaleString()}</span>
                        <span className={`text-[10px] font-bold uppercase ${
                          booking.paymentStatus === 'Paid' ? 'text-emerald-600' : 
                          booking.paymentStatus === 'Partial Paid' ? 'text-amber-600' : 'text-rose-600'
                        }`}>
                          {booking.paymentStatus || 'Not Paid'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(booking.status)}`}>
                        {getStatusIcon(booking.status)}
                        {booking.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 text-[11px] text-slate-500">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-700">Created:</span>
                          <span>{booking.createdByName || booking.createdBy || 'System'}</span>
                          <span>{fmtDate(booking.createdAt)}</span>
                        </div>
                        {booking.modifiedAt && (
                          <div className="flex flex-col mt-1">
                            <span className="font-medium text-slate-700">Modified:</span>
                            <span>{booking.modifiedByName || booking.modifiedBy || 'System'}</span>
                            <span>{fmtDate(booking.modifiedAt)}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right no-print">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => navigate(`/bookings/${booking.id}`)}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <ChevronRight size={20} />
                        </button>
                        <button 
                          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title="More Actions"
                        >
                          <MoreVertical size={20} />
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

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-4 no-print">
        {loading ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-500 font-medium">Loading bookings...</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm opacity-50">
            <Calendar size={48} className="mx-auto mb-4 text-slate-300" />
            <p className="text-slate-500 font-medium">No bookings found.</p>
          </div>
        ) : (
          paginatedItems.map((booking: any) => (
            <div 
              key={booking.id}
              onClick={() => navigate(`/bookings/${booking.id}`)}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-200 transition-all active:scale-[0.98]"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">#{booking.bookingNumber}</p>
                  <h3 className="font-bold text-slate-900 text-lg">{booking.customerName}</h3>
                </div>
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${getStatusColor(booking.status)}`}>
                  {getStatusIcon(booking.status)}
                  {booking.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Event</p>
                  <p className="text-sm font-bold text-slate-700">{booking.eventType}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Date</p>
                  <p className="text-sm font-bold text-slate-700">{fmtDate(booking.eventDate)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Venue</p>
                  <p className="text-sm font-bold text-slate-700 truncate">{booking.hallName}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total</p>
                  <p className="text-sm font-black text-indigo-600">Rs. {booking.grandTotal?.toLocaleString()}</p>
                  <p className={`text-[10px] font-bold uppercase ${
                    booking.paymentStatus === 'Paid' ? 'text-emerald-600' : 
                    booking.paymentStatus === 'Partial Paid' ? 'text-amber-600' : 'text-rose-600'
                  }`}>
                    {booking.paymentStatus || 'Not Paid'}
                  </p>
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t border-slate-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-500">{booking.branchName}</span>
                  <div className="flex items-center gap-1 text-indigo-600 font-bold text-sm">
                    View Details <ChevronRight size={16} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-[11px] text-slate-500">
                  <div className="flex flex-col">
                    <span className="font-medium text-slate-700">Created By</span>
                    <span>{booking.createdByName || booking.createdBy || 'System'}</span>
                    <span>{fmtDate(booking.createdAt)}</span>
                  </div>
                  {booking.modifiedAt && (
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-700">Modified By</span>
                      <span>{booking.modifiedByName || booking.modifiedBy || 'System'}</span>
                      <span>{fmtDate(booking.modifiedAt)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    
      <Pagination 
        currentPage={currentPage} 
        totalItems={filteredBookings.length} 
        itemsPerPage={ITEMS_PER_PAGE} 
        onPageChange={setCurrentPage} 
      />
    </div>
  );
};

export default Bookings;
