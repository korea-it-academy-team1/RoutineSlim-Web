$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
function Fail($message) { Write-Host "`n[오류] $message" -ForegroundColor Red; exit 1 }
function Exists($cmd) { return [bool](Get-Command $cmd -ErrorAction SilentlyContinue) }
if (-not (Exists 'java.exe')) { Fail 'Java 17 이상을 설치하고 JAVA_HOME/PATH를 설정하세요.' }
if (-not (Exists 'npm.cmd')) { Fail 'Node.js LTS를 설치한 후 다시 실행하세요: https://nodejs.org/' }
try {
  $versionText = (& java.exe -version 2>&1 | Out-String)
  if ($versionText -match 'version "(?:1\.)?(\d+)') {
    if ([int]$Matches[1] -lt 17) { Fail 'Java 17 이상이 필요합니다.' }
  }
} catch { Fail "Java 버전 확인 실패: $_" }
$mvn = $null
if (Exists 'mvn.cmd') { $mvn = (Get-Command mvn.cmd).Source }
else {
  $version = '3.9.11'
  $mavenDir = Join-Path $root ".tools\apache-maven-$version"
  $mvn = Join-Path $mavenDir 'bin\mvn.cmd'
  if (-not (Test-Path $mvn)) {
    Write-Host '[1/3] Maven 자동 설치 중 (첫 실행만)...'
    $toolsDir = Join-Path $root '.tools'
    New-Item -ItemType Directory -Force -Path $toolsDir | Out-Null
    $zip = Join-Path $toolsDir "apache-maven-$version-bin.zip"
    $url = "https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/$version/apache-maven-$version-bin.zip"
    try { Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing; Expand-Archive -LiteralPath $zip -DestinationPath $toolsDir -Force; Remove-Item $zip -Force }
    catch { Fail "Maven 다운로드 실패. 인터넷 연결을 확인하세요. $_" }
  }
}
Write-Host '[2/3] React 패키지 확인 중...'
if (-not (Test-Path (Join-Path $root 'frontend\node_modules\vite'))) {
  Push-Location (Join-Path $root 'frontend')
  try { & npm.cmd install; if ($LASTEXITCODE -ne 0) { Fail 'npm install 실패' } }
  finally { Pop-Location }
}
function PortReady($port) {
  try { $client = [System.Net.Sockets.TcpClient]::new(); $result = $client.BeginConnect('127.0.0.1', $port, $null, $null); $ok = $result.AsyncWaitHandle.WaitOne(300); $client.Close(); return $ok } catch { return $false }
}
if (-not (PortReady 8080)) {
  Write-Host '[3/3] Spring Boot 시작 중...'
  $backendCommand = 'cd /d "' + (Join-Path $root 'backend') + '" && "' + $mvn + '" spring-boot:run'
  Start-Process -FilePath 'cmd.exe' -ArgumentList @('/k', $backendCommand) -WorkingDirectory (Join-Path $root 'backend') | Out-Null
} else { Write-Host '8080 포트가 이미 사용 중입니다. 기존 백엔드가 실행 중이라고 가정합니다.' }
if (-not (PortReady 5173)) {
  $frontendCommand = 'cd /d "' + (Join-Path $root 'frontend') + '" && npm.cmd run dev'
  Start-Process -FilePath 'cmd.exe' -ArgumentList @('/k', $frontendCommand) -WorkingDirectory (Join-Path $root 'frontend') | Out-Null
} else { Write-Host '5173 포트가 이미 사용 중입니다. 기존 프론트엔드가 실행 중이라고 가정합니다.' }
Write-Host '서버 준비를 기다리는 중 (최대 120초)...'
$ready = $false
for ($i = 0; $i -lt 60; $i++) {
  if ((PortReady 8080) -and (PortReady 5173)) { $ready = $true; break }
  Start-Sleep -Seconds 2
}
if (-not $ready) { Write-Host '서버 시작이 지연됩니다. 열린 서버 창에서 오류를 확인하세요.' -ForegroundColor Yellow }
Start-Process 'http://localhost:5173/'
Write-Host "`n웹사이트: http://localhost:5173/"
Write-Host '백엔드/프론트엔드 창을 닫으면 해당 서버가 종료됩니다.'
