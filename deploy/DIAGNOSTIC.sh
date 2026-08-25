#!/bin/sh
# Que peut-on faire sur ce serveur ? À lancer tel quel, sans sudo.
# Aucune modification n'est effectuée : uniquement des lectures.

echo "=== Utilisateur et groupes ==="
whoami
id

echo
echo "=== Docker ==="
if command -v docker >/dev/null 2>&1; then
  docker --version
  if docker ps >/dev/null 2>&1; then
    echo "docker ps : OK (utilisable sans sudo)"
  else
    echo "docker ps : REFUSÉ (utilisateur absent du groupe docker)"
  fi
  docker compose version 2>/dev/null || echo "docker compose : absent"
else
  echo "docker : absent"
fi

echo
echo "=== Node / Postgres en local ==="
command -v node >/dev/null 2>&1 && node --version || echo "node : absent"
command -v npm  >/dev/null 2>&1 && npm --version  || echo "npm : absent"
command -v psql >/dev/null 2>&1 && psql --version || echo "psql : absent"

echo
echo "=== nginx ==="
command -v nginx >/dev/null 2>&1 && nginx -v 2>&1 || echo "nginx : binaire non visible"
ls -d /etc/nginx 2>/dev/null && ls /etc/nginx/ 2>/dev/null | head
echo "--- écriture dans la conf nginx ---"
[ -w /etc/nginx ] && echo "/etc/nginx : ACCESSIBLE en écriture" || echo "/etc/nginx : lecture seule ou invisible"

echo
echo "=== Panneau d'hébergement détecté ? ==="
for d in /usr/local/psa /usr/local/cpanel /home/cloudpanel /usr/local/ispconfig /usr/share/webmin; do
  [ -e "$d" ] && echo "trouvé : $d"
done
echo "(aucune ligne ci-dessus = pas de panneau détecté)"

echo
echo "=== Ports déjà écoutés en local ==="
(ss -ltnp 2>/dev/null || netstat -ltnp 2>/dev/null) | head -20

echo
echo "=== Répertoire personnel ==="
echo "HOME=$HOME"
df -h "$HOME" | tail -1
