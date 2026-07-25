# SurfBill Production Server Deployment Script
# Run this in your own PowerShell terminal
# It will prompt for the server password when needed

$SERVER = "root@154.154.252.228"
$PROJECT_DIR = "/root/Billing-System-"

Write-Host "=== SurfBill Production Deployment ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: SSH to server and run git pull + pm2 restart
Write-Host "[1/2] Pulling latest changes on server and restarting PM2..." -ForegroundColor Yellow
Write-Host "      (You will be prompted for the server password)" -ForegroundColor Gray

ssh -o StrictHostKeyChecking=no $SERVER "cd $PROJECT_DIR && git pull origin main && pm2 restart billing-system && pm2 status"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "[OK] Server updated and PM2 restarted successfully!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "[WARN] git pull or PM2 restart may have failed. Trying tarball fallback..." -ForegroundColor Yellow

    # Step 2: Fallback - upload tarball and extract
    Write-Host "[2/2] Uploading deploy_assets.tar.gz to server..." -ForegroundColor Yellow
    scp -o StrictHostKeyChecking=no deploy_assets.tar.gz "${SERVER}:/root/"

    Write-Host "      Extracting assets on server..." -ForegroundColor Yellow
    ssh -o StrictHostKeyChecking=no $SERVER @"
mkdir -p /var/www/app
tar -xzf /root/deploy_assets.tar.gz -C /var/www/app/ --strip-components=1 dist
mkdir -p /root/Billing-System-/src/
tar -xzf /root/deploy_assets.tar.gz -C /root/Billing-System-/src/ --strip-components=1 src
pm2 restart billing-system || pm2 start /root/Billing-System-/src/server.ts --interpreter ts-node --name billing-system
pm2 status
"@
}

Write-Host ""
Write-Host "=== Deployment Complete ===" -ForegroundColor Cyan
Write-Host "Visit http://154.154.252.228 to verify the application is running." -ForegroundColor White
