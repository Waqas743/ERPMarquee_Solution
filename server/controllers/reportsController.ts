import type { Request, Response } from "express";
import { getPackageRevenue, getPopularItems } from "../models/reportsModel";


export async function packageRevenueReport(req: Request, res: Response) {
  let { tenantId, branchId } = req.query as { tenantId?: string; branchId?: string };
  const auth = (req as any).auth;
  if (auth.roleName === "manager" || auth.roleName === "staff") {
    branchId = auth.branchId;
  }
  res.json(await getPackageRevenue(tenantId as string, branchId));
}

export async function popularItemsReport(req: Request, res: Response) {
  let { tenantId, branchId } = req.query as { tenantId?: string; branchId?: string };
  const auth = (req as any).auth;
  if (auth.roleName === "manager" || auth.roleName === "staff") {
    branchId = auth.branchId;
  }
  res.json(await getPopularItems(tenantId as string, branchId));
}
