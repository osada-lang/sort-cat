Add-Type -AssemblyName System.Drawing
$bmp = New-Object System.Drawing.Bitmap("C:\Users\user\dev\sort_cat\www\assets\images\cat_calico.png")

$minY = $bmp.Height
$maxY = 0

for ($x = 0; $x -lt $bmp.Width; $x++) {
    for ($y = 0; $y -lt $bmp.Height; $y++) {
        $c = $bmp.GetPixel($x, $y)
        if ($c.A -gt 20) {
            if ($y -lt $minY) { $minY = $y }
            if ($y -gt $maxY) { $maxY = $y }
        }
    }
}

Write-Host "Image Height: $($bmp.Height)"
Write-Host "Visible content starts at Y (top): $minY"
Write-Host "Visible content ends at Y (bottom): $maxY"
$bottomPadding = $bmp.Height - 1 - $maxY
Write-Host "Transparent padding at bottom: $bottomPadding pixels"

$bmp.Dispose()
