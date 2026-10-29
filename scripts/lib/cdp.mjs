// Auxiliar minimo: abre o Chrome sem janela, controla por CDP (WebSocket nativo
// do Node), manda teclas e junta os erros do console.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CHROME = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome', '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((path) => path && fs.existsSync(path));
if (!CHROME) throw new Error('Chrome nao encontrado: defina CHROME_PATH');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function abrir(url = 'about:blank') {
  const port = 9300 + Math.floor(Math.random() * 500);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-'));
  const chrome = spawn(CHROME, [
    '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${dir}`,
    '--no-first-run', '--disable-gpu-vsync', '--autoplay-policy=no-user-gesture-required',
    '--window-size=1280,740', 'about:blank',
  ], { stdio: 'ignore' });

  let targets = null;
  for (let i = 0; i < 60 && !targets; i += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json`);
      targets = (await response.json()).find((target) => target.type === 'page');
    } catch { await sleep(250); }
  }
  if (!targets) throw new Error('Chrome nao abriu');

  const socket = new WebSocket(targets.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let nextId = 1;
  const waiting = new Map();
  const erros = [];
  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.id && waiting.has(message.id)) { waiting.get(message.id)(message); waiting.delete(message.id); }
    if (message.method === 'Runtime.exceptionThrown') erros.push(message.params.exceptionDetails.text);
    if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
      erros.push(message.params.args.map((arg) => arg.value ?? arg.description).join(' '));
    }
  };
  const enviar = (method, params = {}) => new Promise((resolve) => {
    const id = nextId++;
    waiting.set(id, resolve);
    socket.send(JSON.stringify({ id, method, params }));
  });
  await enviar('Page.enable');
  await enviar('Runtime.enable');
  if (url !== 'about:blank') await enviar('Page.navigate', { url });

  async function tecla(key, code, ms = 60) {
    const base = { key, code, windowsVirtualKeyCode: key.length === 1 ? key.toUpperCase().charCodeAt(0) : ({ Enter: 13, Escape: 27 })[key] ?? 0 };
    await enviar('Input.dispatchKeyEvent', { type: 'keyDown', ...base, text: key.length === 1 ? key : undefined });
    await sleep(ms);
    await enviar('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
  }
  async function fechar() {
    try { socket.close(); } catch { /* ja fechado */ }
    chrome.kill();
    await sleep(300);
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* em uso */ }
  }
  return { enviar, tecla, erros, esperar: sleep, fechar };
}
