# Windows plugin hosting

If VST3 bundle discovery succeeds but instantiation fails, the host retries the
matching component using the bundle's x64 binary and live factory information.
The saved plugin path remains the outer bundle. This handles the installed KORG
TRITON case without editing or moving vendor files. Normal successful bundle
loads and single-file plugins do not use the fallback.

Optional integration check with installed plugins:

```powershell
node app/scripts/test-vst-load.cjs app/native-host/build/bin/p12-vst-host.exe 'C:\Program Files\Common Files\VST3\KORG\TRITON.vst3' 'C:\Program Files\Common Files\VST3\KORG\TRITON_Extreme.vst3'
```

## VST2 hosting

The original Retro target hard-coded VST2 hosting off. It now accepts the same
`P12_ENABLE_VST2` and `P12_VST2_SDK_PATH` CMake options as the desktop native host.
The Windows installer script forwards both settings consistently:

```powershell
./scripts/build-windows.ps1 -EnableVst2 -Vst2SdkPath 'C:\SDKs\VST2'
```

The SDK root must contain `pluginterfaces/vst2.x/aeffect.h` and the other SDK
headers required by JUCE. Supplying `P12_VST2_SDK_PATH` as an environment variable
also enables hosting for both targets. A requested VST2 build fails early if the
SDK is missing. Without an SDK, the script explicitly warns and builds VST3 only.
GitLab runners need their own available SDK path; a local computer path alone
does not provide SDK files to a hosted runner. SDK files are not included here.
This option enables loading VST2 plugins, not producing a VST2 edition of Retro.
