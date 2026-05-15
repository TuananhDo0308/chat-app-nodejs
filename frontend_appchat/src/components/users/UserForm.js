const createUserForm = ({ onSubmit }) => {
  let formEl = null;

  const render = (container) => {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
      <form id="user-form">
        <h2>Tạo User</h2>
        <input type="text" name="name" placeholder="Tên" required />
        <input type="email" name="email" placeholder="Email" required />
        <button type="submit">Tạo</button>
        <p class="form-error" style="display:none; color:red;"></p>
      </form>
    `;

    formEl = wrapper.querySelector("#user-form");
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
};

export default createUserForm;
