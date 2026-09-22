#!/bin/bash
# ============================================================
# bill_tracker_front 部署脚本（在宿主机执行，由 Jenkinsfile 调用）
#
# 用法:
#   deploy.sh deploy   构建并把静态产物发布到 /opt/node-deploy/bill_tracker_front
#   deploy.sh status   校验产物是否就绪
#
# 约定:
#   - node 使用宝塔自带运行时：/www/server/nodejs/v22.14.0/bin
#   - 源码工作目录: /opt/node-deploy/.work/bill_tracker_front（构建完可丢弃）
#   - 产物目录:     /opt/node-deploy/bill_tracker_front（纯静态，可直接给 nginx）
# ============================================================
set -euo pipefail

PROJECT="bill_tracker_front"
DEPLOY_ROOT="/opt/node-deploy"
WORK_DIR="${DEPLOY_ROOT}/.work/${PROJECT}"
DIST_DIR="${DEPLOY_ROOT}/${PROJECT}"
NODE_BIN="/www/server/nodejs/v22.14.0/bin"
NPM_REGISTRY="https://registry.npmmirror.com"

export PATH="${NODE_BIN}:${PATH}"

log() { echo "[$(date '+%F %T')] [${PROJECT}] $*"; }

# ------------------------------------------------------------
# 构建并发布
# ------------------------------------------------------------
do_deploy() {
    log "node: $(node -v 2>/dev/null || echo '未找到')"
    log "pnpm: $(pnpm -v 2>/dev/null || echo '未找到')"

    if [ ! -d "${WORK_DIR}" ]; then
        log "错误：源码目录不存在 ${WORK_DIR}"
        exit 1
    fi

    cd "${WORK_DIR}"

    log "安装依赖 ..."
    pnpm install --no-frozen-lockfile --registry="${NPM_REGISTRY}"

    log "构建 ..."
    pnpm build

    if [ ! -f "dist/index.html" ]; then
        log "构建失败：未生成 dist/index.html"
        exit 1
    fi

    log "发布产物到 ${DIST_DIR} ..."
    # 先把上一版挪走，避免新旧文件混杂；发布成功后删除
    rm -rf "${DIST_DIR}.bak"
    if [ -d "${DIST_DIR}" ] && [ -n "$(ls -A "${DIST_DIR}" 2>/dev/null || true)" ]; then
        mv "${DIST_DIR}" "${DIST_DIR}.bak"
    fi
    mkdir -p "${DIST_DIR}"
    cp -r dist/. "${DIST_DIR}/"
    rm -rf "${DIST_DIR}.bak"

    log "发布完成，文件数: $(find "${DIST_DIR}" -type f | wc -l)"
}

# ------------------------------------------------------------
# 校验
# ------------------------------------------------------------
do_status() {
    log "产物目录: ${DIST_DIR}"
    if [ ! -f "${DIST_DIR}/index.html" ]; then
        log "校验失败：${DIST_DIR}/index.html 不存在 ✗"
        exit 1
    fi
    log "index.html 存在 ✓ ($(stat -c%s "${DIST_DIR}/index.html") 字节)"
    if [ -d "${DIST_DIR}/assets" ]; then
        log "assets 文件数: $(find "${DIST_DIR}/assets" -type f | wc -l)"
    fi
    log "校验通过 ✓"
}

case "${1:-}" in
    deploy) do_deploy ;;
    status) do_status ;;
    *) echo "用法: $0 [deploy|status]"; exit 2 ;;
esac
