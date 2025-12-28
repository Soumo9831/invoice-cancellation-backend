const router = require("express").Router();

const {
  register,
  registerAdmin,
  login,
  logout, // 👈 NEW
} = require("../controllers/authController");

const auth = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

// 🔐 Admin registration (uses ADMIN_SECRET)
router.post("/admin/register", registerAdmin);

// 👤 Create normal user (ADMIN ONLY)
router.post("/register", auth, authorizeRoles("admin"), register);

// 🔑 Login (admin or user)
router.post("/login", login);

// 🚪 Logout (admin or user) — SECURE LOGOUT
router.post("/logout", auth, logout);

module.exports = router;
