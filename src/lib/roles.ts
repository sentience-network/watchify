export type UserRole = "user" | "mod" | "admin";

export function isStaffRole(role: string | null | undefined): boolean {
  return role === "mod" || role === "admin";
}
