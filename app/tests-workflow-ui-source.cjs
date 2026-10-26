'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const html=fs.readFileSync('P-12.html','utf8'),piano=fs.readFileSync('piano-detached.html','utf8');
const checks={
 'main piano defaults to one visible grid cell':html.includes('<option value="1" selected>1 cell</option>')&&html.includes('division*pianoDrawCells()'),
 'main piano integrated transport':html.includes('id="p12PianoPlay"')&&html.includes('id="p12PianoStop"')&&html.includes('id="p12PianoRecPlay"')&&html.includes("restartPlay(false)")&&html.includes('pianoMidiRecording'),
 'recorded MIDI retains played duration':html.includes('held.recorded.length=held.overdubExisting?')&&html.includes('firstTicks/6')&&html.includes('pianoFinishHeldNotes'),
 'main live chord display':html.includes('id="p12PianoLiveChord"')&&html.includes('updatePianoLiveChord()')&&html.includes("'maj9'")&&html.includes("'m9'"),
 'main note edge resize':html.includes('p12-piano-resize')&&html.includes('pianoHandleResizeDown'),
 'main piano wheel navigation':html.includes("pianoGrid.addEventListener('wheel'")&&html.includes('pianoGrid.scrollLeft+=e.deltaY||e.deltaX')&&html.includes('pianoApplyZoom'),
 'sequencer wheel navigation':html.includes("sequencerScroller.addEventListener('wheel'")&&html.includes('sequencerScroller.scrollLeft+=e.deltaY||e.deltaX'),
 'sequencer follows playhead':html.includes('const seqScroll=tracksEl?.parentElement,lead=cells&&cells[0]')&&html.includes('cr.right>sr.right-24'),
 'mixer pad/sub/track sections scroll':html.includes('mixerSubmixRow')&&html.includes('for(const row of [mixerPadRow,mixerSubmixRow,mixerTrackRow])')&&html.includes('id="mixerGoTracks"'),
 'mixer individual strips scroll vertically':html.includes('max-height:620px; overflow-y:auto; overflow-x:hidden; scrollbar-gutter:stable'),
 'insert editor scrolls':html.includes('.insert-edit-panel{width:min(640px,92vw);max-height:86vh;overflow:auto'),
 'detached piano one-cell default and transport':piano.includes('id="drawLength"')&&piano.includes('<option value="1" selected>1 cell</option>')&&piano.includes('id="play"')&&piano.includes('id="recplay"')&&piano.includes("send('recPlay')"),
 'detached piano shift wheel horizontal':piano.includes('if(e.shiftKey){e.preventDefault();viewport.scrollLeft+=e.deltaY||e.deltaX}'),
 'detached piano still resizes both note edges':piano.includes("resize?(resizeLeft?'resizeLeft':'resize')")&&piano.includes("d.mode==='resizeLeft'")
};
for(const [name,pass] of Object.entries(checks)){console.log((pass?'PASS':'FAIL')+' '+name);assert(pass,name)}
for(const [name,text] of [['P-12.html',html],['piano-detached.html',piano]]){
 const scripts=[...text.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(x=>x[1]).filter(Boolean);
 for(const [i,source] of scripts.entries())new vm.Script(source,{filename:`${name}-${i}`});
 console.log('PASS syntax '+name+' '+scripts.length+' scripts');
}
console.log('WORKFLOW UI REGRESSION PASSED');
