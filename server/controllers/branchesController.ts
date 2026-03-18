import type { Request, Response } from "express";
import { createBranch as createBranchModel, deleteBranch as deleteBranchModel, getBranches, getBranchById, updateBranch as updateBranchModel } from "../models/branchesModel";

export async function listBranches(req: Request, res: Response) {
  const { tenantId } = req.query as { tenantId?: string };
  res.json(await getBranches(tenantId));
}

export async function getBranch(req: Request, res: Response) {
  const { id } = req.params;
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
  await updateBranchModel(id, {
    tenantId,
    name,
    address,
    city,
    phone,
    email,
    managerId: managerId || null,
    isActive: Boolean(isActive),
    modifiedBy: String((req as any).auth?.userId || ""),
  });
  res.json({ success: true });
}

export async function deleteBranch(req: Request, res: Response) {
  const { id } = req.params;
  await deleteBranchModel(id, String((req as any).auth?.userId || ""));
  res.json({ success: true });
}
