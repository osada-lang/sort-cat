Add-Type -AssemblyName System.Drawing
$bmp = New-Object System.Drawing.Bitmap("C:\Users\user\dev\sort_cat\www\assets\images_original\cat_tabby.png")
$c = $bmp.GetPixel(0,0)
Write-Host "Original R:$($c.R) G:$($c.G) B:$($c.B) A:$($c.A)"
$bmp.Dispose()
