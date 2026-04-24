import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import diagnoseRouter from './routes/diagnose.js';
import chaosRouter from './routes/chaos.js';
import clusterRouter from './routes/cluster.js';
import { getAgentClient } from './config/mongo.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/diagnose', diagnoseRouter);
app.use('/api/chaos', chaosRouter);
app.use('/api/cluster', clusterRouter);

await getAgentClient();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🛡️  Atlas Health Sentinel running on http://localhost:${PORT}`);
});