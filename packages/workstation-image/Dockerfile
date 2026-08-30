# syntax=docker/dockerfile:1.7

FROM ghcr.io/boldsoftware/exeuntu@sha256:26ea0bc1d751680557772354f28808bea406b4f19157ea66101882cfd6de554d

ARG TARGETARCH
ARG NODE_VERSION=22.23.1
ARG HERMES_VERSION=v2026.7.7.2
ARG HERMES_COMMIT=9de9c25f620ff7f1ce0fd5457d596052d5159596
ARG OPENCODE_VERSION=1.17.18
ARG MINION_VERSION=2026.7.11-dev
ARG NOTESMD_VERSION=0.3.6
ARG CHROME_VERSION=150.0.7871.114-1

LABEL org.opencontainers.image.title="Minion Workstation" \
      org.opencontainers.image.description="Reproducible lightweight Minion cloud workstation" \
      org.opencontainers.image.base.name="ghcr.io/boldsoftware/exeuntu@sha256:26ea0bc1d751680557772354f28808bea406b4f19157ea66101882cfd6de554d" \
      ai.minion.workstation.blueprint="minion-workstation-v1" \
      ai.minion.workstation.gui-port="8000"

ENV DEBIAN_FRONTEND=noninteractive \
    LANG=C.UTF-8 \
    LC_ALL=C.UTF-8 \
    NPM_CONFIG_AUDIT=false \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_UPDATE_NOTIFIER=false

# Resolve every Ubuntu package from an immutable archive snapshot. The
# provider's separate Tailscale source is disabled only during this install;
# its already-installed packages remain untouched.
COPY apt/ubuntu.sources /etc/apt/sources.list.d/ubuntu.sources
RUN set -eux; \
    if [ -f /etc/apt/sources.list.d/tailscale.list ]; then \
      mv /etc/apt/sources.list.d/tailscale.list /etc/apt/sources.list.d/tailscale.list.disabled; \
    fi; \
    rm -rf /var/lib/apt/lists/*; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
      adwaita-icon-theme \
      dbus-x11 \
      fonts-dejavu-core \
      fonts-liberation \
      novnc \
      thunar \
      tigervnc-standalone-server \
      tigervnc-tools \
      websockify \
      x11-xserver-utils \
      xfce4-panel \
      xfce4-session \
      xfce4-settings \
      xfce4-terminal \
      xfdesktop4 \
      xfwm4; \
    rm -rf /var/lib/apt/lists/*; \
    ln -sfn /usr/share/novnc/vnc.html /usr/share/novnc/index.html

# exeuntu currently exposes an older distro Node, while the pinned Minion
# release requires Node >=22.12. Replace both common command paths with a
# verified upstream Node archive so interactive and system services agree.
RUN set -eux; \
    case "${TARGETARCH}" in \
      amd64) node_arch=x64; node_sha=9749e988f437343b7fa832c69ded82a312e41a03116d766797ac14f6f9eee578 ;; \
      arm64) node_arch=arm64; node_sha=0294e8b915ab75f92c7513d2fcb830ae06e10684e6c603e99a87dbf8835389c1 ;; \
      *) echo "unsupported architecture: ${TARGETARCH}" >&2; exit 1 ;; \
    esac; \
    archive="node-v${NODE_VERSION}-linux-${node_arch}.tar.xz"; \
    curl -fsSLo "/tmp/${archive}" "https://nodejs.org/dist/v${NODE_VERSION}/${archive}"; \
    echo "${node_sha}  /tmp/${archive}" | sha256sum -c -; \
    tar -xJf "/tmp/${archive}" -C /usr/local --strip-components=1 --no-same-owner; \
    rm -f "/tmp/${archive}"; \
    ln -sfn /usr/local/bin/node /usr/bin/node; \
    node --version | grep -Fx "v${NODE_VERSION}"

# Hermes is installed from its exact signed release tag commit and its checked
# in uv.lock. No mutable branch or PyPI version selection is used.
RUN set -eux; \
    git init /opt/hermes-agent; \
    git -C /opt/hermes-agent remote add origin https://github.com/NousResearch/hermes-agent.git; \
    git -C /opt/hermes-agent fetch --depth=1 origin "refs/tags/${HERMES_VERSION}:refs/tags/${HERMES_VERSION}"; \
    test "$(git -C /opt/hermes-agent rev-list -n 1 "${HERMES_VERSION}")" = "${HERMES_COMMIT}"; \
    git -C /opt/hermes-agent checkout --detach "${HERMES_COMMIT}"; \
    test "$(git -C /opt/hermes-agent rev-parse HEAD)" = "${HERMES_COMMIT}"; \
    cd /opt/hermes-agent; \
    UV_PYTHON=python3.12 uv sync --frozen --no-dev --no-editable --extra acp; \
    ln -s /opt/hermes-agent/.venv/bin/hermes /usr/local/bin/hermes; \
    ln -s /opt/hermes-agent/.venv/bin/hermes-agent /usr/local/bin/hermes-agent; \
    ln -s /opt/hermes-agent/.venv/bin/hermes-acp /usr/local/bin/hermes-acp; \
    rm -rf /opt/hermes-agent/.git /root/.cache/uv; \
    /opt/hermes-agent/.venv/bin/python -c 'import acp; from importlib.metadata import version; assert version("hermes-agent") == "0.18.2"'

# OpenCode publishes architecture-specific, self-contained binaries. Installing
# the verified binary package avoids a runtime dependency on npm's optional
# dependency selection.
RUN set -eux; \
    case "${TARGETARCH}" in \
      amd64) opencode_arch=x64; opencode_sha=bcc60c929aabb5eb30f8aeeadec9754e3304c11c5966b708329067943b9f8934 ;; \
      arm64) opencode_arch=arm64; opencode_sha=5f9783e732d6a9be72e83caea4085b2cfd42e5c5e1a147f216df098d376407e1 ;; \
      *) echo "unsupported architecture: ${TARGETARCH}" >&2; exit 1 ;; \
    esac; \
    archive="opencode-linux-${opencode_arch}-${OPENCODE_VERSION}.tgz"; \
    curl -fsSLo "/tmp/${archive}" "https://registry.npmjs.org/opencode-linux-${opencode_arch}/-/opencode-linux-${opencode_arch}-${OPENCODE_VERSION}.tgz"; \
    echo "${opencode_sha}  /tmp/${archive}" | sha256sum -c -; \
    tar -xzf "/tmp/${archive}" -C /tmp package/bin/opencode; \
    install -m 0755 /tmp/package/bin/opencode /usr/local/bin/opencode; \
    rm -rf "/tmp/${archive}" /tmp/package; \
    opencode --version | grep -Fx "${OPENCODE_VERSION}"

# The Minion npm tarball itself is integrity-pinned. Its private Drone 0.2
# dependency is checked here; the requested standalone Drone 0.3 runtime is
# installed separately below.
RUN set -eux; \
    archive="minion-${MINION_VERSION}.tgz"; \
    curl -fsSLo "/tmp/${archive}" "https://registry.npmjs.org/@nikolasp98/minion/-/${archive}"; \
    echo "f45ab3bf4bcbdcb6f6f69629fd5e9610f847eb73bff38f0aa4fab1f0ab4e634199bc440dd0ebeec4de7928cd752b468458aa7c931c94c151a14545820b271746  /tmp/${archive}" | sha512sum -c -; \
    npm install --global --omit=dev --omit=optional "/tmp/${archive}"; \
    rm -f "/tmp/${archive}"; \
    npm cache clean --force; \
    minion --version | grep -F "${MINION_VERSION}"; \
    node -e 'const p=require("/usr/local/lib/node_modules/@nikolasp98/minion/package.json"); if (!p.dependencies?.["@minion-stack/drone"]) process.exit(1)'

# NotesMD publishes verified binaries for both exeuntu architectures. Preserve
# the historic obsidian-cli command as a compatibility alias.
RUN set -eux; \
    case "${TARGETARCH}" in \
      amd64) notes_arch=amd64; notes_sha=e9c484adca59d46365d27a52a6a2e82f2c50b932457bef86e4972c73ccc209c2 ;; \
      arm64) notes_arch=arm64; notes_sha=2a7d662816859a1b8f0ad25ebaadeafd7e284b0173b85ec547cb6c7b18603366 ;; \
      *) echo "unsupported architecture: ${TARGETARCH}" >&2; exit 1 ;; \
    esac; \
    archive="notesmd-cli_${NOTESMD_VERSION}_linux_${notes_arch}.tar.gz"; \
    curl -fsSLo "/tmp/${archive}" "https://github.com/Yakitrak/notesmd-cli/releases/download/v${NOTESMD_VERSION}/${archive}"; \
    echo "${notes_sha}  /tmp/${archive}" | sha256sum -c -; \
    tar -xzf "/tmp/${archive}" -C /tmp notesmd-cli; \
    install -m 0755 /tmp/notesmd-cli /usr/local/bin/notesmd-cli; \
    ln -s notesmd-cli /usr/local/bin/obsidian-cli; \
    rm -f "/tmp/${archive}" /tmp/notesmd-cli; \
    notesmd-cli --version | grep -Fx "notesmd-cli version v${NOTESMD_VERSION}"

# Current exe.dev workstations are amd64, where the interactive browser is an
# integrity-pinned Google Chrome build exposed through the `chromium` command.
# The base image also has arm64; that variant uses snapshot-pinned GNOME Web as
# a compatible interactive fallback until Google ships Chrome for Linux arm64.
RUN set -eux; \
    case "${TARGETARCH}" in \
      amd64) \
        archive="google-chrome-stable_${CHROME_VERSION}_amd64.deb"; \
        curl -fsSLo "/tmp/${archive}" "https://dl.google.com/linux/chrome/deb/pool/main/g/google-chrome-stable/${archive}"; \
        echo "0f19e68dca574849632e25229f15853d2beac33fa06498feed43f34628bc2d53  /tmp/${archive}" | sha256sum -c -; \
        apt-get update; \
        apt-get install -y --no-install-recommends "/tmp/${archive}"; \
        rm -f "/tmp/${archive}"; \
        ln -s /usr/bin/google-chrome-stable /usr/local/bin/chromium; \
        ln -s /usr/bin/google-chrome-stable /usr/local/bin/browser; \
        chromium --version | grep -F "150.0.7871.114" \
        ;; \
      arm64) \
        apt-get update; \
        apt-get install -y --no-install-recommends epiphany-browser; \
        ln -s /usr/bin/epiphany-browser /usr/local/bin/browser \
        ;; \
      *) echo "unsupported architecture: ${TARGETARCH}" >&2; exit 1 ;; \
    esac; \
    rm -rf /var/lib/apt/lists/*

# Backups use rclone. Resolve it from the same immutable Ubuntu snapshot as the
# desktop packages.
RUN set -eux; \
    rm -f /etc/apt/sources.list.d/google-chrome.list /etc/apt/sources.list.d/google-chrome.sources; \
    apt-get update; \
    apt-get install -y --no-install-recommends rclone; \
    rm -rf /var/lib/apt/lists/*; \
    rclone version

ARG DRONE_VERSION=0.3.0
ARG SHELLS_BRIDGE_VERSION=0.1.4

# Minion 2026.7.11-dev depends on Drone ^0.2.0. Install the current 0.3.0
# runtime explicitly so new workstations expose the requested Drone version
# without mutating the pinned Minion package's private dependency tree.
RUN set -eux; \
    archive="drone-${DRONE_VERSION}.tgz"; \
    curl -fsSLo "/tmp/${archive}" "https://registry.npmjs.org/@minion-stack/drone/-/${archive}"; \
    echo "9dff67108ff248f55580d634698bf49e0b813d90f7574c4439975821eacda575601b54019b37900ab4724ebadad1cb5830eb5f99af34bb33930dd4d4d5dc594b  /tmp/${archive}" | sha512sum -c -; \
    npm install --global --omit=dev --omit=optional "/tmp/${archive}"; \
    rm -f "/tmp/${archive}"; \
    npm cache clean --force; \
    test "$(node -p 'require("/usr/local/lib/node_modules/@minion-stack/drone/package.json").version')" = "${DRONE_VERSION}"

# The bridge is the VM-side control-plane client. It registers the workstation,
# runs the selected harness, and performs archive/restore operations through
# rclone. exe.dev injects SHELLS_* into container PID 1; a root-only one-shot
# copies the allowlist into a transient mode-0640 EnvironmentFile before the
# bridge drops to the unprivileged agent account.
RUN set -eux; \
    archive="shells-bridge-${SHELLS_BRIDGE_VERSION}.tgz"; \
    curl -fsSLo "/tmp/${archive}" "https://registry.npmjs.org/@minion-stack/shells-bridge/-/${archive}"; \
    echo "da101cd4167ce1a202a7973dbda9158e0f7e066cc8534f5ab8b7d7101b843f525a2697cc6f5664f5af3d79dcbced52caa152c061329039029f333e6bb213536a  /tmp/${archive}" | sha512sum -c -; \
    npm install --global --omit=dev --omit=optional "/tmp/${archive}"; \
    rm -f "/tmp/${archive}"; \
    npm cache clean --force; \
    test "$(node -p 'require("/usr/local/lib/node_modules/@minion-stack/shells-bridge/package.json").version')" = "${SHELLS_BRIDGE_VERSION}"; \
    test -x /usr/local/bin/shells-bridge

COPY --chmod=0755 scripts/minion-xstartup /usr/local/libexec/minion-xstartup
COPY --chmod=0755 scripts/minion-capture-environment /usr/local/libexec/minion-capture-environment
COPY --chmod=0755 scripts/minion-preview /usr/local/bin/minion-preview
COPY systemd/minion-vnc.service /etc/systemd/system/minion-vnc.service
COPY systemd/minion-novnc.service /etc/systemd/system/minion-novnc.service
COPY systemd/minion-workstation-env.service /etc/systemd/system/minion-workstation-env.service
COPY systemd/shells-bridge.service /etc/systemd/system/shells-bridge.service
COPY manifest/versions.json /usr/local/share/minion-workstation/versions.json
COPY guidance/AGENTS.md /usr/local/share/minion-workstation/AGENTS.md
COPY preview-demo/ /usr/local/share/minion-workstation/preview-demo/

RUN set -eux; \
    id agent >/dev/null 2>&1 || useradd --create-home --shell /bin/bash agent; \
    install -d -o agent -g agent -m 0750 /home/agent/state /home/agent/workspace /home/agent/.config /home/agent/.config/rclone; \
    install -o agent -g agent -m 0644 /usr/local/share/minion-workstation/AGENTS.md /home/agent/state/AGENTS.md; \
    ln -sfn AGENTS.md /home/agent/state/CLAUDE.md; \
    printf '[b2]\ntype = b2\n' > /home/agent/.config/rclone/rclone.conf; \
    chown agent:agent /home/agent/.config/rclone/rclone.conf; \
    chmod 0600 /home/agent/.config/rclone/rclone.conf; \
    install -d -o exedev -g exedev -m 0700 /home/exedev/.vnc; \
    systemctl enable minion-vnc.service minion-novnc.service shells-bridge.service; \
    systemd-analyze verify /etc/systemd/system/minion-vnc.service /etc/systemd/system/minion-novnc.service /etc/systemd/system/minion-workstation-env.service /etc/systemd/system/shells-bridge.service; \
    install -o exedev -g exedev -m 0644 /usr/local/share/minion-workstation/AGENTS.md /home/exedev/AGENTS.md; \
    ln -sfn AGENTS.md /home/exedev/CLAUDE.md; \
    chown -R exedev:exedev /home/exedev

EXPOSE 8000

# Keep the GHCR package linked to the public meta-repo instead of inheriting
# the upstream exeuntu source label.
LABEL org.opencontainers.image.source="https://github.com/NikolasP98/minion-meta"
