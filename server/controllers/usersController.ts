import type { Request, Response } from "express";
import {

  createUser as createUserModel,
  deleteUser as deleteUserModel,
  getUserById as getUserByIdModel,
  listUsers as listUsersModel,
  updateUser as updateUserModel,
} from "../models/usersModel";

export async function listUsers(req: Request, res: Response) {
  let { tenantId, search, roleId, branchId, isActive } = req.query as {
    tenantId?: string;
    search?: string;
    roleId?: string;
    branchId?: string;
    isActive?: string;
  };
  const auth = (req as any).auth;
  
  if (auth.roleName === "manager" || auth.roleName === "staff") {
    branchId = auth.branchId;
  }
  
  if (!tenantId) return res.status(400).json({ success: false, message: "tenantId is required" });
  
  const users = await listUsersModel({ tenantId, search, roleId, branchId, isActive });
  
  // Filter out admin users if the requester is a director
  if (auth.roleName === "director") {
    return res.json(users.filter((u: any) => (u.roleName || "").toLowerCase() !== "admin" && (u.role || "").toLowerCase() !== "admin"));
  }
  
  // Filter out admin and director users if the requester is a manager
  if (auth.roleName === "manager") {
    return res.json(users.filter((u: any) => {
      const rName = (u.roleName || "").toLowerCase();
      const r = (u.role || "").toLowerCase();
      return rName !== "admin" && r !== "admin" && rName !== "director" && r !== "director";
    }));
  }
  
  res.json(users);
}

export async function getUser(req: Request, res: Response) {
  const { id } = req.params;
  const auth = (req as any).auth;
  const row = await getUserByIdModel(id);
  if (!row) return res.status(404).json({ message: "User not found" });
  if ((auth.roleName === "manager" || auth.roleName === "staff") && row.branchId !== auth.branchId) {
    return res.status(403).json({ message: "Access denied" });
  }
  res.json(row);
}

export async function createUser(req: Request, res: Response) {
  let {
    tenantId,
    username,
    fullName,
    email,
    password,
    address,
    contactNo,
    city,
    country,
    emergencyContactNo,
    profileImage,
    role,
    roleId,
    isActive,
  } = req.body;
  const auth = (req as any).auth;
  try {
    let branchId = null;
    if (auth.roleName === "manager") {
      branchId = auth.branchId; // Force manager to only create users in their own branch
      if (!branchId) {
        return res.status(400).json({ message: "Manager does not have a branch assigned" });
      }
    }
    
    // Prevent director from creating admin users
    if (auth.roleName === "director") {
      const isTryingToCreateAdmin = (role || "").toLowerCase() === "admin" || 
        (req.body.roleName || "").toLowerCase() === "admin";
      
      if (isTryingToCreateAdmin) {
        return res.status(403).json({ message: "Director cannot create admin users" });
      }
    }
    
    // Prevent manager from creating admin or director users
    if (auth.roleName === "manager") {
      const isTryingToCreateAdminOrDirector = 
        (role || "").toLowerCase() === "admin" || 
        (req.body.roleName || "").toLowerCase() === "admin" ||
        (role || "").toLowerCase() === "director" || 
        (req.body.roleName || "").toLowerCase() === "director";
      
      if (isTryingToCreateAdminOrDirector) {
        return res.status(403).json({ message: "Manager cannot create admin or director users" });
      }
    }
    
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
      profileImage,
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
  let {
    username,
    fullName,
    email,
    password,
    address,
    contactNo,
    city,
    country,
    emergencyContactNo,
    profileImage,
    role,
    roleId,
    isActive,
  } = req.body;
  const auth = (req as any).auth;
  
  const existingUser = await getUserByIdModel(id);
  if (!existingUser) return res.status(404).json({ message: "User not found" });
  let branchId = existingUser.branchId;
  if (auth.roleName === "manager") {
    if (existingUser.branchId !== auth.branchId) {
      return res.status(403).json({ message: "Access denied: User is not in your branch" });
    }
    branchId = auth.branchId; // Force branch to remain manager's branch
  }

  // Prevent users from changing their own role or branch (especially manager/director)
  if ((auth.roleName === "director" || auth.roleName === "manager") && String(existingUser.id) === String(auth.userId)) {
    if (branchId !== undefined && branchId !== null && String(branchId) !== String(existingUser.branchId || "")) {
      return res.status(403).json({ message: "You cannot change your own branch" });
    }
    if (roleId !== undefined && roleId !== null && String(roleId) !== String(existingUser.roleId || "")) {
      return res.status(403).json({ message: "You cannot change your own role" });
    }
    if (role !== undefined && role !== null && String(role) !== String(existingUser.role || "")) {
      return res.status(403).json({ message: "You cannot change your own role" });
    }
  }

  // Prevent director from updating admin users or changing a user's role to admin
  if (auth.roleName === "director") {
    const isTargetAdmin = (existingUser.roleName || "").toLowerCase() === "admin" || 
      (existingUser.role || "").toLowerCase() === "admin";
      
    const isTryingToMakeAdmin = (role || "").toLowerCase() === "admin" || 
      (req.body.roleName || "").toLowerCase() === "admin";
      
    if (isTargetAdmin || isTryingToMakeAdmin) {
      return res.status(403).json({ message: "Director cannot modify or create admin users" });
    }
  }

  // Prevent manager from updating admin/director users or changing a user's role to admin/director
  if (auth.roleName === "manager") {
    const isTargetAdminOrDirector = 
      (existingUser.roleName || "").toLowerCase() === "admin" || 
      (existingUser.role || "").toLowerCase() === "admin" ||
      (existingUser.roleName || "").toLowerCase() === "director" || 
      (existingUser.role || "").toLowerCase() === "director";
      
    const isTryingToMakeAdminOrDirector = 
      (role || "").toLowerCase() === "admin" || 
      (req.body.roleName || "").toLowerCase() === "admin" ||
      (role || "").toLowerCase() === "director" || 
      (req.body.roleName || "").toLowerCase() === "director";
      
    if (isTargetAdminOrDirector || isTryingToMakeAdminOrDirector) {
      return res.status(403).json({ message: "Manager cannot modify or create admin/director users" });
    }
  }

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
    profileImage,
    role,
    roleId,
    isActive: Boolean(isActive),
    modifiedBy: String(auth.userId || ""),
  });
  res.json({ success: true });
}

export async function deleteUser(req: Request, res: Response) {
  const { id } = req.params;
  const auth = (req as any).auth;
  try {
    const existingUser = await getUserByIdModel(id);
    if (!existingUser) return res.status(404).json({ message: "User not found" });
    if (auth.roleName === "manager" && existingUser.branchId !== auth.branchId) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Prevent director from deleting admin users
    if (auth.roleName === "director") {
      const isTargetAdmin = (existingUser.roleName || "").toLowerCase() === "admin" || 
        (existingUser.role || "").toLowerCase() === "admin";
        
      if (isTargetAdmin) {
        return res.status(403).json({ message: "Director cannot delete admin users" });
      }
    }

    // Prevent manager from deleting admin or director users
    if (auth.roleName === "manager") {
      const isTargetAdminOrDirector = 
        (existingUser.roleName || "").toLowerCase() === "admin" || 
        (existingUser.role || "").toLowerCase() === "admin" ||
        (existingUser.roleName || "").toLowerCase() === "director" || 
        (existingUser.role || "").toLowerCase() === "director";
        
      if (isTargetAdminOrDirector) {
        return res.status(403).json({ message: "Manager cannot delete admin or director users" });
      }
    }

    await deleteUserModel(id, String(auth.userId || ""));
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
}
