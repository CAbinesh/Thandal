/* eslint-disable no-undef */
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import passport from "passport";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "./Models/User.js";

dotenv.config();
const app = express();

/* ---------- CONSTANTS ---------- */
const FRONTEND_URL = "https://thandalfront.onrender.com";

/* ---------- MIDDLEWARE ---------- */
app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  })
);

app.use(passport.initialize());

/* ---------- JWT ---------- */
const generateToken = (user) =>
  jwt.sign(
    { id: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

/* ---------- GOOGLE STRATEGY ---------- */
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.REDIRECT_URL}/auth/google/callback`,
    },
    async (_, __, profile, done) => {
      try {
        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          user = await User.create({
            userName: profile.displayName,
            email: profile.emails[0].value,
            googleId: profile.id,
            provider: "google",
          });
        }

        done(null, user);
      } catch (err) {
        done(err, null);
      }
    }
  )
);

/* ---------- ROUTES ---------- */

// Start Google OAuth
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Google callback
app.get(
  "/auth/google/callback",
  passport.authenticate("google", { session: false }),
  (req, res) => {
    const token = generateToken(req.user);

    res.cookie("token", token, {
      httpOnly: true,
      secure: true,      // 🔥 REQUIRED
      sameSite: "none",  // 🔥 REQUIRED
    });

    res.redirect(`${FRONTEND_URL}/transactions`);
  }
);

// Auth middleware
const auth = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.sendStatus(401);

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.sendStatus(401);
  }
};

// Check login
app.get("/me", auth, async (req, res) => {
  const user = await User.findById(req.user.id).select("-__v");
  res.json(user);
});

// Logout
app.post("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
  });
  res.json({ ok: true });
});

/* ---------- DB ---------- */
mongoose.connect(process.env.MONGO_URI).then(() => {
  console.log("MongoDB connected");
});

/* ---------- START ---------- */
app.listen(5000, () => console.log("Server running"));
