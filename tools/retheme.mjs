// 将 Pyisland 镜像改写为 FISH Dock 展示页：JS 数据对象整体替换 + 唯一长文案替换。
// 用法：node tools/retheme.mjs
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const FILES = {
  html: ROOT + '\\index.html',
  page: ROOT + '\\_next\\static\\chunks\\app\\page-fe230513965d31cd.js',
  layout: ROOT + '\\_next\\static\\chunks\\app\\layout-7dfc656787c00f25.js',
};
const BACKUP = ROOT + '\\tools\\backup';

// ---------- 1. JS 数据对象整体替换 ----------
// 每个对象从 startMarker 开始，按括号深度找到对象结尾后整体替换。
const JS_OBJECTS = [
  // 安装方法（开发指南章节的 4 个 tab）
  {
    start: '{id:"pyside6",name:"pyislandPyside6"',
    body: '{id:"pyside6",name:"完整安装",tagline:"官方安装包 · 开箱即用",badge:"稳定",badgeColor:"#1D1D1F",accent:"#86868B",href:"https://github.com/Fish-under-sea/FISH-Dock/releases",installMethods:[{title:"下载安装包",commands:["https://github.com/Fish-under-sea/FISH-Dock/releases"],note:"选择 FISH-Dock-Setup-1.2.0.exe"},{title:"运行安装",commands:["双击 FISH-Dock-Setup-1.2.0.exe"]},{title:"登录与更新",commands:["打开「插件」页 → GitHub 登录","「检查更新」安装官方插件"]}],requirements:["Windows 10/11 x64","WebView2","Node.js 24"]}',
  },
  {
    start: '{id:"wanku",name:"pyisland-wanku"',
    body: '{id:"wanku",name:"开发构建",tagline:"Rust + Tauri · 本地调试",badge:"开发",badgeColor:"#1D1D1F",accent:"#86868B",href:"https://github.com/Fish-under-sea/FISH-Dock",installMethods:[{title:"环境准备",commands:["rustup default stable-msvc"],note:"需要 Rust MSVC 工具链与 Windows SDK"},{title:"启动宿主",commands:["cargo run --locked --no-default-features --manifest-path Wakuwaku/src-tauri/Cargo.toml"]},{title:"运行测试",commands:["node --test --test-isolation=none sdk/node/*.test.mjs"]}],requirements:["Rust MSVC","Windows SDK","Node.js 24"]}',
  },
  {
    start: '{id:"tauri",name:"tauri-island",tagline:"性能优先 \\xb7 Rust 重写",badge:"高性能"',
    body: '{id:"tauri",name:"插件安装",tagline:"官方插件 · 按需装载",badge:"插件",badgeColor:"#1D1D1F",accent:"#86868B",href:"https://github.com/Fish-under-sea/FISH-DOCK-Plugins",installMethods:[{title:"插件市场",commands:["打开「插件」页 → 检查更新","勾选飞书 / Clash / Magpie / OFM 安装"],note:"官方目录 catalog/stable.json"},{title:"npm 单包",commands:["npm install @fish-under-sea/fish-dock-plugin-clash@2.0.0","npx @fish-under-sea/fish-dock-plugin-clash --out C:/work/plugins"]},{title:"导入插件",commands:["插件页导入 .fish-plugin"]}],requirements:["FISH Dock ≥ 2.0.0","Node.js ≥ 24"]}',
  },
  {
    start: '{id:"pyislandqt",name:"pyislandQT"',
    body: '{id:"pyislandqt",name:"数据与备份",tagline:"整仓备份 · 事务恢复",badge:"安全",badgeColor:"#1D1D1F",accent:"#86868B",href:"https://github.com/Fish-under-sea/FISH-Dock",installMethods:[{title:"数据根",commands:["--data-root / FISH_DOCK_HOME / ~/.fish-dock"]},{title:"导出备份",commands:["通用 → FISH Dock 配置与备份 → 导出"]},{title:"导入恢复",commands:["导入先预览，失败按事务回滚"]}],requirements:["host/exports","配置与凭据","事务回滚"]}',
  },
  // 分支卡片（分支总览章节的 4 张卡 → 官方插件）
  {
    start: '{id:"pyside6",name:"pyisland (Pyside6)"',
    body: '{id:"pyside6",name:"飞书通知",tagline:"群机器人 · 事件筛选",description:"群机器人通知、事件筛选和签名配置 — Webhook 与签名密钥保存在插件自己的加密凭据空间。",tech:["Node.js 24","加密凭据","无需自启动"],badge:"通知",badgeColor:"#1D1D1F",href:"https://github.com/Fish-under-sea/FISH-DOCK-Plugins",accent:"#86868B",position:"top-left"}',
  },
  {
    start: '{id:"eisland",name:"Eisland (Electron)"',
    body: '{id:"eisland",name:"Clash 代理",tagline:"订阅 · 节点 · 规则",description:"基于 mihomo 的代理管理，提供订阅、节点、规则和系统代理控制 — 代理内核只绑定回环地址。",tech:["mihomo","回环内核","系统代理"],badge:"代理",badgeColor:"#1D1D1F",href:"https://github.com/Fish-under-sea/FISH-DOCK-Plugins",accent:"#86868B",position:"top-right"}',
  },
  {
    start: '{id:"tauri",name:"tauri-island",tagline:"性能优先 \\xb7 Rust 重写",description:',
    body: '{id:"tauri",name:"Magpie 网关",tagline:"模型网关 · 原生管理页",description:"独立模型网关与原生管理页，管理页、网关与 Dock 嵌入代理使用独立回环端口 — 签到页随包内置。",tech:["模型网关","回环端口","签到"],badge:"网关",badgeColor:"#1D1D1F",href:"https://github.com/Fish-under-sea/FISH-DOCK-Plugins",accent:"#86868B",position:"bottom-left"}',
  },
  {
    start: '{id:"PyCapsule",name:"PyCapsule"',
    body: '{id:"PyCapsule",name:"OFM 本地模型",tagline:"本地渠道 · API 工作台",description:"本地模型渠道与 API 工作台 — 自 2026 年 10 月 25 日起暂停维护，已安装版本可继续使用。",tech:["模型渠道","API","暂停维护"],badge:"本地模型",badgeColor:"#1D1D1F",href:"https://github.com/Fish-under-sea/FISH-DOCK-Plugins",accent:"#86868B",position:"bottom-right"}',
  },
  // 下载详情（下载章节的 5 张卡）
  {
    start: '{id:"eisland",name:"eisland"',
    body: '{id:"eisland",name:"FISH Dock",tagline:"宿主",description:"Windows AI 桌面宿主：桌面岛、模型工作台与插件中心",features:["桌面岛展示会话与审批状态","模型工作台管理渠道与 API","插件中心统一安装与恢复","完整包与精简包双轨更新"],audience:"需要统一工作台的 Windows 用户",downloadUrl:"",downloadLabel:"立即下载",badge:"宿主",accentColor:"#2563EB",accentBg:"rgba(37, 99, 235, 0.10)",accentBorder:"rgba(59, 130, 246, 0.30)",label:"FD"}',
  },
  {
    start: '{id:"tauri-island",name:"tauri-island"',
    body: '{id:"tauri-island",name:"飞书通知",tagline:"通知",description:"群机器人通知、事件筛选和签名配置",features:["群机器人 Webhook 通知","事件筛选与签名","加密凭据空间","无需自启动"],audience:"需要飞书通知的团队",downloadUrl:"",downloadLabel:"立即下载",badge:"通知",accentColor:"#059669",accentBg:"rgba(5, 150, 105, 0.08)",accentBorder:"rgba(5, 150, 105, 0.25)",label:"FS"}',
  },
  {
    start: '{id:"pyislandqt",name:"pyislandQT"',
    body: '{id:"pyislandqt",name:"Clash 代理",tagline:"代理",description:"基于 mihomo 的代理管理",features:["订阅与节点管理","规则与系统代理控制","内核只绑定回环地址","独立凭据空间"],audience:"需要代理管理的用户",downloadUrl:"",downloadLabel:"立即下载",badge:"代理",accentColor:"#D97706",accentBg:"rgba(217, 119, 6, 0.08)",accentBorder:"rgba(217, 119, 6, 0.25)",label:"CL"}',
  },
  {
    start: '{id:"pyislandpyside6",name:"pyislandPyside6"',
    body: '{id:"pyislandpyside6",name:"Magpie 网关",tagline:"网关",description:"独立模型网关与原生管理页",features:["独立回环端口","原生管理页","随包签到页","随 Dock 启动胶囊"],audience:"需要模型网关的用户",downloadUrl:"",downloadLabel:"立即下载",badge:"网关",accentColor:"#FFFFFF",accentBg:"rgba(255, 255, 255, 0.08)",accentBorder:"rgba(255, 255, 255, 0.20)",label:"MG"}',
  },
  {
    start: '{id:"pyisland-wanku",name:"pyisland-wanku"',
    body: '{id:"pyisland-wanku",name:"OFM 本地模型",tagline:"本地模型",description:"本地模型渠道与 API 工作台（2026-10 起暂停维护）",features:["本地模型渠道","API 工作台","已安装版本可继续使用","建议迁移到 Magpie"],audience:"本地模型用户",downloadUrl:"",downloadLabel:"即将推出",badge:"本地模型",accentColor:"#FACC15",accentBg:"rgba(250, 204, 21, 0.08)",accentBorder:"rgba(250, 204, 21, 0.25)",label:"OFM"}',
  },
  // 功能卡片（6 张）
  {
    start: '{icon:h.A,title:"智能展开/收起"',
    body: '{icon:h.A,title:"桌面岛",description:"展示会话状态、任务进度、通知和资源信息 — 桌面岛常驻任务栏，状态一眼可见。",accent:"#1D1D1F"}',
  },
  {
    start: '{icon:m.A,title:"亮度调节"',
    body: '{icon:m.A,title:"模型工作台",description:"承载模型插件的原生管理页，按插件配置渠道、账号与 API — 模型能力收进同一个工作台。",accent:"#1D1D1F"}',
  },
  {
    start: '{icon:f.A,title:"内置AI"',
    body: '{icon:f.A,title:"插件中心",description:"校验来源、平台与资源摘要；安装成功默认启用，支持检查更新、停用、卸载和失败恢复 — 插件生命周期由宿主统一管理。",accent:"#1D1D1F"}',
  },
  {
    start: '{icon:y.A,title:"系统状态监控"',
    body: '{icon:y.A,title:"外观工具链",description:"随包提供 Windhawk 引擎和编译器，可在外观页导入模组、编译、启停与恢复 — 无需另外安装 Windhawk。",accent:"#1D1D1F"}',
  },
  {
    start: '{icon:v.A,title:"剪贴板监控"',
    body: '{icon:v.A,title:"工作区",description:"通过插件接入飞书通知、Clash 代理、Magpie 网关和 OFM 本地模型 — 业务能力按需装载。",accent:"#1D1D1F"}',
  },
  {
    start: '{icon:w.A,title:"优秀性能"',
    body: '{icon:w.A,title:"安装更新",description:"完整安装包与精简更新包双轨更新；覆盖安装按文件归属清理旧资源，配置备份覆盖整个宿主与插件配置仓。",accent:"#1D1D1F"}',
  },
];

function extractObject(source, startMarker) {
  const start = source.indexOf(startMarker);
  if (start < 0) return null;
  let depth = 0, inStr = false, esc = false, end = -1;
  for (let j = start; j < source.length; j++) {
    const ch = source[j];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) { end = j + 1; break; } }
  }
  if (end < 0) return null;
  return { start, end, text: source.slice(start, end) };
}

function applyObjects(source, objects, log) {
  let out = source;
  for (const obj of objects) {
    const found = extractObject(out, obj.start);
    if (!found) { log.push(`MISS ${obj.start}`); continue; }
    out = out.slice(0, found.start) + obj.body + out.slice(found.end);
    log.push(`OK   ${obj.start}`);
  }
  return out;
}

// ---------- 2. 唯一长文案替换 ----------
// [旧, 新]。含 "·" 的旧串会自动生成 "\xb7" 变体（压缩 JS 中的转义形式）。
const TEXTS = [
  // 元信息
  ['Pyisland - Windows 灵动岛 | 用 Python 开发，运行在 Windows 上的现代灵动岛控制中心', 'FISH Dock - Windows AI 桌面宿主 | 一切皆插件，桌面岛与模型工作台'],
  ['Pyisland 采用现代胶囊形状设计，为 Windows 带来 iOS 风格的灵动体验。集成亮度/音量控制、系统状态监控、剪贴板监控等实用功能。', 'FISH Dock 是 Windows 桌面上的会话与模型工作台：桌面岛、模型工作台、插件中心与工作区，以插件承载飞书通知、Clash 代理、Magpie 网关和 OFM 本地模型。'],
  ['Pyisland,灵动岛,Windows,Python,Dynamic Island,控制中心,系统监控', 'FISH Dock,Windows,插件系统,桌面宿主,AI,灵动岛,Tauri,Rust'],
  ['Pyisland Developers', 'FISH Developers'],
  ['Pyisland - Windows 灵动岛', 'FISH Dock - Windows AI 桌面宿主'],
  ['用 Python 开发，运行在 Windows 上的现代灵动岛控制中心', 'Everything is a Plugin · 一切皆插件'],
  ['@pyisland', '@fishdock'],
  ['https://pyisland.com/', 'https://github.com/Fish-under-sea/FISH-Dock'],
  ['https://docs.pyisland.com', 'https://github.com/Fish-under-sea/FISH-Dock'],
  // 章节标题与副标题
  ['分支总览', '官方插件'],
  ['探索 Pyisland 项目的多个分支版本', '探索 FISH Dock 的四个官方插件'],
  ['快速安装', '快速开始'],
  ['选择版本，获取安装命令', '选择场景，获取安装命令'],
  ['选择适合您的版本进行下载', '选择适合你的安装方式'],
  // Hero
  ['Windows Dynamic Island', 'Windows AI Desktop Host'],
  ['Eisland与tauri分支现已全面接入AI', '一切皆插件，桌面岛与模型工作台，统一收进 Dock'],
  ['开发文档', 'GitHub'],
  // 章节内提示
  ['滚轮切换版本', '滚轮切换插件'],
  ['点击卡片访问 GitHub 仓库', '点击卡片访问插件仓库'],
  // 功能卡片（HTML 首帧残留）
  ['智能展开/收起', '桌面岛'],
  ['点击展开显示控制面板，失去焦点自动收缩 — 优雅的交互体验，无需额外操作。', '展示会话状态、任务进度、通知和资源信息 — 桌面岛常驻任务栏，状态一眼可见。'],
  ['亮度调节', '模型工作台'],
  ['使用DDC/CI协议调节屏幕亮度，支持防抖机制 — 能够直接操控外置显示器亮度。', '承载模型插件的原生管理页，按插件配置渠道、账号与 API — 模型能力收进同一个工作台。'],
  ['内置AI', '插件中心'],
  ['内置AI助手，能直接对系统进行操作 — 提供快捷操作，提升效率。', '校验来源、平台与资源摘要；安装成功默认启用，支持检查更新、停用、卸载和失败恢复 — 插件生命周期由宿主统一管理。'],
  ['系统状态监控', '外观工具链'],
  ['实时显示 WiFi、蓝牙、电池状态 — 所有重要信息一目了然。', '随包提供 Windhawk 引擎和编译器，可在外观页导入模组、编译、启停与恢复 — 无需另外安装 Windhawk。'],
  ['剪贴板监控', '工作区'],
  ['自动检测剪贴板中的 URL 并提供快捷打开选项 — 智能识别，高效流转。', '通过插件接入飞书通知、Clash 代理、Magpie 网关和 OFM 本地模型 — 业务能力按需装载。'],
  ['优秀性能', '安装更新'],
  ['开发以性能表现与稳定性为目标 — 确保在各种场景下都能提供流畅的体验。', '完整安装包与精简更新包双轨更新；覆盖安装按文件归属清理旧资源，配置备份覆盖整个宿主与插件配置仓。'],
  // 分支卡片说明（HTML 首帧残留）
  ['基于 Python + PySide6 构建的稳定版灵动岛，提供完整的系统控制功能。', '群机器人通知、事件筛选和签名配置 — Webhook 与签名密钥保存在插件自己的加密凭据空间。'],
  ['采用Electron框架，刘海屏设计，提供丰富的功能。', '基于 mihomo 的代理管理，提供订阅、节点、规则和系统代理控制 — 代理内核只绑定回环地址。'],
  ['采用 Tauri 2 + Rust 重写，性能更强，安装包体积更小。', '独立模型网关与原生管理页，管理页、网关与 Dock 嵌入代理使用独立回环端口 — 签到页随包内置。'],
  ['基于pyisland主分支改造而来，提供离线语音与中转站功能，随时记住想法，是pyisland的衍生版本。', '本地模型渠道与 API 工作台 — 自 2026 年 10 月 25 日起暂停维护，已安装版本可继续使用。'],
  ['主分支 · 最早版本', '群机器人 · 事件筛选'],
  ['刘海屏设计 · 功能丰富', '订阅 · 节点 · 规则'],
  ['性能优先 · Rust 重写', '模型网关 · 原生管理页'],
  ['高效事件 · 随开随记', '本地渠道 · API 工作台'],
  ['早期版本', '通知'],
  ['功能最全', '网关'],
  ['速记胶囊', '本地模型'],
  ['pyisland (Pyside6)', '飞书通知'],
  ['Eisland (Electron)', 'Clash 代理'],
  // 链接
  ['https://github.com/Python-island/Python-island/tree/tauri-island', 'https://github.com/Fish-under-sea/FISH-DOCK-Plugins'],
  ['https://github.com/Python-island/Python-island/tree/pyisland-wanku', 'https://github.com/Fish-under-sea/FISH-DOCK-Plugins'],
  ['https://github.com/Python-island/Python-island/tree/pyislandQT', 'https://github.com/Fish-under-sea/FISH-Dock'],
  ['https://github.com/Python-island/Python-island', 'https://github.com/Fish-under-sea/FISH-Dock'],
  // 导航项
  ['>分支<', '>插件<'],
  ['"分支"', '"插件"'],
  // 品牌名（长句替换后的剩余：logo、h1、og:site_name）
  ['Pyisland', 'FISH Dock'],
];

function variants(s) {
  const out = [s];
  if (!s.includes('·')) return out;
  const esc = s.replace(/·/g, '\\xb7');
  if (!out.includes(esc)) out.push(esc);
  return out;
}

function countOf(hay, needle) {
  let n = 0, i = 0;
  while ((i = hay.indexOf(needle, i)) !== -1) { n++; i += needle.length; }
  return n;
}

function applyTexts(source, texts, log) {
  let out = source;
  for (const [oldStr, newStr] of texts) {
    let hits = 0;
    for (const v of variants(oldStr)) {
      const c = countOf(out, v);
      if (c > 0) { out = out.split(v).join(newStr); hits += c; }
    }
    if (hits > 0) log.push(`TEXT ${hits}  ${oldStr.slice(0, 50)}`);
  }
  return out;
}

// ---------- 主流程 ----------
await mkdir(BACKUP, { recursive: true });
const report = [];
for (const [key, file] of Object.entries(FILES)) {
  let src = await readFile(file, 'utf8');
  await writeFile(BACKUP + '\\' + file.split('\\').pop() + '.bak', src, 'utf8');
  const log = [];
  if (key !== 'html') src = applyObjects(src, JS_OBJECTS, log);
  src = applyTexts(src, TEXTS, log);
  await writeFile(file, src, 'utf8');
  report.push(`===== ${key} (${file.split('\\').pop()}) =====`);
  report.push(...log);
  report.push('');
}
console.log(report.join('\n'));
