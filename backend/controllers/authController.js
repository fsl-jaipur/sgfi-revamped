import bcrypt from "bcryptjs";
import { AuthModel } from "../models/authModel.js";
import { signAdminToken } from "../middleware/auth.js";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: 60 * 60 * 1000, // 1 hour
};

export const loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required.",
      });
    }

    const user = await AuthModel.findByUsername(username);

    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials." });
    }

    const passwordMatches = await bcrypt.compare(password, user.password || "");
    if (!passwordMatches) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials." });
    }

    // Update last_login timestamp
    await AuthModel.updateLastLogin(user._id);

    const token = signAdminToken(user);

    // Set cookie
    res.cookie("token", token, COOKIE_OPTIONS);

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      user: {
        id: user._id,
        username: user.username,
        last_login: new Date(),
      },
    });
  } catch (error) {
    console.error("Error in loginUser:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message,
    });
  }
};

export const logoutUser = async (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  });
  return res.status(200).json({
    success: true,
    message: "Logged out successfully.",
  });
};

export const getCurrentUser = async (req, res) => {
  return res.status(200).json({
    success: true,
    user: {
      id: req.user.id,
      username: req.user.username,
      role: req.user.role,
    },
  });
};
