import { Router } from 'express';
import { handleExecution } from '../controllers/executionController';

const router = Router();

router.post('/execute', handleExecution);

export default router;
