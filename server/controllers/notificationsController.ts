import { Request, Response } from "express";
import { getUserNotifications, markNotificationAsRead, markAllNotificationsAsRead } from "../models/notificationsModel";

export async function getNotifications(req: Request, res: Response) {
  const authUserId = (req as any).auth?.userId;
  try {
    const notifications = await getUserNotifications(authUserId);
    res.json(notifications);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function markAsRead(req: Request, res: Response) {
  const { id } = req.params;
  try {
    await markNotificationAsRead(id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function markAllAsRead(req: Request, res: Response) {
  const authUserId = (req as any).auth?.userId;
  try {
    await markAllNotificationsAsRead(authUserId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
