!macro customInstall
  ExecWait '"$INSTDIR\extra\meshify-client.exe" install'
  ExecWait '"$INSTDIR\extra\meshify-client.exe" start'
  CreateDirectory '$APPDATA\Meshify'
!macroend

!macro customUninstall
  ExecWait '"$INSTDIR\extra\meshify-client.exe" stop'
  ExecWait '"$INSTDIR\extra\meshify-client.exe" remove'
!macroend