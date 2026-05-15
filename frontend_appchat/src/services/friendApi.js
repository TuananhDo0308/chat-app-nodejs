import http from "../config/http";


export const friendApi = {

  getPendingRequests: () => http.get("/friends", { params: { status: "PENDING" } }),
  getFriends: () => http.get("/friends", { params: { status: "ACCEPTED" } }),
  sendRequest: (friendId) => http.post(`/friends/request`, {
    userId: friendId
  }),
  respondRequest: (friendId, status) => http.put(`/friends/${friendId}`, { status }),
};
