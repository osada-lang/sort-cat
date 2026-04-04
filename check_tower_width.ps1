Add-Type -AssemblyName System.Drawing
$bmp = New-Object System.Drawing.Bitmap("C:\Users\user\dev\sort_cat\www\assets\images\cat_tower_v3_raw.png")
Write-Host "Width:$($bmp.Width)"
# Check width at center height
for ($x = 400; $x -le 624; $x += 16) {
    $c = $bmp.GetPixel($x, 512)
    $type = " "
    if ($c.R -gt 240) { $type = "W" } else { $type = "." }
    Write-Host "X:$x R:$($c.R) G:$($c.G) B:$($c.B) -> $type"
}
$bmp.Dispose()
