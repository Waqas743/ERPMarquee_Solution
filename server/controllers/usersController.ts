import type { Request, Response } from "express";
import {
  createUser as createUserModel,
  deleteUser as deleteUserModel,
  getUserById as getUserByIdModel,
  listUsers as listUsersModel,
  updateUser as updateUserModel,
} from "../models/usersModel";

export async function listUsers(req: Request, res: Response) {
  const { tenantId, search, roleId, branchId, isActive } = req.query as {
    tenantId?: string;
    search?: string;
    roleId?: string;
    branchId?: string;
    isActive?: string;
  };
  if (!tenantId) return res.status(400).json({ success: false, message: "tenantId is required" });
  res.json(await listUsersModel({ tenantId, search, roleId, branchId, isActive }));
}

export async function getUser(req: Request, res: Response) {
  const { id } = req.params;
  const row = await getUserByIdModel(id);
  if (!row) return res.status(404).json({ message: "User not found" });
  res.json(row);
}

export async function createUser(req: Request, res: Response) {
  const {
    tenantId,
    branchId,
    username,
    fullName,
    email,
    password,
    address,
    contactNo,
    city,
    country,
    emergencyContactNo,
    role,
    roleId,
    isActive,
  } = req.body;
  try {
    const id = await createUserModel({
      tenantId,
      branchId: branchId || null,
      username,
      fullName,
      email,
      password,
      address,
      contactNo,
      city,
      country,
      emergencyContactNo,
      role,
      roleId,
      isActive: Boolean(isActive),
      createdBy: String((req as any).auth?.userId || ""),
    });
    res.json({ id });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
}

export async function updateUser(req: Request, res: Response) {
  const { id } = req.params;
  const {
    branchId,
    username,
    fullName,
    email,
    password,
    address,
    contactNo,
    city,
    country,
    emergencyContactNo,
    role,
    roleId,
    isActive,
  } = req.body;
  await updateUserModel(id, {
    branchId: branchId || null,
    username,
    fullName,
    email,
    password,
    address,
    contactNo,
    city,
    country,
    emergencyContactNo,
    role,
    roleId,
    isActive: Boolean(isActive),
    modifiedBy: String((req as any).auth?.userId || ""),
  });
  res.json({ success: true });
}

export async function deleteUser(req: Request, res: Response) {
  const { id } = req.params;
  try {
    await deleteUserModel(id, String((req as any).auth?.userId || ""));
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
}
