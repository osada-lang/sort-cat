Add-Type -AssemblyName System.Drawing
$bmp = New-Object System.Drawing.Bitmap("C:\Users\user\dev\sort_cat\www\assets\images\cat_tower.png")
Write-Host "Image Size: $($bmp.Width) x $($bmp.Height)"
$w_minus_1 = $bmp.Width - 1
$h_minus_1 = $bmp.Height - 1
$coords = @( (0,0), (5,5), (10, 10), ($w_minus_1, 0), (0, $h_minus_1) )
foreach ($p in $coords) {
    $x = $p[0]
    $y = $p[1]
    $c = $bmp.GetPixel($x, $y)
    Write-Host "Pixel ($x, $y) - R:$($c.R) G:$($c.G) B:$($c.B) A:$($c.A)"
}
$bmp.Dispose()
