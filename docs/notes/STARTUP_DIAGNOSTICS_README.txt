P-12 FULL15 startup / immediate-close diagnostics

1. Extract this full package into a new folder.
2. Run BUILD_FULL15_ORIGINAL_GUI.cmd. It keeps the command window open even
   after an early error and records the output in P12_FULL15_BUILD.log.
3. After a successful build, run P12_DIAGNOSE_START.cmd. This launches the
   application normally and collects startup logs after it closes.
4. Send P12_STARTUP_REPORT.zip. If the builder failed before an app was built,
   send P12_FULL15_BUILD.log instead.

FINAL_RELEASE_GATE.cmd is a TEST: its --p12-smoke-test launch deliberately
closes P-12 after 750 ms. Use START_P12.cmd to use the app normally.

This package preserves the October 10 mixer / native pad-control fixes. No DSP,
GUI or Rossum export changes were made for these diagnostic launchers. The
startup crash cause is not yet established without the Windows output.
