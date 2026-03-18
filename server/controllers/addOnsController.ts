import type { Request, Response } from "express";
import {
  createAddOn as createAddOnModel,
  deleteAddOn as deleteAddOnModel,
  getAddOn as getAddOnModel,
  listAddOns as listAddOnsModel,
  updateAddOn as updateAddOnModel,
} from "../models/addOnsModel";

export async function listAddOns(req: Request, res: Response) {
  const { tenantId } = req.query as { tenantId?: string };
  if (!tenantId) return res.status(400).json({ message: "tenantId is required" });
  res.json(await listAddOnsModel(tenantId));
}

export async function getAddOn(req: Request, res: Response) {
  const { id } = req.params;
  const addOn = await getAddOnModel(id);
  if (!addOn) return res.status(404).json({ message: "AddOn not found" });
  res.json(addOn);
}

export async function createAddOn(req: Request, res: Response) {
  const { tenantId, name, description, price, isActive } = req.body;
  try {
    if (!tenantId) throw new Error("tenantId is required");
    const id = await createAddOnModel({ tenantId, name, description, price, isActive: Boolean(isActive), createdBy: String((req as any).auth?.userId || "") });
    res.json({ id });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
}

export async function updateAddOn(req: Request, res: Response) {
  const { id } = req.params;
  const { name, description, price, isActive } = req.body;
  await updateAddOnModel(id, { name, description, price, isActive: Boolean(isActive), modifiedBy: String((req as any).auth?.userId || "") });
  res.json({ success: true });
}

export async function deleteAddOn(req: Request, res: Response) {
  const { id } = req.params;
  await deleteAddOnModel(id, String((req as any).auth?.userId || ""));
  res.json({ success: true });
}
