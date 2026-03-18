import { query, withTransaction } from "../db";

export async function listMenuCategories(tenantId: string) {
  const result = await query(
    `
      SELECT 
        c.id, 
        c.tenantId as "tenantId", 
        c.name, 
        c.description, 
        c.isActive as "isActive",
        c.createdAt as "createdAt",
        c.modifiedAt as "modifiedAt",
        c.createdBy as "createdBy",
        c.modifiedBy as "modifiedBy",
        cb.fullName as "createdByName",
        mb.fullName as "modifiedByName"
      FROM MenuCategories c
      LEFT JOIN TenantUsers cb ON c.createdBy = cb.id
      LEFT JOIN TenantUsers mb ON c.modifiedBy = mb.id
      WHERE c.tenantId = $1 AND COALESCE(c.isDeleted, FALSE) = FALSE
    `,
    [tenantId]
  );
  return result.rows;
}

export async function getMenuCategoryById(id: string) {
  const result = await query(
    `
      SELECT 
        c.id, 
        c.tenantId as "tenantId", 
        c.name, 
        c.description, 
        c.isActive as "isActive",
        c.createdAt as "createdAt",
        c.modifiedAt as "modifiedAt",
        c.createdBy as "createdBy",
        c.modifiedBy as "modifiedBy",
        cb.fullName as "createdByName",
        mb.fullName as "modifiedByName"
      FROM MenuCategories c
      LEFT JOIN TenantUsers cb ON c.createdBy = cb.id
      LEFT JOIN TenantUsers mb ON c.modifiedBy = mb.id
      WHERE c.id = $1 AND COALESCE(c.isDeleted, FALSE) = FALSE
    `,
    [id]
  );
  return result.rows[0] || null;
}

export async function createMenuCategory(data: { tenantId: string; name: string; description?: string; isActive: boolean; createdBy?: string }) {
  const result = await query(
    "INSERT INTO MenuCategories (tenantId, name, description, isActive, createdBy) VALUES ($1, $2, $3, $4, $5) RETURNING id",
    [data.tenantId, data.name, data.description, data.isActive, data.createdBy || null]
  );
  return result.rows[0]?.id;
}

export async function updateMenuCategory(id: string, data: { name: string; description?: string; isActive: boolean; modifiedBy?: string }) {
  await query(
    "UPDATE MenuCategories SET name = $1, description = $2, isActive = $3, modifiedAt = CURRENT_TIMESTAMP, modifiedBy = $4 WHERE id = $5",
    [data.name, data.description, data.isActive, data.modifiedBy || null, id]
  );
}

export async function deleteMenuCategory(id: string, deletedBy?: string) {
  await withTransaction(async (client) => {
    const items = (await query("SELECT id FROM MenuItems WHERE categoryId = $1", [id], client)).rows as any[];
    for (const item of items) {
      await query(
        "UPDATE BookingMenuItems SET isDeleted = TRUE, deletedAt = CURRENT_TIMESTAMP, deletedBy = $2 WHERE menuItemId = $1",
        [item.id, deletedBy || null],
        client
      );
      await query(
        "UPDATE PackageMenuMapping SET isDeleted = TRUE, deletedAt = CURRENT_TIMESTAMP, deletedBy = $2 WHERE menuItemId = $1",
        [item.id, deletedBy || null],
        client
      );
      await query(
        "UPDATE MenuItems SET isDeleted = TRUE, deletedAt = CURRENT_TIMESTAMP, deletedBy = $2, isActive = FALSE WHERE id = $1",
        [item.id, deletedBy || null],
        client
      );
    }
    await query(
      "UPDATE MenuCategories SET isDeleted = TRUE, deletedAt = CURRENT_TIMESTAMP, deletedBy = $2, isActive = FALSE WHERE id = $1",
      [id, deletedBy || null],
      client
    );
  });
}

export async function listMenuItems(tenantId: string, categoryId?: string) {
  let queryText = `
    SELECT 
      mi.id, 
      mi.tenantId as "tenantId", 
      mi.categoryId as "categoryId", 
      mi.name, 
      mi.description, 
      mi.isActive as "isActive", 
      mi.createdAt as "createdAt",
      mi.modifiedAt as "modifiedAt",
      mi.createdBy as "createdBy",
      mi.modifiedBy as "modifiedBy",
      mc.name as "categoryName",
      cb.fullName as "createdByName",
      mb.fullName as "modifiedByName"
    FROM MenuItems mi 
    JOIN MenuCategories mc ON mi.categoryId = mc.id 
    LEFT JOIN TenantUsers cb ON mi.createdBy = cb.id
    LEFT JOIN TenantUsers mb ON mi.modifiedBy = mb.id
    WHERE mi.tenantId = $1 AND COALESCE(mi.isDeleted, FALSE) = FALSE
  `;
  const params: any[] = [tenantId];
  if (categoryId) {
    queryText += ` AND mi.categoryId = $${params.length + 1}`;
    params.push(categoryId);
  }
  return (await query(queryText, params)).rows;
}

export async function getMenuItemById(id: string) {
  const result = await query(
    `
      SELECT 
        mi.id, 
        mi.tenantId as "tenantId", 
        mi.categoryId as "categoryId", 
        mi.name, 
        mi.description, 
        mi.isActive as "isActive", 
        mi.createdAt as "createdAt",
        mi.modifiedAt as "modifiedAt",
        mi.createdBy as "createdBy",
        mi.modifiedBy as "modifiedBy",
        mc.name as "categoryName",
        cb.fullName as "createdByName",
        mb.fullName as "modifiedByName"
      FROM MenuItems mi 
      JOIN MenuCategories mc ON mi.categoryId = mc.id 
      LEFT JOIN TenantUsers cb ON mi.createdBy = cb.id
      LEFT JOIN TenantUsers mb ON mi.modifiedBy = mb.id
      WHERE mi.id = $1 AND COALESCE(mi.isDeleted, FALSE) = FALSE
    `,
    [id]
  );
  return result.rows[0] || null;
}

export async function createMenuItem(data: { tenantId: string; categoryId: string; name: string; description?: string; isActive: boolean; createdBy?: string }) {
  const result = await query(
    `
      INSERT INTO MenuItems (tenantId, categoryId, name, description, isActive, createdBy)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `,
    [data.tenantId, data.categoryId, data.name, data.description, data.isActive, data.createdBy || null]
  );
  return result.rows[0]?.id;
}

export async function updateMenuItem(id: string, data: { categoryId: string; name: string; description?: string; isActive: boolean; modifiedBy?: string }) {
  await query(
    `
      UPDATE MenuItems SET
        categoryId = $1, name = $2, description = $3, isActive = $4,
        modifiedAt = CURRENT_TIMESTAMP, modifiedBy = $5
      WHERE id = $6
    `,
    [data.categoryId, data.name, data.description, data.isActive, data.modifiedBy || null, id]
  );
}

export async function deleteMenuItem(id: string, deletedBy?: string) {
  await withTransaction(async (client) => {
    await query(
      "UPDATE BookingMenuItems SET isDeleted = TRUE, deletedAt = CURRENT_TIMESTAMP, deletedBy = $2 WHERE menuItemId = $1",
      [id, deletedBy || null],
      client
    );
    await query(
      "UPDATE PackageMenuMapping SET isDeleted = TRUE, deletedAt = CURRENT_TIMESTAMP, deletedBy = $2 WHERE menuItemId = $1",
      [id, deletedBy || null],
      client
    );
    await query(
      "UPDATE MenuItems SET isDeleted = TRUE, deletedAt = CURRENT_TIMESTAMP, deletedBy = $2, isActive = FALSE WHERE id = $1",
      [id, deletedBy || null],
      client
    );
  });
}
