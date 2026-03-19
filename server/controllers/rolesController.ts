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
  
  const auth = (req as any).auth;
  
  // Allow admin, director, and manager to view roles
  if (!["admin", "director", "manager"].includes(auth.roleName)) {
    return res.status(403).json({ message: "Only Admins, Directors, and Managers can view roles" });
  }

  let roles = await getRolesWithPermissions(tenantId);
  
  // Filter out admin roles if the requester is a director
  if (auth.roleName === "director") {
    roles = roles.filter((r: any) => (r.name || "").toLowerCase() !== "admin");
  }
  
  // Filter out admin and director roles if the requester is a manager
  if (auth.roleName === "manager") {
    roles = roles.filter((r: any) => {
      const rName = (r.name || "").toLowerCase();
      return rName !== "admin" && rName !== "director";
    });
  }

  res.json(roles);
}

export async function getRole(req: Request, res: Response) {
  const { id } = req.params;
  const role = await getRoleByIdModel(id);
  if (!role) return res.status(404).json({ message: "Role not found" });
  res.json(role);
}

export async function createRole(req: Request, res: Response) {
  const auth = (req as any).auth;
  if (auth.roleName !== "admin") {
    return res.status(403).json({ message: "Only Admins can manage roles" });
  }

  const { tenantId, name, description, permissions } = req.body;
  try {
    if (!tenantId) {
      throw new Error("tenantId is required");
    }
    const id = await createRoleModel({ tenantId, name, description, permissions, createdBy: String(auth.userId || "") });
    res.json({ id });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
}

export async function updateRole(req: Request, res: Response) {
  const auth = (req as any).auth;
  if (auth.roleName !== "admin") {
    return res.status(403).json({ message: "Only Admins can manage roles" });
  }

  const { id } = req.params;
  const { name, description, permissions } = req.body;
  try {
    await updateRoleModel(id, { name, description, permissions, modifiedBy: String(auth.userId || "") });
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
}

export async function deleteRole(req: Request, res: Response) {
  const auth = (req as any).auth;
  if (auth.roleName !== "admin") {
    return res.status(403).json({ message: "Only Admins can manage roles" });
  }

  const { id } = req.params;
  try {
    await deleteRoleModel(id, String(auth.userId || ""));
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
}

export function permissionsList(req: Request, res: Response) {
  res.json(getPermissionsList());
}
