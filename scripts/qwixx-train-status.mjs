/**
 * Local API for the public dashboard. Nginx on :80 is the only public listener.
 *   node scripts/qwixx-train-status.mjs
 * Start/stop work only with the token from qwixx-trainctl.sh install.
 */
import { execFile } from "node:child_process"
import fs from "node:fs"
import http from "node:http"
import path from "node:path"

const root = process.env.QWIXX_ROOT || path.resolve(import.meta.dirname, "..")
const statusFile = process.env.QWIXX_STATUS_FILE || path.join(root, "training", "status.json")
const tokenFile = process.env.QWIXX_TOKEN_FILE || path.join(root, "training", "panel.token")
const dashboard = path.join(root, "deploy", "dashboard", "index.html")
const port = Number(process.env.QWIXX_STATUS_PORT || 8787)
const host = process.env.QWIXX_STATUS_HOST || "127.0.0.1"

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
  } catch (err) {
    // EPERM: the pid exists, we just cannot signal it.
    return err.code === "EPERM"
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

function sessionCookies() {
  const value = encodeURIComponent(token())
  return [
    `qwixx_token=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000`,
    `qwixx_ui=1; SameSite=Lax; Path=/; Max-Age=2592000`,
  ]
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, headers)
  res.end(body)
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", "http://127.0.0.1")

  if (url.pathname === "/api/status" && req.method === "GET") {
    send(res, 200, JSON.stringify(snapshot()), {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    })
    return
  }

  if (url.pathname === "/api/session" && req.method === "GET") {
    if (!authorized(req, url)) {
      send(res, 403, "brak tokenu", { "content-type": "text/plain; charset=utf-8" })
      return
    }
    send(res, 204, "", { "set-cookie": sessionCookies(), "cache-control": "no-store" })
    return
  }

  if ((url.pathname === "/api/start" || url.pathname === "/api/stop") && req.method === "POST") {
    if (!authorized(req, url)) {
      send(res, 403, "brak tokenu", { "content-type": "text/plain; charset=utf-8" })
      return
    }
    const cmd = url.pathname === "/api/start" ? "start" : "stop"
    const result = await systemctl([cmd, "qwixx-train"])
    if (!result.ok) {
      send(res, 502, result.out || "systemctl nie powiódł się", { "content-type": "text/plain; charset=utf-8" })
      return
    }
    send(res, 204, "")
    return
  }

  if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
    const headers = { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }
    if (authorized(req, url) && url.searchParams.get("token")) headers["set-cookie"] = sessionCookies()
    send(res, 200, fs.readFileSync(dashboard), headers)
    return
  }

  send(res, 404, "nie znaleziono", { "content-type": "text/plain; charset=utf-8" })
})

server.listen(port, host, () => {
  console.log(`qwixx train api http://${host}:${port}`)
})
