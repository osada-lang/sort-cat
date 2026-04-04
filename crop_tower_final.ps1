$csharpCode = @"
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;

public class ImageCropperFinal {
    public static void CropAndTransparent(string path, int threshold) {
        if (!File.Exists(path)) return;
        Bitmap original = null;
        Bitmap cropped = null;
        try {
            original = new Bitmap(path);
            int w = original.Width;
            int h = original.Height;

            int minX = w, minY = h, maxX = 0, maxY = 0;
            bool found = false;

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

            if (!found) {
                Console.WriteLine("No content found.");
                return;
            }

            minX = Math.Max(0, minX - 5);
            minY = Math.Max(0, minY - 5);
            maxX = Math.Min(w - 1, maxX + 5);
            maxY = Math.Min(h - 1, maxY + 5);

            int newW = maxX - minX + 1;
            int newH = maxY - minY + 1;

            cropped = new Bitmap(newW, newH, PixelFormat.Format32bppArgb);
            using (Graphics g = Graphics.FromImage(cropped)) {
                g.Clear(Color.Transparent);
                g.DrawImage(original, new Rectangle(0, 0, newW, newH), new Rectangle(minX, minY, newW, newH), GraphicsUnit.Pixel);
            }

            for (int cy = 0; cy < newH; cy++) {
                for (int cx = 0; cx < newW; cx++) {
                    Color cc = cropped.GetPixel(cx, cy);
                    if (cc.R >= threshold && cc.G >= threshold && cc.B >= threshold) {
                        cropped.SetPixel(cx, cy, Color.FromArgb(0, 255, 255, 255));
                    }
                }
            }

            string tempPath = path + ".final_v2.png";
            cropped.Save(tempPath, ImageFormat.Png);
            cropped.Dispose();
            original.Dispose();
            
            if (File.Exists(path)) File.Delete(path);
            File.Move(tempPath, path);
            Console.WriteLine("Successfully cropped to " + newW + "x" + newH);
        } catch (Exception ex) {
            Console.WriteLine(ex.ToString());
        }
    }
}
"@

Add-Type -TypeDefinition $csharpCode -ReferencedAssemblies "System.Drawing"

$filePath = "C:\Users\user\dev\sort_cat\www\assets\images\cat_tower_v4.png"
copy "C:\Users\user\dev\sort_cat\www\assets\images\cat_tower_v3_raw.png" $filePath
[ImageCropperFinal]::CropAndTransparent($filePath, 250)
