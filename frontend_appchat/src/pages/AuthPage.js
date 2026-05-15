import createLoginForm from "../components/auth/LoginForm.js"
import createRegisterForm from "../components/auth/RegisterForm.js"
import router from "../router.js"
import authService from "../services/authApi.js"
import { setAccessToken } from "../config/http.js"

function authPage() {
  let selectedTab = "login"
  let rootContainer = null

  const onSubmitLogin = async (data) => {
    try {
      const response = await authService.login(data)
      setAccessToken(response.data.accessToken)
      router.push("/users", true)
    } catch (error) {
      console.error(error)
    }
  }

  const onSubmitRegister = async (data) => {
    try {
      await authService.register(data)
      selectedTab = "login"
      if (rootContainer) render(rootContainer)
    } catch (error) {
      console.error(error)
    }
  }

  const renderForm = (container) => {
    container.innerHTML = ""

    if (selectedTab === "login") {
      createLoginForm({ onSubmit: onSubmitLogin }).render(container)
    } else {
      createRegisterForm({ onSubmit: onSubmitRegister }).render(container)
    }
  }

  const render = (container) => {
    rootContainer = container
    container.innerHTML = `
      <main class="auth-page">
        <section class="auth-visual">
          <div class="brand auth-brand">
            <div class="brand-mark">AC</div>
            <div>
              <strong>AppChat</strong>
              <span>Secure chat workspace</span>
            </div>
          </div>
          <div class="auth-copy">
            <p class="eyebrow">Control plane</p>
            <h1>Manage people, roles, and API permissions before the chat engine arrives.</h1>
            <p>Auth is wired with access tokens, refresh cookies, RBAC checks, and device sessions.</p>
          </div>
          <div class="signal-list">
            <span>JWT sessions</span>
            <span>RBAC routes</span>
            <span>Refresh flow</span>
          </div>
        </section>

        <section class="auth-card">
          <div class="auth-tabs">
            <button class="tab ${selectedTab === "login" ? "active" : ""}" data-tab="login" type="button">Login</button>
            <button class="tab ${selectedTab === "register" ? "active" : ""}" data-tab="register" type="button">Register</button>
          </div>

          <div class="auth-forms"></div>
        </section>
      </main>
    `

    const authForms = container.querySelector(".auth-forms")
    renderForm(authForms)

    container.querySelectorAll(".tab").forEach((button) => {
      button.addEventListener("click", () => {
        selectedTab = button.dataset.tab
        render(container)
      })
    })
  }

  return { render }
}

export default authPage
