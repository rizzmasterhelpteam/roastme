param([ValidateSet('Debug','Release','Bundle')][string]$Variant='Debug')
$ErrorActionPreference='Stop'
$projectRoot=Split-Path -Parent $PSScriptRoot
$bundledJava='C:\Program Files\Android\Android Studio\jbr'
if(Test-Path -LiteralPath "$bundledJava\bin\java.exe"){$env:JAVA_HOME=$bundledJava}
if(-not $env:ANDROID_HOME){$env:ANDROID_HOME=Join-Path $env:LOCALAPPDATA 'Android\Sdk'}
if(-not(Test-Path -LiteralPath $env:ANDROID_HOME)){throw 'Android SDK not found. Set ANDROID_HOME.'}
$gradleTask=switch($Variant){'Debug'{':app:assembleDebug'}'Release'{':app:assembleRelease'}'Bundle'{':app:bundleRelease'}}
Push-Location $projectRoot
try{& '.\android\gradlew.bat' -p android $gradleTask --no-daemon; if($LASTEXITCODE -ne 0){throw "Android $Variant build failed ($LASTEXITCODE)."}}finally{Pop-Location}
