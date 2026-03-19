import React, { useState, useEffect } from 'react';
import { 
  BarChart3, CalendarCheck, Package, Users, Settings, 
  Download, Printer, FileText, FileSpreadsheet, ChevronDown
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { getCurrentUser } from '../utils/session';
import { SearchableSelect } from '../components/SearchableSelect';
import { Pagination } from '../components/Pagination';

// Utility functions for exporting
const exportPDF = (title: string, columns: string[], data: any[][]) => {
  const doc = new jsPDF();
  doc.text(title, 14, 15);
  autoTable(doc, {
    head: [columns],
    body: data,
    startY: 20,
  });
  doc.save(`${title.replace(/\s+/g, '_')}.pdf`);
};

const exportExcel = (title: string, data: any[]) => {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Report");
  XLSX.writeFile(wb, `${title.replace(/\s+/g, '_')}.xlsx`);
};

const printReport = (title: string, columns: string[], data: any[][]) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  
  const html = `
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { text-align: center; color: #333; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f4f4f4; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <table>
          <thead>
            <tr>${columns.map(c => `<th>${c}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${data.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}
          </tbody>
        </table>
        <script>
          window.onload = () => { window.print(); window.close(); }
        </script>
      </body>
    </html>
  `;
  printWindow.document.write(html);
  printWindow.document.close();
};

export default function Reports() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [packageRevenue, setPackageRevenue] = useState<any[]>([]);
  const [popularItems, setPopularItems] = useState<any[]>([]);

  // Filters for Bookings Report
  const [dateFilter, setDateFilter] = useState('');
  const [dateRangeFilter, setDateRangeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');

  const [bookingsPage, setBookingsPage] = useState(1);
  const [customersPage, setCustomersPage] = useState(1);
  const [packagesPage, setPackagesPage] = useState(1);
  const [itemsPage, setItemsPage] = useState(1);
  const [operationalPage, setOperationalPage] = useState(1);
  const itemsPerPage = 10;

  const user = getCurrentUser();
  const tenantId = user?.tenantId;

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const filterBookings = (b: any) => {
    if (statusFilter && b.status !== statusFilter) return false;
    if (userFilter && b.createdBy !== userFilter) return false;
    
    if (dateRangeFilter) {
      const eventDate = new Date(b.eventDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const diffTime = eventDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (dateRangeFilter === 'next_7' && (diffDays < 0 || diffDays > 7)) return false;
      if (dateRangeFilter === 'next_15' && (diffDays < 0 || diffDays > 15)) return false;
      if (dateRangeFilter === 'next_30' && (diffDays < 0 || diffDays > 30)) return false;
      if (dateRangeFilter === 'past_30' && (diffDays > 0 || diffDays < -30)) return false;
    } else if (dateFilter) {
      if (!b.eventDate.includes(dateFilter)) return false;
    }
    
    return true;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` };
      
      if (activeTab === 'dashboard' || activeTab === 'bookings' || activeTab === 'operational') {
        const [bookingsRes, statsRes, chartsRes] = await Promise.all([
          fetch(`/api/bookings?tenantId=${tenantId}`, { headers }),
          fetch(`/api/dashboard/stats?tenantId=${tenantId}`, { headers }),
          fetch(`/api/dashboard/charts?tenantId=${tenantId}`, { headers })
        ]);
        if (bookingsRes.ok) setBookings(await bookingsRes.json());
        
        let statsData = null;
        let chartsData = null;
        if (statsRes.ok) statsData = await statsRes.json();
        if (chartsRes.ok) chartsData = await chartsRes.json();
        
        setDashboardStats({
          stats: statsData,
          monthlyRevenue: chartsData?.monthlySales || [],
          monthlyBookings: chartsData?.monthlyBookings || [],
          monthlyPendingPayments: chartsData?.monthlyPendingPayments || []
        });
      }
      
      if (activeTab === 'customers') {
        const custRes = await fetch(`/api/customers?tenantId=${tenantId}`, { headers });
        if (custRes.ok) setCustomers(await custRes.json());
      }
      
      if (activeTab === 'packages') {
        const [pkgRes, itemsRes] = await Promise.all([
          fetch(`/api/reports/package-revenue?tenantId=${tenantId}`, { headers }),
          fetch(`/api/reports/popular-items?tenantId=${tenantId}`, { headers })
        ]);
        if (pkgRes.ok) setPackageRevenue(await pkgRes.json());
        if (itemsRes.ok) setPopularItems(await itemsRes.json());
      }
      
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'bookings', label: 'Booking / Event', icon: CalendarCheck },
    { id: 'packages', label: 'Package & Menu', icon: Package },
    { id: 'customers', label: 'Customer', icon: Users },
    { id: 'operational', label: 'Operational', icon: Settings },
  ];

  const ExportActions = ({ title, columns, data, rawData }: any) => (
    <div className="flex items-center gap-2">
      <button 
        onClick={() => exportPDF(title, columns, data)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-colors"
      >
        <FileText size={16} /> PDF
      </button>
      <button 
        onClick={() => exportExcel(title, rawData)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
      >
        <FileSpreadsheet size={16} /> Excel
      </button>
      <button 
        onClick={() => printReport(title, columns, data)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
      >
        <Printer size={16} /> Print
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports Module</h1>
          <p className="text-slate-500 text-sm mt-1">Comprehensive analytics and exports</p>
        </div>
      </div>

      <div className="flex overflow-x-auto gap-2 pb-2 border-b border-slate-200 hide-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-semibold transition-all whitespace-nowrap ${
              activeTab === tab.id 
                ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600' 
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {activeTab === 'dashboard' && dashboardStats && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-slate-800">Reports Dashboard</h2>
                <ExportActions 
                  title="Dashboard Summary" 
                  columns={['Metric', 'Value']} 
                  data={[
                    ['Total Bookings', dashboardStats.stats?.totalBookings || 0],
                    ['Total Revenue', `Rs. ${dashboardStats.stats?.totalSales?.toLocaleString() || 0}`],
                    ['Received Payment', `Rs. ${dashboardStats.stats?.receivedPayment?.toLocaleString() || 0}`],
                    ['Pending Payments', `Rs. ${dashboardStats.stats?.pendingPayment?.toLocaleString() || 0}`]
                  ]}
                  rawData={[
                    { Metric: 'Total Bookings', Value: dashboardStats.stats?.totalBookings || 0 },
                    { Metric: 'Total Revenue', Value: dashboardStats.stats?.totalSales || 0 },
                    { Metric: 'Received Payment', Value: dashboardStats.stats?.receivedPayment || 0 },
                    { Metric: 'Pending Payments', Value: dashboardStats.stats?.pendingPayment || 0 }
                  ]}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="text-sm font-medium text-slate-500 mb-1">Total Bookings</h3>
                  <p className="text-3xl font-bold text-slate-900">{dashboardStats.stats?.totalBookings || 0}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="text-sm font-medium text-slate-500 mb-1">Total Revenue</h3>
                  <p className="text-3xl font-bold text-emerald-600">Rs. {(dashboardStats.stats?.totalSales || 0).toLocaleString()}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="text-sm font-medium text-slate-500 mb-1">Received Payment</h3>
                  <p className="text-3xl font-bold text-indigo-600">Rs. {(dashboardStats.stats?.receivedPayment || 0).toLocaleString()}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="text-sm font-medium text-slate-500 mb-1">Pending Payments</h3>
                  <p className="text-3xl font-bold text-amber-500">Rs. {(dashboardStats.stats?.pendingPayment || 0).toLocaleString()}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">Revenue Trend</h3>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dashboardStats.monthlyRevenue || []}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `Rs.${val/1000}k`} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          formatter={(value: any) => [`Rs. ${value.toLocaleString()}`, 'Revenue']}
                        />
                        <Legend />
                        <Bar dataKey="revenue" name="Revenue" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">Pending Payments Trend</h3>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dashboardStats.monthlyPendingPayments || dashboardStats.charts?.monthlyPendingPayments || []}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `Rs.${val/1000}k`} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          formatter={(value: any) => [`Rs. ${value.toLocaleString()}`, 'Pending Payment']}
                        />
                        <Legend />
                        <Bar dataKey="pending" name="Pending Payments" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mt-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Bookings Trend</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dashboardStats.monthlyBookings || dashboardStats.charts?.monthlyBookings || []}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: any) => [value, 'Bookings']}
                      />
                      <Legend />
                      <Bar dataKey="bookings" name="Bookings" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'bookings' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-50 gap-4">
                <div className="flex flex-col gap-2">
                  <h2 className="font-bold text-slate-800">All Bookings Report</h2>
                  <div className="flex flex-wrap gap-2 items-center">
                    <SearchableSelect
                      options={[
                        { value: '', label: 'All Time' },
                        { value: 'next_7', label: 'Next 7 Days' },
                        { value: 'next_15', label: 'Next 15 Days' },
                        { value: 'next_30', label: 'Next 30 Days' },
                        { value: 'past_30', label: 'Past 30 Days' },
                        { value: 'custom', label: 'Specific Date' }
                      ]}
                      value={dateRangeFilter}
                      onChange={(val) => {
                        setDateRangeFilter(val);
                        if (val) setDateFilter('');
                      }}
                      placeholder="All Time"
                    />
                    
                    {dateRangeFilter === 'custom' && (
                      <input 
                        type="date" 
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    )}

                    <SearchableSelect
                      options={[
                        { value: '', label: 'All Statuses' },
                        { value: 'Approved', label: 'Approved / Booked' },
                        { value: 'Pending', label: 'Pending' },
                        { value: 'Cancelled', label: 'Cancelled' },
                        { value: 'Completed', label: 'Completed' }
                      ]}
                      value={statusFilter}
                      onChange={setStatusFilter}
                      placeholder="All Statuses"
                    />

                    <SearchableSelect
                      options={[
                        { value: '', label: 'All Users' },
                        ...Array.from(new Map(
                          bookings.filter(b => b.createdBy && b.createdByName).map(b => [b.createdBy, b.createdByName])
                        ).entries()).map(([id, name]: any) => {
                          const count = bookings.filter(b => b.createdBy === id).length;
                          return { value: id, label: `${name} (${count} bookings)` };
                        })
                      ]}
                      value={userFilter}
                      onChange={setUserFilter}
                      placeholder="All Users"
                    />
                  </div>
                </div>
                <ExportActions 
                  title="Bookings Report" 
                  columns={['Booking #', 'Customer', 'Date', 'Status', 'Created By', 'Total']} 
                  data={bookings
                    .filter(filterBookings)
                    .map(b => [b.bookingNumber, b.customerName, b.eventDate, b.status, b.createdByName || 'N/A', `Rs. ${b.grandTotal}`])}
                  rawData={bookings
                    .filter(filterBookings)
                    .map(b => ({
                      'Booking Number': b.bookingNumber,
                      'Customer': b.customerName,
                      'Date': b.eventDate,
                      'Slot': b.slot,
                      'Status': b.status,
                      'Created By': b.createdByName || 'N/A',
                      'Payment Status': b.paymentStatus,
                      'Grand Total': b.grandTotal
                    }))}
                />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Booking #</th>
                      <th className="px-4 py-3 font-semibold">Customer</th>
                      <th className="px-4 py-3 font-semibold">Date</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Created By</th>
                      <th className="px-4 py-3 font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {(() => {
                      const filteredBookings = bookings.filter(filterBookings);
                      const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);
                      const startIndex = (bookingsPage - 1) * itemsPerPage;
                      const paginatedBookings = filteredBookings.slice(startIndex, startIndex + itemsPerPage);
                      
                      return (
                        <>
                          {paginatedBookings.map((b) => (
                            <tr key={b.id} className="hover:bg-slate-50">
                              <td className="px-4 py-3 font-medium text-indigo-600">#{b.bookingNumber}</td>
                              <td className="px-4 py-3 font-medium">{b.customerName}</td>
                              <td className="px-4 py-3">{b.eventDate} <span className="text-xs text-slate-400">({b.slot})</span></td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                  b.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
                                  b.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                                  b.status === 'Approved' ? 'bg-blue-100 text-blue-700' :
                                  'bg-amber-100 text-amber-700'
                                }`}>
                                  {b.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-slate-600">{b.createdByName || 'N/A'}</td>
                              <td className="px-4 py-3 font-medium text-emerald-600">Rs. {b.grandTotal}</td>
                            </tr>
                          ))}
                          {filteredBookings.length === 0 && (
                            <tr>
                              <td colSpan={6} className="px-4 py-8 text-center text-slate-500">No bookings found for selected criteria.</td>
                            </tr>
                          )}
                          {totalPages > 1 && (
                            <tr>
                              <td colSpan={6} className="px-4 py-3 border-t border-slate-200">
                                <Pagination 
                                  currentPage={bookingsPage}
                                  totalPages={totalPages}
                                  onPageChange={setBookingsPage}
                                />
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'customers' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                <h2 className="font-bold text-slate-800">Top & Repeat Customers</h2>
                <ExportActions 
                  title="Top Customers Report" 
                  columns={['Customer Name', 'Phone', 'Email', 'CNIC', 'Total Bookings', 'Total Spent']} 
                  data={Object.values(bookings.reduce((acc, b) => {
                    const id = b.customerId || b.customerName;
                    if (!acc[id]) acc[id] = { name: b.customerName, phone: b.customerPhone || 'N/A', email: b.customerEmail || 'N/A', cnic: b.customerCnic || 'N/A', count: 0, spent: 0 };
                    acc[id].count++;
                    acc[id].spent += Number(b.grandTotal) || 0;
                    return acc;
                  }, {})).sort((a: any, b: any) => b.spent - a.spent).map((c: any) => [c.name, c.phone, c.email, c.cnic, c.count, `Rs. ${c.spent.toLocaleString()}`])}
                  rawData={Object.values(bookings.reduce((acc, b) => {
                    const id = b.customerId || b.customerName;
                    if (!acc[id]) acc[id] = { name: b.customerName, phone: b.customerPhone || 'N/A', email: b.customerEmail || 'N/A', cnic: b.customerCnic || 'N/A', count: 0, spent: 0 };
                    acc[id].count++;
                    acc[id].spent += Number(b.grandTotal) || 0;
                    return acc;
                  }, {})).sort((a: any, b: any) => b.spent - a.spent).map((c: any) => ({
                    'Customer Name': c.name,
                    'Phone': c.phone,
                    'Email': c.email,
                    'CNIC': c.cnic,
                    'Total Bookings': c.count,
                    'Total Spent': `Rs. ${c.spent.toLocaleString()}`
                  }))}
                />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Customer Name</th>
                      <th className="px-4 py-3 font-semibold">Contact Info</th>
                      <th className="px-4 py-3 font-semibold">CNIC</th>
                      <th className="px-4 py-3 font-semibold">Total Bookings</th>
                      <th className="px-4 py-3 font-semibold">Total Spent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {(() => {
                      const allCustomers = Object.values(bookings.reduce((acc, b) => {
                        const id = b.customerId || b.customerName;
                        if (!acc[id]) acc[id] = { name: b.customerName, phone: b.customerPhone || 'N/A', email: b.customerEmail || 'N/A', cnic: b.customerCnic || 'N/A', count: 0, spent: 0 };
                        acc[id].count++;
                        acc[id].spent += Number(b.grandTotal) || 0;
                        return acc;
                      }, {})).sort((a: any, b: any) => b.spent - a.spent);
                      
                      const totalPages = Math.ceil(allCustomers.length / itemsPerPage);
                      const startIndex = (customersPage - 1) * itemsPerPage;
                      const paginatedCustomers = allCustomers.slice(startIndex, startIndex + itemsPerPage);

                      return (
                        <>
                          {paginatedCustomers.map((c: any, i) => (
                            <tr key={i} className="hover:bg-slate-50">
                              <td className="px-4 py-3 font-medium">{c.name}</td>
                              <td className="px-4 py-3">
                                <div className="text-slate-900">{c.phone}</div>
                                {c.email !== 'N/A' && <div className="text-xs text-slate-500">{c.email}</div>}
                              </td>
                              <td className="px-4 py-3 text-slate-500">{c.cnic}</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${c.count > 1 ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-700'}`}>
                                  {c.count} {c.count > 1 ? '(Repeat)' : ''}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-medium text-emerald-600">Rs. {c.spent.toLocaleString()}</td>
                            </tr>
                          ))}
                          {allCustomers.length === 0 && (
                            <tr>
                              <td colSpan={5} className="px-4 py-8 text-center text-slate-500">No customers found in bookings.</td>
                            </tr>
                          )}
                          {totalPages > 1 && (
                            <tr>
                              <td colSpan={5} className="px-4 py-3 border-t border-slate-200">
                                <Pagination 
                                  currentPage={customersPage}
                                  totalPages={totalPages}
                                  onPageChange={setCustomersPage}
                                />
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'packages' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                  <h2 className="font-bold text-slate-800">Most Sold Packages</h2>
                  <ExportActions 
                    title="Package Revenue Report" 
                    columns={['Package Name', 'Revenue', 'Bookings Count']} 
                    data={packageRevenue.map(p => [p.name, `Rs. ${p.revenue}`, p.bookingcount])}
                    rawData={packageRevenue}
                  />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Package Name</th>
                        <th className="px-4 py-3 font-semibold">Total Revenue</th>
                        <th className="px-4 py-3 font-semibold">Bookings Count</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {(() => {
                        const totalPages = Math.ceil(packageRevenue.length / itemsPerPage);
                        const startIndex = (packagesPage - 1) * itemsPerPage;
                        const paginatedPackages = packageRevenue.slice(startIndex, startIndex + itemsPerPage);
                        
                        return (
                          <>
                            {paginatedPackages.map((p, i) => (
                              <tr key={i} className="hover:bg-slate-50">
                                <td className="px-4 py-3 font-medium">{p.name}</td>
                                <td className="px-4 py-3 font-medium text-emerald-600">Rs. {Number(p.revenue).toLocaleString()}</td>
                                <td className="px-4 py-3">{p.bookingcount}</td>
                              </tr>
                            ))}
                            {packageRevenue.length === 0 && (
                              <tr>
                                <td colSpan={3} className="px-4 py-8 text-center text-slate-500">No package data found.</td>
                              </tr>
                            )}
                            {totalPages > 1 && (
                              <tr>
                                <td colSpan={3} className="px-4 py-3 border-t border-slate-200">
                                  <Pagination 
                                    currentPage={packagesPage}
                                    totalPages={totalPages}
                                    onPageChange={setPackagesPage}
                                  />
                                </td>
                              </tr>
                            )}
                          </>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                  <h2 className="font-bold text-slate-800">Menu Item Consumption</h2>
                  <ExportActions 
                    title="Menu Items Report" 
                    columns={['Item Name', 'Category', 'Total Qty', 'Bookings']} 
                    data={popularItems.map(p => [p.name, p.categoryname, p.totalqty, p.bookingcount])}
                    rawData={popularItems}
                  />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Item Name</th>
                        <th className="px-4 py-3 font-semibold">Category</th>
                        <th className="px-4 py-3 font-semibold">Total Quantity Consumed</th>
                        <th className="px-4 py-3 font-semibold">Bookings Using It</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {(() => {
                        const totalPages = Math.ceil(popularItems.length / itemsPerPage);
                        const startIndex = (itemsPage - 1) * itemsPerPage;
                        const paginatedItems = popularItems.slice(startIndex, startIndex + itemsPerPage);

                        return (
                          <>
                            {paginatedItems.map((p, i) => (
                              <tr key={i} className="hover:bg-slate-50">
                                <td className="px-4 py-3 font-medium">{p.name}</td>
                                <td className="px-4 py-3">{p.categoryname}</td>
                                <td className="px-4 py-3 font-medium">{p.totalqty}</td>
                                <td className="px-4 py-3">{p.bookingcount}</td>
                              </tr>
                            ))}
                            {popularItems.length === 0 && (
                              <tr>
                                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">No item data found.</td>
                              </tr>
                            )}
                            {totalPages > 1 && (
                              <tr>
                                <td colSpan={4} className="px-4 py-3 border-t border-slate-200">
                                  <Pagination 
                                    currentPage={itemsPage}
                                    totalPages={totalPages}
                                    onPageChange={setItemsPage}
                                  />
                                </td>
                              </tr>
                            )}
                          </>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'operational' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                <h2 className="font-bold text-slate-800">Hall Utilization Report</h2>
                <ExportActions 
          title="Hall Utilization" 
          columns={['Hall Name', 'Total Bookings', 'Occupancy (%)', 'Total Revenue']} 
          data={Object.values(bookings.reduce((acc, b) => {
            const hall = b.hallName || 'Unknown';
            if (!acc[hall]) acc[hall] = { hall, count: 0, revenue: 0 };
            acc[hall].count++;
            acc[hall].revenue += Number(b.grandTotal) || 0;
            return acc;
          }, {})).map((h: any) => {
            const totalBookingsCount = bookings.length || 1;
            const occupancyPercent = ((h.count / totalBookingsCount) * 100).toFixed(1);
            return [h.hall, h.count, `${occupancyPercent}%`, `Rs. ${h.revenue.toLocaleString()}`];
          })}
          rawData={Object.values(bookings.reduce((acc, b) => {
            const hall = b.hallName || 'Unknown';
            if (!acc[hall]) acc[hall] = { hall, count: 0, revenue: 0 };
            acc[hall].count++;
            acc[hall].revenue += Number(b.grandTotal) || 0;
            return acc;
          }, {})).map((h: any) => {
            const totalBookingsCount = bookings.length || 1;
            const occupancyPercent = ((h.count / totalBookingsCount) * 100).toFixed(1);
            return {
              'Hall Name': h.hall,
              'Total Bookings': h.count,
              'Occupancy (%)': `${occupancyPercent}%`,
              'Total Revenue': `Rs. ${h.revenue}`
            };
          })}
                />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Hall Name</th>
                      <th className="px-4 py-3 font-semibold">Total Bookings</th>
                      <th className="px-4 py-3 font-semibold">Occupancy (%)</th>
                      <th className="px-4 py-3 font-semibold">Total Revenue Generated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {(() => {
                      const hallStats = Object.values(bookings.reduce((acc, b) => {
                        const hall = b.hallName || 'Unknown';
                        if (!acc[hall]) acc[hall] = { hall, count: 0, revenue: 0 };
                        acc[hall].count++;
                        acc[hall].revenue += Number(b.grandTotal) || 0;
                        return acc;
                      }, {}));
                      
                      const totalPages = Math.ceil(hallStats.length / itemsPerPage);
                      const startIndex = (operationalPage - 1) * itemsPerPage;
                      const paginatedStats = hallStats.slice(startIndex, startIndex + itemsPerPage);

                      return (
                        <>
                          {paginatedStats.map((h: any, i) => {
                            const totalBookingsCount = bookings.length || 1;
                            const occupancyPercent = ((h.count / totalBookingsCount) * 100).toFixed(1);
                            return (
                              <tr key={i} className="hover:bg-slate-50">
                                <td className="px-4 py-3 font-medium">{h.hall}</td>
                                <td className="px-4 py-3">{h.count}</td>
                                <td className="px-4 py-3 text-indigo-600 font-medium">{occupancyPercent}%</td>
                                <td className="px-4 py-3 font-medium text-emerald-600">Rs. {h.revenue.toLocaleString()}</td>
                              </tr>
                            );
                          })}
                          {hallStats.length === 0 && (
                            <tr>
                              <td colSpan={4} className="px-4 py-8 text-center text-slate-500">No data found.</td>
                            </tr>
                          )}
                          {totalPages > 1 && (
                            <tr>
                              <td colSpan={4} className="px-4 py-3 border-t border-slate-200">
                                <Pagination 
                                  currentPage={operationalPage}
                                  totalPages={totalPages}
                                  onPageChange={setOperationalPage}
                                />
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
