import http from "../config/http.js";

export const friendApi = {
  getFriends: () => http.get("/friends"),
  getPendingRequests: () => http.get("/friends/pending"),
  getSentRequests: () => http.get("/friends/sent"),
  sendRequest: (friendId) => http.post("/friends/request", { friendId }),
  respondRequest: (requesterId, status) => http.patch("/friends/respond", { requesterId, status }),
  deleteFriend: (friendId) => http.delete(`/friends/${friendId}`),
};
