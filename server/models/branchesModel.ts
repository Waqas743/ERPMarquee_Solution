import { query, withTransaction } from "../db";

export async function getBranches(tenantId?: string, branchId?: string) {
  if (tenantId) {
    let queryText = `
      SELECT 
        b.id as "id",
        b.tenantId as "tenantId",
        b.name as "name",
        b.address as "address",
        b.city as "city",
        b.phone as "phone",
        b.email as "email",
        b.managerId as "managerId",
        b.isActive as "isActive",
        b.createdAt as "createdAt",
        b.modifiedAt as "modifiedAt",
        b.createdBy as "createdBy",
        b.modifiedBy as "modifiedBy",
        t.name as "tenantName",
        tu.fullName as "managerName",
        cb.fullName as "createdByName",
        mb.fullName as "modifiedByName"
      FROM Branches b
    JOIN Tenants t ON b.tenantId::text = t.id::text
    LEFT JOIN TenantUsers tu ON b.managerId::text = tu.id::text
    LEFT JOIN TenantUsers cb ON b.createdBy::text = cb.id::text
    LEFT JOIN TenantUsers mb ON b.modifiedBy::text = mb.id::text
    WHERE b.tenantId = $1::uuid AND COALESCE(b.isDeleted, FALSE) = FALSE
  `;
  const params: any[] = [tenantId];
  if (branchId) {
    params.push(branchId);
    queryText += ` AND b.id = $${params.length}::uuid`;
  }
  const result = await query(queryText, params);
    return result.rows;
  }
  let queryText = `
    SELECT 
      b.id as "id",
      b.tenantId as "tenantId",
      b.name as "name",
      b.address as "address",
      b.city as "city",
      b.phone as "phone",
      b.email as "email",
      b.managerId as "managerId",
      b.isActive as "isActive",
      b.createdAt as "createdAt",
      b.modifiedAt as "modifiedAt",
      b.createdBy as "createdBy",
      b.modifiedBy as "modifiedBy",
      t.name as "tenantName",
      tu.fullName as "managerName",
      cb.fullName as "createdByName",
      mb.fullName as "modifiedByName"
    FROM Branches b
    JOIN Tenants t ON b.tenantId::text = t.id::text
    LEFT JOIN TenantUsers tu ON b.managerId::text = tu.id::text
    LEFT JOIN TenantUsers cb ON b.createdBy::text = cb.id::text
    LEFT JOIN TenantUsers mb ON b.modifiedBy::text = mb.id::text
    WHERE COALESCE(b.isDeleted, FALSE) = FALSE
  `;
  const params: any[] = [];
  if (branchId) {
    params.push(branchId);
    queryText += ` AND b.id = $${params.length}::uuid`;
  }
  const result = await query(queryText, params);
  return result.rows;
}

export async function getBranchById(id: string) {
  const result = await query(
    `
      SELECT 
        b.id as "id",
        b.tenantId as "tenantId",
        b.name as "name",
        b.address as "address",
        b.city as "city",
        b.phone as "phone",
        b.email as "email",
        b.managerId as "managerId",
        b.isActive as "isActive",
        b.createdAt as "createdAt",
        b.modifiedAt as "modifiedAt",
        b.createdBy as "createdBy",
        b.modifiedBy as "modifiedBy",
        t.name as "tenantName",
        tu.fullName as "managerName",
        cb.fullName as "createdByName",
        mb.fullName as "modifiedByName"
      FROM Branches b
      JOIN Tenants t ON b.tenantId::text = t.id::text
      LEFT JOIN TenantUsers tu ON b.managerId::text = tu.id::text
      LEFT JOIN TenantUsers cb ON b.createdBy::text = cb.id::text
      LEFT JOIN TenantUsers mb ON b.modifiedBy::text = mb.id::text
      WHERE b.id = $1::uuid AND COALESCE(b.isDeleted, FALSE) = FALSE
    `,
    [id]
  );
  return result.rows[0] || null;
}

export async function createBranch(data: {
  tenantId: string;
  name: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  managerId: string | null;
  isActive: boolean;
  createdBy?: string;
}) {
  const result = await query(
    `
      INSERT INTO Branches (tenantId, name, address, city, phone, email, managerId, isActive, createdBy)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `,
    [data.tenantId, data.name, data.address, data.city, data.phone, data.email, data.managerId, data.isActive, data.createdBy || null]
  );
  return result.rows[0]?.id;
}

export async function updateBranch(id: string, data: {
  tenantId: string;
  name: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  managerId: string | null;
  isActive: boolean;
  modifiedBy?: string;
}) {
  await query(
    `
      UPDATE Branches SET
        tenantId = $1::uuid, name = $2, address = $3, city = $4,
        phone = $5, email = $6, managerId = $7::uuid, isActive = $8,
        modifiedAt = CURRENT_TIMESTAMP, modifiedBy = $9::uuid
      WHERE id = $10::uuid
    `,
    [data.tenantId, data.name, data.address, data.city, data.phone, data.email, data.managerId, data.isActive, data.modifiedBy || null, id]
  );
}

export async function deleteBranch(id: string, deletedBy?: string) {
  await withTransaction(async (client) => {
    await client.query("UPDATE TenantUsers SET branchId = NULL WHERE branchId = $1::uuid", [id]);
    await client.query("UPDATE Tasks SET isDeleted = TRUE, deletedAt = CURRENT_TIMESTAMP, deletedBy = $2::uuid WHERE branchId = $1::uuid", [id, deletedBy || null]);
    await client.query("UPDATE Halls SET isDeleted = TRUE, deletedAt = CURRENT_TIMESTAMP, deletedBy = $2::uuid WHERE branchId = $1::uuid", [id, deletedBy || null]);
    await client.query("UPDATE Bookings SET isDeleted = TRUE, deletedAt = CURRENT_TIMESTAMP, deletedBy = $2::uuid WHERE branchId = $1::uuid", [id, deletedBy || null]);
    await client.query("UPDATE Branches SET isDeleted = TRUE, deletedAt = CURRENT_TIMESTAMP, deletedBy = $2::uuid, isActive = FALSE WHERE id = $1::uuid", [id, deletedBy || null]);
  });
}
