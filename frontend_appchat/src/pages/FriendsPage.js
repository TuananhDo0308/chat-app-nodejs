import { renderAppShell } from "../components/layout/AppShell.js";
import router from "../router.js";
import { clearAccessToken } from "../config/http.js";
import authService from "../services/authApi.js";
import { friendApi } from "../services/friendApi.js";
import usersService from "../services/userApi.js";

const friendsPage = () => {
  let allUsers = [];
  let friends = [];
  let pendingRequests = [];
  let sentRequests = [];
  let searchQuery = "";
  let myUser = JSON.parse(localStorage.getItem("user") || "{}");
  let shellBody = null;

  const loadData = async () => {
    try {
      const [usersRes, friendsRes, pendingRes, sentRes] = await Promise.all([
        usersService.getUsers(),
        friendApi.getFriends(),
        friendApi.getPendingRequests(),
        friendApi.getSentRequests(),
      ]);
      allUsers = usersRes?.data ?? [];
      friends = friendsRes?.data ?? [];
      pendingRequests = pendingRes?.data ?? [];
      sentRequests = sentRes?.data ?? [];
      renderContent();
    } catch (err) {
      console.error("Failed to load data", err);
    }
  };

  const handleAddFriend = async (friendId) => {
    try {
      await friendApi.sendRequest(friendId);
      await loadData();
    } catch (err) {
      alert("Không thể gửi yêu cầu: " + (err.message || "Lỗi không xác định"));
    }
  };

  const handleRespond = async (requesterId, status) => {
    try {
      await friendApi.respondRequest(requesterId, status);
      await loadData();
    } catch (err) {
      console.error("Failed to respond", err);
    }
  };

  const handleCancelRequest = async (friendId) => {
    try {
      await friendApi.deleteFriend(friendId);
      await loadData();
    } catch (err) {
      console.error("Failed to cancel request", err);
    }
  };

  const handleDeleteFriend = async (friendId) => {
    if (!confirm("Bỏ kết bạn với người này?")) return;
    try {
      await friendApi.deleteFriend(friendId);
      await loadData();
    } catch (err) {
      console.error("Failed to delete friend", err);
    }
  };

  const getDiscoverUsers = () => {
    const friendIds = new Set(friends.map((f) => f.id));
    const pendingFromIds = new Set(pendingRequests.map((r) => r.userId));
    const sentToIds = new Set(sentRequests.map((r) => r.friendId));
    return allUsers.filter((u) => {
      if (u.id === myUser?.id) return false;
      if (friendIds.has(u.id)) return false;
      if (pendingFromIds.has(u.id)) return false;
      if (sentToIds.has(u.id)) return false;
      if (searchQuery && !u.name?.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !u.email?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  };

  const renderPendingSection = () => {
    if (!pendingRequests.length) return "";
    return `
      <div class="panel friends-pending-panel">
        <div class="panel-header">
          <div>
            <h2>Lời mời kết bạn</h2>
            <p>${pendingRequests.length} lời mời đang chờ</p>
          </div>
        </div>
        <div class="friends-request-grid">
          ${pendingRequests.map((req) => `
            <div class="friend-request-card">
              <div class="friend-request-info">
                <span class="avatar friends-avatar">${req.user?.name?.charAt(0)?.toUpperCase() || "U"}</span>
                <div>
                  <strong>${req.user?.name || "Người dùng"}</strong>
                  <small>${req.user?.email || ""}</small>
                </div>
              </div>
              <div class="friend-request-actions">
                <button class="primary-button" onclick="window.__friendAccept('${req.userId}')">Đồng ý</button>
                <button class="ghost-button" onclick="window.__friendReject('${req.userId}')">Từ chối</button>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  };

  const renderContent = () => {
    if (!shellBody) return;
    const discoverUsers = getDiscoverUsers();

    shellBody.innerHTML = `
      ${renderPendingSection()}

      <div class="split-grid">
        <!-- Danh sách bạn bè -->
        <div class="panel">
          <div class="panel-header">
            <div>
              <h2>Bạn bè</h2>
              <p>${friends.length} người</p>
            </div>
            ${friends.length ? `<button class="ghost-button" onclick="window.__goChat()">Nhắn tin →</button>` : ""}
          </div>
          ${friends.length ? `
            <div class="friends-list-panel">
              ${friends.map((f) => `
                <div class="friends-list-item">
                  <span class="avatar friends-avatar-sm">${f.name?.charAt(0)?.toUpperCase() || "U"}</span>
                  <div class="friends-list-info">
                    <strong>${f.name || "Người dùng"}</strong>
                    <small>${f.email || ""}</small>
                  </div>
                  <div class="friends-list-actions">
                    <button class="ghost-button" onclick="window.__goChat()">Chat</button>
                    <button class="danger-button" onclick="window.__friendDelete('${f.id}')">Xóa</button>
                  </div>
                </div>
              `).join("")}
            </div>
          ` : `<p style="color:var(--muted);text-align:center;padding:24px 0">Chưa có bạn bè nào</p>`}

          ${sentRequests.length ? `
            <div style="margin-top:16px;border-top:1px solid var(--line);padding-top:16px">
              <p style="font-size:13px;font-weight:800;color:var(--muted);margin-bottom:10px">Đã gửi lời mời (${sentRequests.length})</p>
              ${sentRequests.map((r) => `
                <div class="friends-list-item">
                  <span class="avatar friends-avatar-sm" style="background:var(--accent)">${r.friend?.name?.charAt(0)?.toUpperCase() || "U"}</span>
                  <div class="friends-list-info">
                    <strong>${r.friend?.name || "Người dùng"}</strong>
                    <small>Đang chờ xác nhận</small>
                  </div>
                  <button class="danger-button" onclick="window.__friendCancel('${r.friendId}')">Hủy</button>
                </div>
              `).join("")}
            </div>
          ` : ""}
        </div>

        <!-- Khám phá -->
        <div class="panel">
          <div class="panel-header">
            <div>
              <h2>Khám phá mọi người</h2>
              <p>${discoverUsers.length} người có thể kết bạn</p>
            </div>
          </div>
          <div style="margin-bottom:16px">
            <input
              type="text"
              id="friends-search"
              placeholder="Tìm kiếm theo tên hoặc email..."
              value="${searchQuery}"
            />
          </div>
          ${discoverUsers.length ? `
            <div class="friends-discover-grid">
              ${discoverUsers.map((u) => `
                <div class="friends-discover-card">
                  <span class="avatar friends-avatar">${u.name?.charAt(0)?.toUpperCase() || "U"}</span>
                  <div class="friends-discover-info">
                    <strong>${u.name || "Người dùng"}</strong>
                    <small>${u.email || ""}</small>
                  </div>
                  <button class="primary-button" onclick="window.__friendAdd('${u.id}')">+ Kết bạn</button>
                </div>
              `).join("")}
            </div>
          ` : `<p style="color:var(--muted);text-align:center;padding:24px 0">
            ${searchQuery ? "Không tìm thấy người dùng phù hợp" : "Bạn đã kết bạn với tất cả mọi người!"}
          </p>`}
        </div>
      </div>
    `;

    const searchInput = shellBody.querySelector("#friends-search");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        searchQuery = e.target.value;
        renderContent();
      });
    }
  };

  const render = (container) => {
    const shell = renderAppShell(container, {
      activePath: "/friends",
      title: "Bạn bè",
      subtitle: "Kết bạn và nhắn tin với mọi người.",
      content: `<div class="loading" style="padding:32px;color:var(--muted)">Đang tải...</div>`,
    });

    shellBody = shell.body;

    shell.navButtons.forEach((btn) => {
      btn.addEventListener("click", () => router.push(btn.dataset.path));
    });
    shell.logoutButton.addEventListener("click", async () => {
      try { await authService.logout(); } finally {
        clearAccessToken();
        localStorage.removeItem("user");
        router.push("/auth", true);
      }
    });

    window.__friendAdd = handleAddFriend;
    window.__friendAccept = (id) => handleRespond(id, "ACCEPTED");
    window.__friendReject = (id) => handleRespond(id, "REJECTED");
    window.__friendCancel = handleCancelRequest;
    window.__friendDelete = handleDeleteFriend;
    window.__goChat = () => router.push("/chat");

    loadData();
  };

  return { render };
};

export default friendsPage;
