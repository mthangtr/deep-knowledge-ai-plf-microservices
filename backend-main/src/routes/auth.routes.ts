import { Router } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET, JWT_EXPIRES_IN } from "../config/jwt";

const router = Router();

// POST /api/auth/supabase-callback
router.post("/supabase-callback", async (req, res) => {
  try {
    const { user } = req.body;

    if (!user || !user.id || !user.email) {
      return res.status(400).json({
        error: "Invalid user data",
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.email,
        image: user.user_metadata?.avatar_url || null,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.email,
        image: user.user_metadata?.avatar_url || null,
      },
    });
  } catch (error) {
    console.error("Auth callback error:", error);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
});

// GET /api/auth/session
router.get("/session", async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "No token provided",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    return res.json({
      user: {
        id: decoded.id,
        email: decoded.email,
        name: decoded.name,
        image: decoded.image,
      },
    });
  } catch (error) {
    return res.status(401).json({
      error: "Invalid token",
    });
  }
});

export default router;
