import http from "../config/http";
export const messageApi = {
  getMessages: (userId, friendId) => http.get(`/messages/${userId}/${friendId}`),
  getPreviews: (userId) => http.get(`/messages/previews/${userId}`),
};
