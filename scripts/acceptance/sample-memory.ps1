param([int]$RootPid, [string]$OutputFile, [string]$StopFile)
$ErrorActionPreference = 'Stop'
# Only descendants of this freshly launched isolated browser. Never output command lines.
$taskWriter = [System.IO.StreamWriter]::new($OutputFile, $false, [System.Text.UTF8Encoding]::new($false))
$taskWriter.AutoFlush = $true
$taskClock = [System.Diagnostics.Stopwatch]::StartNew()
try {
  while (-not (Test-Path -LiteralPath $StopFile) -and $taskClock.Elapsed.TotalSeconds -lt 180) {
    if (-not (Get-Process -Id $RootPid -ErrorAction SilentlyContinue)) { break }
    $taskProcesses = @(Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" -Property ProcessId,ParentProcessId,CommandLine)
    $taskIds = [System.Collections.Generic.HashSet[int]]::new(); [void]$taskIds.Add($RootPid)
    do { $taskChanged=$false; foreach($item in $taskProcesses) { if($taskIds.Contains([int]$item.ParentProcessId) -and $taskIds.Add([int]$item.ProcessId)) { $taskChanged=$true } } } while($taskChanged)
    $taskRows = @()
    foreach($item in $taskProcesses) {
      if(-not $taskIds.Contains([int]$item.ProcessId)) { continue }
      $taskProcess = Get-Process -Id $item.ProcessId -ErrorAction SilentlyContinue
      if(-not $taskProcess) { continue }
      $taskRole='browser'
      if($item.CommandLine -match '--type=([^\s"]+)') { $taskRole=$Matches[1] }
      $taskRows += [pscustomobject]@{pid=[int]$item.ProcessId; role=$taskRole; workingSetBytes=$taskProcess.WorkingSet64; privateBytes=$taskProcess.PrivateMemorySize64}
    }
    $taskWriter.WriteLine((@{unixMs=[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds(); processes=$taskRows; workingSetSumBytes=($taskRows|Measure-Object -Property workingSetBytes -Sum).Sum; privateSumBytes=($taskRows|Measure-Object -Property privateBytes -Sum).Sum} | ConvertTo-Json -Depth 4 -Compress))
    Start-Sleep -Milliseconds 100
  }
} finally { $taskWriter.Dispose() }
