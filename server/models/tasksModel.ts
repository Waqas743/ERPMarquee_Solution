import { query } from "../db";

export async function listTasks(data: { tenantId: string; branchId?: string; assignedTo?: string; status?: string }) {
  let queryText = `
    SELECT 
      t.id,
      t.tenantId as "tenantId",
      t.branchId as "branchId",
      t.title,
      t.description,
      t.status,
      t.priority,
      t.assignedTo as "assignedTo",
      t.dueDate as "dueDate",
      t.createdAt as "createdAt",
      t.modifiedAt as "modifiedAt",
      t.createdBy as "createdBy",
      t.modifiedBy as "modifiedBy",
      tu.fullName as "assignedToName",
      b.name as "branchName",
      cb.fullName as "createdByName",
      mb.fullName as "modifiedByName"
    FROM Tasks t
    LEFT JOIN TenantUsers tu ON t.assignedTo::text = tu.id::text
    LEFT JOIN Branches b ON t.branchId::text = b.id::text
    LEFT JOIN TenantUsers cb ON t.createdBy::text = cb.id::text
    LEFT JOIN TenantUsers mb ON t.modifiedBy::text = mb.id::text
    WHERE t.tenantId = $1 AND COALESCE(t.isDeleted, FALSE) = FALSE
  `;
  const params: any[] = [data.tenantId];
  if (data.branchId) {
    queryText += ` AND t.branchId = $${params.length + 1}`;
    params.push(data.branchId);
  }
  if (data.assignedTo) {
    queryText += ` AND t.assignedTo = $${params.length + 1}`;
    params.push(data.assignedTo);
  }
  if (data.status) {
    queryText += ` AND t.status = $${params.length + 1}`;
    params.push(data.status);
  }
  queryText += " ORDER BY t.dueDate ASC, t.createdAt DESC";
  return (await query(queryText, params)).rows;
}

export async function createTask(data: {
  tenantId: string;
  branchId?: string | null;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  assignedTo?: string | null;
  dueDate?: string | null;
  createdBy?: string;
}) {
  const result = await query(
    `
      INSERT INTO Tasks (tenantId, branchId, title, description, status, priority, assignedTo, dueDate, createdBy)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `,
    [
      data.tenantId,
      data.branchId || null,
      data.title,
      data.description,
      data.status || "Pending",
      data.priority || "Medium",
      data.assignedTo || null,
      data.dueDate || null,
      data.createdBy || null,
    ]
  );
  return result.rows[0]?.id;
}

export async function updateTask(id: string, data: {
  branchId?: string | null;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  assignedTo?: string | null;
  dueDate?: string | null;
  modifiedBy?: string;
}) {
  await query(
    `
      UPDATE Tasks SET
        branchId = $1, title = $2, description = $3, status = $4, priority = $5, assignedTo = $6, dueDate = $7,
        modifiedAt = CURRENT_TIMESTAMP, modifiedBy = $8
      WHERE id = $9
    `,
    [
      data.branchId || null,
      data.title,
      data.description,
      data.status,
      data.priority,
      data.assignedTo || null,
      data.dueDate || null,
      data.modifiedBy || null,
      id,
    ]
  );
}

export async function deleteTask(id: string, deletedBy?: string) {
  await query("UPDATE Tasks SET isDeleted = TRUE, deletedAt = CURRENT_TIMESTAMP, deletedBy = $2 WHERE id = $1", [id, deletedBy || null]);
}
