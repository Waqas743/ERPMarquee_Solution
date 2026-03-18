import { query } from "../db";

export async function getPlans() {
  const result = await query(`
    SELECT sp.*, 
           cu.fullName as "createdByName", 
           mu.fullName as "modifiedByName"
    FROM SubscriptionPlans sp
    LEFT JOIN TenantUsers cu ON sp.createdBy = cu.id
    LEFT JOIN TenantUsers mu ON sp.modifiedBy = mu.id
    WHERE COALESCE(sp.isDeleted, FALSE) = FALSE 
    ORDER BY sp.id DESC
  `);
  return result.rows;
}

export async function createPlan(data: {
  name: string;
  priceMonthly: number;
  priceYearly: number;
  maxBranches: number;
  maxUsers: number;
  storageLimitGB: number;
  featureJson: string;
  createdBy?: string;
}) {
  const result = await query(
    `
      INSERT INTO SubscriptionPlans (name, priceMonthly, priceYearly, maxBranches, maxUsers, storageLimitGB, featureJson, createdBy)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `,
    [data.name, data.priceMonthly, data.priceYearly, data.maxBranches, data.maxUsers, data.storageLimitGB, data.featureJson, data.createdBy || null]
  );
  return result.rows[0]?.id;
}

export async function updatePlan(id: string, data: {
  name: string;
  priceMonthly: number;
  priceYearly: number;
  maxBranches: number;
  maxUsers: number;
  storageLimitGB: number;
  featureJson: string;
  modifiedBy?: string;
}) {
  await query(
    `
      UPDATE SubscriptionPlans SET
        name = $1, priceMonthly = $2, priceYearly = $3, maxBranches = $4,
        maxUsers = $5, storageLimitGB = $6, featureJson = $7,
        modifiedAt = CURRENT_TIMESTAMP, modifiedBy = $8
      WHERE id = $9
    `,
    [data.name, data.priceMonthly, data.priceYearly, data.maxBranches, data.maxUsers, data.storageLimitGB, data.featureJson, data.modifiedBy || null, id]
  );
}

export async function deletePlan(id: string, deletedBy?: string) {
  await query("UPDATE SubscriptionPlans SET isDeleted = TRUE, deletedAt = CURRENT_TIMESTAMP, deletedBy = $2 WHERE id = $1", [id, deletedBy || null]);
}
