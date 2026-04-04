Add-Type -AssemblyName System.Drawing
$bmp = New-Object System.Drawing.Bitmap("C:\Users\user\dev\sort_cat\www\assets\images\cat_tabby.png")
$pixels = @( (0,0), (10,10), (100, 100), (500, 50), (1, 1) )
foreach ($p in $pixels) {
    $c = $bmp.GetPixel($p[0], $p[1])
    Write-Host "Pixel ($($p[0]),$($p[1])) - R:$($c.R) G:$($c.G) B:$($c.B) A:$($c.A)"
}
$bmp.Dispose()
