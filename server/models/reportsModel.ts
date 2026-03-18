import { query } from "../db";

export async function getPackageRevenue(tenantId: string) {
  const result = await query(`
    SELECT p.name, SUM(b.grandTotal) as revenue, COUNT(b.id) as bookingCount
    FROM Bookings b
    JOIN EventPackages p ON b.packageId::text = p.id::text
    WHERE b.tenantId = $1 AND b.status = 'Approved'
    GROUP BY p.id, p.name
    ORDER BY revenue DESC
  `, [tenantId]);
  return result.rows;
}

export async function getPopularItems(tenantId: string) {
  const result = await query(`
    SELECT mi.name, mc.name as categoryName, SUM(bmi.quantity * b.guestCount) as totalQty, COUNT(DISTINCT b.id) as bookingCount
    FROM BookingMenuItems bmi
    JOIN MenuItems mi ON bmi.menuItemId::text = mi.id::text
    JOIN MenuCategories mc ON mi.categoryId::text = mc.id::text
    JOIN Bookings b ON bmi.bookingId::text = b.id::text
    WHERE b.tenantId = $1 AND b.status = 'Approved'
    GROUP BY mi.id, mi.name, mc.name
    ORDER BY totalQty DESC
    LIMIT 10
  `, [tenantId]);
  return result.rows;
}
