const jwt = require("jsonwebtoken");
const userRepo = require("../repository/user.repo");
require("dotenv").config();

const authMiddleware = async (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }

  const token = header.split(" ")[1];

  try {
    // 1️⃣ Verify JWT signature & expiry
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // decoded contains: { userId, role, iat, exp }
    const userId = decoded.userId || decoded.id || decoded._id;

    if (!userId) {
      return res.status(401).json({ message: "Invalid token payload" });
    }

    // 2️⃣ Fetch user from DB
    const user = await userRepo.findUserById(userId);

    if (!user) {
      return res.status(401).json({ message: "User no longer exists" });
    }

    // 3️⃣ Enforce LOGOUT / single-session rule
    if (!userRepo.isTokenValidForUser(user, token)) {
      return res.status(401).json({
        message: "Session expired. Please login again.",
      });
    }

    // 4️⃣ Attach safe user info to request
    req.user = {
      userId: user._id,
      role: user.role,
    };

    next();
  } catch (err) {
    console.error("Auth Middleware Error:", err.message);
    return res.status(401).json({ message: "Token failed" });
  }
};

module.exports = authMiddleware;
