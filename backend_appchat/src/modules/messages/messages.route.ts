import { Router } from "express"
import * as messagesController from "./messages.controller.js"
import { authMiddleware } from "../../middlewares/auth.middleware.js"

const router = Router()

router.get("/previews/:userId", authMiddleware, messagesController.getConversationPreviews)
router.get("/:userId/:friendId", authMiddleware, messagesController.getMessagesByFriendId)
router.get("/conversations/:userId", authMiddleware, messagesController.getConversations)

export default router
