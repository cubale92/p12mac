#pragma once
#include <JuceHeader.h>
#include <atomic>
#include <algorithm>
#include <cstdint>
#include <array>
// One selected physical/OS MIDI input, one producer callback, one command-thread
// consumer. No renderer work, JSON or allocation in the MIDI callback.
class P12MidiDevices final : private juce::MidiInputCallback {
public:
 ~P12MidiDevices(){if(input)input->stop();}
 juce::var devices(){
  juce::Array<juce::var> ins,outs;
  for(const auto& d:juce::MidiInput::getAvailableDevices())ins.add(item(d));
  for(const auto& d:juce::MidiOutput::getAvailableDevices())outs.add(item(d));
  auto* o=new juce::DynamicObject();o->setProperty("ok",true);o->setProperty("inputs",ins);o->setProperty("outputs",outs);
  o->setProperty("input",inputId);o->setProperty("output",outputId);return o;
 }
 juce::var connect(const juce::String& in,const juce::String& out){
  if(in!=inputId){if(input)input->stop();input.reset();inputId.clear();read.store(write.load());
   if(in.isNotEmpty()){input=juce::MidiInput::openDevice(in,this);if(input){inputId=in;input->start();}}
  }
  if(out!=outputId){output.reset();outputId.clear();if(out.isNotEmpty()){output=juce::MidiOutput::openDevice(out);if(output)outputId=out;}}
  auto result=devices();result.getDynamicObject()->setProperty("ok",inputId==in&&outputId==out);return result;
 }
 juce::var poll(){
  juce::Array<juce::var> messages;
  auto r=read.load(std::memory_order_relaxed);const auto w=write.load(std::memory_order_acquire);
  while(r!=w){juce::Array<juce::var> bytes;const auto& p=queue[r];for(int i=0;i<p.size;++i)bytes.add(int(p.data[i]));messages.add(bytes);r=(r+1)%queue.size();}
  read.store(r,std::memory_order_release);auto* o=new juce::DynamicObject();o->setProperty("ok",true);o->setProperty("messages",messages);o->setProperty("dropped",static_cast<juce::int64>(dropped.load()));return o;
 }
 bool send(const juce::var& bytes){
  const auto* a=bytes.getArray();if(!output||!a||a->size()<1||a->size()>3)return false;
  unsigned char data[3]{};for(int i=0;i<a->size();++i){const int n=int((*a)[i]);if(n<0||n>255)return false;data[i]=static_cast<unsigned char>(n);}
  const int status=data[0];const int count=status<0x80?0:status<0xf0?((status&0xe0)==0xc0?2:3):(status==0xf8||status==0xfa||status==0xfb||status==0xfc)?1:0;
  if(count!=a->size())return false;for(int i=1;i<count;++i)if(data[i]>127)return false;
  output->sendMessageNow(juce::MidiMessage(data,count,0.0));return true;
 }
private:
 struct Packet{std::array<unsigned char,3> data{};int size=0;};
 std::array<Packet,1024> queue{};std::atomic<size_t> read{0},write{0};std::atomic<uint64_t> dropped{0};
 std::unique_ptr<juce::MidiInput> input;std::unique_ptr<juce::MidiOutput> output;juce::String inputId,outputId;
 static juce::var item(const juce::MidiDeviceInfo& d){auto* o=new juce::DynamicObject();o->setProperty("id",d.identifier);o->setProperty("name",d.name);return o;}
 void handleIncomingMidiMessage(juce::MidiInput*,const juce::MidiMessage& msg)override{
  const int n=msg.getRawDataSize();if(n<1||n>3)return;
  const auto w=write.load(std::memory_order_relaxed),next=(w+1)%queue.size();if(next==read.load(std::memory_order_acquire)){dropped.fetch_add(1);return;}
  auto& p=queue[w];p.size=n;std::copy_n(msg.getRawData(),n,p.data.begin());write.store(next,std::memory_order_release);
 }
};
