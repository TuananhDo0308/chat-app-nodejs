import type { Request, Response } from "express"
import * as authService from "./auth.service.js"
import jwt from "jsonwebtoken"
import { sendResponse, sendError } from "../../utils/response.js"

export async function register(req: Request, res: Response) {
  try {
    const user = await authService.register(req.body)
    return sendResponse(res, 201, "Register successfully", user)
  } catch (error: any) {
    return sendError(res, 400, error.message || "Failed to register")
  }
}

export async function login(req: Request, res: Response) {
  try {
    const result = await authService.login(req.body, {
      userAgent: req.headers["user-agent"] ?? "Unknown",
      ipAddress: req.ip ?? "Unknown",
    })
    console.log("result", result.refreshToken)
    res.cookie("refresh_token", result.refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
      path: "/api/auth",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    })
    sendResponse(res, 200, "Login successfully", {
      accessToken: result.accessToken,
      user: result.user,
      session: result.session,
    })

  } catch (error: any) {
    return sendError(res, 401, "Invalid email or password")
  }
}

export async function refresh(req: Request, res: Response) {
  try {
    const refreshToken = req.cookies?.refresh_token
    console.log("refreshToken", req.cookies)
    if (!refreshToken) {
      return sendError(res, 401, "No refresh token provided")
    }

    const result = await authService.refresh(refreshToken)

    res.cookie("refresh_token", result.refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
      path: "/api/auth",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    })

    return sendResponse(res, 200, "Token refreshed successfully", {
      accessToken: result.accessToken,
      user: result.user,
      session: result.session,
    })
  } catch (error: any) {
    return sendError(res, 401, error.message || "Invalid refresh token")
  }
}

export async function logout(req: Request, res: Response) {
  try {
    const refreshToken = req.cookies?.refresh_token
    console.log("refreshToken", req.cookies.refresh_token)
    if (!refreshToken) {
      return sendError(res, 401, "No refresh token provided")
    }
    await authService.logout(refreshToken)
    res.clearCookie("refresh_token", {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
      path: "/api/auth",
    })
    return sendResponse(res, 200, "Logout successfully", null)
  } catch (error: any) {
    return sendError(res, 401, error.message || "Invalid refresh token")
  }
}
