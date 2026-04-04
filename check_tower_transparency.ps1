Add-Type -AssemblyName System.Drawing
$bmp = New-Object System.Drawing.Bitmap("C:\Users\user\dev\sort_cat\www\assets\images\cat_tower.png")
Write-Host "Image Size: $($bmp.Width) x $($bmp.Height)"
$w = $bmp.Width
$h = $bmp.Height
$pixels = @( @(0,0), @(5,5), @(10, 10), @($w-1, 0), @(0, $h-1) )
foreach ($p in $pixels) {
    try {
        $c = $bmp.GetPixel($p[0], $p[1])
        Write-Host "Pixel ($($p[0]),$($p[1])) - R:$($c.R) G:$($c.G) B:$($c.B) A:$($c.A)"
    } catch {
        Write-Host "Error getting pixel $($p[0]), $($p[1])"
    }
}
$bmp.Dispose()
