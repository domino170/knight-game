import './style.css';

const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
const ctx = canvas.getContext('2d')!;
const W = canvas.width, H = canvas.height;
const ui = (id: string) => document.getElementById(id)!;
const keys = new Set<string>();
type Point = { x: number; y: number };
type Dragon = Point & { kind:'biter'|'fire'; maxHp:number; fireCooldown:number; hp: number; cooldown: number; flash: number; home: Point; color: string };
type Particle = Point & { vx: number; vy: number; life: number; color: string };
let obstacles = [{x:260,y:180,r:34},{x:410,y:410,r:38},{x:690,y:260,r:33},{x:780,y:475,r:30}];
const princess = {x:880,y:105};
let level=1;
const gate={x:830,y:290,hp:5};
type Rect={x:number;y:number;w:number;h:number};
const castleWalls:Rect[]=[{x:720,y:65,w:220,h:18},{x:720,y:65,w:18,h:240},{x:922,y:65,w:18,h:240},{x:720,y:280,w:80,h:25},{x:860,y:280,w:80,h:25}];
let fireballs:(Point & {vx:number;vy:number;life:number})[]=[];
const intersects=(p:Point,r:number,box:Rect)=>Math.hypot(p.x-Math.max(box.x,Math.min(p.x,box.x+box.w)),p.y-Math.max(box.y,Math.min(p.y,box.y+box.h)))<r;
function blocked(p:Point,r:number){
  return obstacles.some(o=>distance(p,o)<o.r+r)||(level===2&&(castleWalls.some(w=>intersects(p,r,w))||(gate.hp>0&&intersects(p,r,{x:800,y:280,w:60,h:25}))));
}
let knight: Point & {hp:number; angle:number; invincible:number; swing:number; cooldown:number};
let dragons: Dragon[];
let particles: Particle[] = [];
let state: 'playing'|'celebrating'|'won'|'lost';
let celebration = 0;
let hearts: (Point & {vx:number; vy:number; life:number; size:number})[] = [];
let walking = false;
let time = 0;
const distance = (a: Point,b: Point) => Math.hypot(a.x-b.x,a.y-b.y);
const facing = (a: Point, angle: number, b: Point, threshold: number) => {
  const d = distance(a,b);
  return d === 0 || ((b.x-a.x)*Math.cos(angle)+(b.y-a.y)*Math.sin(angle))/d > threshold;
};
function reset() {
  fireballs=[];gate.hp=5;
  princess.x=level===1?880:830;princess.y=level===1?105:155;
  obstacles=level===1?[{x:260,y:180,r:34},{x:410,y:410,r:38},{x:690,y:260,r:33},{x:780,y:475,r:30}]:[{x:260,y:230,r:30},{x:450,y:440,r:35},{x:610,y:170,r:30}];
  knight = {x:120,y:495,hp:3,angle:-Math.PI/2,invincible:0,swing:0,cooldown:0};
  const spawns=level===1?[{x:360,y:130,kind:'biter' as const},{x:570,y:490,kind:'biter' as const},{x:820,y:310,kind:'biter' as const}]:[{x:350,y:130,kind:'biter' as const},{x:580,y:490,kind:'biter' as const},{x:620,y:310,kind:'fire' as const},{x:850,y:430,kind:'fire' as const}];
  dragons=spawns.map(d=>({...d,hp:d.kind==='fire'?5:3,maxHp:d.kind==='fire'?5:3,color:d.kind==='fire'?'#c7633e':'#7fa36a',fireCooldown:1.5,cooldown:0,flash:0,home:{x:d.x,y:d.y}}));
  ui('level').textContent=level===1?'I · ROSEWOOD GROVE':'II · EMBERKEEP CASTLE';
  particles=[]; hearts=[]; celebration=0; walking=false; keys.clear(); state='playing'; ui('overlay').hidden=true; updateHud(); canvas.focus({preventScroll:true});
}
function updateHud() {
  ui('health').textContent='♥'.repeat(knight.hp)+'♡'.repeat(3-knight.hp);
  ui('health-count').textContent=`${knight.hp} / 3`;
  ui('health').setAttribute('aria-label',`${knight.hp} of 3 hearts`);
  const remaining=dragons.filter(d=>d.hp>0).length;
  ui('quest').textContent=remaining?`${remaining} dragons remain${level===2?` · Gate ${gate.hp}/5`:''}`:level===2&&gate.hp>0?`Break the castle gate: ${gate.hp}/5`:'The path is clear. Rescue the princess!';
}
function finish(won:boolean) {
  state=won?'won':'lost'; ui('overlay').hidden=false;
  ui('end-label').textContent=won?'QUEST COMPLETE':'COURAGE NEVER ENDS';
  ui('end-title').textContent=won?'A storybook ending.':'Rise again, brave knight.';
  ui('again').textContent=won&&level===1?'Next stage →':'Play again →';
  if(won&&level===1){ui('end-title').textContent='Onward to Emberkeep!';}
  ui('end-copy').textContent=won&&level===1?'The grove is safe. Your next quest leads to Emberkeep, where fire dragons guard a locked castle.':won?'The dragons are defeated, and the princess is safe. Rosewood will remember your courage.':'The grove still needs its hero. Use your shield to block attacks, then strike when the dragons get close.';
}
function celebrate() {
  state='celebrating'; celebration=0; keys.clear(); knight.swing=0;
  fireballs=[];ui('quest').textContent='Princess Elowen is safe!';
}
function updateCelebration(dt:number) {
  const before=Math.floor(celebration*9); celebration+=dt;
  if(Math.floor(celebration*9)>before){
    const a=Math.atan2(knight.y-princess.y,knight.x-princess.x);
    hearts.push({x:princess.x,y:princess.y-22,vx:Math.cos(a)*45+(Math.random()-.5)*35,vy:Math.sin(a)*30-45,life:1.8,size:7+Math.random()*6});
  }
  if(celebration>=3.2)finish(true);
}
function burst(p:Point,color:string) {
  for(let i=0;i<12;i++){const a=Math.random()*Math.PI*2,s=30+Math.random()*90;particles.push({...p,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.5,color});}
}
function move(p:Point,dx:number,dy:number,r:number) {
  const allowed=(x:number,y:number)=> x>=40+r&&x<=W-40-r&&y>=35+r&&y<=H-35-r&&!blocked({x,y},r);
  if(allowed(p.x+dx,p.y))p.x+=dx;
  if(allowed(p.x,p.y+dy))p.y+=dy;
}
function attack() {
  if(state!=='playing'||knight.cooldown>0||keys.has('Shift'))return;
  knight.swing=.2;knight.cooldown=.42;
  for(const d of dragons)if(d.hp>0&&distance(knight,d)<85&&facing(knight,knight.angle,d,.15)){
    d.hp--;d.flash=.2;burst(d,'#f6d994');
    const a=Math.atan2(d.y-knight.y,d.x-knight.x);move(d,Math.cos(a)*22,Math.sin(a)*22,23);
    if(d.hp===0)burst(d,d.color);
  }
  if(level===2&&gate.hp>0&&distance(knight,gate)<85&&facing(knight,knight.angle,gate,.15)){
    gate.hp--;burst(gate,'#d7a56c');
  }
  updateHud();
}
window.addEventListener('keydown',e=>{if(['KeyW','KeyA','KeyS','KeyD','Space','ShiftLeft','ShiftRight','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();keys.add(e.code);if(e.code.startsWith('Shift'))keys.add('Shift');if(e.code==='Space'&&!e.repeat)attack();});
window.addEventListener('keyup',e=>{keys.delete(e.code);if(e.code.startsWith('Shift')&&!keys.has('ShiftLeft')&&!keys.has('ShiftRight'))keys.delete('Shift');});
window.addEventListener('blur',()=>keys.clear());
ui('restart').onclick=reset;ui('again').onclick=()=>{if(state==='won')level=level===1?2:1;reset();};
function hurt(){
  if(knight.invincible>0)return;
  knight.hp--;knight.invincible=1.25;burst(knight,'#ef8a78');updateHud();
  if(knight.hp===0)finish(false);
}
function clearShot(a:Point,b:Point){
  const length=distance(a,b),steps=Math.ceil(length/12);
  for(let i=1;i<steps;i++)if(blocked({x:a.x+(b.x-a.x)*i/steps,y:a.y+(b.y-a.y)*i/steps},8))return false;
  return true;
}
function updateFireballs(dt:number){
  fireballs=fireballs.filter(f=>{
    // Substeps stop fast projectiles from crossing thin walls or the shield.
    const steps=Math.max(1,Math.ceil(190*dt/8));
    for(let i=0;i<steps;i++){
      f.x+=f.vx*dt/steps;f.y+=f.vy*dt/steps;
      if(blocked(f,8)||f.x<35||f.x>W-35||f.y<30||f.y>H-30)return false;
      if(distance(f,knight)<27){
        if(keys.has('Shift')&&facing(knight,knight.angle,f,.3))burst(f,'#b1e4df');else hurt();
        return false;
      }
    }
    f.life-=dt;return f.life>0;
  });
}
function update(dt:number) {
  time+=dt;
  particles=particles.filter(p=>(p.life-=dt)>0);for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;}
  hearts=hearts.filter(h=>(h.life-=dt)>0);
  for(const h of hearts){h.x+=h.vx*dt;h.y+=h.vy*dt;}
  if(state==='celebrating'){updateCelebration(dt);return;}
  if(state!=='playing')return;
  knight.cooldown=Math.max(0,knight.cooldown-dt);knight.swing=Math.max(0,knight.swing-dt);knight.invincible=Math.max(0,knight.invincible-dt);
  const dx=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'));
  const dy=Number(keys.has('KeyS')||keys.has('ArrowDown'))-Number(keys.has('KeyW')||keys.has('ArrowUp'));
  walking=Boolean(dx||dy);
  if(dx||dy){knight.angle=Math.atan2(dy,dx);const s=(keys.has('Shift')?105:205)*dt/Math.hypot(dx,dy);move(knight,dx*s,dy*s,17);}
  for(const d of dragons){
    if(d.hp<=0)continue;d.cooldown=Math.max(0,d.cooldown-dt);d.flash=Math.max(0,d.flash-dt);
    const dist=distance(d,knight),target=dist<(d.kind==='fire'?440:280)?knight:d.home;
    d.fireCooldown=Math.max(0,d.fireCooldown-dt);
    if(d.kind==='fire'&&dist<440&&d.fireCooldown===0&&clearShot(d,knight)){
      const a=Math.atan2(knight.y-d.y,knight.x-d.x);
      fireballs.push({x:d.x,y:d.y,vx:Math.cos(a)*190,vy:Math.sin(a)*190,life:4});d.fireCooldown=2.2;burst(d,'#ffb35c');
    }
    if(dist>(d.kind==='fire'&&target===knight?175:44)&&distance(d,target)>5){const a=Math.atan2(target.y-d.y,target.x-d.x);move(d,Math.cos(a)*(d.kind==='fire'?45:80)*dt,Math.sin(a)*(d.kind==='fire'?45:80)*dt,d.kind==='fire'?29:19);}
    if(dist<53&&d.cooldown===0){d.cooldown=1.15;
      if(keys.has('Shift')&&facing(knight,knight.angle,d,.3)){burst(knight,'#b1e4df');move(d,(d.x-knight.x)*.45,(d.y-knight.y)*.45,23);}
      else hurt();
      if(state!=='playing')return;
    }
  }
  updateFireballs(dt);if(state!=='playing')return;
  if(dragons.every(d=>d.hp===0)&&(level===1||gate.hp===0)&&distance(knight,princess)<48)celebrate();
}
function ellipse(x:number,y:number,rx:number,ry:number,color:string){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();}
function polygon(points:number[][],color:string){ctx.fillStyle=color;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();}
function tree(x:number,y:number,s=1){ctx.save();ctx.translate(x,y);ctx.scale(s,s);ellipse(3,15,31,12,'#172e2855');ctx.fillStyle='#604e38';ctx.fillRect(-5,-12,10,30);ellipse(-13,-22,22,22,'#234c3c');ellipse(14,-24,23,25,'#2c5840');ellipse(0,-40,24,26,'#386445');ellipse(-8,-48,12,10,'#497950');ctx.restore();}
function heart(x:number,y:number,size:number,color:string) {
  ctx.save();ctx.translate(x,y);ctx.scale(size/10,size/10);ctx.fillStyle=color;
  ctx.beginPath();ctx.moveTo(0,7);ctx.bezierCurveTo(-18,-4,-7,-15,0,-6);ctx.bezierCurveTo(7,-15,18,-4,0,7);ctx.fill();ctx.restore();
}
function drawKnight(){
  const stride=walking&&state==='playing'?Math.sin(time*14):0;
  const bob=Math.abs(stride)*2+Math.sin(time*3)*.6;
  ctx.save();ctx.translate(knight.x,knight.y+bob);ellipse(0,18,20,8,'#15332d66');
  if(knight.invincible>0&&Math.floor(time*12)%2)ctx.globalAlpha=.45;
  const flutter=Math.sin(time*9)*3;
  polygon([[-12,4],[-17+flutter,23],[0,18],[13+flutter,23],[10,2]],'#b64e4b');
  polygon([[-8,6],[-10+flutter,20],[-3,17],[0,6]],'#d27164');
  ctx.fillStyle='#344954';ctx.fillRect(-10,11+stride*3,7,12);ctx.fillRect(4,11-stride*3,7,12);
  ellipse(0,3,13,16,'#b4c7c5');polygon([[-9,-3],[-2,-7],[-2,13],[-8,10]],'#dce6d8');ctx.fillStyle='#d6b56b';ctx.fillRect(-11,9,22,4);ellipse(-2,-13,14,14,'#d3dfd5');
  polygon([[0,-28],[4,-20],[3,-12],[-2,-14]],'#be5f50');
  ctx.fillStyle='#526a70';ctx.fillRect(-12,-14,24,6);ctx.fillStyle='#152e36';ctx.fillRect(-8,-13,6,3);ctx.fillRect(3,-13,6,3);
  ctx.strokeStyle='#edf2df';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-5,-23);ctx.lineTo(3,-25);ctx.stroke();
  ctx.rotate(knight.angle);
  const blocking=keys.has('Shift');ctx.save();ctx.translate(blocking?23:7,blocking?0:18);polygon([[-8,-11],[8,-11],[9,2],[0,12],[-9,2]],blocking?'#a3dbcd':'#698f9c');ctx.strokeStyle='#e3c78c';ctx.lineWidth=3;ctx.stroke();ctx.fillStyle='#e4cf96';ctx.fillRect(-1,-7,2,12);ctx.restore();
  ctx.save();ctx.rotate(knight.swing>0?-.9+2*(1-knight.swing/.2):-.35);ctx.fillStyle='#c8dfdc';ctx.fillRect(15,-13,29,5);polygon([[44,-13],[51,-10],[44,-8]],'#e9efdc');ctx.fillStyle='#e0bd70';ctx.fillRect(12,-18,4,15);ctx.fillStyle='#775537';ctx.fillRect(4,-12,10,4);ctx.restore();
  if(blocking){ctx.strokeStyle='#b4f2e099';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,32,-.9,.9);ctx.stroke();}
  if(knight.swing>0){ctx.strokeStyle='#fff1bd';ctx.lineWidth=5;ctx.beginPath();ctx.arc(0,0,65,-.9,.9);ctx.stroke();}ctx.restore();
  ctx.fillStyle='#18332eee';ctx.fillRect(knight.x-22,knight.y-47,44,7);
  ctx.fillStyle=knight.hp===1?'#f18e82':'#a9d8a0';ctx.fillRect(knight.x-21,knight.y-46,42*knight.hp/3,5);
}
function drawDragon(d:Dragon){
  ctx.save();ctx.translate(d.x,d.y+Math.sin(time*6+d.home.x)*1.8);ellipse(0,19,30,10,'#173c3266');
  const flip=knight.x<d.x?-1:1,scale=d.kind==='fire'?1.3:.8;ctx.scale(flip*scale,scale);const flap=Math.sin(time*5+d.home.x)*4;
  polygon([[-10,0],[-39,-28-flap],[-30,-2],[-20,-10],[-16,9]],'#6b584c');polygon([[1,0],[17,-32-flap],[31,-13],[21,-13],[22,4]],d.color);
  polygon([[-15,8],[-43,14+Math.sin(time*7)*5],[-29,5],[-23,-4]],d.color);ellipse(0,5,22,17,d.flash>0?'#ffe8bc':d.color);ellipse(19,-6,16,14,d.flash>0?'#ffe8bc':d.color);ellipse(31,-1,12,8,d.color);
  polygon([[8,-16],[11,-28],[17,-17]],'#ebd5a1');polygon([[24,-17],[31,-26],[31,-12]],'#ebd5a1');ellipse(24,-8,4,5,'#f5dfac');ellipse(26,-8,1.6,3,'#192f31');ellipse(36,-3,1.5,1.5,'#392d2b');
  ellipse(0,9,13,9,'#f1cf9366');for(let i=0;i<4;i++)polygon([[-19+i*9,-7],[-16+i*9,-16],[-12+i*9,-6]],'#edd4a1');
  const step=Math.sin(time*8+d.home.x)*2;ctx.fillStyle='#473d39';ctx.fillRect(-11,16+step,8,7);ctx.fillRect(13,14-step,8,8);ctx.restore();
  for(let i=0;i<d.maxHp;i++)ellipse(d.x-(d.maxHp-1)*5+i*10,d.y-(d.kind==='fire'?51:34),3,3,i<d.hp?'#ebc888':'#334e42');
  if(d.kind==='fire'){ctx.textAlign='center';ctx.fillStyle='#ffd18b';ctx.font='10px system-ui';ctx.fillText('FIRE',d.x,d.y-64);}
}
function drawPrincess(){
  const unlocked=dragons.every(d=>d.hp===0)&&(level===1||gate.hp===0);ellipse(princess.x,princess.y+12,44,21,unlocked?'#e5d68c33':'#cdd9bf14');
  const jump=state==='celebrating'?Math.abs(Math.sin(celebration*7))*22:Math.sin(time*2)*1.2;
  ellipse(princess.x,princess.y+21,18-jump*.15,6,'#203c3255');
  ctx.save();ctx.translate(princess.x,princess.y-jump);polygon([[-8,-3],[-17,20],[17,20],[8,-3]],'#c695b9');polygon([[-3,0],[-8,19],[8,19],[3,0]],'#efd4d8');ellipse(0,-15,12,14,'#c09a52');ellipse(0,-12,8,10,'#f0cdad');ellipse(-3,-13,1,1,'#423338');ellipse(3,-13,1,1,'#423338');
  ctx.strokeStyle='#bd6574';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,-10,3,0,Math.PI);ctx.stroke();
  const wave=Math.sin(time*9)*5;ctx.strokeStyle='#f0cdad';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-7,-2);ctx.lineTo(-17,state==='celebrating'?-16+wave:5);ctx.moveTo(7,-2);ctx.lineTo(17,state==='celebrating'?-16-wave:5);ctx.stroke();polygon([[-10,-25],[-11,-34],[-5,-29],[0,-36],[5,-29],[11,-34],[10,-25]],'#e7c56e');ctx.restore();
  ctx.textAlign='center';ctx.fillStyle='#f2dfaf';ctx.font='11px Georgia';ctx.fillText(state==='celebrating'?'My hero! Thank you!':unlocked?'Come, brave knight!':'Princess Elowen',princess.x,princess.y-47);
  if(!unlocked){ctx.strokeStyle='#d6e3d066';ctx.lineWidth=2;for(let i=-1;i<=1;i++){ctx.beginPath();ctx.moveTo(princess.x+i*16,princess.y-38);ctx.lineTo(princess.x+i*16,princess.y+23);ctx.stroke();}}
}
function drawCastle(){
  ctx.fillStyle='#777d8b';ctx.fillRect(720,65,220,240);ctx.fillStyle='#414756';ctx.fillRect(738,83,184,197);
  // Open-roof courtyard keeps the rescue and collision boundaries visible.
  for(const w of castleWalls){ctx.fillStyle='#a2a4ae';ctx.fillRect(w.x,w.y,w.w,w.h);ctx.strokeStyle='#616776';ctx.lineWidth=2;ctx.strokeRect(w.x,w.y,w.w,w.h);}
  for(let x=720;x<940;x+=24){ctx.fillStyle='#c2b9b3';ctx.fillRect(x,55,15,15);}
  for(const x of [720,922]){ctx.fillStyle='#959aab';ctx.fillRect(x-12,62,38,54);polygon([[x-16,62],[x+7,30],[x+30,62]],'#754e65');}
  if(gate.hp>0){
    ctx.fillStyle='#7b503c';ctx.fillRect(800,280,60,25);
    ctx.strokeStyle='#d1a568';ctx.lineWidth=3;for(let x=808;x<860;x+=12){ctx.beginPath();ctx.moveTo(x,281);ctx.lineTo(x,304);ctx.stroke();}
    ctx.fillStyle='#1e2433';ctx.fillRect(800,314,60,7);ctx.fillStyle='#e4b56e';ctx.fillRect(800,314,60*gate.hp/5,7);
    ctx.fillStyle='#f4ddad';ctx.font='11px system-ui';ctx.textAlign='center';ctx.fillText('GATE · '+gate.hp+'/5',830,340);
  }else{for(let i=0;i<5;i++){ctx.fillStyle='#90684b';ctx.fillRect(801+i*13,300+(i%2)*9,9,4);}}
  ctx.fillStyle='#f4ddad';ctx.font='12px Georgia';ctx.textAlign='center';ctx.fillText('EMBERKEEP',830,125);
}
function draw(){
  const grass=ctx.createLinearGradient(0,0,W,H);grass.addColorStop(0,level===1?'#66885c':'#646b7e');grass.addColorStop(.5,level===1?'#4b7051':'#4a5265');grass.addColorStop(1,level===1?'#365e4c':'#333b50');ctx.fillStyle=grass;ctx.fillRect(0,0,W,H);
  // Deterministic ground details keep the grove calm and inexpensive to draw.
  for(let i=0;i<230;i++){const x=(i*137.3)%W,y=(i*83.7)%H;ctx.strokeStyle=i%3?'#6b88584d':'#365a4777';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-2,y-4);ctx.moveTo(x,y);ctx.lineTo(x+3,y-3);ctx.stroke();}
  ctx.strokeStyle='#ac9a6977';ctx.lineWidth=56;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(115,525);ctx.bezierCurveTo(180,310,520,335,540,235);ctx.bezierCurveTo(570,130,760,160,880,105);ctx.stroke();
  for(let i=0;i<28;i++){const x=80+(i*173)%840,y=60+(i*97)%510;ellipse(x,y,2,2,i%2?'#dfc785':'#cda5a2');}
  for(let x=20;x<W;x+=54){tree(x,20,.9);tree(x,H-5,.9);}for(let y=90;y<H-45;y+=62){tree(18,y,.95);tree(W-15,y,.95);}
  if(level===2){ctx.fillStyle='#7d7d8588';for(let x=90;x<930;x+=50)for(let y=90;y<570;y+=45)ctx.strokeRect(x,y,47,42);drawCastle();}
  else{ellipse(880,118,60,30,'#718778');ellipse(880,112,57,28,'#a0ac8c');ellipse(880,109,49,22,'#869d80');}
  for(const o of obstacles){ellipse(o.x+5,o.y+13,o.r+4,o.r*.5,'#284a3a66');polygon([[o.x-o.r,o.y+9],[o.x-o.r*.8,o.y-15],[o.x-4,o.y-o.r*.7],[o.x+o.r*.8,o.y-12],[o.x+o.r,o.y+13],[o.x,o.y+22]],'#748477');polygon([[o.x-o.r*.8,o.y-15],[o.x-4,o.y-o.r*.7],[o.x+o.r*.8,o.y-12],[o.x+5,o.y+3]],'#9aa38a');ellipse(o.x-12,o.y+9,14,5,'#5d794e');}
  // Draw characters from back to front for natural overlap.
  const actors=[{y:princess.y,draw:drawPrincess},{y:knight.y,draw:drawKnight},...dragons.filter(d=>d.hp>0).map(d=>({y:d.y,draw:()=>drawDragon(d)}))];
  actors.sort((a,b)=>a.y-b.y).forEach(a=>a.draw());
  for(let i=0;i<18;i++){const x=(i*173+Math.sin(time*.8+i)*12)%W,y=(i*97+time*5)%H;ellipse(x,y,1.5,1.5,'#f7e6a077');}
  for(const f of fireballs){ellipse(f.x-f.vx*.035,f.y-f.vy*.035,13,8,'#f1643788');ellipse(f.x,f.y,9,9,'#ff9b3d');ellipse(f.x,f.y,4,4,'#fff1a6');}
  for(const h of hearts){ctx.globalAlpha=Math.min(1,h.life*2);heart(h.x,h.y,h.size,'#ff9eb8');}ctx.globalAlpha=1;
  for(const p of particles){ctx.globalAlpha=p.life*2;ellipse(p.x,p.y,3,3,p.color);}ctx.globalAlpha=1;
  const glow=ctx.createRadialGradient(500,280,100,500,280,650);glow.addColorStop(0,'#0000');glow.addColorStop(1,'#0c282c66');ctx.fillStyle=glow;ctx.fillRect(0,0,W,H);
  ctx.textAlign='left';ctx.font='11px Georgia';ctx.fillStyle='#e2dbb4';ctx.fillText(level===1?'ROSEWOOD GROVE':'EMBERKEEP APPROACH',59,65);
}
reset();let previous=performance.now();function frame(now:number){update(Math.min((now-previous)/1000,.04));previous=now;draw();requestAnimationFrame(frame);}requestAnimationFrame(frame);

