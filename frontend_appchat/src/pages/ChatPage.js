import { getSocket } from "../config/socket.js";
import { friendApi } from "../services/friendApi.js";
import { messageApi } from "../services/messageApi.js";

const chatPage = () => {
  let friends = [];
  let currentFriend = null;
  let messages = [];
  let myUser = JSON.parse(localStorage.getItem("user") || "{}");
  let socket = null;

  const loadFriends = async () => {
    try {
      const response = await friendApi.getFriends();
      friends = response.data;
      renderFriendsList();
    } catch (err) {
      console.error("Failed to load friends", err);
    }
  };

  const selectFriend = async (friend) => {
    currentFriend = friend;
    renderFriendsList();
    
    // Load lịch sử tin nhắn
    try {
      const response = await messageApi.getMessages(myUser.id, friend.id);
      messages = response.data;
      renderChatWindow();
    } catch (err) {
      console.error("Failed to load messages", err);
    }
  };

  const handleNewMessage = (msg) => {
    // Chỉ thêm vào list nếu tin nhắn đó thuộc về cuộc hội thoại đang mở
    if (
      currentFriend &&
      (msg.senderId === currentFriend.id || msg.receiverId === currentFriend.id)
    ) {
      messages.push(msg);
      renderMessages();
    }
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (!currentFriend || !socket) return;

    const input = document.getElementById("chat-input");
    const content = input.value.trim();

    if (content) {
      socket.emit("send_private_message", {
        senderId: myUser.id,
        receiverId: currentFriend.id,
        content: content
      });
      input.value = "";
    }
  };

  const renderFriendsList = () => {
    const list = document.getElementById("friends-list");
    if (!list) return;

    list.innerHTML = friends.map(f => `
      <div class="friend-item ${currentFriend?.id === f.friend.id ? 'active' : ''}" 
           onclick="this.dispatchEvent(new CustomEvent('select-friend', {detail: ${JSON.stringify(f.friend).replace(/"/g, '&quot;')}}))">
        <div class="avatar">${f.friend.name?.charAt(0) || 'U'}</div>
        <div class="friend-info">
          <span class="name">${f.friend.name || f.friend.email}</span>
          <small class="status">Click to chat</small>
        </div>
      </div>
    `).join("");

    // Gán event listener cho từng item (vì onclick string khó truyền object phức tạp)
    list.querySelectorAll('.friend-item').forEach((item, index) => {
        item.onclick = () => selectFriend(friends[index].friend);
    });
  };

  const renderMessages = () => {
    const list = document.getElementById("chat-messages");
    if (!list) return;

    list.innerHTML = messages.map(msg => `
      <div class="message ${msg.senderId === myUser.id ? 'own' : ''}">
        <div class="msg-bubble">
          <p>${msg.content}</p>
          <span class="msg-time">${new Date(msg.createdAt).toLocaleTimeString()}</span>
        </div>
      </div>
    `).join("");
    list.scrollTop = list.scrollHeight;
  };

  const renderChatWindow = () => {
    const window = document.getElementById("chat-window");
    if (!window) return;

    if (!currentFriend) {
      window.innerHTML = `<div class="chat-empty-state">Chọn một người bạn để bắt đầu trò chuyện</div>`;
      return;
    }

    window.innerHTML = `
      <header class="chat-header">
        <div class="chat-user-info">
          <div class="avatar">${currentFriend.name?.charAt(0) || 'U'}</div>
          <div>
            <h3>${currentFriend.name || currentFriend.email}</h3>
            <span class="status">Online</span>
          </div>
        </div>
      </header>
      <div id="chat-messages" class="chat-messages"></div>
      <form id="chat-form" class="chat-input-area">
        <input type="text" id="chat-input" placeholder="Aa" autocomplete="off">
        <button type="submit">Gửi</button>
      </form>
    `;

    const form = window.querySelector("#chat-form");
    form.addEventListener("submit", sendMessage);
    renderMessages();
  };

  const render = (container) => {
    // Lấy token từ localStorage (hoặc dùng hàm getAccessToken từ http.js)
    const token = localStorage.getItem("accessToken"); 
    
    // Khởi tạo socket với token
    socket = getSocket(token);

    if (socket) {
      socket.on("receive_private_message", handleNewMessage);
      socket.on("message_sent", handleNewMessage);
    } else {
      console.error("Socket could not be initialized. Check if token exists.");
    }

    container.innerHTML = `
      <div class="chat-container">
        <aside class="chat-sidebar">
          <div class="sidebar-header">
            <h2>Đoạn chat</h2>
          </div>
          <div id="friends-list" class="friends-list">
            <div class="loading">Đang tải bạn bè...</div>
          </div>
        </aside>
        <main id="chat-window" class="chat-main">
          <div class="chat-empty-state">Chọn một người bạn để bắt đầu trò chuyện</div>
        </main>
      </div>
    `;

    loadFriends();
  };

  return { render };
};

export default chatPage;
