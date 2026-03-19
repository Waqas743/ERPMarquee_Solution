import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { 
  ArrowLeft, Calendar, MapPin, User, Phone, Mail, 
  CreditCard, CheckCircle2, XCircle, Clock, AlertCircle,
  FileText, Download, Upload, MessageSquare, Send,
  Plus, Printer, Share2, MoreVertical, Trash2, DollarSign, Utensils, Edit2, ListTodo, UserPlus
} from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { io } from 'socket.io-client';

const BookingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [booking, setBooking] = useState<any>(null);
  const [payments, setPayments] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [followUps, setFollowUps] = useState<any[]>([]);
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
  
  // Follow Up Modal State
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [editingFollowUp, setEditingFollowUp] = useState<any>(null);
  const [newComments, setNewComments] = useState<{[key: string]: string}>({});
  const [followUpForm, setFollowUpForm] = useState({
    type: 'Note',
    status: 'Pending',
    followUpDate: format(new Date(), 'yyyy-MM-dd'),
    notes: ''
  });

  // Assign Modal State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [staffList, setStaffList] = useState([]);
  const [selectedStaffId, setSelectedStaffId] = useState('');

  // Print State
  const [printType, setPrintType] = useState<'details' | 'invoice' | 'contract' | null>(null);

  const user = JSON.parse(localStorage.getItem('adminUser') || '{}');
  const canAssign = ['admin', 'director', 'manager'].includes((user.roleName || '').toLowerCase());

  const fetchData = async () => {
    setLoading(true);
    try {
      const [bookingRes, paymentsRes, approvalsRes, contractRes, menuItemsRes, addOnsRes, followUpsRes] = await Promise.all([
        fetch(`/api/bookings/${id}`),
        fetch(`/api/bookings/${id}/payments`),
        fetch(`/api/bookings/${id}/approvals`),
        fetch(`/api/bookings/${id}/contract`),
        fetch(`/api/bookings/${id}/menu-items`),
        fetch(`/api/bookings/${id}/add-ons`),
        fetch(`/api/bookings/${id}/follow-ups`)
      ]);
      
      const bookingData = await bookingRes.json();
      const menuItemsData = await menuItemsRes.json();
      const addOnsData = await addOnsRes.json();

      setBooking({ ...bookingData, menuItems: menuItemsData, selectedAddOns: addOnsData });
      setPayments(await paymentsRes.json());
      setApprovals(await approvalsRes.json());
      setContract(await contractRes.json());
      setFollowUps(await followUpsRes.json());
    } catch (error) {
      console.error("Error fetching booking details:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const socket = io(window.location.origin);
    if (id) {
      socket.emit("join_booking", id);
    }

    socket.on("booking_updated", () => {
      fetchData();
    });

    return () => {
      if (id) {
        socket.emit("leave_booking", id);
      }
      socket.disconnect();
    };
  }, [id]);

  const fetchStaff = async () => {
    try {
      const res = await fetch(`/api/users?tenantId=${user.tenantId}`);
      const data = await res.json();
      setStaffList(data.filter((u: any) => (u.roleName || '').toLowerCase() === 'staff'));
    } catch (error) {
      console.error("Error fetching staff:", error);
    }
  };

  const handleAssignBooking = async () => {
    if (!selectedStaffId) return;
    try {
      const res = await fetch(`/api/bookings/${id}/assign`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ assignedTo: selectedStaffId }),
      });
      if (res.ok) {
        Swal.fire({ icon: 'success', title: 'Assigned successfully', showConfirmButton: false, timer: 1500 });
        setIsAssignModalOpen(false);
        fetchData();
      } else {
        const data = await res.json();
        throw new Error(data.message || 'Failed to assign');
      }
    } catch (error: any) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.message });
    }
  };

  const generateContractPDFFile = async (content: string) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Header Background
    doc.setFillColor(79, 70, 229);
    doc.rect(12, 12, pageWidth - 24, 40, 'F');

    let currentY = 30;

    // Add Logo if exists
    if (booking?.tenantLogoUrl) {
      try {
        const img = new Image();
        img.src = booking.tenantLogoUrl;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = () => reject(new Error("Image load failed"));
          setTimeout(() => reject(new Error("Image load timeout")), 3000);
        });
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(15, 15, 30, 30, 3, 3, 'F');
        doc.addImage(img, 'PNG', 17, 17, 26, 26);
      } catch (e) {
        console.error("Could not load logo", e);
      }
    }

    // Tenant Name & Contract Title
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(booking?.tenantName || 'Event Management', booking?.tenantLogoUrl ? 50 : 20, 28);
    
    doc.setFontSize(18);
    doc.text('CONTRACT AGREEMENT', pageWidth - 20, 42, { align: 'right' });
    
    currentY = 65;
    
    // Booking Ref & Date
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42); // Slate-900
    doc.text(`Booking Reference: #${booking?.bookingNumber || ''}`, 20, currentY);
    doc.text(`Date: ${format(new Date(), 'PPP')}`, pageWidth - 20, currentY, { align: 'right' });
    
    currentY += 5;
    
    // Divider line
    doc.setDrawColor(226, 232, 240); // Slate-200
    doc.setLineWidth(0.5);
    doc.line(20, currentY, pageWidth - 20, currentY);
    
    currentY += 15;

    // Content
    doc.setFontSize(11);
    doc.setTextColor(51, 65, 85);
    doc.setFont("times", "normal");
    
    // Split text into lines to fit page
    const splitText = doc.splitTextToSize(content, pageWidth - 40);
    
    for (let i = 0; i < splitText.length; i++) {
      if (currentY > pageHeight - 50) {
        doc.addPage();
        
        // Header Background on new page (optional, keeping it simple for contract continuation)
        // doc.setFillColor(79, 70, 229);
        // doc.rect(12, 12, pageWidth - 24, 20, 'F');
        
        currentY = 40;
      }
      doc.text(splitText[i], 20, currentY);
      currentY += 6;
    }

    currentY += 30;

    // Ensure space for signatures
    if (currentY > pageHeight - 60) {
      doc.addPage();
      currentY = 60;
    }

    // Signatures
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.5);
    
    // Client Signature
    doc.line(30, currentY, 80, currentY);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text('Client Signature', 55, currentY + 5, { align: 'center' });
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(booking?.customerName || '', 55, currentY + 10, { align: 'center' });

    // Venue Signature
    doc.setDrawColor(15, 23, 42);
    doc.line(pageWidth - 80, currentY, pageWidth - 30, currentY);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text('Authorized Signature', pageWidth - 55, currentY + 5, { align: 'center' });
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(booking?.branchName || 'The Venue', pageWidth - 55, currentY + 10, { align: 'center' });

    // Footer & Borders on ALL pages
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      
      // Decorative border
      doc.setDrawColor(79, 70, 229); // Indigo-600
      doc.setLineWidth(1);
      doc.rect(10, 10, pageWidth - 20, pageHeight - 20);
      doc.setLineWidth(0.3);
      doc.rect(12, 12, pageWidth - 24, pageHeight - 24);

      // Footer Text
      doc.setFontSize(9);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(148, 163, 184);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - 20, pageHeight - 15, { align: 'right' });
      doc.text(booking?.branchName || 'Event Management System', 20, pageHeight - 15);
    }
    
    const pdfData = doc.output('bloburl');
    window.open(pdfData, '_blank');
  };

  // Auto-generate contract if search param is present
  useEffect(() => {
    if (searchParams.get('autoContract') === 'true' && booking && !contract && !loading) {
      const template = `
This agreement is made on ${format(new Date(), 'PPP')} between ${booking.branchName} (hereinafter referred to as "The Venue") and ${booking.customerName} (hereinafter referred to as "The Client").

1. EVENT DETAILS
- Event Type: ${booking.eventType}
- Event Date: ${safeFormat(booking.eventDate, 'PPP')}
- Time Slot: ${booking.slot}
- Hall/Venue: ${booking.hallName}
- Expected Guests: ${booking.guestCount}

2. FINANCIAL ARRANGEMENTS
- Grand Total: Rs. ${booking.grandTotal?.toLocaleString()}
- Advance Paid: Rs. ${payments.find((p: any) => p.type === 'Advance')?.amount?.toLocaleString() || 0}
- The Client agrees to pay the remaining balance as per the agreed payment plan. All payments must be cleared before the event date unless otherwise specified.

3. TERMS & CONDITIONS
- Cancellation Policy: Cancellations must be made at least 30 days prior to the event date to be eligible for any refund. Advance payments are generally non-refundable.
- Liability: The Venue is not responsible for any loss of personal belongings or valuables during the event.
- Damages: The Client will be held responsible for any damage to the venue property caused by their guests or vendors.
- Outside Vendors: Use of outside caterers or decorators must be approved by The Venue management in advance.

By signing below, both parties agree to the terms and conditions outlined in this contract.
        `.trim();
      
      const saveAndOpenContract = async () => {
        try {
          const res = await fetch(`/api/bookings/${id}/contract`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: template })
          });
          if (res.ok) {
            // Remove the param to avoid running again
            navigate(`/bookings/${id}`, { replace: true });
            
            // Re-fetch data
            fetchData();
            
            // Open as PDF
            await generateContractPDFFile(template);
          }
        } catch (error) {
          console.error("Auto-contract error:", error);
        }
      };
      
      saveAndOpenContract();
    }
  }, [searchParams, booking, contract, loading, id, navigate, payments]);

  const safeFormat = (value: any, pattern: string) => {
    try {
      const dt = new Date(value);
      if (isNaN(dt.getTime())) return '-';
      return format(dt, pattern);
    } catch {
      return '-';
    }
  };

  const handleSaveFollowUp = async () => {
    if (!followUpForm.notes || !followUpForm.followUpDate) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Notes and Follow Up Date are required' });
      return;
    }
    
    const url = editingFollowUp ? `/api/bookings/${id}/follow-ups/${editingFollowUp.id}` : `/api/bookings/${id}/follow-ups`;
    const method = editingFollowUp ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ ...followUpForm, userId: user.id })
      });

      if (res.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Success',
          text: `Follow up ${editingFollowUp ? 'updated' : 'added'} successfully`,
          timer: 1500,
          showConfirmButton: false
        });
        setIsFollowUpModalOpen(false);
        setEditingFollowUp(null);
        setFollowUpForm({
          type: 'Note',
          status: 'Pending',
          followUpDate: format(new Date(), 'yyyy-MM-dd'),
          notes: ''
        });
        fetchData();
      } else {
        const errorData = await res.json();
        Swal.fire({ icon: 'error', title: 'Error', text: errorData.message || 'Failed to save follow up' });
      }
    } catch (error) {
      console.error('Error saving follow up:', error);
    }
  };

  const handleDeleteFollowUp = async (followUpId: string) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#4f46e5',
      cancelButtonColor: '#ef4444',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch(`/api/bookings/${id}/follow-ups/${followUpId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          }
        });
        if (res.ok) {
          fetchData();
          Swal.fire('Deleted!', 'Follow up has been deleted.', 'success');
        }
      } catch (error) {
        console.error("Error deleting follow up:", error);
      }
    }
  };

  const handleAddComment = async (followUpId: string) => {
    const comment = newComments[followUpId];
    if (!comment || !comment.trim()) return;

    try {
      const res = await fetch(`/api/bookings/${id}/follow-ups/${followUpId}/comments`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ comment: comment.trim() })
      });

      if (res.ok) {
        setNewComments(prev => ({ ...prev, [followUpId]: '' }));
        fetchData();
      } else {
        const errorData = await res.json();
        Swal.fire({ icon: 'error', title: 'Error', text: errorData.message || 'Failed to add comment' });
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to add comment' });
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

  const handleDeletePayment = async (paymentId: string) => {
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
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Decorative border
    // Moved to the end to draw on all pages

    // Header Background
    doc.setFillColor(79, 70, 229);
    doc.rect(12, 12, pageWidth - 24, 40, 'F');

    let headerHeight = 65;

    // Add Logo if exists
    if (booking?.tenantLogoUrl) {
      try {
        const img = new Image();
        img.src = booking.tenantLogoUrl;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = () => reject(new Error("Image load failed"));
          setTimeout(() => reject(new Error("Image load timeout")), 3000);
        });
        // Draw white background for logo so it pops on the indigo header
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(15, 15, 30, 30, 3, 3, 'F');
        doc.addImage(img, 'PNG', 17, 17, 26, 26);
      } catch (e) {
        console.error("Could not load logo", e);
      }
    }

    // Tenant Name & Invoice Title
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(booking?.tenantName || 'Event Management', booking?.tenantLogoUrl ? 50 : 20, 28);
    
    doc.setFontSize(24);
    doc.text('INVOICE', pageWidth - 20, 42, { align: 'right' });
    
    // Sub-header details
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42); // Slate-900
    doc.text(`Invoice No: INV-${booking?.bookingNumber}`, 20, headerHeight);
    doc.text(`Date: ${format(new Date(), 'PPP')}`, pageWidth - 20, headerHeight, { align: 'right' });
    
    // Divider line
    doc.setDrawColor(226, 232, 240); // Slate-200
    doc.setLineWidth(0.5);
    doc.line(20, headerHeight + 5, pageWidth - 20, headerHeight + 5);

    // Company & Customer Info
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(79, 70, 229);
    doc.text('BILL FROM:', 20, headerHeight + 15);
    doc.text('BILL TO:', pageWidth - 20, headerHeight + 15, { align: 'right' });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85);
    doc.text(booking?.branchName || 'Main Branch', 20, headerHeight + 22);
    doc.text('Venue: ' + (booking?.hallName || ''), 20, headerHeight + 28);
    
    doc.text(booking?.customerName || '', pageWidth - 20, headerHeight + 22, { align: 'right' });
    doc.text(booking?.customerPhone || '', pageWidth - 20, headerHeight + 28, { align: 'right' });
    doc.text(booking?.customerEmail || '', pageWidth - 20, headerHeight + 34, { align: 'right' });
    
    // Event Details Background Box
    doc.setFillColor(248, 250, 252); // Slate-50
    doc.roundedRect(20, headerHeight + 42, pageWidth - 40, 25, 3, 3, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(20, headerHeight + 42, pageWidth - 40, 25, 3, 3, 'S');

    // Event Details
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text('Event Details:', 25, headerHeight + 50);
    
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text(`Type: ${booking?.eventType}`, 25, headerHeight + 58);
    doc.text(`Date: ${safeFormat(booking?.eventDate, 'PPP')}`, 85, headerHeight + 58);
    doc.text(`Slot: ${booking?.slot}`, 145, headerHeight + 58);
    doc.text(`Guests: ${booking?.guestCount}`, 25, headerHeight + 64);
    
    // Charges Table
    const tableData = [
      ['Hall Rent', `Rs. ${booking?.hallRent?.toLocaleString()}`],
      ['Decoration', `Rs. ${booking?.decorationCharges?.toLocaleString()}`],
      ['DJ Charges', `Rs. ${booking?.djCharges?.toLocaleString()}`],
      ['Fireworks', `Rs. ${(Number(booking?.fireworkPrice || 0) * Number(booking?.fireworkQuantity || 0))?.toLocaleString()}`],
      ['Catering', `Rs. ${booking?.cateringCharges?.toLocaleString()}`],
      ['Add-ons', `Rs. ${booking?.addOnsCharges?.toLocaleString()}`],
    ];
    
    autoTable(doc, {
      startY: headerHeight + 75,
      head: [['Description', 'Amount']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 5, textColor: [51, 65, 85] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 20, right: 20, bottom: 40 }
    });
    
    let finalY = (doc as any).lastAutoTable.finalY + 10;
    
    // Check if we need a new page for Totals
    if (finalY + 45 > pageHeight - 30) {
      doc.addPage();
      finalY = 30;
    }

    // Totals Box
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(pageWidth - 85, finalY, 65, 35, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(pageWidth - 85, finalY, 65, 35, 2, 2, 'S');

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const subtotal = (
      Number(booking?.hallRent || 0) + 
      Number(booking?.decorationCharges || 0) + 
      Number(booking?.cateringCharges || 0) + 
      Number(booking?.djCharges || 0) + 
      (Number(booking?.fireworkPrice || 0) * Number(booking?.fireworkQuantity || 0))
    );
    
    let totalY = finalY + 7;
    doc.text('Subtotal:', pageWidth - 80, totalY);
    doc.text(`Rs. ${subtotal.toLocaleString()}`, pageWidth - 25, totalY, { align: 'right' });
    
    totalY += 6;
    doc.text('Add-ons:', pageWidth - 80, totalY);
    doc.text(`Rs. ${booking?.addOnsCharges?.toLocaleString() || 0}`, pageWidth - 25, totalY, { align: 'right' });
    
    totalY += 6;
    doc.text('Discount:', pageWidth - 80, totalY);
    doc.text(`Rs. ${booking?.discount?.toLocaleString() || 0}`, pageWidth - 25, totalY, { align: 'right' });
    
    totalY += 6;
    doc.text('Tax:', pageWidth - 80, totalY);
    doc.text(`Rs. ${booking?.tax?.toLocaleString() || 0}`, pageWidth - 25, totalY, { align: 'right' });
    
    totalY += 7;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(79, 70, 229);
    doc.text('Grand Total:', pageWidth - 80, totalY);
    doc.text(`Rs. ${booking?.grandTotal?.toLocaleString()}`, pageWidth - 25, totalY, { align: 'right' });
    
    finalY += 45;

    // Check if we need a new page for Payment History
    if (finalY + 40 > pageHeight - 30) {
      doc.addPage();
      finalY = 30;
    }

    // Payments Table
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text('Payment History:', 20, finalY);
    
    const paymentData = payments.map((p: any) => [
      p.type,
      safeFormat(p.dueDate, 'MMM dd, yyyy'),
      p.status,
      `Rs. ${p.amount?.toLocaleString()}`
    ]);
    
    autoTable(doc, {
      startY: finalY + 5,
      head: [['Type', 'Due Date', 'Status', 'Amount']],
      body: paymentData,
      theme: 'grid',
      headStyles: { fillColor: [100, 116, 139], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 4 },
      margin: { left: 20, right: 20, bottom: 40 }
    });
    
    // Status Stamp
    if (booking?.paymentStatus === 'Fully Paid') {
      doc.setPage(1); // Usually stamp is on the first page
      doc.setFontSize(40);
      doc.setTextColor(34, 197, 94); // Emerald-500
      doc.setGState(new (doc as any).GState({opacity: 0.2}));
      doc.text('PAID', pageWidth / 2, pageHeight / 2, { align: 'center', angle: -45 });
      doc.setGState(new (doc as any).GState({opacity: 1}));
    } else if (booking?.paymentStatus === 'Partial Paid') {
      doc.setPage(1);
      doc.setFontSize(40);
      doc.setTextColor(245, 158, 11); // Amber-500
      doc.setGState(new (doc as any).GState({opacity: 0.2}));
      doc.text('PARTIAL PAID', pageWidth / 2, pageHeight / 2, { align: 'center', angle: -45 });
      doc.setGState(new (doc as any).GState({opacity: 1}));
    }
    
    // Footer & Borders on ALL pages
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      
      // Decorative border
      doc.setDrawColor(79, 70, 229); // Indigo-600
      doc.setLineWidth(1);
      doc.rect(10, 10, pageWidth - 20, pageHeight - 20);
      doc.setLineWidth(0.3);
      doc.rect(12, 12, pageWidth - 24, pageHeight - 24);

      // Footer Text
      doc.setFontSize(9);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(148, 163, 184);
      doc.text('Thank you for your business!', pageWidth / 2, pageHeight - 15, { align: 'center' });
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
This agreement is made on ${format(new Date(), 'PPP')} between ${booking.branchName} (hereinafter referred to as "The Venue") and ${booking.customerName} (hereinafter referred to as "The Client").

1. EVENT DETAILS
- Event Type: ${booking.eventType}
- Event Date: ${safeFormat(booking.eventDate, 'PPP')}
- Time Slot: ${booking.slot}
- Hall/Venue: ${booking.hallName}
- Expected Guests: ${booking.guestCount}

2. FINANCIAL ARRANGEMENTS
- Grand Total: Rs. ${booking.grandTotal?.toLocaleString()}
- Advance Paid: Rs. ${payments.find((p: any) => p.type === 'Advance')?.amount?.toLocaleString() || 0}
- The Client agrees to pay the remaining balance as per the agreed payment plan. All payments must be cleared before the event date unless otherwise specified.

3. TERMS & CONDITIONS
- Cancellation Policy: Cancellations must be made at least 30 days prior to the event date to be eligible for any refund. Advance payments are generally non-refundable.
- Liability: The Venue is not responsible for any loss of personal belongings or valuables during the event.
- Damages: The Client will be held responsible for any damage to the venue property caused by their guests or vendors.
- Outside Vendors: Use of outside caterers or decorators must be approved by The Venue management in advance.

By signing below, both parties agree to the terms and conditions outlined in this contract.
    `.trim();
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

  const eventDate = new Date(booking.eventDate);
  const today = new Date();
  today.setHours(0,0,0,0);
  const isEventPassed = eventDate < today;
  const isBookingCompleted = isEventPassed && booking.status === 'Approved' && booking.paymentStatus === 'Paid';

  const canEdit = !isBookingCompleted && (booking?.status === 'Pending' || (booking?.status === 'Approved' && booking?.paymentStatus === 'Not Paid'));

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
                isBookingCompleted ? 'bg-blue-50 text-blue-700 border-blue-100' :
                booking.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                booking.status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                booking.status === 'Rejected' ? 'bg-red-50 text-red-700 border-red-100' : 
                booking.status === 'Cancelled' ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-indigo-50 text-indigo-700 border-indigo-100'
              }`}>
                {isBookingCompleted ? 'Completed' : booking.status}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              Created: {safeFormat(booking.createdAt, 'MMM dd, yyyy')} • {booking.createdByName || booking.createdBy || '-'}
            </p>
            <p className="text-xs sm:text-sm text-slate-500">
              Modified: {safeFormat(booking.modifiedAt, 'MMM dd, yyyy')} • {booking.modifiedByName || booking.modifiedBy || '-'}
            </p>
            {booking.assignedToName && (
              <p className="text-xs sm:text-sm font-medium text-indigo-600">
                Assigned To: {booking.assignedToName}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 no-print">
          {canAssign && (
            <button
              onClick={() => {
                fetchStaff();
                setIsAssignModalOpen(true);
              }}
              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
              title="Assign to Staff"
            >
              <UserPlus size={18} className="sm:w-5 sm:h-5" />
            </button>
          )}
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
            { id: 'follow-ups', label: 'Follow Ups', icon: <ListTodo size={18} />, disabled: false },
            { id: 'payments', label: 'Payments', icon: <CreditCard size={18} />, disabled: booking.status !== 'Approved' && booking.status !== 'Completed' },
            { id: 'approvals', label: 'Approvals', icon: <MessageSquare size={18} />, disabled: false },
            { id: 'contract', label: 'Contract', icon: <FileText size={18} />, disabled: booking.status !== 'Approved' && booking.status !== 'Completed' },
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

          {activeTab === 'follow-ups' && (
            <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-500">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">Follow Ups</h3>
                <button 
                  disabled={isBookingCompleted || booking.status === 'Completed'}
                  onClick={() => {
                    setEditingFollowUp(null);
                    setFollowUpForm({
                      type: 'Note',
                      status: 'Pending',
                      followUpDate: format(new Date(), 'yyyy-MM-dd'),
                      notes: ''
                    });
                    setIsFollowUpModalOpen(true);
                  }}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 sm:gap-2 ${
                    isBookingCompleted || booking.status === 'Completed' ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  <Plus size={16} /> Add Follow Up
                </button>
              </div>
              <div className="space-y-3 sm:space-y-4">
                {followUps.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-slate-200">
                    <ListTodo size={48} className="mx-auto mb-4 text-slate-300" />
                    <p className="text-slate-500 font-medium">No follow ups recorded yet.</p>
                  </div>
                ) : (
                  followUps.map((followUp: any) => (
                    <div key={followUp.id} className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 ${followUp.status === 'Completed' ? 'bg-emerald-100 text-emerald-600' : followUp.status === 'Cancelled' ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-600'}`}>
                            <MessageSquare size={20} className="sm:w-6 sm:h-6" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${followUp.type === 'Call' ? 'bg-blue-50 text-blue-700' : followUp.type === 'Meeting' ? 'bg-purple-50 text-purple-700' : 'bg-slate-100 text-slate-700'}`}>
                                {followUp.type}
                              </span>
                              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${followUp.status === 'Completed' ? 'bg-emerald-50 text-emerald-700' : followUp.status === 'Cancelled' ? 'bg-slate-100 text-slate-600' : 'bg-amber-50 text-amber-700'}`}>
                                {followUp.status}
                              </span>
                            </div>
                            <p className="text-slate-700 text-sm sm:text-base mb-2">{followUp.notes}</p>
                            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                              <span className="flex items-center gap-1"><Calendar size={12} /> {format(new Date(followUp.followUpDate), 'MMM dd, yyyy')}</span>
                              <span className="flex items-center gap-1"><User size={12} /> {followUp.userName || 'System'}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 border-t sm:border-t-0 pt-3 sm:pt-0">
                          <button 
                            disabled={isBookingCompleted || booking.status === 'Completed'}
                            onClick={() => {
                              setEditingFollowUp(followUp);
                              setFollowUpForm({
                                type: followUp.type,
                                status: followUp.status,
                                followUpDate: format(new Date(followUp.followUpDate), 'yyyy-MM-dd'),
                                notes: followUp.notes
                              });
                              setIsFollowUpModalOpen(true);
                            }}
                            className={`p-1.5 sm:p-2 rounded-lg transition-all ${
                              isBookingCompleted || booking.status === 'Completed' ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'
                            }`}
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            disabled={isBookingCompleted || booking.status === 'Completed'}
                            onClick={() => handleDeleteFollowUp(followUp.id)}
                            className={`p-1.5 sm:p-2 rounded-lg transition-all ${
                              isBookingCompleted || booking.status === 'Completed' ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                            }`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Comments Section */}
                      <div className="mt-2 pt-4 border-t border-slate-100 pl-14 sm:pl-16">
                        {followUp.comments && followUp.comments.length > 0 && (
                          <div className="space-y-3 mb-4">
                            {followUp.comments.map((comment: any) => (
                              <div key={comment.id} className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <span className="font-semibold text-sm text-slate-800">{comment.userName}</span>
                                  <span className="text-xs text-slate-400">{format(new Date(comment.createdAt), 'MMM dd, p')}</span>
                                </div>
                                <p className="text-sm text-slate-600">{comment.comment}</p>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Add a comment..."
                            value={newComments[followUp.id] || ''}
                            onChange={(e) => setNewComments(prev => ({ ...prev, [followUp.id]: e.target.value }))}
                            onKeyPress={(e) => e.key === 'Enter' && handleAddComment(followUp.id)}
                            disabled={isBookingCompleted || booking.status === 'Completed'}
                            className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          />
                          <button
                            onClick={() => handleAddComment(followUp.id)}
                            disabled={isBookingCompleted || booking.status === 'Completed' || !newComments[followUp.id]?.trim()}
                            className="px-3 py-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            <Send size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-500">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">Payment Schedule</h3>
                <button 
                  onClick={() => setIsPaymentModalOpen(true)}
                  disabled={isBookingCompleted || booking.status === 'Completed' || (booking.status !== 'Approved' && booking.status !== 'Completed') || booking.status === 'Cancelled' || booking.status === 'Rejected'}
                  className={`font-bold text-sm flex items-center gap-1 hover:underline ${
                    (isBookingCompleted || booking.status === 'Completed' || (booking.status !== 'Approved' && booking.status !== 'Completed') || booking.status === 'Cancelled' || booking.status === 'Rejected') ? 'text-slate-400 cursor-not-allowed' : 'text-indigo-600'
                  }`}
                  title={isBookingCompleted || booking.status === 'Completed' ? "Booking is completed" : (booking.status !== 'Approved' && booking.status !== 'Completed') ? "Booking must be Approved to add payments" : ""}
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
                              disabled={isBookingCompleted || booking.status !== 'Approved' || booking.status === 'Cancelled' || booking.status === 'Rejected'}
                              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold transition-colors ${
                                (isBookingCompleted || booking.status !== 'Approved' || booking.status === 'Cancelled' || booking.status === 'Rejected')
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
                    disabled={isBookingCompleted || booking.status === 'Completed' || (booking.status !== 'Approved' && booking.status !== 'Completed') || booking.status === 'Cancelled' || booking.status === 'Rejected'}
                    className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors w-full sm:w-fit justify-center ${
                      (isBookingCompleted || booking.status === 'Completed' || (booking.status !== 'Approved' && booking.status !== 'Completed') || booking.status === 'Cancelled' || booking.status === 'Rejected')
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
                    title={isBookingCompleted || booking.status === 'Completed' ? "Booking is completed" : (booking.status !== 'Approved' && booking.status !== 'Completed') ? "Booking must be Approved to generate contract" : ""}
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
                        disabled={isBookingCompleted || booking.status === 'Completed' || booking.status === 'Cancelled' || booking.status === 'Rejected'}
                        className={`p-2 rounded-lg transition-colors ${
                          (isBookingCompleted || booking.status === 'Completed' || booking.status === 'Cancelled' || booking.status === 'Rejected')
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
                      <button 
                        onClick={() => generateContractPDFFile(contract.content)}
                        className="p-2 text-slate-500 hover:bg-white rounded-lg transition-colors"
                        title="Download PDF"
                      >
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
              {/* <button className="w-full py-2.5 sm:py-3 px-4 bg-white/10 hover:bg-white/20 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-3">
                <Upload size={16} className="sm:w-4.5 sm:h-4.5" /> Upload Documents
              </button> */}
              <button 
                onClick={handleCancelBooking}
                disabled={isBookingCompleted || booking.status === 'Cancelled' || booking.status === 'Rejected'}
                className={`w-full py-2.5 sm:py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-3 ${
                  (isBookingCompleted || booking.status === 'Cancelled' || booking.status === 'Rejected')
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
          <div className="border-2 border-indigo-600 p-8 min-h-[1000px] relative" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
            {/* Header matching PDF */}
            <div className="bg-indigo-600 p-6 rounded-t-lg flex items-center justify-between -mt-4 -mx-4 mb-8">
              <div className="flex items-center gap-4">
                {booking.tenantLogoUrl && (
                  <div className="bg-white p-1 rounded-lg">
                    <img src={booking.tenantLogoUrl} alt="Logo" className="w-12 h-12 object-contain" />
                  </div>
                )}
                <h1 className="text-2xl font-bold text-white">{booking.tenantName || 'Event Management'}</h1>
              </div>
              <h2 className="text-xl text-white font-medium uppercase tracking-wider">Contract Agreement</h2>
            </div>

            {/* Sub-header */}
            <div className="flex justify-between items-center mb-4 px-2">
              <div className="font-bold text-slate-900 text-sm">
                Booking Reference: #{booking.bookingNumber}
              </div>
              <div className="font-bold text-slate-900 text-sm">
                Date: {format(new Date(), 'PPP')}
              </div>
            </div>
            
            <div className="border-b-2 border-slate-200 mb-8 mx-2"></div>

            {/* Content */}
            <div className="px-2 font-serif text-[15px] leading-relaxed whitespace-pre-wrap text-slate-700">
              {contract.content}
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-2 gap-32 px-8 mt-32 mb-12 w-full">
              <div className="text-center">
                <div className="border-t-2 border-slate-900 pt-2">
                  <p className="font-bold text-slate-900 text-sm">Client Signature</p>
                  <p className="text-slate-500 text-sm mt-1">{booking.customerName}</p>
                </div>
              </div>
              <div className="text-center">
                <div className="border-t-2 border-slate-900 pt-2">
                  <p className="font-bold text-slate-900 text-sm">Authorized Signature</p>
                  <p className="text-slate-500 text-sm mt-1">{booking.branchName || 'The Venue'}</p>
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="mt-8 px-2 text-xs text-slate-400 italic text-center">
              {booking.branchName || 'Event Management System'}
            </div>
          </div>
        )}
      </div>

      {/* Follow Up Modal */}
      {isFollowUpModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">{editingFollowUp ? 'Edit Follow Up' : 'Add Follow Up'}</h2>
              <button onClick={() => setIsFollowUpModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Type</label>
                <select 
                  value={followUpForm.type}
                  onChange={(e) => setFollowUpForm({ ...followUpForm, type: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="Note">Note</option>
                  <option value="Call">Call</option>
                  <option value="Meeting">Meeting</option>
                  <option value="Email">Email</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Status</label>
                <select 
                  value={followUpForm.status}
                  onChange={(e) => setFollowUpForm({ ...followUpForm, status: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="Pending">Pending</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Follow Up Date</label>
                <input 
                  type="date"
                  value={followUpForm.followUpDate}
                  onChange={(e) => setFollowUpForm({ ...followUpForm, followUpDate: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Notes</label>
                <textarea 
                  value={followUpForm.notes}
                  onChange={(e) => setFollowUpForm({ ...followUpForm, notes: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                  placeholder="Enter follow up details..."
                />
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex gap-3">
              <button 
                onClick={() => setIsFollowUpModalOpen(false)}
                className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveFollowUp}
                className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

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
      {/* Assign Modal */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Assign Booking</h3>
              <button 
                onClick={() => setIsAssignModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <XCircle size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Select Staff</label>
                <select
                  value={selectedStaffId}
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                >
                  <option value="">Select a staff member</option>
                  {staffList.map((staff: any) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.fullName} ({staff.email})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button 
                onClick={() => setIsAssignModalOpen(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleAssignBooking}
                disabled={!selectedStaffId}
                className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default BookingDetail;
