
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms

$iconSize = 1024
$targetFile = "c:\Users\user\dev\sort_cat\www\assets\icons\icon_1024.png"
$towerPath = "c:\Users\user\dev\sort_cat\www\assets\images\cat_tower_v102.png"
$whiteCatPath = "c:\Users\user\dev\sort_cat\www\assets\images\cat_white_tight_v11_8.png"
$gingerCatPath = "c:\Users\user\dev\sort_cat\www\assets\images\cat_ginger_tight_v11.png"

# 1. Start with a blank canvas
$bmp = New-Object System.Drawing.Bitmap($iconSize, $iconSize)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

# 2. Draw Sky-Blue Radial Gradient
$rect = New-Object System.Drawing.Rectangle(0, 0, $iconSize, $iconSize)
$path = New-Object System.Drawing.Drawing2D.GraphicsPath
$path.AddEllipse($rect)
$pgb = New-Object System.Drawing.Drawing2D.PathGradientBrush($path)
$pgb.CenterPoint = New-Object System.Drawing.PointF([float]($iconSize/2), [float]($iconSize/2))
$pgb.CenterColor = [System.Drawing.Color]::FromArgb(255, 129, 212, 250)
$pgb.SurroundColors = @([System.Drawing.Color]::FromArgb(255, 41, 182, 246))
$g.FillRectangle($pgb, $rect)

# 3. Process Tower (3 sections)
$origTower = [System.Drawing.Image]::FromFile($towerPath)
$towerScale = [float]3.5
$towerWidth = [float](267 * $towerScale)
$towerX = [float](($iconSize - $towerWidth) / 2)

function New-TowerSection {
    param([int]$yStart, [int]$yEnd, [float]$targetTop)
    $srcRect = New-Object System.Drawing.Rectangle(0, $yStart, 267, ($yEnd - $yStart))
    $destRect = New-Object System.Drawing.RectangleF($towerX, $targetTop, $towerWidth, [float](($yEnd - $yStart) * $towerScale))
    $script:g.DrawImage($script:origTower, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
}

$currentY = [float]150
New-TowerSection 0 227 $currentY # Bed
$middleSlotTop = $currentY + (190 * $towerScale)
New-TowerSection 456 682 $middleSlotTop # Mid Slot
$baseSlotTop = $middleSlotTop + (212 * $towerScale)
New-TowerSection 683 910 $baseSlotTop # Base Slot

# 4. Draw Cats
$whiteCat = [System.Drawing.Image]::FromFile($whiteCatPath)
$gingerCat = [System.Drawing.Image]::FromFile($gingerCatPath)
$catScale = [float](0.5 * $towerScale)

# White Cat in Base
$wcX = [float]($towerX + (55 * $towerScale))
$wcY = [float]($baseSlotTop + (100 * $towerScale))
$wcRect = New-Object System.Drawing.RectangleF($wcX, $wcY, [float]($whiteCat.Width * $catScale), [float]($whiteCat.Height * $catScale))
$g.DrawImage($whiteCat, $wcRect)

# Ginger Cat in Mid
$gcX = [float]($towerX + (55 * $towerScale))
$gcY = [float]($middleSlotTop + (85 * $towerScale))
$gcRect = New-Object System.Drawing.RectangleF($gcX, $gcY, [float]($gingerCat.Width * $catScale), [float]($gingerCat.Height * $catScale))
$g.DrawImage($gingerCat, $gcRect)

# Smile
$smilePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 93, 64, 55), 6)
$smileX = [float]($gcX + ($gcRect.Width * 0.28))
$smileY = [float]($gcY + ($gcRect.Height * 0.45))
$g.DrawArc($smilePen, $smileX, $smileY, [float]35, [float]25, [float]0, [float]180)

# 5. Puzzle Pieces
function New-Puzzle {
    param([float]$x, [float]$y, $brush, [float]$angle)
    $script:g.TranslateTransform($x, $y)
    $script:g.RotateTransform($angle)
    $script:g.FillRectangle($brush, -25, -6, 50, 12)
    $script:g.FillRectangle($brush, -6, -25, 12, 50)
    $script:g.ResetTransform()
}

$brushCyan = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(180, 0, 229, 255))
$brushPink = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(180, 255, 64, 129))
$brushYellow = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(180, 255, 235, 59))

New-Puzzle 200 250 $brushCyan 15
New-Puzzle 850 350 $brushPink -20
New-Puzzle 180 800 $brushYellow 45
New-Puzzle 820 850 $brushCyan 10

# 6. Clip Corner
$radius = [float]180
$cpath = New-Object System.Drawing.Drawing2D.GraphicsPath
$cpath.AddArc(0, 0, $radius*2, $radius*2, 180, 90)
$cpath.AddArc($iconSize-$radius*2, 0, $radius*2, $radius*2, 270, 90)
$cpath.AddArc($iconSize-$radius*2, $iconSize-$radius*2, $radius*2, $radius*2, 0, 90)
$cpath.AddArc(0, $iconSize-$radius*2, $radius*2, $radius*2, 90, 90)
$cpath.CloseAllFigures()

$finalBmp = New-Object System.Drawing.Bitmap($iconSize, $iconSize)
$finalG = [System.Drawing.Graphics]::FromImage($finalBmp)
$finalG.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$finalG.SetClip($cpath)
$finalG.DrawImage($bmp, 0, 0)

# 7. Save
if (!(Test-Path "c:\Users\user\dev\sort_cat\www\assets\icons")) { New-Item -ItemType Directory "c:\Users\user\dev\sort_cat\www\assets\icons" }
$finalBmp.Save($targetFile, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "Re-composited Icon saved: $targetFile"
