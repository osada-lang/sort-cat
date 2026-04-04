$csharpCode = @"
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;

public class TowerProcessor {
    public static void GlobalTransparency(string path, int threshold) {
        if (!File.Exists(path)) return;
        Bitmap bmp = null;
        try {
            bmp = new Bitmap(path);
            int w = bmp.Width;
            int h = bmp.Height;
            bool changed = false;

            for (int y = 0; y < h; y++) {
                for (int x = 0; x < w; x++) {
                    Color c = bmp.GetPixel(x, y);
                    // Match near-white pixels
                    if (c.R >= threshold && c.G >= threshold && c.B >= threshold) {
                        if (c.A != 0) {
                            bmp.SetPixel(x, y, Color.FromArgb(0, 255, 255, 255));
                            changed = true;
                        }
                    }
                }
            }

            if (changed) {
                string tempPath = path + ".tmp.png";
                bmp.Save(tempPath, ImageFormat.Png);
                bmp.Dispose();
                bmp = null;
                if (File.Exists(path)) File.Delete(path);
                File.Move(tempPath, path);
            }
        } finally {
            if (bmp != null) bmp.Dispose();
        }
    }
}
"@

Add-Type -TypeDefinition $csharpCode -ReferencedAssemblies "System.Drawing"

$filePath = "C:\Users\user\dev\sort_cat\www\assets\images\cat_tower.png"
Write-Host "Processing $filePath with global transparency (threshold 230)..."
[TowerProcessor]::GlobalTransparency($filePath, 230)
Write-Host "Done."
