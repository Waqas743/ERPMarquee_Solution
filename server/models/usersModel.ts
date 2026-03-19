import { query, withTransaction } from "../db";
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

function isBcryptHash(value: string) {
  return value.startsWith("$2a$") || value.startsWith("$2b$") || value.startsWith("$2y$");
}

async function hashPassword(value: string) {
  if (!value) return value;
  if (isBcryptHash(value)) return value;
  return bcrypt.hash(value, SALT_ROUNDS);
}

export async function listUsers(data: {
  tenantId: string;
  search?: string;
  roleId?: string;
  branchId?: string;
  isActive?: string;
}) {
  let queryText = `
    SELECT 
      tu.id as "id",
      tu.tenantId as "tenantId",
      tu.branchId as "branchId",
      tu.username as "username",
      tu.fullName as "fullName",
      tu.email as "email",
      tu.password as "password",
      tu.address as "address",
      tu.contactNo as "contactNo",
      tu.city as "city",
      tu.country as "country",
      tu.emergencyContactNo as "emergencyContactNo",
      tu.role as "role",
      tu.roleId as "roleId",
      tu.isActive as "isActive",
      tu.createdAt as "createdAt",
      tu.modifiedAt as "modifiedAt",
      tu.createdBy as "createdBy",
      tu.modifiedBy as "modifiedBy",
      b.name as "branchName",
        r.name as "roleName",
        cb.fullName as "createdByName",
        mb.fullName as "modifiedByName"
      FROM TenantUsers tu
      LEFT JOIN Branches b ON tu.branchId::text = b.id::text
      LEFT JOIN Roles r ON tu.roleId::text = r.id::text
      LEFT JOIN TenantUsers cb ON tu.createdBy::text = cb.id::text
      LEFT JOIN TenantUsers mb ON tu.modifiedBy::text = mb.id::text
      WHERE tu.tenantId = $1::uuid AND COALESCE(tu.isDeleted, FALSE) = FALSE
    `;
  const params: any[] = [data.tenantId];
  if (data.search) {
    queryText += ` AND (tu.fullName ILIKE $${params.length + 1} OR tu.email ILIKE $${params.length + 2} OR tu.username ILIKE $${params.length + 3})`;
    params.push(`%${data.search}%`, `%${data.search}%`, `%${data.search}%`);
  }
  if (data.roleId) {
    queryText += ` AND tu.roleId = $${params.length + 1}::uuid`;
    params.push(data.roleId);
  }
  if (data.branchId) {
    queryText += ` AND tu.branchId = $${params.length + 1}::uuid`;
    params.push(data.branchId);
  }
  if (data.isActive !== undefined && data.isActive !== "") {
    queryText += ` AND tu.isActive = $${params.length + 1}`;
    params.push(data.isActive === "true" || data.isActive === "1");
  }
  return (await query(queryText, params)).rows;
}

export async function getUserById(id: string) {
  const result = await query(
    `
      SELECT 
        tu.id as "id",
        tu.tenantId as "tenantId",
        tu.branchId as "branchId",
        tu.username as "username",
        tu.fullName as "fullName",
        tu.email as "email",
        tu.address as "address",
        tu.contactNo as "contactNo",
        tu.city as "city",
        tu.country as "country",
        tu.emergencyContactNo as "emergencyContactNo",
        tu.role as "role",
        tu.roleId as "roleId",
        tu.isActive as "isActive",
        tu.createdAt as "createdAt",
        tu.modifiedAt as "modifiedAt",
        tu.createdBy as "createdBy",
        tu.modifiedBy as "modifiedBy",
        b.name as "branchName",
          r.name as "roleName",
          cb.fullName as "createdByName",
          mb.fullName as "modifiedByName"
        FROM TenantUsers tu
        LEFT JOIN Branches b ON tu.branchId::text = b.id::text
        LEFT JOIN Roles r ON tu.roleId::text = r.id::text
        LEFT JOIN TenantUsers cb ON tu.createdBy::text = cb.id::text
        LEFT JOIN TenantUsers mb ON tu.modifiedBy::text = mb.id::text
        WHERE tu.id = $1 AND COALESCE(tu.isDeleted, FALSE) = FALSE
      `,
    [id]
  );
  return result.rows[0] || null;
}

export async function createUser(data: {
  tenantId: string;
  branchId?: string | null;
  username: string;
  fullName: string;
  email: string;
  password: string;
  address?: string;
  contactNo?: string;
  city?: string;
  country?: string;
  emergencyContactNo?: string;
  role?: string;
  roleId?: string | null;
  isActive: boolean;
  createdBy?: string;
}) {
  const hashedPassword = await hashPassword(data.password);
  const result = await query(
    `
      INSERT INTO TenantUsers (
        tenantId, branchId, username, fullName, email, password,
        address, contactNo, city, country, emergencyContactNo,
        role, roleId, isActive, createdBy
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING id
    `,
    [
      data.tenantId,
      data.branchId || null,
      data.username,
      data.fullName,
      data.email,
      hashedPassword,
      data.address,
      data.contactNo,
      data.city,
      data.country,
      data.emergencyContactNo,
      data.role || "staff",
      data.roleId || null,
      data.isActive,
      data.createdBy || null,
    ]
  );
  return result.rows[0]?.id;
}

export async function updateUser(id: string, data: {
  branchId?: string | null;
  username: string;
  fullName: string;
  email: string;
  password: string;
  address?: string;
  contactNo?: string;
  city?: string;
  country?: string;
  emergencyContactNo?: string;
  role?: string;
  roleId?: string | null;
  isActive: boolean;
  modifiedBy?: string;
}) {
  let nextPassword = data.password;
  if (!nextPassword) {
    const existing = await query<{ password: string }>("SELECT password FROM TenantUsers WHERE id = $1", [id]);
    nextPassword = existing.rows[0]?.password || "";
  }
  const hashedPassword = await hashPassword(nextPassword);
  await query(
    `
      UPDATE TenantUsers SET
        branchId = $1, username = $2, fullName = $3, email = $4,
        password = $5, address = $6, contactNo = $7, city = $8,
        country = $9, emergencyContactNo = $10, role = $11, roleId = $12, isActive = $13,
        modifiedAt = CURRENT_TIMESTAMP, modifiedBy = $14
      WHERE id = $15
    `,
    [
      data.branchId || null,
      data.username,
      data.fullName,
      data.email,
      hashedPassword,
      data.address,
      data.contactNo,
      data.city,
      data.country,
      data.emergencyContactNo,
      data.role,
      data.roleId || null,
      data.isActive,
      data.modifiedBy || null,
      id,
    ]
  );
}

export async function deleteUser(id: string, deletedBy?: string) {
  await withTransaction(async (client) => {
    await query("UPDATE Halls SET hallManagerId = NULL WHERE hallManagerId = $1", [id], client);
    await query("UPDATE Branches SET managerId = NULL WHERE managerId = $1", [id], client);
    await query("UPDATE Tasks SET assignedTo = NULL WHERE assignedTo = $1", [id], client);
    await query("UPDATE TenantUsers SET isDeleted = TRUE, deletedAt = CURRENT_TIMESTAMP, deletedBy = $2 WHERE id = $1", [id, deletedBy || null], client);
  });
}
