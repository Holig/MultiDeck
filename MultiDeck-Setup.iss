; ========================================================
;  MultiDeck — Script d'installation Windows Inno Setup
; ========================================================

#define MyAppName "MultiDeck"
#define MyAppVersion "1.2.0"
#define MyAppPublisher "MultiDeck Open Source"
#define MyAppURL "https://github.com/Holig/MultiDeck"
#define MyAppExeName "MultiDeck.exe"

[Setup]
; Identifiant unique d'application
AppId={{D37E84B1-2981-4B9F-83C1-4D908F02C1E4}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\{#MyAppName}
DisableProgramGroupPage=yes
; Dossier de sortie du fichier Setup
OutputDir=installer_output
OutputBaseFilename=MultiDeck-Setup
SetupIconFile=assets\icon.ico
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=lowest
ArchitecturesInstallIn64BitMode=x64
; Métadonnées de version pour réduire les faux-positifs antivirus
VersionInfoVersion={#MyAppVersion}.0
VersionInfoCompany={#MyAppPublisher}
VersionInfoDescription=MultiDeck Windows Installer
VersionInfoCopyright=Copyright (c) 2026 MultiDeck
VersionInfoProductName={#MyAppName}
VersionInfoProductVersion={#MyAppVersion}.0

[Languages]
Name: "french"; MessagesFile: "compiler:Languages\French.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: checkedonce

[Files]
; Exécutable du lanceur principal
Source: "MultiDeck.exe"; DestDir: "{app}"; Flags: ignoreversion

; Assets (icône)
Source: "assets\icon.ico"; DestDir: "{app}\assets"; Flags: ignoreversion

; Backend compilé et dépendances
Source: "server\dist\*"; DestDir: "{app}\server\dist"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "server\node_modules\*"; DestDir: "{app}\server\node_modules"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "server\package.json"; DestDir: "{app}\server"; Flags: ignoreversion
Source: "server\src\cookie_extractor.py"; DestDir: "{app}\server\src"; Flags: ignoreversion skipifsourcedoesntexist

; Frontend React compilé
Source: "client\dist\*"; DestDir: "{app}\client\dist"; Flags: ignoreversion recursesubdirs createallsubdirs

; Node.js autonome embarqué (optionnel, permet l'exécution sans prérequis)
Source: "node\*"; DestDir: "{app}\node"; Flags: ignoreversion recursesubdirs createallsubdirs skipifsourcedoesntexist

; Script d'installation automatique des composants Playwright
Source: "launcher\install-browsers.bat"; DestDir: "{app}\launcher"; Flags: ignoreversion

[Icons]
; Menu Démarrer
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\assets\icon.ico"
; Raccourci Bureau
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\assets\icon.ico"; Tasks: desktopicon

[Run]
; Installation automatique des navigateurs requis par Playwright (Firefox & Chromium)
Filename: "{app}\launcher\install-browsers.bat"; StatusMsg: "Téléchargement et configuration des moteurs de navigation (Firefox, Chromium)..."; Flags: runhidden
; Lancer MultiDeck à la fin de l'installation
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
; Nettoyage des fichiers générés à l'exécution (logs, runtime)
Type: files; Name: "{app}\server\runtime-info.json"
Type: files; Name: "{app}\server\multideck.log"
