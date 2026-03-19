import { query } from "../db";

export async function createNotification(data: { userId: string; title: string; message: string; link?: string }) {
  const result = await query(
    `INSERT INTO Notifications (userId, title, message, link) VALUES ($1::uuid, $2, $3, $4) RETURNING *`,
    [data.userId, data.title, data.message, data.link || null]
  );
  return result.rows[0];
}

export async function getUserNotifications(userId: string) {
  const result = await query(
    `SELECT * FROM Notifications WHERE userId = $1::uuid ORDER BY createdAt DESC LIMIT 50`,
    [userId]
  );
  return result.rows;
}

export async function markNotificationAsRead(id: string) {
  await query(
    `UPDATE Notifications SET isRead = TRUE WHERE id = $1::uuid`,
    [id]
  );
}

export async function markAllNotificationsAsRead(userId: string) {
  await query(
    `UPDATE Notifications SET isRead = TRUE WHERE userId = $1::uuid`,
    [userId]
  );
}
