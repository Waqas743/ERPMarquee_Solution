import type { Request, Response } from "express";
import { getPackageRevenue, getPopularItems } from "../models/reportsModel";

export async function packageRevenueReport(req: Request, res: Response) {
  const { tenantId } = req.query as { tenantId?: string };
  res.json(await getPackageRevenue(tenantId as string));
}

export async function popularItemsReport(req: Request, res: Response) {
  const { tenantId } = req.query as { tenantId?: string };
  res.json(await getPopularItems(tenantId as string));
}
