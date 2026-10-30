// 第三轮修正：page.js 下载 fallback + OFM 状态（已上线 · 暂停维护）
// 用法：node tools/retheme3.mjs
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const FILES = {
  html: ROOT + '\\index.html',
  page: ROOT + '\\_next\\static\\chunks\\app\\page-fe230513965d31cd.js',
  layout: ROOT + '\\_next\\static\\chunks\\app\\layout-7dfc656787c00f25.js',
};
const BACKUP = ROOT + '\\tools\\backup';
const RELEASE_URL = 'https://github.com/Fish-under-sea/FISH-DOCK-Plugins/releases';

function replaceAll(source, oldStr, newStr) {
  const n = source.split(oldStr).length - 1;
  return { source: n === 0 ? source : source.split(oldStr).join(newStr), n: n };
}

const report = [];
await mkdir(BACKUP, { recursive: true });

// ---- page.js ----
let page = await readFile(FILES.page, 'utf8');
await writeFile(BACKUP + '\\page-3.js.bak', page, 'utf8');

const pagePairs = [
  // 下载按钮 fallback（page.js 压缩变量名是 r）
  ['return{...e,downloadUrl:r?a:"",downloadLabel:r?"立即下载":"即将推出"}', 'return{...e,downloadUrl:r?a:"' + RELEASE_URL + '",downloadLabel:"立即下载"}', 'page 下载 fallback'],
  // 下载卡 OFM：标签改为已上线
  ['downloadLabel:"即将推出",badge:"本地模型"', 'downloadLabel:"立即下载",badge:"已上线 · 暂停维护"', 'page OFM 下载卡'],
  // 下载卡 OFM 的 tagline / 描述
  ['name:"OFM 本地模型",tagline:"本地模型",description:"本地模型渠道与 API 工作台（2026-10 起暂停维护）"', 'name:"OFM 本地模型",tagline:"已上线 · 暂停维护",description:"本地模型渠道与 API 工作台 — 已上线，自 2026 年 10 月 25 日起暂停维护，已安装版本可继续使用。"', 'page OFM 下载卡文案'],
  // 插件卡片 OFM
  ['{id:"PyCapsule",name:"OFM 本地模型",tagline:"本地渠道 · API 工作台"', '{id:"PyCapsule",name:"OFM 本地模型",tagline:"已上线 · 暂停维护"', 'page OFM 插件卡片'],
];
for (const pair of pagePairs) {
  const r = replaceAll(page, pair[0], pair[1]);
  page = r.source;
  report.push(r.n === 0 ? ('MISS ' + pair[2]) : ('OK ' + pair[2] + ' (' + r.n + ')'));
}
await writeFile(FILES.page, page, 'utf8');

// ---- layout.js ----
let layout = await readFile(FILES.layout, 'utf8');
await writeFile(BACKUP + '\\layout-3.js.bak', layout, 'utf8');
const layoutPairs = [
  ['return{...e,downloadUrl:a?i:"https://github.com/Fish-under-sea/FISH-DOCK-Plugins/releases",downloadLabel:"立即下载"}', 'return{...e,downloadUrl:a?i:"' + RELEASE_URL + '",downloadLabel:"立即下载"}', 'layout 下载 fallback（保持）'],
  ['downloadLabel:"立即下载",badge:"本地模型"', 'downloadLabel:"立即下载",badge:"已上线 · 暂停维护"', 'layout OFM 下载卡'],
  ['name:"OFM 本地模型",tagline:"本地模型",description:"本地模型渠道与 API 工作台（2026-10 起暂停维护）"', 'name:"OFM 本地模型",tagline:"已上线 · 暂停维护",description:"本地模型渠道与 API 工作台 — 已上线，自 2026 年 10 月 25 日起暂停维护，已安装版本可继续使用。"', 'layout OFM 下载卡文案'],
];
for (const pair of layoutPairs) {
  const r = replaceAll(layout, pair[0], pair[1]);
  layout = r.source;
  report.push(r.n === 0 ? ('MISS ' + pair[2]) : ('OK ' + pair[2] + ' (' + r.n + ')'));
}
await writeFile(FILES.layout, layout, 'utf8');

// ---- index.html ----
let html = await readFile(FILES.html, 'utf8');
await writeFile(BACKUP + '\\index-3.html.bak', html, 'utf8');
const htmlPairs = [
  ['本地模型渠道与 API 工作台 — 自 2026 年 10 月 25 日起暂停维护，已安装版本可继续使用。', '本地模型渠道与 API 工作台 — 已上线，自 2026 年 10 月 25 日起暂停维护，已安装版本可继续使用。', 'html OFM 描述'],
  ['本地渠道 · API 工作台', '已上线 · 暂停维护', 'html OFM 插件卡片 tagline'],
];
for (const pair of htmlPairs) {
  const r = replaceAll(html, pair[0], pair[1]);
  html = r.source;
  report.push(r.n === 0 ? ('MISS ' + pair[2]) : ('OK ' + pair[2] + ' (' + r.n + ')'));
}
await writeFile(FILES.html, html, 'utf8');

console.log(report.join('\n'));
