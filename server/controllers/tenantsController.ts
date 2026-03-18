import type { Request, Response } from "express";
import { createTenant as createTenantModel, deleteTenant as deleteTenantModel, getTenants, updateTenant as updateTenantModel } from "../models/tenantsModel";

export async function listTenants(req: Request, res: Response) {
  res.json(await getTenants());
}

export async function createTenant(req: Request, res: Response) {
  try {
    const {
      name,
      type,
      registrationNo,
      ntn,
      contactPersonName,
      contactPhone,
      email,
      address,
      city,
      country,
      domain,
      subscriptionPlanId,
      subscriptionStartDate,
      subscriptionEndDate,
      maxBranchesAllowed,
      maxUsersAllowed,
      password,
      username,
      isSuspended,
      suspensionReason,
      isActive,
    } = req.body;
    const logoUrl = req.file ? `/uploads/${req.file.filename}` : req.body.logoUrl || null;
    const id = await createTenantModel({
      name: name || "",
      type: type || "Hall",
      registrationNo: registrationNo || "",
      ntn: ntn || "",
      contactPersonName: contactPersonName || "",
      contactPhone: contactPhone || "",
      email: email || "",
      address: address || "",
      city: city || "",
      country: country || "Pakistan",
      logoUrl,
      domain: domain || "",
      subscriptionPlanId: subscriptionPlanId ? Number(subscriptionPlanId) : null,
      subscriptionStartDate: subscriptionStartDate || new Date().toISOString(),
      subscriptionEndDate: subscriptionEndDate || null,
      maxBranchesAllowed: Number(maxBranchesAllowed || 0),
      maxUsersAllowed: Number(maxUsersAllowed || 0),
      password: password || "",
      username: username || "",
      isSuspended: isSuspended === "true" || isSuspended === 1,
      suspensionReason: suspensionReason || "",
      isActive: !(isActive === "false" || isActive === 0),
      createdBy: String((req as any).auth?.userId || ""),
    });
    res.json({ id });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Failed to create tenant" });
  }
}

export async function updateTenant(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const {
      name,
      type,
      registrationNo,
      ntn,
      contactPersonName,
      contactPhone,
      email,
      address,
      city,
      country,
      domain,
      subscriptionPlanId,
      subscriptionStartDate,
      subscriptionEndDate,
      maxBranchesAllowed,
      maxUsersAllowed,
      password,
      username,
      isSuspended,
      isActive,
      suspensionReason,
    } = req.body;
    let logoUrl = req.body.logoUrl;
    if (req.file) {
      logoUrl = `/uploads/${req.file.filename}`;
    }
    await updateTenantModel(id, {
      name: name || "",
      type: type || "Hall",
      registrationNo: registrationNo || "",
      ntn: ntn || "",
      contactPersonName: contactPersonName || "",
      contactPhone: contactPhone || "",
      email: email || "",
      address: address || "",
      city: city || "",
      country: country || "Pakistan",
      logoUrl,
      domain: domain || "",
      subscriptionPlanId: subscriptionPlanId ? Number(subscriptionPlanId) : null,
      subscriptionStartDate: subscriptionStartDate || null,
      subscriptionEndDate: subscriptionEndDate || null,
      maxBranchesAllowed: Number(maxBranchesAllowed || 0),
      maxUsersAllowed: Number(maxUsersAllowed || 0),
      password: password || "",
      username: username || "",
      isSuspended: isSuspended === "true" || isSuspended === 1,
      isActive: !(isActive === "false" || isActive === 0),
      suspensionReason: suspensionReason || "",
      modifiedBy: String((req as any).auth?.userId || ""),
    });
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Failed to update tenant" });
  }
}

export async function deleteTenant(req: Request, res: Response) {
  const { id } = req.params;
  try {
    await deleteTenantModel(id, String((req as any).auth?.userId || ""));
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
}
