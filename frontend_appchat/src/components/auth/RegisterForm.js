function createRegisterForm({ onSubmit }) {
    let formEl = null;

    const render = (container) => {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = `
      <form class="auth-form" id="register-form">
        <div>
          <h2>Create account</h2>
          <p>Register a user and assign the default USER role.</p>
        </div>
        <label>
          Name
          <input type="text" name="name" placeholder="Tuan Anh" required />
        </label>
        <label>
          Email
          <input type="email" name="email" placeholder="you@appchat.dev" required />
        </label>
        <label>
          Password
          <input type="password" name="password" placeholder="At least 8 characters" required />
        </label>
        <button class="primary-button" type="submit">Register</button>
        <p class="form-error"></p>
      </form>
    `;

        formEl = wrapper.querySelector("#register-form");
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

export default createRegisterForm;
