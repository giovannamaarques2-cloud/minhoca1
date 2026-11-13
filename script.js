const cv=document.getElementById('c'),ctx=cv.getContext('2d');
let W,H,dpr;
function resize(){dpr=Math.min(devicePixelRatio||1,2);W=innerWidth;H=innerHeight;cv.width=W*dpr;cv.height=H*dpr}
addEventListener('resize',resize);resize();

const R=2600,PI2=Math.PI*2;
const SKINS=[['#ff9a2e','#ffb85c'],['#3aa8ff','#7cc6ff'],['#ff5fa2','#ff98c6'],['#a66bff','#c9a3ff'],['#ffd23a','#ffe685'],['#35d6a0','#7af0c9']];
const NAMES=['Cobra','Naja','Jiboia','Víbora','Mamba','Sucuri','Píton','Coral','Anaconda','Jararaca','Cascavel','Surucucu'];
const FCOL=['#ff5c7a','#ffd23a','#5cf2a8','#5cc7ff','#c58bff','#ff9a2e'];
let S=[],food=[],player=null,playing=false,skin=0,mx=0,my=0,boostIn=false,frame=0,lastScore=0;
const cam={x:0,y:0,z:1};
const rnd=(a,b)=>a+Math.random()*(b-a);

function spawnFood(){const a=rnd(0,PI2),r=Math.sqrt(Math.random())*(R-50);
  food.push({x:Math.cos(a)*r,y:Math.sin(a)*r,v:rnd(.8,2),r:rnd(4,7),c:FCOL[Math.random()*FCOL.length|0]})}
for(let i=0;i<520;i++)spawnFood();

function mk(name,bot,sk,x,y){
  const s={name,bot,sk,x,y,ang:rnd(0,PI2),tang:0,score:bot?rnd(0,90):0,segs:[],boost:false,bt:0,alive:true};
  s.tang=s.ang;
  for(let i=0;i<14;i++)s.segs.push({x:x-Math.cos(s.ang)*i*6,y:y-Math.sin(s.ang)*i*6});
  return s;
}
const nSeg=s=>14+Math.floor(s.score/3);
const rad=s=>8+Math.min(14,s.score/70);
function spawnBot(){const a=rnd(0,PI2),r=rnd(300,R*.8);
  S.push(mk(NAMES[Math.random()*NAMES.length|0],true,Math.random()*SKINS.length|0,Math.cos(a)*r,Math.sin(a)*r))}
for(let i=0;i<11;i++)spawnBot();

function angDiff(a,b){let d=(b-a+Math.PI)%PI2;if(d<0)d+=PI2;return d-Math.PI}

function ai(s){
  const hx=s.x,hy=s.y;
  if(Math.hypot(hx,hy)>R-260){s.tang=Math.atan2(-hy,-hx);s.boost=false;return}
  for(const o of S){if(o===s)continue;
    for(let i=0;i<o.segs.length;i+=2){const g=o.segs[i],dx=g.x-hx,dy=g.y-hy;
      if(dx*dx+dy*dy<(rad(o)+rad(s)+70)**2){
        const to=Math.atan2(dy,dx);
        if(Math.abs(angDiff(s.ang,to))<1.3){s.tang=to+(angDiff(s.ang,to)>0?-1:1)*1.6;s.boost=false;return}
      }}}
  let best=null,bd=420*420;
  for(const f of food){const dx=f.x-hx,dy=f.y-hy,d=dx*dx+dy*dy;if(d<bd){bd=d;best=f}}
  if(best){s.tang=Math.atan2(best.y-hy,best.x-hx)}else if(frame%20===0){s.tang+=rnd(-.8,.8)}
  s.boost=false;
}

function update(s,dt){
  if(s.bot)ai(s);else if(playing){s.tang=Math.atan2(my-H/2,mx-W/2);s.boost=boostIn}
  s.ang+=Math.max(-.075*dt,Math.min(.075*dt,angDiff(s.ang,s.tang)));
  let sp=2.7;
  if(s.boost&&s.score>12){sp=5.4;s.score-=.12*dt;s.bt+=dt;
    if(s.bt>8){s.bt=0;const t=s.segs[s.segs.length-1];
      food.push({x:t.x,y:t.y,v:1,r:5,c:SKINS[s.sk][0]})}}
  s.x+=Math.cos(s.ang)*sp*dt;s.y+=Math.sin(s.ang)*sp*dt;
  const g=s.segs;g[0].x=s.x;g[0].y=s.y;
  for(let i=1;i<g.length;i++){const p=g[i-1],c=g[i],dx=p.x-c.x,dy=p.y-c.y,d=Math.hypot(dx,dy);
    if(d>6){c.x=p.x-dx/d*6;c.y=p.y-dy/d*6}}
  const n=nSeg(s);
  while(g.length<n){const t=g[g.length-1];g.push({x:t.x,y:t.y})}
  while(g.length>n)g.pop();
  const r=rad(s)+8;
  for(let i=food.length-1;i>=0;i--){const f=food[i],dx=f.x-s.x,dy=f.y-s.y;
    if(dx*dx+dy*dy<(r+f.r)**2){s.score+=f.v;food[i]=food[food.length-1];food.pop()}}
}

function die(s){
  s.alive=false;
  const n=s.segs.length,v=Math.max(1.5,s.score/(n/2))*.7;
  for(let i=0;i<n;i+=2){const g=s.segs[i];
    food.push({x:g.x+rnd(-8,8),y:g.y+rnd(-8,8),v,r:rnd(6,9),c:SKINS[s.sk][i%2]})}
  if(s.bot)setTimeout(spawnBot,2500);
  else{lastScore=Math.floor(s.score);setTimeout(()=>{playing=false;player=null;
    document.getElementById('msg').textContent='Você morreu com '+lastScore+' pontos. Tente de novo!';
    document.getElementById('menu').classList.remove('off');
    ['sc','lb'].forEach(i=>document.getElementById(i).classList.add('hide'));
    document.getElementById('bt').style.display='none'},700)}
}

function collisions(){
  for(const s of S){if(!s.alive)continue;
    if(Math.hypot(s.x,s.y)>R){die(s);continue}
    for(const o of S){if(o===s||!o.alive)continue;
      const lim=(rad(o)+rad(s)*.7)**2;let hit=false;
      for(let i=0;i<o.segs.length;i++){const g=o.segs[i],dx=g.x-s.x,dy=g.y-s.y;
        if(dx*dx+dy*dy<lim){hit=true;break}}
      if(hit){die(s);break}}}
  S=S.filter(s=>s.alive);
}

function hex(c,a){return c}
function drawSnake(s){
  const g=s.segs,r=rad(s),c=SKINS[s.sk],vx=cam.x-W/2/cam.z-60,vx2=cam.x+W/2/cam.z+60,vy=cam.y-H/2/cam.z-60,vy2=cam.y+H/2/cam.z+60;
  for(let i=g.length-1;i>=0;i--){const p=g[i];
    if(p.x<vx||p.x>vx2||p.y<vy||p.y>vy2)continue;
    if(s.boost&&s.score>12&&i%3===0){ctx.fillStyle='rgba(255,255,255,.12)';ctx.beginPath();ctx.arc(p.x,p.y,r*1.5,0,PI2);ctx.fill()}
    ctx.fillStyle=c[(i/3|0)%2];ctx.beginPath();ctx.arc(p.x,p.y,r,0,PI2);ctx.fill();
    ctx.fillStyle='rgba(0,0,0,.14)';ctx.beginPath();ctx.arc(p.x+r*.1,p.y+r*.25,r*.75,0,PI2);ctx.fill();
  }
  const h=g[0],ex=Math.cos(s.ang),ey=Math.sin(s.ang),px=-ey,py=ex;
  for(const k of[-1,1]){
    const x=h.x+ex*r*.45+px*r*.55*k,y=h.y+ey*r*.45+py*r*.55*k;
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x,y,r*.42,0,PI2);ctx.fill();
    ctx.fillStyle='#111';ctx.beginPath();ctx.arc(x+ex*r*.14,y+ey*r*.14,r*.22,0,PI2);ctx.fill();
  }
  ctx.fillStyle='rgba(255,255,255,.85)';ctx.font='700 14px "Baloo 2",system-ui,sans-serif';ctx.textAlign='center';
  ctx.fillText(s.name,h.x,h.y-r-10);
}

function draw(){
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.fillStyle='#070d22';ctx.fillRect(0,0,W,H);
  const z=cam.z;
  ctx.setTransform(dpr*z,0,0,dpr*z,dpr*(W/2-cam.x*z),dpr*(H/2-cam.y*z));
  const gr=ctx.createRadialGradient(0,0,200,0,0,R);gr.addColorStop(0,'#16306e');gr.addColorStop(1,'#0e2150');
  ctx.fillStyle=gr;ctx.beginPath();ctx.arc(0,0,R,0,PI2);ctx.fill();
  const x0=cam.x-W/2/z,x1=cam.x+W/2/z,y0=cam.y-H/2/z,y1=cam.y+H/2/z;
  ctx.fillStyle='rgba(255,255,255,.07)';
  for(let x=Math.floor(x0/80)*80;x<x1;x+=80)for(let y=Math.floor(y0/80)*80;y<y1;y+=80)
    if(x*x+y*y<R*R)ctx.fillRect(x-2,y-2,4,4);
  ctx.strokeStyle='#ff4d6d';ctx.lineWidth=18;ctx.beginPath();ctx.arc(0,0,R+9,0,PI2);ctx.stroke();
  const t=performance.now()/400;
  for(const f of food){if(f.x<x0-20||f.x>x1+20||f.y<y0-20||f.y>y1+20)continue;
    ctx.fillStyle=f.c;ctx.globalAlpha=.25;ctx.beginPath();ctx.arc(f.x,f.y,f.r*1.8,0,PI2);ctx.fill();
    ctx.globalAlpha=1;ctx.beginPath();ctx.arc(f.x,f.y,f.r+Math.sin(t+f.x)*.6,0,PI2);ctx.fill()}
  const order=[...S].sort((a,b)=>a.score-b.score);
  for(const s of order)drawSnake(s);
}

function hud(){
  if(!player||!player.alive)return;
  const sorted=[...S].sort((a,b)=>b.score-a.score);
  document.getElementById('pt').textContent=Math.floor(player.score);
  document.getElementById('rk').textContent='Posição '+(sorted.indexOf(player)+1)+' de '+sorted.length;
  document.getElementById('lb').innerHTML='<b>Ranking</b>'+sorted.slice(0,6).map(s=>
    '<div'+(s===player?' class="me"':'')+'><span>'+s.name.replace(/</g,'')+'</span><span>'+Math.floor(s.score)+'</span></div>').join('');
}

let last=performance.now();
function loop(now){
  const dt=Math.min(2.5,(now-last)/16.67);last=now;frame++;
  for(const s of S)update(s,dt);
  collisions();
  while(food.length<520)spawnFood();
  const tgt=(player&&player.alive)?player:S.find(s=>s.bot)||{x:0,y:0,segs:[]};
  cam.x+=(tgt.x-cam.x)*.12;cam.y+=(tgt.y-cam.y)*.12;
  const tz=Math.max(.5,1.05-(tgt.segs.length||14)*.0011);cam.z+=(tz-cam.z)*.04;
  draw();
  if(frame%10===0)hud();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// Menu e controles
const sk=document.getElementById('skins');
SKINS.forEach((c,i)=>{const b=document.createElement('button');b.className='sk'+(i===0?' sel':'');
  b.style.background='linear-gradient(135deg,'+c[0]+' 50%,'+c[1]+' 50%)';b.setAttribute('aria-label','Cor '+(i+1));
  b.onclick=()=>{skin=i;[...sk.children].forEach(x=>x.classList.remove('sel'));b.classList.add('sel')};sk.appendChild(b)});

function start(){
  const nome=document.getElementById('nome').value.trim()||'Você';
  const a=rnd(0,PI2),r=rnd(0,500);
  player=mk(nome,false,skin,Math.cos(a)*r,Math.sin(a)*r);player.score=0;
  S.push(player);playing=true;
  cam.x=player.x;cam.y=player.y;mx=W/2+Math.cos(player.ang)*100;my=H/2+Math.sin(player.ang)*100;
  document.getElementById('menu').classList.add('off');
  ['sc','lb'].forEach(i=>document.getElementById(i).classList.remove('hide'));
  if(matchMedia('(pointer:coarse)').matches)document.getElementById('bt').style.display='block';
}
document.getElementById('jogar').onclick=start;
document.getElementById('nome').addEventListener('keydown',e=>{if(e.key==='Enter')start();e.stopPropagation()});
cv.addEventListener('pointermove',e=>{mx=e.clientX;my=e.clientY});
cv.addEventListener('pointerdown',e=>{mx=e.clientX;my=e.clientY;if(e.pointerType==='mouse')boostIn=true});
addEventListener('pointerup',()=>{boostIn=false});
addEventListener('keydown',e=>{if(e.code==='Space'||e.key==='Shift'){boostIn=true;if(e.target.tagName!=='INPUT')e.preventDefault()}});
addEventListener('keyup',e=>{if(e.code==='Space'||e.key==='Shift')boostIn=false});
const bt=document.getElementById('bt');
bt.addEventListener('pointerdown',e=>{e.stopPropagation();boostIn=true});
bt.addEventListener('pointerup',()=>{boostIn=false});
