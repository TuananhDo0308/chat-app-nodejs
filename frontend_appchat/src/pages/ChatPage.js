import { getSocket } from "../config/socket.js";
import { friendApi } from "../services/friendApi.js";
import { messageApi } from "../services/messageApi.js";
import router from "../router.js";
import * as e2ee from "../crypto/e2ee.js";

const chatPage = () => {
  let friends = [];
  let currentFriend = null;
  let messages = [];
  // In-memory only: msgId → plaintext (resets on page reload)
  let decryptedCache = new Map();
  let myUser = JSON.parse(localStorage.getItem("user") || "{}");
  let socket = null;

  // ─── Friends ────────────────────────────────────────────────────────────────

  const loadFriends = async () => {
    try {
      const res = await friendApi.getFriends();
      friends = res?.data ?? [];
      renderFriendsList();
    } catch (err) {
      console.error("Failed to load friends", err);
    }
  };

  const selectFriend = async (friend) => {
    currentFriend = friend;
    decryptedCache.clear();
    messages = [];
    renderFriendsList();
    renderChatWindow();
    try {
      const res = await messageApi.getMessages(myUser.id, friend.id);
      messages = res?.data ?? [];
      await _decryptAll(messages);
      renderMessages();
    } catch (err) {
      console.error("Failed to load messages", err);
    }
  };

  // ─── Decrypt ────────────────────────────────────────────────────────────────

  const _decryptAll = async (msgs) => {
    for (const msg of msgs) {
      if (decryptedCache.has(msg.id)) continue;
      decryptedCache.set(msg.id, await _decryptOne(msg));
    }
  };

  const _decryptOne = async (msg) => {
    if (msg.senderId === myUser.id) return null; // own messages: rendered differently
    if (!e2ee.isE2EEEnvelope(msg.content)) return msg.content;
    try {
      return await e2ee.decrypt(msg.senderId, msg.content);
    } catch (err) {
      console.error("Decrypt error:", err);
      return "🔒 [Không thể giải mã]";
    }
  };

  // ─── Send ───────────────────────────────────────────────────────────────────

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!currentFriend || !socket) return;

    const input = document.getElementById("chat-input");
    const plaintext = input.value.trim();
    if (!plaintext) return;

    input.value = "";
    input.disabled = true;

    try {
      const encryptedContent = await e2ee.encrypt(currentFriend.id, plaintext);
      socket.emit("send_private_message", {
        senderId: myUser.id,
        receiverId: currentFriend.id,
        content: encryptedContent,
      });
      // Store plaintext by encrypted content temporarily until server confirms ID
      _pendingByContent.set(encryptedContent, plaintext);
    } catch (err) {
      console.error("Encrypt failed:", err);
      input.value = plaintext;
    } finally {
      input.disabled = false;
      input.focus();
    }
  };

  // Temp map: encryptedContent → plaintext, resolved when message_sent fires
  const _pendingByContent = new Map();

  // ─── Socket ──────────────────────────────────────────────────────────────────

  const handleMessageSent = (msg) => {
    const plaintext = _pendingByContent.get(msg.content);
    if (plaintext !== undefined) {
      _pendingByContent.delete(msg.content);
      decryptedCache.set(msg.id, plaintext);
    }

    if (
      currentFriend &&
      (msg.senderId === currentFriend.id || msg.receiverId === currentFriend.id)
    ) {
      if (!messages.find((m) => m.id === msg.id)) messages.push(msg);
      renderMessages();
    }
  };

  const handleReceiveMessage = async (msg) => {
    if (
      !currentFriend ||
      (msg.senderId !== currentFriend.id && msg.receiverId !== currentFriend.id)
    ) return;

    const plaintext = await _decryptOne(msg);
    decryptedCache.set(msg.id, plaintext);

    if (!messages.find((m) => m.id === msg.id)) messages.push(msg);
    renderMessages();
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  const renderFriendsList = () => {
    const list = document.getElementById("friends-list");
    if (!list) return;

    if (!friends.length) {
      list.innerHTML = `
        <div style="padding:24px;text-align:center;color:#65676b">
          <p>Chưa có bạn bè nào</p>
          <button onclick="window.__chatGoFriends()"
            style="margin-top:8px;padding:8px 16px;border:none;border-radius:8px;
                   background:#0084ff;color:#fff;cursor:pointer;font-weight:600">
            Thêm bạn bè
          </button>
        </div>`;
      return;
    }

    list.innerHTML = friends
      .map((f) => `
        <div class="friend-item ${currentFriend?.id === f.id ? "active" : ""}">
          <div class="avatar">${f.name?.charAt(0)?.toUpperCase() || "U"}</div>
          <div class="friend-info">
            <span class="name">${f.name || f.email}</span>
            <small class="status">🔒 E2EE</small>
          </div>
        </div>`)
      .join("");

    list.querySelectorAll(".friend-item").forEach((item, i) => {
      item.onclick = () => selectFriend(friends[i]);
    });
  };

  const renderMessages = () => {
    const list = document.getElementById("chat-messages");
    if (!list) return;

    list.innerHTML = messages
      .map((msg) => {
        const isOwn = msg.senderId === myUser.id;
        const text = isOwn
          ? (decryptedCache.get(msg.id) ?? "...")
          : (decryptedCache.get(msg.id) ?? "...");
        return `
          <div class="message ${isOwn ? "own" : ""}">
            <div class="msg-bubble">
              <p>${escapeHtml(text)}</p>
              <span class="msg-time">${new Date(msg.createdAt).toLocaleTimeString()}</span>
            </div>
          </div>`;
      })
      .join("");

    list.scrollTop = list.scrollHeight;
  };

  const renderChatWindow = () => {
    const win = document.getElementById("chat-window");
    if (!win) return;

    if (!currentFriend) {
      win.innerHTML = `<div class="chat-empty-state">Chọn một người bạn để bắt đầu trò chuyện</div>`;
      return;
    }

    win.innerHTML = `
      <header class="chat-header">
        <div class="chat-user-info">
          <div class="avatar">${currentFriend.name?.charAt(0)?.toUpperCase() || "U"}</div>
          <div>
            <h3>${currentFriend.name || currentFriend.email}</h3>
            <span style="color:#0f766e;font-size:0.78rem;font-weight:700">🔒 End-to-end encrypted</span>
          </div>
        </div>
      </header>
      <div id="chat-messages" class="chat-messages"></div>
      <form id="chat-form" class="chat-input-area">
        <input type="text" id="chat-input" placeholder="Aa" autocomplete="off">
        <button type="submit">Gửi</button>
      </form>`;

    win.querySelector("#chat-form").addEventListener("submit", sendMessage);
  };

  // ─── Bootstrap ───────────────────────────────────────────────────────────────

  const render = (container) => {
    const token = localStorage.getItem("token");
    socket = getSocket(token);

    if (socket) {
      socket.off("receive_private_message");
      socket.off("message_sent");
      socket.on("receive_private_message", handleReceiveMessage);
      socket.on("message_sent", handleMessageSent);
    }

    window.__chatGoFriends = () => router.push("/friends");

    container.innerHTML = `
      <div class="chat-container">
        <aside class="chat-sidebar">
          <div class="sidebar-header"
               style="display:flex;align-items:center;justify-content:space-between">
            <h2>Đoạn chat</h2>
            <button onclick="window.__chatGoFriends()" title="Thêm bạn bè"
              style="border:none;background:none;cursor:pointer;font-size:1.2rem;color:#0084ff">＋</button>
          </div>
          <div id="friends-list" class="friends-list">
            <div style="padding:16px;color:#65676b">Đang tải...</div>
          </div>
        </aside>
        <main id="chat-window" class="chat-main">
          <div class="chat-empty-state">Chọn một người bạn để bắt đầu trò chuyện</div>
        </main>
      </div>`;

    loadFriends();
  };

  return { render };
};

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export default chatPage;
