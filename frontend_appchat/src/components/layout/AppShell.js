const navItems = [
  { path: "/friends", label: "Bạn bè", hint: "Kết bạn & lời mời" },
  { path: "/chat", label: "Chat", hint: "Nhắn tin trực tiếp" },
  { path: "/users", label: "Users", hint: "Members" },
  { path: "/roles", label: "Roles", hint: "Access groups" },
  { path: "/permissions", label: "Permissions", hint: "API rules" },
  { path: "/role-permissions", label: "Role Permissions", hint: "RBAC links" },
]

export function renderAppShell(container, options) {
  const {
    activePath,
    title,
    subtitle,
    content = "",
  } = options

  container.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand">
          <div class="brand-mark">AC</div>
          <div>
            <strong>AppChat</strong>
            <span>Admin console</span>
          </div>
        </div>

        <nav class="side-nav" aria-label="Main navigation">
          ${navItems.map((item) => `
            <button class="nav-item ${activePath === item.path ? "active" : ""}" data-path="${item.path}">
              <span>${item.label}</span>
              <small>${item.hint}</small>
            </button>
          `).join("")}
        </nav>

        <button class="logout-button" type="button" data-action="logout">Logout</button>
      </aside>

      <main class="workspace">
        <header class="workspace-header">
          <div>
            <p class="eyebrow">Secure chat control room</p>
            <h1>${title}</h1>
            <p>${subtitle}</p>
          </div>
        </header>

        <section class="workspace-body">
          ${content}
        </section>
      </main>
    </div>
  `

  return {
    body: container.querySelector(".workspace-body"),
    logoutButton: container.querySelector("[data-action='logout']"),
    navButtons: container.querySelectorAll(".nav-item"),
  }
}
