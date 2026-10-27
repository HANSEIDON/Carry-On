import os
from PIL import Image, ImageFilter, ImageDraw

def round_corners(image, radius=48):
    mask = Image.new('L', image.size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle([(0, 0), image.size], radius=radius, fill=255)
    
    output = image.copy()
    if output.mode != 'RGBA':
        output = output.convert('RGBA')
    output.putalpha(mask)
    return output

def create_shadow(image, radius=48, offset=(0, 32), shadow_color=(0, 0, 0, 150)):
    pad = radius * 2
    w, h = image.size
    shadow_img = Image.new("RGBA", (w + pad * 2, h + pad * 2), (0, 0, 0, 0))
    
    mask = image.split()[3]
    silhouette = Image.new("RGBA", image.size, shadow_color)
    shadow_img.paste(silhouette, (pad + offset[0], pad + offset[1]), mask)
    
    shadow_img = shadow_img.filter(ImageFilter.GaussianBlur(radius))
    return shadow_img, pad

def make_composite(left_name, center_name, right_name, output_name):
    canvas_w = 2200
    canvas_h = 1280
    canvas = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    
    # Load images
    left_im = Image.open(f"assets/{left_name}").convert("RGBA")
    center_im = Image.open(f"assets/{center_name}").convert("RGBA")
    right_im = Image.open(f"assets/{right_name}").convert("RGBA")
    
    # Center phone: height 1120px (2x Retina)
    center_h = 1120
    center_w = int(center_im.width * (center_h / center_im.height))
    center_resized = center_im.resize((center_w, center_h), Image.Resampling.LANCZOS)
    center_rounded = round_corners(center_resized, radius=44)
    
    # Side phones: height 1020px
    side_h = 1020
    side_w = int(left_im.width * (side_h / left_im.height))
    left_resized = left_im.resize((side_w, side_h), Image.Resampling.LANCZOS)
    left_rounded = round_corners(left_resized, radius=40)
    
    right_resized = right_im.resize((side_w, side_h), Image.Resampling.LANCZOS)
    right_rounded = round_corners(right_resized, radius=40)
    
    # Center position
    center_x = (canvas_w - center_w) // 2
    center_y = (canvas_h - center_h) // 2 - 20
    
    # Spread side phones gracefully with elegant overlap (90px)
    left_x = center_x - side_w + 90
    left_y = center_y + (center_h - side_h) - 20
    
    right_x = center_x + center_w - 90
    right_y = left_y
    
    # Shadows for side phones
    side_shadow, side_pad = create_shadow(left_rounded, radius=40, offset=(0, 24), shadow_color=(0, 0, 0, 110))
    canvas.paste(side_shadow, (left_x - side_pad, left_y - side_pad), side_shadow)
    canvas.paste(side_shadow, (right_x - side_pad, right_y - side_pad), side_shadow)
    
    # Paste side phones
    canvas.paste(left_rounded, (left_x, left_y), left_rounded)
    canvas.paste(right_rounded, (right_x, right_y), right_rounded)
    
    # Center phone shadow (stronger, layered on top of side phones)
    center_shadow, center_pad = create_shadow(center_rounded, radius=56, offset=(0, 36), shadow_color=(0, 0, 0, 170))
    canvas.paste(center_shadow, (center_x - center_pad, center_y - center_pad), center_shadow)
    
    # Paste center phone
    canvas.paste(center_rounded, (center_x, center_y), center_rounded)
    
    # Crop canvas tightly
    bbox = canvas.getbbox()
    if bbox:
        left = max(0, bbox[0] - 20)
        top = max(0, bbox[1] - 20)
        right = min(canvas.width, bbox[2] + 20)
        bottom = min(canvas.height, bbox[3] + 20)
        canvas = canvas.crop((left, top, right, bottom))

    canvas.save(output_name, "PNG", optimize=True)
    print(f"Generated Retina 2x {output_name} ({canvas.size[0]}x{canvas.size[1]})")

if __name__ == "__main__":
    make_composite("mobile-03-seatmap.png", "mobile-01-home.png", "mobile-04-boarding.png", "assets/hero-banner-suit.png")
