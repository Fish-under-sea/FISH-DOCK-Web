// 滚动到下载章节并逐屏记录窗口标题与按钮，验证下载页改造。
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const OUT_DIR = fileURLToPath(new URL('..', import.meta.url));
const targets = await (await fetch('http://127.0.0.1:9222/json/list')).json();
const page = targets.find((t) => t.type === 'page' && !t.url.startsWith('devtools://'));
const ws = new WebSocket(page.webSocketDebuggerUrl);
let seq = 0; const pending = new Map();
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++seq; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params }));
});
ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data);
  if (!msg.id || !pending.has(msg.id)) return;
  const { resolve, reject } = pending.get(msg.id); pending.delete(msg.id);
  msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
});
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
const evaluate = async (expression) => {
  const { result } = await send('Runtime.evaluate', { expression, returnByValue: true });
  return result.value;
};
await send('Page.enable');
await send('Page.navigate', { url: 'http://127.0.0.1:8080/' });
await new Promise((r) => setTimeout(r, 8000));

for (let i = 0; i < 16; i++) {
  await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 720, y: 450, deltaX: 0, deltaY: 650 });
  await new Promise((r) => setTimeout(r, 1200));
  const info = await evaluate(`(() => {
    const t = document.body.innerText;
    const title = (t.match(/~\\/[^\\n—]+—\\s*\\d+\\s*\\/\\s*\\d+/) || [null])[0];
    const btns = [...document.querySelectorAll('button')].map(b => b.innerText.trim()).filter(x => x && x.length < 10);
    const ver = (t.match(/v\\d+\\.\\d+\\.\\d+/g) || []);
    return JSON.stringify({ title, btns: [...new Set(btns)], ver: [...new Set(ver)] });
  })()`);
  console.log('#' + i + ' ' + info);
}
const { data } = await send('Page.captureScreenshot', { format: 'png' });
await writeFile(OUT_DIR + '\\verify-download.png', Buffer.from(data, 'base64'));
ws.close();
console.log('done');
