import re
path = r"C:\Projects\Speechify-clone-anuj\Hawking\frontend\src\pages\Landing.tsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Remove duplicate imports
content = re.sub(r'(import AsciiBackground from \'../components/AsciiBackground\';\n)+', r'import AsciiBackground from \'../components/AsciiBackground\';\n', content)

# Fix literal `r`n
content = content.replace("`r`n", "")
content = content.replace("`n", "")

# Ensure AsciiBackground is correctly placed in the main element
content = re.sub(r'<main className="max-w-7xl mx-auto px-8 pt-20 relative">\s*<AsciiBackground />', r'<main className="max-w-7xl mx-auto px-8 pt-20 relative">\n        <AsciiBackground />', content)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
