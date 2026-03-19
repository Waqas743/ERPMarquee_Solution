import { query, withTransaction } from "../db";

export async function checkBookingAvailability(data: {
  hallId: string;
  eventDate: string;
  slot: string;
  excludeId?: string;
}) {
  let queryText = `
    SELECT bookingNumber as "bookingNumber" FROM Bookings 
    WHERE hallId = $1 AND eventDate = $2 AND slot = $3 AND status IN ('Approved', 'Confirmed') AND COALESCE(isDeleted, FALSE) = FALSE
  `;
  const params: any[] = [data.hallId, data.eventDate, data.slot];
  if (data.excludeId) {
    queryText += ` AND id != $${params.length + 1}`;
    params.push(data.excludeId);
  }
  const result = await query(queryText, params);
  return result.rows[0] as { bookingNumber: string } | undefined;
}

async function rejectConflictingBookings(
  client: any,
  hallId: string,
  eventDate: string,
  slot: string,
  approvedBookingId: string,
  approvedBookingNumber: string,
  userId: string | null
) {
  const pendingBookings = await query(
    `SELECT id, bookingNumber FROM Bookings 
     WHERE hallId = $1 AND eventDate = $2 AND slot = $3 AND status = 'Pending' AND id != $4 AND COALESCE(isDeleted, FALSE) = FALSE`,
    [hallId, eventDate, slot, approvedBookingId],
    client
  );

  if (pendingBookings.rowCount > 0) {
    await query(
      `UPDATE Bookings 
       SET status = 'Rejected', modifiedAt = CURRENT_TIMESTAMP, modifiedBy = $1 
       WHERE hallId = $2 AND eventDate = $3 AND slot = $4 AND status = 'Pending' AND id != $5 AND COALESCE(isDeleted, FALSE) = FALSE`,
      [userId, hallId, eventDate, slot, approvedBookingId],
      client
    );

    for (const row of pendingBookings.rows) {
      await query(
        `INSERT INTO BookingApprovals (bookingId, userId, status, comments, createdBy)
         VALUES ($1, $2, 'Rejected', $3, $4)`,
        [row.id, userId, `System Auto-Rejection: Slot confirmed for Booking #${approvedBookingNumber}`, userId],
        client
      );
    }
  }
}

export async function listBookings(data: {
  tenantId: string;
  branchId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  userId?: string;
}) {
  let queryText = `
    SELECT 
      b.id as "id",
      b.tenantId as "tenantId",
      b.branchId as "branchId",
      b.hallId as "hallId",
      b.customerId as "customerId",
      b.packageId as "packageId",
      b.bookingNumber as "bookingNumber",
      b.eventType as "eventType",
      b.eventDate as "eventDate",
      b.slot as "slot",
      b.guestCount as "guestCount",
      b.hallRent as "hallRent",
      b.decorationCharges as "decorationCharges",
      b.cateringCharges as "cateringCharges",
      b.addOnsCharges as "addOnsCharges",
      b.discount as "discount",
      b.tax as "tax",
      b.grandTotal as "grandTotal",
      b.djCharges as "djCharges",
      b.fireworkPrice as "fireworkPrice",
      b.fireworkQuantity as "fireworkQuantity",
      b.status as "status",
      b.paymentStatus as "paymentStatus",
      b.assignedTo as "assignedTo",
      b.createdAt as "createdAt",
      b.modifiedAt as "modifiedAt",
      b.createdBy as "createdBy",
      b.modifiedBy as "modifiedBy",
      cu.fullName as "createdByName",
      mu.fullName as "modifiedByName",
      au.fullName as "assignedToName",
      c.name as "customerName", 
      c.phone as "customerPhone",
      c.email as "customerEmail",
      c.cnic as "customerCnic",
      c.address as "customerAddress",
      h.hallName as "hallName", 
      br.name as "branchName"
    FROM Bookings b
    JOIN Customers c ON b.customerId::text = c.id::text
    JOIN Halls h ON b.hallId::text = h.id::text
    JOIN Branches br ON b.branchId::text = br.id::text
    LEFT JOIN TenantUsers cu ON b.createdBy::text = cu.id::text
    LEFT JOIN TenantUsers mu ON b.modifiedBy::text = mu.id::text
    LEFT JOIN TenantUsers au ON b.assignedTo::text = au.id::text
    WHERE b.tenantId = $1::uuid AND COALESCE(b.isDeleted, FALSE) = FALSE
  `;
  const params: any[] = [data.tenantId];
  if (data.branchId) {
    params.push(data.branchId);
    queryText += ` AND b.branchId = $${params.length}::uuid`;
  }
  if (data.userId) {
    params.push(data.userId);
    queryText += ` AND (b.createdBy = $${params.length}::uuid OR b.assignedTo = $${params.length}::uuid)`;
  }
  if (data.status) {
    params.push(data.status);
    queryText += ` AND b.status = $${params.length}`;
  }
  if (data.startDate && data.endDate) {
    params.push(data.startDate, data.endDate);
    queryText += ` AND b.eventDate BETWEEN $${params.length - 1} AND $${params.length}`;
  }
  queryText += " ORDER BY b.createdAt DESC";
  const result = await query(queryText, params);
  return result.rows;
}

export async function getBookingById(id: string) {
  const bookingResult = await query(`
    SELECT 
      b.id as "id",
      b.tenantId as "tenantId",
      b.branchId as "branchId",
      b.hallId as "hallId",
      b.customerId as "customerId",
      b.packageId as "packageId",
      b.bookingNumber as "bookingNumber",
      b.eventType as "eventType",
      b.eventDate as "eventDate",
      b.slot as "slot",
      b.guestCount as "guestCount",
      b.hallRent as "hallRent",
      b.decorationCharges as "decorationCharges",
      b.cateringCharges as "cateringCharges",
      b.addOnsCharges as "addOnsCharges",
      b.discount as "discount",
      b.tax as "tax",
      b.grandTotal as "grandTotal",
      b.djCharges as "djCharges",
      b.fireworkPrice as "fireworkPrice",
      b.fireworkQuantity as "fireworkQuantity",
      b.status as "status",
      b.paymentStatus as "paymentStatus",
      b.assignedTo as "assignedTo",
      b.createdAt as "createdAt",
      b.modifiedAt as "modifiedAt",
      b.createdBy as "createdBy",
      b.modifiedBy as "modifiedBy",
      cu.fullName as "createdByName",
      mu.fullName as "modifiedByName",
      au.fullName as "assignedToName",
      c.name as "customerName", 
      c.phone as "customerPhone", 
      c.email as "customerEmail", 
      c.cnic as "customerCnic", 
      c.address as "customerAddress",
      h.hallName as "hallName", 
      br.name as "branchName", 
      ep.name as "packageName", 
      ep.basePrice as "packagePrice",
      t.name as "tenantName", 
      t.logoUrl as "tenantLogoUrl"
    FROM Bookings b
    JOIN Customers c ON b.customerId::text = c.id::text
    JOIN Halls h ON b.hallId::text = h.id::text
    JOIN Branches br ON b.branchId::text = br.id::text
    JOIN Tenants t ON b.tenantId::text = t.id::text
    LEFT JOIN TenantUsers cu ON b.createdBy::text = cu.id::text
    LEFT JOIN TenantUsers mu ON b.modifiedBy::text = mu.id::text
    LEFT JOIN TenantUsers au ON b.assignedTo::text = au.id::text
    LEFT JOIN EventPackages ep ON b.packageId::text = ep.id::text
    WHERE b.id = $1::uuid AND COALESCE(b.isDeleted, FALSE) = FALSE
  `, [id]);
  const booking = bookingResult.rows[0] as any;
  if (booking) {
    const menuItems = (await query(`
      SELECT 
        bmi.id,
        bmi.bookingId as "bookingId",
        bmi.menuItemId as "menuItemId",
        bmi.quantity,
        bmi.unitPrice as "unitPrice",
        bmi.notes,
        bmi.createdAt as "createdAt",
        bmi.modifiedAt as "modifiedAt",
        bmi.createdBy as "createdBy",
        bmi.modifiedBy as "modifiedBy",
        mi.name as "itemName", 
        mc.name as "categoryName"
      FROM BookingMenuItems bmi
      JOIN MenuItems mi ON bmi.menuItemId::text = mi.id::text
      JOIN MenuCategories mc ON mi.categoryId::text = mc.id::text
      WHERE bmi.bookingId = $1 AND COALESCE(bmi.isDeleted, FALSE) = FALSE
    `, [id])).rows;
    booking.menuItems = menuItems;
    const selectedAddOns = (await query(`
      SELECT 
        bao.id,
        bao.bookingId as "bookingId",
        bao.addOnId as "addOnId",
        bao.price,
        bao.createdAt as "createdAt",
        bao.modifiedAt as "modifiedAt",
        bao.createdBy as "createdBy",
        bao.modifiedBy as "modifiedBy",
        ao.name as "addOnName"
      FROM BookingAddOns bao
      JOIN AddOns ao ON bao.addOnId::text = ao.id::text
      WHERE bao.bookingId = $1 AND COALESCE(bao.isDeleted, FALSE) = FALSE
    `, [id])).rows;
    booking.selectedAddOns = selectedAddOns;
  }
  return booking;
}

export async function listBookingMenuItems(id: string) {
  return (
    await query(
      `
        SELECT 
          bmi.id,
          bmi.bookingId as "bookingId",
          bmi.menuItemId as "menuItemId",
          bmi.quantity,
          bmi.unitPrice as "unitPrice",
          bmi.notes,
          bmi.createdAt as "createdAt",
          bmi.modifiedAt as "modifiedAt",
          bmi.createdBy as "createdBy",
          bmi.modifiedBy as "modifiedBy",
          mi.name as "itemName", 
          mc.name as "categoryName"
        FROM BookingMenuItems bmi
        JOIN MenuItems mi ON bmi.menuItemId::text = mi.id::text
        JOIN MenuCategories mc ON mi.categoryId::text = mc.id::text
        WHERE bmi.bookingId = $1::uuid AND COALESCE(bmi.isDeleted, FALSE) = FALSE
      `,
      [id]
    )
  ).rows;
}

export async function listBookingAddOns(id: string) {
  return (
    await query(
      `
        SELECT 
          bao.id,
          bao.bookingId as "bookingId",
          bao.addOnId as "addOnId",
          bao.price,
          bao.createdAt as "createdAt",
          bao.modifiedAt as "modifiedAt",
          bao.createdBy as "createdBy",
          bao.modifiedBy as "modifiedBy",
          ao.name as "addOnName"
        FROM BookingAddOns bao
        JOIN AddOns ao ON bao.addOnId::text = ao.id::text
        WHERE bao.bookingId = $1::uuid AND COALESCE(bao.isDeleted, FALSE) = FALSE
      `,
      [id]
    )
  ).rows;
}

export async function createBooking(data: {
  tenantId: string;
  branchId: string;
  hallId: string;
  customerId: string;
  packageId?: string | null;
  eventType: string;
  eventDate: string;
  slot: string;
  guestCount: number;
  hallRent: number;
  decorationCharges: number;
  cateringCharges: number;
  addOnsCharges: number;
  discount: number;
  tax: number;
  grandTotal: number;
  djCharges?: number;
  fireworkPrice?: number;
  fireworkQuantity?: number;
  payments?: Array<{ amount: number; dueDate?: string; type?: string }>;
  menuItems?: Array<{ menuItemId: string; quantity: number; unitPrice?: number; notes?: string }>;
  selectedAddOns?: Array<{ id: string; price: number }>;
  createdBy?: string;
}) {
  const tenant = await query("SELECT id FROM Tenants WHERE id = $1::uuid", [data.tenantId]);
  if (tenant.rowCount === 0) {
    throw new Error("Invalid tenantId");
  }
  const existingBooking = await query(
    `
      SELECT bookingNumber as "bookingNumber" FROM Bookings 
      WHERE hallId = $1::uuid AND eventDate = $2 AND slot = $3 AND status IN ('Approved', 'Confirmed') AND COALESCE(isDeleted, FALSE) = FALSE
    `,
    [data.hallId, data.eventDate, data.slot]
  );
  if (existingBooking.rowCount > 0) {
    throw new Error(`This hall is already booked (Approved/Confirmed) for ${data.eventDate} (${data.slot} slot). Booking Number: ${existingBooking.rows[0].bookingNumber}`);
  }
  const bookingNumber = `BK-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const hasPayments = data.payments && Array.isArray(data.payments) && data.payments.length > 0;
  const initialStatus = hasPayments ? 'Approved' : 'Pending';

  const bookingId = await withTransaction(async (client) => {
    const info = await query(
      `
        INSERT INTO Bookings (
          tenantId, branchId, hallId, customerId, packageId, bookingNumber, eventType, eventDate, slot, guestCount,
          hallRent, decorationCharges, cateringCharges, addOnsCharges, discount, tax, grandTotal,
          djCharges, fireworkPrice, fireworkQuantity, status, createdBy
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
        RETURNING id
      `,
      [
        data.tenantId,
        data.branchId,
        data.hallId,
        data.customerId,
        data.packageId || null,
        bookingNumber,
        data.eventType,
        data.eventDate,
        data.slot,
        data.guestCount,
        data.hallRent,
        data.decorationCharges,
        data.cateringCharges,
        data.addOnsCharges,
        data.discount,
        data.tax,
        data.grandTotal,
        data.djCharges || 0,
        data.fireworkPrice || 0,
        data.fireworkQuantity || 0,
        initialStatus,
        data.createdBy || null,
      ],
      client
    );
    const bookingId = info.rows[0]?.id;
    await query(
      `
        INSERT INTO HallBookingCalendar (hallId, bookingId, eventDate, startTime, endTime, isBlocked, blockReason, createdBy)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [
        data.hallId,
        bookingId,
        data.eventDate,
        data.slot === "Morning" ? "09:00" : "18:00",
        data.slot === "Morning" ? "15:00" : "23:59",
        true,
        `Booking ${bookingNumber}`,
        data.createdBy || null,
      ],
      client
    );
    if (data.payments && Array.isArray(data.payments)) {
      for (const p of data.payments) {
        await query(
          `
            INSERT INTO BookingPayments (bookingId, amount, dueDate, type, status, paidDate, createdBy)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
          `,
          [bookingId, p.amount, p.dueDate, p.type, "Paid", new Date().toISOString().split("T")[0], data.createdBy || null],
          client
        );
      }

      if (data.payments.length > 0) {
        const totalPaid = data.payments.reduce((sum, p) => sum + Number(p.amount), 0);
        let paymentStatus = "Not Paid";
        if (totalPaid >= Number(data.grandTotal) - 0.01) {
          paymentStatus = "Paid";
        } else if (totalPaid > 0) {
          paymentStatus = "Partial Paid";
        }

        await query(
          "UPDATE Bookings SET paymentStatus = $1 WHERE id = $2",
          [paymentStatus, bookingId],
          client
        );
      }
    }
    if (data.menuItems && Array.isArray(data.menuItems)) {
      for (const item of data.menuItems) {
        await query(
          `
            INSERT INTO BookingMenuItems (bookingId, menuItemId, quantity, unitPrice, notes, createdBy)
            VALUES ($1, $2, $3, $4, $5, $6)
          `,
          [bookingId, item.menuItemId, item.quantity, item.unitPrice || 0, item.notes, data.createdBy || null],
          client
        );
      }
    }
    if (data.selectedAddOns && Array.isArray(data.selectedAddOns)) {
      for (const ao of data.selectedAddOns) {
        await query(
          `
            INSERT INTO BookingAddOns (bookingId, addOnId, price, createdBy)
            VALUES ($1, $2, $3, $4)
          `,
          [bookingId, ao.id, ao.price, data.createdBy || null],
          client
        );
      }
    }

    if (initialStatus === 'Approved') {
      await rejectConflictingBookings(
        client,
        data.hallId,
        data.eventDate,
        data.slot,
        bookingId,
        bookingNumber,
        data.createdBy || null
      );
    }
    return bookingId;
  });
  return { bookingId, bookingNumber };
}

export async function updateBooking(id: string, data: {
  branchId: string;
  hallId: string;
  customerId: string;
  packageId?: string | null;
  eventType: string;
  eventDate: string;
  slot: string;
  guestCount: number;
  hallRent: number;
  decorationCharges: number;
  cateringCharges: number;
  addOnsCharges: number;
  discount: number;
  tax: number;
  grandTotal: number;
  djCharges?: number;
  fireworkPrice?: number;
  fireworkQuantity?: number;
  menuItems?: Array<{ menuItemId: string; quantity: number; unitPrice?: number; notes?: string }>;
  selectedAddOns?: Array<{ id: string; price: number }>;
  payments?: Array<{ amount: number; dueDate?: string; type?: string }>;
  modifiedBy?: string;
}) {
  const existingBooking = await query(
    `
      SELECT bookingNumber as "bookingNumber" FROM Bookings 
      WHERE hallId = $1::uuid AND eventDate = $2 AND slot = $3 AND status IN ('Approved', 'Confirmed') AND id != $4::uuid AND COALESCE(isDeleted, FALSE) = FALSE
    `,
    [data.hallId, data.eventDate, data.slot, id]
  );
  if (existingBooking.rowCount > 0) {
    throw new Error(`This hall is already booked (Approved/Confirmed) for ${data.eventDate} (${data.slot} slot). Booking Number: ${existingBooking.rows[0].bookingNumber}`);
  }
  const booking = (await query("SELECT status, paymentStatus, bookingNumber FROM Bookings WHERE id = $1::uuid", [id])).rows[0] as any;
  if (booking && booking.paymentstatus?.toLowerCase() !== 'unpaid' && booking.paymentstatus?.toLowerCase() !== 'not paid') {
    throw new Error("Cannot edit booking as payment has already been started (Partial or Full).");
  }
  
  const hasPayments = data.payments && Array.isArray(data.payments) && data.payments.length > 0;
  
  await withTransaction(async (client) => {
    // If we are adding payments during edit, we should automatically approve it
    let statusUpdateStr = "";
    let paramsOffset = 0;
    const updateParams: any[] = [
      data.branchId,
      data.hallId,
      data.customerId,
      data.packageId || null,
      data.eventType,
      data.eventDate,
      data.slot,
      data.guestCount,
      data.hallRent,
      data.decorationCharges,
      data.cateringCharges,
      data.addOnsCharges,
      data.discount,
      data.tax,
      data.grandTotal,
      data.djCharges || 0,
      data.fireworkPrice || 0,
      data.fireworkQuantity || 0,
      data.modifiedBy || null,
      id,
    ];

    if (hasPayments) {
      statusUpdateStr = ", status = 'Approved'";
    }

    await query(
      `
        UPDATE Bookings SET 
          branchId = $1, hallId = $2, customerId = $3, packageId = $4, eventType = $5, eventDate = $6, slot = $7, guestCount = $8,
          hallRent = $9, decorationCharges = $10, cateringCharges = $11, addOnsCharges = $12, discount = $13, tax = $14, grandTotal = $15,
          djCharges = $16, fireworkPrice = $17, fireworkQuantity = $18,
          modifiedAt = CURRENT_TIMESTAMP, modifiedBy = $19${statusUpdateStr}
        WHERE id = $20::uuid
      `,
      updateParams,
      client
    );
    await query(
      `
        UPDATE HallBookingCalendar SET 
          hallId = $1, eventDate = $2, startTime = $3, endTime = $4,
          modifiedAt = CURRENT_TIMESTAMP, modifiedBy = $5
        WHERE bookingId = $6::uuid AND COALESCE(isDeleted, FALSE) = FALSE
      `,
      [
        data.hallId,
        data.eventDate,
        data.slot === "Morning" ? "09:00" : "18:00",
        data.slot === "Morning" ? "15:00" : "23:59",
        data.modifiedBy || null,
        id,
      ],
      client
    );
    
    if (data.payments && Array.isArray(data.payments)) {
      for (const p of data.payments) {
        await query(
          `
            INSERT INTO BookingPayments (bookingId, amount, dueDate, type, status, paidDate, createdBy)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
          `,
          [id, p.amount, p.dueDate, p.type, "Paid", new Date().toISOString().split("T")[0], data.modifiedBy || null],
          client
        );
      }
    }

    // Always recalculate payment status in case grandTotal changed or new payments were added
    const paymentsRes = await query("SELECT amount, status FROM BookingPayments WHERE bookingId = $1::uuid AND COALESCE(isDeleted, FALSE) = FALSE", [id], client);
    const totalPaid = paymentsRes.rows.filter(p => p.status === "Paid").reduce((sum, p) => sum + Number(p.amount), 0);
    
    let paymentStatus = "Not Paid";
    if (totalPaid >= Number(data.grandTotal) - 0.01) {
      paymentStatus = "Paid";
    } else if (totalPaid > 0) {
      paymentStatus = "Partial Paid";
    }

    let status = booking.status;
    if (status === 'Pending' && totalPaid > 0) {
      status = 'Approved';
    }
    if (hasPayments) {
      status = 'Approved';
    }

    await query(
      "UPDATE Bookings SET paymentStatus = $1, status = $2 WHERE id = $3::uuid",
      [paymentStatus, status, id],
      client
    );

    if (data.menuItems && Array.isArray(data.menuItems)) {
      await query(
        "UPDATE BookingMenuItems SET isDeleted = TRUE, deletedAt = CURRENT_TIMESTAMP, deletedBy = $2 WHERE bookingId = $1::uuid AND COALESCE(isDeleted, FALSE) = FALSE",
        [id, data.modifiedBy || null],
        client
      );
      for (const item of data.menuItems) {
        await query(
          `
            INSERT INTO BookingMenuItems (bookingId, menuItemId, quantity, unitPrice, notes, createdBy)
            VALUES ($1, $2, $3, $4, $5, $6)
          `,
          [id, item.menuItemId, item.quantity, item.unitPrice || 0, item.notes, data.modifiedBy || null],
          client
        );
      }
    }
    if (data.selectedAddOns && Array.isArray(data.selectedAddOns)) {
      await query(
        "UPDATE BookingAddOns SET isDeleted = TRUE, deletedAt = CURRENT_TIMESTAMP, deletedBy = $2 WHERE bookingId = $1::uuid AND COALESCE(isDeleted, FALSE) = FALSE",
        [id, data.modifiedBy || null],
        client
      );
      for (const ao of data.selectedAddOns) {
        await query(
          `
            INSERT INTO BookingAddOns (bookingId, addOnId, price, createdBy)
            VALUES ($1, $2, $3, $4)
          `,
          [id, ao.id, ao.price, data.modifiedBy || null],
          client
        );
      }
    }
    
    if (status === 'Approved') {
      await rejectConflictingBookings(
        client,
        data.hallId,
        data.eventDate,
        data.slot,
        id,
        booking.bookingNumber,
        data.modifiedBy || null
      );
    }
  });
}

export async function deleteBooking(id: string, deletedBy?: string) {
  await withTransaction(async (client) => {
    await query("UPDATE BookingPayments SET isDeleted = TRUE, deletedAt = CURRENT_TIMESTAMP, deletedBy = $2 WHERE bookingId = $1::uuid", [id, deletedBy || null], client);
    await query("UPDATE BookingApprovals SET isDeleted = TRUE, deletedAt = CURRENT_TIMESTAMP, deletedBy = $2 WHERE bookingId = $1::uuid", [id, deletedBy || null], client);
    await query("UPDATE Contracts SET isDeleted = TRUE, deletedAt = CURRENT_TIMESTAMP, deletedBy = $2 WHERE bookingId = $1::uuid", [id, deletedBy || null], client);
    await query("UPDATE BookingMenuItems SET isDeleted = TRUE, deletedAt = CURRENT_TIMESTAMP, deletedBy = $2 WHERE bookingId = $1::uuid", [id, deletedBy || null], client);
    await query("UPDATE BookingAddOns SET isDeleted = TRUE, deletedAt = CURRENT_TIMESTAMP, deletedBy = $2 WHERE bookingId = $1::uuid", [id, deletedBy || null], client);
    await query("UPDATE BookingFollowUps SET isDeleted = TRUE, deletedAt = CURRENT_TIMESTAMP, deletedBy = $2 WHERE bookingId = $1::uuid", [id, deletedBy || null], client);
    await query("UPDATE Bookings SET isDeleted = TRUE, deletedAt = CURRENT_TIMESTAMP, deletedBy = $2 WHERE id = $1::uuid", [id, deletedBy || null], client);
  });
}

export async function updateBookingStatus(id: string, data: {
  status: string;
  userId: string;
  comments?: string;
}) {
  await withTransaction(async (client) => {
    const booking = (await query('SELECT status, paymentStatus as "paymentStatus", hallId as "hallId", eventDate as "eventDate", slot as "slot", bookingNumber as "bookingNumber" FROM Bookings WHERE id = $1::uuid', [id], client)).rows[0] as any;
    
    // Check for conflicts if approving
    if (['Approved', 'Confirmed'].includes(data.status)) {
      const existingApproved = await query(
        `
          SELECT bookingNumber as "bookingNumber" FROM Bookings 
          WHERE hallId = $1::uuid AND eventDate = $2 AND slot = $3 AND status IN ('Approved', 'Confirmed') AND id != $4::uuid AND COALESCE(isDeleted, FALSE) = FALSE
        `,
        [booking.hallId, booking.eventDate, booking.slot, id],
        client
      );
      
      if (existingApproved.rowCount > 0) {
        throw new Error(`This date/slot is already booked and approved for another customer (Booking #${existingApproved.rows[0].bookingNumber}). You cannot approve this booking.`);
      }
    }

    if (data.status === "Cancelled") {
      if (booking.status === "Approved" && booking.paymentStatus !== "Not Paid") {
        throw new Error("Approved bookings with partial or full payments cannot be cancelled.");
      }
      const advancePaid = (await query(
        `
          SELECT COUNT(*) as count 
          FROM BookingPayments 
          WHERE bookingId = $1::uuid AND type = 'Advance' AND status = 'Paid' AND COALESCE(isDeleted, FALSE) = FALSE
        `,
        [id],
        client
      )).rows[0] as { count: string };
      if (Number(advancePaid.count) > 0) {
        throw new Error("Booking cannot be cancelled because an Advance payment has already been received.");
      }
    }
    await query(
      "UPDATE Bookings SET status = $1, modifiedAt = CURRENT_TIMESTAMP, modifiedBy = $2 WHERE id = $3::uuid",
      [data.status, data.userId, id],
      client
    );
    await query(
      `
        INSERT INTO BookingApprovals (bookingId, userId, status, comments, createdBy)
        VALUES ($1, $2, $3, $4, $5)
      `,
      [id, data.userId, data.status, data.comments, data.userId],
      client
    );

    if (['Approved', 'Confirmed'].includes(data.status)) {
      await rejectConflictingBookings(
        client,
        booking.hallId,
        booking.eventDate,
        booking.slot,
        id,
        booking.bookingNumber,
        data.userId
      );
    }
  });
}

export async function listBookingPayments(id: string) {
  return (await query(`
    SELECT 
      id,
      bookingId as "bookingId",
      type,
      amount,
      dueDate as "dueDate",
      status,
      paidDate as "paidDate",
      createdAt as "createdAt",
      modifiedAt as "modifiedAt",
      createdBy as "createdBy",
      modifiedBy as "modifiedBy"
    FROM BookingPayments 
    WHERE bookingId = $1::uuid AND COALESCE(isDeleted, FALSE) = FALSE
  `, [id])).rows;
}

export async function createBookingPayment(id: string, data: {
  type?: string;
  amount: number;
  dueDate?: string;
  status?: string;
  createdBy?: string;
}) {
  await withTransaction(async (client) => {
    const existingPayments = (
      await query("SELECT amount FROM BookingPayments WHERE bookingId = $1::uuid AND COALESCE(isDeleted, FALSE) = FALSE", [id], client)
    ).rows as any[];
    const totalPlanned = existingPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    let booking = (await query('SELECT grandTotal as "grandTotal" FROM Bookings WHERE id = $1::uuid', [id], client)).rows[0] as any;
    if (booking && totalPlanned + Number(data.amount) > Number(booking.grandTotal) + 0.01) {
      throw new Error(`Payment amount exceeds remaining balance. Remaining: Rs. ${(Number(booking.grandTotal) - totalPlanned).toLocaleString()}`);
    }
    const paidDate = data.status === "Paid" ? new Date().toISOString().split("T")[0] : null;
    await query(
      `
        INSERT INTO BookingPayments (bookingId, type, amount, dueDate, status, paidDate, createdBy)
        VALUES ($1::uuid, $2, $3, $4, $5, $6, $7)
      `,
      [id, data.type, data.amount, data.dueDate, data.status || "Pending", paidDate, data.createdBy || null],
      client
    );
    const payments = (
      await query("SELECT amount, status FROM BookingPayments WHERE bookingId = $1::uuid AND COALESCE(isDeleted, FALSE) = FALSE", [id], client)
    ).rows as any[];
    booking = (await query('SELECT grandTotal as "grandTotal" FROM Bookings WHERE id = $1::uuid', [id], client)).rows[0] as any;
    if (booking) {
      const totalPaid = payments.filter((p) => p.status === "Paid").reduce((sum, p) => sum + Number(p.amount), 0);
      let paymentStatus = "Not Paid";
      if (totalPaid >= Number(booking.grandTotal) - 0.01) {
        paymentStatus = "Paid";
      } else if (totalPaid > 0) {
        paymentStatus = "Partial Paid";
      }
      await query(
        "UPDATE Bookings SET paymentStatus = $1, modifiedAt = CURRENT_TIMESTAMP, modifiedBy = $2 WHERE id = $3::uuid",
        [paymentStatus, data.createdBy || null, id],
        client
      );
    }
  });
}

export async function payBookingPayment(id: string, paymentId: string, paidDate?: string, modifiedBy?: string) {
  await withTransaction(async (client) => {
    await query(
      "UPDATE BookingPayments SET status = 'Paid', paidDate = $1, modifiedAt = CURRENT_TIMESTAMP, modifiedBy = $3 WHERE id = $2::uuid",
      [paidDate || new Date().toISOString().split("T")[0], paymentId, modifiedBy || null],
      client
    );
    const payments = (
      await query("SELECT amount, status FROM BookingPayments WHERE bookingId = $1::uuid AND COALESCE(isDeleted, FALSE) = FALSE", [id], client)
    ).rows as any[];
    const booking = (await query('SELECT grandTotal as "grandTotal" FROM Bookings WHERE id = $1::uuid', [id], client)).rows[0] as any;
    if (!booking) {
      return;
    }
    const totalPaid = payments.filter((p) => p.status === "Paid").reduce((sum, p) => sum + Number(p.amount), 0);
    let paymentStatus = "Not Paid";
    if (totalPaid >= Number(booking.grandTotal) - 0.01) {
      paymentStatus = "Paid";
    } else if (totalPaid > 0) {
      paymentStatus = "Partial Paid";
    }
    await query(
      "UPDATE Bookings SET paymentStatus = $1, modifiedAt = CURRENT_TIMESTAMP, modifiedBy = $2 WHERE id = $3::uuid",
      [paymentStatus, modifiedBy || null, id],
      client
    );
  });
}

export async function deleteBookingPayment(id: string, paymentId: string, deletedBy?: string) {
  const payment = (await query("SELECT status FROM BookingPayments WHERE id = $1::uuid AND COALESCE(isDeleted, FALSE) = FALSE", [paymentId])).rows[0] as any;
  if (payment && payment.status === "Paid") {
    throw new Error("Paid payments cannot be deleted");
  }
  await withTransaction(async (client) => {
    await query(
      "UPDATE BookingPayments SET isDeleted = TRUE, deletedAt = CURRENT_TIMESTAMP, deletedBy = $3 WHERE id = $1::uuid AND bookingId = $2::uuid",
      [paymentId, id, deletedBy || null],
      client
    );
    const payments = (
      await query("SELECT amount, status FROM BookingPayments WHERE bookingId = $1::uuid AND COALESCE(isDeleted, FALSE) = FALSE", [id], client)
    ).rows as any[];
    const booking = (await query('SELECT grandTotal as "grandTotal" FROM Bookings WHERE id = $1::uuid', [id], client)).rows[0] as any;
    if (booking) {
      const totalPaid = payments.filter((p) => p.status === "Paid").reduce((sum, p) => sum + Number(p.amount), 0);
      let paymentStatus = "Not Paid";
      if (totalPaid >= Number(booking.grandTotal) - 0.01) {
        paymentStatus = "Paid";
      } else if (totalPaid > 0) {
        paymentStatus = "Partial Paid";
      }
      await query(
        "UPDATE Bookings SET paymentStatus = $1, modifiedAt = CURRENT_TIMESTAMP, modifiedBy = $2 WHERE id = $3::uuid",
        [paymentStatus, deletedBy || null, id],
        client
      );
    }
  });
}

export async function listBookingApprovals(id: string) {
  return (await query(`
    SELECT 
      a.id,
      a.bookingId as "bookingId",
      a.userId as "userId",
      a.status,
      a.comments,
      a.createdAt as "createdAt",
      a.modifiedAt as "modifiedAt",
      a.createdBy as "createdBy",
      a.modifiedBy as "modifiedBy",
      u.fullName as "userName"
    FROM BookingApprovals a
    JOIN TenantUsers u ON a.userId::text = u.id::text
    WHERE a.bookingId = $1::uuid AND COALESCE(a.isDeleted, FALSE) = FALSE
    ORDER BY a.createdAt DESC
  `, [id])).rows;
}

export async function getBookingContract(id: string) {
  const result = await query(
    'SELECT id, bookingId as "bookingId", content, createdAt as "createdAt", modifiedAt as "modifiedAt", createdBy as "createdBy", modifiedBy as "modifiedBy" FROM Contracts WHERE bookingId = $1::uuid AND COALESCE(isDeleted, FALSE) = FALSE',
    [id]
  );
  return result.rows[0] || null;
}

export async function upsertBookingContract(id: string, content: string, modifiedBy?: string) {
  const existing = (await query("SELECT id FROM Contracts WHERE bookingId = $1::uuid AND COALESCE(isDeleted, FALSE) = FALSE", [id])).rows[0] as any;
  if (existing) {
    await query("UPDATE Contracts SET content = $1, modifiedAt = CURRENT_TIMESTAMP, modifiedBy = $2 WHERE id = $3::uuid", [content, modifiedBy || null, existing.id]);
    return existing.id;
  }
  const info = await query("INSERT INTO Contracts (bookingId, content, createdBy) VALUES ($1::uuid, $2, $3) RETURNING id", [id, content, modifiedBy || null]);
  return info.rows[0]?.id;
}

export async function listBookingFollowUps(bookingId: string) {
  return (await query(`
    SELECT 
      f.id,
      f.bookingId as "bookingId",
      f.userId as "userId",
      f.type,
      f.status,
      f.followUpDate as "followUpDate",
      f.notes,
      f.createdAt as "createdAt",
      f.modifiedAt as "modifiedAt",
      f.createdBy as "createdBy",
      f.modifiedBy as "modifiedBy",
      u.fullName as "userName",
      COALESCE((
        SELECT json_agg(json_build_object(
          'id', c.id,
          'userId', c.userId,
          'userName', cu.fullName,
          'comment', c.comment,
          'createdAt', c.createdAt
        ) ORDER BY c.createdAt ASC)
        FROM FollowUpComments c
        JOIN TenantUsers cu ON c.userId::text = cu.id::text
        WHERE c.followUpId = f.id
      ), '[]'::json) as comments
    FROM BookingFollowUps f
    JOIN TenantUsers u ON f.userId::text = u.id::text
    WHERE f.bookingId = $1::uuid AND COALESCE(f.isDeleted, FALSE) = FALSE
    ORDER BY f.createdAt DESC
  `, [bookingId])).rows;
}

export async function createBookingFollowUp(bookingId: string, data: { userId: string; type: string; status: string; followUpDate: string; notes: string; createdBy?: string }) {
  const result = await query(
    `INSERT INTO BookingFollowUps (bookingId, userId, type, status, followUpDate, notes, createdBy) 
     VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7) RETURNING id`,
    [bookingId, data.userId, data.type, data.status, data.followUpDate, data.notes, data.createdBy || null]
  );
  return result.rows[0]?.id;
}

export async function updateBookingFollowUp(id: string, data: { type: string; status: string; followUpDate: string; notes: string; modifiedBy?: string }) {
  await query(
    `UPDATE BookingFollowUps SET type = $1, status = $2, followUpDate = $3, notes = $4, modifiedAt = CURRENT_TIMESTAMP, modifiedBy = $5 WHERE id = $6::uuid`,
    [data.type, data.status, data.followUpDate, data.notes, data.modifiedBy || null, id]
  );
}

export async function deleteBookingFollowUp(id: string, deletedBy?: string) {
  await query(
    `UPDATE BookingFollowUps SET isDeleted = TRUE, deletedAt = CURRENT_TIMESTAMP, deletedBy = $1 WHERE id = $2::uuid`,
    [deletedBy || null, id]
  );
}

export async function getFollowUpById(followUpId: string) {
  const result = await query(
    `SELECT 
      id,
      bookingId as "bookingId",
      userId as "userId",
      type,
      status,
      followUpDate as "followUpDate",
      notes,
      createdAt as "createdAt",
      createdBy as "createdBy"
     FROM BookingFollowUps 
     WHERE id = $1::uuid AND COALESCE(isDeleted, FALSE) = FALSE`,
    [followUpId]
  );
  return result.rows[0];
}

export async function createFollowUpComment(followUpId: string, data: { userId: string; comment: string }) {
  const result = await query(
    `INSERT INTO FollowUpComments (followUpId, userId, comment) VALUES ($1::uuid, $2::uuid, $3) RETURNING id`,
    [followUpId, data.userId, data.comment]
  );
  return result.rows[0]?.id;
}

export async function assignBooking(bookingId: string, assignedTo: string, modifiedBy: string) {
  await query(
    `
      UPDATE Bookings 
      SET assignedTo = $1::uuid, modifiedAt = CURRENT_TIMESTAMP, modifiedBy = $2
      WHERE id = $3::uuid AND COALESCE(isDeleted, FALSE) = FALSE
    `,
    [assignedTo, modifiedBy, bookingId]
  );
}
