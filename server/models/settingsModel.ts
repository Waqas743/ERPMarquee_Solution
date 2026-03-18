import { query, withTransaction } from "../db";

export async function getSettings(tenantId: string) {
  const settings = (await query("SELECT * FROM SystemSettings WHERE tenantId = $1", [tenantId])).rows as any[];
  return settings.reduce((acc: any, curr: any) => {
    acc[curr.key] = curr.value;
    return acc;
  }, {});
}

export async function updateSettings(tenantId: string, settings: Record<string, unknown>) {
  await withTransaction(async (client) => {
    for (const [key, value] of Object.entries(settings)) {
      await query(
        `
          INSERT INTO SystemSettings (tenantId, key, value)
          VALUES ($1, $2, $3)
          ON CONFLICT (tenantId, key) DO UPDATE SET value = EXCLUDED.value
        `,
        [tenantId, key, String(value)],
        client
      );
    }
  });
}
