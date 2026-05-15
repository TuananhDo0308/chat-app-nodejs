import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { sendError } from "../utils/response.js";
import { prisma } from "../prisma/client.js";
export interface AuthRequest extends Request {
  user?: {
    userId: string
    sessionId: string
  }
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return sendError(res, 401, "Unauthorized: No token provided")
  }

  const token = authHeader.split(" ")[1]

  try {
    const decoded = jwt.verify(
      token || "",
      process.env.JWT_SECRET || ""
    ) as unknown as {
      userId: string
      sessionId: string
    }

    const session = await prisma.authSession.findFirst({
      where: {
        id: decoded.sessionId,
        userId: decoded.userId,
        revokedAt: null,
      },
    })

    if (!session) {
      return sendError(res, 401, "Session revoked")
    }

    req.user = decoded
    next()
  } catch (error) {
    return sendError(res, 401, "Unauthorized: Invalid or expired token")
  }
}
