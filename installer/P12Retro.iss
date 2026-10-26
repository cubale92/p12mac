; P12 Retro — Windows installer (Inno Setup 6.x)
;
; Installs, as selectable components:
;   * P12 Retro VST3       -> C:\Program Files\Common Files\VST3\P12 Retro.vst3
;   * P12 Retro Standalone -> C:\Program Files\P12 Retro\P12 Retro.exe
;   * P-12 Desktop app     -> C:\Program Files\P12 Retro\Desktop\P-12 v1.0.exe
;                             (Electron app + native\p12-vst-host.exe, detached
;                              Mixer-32 / playlist / piano windows, wireless MIDI)
;
; Build (from the repo root, after building the pieces):
;   iscc /DAppVersion=1.0.0 installer\P12Retro.iss
; Inputs are read from installer\stage\ (see scripts\build-windows.ps1):
;   stage\VST3\P12 Retro.vst3\...      stage\Standalone\P12 Retro.exe
;   stage\Desktop\...                  (electron-builder win-unpacked folder)
;   stage\redist\MicrosoftEdgeWebview2Setup.exe   (optional bootstrapper)

#ifndef AppVersion
  #define AppVersion "1.0.0"
#endif
#define AppName "P12 Retro"
#define Publisher "P-12"
#define Stage "stage"

[Setup]
AppId={{6E1A6F2B-3C1D-4C5E-9B0E-12B12C0FFEE1}
AppName={#AppName}
AppVersion={#AppVersion}
AppVerName={#AppName} {#AppVersion}
AppPublisher={#Publisher}
DefaultDirName={autopf}\{#AppName}
DefaultGroupName={#AppName}
DisableProgramGroupPage=yes
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=admin
WizardStyle=modern
SetupIconFile=..\app\build\icon.ico
UninstallDisplayIcon={app}\P12 Retro.exe
UninstallDisplayName={#AppName}
OutputDir=Output
OutputBaseFilename=p12-retro-{#AppVersion}-setup
Compression=lzma2/ultra64
SolidCompression=yes
CloseApplications=yes
SetupMutex=P12RetroSetupMutex

[Types]
Name: "full";    Description: "Full installation (VST3 + Standalone + P-12 Desktop)"
Name: "plugin";  Description: "Plug-in only (VST3 + Standalone)"
Name: "custom";  Description: "Custom"; Flags: iscustom

[Components]
Name: "vst3";       Description: "P12 Retro VST3 plug-in";          Types: full plugin custom
Name: "standalone"; Description: "P12 Retro Standalone";            Types: full plugin custom
#ifexist "stage\Desktop\P-12 v1.0.exe"
Name: "desktop";    Description: "P-12 Desktop app (detached Mixer-32, playlist and piano roll windows, wireless MIDI)"; Types: full custom
#endif

[Tasks]
Name: "desktopicon"; Description: "Create desktop shortcuts"; GroupDescription: "Shortcuts:"; Flags: unchecked

[InstallDelete]
; Replace any prior copy of the bundle.
Type: filesandordirs; Name: "{commoncf64}\VST3\P12 Retro.vst3"; Components: vst3

[Files]
Source: "{#Stage}\VST3\P12 Retro.vst3\*"; DestDir: "{commoncf64}\VST3\P12 Retro.vst3"; Components: vst3; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "{#Stage}\Standalone\P12 Retro.exe"; DestDir: "{app}"; Components: standalone; Flags: ignoreversion
#ifexist "stage\Desktop\P-12 v1.0.exe"
Source: "{#Stage}\Desktop\*"; DestDir: "{app}\Desktop"; Components: desktop; Flags: ignoreversion recursesubdirs createallsubdirs
#endif
#ifexist "stage\redist\MicrosoftEdgeWebview2Setup.exe"
Source: "{#Stage}\redist\MicrosoftEdgeWebview2Setup.exe"; DestDir: "{tmp}"; Flags: deleteafterinstall; Check: NeedsWebView2
#endif

[Icons]
Name: "{group}\P12 Retro"; Filename: "{app}\P12 Retro.exe"; Components: standalone
Name: "{autodesktop}\P12 Retro"; Filename: "{app}\P12 Retro.exe"; Components: standalone; Tasks: desktopicon
#ifexist "stage\Desktop\P-12 v1.0.exe"
Name: "{group}\P-12 Desktop"; Filename: "{app}\Desktop\P-12 v1.0.exe"; Components: desktop
Name: "{autodesktop}\P-12 Desktop"; Filename: "{app}\Desktop\P-12 v1.0.exe"; Components: desktop; Tasks: desktopicon
#endif
Name: "{group}\Uninstall P12 Retro"; Filename: "{uninstallexe}"

[Run]
#ifexist "stage\redist\MicrosoftEdgeWebview2Setup.exe"
Filename: "{tmp}\MicrosoftEdgeWebview2Setup.exe"; Parameters: "/silent /install"; StatusMsg: "Installing Microsoft Edge WebView2 Runtime..."; Check: NeedsWebView2; Flags: waituntilterminated
#endif
Filename: "{app}\P12 Retro.exe"; Description: "Launch P12 Retro Standalone"; Components: standalone; Flags: postinstall nowait skipifsilent unchecked

[UninstallDelete]
Type: filesandordirs; Name: "{commoncf64}\VST3\P12 Retro.vst3"

[Code]
// The P12 Retro UI runs in Microsoft Edge WebView2 (preinstalled on Windows 11
// and current Windows 10). Detect it the way Microsoft documents.
function NeedsWebView2(): Boolean;
var
  Version: String;
begin
  Result := not (
    RegQueryStringValue(HKLM, 'SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}', 'pv', Version) or
    RegQueryStringValue(HKCU, 'Software\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}', 'pv', Version)
  ) or (Version = '') or (Version = '0.0.0.0');
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if (CurStep = ssPostInstall) and NeedsWebView2() then
    MsgBox('P12 Retro needs the Microsoft Edge WebView2 Runtime for its interface.' + #13#10 +
           'Please install it from https://developer.microsoft.com/microsoft-edge/webview2/ if the plug-in window stays blank.',
           mbInformation, MB_OK);
end;

procedure CurPageChanged(CurPageID: Integer);
begin
  if CurPageID = wpFinished then
    WizardForm.FinishedLabel.Caption := WizardForm.FinishedLabel.Caption + #13#10#13#10 +
      'Restart your DAW and rescan plug-ins so it picks up P12 Retro (Instrument > P-12 > P12 Retro).';
end;
