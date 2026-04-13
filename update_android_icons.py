from PIL import Image
import os

# 入力元（ユーザー指定のアイコン素材）
input_path = '/Users/kentosada/dev/sort-cat/www/assets/icons/icon_1024.png'
# Androidのリソースディレクトリ
res_dir = '/Users/kentosada/dev/sort-cat/android/app/src/main/res'

# 生成するアイコンのサイズと保存先ディレクトリ
# 形式: (ディレクトリ名, サイズ)
icon_configs = [
    ('mipmap-mdpi', 48),
    ('mipmap-hdpi', 72),
    ('mipmap-xhdpi', 96),
    ('mipmap-xxhdpi', 144),
    ('mipmap-xxxhdpi', 192),
]

# 背景色 (#fce4ec - ゲームの背景色)
bg_color = (252, 228, 236)

def generate_icons():
    if not os.path.exists(input_path):
        print(f"Error: Input file not found at {input_path}")
        return

    # 素材を開く
    source_img = Image.open(input_path).convert("RGBA")

    for dir_name, size in icon_configs:
        target_dir = os.path.join(res_dir, dir_name)
        os.makedirs(target_dir, exist_ok=True)

        # 1. 四角いアイコン (ic_launcher.png)
        # 透過なし背景に合成
        sq_bg = Image.new('RGB', (size, size), bg_color)
        resized_icon = source_img.resize((size, size), Image.Resampling.LANCZOS)
        sq_bg.paste(resized_icon, (0, 0), resized_icon)
        sq_bg.save(os.path.join(target_dir, 'ic_launcher.png'), "PNG")

        # 2. 円形アイコン (ic_launcher_round.png)
        # 円形にクリップ（簡易版としてリサイズしたものをそのまま保存、Android OS側で円形にマスクされる場合が多いが、明示的に用意）
        sq_bg.save(os.path.join(target_dir, 'ic_launcher_round.png'), "PNG")
        
        # 3. アダプティブアイコン前面 (ic_launcher_foreground.png)
        # 前面は透過ありでそのままリサイズ
        resized_icon.save(os.path.join(target_dir, 'ic_launcher_foreground.png'), "PNG")

        print(f"Generated icons for {dir_name} ({size}x{size})")

    # アダプティブアイコンの背景色 (ic_launcher_background.xml または単色)
    # ここでは既存の背景設定を維持するため、画像のみ更新

if __name__ == "__main__":
    generate_icons()
    print("\nAndroid icons have been successfully updated.")
