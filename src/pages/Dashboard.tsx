import React, { useEffect, useState } from 'react';
import { 
  Users, CreditCard, Building, TrendingUp, 
  Calendar as CalendarIcon, DollarSign, CheckCircle2, XCircle,
  Clock, FileText, ChevronLeft, ChevronRight, ArrowRight
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie
} from 'recharts';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';
import { getCurrentUser, getTenantId } from '../utils/session';

const StatCard = ({ icon: Icon, label, value, trend, color, prefix = "" }: any) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between mb-4">
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon size={24} className="text-white" />
      </div>
      {trend && (
        <span className="text-emerald-600 text-sm font-medium flex items-center gap-1">
          <TrendingUp size={16} />
          {trend}
        </span>
      )}
    </div>
    <div className="flex flex-col">
      <span className="text-slate-500 text-sm font-medium">{label}</span>
      <span className="text-2xl font-bold text-slate-900">{prefix}{value?.toLocaleString()}</span>
    </div>
  </div>
);

const Calendar = ({ bookings }: { bookings: any[] }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDateBookings, setSelectedDateBookings] = useState<any[] | null>(null);

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const startDay = startOfMonth(currentMonth).getDay();

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <CalendarIcon size={20} className="text-indigo-600" />
          Booking Calendar
        </h3>
        <div className="flex items-center gap-4">
          <span className="text-sm font-bold text-slate-600">{format(currentMonth, 'MMMM yyyy')}</span>
          <div className="flex gap-1">
            <button onClick={prevMonth} className="p-1 hover:bg-slate-100 rounded-md transition-colors"><ChevronLeft size={20} /></button>
            <button onClick={nextMonth} className="p-1 hover:bg-slate-100 rounded-md transition-colors"><ChevronRight size={20} /></button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded-lg overflow-hidden">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="bg-slate-50 py-2 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">{day}</div>
        ))}
        {Array.from({ length: startDay }).map((_, i) => (
          <div key={`pad-${i}`} className="bg-white h-20 sm:h-28" />
        ))}
        {days.map(day => {
          const dayBookings = bookings.filter(b => isSameDay(new Date(b.eventDate), day));
          const hasMorning = dayBookings.some(b => b.slot === 'Morning');
          const hasEvening = dayBookings.some(b => b.slot === 'Evening');

          return (
            <div 
              key={day.toString()} 
              onClick={() => dayBookings.length > 0 && setSelectedDateBookings(dayBookings)}
              className={`bg-white h-20 sm:h-28 p-2 relative group cursor-pointer hover:bg-slate-50 transition-colors`}
            >
              <span className="text-xs font-bold text-slate-400">{format(day, 'd')}</span>
              <div className="mt-2 space-y-1">
                {hasMorning && <div className="h-1.5 w-full bg-yellow-400 rounded-full" title="Morning Booked" />}
                {hasEvening && <div className="h-1.5 w-full bg-slate-400 rounded-full" title="Evening Booked" />}
              </div>
              {dayBookings.length > 0 && (
                <div className="absolute inset-0 bg-indigo-600/0 group-hover:bg-indigo-600/5 transition-colors" />
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center gap-6 text-[10px] sm:text-xs font-medium text-slate-500">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-yellow-400 rounded-full" />
          <span>Morning Slot</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-slate-400 rounded-full" />
          <span>Evening Slot</span>
        </div>
      </div>

      {selectedDateBookings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-indigo-600 text-white">
              <h4 className="font-bold">Bookings for {format(new Date(selectedDateBookings[0].eventDate), 'PPP')}</h4>
              <button onClick={() => setSelectedDateBookings(null)} className="hover:bg-white/20 p-1 rounded-full transition-colors"><XCircle size={24} /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {selectedDateBookings.map(b => (
                <div key={b.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${b.slot === 'Morning' ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-200 text-slate-700'}`}>
                      {b.slot}
                    </span>
                    <span className="text-xs font-bold text-indigo-600">#{b.bookingNumber}</span>
                  </div>
                  <p className="font-bold text-slate-900">{b.customerName}</p>
                  <p className="text-xs text-slate-500 flex items-center gap-1"><Building size={12} /> {b.hallName}</p>
                  <div className="pt-2 flex justify-end">
                    <button 
                      onClick={() => window.location.href = `/bookings/${b.id}`}
                      className="text-xs font-bold text-indigo-600 hover:underline"
                    >
                      View Full Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Dashboard = () => {
  const user = getCurrentUser();
  const tenantId = getTenantId();
  const isSuperAdmin = user.role === 'super_admin';

  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    stats: null as any,
    calendar: [] as any[],
    upcoming: [] as any[],
    completed: [] as any[],
    invoices: [] as any[],
    charts: null as any
  });

  const [superAdminStats, setSuperAdminStats] = useState({
    tenants: 0,
    activePlans: 0,
    branches: 0,
    halls: 0,
  });

  useEffect(() => {
    if (isSuperAdmin) {
      const fetchSuperAdminData = async () => {
        try {
          const [tenantsRes, plansRes, branchesRes] = await Promise.all([
            fetch('/api/tenants'),
            fetch('/api/plans'),
            fetch('/api/branches')
          ]);
          setSuperAdminStats({
            tenants: (await tenantsRes.json()).length,
            activePlans: (await plansRes.json()).length,
            branches: (await branchesRes.json()).length,
            halls: 0
          });
        } catch (error) {
          console.error("Super Admin fetch error:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchSuperAdminData();
      return;
    }

    const fetchAll = async () => {
      setLoading(true);
      try {
        const [statsRes, calRes, upRes, compRes, invRes, chartRes] = await Promise.all([
          fetch(`/api/dashboard/stats?tenantId=${tenantId}`),
          fetch(`/api/dashboard/calendar?tenantId=${tenantId}`),
          fetch(`/api/dashboard/upcoming-events?tenantId=${tenantId}`),
          fetch(`/api/dashboard/completed-events?tenantId=${tenantId}`),
          fetch(`/api/dashboard/invoices?tenantId=${tenantId}`),
          fetch(`/api/dashboard/charts?tenantId=${tenantId}`)
        ]);

        setDashboardData({
          stats: await statsRes.json(),
          calendar: await calRes.json(),
          upcoming: await upRes.json(),
          completed: await compRes.json(),
          invoices: await invRes.json(),
          charts: await chartRes.json()
        });
      } catch (error) {
        console.error("Dashboard fetch error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [isSuperAdmin, tenantId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium">Loading dashboard data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm sm:text-base text-slate-500">
            {isSuperAdmin 
              ? 'Welcome back to the Marquee ERP administration.' 
              : `Welcome back, ${user.fullName} (${user.tenantName})`}
          </p>
        </div>
        {!isSuperAdmin && (
          <button 
            onClick={() => window.location.href = '/bookings/add'}
            className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center gap-2"
          >
            <CalendarIcon size={18} />
            New Booking
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {isSuperAdmin ? (
          <>
            <StatCard icon={Users} label="Total Tenants" value={superAdminStats.tenants} color="bg-indigo-600" />
            <StatCard icon={CreditCard} label="Active Plans" value={superAdminStats.activePlans} color="bg-emerald-600" />
            <StatCard icon={Building} label="Total Branches" value={superAdminStats.branches} color="bg-amber-600" />
            <StatCard icon={TrendingUp} label="System Status" value="Healthy" color="bg-indigo-500" />
          </>
        ) : (
          <>
            <StatCard icon={DollarSign} label="Total Sales" value={dashboardData.stats?.totalSales} prefix="Rs. " color="bg-emerald-600" />
            <StatCard icon={CalendarIcon} label="Total Bookings" value={dashboardData.stats?.totalBookings} color="bg-indigo-600" />
            <StatCard icon={CheckCircle2} label="Confirmed Bookings" value={dashboardData.stats?.confirmedBookings} color="bg-blue-600" />
            <StatCard icon={XCircle} label="Cancelled Bookings" value={dashboardData.stats?.cancelledBookings} color="bg-red-600" />
            <StatCard icon={FileText} label="Total Invoices" value={dashboardData.stats?.totalInvoices} color="bg-slate-700" />
            <StatCard icon={Clock} label="Pending Invoices" value={dashboardData.stats?.pendingInvoices} color="bg-amber-500" />
            <StatCard icon={CheckCircle2} label="Paid Invoices" value={dashboardData.stats?.paidInvoices} color="bg-emerald-500" />
            <StatCard icon={TrendingUp} label="Growth" value="12%" color="bg-indigo-500" />
          </>
        )}
      </div>

      {!isSuperAdmin && (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Calendar */}
            <div className="xl:col-span-2">
              <Calendar bookings={dashboardData.calendar} />
            </div>

            {/* Charts */}
            <div className="space-y-8">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-full">
                <h3 className="text-lg font-bold text-slate-900 mb-6">Monthly Sales (Rs.)</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dashboardData.charts?.monthlySales}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="month" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                        tickFormatter={(val) => ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][parseInt(val)-1]}
                      />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                      <Tooltip 
                        cursor={{ fill: '#f8fafc' }}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar dataKey="total" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {/* Tables Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Upcoming Events */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <CalendarIcon size={18} className="text-indigo-600" />
                  Upcoming Events (Top 10)
                </h3>
                <button onClick={() => window.location.href = '/bookings'} className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1">
                  View All <ArrowRight size={14} />
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-6 py-3">Event Date</th>
                      <th className="px-6 py-3">Customer</th>
                      <th className="px-6 py-3">Hall</th>
                      <th className="px-6 py-3">Slot</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dashboardData.upcoming.length === 0 ? (
                      <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400 italic">No upcoming events found.</td></tr>
                    ) : (
                      dashboardData.upcoming.map((b) => (
                        <tr key={b.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => window.location.href = `/bookings/${b.id}`}>
                          <td className="px-6 py-4 font-bold text-slate-900">{format(new Date(b.eventDate), 'MMM dd, yyyy')}</td>
                          <td className="px-6 py-4">
                            <p className="font-medium text-slate-900">{b.customerName}</p>
                            <p className="text-xs text-slate-500">{b.customerPhone}</p>
                          </td>
                          <td className="px-6 py-4 text-slate-600">{b.hallName}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${b.slot === 'Morning' ? 'bg-yellow-50 text-yellow-700 border border-yellow-100' : 'bg-slate-100 text-slate-700 border border-slate-200'}`}>
                              {b.slot}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Invoices Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <FileText size={18} className="text-indigo-600" />
                  Recent Invoices
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-6 py-3">Booking #</th>
                      <th className="px-6 py-3">Customer</th>
                      <th className="px-6 py-3">Amount</th>
                      <th className="px-6 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dashboardData.invoices.length === 0 ? (
                      <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400 italic">No invoices found.</td></tr>
                    ) : (
                      dashboardData.invoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => window.location.href = `/bookings/${inv.id}`}>
                          <td className="px-6 py-4 font-bold text-indigo-600">#{inv.bookingNumber}</td>
                          <td className="px-6 py-4 font-medium text-slate-900">{inv.customerName}</td>
                          <td className="px-6 py-4 font-black text-slate-900">Rs. {inv.grandTotal?.toLocaleString()}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              inv.paymentStatus === 'Paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                              inv.paymentStatus === 'Partial' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                              'bg-red-50 text-red-700 border border-red-100'
                            }`}>
                              {inv.paymentStatus}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Completed Events */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden lg:col-span-2">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-emerald-600" />
                  Completed Events
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-6 py-3">Event Date</th>
                      <th className="px-6 py-3">Booking #</th>
                      <th className="px-6 py-3">Customer</th>
                      <th className="px-6 py-3">Hall</th>
                      <th className="px-6 py-3">Total Amount</th>
                      <th className="px-6 py-3">Payment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dashboardData.completed.length === 0 ? (
                      <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400 italic">No completed events found.</td></tr>
                    ) : (
                      dashboardData.completed.map((b) => (
                        <tr key={b.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => window.location.href = `/bookings/${b.id}`}>
                          <td className="px-6 py-4 font-bold text-slate-900">{format(new Date(b.eventDate), 'MMM dd, yyyy')}</td>
                          <td className="px-6 py-4 text-indigo-600 font-medium">#{b.bookingNumber}</td>
                          <td className="px-6 py-4 font-medium text-slate-900">{b.customerName}</td>
                          <td className="px-6 py-4 text-slate-600">{b.hallName}</td>
                          <td className="px-6 py-4 font-bold text-slate-900">Rs. {b.grandTotal?.toLocaleString()}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              b.paymentStatus === 'Paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                            }`}>
                              {b.paymentStatus}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {isSuperAdmin && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold mb-4">System Health</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Database Connection</span>
              <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">ONLINE</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Storage Usage</span>
              <span className="text-sm font-medium">12% of 100GB</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
