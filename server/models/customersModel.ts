import { query } from "../db";

export async function listCustomers(tenantId: string, search?: string, userId?: string) {
  let queryText = `
    SELECT
      c.id,
      c.tenantId as "tenantId",
      c.name,
      c.cnic,
      c.phone,
      c.email,
      c.address,
      c.createdAt as "createdAt",
      c.modifiedAt as "modifiedAt",
      c.createdBy as "createdBy",
      c.modifiedBy as "modifiedBy",
      cb.fullName as "createdByName",
      mb.fullName as "modifiedByName"
    FROM Customers c
    LEFT JOIN TenantUsers cb ON c.createdBy::text = cb.id::text
    LEFT JOIN TenantUsers mb ON c.modifiedBy::text = mb.id::text
    WHERE c.tenantId = $1::uuid AND COALESCE(c.isDeleted, FALSE) = FALSE
  `;
  const params: any[] = [tenantId];
  if (userId) {
    params.push(userId);
    queryText += ` AND c.createdBy = $${params.length}::uuid`;
  }
  if (search) {
    const searchParam = `%${search}%`;
    params.push(searchParam, searchParam, searchParam, searchParam);
    const pLen = params.length;
    queryText += ` AND (c.name ILIKE $${pLen - 3} OR c.phone ILIKE $${pLen - 2} OR c.cnic ILIKE $${pLen - 1} OR c.email ILIKE $${pLen})`;
  }
  queryText += " ORDER BY c.createdAt DESC";
  return (await query(queryText, params)).rows;
}

export async function getCustomerById(id: string) {
  const customerResult = await query(`
    SELECT 
      c.id,
      c.tenantId as "tenantId",
      c.name,
      c.cnic,
      c.phone,
      c.email,
      c.address,
      c.createdAt as "createdAt",
      c.modifiedAt as "modifiedAt",
      c.createdBy as "createdBy",
      c.modifiedBy as "modifiedBy",
      cb.fullName as "createdByName",
      mb.fullName as "modifiedByName"
    FROM Customers c
    LEFT JOIN TenantUsers cb ON c.createdBy::text = cb.id::text
    LEFT JOIN TenantUsers mb ON c.modifiedBy::text = mb.id::text
    WHERE c.id = $1::uuid AND COALESCE(c.isDeleted, FALSE) = FALSE
  `, [id]);
  const customer = customerResult.rows[0] as any;
  if (customer) {
    const bookings = (await query(`
      SELECT 
        b.id,
        b.bookingNumber as "bookingNumber",
        b.eventType as "eventType",
        b.eventDate as "eventDate",
        b.slot,
        b.status,
        b.grandTotal as "grandTotal",
        b.paymentStatus as "paymentStatus",
        b.createdAt as "createdAt",
        b.modifiedAt as "modifiedAt",
        b.createdBy as "createdBy",
        b.modifiedBy as "modifiedBy",
        h.hallName as "hallName",
        br.name as "branchName"
      FROM Bookings b
      JOIN Halls h ON b.hallId::text = h.id::text
      JOIN Branches br ON b.branchId::text = br.id::text
      WHERE b.customerId = $1::uuid AND COALESCE(b.isDeleted, FALSE) = FALSE
      ORDER BY b.eventDate DESC
    `, [id])).rows;
    customer.bookings = bookings;
  }
  return customer;
}

export async function createCustomer(data: {
  tenantId: string;
  name: string;
  cnic: string;
  phone: string;
  email: string;
  address: string;
  createdBy?: string;
}) {
  const tenant = await query("SELECT id FROM Tenants WHERE id = $1::uuid", [data.tenantId]);
  if (tenant.rowCount === 0) {
    throw new Error("Invalid tenantId");
  }
  const result = await query(
    `
      INSERT INTO Customers (tenantId, name, cnic, phone, email, address, createdBy)
      VALUES ($1::uuid, $2, $3, $4, $5, $6, $7::uuid)
      RETURNING id
    `,
    [data.tenantId, data.name, data.cnic, data.phone, data.email, data.address, data.createdBy || null]
  );
  return result.rows[0]?.id;
}

export async function updateCustomer(id: string, data: {
  name: string;
  cnic: string;
  phone: string;
  email: string;
  address: string;
  modifiedBy?: string;
}) {
  await query(
    `
      UPDATE Customers SET
        name = $1, cnic = $2, phone = $3, email = $4, address = $5,
        modifiedAt = CURRENT_TIMESTAMP, modifiedBy = $6::uuid
      WHERE id = $7::uuid
    `,
    [data.name, data.cnic, data.phone, data.email, data.address, data.modifiedBy || null, id]
  );
}
