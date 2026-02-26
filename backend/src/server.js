import express  from 'express';
import helmet   from 'helmet';
import cors     from 'cors';

import { env }             from './config/env.js';
import { logger }          from './utils/logger.js';
import { requestLogger }   from './middleware/requestLogger.js';
import { errorHandler }    from './middleware/errorHandler.js';
import { authRouter }      from './routes/auth.js';
import { auditRouter }     from './routes/audit.js';
import { analyticsRouter } from './routes/analytics.js';

const app = express();

app.use(helmet());
app.use(cors({
  origin:         env.frontendOrigin,
  credentials:    true,
  methods:        ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(requestLogger);
app.use(express.json({ limit: '64kb' }));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/auth',      authRouter);
app.use('/api/audit',     auditRouter);
app.use('/api/analytics', analyticsRouter);

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
app.use(errorHandler);

app.listen(env.port, () => {
  logger.info({ port: env.port, env: env.nodeEnv }, 'AdmitGuard backend started');
});

export default app;
