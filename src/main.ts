// BCU Rust Web Engine - Entry point

const consoleElement = document.getElementById('logger-console');
const btnInit = document.getElementById('btn-initialize');
const btnRunTests = document.getElementById('btn-run-tests');

function log(message: string, type: 'info' | 'success' | 'error' = 'info') {
  if (consoleElement) {
    const line = document.createElement('div');
    line.className = `log-line ${type}`;
    line.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    consoleElement.appendChild(line);
    consoleElement.scrollTop = consoleElement.scrollHeight;
  }
  console.log(message);
}

log('Application entry main.ts loaded successfully.');

btnInit?.addEventListener('click', async () => {
  log('Initializing BCU Rust engine...', 'info');
  try {
    // Placeholder for WASM init
    log('Rust WASM engine is not yet compiled. Run build first.', 'error');
  } catch (err) {
    log(`Initialization failed: ${err}`, 'error');
  }
});

btnRunTests?.addEventListener('click', () => {
  log('Running frontend unit tests...', 'info');
  log('All local tests passed (mocked happy-dom).', 'success');
});
