import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { 
  User, Calendar, DollarSign, CreditCard, CheckCircle2, 
  ChevronRight, ChevronLeft, Search, Plus, Users, 
  Clock, MapPin, Phone, Mail, FileText, Trash2, Utensils, Check, X
} from 'lucide-react';
import { format, addMonths } from 'date-fns';
import { getCurrentUser, getTenantId, hasPermission } from '../utils/session';
import { SearchableSelect } from '../components/SearchableSelect';

const AddBooking = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState([]);
  const [halls, setHalls] = useState([]);
  const [packages, setPackages] = useState([]);
  const [allMenuItems, setAllMenuItems] = useState([]);
  const [allAddOns, setAllAddOns] = useState([]);
  const [categories, setCategories] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [isAddOnModalOpen, setIsAddOnModalOpen] = useState(false);
  const [existingPayments, setExistingPayments] = useState<any[]>([]);

  const user = getCurrentUser();
  const tenantId = getTenantId();

  // Form State
  const [formData, setFormData] = useState({
    customerId: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    customerCnic: '',
    customerAddress: '',
    
    branchId: '',
    hallId: '',
    packageId: '',
    eventType: '',
    eventDate: '',
    slot: 'Morning',
    guestCount: '',
    perHeadPrice: 0,
    
    hallRent: 0,
    decorationCharges: 0,
    cateringCharges: 0,
    djCharges: 0,
    fireworkPrice: 0,
    fireworkQuantity: 0,
    discount: 0,
    tax: 0,
    grandTotal: 0,
    
    paymentPlan: [] as any[],
    menuItems: [] as any[], // { menuItemId, quantity, notes, itemName }
    selectedAddOns: [] as any[] // { id, name, price }
  });

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [branchesRes, packagesRes, menuItemsRes, catRes, addOnsRes] = await Promise.all([
          fetch(`/api/branches?tenantId=${tenantId}`),
          fetch(`/api/event-packages?tenantId=${tenantId}`),
          fetch(`/api/menu-items?tenantId=${tenantId}`),
          fetch(`/api/menu-categories?tenantId=${tenantId}`),
          fetch(`/api/add-ons?tenantId=${tenantId}`)
        ]);
        setBranches(await branchesRes.json());
        setPackages(await packagesRes.json());
        setAllMenuItems(await menuItemsRes.json());
        setCategories(await catRes.json());
        setAllAddOns(await addOnsRes.json());

        if (id) {
          // Edit Mode: Fetch existing booking
          const bRes = await fetch(`/api/bookings/${id}`);
          const booking = await bRes.json();
          
          if (booking) {
            const canEdit = booking.status === 'Pending' || (booking.status === 'Approved' && booking.paymentStatus === 'Not Paid');
            if (!canEdit) {
              Swal.fire({
                icon: 'error',
                title: 'Cannot Edit',
                text: 'Only Pending bookings, or Approved bookings without payments can be edited.'
              });
              navigate(`/bookings/${id}`);
              return;
            }
            // Fetch booking menu items and add-ons
            const [miRes, aoRes, payRes] = await Promise.all([
              fetch(`/api/bookings/${id}/menu-items`),
              fetch(`/api/bookings/${id}/add-ons`),
              fetch(`/api/bookings/${id}/payments`)
            ]);
            const bMenuItems = await miRes.json();
            const bAddOns = await aoRes.json();
            const bPayments = await payRes.json();

            setExistingPayments(bPayments || []);

            setFormData({
              customerId: booking.customerId,
              customerName: booking.customerName,
              customerPhone: booking.customerPhone,
              customerEmail: booking.customerEmail || '',
              customerCnic: booking.customerCnic || '',
              customerAddress: booking.customerAddress || '',
              branchId: booking.branchId,
              hallId: booking.hallId,
              packageId: booking.packageId || '',
              eventType: booking.eventType,
              eventDate: booking.eventDate,
              slot: booking.slot,
              guestCount: booking.guestCount || '',
              perHeadPrice: booking.guestCount ? (Number(booking.cateringCharges) / Number(booking.guestCount)) : 0,
              hallRent: booking.hallRent || 0,
              decorationCharges: booking.decorationCharges || 0,
              cateringCharges: booking.cateringCharges || 0,
              djCharges: booking.djCharges || 0,
              fireworkPrice: booking.fireworkPrice || 0,
              fireworkQuantity: booking.fireworkQuantity || 0,
              discount: booking.discount || 0,
              tax: booking.tax || 0,
              grandTotal: booking.grandTotal || 0,
              paymentPlan: [], // We don't edit payment plan here for existing bookings to avoid conflicts
              menuItems: bMenuItems.map((mi: any) => ({
                menuItemId: mi.menuItemId,
                quantity: mi.quantity,
                notes: mi.notes || '',
                itemName: mi.itemName
              })),
              selectedAddOns: bAddOns.map((ao: any) => ({
                id: ao.addOnId,
                name: ao.addOnName,
                price: ao.price
              }))
            });
          }
        }
      } catch (error) {
        console.error("Error fetching initial data:", error);
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (formData.branchId) {
      const fetchHalls = async () => {
        const hallsRes = await fetch(`/api/halls?tenantId=${tenantId}&branchId=${formData.branchId}`);
        setHalls(await hallsRes.json());
      };
      fetchHalls();
    }
  }, [formData.branchId]);

  useEffect(() => {
    if (customerSearch.length > 2) {
      const fetchCustomers = async () => {
        const res = await fetch(`/api/customers?tenantId=${tenantId}&search=${customerSearch}`);
        setCustomers(await res.json());
      };
      fetchCustomers();
    } else {
      setCustomers([]);
    }
  }, [customerSearch]);

  const handlePackageChange = async (pkgId: string) => {
    if (!pkgId) {
      setFormData(prev => ({ ...prev, packageId: '', perHeadPrice: 0, cateringCharges: 0, menuItems: [], selectedAddOns: [] }));
      return;
    }
    
    try {
      const res = await fetch(`/api/event-packages/${pkgId}`);
      const pkg = await res.json();
      
      const items = (pkg.menuItems || []).map((mi: any) => ({
        menuItemId: mi.menuItemId,
        quantity: mi.quantity,
        notes: mi.notes || '',
        itemName: mi.itemName
      }));

      const guests = Number(formData.guestCount) || 0;
      const cateringTotal = pkg.basePrice * guests;

      // Package add-ons are pre-selected
      const pkgAddOns = (pkg.addOns || []).map((ao: any) => ({
        id: ao.addOnId,
        name: ao.name,
        price: ao.price
      }));

      setFormData(prev => ({
        ...prev,
        packageId: pkgId,
        perHeadPrice: pkg.basePrice || 0,
        cateringCharges: cateringTotal || pkg.basePrice || 0,
        menuItems: items,
        selectedAddOns: pkgAddOns
      }));
    } catch (error) {
      console.error("Error fetching package details:", error);
    }
  };

  const toggleAddOn = (addOn: any) => {
    const isSelected = formData.selectedAddOns.find(ao => ao.id === addOn.id);
    if (isSelected) {
      setFormData(prev => ({
        ...prev,
        selectedAddOns: prev.selectedAddOns.filter(ao => ao.id !== addOn.id)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        selectedAddOns: [...prev.selectedAddOns, { id: addOn.id, name: addOn.name, price: addOn.price }]
      }));
    }
  };

  const addBookingMenuItem = () => {
    setFormData(prev => ({
      ...prev,
      menuItems: [...prev.menuItems, { menuItemId: '', quantity: 1, notes: '', itemName: '' }]
    }));
  };

  const removeBookingMenuItem = (index: number) => {
    const newItems = formData.menuItems.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, menuItems: newItems }));
  };

  const updateBookingMenuItem = (index: number, field: string, value: any) => {
    const newItems = [...formData.menuItems];
    if (field === 'menuItemId') {
      const selectedItem = allMenuItems.find((mi: any) => String(mi.id) === String(value)) as any;
      newItems[index] = { 
        ...newItems[index], 
        menuItemId: value, 
        itemName: selectedItem?.name || ''
      };
    } else {
      newItems[index] = { ...newItems[index], [field]: value };
    }
    setFormData(prev => ({ ...prev, menuItems: newItems }));
  };

  const recalculateCatering = () => {
    const guests = Number(formData.guestCount) || 0;
    const perHead = Number(formData.perHeadPrice) || 0;
    const total = perHead * guests;
    setFormData(prev => ({ ...prev, cateringCharges: total }));
  };

  useEffect(() => {
    recalculateCatering();
  }, [formData.guestCount, formData.perHeadPrice]);

  const calculateTotals = () => {
    const guests = Number(formData.guestCount) || 0;
    const addOnsTotal = formData.selectedAddOns.reduce((sum, ao) => sum + ((Number(ao.price) || 0) * guests), 0);
    const fireworkTotal = (Number(formData.fireworkPrice) || 0) * (Number(formData.fireworkQuantity) || 0);
    
    const subtotal = Number(formData.hallRent) + Number(formData.decorationCharges) + 
                     Number(formData.cateringCharges) + Number(formData.djCharges) + fireworkTotal;
    
    const afterDiscount = (subtotal + addOnsTotal) - Number(formData.discount);
    const taxAmount = (afterDiscount * Number(formData.tax)) / 100;
    const total = afterDiscount + taxAmount;
    
    setFormData(prev => ({ ...prev, grandTotal: total }));
  };

  useEffect(() => {
    calculateTotals();
  }, [
    formData.hallRent, formData.decorationCharges, formData.cateringCharges, 
    formData.selectedAddOns, formData.discount, formData.tax, formData.guestCount,
    formData.djCharges, formData.fireworkPrice, formData.fireworkQuantity
  ]);

  const addPayment = () => {
    const existingTotal = existingPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const totalPlanned = formData.paymentPlan.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const remaining = formData.grandTotal - existingTotal - totalPlanned;
    
    if (remaining <= 0) {
      Swal.fire({
        icon: 'info',
        title: 'Plan Complete',
        text: 'Total planned amount already reaches or exceeds grand total.'
      });
      return;
    }

    setFormData(prev => ({
      ...prev,
      paymentPlan: [
        ...prev.paymentPlan,
        { type: (existingPayments.length === 0 && prev.paymentPlan.length === 0) ? 'Advance' : 'Installment', amount: remaining, dueDate: format(new Date(), 'yyyy-MM-dd') }
      ]
    }));
  };

  const removePayment = (index: number) => {
    setFormData(prev => ({
      ...prev,
      paymentPlan: prev.paymentPlan.filter((_, i) => i !== index)
    }));
  };

  const updatePayment = (index: number, field: string, value: any) => {
    const newPlan = [...formData.paymentPlan];
    newPlan[index] = { ...newPlan[index], [field]: value };
    
    if (field === 'amount') {
      const existingTotal = existingPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const totalPlanned = newPlan.reduce((sum, p, i) => i === index ? sum + Number(value) : sum + (Number(p.amount) || 0), 0);
      if (existingTotal + totalPlanned > formData.grandTotal) {
        Swal.fire({
          icon: 'error',
          title: 'Invalid Amount',
          text: 'Total planned amount cannot exceed grand total.'
        });
        return;
      }
    }
    
    setFormData(prev => ({ ...prev, paymentPlan: newPlan }));
  };

  const handleSelectCustomer = (c: any) => {
    setFormData(prev => ({
      ...prev,
      customerId: c.id,
      customerName: c.name,
      customerPhone: c.phone,
      customerEmail: c.email || '',
      customerCnic: c.cnic || '',
      customerAddress: c.address || ''
    }));
    setCustomerSearch('');
    setCustomers([]);
  };

  const handleNext = async () => {
    if (step === 2) {
      if (!formData.branchId || !formData.hallId || !formData.eventDate || !formData.slot) {
        Swal.fire({
          icon: 'warning',
          title: 'Missing Information',
          text: 'Please select branch, hall, date and slot'
        });
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(`/api/bookings/check-availability?hallId=${formData.hallId}&eventDate=${formData.eventDate}&slot=${formData.slot}${id ? `&excludeId=${id}` : ''}`);
        const data = await res.json();
        if (!data.available) {
          Swal.fire({
            icon: 'error',
            title: 'Hall Already Booked',
            text: `This hall is already booked for ${formData.eventDate} (${formData.slot} slot). Booking Number: ${data.bookingNumber}`,
            confirmButtonColor: '#4f46e5'
          });
          setLoading(false);
          return;
        }
      } catch (error) {
        console.error("Check availability error:", error);
      } finally {
        setLoading(false);
      }
    }
    setStep(prev => prev + 1);
  };

  const handleSubmit = async () => {
    if (!formData.customerName || !formData.customerPhone) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Information',
        text: 'Customer name and phone are required'
      });
      setStep(1);
      return;
    }
    if (!formData.branchId || !formData.hallId || !formData.eventDate || !formData.eventType) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Information',
        text: 'Event details (Branch, Hall, Date, Type) are required'
      });
      setStep(2);
      return;
    }

    setLoading(true);
    try {
      let finalCustomerId = formData.customerId;
      
      // 1. Create customer if new
      if (isNewCustomer) {
        const custRes = await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenantId,
            name: formData.customerName,
            cnic: formData.customerCnic,
            phone: formData.customerPhone,
            email: formData.customerEmail,
            address: formData.customerAddress
          })
        });
        const custData = await custRes.json();
        finalCustomerId = custData.id;
      }

      // 2. Create or Update booking
      const url = id ? `/api/bookings/${id}` : '/api/bookings';
      const method = id ? 'PUT' : 'POST';

      const bookingRes = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          branchId: formData.branchId,
          hallId: formData.hallId,
          customerId: finalCustomerId,
          packageId: formData.packageId,
          eventType: formData.eventType,
          eventDate: formData.eventDate,
          slot: formData.slot,
          guestCount: formData.guestCount,
          hallRent: formData.hallRent,
          decorationCharges: formData.decorationCharges,
          cateringCharges: formData.cateringCharges,
          djCharges: formData.djCharges,
          fireworkPrice: formData.fireworkPrice,
          fireworkQuantity: formData.fireworkQuantity,
          addOnsCharges: formData.selectedAddOns.reduce((sum, ao) => sum + ((Number(ao.price) || 0) * (Number(formData.guestCount) || 0)), 0),
          discount: formData.discount,
          tax: formData.tax,
          grandTotal: formData.grandTotal,
          payments: formData.paymentPlan,
          menuItems: formData.menuItems,
          selectedAddOns: formData.selectedAddOns
        })
      });

      if (bookingRes.ok) {
        if (id) {
          Swal.fire({
            icon: 'success',
            title: 'Success',
            text: 'Booking updated successfully',
            timer: 2000,
            showConfirmButton: false
          });
          navigate(`/bookings/${id}?autoContract=true`);
        } else {
          const bookingData = await bookingRes.json();
          Swal.fire({
            icon: 'success',
            title: 'Success',
            text: 'Booking created successfully',
            timer: 2000,
            showConfirmButton: false
          });
          navigate(`/bookings/${bookingData.id}?autoContract=true`);
        }
      } else {
        const errorData = await bookingRes.json();
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: errorData.message || `Failed to ${id ? 'update' : 'create'} booking`
        });
      }
    } catch (error) {
      console.error("Submit error:", error);
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { id: 1, title: 'Customer Info', icon: <User size={20} /> },
    { id: 2, title: 'Event Info', icon: <Calendar size={20} /> },
    { id: 3, title: 'Pricing', icon: <DollarSign size={20} /> },
    { id: 4, title: 'Payment Plan', icon: <CreditCard size={20} /> },
    { id: 5, title: 'Confirmation', icon: <CheckCircle2 size={20} /> },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{id ? 'Edit Booking' : 'New Booking'}</h1>
          <p className="text-slate-500">{id ? 'Update existing event booking details.' : 'Follow the steps to create a new event booking.'}</p>
        </div>
        <button 
          onClick={() => navigate(id ? `/bookings/${id}` : '/bookings')}
          className="text-slate-500 hover:text-slate-700 font-medium flex items-center gap-2"
        >
          Cancel
        </button>
      </div>

      {/* Stepper - scrollable on mobile */}
      <div className="overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
        <div className="flex items-center justify-between bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm min-w-max sm:min-w-0">
          {steps.map((s, idx) => (
            <React.Fragment key={s.id}>
              <div className={`flex flex-col items-center gap-2 ${step >= s.id ? 'text-indigo-600' : 'text-slate-400'}`}>
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2 transition-all ${step >= s.id ? 'bg-indigo-50 border-indigo-600' : 'bg-slate-50 border-slate-200'}`}>
                  {step > s.id ? <CheckCircle2 size={18} /> : React.cloneElement(s.icon as React.ReactElement, { size: 18 })}
                </div>
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">{s.title}</span>
              </div>
              {idx < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 sm:mx-4 transition-all min-w-[20px] sm:min-w-0 ${step > s.id ? 'bg-indigo-600' : 'bg-slate-100'}`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
        {step === 1 && (
          <div className="p-5 sm:p-8 space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">Step 1: Customer Information</h2>
              <div className="flex bg-slate-100 p-1 rounded-lg w-full sm:w-fit">
                <button 
                  onClick={() => setIsNewCustomer(false)}
                  className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-sm font-medium transition-all ${!isNewCustomer ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Existing
                </button>
                <button 
                  onClick={() => setIsNewCustomer(true)}
                  className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-sm font-medium transition-all ${isNewCustomer ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  New
                </button>
              </div>
            </div>

            {!isNewCustomer ? (
              <div className="space-y-6">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input 
                    type="text"
                    placeholder="Search by name, phone or CNIC..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm sm:text-base"
                  />
                  {customers.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-10 overflow-hidden divide-y divide-slate-100">
                      {customers.map((c: any) => (
                        <button 
                          key={c.id}
                          onClick={() => handleSelectCustomer(c)}
                          className="w-full px-4 sm:px-6 py-3 sm:py-4 text-left hover:bg-slate-50 flex items-center justify-between group"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-slate-900 truncate">{c.name}</p>
                            <p className="text-xs sm:text-sm text-slate-500 truncate">{c.phone} • {c.cnic}</p>
                          </div>
                          <ChevronRight size={20} className="text-slate-300 group-hover:text-indigo-600 transition-colors shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                {formData.customerName && (
                  <div className="p-4 sm:p-6 bg-indigo-50 rounded-2xl border border-indigo-100 flex flex-col sm:flex-row items-start gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-indigo-600 flex items-center justify-center text-white shrink-0">
                      <User size={20} className="sm:w-6 sm:h-6" />
                    </div>
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                      <div>
                        <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Customer Name</p>
                        <p className="text-base sm:text-lg font-bold text-slate-900">{formData.customerName}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Phone Number</p>
                        <p className="text-base sm:text-lg font-bold text-slate-900">{formData.customerPhone}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">CNIC</p>
                        <p className="text-sm text-slate-700">{formData.customerCnic || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Email</p>
                        <p className="text-sm text-slate-700 truncate">{formData.customerEmail || 'N/A'}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setFormData(prev => ({ ...prev, customerId: '', customerName: '' }))}
                      className="p-2 text-slate-400 hover:text-red-600 transition-colors self-end sm:self-start"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Full Name</label>
                  <input 
                    type="text"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    placeholder="Enter customer name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Phone Number</label>
                  <input 
                    type="text"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    placeholder="Enter phone number"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">CNIC</label>
                  <input 
                    type="text"
                    value={formData.customerCnic}
                    onChange={(e) => setFormData({ ...formData, customerCnic: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    placeholder="Enter CNIC"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Email Address</label>
                  <input 
                    type="email"
                    value={formData.customerEmail}
                    onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    placeholder="Enter email address"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <label className="text-sm font-semibold text-slate-700">Address</label>
                  <textarea 
                    value={formData.customerAddress}
                    onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none min-h-[80px] text-sm"
                    placeholder="Enter customer address"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="p-5 sm:p-8 space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">Step 2: Event Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Menu Package (Optional)</label>
                <SearchableSelect
                  options={[
                    { value: '', label: 'No Package (Custom)' },
                    ...packages.map((p: any) => ({
                      value: p.id,
                      label: `${p.name} (Rs. ${Number(p.basePrice)?.toLocaleString()} per head)`
                    }))
                  ]}
                  value={formData.packageId}
                  onChange={(value) => handlePackageChange(value)}
                  placeholder="Select Package"
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Event Type</label>
                <SearchableSelect
                  options={[
                    { value: 'Mehndi', label: 'Mehndi' },
                    { value: 'Barat', label: 'Barat' },
                    { value: 'Walima', label: 'Walima' },
                    { value: 'Birthday', label: 'Birthday' },
                    { value: 'Corporate', label: 'Corporate' },
                    { value: 'Other', label: 'Other' }
                  ]}
                  value={formData.eventType}
                  onChange={(value) => setFormData({ ...formData, eventType: value })}
                  placeholder="Select Event Type"
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Branch</label>
                <SearchableSelect
                  options={branches.map((b: any) => ({ value: b.id, label: b.name }))}
                  value={formData.branchId}
                  onChange={(value) => setFormData({ ...formData, branchId: value, hallId: '' })}
                  placeholder="Select Branch"
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Hall</label>
                <SearchableSelect
                  options={halls.map((h: any) => ({ value: h.id, label: h.hallName }))}
                  value={formData.hallId}
                  onChange={(value) => setFormData({ ...formData, hallId: value })}
                  placeholder="Select Hall"
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Event Date</label>
                <input 
                  type="date"
                  value={formData.eventDate}
                  onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Slot</label>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                  <button 
                    onClick={() => setFormData({ ...formData, slot: 'Morning' })}
                    className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-all ${formData.slot === 'Morning' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Morning
                  </button>
                  <button 
                    onClick={() => setFormData({ ...formData, slot: 'Evening' })}
                    className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-all ${formData.slot === 'Evening' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Evening
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Guest Count</label>
                <input 
                  type="number"
                  value={formData.guestCount}
                  onChange={(e) => setFormData({ ...formData, guestCount: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  placeholder="Estimated guests"
                />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="p-5 sm:p-8 space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">Step 3: Pricing & Catering Customization</h2>
            
            {/* Menu Customization Section */}
            <div className="space-y-6 p-5 sm:p-6 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <Utensils size={18} className="text-indigo-600" />
                  Menu Selection
                </h3>
              </div>
              
              <div className="space-y-8">
                {categories.map((category: any) => {
                  const categoryItems = allMenuItems.filter((mi: any) => mi.categoryId === category.id);
                  if (categoryItems.length === 0) return null;

                  return (
                    <div key={category.id} className="space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                        <div className="w-2 h-2 rounded-full bg-indigo-600"></div>
                        <h4 className="font-bold text-slate-800 uppercase tracking-wider text-xs">{category.name}</h4>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-3">
                        {categoryItems.map((item: any) => {
                          const selectedItem = formData.menuItems.find(mi => String(mi.menuItemId) === String(item.id));
                          
                          return (
                            <div 
                              key={item.id} 
                              className={`p-4 rounded-xl border transition-all ${
                                selectedItem 
                                  ? 'bg-indigo-50/50 border-indigo-200 shadow-sm' 
                                  : 'bg-white border-slate-100 hover:border-slate-200'
                              }`}
                            >
                              <div className="flex items-start gap-4">
                                <div className="pt-1">
                                  <input 
                                    type="checkbox" 
                                    checked={!!selectedItem}
                                    onChange={() => {
                                      if (selectedItem) {
                                        setFormData(prev => ({
                                          ...prev,
                                          menuItems: prev.menuItems.filter(mi => String(mi.menuItemId) !== String(item.id))
                                        }));
                                      } else {
                                        setFormData(prev => ({
                                          ...prev,
                                          menuItems: [...prev.menuItems, { menuItemId: item.id, quantity: 1, notes: '', itemName: item.name }]
                                        }));
                                      }
                                    }}
                                    className="w-5 h-5 text-indigo-600 rounded-lg border-slate-300 focus:ring-indigo-500 cursor-pointer"
                                  />
                                </div>
                                
                                <div className="flex-1 space-y-3">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div>
                                      <p className="font-bold text-slate-900">{item.name}</p>
                                      {item.description && <p className="text-xs text-slate-500">{item.description}</p>}
                                    </div>
                                  </div>

                                  {selectedItem && (
                                    <div className="flex flex-col sm:flex-row gap-3 pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                      <div className="w-full sm:w-24">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Qty/Guest</label>
                                        <input 
                                          type="number" 
                                          step="0.1"
                                          disabled
                                          value={selectedItem.quantity}
                                          onChange={e => {
                                            const newItems = formData.menuItems.map(mi => 
                                              String(mi.menuItemId) === String(item.id) ? { ...mi, quantity: Number(e.target.value) } : mi
                                            );
                                            setFormData({ ...formData, menuItems: newItems });
                                          }}
                                          className="w-full px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 cursor-not-allowed"
                                        />
                                      </div>
                                      <div className="flex-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Notes</label>
                                        <input 
                                          type="text" 
                                          placeholder="Notes..."
                                          value={selectedItem.notes}
                                          onChange={e => {
                                            const newItems = formData.menuItems.map(mi => 
                                              String(mi.menuItemId) === String(item.id) ? { ...mi, notes: e.target.value } : mi
                                            );
                                            setFormData({ ...formData, menuItems: newItems });
                                          }}
                                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add-ons Button and List */}
              <div className="pt-6 border-t border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <Plus size={18} className="text-indigo-600" />
                    Event Add-ons
                  </h3>
                  <button 
                    type="button"
                    onClick={() => setIsAddOnModalOpen(true)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all flex items-center gap-2"
                  >
                    <Plus size={16} /> Add Add-ons
                  </button>
                </div>

                {formData.selectedAddOns.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {formData.selectedAddOns.map((ao, idx) => (
                      <div 
                        key={idx} 
                        className="p-3 bg-white rounded-xl border border-indigo-100 flex items-center justify-between shadow-sm"
                      >
                        <div>
                          <p className="text-sm font-bold text-slate-900">{ao.name}</p>
                          <p className="text-[10px] text-indigo-600 font-bold">Rs. {ao.price?.toLocaleString()}</p>
                        </div>
                        <button 
                          type="button"
                          onClick={() => toggleAddOn(ao)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-white rounded-2xl border border-dashed border-slate-200">
                    <p className="text-sm text-slate-400">No add-ons selected yet.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
              <div className="space-y-4 sm:space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Hall Rent</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">Rs.</span>
                    <input 
                      type="number"
                      value={formData.hallRent}
                      onChange={(e) => setFormData({ ...formData, hallRent: Number(e.target.value) })}
                      className="w-full pl-12 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Decoration Charges</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">Rs.</span>
                    <input 
                      type="number"
                      value={formData.decorationCharges}
                      onChange={(e) => setFormData({ ...formData, decorationCharges: Number(e.target.value) })}
                      className="w-full pl-12 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">DJ Charges</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">Rs.</span>
                    <input 
                      type="number"
                      value={formData.djCharges}
                      onChange={(e) => setFormData({ ...formData, djCharges: Number(e.target.value) })}
                      className="w-full pl-12 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Firework Price</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">Rs.</span>
                      <input 
                        type="number"
                        value={formData.fireworkPrice}
                        onChange={(e) => setFormData({ ...formData, fireworkPrice: Number(e.target.value) })}
                        className="w-full pl-12 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Firework Qty</label>
                    <input 
                      type="number"
                      value={formData.fireworkQuantity}
                      onChange={(e) => setFormData({ ...formData, fireworkQuantity: Number(e.target.value) })}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Discount Per Head Price</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">Rs.</span>
                    <input 
                      type="number"
                      value={formData.perHeadPrice}
                      onChange={(e) => setFormData({ ...formData, perHeadPrice: Number(e.target.value) })}
                      className="w-full pl-12 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Total Catering Charges</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">Rs.</span>
                    <input 
                      type="number"
                      disabled
                      value={formData.cateringCharges}
                      onChange={(e) => setFormData({ ...formData, cateringCharges: Number(e.target.value) })}
                      className="w-full pl-12 pr-4 py-2 bg-slate-100 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-5 sm:p-8 rounded-2xl border border-slate-200 space-y-6">
                <h3 className="font-bold text-slate-900 border-b border-slate-200 pb-4">Grand Total Summary</h3>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>Subtotal</span>
                    <span className="font-bold">Rs. {(
                      Number(formData.hallRent) + 
                      Number(formData.decorationCharges) + 
                      Number(formData.cateringCharges) + 
                      Number(formData.djCharges) + 
                      (Number(formData.fireworkPrice) * Number(formData.fireworkQuantity))
                    )?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>Add-ons Total ({formData.guestCount} Guests)</span>
                    <span className="font-bold">Rs. {formData.selectedAddOns.reduce((sum, ao) => sum + ((Number(ao.price) || 0) * (Number(formData.guestCount) || 0)), 0)?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center gap-4">
                    <span className="text-sm text-slate-600">Discount (Rs.)</span>
                    <input 
                      type="number"
                      value={formData.discount}
                      onChange={(e) => setFormData({ ...formData, discount: Number(e.target.value) })}
                      className="w-24 px-2 py-1 bg-white border border-slate-200 rounded text-right text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="flex justify-between items-center gap-4">
                    <span className="text-sm text-slate-600">Tax (%)</span>
                    <input 
                      type="number"
                      value={formData.tax}
                      onChange={(e) => setFormData({ ...formData, tax: Number(e.target.value) })}
                      className="w-24 px-2 py-1 bg-white border border-slate-200 rounded text-right text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                    <span className="text-base sm:text-lg font-bold text-slate-900">Grand Total</span>
                    <span className="text-xl sm:text-2xl font-black text-indigo-600">Rs. {formData.grandTotal?.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="p-5 sm:p-8 space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">Step 4: Payment Plan</h2>
              <button 
                type="button"
                onClick={addPayment}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all flex items-center gap-2"
              >
                <Plus size={16} /> Add Payment
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-slate-600">Grand Total:</span>
                <span className="text-lg font-black text-indigo-600">Rs. {formData.grandTotal?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-sm font-bold text-slate-600">Total Planned (New):</span>
                <span className="text-lg font-black text-slate-900">Rs. {formData.paymentPlan.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)?.toLocaleString()}</span>
              </div>
              {existingPayments.length > 0 && (
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm font-bold text-slate-600">Total Existing:</span>
                  <span className="text-lg font-black text-slate-900">Rs. {existingPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)?.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-200">
                <span className="text-sm font-bold text-slate-600">Remaining:</span>
                <span className={`text-lg font-black ${formData.grandTotal - existingPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) - formData.paymentPlan.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  Rs. {(formData.grandTotal - existingPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) - formData.paymentPlan.reduce((sum, p) => sum + (Number(p.amount) || 0), 0))?.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {existingPayments.length > 0 && (
                <div className="mb-6 space-y-4">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Existing Payments</h3>
                  <div className="grid grid-cols-1 gap-4 opacity-75">
                    {existingPayments.map((p: any, idx: number) => (
                      <div key={`exist-${idx}`} className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-bold">
                            ✓
                          </div>
                          <span className="font-bold text-slate-900">{p.type}</span>
                          <span className="ml-auto px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">{p.status}</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</label>
                            <p className="font-bold text-slate-900">Rs. {Number(p.amount).toLocaleString()}</p>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Due Date</label>
                            <p className="font-bold text-slate-900">{p.dueDate ? format(new Date(p.dueDate), 'MMM dd, yyyy') : 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {formData.paymentPlan.length === 0 && existingPayments.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-slate-200">
                  <CreditCard size={48} className="mx-auto mb-4 text-slate-300" />
                  <p className="text-slate-500 font-medium">No payments added yet. Click "Add Payment" to start.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {formData.paymentPlan.map((p: any, idx: number) => (
                    <div key={idx} className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                            {existingPayments.length + idx + 1}
                          </div>
                          <input 
                            type="text"
                            value={p.type}
                            onChange={(e) => updatePayment(idx, 'type', e.target.value)}
                            className="bg-transparent border-none font-bold text-slate-900 focus:ring-0 p-0 text-sm sm:text-base"
                            placeholder="Payment Type (e.g. Advance)"
                          />
                        </div>
                        <button 
                          type="button"
                          onClick={() => removePayment(idx)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">Rs.</span>
                            <input 
                              type="number"
                              value={p.amount}
                              onChange={(e) => updatePayment(idx, 'amount', Number(e.target.value))}
                              className="w-full pl-12 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Due Date</label>
                          <input 
                            type="date"
                            value={p.dueDate}
                            onChange={(e) => updatePayment(idx, 'dueDate', e.target.value)}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="p-5 sm:p-8 space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={24} className="sm:w-8 sm:h-8" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">{id ? 'Update Booking' : 'Ready to Confirm!'}</h2>
              <p className="text-sm sm:text-base text-slate-500">Please review the booking summary before {id ? 'updating' : 'finalizing'}.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
              <div className="space-y-4 sm:space-y-6">
                <div className="p-4 sm:p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm sm:text-base">
                    <User size={18} className="text-indigo-600" />
                    Customer Details
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-xs sm:text-sm">
                    <div>
                      <p className="text-slate-500">Name</p>
                      <p className="font-bold text-slate-900 truncate">{formData.customerName}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Phone</p>
                      <p className="font-bold text-slate-900">{formData.customerPhone}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-slate-500">Event Type</p>
                      <p className="font-bold text-slate-900">{formData.eventType} on {formData.eventDate ? format(new Date(formData.eventDate), 'MMM dd, yyyy') : 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 sm:p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm sm:text-base">
                    <MapPin size={18} className="text-indigo-600" />
                    Venue Details
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-xs sm:text-sm">
                    <div>
                      <p className="text-slate-500">Branch</p>
                      <p className="font-bold text-slate-900 truncate">{branches.find((b: any) => String(b.id) === String(formData.branchId))?.name}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Hall</p>
                      <p className="font-bold text-slate-900 truncate">{halls.find((h: any) => String(h.id) === String(formData.hallId))?.hallName}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Slot</p>
                      <p className="font-bold text-slate-900">{formData.slot}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Guests</p>
                      <p className="font-bold text-slate-900">{formData.guestCount} Persons</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 sm:p-8 bg-indigo-600 rounded-2xl text-white space-y-6 shadow-xl shadow-indigo-200">
                <h3 className="text-lg sm:text-xl font-bold border-b border-indigo-500 pb-4">Financial Summary</h3>
                <div className="space-y-4">
                  <div className="flex justify-between opacity-80 text-sm">
                    <span>Hall Rent</span>
                    <span>Rs. {formData.hallRent?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between opacity-80 text-sm">
                    <span>Decoration</span>
                    <span>Rs. {formData.decorationCharges?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between opacity-80 text-sm">
                    <span>Catering</span>
                    <span>Rs. {formData.cateringCharges?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between opacity-80 text-sm">
                    <span>DJ Charges</span>
                    <span>Rs. {formData.djCharges?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between opacity-80 text-sm">
                    <span>Fireworks</span>
                    <span>Rs. {(Number(formData.fireworkPrice) * Number(formData.fireworkQuantity))?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between opacity-80 text-sm">
                    <span>Add-ons ({formData.guestCount} Guests)</span>
                    <span>Rs. {formData.selectedAddOns.reduce((sum, ao) => sum + ((Number(ao.price) || 0) * (Number(formData.guestCount) || 0)), 0)?.toLocaleString()}</span>
                  </div>
                  {formData.discount > 0 && (
                    <div className="flex justify-between text-emerald-300 font-bold text-sm">
                      <span>Discount</span>
                      <span>- Rs. {formData.discount?.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="pt-4 border-t border-indigo-500 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                    <span className="text-base sm:text-lg font-bold">Grand Total</span>
                    <span className="text-2xl sm:text-3xl font-black">Rs. {formData.grandTotal?.toLocaleString()}</span>
                  </div>
                </div>
                <div className="pt-4 sm:pt-6">
                  <div className="bg-indigo-700/50 p-4 rounded-xl border border-indigo-500/50">
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-2">Payment Plan Summary</p>
                    <div className="space-y-1">
                      {formData.paymentPlan.length > 0 ? (
                        formData.paymentPlan.map((p, i) => (
                          <p key={i} className="text-xs sm:text-sm font-medium flex justify-between">
                            <span>{p.type}:</span>
                            <span>Rs. {p.amount?.toLocaleString()}</span>
                          </p>
                        ))
                      ) : (
                        <p className="text-xs sm:text-sm font-medium">No payment plan defined</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between gap-4">
        <button 
          onClick={() => setStep(prev => prev - 1)}
          disabled={step === 1 || loading}
          className={`flex items-center gap-2 px-4 sm:px-6 py-3 rounded-xl font-bold transition-all text-sm sm:text-base ${step === 1 ? 'opacity-0 pointer-events-none' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          <ChevronLeft size={20} />
          Back
        </button>
        
        {step === 5 ? (
          hasPermission('bookings.create') ? (
            <button 
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 px-6 sm:px-10 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 disabled:opacity-50 text-sm sm:text-base"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  {id ? 'Update Booking' : 'Confirm & Create'}
                  <CheckCircle2 size={20} />
                </>
              )}
            </button>
          ) : (
            <button 
              disabled
              className="flex items-center gap-2 px-6 sm:px-10 py-3 bg-slate-300 text-slate-500 rounded-xl font-bold cursor-not-allowed text-sm sm:text-base"
            >
              No Permission to Create
            </button>
          )
        ) : (
          <button 
            onClick={handleNext}
            disabled={loading}
            className="flex items-center gap-2 px-6 sm:px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 text-sm sm:text-base disabled:opacity-50"
          >
            {loading && step === 2 ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                Next Step
                <ChevronRight size={20} />
              </>
            )}
          </button>
        )}
      </div>
      {/* Add-ons Modal */}
      {isAddOnModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Select Add-ons</h2>
              <button onClick={() => setIsAddOnModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {allAddOns.map((ao: any) => {
                  const isSelected = formData.selectedAddOns.find(s => s.id === ao.id);
                  return (
                    <div 
                      key={ao.id}
                      onClick={() => toggleAddOn(ao)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                        isSelected 
                          ? 'bg-indigo-50 border-indigo-600 shadow-sm' 
                          : 'bg-white border-slate-100 hover:border-slate-200'
                      }`}
                    >
                      <div className="flex-1">
                        <p className="font-bold text-slate-900">{ao.name}</p>
                        <p className="text-xs text-slate-500 line-clamp-1">{ao.description}</p>
                        <p className="text-sm font-bold text-indigo-600 mt-1">Rs. {ao.price?.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">/ guest</span></p>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                        isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-200'
                      }`}>
                        {isSelected && <Check size={14} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="p-6 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setIsAddOnModalOpen(false)}
                className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddBooking;
