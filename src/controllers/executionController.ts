import { Request, Response } from 'express';
import { executeCode } from '../services/dockerService';

export const handleExecution = async (req: Request, res: Response) => {
  try {
    const { code, language } = req.body;

    if (!code || !language) {
      return res.status(400).json({ error: 'Code and language are required parameters.' });
    }

    const validLanguages = ['c', 'cpp', 'c++', 'java'];
    if (!validLanguages.includes(language.toLowerCase())) {
      return res.status(400).json({ error: 'Unsupported language requested.' });
    }

    // Call the pure dockerode sandbox execution pipeline
    const result = await executeCode(code, language.toLowerCase());

    return res.status(200).json({
      stdout: result.stdout,
      stderr: result.stderr
    });

  } catch (error: any) {
    console.error('[Execution Error]', error);
    return res.status(500).json({
      error: 'Execution failed or timed out. Hardware limits enforced.',
      details: error.message
    });
  }
};
