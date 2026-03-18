import type { Request, Response } from "express";
import {

  createMenuCategory as createMenuCategoryModel,
  createMenuItem as createMenuItemModel,
  deleteMenuCategory as deleteMenuCategoryModel,
  deleteMenuItem as deleteMenuItemModel,
  getMenuCategoryById,
  getMenuItemById,
  listMenuCategories as listMenuCategoriesModel,
  listMenuItems as listMenuItemsModel,
  updateMenuCategory as updateMenuCategoryModel,
  updateMenuItem as updateMenuItemModel,
} from "../models/menuModel";

export async function listMenuCategories(req: Request, res: Response) {
  const { tenantId } = req.query as { tenantId?: string };
  if (!tenantId) return res.status(400).json({ message: "tenantId is required" });
  res.json(await listMenuCategoriesModel(tenantId));
}

export async function getMenuCategory(req: Request, res: Response) {
  const { id } = req.params;
  try {
    const category = await getMenuCategoryById(id);
    if (!category) return res.status(404).json({ message: "Category not found" });
    res.json(category);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

export async function createMenuCategory(req: Request, res: Response) {
  const { tenantId, name, description, isActive } = req.body;
  const id = await createMenuCategoryModel({
    tenantId,
    name,
    description,
    isActive: Boolean(isActive),
    createdBy: String((req as any).auth?.userId || ""),
  });
  res.json({ id });
}

export async function updateMenuCategory(req: Request, res: Response) {
  const { id } = req.params;
  const { name, description, isActive } = req.body;
  await updateMenuCategoryModel(id, { name, description, isActive: Boolean(isActive), modifiedBy: String((req as any).auth?.userId || "") });
  res.json({ success: true });
}

export async function deleteMenuCategory(req: Request, res: Response) {
  const { id } = req.params;
  await deleteMenuCategoryModel(id, String((req as any).auth?.userId || ""));
  res.json({ success: true });
}

export async function listMenuItems(req: Request, res: Response) {
  const { tenantId, categoryId } = req.query as { tenantId?: string; categoryId?: string };
  if (!tenantId) return res.status(400).json({ message: "tenantId is required" });
  res.json(await listMenuItemsModel(tenantId, categoryId));
}

export async function getMenuItem(req: Request, res: Response) {
  const { id } = req.params;
  try {
    const item = await getMenuItemById(id);
    if (!item) return res.status(404).json({ message: "Item not found" });
    res.json(item);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

export async function createMenuItem(req: Request, res: Response) {
  const { tenantId, categoryId, name, description, isActive } = req.body;
  const id = await createMenuItemModel({
    tenantId,
    categoryId,
    name,
    description,
    isActive: Boolean(isActive),
    createdBy: String((req as any).auth?.userId || ""),
  });
  res.json({ id });
}

export async function updateMenuItem(req: Request, res: Response) {
  const { id } = req.params;
  const { categoryId, name, description, isActive } = req.body;
  await updateMenuItemModel(id, { categoryId, name, description, isActive: Boolean(isActive), modifiedBy: String((req as any).auth?.userId || "") });
  res.json({ success: true });
}

export async function deleteMenuItem(req: Request, res: Response) {
  const { id } = req.params;
  await deleteMenuItemModel(id, String((req as any).auth?.userId || ""));
  res.json({ success: true });
}
