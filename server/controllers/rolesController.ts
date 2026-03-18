import type { Request, Response } from "express";
import {

  createRole as createRoleModel,
  deleteRole as deleteRoleModel,
  getRoleById as getRoleByIdModel,
  getPermissionsList,
  getRolesWithPermissions,
  updateRole as updateRoleModel,
} from "../models/rolesModel";

export async function listRoles(req: Request, res: Response) {
  const { tenantId } = req.query as { tenantId?: string };
  if (!tenantId) return res.status(400).json({ message: "tenantId is required" });
  res.json(await getRolesWithPermissions(tenantId));
}

export async function getRole(req: Request, res: Response) {
  const { id } = req.params;
  const role = await getRoleByIdModel(id);
  if (!role) return res.status(404).json({ message: "Role not found" });
  res.json(role);
}

export async function createRole(req: Request, res: Response) {
  const { tenantId, name, description, permissions } = req.body;
  try {
    if (!tenantId) {
      throw new Error("tenantId is required");
    }
    const id = await createRoleModel({ tenantId, name, description, permissions, createdBy: String((req as any).auth?.userId || "") });
    res.json({ id });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
}

export async function updateRole(req: Request, res: Response) {
  const { id } = req.params;
  const { name, description, permissions } = req.body;
  try {
    await updateRoleModel(id, { name, description, permissions, modifiedBy: String((req as any).auth?.userId || "") });
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
}

export async function deleteRole(req: Request, res: Response) {
  const { id } = req.params;
  await deleteRoleModel(id, String((req as any).auth?.userId || ""));
  res.json({ success: true });
}

export function permissionsList(req: Request, res: Response) {
  res.json(getPermissionsList());
}
