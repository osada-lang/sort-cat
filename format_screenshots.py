from PIL import Image
import os

# 設定
input_dir = '/Users/kentosada/dev/sort-cat/store_assets/ios'
output_dir = os.path.join(input_dir, 'formatted')
# 6.5インチ要求サイズ
target_width = 1242
target_height = 2688

os.makedirs(output_dir, exist_ok=True)

for filename in os.listdir(input_dir):
    if filename.endswith('.png') and 'Simulator' in filename:
        path = os.path.join(input_dir, filename)
        img = Image.open(path)
        
        # 1. アスペクト比を維持してリサイズ（横幅を合わせる）
        ratio = target_width / img.width
        new_height = int(img.height * ratio)
        img_resized = img.resize((target_width, new_height), Image.Resampling.LANCZOS)
        
        # 2. ターゲットサイズ(1242x2688)に合わせてトリミング
        # 上下の中央を切り出す
        if new_height > target_height:
            top = (new_height - target_height) // 2
            img_final = img_resized.crop((0, top, target_width, top + target_height))
        else:
            # 高さが足りない場合は背景を埋める（通常はシミュレーター画像なら高さが余るはず）
            img_final = Image.new('RGB', (target_width, target_height), (252, 228, 236))
            img_final.paste(img_resized, (0, 0))
            
        output_path = os.path.join(output_dir, filename)
        img_final.save(output_path, "PNG")
        print(f"Formatted: {filename} -> {target_width}x{target_height}")
