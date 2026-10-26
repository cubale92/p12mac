P-12 NATIVE HOST - VST2 + VST3 BUILD
=====================================

1. This ZIP does NOT include Steinberg's legacy VST2 SDK.
2. Double-click BUILD_P12_VST_HOST.cmd.
3. If VST2_SDK_PATH.txt is not already configured, a folder picker opens.
4. Select your legally obtained SDK root, or a parent folder containing:
       pluginterfaces\vst2.x\aeffect.h
5. The builder configures CMake with:
       P12_ENABLE_VST2=ON
       P12_VST2_SDK_PATH=<your selected SDK root>
6. It builds Release x64 into:
       native-host\build\win64-vst2-vst3
7. It copies the executable to:
       native\p12-vst-host.exe
8. It starts the executable, sends a status command, and refuses to report
   success unless the host replies with BOTH:
       vst2=true
       vst3=true

The chosen SDK root is remembered in VST2_SDK_PATH.txt for later rebuilds.
If you move the SDK, delete/edit that text file and run the builder again.

If the build fails, send P12_NATIVE_BUILD.log to ChatGPT.
