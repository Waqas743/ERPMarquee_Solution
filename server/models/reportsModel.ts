import { query } from "../db";

export async function getPackageRevenue(tenantId: string, branchId?: string) {
  let queryText = `
    SELECT p.name, SUM(b.grandTotal) as revenue, COUNT(b.id) as bookingCount
    FROM Bookings b
    JOIN EventPackages p ON b.packageId::text = p.id::text
    WHERE b.tenantId = $1::uuid AND b.status = 'Approved'
  `;
  const params: any[] = [tenantId];
  if (branchId) {
    params.push(branchId);
    queryText += ` AND b.branchId = $${params.length}::uuid`;
  }
  queryText += ` GROUP BY p.id, p.name ORDER BY revenue DESC`;
  const result = await query(queryText, params);
  return result.rows;
}

export async function getPopularItems(tenantId: string, branchId?: string) {
  let queryText = `
    SELECT mi.name, mc.name as categoryName, SUM(bmi.quantity * b.guestCount) as totalQty, COUNT(DISTINCT b.id) as bookingCount
    FROM BookingMenuItems bmi
    JOIN MenuItems mi ON bmi.menuItemId::text = mi.id::text
    JOIN MenuCategories mc ON mi.categoryId::text = mc.id::text
    JOIN Bookings b ON bmi.bookingId::text = b.id::text
    WHERE b.tenantId = $1::uuid AND b.status = 'Approved'
  `;
  const params: any[] = [tenantId];
  if (branchId) {
    params.push(branchId);
    queryText += ` AND b.branchId = $${params.length}::uuid`;
  }
  queryText += ` GROUP BY mi.id, mi.name, mc.name ORDER BY totalQty DESC LIMIT 10`;
  const result = await query(queryText, params);
  return result.rows;
}
