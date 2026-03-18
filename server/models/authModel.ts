import { query } from "../db";
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

function isBcryptHash(value: string) {
  return value.startsWith("$2a$") || value.startsWith("$2b$") || value.startsWith("$2y$");
}

export async function login(username: string, password: string) {
  const adminResult = await query("SELECT * FROM SuperAdmins WHERE username = $1", [username]);
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
      SELECT tu.*, t.name as tenantName, t.isSuspended, t.isActive as tenantActive
      FROM TenantUsers tu
      JOIN Tenants t ON tu.tenantId = t.id
      WHERE (tu.email = $1 OR tu.username = $2) AND tu.isActive = TRUE
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
    if (tenantUser.roleId) {
      const perms = (await query("SELECT permissionKey FROM RolePermissions WHERE roleId = $1", [tenantUser.roleId])).rows as any[];
      permissions = perms.map((p) => p.permissionKey);
    } else if (tenantUser.role === "admin") {
      permissions = [
        "dashboard.view",
        "branches.view",
        "branches.edit",
        "users.view",
        "users.edit",
        "roles.view",
        "roles.edit",
        "halls.view",
        "halls.edit",
        "calendar.view",
        "calendar.edit",
        "bookings.view",
        "bookings.edit",
        "approvals.view",
        "approvals.edit",
        "menu.view",
        "menu.edit",
        "settings.view",
        "settings.edit",
      ];
    }
    return {
      success: true,
      user: {
        id: tenantUser.id,
        username: tenantUser.username || tenantUser.email,
        fullName: tenantUser.fullname,
        role: tenantUser.role,
        roleId: tenantUser.roleid,
        tenantId: tenantUser.tenantid,
        tenantName: tenantUser.tenantname,
        permissions,
      },
    };
  }

  return { success: false, status: 401, message: "Invalid credentials" };
}
