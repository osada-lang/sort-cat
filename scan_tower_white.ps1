Add-Type -AssemblyName System.Drawing
$bmp = New-Object System.Drawing.Bitmap("C:\Users\user\dev\sort_cat\www\assets\images\cat_tower.png")
Write-Host "Width:$($bmp.Width) Height:$($bmp.Height)"

# Scan every 50 pixels and report if near-white
for ($y = 0; $y -lt $bmp.Height; $y += 64) {
    $line = ""
    for ($x = 0; $x -lt $bmp.Width; $x += 64) {
        $c = $bmp.GetPixel($x, $y)
        if ($c.R -gt 240 -and $c.G -gt 240 -and $c.B -gt 240) {
            $line += "W "
        } else {
            $line += ". "
        }
    }
    Write-Host "$line"
}
$bmp.Dispose()
