import { query, withTransaction } from "../db";

export async function getHalls(tenantId: string, branchId?: string) {
  let queryText = `
    SELECT 
      h.id as "id",
      h.tenantId as "tenantId",
      h.branchId as "branchId",
      h.hallManagerId as "hallManagerId",
      h.hallName as "hallName",
      h.capacity as "capacity",
      h.isDecorationAllowedExternally as "isDecorationAllowedExternally",
      h.createdAt as "createdAt",
      h.modifiedAt as "modifiedAt",
      h.createdBy as "createdBy",
      h.modifiedBy as "modifiedBy",
      b.name as "branchName", 
      tu.fullName as "managerName",
      cb.fullName as "createdByName",
      mb.fullName as "modifiedByName"
    FROM Halls h 
    JOIN Branches b ON h.branchId::text = b.id::text 
    LEFT JOIN TenantUsers tu ON h.hallManagerId::text = tu.id::text
    LEFT JOIN TenantUsers cb ON h.createdBy::text = cb.id::text
    LEFT JOIN TenantUsers mb ON h.modifiedBy::text = mb.id::text
    WHERE h.tenantId = $1::uuid AND COALESCE(h.isDeleted, FALSE) = FALSE
  `;
  const params: any[] = [tenantId];
  if (branchId) {
    queryText += ` AND h.branchId = $${params.length + 1}::uuid`;
    params.push(branchId);
  }
  return (await query(queryText, params)).rows;
}

export async function getHallById(id: string) {
  const result = await query(
    `
    SELECT h.*, b.name as "branchName", tu.fullName as "managerName", cb.fullName as "createdByName", mb.fullName as "modifiedByName"
    FROM Halls h 
    JOIN Branches b ON h.branchId::text = b.id::text 
    LEFT JOIN TenantUsers tu ON h.hallManagerId::text = tu.id::text
    LEFT JOIN TenantUsers cb ON h.createdBy::text = cb.id::text
    LEFT JOIN TenantUsers mb ON h.modifiedBy::text = mb.id::text
    WHERE h.id = $1::uuid AND COALESCE(h.isDeleted, FALSE) = FALSE
  `,
    [id]
  );
  return result.rows[0] || null;
}

export async function createHall(data: {
  tenantId: string;
  branchId: string;
  hallManagerId: string | null;
  hallName: string;
  capacity: number;
  isDecorationAllowedExternally: boolean;
  createdBy?: string;
}) {
  const result = await query(
    `
      INSERT INTO Halls (
        tenantId, branchId, hallManagerId, hallName, capacity, isDecorationAllowedExternally, createdBy
      ) VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7::uuid)
      RETURNING id
    `,
    [data.tenantId, data.branchId, data.hallManagerId, data.hallName, data.capacity, data.isDecorationAllowedExternally, data.createdBy || null]
  );
  return result.rows[0]?.id;
}

export async function updateHall(id: string, data: {
  branchId: string;
  hallManagerId: string | null;
  hallName: string;
  capacity: number;
  isDecorationAllowedExternally: boolean;
  modifiedBy?: string;
}) {
  await query(
    `
      UPDATE Halls SET
        branchId = $1::uuid, hallManagerId = $2::uuid, hallName = $3, capacity = $4,
        isDecorationAllowedExternally = $5, modifiedAt = CURRENT_TIMESTAMP, modifiedBy = $6::uuid
      WHERE id = $7::uuid
    `,
    [data.branchId, data.hallManagerId, data.hallName, data.capacity, data.isDecorationAllowedExternally, data.modifiedBy || null, id]
  );
}

export async function deleteHall(id: string, deletedBy?: string) {
  await withTransaction(async (client) => {
    await client.query("UPDATE Bookings SET isDeleted = TRUE, deletedAt = CURRENT_TIMESTAMP, deletedBy = $2::uuid WHERE hallId = $1::uuid", [id, deletedBy || null]);
    await client.query("UPDATE HallBookingCalendar SET isDeleted = TRUE, deletedAt = CURRENT_TIMESTAMP, deletedBy = $2::uuid WHERE hallId = $1::uuid", [id, deletedBy || null]);
    await client.query("UPDATE Halls SET isDeleted = TRUE, deletedAt = CURRENT_TIMESTAMP, deletedBy = $2::uuid WHERE id = $1::uuid", [id, deletedBy || null]);
  });
}
