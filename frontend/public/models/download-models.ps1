# Run this script from: frontend/public/models/
# PowerShell: cd frontend/public/models ; .\download-models.ps1

$base = "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights"

$files = @(
  "tiny_face_detector_model-shard1",
  "tiny_face_detector_model-weights_manifest.json",
  "face_landmark_68_model-shard1",
  "face_landmark_68_model-weights_manifest.json",
  "face_recognition_model-shard1",
  "face_recognition_model-shard2",
  "face_recognition_model-weights_manifest.json"
)

foreach ($file in $files) {
  $url = "$base/$file"
  $out = Join-Path $PSScriptRoot $file
  if (Test-Path $out) {
    Write-Host "  ✓ Already exists: $file" -ForegroundColor Green
  } else {
    Write-Host "  ⬇ Downloading: $file ..." -ForegroundColor Cyan
    try {
      Invoke-WebRequest -Uri $url -OutFile $out -UseBasicParsing
      Write-Host "    ✓ Done" -ForegroundColor Green
    } catch {
      Write-Host "    ✗ Failed: $_" -ForegroundColor Red
    }
  }
}

Write-Host ""
Write-Host "All models downloaded to: $PSScriptRoot" -ForegroundColor Yellow
