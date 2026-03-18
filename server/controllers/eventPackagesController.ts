import type { Request, Response } from "express";
import {

  createEventPackage as createEventPackageModel,
  deleteEventPackage as deleteEventPackageModel,
  getEventPackageById,
  listEventPackages as listEventPackagesModel,
  updateEventPackage as updateEventPackageModel,
} from "../models/eventPackagesModel";

export async function listEventPackages(req: Request, res: Response) {
  const { tenantId } = req.query as { tenantId?: string };
  if (!tenantId) return res.status(400).json({ message: "tenantId is required" });
  res.json(await listEventPackagesModel(tenantId));
}

export async function getEventPackage(req: Request, res: Response) {
  const { id } = req.params;
  const pkg = await getEventPackageById(id);
  if (!pkg) return res.status(404).json({ message: "Package not found" });
  res.json(pkg);
}

export async function createEventPackage(req: Request, res: Response) {
  const { tenantId, name, description, basePrice, maxGuests, isActive, menuItems, addOns } = req.body;
  try {
    const id = await createEventPackageModel({
      tenantId,
      name,
      description,
      basePrice,
      maxGuests,
      isActive: Boolean(isActive),
      menuItems,
      addOns,
      createdBy: String((req as any).auth?.userId || ""),
    });
    res.json({ id });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
}

export async function updateEventPackage(req: Request, res: Response) {
  const { id } = req.params;
  const { name, description, basePrice, maxGuests, isActive, menuItems, addOns } = req.body;
  try {
    await updateEventPackageModel(id, {
      name,
      description,
      basePrice,
      maxGuests,
      isActive: Boolean(isActive),
      menuItems,
      addOns,
      modifiedBy: String((req as any).auth?.userId || ""),
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
}

export async function deleteEventPackage(req: Request, res: Response) {
  const { id } = req.params;
  await deleteEventPackageModel(id, String((req as any).auth?.userId || ""));
  res.json({ success: true });
}
