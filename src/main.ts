import './style.css';

const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
const ctx = canvas.getContext('2d')!;
const W = canvas.width, H = canvas.height;
const ui = (id: string) => document.getElementById(id)!;
const keys = new Set<string>();
type Point = { x: number; y: number };
type Dragon = Point & { hp: number; cooldown: number; flash: number; home: Point; color: string };
type Particle = Point & { vx: number; vy: number; life: number; color: string };
const obstacles = [{x:260,y:180,r:34},{x:410,y:410,r:38},{x:690,y:260,r:33},{x:780,y:475,r:30}];
const princess = {x:880,y:105};
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
  knight = {x:120,y:495,hp:3,angle:-Math.PI/2,invincible:0,swing:0,cooldown:0};
  dragons = [{x:360,y:130,color:'#b85c49'},{x:570,y:490,color:'#9170aa'},{x:820,y:310,color:'#cc8d46'}].map(d=>({...d,hp:3,cooldown:0,flash:0,home:{x:d.x,y:d.y}}));
  particles=[]; hearts=[]; celebration=0; walking=false; keys.clear(); state='playing'; ui('overlay').hidden=true; updateHud(); canvas.focus({preventScroll:true});
}
function updateHud() {
  ui('health').textContent='♥'.repeat(knight.hp)+'♡'.repeat(3-knight.hp);
  ui('health-count').textContent=`${knight.hp} / 3`;
  ui('health').setAttribute('aria-label',`${knight.hp} of 3 hearts`);
  const remaining=dragons.filter(d=>d.hp>0).length;
  ui('quest').textContent=remaining?`${remaining} dragons guard the grove`:'The path is clear. Rescue the princess!';
}
function finish(won:boolean) {
  state=won?'won':'lost'; ui('overlay').hidden=false;
  ui('end-label').textContent=won?'QUEST COMPLETE':'COURAGE NEVER ENDS';
  ui('end-title').textContent=won?'A storybook ending.':'Rise again, brave knight.';
  ui('end-copy').textContent=won?'The dragons are defeated, and the princess is safe. Rosewood will remember your courage.':'The grove still needs its hero. Use your shield to block attacks, then strike when the dragons get close.';
}
function celebrate() {
  state='celebrating'; celebration=0; keys.clear(); knight.swing=0;
  ui('quest').textContent='Princess Elowen is safe!';
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
  const allowed=(x:number,y:number)=> x>=40+r&&x<=W-40-r&&y>=35+r&&y<=H-35-r&&obstacles.every(o=>Math.hypot(x-o.x,y-o.y)>o.r+r);
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
  updateHud();
}
window.addEventListener('keydown',e=>{if(['KeyW','KeyA','KeyS','KeyD','Space','ShiftLeft','ShiftRight','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();keys.add(e.code);if(e.code.startsWith('Shift'))keys.add('Shift');if(e.code==='Space'&&!e.repeat)attack();});
window.addEventListener('keyup',e=>{keys.delete(e.code);if(e.code.startsWith('Shift')&&!keys.has('ShiftLeft')&&!keys.has('ShiftRight'))keys.delete('Shift');});
window.addEventListener('blur',()=>keys.clear());
ui('restart').onclick=reset;ui('again').onclick=reset;
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
    const dist=distance(d,knight),target=dist<280?knight:d.home;
    if(dist>44&&distance(d,target)>5){const a=Math.atan2(target.y-d.y,target.x-d.x);move(d,Math.cos(a)*68*dt,Math.sin(a)*68*dt,23);}
    if(dist<53&&d.cooldown===0){d.cooldown=1.15;
      if(keys.has('Shift')&&facing(knight,knight.angle,d,.3)){burst(knight,'#b1e4df');move(d,(d.x-knight.x)*.45,(d.y-knight.y)*.45,23);}
      else if(knight.invincible===0){knight.hp--;knight.invincible=1.25;burst(knight,'#ef8a78');updateHud();if(knight.hp===0){finish(false);return;}}
    }
  }
  if(dragons.every(d=>d.hp===0)&&distance(knight,princess)<48)celebrate();
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
  const flip=knight.x<d.x?-1:1;ctx.scale(flip,1);const flap=Math.sin(time*5+d.home.x)*4;
  polygon([[-10,0],[-39,-28-flap],[-30,-2],[-20,-10],[-16,9]],'#6b584c');polygon([[1,0],[17,-32-flap],[31,-13],[21,-13],[22,4]],d.color);
  polygon([[-15,8],[-43,14+Math.sin(time*7)*5],[-29,5],[-23,-4]],d.color);ellipse(0,5,22,17,d.flash>0?'#ffe8bc':d.color);ellipse(19,-6,16,14,d.flash>0?'#ffe8bc':d.color);ellipse(31,-1,12,8,d.color);
  polygon([[8,-16],[11,-28],[17,-17]],'#ebd5a1');polygon([[24,-17],[31,-26],[31,-12]],'#ebd5a1');ellipse(24,-8,4,5,'#f5dfac');ellipse(26,-8,1.6,3,'#192f31');ellipse(36,-3,1.5,1.5,'#392d2b');
  ellipse(0,9,13,9,'#f1cf9366');for(let i=0;i<4;i++)polygon([[-19+i*9,-7],[-16+i*9,-16],[-12+i*9,-6]],'#edd4a1');
  const step=Math.sin(time*8+d.home.x)*2;ctx.fillStyle='#473d39';ctx.fillRect(-11,16+step,8,7);ctx.fillRect(13,14-step,8,8);ctx.restore();
  for(let i=0;i<3;i++)ellipse(d.x-10+i*10,d.y-38,3,3,i<d.hp?'#ebc888':'#334e42');
}
function drawPrincess(){
  const unlocked=dragons.every(d=>d.hp===0);ellipse(princess.x,princess.y+12,44,21,unlocked?'#e5d68c33':'#cdd9bf14');
  const jump=state==='celebrating'?Math.abs(Math.sin(celebration*7))*22:Math.sin(time*2)*1.2;
  ellipse(princess.x,princess.y+21,18-jump*.15,6,'#203c3255');
  ctx.save();ctx.translate(princess.x,princess.y-jump);polygon([[-8,-3],[-17,20],[17,20],[8,-3]],'#c695b9');polygon([[-3,0],[-8,19],[8,19],[3,0]],'#efd4d8');ellipse(0,-15,12,14,'#c09a52');ellipse(0,-12,8,10,'#f0cdad');ellipse(-3,-13,1,1,'#423338');ellipse(3,-13,1,1,'#423338');
  ctx.strokeStyle='#bd6574';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,-10,3,0,Math.PI);ctx.stroke();
  const wave=Math.sin(time*9)*5;ctx.strokeStyle='#f0cdad';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-7,-2);ctx.lineTo(-17,state==='celebrating'?-16+wave:5);ctx.moveTo(7,-2);ctx.lineTo(17,state==='celebrating'?-16-wave:5);ctx.stroke();polygon([[-10,-25],[-11,-34],[-5,-29],[0,-36],[5,-29],[11,-34],[10,-25]],'#e7c56e');ctx.restore();
  ctx.textAlign='center';ctx.fillStyle='#f2dfaf';ctx.font='11px Georgia';ctx.fillText(state==='celebrating'?'My hero! Thank you!':unlocked?'Come, brave knight!':'Princess Elowen',princess.x,princess.y-47);
  if(!unlocked){ctx.strokeStyle='#d6e3d066';ctx.lineWidth=2;for(let i=-1;i<=1;i++){ctx.beginPath();ctx.moveTo(princess.x+i*16,princess.y-38);ctx.lineTo(princess.x+i*16,princess.y+23);ctx.stroke();}}
}
function draw(){
  const grass=ctx.createLinearGradient(0,0,W,H);grass.addColorStop(0,'#66885c');grass.addColorStop(.5,'#4b7051');grass.addColorStop(1,'#365e4c');ctx.fillStyle=grass;ctx.fillRect(0,0,W,H);
  // Deterministic ground details keep the grove calm and inexpensive to draw.
  for(let i=0;i<230;i++){const x=(i*137.3)%W,y=(i*83.7)%H;ctx.strokeStyle=i%3?'#6b88584d':'#365a4777';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-2,y-4);ctx.moveTo(x,y);ctx.lineTo(x+3,y-3);ctx.stroke();}
  ctx.strokeStyle='#ac9a6977';ctx.lineWidth=56;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(115,525);ctx.bezierCurveTo(180,310,520,335,540,235);ctx.bezierCurveTo(570,130,760,160,880,105);ctx.stroke();
  for(let i=0;i<28;i++){const x=80+(i*173)%840,y=60+(i*97)%510;ellipse(x,y,2,2,i%2?'#dfc785':'#cda5a2');}
  for(let x=20;x<W;x+=54){tree(x,20,.9);tree(x,H-5,.9);}for(let y=90;y<H-45;y+=62){tree(18,y,.95);tree(W-15,y,.95);}
  // Princess platform and stones.
  ellipse(880,118,60,30,'#718778');ellipse(880,112,57,28,'#a0ac8c');ellipse(880,109,49,22,'#869d80');
  for(const o of obstacles){ellipse(o.x+5,o.y+13,o.r+4,o.r*.5,'#284a3a66');polygon([[o.x-o.r,o.y+9],[o.x-o.r*.8,o.y-15],[o.x-4,o.y-o.r*.7],[o.x+o.r*.8,o.y-12],[o.x+o.r,o.y+13],[o.x,o.y+22]],'#748477');polygon([[o.x-o.r*.8,o.y-15],[o.x-4,o.y-o.r*.7],[o.x+o.r*.8,o.y-12],[o.x+5,o.y+3]],'#9aa38a');ellipse(o.x-12,o.y+9,14,5,'#5d794e');}
  // Draw characters from back to front for natural overlap.
  const actors=[{y:princess.y,draw:drawPrincess},{y:knight.y,draw:drawKnight},...dragons.filter(d=>d.hp>0).map(d=>({y:d.y,draw:()=>drawDragon(d)}))];
  actors.sort((a,b)=>a.y-b.y).forEach(a=>a.draw());
  for(let i=0;i<18;i++){const x=(i*173+Math.sin(time*.8+i)*12)%W,y=(i*97+time*5)%H;ellipse(x,y,1.5,1.5,'#f7e6a077');}
  for(const h of hearts){ctx.globalAlpha=Math.min(1,h.life*2);heart(h.x,h.y,h.size,'#ff9eb8');}ctx.globalAlpha=1;
  for(const p of particles){ctx.globalAlpha=p.life*2;ellipse(p.x,p.y,3,3,p.color);}ctx.globalAlpha=1;
  const glow=ctx.createRadialGradient(500,280,100,500,280,650);glow.addColorStop(0,'#0000');glow.addColorStop(1,'#0c282c66');ctx.fillStyle=glow;ctx.fillRect(0,0,W,H);
  ctx.textAlign='left';ctx.font='11px Georgia';ctx.fillStyle='#e2dbb4';ctx.fillText('ROSEWOOD GROVE',59,65);
}
reset();let previous=performance.now();function frame(now:number){update(Math.min((now-previous)/1000,.04));previous=now;draw();requestAnimationFrame(frame);}requestAnimationFrame(frame);

