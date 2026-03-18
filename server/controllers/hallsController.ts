import type { Request, Response } from "express";
import {

  createHall as createHallModel,
  deleteHall as deleteHallModel,
  getHalls,
  getHallById,
  updateHall as updateHallModel,
} from "../models/hallsModel";

export async function listHalls(req: Request, res: Response) {
  const { tenantId, branchId } = req.query as { tenantId?: string; branchId?: string };
  if (!tenantId) return res.status(400).json({ message: "tenantId is required" });
  res.json(await getHalls(tenantId, branchId));
}

export async function getHall(req: Request, res: Response) {
  const { id } = req.params;
  try {
    const hall = await getHallById(id);
    if (!hall) return res.status(404).json({ message: "Hall not found" });
    res.json(hall);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

export async function createHall(req: Request, res: Response) {
  const { tenantId, branchId, hallManagerId, hallName, capacity, isDecorationAllowedExternally, createdBy } = req.body;
  try {
    const id = await createHallModel({
      tenantId,
      branchId,
      hallManagerId: hallManagerId || null,
      hallName,
      capacity,
      isDecorationAllowedExternally: Boolean(isDecorationAllowedExternally),
      createdBy
    });
    res.json({ id });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
}

export async function updateHall(req: Request, res: Response) {
  const { id } = req.params;
  const { branchId, hallManagerId, hallName, capacity, isDecorationAllowedExternally, modifiedBy } = req.body;
  try {
    await updateHallModel(id, {
      branchId,
      hallManagerId: hallManagerId || null,
      hallName,
      capacity,
      isDecorationAllowedExternally: Boolean(isDecorationAllowedExternally),
      modifiedBy
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
}

export async function deleteHall(req: Request, res: Response) {
  const { id } = req.params;
  await deleteHallModel(id);
  res.json({ success: true });
}
