#!/usr/bin/env python3
"""
Analyze Figma screenshots to understand the design
"""
from PIL import Image
import os

screenshots_dir = "docs/figma-screenshots"

print("=" * 80)
print("FIGMA SCREENSHOTS ANALYSIS")
print("=" * 80)

for filename in sorted(os.listdir(screenshots_dir)):
    if filename.endswith('.png'):
        filepath = os.path.join(screenshots_dir, filename)
        img = Image.open(filepath)
        
        print(f"\n📄 {filename}")
        print(f"   Size: {img.width}x{img.height}px")
        print(f"   Aspect: {img.width/img.height:.2f}")
        
        # Get dominant colors (simplified)
        img_small = img.resize((100, 100))
        pixels = list(img_small.getdata())
        
        # Count colors
        from collections import Counter
        color_counts = Counter(pixels)
        top_colors = color_counts.most_common(5)
        
        print(f"   Top colors:")
        for color, count in top_colors:
            if len(color) == 3:  # RGB
                print(f"      RGB{color} - {count} pixels")
            elif len(color) == 4:  # RGBA
                print(f"      RGBA{color} - {count} pixels")

print("\n" + "=" * 80)
print("Analysis complete. Now opening images for visual inspection...")
print("=" * 80)
