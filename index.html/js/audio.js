// ===== Robot Elemental, My Name — Audio Engine =====
// เสียงทั้งหมดสังเคราะห์ด้วย Web Audio API (ไม่ต้องมีไฟล์เสียง → เล่นออฟไลน์ได้ ไฟล์เล็ก)
// ใช้งาน:  SFX.play("swing", {vol:0.8, pitch:1})   SFX.music("ocean")   SFX.toggle()
(function(){
"use strict";

const KEY = "robotElemental_audio_v1";
let ctx = null, master = null, sfxGain = null, musGain = null, noiseBuf = null;
let mode = 2;                  // 2 = เสียงทั้งหมด, 1 = เฉพาะเอฟเฟกต์, 0 = ปิดเสียง
let voices = 0;
const MAX_VOICES = 44;
const last = {};
const listeners = [];
try{ const v = localStorage.getItem(KEY); if(v!==null && !isNaN(+v)) mode = Math.max(0, Math.min(2, +v)); }catch(e){}

const mtof = m => 440*Math.pow(2,(m-69)/12);

// ---------- context / unlock ----------
function ensure(){
  if(ctx) return true;
  const AC = window.AudioContext || window.webkitAudioContext;
  if(!AC) return false;
  try{
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 18; comp.ratio.value = 6; comp.attack.value = 0.003; comp.release.value = 0.2;
    master = ctx.createGain(); master.gain.value = 0.9;
    sfxGain = ctx.createGain(); musGain = ctx.createGain();
    sfxGain.connect(master); musGain.connect(master); master.connect(comp); comp.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate*3, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for(let i=0;i<d.length;i++) d[i] = Math.random()*2-1;
    applyMode(true);
    return true;
  }catch(e){ ctx = null; return false; }
}
function unlock(){
  if(!ensure()) return;
  if(ctx.state === "suspended" && mode>0) ctx.resume();
  startMusicTimer();
}
["pointerdown","touchend","keydown","click"].forEach(ev=>
  window.addEventListener(ev, unlock, { passive:true }));
document.addEventListener("visibilitychange", ()=>{
  if(!ctx) return;
  if(document.hidden){ ctx.suspend(); }
  else if(mode>0){ ctx.resume().then(()=>{ nextT = Math.max(nextT, ctx.currentTime+0.05); }); }
});

function applyMode(instant){
  if(!ctx) return;
  const t = ctx.currentTime, k = instant ? 0.001 : 0.08;
  sfxGain.gain.setTargetAtTime(mode>=1 ? 1 : 0, t, k);
  musGain.gain.setTargetAtTime(mode>=2 ? 0.55 : 0, t, k);
  if(mode===0){ stopMusicTimer(); }
  else { if(ctx.state==="suspended" && !document.hidden) ctx.resume(); startMusicTimer(); }
}

// ---------- low-level synth ----------
function tone(t, f, f2, dur, type, vol, atk, dest){
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if(f2 !== f) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t+dur);
  const a = Math.min(atk||0.005, dur*0.4);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(Math.max(0.0002, vol), t+a);
  g.gain.exponentialRampToValueAtTime(0.0001, t+dur);
  o.connect(g); g.connect(dest || sfxGain);
  o.start(t); o.stop(t+dur+0.03);
  if(!dest){ voices++; o.onended = ()=>{ voices--; g.disconnect(); }; }
  else o.onended = ()=> g.disconnect();
}
function noise(t, dur, ftype, f, f2, vol, q, dest){
  const s = ctx.createBufferSource(); s.buffer = noiseBuf;
  const flt = ctx.createBiquadFilter(); flt.type = ftype;
  flt.frequency.setValueAtTime(f, t);
  if(f2 !== f) flt.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t+dur);
  flt.Q.value = q || 1;
  const g = ctx.createGain();
  const a = Math.min(0.004, dur*0.3);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(Math.max(0.0002, vol), t+a);
  g.gain.exponentialRampToValueAtTime(0.0001, t+dur);
  s.connect(flt); flt.connect(g); g.connect(dest || sfxGain);
  s.start(t, Math.random()*2, dur+0.05);
  if(!dest){ voices++; s.onended = ()=>{ voices--; g.disconnect(); flt.disconnect(); }; }
}

function helper(t0, v, p){
  return {
    // t(freq, freqEnd, dur, type, vol, delay)
    t(f, f2, dur, type, vol, delay){
      tone(t0+(delay||0), f*p, (f2||f)*p, dur, type||"sine", (vol===undefined?0.2:vol)*v);
    },
    // n(dur, filterType, f, fEnd, vol, delay, q)
    n(dur, ft, f, f2, vol, delay, q){
      noise(t0+(delay||0), dur, ft||"lowpass", f, f2||f, (vol===undefined?0.2:vol)*v, q);
    }
  };
}

// ---------- SFX library ----------
const S = {
  // ----- UI -----
  click:   h=>{ h.t(700,980,0.06,"square",0.07); },
  back:    h=>{ h.t(520,360,0.08,"square",0.07); },
  error:   h=>{ h.t(210,190,0.13,"sawtooth",0.13); h.t(160,140,0.18,"sawtooth",0.13,0.11); },
  coin:    h=>{ h.t(988,988,0.09,"triangle",0.2); h.t(1319,1319,0.3,"triangle",0.2,0.07); h.t(2637,2637,0.15,"sine",0.05,0.07); },
  buy:     h=>{ h.t(784,784,0.09,"triangle",0.2); h.t(988,988,0.09,"triangle",0.2,0.08); h.t(1319,1319,0.28,"triangle",0.22,0.16); },
  upgrade: h=>{ [523,659,784,1047,1319].forEach((f,i)=> h.t(f,f,0.16+i*0.02,"square",0.11,i*0.08));
                h.t(2093,2093,0.5,"sine",0.08,0.4); h.n(0.35,"highpass",5000,8000,0.05,0.4); },
  quest:   h=>{ h.t(659,659,0.12,"triangle",0.22); h.t(784,784,0.12,"triangle",0.22,0.11); h.t(1047,1047,0.4,"triangle",0.25,0.22); h.t(1319,1319,0.4,"sine",0.1,0.22); },

  // ----- ผู้เล่นโจมตี -----
  swing:   h=>{ h.n(0.17,"bandpass",500,2600,0.28,0,1.4); h.t(320,150,0.14,"sawtooth",0.04); },
  hit:     h=>{ h.n(0.13,"lowpass",2600,260,0.34); h.t(190,60,0.14,"sine",0.32); h.t(900,300,0.05,"square",0.06); },
  hitArmor:h=>{ h.t(1400,900,0.09,"square",0.09); h.t(2100,1500,0.14,"triangle",0.1,0.01); h.n(0.06,"highpass",4000,7000,0.14); h.t(160,70,0.1,"sine",0.22); },
  kill:    h=>{ h.t(520,90,0.32,"sawtooth",0.16); h.n(0.22,"lowpass",3000,200,0.28); h.t(1200,1800,0.12,"triangle",0.09,0.12); },
  bossKill:h=>{ h.n(0.7,"lowpass",2500,80,0.4); h.t(90,35,0.7,"sine",0.4);
                [523,659,784,1047].forEach((f,i)=>{ h.t(f,f,0.3,"triangle",0.2,0.35+i*0.13); h.t(f*2,f*2,0.25,"square",0.05,0.35+i*0.13); });
                h.t(1047,1047,0.9,"triangle",0.2,0.9); h.t(1568,1568,0.9,"sine",0.1,0.9); },
  loot:    h=>{ [1319,1568,1760,2093,2349,2637].forEach((f,i)=> h.t(f,f,0.16,"sine",0.11,i*0.06)); h.n(0.3,"highpass",6000,9000,0.04,0.2); },

  // ----- มอนสเตอร์โจมตี (ระยะประชิด) -----
  mBite:   h=>{ h.n(0.1,"bandpass",900,350,0.3,0,1.2); h.t(320,130,0.13,"sawtooth",0.16); h.t(1200,600,0.04,"square",0.05); },
  mClaw:   h=>{ h.n(0.16,"highpass",1200,5200,0.26); h.t(500,250,0.1,"sawtooth",0.07); },
  mSting:  h=>{ h.t(1500,850,0.09,"triangle",0.15); h.n(0.06,"highpass",5000,7000,0.12); h.t(900,500,0.07,"square",0.05); },
  mSplat:  h=>{ h.t(330,110,0.17,"sine",0.26); h.t(220,90,0.14,"sine",0.14,0.03); h.n(0.13,"lowpass",900,200,0.2); },
  mThump:  h=>{ h.t(125,38,0.3,"sine",0.5); h.n(0.2,"lowpass",600,120,0.34); h.t(70,40,0.22,"sawtooth",0.08); },
  mRobot:  h=>{ h.t(230,200,0.11,"square",0.13); h.t(340,300,0.11,"square",0.1,0.015); h.n(0.09,"highpass",3500,6000,0.14); h.t(130,85,0.16,"sawtooth",0.1); },
  mZap:    h=>{ h.n(0.18,"highpass",2500,7500,0.22); h.t(1400,180,0.2,"sawtooth",0.13); h.t(90,90,0.18,"square",0.08); },
  mFire:   h=>{ h.n(0.32,"bandpass",700,1800,0.3,0,0.8); h.t(150,300,0.3,"sawtooth",0.08); },
  mGhost:  h=>{ h.t(600,250,0.34,"sine",0.14); h.t(610,240,0.34,"sine",0.12); h.n(0.3,"bandpass",1200,400,0.1,0,3); },
  mWind:   h=>{ h.n(0.35,"bandpass",400,1500,0.22,0,1.2); },

  // ----- มอนสเตอร์ยิง -----
  spit:      h=>{ h.t(560,240,0.16,"sine",0.22); h.n(0.09,"bandpass",1200,600,0.14); },
  laserShot: h=>{ h.t(2000,420,0.2,"sawtooth",0.13); h.t(1000,200,0.2,"square",0.05); },
  fireShot:  h=>{ h.n(0.22,"bandpass",900,2200,0.26,0,0.9); h.t(210,420,0.2,"sawtooth",0.07); },
  bossShot:  h=>{ h.t(300,120,0.28,"sawtooth",0.16); h.n(0.2,"lowpass",1800,300,0.22); },

  // ----- เอฟเฟกต์การต่อสู้ -----
  explosion: h=>{ h.n(0.75,"lowpass",1800,70,0.6); h.t(105,28,0.6,"sine",0.55); h.t(70,25,0.5,"sawtooth",0.1); h.n(0.2,"highpass",3000,1000,0.2); },
  boom:      h=>{ h.n(0.4,"lowpass",1000,110,0.36); h.t(85,35,0.34,"sine",0.34); },
  fuse:      h=>{ h.t(950,950,0.07,"square",0.1); h.t(1050,1050,0.07,"square",0.1,0.14); h.t(1200,1200,0.09,"square",0.11,0.28); h.t(1400,1400,0.12,"square",0.12,0.42); },
  dashWarn:  h=>{ h.t(280,700,0.42,"sawtooth",0.09); h.n(0.3,"bandpass",600,2000,0.07); },
  dash:      h=>{ h.n(0.32,"bandpass",600,3200,0.3,0,1.3); h.t(200,90,0.28,"sawtooth",0.09); },
  teleport:  h=>{ h.t(1500,300,0.18,"sine",0.16); h.t(300,1800,0.2,"sine",0.14,0.16); h.n(0.3,"highpass",4000,9000,0.06,0.05); },
  warn:      h=>{ h.t(440,440,0.11,"square",0.1); h.t(440,440,0.11,"square",0.1,0.16); },
  laserCharge:h=>{ h.t(160,1700,1.0,"sawtooth",0.1); h.t(80,850,1.0,"sine",0.12); },
  beam:      h=>{ h.n(0.32,"highpass",2000,7000,0.3); h.t(950,260,0.3,"sawtooth",0.15); h.t(120,60,0.3,"sine",0.15); },
  shield:    h=>{ h.t(300,900,0.4,"triangle",0.16); h.t(600,1800,0.4,"sine",0.07,0.05); h.n(0.3,"highpass",5000,8000,0.05,0.1); },
  summon:    h=>{ h.t(85,180,0.55,"sawtooth",0.16); h.t(90,190,0.55,"sawtooth",0.12); h.n(0.45,"lowpass",900,300,0.16); },
  roar:      h=>{ h.t(95,48,0.8,"sawtooth",0.24); h.t(101,52,0.8,"sawtooth",0.18); h.n(0.7,"lowpass",900,150,0.3); h.t(60,35,0.8,"sine",0.3); },
  bossIntro: h=>{ h.t(110,55,1.0,"sawtooth",0.22); h.t(116,58,1.0,"sawtooth",0.16); h.n(0.9,"lowpass",1100,120,0.3);
                  h.t(220,220,0.2,"square",0.09,0.5); h.t(196,196,0.5,"square",0.09,0.75); },
  slow:      h=>{ h.t(420,140,0.35,"sine",0.18); h.t(215,90,0.35,"triangle",0.1); },
  poisonHit: h=>{ h.t(280,520,0.09,"sine",0.14); h.t(340,600,0.09,"sine",0.12,0.09); },

  // ----- ผู้เล่นโดนโจมตี / สถานะ -----
  hurt:      h=>{ h.t(240,80,0.2,"sawtooth",0.24); h.n(0.13,"lowpass",2200,300,0.22); h.t(120,60,0.16,"sine",0.22); },
  poison:    h=>{ h.t(260,480,0.07,"sine",0.11); h.t(340,600,0.07,"sine",0.09,0.09); },
  heal:      h=>{ h.t(523,523,0.14,"sine",0.22); h.t(659,659,0.14,"sine",0.22,0.1); h.t(784,784,0.32,"sine",0.24,0.2); h.t(1568,1568,0.3,"triangle",0.06,0.2); },
  heartbeat: h=>{ h.t(62,48,0.12,"sine",0.5); h.t(58,44,0.14,"sine",0.4,0.19); },
  death:     h=>{ h.t(420,35,1.0,"sawtooth",0.22); h.t(210,30,1.1,"square",0.1); h.n(0.7,"lowpass",3000,80,0.3);
                  h.n(0.08,"highpass",4000,8000,0.2,0.25); h.n(0.08,"highpass",4000,8000,0.2,0.5); h.t(90,25,0.9,"sine",0.35,0.1); },
  respawn:   h=>{ h.t(110,900,0.55,"sine",0.2); h.t(220,1800,0.55,"triangle",0.1);
                  [784,988,1319].forEach((f,i)=> h.t(f,f,0.2,"triangle",0.14,0.5+i*0.08)); },

  // ----- สำรวจ / เก็บแร่ -----
  step:      h=>{ h.n(0.045,"lowpass",900,300,0.07); },
  mine:      h=>{ h.n(0.05,"highpass",2500,5000,0.18); h.t(820,560,0.05,"triangle",0.11); h.t(150,80,0.08,"sine",0.18); },
  collect:   h=>{ h.t(1047,1047,0.1,"sine",0.22); h.t(1568,1568,0.26,"sine",0.22,0.08); h.t(2093,2093,0.2,"triangle",0.05,0.08); },
  discover:  h=>{ [523,659,784,1047,1319,1568].forEach((f,i)=>{ h.t(f,f,0.22,"triangle",0.16,i*0.075); h.t(f*2,f*2,0.16,"sine",0.05,i*0.075); });
                  h.n(0.5,"highpass",6000,9000,0.05,0.35); },
  enterMap:  h=>{ h.n(0.6,"bandpass",300,2400,0.24,0,0.9); h.t(180,720,0.55,"sine",0.14); h.t(360,1080,0.5,"triangle",0.07,0.1); },
};

// เสียงที่ห้ามถี่เกินไป (วินาที) และความสุ่มระดับเสียงต่ออัน
const LIM  = { step:0.12, mine:0.1, swing:0.15, hit:0.04, hitArmor:0.04, boom:0.06, explosion:0.05, hurt:0.12, poison:0.4,
               click:0.03, warn:0.25, beam:0.15, mBite:0.06, mClaw:0.06, mSting:0.05, mSplat:0.06, mThump:0.08, mRobot:0.06,
               mZap:0.06, spit:0.05, laserShot:0.06, fireShot:0.06, bossShot:0.1, heartbeat:0.5, teleport:0.1, dash:0.15, dashWarn:0.2 };
const RAND = { heartbeat:0, coin:0, buy:0, upgrade:0, quest:0, discover:0, loot:0, bossKill:0, bossIntro:0, roar:0.03, respawn:0, heal:0.02, collect:0.03, warn:0, fuse:0 };

function play(name, opt){
  if(mode===0 || !ctx || ctx.state!=="running") return;
  const def = S[name]; if(!def) return;
  opt = opt || {};
  const now = ctx.currentTime;
  const lim = LIM[name]!==undefined ? LIM[name] : 0.03;
  if(last[name]!==undefined && now-last[name] < lim) return;
  const v = opt.vol===undefined ? 1 : opt.vol;
  if(v < 0.04 || voices > MAX_VOICES) return;
  last[name] = now;
  const rnd = RAND[name]!==undefined ? RAND[name] : 0.07;
  const p = (opt.pitch||1)*(1+(Math.random()-0.5)*rnd*2);
  try{ def(helper(now+0.005, v, p)); }catch(e){}
}

// ---------- background music (procedural) ----------
const MUS = {
  menu:   { root:57, scale:[0,2,4,7,9],           bpm:84,  pad:"sine",     arp:"triangle", dens:0.42, prog:[0,3,4,2], bass:true },
  ground: { root:60, scale:[0,2,4,7,9],           bpm:100, pad:"triangle", arp:"triangle", dens:0.5,  prog:[0,4,5,3], bass:true },
  ocean:  { root:55, scale:[0,2,3,5,7,9,10],      bpm:72,  pad:"sine",     arp:"sine",     dens:0.55, prog:[0,3,5,2], bass:true },
  moon:   { root:52, scale:[0,2,4,6,7,9,11],      bpm:64,  pad:"sine",     arp:"sine",     dens:0.3,  prog:[0,2,4,1], bass:false },
  mine:   { root:45, scale:[0,3,5,7,10],          bpm:92,  pad:"triangle", arp:"triangle", dens:0.4,  prog:[0,0,3,4], bass:true, tick:true },
  mars:   { root:50, scale:[0,1,4,5,7,8,10],      bpm:104, pad:"triangle", arp:"sawtooth", dens:0.5,  prog:[0,1,0,4], bass:true, tick:true },
  venus:  { root:48, scale:[0,2,3,5,7,8,11],      bpm:88,  pad:"sine",     arp:"triangle", dens:0.45, prog:[0,5,3,4], bass:true }
};
let cfg = null, musicName = null, musTimer = null, step = 0, nextT = 0;

function mtone(t, f, dur, type, vol, atk){ tone(t, f, f, dur, type, vol, atk, musGain); }
function noteAt(i, oct){
  const sc = cfg.scale, n = sc.length;
  const idx = ((i%n)+n)%n, o = Math.floor(i/n);
  return cfg.root + sc[idx] + 12*(o+(oct||0));
}
function playStep(s, t, sd){
  const deg = cfg.prog[Math.floor(s/8) % cfg.prog.length];
  if(s%8===0){ [0,2,4].forEach(k=> mtone(t, mtof(noteAt(deg+k,0)), sd*8*0.98, cfg.pad, 0.05, 0.7)); }
  if(cfg.bass && s%4===0) mtone(t, mtof(noteAt(deg,-1)), sd*3, "sine", 0.1, 0.02);
  if(Math.random() < cfg.dens){
    const k = Math.floor(Math.random()*6);
    mtone(t, mtof(noteAt(deg+k,1)), sd*1.6, cfg.arp, cfg.arp==="sawtooth"?0.02:0.045, 0.01);
  }
  if(cfg.tick && s%2===1) noise(t, 0.04, "highpass", 6000, 6000, 0.018, 1, musGain);
}
function musicTick(){
  if(!ctx || !cfg || mode<2 || ctx.state!=="running") return;
  const sd = 60/cfg.bpm/2;
  if(nextT < ctx.currentTime) nextT = ctx.currentTime + 0.05;
  while(nextT < ctx.currentTime + 0.35){
    playStep(step, nextT, sd);
    nextT += sd; step++;
  }
}
function startMusicTimer(){
  if(musTimer || !ctx || !cfg || mode<2) return;
  nextT = ctx.currentTime + 0.1;
  musTimer = setInterval(musicTick, 120);
}
function stopMusicTimer(){ if(musTimer){ clearInterval(musTimer); musTimer = null; } }
function music(name){
  if(name === musicName) return;
  musicName = name;
  cfg = name ? (MUS[name] || null) : null;
  step = 0;
  stopMusicTimer();
  if(ctx){ nextT = ctx.currentTime + 0.1; startMusicTimer(); }
}

// ---------- mode toggle ----------
const MODE_LABEL = { 2:"🔊 เสียงเปิดทั้งหมด (เอฟเฟกต์ + เพลง)", 1:"🔔 เปิดเฉพาะเสียงเอฟเฟกต์", 0:"🔇 ปิดเสียง" };
const MODE_ICON  = { 2:"🔊", 1:"🔔", 0:"🔇" };
function setMode(m){
  mode = m;
  try{ localStorage.setItem(KEY, String(mode)); }catch(e){}
  ensure(); applyMode(false);
  listeners.forEach(fn=>{ try{ fn(mode); }catch(e){} });
}
function toggle(){ setMode((mode+2)%3); if(mode>0) setTimeout(()=>play("click"), 60); return mode; }

window.SFX = {
  play, music, unlock, toggle, setMode,
  getMode: ()=>mode,
  icon: ()=>MODE_ICON[mode],
  label: ()=>MODE_LABEL[mode],
  onChange: fn=> listeners.push(fn)
};

})();
