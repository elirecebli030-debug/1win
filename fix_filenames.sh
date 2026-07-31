#!/bin/bash

echo "🔧 Fixing invalid filenames..."
echo "================================"

# Bütün ? işarəsi olan faylları tap
find . -name "*?*" -type f | while read -r file; do
    # Yeni ad (? və sonrasını sil)
    new_file=$(echo "$file" | sed 's/\?.*$//')
    
    # Faylı köçür
    if [ "$file" != "$new_file" ]; then
        echo "📝 Renaming: $file -> $new_file"
        mkdir -p "$(dirname "$new_file")"
        mv "$file" "$new_file"
    fi
done

# HTML fayllarında referansları yenilə
echo "🔄 Updating references in HTML files..."
find . -name "*.html" -type f -exec sed -i 's/web-app-manifest?[^"]*/web-app-manifest.json/g' {} \;

echo "✅ Done!"
