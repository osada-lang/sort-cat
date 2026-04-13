from PIL import Image
import os

# パス
input_path = '/Users/kentosada/dev/sort-cat/www/assets/icons/icon_1024.png'
output_dir = '/Users/kentosada/dev/sort-cat/store_assets/ios'
output_path = os.path.join(output_dir, 'AppIcon.png')

# 背景色 (#fce4ec)
bg_color = (252, 228, 236)

# 出力ディレクトリ作成
os.makedirs(output_dir, exist_ok=True)

# 画像読み込み
img = Image.open(input_path).convert("RGBA")

# 1024x1024 にリサイズ（背景との比率を保つため）
# オリジナル画像をリサイズし、背景の中央に配置
img = img.resize((1024, 1024), Image.Resampling.LANCZOS)

# 背景画像作成 (1024x1024, RGB)
# iOSアイコンは透過不可なので RGB で作成
background = Image.new('RGB', (1024, 1024), bg_color)

# 背景の上に画像を合成
# img は RGBA なので alpha チャンネルをマスクとして使用
background.paste(img, (0, 0), img)

# 保存
background.save(output_path, "PNG")
print(f"AppIcon created at: {output_path}")
