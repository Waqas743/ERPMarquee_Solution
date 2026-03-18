export function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("adminUser") || "{}");
  } catch {
    return {};
  }
}

export function getTenantId() {
  const user = getCurrentUser();
  return user?.tenantId ?? "";
}
