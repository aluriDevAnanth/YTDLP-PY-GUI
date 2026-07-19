$BackendDir = "backend"
$FrontendDir = "frontend"

if (Test-Path $BackendDir) {
    Write-Host "🚀 Launching Backend..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd $BackendDir; .\.venv\Scripts\activate; uv sync; python main.py"
}
else {
    Write-Warning "Backend directory '$BackendDir' not found. Skipping."
}

if (Test-Path $FrontendDir) {
    Write-Host "🚀 Launching Frontend..." -ForegroundColor Green
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd $FrontendDir; bun i; bun run dev"
}
else {
    Write-Warning "Frontend directory '$FrontendDir' not found. Skipping."
}