// ===== Robot Elemental, My Name — Main Game Logic =====
(function(){
"use strict";

const SAVE_KEY = "robotElemental_save_v1";

function defaultState(){
  return {
    created: false,
    colors: Object.assign({}, DEFAULT_COLORS),
    money: 40,
    inventory: {},   // id -> qty  (element symbol or material id)
    levels: { bag:0, collector:0, explorer:0, head:0, body:0, armL:0, armR:0, legL:0, legR:0 },
    owned: {}, equip: {}, claimed: {},
    qs: { kills:0, bosses:0, mined:0, earned:0, deaths:0, peak:0, maps:{}, notified:{} },
    discovered: {},  // element symbols seen at least once
    stats: { totalCollected: 0, totalSold: 0 }
  };
}

let STATE = null;

function loadState(){
  try{
    const raw = localStorage.getItem(SAVE_KEY);
    if(raw){
      const parsed = JSON.parse(raw);
      STATE = Object.assign(defaultState(), parsed);
      STATE.colors = Object.assign({}, DEFAULT_COLORS, parsed.colors||{});
      STATE.owned = Object.assign({}, parsed.owned||{}); STATE.equip = Object.assign({}, parsed.equip||{}); STATE.claimed = Object.assign({}, parsed.claimed||{});
      STATE.qs = Object.assign(defaultState().qs, parsed.qs||{});
      STATE.levels = Object.assign({bag:0,collector:0,explorer:0,head:0,body:0,armL:0,armR:0,legL:0,legR:0}, parsed.levels||{});
    } else {
      STATE = defaultState();
    }
  }catch(e){ STATE = defaultState(); }
}
function saveState(){
  if(STATE) checkQuests();
  localStorage.setItem(SAVE_KEY, JSON.stringify(STATE));
}

// ---------- derived stats ----------
function capacityMax(){
  const bagLvl = STATE.levels.bag;
  const bodyLvl = STATE.levels.body;
  return 40 + bagLvl*UPGRADES.bag.capacityPerLevel + bodyLvl*UPGRADES.body.capacityBonusPerLevel;
}
function capacityUsed(){
  return Object.values(STATE.inventory).reduce((a,b)=>a+b,0);
}
function collectPower(){
  return 1 + STATE.levels.collector*UPGRADES.collector.powerPerLevel
           + STATE.levels.armL*UPGRADES.armL.powerBonusPerLevel
           + STATE.levels.armR*UPGRADES.armR.powerBonusPerLevel;
}
function moveSpeed(){
  return 2.6 + STATE.levels.explorer*UPGRADES.explorer.speedPerLevel
             + STATE.levels.legL*UPGRADES.legL.speedBonusPerLevel
             + STATE.levels.legR*UPGRADES.legR.speedBonusPerLevel;
}
function scanRange(){
  return 90 + STATE.levels.head*UPGRADES.head.scanBonusPerLevel;
}
function playerMaxHP(){
  return 100 + STATE.levels.body*15 + STATE.levels.head*5;
}
function playerAttackPower(){
  return 9 + (STATE.levels.armL + STATE.levels.armR)*2.5;
}

function itemInfo(id){
  if(ELEMENTS_BY_SYMBOL[id]){
    const e = ELEMENTS_BY_SYMBOL[id];
    return { name: e.nameTh, icon: e.symbol, value: e.value, isElement:true, color: CATEGORY_COLORS[e.category] };
  }
  const m = MATERIALS[id];
  if(m) return { name: m.name, icon: m.icon, value: m.value, isElement:false, color:"#9aa4bf" };
  return { name:id, icon:"?", value:1, isElement:false, color:"#666" };
}

function addItem(id, qty){
  const used = capacityUsed();
  const max = capacityMax();
  if(used >= max) return false;
  const room = max - used;
  const add = Math.min(qty, room);
  STATE.inventory[id] = (STATE.inventory[id]||0) + add;
  STATE.stats.totalCollected += add;
  if(ELEMENTS_BY_SYMBOL[id]) STATE.discovered[id] = true;
  saveState();
  return add === qty;
}
function removeItem(id, qty){
  if(!STATE.inventory[id]) return false;
  STATE.inventory[id] -= qty;
  if(STATE.inventory[id] <= 0) delete STATE.inventory[id];
  saveState();
  return true;
}

// ---------- screens ----------
const screens = {};
document.querySelectorAll(".screen").forEach(s=> screens[s.id] = s);
function showScreen(id){
  Object.values(screens).forEach(s=>s.classList.remove("active"));
  screens[id].classList.add("active");
  document.body.classList.toggle("in-game", id==="screen-game");
}

// ---------- toast ----------
let toastTimer=null;
function toast(msg){
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=> el.classList.remove("show"), 2200);
}

// ---------- sound helpers (ดู js/audio.js) ----------
function sfx(name, opt){ if(window.SFX) SFX.play(name, opt); }
function vAt(x, y, r){ const d = Math.hypot(x-player.x, y-player.y); return Math.max(0.14, 1 - d/(r||760)); }
function sfxAt(name, x, y, opt){ opt = opt||{}; opt.vol = (opt.vol===undefined?1:opt.vol) * vAt(x,y); sfx(name, opt); }
// เสียงโจมตีระยะประชิดของมอนสเตอร์แต่ละชนิด
const MON_ATK = { slime:"mSplat", wolf:"mBite", bee:"mSting", bear:"mThump", shroom:"mSplat", treant:"mThump",
  fish:"mBite", squid:"mSplat", eel:"mZap", shark:"mBite", crab:"mClaw", kraken:"mThump",
  lunarbot:"mRobot", alien:"mZap", meteor:"mThump", ufo:"mZap", moongolem:"mThump", guardian:"mRobot",
  bat:"mBite", snake:"mBite", spider:"mClaw", golem:"mThump", tnt:"mThump", drake:"mFire",
  rustbot:"mRobot", scorpion:"mSting", dust:"mWind", martian:"mRobot", fireball:"mFire", rexbot:"mThump",
  acid:"mSplat", lava:"mFire", ghost:"mGhost", lizard:"mClaw", lavagiant:"mThump", demon:"mFire" };
// เสียงยิงของมอนสเตอร์ระยะไกล
const MON_SHOT = { shroom:"spit", squid:"spit", ufo:"laserShot", guardian:"laserShot", martian:"laserShot",
  fireball:"fireShot", drake:"fireShot", acid:"spit", ghost:"spit", demon:"fireShot", lavagiant:"fireShot" };
// เสียงตอนบอสเริ่มร่ายสกิล
const BOSS_SFX = { roots:"warn", summon:"summon", nova:"bossShot", whirlpool:"warn", tentacle:"warn", laser:"laserCharge",
  meteors:"warn", shield:"shield", cone:"mFire", slam:"warn", stomp:"warn", acidrain:"warn", lifesteal:"bossShot", phase:"teleport" };

// ---------- robot drawing ----------
function drawRobot(ctx, x, y, scale, colors, facing){
  ctx.save();
  ctx.translate(x,y);
  ctx.scale(scale * (facing<0?-1:1), scale);
  // shadow
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath(); ctx.ellipse(0, 46, 26, 7, 0, 0, Math.PI*2); ctx.fill();
  drawCosmetics(ctx, STATE.equip, "pre");
  // legs
  ctx.fillStyle = colors.legL; roundRect(ctx, -18, 14, 13, 30, 4); ctx.fill();
  ctx.fillStyle = colors.legR; roundRect(ctx, 5, 14, 13, 30, 4); ctx.fill();
  // body
  ctx.fillStyle = colors.body; roundRect(ctx, -20, -20, 40, 38, 8); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.18)"; roundRect(ctx, -20, -20, 40, 10, 8); ctx.fill();
  // chest light
  ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(0,-2,4,0,Math.PI*2); ctx.fill();
  // arms
  ctx.fillStyle = colors.armL; roundRect(ctx, -32, -14, 12, 28, 5); ctx.fill();
  ctx.fillStyle = colors.armR; roundRect(ctx, 20, -14, 12, 28, 5); ctx.fill();
  // head
  ctx.fillStyle = colors.head; roundRect(ctx, -15, -46, 30, 26, 7); ctx.fill();
  // visor
  ctx.fillStyle = "#0b1220"; roundRect(ctx, -10, -39, 20, 10, 3); ctx.fill();
  ctx.fillStyle = "#7ef7ff"; roundRect(ctx, -8, -37, 6, 6, 2); ctx.fill();
  drawCosmetics(ctx, STATE.equip, "post");
  ctx.restore();
}
// swingT: -1 = idle resting sword, 0..1 = attack swing progress
function drawSword(ctx, x, y, scale, facing, swingT){
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale * (facing<0?-1:1), scale);
  ctx.translate(27, -6);
  const angle = swingT>=0 ? (-1.3 + swingT*2.1) : 0.55;
  ctx.rotate(angle);
  // hilt
  ctx.fillStyle = "#3a2a1a"; roundRect(ctx, -3, 0, 6, 11, 2); ctx.fill();
  // guard
  ctx.fillStyle = "#c9c9c9"; roundRect(ctx, -9, -2, 18, 4, 2); ctx.fill();
  // blade
  const grad = ctx.createLinearGradient(0,-38,0,0);
  const sk = STATE.equip && STATE.equip.sword && COSMETIC_BY_ID[STATE.equip.sword];
  grad.addColorStop(0, sk?"#ffffff":"#eef3ff"); grad.addColorStop(1, sk?sk.color:"#b8c4d8");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(-4,0); ctx.lineTo(-3,-32); ctx.lineTo(0,-38); ctx.lineTo(3,-32); ctx.lineTo(4,0);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}
function roundRect(ctx,x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);
  ctx.arcTo(x,y,x+w,y,r);
  ctx.closePath();
}

// ===================== CHARACTER CREATOR =====================
const ccCanvas = document.getElementById("cc-canvas");
const ccCtx = ccCanvas.getContext("2d");
let ccPart = "head";

function renderCC(){
  ccCtx.clearRect(0,0,ccCanvas.width,ccCanvas.height);
  const g = ccCtx.createLinearGradient(0,0,0,ccCanvas.height);
  g.addColorStop(0,"#0e1626"); g.addColorStop(1,"#050810");
  ccCtx.fillStyle = g; ccCtx.fillRect(0,0,ccCanvas.width,ccCanvas.height);
  drawRobot(ccCtx, ccCanvas.width/2, ccCanvas.height/2+30, 2.6, STATE.colors, 1);
  document.getElementById("cc-part-label").textContent = partThaiName(ccPart);
  document.getElementById("cc-color-input").value = STATE.colors[ccPart];
  renderStats();
}
function partThaiName(p){
  return {head:"หัว",body:"ลำตัว",armL:"แขนซ้าย",armR:"แขนขวา",legL:"ขาซ้าย",legR:"ขาขวา"}[p];
}
document.querySelectorAll(".cc-part-btn").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    document.querySelectorAll(".cc-part-btn").forEach(b=>b.classList.remove("sel"));
    btn.classList.add("sel");
    ccPart = btn.dataset.part;
    renderCC();
  });
});
document.getElementById("cc-color-input").addEventListener("input", (e)=>{
  STATE.colors[ccPart] = e.target.value;
  renderCC();
});
document.querySelectorAll(".cc-swatch").forEach(sw=>{
  sw.addEventListener("click", ()=>{
    STATE.colors[ccPart] = sw.dataset.color;
    renderCC();
  });
});
document.getElementById("cc-random").addEventListener("click", ()=>{
  BODY_PARTS.forEach(p=>{
    STATE.colors[p] = "#"+Math.floor(Math.random()*0xffffff).toString(16).padStart(6,"0");
  });
  renderCC();
});
document.getElementById("cc-confirm").addEventListener("click", ()=>{
  STATE.created = true;
  saveState();
  goMenu();
});

// ===================== MAIN MENU =====================
function goMenu(){
  if(window.SFX) SFX.music("menu");
  updateQuestBadge();
  document.getElementById("menu-money").textContent = STATE.money;
  document.getElementById("menu-cap").textContent = capacityUsed()+" / "+capacityMax();
  const mc = document.getElementById("menu-canvas");
  const mctx = mc.getContext("2d");
  mctx.clearRect(0,0,mc.width,mc.height);
  drawRobot(mctx, mc.width/2, mc.height/2+20, 1.8, STATE.colors, 1);
  showScreen("screen-menu");
}
document.getElementById("btn-cover-play").addEventListener("click", ()=>{
  if(STATE.created){ goMenu(); } else { ccPart="head"; renderCC(); showScreen("screen-charcreate"); }
});
document.getElementById("btn-cover-howto").addEventListener("click", ()=> { renderHowTo(); showScreen("screen-howto"); });
document.getElementById("btn-menu-explore").addEventListener("click", renderMapSelect);
document.getElementById("btn-menu-craft").addEventListener("click", renderCraft);
document.getElementById("btn-menu-shop").addEventListener("click", renderShop);
document.getElementById("btn-menu-fashion").addEventListener("click", renderFashion);
document.getElementById("btn-menu-quests").addEventListener("click", renderQuests);
document.getElementById("cc-fashion").addEventListener("click", renderFashion);
document.getElementById("btn-menu-howto").addEventListener("click", ()=>{ renderHowTo(); showScreen("screen-howto"); });
document.getElementById("btn-menu-customize").addEventListener("click", ()=>{ ccPart="head"; renderCC(); showScreen("screen-charcreate"); });
document.querySelectorAll(".btn-back-menu").forEach(b=>b.addEventListener("click", goMenu));

// ===================== HOW TO PLAY =====================
function renderHowTo(){
  document.getElementById("howto-body").innerHTML = `
  <p><strong>เป้าหมาย:</strong> บังคับหุ่นยนต์ของคุณออกสำรวจแมพต่างๆ เพื่อเก็บแร่ธาตุและวัสดุ นำไปขายหาเงิน แล้วนำเงินไปคราฟอัพเกรดอุปกรณ์และร่างกายหุ่นยนต์ให้แข็งแกร่งขึ้น</p>
  <p><strong>การควบคุม:</strong> ใช้ปุ่มลูกศร/WASD หรือจอยสติ๊กเสมือนที่มุมจอ (บนมือถือ) เพื่อเดิน เข้าใกล้จุดทรัพยากรที่เรืองแสง แล้วกดปุ่ม "เก็บของ" ค้างไว้เพื่อเก็บ</p>
  <p><strong>แมพ:</strong> พื้นดิน 🌱, ใต้มหาสมุทร 🌊, ดวงจันทร์ 🌕, เหมืองแร่ ⛏️, ดาวอังคาร 🔴, ดาวศุกร์ 🟡 — แต่ละแมพมีวัสดุและธาตุกระจายอยู่ทั้งหมด 118 ธาตุ ตามตารางธาตุจริง</p>
  <p><strong>ธาตุ:</strong> เมื่อเก็บแร่ธาตุได้ จะมีการ์ดแสดงชื่อธาตุ สัญลักษณ์ เลขอะตอม มวลอะตอม สถานะ หมู่ คาบ และประเภทของธาตุ</p>
  <p><strong>ร้านขายของ:</strong> นำวัสดุและธาตุที่เก็บมาขายเป็นเงิน</p>
  <p><strong>คราฟ:</strong> ใช้เงินและวัสดุ/ธาตุ อัพเกรดกระเป๋า เครื่องมือเก็บของ เครื่องมือสำรวจ และอวัยวะแต่ละส่วนของหุ่นยนต์ (หัว ลำตัว แขน ขา) เพื่อเพิ่มความเร็ว พลังเก็บของ ระยะสแกน และความจุกระเป๋า</p>
  <p><strong>ต่อสู้:</strong> แต่ละแมพมีมอนสเตอร์คอยโจมตีคุณเมื่อเข้าใกล้ หุ่นยนต์ของคุณมี ❤️ เลือด และถือดาบติดตัว กดปุ่ม "⚔️ โจมตี" (หรือกดปุ่ม F) เมื่อเข้าใกล้มอนสเตอร์เพื่อฟันดาบใส่ ถ้าเลือดหมดหุ่นยนต์จะถูกทำลายและต้องฟื้นคืนชีพ (เสียเงินบางส่วน) อัพเกรดลำตัวและแขนเพื่อเพิ่มเลือดสูงสุดและพลังโจมตี<br><br>มอนสเตอร์แต่ละชนิดมีเลือดและสกิลไม่เหมือนกัน: 💨 พุ่งชน (มีเส้นแดงเตือนก่อน) 🎯 ยิงระยะไกล 💥 ระเบิดพลีชีพ (วงแดงกะพริบ ให้รีบวิ่งหนี) ✨ วาร์ป ☠️ พิษ 🐌 ทำให้ช้า 🛡️ เกราะลดดาเมจ (ขอบเทา) 💚 ฟื้นเลือด และสไลม์จะแตกตัวตอนตาย แต่ละแมพยังมี 👑 บอสประจำแมพ เลือดเยอะ รางวัลสูง มอนสเตอร์ที่ตายจะเกิดใหม่ทดแทนเรื่อย ๆ<br><br>👑 <b>บอสแต่ละแมพมีสกิลเฉพาะตัว</b> ทุกสกิลมีวงแดงหรือเส้นแดงเตือนก่อนโจมตี ให้รีบวิ่งออกจากพื้นที่: 🌳 รากไม้/เรียกลูกสมุน 🐙 หมึกวงแหวน/น้ำวนดูด/หนวดฟาด 🌚 เลเซอร์กวาด/ฝนอุกกาบาต/โล่ 🐉 พ่นไฟเป็นพัด/กระโดดทุบ 🦖 กระทืบคลื่นกระแทก/เรียกหุ่นสนิม 😈 ฝนกรด/ดูดเลือด/วาร์ประเบิด เมื่อปราบบอสได้จะดรอปของสุ่ม 4 อย่าง อย่างละหลายชิ้น (เข้ากระเป๋าเสมอแม้เต็ม) มีโอกาสได้ธาตุหายากด้วย</p>
  `;
}
document.getElementById("howto-close-cover")?.addEventListener("click", ()=> showScreen("screen-cover"));

// ===================== MAP SELECT =====================
function renderMapSelect(){
  const wrap = document.getElementById("mapselect-list");
  wrap.innerHTML = "";
  MAPS.forEach(m=>{
    const card = document.createElement("div");
    card.className = "map-card";
    card.style.setProperty("--accent", m.accent);
    card.innerHTML = `<div class="map-emoji">${m.emoji}</div>
      <div class="map-name">${m.name}</div>
      <div class="map-desc">${m.description}</div>`;
    card.addEventListener("click", ()=> enterMap(m.id));
    wrap.appendChild(card);
  });
  showScreen("screen-mapselect");
}

// ===================== CRAFT =====================
function renderCraft(){
  const wrap = document.getElementById("craft-list");
  wrap.innerHTML = "";
  document.getElementById("craft-money").textContent = STATE.money;
  Object.values(UPGRADES).forEach(u=>{
    const lvl = STATE.levels[u.id];
    const maxed = lvl >= u.maxLevel;
    const row = document.createElement("div");
    row.className = "craft-row";
    if(maxed){
      row.innerHTML = `<div class="craft-icon">${u.icon}</div>
        <div class="craft-info"><div class="craft-name">${u.name} <span class="lvl">Lv.${lvl}/${u.maxLevel} (สูงสุด)</span></div>
        <div class="craft-desc">${u.desc(lvl)}</div></div>`;
      wrap.appendChild(row);
      return;
    }
    const cost = u.base * (lvl+1);
    const mats = u.matCost(lvl+1);
    const matStr = Object.entries(mats).map(([k,v])=>{
      const info = itemInfo(k);
      const have = STATE.inventory[k]||0;
      const ok = have>=v;
      return `<span class="matchip ${ok?'':'lack'}">${info.icon} ${v} <small>(${have})</small></span>`;
    }).join(" ");
    const canAffordMoney = STATE.money >= cost;
    const canAffordMats = Object.entries(mats).every(([k,v])=>(STATE.inventory[k]||0)>=v);
    const canBuy = canAffordMoney && canAffordMats;
    row.innerHTML = `<div class="craft-icon">${u.icon}</div>
      <div class="craft-info">
        <div class="craft-name">${u.name} <span class="lvl">Lv.${lvl} → ${lvl+1}</span></div>
        <div class="craft-desc">${u.desc(lvl+1)}</div>
        <div class="craft-cost">💰 ${cost} ${matStr}</div>
      </div>
      <button class="btn small ${canBuy?'':'disabled'}" data-id="${u.id}">คราฟ</button>`;
    wrap.appendChild(row);
    row.querySelector("button").addEventListener("click", ()=>{
      if(!canBuy){ toast("วัสดุหรือเงินไม่พอ"); return; }
      STATE.money -= cost;
      Object.entries(mats).forEach(([k,v])=> removeItem(k, v));
      STATE.levels[u.id]++;
      saveState();
      sfx("upgrade");
      toast(`อัพเกรด ${u.name} สำเร็จ!`);
      renderCraft();
    });
  });
  showScreen("screen-craft");
}

// ===================== SHOP =====================
function renderShop(){
  const wrap = document.getElementById("shop-list");
  wrap.innerHTML = "";
  document.getElementById("shop-money").textContent = STATE.money;
  const ids = Object.keys(STATE.inventory);
  if(ids.length===0){
    wrap.innerHTML = `<div class="empty-hint">ยังไม่มีของให้ขาย ลองไปสำรวจแมพก่อน!</div>`;
  }
  ids.sort((a,b)=> itemInfo(b).value - itemInfo(a).value);
  ids.forEach(id=>{
    const qty = STATE.inventory[id];
    const info = itemInfo(id);
    const row = document.createElement("div");
    row.className = "shop-row";
    row.innerHTML = `<div class="shop-icon" style="background:${info.color}22;border-color:${info.color}">${info.icon}</div>
      <div class="shop-info"><div class="shop-name">${info.name}</div><div class="shop-sub">มูลค่า ${info.value} / ชิ้น · มี ${qty}</div></div>
      <button class="btn small" data-act="1">ขาย 1</button>
      <button class="btn small ghost" data-act="all">ขายหมด</button>`;
    row.querySelector('[data-act="1"]').addEventListener("click", ()=> sellItem(id,1));
    row.querySelector('[data-act="all"]').addEventListener("click", ()=> sellItem(id,qty));
    wrap.appendChild(row);
  });
  showScreen("screen-shop");
}
function sellItem(id, qty){
  const info = itemInfo(id);
  const have = STATE.inventory[id]||0;
  const n = Math.min(qty, have);
  if(n<=0) return;
  removeItem(id, n);
  STATE.money += n*info.value;
  STATE.stats.totalSold += n; STATE.qs.earned += n*info.value;
  saveState();
  sfx("coin");
  toast(`ขาย ${info.name} x${n} ได้ 💰${n*info.value}`);
  renderShop();
}

// ===================== STATS PANEL =====================
function renderStats(){
  const el = document.getElementById("cc-stats"); if(!el) return;
  const L = STATE.levels, U = UPGRADES;
  const top = [["❤️ พลังชีวิต",playerMaxHP()],["⚔️ พลังโจมตี",playerAttackPower().toFixed(1)],["👟 ความเร็ว",moveSpeed().toFixed(2)],
    ["🎒 ความจุกระเป๋า",capacityMax()],["📡 ระยะสแกน",scanRange()],["⛏️ พลังเก็บของ",collectPower().toFixed(2)]];
  const parts = [
    ["🧠 หัว", L.head, `สแกน +${L.head*U.head.scanBonusPerLevel} · HP +${L.head*5}`, STATE.colors.head],
    ["🧱 ลำตัว", L.body, `HP +${L.body*15} · ความจุ +${L.body*U.body.capacityBonusPerLevel}`, STATE.colors.body],
    ["💪 แขนซ้าย", L.armL, `พลังเก็บ +${(L.armL*U.armL.powerBonusPerLevel).toFixed(2)} · โจมตี +${L.armL*2.5}`, STATE.colors.armL],
    ["💪 แขนขวา", L.armR, `พลังเก็บ +${(L.armR*U.armR.powerBonusPerLevel).toFixed(2)} · โจมตี +${L.armR*2.5}`, STATE.colors.armR],
    ["🦿 ขาซ้าย", L.legL, `ความเร็ว +${(L.legL*U.legL.speedBonusPerLevel).toFixed(2)}`, STATE.colors.legL],
    ["🦿 ขาขวา", L.legR, `ความเร็ว +${(L.legR*U.legR.speedBonusPerLevel).toFixed(2)}`, STATE.colors.legR],
    ["🎒 กระเป๋า", L.bag, `ความจุ +${L.bag*U.bag.capacityPerLevel}`, "#888"],
    ["🔩 ตัวเก็บ", L.collector, `พลังเก็บ +${(L.collector*U.collector.powerPerLevel).toFixed(2)}`, "#888"],
    ["🧭 นักสำรวจ", L.explorer, `ความเร็ว +${(L.explorer*U.explorer.speedPerLevel).toFixed(2)}`, "#888"]];
  const worn = SLOTS.map(s=>{ const it = COSMETIC_BY_ID[STATE.equip[s.id]]; return `<span class="stat-chip">${s.icon} ${it?it.name:"—"}</span>`; }).join("");
  el.innerHTML = `<h3>📊 สถานะหุ่นยนต์</h3><div class="stat-grid">${top.map(t=>`<div class="stat-box"><small>${t[0]}</small><b>${t[1]}</b></div>`).join("")}</div>
    <h3>🔩 รายละเอียดชิ้นส่วน</h3>${parts.map(p=>`<div class="part-row"><i style="background:${p[3]}"></i><span>${p[0]} <em>Lv.${p[1]}</em></span><small>${p[2]}</small></div>`).join("")}
    <h3>👕 ที่สวมใส่อยู่</h3><div class="stat-chips">${worn}</div>`;
}

// ===================== FASHION SHOP =====================
let fsSlot = "hat";
function renderFashion(){
  document.getElementById("fs-money").textContent = STATE.money;
  const fc = document.getElementById("fs-canvas"), f = fc.getContext("2d");
  f.clearRect(0,0,fc.width,fc.height);
  const gr = f.createLinearGradient(0,0,0,fc.height); gr.addColorStop(0,"#0e1626"); gr.addColorStop(1,"#050810");
  f.fillStyle = gr; f.fillRect(0,0,fc.width,fc.height);
  drawRobot(f, fc.width/2, fc.height/2+26, 2.3, STATE.colors, 1);
  const tabs = document.getElementById("fs-tabs"); tabs.innerHTML = "";
  SLOTS.forEach(s=>{
    const b = document.createElement("button");
    b.className = "cc-part-btn"+(s.id===fsSlot?" sel":""); b.textContent = s.icon+" "+s.name;
    b.addEventListener("click", ()=>{ fsSlot = s.id; renderFashion(); });
    tabs.appendChild(b);
  });
  const wrap = document.getElementById("fs-list"); wrap.innerHTML = "";
  const none = document.createElement("div"); none.className = "shop-row";
  none.innerHTML = `<div class="shop-icon">🚫</div><div class="shop-info"><div class="shop-name">ไม่ใส่</div></div><button class="btn small ghost">ถอด</button>`;
  none.querySelector("button").addEventListener("click", ()=>{ delete STATE.equip[fsSlot]; saveState(); renderFashion(); });
  wrap.appendChild(none);
  COSMETICS.filter(c=>c.slot===fsSlot).forEach(it=>{
    const own = !!STATE.owned[it.id], on = STATE.equip[fsSlot]===it.id, rar = rarityOf(it.price);
    const row = document.createElement("div"); row.className = "shop-row";
    row.innerHTML = `<div class="shop-icon" style="background:${it.color}33;border-color:${it.color}">${SLOTS.find(s=>s.id===it.slot).icon}</div>
      <div class="shop-info"><div class="shop-name">${it.name}</div><div class="shop-sub"><b style="color:${rar[1]}">${rar[0]}</b> · ${own?"✅ เป็นเจ้าของแล้ว":"💰 "+it.price}</div></div>
      <button class="btn small ${own&&on?"ghost":""}">${own?(on?"ถอด":"ใส่"):"ซื้อ"}</button>`;
    row.querySelector("button").addEventListener("click", ()=>{
      if(!own){
        if(STATE.money<it.price){ sfx("error"); toast("เงินไม่พอ"); return; }
        STATE.money -= it.price; STATE.owned[it.id] = true; STATE.equip[it.slot] = it.id;
        sfx("buy");
        toast(`ซื้อ ${it.name} แล้ว!`);
      } else if(on) delete STATE.equip[it.slot]; else STATE.equip[it.slot] = it.id;
      saveState(); renderFashion();
    });
    wrap.appendChild(row);
  });
  showScreen("screen-fashion");
}
document.getElementById("fs-back").addEventListener("click", ()=>{ ccPart="head"; renderCC(); showScreen("screen-charcreate"); });
document.getElementById("fs-random").addEventListener("click", ()=>{
  SLOTS.forEach(s=>{ const o = COSMETICS.filter(c=>c.slot===s.id&&STATE.owned[c.id]); if(o.length&&Math.random()<0.7) STATE.equip[s.id]=o[Math.floor(Math.random()*o.length)].id; else delete STATE.equip[s.id]; });
  saveState(); renderFashion();
});

// ===================== QUESTS =====================
function questValue(q){
  const Q = STATE.qs;
  switch(q.s){
    case "kills": return Q.kills; case "bosses": return Q.bosses; case "mined": return Q.mined;
    case "earned": return Q.earned; case "deaths": return Q.deaths;
    case "peak": return Math.max(Q.peak, STATE.money);
    case "sold": return STATE.stats.totalSold;
    case "upg": return Object.values(STATE.levels).reduce((a,b)=>a+b,0);
    case "maps": return Object.keys(Q.maps).length;
    case "elem": return Object.keys(STATE.discovered).length;
    case "owned": return Object.keys(STATE.owned).length;
    case "slots": return Object.values(STATE.equip).filter(Boolean).length;
  }
  return 0;
}
function checkQuests(){
  STATE.qs.peak = Math.max(STATE.qs.peak, STATE.money);
  for(const q of QUESTS){
    if(!STATE.qs.notified[q.id] && questValue(q) >= q.goal){
      STATE.qs.notified[q.id] = 1;
      toast(`🏆 เควสสำเร็จ: ${q.name} — กดรับรางวัลที่เมนูเควส`);
    }
  }
}
function claimable(){ return QUESTS.filter(q=>!STATE.claimed[q.id] && questValue(q)>=q.goal).length; }
function updateQuestBadge(){
  const n = claimable(), b = document.getElementById("btn-menu-quests");
  if(b) b.textContent = "🏆 เควสความสำเร็จ" + (n?` (รับได้ ${n})`:"");
}
function renderQuests(){
  const wrap = document.getElementById("quest-list"); wrap.innerHTML = "";
  const done = QUESTS.filter(q=>STATE.claimed[q.id]).length;
  document.getElementById("quest-sum").textContent = `สำเร็จแล้ว ${done} / ${QUESTS.length}`;
  const state = q=> STATE.claimed[q.id]?2 : questValue(q)>=q.goal?0 : 1;
  [...QUESTS].sort((a,b)=> state(a)-state(b) || a.diff-b.diff).forEach(q=>{
    const v = Math.min(questValue(q), q.goal), st = state(q);
    const row = document.createElement("div"); row.className = "shop-row quest-row"+(st===2?" done":"");
    row.innerHTML = `<div class="shop-icon">${q.icon}</div>
      <div class="shop-info"><div class="shop-name">${q.name} <span class="stars">${"★".repeat(q.diff)}</span></div>
      <div class="shop-sub">${q.cat} · ${v.toLocaleString()} / ${q.goal.toLocaleString()} · รางวัล 💰${q.reward.toLocaleString()}</div>
      <div class="qbar"><i style="width:${v/q.goal*100}%"></i></div></div>
      <button class="btn small ${st===0?"":"disabled"}">${st===2?"รับแล้ว":st===0?"รับ 💰":"ยังไม่ครบ"}</button>`;
    row.querySelector("button").addEventListener("click", ()=>{
      if(st!==0) return;
      STATE.claimed[q.id] = 1; STATE.money += q.reward; saveState();
      sfx("quest");
      toast(`รับรางวัล 💰${q.reward}`); renderQuests();
    });
    wrap.appendChild(row);
  });
  showScreen("screen-quests");
}

// ===================== IN-GAME =====================
const gcanvas = document.getElementById("game-canvas");
const gctx = gcanvas.getContext("2d");
let curMap = null;
let world = { w: 2600, h: 1800 };
let player = { x:1300, y:900, vx:0, vy:0, facing:1, hp:100, maxHp:100, invuln:0, attackTimer:0, attackAnim:-1, poisonT:0, slowT:0, poisonAcc:0 };
let nodes = [];
let healItems = [], healFx = [];
let monsters = [];
let camera = { x:0, y:0 };
let keys = {};
let joy = { active:false, dx:0, dy:0, id:null };
let mining = { active:false, node:null, progress:0, duration:0 };
let rafId = null;
let lastTime = 0;

const ATTACK_COOLDOWN = 0.5;
const ATTACK_ANIM_DURATION = 0.22;
const ATTACK_RANGE = 76;

function resizeCanvas(){
  gcanvas.width = gcanvas.clientWidth * devicePixelRatio;
  gcanvas.height = gcanvas.clientHeight * devicePixelRatio;
}
window.addEventListener("resize", resizeCanvas);

// ===== ของตกแต่ง + สิ่งกีดขวางประจำแมพ =====
let obstacles = [], decos = [];
const CR_SCALE = { tree:0.6, pond:0.8, lava:0.85, coral:0.8, dish:0.7, support:0.8, crystal:0.7 };
function blocked(x,y,pad){ for(const b of obstacles){ if(Math.hypot(b.x-x,b.y-y) < b.cr+pad) return true; } return false; }
function spawnPad(t){ return t.pack ? 110 : (t.size||24)+45; }
function genDecor(map){
  obstacles = []; decos = [];
  const cfg = MAP_DECOR[map.id]; if(!cfg) return;
  const cx = world.w/2, cy = world.h/2;
  for(const [kind,n,r0,r1] of cfg.solid){
    for(let i=0;i<n;i++){
      for(let t=0;t<50;t++){
        const r = r0+Math.random()*(r1-r0);
        const x = 90+Math.random()*(world.w-180), y = 90+Math.random()*(world.h-180);
        if(Math.hypot(x-cx,y-cy) < 190+r) continue;                                   // เว้นจุดเกิดผู้เล่น
        if(obstacles.some(o=>Math.hypot(o.x-x,o.y-y) < o.r+r+110)) continue;            // เว้นช่องให้เดิน
        obstacles.push({kind,x,y,r,cr:r*(CR_SCALE[kind]||1),seed:Math.random()*100}); break;
      }
    }
  }
  obstacles.sort((a,b)=>a.y-b.y);
  for(const [kind,n] of cfg.deco){
    for(let i=0;i<n;i++){
      for(let t=0;t<12;t++){
        const x = 40+Math.random()*(world.w-80), y = 40+Math.random()*(world.h-80);
        if(blocked(kind==="rail"?x+36:x, y, kind==="rail"?60:12)) continue;
        decos.push({kind,x,y,s:0.75+Math.random()*0.6,a:Math.random()*6.28,c:Math.random()}); break;
      }
    }
  }
  decos.sort((a,b)=>a.y-b.y);
}
// ผลักวัตถุออกจากสิ่งกีดขวาง (มอนสเตอร์จะเลื่อนอ้อมเมื่อชนตรงๆ)
function collideCircle(o, rad, mvx, mvy){
  for(const b of obstacles){
    let dx = o.x-b.x, dy = o.y-b.y, d = Math.hypot(dx,dy);
    const min = b.cr+rad;
    if(d >= min) continue;
    if(d < 0.001){ dx = 1; dy = 0; d = 1; }
    const nx = dx/d, ny = dy/d;
    o.x = b.x+nx*min; o.y = b.y+ny*min;
    if(mvx!==undefined){
      const mv = Math.hypot(mvx,mvy);
      if(mv > 0.01 && Math.abs((mvx*-ny+mvy*nx)/mv) < 0.35){
        o.slideSign = o.slideSign || (Math.random()<0.5?1:-1);
        o.x += -ny*o.slideSign*mv*0.6; o.y += nx*o.slideSign*mv*0.6;
      }
    }
  }
}

const ROCK_COL = { boulder:["#5f6b5c","#86937f"], reef:["#27475a","#3f7186"], mrock:["#4f4f63","#8b8ba3"], spire:["#3d3d52","#6e6e88"], pillar:["#4b3822","#7a5a36"], mesa:["#7d3520","#b85a36"], basalt:["#26221f","#514a42"] };
function shadow(c,o,k){ c.fillStyle="#00000038"; c.beginPath(); c.ellipse(o.x+4,o.y+o.r*0.55,o.r*(k||1.05),o.r*0.5,0,0,7); c.fill(); }
function drawRock(c,o){
  const col = ROCK_COL[o.kind] || ROCK_COL.boulder, n = 9, tall = o.kind==="spire"||o.kind==="pillar"||o.kind==="basalt";
  const path = (k,ox,oy)=>{ c.beginPath(); for(let i=0;i<n;i++){ const a = i/n*6.283+o.seed, rr = o.r*k*(0.85+0.25*Math.abs(Math.sin(o.seed*7+i*2.3))); const px = o.x+ox+Math.cos(a)*rr, py = o.y+oy+Math.sin(a)*rr*(tall?1:0.82); if(i) c.lineTo(px,py); else c.moveTo(px,py); } c.closePath(); };
  shadow(c,o);
  path(1,0,0); c.fillStyle=col[0]; c.fill(); c.lineWidth=2; c.strokeStyle="#00000066"; c.stroke();
  path(0.6,-o.r*0.14,-o.r*0.2); c.fillStyle=col[1]; c.globalAlpha=0.5; c.fill();
}
function drawTree(c,o){
  const r = o.r; shadow(c,o,1.1);
  c.fillStyle="#5a3b22"; c.fillRect(o.x-r*0.16,o.y-r*0.1,r*0.32,r*0.8);
  for(const [col,dx,dy,k] of [["#1f6b34",0,-0.2,1],["#2f8a41",-0.25,-0.55,0.78],["#43a851",0.22,-0.62,0.66]]){ c.fillStyle=col; c.beginPath(); c.arc(o.x+dx*r,o.y+dy*r,r*k*0.9,0,7); c.fill(); }
}
function drawPond(c,o,t){
  c.fillStyle="#1d5c7a"; c.beginPath(); c.ellipse(o.x,o.y,o.r*1.1,o.r*0.78,0,0,7); c.fill();
  c.fillStyle="#2f8cb0"; c.beginPath(); c.ellipse(o.x,o.y,o.r*0.92,o.r*0.62,0,0,7); c.fill();
  const p = (t*0.3+o.seed)%1; c.strokeStyle="rgba(200,240,255,"+(0.5*(1-p))+")"; c.lineWidth=2; c.beginPath(); c.ellipse(o.x,o.y,o.r*0.8*p,o.r*0.5*p,0,0,7); c.stroke();
}
function drawCoral(c,o,t){
  const cols = ["#ff6f91","#ff9671","#c77dff"]; c.lineCap="round"; shadow(c,o);
  for(let i=0;i<5;i++){
    const a = -1.5708+(i-2)*0.42, L = o.r*(1.1+((i*37+o.seed)%10)/25), sw = Math.sin(t*1.5+o.seed+i)*3;
    c.strokeStyle = cols[i%3]; c.lineWidth = o.r*0.22; c.beginPath(); c.moveTo(o.x+(i-2)*o.r*0.25,o.y+o.r*0.5);
    c.quadraticCurveTo(o.x+Math.cos(a)*L*0.5+sw,o.y+Math.sin(a)*L*0.5,o.x+Math.cos(a)*L+sw,o.y+Math.sin(a)*L+o.r*0.3); c.stroke();
  }
}
function drawDish(c,o){
  const r = o.r; shadow(c,o);
  c.strokeStyle="#9aa3b8"; c.lineWidth=4; c.beginPath(); c.moveTo(o.x,o.y+r*0.5); c.lineTo(o.x,o.y-r*0.2); c.stroke();
  c.fillStyle="#c9cfe0"; c.beginPath(); c.ellipse(o.x,o.y-r*0.4,r*0.95,r*0.55,-0.5,0,7); c.fill(); c.strokeStyle="#00000055"; c.lineWidth=2; c.stroke();
  c.fillStyle="#6b7390"; c.beginPath(); c.ellipse(o.x,o.y-r*0.4,r*0.55,r*0.3,-0.5,0,7); c.fill();
  c.fillStyle="#ff5c5c"; c.beginPath(); c.arc(o.x+r*0.3,o.y-r*0.85,3,0,7); c.fill();
}
function drawCrate(c,o){
  const s = o.r*1.5, x = o.x-s/2, y = o.y-s/2; c.fillStyle="#00000038"; c.fillRect(x+4,y+s-4,s,8);
  c.fillStyle="#8a5a2b"; c.fillRect(x,y,s,s); c.strokeStyle="#4a2f14"; c.lineWidth=3; c.strokeRect(x,y,s,s);
  c.beginPath(); c.moveTo(x,y); c.lineTo(x+s,y+s); c.moveTo(x+s,y); c.lineTo(x,y+s); c.stroke();
}
function drawSupport(c,o){
  const w = o.r*1.5, h = o.r*1.7; c.lineCap="round"; c.strokeStyle="#6b4a28"; c.lineWidth=7;
  c.beginPath(); c.moveTo(o.x-w/2,o.y+h/2); c.lineTo(o.x-w/2,o.y-h/2); c.moveTo(o.x+w/2,o.y+h/2); c.lineTo(o.x+w/2,o.y-h/2); c.stroke();
  c.strokeStyle="#85603a"; c.lineWidth=9; c.beginPath(); c.moveTo(o.x-w/2-8,o.y-h/2); c.lineTo(o.x+w/2+8,o.y-h/2); c.stroke();
}
function drawCrystal(c,o,t){
  const r = o.r, g = 0.6+0.3*Math.sin(t*2+o.seed); shadow(c,o);
  for(const [dx,h] of [[-0.5,0.8],[0,1.15],[0.5,0.7]]){
    const bx = o.x+dx*r, by = o.y+r*0.4; c.beginPath(); c.moveTo(bx-r*0.24,by); c.lineTo(bx+dx*r*0.2,by-h*r*1.5); c.lineTo(bx+r*0.24,by); c.closePath();
    c.fillStyle="#c9452e"; c.fill(); c.strokeStyle="rgba(255,176,138,"+g+")"; c.lineWidth=2; c.stroke();
  }
}
function drawLava(c,o,t){
  const pu = 0.5+0.5*Math.sin(t*2+o.seed), r = o.r;
  c.fillStyle="#3a1408"; c.beginPath(); c.ellipse(o.x,o.y,r*1.12,r*0.8,0,0,7); c.fill();
  c.fillStyle="#ff5a1f"; c.beginPath(); c.ellipse(o.x,o.y,r*0.95,r*0.66,0,0,7); c.fill();
  c.fillStyle="rgba(255,200,80,"+(0.35+0.4*pu)+")"; c.beginPath(); c.ellipse(o.x-r*0.1,o.y-r*0.05,r*0.55,r*0.36,0,0,7); c.fill();
}
const SOLID_DRAW = { tree:drawTree, pond:drawPond, coral:drawCoral, dish:drawDish, crate:drawCrate, support:drawSupport, crystal:drawCrystal, lava:drawLava };
const DECO_DRAW = {
  grass:(c,d)=>{ c.strokeStyle="#3f9a4a"; c.lineWidth=2; c.beginPath(); for(const k of [-4,0,4]){ c.moveTo(d.x+k*d.s,d.y); c.lineTo(d.x+k*1.6*d.s,d.y-9*d.s); } c.stroke(); },
  flower:(c,d)=>{ c.fillStyle="#3f9a4a"; c.fillRect(d.x-0.7,d.y-3,1.4,5); c.fillStyle=["#ff8fb8","#ffe066","#ffffff","#b79bff"][(d.c*4)|0]; c.beginPath(); c.arc(d.x,d.y-4,3*d.s,0,7); c.fill(); },
  mushroom:(c,d)=>{ c.fillStyle="#f3e9d2"; c.fillRect(d.x-1.2*d.s,d.y-3*d.s,2.4*d.s,4*d.s); c.fillStyle="#ff6b6b"; c.beginPath(); c.arc(d.x,d.y-3*d.s,4*d.s,Math.PI,0); c.fill(); },
  pebble:(c,d)=>{ c.fillStyle="#ffffff26"; c.beginPath(); c.ellipse(d.x,d.y,4*d.s,2.6*d.s,d.a,0,7); c.fill(); },
  kelp:(c,d,t)=>{ c.strokeStyle="#2f9e6b"; c.lineWidth=3; c.lineCap="round"; c.beginPath(); c.moveTo(d.x,d.y); c.quadraticCurveTo(d.x+Math.sin(t*1.4+d.a)*7,d.y-14*d.s,d.x+Math.sin(t*1.4+d.a+1)*5,d.y-28*d.s); c.stroke(); },
  bubble:(c,d,t)=>{ const yy = d.y-((t*14*d.s+d.a*40)%80); c.strokeStyle="#bff3ff88"; c.lineWidth=1.5; c.beginPath(); c.arc(d.x+Math.sin(t+d.a)*3,yy,3*d.s,0,7); c.stroke(); },
  shell:(c,d)=>{ c.fillStyle="#ffd9c9aa"; c.beginPath(); c.arc(d.x,d.y,4*d.s,Math.PI,0); c.fill(); },
  crater:(c,d)=>{ c.fillStyle="#00000030"; c.beginPath(); c.ellipse(d.x,d.y,22*d.s,12*d.s,0,0,7); c.fill(); c.strokeStyle="#ffffff22"; c.lineWidth=2; c.stroke(); },
  rail:(c,d)=>{ c.strokeStyle="#00000040"; c.lineWidth=3; for(let k=0;k<5;k++){ c.beginPath(); c.moveTo(d.x+k*16,d.y-6); c.lineTo(d.x+k*16,d.y+6); c.stroke(); } c.strokeStyle="#8a8f99aa"; c.lineWidth=2; c.beginPath(); c.moveTo(d.x-4,d.y-3); c.lineTo(d.x+72,d.y-3); c.moveTo(d.x-4,d.y+3); c.lineTo(d.x+72,d.y+3); c.stroke(); },
  gem:(c,d,t)=>{ c.globalAlpha = 0.6+0.4*Math.sin(t*3+d.a*9); c.fillStyle = curMap.accent; c.beginPath(); c.moveTo(d.x,d.y-6*d.s); c.lineTo(d.x+4*d.s,d.y); c.lineTo(d.x,d.y+5*d.s); c.lineTo(d.x-4*d.s,d.y); c.closePath(); c.fill(); },
  crack:(c,d)=>{ c.strokeStyle = curMap.id==="venus" ? "#ff7a2acc" : "#00000066"; c.lineWidth=2; c.beginPath(); c.moveTo(d.x,d.y); c.lineTo(d.x+12*d.s,d.y+6*d.s); c.lineTo(d.x+20*d.s,d.y+2*d.s); c.lineTo(d.x+34*d.s,d.y+10*d.s); c.stroke(); },
  dust:(c,d)=>{ c.fillStyle="#ffffff10"; c.beginPath(); c.ellipse(d.x,d.y,30*d.s,10*d.s,0,0,7); c.fill(); },
  steam:(c,d,t)=>{ for(let k=0;k<3;k++){ const p = (t*0.4+d.a+k/3)%1; c.fillStyle="rgba(255,240,180,"+(0.18*(1-p))+")"; c.beginPath(); c.arc(d.x+Math.sin(p*6+d.a)*6,d.y-p*40,6+p*10,0,7); c.fill(); } },
};

// ===== หลอดเลือดมอนสเตอร์/บอส (แบบบาง โค้งมน มีแถบเงาเลือดที่เสียไป) =====
function pill(c,x,y,w,h){ const r = h/2; c.beginPath(); c.moveTo(x+r,y); c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r); c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath(); }
function drawHpBar(c,x,y,w,h,m){
  const p = Math.max(0,m.hp/m.maxHp);
  m.hpDisp = m.hpDisp===undefined ? p : m.hpDisp+(p-m.hpDisp)*0.08;
  c.fillStyle="#000000a0"; pill(c,x-1,y-1,w+2,h+2); c.fill();
  c.save(); pill(c,x,y,w,h); c.clip();
  c.fillStyle="#ffffff88"; c.fillRect(x,y,w*Math.max(p,m.hpDisp),h);
  c.fillStyle = (m.bs&&m.bs.enraged) ? "#ff3b3b" : p>0.5 ? "#5be38a" : p>0.25 ? "#ffc94d" : "#ff5c5c";
  c.fillRect(x,y,w*p,h);
  c.restore();
}

function weightedPickElement(map){
  const featured = new Set(map.featuredElements);
  let total = 0;
  const items = ELEMENTS.map(e=>{
    const w = e.weight * (featured.has(e.symbol)?6:1);
    total += w;
    return {e,w};
  });
  let r = Math.random()*total;
  for(const it of items){ r-=it.w; if(r<=0) return it.e.symbol; }
  return items[items.length-1].e.symbol;
}

function genNodes(map){
  const list = [];
  const count = 46;
  for(let i=0;i<count;i++){
    let type, id;
    const roll = Math.random();
    if(roll < 0.4 && map.materials.length){
      type = "material";
      id = map.materials[Math.floor(Math.random()*map.materials.length)];
    } else {
      type = "element";
      id = weightedPickElement(map);
    }
    let x,y,tries=0,ok=false;
    do{
      x = 80 + Math.random()*(world.w-160);
      y = 80 + Math.random()*(world.h-160);
      ok = list.every(n=> Math.hypot(n.x-x,n.y-y) > 70) && !blocked(x,y,32);
      tries++;
    }while(!ok && tries<80);
    list.push({ x,y,type,id, taken:false });
  }
  return list;
}

// ===== ไอเทมฟื้นเลือด (เดินชนเพื่อเก็บ สุ่มฟื้นตั้งแต่ 10 HP ขึ้นไป) =====
const HEAL_ITEM_COUNT = 7, HEAL_MIN = 10, HEAL_RESPAWN = 45;
function healMax(){ return Math.max(40, Math.round(player.maxHp*0.25)); }
function rollHeal(){ return HEAL_MIN + Math.floor(Math.random()*(healMax()-HEAL_MIN+1)); }
function placeHealItem(h){
  for(let t=0;t<80;t++){
    const x = 80+Math.random()*(world.w-160), y = 80+Math.random()*(world.h-160);
    if(blocked(x,y,34)) continue;
    if(nodes.some(n=>!n.taken && Math.hypot(n.x-x,n.y-y)<60)) continue;
    h.x=x; h.y=y; return;
  }
  h.x = 120+Math.random()*(world.w-240); h.y = 120+Math.random()*(world.h-240);
}
function genHealItems(){
  const list = [];
  for(let i=0;i<HEAL_ITEM_COUNT;i++){
    const h = { x:0, y:0, taken:false, timer:0, ph:Math.random()*6.28 };
    placeHealItem(h); list.push(h);
  }
  return list;
}
function updateHealItems(dt){
  for(const h of healItems){
    if(h.taken){
      h.timer -= dt;
      if(h.timer<=0){ placeHealItem(h); h.taken=false; }
      continue;
    }
    if(player.hp<=0 || player.hp>=player.maxHp) continue;      // เลือดเต็มแล้วไม่เก็บ (ไม่เสียของ)
    if(Math.hypot(h.x-player.x, h.y-player.y) <= 32){
      const rolled = rollHeal();
      player.hp = Math.min(player.maxHp, player.hp+rolled);
      h.taken = true; h.timer = HEAL_RESPAWN;
      sfx("heal");
      healFx.push({ x:h.x, y:h.y-10, t:0, txt:"+"+rolled+" HP" });
      toast(`💚 ฟื้นฟูพลังชีวิต +${rolled} HP`);
      updateHpBar();
    }
  }
  for(const f of healFx) f.t += dt;
  healFx = healFx.filter(f=>f.t<1.2);
}
function drawHealItems(ctx, tNow){
  for(const h of healItems){
    if(h.taken) continue;
    const bob = Math.sin(tNow*3+h.ph)*3, pulse = 0.5+0.5*Math.sin(tNow*4+h.ph);
    ctx.save();
    ctx.translate(h.x, h.y+bob);
    ctx.globalAlpha = 0.25+0.2*pulse;
    ctx.fillStyle = "#4dff88";
    ctx.beginPath(); ctx.arc(0,0,26+pulse*5,0,7); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#ffffffee"; ctx.strokeStyle = "#22c55e"; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(0,0,15,0,7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#16a34a";
    ctx.fillRect(-3.5,-9,7,18); ctx.fillRect(-9,-3.5,18,7);
    ctx.restore();
  }
  for(const f of healFx){
    const k = f.t/1.2;
    ctx.save();
    ctx.globalAlpha = 1-k;
    ctx.font = "bold 16px system-ui"; ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.lineWidth = 3; ctx.strokeStyle = "#0b1220"; ctx.fillStyle = "#4dff88";
    ctx.strokeText(f.txt, f.x, f.y-k*38); ctx.fillText(f.txt, f.x, f.y-k*38);
    ctx.restore();
  }
}

// ---------- Monsters ----------
let projectiles = [];
let explosions = [];
let hazards = [];
let beams = [];
let respawnQueue = [];
const MAX_MONSTERS = 34;

function clampWorld(o){
  o.x = Math.max(30, Math.min(world.w-30, o.x));
  o.y = Math.max(30, Math.min(world.h-30, o.y));
}

function makeMonster(type, x, y, opts){
  opts = opts || {};
  const mini = !!opts.mini;
  const v = mini ? 1 : (0.92 + Math.random()*0.2);      // เลือดแต่ละตัวสุ่มต่างกันเล็กน้อย
  const ab = (type.abilities||[]).filter(a=> !(mini && a==="split"));
  const hpS = opts.hpScale!==undefined ? opts.hpScale : (mini?0.35:1);
  const dmgS = opts.dmgScale!==undefined ? opts.dmgScale : (mini?0.6:1);
  const size = (type.size||24) * (opts.sizeScale!==undefined ? opts.sizeScale : (mini?0.65:1));
  const ranged = ab.includes("ranged");
  const aggro = type.aggro || 170;
  const hp = Math.max(4, Math.round(type.hp * v * hpS));
  const attackInterval = type.attackInterval || (ranged ? 1.6 : 1.1);
  return {
    type, typeId:type.id,
    x, y, name: opts.tag ? type.name+" ("+opts.tag+")" : (mini ? type.name+" (เล็ก)" : type.name), emoji:type.emoji, color:type.color,
    hp, maxHp:hp,
    damage: Math.max(1, Math.round(type.damage*dmgS)),
    speed: type.speed*(mini?1.15:1),
    reward: mini ? [1,3] : type.reward,
    size, aggro,
    attackRange: ranged ? aggro-40 : Math.max(46, size+22),
    attackInterval, attackTimer: attackInterval*(0.5+Math.random()*0.5),
    armor: type.armor||0, abilities: ab, boss: !!type.boss, mini, owner: opts.owner||null,
    provoked: !!opts.provoked,
    dead:false, deathTimer:0, flashTimer:0, facing:1, exploded:false,
    dashCd: 1.5+Math.random()*2.5, dashState:0, dashTimer:0, dashDir:{x:1,y:0}, dashHit:false,
    tpCd: 2+Math.random()*2.5, tpFlash:0, fuse:-1
  };
}

function randomSpawnPoint(minFromPlayer, list, pad){
  let x,y,tries=0,ok=false;
  const px = player.x, py = player.y;
  do{
    x = 80 + Math.random()*(world.w-160);
    y = 80 + Math.random()*(world.h-160);
    ok = Math.hypot(x-px, y-py) > minFromPlayer && list.every(m=>Math.hypot(m.x-x,m.y-y) > 70) && !blocked(x,y,pad||60);
    tries++;
  }while(!ok && tries<40);
  return {x,y};
}

function spawnMonsters(map){
  const types = MONSTER_TYPES[map.id];
  if(!types || !types.length) return [];
  const list = [];
  const rnd = (a,b)=> a + Math.floor(Math.random()*(b-a+1));
  player.x = world.w/2; player.y = world.h/2;          // จุดเกิดของผู้เล่น
  for(const t of types){
    const n = t.boss ? 1 : rnd(t.count[0], t.count[1]);
    for(let i=0;i<n;i++){
      const pt = randomSpawnPoint(t.boss ? 600 : 260, list, spawnPad(t));
      if(t.pack){
        for(let k=0;k<t.pack;k++){
          const a = Math.random()*Math.PI*2, r = 20+Math.random()*30;
          list.push(makeMonster(t, pt.x+Math.cos(a)*r, pt.y+Math.sin(a)*r));
        }
      } else {
        list.push(makeMonster(t, pt.x, pt.y));
      }
    }
  }
  return list;
}

function enterMap(mapId){
  STATE.qs.maps[mapId] = 1; saveState();
  curMap = MAPS.find(m=>m.id===mapId);
  genDecor(curMap);
  nodes = genNodes(curMap);
  healFx = [];
  projectiles = []; explosions = []; respawnQueue = []; hazards = []; beams = [];
  player.push = null; player.pull = null;
  player.poisonT = 0; player.slowT = 0; player.poisonAcc = 0;
  monsters = spawnMonsters(curMap);
  player.x = world.w/2; player.y = world.h/2;
  player.maxHp = playerMaxHP();
  player.hp = player.maxHp;
  healItems = genHealItems();
  player.invuln = 0; player.attackTimer = 0; player.attackAnim = -1;
  document.getElementById("death-overlay").classList.remove("show");
  document.getElementById("game-map-name").textContent = curMap.emoji+" "+curMap.name;
  showScreen("screen-game");
  sfx("enterMap");
  if(window.SFX) SFX.music(curMap.id);
  resizeCanvas();
  lastTime = performance.now();
  if(rafId) cancelAnimationFrame(rafId);
  loop();
  updateHud();
  updateHpBar();
}
document.getElementById("btn-game-exit").addEventListener("click", ()=>{
  cancelAnimationFrame(rafId); rafId=null;
  goMenu();
});

function updateHud(){
  document.getElementById("game-money").textContent = STATE.money;
  document.getElementById("game-cap").textContent = capacityUsed()+"/"+capacityMax();
}
function updateHpBar(){
  const pct = Math.max(0, player.hp/player.maxHp*100);
  document.getElementById("hp-bar-fill").style.width = pct+"%";
  document.getElementById("hp-bar-ghost").style.width = pct+"%";
  document.getElementById("hp-bar-text").textContent = Math.ceil(Math.max(0,player.hp))+"/"+player.maxHp;
  const w = document.getElementById("hp-wrap");
  w.classList.toggle("full", pct>=99.5); w.classList.toggle("mid", pct<=60 && pct>30); w.classList.toggle("low", pct<=30);
}

// --- controls: keyboard ---
window.addEventListener("keydown", e=>{
  keys[e.key.toLowerCase()] = true;
  if(e.key===" " || e.key.toLowerCase()==="e"){ startMiningIfNear(); }
  if(e.key.toLowerCase()==="f"){ doAttack(); }
});
window.addEventListener("keyup", e=>{
  keys[e.key.toLowerCase()] = false;
  if(e.key===" " || e.key.toLowerCase()==="e"){ stopMining(); }
});

// --- controls: virtual joystick (touch) ---
const joyBase = document.getElementById("joy-base");
const joyThumb = document.getElementById("joy-thumb");
function joyReset(){ joy.active=false; joy.dx=0; joy.dy=0; joyThumb.style.transform="translate(-50%,-50%)"; }
joyBase.addEventListener("pointerdown", e=>{
  joy.active = true; joy.id = e.pointerId;
  joyBase.setPointerCapture(e.pointerId);
  updateJoy(e);
});
joyBase.addEventListener("pointermove", e=>{ if(joy.active && e.pointerId===joy.id) updateJoy(e); });
joyBase.addEventListener("pointerup", e=>{ if(e.pointerId===joy.id) joyReset(); });
joyBase.addEventListener("pointercancel", ()=> joyReset());
function updateJoy(e){
  const rect = joyBase.getBoundingClientRect();
  const cx = rect.left+rect.width/2, cy = rect.top+rect.height/2;
  let dx = e.clientX-cx, dy = e.clientY-cy;
  const max = rect.width/2;
  const dist = Math.min(Math.hypot(dx,dy), max);
  const ang = Math.atan2(dy,dx);
  dx = Math.cos(ang)*dist; dy = Math.sin(ang)*dist;
  joy.dx = dx/max; joy.dy = dy/max;
  joyThumb.style.transform = `translate(${dx-18}px, ${dy-18}px)`;
}

// --- mine button ---
const mineBtn = document.getElementById("btn-mine");
mineBtn.addEventListener("pointerdown", ()=> startMiningIfNear());
mineBtn.addEventListener("pointerup", ()=> stopMining());
mineBtn.addEventListener("pointercancel", ()=> stopMining());

// --- attack button ---
const attackBtn = document.getElementById("btn-attack");
attackBtn.addEventListener("pointerdown", ()=> doAttack());

function monsterReach(m){ return ATTACK_RANGE + Math.max(0, m.size-24); }

function nearestMonster(){
  let best=null, bestD=Infinity;
  for(const m of monsters){
    if(m.dead) continue;
    const d = Math.hypot(m.x-player.x, m.y-player.y) - Math.max(0, m.size-24);
    if(d<bestD){ bestD=d; best=m; }
  }
  if(best && bestD <= ATTACK_RANGE) return best;
  return null;
}

function doAttack(){
  if(!curMap || player.hp<=0) return;
  if(player.attackTimer>0) return;
  player.attackTimer = ATTACK_COOLDOWN;
  player.attackAnim = 0;
  sfx("swing");
  if(mining.active) stopMining();
  const power = playerAttackPower();
  for(const m of monsters.slice()){
    if(m.dead) continue;
    const d = Math.hypot(m.x-player.x, m.y-player.y);
    if(d <= monsterReach(m)) damageMonster(m, power);
  }
}

function damageMonster(m, dmg){
  if(m.dead) return;
  const arm = Math.min(0.9, m.armor + ((m.bs && m.bs.shield>0) ? 0.6 : 0));
  m.hp -= dmg*(1-arm); m.hpShow = 3.5;
  sfxAt(arm>=0.25 ? "hitArmor" : "hit", m.x, m.y);
  m.flashTimer = 0.15;
  m.provoked = true;
  if(m.hp<=0) killMonster(m, true);
}

function queueRespawn(m){
  if(m.mini) return;
  respawnQueue.push({ t: m.boss ? 120 : 18+Math.random()*10, type:m.type });
}

function killMonster(m, byPlayer){
  if(m.dead) return;
  m.dead = true;
  m.deathTimer = 0.4;
  queueRespawn(m);
  if(!byPlayer) return;
  sfx(m.boss ? "bossKill" : "kill");
  const reward = Math.floor(m.reward[0] + Math.random()*(m.reward[1]-m.reward[0]+1));
  STATE.money += reward;
  STATE.qs.kills++; if(m.boss) STATE.qs.bosses++;
  saveState();
  if(m.boss) toast(`🏆 ปราบบอส ${m.name} สำเร็จ! ได้ 💰${reward}`);
  else toast(`⚔️ ปราบ ${m.name} สำเร็จ! ได้ 💰${reward}`);
  updateHud();
  if(m.boss){
    for(const mm of monsters){ if(mm.owner===m && !mm.dead) killMonster(mm, false); }
    hazards = hazards.filter(h=>h.owner!==m); beams = beams.filter(b=>b.owner!==m);
    dropBossLoot(m);
  }
  if(m.abilities.includes("split")){
    for(let k=0;k<2;k++){
      const a = Math.random()*Math.PI*2;
      const mini = makeMonster(m.type, m.x+Math.cos(a)*22, m.y+Math.sin(a)*22, {mini:true, provoked:true});
      clampWorld(mini);
      monsters.push(mini);
    }
  }
}

// ===================== BOSS LOOT =====================
function randInt(a,b){ return a + Math.floor(Math.random()*(b-a+1)); }

function dropBossLoot(m){
  const cfg = m.type.loot;
  if(!cfg) return;
  // สุ่ม 4 อย่าง (ไม่ซ้ำกัน) จากคลังของบอสตัวนั้น ของหายากมีโอกาสน้อยกว่า
  const pool = [
    ...cfg.common.map(id=>({id, w:3, rare:false})),
    ...cfg.rare.map(id=>({id, w:1, rare:true})),
  ];
  const picks = [];
  while(picks.length<4 && pool.length){
    const total = pool.reduce((a,b)=>a+b.w,0);
    let r = Math.random()*total, idx = 0;
    for(let i=0;i<pool.length;i++){ r-=pool[i].w; if(r<=0){ idx=i; break; } }
    picks.push(pool.splice(idx,1)[0]);
  }
  const loot = picks.map(p=>{
    const q = p.rare ? randInt(cfg.rareQty[0], cfg.rareQty[1]) : randInt(cfg.qty[0], cfg.qty[1]);
    return { id:p.id, qty:q, rare:p.rare, isNew: !!(ELEMENTS_BY_SYMBOL[p.id] && !STATE.discovered[p.id]) };
  });
  for(const it of loot){
    // ของดรอปจากบอสเข้ากระเป๋าเสมอ แม้กระเป๋าจะเต็ม
    STATE.inventory[it.id] = (STATE.inventory[it.id]||0) + it.qty;
    STATE.stats.totalCollected += it.qty;
    if(ELEMENTS_BY_SYMBOL[it.id]) STATE.discovered[it.id] = true;
  }
  saveState();
  updateHud();
  showLoot(m, loot);
}

let lootTimer = null;
function showLoot(m, loot){
  const box = document.getElementById("loot-overlay");
  const rows = loot.map(it=>{
    const info = itemInfo(it.id);
    return `<div class="loot-row${it.rare?" rare":""}">
      <span class="loot-icon" style="background:${info.color||"#666"}33;color:${info.color||"#fff"}">${info.icon}</span>
      <span class="loot-name">${info.name}${it.isNew?' <em>ใหม่!</em>':''}${it.rare?' <em class="r">หายาก</em>':''}</span>
      <span class="loot-qty">x${it.qty}</span></div>`;
  }).join("");
  box.querySelector(".loot-body").innerHTML =
    `<div class="loot-title">🏆 ปราบ ${m.name} สำเร็จ!</div>
     <div class="loot-sub">ของรางวัลจากบอส (สุ่ม 4 อย่าง)</div>${rows}
     <button id="btn-loot-ok" class="btn primary">เก็บของ</button>`;
  box.classList.add("show");
  sfx("loot");
  document.getElementById("btn-loot-ok").addEventListener("click", hideLoot);
  clearTimeout(lootTimer);
  lootTimer = setTimeout(hideLoot, 9000);
}
function hideLoot(){
  clearTimeout(lootTimer);
  document.getElementById("loot-overlay").classList.remove("show");
}

// ===================== BOSS SKILLS =====================
// แต่ละบอสมีชุดสกิลเฉพาะตัว (ดู skills ใน data.js) — ทุกสกิลมีเส้น/วงแดงเตือนก่อนโจมตี
const BOSS_SKILLS = {
  // 🌳 ราชาต้นไม้
  roots:     { name:"🌿 รากไม้พันธนาการ", cd:8,  cast:0.7 },
  summon:    { name:"📣 เรียกลูกสมุน",     cd:15, cast:0.9 },
  // 🐙 ราชาคราเคน
  nova:      { name:"🫧 หมึกวงแหวน",       cd:9,  cast:0.8 },
  whirlpool: { name:"🌀 น้ำวนดูดกลืน",     cd:14, cast:1.0 },
  tentacle:  { name:"🦑 หนวดฟาดพื้น",      cd:10, cast:0.6 },
  // 🌚 ผู้พิทักษ์จันทร์
  laser:     { name:"🔆 เลเซอร์กวาด",      cd:9,  cast:1.1 },
  meteors:   { name:"☄️ ฝนอุกกาบาต",       cd:8,  cast:0.8 },
  shield:    { name:"🛡️ โล่พลังงาน",       cd:17, cast:0.5 },
  // 🐉 มังกรถ่านหิน
  cone:      { name:"🔥 พ่นไฟเป็นพัด",     cd:7,  cast:0.9 },
  slam:      { name:"💢 กระโดดทุบพื้น",    cd:11, cast:1.0 },
  // 🦖 ไดโนสนิมแดง
  stomp:     { name:"🦶 กระทืบคลื่นกระแทก", cd:9,  cast:0.9 },
  // 😈 ราชาปีศาจศุกร์
  acidrain:  { name:"🧪 ฝนกรด",            cd:10, cast:0.8 },
  lifesteal: { name:"🩸 ลูกไฟดูดเลือด",     cd:8,  cast:0.6 },
  phase:     { name:"✨ วาร์ประเบิด",       cd:12, cast:0.8 },
};
const BOSS_PASSIVES = {
  enrage:  { th:0.5,  speed:1.3,  dmg:1.25, name:"😡 บ้าคลั่ง!" },
  berserk: { th:0.35, speed:1.45, dmg:1.4,  name:"🔥 คลั่งสุดขีด!" },
};

function bossLabel(m, text, t){ m.label = text; m.labelT = t||1.2; }

function addHazard(m, x, y, r, delay, dmg, opts){
  hazards.push(Object.assign({ owner:m, x, y, r, delay, t:0, dmg, color:m.color }, opts||{}));
}
function addBeam(m, ang, len, width, delay, dmg, opts){
  beams.push(Object.assign({ owner:m, x:m.x, y:m.y, ang, len, width, delay, t:0, dmg, color:m.color }, opts||{}));
}
function ring(m, n, speed, dmg, abil, offset){
  for(let i=0;i<n;i++){
    const a = (offset||0) + i/n*Math.PI*2;
    projectiles.push({ x:m.x, y:m.y, vx:Math.cos(a)*speed, vy:Math.sin(a)*speed, life:2.6, r:8,
      damage:dmg, color:m.color, abilities:abil||[] });
  }
}
function aroundPlayer(r){
  const a = Math.random()*Math.PI*2, d = Math.random()*r;
  return { x: Math.max(30,Math.min(world.w-30, player.x+Math.cos(a)*d)), y: Math.max(30,Math.min(world.h-30, player.y+Math.sin(a)*d)) };
}
function summonMinions(m, typeId, n){
  const list = MONSTER_TYPES[curMap.id] || [];
  const t = list.find(x=>x.id===typeId);
  if(!t) return;
  const alive = monsters.filter(o=>o.owner===m && !o.dead).length;
  for(let i=0;i<n && alive+i<4;i++){
    const a = Math.random()*Math.PI*2;
    const mm = makeMonster(t, m.x+Math.cos(a)*(m.size+30), m.y+Math.sin(a)*(m.size+30),
      { mini:true, provoked:true, owner:m, tag:"ลูกสมุน", hpScale:0.6, dmgScale:0.7, sizeScale:0.85 });
    clampWorld(mm);
    monsters.push(mm);
  }
}

// เริ่มร่ายสกิล: วางตัวเตือน (hazard/beam) แล้วบอสยืนร่ายตามเวลา cast
function castBossSkill(m, id, ang, d){
  const def = BOSS_SKILLS[id], b = m.bs;
  const dmg = m.damage;
  switch(id){
    case "roots": {
      addHazard(m, player.x, player.y, 58, 1.0, dmg*0.9, { status:"slow" });
      for(let i=0;i<3;i++){ const p=aroundPlayer(130); addHazard(m, p.x, p.y, 52, 1.0+i*0.15, dmg*0.9, { status:"slow" }); }
      break; }
    case "summon":
      summonMinions(m, m.type.id==="rexbot" ? "rustbot" : "wolf", 2);
      break;
    case "nova":
      ring(m, 12, 210, dmg*0.6, ["slow"], 0);
      b.pending = { t:0.9, fn:()=>ring(m, 12, 210, dmg*0.6, ["slow"], Math.PI/12) };
      break;
    case "whirlpool":
      player.pull = { t:1.8, tx:m.x, ty:m.y, sp:175 };
      addHazard(m, m.x, m.y, 105, 1.8, dmg*1.1, { color:"#3fd0ff", status:"slow" });
      break;
    case "tentacle":
      for(let i=0;i<5;i++){ const p=aroundPlayer(170); addHazard(m, p.x, p.y, 46, 0.9+i*0.12, dmg*0.8); }
      break;
    case "laser":
      for(const off of [-0.42,0,0.42]) addBeam(m, ang+off, 950, 46, 1.1, dmg*1.1, { color:"#ffffff" });
      break;
    case "meteors":
      for(let i=0;i<6;i++){ const p=aroundPlayer(190); addHazard(m, p.x, p.y, 52, 0.9+i*0.22, dmg*0.9, { color:"#ff9f5c" }); }
      break;
    case "shield":
      b.shield = 5;
      bossLabel(m, "🛡️ โล่พลังงาน! (ลดดาเมจ 60%)", 2);
      break;
    case "cone":
      for(const off of [-0.5,0,0.5]) addBeam(m, ang+off, 300, 8, 0.9, 0, { color:"#ff5c2a" });
      b.pending = { t:0.9, fn:()=>{
        for(let i=-3;i<=3;i++){
          const a = ang + i*0.16;
          projectiles.push({ x:m.x, y:m.y, vx:Math.cos(a)*300, vy:Math.sin(a)*300, life:1.3, r:9, damage:dmg*0.65, color:"#ff7a2a", abilities:["poison"] });
        }
      }};
      break;
    case "slam": {
      const tx = player.x, ty = player.y;
      addHazard(m, tx, ty, 118, 1.0, dmg*1.25, { color:"#ff8c3a", fn:()=>{ m.x=tx; m.y=ty; clampWorld(m); } });
      break; }
    case "stomp":
      addHazard(m, m.x, m.y, 155, 0.9, dmg, { color:"#e0553a", status:"slow", knock:150 });
      break;
    case "acidrain":
      for(let i=0;i<9;i++){ const p=aroundPlayer(270); addHazard(m, p.x, p.y, 42, 1.0+i*0.14, dmg*0.7, { color:"#b6ff3a", status:"poison" }); }
      break;
    case "lifesteal":
      for(const off of [-0.28,0,0.28]){
        const a = ang+off;
        projectiles.push({ x:m.x, y:m.y, vx:Math.cos(a)*215, vy:Math.sin(a)*215, life:3, r:10, damage:dmg*0.6, color:"#ff3b7a", abilities:[], heal:m, healAmt:Math.round(dmg*0.9) });
      }
      break;
    case "phase": {
      const a = Math.random()*Math.PI*2;
      m.x = player.x + Math.cos(a)*95; m.y = player.y + Math.sin(a)*95; clampWorld(m);
      m.tpFlash = 0.4;
      addHazard(m, m.x, m.y, 105, 0.8, dmg, { color:"#c060ff" });
      break; }
  }
  sfxAt(BOSS_SFX[id] || "warn", m.x, m.y);
  b.cast = def.cast;
  b.cd[id] = def.cd;
  bossLabel(m, def.name, Math.max(def.cast, 0.9)+0.4);
}

// คืนค่า true = บอสกำลังร่ายสกิลอยู่ (ยืนนิ่ง ไม่เดิน/ไม่ตีปกติ)
function updateBoss(m, dt, d, ang){
  const b = m.bs || (m.bs = { cd:{}, cast:0, gcd:1.5, shield:0, enraged:false, intro:false, pending:null });
  const skills = m.type.skills || [];
  if(!b.intro){
    b.intro = true;
    sfx("bossIntro");
    const names = skills.filter(s=>BOSS_SKILLS[s]).map(s=>BOSS_SKILLS[s].name).join("  ");
    toast(`👑 ${m.name} — ${m.type.title||"บอส"} | ${names}`);
  }
  for(const s of skills){
    if(BOSS_SKILLS[s] && b.cd[s]===undefined) b.cd[s] = 2 + Math.random()*4;
  }
  for(const k in b.cd) if(b.cd[k]>0) b.cd[k] -= dt;
  if(b.gcd>0) b.gcd -= dt;
  if(b.shield>0) b.shield -= dt;
  // passive: บ้าคลั่งเมื่อเลือดต่ำ
  for(const s of skills){
    const ps = BOSS_PASSIVES[s];
    if(ps && !b.enraged && m.hp < m.maxHp*ps.th){
      b.enraged = true;
      m.speed *= ps.speed; m.damage = Math.round(m.damage*ps.dmg);
      m.attackInterval *= 0.8;
      bossLabel(m, ps.name, 2.2);
      sfxAt("roar", m.x, m.y);
      toast(`${ps.name} ${m.name} เร็วและแรงขึ้น!`);
    }
  }
  if(b.pending){
    b.pending.t -= dt;
    if(b.pending.t<=0){ const f=b.pending.fn; b.pending=null; f(); }
  }
  if(b.cast>0){ b.cast -= dt; return true; }
  if(b.gcd<=0){
    const ready = skills.filter(s=> BOSS_SKILLS[s] && b.cd[s]<=0);
    if(ready.length){
      const id = ready[Math.floor(Math.random()*ready.length)];
      castBossSkill(m, id, ang, d);
      b.gcd = 2.0;
      return true;
    }
  }
  return false;
}

// ตัวเตือน/พื้นที่อันตราย/ลำแสง — คำนวณผลเมื่อครบเวลา
function updateHazards(dt){
  for(const h of hazards){
    h.t += dt;
    if(h.t >= h.delay){
      h.done = true;
      explosions.push({ x:h.x, y:h.y, r:h.r, t:0.3, max:0.3, color:h.color });
      sfxAt("boom", h.x, h.y);
      if(player.hp>0 && Math.hypot(player.x-h.x, player.y-h.y) <= h.r+12){
        const ok = playerTakeDamage(Math.round(h.dmg));
        if(ok && player.hp>0){
          if(h.status==="slow"){ player.slowT = 2.5; sfx("slow"); }
          if(h.status==="poison"){ player.poisonT = 4; sfx("poisonHit"); }
          if(h.knock){
            const a = Math.atan2(player.y-h.y, player.x-h.x);
            player.push = { vx:Math.cos(a)*h.knock*4, vy:Math.sin(a)*h.knock*4, t:0.25 };
          }
        }
      }
      if(h.fn) h.fn();
    }
  }
  hazards = hazards.filter(h=>!h.done);
  for(const bm of beams){
    bm.t += dt;
    if(bm.t >= bm.delay){
      bm.done = true;
      if(bm.dmg>0 && player.hp>0){
        const ex = Math.cos(bm.ang), ey = Math.sin(bm.ang);
        const px = player.x-bm.x, py = player.y-bm.y;
        const proj = Math.max(0, Math.min(bm.len, px*ex+py*ey));
        const dist = Math.hypot(px-ex*proj, py-ey*proj);
        if(dist <= bm.width/2+12) playerTakeDamage(Math.round(bm.dmg));
      }
      if(bm.dmg>0) sfxAt("beam", bm.x, bm.y);
      explosions.push({ x:bm.x+Math.cos(bm.ang)*Math.min(bm.len,220), y:bm.y+Math.sin(bm.ang)*Math.min(bm.len,220), r:34, t:0.2, max:0.2, color:bm.color });
      if(bm.fn) bm.fn();
    }
  }
  beams = beams.filter(b=>!b.done);
}

function applyStatus(ab){
  if(ab.includes("poison")){ player.poisonT = 4; sfx("poisonHit"); }
  if(ab.includes("slow")){   player.slowT = 2.5; sfx("slow"); }
}

function hitPlayer(m, dmg){
  sfxAt(MON_ATK[m.typeId] || "mBite", m.x, m.y);
  const ok = playerTakeDamage(Math.round(dmg));
  if(ok && player.hp>0) applyStatus(m.abilities);
}

function playerTakeDamage(dmg){
  if(player.invuln>0 || player.hp<=0) return false;
  player.hp = Math.max(0, player.hp-dmg);
  player.invuln = 0.6;
  sfx("hurt");
  updateHpBar();
  if(player.hp<=0){
    onPlayerDeath();
  } else {
    toast(`💥 โดนโจมตี -${dmg} HP`);
  }
  return true;
}

function fireProjectile(m, ang){
  sfxAt(MON_SHOT[m.typeId] || (m.boss ? "bossShot" : "spit"), m.x, m.y);
  projectiles.push({
    x:m.x, y:m.y, vx:Math.cos(ang)*250, vy:Math.sin(ang)*250,
    life:2.4, r: m.boss?11:8, damage:m.damage, color:m.color, abilities:m.abilities
  });
}

function explodeMonster(m){
  m.exploded = true;
  sfxAt("explosion", m.x, m.y);
  explosions.push({ x:m.x, y:m.y, r:84, t:0.35, max:0.35, color:m.color });
  if(player.hp>0 && Math.hypot(player.x-m.x, player.y-m.y) <= 84+14){
    playerTakeDamage(m.damage);
  }
  m.dead = true; m.deathTimer = 0.15;
  queueRespawn(m);
}

function onPlayerDeath(){
  STATE.qs.deaths++; saveState();
  sfx("death");
  if(window.SFX) SFX.music(null);
  cancelAnimationFrame(rafId); rafId=null;
  stopMining();
  document.getElementById("death-overlay").classList.add("show");
}

document.getElementById("btn-respawn").addEventListener("click", ()=>{
  document.getElementById("death-overlay").classList.remove("show");
  sfx("respawn");
  if(window.SFX && curMap) SFX.music(curMap.id);
  const penalty = Math.floor(STATE.money*0.15);
  STATE.money = Math.max(0, STATE.money-penalty);
  saveState();
  player.maxHp = playerMaxHP();
  player.hp = player.maxHp;
  player.invuln = 1.0;
  player.poisonT = 0; player.slowT = 0; player.poisonAcc = 0;
  projectiles = []; hazards = []; beams = [];
  player.push = null; player.pull = null;
  player.x = world.w/2; player.y = world.h/2;
  updateHud(); updateHpBar();
  lastTime = performance.now();
  loop();
  toast(penalty>0 ? `ฟื้นคืนชีพ! เสียเงิน 💰${penalty}` : "ฟื้นคืนชีพ!");
});
document.getElementById("btn-death-exit").addEventListener("click", ()=>{
  document.getElementById("death-overlay").classList.remove("show");
  goMenu();
});

function nearestNode(){
  let best=null, bestD=Infinity;
  for(const n of nodes){
    if(n.taken) continue;
    const d = Math.hypot(n.x-player.x, n.y-player.y);
    if(d<bestD){ bestD=d; best=n; }
  }
  if(best && bestD <= 70) return best;
  return null;
}

function startMiningIfNear(){
  if(mining.active) return;
  const n = nearestNode();
  if(!n) return;
  mining.active = true;
  mining.node = n;
  mining.progress = 0;
  let base;
  if(n.type==="material"){
    base = 1.6 * (MATERIALS[n.id].hardness||1);
  } else {
    const el = ELEMENTS_BY_SYMBOL[n.id];
    base = 1.2 + (30-el.weight)/30*3.2;
  }
  mining.duration = base / collectPower();
  mining.sndT = 0;
}
function stopMining(){
  mining.active = false; mining.node=null; mining.progress=0;
}

function finishMining(){
  const n = mining.node;
  if(!n) return;
  n.taken = true;
  STATE.qs.mined++;
  const bonus = Math.random() < (collectPower()-1)*0.12 ? 1 : 0;
  const qty = 1+bonus;
  const isNew = !!ELEMENTS_BY_SYMBOL[n.id] && !STATE.discovered[n.id];
  const full = addItem(n.id, qty);
  const info = itemInfo(n.id);
  sfx(full ? (isNew ? "discover" : "collect") : "error");
  if(!full) toast("กระเป๋าเต็ม! ขายของก่อนเพื่อเก็บเพิ่ม");
  toast(`เก็บ ${info.icon} ${info.name} x${qty}`);
  if(ELEMENTS_BY_SYMBOL[n.id]) showElementCard(ELEMENTS_BY_SYMBOL[n.id]);
  updateHud();
  stopMining();
}

// --- element info popup ---
let elCardTimer=null;
function showElementCard(el){
  const card = document.getElementById("element-card");
  card.style.borderColor = CATEGORY_COLORS[el.category];
  card.innerHTML = `
    <div class="ec-close">✕</div>
    <div class="ec-symbol" style="background:${CATEGORY_COLORS[el.category]}33;color:${CATEGORY_COLORS[el.category]}">${el.symbol}</div>
    <div class="ec-body">
      <div class="ec-name">${el.name} <span class="ec-th">(${el.nameTh})</span></div>
      <div class="ec-row">เลขอะตอม: <b>${el.z}</b> &nbsp; มวลอะตอม: <b>${el.mass}</b></div>
      <div class="ec-row">หมู่: <b>${el.group}</b> &nbsp; คาบ: <b>${el.period}</b> &nbsp; สถานะ: <b>${el.state}</b></div>
      <div class="ec-row">ประเภท: <b>${el.category}</b></div>
    </div>`;
  card.classList.add("show");
  card.querySelector(".ec-close").addEventListener("click", hideElementCard);
  clearTimeout(elCardTimer);
  elCardTimer = setTimeout(hideElementCard, 5000);
}
function hideElementCard(){
  document.getElementById("element-card").classList.remove("show");
}

// --- game loop ---
function loop(t){
  rafId = requestAnimationFrame(loop);
  const dt = Math.min(0.05, (t-lastTime)/1000);
  lastTime = t;
  update(dt);
  render();
}

function update(dt){
  let dx=0, dy=0;
  if(keys["arrowup"]||keys["w"]) dy-=1;
  if(keys["arrowdown"]||keys["s"]) dy+=1;
  if(keys["arrowleft"]||keys["a"]) dx-=1;
  if(keys["arrowright"]||keys["d"]) dx+=1;
  if(joy.active){ dx += joy.dx; dy += joy.dy; }
  const len = Math.hypot(dx,dy);
  if(len>0.05){
    dx/=len; dy/=len;
    if(mining.active) stopMining();
    const sp = moveSpeed()*60*dt*(player.slowT>0 ? 0.55 : 1);
    player.x = Math.max(20, Math.min(world.w-20, player.x+dx*sp));
    player.y = Math.max(20, Math.min(world.h-20, player.y+dy*sp));
    if(dx!==0) player.facing = dx<0?-1:1;
    player.stepT = (player.stepT||0) - dt;
    if(player.stepT<=0 && player.hp>0){ player.stepT = 0.34; sfx("step"); }
  }
  if(player.hp>0){
    if(player.push && player.push.t>0){
      player.x += player.push.vx*dt; player.y += player.push.vy*dt; player.push.t -= dt;
      player.x = Math.max(20, Math.min(world.w-20, player.x)); player.y = Math.max(20, Math.min(world.h-20, player.y));
    }
    if(player.pull && player.pull.t>0){
      const pdx = player.pull.tx-player.x, pdy = player.pull.ty-player.y, pd = Math.hypot(pdx,pdy);
      if(pd>45){ player.x += pdx/pd*player.pull.sp*dt; player.y += pdy/pd*player.pull.sp*dt; }
      player.pull.t -= dt;
    }
  }
  collideCircle(player, 15);
  camera.x = Math.max(0, Math.min(world.w-viewW(), player.x-viewW()/2));
  camera.y = Math.max(0, Math.min(world.h-viewH(), player.y-viewH()/2));

  if(mining.active){
    const n = mining.node;
    if(!n || n.taken || Math.hypot(n.x-player.x,n.y-player.y)>80){ stopMining(); }
    else {
      mining.progress += dt;
      mining.sndT = (mining.sndT||0) - dt;
      if(mining.sndT<=0){ mining.sndT = 0.3; sfx("mine"); }
      if(mining.progress >= mining.duration) finishMining();
    }
  }
  // mine button visibility
  const near = nearestNode();
  mineBtn.classList.toggle("visible", !!near || mining.active);

  // --- player combat timers ---
  if(player.attackTimer>0) player.attackTimer = Math.max(0, player.attackTimer-dt);
  if(player.attackAnim>=0){
    player.attackAnim += dt;
    if(player.attackAnim > ATTACK_ANIM_DURATION) player.attackAnim = -1;
  }
  if(player.invuln>0) player.invuln = Math.max(0, player.invuln-dt);
  const nearM = nearestMonster();
  attackBtn.classList.toggle("target", !!nearM);

  if(player.hp>0 && player.hp < player.maxHp*0.25){
    player.hbT = (player.hbT||0) - dt;
    if(player.hbT<=0){ player.hbT = 1.0; sfx("heartbeat"); }
  }

  // --- status effects on player ---
  if(player.hp > 0){
    if(player.slowT>0) player.slowT = Math.max(0, player.slowT-dt);
    if(player.poisonT>0){
      player.poisonT = Math.max(0, player.poisonT-dt);
      player.poisonAcc = (player.poisonAcc||0) + dt;
      if(player.poisonAcc >= 1){
        player.poisonAcc -= 1;
        player.hp = Math.max(1, player.hp-3);       // พิษไม่ฆ่าผู้เล่นโดยตรง
        sfx("poison");
        updateHpBar();
      }
    }
  }

  if(player.hp>0) updateHazards(dt);
  updateHealItems(dt);

  // --- explosions (visual timers) ---
  for(const ex of explosions) ex.t -= dt;
  explosions = explosions.filter(ex=> ex.t>0);

  // --- monsters AI ---
  if(player.hp > 0){
    for(const m of monsters){ const lx=m.x, ly=m.y; updateMonster(m, dt); if(!m.dead){ collideCircle(m, m.size*0.7, m.x-lx, m.y-ly); if(m.hpShow>0) m.hpShow-=dt; } }
    monsters = monsters.filter(m=> !(m.dead && m.deathTimer<=0));

    // projectiles
    for(const pr of projectiles){
      pr.x += pr.vx*dt; pr.y += pr.vy*dt; pr.life -= dt;
      if(Math.hypot(player.x-pr.x, player.y-pr.y) < pr.r+14){
        pr.life = 0;
        const hit = playerTakeDamage(Math.round(pr.damage));
        if(hit && player.hp>0) applyStatus(pr.abilities);
        if(hit && pr.heal && !pr.heal.dead) pr.heal.hp = Math.min(pr.heal.maxHp, pr.heal.hp + (pr.healAmt||10));
      }
      if(pr.x<0||pr.y<0||pr.x>world.w||pr.y>world.h) pr.life = 0;
    }
    projectiles = projectiles.filter(pr=> pr.life>0);

    // respawn queue: มอนสเตอร์ใหม่เกิดทดแทนตัวที่ตาย
    for(const q of respawnQueue) q.t -= dt;
    const ready = respawnQueue.filter(q=> q.t<=0);
    respawnQueue = respawnQueue.filter(q=> q.t>0);
    for(const q of ready){
      if(monsters.filter(m=>!m.dead).length >= MAX_MONSTERS){ q.t = 8; respawnQueue.push(q); continue; }
      const pt = randomSpawnPoint(q.type.boss ? 500 : 320, monsters, spawnPad(q.type));
      const nm = makeMonster(q.type, pt.x, pt.y);
      if(q.type.pack){
        monsters.push(nm);
        for(let k=1;k<q.type.pack;k++) monsters.push(makeMonster(q.type, pt.x+(Math.random()-0.5)*50, pt.y+(Math.random()-0.5)*50));
      } else monsters.push(nm);
    }
  }
}

function updateMonster(m, dt){
  if(m.dead){ m.deathTimer -= dt; return; }
  if(m.flashTimer>0) m.flashTimer = Math.max(0, m.flashTimer-dt);
  if(m.tpFlash>0) m.tpFlash = Math.max(0, m.tpFlash-dt);
  if(m.labelT>0){ m.labelT -= dt; if(m.labelT<=0) m.label=null; }
  const has = a=> m.abilities.includes(a);
  if(has("regen") && m.hp<m.maxHp) m.hp = Math.min(m.maxHp, m.hp + m.maxHp*0.03*dt);

  const dx = player.x-m.x, dy = player.y-m.y;
  const d = Math.hypot(dx,dy) || 1;
  const ang = Math.atan2(dy,dx);
  const step = (mult)=>{
    m.x += Math.cos(ang)*m.speed*60*dt*mult;
    m.y += Math.sin(ang)*m.speed*60*dt*mult;
  };

  // fuse (ระเบิดพลีชีพ)
  if(m.fuse>=0){
    m.fuse -= dt;
    if(m.fuse<=0) explodeMonster(m);
    return;
  }
  // dash: เตือน 0.5 วิ แล้วพุ่ง 0.35 วิ
  if(m.dashState===1){
    m.dashTimer -= dt;
    if(m.dashTimer<=0){ m.dashState=2; m.dashTimer=0.35; m.dashHit=false; sfxAt("dash", m.x, m.y); }
    return;
  }
  if(m.dashState===2){
    m.dashTimer -= dt;
    m.x += m.dashDir.x*560*dt; m.y += m.dashDir.y*560*dt;
    clampWorld(m);
    if(!m.dashHit && player.hp>0 && Math.hypot(player.x-m.x, player.y-m.y) < m.size+16){
      m.dashHit = true;
      hitPlayer(m, m.damage*1.3);
    }
    if(m.dashTimer<=0){ m.dashState=0; m.dashCd = 3.2+Math.random()*1.5; }
    return;
  }

  const aggro = m.aggro*(m.provoked ? 1.8 : 1);
  if(d > aggro) return;

  m.facing = dx<0 ? -1 : 1;
  m.dashCd -= dt; m.tpCd -= dt;
  if(m.boss && m.type.skills && updateBoss(m, dt, d, ang)) return;

  // teleport
  if(has("teleport") && m.tpCd<=0 && d>100){
    const a = Math.random()*Math.PI*2;
    m.x = player.x + Math.cos(a)*75; m.y = player.y + Math.sin(a)*75;
    clampWorld(m);
    m.tpCd = 3.5+Math.random()*2; m.tpFlash = 0.35;
    sfxAt("teleport", m.x, m.y);
    m.attackTimer = Math.max(m.attackTimer, 0.5);
    return;
  }
  // dash trigger
  if(has("dash") && m.dashCd<=0 && d<260 && d>70){
    m.dashState = 1; m.dashTimer = 0.5;
    sfxAt("dashWarn", m.x, m.y);
    m.dashDir = { x:dx/d, y:dy/d };
    return;
  }
  // explode: วิ่งเข้าหาแล้วจุดชนวน
  if(has("explode")){
    if(d > m.size+20) step(1.15);
    else { m.fuse = 0.7; sfxAt("fuse", m.x, m.y); }
    return;
  }
  // ranged: รักษาระยะและยิง
  if(has("ranged")){
    if(d > m.attackRange*0.9) step(1);
    else if(d < m.attackRange*0.5){ m.x -= Math.cos(ang)*m.speed*60*dt*0.7; m.y -= Math.sin(ang)*m.speed*60*dt*0.7; clampWorld(m); }
    m.attackTimer -= dt;
    if(d<=m.attackRange && m.attackTimer<=0){ m.attackTimer = m.attackInterval; fireProjectile(m, ang); }
    return;
  }
  // melee
  if(d > m.attackRange*0.85) step(1);
  if(d <= m.attackRange){
    m.attackTimer -= dt;
    if(m.attackTimer<=0){ m.attackTimer = m.attackInterval; hitPlayer(m, m.damage); }
  }
  // กันมอนสเตอร์ซ้อนทับกัน
  for(const o of monsters){
    if(o===m || o.dead) continue;
    const ox = m.x-o.x, oy = m.y-o.y, od = Math.hypot(ox,oy);
    const minD = (m.size+o.size)*0.7;
    if(od>0 && od<minD){ m.x += ox/od*0.8; m.y += oy/od*0.8; }
  }
}

function viewW(){ return gcanvas.width/devicePixelRatio; }
function viewH(){ return gcanvas.height/devicePixelRatio; }

function render(){
  const ctx = gctx;
  const W = viewW(), H = viewH();
  ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);
  ctx.fillStyle = curMap.bg;
  ctx.fillRect(0,0,W,H);
  ctx.save();
  ctx.translate(-camera.x, -camera.y);

  // ground texture pattern (simple grid dots)
  ctx.fillStyle = curMap.ground;
  const gx0 = Math.floor(camera.x/80)*80, gy0 = Math.floor(camera.y/80)*80;
  for(let gx=gx0; gx<camera.x+W+80; gx+=80){
    for(let gy=gy0; gy<camera.y+H+80; gy+=80){
      ctx.globalAlpha = ((gx/80+gy/80)%2===0) ? 0.5 : 0.3;
      ctx.fillRect(gx,gy,78,78);
    }
  }
  ctx.globalAlpha = 1;

  // ของตกแต่ง + สิ่งกีดขวาง
  const tNow = performance.now()/1000, vx0 = camera.x-100, vx1 = camera.x+W+100, vy0 = camera.y-100, vy1 = camera.y+H+100;
  for(const d of decos){ if(d.x<vx0||d.x>vx1||d.y<vy0||d.y>vy1) continue; ctx.save(); DECO_DRAW[d.kind](ctx,d,tNow); ctx.restore(); }
  for(const o of obstacles){ if(o.x<vx0||o.x>vx1||o.y<vy0||o.y>vy1) continue; ctx.save(); (SOLID_DRAW[o.kind]||drawRock)(ctx,o,tNow); ctx.restore(); }

  // nodes
  const near = nearestNode();
  for(const n of nodes){
    if(n.taken) continue;
    const info = itemInfo(n.id);
    const isNear = near===n;
    ctx.beginPath();
    ctx.arc(n.x, n.y, isNear?22:18, 0, Math.PI*2);
    ctx.fillStyle = info.color+"cc";
    ctx.fill();
    ctx.lineWidth = isNear?3:1.5;
    ctx.strokeStyle = isNear? curMap.accent : "#ffffff55";
    ctx.stroke();
    ctx.fillStyle = "#0b1220";
    ctx.font = "bold 13px system-ui";
    ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillText(info.icon.length<=2?info.icon:info.icon, n.x, n.y+1);
  }

  drawHealItems(ctx, tNow);

  // mining progress ring
  if(mining.active && mining.node){
    const n = mining.node;
    const pct = mining.progress/mining.duration;
    ctx.beginPath();
    ctx.arc(n.x, n.y, 28, -Math.PI/2, -Math.PI/2 + pct*Math.PI*2);
    ctx.strokeStyle = "#ffffff"; ctx.lineWidth=4; ctx.stroke();
  }

  // boss hazards + beams (telegraph)
  for(const h of hazards){
    const p = Math.min(1, h.t/h.delay);
    ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, Math.PI*2);
    ctx.fillStyle = "#ff3b3b"+Math.floor(28+p*70).toString(16).padStart(2,"0"); ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = "#ff3b3bcc"; ctx.stroke();
    ctx.beginPath(); ctx.arc(h.x, h.y, h.r*p, 0, Math.PI*2);
    ctx.fillStyle = h.color+"66"; ctx.fill();
  }
  for(const bm of beams){
    const p = Math.min(1, bm.t/bm.delay);
    ctx.save();
    ctx.lineCap = "round";
    ctx.strokeStyle = bm.dmg>0 ? "#ff3b3b"+Math.floor(50+p*150).toString(16).padStart(2,"0") : "#ff7a2a88";
    ctx.lineWidth = bm.dmg>0 ? Math.max(4, bm.width*(0.3+0.7*p)) : 4;
    ctx.beginPath(); ctx.moveTo(bm.x, bm.y);
    ctx.lineTo(bm.x+Math.cos(bm.ang)*bm.len, bm.y+Math.sin(bm.ang)*bm.len); ctx.stroke();
    ctx.restore();
  }

  // monsters
  for(const m of monsters){
    const alpha = m.dead ? Math.max(0, m.deathTimer/0.4) : 1;
    ctx.save();
    ctx.globalAlpha = alpha;
    // dash telegraph
    if(m.dashState===1){
      ctx.strokeStyle = "#ff3b3b88"; ctx.lineWidth = m.size*1.2; ctx.lineCap="round";
      ctx.beginPath(); ctx.moveTo(m.x,m.y); ctx.lineTo(m.x+m.dashDir.x*200, m.y+m.dashDir.y*200); ctx.stroke();
    }
    // boss aura
    if(m.boss && !m.dead){
      ctx.beginPath(); ctx.arc(m.x, m.y, m.size+8, 0, Math.PI*2);
      ctx.strokeStyle = "#ffd93d"; ctx.lineWidth = 3; ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.size, 0, Math.PI*2);
    ctx.fillStyle = m.flashTimer>0 ? "#ffffff" : (m.tpFlash>0 ? "#ffffffcc" : m.color+"cc");
    ctx.fill();
    ctx.lineWidth = m.armor>0 ? 4 : 2;
    ctx.strokeStyle = m.armor>0 ? "#cfd8e3" : "#00000055";
    ctx.stroke();
    ctx.font = Math.round(m.size*0.85)+"px system-ui"; ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillText(m.emoji, m.x, m.y+2);
    // boss shield
    if(m.bs && m.bs.shield>0 && !m.dead){
      ctx.beginPath(); ctx.arc(m.x, m.y, m.size+14, 0, Math.PI*2);
      ctx.strokeStyle = "#66d9ff"; ctx.lineWidth = 4; ctx.stroke();
      ctx.fillStyle = "#66d9ff33"; ctx.fill();
    }
    // fuse warning
    if(m.fuse>=0 && !m.dead){
      const blink = Math.floor(m.fuse*14)%2===0;
      ctx.beginPath(); ctx.arc(m.x, m.y, 84, 0, Math.PI*2);
      ctx.strokeStyle = blink ? "#ff3b3b" : "#ff3b3b55"; ctx.lineWidth = 3; ctx.stroke();
    }
    if(!m.dead){
      const by = m.y-m.size-14;
      if(m.boss || m.hpShow>0){
        const w = Math.max(30, m.size*1.5);
        ctx.globalAlpha = alpha*(m.boss ? 1 : Math.min(1, m.hpShow/0.6));
        drawHpBar(ctx, m.x-w/2, by, w, m.boss?6:4, m);
        ctx.globalAlpha = alpha;
      }
      if(m.boss){
        ctx.font = "bold 13px system-ui"; ctx.fillStyle = "#ffd93d";
        ctx.fillText("👑 "+m.name, m.x, by-10);
      }
      if(m.label){
        ctx.font = "bold 13px system-ui"; ctx.fillStyle = "#ffffff"; ctx.textAlign="center";
        ctx.strokeStyle = "#000000cc"; ctx.lineWidth = 3;
        ctx.strokeText(m.label, m.x, by-(m.boss?28:12)); ctx.fillText(m.label, m.x, by-(m.boss?28:12));
      }
    }
    ctx.restore();
  }

  // projectiles
  for(const pr of projectiles){
    ctx.beginPath(); ctx.arc(pr.x, pr.y, pr.r, 0, Math.PI*2);
    ctx.fillStyle = pr.color; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = "#ffffffaa"; ctx.stroke();
  }
  // explosions
  for(const ex of explosions){
    const p = 1 - ex.t/ex.max;
    ctx.beginPath(); ctx.arc(ex.x, ex.y, ex.r*(0.4+0.6*p), 0, Math.PI*2);
    ctx.fillStyle = "#ff8c3a"+Math.floor((1-p)*150).toString(16).padStart(2,"0");
    ctx.fill();
  }

  // player
  const flicker = player.invuln>0 && Math.floor(player.invuln*20)%2===0;
  ctx.save();
  if(flicker) ctx.globalAlpha = 0.5;
  drawRobot(ctx, player.x, player.y, 1, STATE.colors, player.facing);
  drawSword(ctx, player.x, player.y, 1, player.facing, player.attackAnim);
  ctx.restore();
  if(player.poisonT>0 || player.slowT>0){
    ctx.font = "16px system-ui"; ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillText((player.poisonT>0?"☠️":"")+(player.slowT>0?"🐌":""), player.x, player.y-52);
  }

  ctx.restore();

  // boss HP bar (screen space)
  let bossM = null;
  for(const m of monsters){
    if(m.boss && !m.dead && (m.provoked || Math.hypot(m.x-player.x, m.y-player.y) < m.aggro*1.3)){ bossM = m; break; }
  }
  if(bossM){
    const bw = Math.min(W-60, 300), bx = (W-bw)/2, by2 = 84;
    ctx.save(); ctx.globalAlpha = 0.92; drawHpBar(ctx, bx, by2, bw, 8, bossM); ctx.restore();
    const bt = "👑 "+bossM.name+"  "+Math.ceil(Math.max(0,bossM.hp))+"/"+bossM.maxHp;
    ctx.font = "bold 11px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "bottom";
    ctx.strokeStyle = "#000000bb"; ctx.lineWidth = 3; ctx.strokeText(bt, W/2, by2-3);
    ctx.fillStyle = "#ffe58a"; ctx.fillText(bt, W/2, by2-3);
  }
  // scan range hint circle (screen space, subtle)
}

// ===================== SPLASH / INIT =====================
function init(){
  loadState();
  resizeCanvas();
  // cover image
  const coverImg = document.getElementById("cover-img");
  coverImg.src = "icons/cover.png";
  showScreen("screen-cover");
  initAudioUI();

  // register SW
  if("serviceWorker" in navigator){
    navigator.serviceWorker.register("sw.js").catch(()=>{});
  }
}
// ---------- เสียงปุ่ม UI + ปุ่มเปิด/ปิดเสียง ----------
function initAudioUI(){
  if(!window.SFX) return;
  SFX.music("menu");
  const btns = document.querySelectorAll(".snd-btn");
  const refresh = ()=> btns.forEach(b=>{ b.textContent = SFX.icon(); b.title = SFX.label(); });
  refresh();
  SFX.onChange(refresh);
  btns.forEach(b=> b.addEventListener("click", ()=>{ SFX.toggle(); toast(SFX.label()); }));
  const BACK_IDS = ["btn-game-exit","btn-death-exit","howto-close-cover","fs-back"];
  document.addEventListener("click", e=>{
    const el = e.target.closest("button, .cc-swatch, .map-card, .ec-close");
    if(!el || el.classList.contains("snd-btn")) return;
    if(el.id==="btn-attack" || el.id==="btn-mine") return;   // สองปุ่มนี้มีเสียงของตัวเอง
    if(el.classList.contains("disabled")) sfx("error");
    else if(el.classList.contains("btn-back-menu") || BACK_IDS.includes(el.id)) sfx("back");
    else sfx("click");
  });
}

document.addEventListener("DOMContentLoaded", init);

})();
