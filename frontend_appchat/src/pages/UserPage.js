import { renderAppShell } from "../components/layout/AppShell.js"
import router from "../router.js"
import { clearAccessToken } from "../config/http.js"
import authService from "../services/authApi.js"
import userService from "../services/userApi.js"

const getPayload = (response) => response?.data ?? response ?? []

const formatDate = (value) => {
  if (!value) return "Unknown"
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

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

const renderUsers = (container, users) => {
  container.querySelector("[data-role='user-count']").textContent = users.length
  container.querySelector("[data-role='user-table']").innerHTML = users.map((user) => `
    <tr>
      <td>
        <div class="identity-cell">
          <span class="avatar">${user.name?.slice(0, 1)?.toUpperCase() || "U"}</span>
          <div>
            <strong>${user.name}</strong>
            <small>${user.id}</small>
          </div>
        </div>
      </td>
      <td>${user.email}</td>
      <td>${formatDate(user.createdAt)}</td>
    </tr>
  `).join("")
}

const userPage = () => {
  const render = async (container) => {
    const shell = renderAppShell(container, {
      activePath: "/users",
      title: "Users",
      subtitle: "Manage registered accounts and keep an eye on who can enter the chat system.",
      content: `
        <div class="metric-grid">
          <article class="metric-card">
            <span>Total users</span>
            <strong data-role="user-count">0</strong>
          </article>
          <article class="metric-card">
            <span>Auth mode</span>
            <strong>JWT + Sessions</strong>
          </article>
        </div>

        <div class="panel">
          <div class="panel-header">
            <div>
              <h2>Member directory</h2>
              <p>Users are created from the register flow.</p>
            </div>
          </div>

          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody data-role="user-table">
                <tr><td colspan="3">Loading users...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      `,
    })

    bindShellEvents(shell)

    try {
      const response = await userService.getUsers()
      renderUsers(shell.body, getPayload(response))
    } catch (error) {
      shell.body.querySelector("[data-role='user-table']").innerHTML = `
        <tr><td colspan="3" class="error-text">${error.message}</td></tr>
      `
    }
  }

  return { render }
}

export default userPage
