# Setup Git Hook for Auto Deployment on Commit
$hookPath = ".git/hooks/post-commit"

$hookContent = @"
#!/bin/sh
echo "=== Auto-deploying commit to server ==="
powershell.exe -ExecutionPolicy Bypass -File ./deploy_server.ps1
"@

if (-not (Test-Path ".git")) {
    Write-Host "[WARN] .git folder not found. Please run inside git repository." -ForegroundColor Red
    exit 1
}

if (-not (Test-Path ".git/hooks")) {
    New-Item -ItemType Directory -Path ".git/hooks" -Force | Out-Null
}

Set-Content -Path $hookPath -Value $hookContent -Force
Write-Host "[OK] Git post-commit hook created successfully at $hookPath!" -ForegroundColor Green
Write-Host "Now, every time you commit locally, deploy_server.ps1 will run automatically." -ForegroundColor Cyan
