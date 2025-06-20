// main.js
const { execSync, spawn } = require("child_process");
const path = require("path");

function runSyncCommand(command, workingDir) {
  console.log(`\n📁 Entrando na pasta: ${workingDir}`);
  console.log(`🛠️  Executando: ${command}`);
  execSync(command, { cwd: workingDir, stdio: "inherit", shell: true });
}

function runAsyncCommand(command, workingDir, name) {
  console.log(`🚀 Iniciando ${name} em segundo plano: ${command}`);
  const proc = spawn(command, { cwd: workingDir, shell: true, stdio: "inherit" });

  proc.on("close", (code) => {
    console.log(`⚠️ ${name} finalizou com código ${code}`);
  });

  proc.on("error", (err) => {
    console.error(`❌ Erro ao iniciar ${name}:`, err.message);
  });
}

try {
  const root = __dirname;
  const backendDir = path.join(root, "backend");
  const frontendDir = path.join(root, "frontend");

  // Instalar dependências
  runSyncCommand("npm install", backendDir);
  runSyncCommand("npm install", frontendDir);

  // Build do frontend
  runSyncCommand("npm run build", frontendDir);

  // Iniciar ambos (em paralelo)
  runAsyncCommand("npm start", backendDir, "Backend");
  runAsyncCommand("npm start", frontendDir, "Frontend");

  console.log("\n✅ Tudo rodando. Use Ctrl+C para encerrar.");
} catch (error) {
  console.error("\n❌ Erro durante execução:");
  console.error(error.message);
  process.exit(1);
}
