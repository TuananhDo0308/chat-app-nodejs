const createUserList = () => {
  let listEl = null;

  const render = (container, { users = [], loading = false, error = null }) => {
    const wrapper = document.createElement('div');
    wrapper.id = 'user-list';

    if (loading) {
      wrapper.innerHTML = '<p>Đang tải...</p>';
    } else if (error) {
      wrapper.innerHTML = `<p style="color:red">${error}</p>`;
    } else {
      wrapper.innerHTML = `
        <h2>Danh sách Users (${users.length})</h2>
        <ul>
          ${users.map(u => `
            <li data-id="${u.id}">
              <strong>${u.name}</strong> — ${u.email}
            </li>
          `).join('')}
        </ul>
      `;
    }

    listEl = wrapper;
    container.appendChild(wrapper);
  };


  const update = ({ users = [], loading = false, error = null }) => {
    if (loading) {
      listEl.innerHTML = '<p>Đang tải...</p>';
    } else if (error) {
      listEl.innerHTML = `<p style="color:red">${error}</p>`;
    } else {
      listEl.innerHTML = `
      <h2>Danh sách Users (${users.length})</h2>
      <ul>
        ${users.map(u => `
          <li data-id="${u.id}">
            <strong>${u.name}</strong> — ${u.email}
          </li>
        `).join('')}
      </ul>
    `;
  }
  };

  return { render, update };
};

export default createUserList;