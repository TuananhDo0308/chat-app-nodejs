import { Router } from "express"
import { authMiddleware } from "../../middlewares/auth.middleware.js"
import * as keysController from "./keys.controller.js"

const router = Router()

router.post("/public", authMiddleware, keysController.uploadPublicKey)
router.get("/public/:userId", authMiddleware, keysController.getPublicKey)
router.get("/status", authMiddleware, keysController.getStatus)

export default router
