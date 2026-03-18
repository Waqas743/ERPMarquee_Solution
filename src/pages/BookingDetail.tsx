import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { 
  ArrowLeft, Calendar, MapPin, User, Phone, Mail, 
  CreditCard, CheckCircle2, XCircle, Clock, AlertCircle,
  FileText, Download, Upload, MessageSquare, Send,
  Plus, Printer, Share2, MoreVertical, Trash2, DollarSign, Utensils, Edit2
} from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const BookingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<any>(null);
  const [payments, setPayments] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [contract, setContract] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details');
  
  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [newPayment, setNewPayment] = useState({
    type: 'Installment',
    amount: '',
    dueDate: format(new Date(), 'yyyy-MM-dd'),
    status: 'Pending'
  });
  
  // Approval Modal State
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState('');
  const [approvalComments, setApprovalComments] = useState('');
  
  // Contract Editor State
  const [isContractEditorOpen, setIsContractEditorOpen] = useState(false);
  const [contractContent, setContractContent] = useState('');
  
  // Print State
  const [printType, setPrintType] = useState<'details' | 'invoice' | 'contract' | null>(null);

  const user = JSON.parse(localStorage.getItem('adminUser') || '{}');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [bookingRes, paymentsRes, approvalsRes, contractRes] = await Promise.all([
        fetch(`/api/bookings/${id}`),
        fetch(`/api/bookings/${id}/payments`),
        fetch(`/api/bookings/${id}/approvals`),
        fetch(`/api/bookings/${id}/contract`)
      ]);
      
      setBooking(await bookingRes.json());
      setPayments(await paymentsRes.json());
      setApprovals(await approvalsRes.json());
      setContract(await contractRes.json());
    } catch (error) {
      console.error("Error fetching booking details:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const safeFormat = (value: any, pattern: string) => {
    try {
      const dt = new Date(value);
      if (isNaN(dt.getTime())) return '-';
      return format(dt, pattern);
    } catch {
      return '-';
    }
  };

  const handleAddPayment = async () => {
    if (!newPayment.amount || !newPayment.dueDate) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Information',
        text: 'Please enter amount and due date'
      });
      return;
    }

    const totalPaidAndPending = payments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
    const remainingAmount = booking.grandTotal - totalPaidAndPending;

    if (Number(newPayment.amount) > remainingAmount + 0.01) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid Amount',
        text: `Payment amount cannot exceed remaining amount (Rs. ${remainingAmount.toLocaleString()})`
      });
      return;
    }

    try {
      const res = await fetch(`/api/bookings/${id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPayment)
      });
      if (res.ok) {
        setIsPaymentModalOpen(false);
        setNewPayment({
          type: 'Installment',
          amount: '',
          dueDate: format(new Date(), 'yyyy-MM-dd'),
          status: 'Pending'
        });
        fetchData();
      } else {
        const data = await res.json();
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: data.message || "Failed to add payment"
        });
      }
    } catch (error) {
      console.error("Add payment error:", error);
    }
  };

  const handleDeletePayment = async (paymentId: number) => {
    const payment = payments.find((p: any) => p.id === paymentId) as any;
    if (payment && payment.status === 'Paid') {
      Swal.fire({
        icon: 'error',
        title: 'Cannot Delete',
        text: 'Paid payments cannot be deleted'
      });
      return;
    }

    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You want to delete this payment?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`/api/bookings/${id}/payments/${paymentId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchData();
      } else {
        const data = await res.json();
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: data.message || "Failed to delete payment"
        });
      }
    } catch (error) {
      console.error("Delete payment error:", error);
    }
  };

  const handleCancelBooking = () => {
    // Check if booking is approved and has payments
    if (booking.status === 'Approved' && booking.paymentStatus !== 'Not Paid') {
      Swal.fire({
        icon: 'error',
        title: 'Cannot Cancel',
        text: 'Approved bookings with partial or full payments cannot be cancelled.'
      });
      return;
    }

    // Check if advance is paid
    const isAdvancePaid = payments.some((p: any) => p.type === 'Advance' && p.status === 'Paid');
    
    if (isAdvancePaid) {
      Swal.fire({
        icon: 'error',
        title: 'Cannot Cancel',
        text: 'Booking cannot be cancelled because an Advance payment has already been received.'
      });
      return;
    }

    setApprovalStatus('Cancelled');
    setApprovalComments('');
    setIsApprovalModalOpen(true);
  };

  const handleApproval = async () => {
    try {
      const res = await fetch(`/api/bookings/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: approvalStatus,
          userId: user.id,
          comments: approvalComments
        })
      });
      if (res.ok) {
        setIsApprovalModalOpen(false);
        fetchData();
      } else {
        const data = await res.json();
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: data.message || "Failed to update status"
        });
      }
    } catch (error) {
      console.error("Approval error:", error);
    }
  };

  const handleSaveContract = async () => {
    try {
      const res = await fetch(`/api/bookings/${id}/contract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: contractContent })
      });
      if (res.ok) {
        setIsContractEditorOpen(false);
        fetchData();
      }
    } catch (error) {
      console.error("Contract error:", error);
    }
  };

  const generateInvoicePDF = async () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    let headerHeight = 45;

    // Add Logo if exists
    if (booking.tenantLogoUrl) {
      try {
        const img = new Image();
        img.src = booking.tenantLogoUrl;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = () => reject(new Error("Image load failed"));
          // Timeout after 3 seconds
          setTimeout(() => reject(new Error("Image load timeout")), 3000);
        });
        doc.addImage(img, 'PNG', 15, 10, 25, 25);
      } catch (e) {
        console.error("Could not load logo", e);
      }
    }

    // Tenant Name
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42);
    doc.text(booking.tenantName || 'Event Management System', booking.tenantLogoUrl ? 45 : 15, 25);
    
    // Header
    doc.setFontSize(24);
    doc.setTextColor(79, 70, 229); // Indigo-600
    doc.text('INVOICE', pageWidth - 15, 25, { align: 'right' });
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text(`Invoice No: INV-${booking.bookingNumber}`, 15, headerHeight - 5);
    doc.text(`Date: ${format(new Date(), 'PPP')}`, pageWidth - 15, headerHeight - 5, { align: 'right' });
    
    // Company & Customer Info
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42); // Slate-900
    doc.text('From:', 15, headerHeight + 10);
    doc.setFontSize(10);
    doc.text(booking.branchName || 'Main Branch', 15, headerHeight + 15);
    doc.text('Venue: ' + booking.hallName, 15, headerHeight + 20);
    
    doc.setFontSize(12);
    doc.text('Bill To:', pageWidth - 15, headerHeight + 10, { align: 'right' });
    doc.setFontSize(10);
    doc.text(booking.customerName, pageWidth - 15, headerHeight + 15, { align: 'right' });
    doc.text(booking.customerPhone || '', pageWidth - 15, headerHeight + 20, { align: 'right' });
    doc.text(booking.customerEmail || '', pageWidth - 15, headerHeight + 25, { align: 'right' });
    
    // Event Details
    doc.setFontSize(12);
    doc.text('Event Details:', 15, headerHeight + 40);
    doc.setFontSize(10);
    doc.text(`Type: ${booking.eventType}`, 15, headerHeight + 45);
    doc.text(`Date: ${safeFormat(booking.eventDate, 'PPP')}`, 15, headerHeight + 50);
    doc.text(`Slot: ${booking.slot}`, 15, headerHeight + 55);
    doc.text(`Guests: ${booking.guestCount}`, 15, headerHeight + 60);
    
    // Table
    const tableData = [
      ['Hall Rent', `Rs. ${booking.hallRent?.toLocaleString()}`],
      ['Decoration', `Rs. ${booking.decorationCharges?.toLocaleString()}`],
      ['DJ Charges', `Rs. ${booking.djCharges?.toLocaleString()}`],
      ['Fireworks', `Rs. ${(Number(booking.fireworkPrice) * Number(booking.fireworkQuantity))?.toLocaleString()}`],
      ['Catering', `Rs. ${booking.cateringCharges?.toLocaleString()}`],
      ['Add-ons', `Rs. ${booking.addOnsCharges?.toLocaleString()}`],
    ];
    
    autoTable(doc, {
      startY: headerHeight + 70,
      head: [['Description', 'Amount']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229] },
    });
    
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    
    // Totals
    doc.setFontSize(10);
    const subtotal = (
      Number(booking.hallRent) + 
      Number(booking.decorationCharges) + 
      Number(booking.cateringCharges) + 
      Number(booking.djCharges) + 
      (Number(booking.fireworkPrice) * Number(booking.fireworkQuantity))
    );
    doc.text(`Subtotal: Rs. ${subtotal.toLocaleString()}`, pageWidth - 15, finalY, { align: 'right' });
    doc.text(`Add-ons: Rs. ${booking.addOnsCharges?.toLocaleString()}`, pageWidth - 15, finalY + 5, { align: 'right' });
    doc.text(`Discount: Rs. ${booking.discount?.toLocaleString()}`, pageWidth - 15, finalY + 10, { align: 'right' });
    doc.text(`Tax: Rs. ${booking.tax?.toLocaleString()}`, pageWidth - 15, finalY + 15, { align: 'right' });
    
    doc.setFontSize(14);
    doc.setTextColor(79, 70, 229);
    doc.text(`Grand Total: Rs. ${booking.grandTotal?.toLocaleString()}`, pageWidth - 15, finalY + 25, { align: 'right' });
    
    // Payments
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text('Payment History:', 15, finalY + 35);
    
    const paymentData = payments.map((p: any) => [
      p.type,
      safeFormat(p.dueDate, 'MMM dd, yyyy'),
      p.status,
      `Rs. ${p.amount?.toLocaleString()}`
    ]);
    
    autoTable(doc, {
      startY: finalY + 40,
      head: [['Type', 'Due Date', 'Status', 'Amount']],
      body: paymentData,
      theme: 'grid',
      headStyles: { fillColor: [100, 116, 139] },
    });
    
    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text('Thank you for choosing us!', pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
    }
    
    // Open in PDF viewer (new tab)
    const pdfData = doc.output('bloburl');
    window.open(pdfData, '_blank');
  };

  const handlePrint = (type: 'details' | 'contract') => {
    setPrintType(type);
    // Use a small timeout to ensure the state update renders the printable content
    setTimeout(() => {
      window.focus();
      window.print();
    }, 250);
  };

  const generateContractTemplate = () => {
    const template = `
CONTRACT AGREEMENT - #${booking.bookingNumber}
--------------------------------------------------
DATE: ${format(new Date(), 'PPP')}

BETWEEN:
${booking.branchName} (The Venue)
AND
${booking.customerName} (The Client)

EVENT DETAILS:
Event Type: ${booking.eventType}
Event Date: ${safeFormat(booking.eventDate, 'PPP')}
Slot: ${booking.slot}
Venue: ${booking.hallName}
Guest Count: ${booking.guestCount}

FINANCIALS:
Grand Total: Rs. ${booking.grandTotal?.toLocaleString()}
Advance Paid: Rs. ${payments.find((p: any) => p.type === 'Advance')?.amount?.toLocaleString() || 0}

TERMS & CONDITIONS:
1. The client agrees to pay the remaining balance as per the agreed payment plan.
2. Cancellation must be made at least 30 days prior to the event date.
3. The venue is not responsible for any loss of personal belongings.
...
    `;
    setContractContent(template);
    setIsContractEditorOpen(true);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium">Loading booking details...</p>
      </div>
    );
  }

  if (!booking) return <div>Booking not found.</div>;

  const canEdit = booking?.status === 'Pending' || (booking?.status === 'Approved' && booking?.paymentStatus === 'Not Paid');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start sm:items-center gap-3 sm:gap-4">
          <button 
            onClick={() => navigate('/bookings')}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors shrink-0"
          >
            <ArrowLeft size={20} className="text-slate-600 sm:w-6 sm:h-6" />
          </button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <h1 className="text-xl sm:text-3xl font-bold text-slate-900 truncate">Booking #{booking.bookingNumber}</h1>
              <span className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold border ${
                booking.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                booking.status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                booking.status === 'Rejected' ? 'bg-red-50 text-red-700 border-red-100' : 
                booking.status === 'Cancelled' ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-indigo-50 text-indigo-700 border-indigo-100'
              }`}>
                {booking.status}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              Created: {safeFormat(booking.createdAt, 'MMM dd, yyyy')} • {booking.createdByName || booking.createdBy || '-'}
            </p>
            <p className="text-xs sm:text-sm text-slate-500">
              Modified: {safeFormat(booking.modifiedAt, 'MMM dd, yyyy')} • {booking.modifiedByName || booking.modifiedBy || '-'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 no-print">
          <button 
            onClick={() => navigate(`/bookings/edit/${id}`)}
            disabled={!canEdit}
            className={`p-2 rounded-xl transition-colors ${
              !canEdit 
                ? 'text-slate-300 cursor-not-allowed' 
                : 'text-slate-500 hover:bg-slate-100'
            }`}
            title={!canEdit ? "Only Pending bookings, or Approved bookings without payments can be edited" : "Edit Booking"}
          >
            <Edit2 size={18} className="sm:w-5 sm:h-5" />
          </button>
          <button 
            onClick={() => handlePrint('details')}
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
            title="Print Details"
          >
            <Printer size={18} className="sm:w-5 sm:h-5" />
          </button>
          <button 
            onClick={generateInvoicePDF}
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
            title="Print Invoice"
          >
            <FileText size={18} className="sm:w-5 sm:h-5" />
          </button>
          <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">
            <Share2 size={18} className="sm:w-5 sm:h-5" />
          </button>
          <div className="h-6 sm:h-8 w-px bg-slate-200 mx-1 sm:mx-2" />
          {booking.status === 'Pending' && booking.status !== 'Cancelled' && (
            <div className="flex items-center gap-2">
              <button 
                onClick={() => {
                  setApprovalStatus('Approved');
                  setIsApprovalModalOpen(true);
                }}
                className="bg-emerald-600 text-white px-3 sm:px-6 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 flex items-center gap-1.5 sm:gap-2"
              >
                <CheckCircle2 size={16} className="sm:w-4.5 sm:h-4.5" />
                Approve
              </button>
              <button 
                onClick={() => {
                  setApprovalStatus('Rejected');
                  setIsApprovalModalOpen(true);
                }}
                className="bg-white text-red-600 border border-red-200 px-3 sm:px-6 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold hover:bg-red-50 transition-all flex items-center gap-1.5 sm:gap-2"
              >
                <XCircle size={16} className="sm:w-4.5 sm:h-4.5" />
                Reject
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs - Scrollable on mobile */}
      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide border-b border-slate-200 no-print">
        <div className="flex gap-6 sm:gap-8 min-w-max">
          {[
            { id: 'details', label: 'Details', icon: <FileText size={18} />, disabled: false },
            { id: 'payments', label: 'Payments', icon: <CreditCard size={18} />, disabled: booking.status !== 'Approved' },
            { id: 'approvals', label: 'Approvals', icon: <MessageSquare size={18} />, disabled: false },
            { id: 'contract', label: 'Contract', icon: <FileText size={18} />, disabled: booking.status !== 'Approved' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => !tab.disabled && setActiveTab(tab.id)}
              disabled={tab.disabled}
              className={`flex items-center gap-2 py-4 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'border-indigo-600 text-indigo-600' 
                  : tab.disabled 
                    ? 'border-transparent text-slate-300 cursor-not-allowed'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
              title={tab.disabled ? "Booking must be Approved to access this tab" : ""}
            >
              {tab.icon}
              {tab.label}
              {tab.disabled && <Clock size={14} className="text-slate-300" />}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 no-print">
        <div className="lg:col-span-2 space-y-6 sm:space-y-8">
          {activeTab === 'details' && (
            <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500">
              {/* Event Info */}
              <div className="bg-white p-5 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Calendar size={18} className="text-indigo-600 sm:w-5 sm:h-5" />
                  Event Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Event Type</p>
                      <p className="text-base sm:text-lg font-bold text-slate-900">{booking.eventType}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date & Slot</p>
                      <p className="text-base sm:text-lg font-bold text-slate-900">{safeFormat(booking.eventDate, 'MMM dd, yyyy')} • {booking.slot}</p>
                    </div>
                    {booking.packageName && (
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Event Package</p>
                        <p className="text-base sm:text-lg font-bold text-indigo-600">{booking.packageName}</p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Venue</p>
                      <p className="text-base sm:text-lg font-bold text-slate-900 truncate">{booking.hallName}</p>
                      <p className="text-xs sm:text-sm text-slate-500 truncate">{booking.branchName}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Guest Count</p>
                      <p className="text-base sm:text-lg font-bold text-slate-900">{booking.guestCount} Persons</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              {booking.menuItems && booking.menuItems.length > 0 && (
                <div className="bg-white p-5 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Utensils size={18} className="text-indigo-600 sm:w-5 sm:h-5" />
                    Menu Selection
                  </h3>
                  <div className="space-y-8">
                    {Array.from(new Set(booking.menuItems.map((item: any) => item.categoryName))).map((categoryName: any) => (
                      <div key={categoryName} className="space-y-3">
                        <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-600"></div>
                          <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">{categoryName}</h4>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                          {booking.menuItems
                            .filter((item: any) => item.categoryName === categoryName)
                            .map((item: any) => (
                              <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <div>
                                  <p className="font-bold text-slate-900 text-sm">{item.itemName}</p>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-slate-900 text-sm">Qty: {item.quantity}</p>
                                  {item.notes && <p className="text-[10px] text-indigo-600 italic">{item.notes}</p>}
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Selected Add-ons */}
              {booking.selectedAddOns && booking.selectedAddOns.length > 0 && (
                <div className="bg-white p-5 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Plus size={18} className="text-indigo-600 sm:w-5 sm:h-5" />
                    Selected Add-ons
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {booking.selectedAddOns.map((ao: any) => (
                      <div key={ao.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{ao.addOnName}</p>
                          <p className="text-[10px] text-indigo-600 font-bold">
                            Rs. {ao.price?.toLocaleString()} x {booking.guestCount} = Rs. {(ao.price * booking.guestCount).toLocaleString()}
                          </p>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                          <CheckCircle2 size={16} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pricing Breakdown */}
              <div className="bg-white p-5 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                  <DollarSign size={18} className="text-indigo-600 sm:w-5 sm:h-5" />
                  Financial Breakdown
                </h3>
                <div className="space-y-2 sm:space-y-4">
                  <div className="flex justify-between py-2 sm:py-3 border-b border-slate-100 text-sm">
                    <span className="text-slate-600 font-medium">Hall Rental</span>
                    <span className="font-bold text-slate-900">Rs. {booking.hallRent?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 sm:py-3 border-b border-slate-100 text-sm">
                    <span className="text-slate-600 font-medium">Decoration</span>
                    <span className="font-bold text-slate-900">Rs. {booking.decorationCharges?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 sm:py-3 border-b border-slate-100 text-sm">
                    <span className="text-slate-600 font-medium">DJ Charges</span>
                    <span className="font-bold text-slate-900">Rs. {booking.djCharges?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 sm:py-3 border-b border-slate-100 text-sm">
                    <span className="text-slate-600 font-medium">Fireworks</span>
                    <span className="font-bold text-slate-900">Rs. {(Number(booking.fireworkPrice) * Number(booking.fireworkQuantity))?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 sm:py-3 border-b border-slate-100 text-sm">
                    <span className="text-slate-600 font-medium">Catering</span>
                    <span className="font-bold text-slate-900">Rs. {booking.cateringCharges?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 sm:py-3 border-b border-slate-100 text-sm">
                    <span className="text-slate-600 font-medium">Add-ons</span>
                    <span className="font-bold text-slate-900">Rs. {booking.addOnsCharges?.toLocaleString()}</span>
                  </div>
                  {booking.discount > 0 && (
                    <div className="flex justify-between py-2 sm:py-3 border-b border-slate-100 text-emerald-600 text-sm">
                      <span className="font-medium">Discount</span>
                      <span className="font-bold">- Rs. {booking.discount?.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 pt-6 gap-2">
                    <span className="text-lg sm:text-xl font-black text-slate-900">Grand Total</span>
                    <span className="text-xl sm:text-2xl font-black text-indigo-600">Rs. {booking.grandTotal?.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-500">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">Payment Schedule</h3>
                <button 
                  onClick={() => setIsPaymentModalOpen(true)}
                  disabled={booking.status !== 'Approved' || booking.status === 'Cancelled' || booking.status === 'Rejected'}
                  className={`font-bold text-sm flex items-center gap-1 hover:underline ${
                    (booking.status !== 'Approved' || booking.status === 'Cancelled' || booking.status === 'Rejected') ? 'text-slate-400 cursor-not-allowed' : 'text-indigo-600'
                  }`}
                  title={booking.status !== 'Approved' ? "Booking must be Approved to add payments" : ""}
                >
                  <Plus size={16} /> Add
                </button>
              </div>
              <div className="space-y-3 sm:space-y-4">
                {payments.map((payment: any) => (
                  <div key={payment.id} className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 ${payment.status === 'Paid' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                        <CreditCard size={20} className="sm:w-6 sm:h-6" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 text-sm sm:text-base">{payment.type}</p>
                        <p className="text-xs sm:text-sm text-slate-500">Due: {format(new Date(payment.dueDate), 'MMM dd, yyyy')}</p>
                      </div>
                    </div>
                      <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4 border-t sm:border-t-0 pt-3 sm:pt-0">
                        <div className="sm:text-right">
                          <p className="font-black text-slate-900 text-base sm:text-lg">Rs. {payment.amount?.toLocaleString()}</p>
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${payment.status === 'Paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                            {payment.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {payment.status === 'Pending' && (
                            <button 
                              onClick={async () => {
                                if (booking.status !== 'Approved') {
                                  Swal.fire({
                                    icon: 'info',
                                    title: 'Approval Required',
                                    text: 'Booking must be Approved to process payments'
                                  });
                                  return;
                                }
                                await fetch(`/api/bookings/${id}/payments/${payment.id}/pay`, { method: 'POST' });
                                fetchData();
                              }}
                              disabled={booking.status !== 'Approved' || booking.status === 'Cancelled' || booking.status === 'Rejected'}
                              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold transition-colors ${
                                (booking.status !== 'Approved' || booking.status === 'Cancelled' || booking.status === 'Rejected')
                                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
                              }`}
                            >
                              Pay
                            </button>
                          )}
                          <button 
                            onClick={() => handleDeletePayment(payment.id)}
                            disabled={payment.status === 'Paid'}
                            className={`p-1.5 sm:p-2 rounded-lg transition-all ${
                              payment.status === 'Paid' 
                                ? 'text-slate-200 cursor-not-allowed' 
                                : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                            }`}
                            title={payment.status === 'Paid' ? "Paid payments cannot be deleted" : "Delete Payment"}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'approvals' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <h3 className="text-lg font-bold text-slate-900">Approval History</h3>
              <div className="space-y-6 sm:space-y-8 relative before:absolute before:left-5 sm:before:left-6 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                {approvals.length === 0 ? (
                  <div className="text-center py-12 opacity-50">
                    <MessageSquare size={48} className="mx-auto mb-4 text-slate-300" />
                    <p className="text-slate-500">No approval history yet.</p>
                  </div>
                ) : (
                  approvals.map((approval: any) => (
                    <div key={approval.id} className="relative pl-12 sm:pl-16">
                      <div className={`absolute left-2 sm:left-3 top-0 w-6 h-6 rounded-full border-4 border-white shadow-sm flex items-center justify-center ${
                        approval.status === 'Approved' ? 'bg-emerald-500' :
                        approval.status === 'Rejected' ? 'bg-red-500' : 'bg-indigo-500'
                      }`}>
                        {approval.status === 'Approved' ? <CheckCircle2 size={12} className="text-white" /> : <Clock size={12} className="text-white" />}
                      </div>
                      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2 sm:space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <span className="font-bold text-slate-900 text-sm sm:text-base">{approval.userName}</span>
                          <span className="text-[10px] sm:text-xs text-slate-400">{safeFormat(approval.createdAt, 'MMM dd, p')}</span>
                        </div>
                        <div className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          approval.status === 'Approved' ? 'bg-emerald-50 text-emerald-700' :
                          approval.status === 'Rejected' ? 'bg-red-50 text-red-700' : 'bg-indigo-50 text-indigo-700'
                        }`}>
                          {approval.status}
                        </div>
                        <p className="text-slate-600 text-xs sm:text-sm italic">"{approval.comments || 'No comments provided.'}"</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'contract' && (
            <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-500">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h3 className="text-lg font-bold text-slate-900">Contract Management</h3>
                {!contract && (
                  <button 
                    onClick={generateContractTemplate}
                    disabled={booking.status !== 'Approved' || booking.status === 'Cancelled' || booking.status === 'Rejected'}
                    className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors w-full sm:w-fit justify-center ${
                      (booking.status !== 'Approved' || booking.status === 'Cancelled' || booking.status === 'Rejected')
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
                    title={booking.status !== 'Approved' ? "Booking must be Approved to generate contract" : ""}
                  >
                    <Plus size={18} />
                    Generate Contract
                  </button>
                )}
              </div>
              
              {contract ? (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 sm:p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="text-indigo-600 shrink-0" />
                      <span className="font-bold text-slate-900 text-sm truncate">Booking Contract - V1.0</span>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2">
                      <button 
                        onClick={() => {
                          setContractContent(contract.content);
                          setIsContractEditorOpen(true);
                        }}
                        disabled={booking.status === 'Cancelled' || booking.status === 'Rejected'}
                        className={`p-2 rounded-lg transition-colors ${
                          (booking.status === 'Cancelled' || booking.status === 'Rejected')
                            ? 'text-slate-300 cursor-not-allowed'
                            : 'text-slate-500 hover:bg-white'
                        }`}
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => handlePrint('contract')}
                        className="p-2 text-slate-500 hover:bg-white rounded-lg transition-colors"
                      >
                        <Printer size={18} />
                      </button>
                      <button className="p-2 text-slate-500 hover:bg-white rounded-lg transition-colors">
                        <Download size={18} />
                      </button>
                    </div>
                  </div>
                  <div className="p-4 sm:p-8 font-mono text-[10px] sm:text-sm whitespace-pre-wrap bg-white text-slate-700 max-h-[400px] sm:max-h-[500px] overflow-y-auto">
                    {contract.content}
                  </div>
                </div>
              ) : (
                <div className="p-8 sm:p-12 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 opacity-60">
                  <FileText size={40} className="mx-auto mb-4 text-slate-300 sm:w-12 sm:h-12" />
                  <p className="text-sm sm:text-base text-slate-500 font-medium">No contract has been generated yet.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6 sm:space-y-8">
          {/* Customer Card */}
          <div className="bg-white p-5 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <User size={18} className="text-indigo-600 sm:w-5 sm:h-5" />
              Customer Profile
            </h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-lg sm:text-xl shrink-0">
                  {booking.customerName?.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 truncate">{booking.customerName}</p>
                  <p className="text-[10px] sm:text-xs text-slate-500">CNIC: {booking.customerCnic || 'N/A'}</p>
                </div>
              </div>
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-600">
                  <Phone size={14} className="text-slate-400 sm:w-4 sm:h-4" />
                  {booking.customerPhone}
                </div>
                <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-600">
                  <Mail size={14} className="text-slate-400 sm:w-4 sm:h-4" />
                  <span className="truncate">{booking.customerEmail || 'N/A'}</span>
                </div>
                <div className="flex items-start gap-3 text-xs sm:text-sm text-slate-600">
                  <MapPin size={14} className="text-slate-400 shrink-0 mt-0.5 sm:w-4 sm:h-4" />
                  <span className="line-clamp-2">{booking.customerAddress || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-slate-900 p-5 sm:p-8 rounded-2xl text-white space-y-6 shadow-xl shadow-slate-200 no-print">
            <h3 className="font-bold flex items-center gap-2 text-sm sm:text-base">
              <Plus size={16} className="text-indigo-400 sm:w-4.5 sm:h-4.5" />
              Quick Actions
            </h3>
            <div className="grid grid-cols-1 gap-2 sm:gap-3">
              <button 
                onClick={generateInvoicePDF}
                className="w-full py-2.5 sm:py-3 px-4 bg-white/10 hover:bg-white/20 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-3"
              >
                <FileText size={16} className="sm:w-4.5 sm:h-4.5" /> Print Invoice
              </button>
              <button className="w-full py-2.5 sm:py-3 px-4 bg-white/10 hover:bg-white/20 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-3">
                <Upload size={16} className="sm:w-4.5 sm:h-4.5" /> Upload Documents
              </button>
              <button 
                onClick={handleCancelBooking}
                disabled={booking.status === 'Cancelled' || booking.status === 'Rejected'}
                className={`w-full py-2.5 sm:py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-3 ${
                  (booking.status === 'Cancelled' || booking.status === 'Rejected')
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                    : 'bg-red-500/20 hover:bg-red-500/30 text-red-400'
                }`}
              >
                <Trash2 size={16} className="sm:w-4.5 sm:h-4.5" /> 
                {booking.status === 'Cancelled' ? 'Booking Cancelled' : booking.status === 'Rejected' ? 'Booking Rejected' : 'Cancel Booking'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Printable Area */}
      <div className="print-only print-container">
        {printType === 'details' && (
          <div className="space-y-8">
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6">
              <div>
                <h1 className="text-3xl font-black text-slate-900">BOOKING SUMMARY</h1>
                <p className="text-slate-500 font-bold">#{booking.bookingNumber}</p>
              </div>
              <div className="text-right">
                <h2 className="text-xl font-bold text-slate-900">{booking.branchName}</h2>
                <p className="text-slate-500">{format(new Date(), 'PPP')}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-12">
              <div className="space-y-4">
                <h3 className="font-black text-slate-900 border-b border-slate-200 pb-2 uppercase tracking-widest text-xs">Customer Details</h3>
                <div className="space-y-1">
                  <p className="font-bold text-lg">{booking.customerName}</p>
                  <p className="text-slate-600">{booking.customerPhone}</p>
                  <p className="text-slate-600">{booking.customerEmail}</p>
                  <p className="text-slate-600">{booking.customerAddress}</p>
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="font-black text-slate-900 border-b border-slate-200 pb-2 uppercase tracking-widest text-xs">Event Details</h3>
                <div className="space-y-1">
                  <p className="font-bold text-lg">{booking.eventType}</p>
                  <p className="text-slate-600">{safeFormat(booking.eventDate, 'PPP')}</p>
                  <p className="text-slate-600">Slot: {booking.slot}</p>
                  <p className="text-slate-600">Venue: {booking.hallName}</p>
                  <p className="text-slate-600">Guests: {booking.guestCount}</p>
                </div>
              </div>
            </div>

            {booking.menuItems && booking.menuItems.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-black text-slate-900 border-b border-slate-200 pb-2 uppercase tracking-widest text-xs">Menu Selection</h3>
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="py-2 font-bold text-slate-900">Item</th>
                      <th className="py-2 font-bold text-slate-900">Category</th>
                      <th className="py-2 font-bold text-slate-900 text-right">Quantity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {booking.menuItems.map((item: any) => (
                      <tr key={item.id} className="border-b border-slate-100">
                        <td className="py-2 text-slate-700">{item.itemName}</td>
                        <td className="py-2 text-slate-500">{item.categoryName}</td>
                        <td className="py-2 text-slate-700 text-right font-bold">{item.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="font-black text-slate-900 border-b border-slate-200 pb-2 uppercase tracking-widest text-xs">Financial Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Hall Rent</span>
                  <span className="font-bold">Rs. {booking.hallRent?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Decoration</span>
                  <span className="font-bold">Rs. {booking.decorationCharges?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Catering</span>
                  <span className="font-bold">Rs. {booking.cateringCharges?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Add-ons</span>
                  <span className="font-bold">Rs. {booking.addOnsCharges?.toLocaleString()}</span>
                </div>
                {booking.discount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount</span>
                    <span className="font-bold">- Rs. {booking.discount?.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between border-t-2 border-slate-900 pt-4 mt-4">
                  <span className="text-xl font-black">GRAND TOTAL</span>
                  <span className="text-xl font-black">Rs. {booking.grandTotal?.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="mt-24 grid grid-cols-2 gap-24">
              <div className="border-t border-slate-400 pt-4 text-center">
                <p className="font-bold">Customer Signature</p>
              </div>
              <div className="border-t border-slate-400 pt-4 text-center">
                <p className="font-bold">Authorized Signature</p>
              </div>
            </div>
          </div>
        )}

        {printType === 'contract' && contract && (
          <div className="space-y-8">
            <div className="text-center border-b-2 border-slate-900 pb-8">
              <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">Legal Contract Agreement</h1>
              <p className="text-slate-500 font-bold mt-2">Booking Reference: #{booking.bookingNumber}</p>
            </div>
            <div className="p-8 font-serif text-sm leading-relaxed whitespace-pre-wrap text-slate-800 bg-slate-50 rounded-2xl border border-slate-200">
              {contract.content}
            </div>
            <div className="mt-24 grid grid-cols-2 gap-24">
              <div className="space-y-12">
                <div className="border-t border-slate-900 pt-4">
                  <p className="font-black text-slate-900 uppercase tracking-widest text-xs">Client Signature</p>
                  <p className="text-slate-500 text-xs mt-1">{booking.customerName}</p>
                </div>
              </div>
              <div className="space-y-12">
                <div className="border-t border-slate-900 pt-4">
                  <p className="font-black text-slate-900 uppercase tracking-widest text-xs">Venue Representative</p>
                  <p className="text-slate-500 text-xs mt-1">{booking.branchName}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Add Payment</h2>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Total Amount</label>
                  <input 
                    type="text"
                    value={`Rs. ${booking.grandTotal?.toLocaleString()}`}
                    disabled
                    className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Remaining Amount</label>
                  <input 
                    type="text"
                    value={`Rs. ${(booking.grandTotal - payments.reduce((sum, p: any) => sum + (Number(p.amount) || 0), 0))?.toLocaleString()}`}
                    disabled
                    className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-lg text-rose-600 font-bold"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Payment Type</label>
                <select 
                  value={newPayment.type}
                  onChange={(e) => setNewPayment({ ...newPayment, type: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="Advance">Advance</option>
                  <option value="Installment">Installment</option>
                  <option value="Security Deposit">Security Deposit</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Amount (Rs.)</label>
                <input 
                  type="number"
                  value={newPayment.amount}
                  onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Enter amount"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Due Date</label>
                <input 
                  type="date"
                  value={newPayment.dueDate}
                  onChange={(e) => setNewPayment({ ...newPayment, dueDate: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Initial Status</label>
                <select 
                  value={newPayment.status}
                  onChange={(e) => setNewPayment({ ...newPayment, status: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="Pending">Pending</option>
                  <option value="Paid">Paid</option>
                </select>
              </div>
              <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
                <button
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-6 py-2 border border-slate-200 rounded-xl font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddPayment}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors"
                >
                  Add Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approval Modal */}
      {isApprovalModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">
                {approvalStatus === 'Approved' ? 'Approve Booking' : 
                 approvalStatus === 'Cancelled' ? 'Cancel Booking' : 'Reject Booking'}
              </h2>
              <button onClick={() => setIsApprovalModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle size={24} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Comments / Reason</label>
                <textarea 
                  value={approvalComments}
                  onChange={(e) => setApprovalComments(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none min-h-[120px]"
                  placeholder="Add your comments here..."
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
                <button
                  onClick={() => setIsApprovalModalOpen(false)}
                  className="px-6 py-2 border border-slate-200 rounded-xl font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApproval}
                  className={`px-6 py-2 text-white rounded-xl font-bold transition-colors ${
                    approvalStatus === 'Approved' ? 'bg-emerald-600 hover:bg-emerald-700' : 
                    approvalStatus === 'Cancelled' ? 'bg-red-600 hover:bg-red-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  Confirm {approvalStatus}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contract Editor Modal */}
      {isContractEditorOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Contract Editor</h2>
              <button onClick={() => setIsContractEditorOpen(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle size={24} />
              </button>
            </div>
            <div className="p-6 flex-1 overflow-hidden flex flex-col space-y-4">
              <textarea 
                value={contractContent}
                onChange={(e) => setContractContent(e.target.value)}
                className="flex-1 w-full p-8 font-mono text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
              />
              <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
                <button
                  onClick={() => setIsContractEditorOpen(false)}
                  className="px-6 py-2 border border-slate-200 rounded-xl font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveContract}
                  className="px-8 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                  <CheckCircle2 size={18} />
                  Save Contract
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingDetail;
