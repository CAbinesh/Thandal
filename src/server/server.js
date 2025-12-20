/* eslint-disable no-undef */
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import Transactions from "../Models/Transactions.js";
import dotenv from "dotenv";
import helmet from "helmet";
import ratelimit from "express-rate-limit";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import GithubStrategy from "passport-github";
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
const FRONTEND_URL = "http://localhost:5173";
// "https://thandalfront.onrender.com";
const CORSoption = {
  origin: `${FRONTEND_URL}`,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(CORSoption));
app.use(passport.initialize());

/* ---------- GOOGLE OAuth ---------- */
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
        done(error, null);
      }
    }
  )
);

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${FRONTEND_URL}/login`,
  }),
  (req, res) => {
    const token = generateToken(req.user);
    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "none",
    });
    res.redirect(`${FRONTEND_URL}/transactions`);
  }
);

/* ---------- GITHUB OAuth ---------- */
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
        done(error, null);
      }
    }
  )
);

app.get(
  "/auth/github",
  passport.authenticate("github", { scope: ["user:email"] })
);

app.get(
  "/auth/github/callback",
 passport.authenticate("github", {
  failureRedirect: `${FRONTEND_URL}/login`,
}),
  (req, res) => {
    const token = generateToken(req.user);
    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "none",
    });
    res.redirect(`${FRONTEND_URL}/transactions`);
  }
);

// MongoDB connection (minimal fix)
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
    res.status(401).json({ error, message: "Ivalid token" });
  }
};
app.get("/me", middleware, async (req, res) => {
  const user = await User.findById(req.user.id).select("-__v");
  res.json(user);
});
// Logout
app.post("/logout", (req, res) => {
  res.clearCookie("token", { httpOnly: true, secure: true, sameSite: "none" });
  res.json({ message: "Logged out" });
});

// GET all transactions
app.get("/transactions", middleware, limiter, async (req, res) => {
  try {
    const transactions = await Transactions.find({ userId: req.user.id }).sort({
      datee: -1,
    });
    res.json(transactions);
  } catch (err) {
    res.status(500).json(err);
  }
});

// POST a new transaction
app.post("/transactions", middleware, limiter, async (req, res) => {
  try {
    const { takenAmnt, cltnAmnt, datee } = req.body;
    const newTransaction = new Transactions(
      { takenAmnt, cltnAmnt, datee, userId: req.user.id },
      { withCredentials: true }
    );
    const savedTransaction = await newTransaction.save();
    res.status(201).json(savedTransaction);
  } catch (err) {
    console.error("Insert Error:", err);
    res.status(500).json(err);
  }
});
//Delete
app.delete("/transactions/:id", middleware, limiter, async (req, res) => {
  try {
    await Transactions.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    }),
      { withCredentials: true };
    res.json({ message: "Deleted Successfully" });
  } catch (err) {
    res.status(500).json(err);
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT} ✅`));
