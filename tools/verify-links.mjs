// 拦截 window.open，验证下载按钮的真实跳转目标
import { fileURLToPath } from 'node:url';

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
await evaluate(`window.__opened = []; window.open = function(u){ window.__opened.push(u); return null; }; true`);

const clickByText = async (text) => {
  return await evaluate(`(() => {
    const btn = [...document.querySelectorAll('button')].find(b => b.innerText.trim() === ${JSON.stringify(text)});
    if (!btn) return 'NOT_FOUND';
    btn.click();
    return window.__opened[window.__opened.length - 1] || 'NO_OPEN';
  })()`);
};

// 滚动到下载 1/5（宿主卡）
for (let i = 0; i < 12; i++) {
  await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 720, y: 450, deltaX: 0, deltaY: 650 });
  await new Promise((r) => setTimeout(r, 900));
}
const title1 = await evaluate('(document.body.innerText.match(/~\\/[^\\n—]+—\\s*\\d+\\s*\\/\\s*\\d+/) || [null])[0]');
console.log('当前位置：' + title1);
console.log('宿主直链 => ' + (await clickByText('直链下载')));
console.log('宿主镜像 => ' + (await clickByText('镜像下载')));

// 滚到 2/5（飞书）点击立即下载
await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 720, y: 450, deltaX: 0, deltaY: 650 });
await new Promise((r) => setTimeout(r, 1200));
const title2 = await evaluate('(document.body.innerText.match(/~\\/[^\\n—]+—\\s*\\d+\\s*\\/\\s*\\d+/) || [null])[0]');
console.log('当前位置：' + title2);
console.log('飞书下载 => ' + (await clickByText('立即下载')));

// 检查是否还有旧 API 请求
const apis = await evaluate('JSON.stringify(performance.getEntriesByType("resource").map(e=>e.name).filter(n=>n.includes("pyisland")||n.includes("server.")))');
console.log('旧域名请求：' + apis);
ws.close();