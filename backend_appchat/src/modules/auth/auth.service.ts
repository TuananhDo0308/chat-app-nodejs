import argon2 from "argon2"
import { prisma } from "../../prisma/client.js"
import type { LoginInput, RegisterInput } from "./auth.types.js"
import { createAccessToken, createRefreshToken, hashToken } from "../../utils/token.js"

export async function register(userData: RegisterInput) {
  const existingUser = await prisma.user.findUnique({
    where: {
      email: userData.email,
    },
  })

  if (existingUser) {
    throw new Error("Email already exists")
  }

  const hashedPassword = await argon2.hash(userData.password)

  const user = await prisma.user.create({
    data: {
      name: userData.name,
      email: userData.email,
      password: hashedPassword,
      roles: {
        create: {
          role: {
            connect: { name: "USER" }
          }
        }
      }
    },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
    },
  })

  return user
}
export async function login(
  userData: LoginInput,
  meta: {
    userAgent?: string
    ipAddress?: string
  }
) {
  const user = await prisma.user.findUnique({
    where: { email: userData.email },
  })

  if (!user) {
    throw new Error("Invalid email or password")
  }

  const isPasswordValid = await argon2.verify(user.password, userData.password)

  if (!isPasswordValid) {
    throw new Error("Invalid email or password")
  }

  const refreshToken = createRefreshToken()
  const refreshTokenHash = hashToken(refreshToken)

  const session = await prisma.authSession.create({
    data: {
      userId: user.id,
      refreshTokenHash,
      userAgent: meta.userAgent || "Unknown User Agent",
      ipAddress: meta.ipAddress || "Unknown IP",
      deviceName: meta.userAgent || "Unknown Device",
    },
  })

  const accessToken = createAccessToken({
    userId: user.id,
    sessionId: session.id,
  })

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    },
    session: {
      id: session.id,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
      deviceName: session.deviceName,
      lastSeenAt: session.lastSeenAt,
      createdAt: session.createdAt,
    },
  }
}
export async function refresh(refreshToken: string) {
  const refreshTokenHash = hashToken(refreshToken)

  const session = await prisma.authSession.findFirst({
    where: {
      refreshTokenHash,
      revokedAt: null,
    },
    include: {
      user: true,
    },
  })

  if (!session) {
    throw new Error("Invalid refresh token")
  }

  const newRefreshToken = createRefreshToken()
  const newRefreshTokenHash = hashToken(newRefreshToken)

  const updatedSession = await prisma.authSession.update({
    where: {
      id: session.id,
    },
    data: {
      refreshTokenHash: newRefreshTokenHash,
      lastSeenAt: new Date(),
    },
  })

  const accessToken = createAccessToken({
    userId: session.userId,
    sessionId: session.id,
  })

  return {
    accessToken,
    refreshToken: newRefreshToken,
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      createdAt: session.user.createdAt,
    },
    session: {
      id: updatedSession.id,
      userAgent: updatedSession.userAgent,
      ipAddress: updatedSession.ipAddress,
      deviceName: updatedSession.deviceName,
      lastSeenAt: updatedSession.lastSeenAt,
      createdAt: updatedSession.createdAt,
    },
  }
}
export async function logout(refreshToken: string) {
  const refreshTokenHash = hashToken(refreshToken)

  const session = await prisma.authSession.findFirst({
    where: {
      refreshTokenHash,
      revokedAt: null,
    },
  })

  if (!session) {
    throw new Error("Invalid refresh token")
  }

  await prisma.authSession.update({
    where: {
      id: session.id,
    },
    data: {
      revokedAt: new Date(),
    },
  })

  return true
}
