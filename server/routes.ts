import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertDailyLogSchema, logReviewSchema } from "@shared/schema";

export function registerRoutes(app: Express): Server {
  // Setup authentication routes
  setupAuth(app);

  // Middleware to check authentication
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }
    next();
  };

  // Middleware to check manager role
  const requireManager = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated() || req.user.role !== "manager") {
      return res.sendStatus(403);
    }
    next();
  };

  // Daily logs endpoints
  app.post("/api/daily-logs", requireAuth, async (req, res, next) => {
    try {
      const validation = insertDailyLogSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error.errors[0].message });
      }

      const logData = {
        ...validation.data,
        userId: req.user.id,
      };

      const log = await storage.createDailyLog(logData);

      // Create notification for manager if user is in a team
      if (req.user.teamId) {
        const teamMembers = await storage.getTeamMembers(req.user.teamId);
        const manager = teamMembers.find(member => member.role === "manager");
        
        if (manager) {
          await storage.createNotification({
            userId: manager.id,
            type: "log_submitted",
            title: "New Log Submitted",
            message: `${req.user.fullName} has submitted a daily log for ${logData.date}`,
          });
        }
      }

      res.status(201).json(log);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/daily-logs", requireAuth, async (req, res, next) => {
    try {
      const logs = await storage.getUserDailyLogs(req.user.id);
      res.json(logs);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/daily-logs/:id", requireAuth, async (req, res, next) => {
    try {
      const logId = parseInt(req.params.id);
      const log = await storage.getDailyLog(logId);
      
      if (!log) {
        return res.status(404).json({ message: "Log not found" });
      }

      // Check if user owns the log or is a manager in the same team
      if (log.userId !== req.user.id) {
        if (req.user.role !== "manager" || !req.user.teamId) {
          return res.sendStatus(403);
        }
        
        const logUser = await storage.getUser(log.userId);
        if (!logUser || logUser.teamId !== req.user.teamId) {
          return res.sendStatus(403);
        }
      }

      res.json(log);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/daily-logs/:id", requireAuth, async (req, res, next) => {
    try {
      const logId = parseInt(req.params.id);
      const log = await storage.getDailyLog(logId);
      
      if (!log) {
        return res.status(404).json({ message: "Log not found" });
      }

      if (log.userId !== req.user.id) {
        return res.sendStatus(403);
      }

      const validation = insertDailyLogSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error.errors[0].message });
      }

      // If log was previously reviewed, reset review status
      const updates: any = {
        ...validation.data,
        userId: req.user.id,
      };

      if (log.reviewStatus === "reviewed") {
        updates.reviewStatus = "pending";
        updates.reviewedAt = null;
        updates.reviewedBy = null;

        // Notify manager of re-edit
        if (req.user.teamId) {
          const teamMembers = await storage.getTeamMembers(req.user.teamId);
          const manager = teamMembers.find(member => member.role === "manager");
          
          if (manager) {
            await storage.createNotification({
              userId: manager.id,
              type: "log_re_edited",
              title: "Log Re-edited",
              message: `${req.user.fullName} has re-edited their log for ${log.date} and requires re-review`,
            });
          }
        }
      }

      const updatedLog = await storage.updateDailyLog(logId, updates);
      res.json(updatedLog);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/daily-logs/:id", requireAuth, async (req, res, next) => {
    try {
      const logId = parseInt(req.params.id);
      const log = await storage.getDailyLog(logId);
      
      if (!log) {
        return res.status(404).json({ message: "Log not found" });
      }

      if (log.userId !== req.user.id) {
        return res.sendStatus(403);
      }

      await storage.deleteDailyLog(logId);
      res.sendStatus(204);
    } catch (error) {
      next(error);
    }
  });

  // Team logs endpoints (Manager only)
  app.get("/api/team-logs", requireManager, async (req, res, next) => {
    try {
      if (!req.user.teamId) {
        return res.status(400).json({ message: "Manager not assigned to a team" });
      }

      const logs = await storage.getTeamDailyLogs(req.user.teamId);
      res.json(logs);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/daily-logs/:id/review", requireManager, async (req, res, next) => {
    try {
      const logId = parseInt(req.params.id);
      const log = await storage.getDailyLog(logId);
      
      if (!log) {
        return res.status(404).json({ message: "Log not found" });
      }

      // Verify the log belongs to a team member
      if (!req.user.teamId) {
        return res.status(400).json({ message: "Manager not assigned to a team" });
      }

      const logUser = await storage.getUser(log.userId);
      if (!logUser || logUser.teamId !== req.user.teamId) {
        return res.sendStatus(403);
      }

      const validation = logReviewSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error.errors[0].message });
      }

      const { feedback, isReviewed } = validation.data;

      await storage.updateLogReview(logId, req.user.id, feedback, isReviewed);

      // Create notification for developer
      if (isReviewed) {
        await storage.createNotification({
          userId: log.userId,
          type: "log_reviewed",
          title: "Log Reviewed",
          message: `Your log for ${log.date} has been reviewed by ${req.user.fullName}`,
        });
      }

      res.sendStatus(200);
    } catch (error) {
      next(error);
    }
  });

  // Team management endpoints
  app.get("/api/team", requireAuth, async (req, res, next) => {
    try {
      if (!req.user.teamId) {
        return res.json(null);
      }

      const members = await storage.getTeamMembers(req.user.teamId);
      res.json(members);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/team/code", requireManager, async (req, res, next) => {
    try {
      if (!req.user.teamId) {
        return res.status(400).json({ message: "Manager not assigned to a team" });
      }

      const teamMembers = await storage.getTeamMembers(req.user.teamId);
      const team = await storage.getTeamByCode(''); // This needs to be fixed to get team by ID
      // For now, we'll generate a mock team code based on team ID
      const mockTeamCode = `TEAM-${req.user.teamId.toString().padStart(6, '0')}`;
      
      res.json({ code: mockTeamCode });
    } catch (error) {
      next(error);
    }
  });

  // Notifications endpoints
  app.get("/api/notifications", requireAuth, async (req, res, next) => {
    try {
      const notifications = await storage.getUserNotifications(req.user.id);
      res.json(notifications);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/notifications/:id/read", requireAuth, async (req, res, next) => {
    try {
      const notificationId = parseInt(req.params.id);
      await storage.markNotificationAsRead(notificationId);
      res.sendStatus(200);
    } catch (error) {
      next(error);
    }
  });

  // Team join endpoint
  app.post("/api/team/join", requireAuth, async (req, res, next) => {
    try {
      const { code } = req.body;
      if (!code) return res.status(400).json({ message: "Team code is required" });
      
      const team = await storage.getTeamByCode(code);
      if (!team) return res.status(404).json({ message: "Invalid team code" });
      
      await storage.updateUserTeam(req.user!.id, team.id);
      res.json({ message: "Successfully joined team", team });
    } catch (error) {
      next(error);
    }
  });

  // Get user's team info
  app.get("/api/user-team", requireAuth, async (req, res, next) => {
    try {
      if (!req.user!.teamId) {
        return res.status(404).json({ message: "User not in any team" });
      }
      
      const team = await storage.getTeamById(req.user!.teamId);
      if (!team) return res.status(404).json({ message: "Team not found" });
      
      res.json(team);
    } catch (error) {
      next(error);
    }
  });

  // Productivity data endpoint
  app.get("/api/productivity", requireAuth, async (req, res, next) => {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "startDate and endDate are required" });
      }

      const data = await storage.getProductivityData(
        req.user!.id,
        startDate as string,
        endDate as string
      );
      
      res.json(data);
    } catch (error) {
      next(error);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
