// pyisland.com 前端镜像脚本（仅本地预览/学习用途）
// 用法：node tools/mirror.mjs
// 说明：显式清单抓取（站点为 Next.js SSR 静态页，资源面已静态枚举），
//       并移除 Google Fonts 外链（本机网络不可达，CSS 已有 Inter→系统字体回退栈）。

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = 'https://pyisland.com';
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

// 站点根 → 本地路径映射
const FILES = [
  '/',
  // CSS
  '/_next/static/css/195173eb5f75267b.css',
  '/_next/static/css/ae27a95856613010.css',
  // 页面加载的 JS chunk
  '/_next/static/chunks/webpack-d4839fdb0f81959b.js',
  '/_next/static/chunks/4bd1b696-c023c6e3521b1417.js',
  '/_next/static/chunks/255-29f3dcaae8f3cb4e.js',
  '/_next/static/chunks/main-app-15d013183390b1b3.js',
  '/_next/static/chunks/app/layout-7dfc656787c00f25.js',
  '/_next/static/chunks/376-ab1f828d5521e189.js',
  '/_next/static/chunks/app/page-fe230513965d31cd.js',
  '/_next/static/chunks/polyfills-42372ed130431b0a.js',
  // 动态 import 的异步 chunk（含 hero 3D 场景）
  '/_next/static/chunks/139.7a5a8e93a21948c1.js',
  '/_next/static/chunks/214.c8ebadf78bfd84fa.js',
  '/_next/static/chunks/b536a0f1.41a0112fd1682a1b.js',
  '/_next/static/chunks/646.f342b7cffc01feb0.js',
  // 图片与图标
  '/avatar/silenthim.jpg',
  '/avatar/StarWindv.png',
  '/avatar/code.png',
  '/avatar/GeminiMortal.jpg',
  '/avatar/cxp1r.png',
  '/avatar/JNTMTMTM.jpg',
  '/island_w.svg',
  '/favicon.ico',
];

function toLocalPath(urlPath) {
  return urlPath === '/' ? 'index.html' : urlPath.replace(/^\//, '');
}

// Google Fonts 样式表地址改为本地空占位文件。
// 注意：该 URL 同时出现在可见 HTML 的 <link> 和 RSC 内联数据（self.__next_f.push）里，
// 且两处的 & 分别编码为 `&amp;` 与 `\u0026`，必须用全局正则同步替换，否则 hydration 不一致。
// preconnect 保留（不阻塞渲染，仅后台预连接失败）。
const FONT_CSS = `/* 本地字体占位文件
 * 原站通过 Google Fonts 加载 Inter 与 JetBrains Mono；本机网络无法访问
 * fonts.googleapis.com，故以空样式表替代，字体回退到 CSS 中已定义的
 * Inter → Segoe UI → system-ui 字体栈，视觉差异极小。
 */
`;

function localizeHtml(html) {
  // 注意字符类要排除反斜杠：RSC 内联数据里字符串结尾是 `\"`，
  // 若不排除 \ 会把转义引号一并吞掉，导致内联脚本语法错误、hydration 失败、页面空白。
  let out = html.replace(/https:\/\/fonts\.googleapis\.com\/css2\?[^"'<>\s\\]+/g, '/fonts/fonts.css');
  // 移除 CDN 边缘节点注入的 RUM 监控脚本（原站响应时有时无，不属于页面内容本身）
  out = out.replace(/<script[^>]*src="https:\/\/rjsprbi\.myalicdn\.com\/[^"]*"[^>]*><\/script>/g, '');
  return out;
}

async function download(urlPath) {
  const res = await fetch(BASE + urlPath, {
    headers: { 'User-Agent': UA },
    redirect: 'follow',
    signal: AbortSignal.timeout(60000),
  });
  if (res.status !== 200) throw new Error(`${urlPath} -> HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const local = toLocalPath(urlPath);
  const target = join(ROOT, local);
  await mkdir(dirname(target), { recursive: true });
  if (local === 'index.html') {
    const html = localizeHtml(buf.toString('utf8'));
    if (/fonts\.googleapis\.com\/css2/.test(html)) throw new Error('HTML/RSC 中仍残留 Google Fonts 样式表引用');
    // 语法校验：所有内联 <script> 必须能被 JS 引擎解析，防止 RSC 数据被改写后语法损坏
    const inlineScripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)]
      .filter((m) => !/\bsrc\s*=/.test(m[0]))
      .map((m) => m[1]);
    for (const code of inlineScripts) {
      try {
        new Function(code);
      } catch (err) {
        throw new Error(`内联脚本语法错误：${err.message}`);
      }
    }
    await writeFile(target, html, 'utf8');
  } else {
    await writeFile(target, buf);
  }
  return { urlPath, local, size: buf.length };
}

async function main() {
  // 本地字体占位样式表（见 localizeHtml 注释）
  await mkdir(join(ROOT, 'fonts'), { recursive: true });
  await writeFile(join(ROOT, 'fonts', 'fonts.css'), FONT_CSS, 'utf8');

  const results = [];
  let cursor = 0;
  const workers = Array.from({ length: 6 }, async () => {
    while (cursor < FILES.length) {
      const i = cursor++;
      try {
        results.push(await download(FILES[i]));
      } catch (err) {
        results.push({ urlPath: FILES[i], error: err.message });
      }
    }
  });
  await Promise.all(workers);

  results.sort((a, b) => a.urlPath.localeCompare(b.urlPath));
  let total = 0;
  for (const r of results) {
    if (r.error) console.error(`FAIL ${r.urlPath} :: ${r.error}`);
    else {
      total += r.size;
      console.log(`OK   ${r.urlPath} -> ${r.local} (${r.size} B)`);
    }
  }
  console.log(`\n完成：${results.filter(r => !r.error).length}/${FILES.length}，合计 ${total} B`);
  if (results.some(r => r.error)) process.exit(1);
}

main().catch((err) => {
  console.error('镜像失败：', err);
  process.exit(1);
});
