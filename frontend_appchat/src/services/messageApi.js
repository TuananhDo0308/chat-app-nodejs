import http from "../config/http";

export const messageApi = {
  getMessages: (userId, friendId) => http.get(`/messages/${userId}/${friendId}`),
  getConversations: (userId) => http.get(`/messages/conversations/${userId}`),
};
