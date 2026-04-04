$csharpCode = @"
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;

public class TowerProcessor {
    public static void GlobalTransparency(string path, int threshold) {
        if (!File.Exists(path)) return;
        Bitmap original = null;
        Bitmap bmp = null;
        try {
            original = new Bitmap(path);
            // Create a new bitmap with alpha channel support
            bmp = new Bitmap(original.Width, original.Height, PixelFormat.Format32bppArgb);
            using (Graphics g = Graphics.FromImage(bmp)) {
                g.DrawImage(original, 0, 0);
            }
            original.Dispose();
            original = null;

            int w = bmp.Width;
            int h = bmp.Height;
            bool changed = false;

            for (int y = 0; y < h; y++) {
                for (int x = 0; x < w; x++) {
                    Color c = bmp.GetPixel(x, y);
                    // Match near-white pixels (where all components R, G, B are high)
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
            if (original != null) original.Dispose();
            if (bmp != null) bmp.Dispose();
        }
    }
}
"@

Add-Type -TypeDefinition $csharpCode -ReferencedAssemblies "System.Drawing"

$filePath = "C:\Users\user\dev\sort_cat\www\assets\images\cat_tower.png"
Write-Host "Re-processing $filePath with GlobalTransparency (Format32bppArgb, Threshold 230)..."
[TowerProcessor]::GlobalTransparency($filePath, 230)
Write-Host "Done."
