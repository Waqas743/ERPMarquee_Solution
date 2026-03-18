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
} from "../models/bookingsModel";

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
  const { tenantId, branchId, status, startDate, endDate } = req.query as {
    tenantId?: string;
    branchId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  };
  if (!tenantId) return res.status(400).json({ message: "tenantId is required" });
  res.json(await listBookingsModel({ tenantId, branchId, status, startDate, endDate }));
}

export async function getBooking(req: Request, res: Response) {
  const { id } = req.params;
  res.json(await getBookingById(id));
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
  } = req.body;
  try {
    const existingBooking = await getBookingById(id);
    if (!existingBooking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const canEdit = existingBooking.status === 'Pending' || (existingBooking.status === 'Approved' && existingBooking.paymentStatus === 'Unpaid');
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
      modifiedBy: authUserId,
    });
    res.json({ message: "Booking updated successfully" });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
}

export async function updateBookingStatus(req: Request, res: Response) {
  const authUserId = (req as any).auth?.userId;
  const { id } = req.params;
  const { status, userId, comments } = req.body;
  try {
    await updateBookingStatusModel(id, { status, userId: authUserId || userId, comments });
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
