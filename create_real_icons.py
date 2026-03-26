from PIL import Image

def generate_icons(source_image_path):
    try:
        img = Image.open(source_image_path)
    except FileNotFoundError:
        print(f"Error: Source image '{source_image_path}' not found.")
        return

    # The screenshot is likely 16:9 or similar (e.g., 1280x720)
    width, height = img.size

    # We want a square crop, ideally centered around the main gameplay elements
    # (the bottles in the middle)
    min_dim = min(width, height)

    # Calculate box for a centered square crop
    left = (width - min_dim) / 2
    top = (height - min_dim) / 2
    right = (width + min_dim) / 2
    bottom = (height + min_dim) / 2

    # If the image is very wide, maybe we just crop the center box.
    # We can also shrink the square slightly if we want just the inner UI container.
    # For a simple icon, let's take a square from the center covering most of the vertical height.
    # Let's crop to 80% of the minimum dimension to focus more on the center content
    crop_size = int(min_dim * 0.8)
    left_crop = (width - crop_size) / 2
    top_crop = (height - crop_size) / 2
    right_crop = (width + crop_size) / 2
    bottom_crop = (height + crop_size) / 2

    cropped_img = img.crop((left_crop, top_crop, right_crop, bottom_crop))

    # Resize to 192x192 and 512x512
    icon192 = cropped_img.resize((192, 192), Image.Resampling.LANCZOS)
    icon192.save('icon192.png')
    print("Generated icon192.png")

    icon512 = cropped_img.resize((512, 512), Image.Resampling.LANCZOS)
    icon512.save('icon512.png')
    print("Generated icon512.png")

if __name__ == "__main__":
    generate_icons("screenshot.png")
