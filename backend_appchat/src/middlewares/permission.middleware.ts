import type { Response, NextFunction } from "express";
import type { AuthRequest } from "./auth.middleware.js";
import { prisma } from "../prisma/client.js";
import { sendError } from "../utils/response.js";

export const checkPermission = (permissions: string | string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;
      if (!userId) return sendError(res, 401, "Unauthorized");
      const permissionList = Array.isArray(permissions) ? permissions : [permissions];
      const hasPermission = await prisma.userRole.findFirst({
        where: {
          userId,
          role: {
            permissions: {
              some: {
                permission: {
                  name: {
                    in: permissionList,
                  },
                },
              },
            },
          },
        },
      })
      if (!hasPermission) {
        return sendError(res, 403, `Forbidden: Missing required permissions: ${permissionList.join(", ")}`);
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};
