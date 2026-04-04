$csharpCode = @"
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;

public class ImageCropper {
    public static void CropAndTransparent(string path, int threshold) {
        if (!File.Exists(path)) return;
        Bitmap original = null;
        try {
            original = new Bitmap(path);
            int w = original.Width;
            int h = original.Height;

            int minX = w, minY = h, maxX = 0, maxY = 0;
            bool found = false;

            // Find bounding box of non-white pixels
            for (int y = 0; y < h; y++) {
                for (int x = 0; x < w; x++) {
                    Color c = original.GetPixel(x, y);
                    if (c.R < threshold || c.G < threshold || c.B < threshold) {
                        if (x < minX) minX = x;
                        if (x > maxX) maxX = x;
                        if (y < minY) minY = y;
                        if (y > maxY) maxY = y;
                        found = true;
                    }
                }
            }

            if (!found) return;

            // Add some padding
            minX = Math.Max(0, minX - 10);
            minY = Math.Max(0, minY - 10);
            maxX = Math.Min(w - 1, maxX + 10);
            maxY = Math.Min(h - 1, maxY + 10);

            int newW = maxX - minX + 1;
            int newH = maxY - minY + 1;

            Bitmap cropped = new Bitmap(newW, newH, PixelFormat.Format32bppArgb);
            using (Graphics g = Graphics.FromImage(cropped)) {
                g.DrawImage(original, new Rectangle(0, 0, newW, newH), new Rectangle(minX, minY, newW, newH), GraphicsUnit.Pixel);
            }

            // Make background transparent in the cropped image
            for (int y = 0; y < newH; y++) {
                for (int x = 0; x < newW; x++) {
                    Color c = cropped.GetPixel(x, y);
                    if (c.R >= threshold && c.G >= threshold && c.B >= threshold) {
                        cropped.SetPixel(x, y, Color.FromArgb(0, 255, 255, 255));
                    }
                }
            }

            string tempPath = path + ".cropped.png";
            cropped.Save(tempPath, ImageFormat.Png);
            cropped.Dispose();
            original.Dispose();
            original = null;
            File.Delete(path);
            File.Move(tempPath, path);
            
            Console.WriteLine($"Cropped to: {newW}x{newH} (minX:{minX}, minY:{minY})");
        } finally {
            if (original != null) original.Dispose();
        }
    }
}
"@

Add-Type -TypeDefinition $csharpCode -ReferencedAssemblies "System.Drawing"

$filePath = "C:\Users\user\dev\sort_cat\www\assets\images\cat_tower_v4.png"
Write-Host "Cropping and making $filePath transparent (threshold 245)..."
[ImageCropper]::CropAndTransparent($filePath, 245)
Write-Host "Done."
