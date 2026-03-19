import type { Request, Response } from "express";
import { getSettings as getSettingsModel, updateSettings as updateSettingsModel } from "../models/settingsModel";


export async function getSettings(req: Request, res: Response) {
  const { tenantId } = req.query as { tenantId?: string };
  const auth = (req as any).auth;
  
  if (auth.roleName === "director" || auth.roleName === "manager" || auth.roleName === "staff") {
    return res.status(403).json({ message: "Access denied" });
  }

  if (!tenantId) return res.status(400).json({ message: "tenantId is required" });
  res.json(await getSettingsModel(tenantId));
}

export async function updateSettings(req: Request, res: Response) {
  const { tenantId, ...settings } = req.body;
  const auth = (req as any).auth;
  
  if (auth.roleName === "director" || auth.roleName === "manager" || auth.roleName === "staff") {
    return res.status(403).json({ message: "Access denied" });
  }

  if (!tenantId) return res.status(400).json({ message: "tenantId is required" });
  await updateSettingsModel(tenantId, settings);
  res.json({ success: true });
}
