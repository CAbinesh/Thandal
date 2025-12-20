import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  userName: {
    type: String,
  },
  email: {
    type: String,
    unique: true,
    sparse: true,
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true,
  },
  githubId: {
    type: String,
    unique: true,
    sparse: true,
  },
  provider: {
    type: String,
    enum: ["google", "github"],
    required: true,
  },
}, { timestamps: true });

export default mongoose.model("User", UserSchema);
