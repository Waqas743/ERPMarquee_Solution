import { Pool, type PoolClient } from "pg";
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

const dbConfig = {
  host: process.env.PGHOST || "localhost",
  user: process.env.PGUSER || "postgres",
  password: process.env.PGPASSWORD || "1234",
  database: process.env.PGDATABASE || "ERP_Marquee",
  port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
};

const pool = new Pool(dbConfig);

async function ensureDatabase() {
  const adminPool = new Pool({ ...dbConfig, database: "postgres" });
  const dbName = dbConfig.database.replace(/[^a-zA-Z0-9_]/g, "");
  const exists = await adminPool.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
  if (exists.rowCount === 0) {
    await adminPool.query(`CREATE DATABASE "${dbName}"`);
  }
  await adminPool.end();
}

export async function query<T = any>(text: string, params: any[] = [], client?: PoolClient) {
  const executor = client || pool;
  const result = await executor.query<T>(text, params);
  return result;
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function initDatabase() {
  const defaultPasswordHash = await bcrypt.hash("admin123", SALT_ROUNDS);
  await ensureDatabase();

  await query(`
    CREATE TABLE IF NOT EXISTS SubscriptionPlans (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      priceMonthly DOUBLE PRECISION,
      priceYearly DOUBLE PRECISION,
      maxBranches INTEGER,
      maxUsers INTEGER,
      storageLimitGB INTEGER,
      isCustomPlan BOOLEAN DEFAULT FALSE,
      featureJson TEXT
    );

    CREATE TABLE IF NOT EXISTS Tenants (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      type TEXT CHECK(type IN ('Hall', 'Catering', 'Both')),
      registrationNo TEXT,
      ntn TEXT,
      contactPersonName TEXT,
      contactPhone TEXT,
      email TEXT,
      address TEXT,
      city TEXT,
      country TEXT,
      logoUrl TEXT,
      domain TEXT,
      subscriptionPlanId UUID,
      subscriptionStartDate TEXT,
      subscriptionEndDate TEXT,
      maxBranchesAllowed INTEGER,
      maxUsersAllowed INTEGER,
      password TEXT,
      isSuspended BOOLEAN DEFAULT FALSE,
      isActive BOOLEAN DEFAULT TRUE,
      suspensionReason TEXT,
      username TEXT,
      FOREIGN KEY (subscriptionPlanId) REFERENCES SubscriptionPlans(id)
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS Branches (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenantId UUID NOT NULL,
      name TEXT NOT NULL,
      address TEXT,
      city TEXT,
      phone TEXT,
      email TEXT,
      managerId UUID,
      isActive BOOLEAN DEFAULT TRUE,
      FOREIGN KEY (tenantId) REFERENCES Tenants(id)
    );

    CREATE TABLE IF NOT EXISTS SystemSettings (
      tenantId UUID,
      key TEXT,
      value TEXT,
      PRIMARY KEY (tenantId, key),
      FOREIGN KEY (tenantId) REFERENCES Tenants(id)
    );

    CREATE TABLE IF NOT EXISTS SuperAdmins (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      fullName TEXT
    );

    CREATE TABLE IF NOT EXISTS Roles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenantId UUID NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      FOREIGN KEY (tenantId) REFERENCES Tenants(id)
    );

    CREATE TABLE IF NOT EXISTS RolePermissions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      roleId UUID NOT NULL,
      permissionKey TEXT NOT NULL,
      FOREIGN KEY (roleId) REFERENCES Roles(id)
    );

    CREATE TABLE IF NOT EXISTS TenantUsers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenantId UUID NOT NULL,
      branchId UUID,
      username TEXT,
      fullName TEXT,
      email TEXT NOT NULL,
      password TEXT NOT NULL,
      address TEXT,
      contactNo TEXT,
      city TEXT,
      country TEXT,
      emergencyContactNo TEXT,
      role TEXT DEFAULT 'admin',
      roleId UUID,
      isActive BOOLEAN DEFAULT TRUE,
      FOREIGN KEY (tenantId) REFERENCES Tenants(id),
      FOREIGN KEY (branchId) REFERENCES Branches(id),
      FOREIGN KEY (roleId) REFERENCES Roles(id)
    );

    CREATE TABLE IF NOT EXISTS Halls (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenantId UUID NOT NULL,
      branchId UUID NOT NULL,
      hallManagerId UUID,
      hallName TEXT NOT NULL,
      capacity INTEGER,
      isDecorationAllowedExternally BOOLEAN DEFAULT TRUE,
      FOREIGN KEY (tenantId) REFERENCES Tenants(id),
      FOREIGN KEY (branchId) REFERENCES Branches(id),
      FOREIGN KEY (hallManagerId) REFERENCES TenantUsers(id)
    );

    CREATE TABLE IF NOT EXISTS HallBookingCalendar (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      hallId UUID NOT NULL,
      bookingId UUID,
      eventDate TEXT NOT NULL,
      startTime TEXT,
      endTime TEXT,
      isBlocked BOOLEAN DEFAULT FALSE,
      blockReason TEXT,
      tentativeExpiryTime TEXT,
      FOREIGN KEY (hallId) REFERENCES Halls(id)
    );

    CREATE TABLE IF NOT EXISTS Customers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenantId UUID NOT NULL,
      name TEXT NOT NULL,
      cnic TEXT,
      phone TEXT NOT NULL,
      email TEXT,
      address TEXT,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenantId) REFERENCES Tenants(id)
    );

    CREATE TABLE IF NOT EXISTS Bookings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenantId UUID NOT NULL,
      branchId UUID NOT NULL,
      hallId UUID NOT NULL,
      customerId UUID NOT NULL,
      bookingNumber TEXT UNIQUE NOT NULL,
      eventType TEXT NOT NULL,
      eventDate TEXT NOT NULL,
      slot TEXT NOT NULL,
      guestCount INTEGER,
      hallRent DOUBLE PRECISION DEFAULT 0,
      decorationCharges DOUBLE PRECISION DEFAULT 0,
      cateringCharges DOUBLE PRECISION DEFAULT 0,
      addOnsCharges DOUBLE PRECISION DEFAULT 0,
      discount DOUBLE PRECISION DEFAULT 0,
      tax DOUBLE PRECISION DEFAULT 0,
      grandTotal DOUBLE PRECISION DEFAULT 0,
      packageId UUID,
      djCharges DOUBLE PRECISION DEFAULT 0,
      fireworkPrice DOUBLE PRECISION DEFAULT 0,
      fireworkQuantity INTEGER DEFAULT 0,
      status TEXT DEFAULT 'Pending',
      paymentStatus TEXT DEFAULT 'Unpaid',
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenantId) REFERENCES Tenants(id),
      FOREIGN KEY (branchId) REFERENCES Branches(id),
      FOREIGN KEY (hallId) REFERENCES Halls(id),
      FOREIGN KEY (customerId) REFERENCES Customers(id)
    );

    CREATE TABLE IF NOT EXISTS BookingPayments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      bookingId UUID NOT NULL,
      amount DOUBLE PRECISION NOT NULL,
      dueDate TEXT,
      paidDate TEXT,
      status TEXT DEFAULT 'Pending',
      type TEXT DEFAULT 'Installment',
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (bookingId) REFERENCES Bookings(id)
    );

    CREATE TABLE IF NOT EXISTS BookingApprovals (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      bookingId UUID NOT NULL,
      userId UUID NOT NULL,
      status TEXT NOT NULL,
      comments TEXT,
      level INTEGER DEFAULT 1,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (bookingId) REFERENCES Bookings(id),
      FOREIGN KEY (userId) REFERENCES TenantUsers(id)
    );

    CREATE TABLE IF NOT EXISTS Contracts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      bookingId UUID NOT NULL,
      content TEXT,
      signedCopyPath TEXT,
      status TEXT DEFAULT 'Draft',
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (bookingId) REFERENCES Bookings(id)
    );

    CREATE TABLE IF NOT EXISTS MenuCategories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenantId UUID NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      isActive BOOLEAN DEFAULT TRUE,
      FOREIGN KEY (tenantId) REFERENCES Tenants(id)
    );

    CREATE TABLE IF NOT EXISTS MenuItems (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenantId UUID NOT NULL,
      categoryId UUID NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      isActive BOOLEAN DEFAULT TRUE,
      isChefSpecial BOOLEAN DEFAULT FALSE,
      costPrice DOUBLE PRECISION DEFAULT 0,
      FOREIGN KEY (tenantId) REFERENCES Tenants(id),
      FOREIGN KEY (categoryId) REFERENCES MenuCategories(id)
    );

    CREATE TABLE IF NOT EXISTS AddOns (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenantId UUID NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      price DOUBLE PRECISION DEFAULT 0,
      isActive BOOLEAN DEFAULT TRUE,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenantId) REFERENCES Tenants(id)
    );

    CREATE TABLE IF NOT EXISTS EventPackages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenantId UUID NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      basePrice DOUBLE PRECISION DEFAULT 0,
      maxGuests INTEGER,
      isActive BOOLEAN DEFAULT TRUE,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenantId) REFERENCES Tenants(id)
    );

    CREATE TABLE IF NOT EXISTS PackageMenuMapping (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      packageId UUID NOT NULL,
      menuItemId UUID NOT NULL,
      quantity DOUBLE PRECISION DEFAULT 1,
      notes TEXT,
      FOREIGN KEY (packageId) REFERENCES EventPackages(id),
      FOREIGN KEY (menuItemId) REFERENCES MenuItems(id)
    );

    CREATE TABLE IF NOT EXISTS PackageAddons (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      packageId UUID NOT NULL,
      addOnId UUID NOT NULL,
      isActive BOOLEAN DEFAULT TRUE,
      FOREIGN KEY (packageId) REFERENCES EventPackages(id),
      FOREIGN KEY (addOnId) REFERENCES AddOns(id)
    );

    CREATE TABLE IF NOT EXISTS BookingMenuItems (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      bookingId UUID NOT NULL,
      menuItemId UUID NOT NULL,
      quantity DOUBLE PRECISION DEFAULT 1,
      unitPrice DOUBLE PRECISION DEFAULT 0,
      notes TEXT,
      FOREIGN KEY (bookingId) REFERENCES Bookings(id),
      FOREIGN KEY (menuItemId) REFERENCES MenuItems(id)
    );

    CREATE TABLE IF NOT EXISTS BookingAddOns (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      bookingId UUID NOT NULL,
      addOnId UUID NOT NULL,
      price DOUBLE PRECISION DEFAULT 0,
      FOREIGN KEY (bookingId) REFERENCES Bookings(id),
      FOREIGN KEY (addOnId) REFERENCES AddOns(id)
    );

    CREATE TABLE IF NOT EXISTS BookingFollowUps (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      bookingId UUID NOT NULL,
      userId UUID NOT NULL,
      type TEXT DEFAULT 'Note',
      status TEXT DEFAULT 'Pending',
      followUpDate TEXT,
      notes TEXT,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      createdBy UUID,
      modifiedAt TIMESTAMP,
      modifiedBy UUID,
      isDeleted BOOLEAN DEFAULT FALSE,
      deletedAt TIMESTAMP,
      deletedBy UUID,
      FOREIGN KEY (bookingId) REFERENCES Bookings(id),
      FOREIGN KEY (userId) REFERENCES TenantUsers(id)
    );

    CREATE TABLE IF NOT EXISTS FollowUpComments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      followUpId UUID NOT NULL,
      userId UUID NOT NULL,
      comment TEXT NOT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (followUpId) REFERENCES BookingFollowUps(id),
      FOREIGN KEY (userId) REFERENCES TenantUsers(id)
    );

    CREATE TABLE IF NOT EXISTS Notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      userId UUID NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      isRead BOOLEAN DEFAULT FALSE,
      link TEXT,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES TenantUsers(id)
    );

    CREATE TABLE IF NOT EXISTS Tasks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenantId UUID NOT NULL,
      branchId UUID,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'Pending',
      priority TEXT DEFAULT 'Medium',
      assignedTo UUID,
      dueDate TEXT,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenantId) REFERENCES Tenants(id),
      FOREIGN KEY (branchId) REFERENCES Branches(id),
      FOREIGN KEY (assignedTo) REFERENCES TenantUsers(id)
    );
  `);

  await query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'branches_managerid_fkey'
      ) THEN
        ALTER TABLE Branches
        ADD CONSTRAINT branches_managerid_fkey FOREIGN KEY (managerId) REFERENCES TenantUsers(id);
      END IF;
    END $$;
  `);

  await query("ALTER TABLE Tenants ADD COLUMN IF NOT EXISTS isSuspended BOOLEAN DEFAULT FALSE");
  await query("ALTER TABLE Tenants ADD COLUMN IF NOT EXISTS isActive BOOLEAN DEFAULT TRUE");
  await query("ALTER TABLE Tenants ADD COLUMN IF NOT EXISTS suspensionReason TEXT");
  await query("ALTER TABLE Tenants ADD COLUMN IF NOT EXISTS registrationNo TEXT");
  await query("ALTER TABLE Tenants ADD COLUMN IF NOT EXISTS ntn TEXT");
  await query("ALTER TABLE Tenants ADD COLUMN IF NOT EXISTS contactPersonName TEXT");
  await query("ALTER TABLE Tenants ADD COLUMN IF NOT EXISTS contactPhone TEXT");
  await query("ALTER TABLE Tenants ADD COLUMN IF NOT EXISTS email TEXT");
  await query("ALTER TABLE Tenants ADD COLUMN IF NOT EXISTS address TEXT");
  await query("ALTER TABLE Tenants ADD COLUMN IF NOT EXISTS city TEXT");
  await query("ALTER TABLE Tenants ADD COLUMN IF NOT EXISTS country TEXT");
  await query("ALTER TABLE Tenants ADD COLUMN IF NOT EXISTS logoUrl TEXT");
  await query("ALTER TABLE Tenants ADD COLUMN IF NOT EXISTS domain TEXT");
  await query("ALTER TABLE Tenants ADD COLUMN IF NOT EXISTS subscriptionPlanId UUID");
  await query("ALTER TABLE Tenants ADD COLUMN IF NOT EXISTS subscriptionStartDate TEXT");
  await query("ALTER TABLE Tenants ADD COLUMN IF NOT EXISTS subscriptionEndDate TEXT");
  await query("ALTER TABLE Tenants ADD COLUMN IF NOT EXISTS password TEXT");
  await query("ALTER TABLE Tenants ADD COLUMN IF NOT EXISTS maxBranchesAllowed INTEGER DEFAULT 0");
  await query("ALTER TABLE Tenants ADD COLUMN IF NOT EXISTS maxUsersAllowed INTEGER DEFAULT 0");

  await query("ALTER TABLE TenantUsers ADD COLUMN IF NOT EXISTS branchId UUID");
  await query("ALTER TABLE TenantUsers ADD COLUMN IF NOT EXISTS username TEXT");
  await query("ALTER TABLE TenantUsers ADD COLUMN IF NOT EXISTS address TEXT");
  await query("ALTER TABLE TenantUsers ADD COLUMN IF NOT EXISTS contactNo TEXT");
  await query("ALTER TABLE TenantUsers ADD COLUMN IF NOT EXISTS city TEXT");
  await query("ALTER TABLE TenantUsers ADD COLUMN IF NOT EXISTS country TEXT");
  await query("ALTER TABLE TenantUsers ADD COLUMN IF NOT EXISTS emergencyContactNo TEXT");
  await query("ALTER TABLE TenantUsers ADD COLUMN IF NOT EXISTS roleId UUID");
  await query("ALTER TABLE Tenants ADD COLUMN IF NOT EXISTS username TEXT");
  await query("ALTER TABLE Branches ADD COLUMN IF NOT EXISTS managerId UUID");
  await query("ALTER TABLE MenuItems ADD COLUMN IF NOT EXISTS isChefSpecial BOOLEAN DEFAULT FALSE");
  await query("ALTER TABLE MenuItems ADD COLUMN IF NOT EXISTS costPrice DOUBLE PRECISION DEFAULT 0");
  await query("ALTER TABLE Halls ADD COLUMN IF NOT EXISTS hallManagerId UUID");
  await query("ALTER TABLE Bookings ADD COLUMN IF NOT EXISTS djCharges DOUBLE PRECISION DEFAULT 0");
  await query("ALTER TABLE Bookings ADD COLUMN IF NOT EXISTS fireworkPrice DOUBLE PRECISION DEFAULT 0");
  await query("ALTER TABLE Bookings ADD COLUMN IF NOT EXISTS fireworkQuantity INTEGER DEFAULT 0");
  await query("ALTER TABLE Bookings ADD COLUMN IF NOT EXISTS assignedTo UUID");

  await query("ALTER TABLE SubscriptionPlans ADD COLUMN IF NOT EXISTS createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
  await query("ALTER TABLE SubscriptionPlans ADD COLUMN IF NOT EXISTS createdBy UUID");
  await query("ALTER TABLE SubscriptionPlans ADD COLUMN IF NOT EXISTS modifiedAt TIMESTAMP");
  await query("ALTER TABLE SubscriptionPlans ADD COLUMN IF NOT EXISTS modifiedBy UUID");
  await query("ALTER TABLE SubscriptionPlans ADD COLUMN IF NOT EXISTS isDeleted BOOLEAN DEFAULT FALSE");
  await query("ALTER TABLE SubscriptionPlans ADD COLUMN IF NOT EXISTS deletedAt TIMESTAMP");
  await query("ALTER TABLE SubscriptionPlans ADD COLUMN IF NOT EXISTS deletedBy UUID");

  await query("ALTER TABLE Tenants ADD COLUMN IF NOT EXISTS createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
  await query("ALTER TABLE Tenants ADD COLUMN IF NOT EXISTS createdBy UUID");
  await query("ALTER TABLE Tenants ADD COLUMN IF NOT EXISTS modifiedAt TIMESTAMP");
  await query("ALTER TABLE Tenants ADD COLUMN IF NOT EXISTS modifiedBy UUID");
  await query("ALTER TABLE Tenants ADD COLUMN IF NOT EXISTS isDeleted BOOLEAN DEFAULT FALSE");
  await query("ALTER TABLE Tenants ADD COLUMN IF NOT EXISTS deletedAt TIMESTAMP");
  await query("ALTER TABLE Tenants ADD COLUMN IF NOT EXISTS deletedBy UUID");

  await query("ALTER TABLE Roles ADD COLUMN IF NOT EXISTS createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
  await query("ALTER TABLE Roles ADD COLUMN IF NOT EXISTS createdBy UUID");
  await query("ALTER TABLE Roles ADD COLUMN IF NOT EXISTS modifiedAt TIMESTAMP");
  await query("ALTER TABLE Roles ADD COLUMN IF NOT EXISTS modifiedBy UUID");
  await query("ALTER TABLE Roles ADD COLUMN IF NOT EXISTS isDeleted BOOLEAN DEFAULT FALSE");
  await query("ALTER TABLE Roles ADD COLUMN IF NOT EXISTS deletedAt TIMESTAMP");
  await query("ALTER TABLE Roles ADD COLUMN IF NOT EXISTS deletedBy UUID");
  await query("ALTER TABLE Roles ADD COLUMN IF NOT EXISTS isSystem BOOLEAN DEFAULT FALSE");

  await query("ALTER TABLE RolePermissions ADD COLUMN IF NOT EXISTS createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
  await query("ALTER TABLE RolePermissions ADD COLUMN IF NOT EXISTS createdBy UUID");
  await query("ALTER TABLE RolePermissions ADD COLUMN IF NOT EXISTS modifiedAt TIMESTAMP");
  await query("ALTER TABLE RolePermissions ADD COLUMN IF NOT EXISTS modifiedBy UUID");
  await query("ALTER TABLE RolePermissions ADD COLUMN IF NOT EXISTS isDeleted BOOLEAN DEFAULT FALSE");
  await query("ALTER TABLE RolePermissions ADD COLUMN IF NOT EXISTS deletedAt TIMESTAMP");
  await query("ALTER TABLE RolePermissions ADD COLUMN IF NOT EXISTS deletedBy UUID");

  await query("ALTER TABLE Branches ADD COLUMN IF NOT EXISTS createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
  await query("ALTER TABLE Branches ADD COLUMN IF NOT EXISTS createdBy UUID");
  await query("ALTER TABLE Branches ADD COLUMN IF NOT EXISTS modifiedAt TIMESTAMP");
  await query("ALTER TABLE Branches ADD COLUMN IF NOT EXISTS modifiedBy UUID");
  await query("ALTER TABLE Branches ADD COLUMN IF NOT EXISTS isDeleted BOOLEAN DEFAULT FALSE");
  await query("ALTER TABLE Branches ADD COLUMN IF NOT EXISTS deletedAt TIMESTAMP");
  await query("ALTER TABLE Branches ADD COLUMN IF NOT EXISTS deletedBy UUID");

  await query("ALTER TABLE Halls ADD COLUMN IF NOT EXISTS createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
  await query("ALTER TABLE Halls ADD COLUMN IF NOT EXISTS createdBy UUID");
  await query("ALTER TABLE Halls ADD COLUMN IF NOT EXISTS modifiedAt TIMESTAMP");
  await query("ALTER TABLE Halls ADD COLUMN IF NOT EXISTS modifiedBy UUID");
  await query("ALTER TABLE Halls ADD COLUMN IF NOT EXISTS isDeleted BOOLEAN DEFAULT FALSE");
  await query("ALTER TABLE Halls ADD COLUMN IF NOT EXISTS deletedAt TIMESTAMP");
  await query("ALTER TABLE Halls ADD COLUMN IF NOT EXISTS deletedBy UUID");

  await query("ALTER TABLE HallBookingCalendar ADD COLUMN IF NOT EXISTS createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
  await query("ALTER TABLE HallBookingCalendar ADD COLUMN IF NOT EXISTS createdBy UUID");
  await query("ALTER TABLE HallBookingCalendar ADD COLUMN IF NOT EXISTS modifiedAt TIMESTAMP");
  await query("ALTER TABLE HallBookingCalendar ADD COLUMN IF NOT EXISTS modifiedBy UUID");
  await query("ALTER TABLE HallBookingCalendar ADD COLUMN IF NOT EXISTS isDeleted BOOLEAN DEFAULT FALSE");
  await query("ALTER TABLE HallBookingCalendar ADD COLUMN IF NOT EXISTS deletedAt TIMESTAMP");
  await query("ALTER TABLE HallBookingCalendar ADD COLUMN IF NOT EXISTS deletedBy UUID");

  await query("ALTER TABLE Customers ADD COLUMN IF NOT EXISTS createdBy UUID");
  await query("ALTER TABLE Customers ADD COLUMN IF NOT EXISTS modifiedAt TIMESTAMP");
  await query("ALTER TABLE Customers ADD COLUMN IF NOT EXISTS modifiedBy UUID");
  await query("ALTER TABLE Customers ADD COLUMN IF NOT EXISTS isDeleted BOOLEAN DEFAULT FALSE");
  await query("ALTER TABLE Customers ADD COLUMN IF NOT EXISTS deletedAt TIMESTAMP");
  await query("ALTER TABLE Customers ADD COLUMN IF NOT EXISTS deletedBy UUID");

  await query("ALTER TABLE Bookings ADD COLUMN IF NOT EXISTS createdBy UUID");
  await query("ALTER TABLE Bookings ADD COLUMN IF NOT EXISTS modifiedAt TIMESTAMP");
  await query("ALTER TABLE Bookings ADD COLUMN IF NOT EXISTS modifiedBy UUID");
  await query("ALTER TABLE Bookings ADD COLUMN IF NOT EXISTS isDeleted BOOLEAN DEFAULT FALSE");
  await query("ALTER TABLE Bookings ADD COLUMN IF NOT EXISTS deletedAt TIMESTAMP");
  await query("ALTER TABLE Bookings ADD COLUMN IF NOT EXISTS deletedBy UUID");

  await query("ALTER TABLE BookingPayments ADD COLUMN IF NOT EXISTS createdBy UUID");
  await query("ALTER TABLE BookingPayments ADD COLUMN IF NOT EXISTS modifiedAt TIMESTAMP");
  await query("ALTER TABLE BookingPayments ADD COLUMN IF NOT EXISTS modifiedBy UUID");
  await query("ALTER TABLE BookingPayments ADD COLUMN IF NOT EXISTS isDeleted BOOLEAN DEFAULT FALSE");
  await query("ALTER TABLE BookingPayments ADD COLUMN IF NOT EXISTS deletedAt TIMESTAMP");
  await query("ALTER TABLE BookingPayments ADD COLUMN IF NOT EXISTS deletedBy UUID");

  await query("ALTER TABLE BookingApprovals ADD COLUMN IF NOT EXISTS createdBy UUID");
  await query("ALTER TABLE BookingApprovals ADD COLUMN IF NOT EXISTS modifiedAt TIMESTAMP");
  await query("ALTER TABLE BookingApprovals ADD COLUMN IF NOT EXISTS modifiedBy UUID");
  await query("ALTER TABLE BookingApprovals ADD COLUMN IF NOT EXISTS isDeleted BOOLEAN DEFAULT FALSE");
  await query("ALTER TABLE BookingApprovals ADD COLUMN IF NOT EXISTS deletedAt TIMESTAMP");
  await query("ALTER TABLE BookingApprovals ADD COLUMN IF NOT EXISTS deletedBy UUID");

  await query("ALTER TABLE Contracts ADD COLUMN IF NOT EXISTS createdBy UUID");
  await query("ALTER TABLE Contracts ADD COLUMN IF NOT EXISTS modifiedAt TIMESTAMP");
  await query("ALTER TABLE Contracts ADD COLUMN IF NOT EXISTS modifiedBy UUID");
  await query("ALTER TABLE Contracts ADD COLUMN IF NOT EXISTS isDeleted BOOLEAN DEFAULT FALSE");
  await query("ALTER TABLE Contracts ADD COLUMN IF NOT EXISTS deletedAt TIMESTAMP");
  await query("ALTER TABLE Contracts ADD COLUMN IF NOT EXISTS deletedBy UUID");

  await query("ALTER TABLE MenuCategories ADD COLUMN IF NOT EXISTS createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
  await query("ALTER TABLE MenuCategories ADD COLUMN IF NOT EXISTS createdBy UUID");
  await query("ALTER TABLE MenuCategories ADD COLUMN IF NOT EXISTS modifiedAt TIMESTAMP");
  await query("ALTER TABLE MenuCategories ADD COLUMN IF NOT EXISTS modifiedBy UUID");
  await query("ALTER TABLE MenuCategories ADD COLUMN IF NOT EXISTS isDeleted BOOLEAN DEFAULT FALSE");
  await query("ALTER TABLE MenuCategories ADD COLUMN IF NOT EXISTS deletedAt TIMESTAMP");
  await query("ALTER TABLE MenuCategories ADD COLUMN IF NOT EXISTS deletedBy UUID");

  await query("ALTER TABLE MenuItems ADD COLUMN IF NOT EXISTS createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
  await query("ALTER TABLE MenuItems ADD COLUMN IF NOT EXISTS createdBy UUID");
  await query("ALTER TABLE MenuItems ADD COLUMN IF NOT EXISTS modifiedAt TIMESTAMP");
  await query("ALTER TABLE MenuItems ADD COLUMN IF NOT EXISTS modifiedBy UUID");
  await query("ALTER TABLE MenuItems ADD COLUMN IF NOT EXISTS isDeleted BOOLEAN DEFAULT FALSE");
  await query("ALTER TABLE MenuItems ADD COLUMN IF NOT EXISTS deletedAt TIMESTAMP");
  await query("ALTER TABLE MenuItems ADD COLUMN IF NOT EXISTS deletedBy UUID");

  await query("ALTER TABLE AddOns ADD COLUMN IF NOT EXISTS createdBy UUID");
  await query("ALTER TABLE AddOns ADD COLUMN IF NOT EXISTS modifiedAt TIMESTAMP");
  await query("ALTER TABLE AddOns ADD COLUMN IF NOT EXISTS modifiedBy UUID");
  await query("ALTER TABLE AddOns ADD COLUMN IF NOT EXISTS isDeleted BOOLEAN DEFAULT FALSE");
  await query("ALTER TABLE AddOns ADD COLUMN IF NOT EXISTS deletedAt TIMESTAMP");
  await query("ALTER TABLE AddOns ADD COLUMN IF NOT EXISTS deletedBy UUID");

  await query("ALTER TABLE EventPackages ADD COLUMN IF NOT EXISTS createdBy UUID");
  await query("ALTER TABLE EventPackages ADD COLUMN IF NOT EXISTS modifiedAt TIMESTAMP");
  await query("ALTER TABLE EventPackages ADD COLUMN IF NOT EXISTS modifiedBy UUID");
  await query("ALTER TABLE EventPackages ADD COLUMN IF NOT EXISTS isDeleted BOOLEAN DEFAULT FALSE");
  await query("ALTER TABLE EventPackages ADD COLUMN IF NOT EXISTS deletedAt TIMESTAMP");
  await query("ALTER TABLE EventPackages ADD COLUMN IF NOT EXISTS deletedBy UUID");

  await query("ALTER TABLE PackageMenuMapping ADD COLUMN IF NOT EXISTS createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
  await query("ALTER TABLE PackageMenuMapping ADD COLUMN IF NOT EXISTS createdBy UUID");
  await query("ALTER TABLE PackageMenuMapping ADD COLUMN IF NOT EXISTS modifiedAt TIMESTAMP");
  await query("ALTER TABLE PackageMenuMapping ADD COLUMN IF NOT EXISTS modifiedBy UUID");
  await query("ALTER TABLE PackageMenuMapping ADD COLUMN IF NOT EXISTS isDeleted BOOLEAN DEFAULT FALSE");
  await query("ALTER TABLE PackageMenuMapping ADD COLUMN IF NOT EXISTS deletedAt TIMESTAMP");
  await query("ALTER TABLE PackageMenuMapping ADD COLUMN IF NOT EXISTS deletedBy UUID");

  await query("ALTER TABLE PackageAddons ADD COLUMN IF NOT EXISTS createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
  await query("ALTER TABLE PackageAddons ADD COLUMN IF NOT EXISTS createdBy UUID");
  await query("ALTER TABLE PackageAddons ADD COLUMN IF NOT EXISTS modifiedAt TIMESTAMP");
  await query("ALTER TABLE PackageAddons ADD COLUMN IF NOT EXISTS modifiedBy UUID");
  await query("ALTER TABLE PackageAddons ADD COLUMN IF NOT EXISTS isDeleted BOOLEAN DEFAULT FALSE");
  await query("ALTER TABLE PackageAddons ADD COLUMN IF NOT EXISTS deletedAt TIMESTAMP");
  await query("ALTER TABLE PackageAddons ADD COLUMN IF NOT EXISTS deletedBy UUID");

  await query("ALTER TABLE BookingMenuItems ADD COLUMN IF NOT EXISTS createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
  await query("ALTER TABLE BookingMenuItems ADD COLUMN IF NOT EXISTS createdBy UUID");
  await query("ALTER TABLE BookingMenuItems ADD COLUMN IF NOT EXISTS modifiedAt TIMESTAMP");
  await query("ALTER TABLE BookingMenuItems ADD COLUMN IF NOT EXISTS modifiedBy UUID");
  await query("ALTER TABLE BookingMenuItems ADD COLUMN IF NOT EXISTS isDeleted BOOLEAN DEFAULT FALSE");
  await query("ALTER TABLE BookingMenuItems ADD COLUMN IF NOT EXISTS deletedAt TIMESTAMP");
  await query("ALTER TABLE BookingMenuItems ADD COLUMN IF NOT EXISTS deletedBy UUID");

  await query("ALTER TABLE BookingAddOns ADD COLUMN IF NOT EXISTS createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
  await query("ALTER TABLE BookingAddOns ADD COLUMN IF NOT EXISTS createdBy UUID");
  await query("ALTER TABLE BookingAddOns ADD COLUMN IF NOT EXISTS modifiedAt TIMESTAMP");
  await query("ALTER TABLE BookingAddOns ADD COLUMN IF NOT EXISTS modifiedBy UUID");
  await query("ALTER TABLE BookingAddOns ADD COLUMN IF NOT EXISTS isDeleted BOOLEAN DEFAULT FALSE");
  await query("ALTER TABLE BookingAddOns ADD COLUMN IF NOT EXISTS deletedAt TIMESTAMP");
  await query("ALTER TABLE BookingAddOns ADD COLUMN IF NOT EXISTS deletedBy UUID");

  await query(`
    CREATE TABLE IF NOT EXISTS BookingFollowUps (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      bookingId UUID NOT NULL,
      userId UUID NOT NULL,
      type TEXT DEFAULT 'Note',
      status TEXT DEFAULT 'Pending',
      followUpDate TEXT,
      notes TEXT,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      createdBy UUID,
      modifiedAt TIMESTAMP,
      modifiedBy UUID,
      isDeleted BOOLEAN DEFAULT FALSE,
      deletedAt TIMESTAMP,
      deletedBy UUID,
      FOREIGN KEY (bookingId) REFERENCES Bookings(id),
      FOREIGN KEY (userId) REFERENCES TenantUsers(id)
    )
  `);

  await query("ALTER TABLE Tasks ADD COLUMN IF NOT EXISTS modifiedAt TIMESTAMP");
  await query("ALTER TABLE Tasks ADD COLUMN IF NOT EXISTS modifiedBy UUID");
  await query("ALTER TABLE Tasks ADD COLUMN IF NOT EXISTS createdBy UUID");
  await query("ALTER TABLE Tasks ADD COLUMN IF NOT EXISTS isDeleted BOOLEAN DEFAULT FALSE");
  await query("ALTER TABLE Tasks ADD COLUMN IF NOT EXISTS deletedAt TIMESTAMP");
  await query("ALTER TABLE Tasks ADD COLUMN IF NOT EXISTS deletedBy UUID");

  await query("ALTER TABLE TenantUsers ADD COLUMN IF NOT EXISTS createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
  await query("ALTER TABLE TenantUsers ADD COLUMN IF NOT EXISTS createdBy UUID");
  await query("ALTER TABLE TenantUsers ADD COLUMN IF NOT EXISTS modifiedAt TIMESTAMP");
  await query("ALTER TABLE TenantUsers ADD COLUMN IF NOT EXISTS modifiedBy UUID");
  await query("ALTER TABLE TenantUsers ADD COLUMN IF NOT EXISTS isDeleted BOOLEAN DEFAULT FALSE");
  await query("ALTER TABLE TenantUsers ADD COLUMN IF NOT EXISTS deletedAt TIMESTAMP");
  await query("ALTER TABLE TenantUsers ADD COLUMN IF NOT EXISTS deletedBy UUID");

  await query("ALTER TABLE SubscriptionPlans ADD COLUMN IF NOT EXISTS createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
  await query("ALTER TABLE SubscriptionPlans ADD COLUMN IF NOT EXISTS createdBy UUID");
  await query("ALTER TABLE SubscriptionPlans ADD COLUMN IF NOT EXISTS modifiedAt TIMESTAMP");
  await query("ALTER TABLE SubscriptionPlans ADD COLUMN IF NOT EXISTS modifiedBy UUID");
  await query("ALTER TABLE SubscriptionPlans ADD COLUMN IF NOT EXISTS isDeleted BOOLEAN DEFAULT FALSE");
  await query("ALTER TABLE SubscriptionPlans ADD COLUMN IF NOT EXISTS deletedAt TIMESTAMP");
  await query("ALTER TABLE SubscriptionPlans ADD COLUMN IF NOT EXISTS deletedBy UUID");

  const planCount = await query<{ count: string }>("SELECT COUNT(*) as count FROM SubscriptionPlans");
  if (Number(planCount.rows[0]?.count || 0) === 0) {
    await query(
      `
        INSERT INTO SubscriptionPlans (name, priceMonthly, priceYearly, maxBranches, maxUsers, storageLimitGB, featureJson)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      ["Basic", 50, 500, 1, 5, 5, JSON.stringify({ reports: true, booking: true })]
    );
    await query(
      `
        INSERT INTO SubscriptionPlans (name, priceMonthly, priceYearly, maxBranches, maxUsers, storageLimitGB, featureJson)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      ["Standard", 100, 1000, 3, 20, 20, JSON.stringify({ reports: true, booking: true, accounting: true })]
    );
    await query(
      `
        INSERT INTO SubscriptionPlans (name, priceMonthly, priceYearly, maxBranches, maxUsers, storageLimitGB, featureJson)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      ["Premium", 250, 2500, 10, 100, 100, JSON.stringify({ all: true })]
    );
  }

  const tenantCount = await query<{ count: string }>("SELECT COUNT(*) as count FROM Tenants");
  if (Number(tenantCount.rows[0]?.count || 0) === 0) {
    const firstPlan = await query<{ id: number }>("SELECT id FROM SubscriptionPlans ORDER BY id LIMIT 1");
    if (firstPlan.rows[0]) {
      const tenantInsert = await query<{ id: number }>(
        `
          INSERT INTO Tenants (
            name, type, registrationNo, ntn, contactPersonName, contactPhone,
            email, address, city, country, subscriptionPlanId,
            subscriptionStartDate, subscriptionEndDate, maxBranchesAllowed, maxUsersAllowed, password
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          RETURNING id
        `,
        [
          "Grand Marquee Lahore",
          "Both",
          "REG-12345",
          "NTN-67890",
          "John Doe",
          "+92 300 1234567",
          "info@grandmarquee.com",
          "Main Boulevard, Gulberg",
          "Lahore",
          "Pakistan",
          firstPlan.rows[0].id,
          new Date().toISOString(),
          new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          1,
          5,
          defaultPasswordHash,
        ]
      );

      const tenantId = tenantInsert.rows[0]?.id;
      if (tenantId) {
        await query(
          `
            INSERT INTO TenantUsers (tenantId, fullName, email, password, role)
            VALUES ($1, $2, $3, $4, $5)
          `,
          [tenantId, "John Doe", "info@grandmarquee.com", defaultPasswordHash, "admin"]
        );
      }
    }
  }

  const branchCount = await query<{ count: string }>("SELECT COUNT(*) as count FROM Branches");
  if (Number(branchCount.rows[0]?.count || 0) === 0) {
    const firstTenant = await query<{ id: number }>("SELECT id FROM Tenants ORDER BY id LIMIT 1");
    if (firstTenant.rows[0]) {
      await query(
        `
          INSERT INTO Branches (tenantId, name, address, city, phone, email, isActive)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
        [firstTenant.rows[0].id, "Gulberg Branch", "12-C, Main Boulevard", "Lahore", "+92 42 1234567", "gulberg@grandmarquee.com", true]
      );
    }
  }

  const tenants = await query<{ id: number; name: string; email: string }>("SELECT id, name, email FROM Tenants");
  for (const tenant of tenants.rows) {
    const settingsCount = await query<{ count: string }>(
      "SELECT COUNT(*) as count FROM SystemSettings WHERE tenantId = $1",
      [tenant.id]
    );
    if (Number(settingsCount.rows[0]?.count || 0) === 0) {
      await query("INSERT INTO SystemSettings (tenantId, key, value) VALUES ($1, $2, $3)", [tenant.id, "systemName", tenant.name]);
      await query("INSERT INTO SystemSettings (tenantId, key, value) VALUES ($1, $2, $3)", [tenant.id, "supportEmail", tenant.email]);
      await query("INSERT INTO SystemSettings (tenantId, key, value) VALUES ($1, $2, $3)", [tenant.id, "defaultCurrency", "PKR"]);
      await query("INSERT INTO SystemSettings (tenantId, key, value) VALUES ($1, $2, $3)", [tenant.id, "maintenanceMode", "false"]);
      await query("INSERT INTO SystemSettings (tenantId, key, value) VALUES ($1, $2, $3)", [tenant.id, "allowPublicRegistration", "true"]);
      await query("INSERT INTO SystemSettings (tenantId, key, value) VALUES ($1, $2, $3)", [tenant.id, "emailNotifications", "true"]);
      await query("INSERT INTO SystemSettings (tenantId, key, value) VALUES ($1, $2, $3)", [tenant.id, "smsNotifications", "false"]);
      await query("INSERT INTO SystemSettings (tenantId, key, value) VALUES ($1, $2, $3)", [tenant.id, "newTenantAlerts", "true"]);
      await query("INSERT INTO SystemSettings (tenantId, key, value) VALUES ($1, $2, $3)", [tenant.id, "subscriptionExpiryAlerts", "true"]);
    }
  }

  const adminCount = await query<{ count: string }>("SELECT COUNT(*) as count FROM SuperAdmins");
  if (Number(adminCount.rows[0]?.count || 0) === 0) {
    await query("INSERT INTO SuperAdmins (username, password, fullName) VALUES ($1, $2, $3)", ["admin", defaultPasswordHash, "Super Administrator"]);
  }

  const tenantsList = await query<{ id: string }>("SELECT id FROM Tenants");
  for (const t of tenantsList.rows) {
    const defaultRoles = [
      { name: "Admin", desc: "Full access administrator" },
      { name: "Director", desc: "Director level access" },
      { name: "Manager", desc: "Manager level access" },
      { name: "Staff", desc: "General staff access" }
    ];

    for (const dr of defaultRoles) {
      const exists = await query(
        "SELECT id FROM Roles WHERE tenantId = $1 AND name = $2",
        [t.id, dr.name]
      );
      if (exists.rowCount === 0) {
        await query(
          "INSERT INTO Roles (tenantId, name, description, isSystem) VALUES ($1, $2, $3, TRUE)",
          [t.id, dr.name, dr.desc]
        );
      } else {
        await query(
          "UPDATE Roles SET isSystem = TRUE WHERE tenantId = $1 AND name = $2",
          [t.id, dr.name]
        );
      }
    }
  }
}
