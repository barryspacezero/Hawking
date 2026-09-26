import re

# Clean Dashboard.tsx
dashboard_path = r'C:\Projects\Speechify-clone-anuj\Hawking\frontend\src\pages\Dashboard.tsx'
with open(dashboard_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'import \{ FaGoogleDrive, FaDropbox, FaMicrosoft \} from \'react-icons/fa\';\n', '', content)

cards_pattern = r'^\s*\{\s*name:\s*\'Upload from (Drive|Dropbox|OneDrive)\'.*?\},\n'
content = re.sub(cards_pattern, '', content, flags=re.MULTILINE)

with open(dashboard_path, 'w', encoding='utf-8') as f:
    f.write(content)

# Clean DocumentUpload.tsx
upload_path = r'C:\Projects\Speechify-clone-anuj\Hawking\frontend\src\pages\DocumentUpload.tsx'
with open(upload_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'\nimport \{ FaGoogleDrive, FaDropbox, FaMicrosoft \} from \'react-icons/fa\';', '', content)

cloud_buttons_pattern = r'\s*<div className="mt-8 pt-6 border-t border-borderDark flex flex-col items-center">[\s\S]*?</div>\s*</div>'
content = re.sub(cloud_buttons_pattern, '\n      </div>', content)

with open(upload_path, 'w', encoding='utf-8') as f:
    f.write(content)
