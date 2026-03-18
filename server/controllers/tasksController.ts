import type { Request, Response } from "express";
import {

  createTask as createTaskModel,
  deleteTask as deleteTaskModel,
  listTasks as listTasksModel,
  updateTask as updateTaskModel,
} from "../models/tasksModel";

export async function listTasks(req: Request, res: Response) {
  const { tenantId, branchId, assignedTo, status } = req.query as {
    tenantId?: string;
    branchId?: string;
    assignedTo?: string;
    status?: string;
  };
  if (!tenantId) return res.status(400).json({ message: "tenantId is required" });
  res.json(await listTasksModel({ tenantId, branchId, assignedTo, status }));
}

export async function createTask(req: Request, res: Response) {
  const { tenantId, branchId, title, description, status, priority, assignedTo, dueDate } = req.body;
  const id = await createTaskModel({
    tenantId,
    branchId,
    title,
    description,
    status,
    priority,
    assignedTo,
    dueDate,
    createdBy: String((req as any).auth?.userId || ""),
  });
  res.json({ id });
}

export async function updateTask(req: Request, res: Response) {
  const { id } = req.params;
  const { branchId, title, description, status, priority, assignedTo, dueDate } = req.body;
  await updateTaskModel(id, { branchId, title, description, status, priority, assignedTo, dueDate, modifiedBy: String((req as any).auth?.userId || "") });
  res.json({ success: true });
}

export async function deleteTask(req: Request, res: Response) {
  const { id } = req.params;
  await deleteTaskModel(id, String((req as any).auth?.userId || ""));
  res.json({ success: true });
}
