import { query } from "../db";

export async function getDashboardStats(tenantId: string, branchId?: string) {
  let bookingQuery = `
    SELECT 
      b.status, 
      b.eventDate as "eventDate",
      b.grandTotal as "grandTotal", 
      b.paymentStatus as "paymentStatus",
      COALESCE((
        SELECT SUM(amount)
        FROM BookingPayments
        WHERE bookingId = b.id AND status = 'Paid' AND COALESCE(isDeleted, FALSE) = FALSE
      ), 0) as "paidAmount"
    FROM Bookings b
    WHERE b.tenantId = $1 AND COALESCE(b.isDeleted, FALSE) = FALSE
  `;
  const params: any[] = [tenantId];
  if (branchId) {
    bookingQuery += " AND b.branchId = $2";
    params.push(branchId);
  }
  const bookings = (await query(bookingQuery, params)).rows as any[];
  
  let totalSales = 0;
  let pendingPayment = 0;
  let totalBookings = bookings.length;
  let confirmedBookings = 0;
  let cancelledBookings = 0;
  let pendingBookings = 0;
  let completedEvents = 0;
  let paidInvoices = 0;
  let pendingInvoices = 0;
  let totalInvoices = 0;

  const today = new Date().toISOString().split("T")[0];

  bookings.forEach(b => {
    if (b.status === "Approved" || b.status === "Confirmed") {
      confirmedBookings++;
      
      const gTotal = Number(b.grandTotal) || 0;
      const pAmount = Number(b.paidAmount) || 0;
      totalSales += gTotal;
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
    pendingPayment,
    totalBookings,
    confirmedBookings,
    cancelledBookings,
    pendingBookings,
    completedEvents,
    totalInvoices,
    paidInvoices,
    pendingInvoices,
  };
}

export async function getDashboardCalendar(tenantId: string, branchId?: string, start?: string, end?: string) {
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
    WHERE b.tenantId = $1 AND b.status IN ('Approved', 'Confirmed')
  `;
  const params: any[] = [tenantId];
  if (branchId) {
    queryText += " AND b.branchId = $2";
    params.push(branchId);
  }
  if (start && end) {
    queryText += ` AND b.eventDate BETWEEN $${params.length + 1} AND $${params.length + 2}`;
    params.push(start, end);
  }
  return (await query(queryText, params)).rows;
}

export async function getDashboardUpcomingEvents(tenantId: string, branchId?: string) {
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
    WHERE b.tenantId = $1 AND b.eventDate >= $2 AND b.status IN ('Approved', 'Confirmed')
  `;
  const params: any[] = [tenantId, today];
  if (branchId) {
    queryText += ` AND b.branchId = $${params.length + 1}`;
    params.push(branchId);
  }
  queryText += " ORDER BY b.eventDate ASC LIMIT 10";
  return (await query(queryText, params)).rows;
}

export async function getDashboardCompletedEvents(tenantId: string, branchId?: string) {
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
    WHERE b.tenantId = $1 AND b.status = 'Completed'
  `;
  const params: any[] = [tenantId];
  if (branchId) {
    queryText += ` AND b.branchId = $2`;
    params.push(branchId);
  }
  queryText += " ORDER BY b.eventDate DESC LIMIT 10";
  return (await query(queryText, params)).rows;
}

export async function getDashboardInvoices(tenantId: string, branchId?: string) {
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
    WHERE b.tenantId = $1
  `;
  const params: any[] = [tenantId];
  if (branchId) {
    queryText += ` AND b.branchId = $${params.length + 1}`;
    params.push(branchId);
  }
  queryText += " ORDER BY b.createdAt DESC LIMIT 10";
  return (await query(queryText, params)).rows;
}

export async function getDashboardCharts(tenantId: string, branchId?: string) {
  let queryText = `
    SELECT 
      TO_CHAR(DATE(b.eventDate), 'Mon') as month,
      EXTRACT(YEAR FROM DATE(b.eventDate)) as year,
      SUM(b.grandTotal) as total
    FROM Bookings b
    WHERE b.tenantId = $1 AND b.status IN ('Approved', 'Confirmed')
  `;
  const params: any[] = [tenantId];
  
  if (branchId) {
    queryText += ` AND b.branchId = $${params.length + 1}`;
    params.push(branchId);
  }
  
  queryText += ` GROUP BY TO_CHAR(DATE(b.eventDate), 'Mon'), EXTRACT(MONTH FROM DATE(b.eventDate)), EXTRACT(YEAR FROM DATE(b.eventDate))
                 ORDER BY EXTRACT(YEAR FROM DATE(b.eventDate)), EXTRACT(MONTH FROM DATE(b.eventDate))`;
                 
  const dbResult = (await query(queryText, params)).rows;
  
  const monthlySales = dbResult.map(r => ({
    month: `${r.month} ${r.year}`, // Include year to differentiate e.g. "Mar 2025" vs "Mar 2026"
    total: Number(r.total) || 0
  })).filter(item => item.total > 0);
  
  return { monthlySales };
}
