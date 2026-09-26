$dashboardPath = "C:\Projects\Speechify-clone-anuj\Hawking\frontend\src\pages\Dashboard.tsx"
$dashboardContent = Get-Content $dashboardPath -Raw
$dashboardContent = $dashboardContent -replace "import \{ FaGoogleDrive, FaDropbox, FaMicrosoft \} from 'react-icons/fa';`r?`n", ""
$dashboardContent = $dashboardContent -replace "(?m)^\s*\{\s*name:\s*'Upload from (Drive|Dropbox|OneDrive)'.*?\},`r?`n", ""
Set-Content -Path $dashboardPath -Value $dashboardContent

$uploadPath = "C:\Projects\Speechify-clone-anuj\Hawking\frontend\src\pages\DocumentUpload.tsx"
$uploadContent = Get-Content $uploadPath -Raw
$uploadContent = $uploadContent -replace "import \{ FaGoogleDrive, FaDropbox, FaMicrosoft \} from 'react-icons/fa';", ""
$uploadContent = [System.Text.RegularExpressions.Regex]::Replace($uploadContent, "(?s)\s*<div className=`"mt-8 pt-6 border-t border-borderDark flex flex-col items-center`">.*?</div>\s*</div>", "`r`n      </div>")
Set-Content -Path $uploadPath -Value $uploadContent
