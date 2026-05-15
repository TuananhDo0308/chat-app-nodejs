import { Router } from "express";
import * as friendsController from "./friends.controller.js"
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { PERMISSIONS } from "../../constants/permissions.js";
import { checkPermission } from "../../middlewares/permission.middleware.js";

const router = Router()

// Lấy danh sách bạn bè của chính mình
router.get('/', authMiddleware, checkPermission(PERMISSIONS.FRIEND.READ), friendsController.getFriendsByUserId)

// Lấy danh sách lời mời kết bạn đang chờ
router.get('/pending', authMiddleware, checkPermission(PERMISSIONS.FRIEND.READ), friendsController.getPendingRequests)

// Lấy danh sách lời mời đã gửi đi
router.get('/sent', authMiddleware, checkPermission(PERMISSIONS.FRIEND.READ), friendsController.getSentRequests)

// Gửi lời mời kết bạn mới
router.post('/request', authMiddleware, checkPermission(PERMISSIONS.FRIEND.CREATE), friendsController.addFriend)

// Phản hồi lời mời kết bạn (Accept/Reject)
router.patch('/respond', authMiddleware, checkPermission(PERMISSIONS.FRIEND.UPDATE), friendsController.patchFriendResponse)

// Xóa bạn
router.delete('/:friendId', authMiddleware, checkPermission(PERMISSIONS.FRIEND.DELETE), friendsController.deleteFriend)

export default router