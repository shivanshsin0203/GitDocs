import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import apiRouter from "./api/server";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({origin:"http://localhost:5173"}));
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api", apiRouter);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
