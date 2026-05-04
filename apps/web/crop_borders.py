import os
import sys
from PIL import Image, ImageChops

def trim_borders(image_path):
    print(f"Processing {image_path}...")
    try:
        img = Image.open(image_path).convert("RGB")
        
        # We need to find the bounding box of the non-border content.
        # Since the border is likely pure black or near-black, we create a background 
        # image of the top-left corner color and find the difference.
        corner_color = img.getpixel((0, 0))
        bg = Image.new(img.mode, img.size, corner_color)
        diff = ImageChops.difference(img, bg)
        # Add a little tolerance for JPEG artifacts if any
        diff = ImageChops.add(diff, diff, 2.0, -100)
        
        bbox = diff.getbbox()
        if bbox:
            print(f"Original size: {img.size}, Bounding box: {bbox}")
            # Ensure we are not cropping almost nothing
            if bbox[0] > 10 or bbox[1] > 10 or bbox[2] < img.size[0] - 10 or bbox[3] < img.size[1] - 10:
                cropped = img.crop(bbox)
                cropped.save(image_path)
                print(f"Successfully cropped and saved {image_path}. New size: {cropped.size}")
            else:
                print(f"Borders are too small to crop ({bbox}). Skipping.")
        else:
            print("Could not find a valid bounding box. Maybe the image is entirely one color?")
            
    except Exception as e:
        print(f"Error processing {image_path}: {e}")

if __name__ == "__main__":
    base_dir = r"d:\JavaCode\Lovemaster\springai-front-react\src\assets\illustrations"
    img1 = os.path.join(base_dir, "bg-home.png")
    img2 = os.path.join(base_dir, "bg-chat.png")
    
    trim_borders(img1)
    trim_borders(img2)
