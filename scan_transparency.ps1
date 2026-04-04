Add-Type -AssemblyName System.Drawing
$imagesDir = "C:\Users\user\dev\sort_cat\www\assets\images"
$files = Get-ChildItem -Path $imagesDir -Filter "*.png"

foreach ($file in $files) {
    $bmp = New-Object System.Drawing.Bitmap($file.FullName)
    $w = $bmp.Width
    $h = $bmp.Height
    
    # Check a few points in the background area
    $samples = @(
        (0,0), (5,5), ($w-1, 0), (0, $h-1), ($w-1, $h-1), (100, 5), (5, 100)
    )
    
    $nonTransCount = 0
    foreach ($s in $samples) {
        $c = $bmp.GetPixel($s[0], $s[1])
        if ($c.A -ne 0) { $nonTransCount++ }
    }
    
    Write-Host "$($file.Name): Non-transparent samples: $nonTransCount / $($samples.Length)"
    $bmp.Dispose()
}
