Add-Type -AssemblyName System.Drawing
$imagesDir = "C:\Users\user\dev\sort_cat\www\assets\images"
$files = Get-ChildItem -Path $imagesDir -Filter "*.png"

# Threshold for "paper/texture white" background
$threshold = 210

foreach ($file in $files) {
    $srcPath = $file.FullName
    Write-Host "Processing $($file.Name) with Robust BFS..."
    
    $img = [System.Drawing.Image]::FromFile($srcPath)
    $bmp = New-Object System.Drawing.Bitmap($img)
    $img.Dispose()

    $w = $bmp.Width
    $h = $bmp.Height
    $visited = New-Object 'System.Collections.BitArray' ($w * $h)
    
    # Store indices to process
    $queue = New-Object 'System.Collections.Generic.Queue[int]'

    # Add all edge pixels to queue
    for ($x = 0; $x -lt $w; $x++) {
        $idxTop = 0 * $w + $x
        $idxBottom = ($h - 1) * $w + $x
        if (-not $visited[$idxTop]) { $visited[$idxTop] = $true; $queue.Enqueue($idxTop) }
        if (-not $visited[$idxBottom]) { $visited[$idxBottom] = $true; $queue.Enqueue($idxBottom) }
    }
    for ($y = 1; $y -lt ($h - 1); $y++) {
        $idxLeft = $y * $w + 0
        $idxRight = $y * $w + ($w - 1)
        if (-not $visited[$idxLeft]) { $visited[$idxLeft] = $true; $queue.Enqueue($idxLeft) }
        if (-not $visited[$idxRight]) { $visited[$idxRight] = $true; $queue.Enqueue($idxRight) }
    }

    $changed = $false
    while ($queue.Count -gt 0) {
        $idx = $queue.Dequeue()
        $x = $idx % $w
        $y = [Math]::Floor($idx / $w)

        $color = $bmp.GetPixel($x, $y)

        # Logic: If it's already transparent OR nearly white background
        if ($color.A -eq 0 -or ($color.R -ge $threshold -and $color.G -ge $threshold -and $color.B -ge $threshold)) {
            
            if ($color.A -gt 0) {
                # Make it transparent
                $bmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 255, 255, 255))
                $changed = $true
            }

            # Check neighbors
            $neighbors = @(
                @($x + 1, $y), @($x - 1, $y), @($x, $y + 1), @($x, $y - 1)
            )

            foreach ($n in $neighbors) {
                $nx = $n[0]
                $ny = $n[1]
                if ($nx -ge 0 -and $nx -lt $w -and $ny -ge 0 -and $ny -lt $h) {
                    $nidx = $ny * $w + $nx
                    if (-not $visited[$nidx]) {
                        $visited[$nidx] = $true
                        $queue.Enqueue($nidx)
                    }
                }
            }
        }
    }

    if ($changed) {
        $bmp.Save($srcPath, [System.Drawing.Imaging.ImageFormat]::Png)
        Write-Host "  Done."
    } else {
        Write-Host "  No new transparency."
    }
    $bmp.Dispose()
}

Write-Output "Done! Robust BFS processing finished."
