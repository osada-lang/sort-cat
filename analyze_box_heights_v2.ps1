Add-Type -AssemblyName System.Drawing
$bmp = New-Object System.Drawing.Bitmap("C:\Users\user\dev\sort_cat\www\assets\images\cat_tower_v5.png")
$checkX = 460 # Should hit the platforms/cups
Write-Host "Image Height: $($bmp.Height)"
$boxes = @()
$inBox = $false
$boxStart = 0
for ($y = 0; $y -lt $bmp.Height; $y++) {
    $c = $bmp.GetPixel($checkX, $y)
    if ($c.A -gt 30) {
        if (-not $inBox) {
            $boxStart = $y
            $inBox = $true
        }
    } else {
        if ($inBox) {
            $boxes += @{ Start = $boxStart; End = $y - 1; Center = ($boxStart + $y - 1) / 2 }
            $inBox = $false
        }
    }
}
if ($inBox) {
    $boxes += @{ Start = $boxStart; End = $bmp.Height - 1; Center = ($boxStart + $bmp.Height - 1) / 2 }
}

foreach ($b in $boxes) {
    Write-Host "Platform Segment: Start:$($b.Start) End:$($b.End) Center:$($b.Center)"
}
$bmp.Dispose()
