import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// Load root .env first, then local
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

import apiRoutes from './routes/api';
import { connectMongo } from './db/mongodb';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: '*' }));
app.use(express.json());

// Initialize MongoDB on startup (only in non-test mode; falls back to SQLite gracefully)
if (process.env.NODE_ENV !== 'test') {
  connectMongo().catch(err => {
    console.warn('[Server] MongoDB background init note:', err.message);
  });
}

// Static exports for generated PPTX files
app.use('/exports', express.static(path.join(__dirname, '../data/exports')));

// Mount API
app.use('/api/v1', apiRoutes);

// Root greeting
app.get('/', (req, res) => {
  res.json({
    platform: 'USAI - Unified AI Event Discovery, Research & Action Platform',
    version: '1.0.0',
    documentation: '/api/v1/health',
    status: 'online'
  });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 USAI Backend Server running on http://localhost:${PORT}`);
    console.log(`📡 API Endpoints available at http://localhost:${PORT}/api/v1`);
  });
}

export default app;

