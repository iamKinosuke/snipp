const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ESCAPES[character] ?? character);
}

export interface ErrorPageOptions {
  status: number;
  title: string;
  message: string;
  homeUrl: string;
}

export function renderErrorPage(options: ErrorPageOptions): string {
  const title = escapeHtml(options.title);
  const message = escapeHtml(options.message);
  const homeUrl = escapeHtml(options.homeUrl);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${options.status} ${title} — Snipp</title>
<style>
  :root {
    color-scheme: light dark;
    --bg: #f7f7f8;
    --fg: #24242b;
    --muted: #71717a;
    --card: #ffffff;
    --border: #e4e4e7;
    --accent: #6d3ce8;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #09090b;
      --fg: #fafafa;
      --muted: #a1a1aa;
      --card: #18181b;
      --border: #27272a;
      --accent: #9b7cf6;
    }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
    background: var(--bg);
    color: var(--fg);
    font: 16px/1.6 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  }
  main {
    width: 100%;
    max-width: 26rem;
    padding: 2rem;
    border: 1px solid var(--border);
    border-radius: 0.75rem;
    background: var(--card);
    text-align: center;
  }
  .mark {
    display: inline-flex;
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 25%;
    background: linear-gradient(to bottom right, #3f6bf0, #9147e8);
  }
  .status {
    margin: 1.25rem 0 0;
    font-size: 0.875rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--muted);
  }
  h1 { margin: 0.375rem 0 0; font-size: 1.625rem; }
  p { margin: 0.625rem 0 0; color: var(--muted); }
  a {
    display: inline-block;
    margin-top: 1.5rem;
    color: var(--accent);
    font-weight: 500;
    text-decoration: none;
  }
  a:hover { text-decoration: underline; }
</style>
</head>
<body>
<main>
  <span class="mark" aria-hidden="true">
    <svg viewBox="0 0 64 64" width="100%" height="100%" fill="none">
      <g stroke="#fff" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"
         transform="translate(32 32) scale(1.15) translate(-32 -32)">
        <path d="M44 18 C44 12 20 12 20 22 C20 32 44 32 44 42 C44 50 28 51 21 46"/>
        <path d="M27 40 L20 46.5 L26 53"/>
      </g>
    </svg>
  </span>
  <p class="status">${options.status}</p>
  <h1>${title}</h1>
  <p>${message}</p>
  <a href="${homeUrl}">Shorten a link</a>
</main>
</body>
</html>
`;
}
