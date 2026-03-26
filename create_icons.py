from PIL import Image, ImageDraw

def create_icon(size, filename):
    img = Image.new('RGB', (size, size), color = '#3498db')
    d = ImageDraw.Draw(img)
    # Draw a simple white square as a mock icon
    padding = size // 4
    d.rectangle([padding, padding, size - padding, size - padding], fill="white")
    img.save(filename)

create_icon(192, 'icon192.png')
create_icon(512, 'icon512.png')
