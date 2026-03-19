import type { Request, Response } from "express";
import {

  createHall as createHallModel,
  deleteHall as deleteHallModel,
  getHalls,
  getHallById,
  updateHall as updateHallModel,
} from "../models/hallsModel";

export async function listHalls(req: Request, res: Response) {
  let { tenantId, branchId } = req.query as { tenantId?: string; branchId?: string };
  const auth = (req as any).auth;
  
  if (auth.roleName === "manager" || auth.roleName === "staff") {
    branchId = auth.branchId;
  }
  
  if (!tenantId) return res.status(400).json({ message: "tenantId is required" });
  res.json(await getHalls(tenantId, branchId));
}

export async function getHall(req: Request, res: Response) {
  const { id } = req.params;
  const auth = (req as any).auth;
  try {
    const hall = await getHallById(id);
    if (!hall) return res.status(404).json({ message: "Hall not found" });
    
    if (auth.roleName === "manager" && hall.branchId !== auth.branchId) {
      return res.status(403).json({ message: "Access denied" });
    }
    
    res.json(hall);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

export async function createHall(req: Request, res: Response) {
  const { tenantId, branchId, hallManagerId, hallName, capacity, isDecorationAllowedExternally, createdBy } = req.body;
  const auth = (req as any).auth;
  try {
    if (auth.roleName === "manager" && branchId !== auth.branchId) {
      return res.status(403).json({ message: "Cannot create hall for another branch" });
    }
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
  const auth = (req as any).auth;
  try {
    const hall = await getHallById(id);
    if (!hall) return res.status(404).json({ message: "Hall not found" });
    if (auth.roleName === "manager" && hall.branchId !== auth.branchId) {
      return res.status(403).json({ message: "Access denied" });
    }

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
  const auth = (req as any).auth;
  
  const hall = await getHallById(id);
  if (!hall) return res.status(404).json({ message: "Hall not found" });
  if (auth.roleName === "manager" && hall.branchId !== auth.branchId) {
    return res.status(403).json({ message: "Access denied" });
  }

  await deleteHallModel(id);
  res.json({ success: true });
}
