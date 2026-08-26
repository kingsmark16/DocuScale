param(
  [string]$Url = 'http://localhost:8080/health',
  [int]$Requests = 100,
  [int]$Concurrency = 10
)

if ($Requests -lt 1) {
  throw 'Requests must be at least 1.'
}

if ($Concurrency -lt 1) {
  throw 'Concurrency must be at least 1.'
}

$targetUrl = $Url
$startedAt = Get-Date
$requestJob = {
  param([string]$RequestUrl)

  try {
    $response = Invoke-WebRequest -Uri $RequestUrl -UseBasicParsing -TimeoutSec 10

    [pscustomobject]@{
      Success = $true
      Status  = [int]$response.StatusCode
      Error   = $null
    }
  } catch {
    [pscustomobject]@{
      Success = $false
      Status  = 0
      Error   = $_.Exception.Message
    }
  }
}

$results = @(
  for ($offset = 0; $offset -lt $Requests; $offset += $Concurrency) {
    $batchSize = [math]::Min($Concurrency, $Requests - $offset)
    $jobs = @(
      for ($index = 0; $index -lt $batchSize; $index++) {
        Start-Job -ScriptBlock $requestJob -ArgumentList $targetUrl
      }
    )

    $jobs | Wait-Job | Out-Null
    $jobs | Receive-Job
    $jobs | Remove-Job
  }
)

$elapsed = (Get-Date) - $startedAt
$failed = @($results | Where-Object { -not $_.Success -or $_.Status -ne 200 })
$successful = $results.Count - $failed.Count

[pscustomobject]@{
  Url         = $Url
  Requests    = $Requests
  Concurrency = $Concurrency
  Successful  = $successful
  Failed      = $failed.Count
  DurationSec = [math]::Round($elapsed.TotalSeconds, 2)
  RequestsPerSecond = if ($elapsed.TotalSeconds -gt 0) {
    [math]::Round($Requests / $elapsed.TotalSeconds, 2)
  } else {
    0
  }
}

if ($failed.Count -gt 0) {
  $failed | Select-Object -First 5 | Format-List
  exit 1
}
