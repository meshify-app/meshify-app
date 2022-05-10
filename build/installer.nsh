!macro customInstall
  ExecWait '"$INSTDIR\extra\meshify-client.exe" install'
  ExecWait '"$INSTDIR\extra\meshify-client.exe" start'
!macroend

!macro customUninstall
  ExecWait '"$INSTDIR\extra\meshify-client.exe" stop'
  ExecWait '"$INSTDIR\extra\meshify-client.exe" remove'
  ExecWait 'delete "$INSTDIR\extra\meshify-client.exe"'
!macroend