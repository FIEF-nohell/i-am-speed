$ErrorActionPreference = 'Stop'
$OutputEncoding = [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
& python -X utf8 (Join-Path $PSScriptRoot 'bootstrap-runtime.py') verify
exit $LASTEXITCODE
