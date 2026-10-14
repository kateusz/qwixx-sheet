/**
 * Read-only panel for the training service. No pnpm, no extra packages.
 *   node scripts/qwixx-train-status.mjs
 * Start/stop buttons work only with the token from qwixx-trainctl.sh install.
 */
import { execFile } from "node:child_process"
import fs from "node:fs"
import http from "node:http"
import path from "node:path"

const root = process.env.QWIXX_ROOT || path.resolve(import.meta.dirname, "..")
const statusFile = process.env.QWIXX_STATUS_FILE || path.join(root, "training", "status.json")
const tokenFile = process.env.QWIXX_TOKEN_FILE || path.join(root, "training", "panel.token")
const port = Number(process.env.QWIXX_STATUS_PORT || 8787)

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"))
  } catch {
    return null
  }
}

function pidAlive(pid) {
  if (!pid) return false
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

function token() {
  if (process.env.QWIXX_PANEL_TOKEN) return process.env.QWIXX_PANEL_TOKEN.trim()
  try {
    return fs.readFileSync(tokenFile, "utf8").trim()
  } catch {
    return ""
  }
}

function cookies(req) {
  const out = {}
  for (const part of (req.headers.cookie || "").split(";")) {
    const i = part.indexOf("=")
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim())
  }
  return out
}

function authorized(req, url) {
  const expected = token()
  if (!expected) return false
  return (
    url.searchParams.get("token") === expected ||
    cookies(req).qwixx_token === expected ||
    req.headers["x-qwixx-token"] === expected
  )
}

function systemctl(args) {
  return new Promise((resolve) => {
    execFile("sudo", ["-n", "systemctl", ...args], { timeout: 8000 }, (err, stdout, stderr) => {
      resolve({ ok: !err, out: `${stdout || ""}${stderr || ""}`.trim() })
    })
  })
}

function snapshot() {
  const data = readJson(statusFile)
  const alive = data ? pidAlive(data.pid) : false
  let state = data?.state || "idle"
  if (data && (state === "running" || state === "evaluating") && !alive) state = "przerwany"
  if (!data) state = "brak"
  return { ...(data || {}), state, pidAlive: alive, updatedAt: data?.updatedAt || null }
}

function page(snap, authed) {
  const h = snap.history || []
  const vals = h.map((e) => e.vsTaker).filter((n) => typeof n === "number")
  const spark = sparkline(vals)
  const rows = [...h].reverse().slice(0, 12)
  const fmt = (n) => (typeof n === "number" ? n.toFixed(2) : "—")
  const controls = authed
    ? `<form method="post" action="/api/start"><button>Włącz</button></form>
       <form method="post" action="/api/stop"><button class="stop">Wyłącz</button></form>`
    : `<p class="hint">Podgląd. Sterowanie: <code>sudo qwixx-trainctl start</code> / <code>stop</code>, albo otwórz panel z tokenem z instalacji.</p>`
  return `<!doctype html>
<html lang="pl"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Trening Qwixx</title>
<style>
  :root { color-scheme: dark; }
  body { margin: 0; font: 15px/1.4 ui-sans-serif, system-ui, sans-serif; background: #111; color: #eee; }
  main { max-width: 880px; margin: 0 auto; padding: 24px 16px 48px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .sub { color: #999; margin: 0 0 16px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 8px; }
  .card { background: #1c1c1c; border: 1px solid #333; border-radius: 12px; padding: 12px; }
  .k { color: #999; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; }
  .v { font-size: 22px; font-weight: 700; font-variant-numeric: tabular-nums; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; font-variant-numeric: tabular-nums; }
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #2a2a2a; }
  th { color: #999; font-size: 12px; }
  .keep { color: #8fd18f; } .stay { color: #aaa; }
  form { display: inline; }
  button { margin: 12px 8px 0 0; background: #eee; color: #111; border: 0; border-radius: 999px; padding: 8px 16px; font-weight: 700; cursor: pointer; }
  button.stop { background: #333; color: #eee; }
  .hint, code { color: #aaa; }
  svg { width: 100%; height: 72px; margin-top: 12px; }
</style></head><body><main>
<h1>Trening Qwixx</h1>
<p class="sub">Odświeża się samo. Stan: <strong>${esc(snap.state)}</strong>${snap.pidAlive ? "" : ""}</p>
<div class="grid">
  ${stat("Pokolenie", snap.generation ?? "—")}
  ${stat("vs taker", fmt(snap.vsTaker))}
  ${stat("Najlepszy", fmt(snap.bestVsTaker))}
  ${stat("Sigma", fmt(snap.sigma))}
  ${stat("Bez poprawy", snap.stall ?? "—")}
  ${stat("Zachowane", snap.kept ?? "—")}
  ${stat("Gier / gen", snap.games ?? "—")}
  ${stat("Gen / h", fmt(snap.gensPerHour))}
</div>
${spark}
${controls}
<table><thead><tr><th>Gen</th><th>vs taker</th><th>Sigma</th><th></th><th>Czas</th></tr></thead><tbody>
${rows
  .map(
    (e) =>
      `<tr><td>${e.gen}</td><td>${fmt(e.vsTaker)}</td><td>${fmt(e.sigma)}</td><td class="${e.event}">${e.event}</td><td>${esc((e.at || "").replace("T", " ").slice(0, 19))}</td></tr>`,
  )
  .join("")}
</tbody></table>
<p class="sub">Ostatnia aktualizacja: ${esc(snap.updatedAt || "nigdy")}</p>
<script>
setInterval(() => fetch("/api/status").then(r => r.json()).then(s => {
  if (s.updatedAt !== ${JSON.stringify(snap.updatedAt || null)}) location.reload()
}), 2000)
</script>
</main></body></html>`
}

function stat(k, v) {
  return `<div class="card"><div class="k">${k}</div><div class="v">${v}</div></div>`
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c])
}

function sparkline(vals) {
  if (vals.length < 2) return ""
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const span = max - min || 1
  const w = 600
  const h = 72
  const pts = vals
    .map((v, i) => {
      const x = (i / (vals.length - 1)) * w
      const y = h - ((v - min) / span) * (h - 8) - 4
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(" ")
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><polyline fill="none" stroke="#ddd" stroke-width="2" points="${pts}"/></svg>`
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", "http://127.0.0.1")
  if (url.pathname === "/api/status") {
    res.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" })
    res.end(JSON.stringify(snapshot()))
    return
  }
  if ((url.pathname === "/api/start" || url.pathname === "/api/stop") && req.method === "POST") {
    if (!authorized(req, url)) {
      res.writeHead(403, { "content-type": "text/plain; charset=utf-8" })
      res.end("brak tokenu")
      return
    }
    const cmd = url.pathname === "/api/start" ? "start" : "stop"
    const result = await systemctl([cmd, "qwixx-train"])
    res.writeHead(303, { location: result.ok ? "/" : `/?err=${encodeURIComponent(result.out || "systemctl")}` })
    res.end()
    return
  }
  const authed = authorized(req, url)
  const headers = { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }
  if (authed && url.searchParams.get("token")) {
    headers["set-cookie"] = `qwixx_token=${encodeURIComponent(token())}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000`
  }
  res.writeHead(200, headers)
  res.end(page(snapshot(), authed))
})

server.listen(port, "0.0.0.0", () => {
  console.log(`qwixx train panel http://0.0.0.0:${port}`)
})
