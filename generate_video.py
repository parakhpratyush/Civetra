import os
import glob
from PIL import Image, ImageDraw
import imageio

screenshot_dir = r"D:\Users\PARAKH PRATYUSH\Pictures\Screenshots"
# Get all png files
files = glob.glob(os.path.join(screenshot_dir, "Screenshot *.png"))
# Sort chronologically by modification time
files.sort(key=os.path.getmtime)

# Get the last 30 screenshots (in case there are older ones)
files = files[-30:]

if len(files) != 30:
    print(f"Warning: Found {len(files)} files instead of 30.")

frames = []
for f in files:
    img = Image.open(f).convert("RGB")
    
    # Draw a larger black box over the top-left corner to completely hide the large number
    draw = ImageDraw.Draw(img)
    # 45x45 should comfortably cover the snipping tool text without ruining the image
    draw.rectangle([0, 0, 45, 45], fill="black")
    
    # Scale up and force exact size to prevent ffmpeg errors (1092x732)
    new_size = (1092, 732)
    img = img.resize(new_size, resample=Image.NEAREST)
    
    frames.append(img)

print("Exporting 30 frames for scroll-scrubbing...")
for i, frame in enumerate(frames):
    out_path = os.path.join(r"D:\MY WORK\hackethon\antigravity\civicx-perfect\public\frames", f"frame_{i:02d}.webp")
    frame.save(out_path, "WEBP", quality=90)

print("Scroll sequence successfully generated!")
