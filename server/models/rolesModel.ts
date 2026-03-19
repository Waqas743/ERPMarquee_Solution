import { query, withTransaction } from "../db";

export async function getRolesWithPermissions(tenantId: string) {
  const roles = (await query(`
      SELECT r.*, r.isSystem as "isSystem", cb.fullName as "createdByName", mb.fullName as "modifiedByName"
      FROM Roles r
      LEFT JOIN TenantUsers cb ON r.createdBy::text = cb.id::text
      LEFT JOIN TenantUsers mb ON r.modifiedBy::text = mb.id::text
      WHERE r.tenantId = $1::uuid AND COALESCE(r.isDeleted, FALSE) = FALSE
      ORDER BY r.isSystem DESC, r.createdAt DESC
    `, [tenantId])).rows as any[];
  const results = [];
  for (const role of roles) {
    const permissions = (
      await query("SELECT permissionKey FROM RolePermissions WHERE roleId = $1::uuid AND COALESCE(isDeleted, FALSE) = FALSE", [role.id])
    ).rows as any[];
    results.push({ ...role, permissions: permissions.map((p) => p.permissionkey ?? p.permissionKey) });
  }
  return results;
}

export async function getRoleById(id: string) {
  const role = (await query("SELECT * FROM Roles WHERE id = $1::uuid AND COALESCE(isDeleted, FALSE) = FALSE", [id])).rows[0] as any;
  if (!role) return null;
  const permissions = (
    await query("SELECT permissionKey FROM RolePermissions WHERE roleId = $1::uuid AND COALESCE(isDeleted, FALSE) = FALSE", [id])
  ).rows as any[];
  return { ...role, permissions: permissions.map((p) => p.permissionkey ?? p.permissionKey) };
}

export async function createRole(data: {
  tenantId: string;
  name: string;
  description: string;
  permissions?: string[];
  createdBy?: string;
}) {
  const tenant = await query("SELECT id FROM Tenants WHERE id = $1::uuid", [data.tenantId]);
  if (tenant.rowCount === 0) {
    throw new Error(`Tenant with ID ${data.tenantId} does not exist`);
  }
  return withTransaction(async (client) => {
    const info = await client.query(
      "INSERT INTO Roles (tenantId, name, description, createdBy) VALUES ($1::uuid, $2, $3, $4::uuid) RETURNING id",
      [data.tenantId, data.name, data.description, data.createdBy || null]
    );
    const roleId = info.rows[0]?.id;
    if (data.permissions && Array.isArray(data.permissions)) {
      for (const p of data.permissions) {
        await client.query("INSERT INTO RolePermissions (roleId, permissionKey, createdBy) VALUES ($1::uuid, $2, $3::uuid)", [roleId, p, data.createdBy || null]);
      }
    }
    return roleId;
  });
}

export async function updateRole(id: string, data: {
  name: string;
  description: string;
  permissions?: string[];
  modifiedBy?: string;
}) {
  const roleCheck = await query("SELECT isSystem FROM Roles WHERE id = $1::uuid", [id]);
  const isSystem = roleCheck.rowCount > 0 && roleCheck.rows[0].issystem;

  await withTransaction(async (client) => {
    if (isSystem) {
      // For system roles, do not update name or description, only update modifiedBy/modifiedAt
      await client.query(
        "UPDATE Roles SET modifiedAt = CURRENT_TIMESTAMP, modifiedBy = $1::uuid WHERE id = $2::uuid",
        [data.modifiedBy || null, id]
      );
    } else {
      await client.query(
        "UPDATE Roles SET name = $1, description = $2, modifiedAt = CURRENT_TIMESTAMP, modifiedBy = $3::uuid WHERE id = $4::uuid",
        [data.name, data.description, data.modifiedBy || null, id]
      );
    }

    if (data.permissions && Array.isArray(data.permissions)) {
      await client.query(
        "UPDATE RolePermissions SET isDeleted = TRUE, deletedAt = CURRENT_TIMESTAMP, deletedBy = $2::uuid WHERE roleId = $1::uuid",
        [id, data.modifiedBy || null]
      );
      for (const p of data.permissions) {
        await client.query("INSERT INTO RolePermissions (roleId, permissionKey, createdBy) VALUES ($1::uuid, $2, $3::uuid)", [id, p, data.modifiedBy || null]);
      }
    }
  });
}

export async function deleteRole(id: string, deletedBy?: string) {
  const roleCheck = await query("SELECT isSystem FROM Roles WHERE id = $1::uuid", [id]);
  if (roleCheck.rowCount > 0 && roleCheck.rows[0].issystem) {
    throw new Error("System default roles cannot be deleted.");
  }

  await withTransaction(async (client) => {
    await client.query(
      "UPDATE RolePermissions SET isDeleted = TRUE, deletedAt = CURRENT_TIMESTAMP, deletedBy = $2::uuid WHERE roleId = $1::uuid",
      [id, deletedBy || null]
    );
    await client.query("UPDATE TenantUsers SET roleId = NULL WHERE roleId = $1::uuid", [id]);
    await client.query(
      "UPDATE Roles SET isDeleted = TRUE, deletedAt = CURRENT_TIMESTAMP, deletedBy = $2::uuid WHERE id = $1::uuid",
      [id, deletedBy || null]
    );
  });
}

export function getPermissionsList() {
  return [
    { key: "dashboard.view", label: "View Dashboard", category: "Dashboard" },

    { key: "branches.view", label: "View Branches", category: "Inventory & Branches" },
    { key: "branches.create", label: "Create Branches", category: "Inventory & Branches" },
    { key: "branches.edit", label: "Manage Branches", category: "Inventory & Branches" },
    { key: "branches.delete", label: "Delete Branches", category: "Inventory & Branches" },

    { key: "halls.view", label: "View Halls", category: "Marriage Hall" },
    { key: "halls.create", label: "Create Halls", category: "Marriage Hall" },
    { key: "halls.edit", label: "Manage Halls", category: "Marriage Hall" },
    { key: "halls.delete", label: "Delete Halls", category: "Marriage Hall" },

    { key: "calendar.view", label: "View Booking Calendar", category: "Marriage Hall" },
    { key: "calendar.edit", label: "Manage Calendar Blocks", category: "Marriage Hall" },

    { key: "bookings.view", label: "View Bookings", category: "Bookings" },
    { key: "bookings.create", label: "Create Bookings", category: "Bookings" },
    { key: "bookings.edit", label: "Manage Bookings", category: "Bookings" },
    { key: "bookings.delete", label: "Delete Bookings", category: "Bookings" },

    { key: "approvals.view", label: "View Approvals", category: "Bookings" },
    { key: "approvals.edit", label: "Manage Approvals", category: "Bookings" },

    { key: "menu.view", label: "View Menu & Packages", category: "Catering & Menu" },
    { key: "menu.create", label: "Create Menu & Packages", category: "Catering & Menu" },
    { key: "menu.edit", label: "Manage Menu & Packages", category: "Catering & Menu" },
    { key: "menu.delete", label: "Delete Menu & Packages", category: "Catering & Menu" },

    { key: "users.view", label: "View Users", category: "Staff Management" },
    { key: "users.create", label: "Create Users", category: "Staff Management" },
    { key: "users.edit", label: "Manage Users", category: "Staff Management" },
    { key: "users.delete", label: "Delete Users", category: "Staff Management" },

    { key: "roles.view", label: "View Roles", category: "Staff Management" },
    { key: "roles.create", label: "Create Roles", category: "Staff Management" },
    { key: "roles.edit", label: "Manage Roles", category: "Staff Management" },
    { key: "roles.delete", label: "Delete Roles", category: "Staff Management" }
  ];
}
