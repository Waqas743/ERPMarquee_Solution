import express from "express";
import type { Request, Response, NextFunction } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";
import { listPlans, createPlan, updatePlan, deletePlan } from "./controllers/plansController";
import {
  dashboardStats,
  dashboardCalendar,
  dashboardUpcomingEvents,
  dashboardCompletedEvents,
  dashboardInvoices,
  dashboardCharts,
} from "./controllers/dashboardController";
import { listTenants, createTenant, updateTenant, deleteTenant } from "./controllers/tenantsController";
import { listBranches, getBranch, createBranch, updateBranch, deleteBranch } from "./controllers/branchesController";
import { listRoles, createRole, updateRole, deleteRole, permissionsList } from "./controllers/rolesController";
import { getRole } from "./controllers/rolesController";
import { listHalls, getHall, createHall, updateHall, deleteHall } from "./controllers/hallsController";
import {
  listHallCalendar,
  createHallCalendar,
  updateHallCalendar,
  deleteHallCalendar,
} from "./controllers/hallCalendarController";
import { listCustomers, getCustomer, createCustomer, updateCustomer } from "./controllers/customersController";
import {
  checkBookingAvailability,
  listBookings,
  getBooking,
  createBooking,
  updateBooking,
  updateBookingStatus,
  listBookingPayments,
  createBookingPayment,
  payBookingPayment,
  deleteBookingPayment,
  listBookingApprovals,
  listBookingMenuItems,
  listBookingAddOns,
  getBookingContract,
  upsertBookingContract,
  listBookingFollowUps,
  createBookingFollowUp,
  updateBookingFollowUp,
  deleteBookingFollowUp,
  addFollowUpComment,
  assignBooking,
} from "./controllers/bookingsController";
import { listUsers, getUser, createUser, updateUser, deleteUser } from "./controllers/usersController";
import { getSettings, updateSettings } from "./controllers/settingsController";
import {
  listMenuCategories,
  getMenuCategory,
  createMenuCategory,
  updateMenuCategory,
  deleteMenuCategory,
  listMenuItems,
  getMenuItem,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
} from "./controllers/menuController";
import { listAddOns, getAddOn, createAddOn, updateAddOn, deleteAddOn } from "./controllers/addOnsController";
import {
  listEventPackages,
  getEventPackage,
  createEventPackage,
  updateEventPackage,
  deleteEventPackage,
} from "./controllers/eventPackagesController";
import { packageRevenueReport, popularItemsReport } from "./controllers/reportsController";
import { listTasks, createTask, updateTask, deleteTask } from "./controllers/tasksController";
import { login } from "./controllers/authController";
import { getNotifications, markAsRead, markAllAsRead } from "./controllers/notificationsController";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, "..", "public", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (req.path === "/login") {
    return next();
  }
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
  if (!token) {
    return res.status(401).json({ success: false, message: "Missing token" });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    if (payload.roleName) {
      payload.roleName = payload.roleName.toLowerCase();
    }
    if (payload.role) {
      payload.role = payload.role.toLowerCase();
    }
    (req as any).auth = payload;
    return next();
  } catch {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
};

router.use(authMiddleware);

router.get("/plans", listPlans);
router.post("/plans", createPlan);
router.put("/plans/:id", updatePlan);
router.delete("/plans/:id", deletePlan);

router.get("/dashboard/stats", dashboardStats);
router.get("/dashboard/calendar", dashboardCalendar);
router.get("/dashboard/upcoming-events", dashboardUpcomingEvents);
router.get("/dashboard/completed-events", dashboardCompletedEvents);
router.get("/dashboard/invoices", dashboardInvoices);
router.get("/dashboard/charts", dashboardCharts);

router.get("/tenants", listTenants);
router.post("/tenants", upload.single("logo"), createTenant);
router.post("/tenants/:id", upload.single("logo"), updateTenant);
router.put("/tenants/:id", upload.single("logo"), updateTenant);
router.delete("/tenants/:id", deleteTenant);

router.get("/branches", listBranches);
router.get("/branches/:id", getBranch);
router.post("/branches", createBranch);
router.put("/branches/:id", updateBranch);
router.delete("/branches/:id", deleteBranch);

router.get("/roles", listRoles);
router.get("/roles/:id", getRole);
router.post("/roles", createRole);
router.put("/roles/:id", updateRole);
router.delete("/roles/:id", deleteRole);
router.get("/permissions-list", permissionsList);

router.get("/halls", listHalls);
router.get("/halls/:id", getHall);
router.post("/halls", createHall);
router.put("/halls/:id", updateHall);
router.delete("/halls/:id", deleteHall);

router.get("/hall-calendar", listHallCalendar);
router.post("/hall-calendar", createHallCalendar);
router.put("/hall-calendar/:id", updateHallCalendar);
router.delete("/hall-calendar/:id", deleteHallCalendar);

router.get("/customers", listCustomers);
router.get("/customers/:id", getCustomer);
router.post("/customers", createCustomer);
router.put("/customers/:id", updateCustomer);

router.get("/bookings/check-availability", checkBookingAvailability);
router.get("/bookings", listBookings);
router.get("/bookings/:id", getBooking);
router.post("/bookings", createBooking);
router.put("/bookings/:id", updateBooking);
router.post("/bookings/:id/assign", assignBooking);
router.put("/bookings/:id/status", updateBookingStatus);
router.get("/bookings/:id/payments", listBookingPayments);
router.post("/bookings/:id/payments", createBookingPayment);
router.post("/bookings/:id/payments/:paymentId/pay", payBookingPayment);
router.delete("/bookings/:id/payments/:paymentId", deleteBookingPayment);
router.get("/bookings/:id/approvals", listBookingApprovals);
router.get("/bookings/:id/menu-items", listBookingMenuItems);
router.get("/bookings/:id/add-ons", listBookingAddOns);
router.get("/bookings/:id/follow-ups", listBookingFollowUps);
router.post("/bookings/:id/follow-ups", createBookingFollowUp);
router.put("/bookings/:id/follow-ups/:followUpId", updateBookingFollowUp);
router.delete("/bookings/:id/follow-ups/:followUpId", deleteBookingFollowUp);
router.post("/bookings/:id/follow-ups/:followUpId/comments", addFollowUpComment);
router.get("/bookings/:id/contract", getBookingContract);
router.post("/bookings/:id/contract", upsertBookingContract);

router.get("/users", listUsers);
router.get("/users/:id", getUser);
router.post("/users", createUser);
router.put("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);

router.get("/settings", getSettings);
router.post("/settings", updateSettings);

router.get("/menu-categories", listMenuCategories);
router.post("/menu-categories", createMenuCategory);
router.put("/menu-categories/:id", updateMenuCategory);
router.delete("/menu-categories/:id", deleteMenuCategory);

router.get("/menu-items", listMenuItems);
router.get("/menu-items/:id", getMenuItem);
router.post("/menu-items", createMenuItem);
router.put("/menu-items/:id", updateMenuItem);
router.delete("/menu-items/:id", deleteMenuItem);

router.get("/add-ons", listAddOns);
router.get("/add-ons/:id", getAddOn);
router.post("/add-ons", createAddOn);
router.put("/add-ons/:id", updateAddOn);
router.delete("/add-ons/:id", deleteAddOn);

router.get("/event-packages", listEventPackages);
router.get("/event-packages/:id", getEventPackage);
router.post("/event-packages", createEventPackage);
router.put("/event-packages/:id", updateEventPackage);
router.delete("/event-packages/:id", deleteEventPackage);

router.get("/reports/package-revenue", packageRevenueReport);
router.get("/reports/popular-items", popularItemsReport);

router.get("/tasks", listTasks);
router.post("/tasks", createTask);
router.put("/tasks/:id", updateTask);
router.delete("/tasks/:id", deleteTask);

router.post("/login", login);

router.get("/notifications", authMiddleware, getNotifications);
router.put("/notifications/read-all", authMiddleware, markAllAsRead);
router.put("/notifications/:id/read", authMiddleware, markAsRead);

export default router;
