import http from "../config/http.js"

const permissionService = {
  getPermissions() {
    return http.get("/permissions")
  },
  createPermission(body) {
    return http.post("/permissions", body)
  },
  updatePermission(id, body) {
    return http.patch(`/permissions/${id}`, body)
  },
  deletePermission(id) {
    return http.delete(`/permissions/${id}`)
  },
}

export default permissionService
