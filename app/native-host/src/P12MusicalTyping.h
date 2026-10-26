#pragma once
#include <array>
namespace p12 {
class MusicalTyping {
public:
    // Physical QWERTY positions from FL Studio's Layout Piano.scr.
    static constexpr std::array<int,37> scanCodes {
        0x03,0x04,0x06,0x07,0x08,0x0a,0x0b,0x0d,
        0x10,0x11,0x12,0x13,0x14,0x15,0x16,0x17,0x18,0x19,0x1a,0x1b,
        0x1f,0x20,0x22,0x23,0x24,0x26,0x27,
        0x2c,0x2d,0x2e,0x2f,0x30,0x31,0x32,0x33,0x34,0x35
    };
    static constexpr std::array<int,37> pitches {
        61,63,66,68,70,73,75,78,
        60,62,64,65,67,69,71,72,74,76,77,79,
        49,51,54,56,58,61,63,
        48,50,52,53,55,57,59,60,62,64
    };
    using Keys=std::array<bool,scanCodes.size()>;
    template<class Send> void update(bool active,const Keys& down,Send send){
        auto before=counts();
        for(unsigned i=0;i<notes.size();++i){
            if(notes[i]>=0 && (!active||!down[i]))notes[i]=-1;
            if(active&&down[i]&&!previous[i])notes[i]=pitches[i]+transpose;
            previous[i]=down[i];
        }
        emitChanges(before,counts(),send);
    }
    template<class Send> void release(Send send){
        auto before=counts();notes.fill(-1);emitChanges(before,counts(),send);
    }
    void setOctave(int octave){if(octave>=2&&octave<=6)transpose=(octave-4)*12;}
private:
    int transpose=0;
    Keys previous{};
    std::array<int,scanCodes.size()> notes=[] {std::array<int,scanCodes.size()> a{};a.fill(-1);return a;}();
    std::array<int,128> counts()const{std::array<int,128> c{};for(auto n:notes)if(n>=0)++c[n];return c;}
    template<class Send> static void emitChanges(const std::array<int,128>& before,const std::array<int,128>& after,Send send){
        for(int n=0;n<128;++n)if(before[n]>0&&after[n]==0)send(n,false);
        for(int n=0;n<128;++n)if(before[n]==0&&after[n]>0)send(n,true);
    }
};
}
