$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path

Push-Location $projectRoot
try {
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw 'Node.js est requis pour vérifier la syntaxe JavaScript.'
  }

  Write-Host 'Vérification de la syntaxe JavaScript…' -ForegroundColor Cyan
  node --check .\script.js
  if ($LASTEXITCODE -ne 0) {
    throw 'La vérification de script.js a échoué.'
  }

  node --check .\sw.js
  if ($LASTEXITCODE -ne 0) {
    throw 'La vérification de sw.js a échoué.'
  }

  Write-Host 'Vérification du manifeste PWA…' -ForegroundColor Cyan
  $manifest = Get-Content .\manifest.webmanifest -Raw | ConvertFrom-Json
  if (-not $manifest.start_url -or -not $manifest.icons) {
    throw 'Le manifeste doit définir une URL de démarrage et au moins une icône.'
  }

  $requiredFiles = @(
    'index.html',
    'style.css',
    'script.js',
    'sw.js',
    'manifest.webmanifest',
    'icons/app-icon.svg'
  )
  $missingFiles = @($requiredFiles | Where-Object { -not (Test-Path $_ -PathType Leaf) })
  if ($missingFiles.Count -gt 0) {
    throw "Fichiers manquants : $($missingFiles -join ', ')"
  }

  Write-Host 'Vérification réussie : JavaScript, manifeste et fichiers requis sont présents.' -ForegroundColor Green
}
finally {
  Pop-Location
}
