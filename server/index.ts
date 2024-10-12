import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import path from 'path';
import lasRoutes from './routes/las.routes';
import { fileURLToPath } from 'url';
import connectDB from './db';

// Get the file path from import.meta.url
const __filename = fileURLToPath(import.meta.url);

// Get the directory name
const __dirname = path.dirname(__filename);

// Load the appropriate .env file based on NODE_ENV
const envFile = `.env.${process.env.NODE_ENV || 'development'}`;

config({ path: path.resolve(__dirname, envFile) });

console.log(`Running in ${process.env.NODE_ENV} mode`);
console.log(`App listening on port: 5000`);

const app = express();
const port = 5000;

// Configure CORS to allow requests from FRONTEND_URL
const allowedOrigins = [process.env.FRONTEND_URL];

const corsOptions = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  origin: (origin: string | undefined, callback: any) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
};

// Apply CORS middleware with the configured options
app.use(cors(corsOptions));

connectDB();

// Parse JSON bodies (for POST requests)
app.use(express.json());

import './websocketServer';

// Set routes
app.use('/api/las', lasRoutes);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
