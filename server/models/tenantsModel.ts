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

export async function getTenants() {
  const result = await query(`
    SELECT 
      t.id as "id",
      t.name as "name",
      t.type as "type",
      t.registrationNo as "registrationNo",
      t.ntn as "ntn",
      t.contactPersonName as "contactPersonName",
      t.contactPhone as "contactPhone",
      t.email as "email",
      t.address as "address",
      t.city as "city",
      t.country as "country",
      t.logoUrl as "logoUrl",
      t.domain as "domain",
      t.subscriptionPlanId as "subscriptionPlanId",
      t.subscriptionStartDate as "subscriptionStartDate",
      t.subscriptionEndDate as "subscriptionEndDate",
      t.maxBranchesAllowed as "maxBranchesAllowed",
      t.maxUsersAllowed as "maxUsersAllowed",
      t.password as "password",
      t.isSuspended as "isSuspended",
      t.isActive as "isActive",
      t.suspensionReason as "suspensionReason",
      t.username as "username",
      t.createdAt as "createdAt",
      t.modifiedAt as "modifiedAt",
      t.createdBy as "createdBy",
      t.modifiedBy as "modifiedBy",
      p.name as "planName",
      cb.fullName as "createdByName",
      mb.fullName as "modifiedByName"
    FROM Tenants t 
    LEFT JOIN SubscriptionPlans p ON t.subscriptionPlanId::text = p.id::text
    LEFT JOIN TenantUsers cb ON t.createdBy::text = cb.id::text
    LEFT JOIN TenantUsers mb ON t.modifiedBy::text = mb.id::text
    WHERE COALESCE(t.isDeleted, FALSE) = FALSE
    ORDER BY t.id DESC
  `);
  return result.rows;
}

export async function createTenant(data: {
  name: string;
  type: string;
  registrationNo: string;
  ntn: string;
  contactPersonName: string;
  contactPhone: string;
  email: string;
  address: string;
  city: string;
  country: string;
  logoUrl: string | null;
  domain: string;
  subscriptionPlanId: string | null;
  subscriptionStartDate: string;
  subscriptionEndDate: string | null;
  maxBranchesAllowed: number;
  maxUsersAllowed: number;
  password: string;
  username: string;
  isSuspended: boolean;
  suspensionReason: string;
  isActive: boolean;
  createdBy?: string;
}) {
  return withTransaction(async (client) => {
    const rawPassword = data.password || "admin123";
    const hashedPassword = await hashPassword(rawPassword);
    const info = await query(
      `
        INSERT INTO Tenants (
          name, type, registrationNo, ntn, contactPersonName, contactPhone,
          email, address, city, country, logoUrl, domain,
          subscriptionPlanId, subscriptionStartDate, subscriptionEndDate,
          maxBranchesAllowed, maxUsersAllowed, password, username, isSuspended, suspensionReason, isActive, createdBy
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::uuid, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23::uuid)
        RETURNING id
      `,
      [
        data.name,
        data.type,
        data.registrationNo,
        data.ntn,
        data.contactPersonName,
        data.contactPhone,
        data.email,
        data.address,
        data.city,
        data.country,
        data.logoUrl,
        data.domain,
        data.subscriptionPlanId,
        data.subscriptionStartDate,
        data.subscriptionEndDate,
        data.maxBranchesAllowed,
        data.maxUsersAllowed,
        hashedPassword,
        data.username,
        data.isSuspended,
        data.suspensionReason,
        data.isActive,
        data.createdBy || null,
      ],
      client
    );

    const tenantId = info.rows[0]?.id;
    await query("INSERT INTO SystemSettings (tenantId, key, value) VALUES ($1, $2, $3)", [tenantId, "systemName", data.name || "My Marquee"], client);
    await query("INSERT INTO SystemSettings (tenantId, key, value) VALUES ($1, $2, $3)", [tenantId, "supportEmail", data.email || ""], client);
    await query("INSERT INTO SystemSettings (tenantId, key, value) VALUES ($1, $2, $3)", [tenantId, "defaultCurrency", "PKR"], client);
    await query("INSERT INTO SystemSettings (tenantId, key, value) VALUES ($1, $2, $3)", [tenantId, "maintenanceMode", "false"], client);
    await query("INSERT INTO SystemSettings (tenantId, key, value) VALUES ($1, $2, $3)", [tenantId, "allowPublicRegistration", "true"], client);
    await query("INSERT INTO SystemSettings (tenantId, key, value) VALUES ($1, $2, $3)", [tenantId, "emailNotifications", "true"], client);
    await query("INSERT INTO SystemSettings (tenantId, key, value) VALUES ($1, $2, $3)", [tenantId, "smsNotifications", "false"], client);
    await query("INSERT INTO SystemSettings (tenantId, key, value) VALUES ($1, $2, $3)", [tenantId, "newTenantAlerts", "true"], client);
    await query("INSERT INTO SystemSettings (tenantId, key, value) VALUES ($1, $2, $3)", [tenantId, "subscriptionExpiryAlerts", "true"], client);

    const defaultRoles = [
      { name: "Admin", desc: "Full access administrator" },
      { name: "Director", desc: "Director level access" },
      { name: "Manager", desc: "Manager level access" },
      { name: "Staff", desc: "General staff access" }
    ];

    for (const dr of defaultRoles) {
      await query(
        "INSERT INTO Roles (tenantId, name, description, isSystem) VALUES ($1, $2, $3, TRUE)",
        [tenantId, dr.name, dr.desc],
        client
      );
    }

    await query(
      `
        INSERT INTO TenantUsers (tenantId, fullName, email, username, password, role)
        VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [
        tenantId,
        data.contactPersonName || "Admin",
        data.email || "",
        data.username || data.email || "",
        hashedPassword,
        "admin",
      ],
      client
    );

    return tenantId;
  });
}

export async function updateTenant(id: string, data: {
  name: string;
  type: string;
  registrationNo: string;
  ntn: string;
  contactPersonName: string;
  contactPhone: string;
  email: string;
  address: string;
  city: string;
  country: string;
  logoUrl: string | null;
  domain: string;
  subscriptionPlanId: string | null;
  subscriptionStartDate: string | null;
  subscriptionEndDate: string | null;
  maxBranchesAllowed: number;
  maxUsersAllowed: number;
  password: string;
  username: string;
  isSuspended: boolean;
  isActive: boolean;
  suspensionReason: string;
  modifiedBy?: string;
}) {
  let nextPassword = data.password;
  if (!nextPassword) {
    const existing = await query<{ password: string }>("SELECT password FROM Tenants WHERE id = $1", [id]);
    nextPassword = existing.rows[0]?.password || "";
  }
  const hashedPassword = await hashPassword(nextPassword);
  await query(
    `
      UPDATE Tenants SET
        name = $1, type = $2, registrationNo = $3, ntn = $4, contactPersonName = $5,
        contactPhone = $6, email = $7, address = $8, city = $9, country = $10,
        logoUrl = $11, domain = $12, subscriptionPlanId = $13,
        subscriptionStartDate = $14, subscriptionEndDate = $15,
        maxBranchesAllowed = $16, maxUsersAllowed = $17, password = $18, username = $19,
        isSuspended = $20, isActive = $21, suspensionReason = $22,
        modifiedAt = CURRENT_TIMESTAMP, modifiedBy = $23
      WHERE id = $24
    `,
    [
      data.name,
      data.type,
      data.registrationNo,
      data.ntn,
      data.contactPersonName,
      data.contactPhone,
      data.email,
      data.address,
      data.city,
      data.country,
      data.logoUrl,
      data.domain,
      data.subscriptionPlanId,
      data.subscriptionStartDate,
      data.subscriptionEndDate,
      data.maxBranchesAllowed,
      data.maxUsersAllowed,
      hashedPassword,
      data.username,
      data.isSuspended,
      data.isActive,
      data.suspensionReason,
      data.modifiedBy || null,
      id,
    ]
  );
}

export async function deleteTenant(id: string, deletedBy?: string) {
  await withTransaction(async (client) => {
    await query("UPDATE RolePermissions SET isDeleted = TRUE, deletedAt = CURRENT_TIMESTAMP, deletedBy = $2 WHERE roleId IN (SELECT id FROM Roles WHERE tenantId = $1)", [id, deletedBy || null], client);
    await query("UPDATE Roles SET isDeleted = TRUE, deletedAt = CURRENT_TIMESTAMP, deletedBy = $2 WHERE tenantId = $1", [id, deletedBy || null], client);
    await query("UPDATE HallBookingCalendar SET isDeleted = TRUE, deletedAt = CURRENT_TIMESTAMP, deletedBy = $2 WHERE hallId IN (SELECT id FROM Halls WHERE tenantId = $1)", [id, deletedBy || null], client);
    await query("UPDATE BookingPayments SET isDeleted = TRUE, deletedAt = CURRENT_TIMESTAMP, deletedBy = $2 WHERE bookingId IN (SELECT id FROM Bookings WHERE tenantId = $1)", [id, deletedBy || null], client);
    await query("UPDATE BookingApprovals SET isDeleted = TRUE, deletedAt = CURRENT_TIMESTAMP, deletedBy = $2 WHERE bookingId IN (SELECT id FROM Bookings WHERE tenantId = $1)", [id, deletedBy || null], client);
    await query("UPDATE Contracts SET isDeleted = TRUE, deletedAt = CURRENT_TIMESTAMP, deletedBy = $2 WHERE bookingId IN (SELECT id FROM Bookings WHERE tenantId = $1)", [id, deletedBy || null], client);
    await query("UPDATE BookingMenuItems SET isDeleted = TRUE, deletedAt = CURRENT_TIMESTAMP, deletedBy = $2 WHERE bookingId IN (SELECT id FROM Bookings WHERE tenantId = $1)", [id, deletedBy || null], client);
    await query("UPDATE BookingAddOns SET isDeleted = TRUE, deletedAt = CURRENT_TIMESTAMP, deletedBy = $2 WHERE bookingId IN (SELECT id FROM Bookings WHERE tenantId = $1)", [id, deletedBy || null], client);
    await query("UPDATE PackageMenuMapping SET isDeleted = TRUE, deletedAt = CURRENT_TIMESTAMP, deletedBy = $2 WHERE packageId IN (SELECT id FROM EventPackages WHERE tenantId = $1)", [id, deletedBy || null], client);
    await query("UPDATE PackageAddons SET isDeleted = TRUE, deletedAt = CURRENT_TIMESTAMP, deletedBy = $2 WHERE packageId IN (SELECT id FROM EventPackages WHERE tenantId = $1)", [id, deletedBy || null], client);
    await query("UPDATE Bookings SET isDeleted = TRUE, deletedAt = CURRENT_TIMESTAMP, deletedBy = $2 WHERE tenantId = $1", [id, deletedBy || null], client);
    await query("UPDATE Tasks SET isDeleted = TRUE, deletedAt = CURRENT_TIMESTAMP, deletedBy = $2 WHERE tenantId = $1", [id, deletedBy || null], client);
    await query("UPDATE Halls SET isDeleted = TRUE, deletedAt = CURRENT_TIMESTAMP, deletedBy = $2 WHERE tenantId = $1", [id, deletedBy || null], client);
    await query("UPDATE MenuItems SET isDeleted = TRUE, deletedAt = CURRENT_TIMESTAMP, deletedBy = $2 WHERE tenantId = $1", [id, deletedBy || null], client);
    await query("UPDATE MenuCategories SET isDeleted = TRUE, deletedAt = CURRENT_TIMESTAMP, deletedBy = $2 WHERE tenantId = $1", [id, deletedBy || null], client);
    await query("UPDATE EventPackages SET isDeleted = TRUE, deletedAt = CURRENT_TIMESTAMP, deletedBy = $2 WHERE tenantId = $1", [id, deletedBy || null], client);
    await query("UPDATE AddOns SET isDeleted = TRUE, deletedAt = CURRENT_TIMESTAMP, deletedBy = $2 WHERE tenantId = $1", [id, deletedBy || null], client);
    await query("UPDATE Customers SET isDeleted = TRUE, deletedAt = CURRENT_TIMESTAMP, deletedBy = $2 WHERE tenantId = $1", [id, deletedBy || null], client);
    await query("UPDATE Branches SET isDeleted = TRUE, deletedAt = CURRENT_TIMESTAMP, deletedBy = $2 WHERE tenantId = $1", [id, deletedBy || null], client);
    await query("UPDATE TenantUsers SET isDeleted = TRUE, deletedAt = CURRENT_TIMESTAMP, deletedBy = $2, isActive = FALSE WHERE tenantId = $1", [id, deletedBy || null], client);
    await query("UPDATE Tenants SET isDeleted = TRUE, deletedAt = CURRENT_TIMESTAMP, deletedBy = $2, isActive = FALSE WHERE id = $1", [id, deletedBy || null], client);
  });
}
