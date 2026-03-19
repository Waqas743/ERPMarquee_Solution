import { query } from "../db";

export async function getDashboardStats(tenantId: string, branchId?: string, userId?: string) {
  let bookingQuery = `
    SELECT 
      b.status, 
      b.eventDate as "eventDate",
      b.grandTotal as "grandTotal", 
      b.paymentStatus as "paymentStatus",
      b.assignedTo as "assignedTo",
      COALESCE((
        SELECT SUM(amount)
        FROM BookingPayments
        WHERE bookingId::text = b.id::text AND status = 'Paid' AND COALESCE(isDeleted, FALSE) = FALSE
      ), 0) as "paidAmount"
    FROM Bookings b
    WHERE b.tenantId = $1::uuid AND COALESCE(b.isDeleted, FALSE) = FALSE
  `;
  const params: any[] = [tenantId];
  if (branchId) {
    params.push(branchId);
    bookingQuery += ` AND b.branchId = $${params.length}::uuid`;
  }
  if (userId) {
    params.push(userId);
    bookingQuery += ` AND (b.createdBy::text = $${params.length} OR b.assignedTo::text = $${params.length})`;
  }
  const bookings = (await query(bookingQuery, params)).rows as any[];
  
  let totalSales = 0;
  let receivedPayment = 0;
  let pendingPayment = 0;
  let totalBookings = bookings.length;
  let confirmedBookings = 0;
  let cancelledBookings = 0;
  let pendingBookings = 0;
  let completedEvents = 0;
  let paidInvoices = 0;
  let pendingInvoices = 0;
  let totalInvoices = 0;
  let assignedBookings = 0;

  const today = new Date().toISOString().split("T")[0];

  bookings.forEach(b => {
    if (userId && b.assignedTo === userId) {
      assignedBookings++;
    }

    if (b.status === "Approved" || b.status === "Confirmed") {
      confirmedBookings++;
      
      const gTotal = Number(b.grandTotal) || 0;
      const pAmount = Number(b.paidAmount) || 0;
      totalSales += gTotal;
      receivedPayment += pAmount;
      pendingPayment += (gTotal - pAmount);
      
      // Only count invoices for approved bookings
      totalInvoices++;
      if (b.paymentStatus === "Paid") {
        paidInvoices++;
      } else {
        pendingInvoices++;
      }
    } else if (b.status === "Cancelled" || b.status === "Rejected") {
      cancelledBookings++;
    } else if (b.status === "Pending") {
      pendingBookings++;
    } else if (b.status === "Completed") {
      completedEvents++;
      // Optional: If you want Completed bookings to also count towards total sales and invoices, add that logic here.
      // Assuming completed events also have sales value:
      const gTotal = Number(b.grandTotal) || 0;
      const pAmount = Number(b.paidAmount) || 0;
      totalSales += gTotal;
      receivedPayment += pAmount;
      pendingPayment += (gTotal - pAmount);
      
      totalInvoices++;
      if (b.paymentStatus === "Paid") {
        paidInvoices++;
      } else {
        pendingInvoices++;
      }
    }
  });
  return {
    totalSales,
    receivedPayment,
    pendingPayment,
    totalBookings,
    assignedBookings,
    confirmedBookings,
    cancelledBookings,
    pendingBookings,
    completedEvents,
    totalInvoices,
    paidInvoices,
    pendingInvoices,
  };
}

export async function getDashboardCalendar(tenantId: string, branchId?: string, start?: string, end?: string, userId?: string) {
  let queryText = `
    SELECT 
      b.id, 
      b.bookingNumber as "bookingNumber", 
      b.eventDate as "eventDate", 
      b.slot, 
      b.status, 
      h.hallName as "hallName", 
      c.name as "customerName"
    FROM Bookings b
    JOIN Halls h ON b.hallId::text = h.id::text
    JOIN Customers c ON b.customerId::text = c.id::text
    WHERE b.tenantId = $1::uuid AND b.status IN ('Approved', 'Confirmed')
  `;
  const params: any[] = [tenantId];
  if (branchId) {
    params.push(branchId);
    queryText += ` AND b.branchId = $${params.length}::uuid`;
  }
  if (userId) {
    params.push(userId);
    queryText += ` AND (b.createdBy::text = $${params.length} OR b.assignedTo::text = $${params.length})`;
  }
  if (start && end) {
    params.push(start, end);
    queryText += ` AND b.eventDate BETWEEN $${params.length - 1} AND $${params.length}`;
  }
  return (await query(queryText, params)).rows;
}

export async function getDashboardUpcomingEvents(tenantId: string, branchId?: string, userId?: string) {
  const today = new Date().toISOString().split("T")[0];
  let queryText = `
    SELECT 
      b.id,
      b.bookingNumber as "bookingNumber",
      b.eventDate as "eventDate",
      b.slot,
      b.status,
      b.grandTotal as "grandTotal",
      b.paymentStatus as "paymentStatus",
      h.hallName as "hallName", 
      c.name as "customerName", 
      c.phone as "customerPhone"
    FROM Bookings b
    JOIN Halls h ON b.hallId::text = h.id::text
    JOIN Customers c ON b.customerId::text = c.id::text
    WHERE b.tenantId = $1::uuid AND b.eventDate >= $2 AND b.status IN ('Approved', 'Confirmed')
  `;
  const params: any[] = [tenantId, today];
  if (branchId) {
    params.push(branchId);
    queryText += ` AND b.branchId = $${params.length}::uuid`;
  }
  if (userId) {
    params.push(userId);
    queryText += ` AND (b.createdBy::text = $${params.length} OR b.assignedTo::text = $${params.length})`;
  }
  queryText += " ORDER BY b.eventDate ASC LIMIT 10";
  return (await query(queryText, params)).rows;
}

export async function getDashboardCompletedEvents(tenantId: string, branchId?: string, userId?: string) {
  const today = new Date().toISOString().split("T")[0];
  let queryText = `
    SELECT 
      b.id,
      b.bookingNumber as "bookingNumber",
      b.eventDate as "eventDate",
      b.slot,
      b.status,
      b.grandTotal as "grandTotal",
      b.paymentStatus as "paymentStatus",
      h.hallName as "hallName", 
      c.name as "customerName"
    FROM Bookings b
    JOIN Halls h ON b.hallId::text = h.id::text
    JOIN Customers c ON b.customerId::text = c.id::text
    WHERE b.tenantId = $1::uuid AND b.status = 'Completed'
  `;
  const params: any[] = [tenantId];
  if (branchId) {
    params.push(branchId);
    queryText += ` AND b.branchId = $${params.length}::uuid`;
  }
  if (userId) {
    params.push(userId);
    queryText += ` AND (b.createdBy::text = $${params.length} OR b.assignedTo::text = $${params.length})`;
  }
  queryText += " ORDER BY b.eventDate DESC LIMIT 10";
  return (await query(queryText, params)).rows;
}

export async function getDashboardInvoices(tenantId: string, branchId?: string, userId?: string) {
  let queryText = `
    SELECT 
      b.id, 
      b.bookingNumber as "bookingNumber", 
      b.grandTotal as "grandTotal", 
      b.paymentStatus as "paymentStatus", 
      b.eventDate as "eventDate", 
      c.name as "customerName"
    FROM Bookings b
    JOIN Customers c ON b.customerId::text = c.id::text
    WHERE b.tenantId = $1::uuid AND b.status IN ('Approved', 'Confirmed', 'Completed')
  `;
  const params: any[] = [tenantId];
  if (branchId) {
    params.push(branchId);
    queryText += ` AND b.branchId = $${params.length}::uuid`;
  }
  if (userId) {
    params.push(userId);
    queryText += ` AND (b.createdBy::text = $${params.length} OR b.assignedTo::text = $${params.length})`;
  }
  queryText += " ORDER BY b.createdAt DESC LIMIT 10";
  return (await query(queryText, params)).rows;
}

export async function getDashboardCharts(tenantId: string, branchId?: string, userId?: string) {
  let salesQuery = `
    SELECT 
      TO_CHAR(DATE(bp.paidDate), 'Mon') as month,
      EXTRACT(YEAR FROM DATE(bp.paidDate)) as year,
      SUM(bp.amount) as total
    FROM BookingPayments bp
    JOIN Bookings b ON bp.bookingId::text = b.id::text
    WHERE b.tenantId = $1::uuid 
      AND bp.status = 'Paid' 
      AND DATE(bp.paidDate) >= CURRENT_DATE - INTERVAL '12 months'
      AND COALESCE(bp.isDeleted, FALSE) = FALSE 
      AND b.status IN ('Approved', 'Confirmed', 'Completed') 
      AND COALESCE(b.isDeleted, FALSE) = FALSE
  `;

  let bookingsQuery = `
    SELECT 
      TO_CHAR(DATE(b.eventDate), 'Mon') as month,
      EXTRACT(YEAR FROM DATE(b.eventDate)) as year,
      COUNT(b.id) as bookings
    FROM Bookings b
    WHERE b.tenantId = $1::uuid 
      AND DATE(b.eventDate) >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '12 months'
      AND DATE(b.eventDate) < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '12 months'
      AND b.status IN ('Approved', 'Confirmed', 'Completed') 
      AND COALESCE(b.isDeleted, FALSE) = FALSE
  `;

  let pendingQuery = `
    SELECT 
      TO_CHAR(DATE(b.eventDate), 'Mon') as month,
      EXTRACT(YEAR FROM DATE(b.eventDate)) as year,
      SUM(b.grandTotal - COALESCE((
        SELECT SUM(amount) FROM BookingPayments bp WHERE bp.bookingId::text = b.id::text AND bp.status = 'Paid' AND COALESCE(bp.isDeleted, FALSE) = FALSE
      ), 0)) as pending
    FROM Bookings b
    WHERE b.tenantId = $1::uuid 
      AND DATE(b.eventDate) >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '12 months'
      AND DATE(b.eventDate) < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '12 months'
      AND b.status IN ('Approved', 'Confirmed', 'Completed') 
      AND COALESCE(b.isDeleted, FALSE) = FALSE
  `;

  const params: any[] = [tenantId];
  if (branchId) {
    params.push(branchId);
    salesQuery += ` AND b.branchId = $${params.length}::uuid`;
    bookingsQuery += ` AND b.branchId = $${params.length}::uuid`;
    pendingQuery += ` AND b.branchId = $${params.length}::uuid`;
  }
  if (userId) {
    params.push(userId);
    salesQuery += ` AND (b.createdBy::text = $${params.length} OR b.assignedTo::text = $${params.length})`;
    bookingsQuery += ` AND (b.createdBy::text = $${params.length} OR b.assignedTo::text = $${params.length})`;
    pendingQuery += ` AND (b.createdBy::text = $${params.length} OR b.assignedTo::text = $${params.length})`;
  }
  
  salesQuery += ` GROUP BY TO_CHAR(DATE(bp.paidDate), 'Mon'), EXTRACT(MONTH FROM DATE(bp.paidDate)), EXTRACT(YEAR FROM DATE(bp.paidDate))`;
  bookingsQuery += ` GROUP BY TO_CHAR(DATE(b.eventDate), 'Mon'), EXTRACT(MONTH FROM DATE(b.eventDate)), EXTRACT(YEAR FROM DATE(b.eventDate))`;
  pendingQuery += ` GROUP BY TO_CHAR(DATE(b.eventDate), 'Mon'), EXTRACT(MONTH FROM DATE(b.eventDate)), EXTRACT(YEAR FROM DATE(b.eventDate))`;
  
  const [salesResult, bookingsResult, pendingResult] = await Promise.all([
    query(salesQuery, params),
    query(bookingsQuery, params),
    query(pendingQuery, params)
  ]);
  
  // Ensure we always return the last 12 months even if some months have 0 sales
  const monthlySales = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const monthStr = d.toLocaleString('en-US', { month: 'short' });
    const yearNum = d.getFullYear();
    const label = `${monthStr} ${yearNum}`;
    
    const saleFound = salesResult.rows.find(r => r.month === monthStr && Number(r.year) === yearNum);
    const bookingFound = bookingsResult.rows.find(r => r.month === monthStr && Number(r.year) === yearNum);
    
    monthlySales.push({
      month: label,
      total: saleFound ? Number(saleFound.total) || 0 : 0,
      bookings: bookingFound ? Number(bookingFound.bookings) || 0 : 0,
      revenue: saleFound ? Number(saleFound.total) || 0 : 0 // added revenue for Reports.tsx compatibility
    });
  }

  // Next 12 months (including current) for Bookings and Pending Payments charts
  const monthlyBookings = [];
  const monthlyPendingPayments = [];
  for (let i = -1; i < 11; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() + i);
    const monthStr = d.toLocaleString('en-US', { month: 'short' });
    const yearNum = d.getFullYear();
    const label = `${monthStr} ${yearNum}`;
    
    const bookingFound = bookingsResult.rows.find(r => r.month === monthStr && Number(r.year) === yearNum);
    const pendingFound = pendingResult.rows.find(r => r.month === monthStr && Number(r.year) === yearNum);
    
    monthlyBookings.push({
      month: label,
      name: label,
      bookings: bookingFound ? Number(bookingFound.bookings) || 0 : 0
    });

    monthlyPendingPayments.push({
      month: label,
      name: label,
      pending: pendingFound ? Number(pendingFound.pending) || 0 : 0
    });
  }
  
  return { monthlySales, monthlyBookings, monthlyPendingPayments };
}
