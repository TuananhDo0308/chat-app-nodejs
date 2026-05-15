import type { Response } from "express"
import type { AuthRequest } from "../../middlewares/auth.middleware.js"
import * as keysService from "./keys.service.js"
import { sendResponse, sendError } from "../../utils/response.js"

// POST /keys/public — upload ECDH public key
export async function uploadPublicKey(req: AuthRequest, res: Response) {
  const userId = req.user!.userId
  const { publicKey } = req.body

  if (!publicKey) return sendError(res, 400, "publicKey is required")

  await keysService.setPublicKey(userId, publicKey)
  return sendResponse(res, 200, "Public key uploaded", null)
}

// GET /keys/public/:userId — get a user's ECDH public key
export async function getPublicKey(req: AuthRequest, res: Response) {
  const { userId } = req.params
  const publicKey = await keysService.getPublicKey(userId as string)

  if (!publicKey) return sendError(res, 404, "User has not uploaded a public key")

  return sendResponse(res, 200, "Public key fetched", { publicKey })
}

// GET /keys/status — check if authenticated user has uploaded their key
export async function getStatus(req: AuthRequest, res: Response) {
  const userId = req.user!.userId
  const hasKey = await keysService.hasPublicKey(userId)
  return sendResponse(res, 200, "Key status", { hasKey })
}
