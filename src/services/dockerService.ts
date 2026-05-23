import Docker from 'dockerode';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

// Connects directly to the host machine's Docker engine via Unix Socket / TCP
const docker = new Docker(); 

export interface ExecutionResult {
  stdout: string;
  stderr: string;
}

export const executeCode = async (code: string, language: string): Promise<ExecutionResult> => {
  // 1. Generate a unique, isolated directory for this execution run
  const executionId = crypto.randomBytes(16).toString('hex');
  const tempDir = path.join(process.cwd(), 'temp', executionId);
  
  await fs.mkdir(tempDir, { recursive: true });
  
  let fileName = '';
  let imageName = '';
  let compileCmd: string[] = [];
  let runCmd: string[] = [];

  // 2. Define compilation and execution mechanics based on machine language
  switch (language) {
    case 'cpp':
    case 'c++':
      fileName = 'main.cpp';
      imageName = 'gcc:latest'; 
      // g++ compiles to 'main' binary, then sequentially executes it
      compileCmd = ['g++', '/app/main.cpp', '-o', '/app/main'];
      runCmd = ['/app/main'];
      break;
    case 'c':
      fileName = 'main.c';
      imageName = 'gcc:latest';
      compileCmd = ['gcc', '/app/main.c', '-o', '/app/main'];
      runCmd = ['/app/main'];
      break;
    case 'java':
      fileName = 'Main.java';
      imageName = 'openjdk:17-slim';
      compileCmd = ['echo', 'Initiating Java Single-File Execution...'];
      runCmd = ['java', '/app/Main.java'];
      break;
    default:
      throw new Error('Unsupported execution language');
  }

  // Write the user's code physically to the host system temp directory
  const filePath = path.join(tempDir, fileName);
  await fs.writeFile(filePath, code);

  let container: Docker.Container | null = null;
  
  try {
    // 3. Instantiate the isolated Docker container
    // We bind-mount the temp directory into the container's /app directory
    container = await docker.createContainer({
      Image: imageName,
      // Chain compile and run commands using standard shell evaluation
      Cmd: ['sh', '-c', `${compileCmd.join(' ')} && ${runCmd.join(' ')}`],
      HostConfig: {
        Binds: [`${tempDir}:/app`], 
        Memory: 50 * 1024 * 1024,     // Hardware limit: 50MB RAM prevents memory exhaustion attacks
        MemorySwap: 50 * 1024 * 1024, // Prevent swapping to enforce strict memory cap
        NetworkMode: 'none',          // Hardware firewall: kill external network access
        AutoRemove: false             // We need the container to persist briefly to extract logs
      },
      AttachStdout: true,
      AttachStderr: true,
      Tty: false
    });

    // 4. Power up the container
    await container.start();

    // 5. Enforce 3-second hardware timeout
    let executionFinished = false;
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(async () => {
        if (!executionFinished && container) {
          try {
            await container.kill(); // SigKill to prevent infinite loops (e.g., while(1))
          } catch (e) {
            console.error('Failed to kill timed-out container:', e);
          }
          reject(new Error('Execution Timeout: Process exceeded the 3-second CPU time slice.'));
        }
      }, 3000)
    );

    // Wait for container to exit natively
    const containerWaitPromise = container.wait();
    
    // Race the natural execution against the kill switch
    await Promise.race([containerWaitPromise, timeoutPromise]);
    executionFinished = true;

    // 6. Extract raw hardware output buffers
    const logs = await container.logs({
      stdout: true,
      stderr: true,
    });

    // Docker streams multiplex stdout and stderr when Tty is false.
    // The stream format is an 8-byte header (type, length) followed by the payload.
    let stdoutData = '';
    let stderrData = '';
    
    const logBuffer = Buffer.isBuffer(logs) ? logs : Buffer.from(logs);
    let offset = 0;
    
    // Demultiplexing algorithm for raw Docker stream protocol
    while (offset < logBuffer.length) {
      // Byte 0 defines the stream (1 = stdout, 2 = stderr)
      const streamType = logBuffer.readUInt8(offset);
      // Bytes 4-7 define the payload length (UInt32 Big Endian)
      const payloadLength = logBuffer.readUInt32BE(offset + 4);
      // Extract the string payload
      const payload = logBuffer.slice(offset + 8, offset + 8 + payloadLength).toString('utf-8');
      
      if (streamType === 1) stdoutData += payload;
      else if (streamType === 2) stderrData += payload;
      
      offset += 8 + payloadLength; // Advance cursor to next chunk
    }

    return {
      stdout: stdoutData,
      stderr: stderrData
    };

  } finally {
    // 7. System Cleanup: Destroy the container and wipe the temp directory
    if (container) {
      try {
        await container.remove({ force: true });
      } catch (e) { 
        console.error('Container teardown failed', e);
      }
    }
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (e) { 
      console.error('Filesystem teardown failed', e);
    }
  }
};
