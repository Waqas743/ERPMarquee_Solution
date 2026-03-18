import { Pagination } from '../components/Pagination';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, XCircle, Clock, AlertCircle, 
  Search, Filter, ChevronRight, User, Calendar, MapPin
} from 'lucide-react';
import { format } from 'date-fns';
import { getCurrentUser, getTenantId } from '../utils/session';

const Approvals = () => {
  const [currentPage, setCurrentPage] = React.useState(1);
  const ITEMS_PER_PAGE = 10;
  const navigate = useNavigate();
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Pending');
  const user = getCurrentUser();
  const tenantId = getTenantId();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/bookings?tenantId=${tenantId}`);
      setAllBookings(await res.json());
    } catch (error) {
      console.error("Error fetching approvals:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const bookings = allBookings.filter(b => b.status === activeTab);

  const tabs = [
    { id: 'Pending', label: 'Pending', icon: <Clock size={18} />, color: 'text-amber-600', bg: 'bg-amber-50' },
    { id: 'Approved', label: 'Approved', icon: <CheckCircle2 size={18} />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { id: 'Rejected', label: 'Rejected', icon: <XCircle size={18} />, color: 'text-red-600', bg: 'bg-red-50' },
  ];

  
  const paginatedItems = bookings.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Approval Workflow</h1>
        <p className="text-slate-500">Review and manage booking approval requests.</p>
      </div>

      {/* Tabs - Scrollable on mobile */}
      <div className="overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
        <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm w-max sm:w-fit">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id 
                  ? `${tab.bg} ${tab.color} shadow-sm` 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              {tab.icon}
              {tab.label}
              <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] ${activeTab === tab.id ? 'bg-white/50' : 'bg-slate-100'}`}>
                {allBookings.filter(b => b.status === tab.id).length}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-500 font-medium">Loading approval requests...</p>
          </div>
        ) : bookings.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm opacity-50">
            <CheckCircle2 size={48} className="mx-auto mb-4 text-slate-300" />
            <p className="text-slate-500 font-medium">No {activeTab.toLowerCase()} requests found.</p>
          </div>
        ) : (
          paginatedItems.map((booking: any) => (
            <div 
              key={booking.id}
              onClick={() => navigate(`/bookings/${booking.id}`)}
              className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    activeTab === 'Pending' ? 'bg-amber-100 text-amber-600' :
                    activeTab === 'Approved' ? 'bg-emerald-100 text-emerald-600' :
                    activeTab === 'Rejected' ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600'
                  }`}>
                    <User size={20} className="sm:w-6 sm:h-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                      <span className="font-bold text-slate-900 text-base sm:text-lg truncate">{booking.customerName}</span>
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded w-fit">#{booking.bookingNumber}</span>
                    </div>
                    <div className="flex flex-col gap-1 text-xs sm:text-sm text-slate-500">
                      <span className="flex items-center gap-1.5"><Calendar size={14} className="shrink-0" /> {format(new Date(booking.eventDate), 'MMM dd, yyyy')}</span>
                      <span className="flex items-center gap-1.5 truncate"><MapPin size={14} className="shrink-0" /> {booking.hallName}, {booking.branchName}</span>
                      
                      <div className="space-y-2 pt-2 mt-2 border-t border-slate-50">
                        <div className="grid grid-cols-2 gap-4 text-[11px] text-slate-500">
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-700">Created By</span>
                            <span>{booking.createdByName || 'System'}</span>
                            <span>{booking.createdAt ? format(new Date(booking.createdAt), 'MMM dd, yyyy') : 'N/A'}</span>
                          </div>
                          {booking.modifiedAt && (
                            <div className="flex flex-col">
                              <span className="font-medium text-slate-700">Modified By</span>
                              <span>{booking.modifiedByName || 'System'}</span>
                              <span>{format(new Date(booking.modifiedAt), 'MMM dd, yyyy')}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-8 pt-4 sm:pt-0 border-t sm:border-t-0 border-slate-50">
                  <div className="sm:text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 sm:mb-1">Grand Total</p>
                    <p className="text-lg sm:text-xl font-black text-slate-900">Rs. {booking.grandTotal?.toLocaleString()}</p>
                  </div>
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
                    <ChevronRight size={20} className="sm:w-6 sm:h-6" />
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    
      <Pagination 
        currentPage={currentPage} 
        totalItems={bookings.length} 
        itemsPerPage={ITEMS_PER_PAGE} 
        onPageChange={setCurrentPage} 
      />
    </div>
  );
};

export default Approvals;
