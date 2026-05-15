import { renderAppShell } from "../components/layout/AppShell.js"
import router from "../router.js"
import { clearAccessToken } from "../config/http.js"
import authService from "../services/authApi.js"
import roleService from "../services/roleApi.js"

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

const renderRows = (container, roles) => {
  container.querySelector("[data-role='role-count']").textContent = roles.length
  container.querySelector("[data-role='role-table']").innerHTML = roles.map((role) => `
    <tr>
      <td>
        <strong>${role.name}</strong>
        <small>${role.id}</small>
      </td>
      <td>${role.description || "No description"}</td>
      <td class="actions-cell">
        <button class="ghost-button" data-action="edit" data-id="${role.id}" data-name="${role.name}" data-description="${role.description || ""}">Edit</button>
        <button class="danger-button" data-action="delete" data-id="${role.id}">Delete</button>
      </td>
    </tr>
  `).join("")
}

const rolesPage = () => {
  let roles = []

  const loadRoles = async (body) => {
    const response = await roleService.getRoles()
    roles = getPayload(response)
    renderRows(body, roles)
  }

  const render = async (container) => {
    const shell = renderAppShell(container, {
      activePath: "/roles",
      title: "Roles",
      subtitle: "Create access groups such as ADMIN, USER, MODERATOR, or SUPPORT.",
      content: `
        <div class="metric-grid">
          <article class="metric-card">
            <span>Total roles</span>
            <strong data-role="role-count">0</strong>
          </article>
        </div>

        <div class="split-grid">
          <form class="panel stack-form" data-role="role-form">
            <div class="panel-header">
              <div>
                <h2>Create role</h2>
                <p>Use uppercase role names for consistency.</p>
              </div>
            </div>
            <label>
              Name
              <input name="name" placeholder="ADMIN" required />
            </label>
            <label>
              Description
              <textarea name="description" placeholder="Full access to system settings"></textarea>
            </label>
            <button class="primary-button" type="submit">Create role</button>
            <p class="form-error" data-role="role-error"></p>
          </form>

          <div class="panel">
            <div class="panel-header">
              <div>
                <h2>Role list</h2>
                <p>Edit or remove access groups.</p>
              </div>
            </div>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Role</th>
                    <th>Description</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody data-role="role-table">
                  <tr><td colspan="3">Loading roles...</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `,
    })

    bindShellEvents(shell)

    const form = shell.body.querySelector("[data-role='role-form']")
    const errorEl = shell.body.querySelector("[data-role='role-error']")

    form.addEventListener("submit", async (event) => {
      event.preventDefault()
      errorEl.textContent = ""
      const data = Object.fromEntries(new FormData(form))

      try {
        await roleService.createRole(data)
        form.reset()
        await loadRoles(shell.body)
      } catch (error) {
        errorEl.textContent = error.message
      }
    })

    shell.body.addEventListener("click", async (event) => {
      const button = event.target.closest("button[data-action]")
      if (!button) return

      if (button.dataset.action === "delete") {
        await roleService.deleteRole(button.dataset.id)
        await loadRoles(shell.body)
      }

      if (button.dataset.action === "edit") {
        const name = window.prompt("Role name", button.dataset.name)
        if (!name) return
        const description = window.prompt("Description", button.dataset.description || "") || ""
        await roleService.updateRole(button.dataset.id, { name, description })
        await loadRoles(shell.body)
      }
    })

    await loadRoles(shell.body)
  }

  return { render }
}

export default rolesPage
