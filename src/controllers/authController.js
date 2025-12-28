const userRepo = require("../repository/user.repo");
const generateToken = require("../utils/generateToken");
const bcrypt = require("bcryptjs");
require("dotenv").config();

/* =========================
   REGISTER NORMAL USER
========================= */
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "Name, email, and password are required" });
    }

    const existingUser = await userRepo.findUserByEmail(email);
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User with this email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await userRepo.createUser({
      name,
      email,
      password: hashedPassword,
      role: "user",
    });

    const token = generateToken(newUser._id, newUser.role);

    // 🔐 store active token
    await userRepo.setActiveToken(newUser._id, token);

    const userResponse = { ...newUser };
    delete userResponse.password;
    delete userResponse.activeToken;

    res.status(201).json({
      message: "User registered successfully",
      token,
      user: userResponse,
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

/* =========================
   REGISTER ADMIN
========================= */
exports.registerAdmin = async (req, res) => {
  try {
    const { email, password, adminToken } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: "Fields required" });

    if (!adminToken || adminToken !== process.env.ADMIN_SECRET) {
      return res.status(403).json({ message: "Invalid admin token" });
    }

    const existingUser = await userRepo.findUserByEmail(email);
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "Admin with this email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await userRepo.createUser({
      email,
      password: hashedPassword,
      role: "admin",
    });

    const token = generateToken(newUser._id, newUser.role);

    // 🔐 store active token
    await userRepo.setActiveToken(newUser._id, token);

    const userResponse = { ...newUser };
    delete userResponse.password;
    delete userResponse.activeToken;

    res.status(201).json({
      message: "Admin registered successfully",
      token,
      user: userResponse,
    });
  } catch (err) {
    console.error("Admin Register error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

/* =========================
   LOGIN
========================= */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const user = await userRepo.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // 🔐 generate NEW token
    const token = generateToken(user._id, user.role);

    // 🔥 overwrite old token (auto-logout previous session)
    await userRepo.setActiveToken(user._id, token);

    const userResponse = { ...user };
    delete userResponse.password;
    delete userResponse.activeToken;

    res.json({
      message: "Logged in",
      token,
      user: userResponse,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

/* =========================
   LOGOUT (NEW)
========================= */
exports.logout = async (req, res) => {
  try {
    // authMiddleware already verified token
    const userId = req.user?.id || req.user?.userId || req.user?._id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    await userRepo.clearActiveToken(userId);

    res.status(200).json({
      message: "Logged out successfully",
    });
  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
