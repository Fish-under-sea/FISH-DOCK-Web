// 贡献者替换 + 下载状态修正（FISH Dock）
// 用法：node tools/retheme2.mjs
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const FILES = {
  html: ROOT + '\\index.html',
  page: ROOT + '\\_next\\static\\chunks\\app\\page-fe230513965d31cd.js',
  layout: ROOT + '\\_next\\static\\chunks\\app\\layout-7dfc656787c00f25.js',
};
const BACKUP = ROOT + '\\tools\\backup';

// 5 位真实贡献者（主仓 FISH-Dock + 插件仓 FISH-DOCK-Plugins）
const NEW_CONTRIBUTORS = 'let L=[{id:"Fish-under-sea",name:"FISH",nameEn:"FISH",dockLabel:"FISH",email:"https://github.com/Fish-under-sea",bio:"FISH Dock 主仓与插件仓维护者：桌面岛、模型工作台与插件生态。",traits:[{icon:"/",label:"主仓维护",desc:"39 次提交"},{icon:"/",label:"插件生态",desc:"48 次提交"},{icon:"/",label:"Rust + Tauri",desc:"桌面宿主"},{icon:"/",label:"一切皆插件",desc:"设计哲学"}],skills:[{label:"Rust"},{label:"Tauri"},{label:"Node.js"},{label:"插件系统"}]},{id:"elysia395",name:"Chensy",nameEn:"CHENSY",dockLabel:"Chensy",email:"https://github.com/elysia395",bio:"想留下些自己的痕迹的初学者，Clash 代理插件作者。",traits:[{icon:"/",label:"Clash 代理",desc:"插件作者"},{icon:"/",label:"mihomo",desc:"订阅与节点"},{icon:"/",label:"回环内核",desc:"系统代理控制"},{icon:"/",label:"初学者",desc:"留下自己的痕迹"}],skills:[{label:"Clash"},{label:"mihomo"},{label:"Node.js"}]},{id:"WTStarMark",name:"梧桐星痕",nameEn:"WTSTARMARK",dockLabel:"梧桐星痕",email:"https://github.com/WTStarMark",bio:"DSH 插件生态图谱搭建者，飞书通知插件作者。",traits:[{icon:"/",label:"飞书通知",desc:"插件作者"},{icon:"/",label:"插件生态",desc:"DSH 图谱"},{icon:"/",label:"Webhook",desc:"群机器人通知"},{icon:"/",label:"生态建设",desc:"插件目录"}],skills:[{label:"飞书"},{label:"Webhook"},{label:"Node.js"}]},{id:"jassdingk",name:"Jassdingk",nameEn:"JASSDINGK",dockLabel:"Jassdingk",email:"https://github.com/jassdingk",bio:"Magpie 网关插件作者。",traits:[{icon:"/",label:"Magpie 网关",desc:"插件作者"},{icon:"/",label:"模型网关",desc:"独立回环端口"},{icon:"/",label:"原生管理页",desc:"渠道与 API"},{icon:"/",label:"签到",desc:"随包内置"}],skills:[{label:"Magpie"},{label:"模型网关"},{label:"Node.js"}]},{id:"TCX123-a",name:"咕咕咕",nameEn:"TCX123-A",dockLabel:"咕咕咕",email:"https://github.com/TCX123-a",bio:"大二在校生，热爱折腾小项目，独立开发《咪爱编程》。",traits:[{icon:"/",label:"在校生",desc:"大二 · 热爱折腾"},{icon:"/",label:"《咪爱编程》",desc:"独立开发者"},{icon:"/",label:"小项目",desc:"Building things for fun"},{icon:"/",label:"插件贡献",desc:"官方插件仓"}],skills:[{label:"Node.js"},{label:"插件"}]}]';

const NEW_AVATAR_MAP = '({"Fish-under-sea":"/avatar/fish-under-sea.jpg","elysia395":"/avatar/elysia395.jpg","WTStarMark":"/avatar/wtstarmark.jpg","jassdingk":"/avatar/jassdingk.jpg","TCX123-a":"/avatar/tcx123-a.jpg"})';
const OLD_AVATAR_MAP = '({StarWindv:"/avatar/StarWindv.png",Code:"/avatar/code.png",silenthim:"/avatar/silenthim.jpg",GeminiMortal:"/avatar/GeminiMortal.jpg",cXp1r:"/avatar/cxp1r.png",JNTMTMTM:"/avatar/JNTMTMTM.jpg"})';

function extractArray(source, startMarker) {
  const at = source.indexOf(startMarker);
  if (at < 0) return null;
  let depth = 0, inStr = false, esc = false, end = -1;
  for (let j = at; j < source.length; j++) {
    const ch = source[j];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === '[') depth++;
    else if (ch === ']') { depth--; if (depth === 0) { end = j + 1; break; } }
  }
  return end < 0 ? null : { start: at, end: end, text: source.slice(at, end) };
}

function replaceAll(source, oldStr, newStr) {
  const n = source.split(oldStr).length - 1;
  return { source: n === 0 ? source : source.split(oldStr).join(newStr), n: n };
}

const report = [];
await mkdir(BACKUP, { recursive: true });

// ---- page.js ----
let page = await readFile(FILES.page, 'utf8');
await writeFile(BACKUP + '\\page-2.js.bak', page, 'utf8');

const arr = extractArray(page, 'let L=[{id:"silenthim"');
if (!arr) { console.error('未找到贡献者数组'); process.exit(1); }
page = page.slice(0, arr.start) + NEW_CONTRIBUTORS + page.slice(arr.end);
report.push('OK 贡献者数组替换（6 -> 5）');

const pairs = [
  [OLD_AVATAR_MAP, NEW_AVATAR_MAP, '头像映射表'],
  ['href:"mailto:".concat(L[b].email)', 'href:0===L[b].email.indexOf("http")?L[b].email:"mailto:".concat(L[b].email)', '邮箱链接支持 http'],
  ['return{...e,downloadUrl:a?i:"",downloadLabel:a?"立即下载":"即将推出"}', 'return{...e,downloadUrl:a?i:"https://github.com/Fish-under-sea/FISH-DOCK-Plugins/releases",downloadLabel:"立即下载"}', '下载按钮 fallback'],
];
for (const pair of pairs) {
  const r = replaceAll(page, pair[0], pair[1]);
  page = r.source;
  report.push(r.n === 0 ? ('MISS ' + pair[2]) : ('OK ' + pair[2] + ' (' + r.n + ')'));
}
await writeFile(FILES.page, page, 'utf8');

// ---- layout.js ----
let layout = await readFile(FILES.layout, 'utf8');
await writeFile(BACKUP + '\\layout-2.js.bak', layout, 'utf8');
for (const pair of [
  ['"#contributors":{title:"关于贡献者",subtitle:"Python-island 项目团队"}', '"#contributors":{title:"关于贡献者",subtitle:"FISH Dock 项目团队"}', '贡献者副标题'],
  ['return{...e,downloadUrl:a?i:"",downloadLabel:a?"立即下载":"即将推出"}', 'return{...e,downloadUrl:a?i:"https://github.com/Fish-under-sea/FISH-DOCK-Plugins/releases",downloadLabel:"立即下载"}', '下载按钮 fallback'],
  ['downloadLabel:"即将推出",badge:"本地模型"', 'downloadLabel:"立即下载",badge:"本地模型"', 'OFM 下载标签'],
]) {
  const r = replaceAll(layout, pair[0], pair[1]);
  layout = r.source;
  report.push(r.n === 0 ? ('MISS ' + pair[2]) : ('OK ' + pair[2] + ' (' + r.n + ')'));
}
await writeFile(FILES.layout, layout, 'utf8');

// ---- index.html ----
let html = await readFile(FILES.html, 'utf8');
await writeFile(BACKUP + '\\index-2.html.bak', html, 'utf8');
for (const pair of [
  ['Python-island 项目团队', 'FISH Dock 项目团队', '贡献者副标题（RSC）'],
]) {
  const r = replaceAll(html, pair[0], pair[1]);
  html = r.source;
  report.push(r.n === 0 ? ('MISS ' + pair[2]) : ('OK ' + pair[2] + ' (' + r.n + ')'));
}
await writeFile(FILES.html, html, 'utf8');

console.log(report.join('\n'));
