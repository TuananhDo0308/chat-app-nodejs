import http from "../config/http.js"

const rolePermissionService = {
  getRolePermissions() {
    return http.get("/role-permissions")
  },
  createRolePermission(body) {
    return http.post("/role-permissions", body)
  },
  deleteRolePermission(roleId, permissionId) {
    return http.delete(`/role-permissions/${roleId}/${permissionId}`, {
      body: JSON.stringify({ roleId, permissionId }),
    })
  },
}

export default rolePermissionService
