(()=>{
  const root=document.getElementById('weekly-ricochet-v2');
  const IS_CREATOR=root.dataset.mode==='creator';
  const $=s=>root.querySelector(s),$$=s=>Array.from(root.querySelectorAll(s));
  const DIRS=[[0,-1],[1,0],[0,1],[-1,0]],directionNames=['north','east','south','west'];
  const SPEED=1.2,MAX_COLORS=32;
  const surfaces={flat:'Flat',cylinder:'Cylinder',torus:'Torus',mobius:'Möbius strip',klein:'Klein bottle'};
  const surfaceRules={flat:'Flat: all four outer edges are walls.',cylinder:'Cylinder: left and right connect at the same row. Top and bottom are walls.',torus:'Torus: left/right and top/bottom connect without a twist.',mobius:'Möbius strip: left and right connect with reversed row numbers (1 ↔ 8, 2 ↔ 7, …). Top and bottom are walls.',klein:'Klein bottle: left and right connect with reversed row numbers; top and bottom connect without a twist.'};
  const BASE=Object.values(window.RICOCHET_PUBLISHED_PUZZLES||{});
  if(IS_CREATOR&&!BASE.length)BASE.push({"n": 8, "surface": "flat", "walls": [[36, 44], [45, 53], [36, 37], [53, 54], [48, 49], [49, 57], [37, 38], [8, 9], [51, 52], [32, 33], [54, 62], [44, 52], [21, 29], [34, 35], [42, 50], [18, 26], [54, 55], [27, 35], [9, 17], [48, 56], [38, 46], [35, 36], [10, 11], [42, 43], [44, 45]], "mirrors": [[28, "\\"], [53, "/"], [18, "/"], [9, "\\"], [14, "\\"]], "pieces": [8, 6, 1, 48], "id": "2026-10-05-flat", "date": "2026-10-05", "title": "A turn for the better", "target": 57});
  const PALETTE=[['Red','#bf3d49','#f67582'],['Blue','#2875b8','#75b9f0'],['Green','#277850','#69c798'],['Yellow','#9b700e','#ecc45d'],['Purple','#7952aa','#ba96ed'],['Orange','#b65a18','#f6a55e'],['Pink','#b74482','#ed91be'],['Teal','#237e88','#79d2da'],['Gray','#586779','#b7c3d3'],['Brown','#835b3e','#ccaa84'],['Indigo','#5158b3','#a3a9fa'],['Lime','#627c22','#bdcf78'],['Coral','#b05044','#ebaaa2'],['Cyan','#2479a1','#81c9ed'],['Plum','#854885','#d3a0d5'],['Mint','#367660','#8bceaf']].map(([name,light,dark])=>({name,light,dark}));
  function hslHex(h,s,l){const a=s*Math.min(l,1-l),f=n=>{const k=(n+h/30)%12,c=l-a*Math.max(-1,Math.min(k-3,9-k,1));return Math.round(255*c).toString(16).padStart(2,'0');};return '#'+f(0)+f(8)+f(4);}
  function defaultColor(i){return PALETTE[i]?{...PALETTE[i]}:{name:'Color '+(i+1),light:hslHex((i*137.508)%360,.48,.39),dark:hslHex((i*137.508)%360,.6,.72)};}
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const edgeKey=(a,b)=>a<b?`${a}:${b}`:`${b}:${a}`;
  const point=cell=>({x:cell%8,y:Math.floor(cell/8)}),center=p=>({x:36+(p.x+.5)*50,y:36+(p.y+.5)*50});
  function step(n,surface,cell,direction){let x=cell%n,y=Math.floor(cell/n),[dx,dy]=DIRS[direction];x+=dx;y+=dy;let seam=false;
    if(x<0||x>=n){if(surface==='flat')return null;x=(x+n)%n;seam=true;if(surface==='mobius'||surface==='klein'){y=n-1-y;dy=-dy;}}
    if(y<0||y>=n){if(surface==='flat'||surface==='cylinder'||surface==='mobius')return null;y=(y+n)%n;seam=true;}
    return {cell:y*n+x,direction:DIRS.findIndex(d=>d[0]===dx&&d[1]===dy),seam};
  }
  function compile(p){return {...p,wallSet:new Set(p.walls.map(w=>edgeKey(...w))),mirrorMap:new Map(p.mirrors)};}
  function slide(board,pieces,robot,direction,trace=false){const start=pieces[robot],occupied=new Set(pieces.filter((_,i)=>i!==robot));let cell=start,dir=direction,states=new Set(),traveled=false,path=trace?[{cell,direction:dir,seam:false}]:null;
    for(;;){const key=cell*4+dir;if(states.has(key))return {ok:false,reason:'loop'};states.add(key);const next=step(board.n,board.surface,cell,dir);
      if(!next||board.wallSet.has(edgeKey(cell,next.cell))||occupied.has(next.cell)){if(board.mirrorMap.has(cell))return {ok:false,reason:'bumper'};if(!traveled)return {ok:false,reason:'blocked'};return {ok:true,cell,path};}
      cell=next.cell;dir=next.direction;traveled=true;const mirror=board.mirrorMap.get(cell);if(mirror)dir=mirror==='/'?[1,0,3,2][dir]:[3,2,1,0][dir];if(trace)path.push({cell,direction:dir,seam:next.seam,bumper:!!mirror});
    }
  }
  const isCell=x=>Number.isInteger(x)&&x>=0&&x<64;
  function hash(text,offset=2166136261){let h=offset;for(let i=0;i<text.length;i++)h=Math.imul(h^text.charCodeAt(i),16777619);return (h>>>0).toString(16).padStart(8,'0');}
  function pack(p){return [1,8,p.surface,p.walls,p.mirrors,p.pieces,p.colors.map(c=>[c.name,c.light,c.dark]),p.targetIndex,p.target,p.title,p.date,p.seed];}
  const signature=p=>JSON.stringify(pack(p));
  function normalize(raw,keepId=false){
    if(!raw||raw.n!==8||!Object.hasOwn(surfaces,raw.surface))throw Error('Use an 8 × 8 board with a supported surface.');
    if(!Array.isArray(raw.pieces)||raw.pieces.length<1||raw.pieces.length>MAX_COLORS||!raw.pieces.every(isCell)||new Set(raw.pieces).size!==raw.pieces.length)throw Error('Use 1–32 pieces on distinct grid spaces.');
    const colors=raw.colors||raw.pieces.map((_,i)=>defaultColor(i));
    if(!Array.isArray(colors)||colors.length!==raw.pieces.length||colors.some(c=>!c||typeof c.name!=='string'||!c.name.trim()||c.name.length>24||!/^#[a-f0-9]{6}$/i.test(c.light)||!/^#[a-f0-9]{6}$/i.test(c.dark)))throw Error('Each piece needs a label and valid light/dark colors.');
    if(!Array.isArray(raw.mirrors)||raw.mirrors.length>64||raw.mirrors.some(m=>!Array.isArray(m)||m.length!==2||!isCell(m[0])||!['/','\\'].includes(m[1]))||new Set(raw.mirrors.map(m=>m[0])).size!==raw.mirrors.length)throw Error('Bumpers must use distinct grid spaces and / or \\ orientations.');
    if(raw.pieces.some(c=>raw.mirrors.some(m=>m[0]===c)))throw Error('A starting piece cannot occupy a bumper.');
    const targetIndex=raw.targetIndex??0;
    if(!Number.isInteger(targetIndex)||targetIndex<0||targetIndex>=raw.pieces.length||!isCell(raw.target)||raw.mirrors.some(m=>m[0]===raw.target))throw Error('Choose a target piece and a goal space without a bumper.');
    if(raw.pieces[targetIndex]===raw.target)throw Error('The target piece must start away from its goal.');
    if(!Array.isArray(raw.walls)||raw.walls.length>256)throw Error('Invalid wall list.');
    const walls=[],seen=new Set();for(const w of raw.walls){if(!Array.isArray(w)||w.length!==2||!w.every(isCell)||!DIRS.some((_,d)=>step(8,raw.surface,w[0],d)?.cell===w[1]))throw Error('Walls must separate adjacent spaces on this surface.');const sorted=w[0]<w[1]?[w[0],w[1]]:[w[1],w[0]],key=edgeKey(...sorted);if(!seen.has(key)){seen.add(key);walls.push(sorted);}}
    if(typeof raw.title!=='string'||!raw.title.trim()||raw.title.length>80)throw Error('Give the puzzle a title of 1–80 characters.');
    if(typeof raw.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(raw.date)||!Number.isFinite(Date.parse(raw.date+'T12:00:00Z'))||new Date(raw.date+'T12:00:00Z').toISOString().slice(0,10)!==raw.date)throw Error('Choose a valid puzzle date.');
    if(raw.seed!==undefined&&(typeof raw.seed!=='string'||raw.seed.length>120))throw Error('Seeds can contain up to 120 characters.');
    const p={n:8,surface:raw.surface,walls:walls.sort((a,b)=>a[0]-b[0]||a[1]-b[1]),mirrors:raw.mirrors.map(m=>m.slice()).sort((a,b)=>a[0]-b[0]),pieces:raw.pieces.slice(),colors:colors.map(c=>({name:c.name.trim(),light:c.light.toLowerCase(),dark:c.dark.toLowerCase()})),targetIndex,target:raw.target,title:raw.title.trim(),date:raw.date,seed:(raw.seed||'').trim()};
    const sig=signature(p);p.id=keepId?raw.id:'custom-'+hash(sig)+'-'+hash(sig,3339675911);return p;
  }
  function encodePuzzle(raw){const p=normalize(raw),json=signature(p),bytes=new TextEncoder().encode(json);let binary='';for(const b of bytes)binary+=String.fromCharCode(b);return 'RP1.'+btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')+'.'+hash(json);}
  function decodePuzzle(input){const code=String(input).replace(/\s/g,'');if(code.length>20000)throw Error('That puzzle code is too long.');const m=code.match(/^RP1\.([A-Za-z0-9_-]+)\.([a-f0-9]{8})$/i);if(!m)throw Error('Paste a complete puzzle code starting with RP1.');let data,json;
    try{let b64=m[1].replace(/-/g,'+').replace(/_/g,'/');b64+='='.repeat((4-b64.length%4)%4);const binary=atob(b64);json=new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(binary,c=>c.charCodeAt(0)));if(hash(json)!==m[2].toLowerCase())throw Error('checksum');data=JSON.parse(json);}catch(_){throw Error('That code is damaged or incomplete. Copy the full code again.');}
    if(!Array.isArray(data)||data.length!==12||data[0]!==1||!Array.isArray(data[6])||data[6].some(c=>!Array.isArray(c)||c.length!==3))throw Error('Unsupported puzzle-code format.');
    return normalize({n:data[1],surface:data[2],walls:data[3],mirrors:data[4],pieces:data[5],colors:data[6].map(([name,light,dark])=>({name,light,dark})),targetIndex:data[7],target:data[8],title:data[9],date:data[10],seed:data[11]});
  }
  function random(seed){let state=parseInt(hash(seed),16);return ()=>{state|=0;state=state+0x6D2B79F5|0;let t=Math.imul(state^state>>>15,1|state);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
  function generatePuzzle({seed,surface,count,targetIndex,title,date}){
    if(typeof seed!=='string'||!seed.trim()||seed.length>120)throw Error('Enter a generation seed of 1–120 characters.');
    if(!Object.hasOwn(surfaces,surface)||!Number.isInteger(count)||count<1||count>MAX_COLORS||!Number.isInteger(targetIndex)||targetIndex<0||targetIndex>=count)throw Error('Choose a supported surface, 1–32 colors and a target piece.');
    seed=seed.trim().normalize('NFC');const rnd=random(JSON.stringify(['generator-1',seed,surface,count,targetIndex])),pick=k=>Math.floor(rnd()*k);
    for(let attempt=0;attempt<30;attempt++){
      const walls=[],seen=new Set();while(walls.length<25){const x=pick(7),y=pick(7),a=y*8+x,b=a+(pick(2)?1:8),key=edgeKey(a,b);if(!seen.has(key)){seen.add(key);walls.push([a,b]);}}
      const mirrors=[],used=new Set();while(mirrors.length<5){const c=(1+pick(6))*8+1+pick(6);if(!used.has(c)){used.add(c);mirrors.push([c,pick(2)?'/':'\\']);}}
      const available=Array.from({length:64},(_,i)=>i).filter(c=>!used.has(c));for(let i=available.length-1;i>0;i--){const j=pick(i+1);[available[i],available[j]]=[available[j],available[i]];}
      const initial=available.slice(0,count),p={n:8,surface,walls,mirrors,pieces:initial,colors:initial.map((_,i)=>defaultColor(i)),targetIndex,title,date,seed},b=compile(p);
      const trivial=new Set();for(let d=0;d<4;d++){const r=slide(b,initial,targetIndex,d);if(r.ok)trivial.add(r.cell);}
      const path=[],pos=initial.slice(),recent=[pos.join(',')];let candidate=null,fallback=null;
      for(let k=0;k<24;k++){
        const moves=[];for(let robot=0;robot<count;robot++)for(let dir=0;dir<4;dir++){const r=slide(b,pos,robot,dir);if(r.ok&&r.cell!==pos[robot]){const next=pos.slice();next[robot]=r.cell;if(!recent.slice(-4).includes(next.join(',')))moves.push({robot,dir,cell:r.cell});}}
        if(!moves.length)break;const goalMoves=moves.filter(m=>m.robot===targetIndex),choices=goalMoves.length&&rnd()<.4?goalMoves:moves,move=choices[pick(choices.length)];pos[move.robot]=move.cell;path.push([move.robot,move.dir]);recent.push(pos.join(','));
        if(pos[targetIndex]!==initial[targetIndex]){fallback={goal:pos[targetIndex],path:path.map(m=>m.slice())};if(k>=5&&!trivial.has(pos[targetIndex]))candidate=fallback;}
      }
      const result=candidate||fallback;if(result)return {puzzle:normalize({...p,target:result.goal}),witness:result.path};
    }
    throw Error('This seed did not produce a usable goal. Try a different seed.');
  }
  const archiveKey='griffin-ricochet-custom-puzzles-v1',scoreKey='griffin-ricochet-prototype-v1';
  let archive=[],storageAvailable=true,records=[];
  for(const raw of BASE){try{const p=normalize(raw);if(!archive.some(q=>signature(q)===signature(p)))archive.push(p);}catch(e){console.warn('Skipped an invalid published puzzle:',e.message);}}
  const publishedSignatures=new Set(archive.map(signature));
  try{const data=JSON.parse(localStorage.getItem(archiveKey)||'[]');if(Array.isArray(data))for(const raw of data.slice(0,500)){try{const p=normalize(raw);if(!archive.some(q=>signature(q)===signature(p)))archive.push(p);}catch(_){}}}catch(_){storageAvailable=false;}
  try{const data=JSON.parse(localStorage.getItem(scoreKey)||'[]');if(Array.isArray(data))records=data.filter(r=>r&&archive.some(p=>p.id===r.puzzle)&&/^[A-Z]{3}$/.test(r.name)&&Number.isInteger(r.score)&&r.score>0&&Number.isFinite(Date.parse(r.achieved)));}catch(_){storageAvailable=false;}
  if(!archive.length){root.innerHTML='<h2>No puzzles available yet</h2><p>Add a valid puzzle JSON file to _data/ricochet_puzzles/ and rebuild the website.</p>';return;}
  let current,board,pieces,selected=0,history=[],busy=false,won=false,submitted=false,solvedAt=null,lastPath=null,animationPoint=null;
  let mode='play',draft=null,lastPlayId=archive[0].id,checkToken=0,checking=false,knownRoute=null;
  const reasons={loop:'That route loops forever, so it cannot be played.',bumper:'That route would stop on a bumper, so it cannot be played.',blocked:'That direction is blocked.'};
  const clone=p=>JSON.parse(JSON.stringify(p));
  const names=()=>current.colors.map(c=>c.name),color=i=>`var(--rp-robot-${i})`;
  const keyFor=i=>i<9?String(i+1):i===9?'0':null;
  function status(text){$('#rp-status').textContent=text;$('#rp-status').dataset.won=String(won);}
  function creatorStatus(text){$('#rp-creator-status').textContent=text;}
  function codeStatus(text){$('#rp-code-status').textContent=text;}
  const localHelp=()=>storageAvailable?'Finish the puzzle to save your score. Scores are local to this browser.':'Finish the puzzle to save your score. Scores are kept only while this page stays open.';
  function dateLabel(date){return new Date(date+'T12:00:00Z').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'});}
  function renderArchive(){archive.sort((a,b)=>b.date.localeCompare(a.date));$('#rp-week').innerHTML=archive.map(p=>`<option value="${escape(p.id)}">${dateLabel(p.date)} · ${escape(p.title)}${publishedSignatures.has(signature(p))?'':' (local draft)'} · ${surfaces[p.surface]}</option>`).join('');if(mode==='play'&&current)$('#rp-week').value=current.id;}
  function renderPieces(){current.colors.forEach((c,i)=>root.style.setProperty('--rp-robot-'+i,`light-dark(${c.light}, ${c.dark})`));$('#rp-pieces').innerHTML=current.colors.map((c,i)=>`<button type="button" data-piece="${i}" aria-pressed="${i===selected}" ${keyFor(i)?`aria-keyshortcuts="${keyFor(i)}"`:''} class="cursor-interaction"><span class="rp-key">${i+1}</span><span class="rp-dot" style="--piece:${color(i)}"></span>${escape(c.name)}</button>`).join('');
    const count=current.pieces.length;$('#rp-shortcuts').textContent=(count===1?'1 selects the piece':count<10?`1–${count} select colors`:'1–9 select colors · 0 selects 10')+(count>10?' · [ / ] cycle':'')+(mode==='play'?' · arrow keys slide · Ctrl/⌘+Z undo':' · choose a piece to place');
  }
  function drawBoard(){const targetName=names()[current.targetIndex];let out=`<title>${escape(current.title)} — ${surfaces[current.surface]}</title><desc>8 by 8 square board with ${pieces.length} pieces. Goal: ${escape(targetName)} must stop at row ${Math.floor(current.target/8)+1}, column ${current.target%8+1}.</desc>`;
    for(let y=0;y<8;y++)for(let x=0;x<8;x++)out+=`<rect x="${36+x*50}" y="${36+y*50}" width="50" height="50" class="rp-grid ${(x+y)%2?'rp-cell-alt':'rp-cell'}"/>`;
    const twist=current.surface==='mobius'||current.surface==='klein',wrapX=current.surface!=='flat',wrapY=current.surface==='torus'||current.surface==='klein';
    for(let i=0;i<8;i++){const c=61+i*50;out+=`<text x="${c}" y="23" text-anchor="middle" class="rp-axis">${i+1}</text><text x="${c}" y="454" text-anchor="middle" class="rp-axis">${i+1}</text><text x="21" y="${c+4}" text-anchor="middle" class="rp-axis">${i+1}</text><text x="452" y="${c+4}" text-anchor="middle" class="rp-axis">${twist?8-i:i+1}</text>`;}
    out+=`<path d="M36 36 L36 436 M436 36 L436 436" class="${wrapX?'rp-seam':'rp-wall'}" fill="none"/><path d="M36 36 L436 36 M36 436 L436 436" class="${wrapY?'rp-seam':'rp-wall'}" fill="none"/>`;
    const goal=center(point(current.target));out+=`<circle cx="${goal.x}" cy="${goal.y}" r="18" fill="none" stroke="${color(current.targetIndex)}" stroke-width="2" stroke-dasharray="4 3"/><circle cx="${goal.x}" cy="${goal.y}" r="6" fill="${color(current.targetIndex)}" opacity=".65"/>`;
    for(const [a,b] of current.walls){const pa=point(a),pb=point(b);let x1,y1,x2,y2;
      if(pa.y===pb.y&&Math.abs(pa.x-pb.x)===1){x1=x2=36+Math.max(pa.x,pb.x)*50;y1=36+pa.y*50;y2=y1+50;}
      else if(pa.x===pb.x&&Math.abs(pa.y-pb.y)===1){y1=y2=36+Math.max(pa.y,pb.y)*50;x1=36+pa.x*50;x2=x1+50;}
      if(x1!==undefined)out+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="rp-wall"/>`;
      else if(Math.abs(pa.x-pb.x)===7&&wrapX){for(const p of [pa,pb]){const x=p.x===0?36:436,y=36+p.y*50;out+=`<line x1="${x}" y1="${y}" x2="${x}" y2="${y+50}" class="rp-wall"/>`;}}
      else if(Math.abs(pa.y-pb.y)===7&&wrapY){for(const p of [pa,pb]){const x=36+p.x*50,y=p.y===0?36:436;out+=`<line x1="${x}" y1="${y}" x2="${x+50}" y2="${y}" class="rp-wall"/>`;}}
    }
    for(const [cell,kind] of current.mirrors){const c=center(point(cell));out+=`<line x1="${c.x-14}" y1="${c.y+(kind==='/'?14:-14)}" x2="${c.x+14}" y2="${c.y+(kind==='/'?-14:14)}" class="rp-bumper"/>`;}
    if(lastPath){let d='';for(let i=0;i<lastPath.length;i++){const c=center(point(lastPath[i].cell));d+=`${i===0||lastPath[i].seam?'M':'L'}${c.x},${c.y} `;}out+=`<path d="${d}" fill="none" stroke="var(--rp-trail)" stroke-width="2.5" stroke-dasharray="3 4" opacity=".7"/>`;}
    pieces.forEach((cell,i)=>{const c=center(i===selected&&animationPoint?animationPoint:point(cell));let shape='';
      if(i%4===0)shape=`<circle cx="${c.x}" cy="${c.y}" r="16" fill="${color(i)}" class="rp-token"/>`;
      if(i%4===1)shape=`<rect x="${c.x-15}" y="${c.y-15}" width="30" height="30" rx="5" fill="${color(i)}" class="rp-token"/>`;
      if(i%4===2)shape=`<polygon points="${c.x-16},${c.y} ${c.x-8},${c.y-14} ${c.x+8},${c.y-14} ${c.x+16},${c.y} ${c.x+8},${c.y+14} ${c.x-8},${c.y+14}" fill="${color(i)}" class="rp-token"/>`;
      if(i%4===3)shape=`<polygon points="${c.x},${c.y-19} ${c.x+19},${c.y} ${c.x},${c.y+19} ${c.x-19},${c.y}" fill="${color(i)}" class="rp-token"/>`;
      out+=`<g data-robot="${i}" class="cursor-interaction" aria-label="${escape(names()[i])}, piece ${i+1}, row ${Math.floor(cell/8)+1}, column ${cell%8+1}"><circle cx="${c.x}" cy="${c.y}" r="24" fill="transparent"/>${i===selected?`<circle cx="${c.x}" cy="${c.y}" r="22" class="rp-selection"/>`:''}${shape}<text x="${c.x}" y="${c.y}" class="rp-token-text">${i+1}</text></g>`;
    });
    $('#rp-board-svg').innerHTML=out;$('#rp-board-svg').setAttribute('aria-label',`${surfaces[current.surface]} ${mode==='create'?'editor':'puzzle'}. ${targetName} target row ${Math.floor(current.target/8)+1}, column ${current.target%8+1}. Pieces: ${pieces.map((c,i)=>`${names()[i]}, number ${i+1}, row ${Math.floor(c/8)+1} column ${c%8+1}`).join('; ')}.`);
  }
  function updateControls(){const creating=mode==='create';$('#rp-creator').hidden=!creating;$('#rp-editor-actions').hidden=!creating;$('#rp-dpad').hidden=creating;$('#rp-play-actions').hidden=creating;$('#rp-leaderboard').hidden=creating;
    $('#rp-play-mode').setAttribute('aria-pressed',String(!creating));$('#rp-create-mode').setAttribute('aria-pressed',String(creating));$('#rp-play-mode').disabled=busy;$('#rp-create-mode').disabled=busy;
    $('#rp-moves').textContent=history.length;$('#rp-score').value=won?history.length:'';$('#rp-undo').disabled=busy||history.length===0;$('#rp-reset').disabled=busy||history.length===0;$('#rp-week').disabled=busy||creating;
    $$('[data-piece]').forEach(b=>{b.setAttribute('aria-pressed',String(+b.dataset.piece===selected));b.disabled=busy;});
    $$('[data-direction]').forEach(b=>{const dir=+b.dataset.direction,result=slide(board,pieces,selected,dir);b.disabled=busy||creating||won||!result.ok;b.setAttribute('aria-label',`Move ${names()[selected].toLowerCase()} ${directionNames[dir]}${!result.ok?': '+reasons[result.reason]:''}`);});
    $('#rp-submit').disabled=busy||creating||!won||submitted;$('#rp-check').disabled=checking;$('#rp-load-code').disabled=busy;$('#rp-get-code').disabled=busy;
    $('#rp-title').textContent=current.title||'Untitled puzzle';$('#rp-surface').textContent=surfaces[current.surface];$('#rp-surface-rule').textContent=surfaceRules[current.surface];$('#rp-goal-rule').textContent=`Stop ${names()[current.targetIndex]} (piece ${current.targetIndex+1}) on its matching target. Every piece’s slide counts as one move. Passing through the target does not finish the puzzle.`;
  }
  function drawScores(){const rows=records.filter(r=>r.puzzle===current.id).sort((a,b)=>a.score-b.score||Date.parse(a.achieved)-Date.parse(b.achieved));$('#rp-empty').hidden=rows.length>0;$('#rp-table-wrap').hidden=rows.length===0;let place=0;
    $('#rp-scores').innerHTML=rows.map((r,i)=>{if(i===0||r.score!==rows[i-1].score)place=i+1;return `<tr><td class="rp-numeric">${place}</td><td>${escape(r.name)}</td><td class="rp-numeric">${r.score}</td><td><time datetime="${escape(r.achieved)}">${escape(new Date(r.achieved).toLocaleString(undefined,{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'}))}</time></td></tr>`;}).join('');
  }
  function updateCode(){try{$('#rp-code').value=encodePuzzle(current);$('#rp-add').disabled=false;$('#rp-copy-code').disabled=false;$('#rp-download').disabled=false;}catch(e){$('#rp-code').value='';$('#rp-add').disabled=true;$('#rp-copy-code').disabled=true;$('#rp-download').disabled=true;creatorStatus(e.message);}}
  function cancelCheck(){checkToken++;checking=false;}
  function load(id,focus=false){cancelCheck();current=archive.find(p=>p.id===id)||archive[0];lastPlayId=current.id;mode='play';board=compile(current);pieces=current.pieces.slice();selected=0;history=[];busy=false;won=false;submitted=false;solvedAt=null;lastPath=null;animationPoint=null;
    renderArchive();renderPieces();$('#rp-score-help').textContent=localHelp();status(`Stop ${names()[current.targetIndex]} on its target. Every piece can help.`);drawBoard();updateControls();drawScores();updateCode();if(focus)$('[data-piece="0"]').focus({preventScroll:true});
  }
  function choose(i,focus=false){if(busy||!Number.isInteger(i)||i<0||i>=pieces.length)return;selected=i;lastPath=null;drawBoard();updateControls();if(mode==='create')updateToolHelp();else if(!won)status(`${names()[i]} · piece ${i+1} selected. Choose an available direction.`);if(focus)$(`[data-piece="${i}"]`).focus({preventScroll:true});}
  function animationDuration(path){return Math.min(90*(path.length-1),1200)/SPEED;}
  function animate(path,done){if(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches){done();return;}const total=animationDuration(path),segments=path.length-1;let started=null;
    function frame(t){if(started===null)started=t;const elapsed=t-started;if(elapsed>=total){animationPoint=null;done();return;}const progress=elapsed/total*segments,index=Math.min(segments-1,Math.floor(progress)),fraction=progress-index,a=point(path[index].cell),b=point(path[index+1].cell);animationPoint=path[index+1].seam?(fraction<.5?a:b):{x:a.x+(b.x-a.x)*fraction,y:a.y+(b.y-a.y)*fraction};drawBoard();requestAnimationFrame(frame);}requestAnimationFrame(frame);
  }
  function move(dir){if(mode!=='play'||busy||won)return;const result=slide(board,pieces,selected,dir,true);if(!result.ok){status(reasons[result.reason]);return;}const robot=selected;history.push({pieces:pieces.slice(),robot,dir});busy=true;lastPath=result.path;status(`${names()[robot]} sliding ${directionNames[dir]}…`);updateControls();animate(result.path,()=>{pieces[robot]=result.cell;busy=false;won=pieces[current.targetIndex]===current.target;if(won){solvedAt=new Date().toISOString();status(`Solved in ${history.length} moves. Add your three letters to the scoreboard.`);$('#rp-score-help').textContent='Your score is this solution’s move count. Achieved time is recorded when you finish.';}else status(`${names()[robot]} stopped at row ${Math.floor(result.cell/8)+1}, column ${result.cell%8+1}.`);drawBoard();updateControls();});}
  function syncCreatorFields(){if(!draft)return;$('#rp-creator-title').value=draft.title;$('#rp-creator-date').value=draft.date;$('#rp-creator-seed').value=draft.seed||'my-weekly-puzzle';$('#rp-creator-surface').value=draft.surface;$('#rp-creator-count').value=draft.pieces.length;syncTargetOptions();updateToolHelp();}
  function syncTargetOptions(){$('#rp-creator-target').innerHTML=draft.colors.map((c,i)=>`<option value="${i}">${i+1} · ${escape(c.name)}</option>`).join('');$('#rp-creator-target').value=draft.targetIndex;}
  function refreshDraft(message){cancelCheck();current=draft;mode='create';board=compile(draft);pieces=draft.pieces.slice();selected=Math.min(selected,pieces.length-1);history=[];won=false;busy=false;submitted=false;solvedAt=null;lastPath=null;animationPoint=null;renderPieces();drawBoard();updateControls();updateCode();updateToolHelp();status('Editing starting board.');if(message&&!$('#rp-add').disabled)creatorStatus(message);}
  function enterCreator(){if(busy)return;cancelCheck();if(!draft){draft=clone(current);draft.title=(current.title+' · remix').slice(0,80);knownRoute=null;}syncCreatorFields();refreshDraft('Edit this board, or enter a seed and generate a new one.');}
  function updateToolHelp(){if(mode!=='create')return;const tool=$('#rp-creator-tool').value;$('#rp-edge-label').hidden=tool!=='wall';$('#rp-edit-help').textContent=({wall:'Click near a grid line to toggle a wall. Matching seam walls appear on both connected edges.',slash:'Click a space to add or remove a / bumper.',backslash:'Click a space to add or remove a \\ bumper.',piece:`Select a numbered color, then click its starting space. Currently placing ${names()[selected]} (${selected+1}).`,goal:`Click the goal space for ${names()[draft.targetIndex]} (${draft.targetIndex+1}).`})[tool];}
  function editCell(cell,tool,edge=1){if(mode!=='create'||!isCell(cell))return;cancelCheck();let message='Board edited. Check solvability before sharing.';
    if(tool==='wall'){const next=step(8,draft.surface,cell,edge);if(!next){creatorStatus('That outer edge is already a wall on this surface.');return;}const key=edgeKey(cell,next.cell),index=draft.walls.findIndex(w=>edgeKey(...w)===key);if(index<0)draft.walls.push([cell,next.cell]);else draft.walls.splice(index,1);}
    else if(tool==='slash'||tool==='backslash'){if(draft.pieces.includes(cell)||draft.target===cell){creatorStatus('Move the piece or goal away before adding a bumper here.');return;}const kind=tool==='slash'?'/':'\\',index=draft.mirrors.findIndex(m=>m[0]===cell);if(index<0)draft.mirrors.push([cell,kind]);else if(draft.mirrors[index][1]===kind)draft.mirrors.splice(index,1);else draft.mirrors[index][1]=kind;}
    else if(tool==='piece'){if(draft.mirrors.some(m=>m[0]===cell)||draft.pieces.some((c,i)=>i!==selected&&c===cell)){creatorStatus('Choose a space without another piece or a bumper.');return;}draft.pieces[selected]=cell;}
    else if(tool==='goal'){if(draft.mirrors.some(m=>m[0]===cell)){creatorStatus('The goal cannot occupy a bumper.');return;}draft.target=cell;}
    knownRoute=null;refreshDraft(message);
  }
  function addPuzzle(raw){const p=normalize(raw),sig=signature(p),existing=archive.find(q=>signature(q)===sig);if(existing)return existing;archive.push(p);try{localStorage.setItem(archiveKey,JSON.stringify(archive.filter(q=>!publishedSignatures.has(signature(q)))));}catch(_){storageAvailable=false;}renderArchive();return p;}
  function resizeDraft(count){if(!Number.isInteger(count)||count<1||count>MAX_COLORS){$('#rp-creator-count').value=draft.pieces.length;creatorStatus('Choose between 1 and 32 colors.');return;}const occupied=new Set([...draft.pieces,...draft.mirrors.map(m=>m[0]),draft.target]);while(draft.pieces.length<count){const free=Array.from({length:64},(_,i)=>i).find(c=>!occupied.has(c));if(free===undefined)throw Error('No space remains for another piece.');occupied.add(free);draft.pieces.push(free);draft.colors.push(defaultColor(draft.colors.length));}draft.pieces=draft.pieces.slice(0,count);draft.colors=draft.colors.slice(0,count);draft.targetIndex=Math.min(draft.targetIndex,count-1);knownRoute=null;syncTargetOptions();refreshDraft('Color count updated. Starting spaces can be moved with the Starting piece tool.');}
  async function checkSolvability(){if(mode!=='create'||checking)return;let p;try{p=normalize(draft);}catch(e){creatorStatus(e.message);return;}checking=true;const token=++checkToken;updateControls();creatorStatus('Checking starting board…');
    const b=compile(p),queue=[{pos:p.pieces.slice(),depth:0}],seen=new Set([p.pieces.join(',')]);let cursor=0,answer=null,exhausted=false;const deadline=Date.now()+3000,limit=50000;
    while(cursor<queue.length&&seen.size<limit&&Date.now()<deadline&&checkToken===token){const stop=Math.min(queue.length,cursor+300);while(cursor<stop&&seen.size<limit){const {pos,depth}=queue[cursor++];if(pos[p.targetIndex]===p.target){answer=depth;break;}for(let r=0;r<pos.length;r++)for(let d=0;d<4;d++){const result=slide(b,pos,r,d);if(!result.ok)continue;const next=pos.slice();next[r]=result.cell;const key=next.join(',');if(!seen.has(key)){seen.add(key);queue.push({pos:next,depth:depth+1});}}}if(answer!==null)break;await new Promise(resolve=>setTimeout(resolve,0));}
    if(checkToken!==token)return;exhausted=cursor>=queue.length;checking=false;updateControls();creatorStatus(answer!==null?`Solvable. Shortest solution: ${answer} moves.`:exhausted?'No solution exists for this starting board.':`No solution found within the search limit (${seen.size.toLocaleString()} states). This does not prove the puzzle is impossible.`);
  }
  $('#rp-pieces').addEventListener('click',e=>{const b=e.target.closest('[data-piece]');if(b)choose(+b.dataset.piece);});
  $$('[data-direction]').forEach(b=>b.addEventListener('click',()=>move(+b.dataset.direction)));
  $('#rp-board-svg').addEventListener('click',e=>{if(mode==='play'){const g=e.target.closest('[data-robot]');if(g)choose(+g.dataset.robot,true);return;}const rect=$('#rp-board-svg').getBoundingClientRect(),x=(e.clientX-rect.left)*472/rect.width,y=(e.clientY-rect.top)*472/rect.height;if(x<36||x>436||y<36||y>436)return;const cx=Math.min(7,Math.floor((x-36)/50)),cy=Math.min(7,Math.floor((y-36)/50)),cell=cy*8+cx;$('#rp-edit-row').value=cy+1;$('#rp-edit-col').value=cx+1;const tool=$('#rp-creator-tool').value;
    if(tool==='wall'){const fx=(x-36)/50-cx,fy=(y-36)/50-cy,distances=[fy,1-fx,1-fy,fx],distance=Math.min(...distances);if(distance>.28){creatorStatus('Click closer to a grid line, or use the row/column/edge controls.');return;}const edge=distances.indexOf(distance);$('#rp-edit-edge').value=edge;editCell(cell,tool,edge);}else editCell(cell,tool);
  });
  $('#rp-week').addEventListener('change',e=>load(e.target.value,true));$('#rp-play-mode').addEventListener('click',()=>{if(!busy)load(lastPlayId,true);});$('#rp-create-mode').addEventListener('click',enterCreator);
  $('#rp-undo').addEventListener('click',()=>{if(busy||!history.length||mode!=='play')return;const previous=history.pop();pieces=previous.pieces;selected=previous.robot;won=false;submitted=false;solvedAt=null;lastPath=null;$('#rp-score-help').textContent=localHelp();status('Last move undone.');drawBoard();updateControls();});
  $('#rp-reset').addEventListener('click',()=>{if(!busy&&mode==='play')load(current.id,true);});
  // Listen throughout this game's frame, rather than requiring focus inside its
  // board. Preserve typing, native pickers, browser shortcuts and other widgets.
  document.addEventListener('keydown',e=>{if(e.defaultPrevented||e.altKey||e.isComposing||e.target.closest?.('input,select,textarea,[contenteditable]')||(e.target!==document.body&&e.target!==document.documentElement&&!root.contains(e.target)))return;
    if((e.ctrlKey||e.metaKey)&&!e.shiftKey&&e.key.toLowerCase()==='z'&&mode==='play'){e.preventDefault();$('#rp-undo').click();return;}
    if(e.ctrlKey||e.metaKey)return;
    const keys={ArrowUp:0,ArrowRight:1,ArrowDown:2,ArrowLeft:3};if(Object.hasOwn(keys,e.key)&&mode==='play'){e.preventDefault();move(keys[e.key]);}
    else if(/^[0-9]$/.test(e.key)){const i=e.key==='0'?9:+e.key-1;if(i<pieces.length){e.preventDefault();choose(i,true);}}
    else if(e.key==='['||e.key===']'){e.preventDefault();choose((selected+(e.key===']'?1:pieces.length-1))%pieces.length,true);}
    else if(e.key.toLowerCase()==='z'&&mode==='play'){e.preventDefault();$('#rp-undo').click();}
  });
  $('#rp-initials').addEventListener('input',e=>{e.target.value=e.target.value.replace(/[^a-z]/gi,'').toUpperCase().slice(0,3);});
  $('#rp-score-form').addEventListener('submit',e=>{e.preventDefault();if(mode!=='play'||!won||submitted||busy)return;const name=$('#rp-initials').value.toUpperCase();if(!/^[A-Z]{3}$/.test(name)){$('#rp-score-help').textContent='Use exactly three letters, A–Z.';$('#rp-initials').focus();return;}if(!records.some(r=>r.puzzle===current.id&&r.name===name&&r.score===history.length&&r.achieved===solvedAt))records.push({puzzle:current.id,name,score:history.length,achieved:solvedAt});try{localStorage.setItem(scoreKey,JSON.stringify(records));}catch(_){storageAvailable=false;}submitted=true;updateControls();drawScores();$('#rp-score-help').textContent=storageAvailable?`Saved ${name} · ${history.length} moves. Scores are local to this browser.`:`Saved ${name} · ${history.length} moves for this open page. Copy your puzzle code to keep the board.`;});
  $('#rp-creator-tool').addEventListener('change',updateToolHelp);
  $('#rp-creator-title').addEventListener('input',e=>{draft.title=e.target.value;refreshDraft();});$('#rp-creator-date').addEventListener('change',e=>{draft.date=e.target.value;refreshDraft();});
  $('#rp-creator-count').addEventListener('change',e=>resizeDraft(Number(e.target.value)));
  $('#rp-creator-surface').addEventListener('change',e=>{draft.surface=e.target.value;draft.walls=draft.walls.filter(w=>DIRS.some((_,d)=>step(8,draft.surface,w[0],d)?.cell===w[1]));knownRoute=null;refreshDraft('Surface changed. Check solvability again before sharing.');});
  $('#rp-creator-target').addEventListener('change',e=>{draft.targetIndex=Number(e.target.value);knownRoute=null;refreshDraft('Target piece changed.');});
  $('#rp-generate').addEventListener('click',()=>{try{const result=generatePuzzle({seed:$('#rp-creator-seed').value,surface:$('#rp-creator-surface').value,count:Number($('#rp-creator-count').value),targetIndex:Number($('#rp-creator-target').value),title:$('#rp-creator-title').value,date:$('#rp-creator-date').value});draft=result.puzzle;knownRoute=result.witness;selected=0;syncCreatorFields();refreshDraft('Generated a solvable board. The same seed, surface, color count and target piece recreate it.');}catch(e){creatorStatus(e.message);}});
  $('#rp-clone').addEventListener('click',()=>{draft=clone(archive.find(p=>p.id===lastPlayId));draft.title=(draft.title+' · remix').slice(0,80);knownRoute=null;selected=0;syncCreatorFields();refreshDraft('Editing a copy of the current puzzle.');});
  $('#rp-apply-edit').addEventListener('click',()=>{const row=Number($('#rp-edit-row').value),col=Number($('#rp-edit-col').value);if(!Number.isInteger(row)||!Number.isInteger(col)||row<1||row>8||col<1||col>8){creatorStatus('Rows and columns must be integers from 1 to 8.');return;}editCell((row-1)*8+col-1,$('#rp-creator-tool').value,Number($('#rp-edit-edge').value));});
  $('#rp-check').addEventListener('click',checkSolvability);
  $('#rp-add').addEventListener('click',()=>{try{const p=addPuzzle(draft);load(p.id,true);status(storageAvailable?'Draft saved in this browser. Download its JSON in Create puzzle to publish it.':'Puzzle added for this open session. Copy its code to keep it.');}catch(e){creatorStatus(e.message);}});
  function exportPuzzle(raw){
    const {id,...definition}=normalize(raw);
    const slug=definition.title.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,50)||'puzzle';
    return {filename:definition.date+'-'+slug+'.json',text:JSON.stringify(definition,null,2)+'\n'};
  }
  $('#rp-download').addEventListener('click',()=>{
    try{const exported=exportPuzzle(draft),blob=new Blob([exported.text],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');
      link.href=url;link.download=exported.filename;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
      creatorStatus('Downloaded '+exported.filename+'. Add it to _data/ricochet_puzzles/ and commit/push to publish.');
    }catch(e){creatorStatus('Could not download: '+e.message);}
  });
  $('#rp-get-code').addEventListener('click',()=>{updateCode();codeStatus($('#rp-code').value?'Current starting board encoded. Copy this full code to save every detail.':'Finish correcting the puzzle before getting its code.');});
  $('#rp-copy-code').addEventListener('click',async()=>{const code=$('#rp-code').value.trim();if(!code){codeStatus('Get a puzzle code first.');return;}try{if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');await navigator.clipboard.writeText(code);codeStatus('Puzzle code copied. Paste it into Load code on another device.');}catch(_){$('#rp-code').focus();$('#rp-code').select();let copied=false;try{copied=document.execCommand?.('copy')||false;}catch(_){}codeStatus(copied?'Puzzle code copied.':'Code selected. Use your browser’s Copy command to keep it.');}});
  $('#rp-load-code').addEventListener('click',()=>{try{const p=addPuzzle(decodePuzzle($('#rp-code').value));load(p.id,true);codeStatus(storageAvailable?'Puzzle loaded and saved in your local archive.':'Puzzle loaded for this open session. Keep a copy of its code.');$('#rp-code-panel').open=true;}catch(e){codeStatus(e.message);}});
  if(typeof ResizeObserver==='function')new ResizeObserver(entries=>{const width=entries[0].contentRect.width;if(width>0)root.style.setProperty('--rp-svg-scale',String(472/width));}).observe($('.rp-board'));
  renderArchive();load(archive[0].id);if(IS_CREATOR){$('#rp-creator-intro').hidden=false;enterCreator();}
})();
