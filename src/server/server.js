/* eslint-disable no-undef */
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import Transactions from "../Models/Transactions.js";
import dotenv from "dotenv";
import helmet from "helmet";

dotenv.config();

const app = express();
app.use(helmet());
app.use(express.json());


const CORSoption = {
  origin: "https://thandal.onrender.com", // FIXED typo
  credentials: true,              // FIXED
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
};
app.use(cors(CORSoption));

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

app.get("/", (req, res) => res.send("Backend live ✅"));

// GET all transactions
app.get("/transactions", async (req, res) => {
  try {
    const transactions = await Transactions.find().sort({ datee: -1 });
    res.json(transactions);
  } catch (err) {
    res.status(500).json(err);
  }
});

// POST a new transaction
app.post("/transactions", async (req, res) => {
  try {
    const { takenAmnt, cltnAmnt, datee } = req.body;
    const newTransaction = new Transactions({ takenAmnt, cltnAmnt, datee });
    const savedTransaction = await newTransaction.save();
    res.status(201).json(savedTransaction);
  } catch (err) {
    console.error("Insert Error:", err);
    res.status(500).json(err);
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT} ✅`));
