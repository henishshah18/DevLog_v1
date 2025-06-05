import express from "express";
import cors from "cors";
import { setupAuth } from "./auth";
import { registerRoutes } from "./routes";
import { setupScheduler } from "./scheduler";

const app = express();

// Enable CORS with specific options
app.use(cors({
  origin: ['http://localhost:5001', 'http://127.0.0.1:5001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

setupAuth(app);
await registerRoutes(app);
setupScheduler();

const port = Number(process.env.PORT) || 5000;

// Try to start the server, if port is in use, try the next available port
const startServer = async () => {
  try {
    app.listen(port, () => {
      console.log(`${new Date().toLocaleTimeString()} [express] serving on port ${port}`);
    });
  } catch (error: any) {
    if (error.code === 'EADDRINUSE') {
      console.log(`Port ${port} is in use, trying port ${port + 1}`);
      app.listen(port + 1, () => {
        console.log(`${new Date().toLocaleTimeString()} [express] serving on port ${port + 1}`);
      });
    } else {
      console.error('Error starting server:', error);
      process.exit(1);
    }
  }
};

startServer();
