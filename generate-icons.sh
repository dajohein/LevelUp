#!/bin/bash

# Generate PWA icons from SVG

ICON_DIR="/workspaces/LevelUp/public/icons"
SVG_FILE="$ICON_DIR/icon.svg"

# Array of required icon sizes
SIZES=(16 32 48 72 96 128 144 152 167 180 192 256 384 512)

echo "Generating PWA icons from $SVG_FILE..."

# Generate PNG files for each size
for size in "${SIZES[@]}"; do
    output_file="$ICON_DIR/icon-${size}x${size}.png"
    echo "Generating ${size}x${size} icon..."
    rsvg-convert -w $size -h $size "$SVG_FILE" -o "$output_file"
    if [ $? -eq 0 ]; then
        echo "✓ Generated: icon-${size}x${size}.png"
    else
        echo "✗ Failed to generate: icon-${size}x${size}.png"
    fi
done

# Create favicon.ico (16x16 and 32x32)
echo "Creating favicon.ico..."
if command -v convert >/dev/null 2>&1; then
    convert "$ICON_DIR/icon-16x16.png" "$ICON_DIR/icon-32x32.png" "$ICON_DIR/favicon.ico"
    echo "✓ Generated: favicon.ico"
else
    echo "⚠ ImageMagick not found, skipping favicon.ico generation"
fi

echo "PWA icon generation complete!"
echo "Generated icons:"
ls -la "$ICON_DIR"/*.png 2>/dev/null | wc -l | xargs echo "PNG files:"