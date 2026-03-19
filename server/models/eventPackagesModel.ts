import { query, withTransaction } from "../db";

export async function listEventPackages(tenantId: string) {
  const result = await query(
    `SELECT 
      e.id, 
      e.tenantId as "tenantId", 
      e.name, 
      e.description, 
      e.basePrice as "basePrice", 
      e.maxGuests as "maxGuests", 
      e.isActive as "isActive",
      e.createdAt as "createdAt",
      e.modifiedAt as "modifiedAt",
      e.createdBy as "createdBy",
      e.modifiedBy as "modifiedBy",
      cb.fullName as "createdByName",
      mb.fullName as "modifiedByName"
    FROM EventPackages e
    LEFT JOIN TenantUsers cb ON e.createdBy::text = cb.id::text
    LEFT JOIN TenantUsers mb ON e.modifiedBy::text = mb.id::text
    WHERE e.tenantId = $1 AND COALESCE(e.isDeleted, FALSE) = FALSE`, 
    [tenantId]
  );
  return result.rows;
}

export async function getEventPackageById(id: string) {
  const pkgResult = await query(
    `SELECT 
      e.id, 
      e.tenantId as "tenantId", 
      e.name, 
      e.description, 
      e.basePrice as "basePrice", 
      e.maxGuests as "maxGuests", 
      e.isActive as "isActive",
      e.createdAt as "createdAt",
      e.modifiedAt as "modifiedAt",
      e.createdBy as "createdBy",
      e.modifiedBy as "modifiedBy",
      cb.fullName as "createdByName",
      mb.fullName as "modifiedByName"
    FROM EventPackages e
    LEFT JOIN TenantUsers cb ON e.createdBy::text = cb.id::text
    LEFT JOIN TenantUsers mb ON e.modifiedBy::text = mb.id::text
    WHERE e.id = $1 AND COALESCE(e.isDeleted, FALSE) = FALSE`, 
    [id]
  );
  const pkg = pkgResult.rows[0] as any;
  if (!pkg) {
    return null;
  }
  const menuItems = (
    await query(
      `
        SELECT 
          pmm.packageId as "packageId",
          pmm.menuItemId as "menuItemId",
          pmm.quantity,
          pmm.notes,
          mi.name as "itemName", 
          mc.name as "categoryName"
        FROM PackageMenuMapping pmm
        JOIN MenuItems mi ON pmm.menuItemId::text = mi.id::text
        JOIN MenuCategories mc ON mi.categoryId::text = mc.id::text
        WHERE pmm.packageId = $1 AND COALESCE(pmm.isDeleted, FALSE) = FALSE AND COALESCE(mi.isDeleted, FALSE) = FALSE
      `,
      [id]
    )
  ).rows;
  const addOns = (
    await query(
      `
        SELECT 
          pa.packageId as "packageId",
          pa.addOnId as "addOnId",
          pa.isActive as "isActive",
          ao.name, 
          ao.price, 
          ao.description
        FROM PackageAddons pa
        JOIN AddOns ao ON pa.addOnId::text = ao.id::text
        WHERE pa.packageId = $1::uuid AND COALESCE(pa.isDeleted, FALSE) = FALSE AND COALESCE(ao.isDeleted, FALSE) = FALSE
      `,
      [id]
    )
  ).rows;
  return { ...pkg, menuItems, addOns };
}

export async function createEventPackage(data: {
  tenantId: string;
  name: string;
  description?: string;
  basePrice: number;
  maxGuests: number;
  isActive: boolean;
  menuItems?: Array<{ menuItemId: string; quantity: number; notes?: string }>;
  addOns?: Array<{ addOnId: string; isActive: boolean }>;
  createdBy?: string;
}) {
  return withTransaction(async (client) => {
    const result = await query(
      `
        INSERT INTO EventPackages (tenantId, name, description, basePrice, maxGuests, isActive, createdBy)
        VALUES ($1::uuid, $2, $3, $4, $5, $6, $7::uuid)
        RETURNING id
      `,
      [data.tenantId, data.name, data.description, data.basePrice, data.maxGuests, data.isActive, data.createdBy || null],
      client
    );
    const packageId = result.rows[0]?.id;
    if (data.menuItems && Array.isArray(data.menuItems)) {
      for (const item of data.menuItems) {
        // Fallback for case sensitivity
        const menuItemId = item.menuItemId || (item as any).menuitemid || (item as any).menuItemid;
        
        if (!menuItemId) {
            console.warn("Skipping menu item with no ID:", item);
            continue;
        }

        await query(
          "INSERT INTO PackageMenuMapping (packageId, menuItemId, quantity, notes, createdBy) VALUES ($1, $2, $3, $4, $5)",
          [packageId, menuItemId, item.quantity, item.notes, data.createdBy || null],
          client
        );
      }
    }
    if (data.addOns && Array.isArray(data.addOns)) {
      for (const addon of data.addOns) {
        await client.query(
          "INSERT INTO PackageAddons (packageId, addOnId, isActive, createdBy) VALUES ($1::uuid, $2::uuid, $3, $4::uuid)",
          [packageId, addon.addOnId, addon.isActive, data.createdBy || null]
        );
      }
    }
    return packageId;
  });
}

export async function updateEventPackage(id: string, data: {
  name: string;
  description?: string;
  basePrice: number;
  maxGuests: number;
  isActive: boolean;
  menuItems?: Array<{ menuItemId: string; quantity: number; notes?: string }>;
  addOns?: Array<{ addOnId: string; isActive: boolean }>;
  modifiedBy?: string;
}) {
  await withTransaction(async (client) => {
    await client.query(
      `
        UPDATE EventPackages SET
          name = $1, description = $2, basePrice = $3, maxGuests = $4, isActive = $5,
          modifiedAt = CURRENT_TIMESTAMP, modifiedBy = $6::uuid
        WHERE id = $7::uuid
      `,
      [data.name, data.description, data.basePrice, data.maxGuests, data.isActive, data.modifiedBy || null, id]
    );
    await client.query("UPDATE PackageMenuMapping SET isDeleted = TRUE, deletedAt = CURRENT_TIMESTAMP, deletedBy = $2::uuid WHERE packageId = $1::uuid", [id, data.modifiedBy || null]);
    if (data.menuItems && Array.isArray(data.menuItems)) {
      for (const item of data.menuItems) {
        // Fallback for case sensitivity
        const menuItemId = item.menuItemId || (item as any).menuitemid || (item as any).menuItemid;

        if (!menuItemId) {
             console.warn("Skipping menu item with no ID in update:", item);
             continue;
        }

        await client.query(
          "INSERT INTO PackageMenuMapping (packageId, menuItemId, quantity, notes, createdBy) VALUES ($1::uuid, $2::uuid, $3, $4, $5::uuid)",
          [id, menuItemId, item.quantity, item.notes, data.modifiedBy || null]
        );
      }
    }
    await client.query("UPDATE PackageAddons SET isDeleted = TRUE, deletedAt = CURRENT_TIMESTAMP, deletedBy = $2::uuid WHERE packageId = $1::uuid", [id, data.modifiedBy || null]);
    if (data.addOns && Array.isArray(data.addOns)) {
      for (const addon of data.addOns) {
        await client.query(
          "INSERT INTO PackageAddons (packageId, addOnId, isActive, createdBy) VALUES ($1::uuid, $2::uuid, $3, $4::uuid)",
          [id, addon.addOnId, addon.isActive, data.modifiedBy || null]
        );
      }
    }
  });
}

export async function deleteEventPackage(id: string, deletedBy?: string) {
  await withTransaction(async (client) => {
    await client.query("UPDATE PackageMenuMapping SET isDeleted = TRUE, deletedAt = CURRENT_TIMESTAMP, deletedBy = $2::uuid WHERE packageId = $1::uuid", [id, deletedBy || null]);
    await client.query("UPDATE PackageAddons SET isDeleted = TRUE, deletedAt = CURRENT_TIMESTAMP, deletedBy = $2::uuid WHERE packageId = $1::uuid", [id, deletedBy || null]);
    await client.query("UPDATE Bookings SET packageId = NULL WHERE packageId = $1::uuid", [id]);
    await client.query("UPDATE EventPackages SET isDeleted = TRUE, deletedAt = CURRENT_TIMESTAMP, deletedBy = $2::uuid, isActive = FALSE WHERE id = $1::uuid", [id, deletedBy || null]);
  });
}
