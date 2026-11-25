; Extra uninstall steps for the NSIS installer (included via package.json "nsis.include").
; Removes the "Start with system" entry the app registers with app.setLoginItemSettings
; (name "WaterReminder"), so nothing is left in Task Manager > Startup apps.
!macro customUnInstall
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "WaterReminder"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run" "WaterReminder"
!macroend
