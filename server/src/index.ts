import "dotenv/config";
import { env } from "./lib/env";  // validates env vars; exits process on failure
import express from "express";
import cors from "cors";
import apiRouter from "./api/server";
import cookieParser from "cookie-parser";
import { globalApiLimiter } from "./api/middleware/rateLimit";
import "./worker";  // boots the BullMQ worker in the same Node process

const app = express();
const PORT = env.PORT;

app.use(cors({origin: env.FRONTEND_URL, credentials: true}));
// 35mb cap: 25mb image budget + base64 inflation headroom + small request overhead
app.use(express.json({ limit: "35mb" }));
app.use(cookieParser())

app.get("/", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api", globalApiLimiter, apiRouter);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
