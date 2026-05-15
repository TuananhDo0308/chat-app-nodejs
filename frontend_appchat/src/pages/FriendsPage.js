import { friendApi } from "../services/friendApi";
import usersService from "../services/userApi";
const friendsPage = () => {
  let users = [];
  let pendingRequests = [];

  const loadData = async () => {
    try {
      const [usersRes, pendingRes] = await Promise.all([
        usersService.getUsers(),
        friendApi.getPendingRequests()
      ]);
      users = usersRes.data;
      pendingRequests = pendingRes.data;
      
      console.log(pendingRes)
      render();
    } catch (err) {
      console.error("Failed to load data", err);
    }
  };

  const handleAddFriend = async (friendId) => {
    try {
      await friendApi.sendRequest(friendId);
      alert("Đã gửi yêu cầu kết bạn!");
      loadData();
    } catch (err) {
      alert("Không thể gửi yêu cầu: " + (err.response?.data?.message || err.message));
    }
  };

  const handleResponse = async (requesterId, status) => {
    try {
      await friendApi.respondRequest(requesterId, status);
      alert(status === 'ACCEPTED' ? "Đã đồng ý!" : "Đã từ chối!");
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const render = () => {
    const container = document.getElementById("friends-page-container");
    if (!container) return;

    container.innerHTML = `
      <div class="friends-mgmt">
        <section class="pending-section">
          <h2>Lời mời kết bạn (${pendingRequests.length})</h2>
          <div class="request-grid">
            ${pendingRequests.length ? pendingRequests.map(req => `
              <div class="request-card">
                <div class="user-info">
                  <div class="avatar">${req.user.name?.charAt(0) || 'U'}</div>
                  <div>
                    <p class="name">${req.user.name || req.user.email}</p>
                    <small>Muốn kết bạn với bạn</small>
                  </div>
                </div>
                <div class="actions">
                  <button class="btn-accept" onclick="window.handleFriendResponse('${req.userId}', 'ACCEPTED')">Đồng ý</button>
                  <button class="btn-reject" onclick="window.handleFriendResponse('${req.userId}', 'REJECTED')">Từ chối</button>
                </div>
              </div>
            `).join("") : '<p class="empty">Không có lời mời nào</p>'}
          </div>
        </section>

        <section class="discover-section">
          <h2>Khám phá mọi người</h2>
          <div class="user-grid">
            ${users.map(user => `
              <div class="user-card">
                <div class="avatar">${user.name?.charAt(0) || 'U'}</div>
                <p class="name">${user.name || user.email}</p>
                <button class="btn-add" onclick="window.handleAddFriend('${user.id}')">Kết bạn</button>
              </div>
            `).join("")}
          </div>
        </section>
      </div>
    `;
  };

  // Gán hàm vào window để gọi từ HTML string
  window.handleAddFriend = handleAddFriend;
  window.handleFriendResponse = handleResponse;

  return {
    render: (el) => {
      el.innerHTML = `<div id="friends-page-container" class="container"></div>`;
      loadData();
    }
  };
};

export default friendsPage;
