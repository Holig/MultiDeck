Add-Type -AssemblyName System.Drawing

$assetsDir = Join-Path $PSScriptRoot "..\assets"
if (-not (Test-Path $assetsDir)) {
    New-Item -ItemType Directory -Path $assetsDir -Force | Out-Null
}
$icoPath = Join-Path $assetsDir "icon.ico"

Write-Host "Génération de l'icône MultiDeck haute fidélité (Layers gradient)..."

function Create-MultiDeckBitmap($size) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    # 1. Rectangle arrondi avec coins modernes (squircle)
    $rect = New-Object System.Drawing.RectangleF(0, 0, $size, $size)
    $cornerRad = [Math]::Max(3, [float]($size * 0.28))
    $d = $cornerRad * 2.0
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddArc(0, 0, $d, $d, 180, 90)
    $path.AddArc($size - $d, 0, $d, $d, 270, 90)
    $path.AddArc($size - $d, $size - $d, $d, $d, 0, 90)
    $path.AddArc(0, $size - $d, $d, $d, 90, 90)
    $path.CloseFigure()

    # Dégradé vibrant : Bleu (#1d9bf0) -> Violet (#9333ea) -> Rose (#ec4899)
    $p1 = New-Object System.Drawing.PointF(0, $size)
    $p2 = New-Object System.Drawing.PointF($size, 0)
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($p1, $p2, [System.Drawing.Color]::FromArgb(29, 155, 240), [System.Drawing.Color]::FromArgb(236, 72, 153))
    
    $colorBlend = New-Object System.Drawing.Drawing2D.ColorBlend
    $colorBlend.Colors = @(
        [System.Drawing.Color]::FromArgb(29, 155, 240), # Bleu
        [System.Drawing.Color]::FromArgb(147, 51, 234), # Violet
        [System.Drawing.Color]::FromArgb(236, 72, 153)  # Rose
    )
    $colorBlend.Positions = @(0.0, 0.5, 1.0)
    $brush.InterpolationColors = $colorBlend

    $g.FillPath($brush, $path)

    # 2. Dessin des 3 couches superposées (Layers icon) en blanc pur
    $penWidth = [Math]::Max(1.6, ($size * 0.072))
    $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, [float]$penWidth)
    $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

    $cx = [float]($size / 2.0)
    $w = [float]($size * 0.52)
    $hw = [float]($w / 2.0)
    $topY = [float]($size * 0.22)
    $layerH = [float]($size * 0.125)
    $gapY = [float]($size * 0.135)

    # Couche 1 (Haut : Losange plein fermé)
    $pTop = New-Object System.Drawing.PointF($cx, $topY)
    $pRight = New-Object System.Drawing.PointF(($cx + $hw), ($topY + $layerH))
    $pBottom = New-Object System.Drawing.PointF($cx, ($topY + ($layerH * 2.0)))
    $pLeft = New-Object System.Drawing.PointF(($cx - $hw), ($topY + $layerH))
    [System.Drawing.PointF[]]$diamondPoints = @($pTop, $pRight, $pBottom, $pLeft)
    $g.DrawPolygon($pen, $diamondPoints)

    # Couche 2 (Milieu : Polyline ouverte)
    $mY = $topY + $gapY
    $pMidLeft = New-Object System.Drawing.PointF(($cx - $hw), ($mY + $layerH))
    $pMidBottom = New-Object System.Drawing.PointF($cx, ($mY + ($layerH * 2.0)))
    $pMidRight = New-Object System.Drawing.PointF(($cx + $hw), ($mY + $layerH))
    [System.Drawing.PointF[]]$midPoints = @($pMidLeft, $pMidBottom, $pMidRight)
    $g.DrawLines($pen, $midPoints)

    # Couche 3 (Bas : Polyline ouverte)
    $bY = $topY + ($gapY * 2.0)
    $pBotLeft = New-Object System.Drawing.PointF(($cx - $hw), ($bY + $layerH))
    $pBotBottom = New-Object System.Drawing.PointF($cx, ($bY + ($layerH * 2.0)))
    $pBotRight = New-Object System.Drawing.PointF(($cx + $hw), ($bY + $layerH))
    [System.Drawing.PointF[]]$botPoints = @($pBotLeft, $pBotBottom, $pBotRight)
    $g.DrawLines($pen, $botPoints)

    $g.Dispose()
    $brush.Dispose()
    $pen.Dispose()
    $path.Dispose()

    return $bmp
}

# Générer les résolutions standards Windows (16, 32, 48, 64, 128, 256)
$sizes = @(16, 32, 48, 64, 128, 256)
$bitmaps = @()

foreach ($s in $sizes) {
    $bitmaps += (Create-MultiDeckBitmap $s)
}

# Sauvegarder en ICO multi-images au format binaire
$ms = New-Object System.IO.MemoryStream
$bw = New-Object System.IO.BinaryWriter($ms)

# Header ICO : Reserved (0), Type (1 = icon), Count
$bw.Write([uint16]0)
$bw.Write([uint16]1)
$bw.Write([uint16]($sizes.Count))

$pngStreams = @()
$offset = 6 + ($sizes.Count * 16)

for ($i = 0; $i -lt $sizes.Count; $i++) {
    $pngMs = New-Object System.IO.MemoryStream
    $bitmaps[$i].Save($pngMs, [System.Drawing.Imaging.ImageFormat]::Png)
    $pngBytes = $pngMs.ToArray()
    $pngStreams += $pngBytes

    $sz = $sizes[$i]
    $w = if ($sz -ge 256) { 0 } else { $sz }
    $h = if ($sz -ge 256) { 0 } else { $sz }

    # ICONDIRENTRY
    $bw.Write([byte]$w)          # Width
    $bw.Write([byte]$h)          # Height
    $bw.Write([byte]0)           # Color count
    $bw.Write([byte]0)           # Reserved
    $bw.Write([uint16]1)         # Color planes
    $bw.Write([uint16]32)        # Bits per pixel
    $bw.Write([uint32]($pngBytes.Length)) # Size
    $bw.Write([uint32]$offset)   # Offset

    $offset += $pngBytes.Length
}

foreach ($pngData in $pngStreams) {
    $bw.Write($pngData)
}

$bw.Flush()
[System.IO.File]::WriteAllBytes($icoPath, $ms.ToArray())
$bw.Close()
$ms.Close()

foreach ($b in $bitmaps) {
    $b.Dispose()
}

Write-Host "Icône MultiDeck (Layers Gradient) générée avec succès : $icoPath"
