import { query } from "../db";

export async function getHallCalendar(hallId: string, startDate?: string, endDate?: string) {
  let queryText = `
    SELECT 
      hbc.id,
      hbc.hallId as "hallId",
      hbc.bookingId as "bookingId",
      hbc.eventDate as "eventDate",
      hbc.startTime as "startTime",
      hbc.endTime as "endTime",
      hbc.isBlocked as "isBlocked",
      hbc.blockReason as "blockReason",
      hbc.tentativeExpiryTime as "tentativeExpiryTime",
      hbc.createdAt as "createdAt",
      hbc.modifiedAt as "modifiedAt",
      hbc.createdBy as "createdBy",
      hbc.modifiedBy as "modifiedBy"
    FROM HallBookingCalendar hbc
    WHERE hbc.hallId = $1::uuid AND COALESCE(hbc.isDeleted, FALSE) = FALSE
  `;
  const params: any[] = [hallId];
  if (startDate && endDate) {
    queryText += ` AND eventDate BETWEEN $${params.length + 1} AND $${params.length + 2}`;
    params.push(startDate, endDate);
  }
  return (await query(queryText, params)).rows;
}

export async function createHallCalendar(data: {
  hallId: string;
  bookingId?: string | null;
  eventDate: string;
  startTime?: string;
  endTime?: string;
  isBlocked: boolean;
  blockReason?: string;
  tentativeExpiryTime?: string;
  createdBy?: string;
}) {
  const result = await query(
    `
      INSERT INTO HallBookingCalendar (hallId, bookingId, eventDate, startTime, endTime, isBlocked, blockReason, tentativeExpiryTime, createdBy)
      VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, $9::uuid)
      RETURNING id
    `,
    [
      data.hallId,
      data.bookingId || null,
      data.eventDate,
      data.startTime,
      data.endTime,
      data.isBlocked,
      data.blockReason,
      data.tentativeExpiryTime,
      data.createdBy || null,
    ]
  );
  return result.rows[0]?.id;
}

export async function updateHallCalendar(id: string, data: {
  eventDate: string;
  startTime?: string;
  endTime?: string;
  isBlocked: boolean;
  blockReason?: string;
  tentativeExpiryTime?: string;
  modifiedBy?: string;
}) {
  await query(
    `
      UPDATE HallBookingCalendar SET
        eventDate = $1, startTime = $2, endTime = $3,
        isBlocked = $4, blockReason = $5, tentativeExpiryTime = $6,
        modifiedAt = CURRENT_TIMESTAMP, modifiedBy = $7::uuid
      WHERE id = $8::uuid
    `,
    [data.eventDate, data.startTime, data.endTime, data.isBlocked, data.blockReason, data.tentativeExpiryTime, data.modifiedBy || null, id]
  );
}

export async function deleteHallCalendar(id: string, deletedBy?: string) {
  await query("UPDATE HallBookingCalendar SET isDeleted = TRUE, deletedAt = CURRENT_TIMESTAMP, deletedBy = $2::uuid WHERE id = $1::uuid", [id, deletedBy || null]);
}
