import "dotenv/config";
import express from "express";
import cors from "cors";
import identifyRouter from "./routes/identify.js";
import { notFoundHandler, globalErrorHandler } from "./middleware/errorHandler.js";
import prisma from "./prismaClient.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(
  cors({
    origin: "*", 
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (_req, res) => {
  res.json({
    message: "Bitespeed Identity Reconciliation API",
    version: "1.0.0",
    endpoints: {
      identify: "POST /identify",
      health: "GET /health",
    },
  });
});

app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", database: "connected", timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: "error", database: "disconnected" });
  }
});

app.use("/identify", identifyRouter);
app.use(notFoundHandler);
app.use(globalErrorHandler);

async function bootstrap() {
  try {
    await prisma.$connect();
    console.log("Database connected successfully");

    app.listen(PORT, () => {
      console.log(`Server running at ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to connect to database:", error);
    process.exit(1);
  }
}

bootstrap();

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  console.log("\n👋 Server shut down gracefully");
  process.exit(0);
});
