import type { Request, Response } from "express";
import { createPlan as createPlanModel, deletePlan as deletePlanModel, getPlans, updatePlan as updatePlanModel } from "../models/plansModel";


export async function listPlans(req: Request, res: Response) {
  res.json(await getPlans());
}

export async function createPlan(req: Request, res: Response) {
  const { name, priceMonthly, priceYearly, maxBranches, maxUsers, storageLimitGB, featureJson } = req.body;
  const id = await createPlanModel({ name, priceMonthly, priceYearly, maxBranches, maxUsers, storageLimitGB, featureJson, createdBy: String((req as any).auth?.userId || "") });
  res.json({ id });
}

export async function updatePlan(req: Request, res: Response) {
  const { id } = req.params;
  const { name, priceMonthly, priceYearly, maxBranches, maxUsers, storageLimitGB, featureJson } = req.body;
  await updatePlanModel(id, { name, priceMonthly, priceYearly, maxBranches, maxUsers, storageLimitGB, featureJson, modifiedBy: String((req as any).auth?.userId || "") });
  res.json({ success: true });
}

export async function deletePlan(req: Request, res: Response) {
  const { id } = req.params;
  await deletePlanModel(id, String((req as any).auth?.userId || ""));
  res.json({ success: true });
}
