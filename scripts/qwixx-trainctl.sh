#!/usr/bin/env bash
# Qwixx training as a service. Returns immediately — no hanging SSH session.
#   sudo ./scripts/qwixx-trainctl.sh install
#   sudo ./scripts/qwixx-trainctl.sh start|stop|restart|status|logs
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NODE_VERSION="${NODE_VERSION:-v22.21.0}"
PNPM_VERSION="${PNPM_VERSION:-10.33.4}"

cmd="${1:-}"

need_root() {
  if [[ "$(id -u)" -ne 0 ]]; then
    exec sudo -E "$0" "$@"
  fi
}

install_node() {
  if command -v node >/dev/null 2>&1; then
    local major
    major="$(node -p "process.versions.node.split('.')[0]")"
    if [[ "$major" -ge 22 ]]; then
      echo "node $(node -v) already installed"
      return
    fi
  fi
  local arch nodearch
  arch="$(uname -m)"
  case "$arch" in
    x86_64) nodearch=x64 ;;
    aarch64|arm64) nodearch=arm64 ;;
    *) echo "unsupported arch: $arch" >&2; exit 1 ;;
  esac
  echo "installing node $NODE_VERSION ($nodearch)"
  curl -fsSL "https://nodejs.org/dist/${NODE_VERSION}/node-${NODE_VERSION}-linux-${nodearch}.tar.xz" \
    | tar -xJ -C /usr/local --strip-components=1
  hash -r
}

install_pnpm() {
  if command -v pnpm >/dev/null 2>&1; then
    echo "pnpm $(pnpm -v) already installed"
    return
  fi
  echo "installing pnpm $PNPM_VERSION"
  if command -v corepack >/dev/null 2>&1; then
    corepack enable
    corepack prepare "pnpm@${PNPM_VERSION}" --activate
  else
    npm install -g "pnpm@${PNPM_VERSION}"
  fi
  hash -r
  command -v pnpm >/dev/null
}

write_unit() {
  local src="$1" dest="$2"
  sed -e "s|__ROOT__|${ROOT}|g" -e "s|__USER__|${RUN_USER}|g" -e "s|__NODE__|${NODE_BIN}|g" "$src" > "$dest"
}

case "$cmd" in
  install)
    need_root install
    RUN_USER="${SUDO_USER:-$(stat -c '%U' "$ROOT")}"
    install_node
    install_pnpm
    NODE_BIN="$(command -v node)"
    PNPM_BIN="$(command -v pnpm)"
    echo "pnpm: $PNPM_BIN ($($PNPM_BIN -v))"
    sudo -u "$RUN_USER" -H "$PNPM_BIN" install --frozen-lockfile --dir "$ROOT"
    install -d -o "$RUN_USER" -g "$RUN_USER" "$ROOT/training"
    if [[ ! -f "$ROOT/training/panel.token" ]]; then
      node -e 'process.stdout.write(require("crypto").randomBytes(16).toString("hex"))' > "$ROOT/training/panel.token"
      chown "$RUN_USER:$RUN_USER" "$ROOT/training/panel.token"
      chmod 600 "$ROOT/training/panel.token"
    fi
    write_unit "$ROOT/deploy/qwixx-train.service" /etc/systemd/system/qwixx-train.service
    write_unit "$ROOT/deploy/qwixx-train-status.service" /etc/systemd/system/qwixx-train-status.service
    cat > /etc/sudoers.d/qwixx-train <<EOF
${RUN_USER} ALL=(root) NOPASSWD: /bin/systemctl start qwixx-train, /bin/systemctl stop qwixx-train, /bin/systemctl restart qwixx-train
EOF
    chmod 440 /etc/sudoers.d/qwixx-train
    systemctl daemon-reload
    systemctl enable --now qwixx-train-status.service
    if command -v ufw >/dev/null 2>&1 && ufw status | grep -q "Status: active"; then
      ufw allow 8787/tcp
    fi
    ip="$(hostname -I 2>/dev/null | awk '{print $1}')"
    token="$(cat "$ROOT/training/panel.token")"
    echo
    echo "Panel:  http://${ip:-TWOJ-IP}:8787/?token=${token}"
    echo "Start:  systemctl start qwixx-train"
    echo "Stop:   systemctl stop qwixx-train"
    echo "Status: $0 status"
    ;;
  start|stop|restart)
    need_root "$cmd"
    systemctl "$cmd" qwixx-train
    systemctl is-active qwixx-train || true
    ;;
  status)
    systemctl is-active qwixx-train 2>/dev/null || true
    systemctl is-active qwixx-train-status 2>/dev/null || true
    node -e '
      const fs = require("fs");
      const p = process.argv[1];
      let s = {};
      try { s = JSON.parse(fs.readFileSync(p, "utf8")); } catch { console.log("brak training/status.json"); process.exit(0); }
      const alive = (() => { try { process.kill(s.pid, 0); return true; } catch { return false; } })();
      console.log(JSON.stringify({
        state: s.state, pidAlive: alive, generation: s.generation, vsTaker: s.vsTaker,
        bestVsTaker: s.bestVsTaker, sigma: s.sigma, stall: s.stall, kept: s.kept,
        gensPerHour: s.gensPerHour, updatedAt: s.updatedAt
      }, null, 2));
    ' "$ROOT/training/status.json"
    ;;
  logs)
    journalctl -u qwixx-train -n 40 --no-pager
    ;;
  *)
    echo "usage: sudo $0 install|start|stop|restart|status|logs" >&2
    exit 1
    ;;
esac
