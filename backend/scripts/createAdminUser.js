import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { AuthMongoModel } from "../models/authMongoModel.js";

dotenv.config();

const { ADMIN_USERNAME, ADMIN_PASSWORD, MONGO_URI } = process.env;

if (!MONGO_URI || !ADMIN_USERNAME || !ADMIN_PASSWORD) {
  console.error(
    "Set MONGO_URI, ADMIN_USERNAME, and ADMIN_PASSWORD before running this script.",
  );
  process.exit(1);
}

try {
  await mongoose.connect(MONGO_URI);

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  const admin = await AuthMongoModel.findOneAndUpdate(
    { username: ADMIN_USERNAME.trim() },
    {
      $set: {
        username: ADMIN_USERNAME.trim(),
        password: passwordHash,
        last_login: null,
      },
    },
    { upsert: true, new: true, runValidators: true },
  ).lean();

  console.log(`Admin user ready: ${admin.username}`);
  await mongoose.disconnect();
} catch (error) {
  console.error("Failed to create admin user:", error.message);
  await mongoose.disconnect();
  process.exit(1);
}
