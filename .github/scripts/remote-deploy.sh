#!/bin/bash
set -e

rm -rf ~/_deploy_incoming
mkdir -p ~/_deploy_incoming
tar -xzf ~/deploy_incoming.tar.gz -C ~/_deploy_incoming
rm -f ~/deploy_incoming.tar.gz

rsync -a --delete --exclude='.htaccess' --exclude='.well-known' \
  ~/_deploy_incoming/public_html/ ~/public_html/

for s in auth pedidos tracking notificaciones; do
  destino=~/"$s".ravendomicilios.dpdns.org
  rsync -a --delete \
    --exclude='.env' --exclude='node_modules' --exclude='tmp' \
    --exclude='app.js' --exclude='.well-known' \
    ~/_deploy_incoming/"$s"/ "$destino"/
  (cd "$destino" && /opt/cpanel/ea-nodejs22/bin/npm ci --omit=dev && mkdir -p tmp && touch tmp/restart.txt)
done

rm -rf ~/_deploy_incoming
