import { getSocket } from "../config/socket.js";
import { friendApi } from "../services/friendApi.js";
import { messageApi } from "../services/messageApi.js";
import router from "../router.js";
import * as e2ee from "../crypto/e2ee.js";

// Module-level pending map: encryptedContent → plaintext
// Must persist across renders so message_sent handler can resolve it
const _pendingByContent = new Map();

const chatPage = () => {
  let friends = [];
  let currentFriend = null;
  let messages = [];
  let decryptedCache = new Map(); // msgId → plaintext
  let onlineUsers = new Set();
  let typingFriends = new Map(); // friendId → timeoutId
  let unreadCounts = new Map(); // friendId → count
  let previewTexts = new Map(); // friendId → {text, time, isMine}
  let lastReadMsgId = null; // last msg id that friend has seen (of my sent messages)
  let myUser = JSON.parse(localStorage.getItem("user") || "{}");
  let socket = null;
  let isSendingTyping = false;
  let typingTimeout = null;
  let searchQuery = "";

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    const h = String(d.getHours()).padStart(2, "0");
    const m = String(d.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  };

  const formatPreviewTime = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    const sameDay =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();

    if (sameDay) {
      return formatTime(dateStr);
    }

    if (diffDays < 7) {
      const days = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
      return days[d.getDay()];
    }

    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${dd}/${mm}`;
  };

  const formatDateDivider = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    const sameDay =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();

    if (sameDay) return "Hôm nay";
    if (diffDays === 1) return "Hôm qua";
    if (diffDays < 7) {
      const days = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
      return days[d.getDay()];
    }
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  // ─── Friends ────────────────────────────────────────────────────────────────

  const loadFriends = async () => {
    try {
      const res = await friendApi.getFriends();
      friends = res?.data ?? [];
      renderSidebar();
    } catch (err) {
      console.error("Failed to load friends", err);
    }
  };

  // ─── Previews ────────────────────────────────────────────────────────────────

  const loadPreviews = async () => {
    try {
      const res = await messageApi.getPreviews(myUser.id);
      const previews = res?.data ?? [];
      await Promise.all(
        previews.map(async (msg) => {
          const partnerId = msg.senderId === myUser.id ? msg.receiverId : msg.senderId;
          let text = msg.content;
          if (e2ee.isE2EEEnvelope(msg.content)) {
            try {
              text = await e2ee.decrypt(partnerId, msg.content);
            } catch {
              text = "🔒";
            }
          }
          previewTexts.set(partnerId, {
            text,
            time: msg.createdAt,
            isMine: msg.senderId === myUser.id,
          });
          // Set unread count: if the latest msg from friend is unread
          if (msg.receiverId === myUser.id && !msg.isRead) {
            if (!unreadCounts.has(partnerId)) {
              unreadCounts.set(partnerId, 1);
            }
          }
        })
      );
      renderSidebar();
    } catch (err) {
      console.error("Failed to load previews", err);
    }
  };

  // ─── Select friend ───────────────────────────────────────────────────────────

  const selectFriend = async (friend) => {
    currentFriend = friend;
    unreadCounts.delete(friend.id);
    lastReadMsgId = null;

    if (socket) {
      socket.emit("mark_read", { friendId: friend.id });
    }

    decryptedCache.clear();
    messages = [];

    renderSidebar();
    renderChatWindow();

    try {
      const res = await messageApi.getMessages(myUser.id, friend.id);
      messages = res?.data ?? [];
      await _decryptAll(messages);
      renderMessages();
      scrollToBottom();
    } catch (err) {
      console.error("Failed to load messages", err);
    }
  };

  // ─── Decrypt ────────────────────────────────────────────────────────────────

  const _decryptAll = async (msgs) => {
    for (const msg of msgs) {
      if (decryptedCache.has(msg.id)) continue;
      if (msg.senderId === myUser.id) {
        // For own messages: check _pendingByContent first, else fallback
        const fromPending = _pendingByContent.get(msg.content);
        if (fromPending !== undefined) {
          decryptedCache.set(msg.id, fromPending);
        } else {
          decryptedCache.set(msg.id, null); // will show "Tin nhắn đã gửi"
        }
      } else {
        if (!e2ee.isE2EEEnvelope(msg.content)) {
          decryptedCache.set(msg.id, msg.content);
        } else {
          try {
            const plaintext = await e2ee.decrypt(msg.senderId, msg.content);
            decryptedCache.set(msg.id, plaintext);
          } catch {
            decryptedCache.set(msg.id, "🔒");
          }
        }
      }
    }
  };

  const _decryptOne = async (msg) => {
    if (msg.senderId === myUser.id) {
      return null;
    }
    if (!e2ee.isE2EEEnvelope(msg.content)) return msg.content;
    try {
      return await e2ee.decrypt(msg.senderId, msg.content);
    } catch {
      return "🔒";
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

    // Stop typing
    if (isSendingTyping) {
      socket.emit("stop_typing", { receiverId: currentFriend.id });
      isSendingTyping = false;
      if (typingTimeout) {
        clearTimeout(typingTimeout);
        typingTimeout = null;
      }
    }

    try {
      const encryptedContent = await e2ee.encrypt(currentFriend.id, plaintext);
      _pendingByContent.set(encryptedContent, plaintext);
      socket.emit("send_private_message", {
        senderId: myUser.id,
        receiverId: currentFriend.id,
        content: encryptedContent,
      });
    } catch (err) {
      console.error("Encrypt failed:", err);
      input.value = plaintext;
    } finally {
      input.disabled = false;
      input.focus();
    }
  };

  // ─── Typing ──────────────────────────────────────────────────────────────────

  const handleInputTyping = () => {
    if (!currentFriend || !socket) return;

    if (!isSendingTyping) {
      socket.emit("typing", { receiverId: currentFriend.id });
      isSendingTyping = true;
    }

    if (typingTimeout) clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      socket.emit("stop_typing", { receiverId: currentFriend.id });
      isSendingTyping = false;
      typingTimeout = null;
    }, 2000);
  };

  // ─── Scroll ──────────────────────────────────────────────────────────────────

  const scrollToBottom = () => {
    const el = document.getElementById("chat-messages");
    if (el) el.scrollTop = el.scrollHeight;
  };

  // ─── Update preview ──────────────────────────────────────────────────────────

  const updatePreview = (msg, plaintext, isMine) => {
    const partnerId = isMine ? msg.receiverId : msg.senderId;
    previewTexts.set(partnerId, {
      text: plaintext ?? "Tin nhắn đã gửi",
      time: msg.createdAt,
      isMine,
    });
  };

  // ─── Socket handlers ─────────────────────────────────────────────────────────

  const handleUsersOnline = (userIds) => {
    onlineUsers = new Set(userIds);
    renderSidebar();
    renderHeader();
  };

  const handleUserOnline = (userId) => {
    onlineUsers.add(userId);
    renderSidebar();
    renderHeader();
  };

  const handleUserOffline = (userId) => {
    onlineUsers.delete(userId);
    renderSidebar();
    renderHeader();
  };

  const handleTyping = ({ senderId }) => {
    if (senderId !== currentFriend?.id) return;

    // Clear existing timeout for this friend
    if (typingFriends.has(senderId)) {
      clearTimeout(typingFriends.get(senderId));
    }

    const tid = setTimeout(() => {
      typingFriends.delete(senderId);
      renderMessages();
      scrollToBottom();
    }, 3000);

    typingFriends.set(senderId, tid);
    renderMessages();
    scrollToBottom();
  };

  const handleStopTyping = ({ senderId }) => {
    if (senderId !== currentFriend?.id) return;

    if (typingFriends.has(senderId)) {
      clearTimeout(typingFriends.get(senderId));
      typingFriends.delete(senderId);
    }
    renderMessages();
  };

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
      scrollToBottom();
    }

    updatePreview(msg, plaintext, true);
    renderSidebar();
  };

  const handleReceiveMessage = async (msg) => {
    const isCurrentConvo =
      currentFriend &&
      (msg.senderId === currentFriend.id || msg.receiverId === currentFriend.id);

    const plaintext = await _decryptOne(msg);
    decryptedCache.set(msg.id, plaintext);

    if (isCurrentConvo) {
      if (!messages.find((m) => m.id === msg.id)) messages.push(msg);
      // Mark read immediately
      if (socket) {
        socket.emit("mark_read", { friendId: msg.senderId });
      }
      renderMessages();
      scrollToBottom();
    } else {
      // Increment unread count
      const partnerId = msg.senderId;
      unreadCounts.set(partnerId, (unreadCounts.get(partnerId) || 0) + 1);
    }

    updatePreview(msg, plaintext, false);
    renderSidebar();
  };

  const handleMessagesRead = ({ readBy }) => {
    if (readBy !== currentFriend?.id) return;

    // Find last sent message id
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].senderId === myUser.id) {
        lastReadMsgId = messages[i].id;
        break;
      }
    }
    renderMessages();
  };

  // ─── Render helpers ──────────────────────────────────────────────────────────

  const getAvatarInitial = (person) => {
    return (person?.name || person?.email || "U").charAt(0).toUpperCase();
  };

  // ─── Render sidebar ──────────────────────────────────────────────────────────

  const renderSidebar = () => {
    const sidebar = document.getElementById("chat-sidebar");
    if (!sidebar) return;

    const filteredFriends = searchQuery
      ? friends.filter((f) => {
          const q = searchQuery.toLowerCase();
          return (
            (f.name || "").toLowerCase().includes(q) ||
            (f.email || "").toLowerCase().includes(q)
          );
        })
      : friends;

    let friendsHtml = "";
    if (!filteredFriends.length) {
      if (!friends.length) {
        friendsHtml = `
          <div style="padding:24px;text-align:center;color:#65676b">
            <p>Chưa có bạn bè nào</p>
            <button onclick="window.__chatGoFriends()"
              style="margin-top:8px;padding:8px 16px;border:none;border-radius:20px;
                     background:#0084ff;color:#fff;cursor:pointer;font-weight:600;font-size:14px">
              Thêm bạn bè
            </button>
          </div>`;
      } else {
        friendsHtml = `<div style="padding:16px;text-align:center;color:#8a8d91;font-size:14px">Không tìm thấy kết quả</div>`;
      }
    } else {
      friendsHtml = filteredFriends
        .map((f) => {
          const isActive = currentFriend?.id === f.id;
          const isOnline = onlineUsers.has(f.id);
          const unread = unreadCounts.get(f.id) || 0;
          const preview = previewTexts.get(f.id);
          const previewText = preview
            ? (preview.isMine ? "Bạn: " : "") + escapeHtml(preview.text || "")
            : "";
          const previewTime = preview ? formatPreviewTime(preview.time) : "";
          const hasUnread = unread > 0;

          return `
            <div class="friend-item ${isActive ? "active" : ""}" data-friend-id="${f.id}">
              <div class="friend-avatar-wrap">
                <div class="chat-avatar">${escapeHtml(getAvatarInitial(f))}</div>
                ${isOnline ? '<div class="online-dot"></div>' : ""}
              </div>
              <div class="friend-meta">
                <div class="friend-meta-top">
                  <span class="friend-meta-name">${escapeHtml(f.name || f.email)}</span>
                  <span class="friend-meta-time">${previewTime}</span>
                </div>
                <div class="friend-meta-bottom">
                  <span class="friend-meta-preview ${hasUnread ? "unread" : ""}">${previewText}</span>
                  ${hasUnread ? `<span class="unread-badge">${unread > 99 ? "99+" : unread}</span>` : ""}
                </div>
              </div>
            </div>`;
        })
        .join("");
    }

    sidebar.innerHTML = `
      <div class="sidebar-header">
        <h2>Đoạn chat</h2>
        <button onclick="window.__chatGoFriends()" title="Thêm bạn bè"
          style="border:none;background:none;cursor:pointer;font-size:20px;color:#0084ff;line-height:1;padding:4px 8px;border-radius:50%">+</button>
      </div>
      <div class="sidebar-search">
        <input type="text" id="sidebar-search-input" placeholder="Tìm kiếm trên Messenger" value="${escapeHtml(searchQuery)}">
      </div>
      <div class="friends-list" id="friends-list">
        ${friendsHtml}
      </div>`;

    // Bind search
    const searchInput = sidebar.querySelector("#sidebar-search-input");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        searchQuery = e.target.value;
        renderSidebar();
        // Re-focus at end
        const inp = document.getElementById("sidebar-search-input");
        if (inp) {
          inp.focus();
          const len = inp.value.length;
          inp.setSelectionRange(len, len);
        }
      });
    }

    // Bind friend clicks
    sidebar.querySelectorAll(".friend-item[data-friend-id]").forEach((item) => {
      item.addEventListener("click", () => {
        const fid = item.getAttribute("data-friend-id");
        const friend = friends.find((f) => f.id === fid);
        if (friend) selectFriend(friend);
      });
    });
  };

  // ─── Render header ───────────────────────────────────────────────────────────

  const renderHeader = () => {
    if (!currentFriend) return;
    const statusEl = document.getElementById("chat-header-status");
    if (!statusEl) return;
    const isOnline = onlineUsers.has(currentFriend.id);
    statusEl.className = "chat-header-status" + (isOnline ? " online" : "");
    statusEl.textContent = isOnline ? "Đang hoạt động" : "Offline";
  };

  // ─── Render chat window ───────────────────────────────────────────────────────

  const renderChatWindow = () => {
    const win = document.getElementById("chat-main");
    if (!win) return;

    if (!currentFriend) {
      win.innerHTML = `
        <div class="chat-empty-state">
          <div class="chat-empty-icon">💬</div>
          <div>Chọn một người bạn để bắt đầu trò chuyện</div>
        </div>`;
      return;
    }

    const isOnline = onlineUsers.has(currentFriend.id);

    win.innerHTML = `
      <div class="chat-header">
        <div class="friend-avatar-wrap">
          <div class="chat-avatar md">${escapeHtml(getAvatarInitial(currentFriend))}</div>
          ${isOnline ? '<div class="online-dot"></div>' : ""}
        </div>
        <div class="chat-header-info">
          <p class="chat-header-name">${escapeHtml(currentFriend.name || currentFriend.email)}</p>
          <p id="chat-header-status" class="chat-header-status${isOnline ? " online" : ""}">${isOnline ? "Đang hoạt động" : "Offline"}</p>
        </div>
      </div>
      <div id="chat-messages" class="chat-messages"></div>
      <div class="chat-input-area">
        <form id="chat-form" style="display:flex;flex:1;gap:8px;align-items:flex-end;margin:0">
          <div class="chat-input-box">
            <input type="text" id="chat-input" placeholder="Aa" autocomplete="off">
          </div>
          <button type="submit" class="chat-send-btn" id="chat-send-btn" title="Gửi">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" fill="currentColor"/>
            </svg>
          </button>
        </form>
      </div>`;

    win.querySelector("#chat-form").addEventListener("submit", sendMessage);
    win.querySelector("#chat-input").addEventListener("input", handleInputTyping);

    renderMessages();
    scrollToBottom();
  };

  // ─── Render messages ──────────────────────────────────────────────────────────

  const renderMessages = () => {
    const list = document.getElementById("chat-messages");
    if (!list) return;

    const isTyping = currentFriend && typingFriends.has(currentFriend.id);
    let html = "";
    let lastDate = null;
    let groupMsgs = [];
    let groupSender = null;

    const flushGroup = () => {
      if (!groupMsgs.length) return;
      const isOwn = groupSender === myUser.id;
      const groupClass = isOwn ? "own" : "received";

      html += `<div class="msg-group ${groupClass}">`;
      groupMsgs.forEach((msg) => {
        const text = isOwn
          ? (decryptedCache.get(msg.id) !== null ? decryptedCache.get(msg.id) : "Tin nhắn đã gửi") ?? "Tin nhắn đã gửi"
          : decryptedCache.get(msg.id) ?? "...";

        html += `<div class="msg-row">`;
        if (!isOwn) {
          const initial = escapeHtml(getAvatarInitial(currentFriend));
          html += `<div class="msg-sender-avatar">${initial}</div>`;
        }
        html += `<div class="msg-bubble">${escapeHtml(String(text))}</div>`;
        html += `</div>`;
      });

      // Time label below group
      const lastMsg = groupMsgs[groupMsgs.length - 1];
      html += `<div class="msg-time-label">${formatTime(lastMsg.createdAt)}</div>`;
      html += `</div>`;

      // Seen indicator: show after this group if lastReadMsgId is in this group and group is own
      if (isOwn && lastReadMsgId) {
        const lastMsgId = groupMsgs[groupMsgs.length - 1].id;
        if (lastMsgId === lastReadMsgId) {
          const initial = escapeHtml(getAvatarInitial(currentFriend));
          html += `
            <div class="seen-row">
              <span class="seen-label">Đã xem</span>
              <div class="seen-avatar">${initial}</div>
            </div>`;
        }
      }

      groupMsgs = [];
      groupSender = null;
    };

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const msgDate = new Date(msg.createdAt).toDateString();

      // Date divider
      if (lastDate !== msgDate) {
        flushGroup();
        html += `<div class="msg-date-divider">${formatDateDivider(msg.createdAt)}</div>`;
        lastDate = msgDate;
      }

      if (groupSender !== null && groupSender !== msg.senderId) {
        flushGroup();
      }

      groupSender = msg.senderId;
      groupMsgs.push(msg);
    }

    flushGroup();

    // Typing indicator
    if (isTyping) {
      const initial = escapeHtml(getAvatarInitial(currentFriend));
      html += `
        <div class="typing-row">
          <div class="msg-sender-avatar">${initial}</div>
          <div class="typing-bubble">
            <span class="dot"></span><span class="dot"></span><span class="dot"></span>
          </div>
        </div>`;
    }

    list.innerHTML = html;
  };

  // ─── Bootstrap ───────────────────────────────────────────────────────────────

  const init = async () => {
    await loadFriends();
    loadPreviews(); // fire and forget, updates sidebar when done
  };

  const render = (container) => {
    const token = localStorage.getItem("token");
    socket = getSocket(token);

    if (socket) {
      socket.off("users_online");
      socket.off("user_online");
      socket.off("user_offline");
      socket.off("typing");
      socket.off("stop_typing");
      socket.off("message_sent");
      socket.off("receive_private_message");
      socket.off("messages_read");

      socket.on("users_online", handleUsersOnline);
      socket.on("user_online", handleUserOnline);
      socket.on("user_offline", handleUserOffline);
      socket.on("typing", handleTyping);
      socket.on("stop_typing", handleStopTyping);
      socket.on("message_sent", handleMessageSent);
      socket.on("receive_private_message", handleReceiveMessage);
      socket.on("messages_read", handleMessagesRead);
    }

    window.__chatGoFriends = () => router.push("/friends");

    container.innerHTML = `
      <div class="chat-container">
        <aside class="chat-sidebar" id="chat-sidebar">
          <div style="padding:16px;color:#8a8d91;font-size:14px">Đang tải...</div>
        </aside>
        <main class="chat-main" id="chat-main">
          <div class="chat-empty-state">
            <div class="chat-empty-icon">💬</div>
            <div>Chọn một người bạn để bắt đầu trò chuyện</div>
          </div>
        </main>
      </div>`;

    init();
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
