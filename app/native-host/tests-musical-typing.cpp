#include "src/P12MusicalTyping.h"
#include <cassert>
#include <vector>
#include <utility>
int main(){
 p12::MusicalTyping k; p12::MusicalTyping::Keys keys{};
 std::vector<std::pair<int,bool>> events;auto send=[&](int n,bool on){events.emplace_back(n,on);};
 // Z=C4, Q=C5, 2=C#5, right bracket=G6 (FL note naming).
 assert(k.pitches[27]==48&&k.pitches[8]==60&&k.pitches[0]==61&&k.pitches[19]==79);
 keys[27]=true;keys[29]=true;k.update(true,keys,send);
 assert(events.size()==2&&events[0]==std::make_pair(48,true)&&events[1]==std::make_pair(52,true));
 k.update(true,keys,send);assert(events.size()==2);
 k.setOctave(5);keys[27]=false;k.update(true,keys,send);assert(events.back()==std::make_pair(48,false));
 k.update(false,keys,send);assert(events.back()==std::make_pair(52,false));
 auto count=events.size();k.update(true,keys,send);assert(events.size()==count);
 keys.fill(false);k.update(true,keys,send);keys[27]=true;k.update(true,keys,send);assert(events.back()==std::make_pair(60,true));
 k.release(send);assert(events.back()==std::make_pair(60,false));
 keys.fill(false);k.update(false,keys,send);k.setOctave(4);
 // Q and comma share a pitch: releasing either must not silence the other.
 keys[8]=true;keys[34]=true;k.update(true,keys,send);assert(events.back()==std::make_pair(60,true));
 count=events.size();keys[8]=false;k.update(true,keys,send);assert(events.size()==count);
 keys[34]=false;k.update(true,keys,send);assert(events.back()==std::make_pair(60,false));
 // Every mapped position emits its specified pitch and releases cleanly.
 for(unsigned i=0;i<keys.size();++i){keys[i]=true;k.update(true,keys,send);assert(events.back()==std::make_pair(k.pitches[i],true));keys[i]=false;k.update(true,keys,send);assert(events.back()==std::make_pair(k.pitches[i],false));}
}
