Add-Type -AssemblyName System.Drawing
$bmp = New-Object System.Drawing.Bitmap("C:\Users\user\dev\sort_cat\www\assets\images\cat_calico.png")

$minX = $bmp.Width
$maxX = 0

for ($y = 0; $y -lt $bmp.Height; $y++) {
    for ($x = 0; $x -lt $bmp.Width; $x++) {
        $c = $bmp.GetPixel($x, $y)
        if ($c.A -gt 20) {
            if ($x -lt $minX) { $minX = $x }
            if ($x -gt $maxX) { $maxX = $x }
        }
    }
}

Write-Host "Image Width: $($bmp.Width)"
Write-Host "Visible content starts at X (left): $minX"
Write-Host "Visible content ends at X (right): $maxX"
$center = ($minX + $maxX) / 2
Write-Host "Visible center is at X: $center"
Write-Host "Visible center as percentage: $(($center / $bmp.Width) * 100)%"

$bmp.Dispose()
