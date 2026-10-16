Add-Type -AssemblyName System.Drawing

$srcPath = Join-Path $PSScriptRoot "..\public\images\logo.png"
$publicDir = Join-Path $PSScriptRoot "..\public"

if (-not (Test-Path $srcPath)) {
    Write-Error "Source image not found: $srcPath"
    exit 1
}

$srcImg = [System.Drawing.Image]::FromFile($srcPath)
Write-Host "Source image size: $($srcImg.Width)x$($srcImg.Height)"

function Resize-Image {
    param(
        [System.Drawing.Image]$img,
        [int]$width,
        [int]$height,
        [string]$outputPath,
        [bool]$maskable = $false
    )

    $destBmp = New-Object System.Drawing.Bitmap($width, $height)
    $g = [System.Drawing.Graphics]::FromImage($destBmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    # Always fill background with white for clean rendering on iOS/Android
    $whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $g.FillRectangle($whiteBrush, 0, 0, $width, $height)
    $whiteBrush.Dispose()

    if ($maskable) {
        # Safe zone for maskable icons (inner 70% to ensure Android circle/squircle masks don't clip)
        $padX = [int]($width * 0.15)
        $padY = [int]($height * 0.15)
        $targetW = $width - (2 * $padX)
        $targetH = $height - (2 * $padY)
        $g.DrawImage($img, $padX, $padY, $targetW, $targetH)
    } else {
        $g.DrawImage($img, 0, 0, $width, $height)
    }

    $destBmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $destBmp.Dispose()
    Write-Host "Generated: $outputPath ($($width)x$($height))"
}

# Generate required PWA icons
Resize-Image -img $srcImg -width 64 -height 64 -outputPath (Join-Path $publicDir "pwa-64x64.png")
Resize-Image -img $srcImg -width 180 -height 180 -outputPath (Join-Path $publicDir "apple-touch-icon.png")
Resize-Image -img $srcImg -width 192 -height 192 -outputPath (Join-Path $publicDir "pwa-192x192.png")
Resize-Image -img $srcImg -width 512 -height 512 -outputPath (Join-Path $publicDir "pwa-512x512.png")
Resize-Image -img $srcImg -width 512 -height 512 -outputPath (Join-Path $publicDir "maskable-icon-512x512.png") -maskable $true

# Also in public/icons/ directory for standard structure
$iconsDir = Join-Path $publicDir "icons"
if (-not (Test-Path $iconsDir)) {
    New-Item -ItemType Directory -Path $iconsDir | Out-Null
}
Resize-Image -img $srcImg -width 192 -height 192 -outputPath (Join-Path $iconsDir "icon-192x192.png")
Resize-Image -img $srcImg -width 512 -height 512 -outputPath (Join-Path $iconsDir "icon-512x512.png")
Resize-Image -img $srcImg -width 512 -height 512 -outputPath (Join-Path $iconsDir "maskable-icon-512x512.png") -maskable $true

$srcImg.Dispose()
Write-Host "All icons generated successfully!"
