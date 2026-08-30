import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import prisma from "./lib/prisma";
import emailRoutes from "./routes/email.routes";
import authRoutes from "./routes/auth.routes";
import { initializeEmailIndex } from "./services/search/elasticsearch.service";
import { setupBullBoard } from "./dashboard/bull-board";


const app = express();
setupBullBoard(app);

app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(morgan("dev"));

app.use("/auth", authRoutes);
app.use("/emails", emailRoutes);


app.get("/", (req, res) => {
  res.json({
    message: "Email Scheduler Backend is running",
  });
});



app.get("/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      status: "OK",
      database: "Connected",
    });
  } catch (error) {
    res.status(500).json({
      status: "ERROR",
      database: "Disconnected",
    });
  }
});

const PORT = Number(process.env.PORT) || 5000;

initializeEmailIndex()
  .catch((error) => {
    console.error("Failed to initialize Elasticsearch:", error);
    console.log("Continuing without Elasticsearch...");
  })
  .finally(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });
  });