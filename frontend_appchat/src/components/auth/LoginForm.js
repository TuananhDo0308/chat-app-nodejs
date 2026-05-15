function createLoginForm({ onSubmit }) {
    let formEl = null;

    const render = (container) => {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = `
      <form class="auth-form" id="login-form">
        <div>
          <h2>Welcome back</h2>
          <p>Sign in to manage your chat workspace.</p>
        </div>
        <label>
          Email
          <input type="email" name="email" placeholder="you@appchat.dev" required />
        </label>
        <label>
          Password
          <input type="password" name="password" placeholder="Your password" required />
        </label>
        <button class="primary-button" type="submit">Login</button>
        <p class="form-error"></p>
      </form>
    `;

        formEl = wrapper.querySelector("#login-form");
        formEl.addEventListener("submit", (e) => {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(e.target));
            onSubmit(data);
        });

        container.appendChild(wrapper);
    };

    const showError = (message) => {
        const errorEl = formEl.querySelector(".form-error");
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.style.display = "block";
        }
    };

    const reset = () => {
        formEl.reset();
    };

    return { render, showError, reset };
}

export default createLoginForm;
