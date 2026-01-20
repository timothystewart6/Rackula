# Docker Compose Hardening Design

**Date:** 2026-01-19
**Status:** Approved
**Issue:** #808
**Epic:** #196 (Self-hosted persistent storage)

## Overview

Refactor `docker-compose.yml`, `deploy/Dockerfile`, and `deploy/nginx.conf` with production best practices for self-hosters and VPS deployments.

## Context

The current `docker-compose.yml` is minimal:

```yaml
services:
  Rackula:
    image: ghcr.io/rackulalives/rackula:latest
    ports:
      - "8080:80"
    restart: unless-stopped
```

This serves both self-hosters and the production VPS deployment (count.racku.la). Needs to work out of the box while being configurable.

## Decisions

### Non-root Execution

**Decision:** Switch from `nginx:alpine` to `nginxinc/nginx-unprivileged:alpine`.

This official nginx image runs as UID 101 (non-root) from startup, eliminating the need for any Linux capabilities. Benefits:

- No root process at any point
- Drop ALL capabilities (no CHOWN/SETGID/SETUID needed)
- Smaller attack surface
- Maintained upstream by nginx team
- Supports arm64 for Raspberry Pi self-hosters

Requires nginx to listen on port 8080 internally (unprivileged port).

### Healthcheck: Dockerfile Only

The Dockerfile has a healthcheck using `/health` endpoint (defined in nginx.conf). Uses busybox wget which is built into Alpine:

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:8080/health || exit 1
```

**Decision:** Keep healthcheck in Dockerfile only. This makes the image portable across docker run, compose, and orchestrators without duplication.

**Note:** Using busybox wget (built-in) rather than standalone wget package to avoid adding attack surface.

### Resource Limits: Based on Observed Usage

Measured production containers:

- `rackula-app`: 1.4 MiB memory, 0% CPU
- `rackula-dev`: 2.6 MiB memory, 0% CPU

Production runs behind Cloudflare which caches and absorbs traffic. Self-hosters hitting nginx directly will see higher usage.

**Decision:** 2x safety margin over what would otherwise be reasonable limits:

- Memory: 128M limit, 16M reservation
- CPU: 0.50 limit, 0.10 reservation

Fixed limits (not configurable via .env) to keep configuration simple.

### Security Hardening

With non-root nginx, we can lock down maximally:

| Setting             | Purpose                                         |
| ------------------- | ----------------------------------------------- |
| `no-new-privileges` | Prevents privilege escalation via setuid/setgid |
| `cap_drop: ALL`     | Drops all Linux capabilities                    |
| `read_only: true`   | Immutable root filesystem                       |
| `tmpfs` mounts      | Writable space for nginx cache/pid without disk |

**Note:** No `cap_add` needed with nginx-unprivileged.

**tmpfs mounts:** Keep all three (`/var/cache/nginx`, `/var/run`, `/tmp`) for safety even though nginx-unprivileged uses `/tmp` for most things.

**Future consideration:** When adding persistent storage (docker volume), it will be writable despite `read_only: true` since volumes mount after the flag applies.

### Logging

```yaml
logging:
  driver: json-file
  options:
    max-size: "10m"
    max-file: "3"
```

30MB total max, auto-rotates. Sufficient for debugging while preventing disk fill.

### Port Convention

**Decision:** Keep default port 8080 for backwards compatibility with existing deployments.

Configurable via `RACKULA_PORT` env var. Document 8197 (embeds 1897, the year Dracula was published) as a fun alternative in `.env.example`.

### Graceful Shutdown

**Decision:** Add explicit `stop_grace_period: 10s` to document intent (matches Docker default).

### IPv6 Support

**Decision:** Add `listen [::]:8080;` to nginx.conf for dual-stack IPv4/IPv6 support.

### OCI Labels

Add standard container metadata:

```dockerfile
LABEL org.opencontainers.image.source="https://github.com/RackulaLives/Rackula"
LABEL org.opencontainers.image.description="Rack Layout Designer for Homelabbers"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.title="Rackula"
```

### Compose Version Requirement

**Decision:** Require Docker Compose v2 (the Go-based `docker compose` command). The `deploy.resources` syntax doesn't work with legacy docker-compose v1.

Docker Compose v1 was deprecated in June 2023. Document this requirement in README.

## Final Design

### docker-compose.yml

```yaml
services:
  rackula:
    image: ghcr.io/rackulalives/rackula:latest
    # To build locally instead, comment out 'image' and uncomment 'build':
    # build: ./deploy
    container_name: rackula
    ports:
      - "${RACKULA_PORT:-8080}:8080"
    restart: unless-stopped
    stop_grace_period: 10s

    # Resource limits (requires Docker Compose v2)
    deploy:
      resources:
        limits:
          cpus: "0.50"
          memory: 128M
        reservations:
          cpus: "0.10"
          memory: 16M

    # Security hardening (no cap_add needed with non-root nginx)
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    read_only: true
    tmpfs:
      - /var/cache/nginx:size=10M
      - /var/run:size=1M
      - /tmp:size=5M

    # Logging
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
```

### Dockerfile

```dockerfile
# Build stage
FROM node:22-alpine AS build
WORKDIR /app

# Build configuration
ARG VITE_ENV=production

# Umami analytics configuration (passed as build args)
ARG VITE_UMAMI_ENABLED=false
ARG VITE_UMAMI_WEBSITE_ID
ARG VITE_UMAMI_SCRIPT_URL

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install -g npm@11
RUN npm ci

# Copy source code and build
COPY . .
RUN npm run build

# Production stage - non-root nginx
FROM nginxinc/nginx-unprivileged:alpine

# OCI labels
LABEL org.opencontainers.image.source="https://github.com/RackulaLives/Rackula"
LABEL org.opencontainers.image.description="Rack Layout Designer for Homelabbers"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.title="Rackula"

# Copy nginx config and built assets
COPY ./deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

# Health check (port 8080 for unprivileged nginx, busybox wget is built-in)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:8080/health || exit 1

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
```

### nginx.conf changes

```nginx
server {
    listen 8080;       # Changed from 80 for non-root nginx
    listen [::]:8080;  # Added IPv6 support
    # ... rest unchanged
}
```

### .env.example

```bash
# Port to expose Rackula on (default: 8080)
# Fun alternative: 8197 (embeds 1897, the year Dracula was published)
RACKULA_PORT=8080
```

## Changes Summary

| Aspect            | Before              | After                                |
| ----------------- | ------------------- | ------------------------------------ |
| Base image        | `nginx:alpine`      | `nginxinc/nginx-unprivileged:alpine` |
| Container user    | root (master)       | UID 101 (non-root)                   |
| Internal port     | 80                  | 8080                                 |
| IPv6              | No                  | Yes                                  |
| Service name      | `Rackula`           | `rackula` (lowercase convention)     |
| Container name    | (auto-generated)    | `rackula`                            |
| Default port      | 8080                | 8080 (unchanged, backwards compat)   |
| Port config       | Hardcoded           | Env var with default                 |
| Resource limits   | None                | 128M/0.5 CPU                         |
| Capabilities      | Default (many)      | None (drop ALL)                      |
| Filesystem        | Read-write          | Read-only + tmpfs                    |
| Logging           | Default (unlimited) | 30MB rotated                         |
| OCI labels        | None                | Source, description, license, title  |
| Graceful shutdown | Default             | Explicit 10s                         |

## Implementation Notes

- **Requires Docker Compose v2** (not legacy docker-compose v1)
- VPS deployment: reverse proxy config needs update to proxy to port 8080 instead of 80
- File ownership: Build stage files are root-owned but readable by nginx user (644/755 perms)
- pid file: nginx-unprivileged handles this automatically (uses /tmp/nginx.pid)
- ARM64/Raspberry Pi: Fully supported by nginx-unprivileged image

## Critical Review Findings

Two rounds of critical review identified and resolved:

1. **wget availability** - Use busybox wget (built-in) not standalone package
2. **pid file location** - nginx-unprivileged handles it; we only replace conf.d/ not main nginx.conf
3. **Breaking port change** - Keep 8080 default for backwards compatibility
4. **VPS reverse proxy** - Document need to update proxy config (separate deployment task)
5. **tmpfs mounts** - Keep all three for safety
6. **Graceful shutdown** - Add explicit stop_grace_period
7. **docker-compose v1** - Drop support, require v2
8. **IPv6** - Add dual-stack support
9. **Resource configurability** - Keep fixed for simplicity
10. **ARM64 support** - Confirmed supported
