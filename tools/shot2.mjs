// 通过 CDP 驱动页面（传统滚动或滚轮事件）并逐段截图，用于验证滚动动画区块。
// 前置：Chrome 以 --remote-debugging-port=9222 启动，并打开 http://127.0.0.1:8080/
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const OUT_DIR = fileURLToPath(new URL('..', import.meta.url));
const targets = await (await fetch('http://127.0.0.1:9222/json/list')).json();
const page = targets.find((t) => t.type === 'page' && !t.url.startsWith('devtools://'));
if (!page) throw new Error('未找到可用的页面目标');

const ws = new WebSocket(page.webSocketDebuggerUrl);
let seq = 0;
const pending = new Map();
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data);
  if (!msg.id || !pending.has(msg.id)) return;
  const { resolve, reject } = pending.get(msg.id);
  pending.delete(msg.id);
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

const metrics = JSON.parse(await evaluate('JSON.stringify({ h: document.documentElement.scrollHeight, vh: innerHeight, sy: scrollY })'));
console.log(`页面高度 ${metrics.h}px，视口 ${metrics.vh}px`);

const shots = [];
// 本站为固定视口的滚轮驱动滚动叙事页，直接使用滚轮事件推进章节
{
  for (let i = 0; i < 17; i++) {
    await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 720, y: 450, deltaX: 0, deltaY: 650 });
    await new Promise((r) => setTimeout(r, 1500));
    const { data } = await send('Page.captureScreenshot', { format: 'png' });
    const file = OUT_DIR + `\\wheel-${String(i).padStart(2, '0')}.png`;
    await writeFile(file, Buffer.from(data, 'base64'));
    shots.push(file);
    console.log(`滚轮 #${i} 截图完成`);
  }
}
ws.close();
console.log('完成：' + shots.length + ' 张截图');
