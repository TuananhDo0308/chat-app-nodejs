import crypto from "crypto"
import jwt from "jsonwebtoken"

export function createRefreshToken() {
  return crypto.randomBytes(64).toString("hex")
}

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex")
}

export function createAccessToken(payload: {
  userId: string
  sessionId: string
}) {
  return jwt.sign(payload, process.env.JWT_SECRET as string, {
    expiresIn: "30s",
  })
}
