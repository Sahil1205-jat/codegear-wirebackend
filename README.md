# 🐳 Code Gear Sandbox Engine (Backend)

Welcome to the backend repository of **Code Gear & Wear**. This is a Node.js/Express service that acts as a highly secure, ephemeral hardware execution engine for C, C++, and Java code.

Because the main goal of the Code Gear platform is to teach computer architecture, we don't just "eval" code. This backend physically mounts source code into isolated Linux Docker containers, compiles it using authentic toolchains (`gcc`, `g++`, `openjdk`), and streams the resulting `stdout` and `stderr` back to the client.

## 🛡️ Sandbox Security Architecture

To ensure the server cannot be compromised by infinite loops, fork bombs, or malicious network requests, every execution is strictly sandboxed via `dockerode`:

- **Memory Limits:** Hardcapped at 50MB of RAM per execution.
- **CPU Timeouts:** Processes are forcefully killed after 3 seconds.
- **Network Isolation:** Runs with `--network none` (No internet access for the user's code).
- **Ephemeral:** Containers and temporary volume mounts are instantly destroyed the millisecond execution finishes.

## 🚀 Quick Start

1. **Prerequisites:** You MUST have Docker installed and running on your host machine.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the engine:
   ```bash
   npm run dev
   ```
   *The sandbox API will boot up on port `8080`.*

## 🔌 API Reference

### `POST /api/execute`
Executes raw code in a secure container.
**Payload:**
```json
{
  "code": "#include <stdio.h>\nint main() { printf(\"Hello\"); return 0; }",
  "language": "c" // Supported: c, cpp, java
}
```

## 🛠️ Tech Stack
- **Runtime:** Node.js + Express
- **Language:** TypeScript
- **Container Orchestration:** Dockerode

## 🌐 Deployment
To deploy this backend to the internet, you MUST host it on a VPS (Virtual Private Server) that supports Docker, such as a **DigitalOcean Droplet**, **AWS EC2**, or **Railway.app**. It cannot be hosted on serverless providers like Vercel because it requires root daemon access to spawn containers.
