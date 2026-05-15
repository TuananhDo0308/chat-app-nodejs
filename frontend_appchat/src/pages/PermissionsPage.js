import { renderAppShell } from "../components/layout/AppShell.js"
import router from "../router.js"
import { clearAccessToken } from "../config/http.js"
import authService from "../services/authApi.js"
import permissionService from "../services/permissionApi.js"

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

const renderRows = (container, permissions) => {
  container.querySelector("[data-role='permission-count']").textContent = permissions.length
  container.querySelector("[data-role='permission-table']").innerHTML = permissions.map((permission) => `
    <tr>
      <td>
        <code>${permission.name}</code>
        <small>${permission.id}</small>
      </td>
      <td>${permission.description || "No description"}</td>
      <td class="actions-cell">
        <button class="ghost-button" data-action="edit" data-id="${permission.id}" data-name="${permission.name}" data-description="${permission.description || ""}">Edit</button>
        <button class="danger-button" data-action="delete" data-id="${permission.id}">Delete</button>
      </td>
    </tr>
  `).join("")
}

const permissionsPage = () => {
  const loadPermissions = async (body) => {
    const response = await permissionService.getPermissions()
    renderRows(body, getPayload(response))
  }

  const render = async (container) => {
    const shell = renderAppShell(container, {
      activePath: "/permissions",
      title: "Permissions",
      subtitle: "Define the API capabilities that roles can receive.",
      content: `
        <div class="metric-grid">
          <article class="metric-card">
            <span>Total permissions</span>
            <strong data-role="permission-count">0</strong>
          </article>
        </div>

        <div class="split-grid">
          <form class="panel stack-form" data-role="permission-form">
            <div class="panel-header">
              <div>
                <h2>Create permission</h2>
                <p>Match names with constants used in route guards.</p>
              </div>
            </div>
            <label>
              Name
              <input name="name" placeholder="USER_READ" required />
            </label>
            <label>
              Description
              <textarea name="description" placeholder="Can view users"></textarea>
            </label>
            <button class="primary-button" type="submit">Create permission</button>
            <p class="form-error" data-role="permission-error"></p>
          </form>

          <div class="panel">
            <div class="panel-header">
              <div>
                <h2>Permission list</h2>
                <p>These names are what checkPermission reads.</p>
              </div>
            </div>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Permission</th>
                    <th>Description</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody data-role="permission-table">
                  <tr><td colspan="3">Loading permissions...</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `,
    })

    bindShellEvents(shell)

    const form = shell.body.querySelector("[data-role='permission-form']")
    const errorEl = shell.body.querySelector("[data-role='permission-error']")

    form.addEventListener("submit", async (event) => {
      event.preventDefault()
      errorEl.textContent = ""
      const data = Object.fromEntries(new FormData(form))

      try {
        await permissionService.createPermission(data)
        form.reset()
        await loadPermissions(shell.body)
      } catch (error) {
        errorEl.textContent = error.message
      }
    })

    shell.body.addEventListener("click", async (event) => {
      const button = event.target.closest("button[data-action]")
      if (!button) return

      if (button.dataset.action === "delete") {
        await permissionService.deletePermission(button.dataset.id)
        await loadPermissions(shell.body)
      }

      if (button.dataset.action === "edit") {
        const name = window.prompt("Permission name", button.dataset.name)
        if (!name) return
        const description = window.prompt("Description", button.dataset.description || "") || ""
        await permissionService.updatePermission(button.dataset.id, { name, description })
        await loadPermissions(shell.body)
      }
    })

    await loadPermissions(shell.body)
  }

  return { render }
}

export default permissionsPage
