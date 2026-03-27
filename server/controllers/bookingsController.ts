import type { Request, Response } from "express";
import {
  checkBookingAvailability as checkBookingAvailabilityModel,
  createBooking as createBookingModel,
  createBookingPayment as createBookingPaymentModel,
  deleteBookingPayment as deleteBookingPaymentModel,
  getBookingById,
  getBookingContract as getBookingContractModel,
  listBookingApprovals as listBookingApprovalsModel,
  listBookingPayments as listBookingPaymentsModel,
  listBookings as listBookingsModel,
  listBookingMenuItems as listBookingMenuItemsModel,
  listBookingAddOns as listBookingAddOnsModel,
  payBookingPayment as payBookingPaymentModel,
  updateBooking as updateBookingModel,
  updateBookingStatus as updateBookingStatusModel,
  upsertBookingContract as upsertBookingContractModel,
  listBookingFollowUps as listBookingFollowUpsModel,
  createBookingFollowUp as createBookingFollowUpModel,
  updateBookingFollowUp as updateBookingFollowUpModel,
  deleteBookingFollowUp as deleteBookingFollowUpModel,
  createFollowUpComment as createFollowUpCommentModel,
  assignBooking as assignBookingModel,
  getFollowUpById,
  deleteBooking as deleteBookingModel,
} from "../models/bookingsModel";
import { createNotification } from "../models/notificationsModel";
import { getTenantAdmins } from "../models/usersModel";
import { notifyUser, notifyBookingRoom } from "../services/socket";

export async function checkBookingAvailability(req: Request, res: Response) {
  const { hallId, eventDate, slot, excludeId } = req.query as { hallId?: string; eventDate?: string; slot?: string; excludeId?: string };
  try {
    if (!hallId || !eventDate || !slot) {
      return res.status(400).json({ message: "hallId, eventDate and slot are required" });
    }
    const existingBooking = await checkBookingAvailabilityModel({ hallId, eventDate, slot, excludeId });
    if (existingBooking) {
      res.json({ available: false, bookingNumber: existingBooking.bookingNumber });
    } else {
      res.json({ available: true });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

export async function listBookings(req: Request, res: Response) {
  let { tenantId, branchId, status, startDate, endDate } = req.query as {
    tenantId?: string;
    branchId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  };
  const auth = (req as any).auth;
  if (auth.roleName === "manager" || auth.roleName === "staff") {
    branchId = auth.branchId;
  }
  const userId = auth.roleName === "staff" ? auth.userId : undefined;

  if (!tenantId) return res.status(400).json({ message: "tenantId is required" });
  res.json(await listBookingsModel({ tenantId, branchId, status, startDate, endDate, userId }));
}

export async function getBooking(req: Request, res: Response) {
  const { id } = req.params;
  const auth = (req as any).auth;
  const booking = await getBookingById(id);
  
  if (!booking) return res.status(404).json({ message: "Booking not found" });

  if (auth.roleName === "manager" && booking.branchId !== auth.branchId) {
    return res.status(403).json({ message: "Access denied" });
  }
  if (auth.roleName === "staff" && booking.createdBy !== auth.userId && booking.assignedTo !== auth.userId) {
    return res.status(403).json({ message: "Access denied" });
  }

  res.json(booking);
}

export async function createBooking(req: Request, res: Response) {
  const authUserId = (req as any).auth?.userId;
  const {
    tenantId,
    branchId,
    hallId,
    customerId,
    packageId,
    eventType,
    eventDate,
    slot,
    guestCount,
    hallRent,
    decorationCharges,
    cateringCharges,
    addOnsCharges,
    discount,
    tax,
    grandTotal,
    djCharges,
    fireworkPrice,
    fireworkQuantity,
    payments,
    menuItems,
    selectedAddOns,
  } = req.body;
  try {
    if (!tenantId) throw new Error("tenantId is required");
    if (!branchId) throw new Error("branchId is required");
    if (!hallId) throw new Error("hallId is required");
    if (!customerId) throw new Error("customerId is required");

    const auth = (req as any).auth;
    if ((auth.roleName === "manager" || auth.roleName === "staff") && branchId !== auth.branchId) {
      return res.status(403).json({ message: "Cannot create booking for another branch" });
    }

    const { bookingId, bookingNumber } = await createBookingModel({
      tenantId,
      branchId,
      hallId,
      customerId,
      packageId: packageId || null,
      eventType,
      eventDate,
      slot,
      guestCount,
      hallRent,
      decorationCharges,
      cateringCharges,
      addOnsCharges,
      discount,
      tax,
      grandTotal,
      djCharges,
      fireworkPrice,
      fireworkQuantity,
      payments,
      menuItems,
      selectedAddOns,
      createdBy: authUserId,
    });

    // Notify Admins
    try {
      const adminIds = await getTenantAdmins(tenantId);
      const authUserName = (req as any).auth?.fullName || "A user";
      for (const adminId of adminIds) {
        if (adminId !== authUserId) {
          const notif = await createNotification({
            userId: adminId,
            title: "New Booking Created",
            message: `${authUserName} created a new booking #${bookingNumber} for ${eventDate}.`,
            link: `/bookings/${bookingId}`
          });
          notifyUser(adminId, "notification", notif);
        }
      }
    } catch (notifErr) {
      console.error("Error sending admin notifications for createBooking:", notifErr);
    }

    res.json({ id: bookingId, bookingNumber });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
}

export async function updateBooking(req: Request, res: Response) {
  const authUserId = (req as any).auth?.userId;
  const { id } = req.params;
  const {
    branchId,
    hallId,
    customerId,
    packageId,
    eventType,
    eventDate,
    slot,
    guestCount,
    hallRent,
    decorationCharges,
    cateringCharges,
    addOnsCharges,
    discount,
    tax,
    grandTotal,
    djCharges,
    fireworkPrice,
    fireworkQuantity,
    menuItems,
    selectedAddOns,
    payments,
  } = req.body;
  try {
    const existingBooking = await getBookingById(id);
    if (!existingBooking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const auth = (req as any).auth;
    if (auth.roleName === "manager" && existingBooking.branchId !== auth.branchId) {
      return res.status(403).json({ message: "Access denied" });
    }
    if (auth.roleName === "staff" && existingBooking.createdBy !== auth.userId) {
      return res.status(403).json({ message: "Access denied" });
    }
    if ((auth.roleName === "manager" || auth.roleName === "staff") && branchId && branchId !== auth.branchId) {
      return res.status(403).json({ message: "Cannot move booking to another branch" });
    }

    const canEdit = existingBooking.status === 'Pending' || (existingBooking.status === 'Approved' && existingBooking.paymentStatus === 'Unpaid') || (existingBooking.status === 'Approved' && existingBooking.paymentStatus === 'Not Paid');
    if (!canEdit) {
      return res.status(403).json({ message: "Cannot edit booking. Only Pending bookings or Approved bookings without payments can be edited." });
    }

    await updateBookingModel(id, {
      branchId,
      hallId,
      customerId,
      packageId: packageId || null,
      eventType,
      eventDate,
      slot,
      guestCount,
      hallRent,
      decorationCharges,
      cateringCharges,
      addOnsCharges,
      discount,
      tax,
      grandTotal,
      djCharges,
      fireworkPrice,
      fireworkQuantity,
      menuItems,
      selectedAddOns,
      payments,
      modifiedBy: authUserId,
    });
    console.log("updateBookingModel payments passed:", payments);
    res.json({ message: "Booking updated successfully" });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
}

export async function deleteBooking(req: Request, res: Response) {
  const authUserId = (req as any).auth?.userId;
  const { id } = req.params;
  try {
    const existingBooking = await getBookingById(id);
    if (!existingBooking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (existingBooking.status !== "Pending" && existingBooking.status !== "Rejected") {
      return res.status(400).json({ message: "Only Pending or Rejected bookings can be deleted" });
    }

    const auth = (req as any).auth;
    if (auth.roleName === "manager" && existingBooking.branchId !== auth.branchId) {
      return res.status(403).json({ message: "Access denied" });
    }
    if (auth.roleName === "staff" && existingBooking.createdBy !== auth.userId) {
      return res.status(403).json({ message: "Access denied" });
    }

    await deleteBookingModel(id, authUserId);
    res.json({ message: "Booking deleted successfully" });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
}

export async function updateBookingStatus(req: Request, res: Response) {
  const authUserId = (req as any).auth?.userId;
  const auth = (req as any).auth;
  const { id } = req.params;
  const { status, userId, comments } = req.body;
  try {
    const existingBooking = await getBookingById(id);
    if (!existingBooking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    if (auth.roleName === "manager" && existingBooking.branchId !== auth.branchId) {
      return res.status(403).json({ message: "Access denied" });
    }
    if (auth.roleName === "staff" && existingBooking.createdBy !== auth.userId) {
      return res.status(403).json({ message: "Access denied" });
    }

    await updateBookingStatusModel(id, { status, userId: authUserId || userId, comments });
    
    // Notify Admins about status change
    try {
      const existingBooking2 = await getBookingById(id);
      if (existingBooking2) {
        const adminIds = await getTenantAdmins(existingBooking2.tenantId);
        const authUserName = (req as any).auth?.fullName || "A user";
        for (const adminId of adminIds) {
          if (adminId !== authUserId) {
            const notif = await createNotification({
              userId: adminId,
              title: `Booking ${status}`,
              message: `Booking #${existingBooking2.bookingNumber} status was changed to ${status} by ${authUserName}.`,
              link: `/bookings/${id}`
            });
            notifyUser(adminId, "notification", notif);
          }
        }
      }
    } catch (notifErr) {
      console.error("Error sending admin notifications for updateBookingStatus:", notifErr);
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
}

export async function listBookingPayments(req: Request, res: Response) {
  const { id } = req.params;
  res.json(await listBookingPaymentsModel(id));
}

export async function createBookingPayment(req: Request, res: Response) {
  const authUserId = (req as any).auth?.userId;
  const { id } = req.params;
  const { type, amount, dueDate, status } = req.body;
  try {
    await createBookingPaymentModel(id, { type, amount, dueDate, status, createdBy: authUserId });
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
}

export async function payBookingPayment(req: Request, res: Response) {
  const authUserId = (req as any).auth?.userId;
  const { id, paymentId } = req.params;
  const { paidDate } = req.body;
  try {
    await payBookingPaymentModel(id, paymentId, paidDate, authUserId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
}

export async function deleteBookingPayment(req: Request, res: Response) {
  const authUserId = (req as any).auth?.userId;
  const { id, paymentId } = req.params;
  try {
    await deleteBookingPaymentModel(id, paymentId, authUserId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
}

export async function listBookingApprovals(req: Request, res: Response) {
  const { id } = req.params;
  res.json(await listBookingApprovalsModel(id));
}

export async function getBookingContract(req: Request, res: Response) {
  const { id } = req.params;
  res.json((await getBookingContractModel(id)) || null);
}

export async function upsertBookingContract(req: Request, res: Response) {
  const authUserId = (req as any).auth?.userId;
  const { id } = req.params;
  const { content } = req.body;
  const contractId = await upsertBookingContractModel(id, content, authUserId);
  res.json({ id: contractId });
}

export async function listBookingMenuItems(req: Request, res: Response) {
  const { id } = req.params;
  res.json(await listBookingMenuItemsModel(id));
}

export async function listBookingAddOns(req: Request, res: Response) {
  const { id } = req.params;
  res.json(await listBookingAddOnsModel(id));
}

export async function listBookingFollowUps(req: Request, res: Response) {
  const { id } = req.params;
  console.log(`Listing follow ups for booking ${id}`);
  try {
    res.json(await listBookingFollowUpsModel(id));
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

export async function createBookingFollowUp(req: Request, res: Response) {
  const authUserId = (req as any).auth?.userId;
  const { id } = req.params;
  const { userId, type, status, followUpDate, notes } = req.body;
  try {
    const existingBooking = await getBookingById(id);
    if (existingBooking) {
      if (existingBooking.status === 'Rejected' || existingBooking.paymentStatus === 'Paid') {
        return res.status(400).json({ message: "Cannot add follow-ups to a booking that is Paid or Rejected" });
      }
    }

    const followUpId = await createBookingFollowUpModel(id, {
      userId,
      type,
      status,
      followUpDate,
      notes,
      createdBy: authUserId,
    });
    notifyBookingRoom(id, "booking_updated");
    res.json({ id: followUpId });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
}

export async function updateBookingFollowUp(req: Request, res: Response) {
  const authUserId = (req as any).auth?.userId;
  const { id, followUpId } = req.params; // Wait, updateBookingFollowUp route only has /follow-ups/:followUpId ? No, it is /bookings/:id/follow-ups/:followUpId
  const { type, status, followUpDate, notes } = req.body;
  try {
    await updateBookingFollowUpModel(followUpId, {
      type,
      status,
      followUpDate,
      notes,
      modifiedBy: authUserId,
    });
    if (id) notifyBookingRoom(id, "booking_updated");
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
}

export async function deleteBookingFollowUp(req: Request, res: Response) {
  const authUserId = (req as any).auth?.userId;
  const { id, followUpId } = req.params;
  try {
    await deleteBookingFollowUpModel(followUpId, authUserId);
    if (id) notifyBookingRoom(id, "booking_updated");
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
}

export async function addFollowUpComment(req: Request, res: Response) {
  try {
    const { id, followUpId } = req.params;
    const { comment } = req.body;
    const authUserId = (req as any).auth?.userId;
    const authUserName = (req as any).auth?.fullName || "A user";

    if (!comment) {
      return res.status(400).json({ message: "Comment is required" });
    }

    const commentId = await createFollowUpCommentModel(followUpId, {
      userId: authUserId,
      comment
    });

    notifyBookingRoom(id, "booking_updated");

    const followUp = await getFollowUpById(followUpId);
    const booking = await getBookingById(id);
    
    const usersToNotify = new Set<string>();

    if (followUp && followUp.userId !== authUserId) {
      usersToNotify.add(followUp.userId);
    }
    
    if (booking) {
      if (booking.assignedTo && booking.assignedTo !== authUserId) {
        usersToNotify.add(booking.assignedTo);
      }
      // Also notify the person who created or last modified (assigned) the booking, usually the director/manager
      if (booking.modifiedBy && booking.modifiedBy !== authUserId) {
        usersToNotify.add(booking.modifiedBy);
      } else if (booking.createdBy && booking.createdBy !== authUserId) {
        usersToNotify.add(booking.createdBy);
      }
    }

    for (const uId of usersToNotify) {
      const notif = await createNotification({
        userId: uId,
        title: "New Comment on Follow-up",
        message: `${authUserName} commented on a follow-up for booking #${booking?.bookingNumber || id}.`,
        link: `/bookings/${id}`
      });
      notifyUser(uId, "notification", notif);
    }

    res.status(201).json({ message: "Comment added successfully", commentId });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function assignBooking(req: Request, res: Response) {
  const auth = (req as any).auth;
  const authUserId = auth?.userId;
  const { id } = req.params;
  const { assignedTo } = req.body;
  
  if (auth?.roleName === "staff") {
    return res.status(403).json({ message: "Staff are not allowed to assign bookings" });
  }
  
  if (!assignedTo) {
    return res.status(400).json({ message: "assignedTo is required" });
  }

  try {
    const existingBooking = await getBookingById(id);
    if (existingBooking) {
      if (existingBooking.status === 'Rejected' || existingBooking.paymentStatus === 'Paid') {
        return res.status(400).json({ message: "Cannot assign a booking that is Paid or Rejected" });
      }
    }
    await assignBookingModel(id, assignedTo, authUserId);
    
    if (existingBooking) {
      // Create notification for the assignee
      const notif = await createNotification({
        userId: assignedTo,
        title: "New Booking Assigned",
        message: `You have been assigned to booking #${existingBooking.bookingNumber}`,
        link: `/bookings/${id}`
      });
      // Emit socket event
      notifyUser(assignedTo, "notification", notif);

      // Create notification for the assigner (the person making the assignment)
      if (authUserId && authUserId !== assignedTo) {
        const notifAssigner = await createNotification({
          userId: authUserId,
          title: "Booking Assignment Successful",
          message: `You successfully assigned booking #${existingBooking.bookingNumber}`,
          link: `/bookings/${id}`
        });
        notifyUser(authUserId, "notification", notifAssigner);
      }
    }

    notifyBookingRoom(id, "booking_updated");

    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
}
