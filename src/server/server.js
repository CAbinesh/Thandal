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
app.set("trust proxy", 1); // Render requirement

/* -------------------- MIDDLEWARE -------------------- */
app.use(helmet());
app.use(express.json());
app.use(cookieParser());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
});
app.use(limiter);

const FRONTEND_URL = "https://thandalfront.onrender.com";

app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);

app.use(passport.initialize());

/* -------------------- JWT -------------------- */
const generateToken = (user) =>
  jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });

/* -------------------- GOOGLE OAUTH -------------------- */
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.REDIRECT_URL}/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) return done(new Error("No email from Google"), null);

        let user = await User.findOne({ email });

        if (user) {
          if (!user.googleId) {
            user.googleId = profile.id;
            user.provider = "google";
            await user.save();
          }
        } else {
          user = await User.create({
            userName: profile.displayName,
            email,
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

app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${FRONTEND_URL}/login`,
  }),
  (req, res) => {
    const token = generateToken(req.user);
    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "none",
      secure: true,
    });
    res.redirect(`${FRONTEND_URL}/`);
  }
);

/* -------------------- GITHUB OAUTH -------------------- */
passport.use(
  new GithubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: `${process.env.REDIRECT_URL}/auth/github/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email =
          profile.emails && profile.emails.length
            ? profile.emails[0].value
            : `${profile.username}@github.com`;

        let user = await User.findOne({ email });

        if (user) {
          if (!user.githubId) {
            user.githubId = profile.id;
            user.provider = "github";
            await user.save();
          }
        } else {
          user = await User.create({
            userName: profile.displayName || profile.username,
            email,
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

app.get("/auth/github", passport.authenticate("github", { scope: ["user:email"] }));

app.get(
  "/auth/github/callback",
  passport.authenticate("github", {
    session: false,
    failureRedirect: `${FRONTEND_URL}/login`,
  }),
  (req, res) => {
    const token = generateToken(req.user);
    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "none",
      secure: true,
    });
    res.redirect(`${FRONTEND_URL}/`);
  }
);

/* -------------------- AUTH MIDDLEWARE -------------------- */
const auth = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ message: "Not authenticated" });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};

/* -------------------- USER -------------------- */
app.get("/me", auth, async (req, res) => {
  const user = await User.findById(req.user.id).select("-__v");
  res.json(user);
});

app.post("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    sameSite: "none",
    secure: true,
  });
  res.json({ message: "Logged out" });
});

/* -------------------- TRANSACTIONS -------------------- */
app.get("/transactions", auth, async (req, res) => {
  const data = await Transactions.find({ userId: req.user.id }).sort({ datee: -1 });
  res.json(data);
});

app.post("/transactions", auth, async (req, res) => {
  const { takenAmnt, cltnAmnt, datee } = req.body;
  const tx = await Transactions.create({
    takenAmnt,
    cltnAmnt,
    datee,
    userId: req.user.id,
  });
  res.status(201).json(tx);
});

app.delete("/transactions/:id", auth, async (req, res) => {
  await Transactions.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
  res.json({ message: "Deleted successfully" });
});

/* -------------------- DB -------------------- */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected ✅"))
  .catch((err) => {
    console.error("MongoDB Error ❌", err);
    process.exit(1);
  });

/* -------------------- SERVER -------------------- */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on ${PORT} ✅`));
