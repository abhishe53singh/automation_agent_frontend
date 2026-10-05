$p = Start-Process -FilePath 'npx.cmd' -ArgumentList 'vitest','run' -Wait -PassThru -NoNewWindow -RedirectStandardOutput 'test_out.txt' -RedirectStandardError 'test_err.txt'
Add-Content -Path 'test_out.txt' -Value "EXITCODE:$($p.ExitCode)"
