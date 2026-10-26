// KNOCK character checks: deterministic, finite, different from CLASSIC,
// OUT 7-8 brighter than OUT 1-2, DRIVE flattens transients.
#include "src/P12NativeSampler.h"
#include <cassert>
#include <cmath>
#include <cstdio>
#include <memory>
#include <vector>

static std::unique_ptr<p12::Sample> tone(int frames,double hz,float amp,int rate=48000){
    auto s=std::make_unique<p12::Sample>();s->rate=rate;s->left.resize(frames);s->right.resize(frames);
    for(int i=0;i<frames;++i){const float v=amp*std::sin(float(2.0*3.14159265358979323846*hz*i/rate));s->left[i]=v;s->right[i]=v;}
    return s;
}
static std::vector<float> render(bool knock,float drive,int out,double hz,float amp,int n=4096,bool filters=true){
    p12::Sampler s;assert(s.load(0,tone(16384,hz,amp)));
    s.setKnock(knock,drive);s.setKnockFilters(filters);s.setPadOutput(0,out);
    p12::Event e;e.pad=0;e.track=0;e.velocity=1;e.ratio=1;e.trimStart=0;e.trimEnd=1;e.spCharacter=true;
    assert(s.submit(e));s.beginBlock();
    std::vector<float> l(n),r(n);assert(s.renderBus(0,0,l.data(),r.data(),n,48000));
    for(int i=0;i<n;++i){assert(std::isfinite(l[i]));assert(std::fabs(l[i]-r[i])<1e-6f);}
    return l;
}
static double rms(const std::vector<float>& x,int from=512){double e=0;for(size_t i=from;i<x.size();++i)e+=double(x[i])*x[i];return std::sqrt(e/(x.size()-from));}
static double peak(const std::vector<float>& x){double p=0;for(float v:x)p=std::max(p,double(std::fabs(v)));return p;}
static double diff(const std::vector<float>& a,const std::vector<float>& b){double e=0;for(size_t i=512;i<a.size();++i){double d=a[i]-b[i];e+=d*d;}return std::sqrt(e/(a.size()-512));}

int main(){
    // Different from the existing classic SP path, and deterministic.
    const auto classic=render(false,0.35f,8,440,0.6f), k1=render(true,0.35f,8,440,0.6f), k2=render(true,0.35f,8,440,0.6f);
    assert(diff(classic,k1)>0.002);
    assert(diff(k1,k2)==0.0);

    // OUT 7-8 are unfiltered: a 12 kHz tone keeps more level than through OUT 1-2's 4-pole stage.
    const double bright=rms(render(true,0.0f,7,12000,0.5f)), dark=rms(render(true,0.0f,1,12000,0.5f)), mid=rms(render(true,0.0f,4,12000,0.5f));
    std::fprintf(stderr,"12kHz rms out7=%.4f out4=%.4f out1=%.4f\n",bright,mid,dark);
    assert(bright>mid && mid>dark);

    // DRIVE squashes a loud tone towards the ceiling (crest factor drops).
    const auto clean=render(true,0.0f,8,220,0.95f), hot=render(true,1.0f,8,220,0.95f);
    const double crestClean=peak(clean)/rms(clean), crestHot=peak(hot)/rms(hot);
    std::printf("crest clean=%.3f hot=%.3f\n",crestClean,crestHot);
    assert(crestHot<crestClean-0.05);
    assert(peak(hot)<=1.0001);

    // eSPi voicing: at DRIVE 0, filters off and centre pan, KNOCK is unity level
    // (no -3 dB pan law) and transparent for a clean 1 kHz tone.
    const auto unity=render(true,0.0f,1,1000,0.5f,4096,false);
    std::fprintf(stderr,"unity peak=%.3f\n",peak(unity));
    assert(std::fabs(peak(unity)-0.5)<0.02);
    // Filters off: OUT 1 is as bright as OUT 7 (filters are opt-in).
    assert(std::fabs(rms(render(true,0.0f,1,12000,0.5f,4096,false))-rms(render(true,0.0f,7,12000,0.5f,4096,false)))<1e-6);
    std::printf("PASS KNOCK character\n");
    return 0;
}
