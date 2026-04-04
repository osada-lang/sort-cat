$csharpCode = @"
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Collections.Generic;
using System.IO;

public class ImageProcessor {
    public static void MakeBackgroundTransparent(string path, int threshold) {
        if (!File.Exists(path)) return;
        
        Bitmap bmp = null;
        try {
            bmp = new Bitmap(path);
            int w = bmp.Width;
            int h = bmp.Height;
            bool[] visited = new bool[w * h];
            Queue<int> q = new Queue<int>();

            // Add all edges to the queue to start BFS from the background
            for (int x = 0; x < w; x++) {
                int topIdx = 0 * w + x;
                int botIdx = (h - 1) * w + x;
                if (!visited[topIdx]) { q.Enqueue(topIdx); visited[topIdx] = true; }
                if (!visited[botIdx]) { q.Enqueue(botIdx); visited[botIdx] = true; }
            }
            for (int y = 1; y < h - 1; y++) {
                int leftIdx = y * w + 0;
                int rightIdx = y * w + (w - 1);
                if (!visited[leftIdx]) { q.Enqueue(leftIdx); visited[leftIdx] = true; }
                if (!visited[rightIdx]) { q.Enqueue(rightIdx); visited[rightIdx] = true; }
            }

            bool changed = false;
            while (q.Count > 0) {
                int idx = q.Dequeue();
                int curX = idx % w;
                int curY = idx / w;
                
                Color c = bmp.GetPixel(curX, curY);

                // BFS propagation: Already transparent OR nearly white background
                if (c.A == 0 || (c.R >= threshold && c.G >= threshold && c.B >= threshold)) {
                    if (c.A != 0) {
                        bmp.SetPixel(curX, curY, Color.FromArgb(0, 255, 255, 255));
                        changed = true;
                    }

                    // 4-connectivity neighbors
                    int[] dx = {1, -1, 0, 0};
                    int[] dy = {0, 0, 1, -1};
                    for (int i = 0; i < 4; i++) {
                        int nx = curX + dx[i];
                        int ny = curY + dy[i];
                        if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                            int nidx = ny * w + nx;
                            if (!visited[nidx]) {
                                visited[nidx] = true;
                                q.Enqueue(nidx);
                            }
                        }
                    }
                }
            }
            
            if (changed) {
                string tempPath = path + ".tmp.png";
                bmp.Save(tempPath, ImageFormat.Png);
                bmp.Dispose();
                bmp = null;
                File.Delete(path);
                File.Move(tempPath, path);
            }
        } finally {
            if (bmp != null) bmp.Dispose();
        }
    }
}
"@

# Re-compile the C# code
Add-Type -TypeDefinition $csharpCode -ReferencedAssemblies "System.Drawing"

$imagesDir = "C:\Users\user\dev\sort_cat\www\assets\images"

# Target specifically the problematic cats with a LOWER threshold
$targets = @("cat_tabby.png", "cat_calico.png", "cat_cow.png")
$threshold = 180

foreach ($target in $targets) {
    $filePath = Join-Path $imagesDir $target
    Write-Host "Re-processing $($target) with aggressive threshold ($threshold)..."
    try {
        [ImageProcessor]::MakeBackgroundTransparent($filePath, $threshold)
        Write-Host "  Done."
    } catch {
        Write-Host "  Error: $($_.Exception.Message)"
    }
}

Write-Output "Final focused transparency processing finished. White cat was excluded as requested."
