#!/bin/bash
set -e

echo "🔄 Pulling latest changes from GitHub..."
cd /home/surfbill/Desktop/Surfbill/Billing-system-
git pull origin main

echo "📦 Installing dependencies..."
npm install --production=false

echo "🏗️ Building backend..."
npm run build

echo "🎨 Building frontend..."
cd frontend && npm install && npm run build && cd ..

echo "🚀 Deploying to production..."
sudo rm -rf /srv/apps/billing-system/dist
sudo cp -r dist /srv/apps/billing-system/dist
sudo cp /srv/apps/billing-system/.env /srv/apps/billing-system/dist/.env
sudo cp -r frontend/dist/* /srv/apps/billing-system/frontend/dist/
sudo chown -R surfbill:surfbill /srv/apps/billing-system/dist /srv/apps/billing-system/frontend/dist

echo "♻️ Restarting server..."
pm2 restart billing-system && pm2 save

echo "✅ Deploy complete!"
