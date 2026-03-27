import { query } from "../db";
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

function isBcryptHash(value: string) {
  return value.startsWith("$2a$") || value.startsWith("$2b$") || value.startsWith("$2y$");
}

export async function login(username: string, password: string) {
  const adminResult = await query("SELECT * FROM SuperAdmins WHERE LOWER(username) = LOWER($1)", [username]);
  const admin = adminResult.rows[0] as any;
  if (admin) {
    const adminPassword = String(admin.password || "");
    const adminMatch = isBcryptHash(adminPassword)
      ? await bcrypt.compare(password, adminPassword)
      : adminPassword === password;
    if (!adminMatch) {
      return { success: false, status: 401, message: "Invalid credentials" };
    }
    if (!isBcryptHash(adminPassword)) {
      const hashed = await bcrypt.hash(password, SALT_ROUNDS);
      await query("UPDATE SuperAdmins SET password = $1 WHERE id = $2", [hashed, admin.id]);
    }
    return {
      success: true,
      user: {
        id: admin.id,
        username: admin.username,
        fullName: admin.fullName,
        role: "super_admin",
      },
    };
  }

  const tenantUserResult = await query(
    `
      SELECT tu.*, t.name as tenantName, t.logoUrl as tenantLogoUrl, t.isSuspended, t.isActive as tenantActive, r.name as roleName
      FROM TenantUsers tu
      JOIN Tenants t ON tu.tenantId::text = t.id::text
      LEFT JOIN Roles r ON tu.roleId::text = r.id::text
      WHERE (LOWER(tu.email) = LOWER($1) OR LOWER(tu.username) = LOWER($2))
    `,
    [username, username]
  );
  const tenantUser = tenantUserResult.rows[0] as any;

  if (tenantUser) {
    const userPassword = String(tenantUser.password || "");
    const userMatch = isBcryptHash(userPassword)
      ? await bcrypt.compare(password, userPassword)
      : userPassword === password;
    if (!userMatch) {
      return { success: false, status: 401, message: "Invalid credentials" };
    }
    if (!isBcryptHash(userPassword)) {
      const hashed = await bcrypt.hash(password, SALT_ROUNDS);
      await query("UPDATE TenantUsers SET password = $1 WHERE id = $2", [hashed, tenantUser.id]);
    }
    if (!tenantUser.isactive ) {
      return { success: false, status: 403, message: "Your tenant account is inactive. Please contact support." };
    }
    if (tenantUser.isSuspended) {
      return { success: false, status: 403, message: "Your tenant account is suspended." };
    }
    let permissions: string[] = [];
    const actualRoleId = tenantUser.roleid || tenantUser.roleId;
    if (actualRoleId) {
      const perms = (await query('SELECT permissionKey as "permissionKey" FROM RolePermissions WHERE roleId = $1::uuid AND COALESCE(isDeleted, FALSE) = FALSE', [actualRoleId])).rows as any[];
      permissions = perms.map((p) => p.permissionKey || p.permissionkey);
    }
    
    // Apply default permissions based on roleName if not explicitly set, or enforce overrides
    const roleNameLower = (tenantUser.rolename || tenantUser.role || "").toLowerCase();
    
    if (roleNameLower === "admin") {
      permissions = [
        "dashboard.view",
        "branches.view", "branches.create", "branches.edit", "branches.delete",
        "users.view", "users.create", "users.edit", "users.delete",
        "roles.view", "roles.create", "roles.edit", "roles.delete",
        "halls.view", "halls.create", "halls.edit", "halls.delete",
        "calendar.view", "calendar.edit",
        "bookings.view", "bookings.create", "bookings.edit", "bookings.delete",
        "approvals.view", "approvals.edit",
        "menu.view", "menu.create", "menu.edit", "menu.delete",
        "settings.view", "settings.edit",
      ];
    } else if (roleNameLower === "director" || roleNameLower === "manager") {
      permissions = [
        "dashboard.view",
        "branches.view", "branches.create", "branches.edit", "branches.delete",
        "users.view", "users.create", "users.edit", "users.delete",
        "halls.view", "halls.create", "halls.edit", "halls.delete",
        "calendar.view", "calendar.edit",
        "bookings.view", "bookings.create", "bookings.edit", "bookings.delete",
        "approvals.view", "approvals.edit",
        "menu.view", "menu.create", "menu.edit", "menu.delete",
      ]; // Everything except settings and roles
    } else if (roleNameLower === "staff") {
      permissions = [
        "dashboard.view",
        "bookings.view", "bookings.create", "bookings.edit", "bookings.delete",
        "calendar.view",
      ]; // Only bookings and dashboard
    }
    return {
      success: true,
      user: {
        id: tenantUser.id,
        username: tenantUser.username || tenantUser.email,
        fullName: tenantUser.fullname,
        role: (tenantUser.role || "").toLowerCase(),
        roleName: roleNameLower,
        roleId: tenantUser.roleid,
        branchId: tenantUser.branchid,
        tenantId: tenantUser.tenantid,
        tenantName: tenantUser.tenantname,
        tenantLogoUrl: tenantUser.tenantlogourl,
        permissions,
      },
    };
  }

  return { success: false, status: 401, message: "Invalid credentials" };
}
