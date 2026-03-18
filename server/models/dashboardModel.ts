import { query } from "../db";

export async function getDashboardStats(tenantId: string, branchId?: string) {
  let bookingQuery = `
    SELECT 
      status, 
      grandTotal as "grandTotal", 
      paymentStatus as "paymentStatus" 
    FROM Bookings 
    WHERE tenantId = $1
  `;
  const params: any[] = [tenantId];
  if (branchId) {
    bookingQuery += " AND branchId = $2";
    params.push(branchId);
  }
  const bookings = (await query(bookingQuery, params)).rows as any[];
  const totalSales = bookings.filter((b) => b.status === "Approved").reduce((sum, b) => sum + b.grandTotal, 0);
  const totalBookings = bookings.length;
  const confirmedBookings = bookings.filter((b) => b.status === "Approved").length;
  const cancelledBookings = bookings.filter((b) => b.status === "Cancelled").length;
  const totalInvoices = bookings.length;
  const paidInvoices = bookings.filter((b) => b.paymentStatus === "Paid").length;
  const pendingInvoices = bookings.filter((b) => b.paymentStatus !== "Paid").length;
  return {
    totalSales,
    totalBookings,
    confirmedBookings,
    cancelledBookings,
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
    JOIN Halls h ON b.hallId = h.id
    JOIN Customers c ON b.customerId = c.id
    WHERE b.tenantId = $1 AND b.status NOT IN ('Cancelled', 'Rejected')
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
    JOIN Halls h ON b.hallId = h.id
    JOIN Customers c ON b.customerId = c.id
    WHERE b.tenantId = $1 AND b.eventDate >= $2 AND b.status = 'Approved'
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
    JOIN Halls h ON b.hallId = h.id
    JOIN Customers c ON b.customerId = c.id
    WHERE b.tenantId = $1 AND b.eventDate < $2 AND b.status = 'Approved'
  `;
  const params: any[] = [tenantId, today];
  if (branchId) {
    queryText += ` AND b.branchId = $${params.length + 1}`;
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
    JOIN Customers c ON b.customerId = c.id
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
  const today = new Date();
  const last6Months = new Date(today.getFullYear(), today.getMonth() - 5, 1).toISOString().split("T")[0];

  let queryText = `
    SELECT 
      TO_CHAR(DATE(b.eventDate), 'Mon') as month,
      SUM(b.grandTotal) as total
    FROM Bookings b
    WHERE b.tenantId = $1 AND b.eventDate >= $2 AND b.status = 'Approved'
  `;
  const params: any[] = [tenantId, last6Months];
  
  if (branchId) {
    queryText += ` AND b.branchId = $${params.length + 1}`;
    params.push(branchId);
  }
  
  queryText += ` GROUP BY TO_CHAR(DATE(b.eventDate), 'Mon'), EXTRACT(MONTH FROM DATE(b.eventDate))
                 ORDER BY EXTRACT(MONTH FROM DATE(b.eventDate))`;
                 
  return (await query(queryText, params)).rows;
}
