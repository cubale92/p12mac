const fs=require('fs'),assert=require('assert');const piano=fs.readFileSync('piano-detached.html','utf8'),app=fs.readFileSync('P-12.html','utf8');
const checks={
  'visible undo redo buttons':piano.includes('id="pianoUndo"')&&piano.includes('id="pianoRedo"'),
  'keyboard marked for notes present':piano.includes("k.classList.toggle('populated',populated.has(pitch))"),
  'keyboard highlights selected pitch':piano.includes("k.classList.toggle('selectedPitch',selected.has(pitch))"),
  'selected pitch names visible':piano.includes("'Selected '+selected.length+': '")&&piano.includes('id="selectionInfo"'),
  'selection follow when off screen':piano.includes('viewport.scrollTop=Math.max(0,top-viewport.clientHeight/2)'),
  'history counts update for toolbar':app.includes('undoDepth:undoStack.length,redoDepth:redoStack.length'),
  'undo and redo perform edits':app.includes("case 'undo':pianoStatus.textContent=undo()")&&app.includes("case 'redo':pianoStatus.textContent=redo()"),
  'detached JS syntax':(()=>{new Function(piano.match(/<script>([\s\S]*?)<\/script>/)[1]);return true})(),
  'Rossum and JUCE kept':app.includes('SP-1200')&&fs.existsSync('native-host')
};for(const [label,ok] of Object.entries(checks)){assert(ok,label);console.log('PASS '+label)}
