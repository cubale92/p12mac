cmake_minimum_required(VERSION 3.24)
project(P12Retro VERSION 1.0.0 LANGUAGES C CXX)

# P12 Retro: P-12 as a VST3 + Standalone instrument (hybrid of the P-12 desktop
# app and an eSPi-style plug-in). UI = app/P-12.html in a WebView; audio = the
# same HostEngine as app/native-host (compiled with P12_HOST_ENGINE_ONLY).

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)
if(MSVC)
  set(CMAKE_MSVC_RUNTIME_LIBRARY "MultiThreaded$<$<CONFIG:Debug>:Debug>")
endif()

# Use a local JUCE checkout with -DP12_JUCE_DIR=..., otherwise fetch the same
# JUCE version the native host uses.
set(P12_JUCE_DIR "" CACHE PATH "Optional local JUCE checkout")
if(P12_JUCE_DIR)
  add_subdirectory("${P12_JUCE_DIR}" "${CMAKE_BINARY_DIR}/juce")
else()
  include(FetchContent)
  FetchContent_Declare(JUCE GIT_REPOSITORY https://github.com/juce-framework/JUCE.git GIT_TAG 9.0.2 GIT_SHALLOW TRUE)
  FetchContent_MakeAvailable(JUCE)
endif()

set(P12_APP_DIR "${CMAKE_CURRENT_SOURCE_DIR}/../app")

option(P12_ENABLE_VST2 "Enable legacy VST2 hosting with a supplied VST2 SDK" OFF)
set(P12_VST2_SDK_PATH "" CACHE PATH "VST2 SDK root")
if(P12_ENABLE_VST2)
  if(NOT EXISTS "${P12_VST2_SDK_PATH}/pluginterfaces/vst2.x/aeffect.h")
    message(FATAL_ERROR "VST2 hosting requires P12_VST2_SDK_PATH containing pluginterfaces/vst2.x/aeffect.h")
  endif()
  juce_set_vst2_sdk_path("${P12_VST2_SDK_PATH}")
endif()

set(P12_FORMATS VST3 Standalone)
if(APPLE)
  list(APPEND P12_FORMATS AU)
endif()

juce_add_plugin(P12Retro
  PRODUCT_NAME "P12 Retro"
  COMPANY_NAME "P-12"
  BUNDLE_ID "com.p12.retro"
  PLUGIN_MANUFACTURER_CODE P12x
  PLUGIN_CODE P12R
  FORMATS ${P12_FORMATS}
  IS_SYNTH TRUE
  NEEDS_MIDI_INPUT TRUE
  NEEDS_MIDI_OUTPUT FALSE
  IS_MIDI_EFFECT FALSE
  EDITOR_WANTS_KEYBOARD_FOCUS TRUE
  NEEDS_WEB_BROWSER TRUE
  NEEDS_WEBVIEW2 TRUE
  VST3_CATEGORIES Instrument Sampler Drum
  AU_MAIN_TYPE kAudioUnitType_MusicDevice
  COPY_PLUGIN_AFTER_BUILD FALSE
  ICON_BIG "${P12_APP_DIR}/build/icon.png"
)

juce_generate_juce_header(P12Retro)

juce_add_binary_data(P12RetroUI
  HEADER_NAME BinaryData.h
  NAMESPACE BinaryData
  SOURCES
    "${P12_APP_DIR}/P-12.html"
    "${P12_APP_DIR}/p12-sp-mixer.js"
    "${P12_APP_DIR}/p12-wave-editor.js"
    "${P12_APP_DIR}/p12-library.js"
    "${P12_APP_DIR}/p12-wireless-client.js"
    "${P12_APP_DIR}/p12-wireless-ui.js"
    "${P12_APP_DIR}/vendor/jszip.min.js"
    "${P12_APP_DIR}/build/icon.png"
    "${CMAKE_CURRENT_SOURCE_DIR}/Source/p12-plugin-bridge.js"
)
set_target_properties(P12RetroUI PROPERTIES POSITION_INDEPENDENT_CODE ON)

target_sources(P12Retro PRIVATE Source/P12RetroPlugin.cpp)
target_include_directories(P12Retro PRIVATE "${P12_APP_DIR}/native-host/src")

target_compile_definitions(P12Retro PUBLIC
  P12_HOST_ENGINE_ONLY=1
  JUCE_WEB_BROWSER=1
  JUCE_USE_WIN_WEBVIEW2_WITH_STATIC_LINKING=1
  JUCE_USE_CURL=0
  JUCE_VST3_CAN_REPLACE_VST2=0
  JUCE_PLUGINHOST_VST3=1
  JUCE_PLUGINHOST_VST=$<BOOL:${P12_ENABLE_VST2}>
  JUCE_PLUGINHOST_AU=0
  JUCE_USE_WINRT_MIDI=1
  JUCE_ASIO=1
  JUCE_WASAPI=1
  JUCE_DISPLAY_SPLASH_SCREEN=0
  JUCE_REPORT_APP_USAGE=0
  P12_ENABLE_VST2=$<BOOL:${P12_ENABLE_VST2}>
)

target_link_libraries(P12Retro
  PRIVATE
    P12RetroUI
    juce::juce_audio_utils
    juce::juce_audio_processors
    juce::juce_gui_extra
  PUBLIC
    juce::juce_recommended_config_flags
    juce::juce_recommended_lto_flags
    juce::juce_recommended_warning_flags
)

if(MSVC)
  target_compile_options(P12Retro PRIVATE /permissive- /Zc:__cplusplus /bigobj)
endif()
