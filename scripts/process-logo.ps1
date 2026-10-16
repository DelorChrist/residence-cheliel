Add-Type -AssemblyName System.Drawing

$rawPath = Join-Path $PSScriptRoot "..\public\images\logo_raw.jpg"
$outLogoPath = Join-Path $PSScriptRoot "..\public\images\logo.png"

if (-not (Test-Path $rawPath)) {
    Write-Error "logo_raw.jpg not found"
    exit 1
}

$bmp = [System.Drawing.Bitmap]::FromFile($rawPath)
$width = $bmp.Width
$height = $bmp.Height

$minX = $width
$maxX = 0
$minY = $height
$maxY = 0

for ($y = 0; $y -lt $height; $y++) {
    for ($x = 0; $x -lt $width; $x++) {
        $pixel = $bmp.GetPixel($x, $y)
        # Anything noticeably darker than pure white
        if ($pixel.R -lt 245 -or $pixel.G -lt 245 -or $pixel.B -lt 245) {
            if ($x -lt $minX) { $minX = $x }
            if ($x -gt $maxX) { $maxX = $x }
            if ($y -lt $minY) { $minY = $y }
            if ($y -gt $maxY) { $maxY = $y }
        }
    }
}

Write-Host "Logo bounding box: ($minX, $minY) to ($maxX, $maxY)"
$contentW = $maxX - $minX + 1
$contentH = $maxY - $minY + 1
Write-Host "Content dimensions: ${contentW}x${contentH}"

# Create a clean square image of 1024x1024 with white background
$targetSquare = 1024
$destBmp = New-Object System.Drawing.Bitmap($targetSquare, $targetSquare, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($destBmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

# Clear with pure white
$g.Clear([System.Drawing.Color]::White)

# Add a subtle, balanced margin (10% padding on each side)
$padding = [int]($targetSquare * 0.08)
$availSize = $targetSquare - (2 * $padding)

$scale = [Math]::Min($availSize / $contentW, $availSize / $contentH)
$drawW = [int]($contentW * $scale)
$drawH = [int]($contentH * $scale)

$destX = [int](($targetSquare - $drawW) / 2)
$destY = [int](($targetSquare - $drawH) / 2)

$srcRect = New-Object System.Drawing.Rectangle($minX, $minY, $contentW, $contentH)
$destRect = New-Object System.Drawing.Rectangle($destX, $destY, $drawW, $drawH)

$g.DrawImage($bmp, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)

$destBmp.Save($outLogoPath, [System.Drawing.Imaging.ImageFormat]::Png)

$g.Dispose()
$destBmp.Dispose()
$bmp.Dispose()

Write-Host "Successfully generated master $outLogoPath (${targetSquare}x${targetSquare})"
