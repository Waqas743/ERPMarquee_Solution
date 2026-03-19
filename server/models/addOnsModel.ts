import { query, withTransaction } from "../db";

export async function listAddOns(tenantId: string) {
  const result = await query(
    `SELECT 
      a.id, 
      a.tenantId as "tenantId", 
      a.name, 
      a.description, 
      a.price, 
      a.isActive as "isActive",
      a.createdAt as "createdAt",
      a.modifiedAt as "modifiedAt",
      a.createdBy as "createdBy",
      a.modifiedBy as "modifiedBy",
      cb.fullName as "createdByName",
      mb.fullName as "modifiedByName"
    FROM AddOns a
    LEFT JOIN TenantUsers cb ON a.createdBy::text = cb.id::text
    LEFT JOIN TenantUsers mb ON a.modifiedBy::text = mb.id::text
    WHERE a.tenantId = $1 AND COALESCE(a.isDeleted, FALSE) = FALSE`, 
    [tenantId]
  );
  return result.rows;
}

export async function getAddOn(id: string) {
  const result = await query(
    `SELECT 
      a.id, 
      a.tenantId as "tenantId", 
      a.name, 
      a.description, 
      a.price, 
      a.isActive as "isActive",
      a.createdAt as "createdAt",
      a.modifiedAt as "modifiedAt",
      a.createdBy as "createdBy",
      a.modifiedBy as "modifiedBy",
      cb.fullName as "createdByName",
      mb.fullName as "modifiedByName"
    FROM AddOns a
    LEFT JOIN TenantUsers cb ON a.createdBy::text = cb.id::text
    LEFT JOIN TenantUsers mb ON a.modifiedBy::text = mb.id::text
    WHERE a.id = $1::uuid AND COALESCE(a.isDeleted, FALSE) = FALSE`, 
    [id]
  );
  return result.rows[0] || null;
}

export async function createAddOn(data: { tenantId: string; name: string; description?: string; price: number; isActive: boolean; createdBy?: string }) {
  const tenant = await query("SELECT id FROM Tenants WHERE id = $1::uuid", [data.tenantId]);
  if (tenant.rowCount === 0) {
    throw new Error("Invalid tenantId");
  }
  const result = await query(
    `
      INSERT INTO AddOns (tenantId, name, description, price, isActive, createdBy)
      VALUES ($1::uuid, $2, $3, $4, $5, $6::uuid)
      RETURNING id
    `,
    [data.tenantId, data.name, data.description, data.price, data.isActive, data.createdBy || null]
  );
  return result.rows[0]?.id;
}

export async function updateAddOn(id: string, data: { name: string; description?: string; price: number; isActive: boolean; modifiedBy?: string }) {
  await query(
    `
      UPDATE AddOns SET
        name = $1, description = $2, price = $3, isActive = $4,
        modifiedAt = CURRENT_TIMESTAMP, modifiedBy = $5::uuid
      WHERE id = $6::uuid
    `,
    [data.name, data.description, data.price, data.isActive, data.modifiedBy || null, id]
  );
}

export async function deleteAddOn(id: string, deletedBy?: string) {
  await withTransaction(async (client) => {
    await client.query("UPDATE BookingAddOns SET isDeleted = TRUE, deletedAt = CURRENT_TIMESTAMP, deletedBy = $2::uuid WHERE addOnId = $1::uuid", [id, deletedBy || null]);
    await client.query("UPDATE PackageAddons SET isDeleted = TRUE, deletedAt = CURRENT_TIMESTAMP, deletedBy = $2::uuid WHERE addOnId = $1::uuid", [id, deletedBy || null]);
    await client.query("UPDATE AddOns SET isDeleted = TRUE, deletedAt = CURRENT_TIMESTAMP, deletedBy = $2::uuid, isActive = FALSE WHERE id = $1::uuid", [id, deletedBy || null]);
  });
}
