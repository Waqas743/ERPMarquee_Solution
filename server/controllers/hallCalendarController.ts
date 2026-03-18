import type { Request, Response } from "express";
import {
  createHallCalendar as createHallCalendarModel,
  deleteHallCalendar as deleteHallCalendarModel,
  getHallCalendar,
  updateHallCalendar as updateHallCalendarModel,
} from "../models/hallCalendarModel";

export async function listHallCalendar(req: Request, res: Response) {
  const { hallId, startDate, endDate } = req.query as { hallId?: string; startDate?: string; endDate?: string };
  if (!hallId) return res.status(400).json({ message: "hallId is required" });
  res.json(await getHallCalendar(hallId, startDate, endDate));
}

export async function createHallCalendar(req: Request, res: Response) {
  const { hallId, bookingId, eventDate, startTime, endTime, isBlocked, blockReason, tentativeExpiryTime } = req.body;
  const id = await createHallCalendarModel({
    hallId,
    bookingId: bookingId || null,
    eventDate,
    startTime,
    endTime,
    isBlocked: Boolean(isBlocked),
    blockReason,
    tentativeExpiryTime,
    createdBy: String((req as any).auth?.userId || ""),
  });
  res.json({ id });
}

export async function updateHallCalendar(req: Request, res: Response) {
  const { id } = req.params;
  const { eventDate, startTime, endTime, isBlocked, blockReason, tentativeExpiryTime } = req.body;
  await updateHallCalendarModel(id, {
    eventDate,
    startTime,
    endTime,
    isBlocked: Boolean(isBlocked),
    blockReason,
    tentativeExpiryTime,
    modifiedBy: String((req as any).auth?.userId || ""),
  });
  res.json({ success: true });
}

export async function deleteHallCalendar(req: Request, res: Response) {
  const { id } = req.params;
  await deleteHallCalendarModel(id, String((req as any).auth?.userId || ""));
  res.json({ success: true });
}
