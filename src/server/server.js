/* eslint-disable no-undef */
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GithubStrategy } from "passport-github";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";

import User from "../Models/User.js";
import Transactions from "../Models/Transactions.js";

dotenv.config();

const app = express();

/* ---------- MIDDLEWARE ---------- */
app.use(helmet());
app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: "https://thandalfront.onrender.com",
    credentials: true,
  })
);

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
  })
);

app.use(passport.initialize());

/* ---------- PASSPORT SERIALIZE ---------- */
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

/* ---------- JWT ---------- */
const generateToken = (user) =>
  jwt.sign(
    { id: user._id, email: user.email, provider: user.provider },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

/* ---------- GOOGLE OAUTH ---------- */
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
            userName: profile.displayName || "Google User",
            email: profile.emails?.[0]?.value || null,
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

app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => {
    const token = generateToken(req.user);

    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });

    res.redirect("https://thandalfront.onrender.com/transactions");
  }
);

/* ---------- GITHUB OAUTH ---------- */
passport.use(
  new GithubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: `${process.env.REDIRECT_URL}/auth/github/callback`,
    },
    async (_, __, profile, done) => {
      try {
        let user = await User.findOne({ githubId: profile.id });

        if (!user) {
          user = await User.create({
            userName: profile.username,
            email: profile.emails?.[0]?.value || null,
            githubId: profile.id,
            provider: "github",
          });
        }

        done(null, user);
      } catch (err) {
        done(err, null);
      }
    }
  )
);

app.get("/auth/github",
  passport.authenticate("github", { scope: ["user:email"] })
);

app.get(
  "/auth/github/callback",
  passport.authenticate("github", { failureRedirect: "/" }),
  (req, res) => {
    const token = generateToken(req.user);

    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });

    res.redirect("https://thandalfront.onrender.com/transactions");
  }
);

/* ---------- AUTH MIDDLEWARE ---------- */
const auth = (req, res, next) => {
  try {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ message: "Unauthenticated" });

    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};

/* ---------- API ---------- */
app.get("/me", auth, async (req, res) => {
  const user = await User.findById(req.user.id).select("-__v");
  res.json(user);
});

app.post("/logout", (_, res) => {
  res.clearCookie("token", { secure: true, sameSite: "none" });
  res.json({ message: "Logged out" });
});

app.get("/transactions", auth, async (req, res) => {
  const data = await Transactions.find({ userId: req.user.id }).sort({ datee: -1 });
  res.json(data);
});

app.post("/transactions", auth, async (req, res) => {
  const tx = await Transactions.create({
    ...req.body,
    userId: req.user.id,
  });
  res.status(201).json(tx);
});

app.delete("/transactions/:id", auth, async (req, res) => {
  await Transactions.findOneAndDelete({
    _id: req.params.id,
    userId: req.user.id,
  });
  res.json({ message: "Deleted" });
});

/* ---------- DB ---------- */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected ✅"))
  .catch((err) => console.error("Mongo error ❌", err));

/* ---------- START ---------- */
app.listen(process.env.PORT || 5000, () =>
  console.log("Server running ✅")
);
