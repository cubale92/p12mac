// P12 Retro — VST3 / Standalone build of P-12.
//
// Hybrid design:
//   * UI      : the unchanged P-12 HTML (app/P-12.html) inside a JUCE WebView.
//   * Bridge  : p12-plugin-bridge.js provides the Electron preload API surface
//               and routes every call to the native function "p12" below.
//   * Audio   : the exact same HostEngine as native/p12-vst-host.exe
//               (app/native-host/src/main.cpp compiled with P12_HOST_ENGINE_ONLY),
//               driven from processBlock instead of an audio device.
//   * Session : P-12's autosave/recovery snapshot is stored inside the DAW
//               project and restored through P-12's own RECOVER AUTOSAVE path.

#include "main.cpp" // HostEngine + JSON helpers (anonymous namespace), no app entry point
#include <BinaryData.h>
#include <set>

namespace
{
juce::File p12RetroDataDir()
{
    auto dir = juce::File::getSpecialLocation (juce::File::userApplicationDataDirectory).getChildFile ("P12 Retro");
    dir.createDirectory();
    return dir;
}

juce::String mimeFor (const juce::String& path)
{
    const auto ext = path.fromLastOccurrenceOf (".", false, false).toLowerCase();
    if (ext == "html" || ext == "htm") return "text/html";
    if (ext == "js" || ext == "mjs")   return "text/javascript";
    if (ext == "css")                  return "text/css";
    if (ext == "png")                  return "image/png";
    if (ext == "svg")                  return "image/svg+xml";
    if (ext == "json")                 return "application/json";
    if (ext == "wasm")                 return "application/wasm";
    return "application/octet-stream";
}

std::optional<juce::WebBrowserComponent::Resource> embeddedResource (const juce::String& url)
{
    auto path = url.upToFirstOccurrenceOf ("?", false, false).upToFirstOccurrenceOf ("#", false, false);
    while (path.startsWithChar ('/')) path = path.substring (1);
    if (path.isEmpty()) path = "P-12.html";
    const auto wanted = juce::URL::removeEscapeChars (path).fromLastOccurrenceOf ("/", false, false);

    for (int i = 0; i < BinaryData::namedResourceListSize; ++i)
    {
        const auto* name = BinaryData::namedResourceList[i];
        if (wanted != BinaryData::getNamedResourceOriginalFilename (name))
            continue;
        int size = 0;
        const auto* data = BinaryData::getNamedResource (name, size);
        if (data == nullptr) return std::nullopt;
        juce::WebBrowserComponent::Resource r;
        r.data.resize (static_cast<size_t> (size));
        std::memcpy (r.data.data(), data, static_cast<size_t> (size));
        r.mimeType = mimeFor (wanted);
        return r;
    }
    return std::nullopt;
}

//==============================================================================
// Port of app/transport-controller.cjs: one ordered transport owner that drops
// acknowledged duplicates before they reach the engine.
class TransportGate
{
public:
    juce::var request (HostEngine& engine, const juce::var& payload)
    {
        const auto bpmIn = property (payload, "bpm");
        const double nextBpm = (bpmIn.isVoid() || static_cast<double> (bpmIn) <= 0.0) ? bpm : static_cast<double> (bpmIn);
        const auto playIn = property (payload, "playing");
        const bool nextPlaying = playIn.isVoid() ? playing : static_cast<bool> (playIn);
        const auto token = stringProperty (payload, "restartToken");
        const bool explicitRestart = nextPlaying && boolProperty (payload, "reset") && token.isNotEmpty() && token != restartToken;

        if (known && nextBpm == bpm && nextPlaying == playing && ! explicitRestart)
            return makeObject ({ { "ok", true }, { "redundant", true }, { "playing", nextPlaying } });

        auto* obj = new juce::DynamicObject();
        obj->setProperty ("bpm", nextBpm);
        obj->setProperty ("playing", nextPlaying);
        obj->setProperty ("reset", explicitRestart);
        obj->setProperty ("restartToken", token);
        obj->setProperty ("startEpochMs", property (payload, "startEpochMs"));
        obj->setProperty ("pause", boolProperty (payload, "pause"));
        obj->setProperty ("resume", boolProperty (payload, "resume"));
        auto result = engine.handleCommand ("nativeTransport", juce::var (obj));
        if (boolProperty (result, "ok"))
        {
            bpm = nextBpm; playing = nextPlaying; known = true;
            if (explicitRestart) restartToken = token;
        }
        return result;
    }
    void invalidate() { known = false; bpm = 96.0; playing = false; }

private:
    bool known = false, playing = false;
    double bpm = 96.0;
    juce::String restartToken;
};

//==============================================================================
// Host MIDI -> UI. Audio thread pushes, message thread drains (SPSC).
class MidiToUiFifo
{
public:
    void push (const juce::MidiMessage& m) noexcept
    {
        const auto size = m.getRawDataSize();
        if (size < 1 || size > 3 || m.isSysEx()) return;
        int s1, n1, s2, n2;
        fifo.prepareToWrite (1, s1, n1, s2, n2);
        if (n1 + n2 < 1) return; // full: drop rather than block the audio thread
        auto& slot = slots[static_cast<size_t> (n1 > 0 ? s1 : s2)];
        slot.len = static_cast<uint8_t> (size);
        std::memcpy (slot.bytes.data(), m.getRawData(), static_cast<size_t> (size));
        fifo.finishedWrite (1);
    }
    juce::Array<juce::var> drain()
    {
        juce::Array<juce::var> out;
        int s1, n1, s2, n2;
        fifo.prepareToRead (fifo.getNumReady(), s1, n1, s2, n2);
        auto take = [&] (int start, int count) {
            for (int i = 0; i < count; ++i) {
                const auto& slot = slots[static_cast<size_t> (start + i)];
                juce::Array<juce::var> bytes;
                for (int b = 0; b < slot.len; ++b) bytes.add (static_cast<int> (slot.bytes[static_cast<size_t> (b)]));
                out.add (juce::var (bytes));
            }
        };
        take (s1, n1); take (s2, n2);
        fifo.finishedRead (n1 + n2);
        return out;
    }

private:
    static constexpr int kSize = 2048;
    struct Slot { std::array<uint8_t, 3> bytes {}; uint8_t len = 0; };
    juce::AbstractFifo fifo { kSize };
    std::array<Slot, kSize> slots {};
};

//==============================================================================
// VST folder scan matching main.js scanVstFolders() output.
juce::StringArray defaultVstFolders()
{
    juce::StringArray out;
   #if JUCE_WINDOWS
    out.add ("C:\\Program Files\\Common Files\\VST3");
    out.add ("C:\\Program Files\\VstPlugins");
    out.add ("C:\\Program Files\\Steinberg\\VstPlugins");
    out.add ("C:\\Program Files\\Common Files\\VST2");
   #elif JUCE_MAC
    out.add ("/Library/Audio/Plug-Ins/VST3");
    out.add (juce::File ("~/Library/Audio/Plug-Ins/VST3").getFullPathName());
    out.add ("/Library/Audio/Plug-Ins/VST");
    out.add (juce::File ("~/Library/Audio/Plug-Ins/VST").getFullPathName());
   #else
    out.add ("/usr/lib/vst3");
    out.add ("/usr/local/lib/vst3");
    out.add (juce::File ("~/.vst3").getFullPathName());
    out.add (juce::File ("~/.vst").getFullPathName());
   #endif
    return out;
}

struct ScanStats { int plugins = 0, vst3 = 0, vst2 = 0, legacy = 0, dirs = 0, entries = 0, errors = 0; bool missing = false; };

void scanRoot (const juce::File& f, juce::Array<juce::var>& results, std::set<juce::String>& seen, ScanStats& st, int depth)
{
    if (depth > 24 || st.entries > 250000) return;
    const auto name = f.getFileName();
    const auto lower = name.toLowerCase();
    auto add = [&] (const juce::String& format, bool legacy) {
        const auto key = f.getFullPathName().toLowerCase() + "|" + format;
        if (! seen.insert (key).second) return;
        auto* o = new juce::DynamicObject();
        o->setProperty ("name", f.getFileNameWithoutExtension());
        o->setProperty ("path", f.getFullPathName());
        o->setProperty ("vendor", "");
        o->setProperty ("category", legacy ? "VST2 / Legacy candidate" : format);
        o->setProperty ("format", format);
        o->setProperty ("legacyCandidate", legacy);
        results.add (juce::var (o));
        ++st.plugins; if (format == "VST3") ++st.vst3; else ++st.vst2; if (legacy) ++st.legacy;
    };
    if (lower.endsWith (".vst3")) { add ("VST3", false); return; }
   #if JUCE_MAC
    if (lower.endsWith (".vst") && f.isDirectory()) { add ("VST2", false); return; }
   #endif
    if (! f.isDirectory())
    {
       #if JUCE_WINDOWS
        if (lower.endsWith (".dll")) add ("VST2", true);
       #elif JUCE_LINUX
        if (lower.endsWith (".so")) add ("VST2", true);
       #endif
        return;
    }
    ++st.dirs;
    for (const auto& entry : juce::RangedDirectoryIterator (f, false, "*", juce::File::findFilesAndDirectories | juce::File::ignoreHiddenFiles))
    {
        ++st.entries;
        scanRoot (entry.getFile(), results, seen, st, depth + 1);
    }
}

juce::var scanVstFolders (const juce::var& folders)
{
    juce::StringArray roots;
    if (auto* arr = folders.getArray())
        for (const auto& v : *arr) { auto s = v.toString().trim().unquoted(); if (s.isNotEmpty()) roots.addIfNotAlreadyThere (s); }
    if (roots.isEmpty()) roots = defaultVstFolders();

    const auto started = juce::Time::getMillisecondCounterHiRes();
    juce::Array<juce::var> results, reports;
    std::set<juce::String> seen;
    int vst3 = 0, vst2 = 0, dirs = 0, entries = 0, legacy = 0;
    for (const auto& root : roots)
    {
        ScanStats st;
        const juce::File f (root);
        if (! f.exists()) st.missing = true; else scanRoot (f, results, seen, st, 0);
        vst3 += st.vst3; vst2 += st.vst2; dirs += st.dirs; entries += st.entries; legacy += st.legacy;
        reports.add (makeObject ({ { "root", root }, { "plugins", st.plugins }, { "missing", st.missing }, { "directories", st.dirs }, { "entries", st.entries } }));
    }
    std::sort (results.begin(), results.end(), [] (const juce::var& a, const juce::var& b) {
        const auto fa = stringProperty (a, "format"), fb = stringProperty (b, "format");
        return fa != fb ? fa < fb : stringProperty (a, "name").compareIgnoreCase (stringProperty (b, "name")) < 0;
    });
    juce::Array<juce::var> rootList; for (auto& r : roots) rootList.add (r);
    return makeObject ({
        { "plugins", juce::var (results) },
        { "folders", juce::var (rootList) },
        { "diagnostics", makeObject ({ { "liveDiskScan", true },
                                       { "durationMs", juce::roundToInt (juce::Time::getMillisecondCounterHiRes() - started) },
                                       { "directoriesVisited", dirs }, { "entriesInspected", entries }, { "errors", 0 },
                                       { "legacyCandidates", legacy },
                                       { "formatCounts", makeObject ({ { "VST3", vst3 }, { "VST2", vst2 } }) },
                                       { "roots", juce::var (reports) } }) } });
}

//==============================================================================
class P12RetroProcessor;

// Executes bridge calls. Lives in the processor so it outlives editor windows.
class P12Bridge
{
public:
    using Done = juce::WebBrowserComponent::NativeFunctionCompletion;
    using Emit = std::function<void (const juce::var&)>;

    P12Bridge (HostEngine& e, P12RetroProcessor& p) : engine (e), processor (p) {}

    void handle (const juce::String& channel, const juce::String& payloadJson, Done done);
    void setEmitter (Emit e) { emit = std::move (e); }
    void sendHost (const juce::var& msg) { if (emit) emit (msg); }

    juce::String sessionText() const { const juce::ScopedLock l (sessionLock); return session; }
    void setSessionText (const juce::String& s) { const juce::ScopedLock l (sessionLock); session = s; }

    void log (const juce::String& category, const juce::String& event, const juce::var& details, const juce::String& level = "INFO")
    {
        auto file = p12RetroDataDir().getChildFile ("P12_RETRO_DIAGNOSTICS.log");
        if (file.getSize() > 8 * 1024 * 1024)
        {
            file.copyFileTo (file.withFileExtension (".old.log"));
            file.deleteFile();
        }
        file.appendText (juce::Time::getCurrentTime().toISO8601 (true) + " [" + level + "] " + category + " " + event + " "
                         + juce::JSON::toString (details, true) + "\n");
    }

    TransportGate transport;
    bool midiOutputConnected = false;

private:
    void pickFolder (Done done)
    {
        chooser = std::make_unique<juce::FileChooser> ("Choose VST2 / VST3 plug-in folder", juce::File(), "");
        chooser->launchAsync (juce::FileBrowserComponent::openMode | juce::FileBrowserComponent::canSelectDirectories,
                              [done] (const juce::FileChooser& fc) {
                                  const auto f = fc.getResult();
                                  done (f == juce::File() ? juce::var() : juce::var (f.getFullPathName()));
                              });
    }

    void saveFile (const juce::var& payload, bool binary, Done done)
    {
        const auto defaultName = stringProperty (payload, "defaultName", binary ? "P12-export.bin" : "Project.p12")
                                     .replaceCharacters ("\\/:*?\"<>|", "_________");
        auto start = juce::File::getSpecialLocation (juce::File::userDocumentsDirectory).getChildFile (defaultName);
        juce::MemoryBlock data;
        if (binary) { juce::MemoryOutputStream mos (data, false); juce::Base64::convertFromBase64 (mos, stringProperty (payload, "bytesBase64")); }
        else { const auto text = stringProperty (payload, "text"); data.append (text.toRawUTF8(), text.getNumBytesAsUTF8()); }

        chooser = std::make_unique<juce::FileChooser> ("Save", start, "");
        chooser->launchAsync (juce::FileBrowserComponent::saveMode | juce::FileBrowserComponent::warnAboutOverwriting,
                              [this, done, data] (const juce::FileChooser& fc) {
                                  const auto f = fc.getResult();
                                  if (f == juce::File()) { done (makeObject ({ { "ok", false }, { "canceled", true } })); return; }
                                  // Atomic replace, same as the desktop app.
                                  juce::TemporaryFile tmp (f);
                                  const bool ok = tmp.getFile().replaceWithData (data.getData(), data.getSize()) && tmp.overwriteTargetFileWithTemporary();
                                  log ("FILE", ok ? "atomic-save" : "atomic-save-error", makeObject ({ { "path", f.getFullPathName() }, { "bytes", (int) data.getSize() } }), ok ? "INFO" : "ERROR");
                                  done (ok ? makeObject ({ { "ok", true }, { "path", f.getFullPathName() } })
                                           : makeObject ({ { "ok", false }, { "message", "Could not write " + f.getFullPathName() } }));
                              });
    }

    HostEngine& engine;
    P12RetroProcessor& processor;
    Emit emit;
    std::unique_ptr<juce::FileChooser> chooser;
    juce::CriticalSection sessionLock;
    juce::String session;
};

//==============================================================================
class P12RetroProcessor final : public juce::AudioProcessor
{
public:
    P12RetroProcessor()
        : juce::AudioProcessor (BusesProperties().withOutput ("Output", juce::AudioChannelSet::stereo(), true))
    {
    }

    const juce::String getName() const override { return JucePlugin_Name; }
    bool acceptsMidi() const override { return true; }
    bool producesMidi() const override { return false; }
    bool isMidiEffect() const override { return false; }
    double getTailLengthSeconds() const override { return 0.0; }
    int getNumPrograms() override { return 1; }
    int getCurrentProgram() override { return 0; }
    void setCurrentProgram (int) override {}
    const juce::String getProgramName (int) override { return "P-12 Session"; }
    void changeProgramName (int, const juce::String&) override {}

    bool isBusesLayoutSupported (const BusesLayout& layouts) const override
    {
        return layouts.getMainOutputChannelSet() == juce::AudioChannelSet::stereo();
    }

    void prepareToPlay (double sampleRate, int blockSize) override
    {
        engine.prepareRender (sampleRate, blockSize);
    }

    void releaseResources() override { engine.audioDeviceStopped(); }

    void processBlock (juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midi) override
    {
        juce::ScopedNoDenormals noDenormals;
        for (const auto meta : midi)
            midiToUi.push (meta.getMessage());
        midi.clear();

        if (auto* ph = getPlayHead())
            if (const auto pos = ph->getPosition())
            {
                hostPlaying.store (pos->getIsPlaying(), std::memory_order_relaxed);
                if (const auto bpm = pos->getBpm()) hostBpm.store (*bpm, std::memory_order_relaxed);
            }

        const juce::AudioIODeviceCallbackContext context {};
        engine.audioDeviceIOCallbackWithContext (nullptr, 0, buffer.getArrayOfWritePointers(),
                                                 buffer.getNumChannels(), buffer.getNumSamples(), context);
    }

    bool hasEditor() const override { return true; }
    juce::AudioProcessorEditor* createEditor() override;

    void getStateInformation (juce::MemoryBlock& dest) override
    {
        juce::MemoryOutputStream out (dest, false);
        out.writeInt (0x50313252); // 'P12R'
        out.writeInt (1);
        out.writeInt (editorWidth);
        out.writeInt (editorHeight);
        out.writeString (bridge.sessionText());
    }

    void setStateInformation (const void* data, int size) override
    {
        juce::MemoryInputStream in (data, static_cast<size_t> (size), false);
        if (in.readInt() != 0x50313252) return;
        in.readInt();
        editorWidth = juce::jlimit (900, 7680, in.readInt());
        editorHeight = juce::jlimit (600, 4320, in.readInt());
        bridge.setSessionText (in.readString());
        juce::MessageManager::callAsync ([safe = juce::WeakReference<P12RetroProcessor> (this)] {
            if (safe != nullptr && safe->bridge.sessionText().isNotEmpty())
                safe->bridge.sendHost (makeObject ({ { "type", "restoreSession" } }));
        });
    }

    HostEngine engine;
    P12Bridge bridge { engine, *this };
    MidiToUiFifo midiToUi;
    std::atomic<bool> hostPlaying { false };
    std::atomic<double> hostBpm { 0.0 };
    int editorWidth = 1500, editorHeight = 940;

    JUCE_DECLARE_WEAK_REFERENCEABLE (P12RetroProcessor)
    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (P12RetroProcessor)
};

//==============================================================================
void P12Bridge::handle (const juce::String& channel, const juce::String& payloadJson, Done done)
{
    const auto payload = juce::JSON::parse (payloadJson);
    auto run = [this, &payload] (const char* command) {
        try { return engine.handleCommand (command, payload); }
        catch (const std::exception& e) { return makeObject ({ { "ok", false }, { "message", juce::String ("Native engine exception: ") + e.what() } }); }
        catch (...) { return makeObject ({ { "ok", false }, { "message", "Unknown native engine exception." } }); }
    };

    if (channel == "p12:native-engine")
    {
        static const juce::StringArray allowed { "nativeMode", "nativeSampleLoad", "nativeStop", "nativeStatus", "nativeMeters",
                                                 "nativeTransport", "nativeSequence", "nativeSampleClear", "allNotesOff",
                                                 "nativeBufferSize", "nativeBuiltinSync", "nativePadControlsSync", "nativeCharacter",
                                                 "renderVSTToWav", "inspectInstrument" };
        const auto command = stringProperty (payload, "command");
        const auto inner = property (payload, "payload");
        if (! allowed.contains (command)) { done (makeObject ({ { "ok", false }, { "message", "Invalid native audio request" } })); return; }
        if (command == "nativeTransport") { done (transport.request (engine, inner.isObject() ? inner : juce::var (new juce::DynamicObject()))); return; }
        if (command == "nativeMode") transport.invalidate();
        if (command == "nativeBufferSize") { done (makeObject ({ { "ok", true }, { "message", "Buffer size is set by the DAW / audio settings." } })); return; }
        try { done (engine.handleCommand (command, inner)); }
        catch (const std::exception& e) { done (makeObject ({ { "ok", false }, { "message", juce::String ("Native engine exception: ") + e.what() } })); }
        return;
    }
    if (channel == "p12:native-trigger") { done (run ("nativeTrigger")); return; }
    if (channel == "p12:native-stop")    { done (run ("nativeStop")); return; }
    if (channel == "p12:vst-midi")       { done (run ("midi")); return; }
    if (channel == "p12:vst-all-notes-off") { done (run ("allNotesOff")); return; }

    if (channel == "p12:vst-load")
    {
        auto format = stringProperty (payload, "format").toUpperCase();
        if (format.isEmpty()) format = stringProperty (payload, "path").endsWithIgnoreCase (".vst3") ? "VST3" : "VST2";
        if (auto* o = payload.getDynamicObject()) o->setProperty ("format", format);
        done (run (format == "VST3" ? "loadVST3" : "loadVST2"));
        return;
    }
    if (channel == "p12:vst-unload")      { done (run ("unloadVST")); return; }
    if (channel == "p12:vst-insert")      { done (run ("setMixerInsertVST")); return; }
    if (channel == "p12:vst-pcm")         { done (run ("processPCM")); return; }
    if (channel == "p12:vst-editor")      { done (run ("openEditor")); return; }
    if (channel == "p12:vst-editor-close"){ done (run ("closeEditor")); return; }
    if (channel == "p12:vst-state-get")   { done (run ("getPluginState")); return; }
    if (channel == "p12:vst-state-set")   { done (run ("setPluginState")); return; }
    if (channel == "p12:vst-audio-test")  { done (run ("testTone")); return; }
    if (channel == "p12:vst-audio-list")
    {
        juce::Array<juce::var> outputs;
        outputs.add (makeObject ({ { "name", "DAW track (P12 Retro plug-in)" }, { "type", "Plug-in" } }));
        done (makeObject ({ { "ok", true }, { "outputs", juce::var (outputs) }, { "current", "DAW track (P12 Retro plug-in)" }, { "deviceType", "Plug-in" } }));
        return;
    }
    if (channel == "p12:vst-audio-set")
    {
        done (makeObject ({ { "ok", true }, { "message", "Inside a DAW, P12 Retro always plays through its plug-in track." } }));
        return;
    }
    if (channel == "p12:vst-host-status")
    {
        auto r = run ("ping");
        if (auto* o = r.getDynamicObject()) o->setProperty ("nativeHostPath", "P12 Retro plug-in (built-in engine)");
        done (r);
        return;
    }
    if (channel == "p12:default-vst-folders") { juce::Array<juce::var> a; for (auto& f : defaultVstFolders()) a.add (f); done (juce::var (a)); return; }
    if (channel == "p12:scan-vst-folders")
    {
        const auto folders = property (payload, "folders");
        log ("VST", "scan-start", makeObject ({ { "folders", folders } }));
        done (scanVstFolders (folders));
        return;
    }
    if (channel == "p12:pick-vst-folder") { pickFolder (std::move (done)); return; }
    if (channel == "p12:safe-save-text")  { saveFile (payload, false, std::move (done)); return; }
    if (channel == "p12:safe-save-bytes") { saveFile (payload, true, std::move (done)); return; }

    if (channel == "p12:recovery-write")
    {
        const auto text = payloadJson; // the snapshot object exactly as P-12 serialised it
        setSessionText (text);
        p12RetroDataDir().getChildFile ("P12_RETRO_LAST_SESSION.p12").replaceWithText (text);
        done (makeObject ({ { "ok", true }, { "path", "DAW project (P12 Retro session)" }, { "bytes", (int) text.getNumBytesAsUTF8() } }));
        return;
    }
    if (channel == "p12:recovery-read")
    {
        const auto text = sessionText();
        if (text.isEmpty()) { done (makeObject ({ { "ok", true }, { "exists", false } })); return; }
        done (makeObject ({ { "ok", true }, { "exists", true }, { "path", "DAW project (P12 Retro session)" }, { "text", text },
                            { "mtimeMs", (double) juce::Time::currentTimeMillis() } }));
        return;
    }
    if (channel == "p12:recovery-clear") { setSessionText ({}); done (makeObject ({ { "ok", true } })); return; }

    if (channel == "p12:wireless-command")
    {
        // Bluetooth / OS MIDI through the engine's JUCE MIDI device layer.
        const auto action = stringProperty (payload, "action");
        if (action == "midiDevices" || action == "midiConnect" || action == "midiPoll" || action == "midiPair")
        {
            auto inner = property (payload, "payload");
            const auto r = engine.handleCommand (action, inner.isObject() ? inner : juce::var (new juce::DynamicObject()));
            if (action == "midiConnect") midiOutputConnected = boolProperty (r, "ok") && stringProperty (r, "output").isNotEmpty();
            done (r);
            return;
        }
        done (makeObject ({ { "ok", false }, { "message", "Wi-Fi MIDI runs in the P-12 Desktop app." } }));
        return;
    }
    if (channel == "p12:wireless-send")
    {
        if (midiOutputConnected) engine.handleCommand ("midiSend", payload);
        done (makeObject ({ { "ok", true } }));
        return;
    }
    if (channel == "p12:diagnostic" || channel == "p12:audio-debug")
    {
        log (stringProperty (payload, "category", channel == "p12:audio-debug" ? "AUDIO" : "RENDERER"),
             stringProperty (payload, "event", "event"), property (payload, "details"), stringProperty (payload, "level", "INFO"));
        done (makeObject ({ { "ok", true } }));
        return;
    }
    if (channel == "p12:diagnostic-path")
    {
        const auto p = p12RetroDataDir().getChildFile ("P12_RETRO_DIAGNOSTICS.log").getFullPathName();
        done (makeObject ({ { "path", p }, { "audioDebugPath", p } }));
        return;
    }
    if (channel == "p12:page-ready")
    {
        done (makeObject ({ { "ok", true }, { "plugin", true } }));
        sendHost (makeObject ({ { "type", "transport" }, { "playing", processor.hostPlaying.load() }, { "bpm", processor.hostBpm.load() } }));
        if (sessionText().isNotEmpty())
            sendHost (makeObject ({ { "type", "restoreSession" } }));
        return;
    }

    done (makeObject ({ { "ok", false }, { "message", "Not available in the P12 Retro plug-in: " + channel } }));
}

//==============================================================================
class P12RetroEditor final : public juce::AudioProcessorEditor, private juce::Timer
{
public:
    explicit P12RetroEditor (P12RetroProcessor& p)
        : juce::AudioProcessorEditor (p), processor (p), browser (makeOptions())
    {
        addAndMakeVisible (browser);
        setResizable (true, true);
        setResizeLimits (900, 600, 7680, 4320);
        setSize (processor.editorWidth, processor.editorHeight);
        processor.bridge.setEmitter ([this] (const juce::var& msg) { browser.emitEventIfBrowserIsVisible ("p12Host", msg); });
        browser.goToURL (juce::WebBrowserComponent::getResourceProviderRoot() + "P-12.html");
        startTimerHz (100);
    }

    ~P12RetroEditor() override
    {
        stopTimer();
        processor.bridge.setEmitter ({});
    }

    void resized() override
    {
        browser.setBounds (getLocalBounds());
        processor.editorWidth = getWidth();
        processor.editorHeight = getHeight();
    }

private:
    juce::WebBrowserComponent::Options makeOptions()
    {
        const auto bridgeJs = juce::String::fromUTF8 (BinaryData::p12pluginbridge_js, BinaryData::p12pluginbridge_jsSize);
        return juce::WebBrowserComponent::Options {}
            .withBackend (juce::WebBrowserComponent::Options::Backend::webview2)
            .withWinWebView2Options (juce::WebBrowserComponent::Options::WinWebView2 {}
                                         .withUserDataFolder (p12RetroDataDir().getChildFile ("WebView2")))
            .withNativeIntegrationEnabled()
            .withKeepPageLoadedWhenBrowserIsHidden()
            .withUserScript (bridgeJs)
            .withResourceProvider ([] (const juce::String& url) { return embeddedResource (url); })
            .withNativeFunction ("p12", [this] (const juce::Array<juce::var>& args, juce::WebBrowserComponent::NativeFunctionCompletion done) {
                processor.bridge.handle (args.size() > 0 ? args[0].toString() : juce::String(),
                                         args.size() > 1 ? args[1].toString() : juce::String ("null"),
                                         std::move (done));
            });
    }

    // Standalone only: JUCE's default window has just minimise + close. Give it
    // maximise (Windows/Linux) / zoom (macOS) and a resizable frame. In a DAW the
    // host owns the window; the editor's corner resizer is used there.
    void configureStandaloneWindow()
    {
        if (standaloneConfigured || processor.wrapperType != juce::AudioProcessor::wrapperType_Standalone)
            return;
        if (auto* window = findParentComponentOfClass<juce::DocumentWindow>())
        {
            window->setTitleBarButtonsRequired (juce::DocumentWindow::allButtons, false);
            window->setResizable (true, false);
            if (auto* constrainer = window->getConstrainer())
                constrainer->setSizeLimits (900, 600, 10000, 10000);
            standaloneConfigured = true;
        }
    }

    void timerCallback() override
    {
        configureStandaloneWindow();
        auto events = processor.midiToUi.drain();
        if (! events.isEmpty())
            browser.emitEventIfBrowserIsVisible ("p12Host", makeObject ({ { "type", "midi" }, { "events", juce::var (events) } }));

        const bool playing = processor.hostPlaying.load (std::memory_order_relaxed);
        const double bpm = processor.hostBpm.load (std::memory_order_relaxed);
        if (playing != lastPlaying || std::abs (bpm - lastBpm) > 0.01)
        {
            lastPlaying = playing; lastBpm = bpm;
            browser.emitEventIfBrowserIsVisible ("p12Host", makeObject ({ { "type", "transport" }, { "playing", playing }, { "bpm", bpm } }));
        }
    }

    P12RetroProcessor& processor;
    juce::WebBrowserComponent browser;
    bool standaloneConfigured = false;
    bool lastPlaying = false;
    double lastBpm = 0.0;
};

juce::AudioProcessorEditor* P12RetroProcessor::createEditor() { return new P12RetroEditor (*this); }
} // namespace

juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter() { return new P12RetroProcessor(); }
