$csharpCode = @"
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Collections.Generic;
using System.IO;

public class TowerProcessor {
    public static void MakeTransparentBFS(string path, int threshold) {
        if (!File.Exists(path)) return;
        Bitmap original = null;
        Bitmap bmp = null;
        try {
            original = new Bitmap(path);
            bmp = new Bitmap(original.Width, original.Height, PixelFormat.Format32bppArgb);
            using (Graphics g = Graphics.FromImage(bmp)) {
                g.DrawImage(original, 0, 0);
            }
            original.Dispose();
            original = null;

            int w = bmp.Width;
            int h = bmp.Height;
            bool[] visited = new bool[w * h];
            Queue<int> q = new Queue<int>();

            // Add all edges to the queue
            for (int x = 0; x < w; x++) {
                int[] edges = { 0, h - 1 };
                foreach (int y in edges) {
                    int idx = y * w + x;
                    if (!visited[idx]) { q.Enqueue(idx); visited[idx] = true; }
                }
            }
            for (int y = 0; y < h; y++) {
                int[] edges = { 0, w - 1 };
                foreach (int x in edges) {
                    int idx = y * w + x;
                    if (!visited[idx]) { q.Enqueue(idx); visited[idx] = true; }
                }
            }

            bool changed = false;
            while (q.Count > 0) {
                int idx = q.Dequeue();
                int curX = idx % w;
                int curY = idx / w;
                
                Color c = bmp.GetPixel(curX, curY);

                // Near-white or already transparent
                if (c.A == 0 || (c.R >= threshold && c.G >= threshold && c.B >= threshold)) {
                    if (c.A != 0) {
                        bmp.SetPixel(curX, curY, Color.FromArgb(0, 255, 255, 255));
                        changed = true;
                    }

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
            if (original != null) original.Dispose();
            if (bmp != null) bmp.Dispose();
        }
    }
}
"@

Add-Type -TypeDefinition $csharpCode -ReferencedAssemblies "System.Drawing"

$filePath = "C:\Users\user\dev\sort_cat\www\assets\images\cat_tower_v4.png"
Write-Host "Processing $filePath with BFS Transparency (Threshold 245)..."
[TowerProcessor]::MakeTransparentBFS($filePath, 245)
Write-Host "Done."
