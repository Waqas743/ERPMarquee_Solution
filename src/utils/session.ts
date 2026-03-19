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

export function hasPermission(permission: string) {
  const user = getCurrentUser();
  if (!user) return false;
  
  // Super admin always has access
  if (user.role === 'super_admin') return true;
  
  // Custom permissions check
  return user.permissions?.includes(permission) || false;
}
