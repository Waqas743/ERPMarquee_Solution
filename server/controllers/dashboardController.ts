import type { Request, Response } from "express";
import {
  getDashboardCalendar,
  getDashboardCharts,
  getDashboardCompletedEvents,
  getDashboardInvoices,
  getDashboardStats,
  getDashboardUpcomingEvents,
} from "../models/dashboardModel";

const isValidUUID = (uuid: string) => 
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);

export async function dashboardStats(req: Request, res: Response) {
  const { tenantId, branchId } = req.query as { tenantId?: string; branchId?: string };
  if (!tenantId) return res.status(400).json({ message: "tenantId is required" });
  if (!isValidUUID(tenantId)) return res.status(400).json({ message: "Invalid tenantId format" });
  res.json(await getDashboardStats(tenantId, branchId));
}

export async function dashboardCalendar(req: Request, res: Response) {
  const { tenantId, branchId, start, end } = req.query as { tenantId?: string; branchId?: string; start?: string; end?: string };
  if (!tenantId) return res.status(400).json({ message: "tenantId is required" });
  if (!isValidUUID(tenantId)) return res.status(400).json({ message: "Invalid tenantId format" });
  res.json(await getDashboardCalendar(tenantId, branchId, start, end));
}

export async function dashboardUpcomingEvents(req: Request, res: Response) {
  const { tenantId, branchId } = req.query as { tenantId?: string; branchId?: string };
  if (!tenantId) return res.status(400).json({ message: "tenantId is required" });
  if (!isValidUUID(tenantId)) return res.status(400).json({ message: "Invalid tenantId format" });
  res.json(await getDashboardUpcomingEvents(tenantId, branchId));
}

export async function dashboardCompletedEvents(req: Request, res: Response) {
  const { tenantId, branchId } = req.query as { tenantId?: string; branchId?: string };
  if (!tenantId) return res.status(400).json({ message: "tenantId is required" });
  if (!isValidUUID(tenantId)) return res.status(400).json({ message: "Invalid tenantId format" });
  res.json(await getDashboardCompletedEvents(tenantId, branchId));
}

export async function dashboardInvoices(req: Request, res: Response) {
  const { tenantId, branchId } = req.query as { tenantId?: string; branchId?: string };
  if (!tenantId) return res.status(400).json({ message: "tenantId is required" });
  if (!isValidUUID(tenantId)) return res.status(400).json({ message: "Invalid tenantId format" });
  res.json(await getDashboardInvoices(tenantId, branchId));
}

export async function dashboardCharts(req: Request, res: Response) {
  const { tenantId, branchId } = req.query as { tenantId?: string; branchId?: string };
  if (!tenantId) return res.status(400).json({ message: "tenantId is required" });
  if (!isValidUUID(tenantId)) return res.status(400).json({ message: "Invalid tenantId format" });
  res.json(await getDashboardCharts(tenantId, branchId));
}
