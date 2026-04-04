Add-Type -AssemblyName System.Drawing
$imagesDir = "C:\Users\user\dev\sort_cat\www\assets\images"
$files = Get-ChildItem -Path $imagesDir -Filter "*.png"

foreach ($file in $files) {
    $srcPath = $file.FullName
    Write-Host "Processing $($file.Name)..."
    
    $img = [System.Drawing.Image]::FromFile($srcPath)
    $bmp = New-Object System.Drawing.Bitmap($img)
    $img.Dispose() # Release file lock early

    $changed = $false
    for ($y = 0; $y -lt $bmp.Height; $y++) {
        for ($x = 0; $x -lt $bmp.Width; $x++) {
            $color = $bmp.GetPixel($x, $y)
            # Threshold for white background removal
            if ($color.R -ge 250 -and $color.G -ge 250 -and $color.B -ge 250 -and $color.A -gt 0) {
                # Set to fully transparent
                $bmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 255, 255, 255))
                $changed = $true
            }
        }
    }

    if ($changed) {
        $bmp.Save($srcPath, [System.Drawing.Imaging.ImageFormat]::Png)
    }
    $bmp.Dispose()
}

Write-Output "Done! All cat images are now transparent."
