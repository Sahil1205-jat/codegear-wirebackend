import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import executionRoutes from './routes/executionRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Main execution API routes
app.use('/api', executionRoutes);

app.listen(PORT, () => {
  console.log(`[SYS] Code Gear Sandbox Engine active on port ${PORT}`);
});
