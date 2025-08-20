// frontend/src/lib/auth-utils.ts

// Check if current user is super admin
export const isSuperAdmin = (): boolean => {
  if (typeof window !== 'undefined') {
    const userRole = localStorage.getItem('user_role');
    return userRole === 'super_admin';
  }
  return false;
};

// Get current user role
export const getCurrentUserRole = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('user_role');
  }
  return null;
};

// Check if user has admin privileges (super_admin or admin)
export const hasAdminAccess = (): boolean => {
  const role = getCurrentUserRole();
  return role === 'super_admin' || role === 'admin';
};
