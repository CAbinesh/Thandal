/* eslint-disable no-undef */
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import Transactions from "../Models/Transactions.js";
import dotenv from "dotenv";
import helmet from "helmet";
import ratelimit from "express-rate-limit";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import {Strategy as GithubStrategy} from "passport-github";
import passport from "passport";
import JWT from "jsonwebtoken";
import User from "../Models/User.js";
import cookieParser from "cookie-parser";
dotenv.config();

const app = express();
app.use(helmet());
app.use(express.json());
app.use(cookieParser());

const generateToken = (user) => {
  return JWT.sign(
    {
      id: user._id,
      email: user.email,
      provider: user.provider,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
};

const limiter = ratelimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
});
app.use(limiter);

const FRONTEND_URL = process.env.FRONTEND_URL || "https://thandalfront.onrender.com";
const BACKEND_URL = process.env.BACKEND_URL || "https://thandal.onrender.com";
const CORSoption = {
  origin: FRONTEND_URL,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(CORSoption));
app.use(passport.initialize());

/* ---------- GOOGLE OAuth (SESSIONLESS) ---------- */
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.REDIRECT_URL}/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ googleId: profile.id });
        if (!user) {
          user = await User.create({
            userName: profile.displayName,
            email: profile.emails?.[0]?.value,
            googleId: profile.id,
            provider: "google",
          });
        }
        done(null, user);
      } catch (error) {
        console.error("Google Strategy Error:", error);
        done(error, null);
      }
    }
  )
);

app.get(
  "/auth/google",
  passport.authenticate("google", { 
    scope: ["profile", "email"],
    session: false
  })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${FRONTEND_URL}/login?error=google_auth_failed`,
  }),
  (req, res) => {
    try {
      const token = generateToken(req.user);
      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: "none",
        maxAge: 24 * 60 * 60 * 1000,
      });
      res.redirect(`${FRONTEND_URL}/transactions`);
    } catch (error) {
      console.error("Google Callback Error:", error);
      res.redirect(`${FRONTEND_URL}/login?error=token_generation_failed`);
    }
  }
);

/* ---------- GITHUB OAuth (SESSIONLESS) ---------- */
passport.use(
  new GithubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: `${process.env.REDIRECT_URL}/auth/github/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ githubId: profile.id });
        if (!user) {
          user = await User.create({
            userName: profile.displayName,
            email: profile.emails?.[0]?.value,
            githubId: profile.id,
            provider: "github",
          });
        }
        done(null, user);
      } catch (error) {
        console.error("Github Strategy Error:", error);
        done(error, null);
      }
    }
  )
);

app.get(
  "/auth/github",
  passport.authenticate("github", { 
    scope: ["user:email"],
    session: false
  })
);

app.get(
  "/auth/github/callback",
  passport.authenticate("github", {
    session: false,
    failureRedirect: `${FRONTEND_URL}/login?error=github_auth_failed`,
  }),
  (req, res) => {
    try {
      const token = generateToken(req.user);
      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: "none",
        maxAge: 24 * 60 * 60 * 1000,
      });
      res.redirect(`${FRONTEND_URL}/transactions`);
    } catch (error) {
      console.error("Github Callback Error:", error);
      res.redirect(`${FRONTEND_URL}/login?error=token_generation_failed`);
    }
  }
);

// MongoDB connection
(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected ✅");
  } catch (error) {
    console.error("MongoDB Connection Error ❌:", error.message);
    process.exit(1);
  }
})();

// Auth Middleware
const middleware = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ message: "not authenticated" });
  try {
    const decoded = JWT.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error("JWT Verify Error:", error);
    res.status(401).json({ message: "Invalid token" });
  }
};

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// API Routes
app.get("/me", middleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-__v");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    console.error("GET /me Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/logout", (req, res) => {
  res.clearCookie("token", { 
    httpOnly: true, 
    secure: process.env.NODE_ENV === 'production',
    sameSite: "none" 
  });
  res.json({ message: "Logged out" });
});

app.get("/transactions", middleware, limiter, async (req, res) => {
  try {
    console.log("Fetching transactions for user:", req.user.id);
    const transactions = await Transactions.find({ userId: req.user.id }).sort({
      datee: -1,
    });
    res.json(transactions);
  } catch (err) {
    console.error("GET Transactions Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/transactions", middleware, limiter, async (req, res) => {
  try {
    const { takenAmnt, cltnAmnt, datee } = req.body;
    console.log("Creating transaction:", { takenAmnt, cltnAmnt, datee, userId: req.user.id });
    
    const newTransaction = new Transactions({
      takenAmnt, 
      cltnAmnt, 
      datee, 
      userId: req.user.id 
    });
    const savedTransaction = await newTransaction.save();
    res.status(201).json(savedTransaction);
  } catch (err) {
    console.error("POST Transactions Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.delete("/transactions/:id", middleware, limiter, async (req, res) => {
  try {
    const result = await Transactions.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });
    if (!result) {
      return res.status(404).json({ message: "Transaction not found" });
    }
    res.json({ message: "Deleted Successfully" });
  } catch (err) {
    console.error("DELETE Transactions Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GLOBAL ERROR HANDLER - MUST BE LAST (after all routes)
app.use((error, req, res) => {
  console.error("Global Error Handler - Path:", req.path, "Error:", error);
  
  if (req.path.includes('/auth/')) {
    return res.redirect(`${FRONTEND_URL}/login?error=auth_failed`);
  }
  
  res.status(500).json({ message: "Server error" });
});

// 404 handler - catches all unmatched routes
app.use((req, res) => {
  console.log("404 - Route not found:", req.method, req.path);
  res.status(404).json({ message: "Route not found" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} ✅`);
  console.log(`Backend URL: ${BACKEND_URL}`);
  console.log(`Frontend URL: ${FRONTEND_URL}`);
});
