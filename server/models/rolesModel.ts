import { query, withTransaction } from "../db";

export async function getRolesWithPermissions(tenantId: string) {
  const roles = (await query(`
      SELECT r.*, cb.fullName as "createdByName", mb.fullName as "modifiedByName"
      FROM Roles r
      LEFT JOIN TenantUsers cb ON r.createdBy::text = cb.id::text
      LEFT JOIN TenantUsers mb ON r.modifiedBy::text = mb.id::text
      WHERE r.tenantId = $1 AND COALESCE(r.isDeleted, FALSE) = FALSE
    `, [tenantId])).rows as any[];
  const results = [];
  for (const role of roles) {
    const permissions = (
      await query("SELECT permissionKey FROM RolePermissions WHERE roleId = $1 AND COALESCE(isDeleted, FALSE) = FALSE", [role.id])
    ).rows as any[];
    results.push({ ...role, permissions: permissions.map((p) => p.permissionkey ?? p.permissionKey) });
  }
  return results;
}

export async function getRoleById(id: string) {
  const role = (await query("SELECT * FROM Roles WHERE id = $1 AND COALESCE(isDeleted, FALSE) = FALSE", [id])).rows[0] as any;
  if (!role) return null;
  const permissions = (
    await query("SELECT permissionKey FROM RolePermissions WHERE roleId = $1 AND COALESCE(isDeleted, FALSE) = FALSE", [id])
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
  const tenant = await query("SELECT id FROM Tenants WHERE id = $1", [data.tenantId]);
  if (tenant.rowCount === 0) {
    throw new Error(`Tenant with ID ${data.tenantId} does not exist`);
  }
  return withTransaction(async (client) => {
    const info = await query(
      "INSERT INTO Roles (tenantId, name, description, createdBy) VALUES ($1, $2, $3, $4) RETURNING id",
      [data.tenantId, data.name, data.description, data.createdBy || null],
      client
    );
    const roleId = info.rows[0]?.id;
    if (data.permissions && Array.isArray(data.permissions)) {
      for (const p of data.permissions) {
        await query("INSERT INTO RolePermissions (roleId, permissionKey, createdBy) VALUES ($1, $2, $3)", [roleId, p, data.createdBy || null], client);
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
  await withTransaction(async (client) => {
    await query(
      "UPDATE Roles SET name = $1, description = $2, modifiedAt = CURRENT_TIMESTAMP, modifiedBy = $3 WHERE id = $4",
      [data.name, data.description, data.modifiedBy || null, id],
      client
    );
    if (data.permissions && Array.isArray(data.permissions)) {
      await query(
        "UPDATE RolePermissions SET isDeleted = TRUE, deletedAt = CURRENT_TIMESTAMP, deletedBy = $2 WHERE roleId = $1",
        [id, data.modifiedBy || null],
        client
      );
      for (const p of data.permissions) {
        await query("INSERT INTO RolePermissions (roleId, permissionKey, createdBy) VALUES ($1, $2, $3)", [id, p, data.modifiedBy || null], client);
      }
    }
  });
}

export async function deleteRole(id: string, deletedBy?: string) {
  await withTransaction(async (client) => {
    await query(
      "UPDATE RolePermissions SET isDeleted = TRUE, deletedAt = CURRENT_TIMESTAMP, deletedBy = $2 WHERE roleId = $1",
      [id, deletedBy || null],
      client
    );
    await query("UPDATE TenantUsers SET roleId = NULL WHERE roleId = $1", [id], client);
    await query(
      "UPDATE Roles SET isDeleted = TRUE, deletedAt = CURRENT_TIMESTAMP, deletedBy = $2 WHERE id = $1",
      [id, deletedBy || null],
      client
    );
  });
}

export function getPermissionsList() {
  return [
    { key: "dashboard.view", label: "View Dashboard", category: "General" },
    { key: "branches.view", label: "View Branches", category: "Inventory & Branches" },
    { key: "branches.edit", label: "Manage Branches", category: "Inventory & Branches" },
    { key: "users.view", label: "View Users", category: "Staff Management" },
    { key: "users.edit", label: "Manage Users", category: "Staff Management" },
    { key: "roles.view", label: "View Roles", category: "Staff Management" },
    { key: "roles.edit", label: "Manage Roles", category: "Staff Management" },
    { key: "halls.view", label: "View Halls", category: "Marriage Hall" },
    { key: "halls.edit", label: "Manage Halls", category: "Marriage Hall" },
    { key: "calendar.view", label: "View Booking Calendar", category: "Marriage Hall" },
    { key: "calendar.edit", label: "Manage Calendar Blocks", category: "Marriage Hall" },
    { key: "menu.view", label: "View Menu & Packages", category: "Catering & Menu" },
    { key: "menu.edit", label: "Manage Menu & Packages", category: "Catering & Menu" },
    { key: "settings.view", label: "View Settings", category: "General" },
    { key: "settings.edit", label: "Manage Settings", category: "General" },
  ];
}
