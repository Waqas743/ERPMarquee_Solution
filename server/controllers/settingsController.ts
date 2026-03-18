import type { Request, Response } from "express";
import { getSettings as getSettingsModel, updateSettings as updateSettingsModel } from "../models/settingsModel";


export async function getSettings(req: Request, res: Response) {
  const { tenantId } = req.query as { tenantId?: string };
  if (!tenantId) return res.status(400).json({ message: "tenantId is required" });
  res.json(await getSettingsModel(tenantId));
}

export async function updateSettings(req: Request, res: Response) {
  const { tenantId, ...settings } = req.body;
  if (!tenantId) return res.status(400).json({ message: "tenantId is required" });
  await updateSettingsModel(tenantId, settings);
  res.json({ success: true });
}
