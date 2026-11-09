import { testDatabaseConnection } from "./config/database.js";
import deviceRoutes from "./routes/deviceRoutes.js";
import { initializeMqtt } from "./services/mqttService.js";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";

dotenv.config();

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// API Routes
app.use("/api/devices", deviceRoutes);

// Basic health check
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "PyroAlert Backend is running",
    timestamp: new Date().toISOString()
  });
});

// Socket.IO connection
io.on("connection", (socket) => {
  console.log(`Dashboard connected: ${socket.id}`);

  socket.on("disconnect", () => {
    console.log(`Dashboard disconnected: ${socket.id}`);
  });
});

// Server
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await testDatabaseConnection();

    initializeMqtt(io);

    httpServer.listen(PORT, () => {
      console.log(`PyroAlert backend running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to connect to PostgreSQL:", error.message);
    process.exit(1);
  }
}

startServer();