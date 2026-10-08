$ErrorActionPreference = 'Stop'
$OutputEncoding = [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$hookInput = [Console]::In.ReadToEnd()
$hookInput | & python -X utf8 (Join-Path $PSScriptRoot 'bootstrap-runtime.py') context
exit $LASTEXITCODE
