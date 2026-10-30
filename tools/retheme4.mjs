// 第四轮：下载页版本显示 + 具体 Release 资产链接 + 宿主直链/镜像双按钮 + 窗口标题
// 版本：FISH-Dock v1.2.3（Setup-1.2.3.exe）；官方插件 v2.0.0
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const FILES = {
  page: ROOT + '\\_next\\static\\chunks\\app\\page-fe230513965d31cd.js',
  layout: ROOT + '\\_next\\static\\chunks\\app\\layout-7dfc656787c00f25.js',
};
const BACKUP = ROOT + '\\tools\\backup';

const DOCK_TAG = 'v1.2.3';
const PLUG_TAG = 'v2.0.0';
const DOCK_ASSET = 'https://github.com/Fish-under-sea/FISH-Dock/releases/download/' + DOCK_TAG + '/FISH-Dock-Setup-' + DOCK_TAG.slice(1) + '.exe';
const DOCK_MIRROR = 'https://ghproxy.net/' + DOCK_ASSET;
const PLUG_BASE = 'https://github.com/Fish-under-sea/FISH-DOCK-Plugins/releases/download/' + PLUG_TAG + '/';

function replaceAll(source, oldStr, newStr) {
  const n = source.split(oldStr).length - 1;
  return { source: n === 0 ? source : source.split(oldStr).join(newStr), n: n };
}

const report = [];
await mkdir(BACKUP, { recursive: true });

// 数据替换（page.js 与 layout.js 的 7556 数据相同）
const DATA_PAIRS = [
  // 宿主卡
  ['tagline:"宿主",description:"Windows AI 桌面宿主：桌面岛、模型工作台与插件中心"', 'tagline:"宿主 · ' + DOCK_TAG + '",description:"Windows AI 桌面宿主：桌面岛、模型工作台与插件中心"', '宿主 tagline+版本'],
  ['audience:"需要统一工作台的 Windows 用户",downloadUrl:"",downloadLabel:"立即下载",badge:"宿主"', 'audience:"需要统一工作台的 Windows 用户",downloadUrl:"' + DOCK_ASSET + '",mirrorUrl:"' + DOCK_MIRROR + '",downloadLabel:"立即下载",badge:"宿主"', '宿主下载地址+镜像'],
  // 飞书
  ['tagline:"通知",description:"群机器人通知、事件筛选和签名配置"', 'tagline:"通知 · ' + PLUG_TAG + '",description:"群机器人通知、事件筛选和签名配置"', '飞书 tagline+版本'],
  ['audience:"需要飞书通知的团队",downloadUrl:"",downloadLabel:"立即下载",badge:"通知"', 'audience:"需要飞书通知的团队",downloadUrl:"' + PLUG_BASE + 'feishu.fish-plugin",downloadLabel:"立即下载",badge:"通知"', '飞书下载地址'],
  // Clash
  ['tagline:"代理",description:"基于 mihomo 的代理管理"', 'tagline:"代理 · ' + PLUG_TAG + '",description:"基于 mihomo 的代理管理"', 'Clash tagline+版本'],
  ['audience:"需要代理管理的用户",downloadUrl:"",downloadLabel:"立即下载",badge:"代理"', 'audience:"需要代理管理的用户",downloadUrl:"' + PLUG_BASE + 'clash.fish-plugin",downloadLabel:"立即下载",badge:"代理"', 'Clash下载地址'],
  // Magpie
  ['tagline:"网关",description:"独立模型网关与原生管理页"', 'tagline:"网关 · ' + PLUG_TAG + '",description:"独立模型网关与原生管理页"', 'Magpie tagline+版本'],
  ['audience:"需要模型网关的用户",downloadUrl:"",downloadLabel:"立即下载",badge:"网关"', 'audience:"需要模型网关的用户",downloadUrl:"' + PLUG_BASE + 'magpie.fish-plugin",downloadLabel:"立即下载",badge:"网关"', 'Magpie下载地址'],
  // OFM（状态在 badge，tagline 显示版本）
  ['tagline:"已上线 · 暂停维护",description:"本地模型渠道与 API 工作台 — 已上线，自 2026 年 10 月 25 日起暂停维护，已安装版本可继续使用。"', 'tagline:"本地模型 · ' + PLUG_TAG + '",description:"本地模型渠道与 API 工作台 — 已上线，自 2026 年 10 月 25 日起暂停维护，已安装版本可继续使用。"', 'OFM tagline+版本'],
  ['audience:"本地模型用户",downloadUrl:"",downloadLabel:"立即下载",badge:"已上线 · 暂停维护"', 'audience:"本地模型用户",downloadUrl:"' + PLUG_BASE + 'ofm.fish-plugin",downloadLabel:"立即下载",badge:"已上线 · 暂停维护"', 'OFM下载地址'],
];

// ---------- page.js ----------
let page = await readFile(FILES.page, 'utf8');
await writeFile(BACKUP + '\\page-4.js.bak', page, 'utf8');

// 1) 窗口标题
let r = replaceAll(page, '"~/pyisland/downloads — "', '"~/fish-dock/downloads — "');
page = r.source; report.push((r.n ? 'OK ' : 'MISS ') + '窗口标题 (' + r.n + ')');

// 2) 数据
for (const pair of DATA_PAIRS) {
  r = replaceAll(page, pair[0], pair[1]);
  page = r.source;
  report.push((r.n ? 'OK ' : 'MISS ') + pair[2] + ' (' + r.n + ')');
}

// 3) x() 逻辑：无 API 时优先使用数据中的 downloadUrl
r = replaceAll(page,
  'downloadUrl:r?a:("eisland"===e.id?"https://github.com/Fish-under-sea/FISH-Dock/releases":"https://github.com/Fish-under-sea/FISH-DOCK-Plugins/releases")',
  'downloadUrl:r?a:(e.downloadUrl||("eisland"===e.id?"https://github.com/Fish-under-sea/FISH-Dock/releases":"https://github.com/Fish-under-sea/FISH-DOCK-Plugins/releases"))');
page = r.source; report.push((r.n ? 'OK ' : 'MISS ') + 'page x() 优先数据 URL (' + r.n + ')');

// 4) 下载按钮：宿主卡支持直链 + 镜像双按钮
const startMark = 'children:"立即下载"===F.downloadLabel?';
const start = page.indexOf(startMark);
if (start < 0) { report.push('MISS 下载按钮改造（未找到起点）'); }
else {
  const btnStart = page.indexOf('(0,a.jsxs)("button",{', start);
  const endMark = 'F.downloadLabel]})';
  const endIdx = page.indexOf(endMark, btnStart);
  if (btnStart < 0 || endIdx < 0) { report.push('MISS 下载按钮改造（边界未找到）'); }
  else {
    const end = endIdx + endMark.length;
    const REST = page.slice(btnStart, end);
    const styleStart = REST.indexOf('style:{');
    const ariaStart = REST.indexOf('"aria-label"');
    const childStart = REST.indexOf('children:[') + 'children:['.length;
    const labelIdx = REST.lastIndexOf('F.downloadLabel]})');
    const styleSeg = REST.slice(styleStart, ariaStart).replace('style:{width:"100%",', 'style:{flex:"1 1 0",minWidth:0,');
    const SVG = REST.slice(childStart, labelIdx).replace(/,\s*$/, '');
    const btn1 = '(0,a.jsxs)("button",{onClick:()=>window.open(F.downloadUrl,"_blank"),' + styleSeg + '"aria-label":"下载 ".concat(F.name),children:[' + SVG + ',F.mirrorUrl?"直链下载":F.downloadLabel]})';
    const btn2 = '(0,a.jsxs)("button",{onClick:()=>window.open(F.mirrorUrl,"_blank"),' + styleSeg + '"aria-label":"镜像下载 ".concat(F.name),children:[' + SVG + ',"镜像下载"]})';
    const newBlock = 'children:"立即下载"===F.downloadLabel?(0,a.jsxs)("div",{style:{display:"flex",gap:"10px",width:"100%"},children:[' + btn1 + ',F.mirrorUrl?' + btn2 + ':null]})';
    page = page.slice(0, start) + newBlock + page.slice(end);
    report.push('OK 下载按钮双按钮改造');
  }
}
await writeFile(FILES.page, page, 'utf8');

// ---------- layout.js ----------
let layout = await readFile(FILES.layout, 'utf8');
await writeFile(BACKUP + '\\layout-4.js.bak', layout, 'utf8');
for (const pair of DATA_PAIRS) {
  r = replaceAll(layout, pair[0], pair[1]);
  layout = r.source;
  report.push((r.n ? 'OK ' : 'MISS ') + 'layout ' + pair[2] + ' (' + r.n + ')');
}
r = replaceAll(layout,
  'downloadUrl:a?i:("eisland"===e.id?"https://github.com/Fish-under-sea/FISH-Dock/releases":"https://github.com/Fish-under-sea/FISH-DOCK-Plugins/releases")',
  'downloadUrl:a?i:(e.downloadUrl||("eisland"===e.id?"https://github.com/Fish-under-sea/FISH-Dock/releases":"https://github.com/Fish-under-sea/FISH-DOCK-Plugins/releases"))');
layout = r.source; report.push((r.n ? 'OK ' : 'MISS ') + 'layout x() 优先数据 URL (' + r.n + ')');
await writeFile(FILES.layout, layout, 'utf8');

console.log(report.join('\n'));
