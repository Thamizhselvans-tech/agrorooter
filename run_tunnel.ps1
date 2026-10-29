while ($true) {
    Write-Host "Starting Cloudflare Tunnel..."
    & "tools\cloudflared.exe" tunnel --url http://127.0.0.1:8000
    Write-Host "Tunnel stopped. Retrying in 4 seconds..."
    Start-Sleep -Seconds 4
}
