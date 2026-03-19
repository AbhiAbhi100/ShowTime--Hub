import { exec } from 'child_process';

const PORT = 5000;

function freePort() {
  const command = process.platform === 'win32' 
    ? `netstat -ano | findstr :${PORT}`
    : `lsof -i :${PORT} -t`;

  exec(command, (error, stdout) => {
    if (error || !stdout) {
      console.log(`✅ No process found running on port ${PORT}`);
      return;
    }

    const lines = stdout.trim().split('\n');
    const pids = new Set<string>();

    lines.forEach(line => {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && /^\d+$/.test(pid) && pid !== '0') {
        pids.add(pid);
      }
    });

    if (pids.size === 0) {
      console.log(`✅ No valid PIDs found for port ${PORT}`);
      return;
    }

    pids.forEach(pid => {
      console.log(`⚠️ Killing process with PID: ${pid}`);
      try {
        process.kill(Number(pid), 'SIGKILL');
        console.log(`✅ Killed PID ${pid}`);
      } catch (e: any) {
        console.error(`❌ Failed to kill PID ${pid}: ${e.message}`);
        // Try fallback to system command if process.kill fails (e.g. permission)
        if (process.platform === 'win32') {
             exec(`taskkill /F /PID ${pid}`, (err) => {
                 if(err) console.error("Taskkill also failed");
                 else console.log("Killed via taskkill");
             });
        }
      }
    });
  });
}

freePort();
