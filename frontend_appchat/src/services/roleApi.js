import http from "../config/http.js"

const roleService = {
  getRoles() {
    return http.get("/roles")
  },
  createRole(body) {
    return http.post("/roles", body)
  },
  updateRole(id, body) {
    return http.put(`/roles/${id}`, body)
  },
  deleteRole(id) {
    return http.delete(`/roles/${id}`)
  },
}

export default roleService
