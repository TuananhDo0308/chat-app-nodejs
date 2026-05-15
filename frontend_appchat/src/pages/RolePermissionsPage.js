import { renderAppShell } from "../components/layout/AppShell.js"
import router from "../router.js"
import { clearAccessToken } from "../config/http.js"
import authService from "../services/authApi.js"
import permissionService from "../services/permissionApi.js"
import roleService from "../services/roleApi.js"
import rolePermissionService from "../services/rolePermissionApi.js"

const getPayload = (response) => response?.data ?? response ?? []

const bindShellEvents = (shell) => {
  shell.navButtons.forEach((button) => {
    button.addEventListener("click", () => router.push(button.dataset.path))
  })

  shell.logoutButton.addEventListener("click", async () => {
    try {
      await authService.logout()
    } finally {
      clearAccessToken()
      router.push("/auth", true)
    }
  })
}

const renderMappings = (container, mappings) => {
  container.querySelector("[data-role='mapping-count']").textContent = mappings.length
  container.querySelector("[data-role='mapping-table']").innerHTML = mappings.map((item) => `
    <tr>
      <td>
        <strong>${item.role?.name || item.roleId}</strong>
        <small>${item.roleId}</small>
      </td>
      <td>
        <code>${item.permission?.name || item.permissionId}</code>
        <small>${item.permissionId}</small>
      </td>
      <td class="actions-cell">
        <button class="danger-button" data-action="delete" data-role-id="${item.roleId}" data-permission-id="${item.permissionId}">Remove</button>
      </td>
    </tr>
  `).join("")
}

const rolePermissionsPage = () => {
  let roles = []
  let permissions = []

  const loadMappings = async (body) => {
    const response = await rolePermissionService.getRolePermissions()
    renderMappings(body, getPayload(response))
  }

  const renderSelects = (body) => {
    body.querySelector("[data-role='role-select']").innerHTML = roles.map((role) => `
      <option value="${role.id}">${role.name}</option>
    `).join("")

    body.querySelector("[data-role='permission-select']").innerHTML = permissions.map((permission) => `
      <option value="${permission.id}">${permission.name}</option>
    `).join("")
  }

  const render = async (container) => {
    const shell = renderAppShell(container, {
      activePath: "/role-permissions",
      title: "Role permissions",
      subtitle: "Connect roles to permissions so route guards can make RBAC decisions.",
      content: `
        <div class="metric-grid">
          <article class="metric-card">
            <span>Total links</span>
            <strong data-role="mapping-count">0</strong>
          </article>
        </div>

        <div class="split-grid">
          <form class="panel stack-form" data-role="mapping-form">
            <div class="panel-header">
              <div>
                <h2>Grant permission</h2>
                <p>Select a role and attach one API permission.</p>
              </div>
            </div>
            <label>
              Role
              <select name="roleId" data-role="role-select" required></select>
            </label>
            <label>
              Permission
              <select name="permissionId" data-role="permission-select" required></select>
            </label>
            <button class="primary-button" type="submit">Grant permission</button>
            <p class="form-error" data-role="mapping-error"></p>
          </form>

          <div class="panel">
            <div class="panel-header">
              <div>
                <h2>Granted permissions</h2>
                <p>Each row is one RolePermission record.</p>
              </div>
            </div>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Role</th>
                    <th>Permission</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody data-role="mapping-table">
                  <tr><td colspan="3">Loading mappings...</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `,
    })

    bindShellEvents(shell)

    const [roleResponse, permissionResponse] = await Promise.all([
      roleService.getRoles(),
      permissionService.getPermissions(),
    ])

    roles = getPayload(roleResponse)
    permissions = getPayload(permissionResponse)
    renderSelects(shell.body)

    const form = shell.body.querySelector("[data-role='mapping-form']")
    const errorEl = shell.body.querySelector("[data-role='mapping-error']")

    form.addEventListener("submit", async (event) => {
      event.preventDefault()
      errorEl.textContent = ""
      const data = Object.fromEntries(new FormData(form))

      try {
        await rolePermissionService.createRolePermission(data)
        await loadMappings(shell.body)
      } catch (error) {
        errorEl.textContent = error.message
      }
    })

    shell.body.addEventListener("click", async (event) => {
      const button = event.target.closest("button[data-action='delete']")
      if (!button) return

      await rolePermissionService.deleteRolePermission(
        button.dataset.roleId,
        button.dataset.permissionId
      )
      await loadMappings(shell.body)
    })

    await loadMappings(shell.body)
  }

  return { render }
}

export default rolePermissionsPage
