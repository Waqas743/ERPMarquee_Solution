import type { Request, Response } from "express";
import {

  createCustomer as createCustomerModel,
  getCustomerById,
  listCustomers as listCustomersModel,
  updateCustomer as updateCustomerModel,
} from "../models/customersModel";

export async function listCustomers(req: Request, res: Response) {
  const { tenantId, search } = req.query as { tenantId?: string; search?: string };
  if (!tenantId) return res.status(400).json({ message: "tenantId is required" });

  const auth = (req as any).auth;
  const userId = auth.roleName === "staff" ? auth.userId : undefined;

  res.json(await listCustomersModel(tenantId, search, userId));
}

export async function getCustomer(req: Request, res: Response) {
  const { id } = req.params;
  res.json(await getCustomerById(id));
}

export async function createCustomer(req: Request, res: Response) {
  const { tenantId, name, cnic, phone, email, address } = req.body;
  try {
    if (!tenantId) throw new Error("tenantId is required");
    const id = await createCustomerModel({ tenantId, name, cnic, phone, email, address, createdBy: String((req as any).auth?.userId || "") });
    res.json({ id });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
}

export async function updateCustomer(req: Request, res: Response) {
  const { id } = req.params;
  const { name, cnic, phone, email, address } = req.body;
  try {
    await updateCustomerModel(id, { name, cnic, phone, email, address, modifiedBy: String((req as any).auth?.userId || "") });
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
}
