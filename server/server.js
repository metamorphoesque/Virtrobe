// server/server.js
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import config from './config/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import garmentRoutes from './routes/garment.routes.js';

const app = express();

// ============================================
// MIDDLEWARE
// ============================================
app.use(helmet());
app.use(cors({
  origin: config.clientUrl,
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================
// ROUTES
// ============================================
app.use('/api/garment', garmentRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Virtrobe API is running',
    timestamp: new Date().toISOString()
  });
});

// ============================================
// ERROR HANDLING
// ============================================
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// ============================================
// START SERVER
// ============================================
const PORT = config.port;

app.listen(PORT, () => {
  console.log('🚀 Virtrobe API Server Started');
  console.log(`   Port: ${PORT}`);
  console.log(`   Environment: ${config.nodeEnv}`);
  console.log(`   Client URL: ${config.clientUrl}`);
  console.log(`   Modal Endpoint: ${config.modalEndpoint || 'NOT CONFIGURED'}`);
  console.log('');
});