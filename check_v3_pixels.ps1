Add-Type -AssemblyName System.Drawing
$bmp = New-Object System.Drawing.Bitmap("C:\Users\user\dev\sort_cat\www\assets\images\cat_tower_v3_raw.png")
Write-Host "Image Size: $($bmp.Width) x $($bmp.Height)"
$pixels = @( (512, 512), (512, 200), (512, 800), (300, 512), (700, 512) )
foreach ($p in $pixels) {
    $c = $bmp.GetPixel($p[0], $p[1])
    Write-Host "Pixel ($($p[0]),$($p[1])) - R:$($c.R) G:$($c.G) B:$($c.B) A:$($c.A)"
}
$bmp.Dispose()
