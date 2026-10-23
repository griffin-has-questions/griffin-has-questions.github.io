"use strict";
const RicochetEngine=(()=>{
  const DIRS=[[0,-1],[1,0],[0,1],[-1,0]],directionNames=['north','east','south','west'];
  const SPEED=1.2,MAX_COLORS=32;
  // Change these two values to expand the editor and accepted puzzle sizes.
  const BOARD_LIMITS=Object.freeze({min:4,max:12});
  const dimensions=p=>typeof p==='number'?{width:p,height:p}:{width:p.width??p.n,height:p.height??p.n};
  function validateDimensions(p,surface){const {width,height}=dimensions(p);
    if(![width,height].every(x=>Number.isInteger(x)&&x>=BOARD_LIMITS.min&&x<=BOARD_LIMITS.max))throw Error(`Width and height must each be ${BOARD_LIMITS.min}–${BOARD_LIMITS.max}.`);
    if(['cone','top'].includes(surface)&&width!==height)throw Error('Cone and Top need a square board so adjacent edges have the same number of cells.');
    if(surface==='pillow'&&width%2)throw Error('Pillow needs an even width to pair every column at its folded ends.');
    return {width,height};
  }
  const surfaces={flat:'Flat',cylinder:'Cylinder',torus:'Torus',mobius:'Möbius strip',klein:'Klein bottle',cone:'Cone',top:'Top',pillow:'Pillow'};
  const surfaceRules={flat:'Flat: all four outer edges are walls.',cylinder:'Cylinder: left and right connect at the same row. Top and bottom are walls.',torus:'Torus: left/right and top/bottom connect without a twist.',mobius:'Möbius strip: left and right connect with reversed row numbers. Top and bottom are walls.',klein:'Klein bottle: left and right connect with reversed row numbers; top and bottom connect without a twist.',cone:'Cone: top column k connects to left row k. Moving up exits from the left moving right; moving left exits from the top moving down. Right and bottom are walls.',top:'Top: top column k connects to left row k, as on Cone. Right row k also connects to bottom column k: moving right exits from the bottom moving up; moving down exits from the right moving left. Each crossing turns the piece by 90°.',pillow:'Pillow: left and right connect at the same row. The top folds onto itself, pairing the first column with the last, the second with the second-to-last, and so on; moving up returns moving down. The bottom folds separately with the same column pairs; moving down returns moving up. Top and bottom do not connect to each other.'};
  const PALETTE=[['Red','#bf3d49','#f67582'],['Blue','#2875b8','#75b9f0'],['Green','#277850','#69c798'],['Yellow','#9b700e','#ecc45d'],['Purple','#7952aa','#ba96ed'],['Orange','#b65a18','#f6a55e'],['Pink','#b74482','#ed91be'],['Teal','#237e88','#79d2da'],['Gray','#586779','#b7c3d3'],['Brown','#835b3e','#ccaa84'],['Indigo','#5158b3','#a3a9fa'],['Lime','#627c22','#bdcf78'],['Coral','#b05044','#ebaaa2'],['Cyan','#2479a1','#81c9ed'],['Plum','#854885','#d3a0d5'],['Mint','#367660','#8bceaf']].map(([name,light,dark])=>({name,light,dark}));
  function hslHex(h,s,l){const a=s*Math.min(l,1-l),f=n=>{const k=(n+h/30)%12,c=l-a*Math.max(-1,Math.min(k-3,9-k,1));return Math.round(255*c).toString(16).padStart(2,'0');};return '#'+f(0)+f(8)+f(4);}
  function defaultColor(i){return PALETTE[i]?{...PALETTE[i]}:{name:'Color '+(i+1),light:hslHex((i*137.508)%360,.48,.39),dark:hslHex((i*137.508)%360,.6,.72)};}
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const edgeKey=(a,b)=>a<b?`${a}:${b}`:`${b}:${a}`;
  const point=(cell,size=8)=>({x:cell%dimensions(size).width,y:Math.floor(cell/dimensions(size).width)}),center=p=>({x:36+(p.x+.5)*50,y:36+(p.y+.5)*50});
  function step(size,surface,cell,direction){const {width:w,height:h}=dimensions(size);let x=cell%w,y=Math.floor(cell/w),[dx,dy]=DIRS[direction];x+=dx;y+=dy;let seam=false;
    if(surface==='cone'||surface==='top'){
      if(y<0)return {cell:x*w,direction:1,seam:true};
      if(x<0)return {cell:y,direction:2,seam:true};
      if(x>=w)return surface==='top'?{cell:(h-1)*w+y,direction:0,seam:true}:null;
      if(y>=h)return surface==='top'?{cell:x*w+w-1,direction:3,seam:true}:null;
      return {cell:y*w+x,direction,seam:false};
    }
    if(surface==='pillow'&&(y<0||y>=h))return {cell:(y<0?0:h-1)*w+(w-1-x),direction:y<0?2:0,seam:true};
    if(x<0||x>=w){if(surface==='flat')return null;x=(x+w)%w;seam=true;if(surface==='mobius'||surface==='klein'){y=h-1-y;dy=-dy;}}
    if(y<0||y>=h){if(surface==='flat'||surface==='cylinder'||surface==='mobius')return null;y=(y+h)%h;seam=true;}
    return {cell:y*w+x,direction:DIRS.findIndex(d=>d[0]===dx&&d[1]===dy),seam};
  }
  // A direction distinguishes separate seams that happen to join the same cells.
  // Legacy two-cell walls keep their existing identities and puzzle codes.
  function portWall(n,surface,cell,dir){const next=step(n,surface,cell,dir);if(!next)return null;const reverse=(next.direction+2)%4;return cell<next.cell?[cell,next.cell,dir]:cell>next.cell?[next.cell,cell,reverse]:[cell,cell,Math.min(dir,reverse)];}
  const wallKey=w=>w.length===3?w.join(':'):edgeKey(w[0],w[1]);
  function compile(p){return {...p,wallSet:new Set(p.walls.map(wallKey)),mirrorMap:new Map(p.mirrors)};}
  function slide(board,pieces,robot,direction,trace=false){const start=pieces[robot],occupied=new Set(pieces.filter((_,i)=>i!==robot));let cell=start,dir=direction,states=new Set(),traveled=false,path=trace?[{cell,direction:dir,seam:false}]:null;
    for(;;){const key=cell*4+dir;if(states.has(key))return {ok:false,reason:'loop'};states.add(key);const next=step(board,board.surface,cell,dir);
      if(!next||board.wallSet.has(edgeKey(cell,next.cell))||board.wallSet.has(wallKey(portWall(board,board.surface,cell,dir)))||occupied.has(next.cell)){if(board.mirrorMap.has(cell))return {ok:false,reason:'bumper'};if(!traveled)return {ok:false,reason:'blocked'};return {ok:true,cell,path};}
      cell=next.cell;dir=next.direction;traveled=true;const mirror=board.mirrorMap.get(cell);if(mirror)dir=mirror==='/'?[1,0,3,2][dir]:[3,2,1,0][dir];if(trace)path.push({cell,direction:dir,seam:next.seam,bumper:!!mirror});
    }
  }
  const isCell=(x,size=8)=>Number.isInteger(x)&&x>=0&&x<dimensions(size).width*dimensions(size).height;
  function hash(text,offset=2166136261){let h=offset;for(let i=0;i<text.length;i++)h=Math.imul(h^text.charCodeAt(i),16777619);return (h>>>0).toString(16).padStart(8,'0');}
  function goalsFor(p){return p.goals||[{cell:p.target,piece:p.targetIndex??0}];}
  function goalFilled(goal,pieces){return goal.piece===null?pieces.includes(goal.cell):pieces[goal.piece]===goal.cell;}
  function isSolved(p,pieces){return goalsFor(p).every(g=>goalFilled(g,pieces));}
  function pack(p){const goals=goalsFor(p),colors=p.colors.map(c=>[c.name,c.light,c.dark]);
    const {width,height}=dimensions(p);if(width!==8||height!==8)return [3,width,height,p.surface,p.walls,p.mirrors,p.pieces,colors,goals.map(g=>[g.cell,g.piece]),p.title,p.date,p.seed];
    // Single colored goals keep the exact RP1 signature and scoreboard identity.
    return goals.length===1&&goals[0].piece!==null?[1,8,p.surface,p.walls,p.mirrors,p.pieces,colors,goals[0].piece,goals[0].cell,p.title,p.date,p.seed]:[2,8,p.surface,p.walls,p.mirrors,p.pieces,colors,goals.map(g=>[g.cell,g.piece]),p.title,p.date,p.seed];
  }
  const signature=p=>JSON.stringify(pack(p));
  function normalize(raw,keepId=false){
    if(!raw||!Object.hasOwn(surfaces,raw.surface))throw Error('Choose a supported surface.');
    const {width,height}=validateDimensions(raw,raw.surface),size={width,height},area=width*height,validCell=x=>isCell(x,size);
    if(!Array.isArray(raw.pieces)||raw.pieces.length<1||raw.pieces.length>Math.min(MAX_COLORS,area)||!raw.pieces.every(validCell)||new Set(raw.pieces).size!==raw.pieces.length)throw Error('Use 1–'+Math.min(MAX_COLORS,area)+' pieces on distinct grid spaces.');
    const colors=raw.colors||raw.pieces.map((_,i)=>defaultColor(i));
    if(!Array.isArray(colors)||colors.length!==raw.pieces.length||colors.some(c=>!c||typeof c.name!=='string'||!c.name.trim()||c.name.length>24||!/^#[a-f0-9]{6}$/i.test(c.light)||!/^#[a-f0-9]{6}$/i.test(c.dark)))throw Error('Each piece needs a label and valid light/dark colors.');
    if(!Array.isArray(raw.mirrors)||raw.mirrors.length>area||raw.mirrors.some(m=>!Array.isArray(m)||m.length!==2||!validCell(m[0])||!['/','\\'].includes(m[1]))||new Set(raw.mirrors.map(m=>m[0])).size!==raw.mirrors.length)throw Error('Bumpers must use distinct grid spaces and / or \\ orientations.');
    if(raw.pieces.some(c=>raw.mirrors.some(m=>m[0]===c)))throw Error('A starting piece cannot occupy a bumper.');
    const goals=goalsFor(raw);
    if(!Array.isArray(goals)||goals.length<1||goals.length>raw.pieces.length||goals.some(g=>!g||!validCell(g.cell)||(g.piece!==null&&(!Number.isInteger(g.piece)||g.piece<0||g.piece>=raw.pieces.length))||raw.mirrors.some(m=>m[0]===g.cell))||new Set(goals.map(g=>g.cell)).size!==goals.length)throw Error('Use 1–'+raw.pieces.length+' goals on distinct spaces without bumpers. Each colored goal needs an existing piece.');
    const required=goals.filter(g=>g.piece!==null).map(g=>g.piece);
    if(new Set(required).size!==required.length)throw Error('A piece can fill only one colored goal at a time. Choose different colors.');
    if(goals.every(g=>goalFilled(g,raw.pieces)))throw Error('At least one goal must need solving from the starting board.');
    const targetIndex=goals.find(g=>g.piece!==null)?.piece??0,target=goals[0].cell;
    if(!Array.isArray(raw.walls)||raw.walls.length>area*4)throw Error('Invalid wall list.');
    const walls=[],seen=new Set();for(const w of raw.walls){
      if(!Array.isArray(w)||![2,3].includes(w.length)||!validCell(w[0])||!validCell(w[1])||(w.length===3?(!Number.isInteger(w[2])||w[2]<0||w[2]>3||step(size,raw.surface,w[0],w[2])?.cell!==w[1]):!DIRS.some((_,d)=>step(size,raw.surface,w[0],d)?.cell===w[1])))throw Error('Walls must separate adjacent spaces on this surface.');
      const sorted=w.length===3?portWall(size,raw.surface,w[0],w[2]):w[0]<w[1]?[w[0],w[1]]:[w[1],w[0]],key=wallKey(sorted);if(!seen.has(key)){seen.add(key);walls.push(sorted);}
    }
    if(typeof raw.title!=='string'||!raw.title.trim()||raw.title.length>80)throw Error('Give the puzzle a title of 1–80 characters.');
    if(typeof raw.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(raw.date)||!Number.isFinite(Date.parse(raw.date+'T12:00:00Z'))||new Date(raw.date+'T12:00:00Z').toISOString().slice(0,10)!==raw.date)throw Error('Choose a valid puzzle date.');
    if(raw.seed!==undefined&&(typeof raw.seed!=='string'||raw.seed.length>120))throw Error('Seeds can contain up to 120 characters.');
    const p={n:width,width,height,surface:raw.surface,walls:walls.sort((a,b)=>a[0]-b[0]||a[1]-b[1]||(a[2]??-1)-(b[2]??-1)),mirrors:raw.mirrors.map(m=>m.slice()).sort((a,b)=>a[0]-b[0]),pieces:raw.pieces.slice(),colors:colors.map(c=>({name:c.name.trim(),light:c.light.toLowerCase(),dark:c.dark.toLowerCase()})),goals:goals.map(g=>({cell:g.cell,piece:g.piece})).sort((a,b)=>a.cell-b.cell),targetIndex,target,title:raw.title.trim(),date:raw.date,seed:(raw.seed||'').trim()};
    p.target=p.goals[0].cell;p.targetIndex=p.goals.find(g=>g.piece!==null)?.piece??0;
    const sig=signature(p);p.id=keepId?raw.id:'custom-'+hash(sig)+'-'+hash(sig,3339675911);return p;
  }
  function encodePuzzle(raw){const p=normalize(raw),json=signature(p),bytes=new TextEncoder().encode(json);let binary='';for(const b of bytes)binary+=String.fromCharCode(b);return 'RP'+pack(p)[0]+'.'+btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')+'.'+hash(json);}
  function decodePuzzle(input){const code=String(input).replace(/\s/g,'');if(code.length>20000)throw Error('That puzzle code is too long.');const m=code.match(/^RP([123])\.([A-Za-z0-9_-]+)\.([a-f0-9]{8})$/i);if(!m)throw Error('Paste a complete puzzle code starting with RP1, RP2, or RP3.');let data,json;
    try{let b64=m[2].replace(/-/g,'+').replace(/_/g,'/');b64+='='.repeat((4-b64.length%4)%4);const binary=atob(b64);json=new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(binary,c=>c.charCodeAt(0)));if(hash(json)!==m[3].toLowerCase())throw Error('checksum');data=JSON.parse(json);}catch(_){throw Error('That code is damaged or incomplete. Copy the full code again.');}
    if(!Array.isArray(data)||data[0]!==+m[1]||(data[0]!==3&&(data.length!==(data[0]===1?12:11)||!Array.isArray(data[6])||data[6].some(c=>!Array.isArray(c)||c.length!==3))))throw Error('Unsupported puzzle-code format.');
    if(data[0]===3){if(data.length!==12||!Array.isArray(data[7])||data[7].some(c=>!Array.isArray(c)||c.length!==3)||!Array.isArray(data[8])||data[8].some(g=>!Array.isArray(g)||g.length!==2))throw Error('Unsupported puzzle-code format.');return normalize({width:data[1],height:data[2],surface:data[3],walls:data[4],mirrors:data[5],pieces:data[6],colors:data[7].map(([name,light,dark])=>({name,light,dark})),goals:data[8].map(([cell,piece])=>({cell,piece})),title:data[9],date:data[10],seed:data[11]});}
    const common={n:data[1],surface:data[2],walls:data[3],mirrors:data[4],pieces:data[5],colors:data[6].map(([name,light,dark])=>({name,light,dark}))};
    if(data[0]===1)return normalize({...common,targetIndex:data[7],target:data[8],title:data[9],date:data[10],seed:data[11]});
    if(!Array.isArray(data[7])||data[7].some(g=>!Array.isArray(g)||g.length!==2))throw Error('Invalid goal list.');
    return normalize({...common,goals:data[7].map(([cell,piece])=>({cell,piece})),title:data[8],date:data[9],seed:data[10]});
  }
  function random(seed){let state=parseInt(hash(seed),16);return ()=>{state|=0;state=state+0x6D2B79F5|0;let t=Math.imul(state^state>>>15,1|state);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
  function generatePuzzle({seed,surface,count,targetIndex=0,title,date,goalPieces=[targetIndex],width=8,height=8}){
    const size=validateDimensions({width,height},surface),area=width*height;
    if(typeof seed!=='string'||!seed.trim()||seed.length>120)throw Error('Enter a generation seed of 1–120 characters.');
    if(!Object.hasOwn(surfaces,surface)||!Number.isInteger(count)||count<1||count>Math.min(MAX_COLORS,area)||!Number.isInteger(targetIndex)||targetIndex<0||targetIndex>=count)throw Error('Choose a supported surface, 1–32 colors and a target piece.');
    if(!Array.isArray(goalPieces)||!goalPieces.length||goalPieces.length>count||goalPieces.some(i=>i!==null&&(!Number.isInteger(i)||i<0||i>=count))||new Set(goalPieces.filter(i=>i!==null)).size!==goalPieces.filter(i=>i!==null).length)throw Error('Use distinct colored goals and no more total goals than pieces.');
    // Goal rows may reorder when their cells change; a seed depends on the
    // selected colors and rainbow count, rather than that display order.
    goalPieces=goalPieces.slice().sort((a,b)=>(a??MAX_COLORS)-(b??MAX_COLORS));
    const legacy=goalPieces.length===1&&goalPieces[0]!==null;targetIndex=goalPieces.find(i=>i!==null)??0;
    seed=seed.trim().normalize('NFC');const rnd=random(JSON.stringify(width!==8||height!==8?['generator-3',seed,surface,width,height,count,goalPieces]:legacy?['generator-1',seed,surface,count,targetIndex]:['generator-2',seed,surface,count,goalPieces])),pick=k=>Math.floor(rnd()*k);
    for(let attempt=0;attempt<30;attempt++){
      const walls=[],seen=new Set();while(walls.length<Math.round(area*25/64)){const x=pick(width-1),y=pick(height-1),a=y*width+x,b=a+(pick(2)?1:width),key=edgeKey(a,b);if(!seen.has(key)){seen.add(key);walls.push(surface==='pillow'?[a,b,b===a+1?1:2]:[a,b]);}}
      const mirrors=[],used=new Set();while(mirrors.length<Math.min(Math.round(area*5/64),area-count)){const c=(1+pick(height-2))*width+1+pick(width-2);if(!used.has(c)){used.add(c);mirrors.push([c,pick(2)?'/':'\\']);}}
      const available=Array.from({length:area},(_,i)=>i).filter(c=>!used.has(c));for(let i=available.length-1;i>0;i--){const j=pick(i+1);[available[i],available[j]]=[available[j],available[i]];}
      const initial=available.slice(0,count),p={n:width,width,height,surface,walls,mirrors,pieces:initial,colors:initial.map((_,i)=>defaultColor(i)),targetIndex,title,date,seed},b=compile(p);
      const trivial=new Set();for(let d=0;d<4;d++){const r=slide(b,initial,targetIndex,d);if(r.ok)trivial.add(r.cell);}
      const path=[],pos=initial.slice(),recent=[pos.join(',')];let candidate=null,fallback=null;
      for(let k=0;k<24;k++){
        const moves=[];for(let robot=0;robot<count;robot++)for(let dir=0;dir<4;dir++){const r=slide(b,pos,robot,dir);if(r.ok&&r.cell!==pos[robot]){const next=pos.slice();next[robot]=r.cell;if(!recent.slice(-4).includes(next.join(',')))moves.push({robot,dir,cell:r.cell});}}
        if(!moves.length)break;const goalMoves=moves.filter(m=>m.robot===targetIndex),choices=goalMoves.length&&rnd()<.4?goalMoves:moves,move=choices[pick(choices.length)];pos[move.robot]=move.cell;path.push([move.robot,move.dir]);recent.push(pos.join(','));
        const assigned=new Set(goalPieces.filter(i=>i!==null)),rainbowPieces=Array.from({length:count},(_,i)=>i).filter(i=>!assigned.has(i));
        let rainbow=0;const goals=goalPieces.map(i=>({cell:pos[i===null?rainbowPieces[rainbow++]:i],piece:i}));
        if(!goals.every(g=>goalFilled(g,initial))){fallback={goal:pos[targetIndex],goals,path:path.map(m=>m.slice())};if(k>=5&&(!legacy||!trivial.has(pos[targetIndex])))candidate=fallback;}
      }
      const result=candidate||fallback;if(result)return {puzzle:normalize({...p,target:result.goal,goals:result.goals}),witness:result.path};
    }
    throw Error('This seed did not produce a usable goal. Try a different seed.');
  }

return {DIRS,directionNames,SPEED,MAX_COLORS,BOARD_LIMITS,dimensions,validateDimensions,surfaces,surfaceRules,defaultColor,escape,edgeKey,point,center,step,portWall,wallKey,compile,slide,isCell,hash,pack,signature,normalize,encodePuzzle,decodePuzzle,generatePuzzle,goalsFor,goalFilled,isSolved};
})();
if(typeof module!=="undefined"&&module.exports)module.exports=RicochetEngine;
else globalThis.RicochetEngine=RicochetEngine;

(()=>{
  'use strict';
  const root=document.getElementById('weekly-ricochet-v2');
  if(!root)return;
  const $=s=>root.querySelector(s),$$=s=>Array.from(root.querySelectorAll(s));
  const {DIRS,directionNames,SPEED,MAX_COLORS,BOARD_LIMITS,validateDimensions,surfaces,surfaceRules,defaultColor,escape,edgeKey,point,center,step,portWall,wallKey,compile,slide,isCell,normalize,signature,encodePuzzle,decodePuzzle,generatePuzzle,goalsFor,goalFilled,isSolved}=RicochetEngine;
  const IS_CREATOR=root.dataset.mode==='creator';
  const archiveKey='griffin-ricochet-custom-puzzles-v1',legacyScoreKey='griffin-ricochet-prototype-v1';
  const clone=p=>JSON.parse(JSON.stringify(p)),keyFor=i=>i<9?String(i+1):i===9?'0':null;
  const reasons={loop:'That route loops forever, so it cannot be played.',bumper:'That route would stop on a bumper, so it cannot be played.',blocked:'That direction is blocked.'};
  let archive=[],storageAvailable=true,legacyRecords=[];
  const tutorialOrder=new Map(),publicData=Object.entries(window.RICOCHET_PUBLISHED_PUZZLES||{});
  for(const [key,raw] of publicData){try{const p=normalize(raw),sig=signature(p);if(!archive.some(q=>signature(q)===sig))archive.push(p);const order=key.startsWith('tutorial/')?key.slice(9):raw.tutorialOrder;if(typeof order==='string')tutorialOrder.set(sig,order);}catch(e){console.warn('Skipped an invalid published puzzle:',e.message);}}
  const publishedSignatures=new Set(archive.map(signature));
  try{
    const data=JSON.parse(localStorage.getItem(archiveKey)||'[]');
    if(Array.isArray(data))for(const raw of data.slice(0,500)){try{const p=normalize(raw);if(!archive.some(q=>signature(q)===signature(p)))archive.push(p);}catch(_){}}
    const scores=JSON.parse(localStorage.getItem(legacyScoreKey)||'[]');if(Array.isArray(scores))legacyRecords=scores;
  }catch(_){storageAvailable=false;}
  if(IS_CREATOR&&!archive.length){try{archive.push(normalize(window.RICOCHET_CREATOR_FALLBACK));}catch(_){}}
  if(!archive.length){root.innerHTML='<h2>No puzzles available yet</h2><p>Add a valid puzzle JSON file to <code>_data/ricochet_puzzles/</code> and rebuild on or after its release date.</p>';return;}
  let current,board,pieces=[],selected=0,history=[],busy=false,won=false,submitted=false,solvedAt=null,lastPath=null,animationPoint=null;
  let mode='play',draft=null,lastPlayId=archive[0].id,checkToken=0,checking=false,knownRoute=null;
  let tool='drag',editSelection=null,placementSelection=null,dragState=null,eraseStroke=null,dropPoint=null,suppressClickUntil=0;
  let scoreRows=[],scoreState='idle',scoreMessage='',scoreToken=0,submitting=false,submissionId=null;
  let apiOrigin='';
  try{const url=new URL(window.RICOCHET_SCORE_API||'');if(url.protocol==='https:'||url.hostname==='localhost'||url.hostname==='terminal.local')apiOrigin=url.origin;}catch(_){}
  const names=()=>current.colors.map(c=>c.name),color=i=>`var(--rp-robot-${i})`;
  const status=text=>{$('#rp-status').textContent=text;$('#rp-status').dataset.won=String(won);};
  const creatorStatus=text=>{$('#rp-creator-status').textContent=text;};
  const codeStatus=text=>{$('#rp-code-status').textContent=text;};
  const isPublished=()=>publishedSignatures.has(signature(current));
  const goalName=g=>g.piece===null?'Rainbow':current.colors[g.piece]?.name||'Color';
  const selectedObject=(kind,index)=>editSelection?.kind===kind&&editSelection.index===index;
  const cellPoint=cell=>point(cell,current);
  const viewWidth=()=>72+(current?.width??8)*50,viewHeight=()=>72+(current?.height??8)*50;
  const goalSummary=()=>current.goals.map(g=>`${goalName(g)} at row ${Math.floor(g.cell/current.width)+1}, column ${g.cell%current.width+1}`).join('; ');
  function dateLabel(date){return new Date(date+'T12:00:00Z').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'});}
  function renderArchive(){
    const tutorial=p=>tutorialOrder.has(signature(p)),order=p=>tutorialOrder.get(signature(p));
    archive.sort((a,b)=>Number(tutorial(a))-Number(tutorial(b))||(tutorial(a)?order(a).localeCompare(order(b),undefined,{numeric:true}):b.date.localeCompare(a.date)));
    const option=p=>`<option value="${escape(p.id)}">${tutorial(p)?'':dateLabel(p.date)+' · '}${escape(p.title)}${publishedSignatures.has(signature(p))?'':' (local draft)'} · ${surfaces[p.surface]}</option>`;
    const weekly=archive.filter(p=>!tutorial(p)),tutorials=archive.filter(tutorial);
    $('#rp-week').innerHTML=(tutorials.length?(weekly.length?`<optgroup label="Weekly puzzles &amp; drafts">${weekly.map(option).join('')}</optgroup>`:'')+`<optgroup label="Tutorials">${tutorials.map(option).join('')}</optgroup>`:weekly.map(option).join(''));
    if(mode==='play'&&current)$('#rp-week').value=current.id;
  }
  function renderPieces(){
    current.colors.forEach((c,i)=>root.style.setProperty('--rp-robot-'+i,`light-dark(${c.light}, ${c.dark})`));
    $('#rp-pieces').innerHTML=current.colors.map((c,i)=>`<button type="button" data-piece="${i}" aria-pressed="${i===selected}" ${keyFor(i)?`aria-keyshortcuts="${keyFor(i)}"`:''}><span class="rp-key">${i+1}</span><span class="rp-dot" style="--piece:${color(i)}"></span>${escape(c.name)}</button>`).join('');
    const count=current.pieces.length;
    $('#rp-shortcuts').textContent=(count===1?'1 selects the piece':count<10?`1–${count} select colors`:'1–9 select colors · 0 selects 10')+(count>10?' · [ / ] cycle':'')+(mode==='play'?' · arrows slide · Ctrl/⌘+Z undo':' · select a piece to move');
  }
    function connectedSides(surface){return surface==='flat'?[]:surface==='cone'?['top','left']:['cylinder','mobius'].includes(surface)?['left','right']:['top','right','bottom','left'];}
  function drawEdges(surface){
    const w=current.width,h=current.height,right=36+w*50,bottom=36+h*50,prefix=root.id+'-edge',twist=['mobius','klein'].includes(surface),adjacent=['cone','top'].includes(surface);
    let defs='',edges='',borders='';
    const seam=(side,palette,pair,reversed=false,fold=false)=>{
      const vertical=['left','right'].includes(side),coordinate=['left','top'].includes(side)?36:vertical?right:bottom,far=vertical?bottom:right,id=side,a=reversed?far:36,b=reversed?36:far;
      defs+=`<linearGradient id="${prefix}-${id}" gradientUnits="userSpaceOnUse" x1="${vertical?0:a}" y1="${vertical?a:0}" x2="${vertical?0:b}" y2="${vertical?b:0}"><stop offset="0" class="rp-seam-${palette}-start"/><stop offset="${fold?'.5':'1'}" class="rp-seam-${palette}-end"/>${fold?`<stop offset="1" class="rp-seam-${palette}-start"/>`:''}</linearGradient>`;
      const d=vertical?`M${coordinate} 36 V${bottom}`:`M36 ${coordinate} H${right}`;
      edges+=`<path d="${d}" class="rp-seam" data-seam-side="${side}" data-seam-pair="${pair}" stroke="url(#${prefix}-${id})" fill="none"/>`;
      for(const fraction of fold?[.25,.75]:[.25,.5,.75]){
        const t=36+(far-36)*fraction,reverse=reversed||fold&&fraction>.5,s=reverse?-1:1;
        const d=vertical?`M${coordinate-1.5} ${t-2*s} L${coordinate} ${t+2*s} L${coordinate+1.5} ${t-2*s}`:`M${t-2*s} ${coordinate-1.5} L${t+2*s} ${coordinate} L${t-2*s} ${coordinate+1.5}`;
        edges+=`<path d="${d}" class="rp-seam-direction" data-seam-side="${side}" data-seam-direction="${vertical?(reverse?'up':'down'):(reverse?'left':'right')}" fill="none"/>`;
      }
    };
    if(adjacent){seam('top','x','top-left');seam('left','x','top-left');if(surface==='top'){seam('right','y','right-bottom');seam('bottom','y','right-bottom');}}
    else if(surface!=='flat'){
      seam('left','x','x');seam('right','x','x',twist);
      if(surface==='pillow'){seam('top','y','top-fold',false,true);seam('bottom','z','bottom-fold',false,true);}
      else if(['torus','klein'].includes(surface)){seam('top','y','y');seam('bottom','y','y');}
    }
    const connected=connectedSides(surface);
    for(const side of ['top','right','bottom','left'])if(!connected.includes(side))borders+=`<path d="${side==='top'?`M36 36 H${right}`:side==='bottom'?`M36 ${bottom} H${right}`:side==='left'?`M36 36 V${bottom}`:`M${right} 36 V${bottom}`}" class="rp-wall" fill="none"/>`;
    // Even fixed borders must be below the seam at their shared corners.
    return (defs?'<defs>'+defs+'</defs>':'')+`<g class="rp-edge-layer" data-layer="edges">${borders}${edges}</g>`;
  }
  function physicalSegment(cell,dir){const p=cellPoint(cell),x=36+p.x*50,y=36+p.y*50;return [[x,y,x+50,y],[x+50,y,x+50,y+50],[x,y+50,x+50,y+50],[x,y,x,y+50]][dir];}
  // Goals and pieces share this geometry so every outline follows its piece.
  function pieceShape(index,c,scale,attributes){
    if(index%4===0)return `<circle cx="${c.x}" cy="${c.y}" r="${16*scale}" ${attributes}/>`;
    if(index%4===1)return `<rect x="${c.x-15*scale}" y="${c.y-15*scale}" width="${30*scale}" height="${30*scale}" rx="${5*scale}" ${attributes}/>`;
    const points=index%4===2?[[-16,0],[-8,-14],[8,-14],[16,0],[8,14],[-8,14]]:[[0,-19],[19,0],[0,19],[-19,0]];
    return `<polygon points="${points.map(([x,y])=>`${c.x+x*scale},${c.y+y*scale}`).join(' ')}" ${attributes}/>`;
  }
  function goalVisual(g,c,filled){
    const occupant=pieces.indexOf(g.cell),shape=g.piece??(filled?occupant:0),paint=g.piece===null?`url(#${root.id}-rainbow)`:color(g.piece),glow=color(g.piece??(occupant<0?0:occupant));
    return {shape,paint,glow,outline:pieceShape(shape,c,1.2,`fill="none" stroke="${paint}" stroke-width="${filled?3:2}" class="rp-goal-outline" ${filled?'':'stroke-dasharray="4 3"'}`)};
  }
  function drawWalls(){
    let out='';const drawn=new Set();
    current.walls.forEach((wall,index)=>{
      for(const dir of wall.length===3?[wall[2]]:[0,1,2,3]){
        const next=step(current,current.surface,wall[0],dir);if(next?.cell!==wall[1])continue;
        for(const [cell,edge] of [[wall[0],dir],[next.cell,(next.direction+2)%4]]){
          const segment=physicalSegment(cell,edge),key=segment.join(',');if(drawn.has(key))continue;drawn.add(key);
          const [x1,y1,x2,y2]=segment,selected=selectedObject('wall',index);
          out+=`<g data-object="wall" data-index="${index}" data-cell="${cell}" data-edge="${edge}" class="${selected?'rp-object-selected':''}"><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="rp-wall"/><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="transparent" stroke-width="16"/>`;
          if(next.seam){const p=center(cellPoint(cell)),right=36+current.width*50,bottom=36+current.height*50;
            const [a,b,c,d]=edge===0?[p.x-7,44,p.x+7,44]:edge===2?[p.x-7,bottom-8,p.x+7,bottom-8]:edge===3?[44,p.y-7,44,p.y+7]:[right-8,p.y-7,right-8,p.y+7];
            out+=`<line x1="${a}" y1="${b}" x2="${c}" y2="${d}" class="rp-seam-block"><title>Wall blocks this edge connection</title></line>`;
          }
          out+='</g>';
        }
      }
    });return out;
  }
  function drawBoard(){
    const w=current.width,h=current.height,right=36+w*50,bottom=36+h*50,connected=connectedSides(current.surface),twist=['mobius','klein'].includes(current.surface),pillow=current.surface==='pillow';
    let out=`<title>${escape(current.title)} — ${surfaces[current.surface]}</title><desc>${w} columns by ${h} rows, ${pieces.length} pieces. Fill all goals simultaneously: ${escape(goalSummary())}. ${escape(surfaceRules[current.surface])}</desc>`;
    if(current.goals.some(g=>g.piece===null))out+=`<defs><linearGradient id="${root.id}-rainbow" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d04c59"/><stop offset=".25" stop-color="#b48a21"/><stop offset=".5" stop-color="#369766"/><stop offset=".75" stop-color="#438fd0"/><stop offset="1" stop-color="#a06ecb"/></linearGradient></defs>`;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++)out+=`<rect x="${36+x*50}" y="${36+y*50}" width="50" height="50" class="rp-grid ${(x+y)%2?'rp-cell-alt':'rp-cell'}"/>`;
    for(const side of connected){const vertical=['left','right'].includes(side),count=vertical?h:w;
      for(let i=0;i<count;i++){
        const c=61+i*50,label=pillow&&!vertical?`${Math.min(i+1,w-i)}↔${Math.max(i+1,w-i)}`:side==='right'&&twist?h-i:i+1;
        out+=`<text x="${vertical?(side==='left'?21:right+16):c}" y="${vertical?c+4:side==='top'?23:bottom+18}" text-anchor="middle" class="rp-axis${pillow&&!vertical?' rp-fold-axis':''}" data-edge-number="${side}">${label}</text>`;
      }
    }
    current.goals.forEach((g,index)=>{
      const c=center(cellPoint(g.cell)),filled=goalFilled(g,pieces),visual=goalVisual(g,c,filled);
      out+=`<g data-object="goal" data-index="${index}" data-goal="${index}" data-filled="${filled}" data-shape="${visual.shape%4}" class="${selectedObject('goal',index)?'rp-object-selected':''}"><title>${escape(goalName(g))} goal ${index+1}${filled?' · filled':''}</title><circle cx="${c.x}" cy="${c.y}" r="24" fill="transparent"/>${visual.outline}<text x="${c.x}" y="${c.y}" fill="${g.piece===null?'var(--rp-text)':visual.paint}" class="rp-goal-marker">${g.piece===null?'✦':g.piece+1}</text></g>`;
    });
    out+=drawWalls();
    current.mirrors.forEach(([cell,kind],index)=>{
      const c=center(cellPoint(cell)),y1=c.y+(kind==='/'?14:-14),y2=c.y+(kind==='/'?-14:14);
      out+=`<g data-object="bumper" data-index="${index}" data-bumper="${cell}" class="${selectedObject('bumper',index)?'rp-object-selected':''}"><line x1="${c.x-14}" y1="${y1}" x2="${c.x+14}" y2="${y2}" class="rp-bumper"/><line x1="${c.x-14}" y1="${y1}" x2="${c.x+14}" y2="${y2}" stroke="transparent" stroke-width="18"/></g>`;
    });
    if(lastPath){let d='';for(let i=0;i<lastPath.length;i++){const c=center(cellPoint(lastPath[i].cell));d+=`${i===0||lastPath[i].seam?'M':'L'}${c.x},${c.y} `;}out+=`<path d="${d}" fill="none" stroke="var(--rp-trail)" stroke-width="2.5" stroke-dasharray="3 4" opacity=".7" pointer-events="none"/>`;}
    pieces.forEach((cell,i)=>{
      const c=center(i===selected&&animationPoint?animationPoint:cellPoint(cell)),shape=pieceShape(i,c,1,`fill="${color(i)}" class="rp-token"`);
      out+=`<g data-object="piece" data-index="${i}" data-robot="${i}" aria-label="${escape(names()[i])}, piece ${i+1}, row ${Math.floor(cell/w)+1}, column ${cell%w+1}"><circle cx="${c.x}" cy="${c.y}" r="${mode==='create'?16:24}" fill="transparent"/>${i===selected?`<circle cx="${c.x}" cy="${c.y}" r="22" class="rp-selection"/>`:''}${shape}<text x="${c.x}" y="${c.y}" class="rp-token-text">${i+1}</text></g>`;
    });
    // Completion glows remain visible above pieces; moving away removes them.
    current.goals.forEach((g,index)=>{if(!goalFilled(g,pieces))return;
      const c=center(cellPoint(g.cell)),visual=goalVisual(g,c,true);
      const star=(x,y)=>`M${x-3} ${y} H${x+3} M${x} ${y-3} V${y+3}`;
      out+=`<g class="rp-goal-success" data-goal-success="${index}" style="--rp-goal-glow:${visual.glow}" aria-hidden="true">${visual.outline}<g class="rp-goal-sparkles"><path d="${star(c.x-19,c.y-19)} ${star(c.x+19,c.y+19)}"/></g></g>`;
    });
    if(dropPoint){const c=cellPoint(dropPoint.cell);out+=`<rect x="${36+c.x*50+3}" y="${36+c.y*50+3}" width="44" height="44" rx="5" class="rp-drop-target"/>`;}
    // Edge identification is always the final painted layer, at wall thickness.
    out+=drawEdges(current.surface);
    const svg=$('#rp-board-svg');svg.setAttribute('viewBox',`0 0 ${viewWidth()} ${viewHeight()}`);svg.innerHTML=out;
    svg.setAttribute('aria-label',`${surfaces[current.surface]} ${mode==='create'?'editor':'puzzle'}, ${w} columns by ${h} rows. Goals: ${goalSummary()}. ${surfaceRules[current.surface]}`);
    const width=$('.rp-board').getBoundingClientRect().width;if(width>0)root.style.setProperty('--rp-svg-scale',String(viewWidth()/width));
  }

  function updateControls(){
    const creating=mode==='create';$('#rp-edit-row').max=current.height;$('#rp-edit-col').max=current.width;root.dataset.editing=String(creating);root.dataset.tool=tool;
    $('#rp-creator').hidden=!creating;$('#rp-editor-actions').hidden=!creating;$('#rp-dpad').hidden=creating;$('#rp-play-actions').hidden=creating;$('#rp-leaderboard').hidden=creating;
    $('#rp-play-mode').setAttribute('aria-pressed',String(!creating));$('#rp-create-mode').setAttribute('aria-pressed',String(creating));$('#rp-play-mode').disabled=busy||submitting;$('#rp-create-mode').disabled=busy||submitting;
    $('#rp-moves').textContent=history.length;$('#rp-score').value=won?history.length:'';
    $('#rp-undo').disabled=busy||!history.length;$('#rp-reset').disabled=busy||!history.length;$('#rp-week').disabled=busy||creating||submitting;
    $$('[data-piece]').forEach(b=>{b.setAttribute('aria-pressed',String(+b.dataset.piece===selected));b.disabled=busy;});
    $$('[data-tool]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tool===tool)));
    $$('[data-direction]').forEach(b=>{const d=+b.dataset.direction,result=slide(board,pieces,selected,d);b.disabled=busy||creating||won||!result.ok;b.setAttribute('aria-label',`Move ${names()[selected]} ${directionNames[d]}${result.ok?'':': '+reasons[result.reason]}`);});
    $('#rp-submit').disabled=busy||creating||!won||submitted||submitting||scoreState!=='online'||!isPublished();
    $('#rp-submit').textContent=submitting?'Saving…':submitted?'Score saved':'Submit score';
    $('#rp-refresh-scores').disabled=scoreState==='loading'||submitting||!apiOrigin||!isPublished();
    $('#rp-check').disabled=checking;$('#rp-load-code').disabled=busy;$('#rp-get-code').disabled=busy;
    $('#rp-title').textContent=current.title||'Untitled puzzle';$('#rp-surface').textContent=surfaces[current.surface];$('#rp-surface-rule').textContent=surfaceRules[current.surface];
    $('#rp-goal-progress').innerHTML=current.goals.map(g=>`<span class="rp-goal-chip" data-filled="${goalFilled(g,pieces)}">${g.piece===null?'<span class="rp-rainbow-dot"></span>':`<span class="rp-dot" style="--piece:${color(g.piece)}"></span>`}${escape(goalName(g))}${g.piece===null?'':' '+(g.piece+1)} ${goalFilled(g,pieces)?'✓':'○'}</span>`).join('');
    if(creating){$('#rp-creator-count').max=Math.min(MAX_COLORS,current.width*current.height-current.mirrors.length);updateToolHelp();}
  }
  function updateCode(){
    try{$('#rp-code').value=encodePuzzle(current);for(const id of ['#rp-add','#rp-copy-code','#rp-download'])$(id).disabled=false;}
    catch(e){$('#rp-code').value='';for(const id of ['#rp-add','#rp-copy-code','#rp-download'])$(id).disabled=true;if(mode==='create')creatorStatus(e.message);}
  }
  function cancelCheck(){checkToken++;checking=false;}
  function load(id,focus=false){
    endEraseStroke();cancelCheck();current=archive.find(p=>p.id===id)||archive[0];lastPlayId=current.id;mode='play';board=compile(current);pieces=current.pieces.slice();selected=0;history=[];busy=false;won=false;submitted=false;solvedAt=null;lastPath=null;animationPoint=null;editSelection=null;placementSelection=null;dragState=null;dropPoint=null;submissionId=null;
    renderArchive();renderPieces();status('Fill every goal at the same time. Every piece can help.');drawBoard();updateControls();updateCode();loadScores();
    if(focus)$('[data-piece="0"]').focus({preventScroll:true});
  }
  function choose(i,focus=false){
    if(busy||!Number.isInteger(i)||i<0||i>=pieces.length)return;if(mode==='create')endEraseStroke();selected=i;lastPath=null;
    if(mode==='create'){tool='drag';placementSelection=null;editSelection={kind:'piece',index:i};renderGoalList();}
    drawBoard();updateControls();if(mode==='play'&&!won)status(`${names()[i]} · piece ${i+1} selected. Choose an available direction.`);
    if(focus)$(`[data-piece="${i}"]`).focus({preventScroll:true});
  }
  function animationDuration(path){return Math.min(90*(path.length-1),1200)/SPEED;}
  function animate(path,done){
    if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){done();return;}
    const total=animationDuration(path),segments=path.length-1;let started=null;
    function frame(t){if(started===null)started=t;const elapsed=t-started;if(elapsed>=total){animationPoint=null;done();return;}const progress=elapsed/total*segments,index=Math.min(segments-1,Math.floor(progress)),fraction=progress-index,a=cellPoint(path[index].cell),b=cellPoint(path[index+1].cell);animationPoint=path[index+1].seam?(fraction<.5?a:b):{x:a.x+(b.x-a.x)*fraction,y:a.y+(b.y-a.y)*fraction};drawBoard();requestAnimationFrame(frame);}
    requestAnimationFrame(frame);
  }
  function move(dir){
    if(mode!=='play'||busy||won)return;const result=slide(board,pieces,selected,dir,true);if(!result.ok){status(reasons[result.reason]);return;}
    const robot=selected;history.push({pieces:pieces.slice(),robot,dir});busy=true;lastPath=result.path;status(`${names()[robot]} sliding ${directionNames[dir]}…`);updateControls();
    animate(result.path,()=>{pieces[robot]=result.cell;busy=false;won=isSolved(current,pieces);
      if(won){solvedAt=new Date().toISOString();submissionId=globalThis.crypto?.randomUUID?.()||'run-'+Date.now()+'-'+Math.random().toString(36).slice(2);status(`All goals filled in ${history.length} moves.${isPublished()?' Add your three letters to submit your score.':' This draft is ready to share or publish.'}`);}
      else status(`${current.goals.filter(g=>goalFilled(g,pieces)).length} of ${current.goals.length} goals filled. ${names()[robot]} stopped at row ${Math.floor(result.cell/current.width)+1}, column ${result.cell%current.width+1}.`);
      drawBoard();updateControls();updateScoreHelp();
    });
  }
  function renderGoalList(){
    if(!draft)return;
    const colored=draft.goals.filter(g=>g.piece!==null).length,rainbow=draft.goals.length-colored,count=draft.pieces.length;
    $('#rp-colored-count').value=colored;$('#rp-rainbow-count').value=rainbow;$('#rp-colored-count').max=count-rainbow;$('#rp-rainbow-count').max=count-colored;
    $('#rp-goal-list').innerHTML=draft.goals.map((g,i)=>`<div class="rp-goal-row" data-selected="${selectedObject('goal',i)}"><label for="rp-goal-color-${i}">Goal ${i+1}<select id="rp-goal-color-${i}" data-goal-color="${i}" aria-label="Color for goal ${i+1}"><option value="rainbow" ${g.piece===null?'selected':''}>Rainbow · any piece</option>${draft.colors.map((c,j)=>`<option value="${j}" ${g.piece===j?'selected':''} ${draft.goals.some((q,k)=>k!==i&&q.piece===j)?'disabled':''}>${j+1} · ${escape(c.name)}</option>`).join('')}</select></label><button type="button" data-select-goal="${i}">Move</button><button type="button" data-remove-goal="${i}" ${draft.goals.length===1?'disabled':''} aria-label="Remove goal ${i+1}">Remove</button></div>`).join('');
  }
  function syncCreatorFields(){
    if(!draft)return;$('#rp-creator-title').value=draft.title;$('#rp-creator-date').value=draft.date;$('#rp-creator-seed').value=draft.seed||'my-weekly-puzzle';$('#rp-creator-surface').value=draft.surface;$('#rp-creator-count').value=draft.pieces.length;$('#rp-creator-count').max=Math.min(MAX_COLORS,draft.width*draft.height);$('#rp-board-width').value=draft.width;$('#rp-board-height').value=draft.height;$('#rp-board-width').step=draft.surface==='pillow'?2:1;for(const id of ['#rp-board-width','#rp-board-height']){$(id).min=BOARD_LIMITS.min;$(id).max=BOARD_LIMITS.max;}renderGoalList();
  }
  function refreshDraft(message){
    cancelCheck();placementSelection=null;current=draft;mode='create';board=compile(draft);pieces=draft.pieces.slice();selected=Math.min(selected,pieces.length-1);history=[];won=false;busy=false;submitted=false;solvedAt=null;lastPath=null;animationPoint=null;
    // Legacy aliases are for older files; the goal list is authoritative.
    draft.target=draft.goals[0]?.cell;draft.targetIndex=draft.goals.find(g=>g.piece!==null)?.piece??0;
    renderPieces();renderGoalList();drawBoard();updateControls();status('Editing the starting board.');if(message)creatorStatus(message);updateCode();
  }
  function enterCreator(){
    if(busy)return;cancelCheck();scoreToken++;
    if(!draft){draft=clone(current);draft.title=(current.title+' · remix').slice(0,80);knownRoute=null;}
    syncCreatorFields();refreshDraft('Choose Drag objects, Walls, Bumpers, or Eraser. Generate a board or edit this one.');
  }
  function selectionName(){
    if(!editSelection)return 'Choose an object on the board.';
    const {kind,index}=editSelection;return kind==='piece'?`${names()[index]} piece ${index+1}`:kind==='goal'?`${goalName(draft.goals[index])} goal ${index+1}`:kind==='bumper'?'Bumper':'Wall';
  }
  function updateToolHelp(){
    if(mode!=='create')return;
    $('#rp-edge-label').hidden=tool!=='wall'&&tool!=='erase'&&editSelection?.kind!=='wall';
    $('#rp-apply-edit').textContent=tool==='drag'?'Place selected object':tool==='erase'?'Erase at position':'Apply tool';
    $('#rp-delete-object').disabled=tool!=='drag'||!editSelection||editSelection.kind==='piece'||editSelection.kind==='goal'&&draft.goals.length===1;
    $('#rp-edit-help').textContent=tool==='wall'?'Click near a grid line to add or remove a wall. Connected-edge walls affect both matching segments.':tool==='bumper'?'Click an empty space to add a / bumper. Click it again for \\, and once more to remove it.':tool==='erase'?'Hold and drag to erase walls, bumpers, goals, and pieces under the stroke. Erasing a piece also removes its colored goal. Keep at least one piece and one goal. Row / Column erases the object in that space, or the selected wall edge.':placementSelection?`${selectionName()}: click its destination, even underneath a piece, or drag to place it. Escape cancels placement.`:`${selectionName()} Drag it to a new space or grid edge, or use Row / Column and Place selected object. Delete or Remove selected removes a selected wall, bumper, or goal.`;
  }
  function setTool(next){endEraseStroke();tool=next;editSelection=null;placementSelection=null;dragState=null;dropPoint=null;drawBoard();renderGoalList();updateControls();}
  function wallAt(cell,dir){
    const next=step(draft,draft.surface,cell,dir);if(!next)return null;
    return draft.surface==='pillow'||next.seam&&['cone','top'].includes(draft.surface)?portWall(draft,draft.surface,cell,dir):[Math.min(cell,next.cell),Math.max(cell,next.cell)];
  }
  function wallIndex(w){return draft.walls.findIndex(q=>wallKey(q)===wallKey(w)||q.length===2&&edgeKey(q[0],q[1])===edgeKey(w[0],w[1]));}
  function editCell(cell,action=tool,edge=1){
    if(mode!=='create'||!isCell(cell,draft))return;
    if(action==='erase'){
      const piece=draft.pieces.indexOf(cell),bumper=draft.mirrors.findIndex(m=>m[0]===cell),goal=draft.goals.findIndex(g=>g.cell===cell),wall=wallAt(cell,edge),index=wall?wallIndex(wall):-1;
      if(piece!==-1)eraseObject({kind:'piece',index:piece});else if(bumper!==-1)eraseObject({kind:'bumper',index:bumper});else if(goal!==-1)eraseObject({kind:'goal',index:goal});else if(index!==-1)eraseObject({kind:'wall',index});else creatorStatus('There is no movable object at that position.');return;
    }
    if(action==='drag'){if(editSelection)relocate(editSelection,cell,edge);else creatorStatus('Select an object on the board, a piece button, or a goal’s Move button first.');return;}
    if(action==='wall'){const w=wallAt(cell,edge);if(!w){creatorStatus('That outer edge is a fixed wall on this surface.');return;}const i=wallIndex(w);if(i<0)draft.walls.push(w);else draft.walls.splice(i,1);}
    else if(action==='bumper'){
      if(draft.pieces.includes(cell)||draft.goals.some(g=>g.cell===cell)){creatorStatus('Move the piece or goal before adding a bumper here.');return;}
      const i=draft.mirrors.findIndex(m=>m[0]===cell);if(i<0)draft.mirrors.push([cell,'/']);else if(draft.mirrors[i][1]==='/')draft.mirrors[i][1]='\\';else draft.mirrors.splice(i,1);
    }
    knownRoute=null;editSelection=null;refreshDraft('Board edited. Check solvability before publishing.');
  }
  function relocate(object,cell,edge=1){
    if(mode!=='create'||!isCell(cell,draft))return false;const {kind,index}=object;
    if(kind==='piece'){
      if(draft.mirrors.some(m=>m[0]===cell)||draft.pieces.some((c,i)=>i!==index&&c===cell)){creatorStatus('Choose a space without another piece or a bumper.');return false;}
      draft.pieces[index]=cell;selected=index;
    }else if(kind==='goal'){
      if(!draft.goals[index])return false;
      if(draft.mirrors.some(m=>m[0]===cell)||draft.goals.some((g,i)=>i!==index&&g.cell===cell)){creatorStatus('Choose a space without another goal or a bumper.');return false;}draft.goals[index].cell=cell;
    }else if(kind==='bumper'){
      if(!draft.mirrors[index])return false;
      if(draft.pieces.includes(cell)||draft.goals.some(g=>g.cell===cell)||draft.mirrors.some((m,i)=>i!==index&&m[0]===cell)){creatorStatus('Choose a space without a piece, goal, or another bumper.');return false;}draft.mirrors[index][0]=cell;
    }else if(kind==='wall'){
      const w=wallAt(cell,edge);if(!w){creatorStatus('A movable wall must lie on an interior edge or a connected edge.');return false;}
      const occupied=wallIndex(w);if(occupied!==-1&&occupied!==index){creatorStatus('A wall already occupies that edge.');return false;}draft.walls[index]=w;
    }else return false;
    knownRoute=null;editSelection={kind,index};refreshDraft('Object moved. Check solvability before publishing.');return true;
  }
  function removeGoal(index){
    if(draft.goals.length===1){creatorStatus('Keep at least one goal.');return;}draft.goals.splice(index,1);editSelection=null;knownRoute=null;refreshDraft('Goal removed. Every remaining goal must be filled together.');
  }
  function eraseObject(object,report=true){
    if(mode!=='create'||!object)return false;const {kind,index}=object;
    const reject=message=>{if(report)creatorStatus(message);return false;};
    if(kind==='piece'){
      if(draft.pieces.length===1)return reject('Keep at least one piece.');
      const goals=draft.goals.filter(g=>g.piece!==index);
      if(!goals.length)return reject('Reassign this piece’s goal before erasing it; keep at least one goal.');
      if(goals.length>draft.pieces.length-1)return reject('Remove an extra goal before erasing this piece; each goal needs its own piece.');
      draft.pieces.splice(index,1);draft.colors.splice(index,1);draft.goals=goals.map(g=>({cell:g.cell,piece:g.piece!==null&&g.piece>index?g.piece-1:g.piece}));
      selected=Math.max(0,Math.min(selected-(selected>index?1:0),draft.pieces.length-1));$('#rp-creator-count').value=draft.pieces.length;
      editSelection=null;knownRoute=null;refreshDraft('Piece and any matching colored goal erased. Remaining piece numbers were updated.');return true;
    }
    if(kind==='goal'){if(draft.goals.length===1)return reject('Keep at least one goal.');removeGoal(index);return true;}
    if(kind==='wall')draft.walls.splice(index,1);else if(kind==='bumper')draft.mirrors.splice(index,1);else return false;
    editSelection=null;knownRoute=null;refreshDraft(kind==='wall'?'Wall erased, including its matching connected-edge segment.':'Bumper erased.');return true;
  }
  function removeSelected(){
    if(!editSelection)return;const {kind,index}=editSelection;if(kind==='piece'){creatorStatus('Change Colors to remove pieces.');return;}
    if(kind==='goal'){removeGoal(index);return;}if(kind==='wall')draft.walls.splice(index,1);if(kind==='bumper')draft.mirrors.splice(index,1);editSelection=null;knownRoute=null;refreshDraft('Object removed.');
  }
  function resizeGoals(colored,rainbow){
    if(!Number.isInteger(colored)||!Number.isInteger(rainbow)||colored<0||rainbow<0||colored+rainbow<1||colored+rainbow>draft.pieces.length){renderGoalList();creatorStatus('Keep at least one goal and no more total goals than pieces.');return;}
    const oldColored=draft.goals.filter(g=>g.piece!==null),oldRainbow=draft.goals.filter(g=>g.piece===null),goals=[...oldColored.slice(0,colored),...oldRainbow.slice(0,rainbow)];
    const occupied=new Set([...goals.map(g=>g.cell),...draft.mirrors.map(m=>m[0])]),assigned=new Set(goals.map(g=>g.piece));
    const add=piece=>{const cells=Array.from({length:draft.width*draft.height},(_,i)=>i).filter(c=>!occupied.has(c)),cell=cells.find(c=>piece===null?!draft.pieces.includes(c):draft.pieces[piece]!==c)??cells[0];occupied.add(cell);goals.push({cell,piece});};
    for(let i=oldColored.slice(0,colored).length;i<colored;i++){const piece=draft.pieces.findIndex((_,j)=>!assigned.has(j));assigned.add(piece);add(piece);}
    for(let i=oldRainbow.slice(0,rainbow).length;i<rainbow;i++)add(null);
    draft.goals=goals;knownRoute=null;editSelection=null;refreshDraft('Goal count updated. Use each goal’s Move button or Drag objects to place it.');
  }
  function resizeDraft(count){
    if(!Number.isInteger(count)||count<1||count>Math.min(MAX_COLORS,draft.width*draft.height)){$('#rp-creator-count').value=draft.pieces.length;creatorStatus('Choose 1–32 colors.');return;}
    if(count<draft.goals.length||draft.goals.some(g=>g.piece!==null&&g.piece>=count)){ $('#rp-creator-count').value=draft.pieces.length;creatorStatus('Remove or reassign goals for those pieces before reducing the color count.');return;}
    const occupied=new Set([...draft.pieces,...draft.mirrors.map(m=>m[0])]),goals=new Set(draft.goals.map(g=>g.cell));
    const free=Array.from({length:draft.width*draft.height},(_,i)=>i).filter(c=>!occupied.has(c)).sort((a,b)=>Number(goals.has(a))-Number(goals.has(b))||a-b);
    if(count-draft.pieces.length>free.length){$('#rp-creator-count').value=draft.pieces.length;creatorStatus('There is not enough room for that many pieces. Remove bumpers or enlarge the board first.');return;}
    while(draft.pieces.length<count){draft.pieces.push(free.shift());draft.colors.push(defaultColor(draft.colors.length));}
    draft.pieces=draft.pieces.slice(0,count);draft.colors=draft.colors.slice(0,count);selected=Math.min(selected,count-1);editSelection=null;knownRoute=null;refreshDraft('Color count updated. Select a piece to move its starting space.');
  }
  function resizeBoard(width,height,surface=draft.surface){
    try{validateDimensions({width,height},surface);}catch(e){syncCreatorFields();creatorStatus(e.message);return false;}
    if(draft.pieces.length>width*height){syncCreatorFields();creatorStatus('Reduce the color count before shrinking to fewer cells than pieces.');return false;}
    const oldWidth=draft.width,map=cell=>{const col=cell%oldWidth,row=Math.floor(cell/oldWidth);return col<width&&row<height?row*width+col:null;};
    const updated=clone(draft);updated.n=width;updated.width=width;updated.height=height;updated.surface=surface;
    updated.mirrors=draft.mirrors.filter(m=>map(m[0])!==null).map(([c,k])=>[map(c),k]);
    const occupied=new Set(updated.mirrors.map(m=>m[0]));
    // Reserve surviving pieces before relocating any that were cropped away.
    updated.pieces=draft.pieces.map(map);for(const c of updated.pieces)if(c!==null)occupied.add(c);
    updated.pieces=updated.pieces.map(c=>{if(c!==null)return c;const free=Array.from({length:width*height},(_,i)=>i).find(i=>!occupied.has(i));if(free===undefined)return null;occupied.add(free);return free;});
    if(updated.pieces.includes(null)){syncCreatorFields();creatorStatus('Remove some bumpers or pieces before shrinking this board.');return false;}
    const goalCells=new Set();updated.goals=draft.goals.map(g=>{let cell=map(g.cell);if(cell===null||goalCells.has(cell)||updated.mirrors.some(m=>m[0]===cell))cell=Array.from({length:width*height},(_,i)=>i).find(c=>!goalCells.has(c)&&!updated.mirrors.some(m=>m[0]===c));goalCells.add(cell);return {cell,piece:g.piece};});
    updated.walls=draft.walls.filter(w=>map(w[0])!==null&&map(w[1])!==null).map(w=>w.length===3?[map(w[0]),map(w[1]),w[2]]:[map(w[0]),map(w[1])]).filter(w=>w.length===3?step(updated,surface,w[0],w[2])?.cell===w[1]:DIRS.some((_,d)=>step(updated,surface,w[0],d)?.cell===w[1]));
    draft=updated;editSelection=null;knownRoute=null;syncCreatorFields();refreshDraft('Board resized. Objects outside the new edges were relocated; outside bumpers and invalid walls were removed. Check solvability again.');return true;
  }
  function addPuzzle(raw){const p=normalize(raw),sig=signature(p),existing=archive.find(q=>signature(q)===sig);if(existing)return existing;archive.push(p);try{localStorage.setItem(archiveKey,JSON.stringify(archive.filter(q=>!publishedSignatures.has(signature(q)))));}catch(_){storageAvailable=false;}renderArchive();return p;}
  function exportPuzzle(raw){
    const {id,target,targetIndex,...definition}=normalize(raw);
    // Keep legacy fields in one-goal JSON files for older integrations.
    if(definition.goals.length===1&&definition.goals[0].piece!==null){definition.targetIndex=definition.goals[0].piece;definition.target=definition.goals[0].cell;}
    const slug=definition.title.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,50)||'puzzle';
    return {filename:definition.date+'-'+slug+'.json',text:JSON.stringify(definition,null,2)+'\n'};
  }
  async function checkSolvability(){
    if(mode!=='create'||checking)return;let p;try{p=normalize(draft);}catch(e){creatorStatus(e.message);return;}
    checking=true;const token=++checkToken;updateControls();creatorStatus('Checking all goals together…');
    const b=compile(p),queue=[{pos:p.pieces.slice(),depth:0}],seen=new Set([p.pieces.join(',')]),deadline=Date.now()+3000,limit=50000;let cursor=0,answer=null;
    while(cursor<queue.length&&seen.size<limit&&Date.now()<deadline&&checkToken===token){
      const stop=Math.min(queue.length,cursor+300);while(cursor<stop&&seen.size<limit){const {pos,depth}=queue[cursor++];if(isSolved(p,pos)){answer=depth;break;}
        for(let r=0;r<pos.length;r++)for(let d=0;d<4;d++){const result=slide(b,pos,r,d);if(!result.ok)continue;const next=pos.slice();next[r]=result.cell;const key=next.join(',');if(!seen.has(key)){seen.add(key);queue.push({pos:next,depth:depth+1});}}
      }if(answer!==null)break;await new Promise(resolve=>setTimeout(resolve,0));
    }
    if(checkToken!==token)return;checking=false;updateControls();
    creatorStatus(answer!==null?`Solvable. Shortest solution filling all goals: ${answer} moves.`:cursor>=queue.length?'No solution exists for these goals and starting positions.':`No solution found within the search limit (${seen.size.toLocaleString()} states). This does not prove the puzzle is impossible.`);
  }
  function boardPoint(event){
    const rect=$('#rp-board-svg').getBoundingClientRect(),x=(event.clientX-rect.left)*viewWidth()/rect.width,y=(event.clientY-rect.top)*viewHeight()/rect.height;
    if(x<36||x>36+current.width*50||y<36||y>36+current.height*50)return null;
    const col=Math.min(current.width-1,Math.floor((x-36)/50)),row=Math.min(current.height-1,Math.floor((y-36)/50)),fx=(x-36)/50-col,fy=(y-36)/50-row,distances=[fy,1-fx,1-fy,fx],distance=Math.min(...distances);
    return {x,y,cell:row*current.width+col,row,col,edge:distances.indexOf(distance),distance};
  }
  function objectAt(target){
    const element=target.closest?.('[data-object]');if(!element)return null;
    return {kind:element.dataset.object,index:+element.dataset.index};
  }
  function endEraseStroke(){
    if(!eraseStroke)return;const stroke=eraseStroke;eraseStroke=null;root.dataset.erasing='false';suppressClickUntil=Date.now()+350;
    const svg=$('#rp-board-svg');if(svg.hasPointerCapture?.(stroke.pointerId))svg.releasePointerCapture(stroke.pointerId);
    creatorStatus(stroke.erased?'Eraser stroke complete.':stroke.hit?'Keep at least one piece and one goal. Remove or reassign required goals before erasing their piece.':'Drag across a movable object to erase it.');
  }
  function eraseUnderPoint(x,y){
    // Pointer capture retargets events to the SVG. Hit-test the actual point,
    // and hit-test again after every deletion because indices can change.
    const svg=$('#rp-board-svg');let remaining=draft.pieces.length+draft.goals.length+draft.walls.length+draft.mirrors.length+1;
    while(eraseStroke&&remaining--){
      const elements=document.elementsFromPoint?.(x,y)||[],seen=new Set(),objects=[];
      for(const element of elements){if(!svg.contains(element))continue;const object=objectAt(element);if(!object)continue;const key=object.kind+':'+object.index;if(!seen.has(key)){seen.add(key);objects.push(object);}}
      if(!objects.length)return;eraseStroke.hit=true;let removed=false;
      for(const object of objects)if(eraseObject(object,false)){eraseStroke.erased++;removed=true;break;}
      if(!removed)return;
    }
  }
  function continueEraseStroke(event){
    if(!eraseStroke||event.pointerId!==eraseStroke.pointerId)return;
    const rect=$('#rp-board-svg').getBoundingClientRect(),from=eraseStroke.last,to={x:event.clientX,y:event.clientY};eraseStroke.last=to;
    // Clip to the SVG and sample the whole segment so a fast swipe cannot skip
    // narrow walls or small objects between browser pointer events.
    let first=0,last=1;const dx=to.x-from.x,dy=to.y-from.y;
    for(const [start,delta,min,max] of [[from.x,dx,rect.left,rect.left+rect.width],[from.y,dy,rect.top,rect.top+rect.height]]){
      if(delta===0){if(start<min||start>max)return;}else{const a=(min-start)/delta,b=(max-start)/delta;first=Math.max(first,Math.min(a,b));last=Math.min(last,Math.max(a,b));}
    }
    if(first>last)return;
    const distance=Math.hypot(dx,dy)*(last-first),stride=Math.max(1,rect.width/viewWidth()*4),steps=Math.max(1,Math.ceil(distance/stride));
    for(let i=0;i<=steps&&eraseStroke;i++){const t=first+(last-first)*i/steps;eraseUnderPoint(from.x+dx*t,from.y+dy*t);}
    const p=boardPoint(event);if(p)updatePositionInputs(p);
  }
  function updatePositionInputs(p){$('#rp-edit-row').value=p.row+1;$('#rp-edit-col').value=p.col+1;$('#rp-edit-edge').value=p.edge;}
  $('#rp-board-svg').addEventListener('click',event=>{
    if(mode==='play'){const robot=event.target.closest?.('[data-robot]');if(robot)choose(+robot.dataset.robot,true);return;}
    if(Date.now()<suppressClickUntil||tool==='drag')return;
    const p=boardPoint(event);if(!p)return;updatePositionInputs(p);
    if(tool==='erase'){const object=objectAt(event.target);if(object)eraseObject(object);else creatorStatus('Click a movable object or use Row / Column / Edge to erase at a position.');return;}
    if(tool==='wall'&&p.distance>.28){creatorStatus('Click closer to a grid line, or use Row / Column / Edge.');return;}editCell(p.cell,tool,p.edge);
  });
  $('#rp-board-svg').addEventListener('pointerdown',event=>{
    if(mode!=='create'||event.isPrimary===false||event.button!==undefined&&event.button!==0)return;
    if(tool==='erase'){
      if(eraseStroke)return;
      // Hold the layout steady while removing goal rows above a mobile board.
      root.style.setProperty('--rp-eraser-creator-height',$('#rp-creator').getBoundingClientRect().height+'px');root.style.setProperty('--rp-eraser-goals-height',$('#rp-goal-progress').getBoundingClientRect().height+'px');root.dataset.erasing='true';
      eraseStroke={pointerId:event.pointerId,last:{x:event.clientX,y:event.clientY},erased:0,hit:false};suppressClickUntil=Date.now()+350;event.preventDefault();$('#rp-board-svg').setPointerCapture?.(event.pointerId);continueEraseStroke(event);return;
    }
    if(tool!=='drag')return;
    const p=boardPoint(event);if(!p)return;const placing=placementSelection,object=placing||objectAt(event.target)||editSelection;
    if(!object){creatorStatus('Select a piece, goal, bumper, or movable wall first.');return;}
    editSelection=object;if(object.kind==='piece')selected=object.index;dragState={object,startX:event.clientX,startY:event.clientY,startCell:p.cell,fromObject:!placing&&!!objectAt(event.target)};
    dropPoint=p;updatePositionInputs(p);event.preventDefault();$('#rp-board-svg').setPointerCapture?.(event.pointerId);renderGoalList();drawBoard();updateControls();
  });
  $('#rp-board-svg').addEventListener('pointermove',event=>{
    if(eraseStroke){if(event.pointerId!==eraseStroke.pointerId)return;if(event.buttons===0){endEraseStroke();return;}for(const point of event.getCoalescedEvents?.()||[])continueEraseStroke(point);continueEraseStroke(event);event.preventDefault();return;}
    if(!dragState)return;dropPoint=boardPoint(event);if(dropPoint)updatePositionInputs(dropPoint);drawBoard();event.preventDefault();
  });
  $('#rp-board-svg').addEventListener('pointerup',event=>{
    if(eraseStroke){if(event.pointerId!==eraseStroke.pointerId)return;continueEraseStroke(event);endEraseStroke();event.preventDefault();return;}
    if(!dragState)return;const state=dragState,p=boardPoint(event),moved=Math.hypot(event.clientX-state.startX,event.clientY-state.startY)>5;dragState=null;dropPoint=null;suppressClickUntil=Date.now()+350;
    if(p&&(moved||!state.fromObject)){if(!relocate(state.object,p.cell,p.edge)){drawBoard();updateControls();}}else{drawBoard();updateControls();}event.preventDefault();
  });
  $('#rp-board-svg').addEventListener('pointercancel',event=>{if(eraseStroke&&event.pointerId!==eraseStroke.pointerId)return;endEraseStroke();dragState=null;dropPoint=null;drawBoard();updateControls();});
  $('#rp-board-svg').addEventListener('lostpointercapture',event=>{if(eraseStroke?.pointerId===event.pointerId)endEraseStroke();});
  document.addEventListener('pointerup',event=>{if(eraseStroke?.pointerId===event.pointerId){continueEraseStroke(event);endEraseStroke();}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)endEraseStroke();});
  window.addEventListener?.('blur',endEraseStroke);
  $$('[data-tool]').forEach(button=>button.addEventListener('click',()=>setTool(button.dataset.tool)));
  $('#rp-pieces').addEventListener('click',event=>{const b=event.target.closest('[data-piece]');if(b)choose(+b.dataset.piece);});
  $$('[data-direction]').forEach(b=>b.addEventListener('click',()=>move(+b.dataset.direction)));
  $('#rp-week').addEventListener('change',e=>load(e.target.value,true));$('#rp-play-mode').addEventListener('click',()=>{if(!busy)load(lastPlayId,true);});$('#rp-create-mode').addEventListener('click',enterCreator);
  $('#rp-undo').addEventListener('click',()=>{if(busy||!history.length||mode!=='play'||submitting)return;const previous=history.pop();pieces=previous.pieces;selected=previous.robot;won=false;submitted=false;solvedAt=null;lastPath=null;submissionId=null;scoreMessage='';status('Last move undone.');drawBoard();updateControls();updateScoreHelp();});
  $('#rp-reset').addEventListener('click',()=>{if(!busy&&!submitting&&mode==='play')load(current.id,true);});
  document.addEventListener('keydown',e=>{
    if(e.defaultPrevented||e.altKey||e.isComposing||e.target.closest?.('input,select,textarea,[contenteditable]')||(e.target!==document.body&&e.target!==document.documentElement&&!root.contains(e.target)))return;
    if((e.ctrlKey||e.metaKey)&&!e.shiftKey&&e.key.toLowerCase()==='z'&&mode==='play'){e.preventDefault();$('#rp-undo').click();return;}if(e.ctrlKey||e.metaKey)return;
    if(e.key==='Escape'&&eraseStroke){e.preventDefault();endEraseStroke();return;}
    const dirs={ArrowUp:0,ArrowRight:1,ArrowDown:2,ArrowLeft:3};if(Object.hasOwn(dirs,e.key)&&mode==='play'){e.preventDefault();move(dirs[e.key]);}
    else if(/^[0-9]$/.test(e.key)){const i=e.key==='0'?9:+e.key-1;if(i<pieces.length){e.preventDefault();choose(i,true);}}
    else if(e.key==='['||e.key===']'){e.preventDefault();choose((selected+(e.key===']'?1:pieces.length-1))%pieces.length,true);}
    else if(e.key.toLowerCase()==='z'&&mode==='play'){e.preventDefault();$('#rp-undo').click();}
    else if(e.key==='Escape'&&mode==='create'&&placementSelection){e.preventDefault();placementSelection=null;updateControls();creatorStatus('Placement cancelled.');}
    else if((e.key==='Delete'||e.key==='Backspace')&&mode==='create'&&tool==='drag'&&editSelection){e.preventDefault();removeSelected();}
  });
  $('#rp-goal-list').addEventListener('click',e=>{
    const select=e.target.closest('[data-select-goal]'),remove=e.target.closest('[data-remove-goal]');
    if(select){tool='drag';editSelection={kind:'goal',index:+select.dataset.selectGoal};placementSelection=editSelection;renderGoalList();drawBoard();updateControls();}
    if(remove)removeGoal(+remove.dataset.removeGoal);
  });
  $('#rp-goal-list').addEventListener('change',e=>{
    if(e.target.dataset.goalColor===undefined)return;const index=+e.target.dataset.goalColor,piece=e.target.value==='rainbow'?null:+e.target.value;
    if(piece!==null&&draft.goals.some((g,i)=>i!==index&&g.piece===piece)){renderGoalList();creatorStatus('That piece already has a colored goal.');return;}
    draft.goals[index].piece=piece;knownRoute=null;refreshDraft('Goal changed. All goals must be filled simultaneously.');
  });
  $('#rp-creator-title').addEventListener('input',e=>{draft.title=e.target.value;refreshDraft();});$('#rp-creator-date').addEventListener('change',e=>{draft.date=e.target.value;refreshDraft();});
  $('#rp-creator-count').addEventListener('change',e=>resizeDraft(Number(e.target.value)));
  $('#rp-board-width').addEventListener('change',e=>{const width=Number(e.target.value);resizeBoard(width,['cone','top'].includes(draft.surface)?width:draft.height);});
  $('#rp-board-height').addEventListener('change',e=>{const height=Number(e.target.value);resizeBoard(['cone','top'].includes(draft.surface)?height:draft.width,height);});
  $('#rp-colored-count').addEventListener('change',e=>resizeGoals(Number(e.target.value),draft.goals.filter(g=>g.piece===null).length));
  $('#rp-rainbow-count').addEventListener('change',e=>resizeGoals(draft.goals.filter(g=>g.piece!==null).length,Number(e.target.value)));
  $('#rp-creator-surface').addEventListener('change',e=>{const surface=e.target.value;resizeBoard(draft.width,['cone','top'].includes(surface)?draft.width:draft.height,surface);});
  $('#rp-generate').addEventListener('click',()=>{
    try{const result=generatePuzzle({seed:$('#rp-creator-seed').value,surface:$('#rp-creator-surface').value,count:draft.pieces.length,width:draft.width,height:draft.height,goalPieces:draft.goals.map(g=>g.piece),title:$('#rp-creator-title').value,date:$('#rp-creator-date').value});draft=result.puzzle;knownRoute=result.witness;selected=0;editSelection=null;syncCreatorFields();refreshDraft('Generated a board with a verified route filling every goal. The seed, surface, colors, and goal colors recreate it.');}catch(e){creatorStatus(e.message);}
  });
  $('#rp-clone').addEventListener('click',()=>{draft=clone(archive.find(p=>p.id===lastPlayId));draft.title=(draft.title+' · remix').slice(0,80);knownRoute=null;selected=0;editSelection=null;syncCreatorFields();refreshDraft('Editing a copy of the selected puzzle.');});
  $('#rp-apply-edit').addEventListener('click',()=>{const row=Number($('#rp-edit-row').value),col=Number($('#rp-edit-col').value);if(!Number.isInteger(row)||!Number.isInteger(col)||row<1||row>draft.height||col<1||col>draft.width){creatorStatus('Choose a row and column inside this board.');return;}editCell((row-1)*draft.width+col-1,tool,Number($('#rp-edit-edge').value));});
  $('#rp-delete-object').addEventListener('click',removeSelected);$('#rp-check').addEventListener('click',checkSolvability);
  $('#rp-add').addEventListener('click',()=>{try{const p=addPuzzle(draft);load(p.id,true);status(storageAvailable?'Draft saved in this browser. Download its JSON to publish it.':'Draft open for this session. Copy its code or download its JSON to keep it.');}catch(e){creatorStatus(e.message);}});
  $('#rp-download').addEventListener('click',()=>{try{const exported=exportPuzzle(draft),blob=new Blob([exported.text],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=exported.filename;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);creatorStatus('Downloaded '+exported.filename+'. Add it to _data/ricochet_puzzles/ to publish on its release date.');}catch(e){creatorStatus(e.message);}});
  $('#rp-get-code').addEventListener('click',()=>{updateCode();codeStatus($('#rp-code').value?'Full starting board encoded, including every goal.':'Correct the board before getting a code.');});
  $('#rp-copy-code').addEventListener('click',async()=>{const code=$('#rp-code').value;if(!code)return;try{await navigator.clipboard.writeText(code);codeStatus('Puzzle code copied.');}catch(_){$('#rp-code').focus();$('#rp-code').select();codeStatus('Code selected. Use your browser’s Copy command.');}});
  $('#rp-load-code').addEventListener('click',()=>{try{const p=addPuzzle(decodePuzzle($('#rp-code').value));load(p.id,true);codeStatus('Puzzle loaded as a local draft.');$('#rp-code-panel').open=true;}catch(e){codeStatus(e.message);}});
    function updateScoreHelp(){
    let message=scoreMessage;
    if(!message){
      if(window.RICOCHET_PREVIEW)message='Practice preview. Shared scores are available for released puzzles on the website.';
      else if(!isPublished())message='Local draft. Publish this puzzle before submitting to its shared scoreboard.';
      else if(!apiOrigin)message='The shared score service has not been connected yet.';
      else if(scoreState==='loading')message='Connecting to the shared scoreboard…';
      else if(scoreState==='offline')message='The score service is temporarily unavailable. Your solution is still here; try Refresh before submitting.';
      else if(won)message='All goals are filled. Enter three letters to save your verified move count online.';
      else message='Finish the puzzle to submit a score. Everyone sees the same scoreboard.';
    }
    $('#rp-score-help').textContent=message;
  }
  function drawScores(){
    const rows=scoreRows.slice().sort((a,b)=>a.score-b.score||Date.parse(a.achieved)-Date.parse(b.achieved));
    $('#rp-empty').hidden=rows.length>0;$('#rp-table-wrap').hidden=!rows.length;
    $('#rp-empty').textContent=scoreState==='loading'?'Loading scores…':scoreState==='online'?'No scores yet. Solve this puzzle to add the first.':scoreState==='preview'?'Scores appear here on the published game.':'No shared scores loaded.';
    let place=0;$('#rp-scores').innerHTML=rows.map((r,i)=>{if(i===0||r.score!==rows[i-1].score)place=i+1;return `<tr><td class="rp-numeric">${place}</td><td>${escape(r.name)}</td><td class="rp-numeric">${r.score}</td><td><time datetime="${escape(r.achieved)}">${escape(new Date(r.achieved).toLocaleString(undefined,{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'}))}</time></td></tr>`;}).join('');
    const badge=$('#rp-score-connection');badge.dataset.state=scoreState;badge.textContent=scoreState==='online'?'Saved online':scoreState==='loading'?'Connecting…':scoreState==='preview'?'Practice preview':!isPublished()?'Local draft':scoreState==='offline'?'Connection unavailable':'Not connected';
    const previous=legacyRecords.filter(r=>r?.puzzle===current.id&&/^[A-Z]{3}$/.test(r.name)&&Number.isInteger(r.score)&&r.score>0&&Number.isFinite(Date.parse(r.achieved)));
    $('#rp-previous-scores').hidden=!previous.length;$('#rp-previous-rows').innerHTML=previous.map(r=>`<p class="rp-small">${escape(r.name)} · ${r.score} moves · ${escape(new Date(r.achieved).toLocaleDateString())}</p>`).join('');
    updateScoreHelp();updateControls();
  }
  async function scoreRequest(path,options={}){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
    try{
      const response=await fetch(apiOrigin+path,{...options,signal:controller.signal,mode:'cors',credentials:'omit',cache:'no-store'});
      let data;try{data=await response.json();}catch(_){throw Error('The score service did not return a valid response.');}
      if(!response.ok)throw Error(data.error||'Unable to connect to the score service.');return data;
    }finally{clearTimeout(timer);}
  }
  function validScores(data){
    if(!Array.isArray(data?.scores))throw Error('The score service returned invalid scores.');
    return data.scores.filter(r=>r&&/^[A-Z]{3}$/.test(r.name)&&Number.isInteger(r.score)&&r.score>0&&Number.isFinite(Date.parse(r.achieved))).slice(0,100);
  }
  async function loadScores(){
    const token=++scoreToken,id=current.id;scoreRows=[];scoreMessage='';
    if(window.RICOCHET_PREVIEW||!isPublished()||!apiOrigin){scoreState=window.RICOCHET_PREVIEW?'preview':'idle';drawScores();return;}
    scoreState='loading';drawScores();
    try{const data=await scoreRequest('/api/scores?puzzle='+encodeURIComponent(id));if(token!==scoreToken||current.id!==id)return;scoreRows=validScores(data);scoreState='online';}
    catch(e){if(token!==scoreToken||current.id!==id)return;scoreState='offline';scoreMessage=e.name==='AbortError'?'The scoreboard took too long to respond. Try Refresh.':e.message;}
    drawScores();
  }
  $('#rp-refresh-scores').addEventListener('click',loadScores);
  $('#rp-initials').addEventListener('input',e=>{e.target.value=e.target.value.replace(/[^a-z]/gi,'').toUpperCase().slice(0,3);});
  $('#rp-score-form').addEventListener('submit',async event=>{
    event.preventDefault();if(mode!=='play'||!won||submitted||submitting||busy||scoreState!=='online'||!isPublished())return;
    const name=$('#rp-initials').value.toUpperCase();if(!/^[A-Z]{3}$/.test(name)){scoreMessage='Use exactly three letters, A–Z.';updateScoreHelp();$('#rp-initials').focus();return;}
    const id=current.id,token=scoreToken,solution=history.map(h=>[h.robot,h.dir]);submitting=true;scoreMessage='Verifying and saving your solution…';drawScores();
    try{
      const data=await scoreRequest('/api/scores',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({puzzle:id,name,solution,submissionId})});
      if(token!==scoreToken||current.id!==id)return;
      scoreRows=validScores(data);submitted=true;scoreMessage=`Saved online: ${name} · ${solution.length} moves. Your best verified score for these initials appears above.`;
    }catch(e){if(token!==scoreToken||current.id!==id)return;scoreMessage=e.name==='AbortError'?'The save timed out. Try submitting again; a retry will not duplicate your score.':'Score was not confirmed: '+e.message;}
    finally{submitting=false;if(token===scoreToken&&current.id===id)drawScores();else updateControls();}
  });

  if(typeof ResizeObserver==='function')new ResizeObserver(entries=>{const width=entries[0].contentRect.width;if(width>0)root.style.setProperty('--rp-svg-scale',String(viewWidth()/width));}).observe($('.rp-board'));
  /* TEST_API */
  renderArchive();load(archive[0].id);if(IS_CREATOR)enterCreator();
})();
