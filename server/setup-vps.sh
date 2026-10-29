#!/usr/bin/env bash
# ==============================================================================
# Holhuashi Hetzner VPS One-Click Provisioning Script (Ubuntu 24.04 / 22.04)
# Run as root or with sudo on your fresh Hetzner Singapore VPS
# ==============================================================================

set -euo pipefail

echo "==> [1/5] Updating system packages..."
apt-get update && apt-get upgrade -y
apt-get install -y ca-certificates curl gnupg lsb-release ufw fail2ban git htop

echo "==> [2/5] Hardening firewall (UFW)..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP (Let\'s Encrypt ACME)'
ufw allow 443/tcp comment 'HTTPS (Caddy Proxy & WebSockets)'
ufw --force enable

echo "==> [3/5] Installing Docker Engine & Docker Compose..."
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

systemctl enable docker
systemctl start docker

echo "==> [4/5] Preparing application directory..."
mkdir -p /opt/holhuashi
cd /opt/holhuashi

echo "==> [5/5] Docker ready!"
echo "------------------------------------------------------------------"
echo "Next Steps:"
echo "1. Copy docker-compose.yml, Caddyfile, and .env into /opt/holhuashi/"
echo "2. Edit /opt/holhuashi/.env with your domain & DB passwords"
echo "3. Run: docker compose up -d --build"
echo "4. Check logs: docker compose logs -f"
echo "------------------------------------------------------------------"
