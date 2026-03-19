import type { Request, Response } from "express";
import { createBranch as createBranchModel, deleteBranch as deleteBranchModel, getBranches, getBranchById, updateBranch as updateBranchModel } from "../models/branchesModel";

const isValidUUID = (uuid: string) => 
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);

export async function listBranches(req: Request, res: Response) {
  let { tenantId } = req.query as { tenantId?: string };
  const auth = (req as any).auth;
  
  if (tenantId && !isValidUUID(tenantId)) {
    return res.status(400).json({ message: "Invalid tenantId format" });
  }
  
  let branchId: string | undefined;
  if (auth.roleName === "manager" || auth.roleName === "staff") {
    branchId = auth.branchId;
  }
  
  res.json(await getBranches(tenantId, branchId));
}

export async function getBranch(req: Request, res: Response) {
  const { id } = req.params;
  const auth = (req as any).auth;
  if (!isValidUUID(id)) return res.status(400).json({ message: "Invalid branch ID format" });
  
  if ((auth.roleName === "manager" || auth.roleName === "staff") && id !== auth.branchId) {
    return res.status(403).json({ message: "Access denied" });
  }

  const row = await getBranchById(id);
  if (!row) return res.status(404).json({ message: "Branch not found" });       
  res.json(row);
}

export async function createBranch(req: Request, res: Response) {
  const { tenantId, name, address, city, phone, email, managerId, isActive } = req.body;
  const id = await createBranchModel({
    tenantId,
    name,
    address,
    city,
    phone,
    email,
    managerId: managerId || null,
    isActive: Boolean(isActive),
    createdBy: String((req as any).auth?.userId || ""),
  });
  res.json({ id });
}

export async function updateBranch(req: Request, res: Response) {
  const { id } = req.params;
  const { tenantId, name, address, city, phone, email, managerId, isActive } = req.body;
  const auth = (req as any).auth;

  if ((auth.roleName === "manager" || auth.roleName === "staff") && id !== auth.branchId) {
    return res.status(403).json({ message: "Access denied" });
  }

  await updateBranchModel(id, {
    tenantId,
    name,
    address,
    city,
    phone,
    email,
    managerId: managerId || null,
    isActive: Boolean(isActive),
    modifiedBy: String(auth.userId || ""),
  });
  res.json({ success: true });
}

export async function deleteBranch(req: Request, res: Response) {
  const { id } = req.params;
  const auth = (req as any).auth;
  
  if ((auth.roleName === "manager" || auth.roleName === "staff") && id !== auth.branchId) {
    return res.status(403).json({ message: "Access denied" });
  }

  await deleteBranchModel(id, String(auth.userId || ""));
  res.json({ success: true });
}
