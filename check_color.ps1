Add-Type -AssemblyName System.Drawing
$bmp = New-Object System.Drawing.Bitmap("C:\Users\user\dev\sort_cat\www\assets\images\cat_tabby.png")
$c = $bmp.GetPixel(0,0)
Write-Host "R:$($c.R) G:$($c.G) B:$($c.B) A:$($c.A)"
$bmp.Dispose()
