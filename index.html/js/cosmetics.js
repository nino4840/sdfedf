// ===== ของแต่งตัว (Cosmetics) + เควสความสำเร็จ =====
const SLOTS=[
 {id:"hat",name:"หมวก",icon:"🎩"},{id:"face",name:"หน้า/แว่น",icon:"🕶️"},{id:"antenna",name:"เสาอากาศ",icon:"📡"},
 {id:"chest",name:"ลำตัว",icon:"🛡️"},{id:"back",name:"ด้านหลัง",icon:"🪽"},{id:"arms",name:"แขน",icon:"💪"},
 {id:"boots",name:"ขา/รองเท้า",icon:"👢"},{id:"aura",name:"ออร่า",icon:"✨"},{id:"sword",name:"สกินดาบ",icon:"🗡️"}
];
// [slot, style, ชื่อ, สี, ราคา]
const _RAW=[
 ["hat","cap","หมวกแก๊ปแดง","#ff5d5d",60],["hat","cap","หมวกแก๊ปฟ้า","#3fa9ff",60],["hat","bunny","หูกระต่าย","#ffffff",120],
 ["hat","horns","เขาปีศาจ","#c0392b",180],["hat","mohawk","ทรงโมฮอว์ก","#ff3df2",150],["hat","helmet","หมวกกันน็อก","#9aa7b5",200],
 ["hat","tophat","หมวกทรงสูง","#2b303b",260],["hat","wizard","หมวกพ่อมด","#6c4bd6",340],["hat","halo","วงแหวนเทวดา","#ffe36b",500],["hat","crown","มงกุฎทอง","#ffd23f",1200],
 ["face","shades","แว่นกันแดด","#0b0b0b",70],["face","goggles","แว่นนักบิน","#ffb03b",140],["face","monocle","แว่นข้างเดียว","#d4af37",160],
 ["face","mustache","หนวดเท่","#3b2a1a",110],["face","mask","ผ้าปิดหน้า","#4b5563",130],["face","visor","ไวเซอร์แดง","#ff3355",220],
 ["face","heart","ตาหัวใจ","#ff4d8d",300],["face","visor","ไวเซอร์นีออน","#7cff6b",420],
 ["antenna","ball","เสาลูกบอล","#ff5d5d",50],["antenna","dual","เสาคู่","#3fd0ff",90],["antenna","bolt","เสาสายฟ้า","#ffe14d",160],
 ["antenna","flower","ดอกไม้","#ff8fd1",130],["antenna","dish","จานดาวเทียม","#cfd8e3",240],
 ["chest","glyph:★","ตราดาว","#ffd93d",60],["chest","glyph:♥","ตราหัวใจ","#ff5d8f",60],["chest","glyph:⚡","ตราสายฟ้า","#ffe14d",90],
 ["chest","glyph:☠","ตราหัวกะโหลก","#eeeeee",120],["chest","stripe","แถบสี","#ff7a45",80],["chest","belt","เข็มขัด","#8b5a2b",110],
 ["chest","scarf","ผ้าพันคอ","#e74c3c",150],["chest","plate","เกราะอก","#8fa3b8",260],["chest","reactor","เครื่องปฏิกรณ์","#4df3ff",520],
 ["back","cape","ผ้าคลุมแดง","#d62839",180],["back","cape","ผ้าคลุมม่วง","#7b2cbf",180],["back","pack","แบตเตอรี่สำรอง","#3fd0ff",150],
 ["back","tail","หางจิ้งจอก","#ff8c42",200],["back","shell","กระดองเต่า","#4c9f38",240],["back","jet","เจ็ตแพ็ก","#8892a0",380],
 ["back","wings","ปีกค้างคาว","#4a2a5a",420],["back","angel","ปีกนางฟ้า","#ffffff",700],
 ["arms","bracer","สายรัดแขน","#ff7a45",70],["arms","glove","ถุงมือขาว","#ffffff",120],["arms","pad","เกราะไหล่","#9aa7b5",160],
 ["arms","spike","เกราะหนาม","#c0392b",230],["arms","pad","เกราะไหล่ทอง","#ffd23f",600],
 ["boots","boot","รองเท้าบูท","#6b4423",70],["boots","stripe","ถุงเท้าลาย","#ff5d5d",90],["boots","sneaker","รองเท้าผ้าใบ","#ffffff",110],
 ["boots","spike","รองเท้าตะปู","#555b66",180],["boots","boot","บูทเงิน","#d0d8e0",300],["boots","rocket","รองเท้าจรวด","#ff7a45",420],
 ["aura","ring","วงแหวนฟ้า","#3fd0ff",150],["aura","ring","วงแหวนเขียว","#7cff6b",150],["aura","flame","เปลวไฟ","#ff6a1a",380],
 ["aura","ice","น้ำแข็ง","#9fe9ff",380],["aura","spark","ประกายดาว","#ffe36b",520],["aura","shadow","เงามืด","#7a3cff",650],["aura","rainbow","สายรุ้ง","#ff00ff",800],
 ["sword","skin","ดาบทอง","#ffd23f",250],["sword","skin","ดาบชมพู","#ff6fbf",300],["sword","skin","ดาบเพลิง","#ff5a1f",320],
 ["sword","skin","ดาบน้ำแข็ง","#7fe0ff",320],["sword","skin","ดาบนีออน","#7cff6b",400],["sword","skin","ดาบมืด","#7a3cff",480]
];
const _cnt={};
const COSMETICS=_RAW.map(r=>{_cnt[r[0]]=(_cnt[r[0]]||0)+1;
  return {id:r[0]+"_"+_cnt[r[0]],slot:r[0],style:r[1],name:r[2],color:r[3],price:r[4]};});
const COSMETIC_BY_ID={}; COSMETICS.forEach(c=>COSMETIC_BY_ID[c.id]=c);
function rarityOf(p){return p<100?["ทั่วไป","#9aa7b5"]:p<250?["พิเศษ","#5ad17a"]:p<500?["หายาก","#4f9dff"]:p<800?["มหากาพย์","#b46bff"]:["ตำนาน","#ffb020"];}

// ---- วาดของแต่งตัว (พิกัดเดียวกับ drawRobot) ----
const _P=(c,pts,f)=>{c.fillStyle=f;c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.closePath();c.fill();};
const _R=(c,x,y,w,h,f)=>{c.fillStyle=f;c.fillRect(x,y,w,h);};
const _E=(c,x,y,rx,ry,f,rot)=>{c.fillStyle=f;c.beginPath();c.ellipse(x,y,rx,ry,rot||0,0,7);c.fill();};
const _DK="rgba(0,0,0,0.28)";
const DRAW={
 aura(c,col,s){const t=Date.now()/250;
  if(s==="ring"){c.strokeStyle=col;c.lineWidth=3;c.beginPath();c.ellipse(0,46,32,10,0,0,7);c.stroke();_E(c,0,46,30,8,col+"33");}
  else if(s==="flame"){for(let i=-3;i<=3;i++)_P(c,[[i*9-5,46],[i*9+5,46],[i*9,22-(Math.abs(i)%2)*10-Math.sin(t+i)*4]],i%2?col:"#ffd23f");}
  else if(s==="ice"){for(let i=-3;i<=3;i++)_P(c,[[i*9-4,46],[i*9+4,46],[i*9,26-(i%2?8:0)]],i%2?col:"#ffffff");}
  else if(s==="spark"){c.fillStyle=col;c.font="13px sans-serif";c.textAlign="center";for(let i=0;i<6;i++){const a=t/3+i*1.05;c.fillText("✦",Math.cos(a)*34,Math.sin(a)*40+4);}}
  else if(s==="shadow"){_E(c,0,46,36,11,col+"66");_E(c,0,40,28,30,col+"22");}
  else if(s==="rainbow"){["#ff3b3b","#ffa53b","#ffe93b","#4cd964","#3fa9ff","#a04bff"].forEach((k,i)=>{c.strokeStyle=k;c.lineWidth=2.5;c.beginPath();c.ellipse(0,46,40-i*3.5,13-i,0,0,7);c.stroke();});}
 },
 back(c,col,s){
  if(s==="cape"){_P(c,[[-16,-20],[16,-20],[27,42],[-27,42]],col);_P(c,[[-4,-20],[4,-20],[8,42],[-8,42]],_DK);}
  else if(s==="pack"){_R(c,-13,-14,26,30,col);_R(c,-13,-14,26,5,"#fff5");}
  else if(s==="jet"){_R(c,-14,-16,28,32,col);_R(c,-10,-12,8,24,"#5a6472");_R(c,2,-12,8,24,"#5a6472");_P(c,[[-9,16],[-3,16],[-6,30+Math.sin(Date.now()/60)*3]],"#ff9a1f");_P(c,[[3,16],[9,16],[6,30+Math.cos(Date.now()/60)*3]],"#ff9a1f");}
  else if(s==="wings"){_E(c,-28,-8,10,24,col,-.5);_E(c,28,-8,10,24,col,.5);_E(c,-32,-2,5,14,_DK,-.5);_E(c,32,-2,5,14,_DK,.5);}
  else if(s==="angel"){c.shadowColor="#fff";c.shadowBlur=8;_E(c,-30,-12,10,28,col,-.6);_E(c,30,-12,10,28,col,.6);_E(c,-26,0,7,16,"#dfe9ff",-.4);_E(c,26,0,7,16,"#dfe9ff",.4);}
  else if(s==="shell"){_E(c,0,-2,25,24,col);c.strokeStyle=_DK;c.lineWidth=2;c.beginPath();c.moveTo(-14,-14);c.lineTo(14,14);c.moveTo(14,-14);c.lineTo(-14,14);c.stroke();}
  else if(s==="tail"){_E(c,26,24,16,7,col,-.6);_E(c,34,16,6,4,"#fff",-.6);}
 },
 boots(c,col,s){[-11.5,11.5].forEach(x=>{
  if(s==="boot"){_R(c,x-8,32,16,12,col);_R(c,x-8,32,16,3,_DK);}
  else if(s==="sneaker"){_R(c,x-8,36,16,8,col);_R(c,x-8,41,16,3,"#3fd0ff");}
  else if(s==="stripe"){_R(c,x-6.5,22,13,4,col);_R(c,x-6.5,30,13,4,col);_R(c,x-6.5,38,13,4,col);}
  else if(s==="spike"){_R(c,x-8,36,16,8,col);[-5,0,5].forEach(k=>_P(c,[[x+k-2,36],[x+k+2,36],[x+k,31]],"#d9dde3"));}
  else if(s==="rocket"){_R(c,x-8,34,16,10,col);_P(c,[[x-5,44],[x+5,44],[x,54+Math.sin(Date.now()/60)*3]],"#ffd23f");}});
 },
 chest(c,col,s){
  if(s.startsWith("glyph:")){c.fillStyle=col;c.font="bold 18px sans-serif";c.textAlign="center";c.fillText(s.slice(6),0,12);}
  else if(s==="stripe"){_R(c,-20,-4,40,7,col);}
  else if(s==="belt"){_R(c,-20,8,40,6,col);_R(c,-4,7,8,8,"#ffd23f");}
  else if(s==="scarf"){_R(c,-16,-24,32,7,col);_R(c,6,-18,7,20,col);}
  else if(s==="plate"){_R(c,-17,-16,34,22,col);_R(c,-17,-16,34,4,"#fff5");}
  else if(s==="reactor"){_E(c,0,-2,9,9,"#0b1220");_E(c,0,-2,6,6,col);_E(c,0,-2,2.5,2.5,"#fff");}
 },
 arms(c,col,s){[-1,1].forEach(d=>{const x=d*26;
  if(s==="bracer"){_R(c,x-7,4,14,8,col);}
  else if(s==="glove"){_E(c,x,16,8,7,col);}
  else if(s==="pad"){_E(c,x,-14,10,8,col);_E(c,x,-16,6,3,"#fff4");}
  else if(s==="spike"){_E(c,x,-13,9,7,col);[-6,0,6].forEach(k=>_P(c,[[x+k-2.5,-16],[x+k+2.5,-16],[x+k,-24]],"#e5e7eb"));}});
 },
 face(c,col,s){
  if(s==="shades"){_R(c,-13,-40,26,11,col);_R(c,-10,-38,6,2,"#fff6");}
  else if(s==="goggles"){c.strokeStyle=col;c.lineWidth=3;[-6,6].forEach(x=>{c.beginPath();c.arc(x,-34,6,0,7);c.stroke();});_R(c,-1,-35,2,2,col);_E(c,-6,-34,4,4,"#7ef7ff88");_E(c,6,-34,4,4,"#7ef7ff88");}
  else if(s==="monocle"){c.strokeStyle=col;c.lineWidth=2;c.beginPath();c.arc(5,-34,7,0,7);c.stroke();c.beginPath();c.moveTo(9,-28);c.lineTo(12,-14);c.stroke();}
  else if(s==="mustache"){_E(c,-5,-25,6,3,col,.3);_E(c,5,-25,6,3,col,-.3);}
  else if(s==="mask"){_R(c,-15,-30,30,10,col);_R(c,-15,-30,30,2,_DK);}
  else if(s==="visor"){c.shadowColor=col;c.shadowBlur=8;_R(c,-11,-40,22,11,"#0b1220");_R(c,-9,-37,18,5,col);}
  else if(s==="heart"){c.fillStyle=col;c.font="bold 12px sans-serif";c.textAlign="center";c.fillText("♥",-5,-30);c.fillText("♥",5,-30);}
 },
 antenna(c,col,s){c.strokeStyle="#8892a0";c.lineWidth=2;
  if(s==="ball"){c.beginPath();c.moveTo(0,-46);c.lineTo(0,-58);c.stroke();_E(c,0,-60,4,4,col);}
  else if(s==="dual"){[-6,6].forEach(x=>{c.beginPath();c.moveTo(x,-46);c.lineTo(x*1.6,-58);c.stroke();_E(c,x*1.6,-60,3.5,3.5,col);});}
  else if(s==="bolt"){_P(c,[[2,-46],[-4,-56],[0,-56],[-3,-66],[5,-54],[1,-54]],col);}
  else if(s==="flower"){c.beginPath();c.moveTo(0,-46);c.lineTo(0,-56);c.stroke();for(let i=0;i<5;i++){const a=i*1.257;_E(c,Math.cos(a)*5,-60+Math.sin(a)*5,3.2,3.2,col);}_E(c,0,-60,2.5,2.5,"#ffd93d");}
  else if(s==="dish"){c.beginPath();c.moveTo(0,-46);c.lineTo(0,-54);c.stroke();c.fillStyle=col;c.beginPath();c.ellipse(0,-58,10,5,-.3,0,7);c.fill();_E(c,0,-58,2,2,"#f55");}
 },
 hat(c,col,s){
  if(s==="cap"){_R(c,-16,-52,32,10,col);_R(c,6,-46,16,4,col);}
  else if(s==="bunny"){_E(c,-8,-60,4.5,13,col);_E(c,8,-60,4.5,13,col);_E(c,-8,-60,2,9,"#ffb3c9");_E(c,8,-60,2,9,"#ffb3c9");}
  else if(s==="horns"){_P(c,[[-14,-44],[-20,-62],[-7,-46]],col);_P(c,[[14,-44],[20,-62],[7,-46]],col);}
  else if(s==="mohawk"){for(let i=-3;i<=3;i++)_P(c,[[i*4-2.5,-46],[i*4+2.5,-46],[i*4,-58-(3-Math.abs(i))*2]],col);}
  else if(s==="helmet"){c.fillStyle=col;c.beginPath();c.arc(0,-43,17,Math.PI,0);c.fill();_R(c,-2,-60,4,17,"#fff5");}
  else if(s==="tophat"){_R(c,-17,-47,34,4,col);_R(c,-11,-66,22,20,col);_R(c,-11,-52,22,4,"#c0392b");}
  else if(s==="wizard"){_P(c,[[-16,-45],[0,-78],[16,-45]],col);_R(c,-20,-47,40,4,col);c.fillStyle="#ffe36b";c.font="10px sans-serif";c.textAlign="center";c.fillText("★",0,-54);}
  else if(s==="halo"){c.shadowColor=col;c.shadowBlur=8;c.strokeStyle=col;c.lineWidth=3;c.beginPath();c.ellipse(0,-57,13,4,0,0,7);c.stroke();}
  else if(s==="crown"){_P(c,[[-14,-45],[-14,-60],[-7,-52],[0,-62],[7,-52],[14,-60],[14,-45]],col);_E(c,0,-50,2.5,2.5,"#e74c3c");}
 }
};
function drawCosmetics(c,eq,layer){
 if(!eq) return;
 const run=s=>{const it=eq[s]&&COSMETIC_BY_ID[eq[s]];if(it&&DRAW[s]){c.save();DRAW[s](c,it.color,it.style);c.restore();}};
 if(layer==="pre"){run("aura");run("back");}
 else{["boots","chest","arms","face","antenna","hat"].forEach(run);}
}

// ---- เควสความสำเร็จ ----
// s = ตัวนับ, goal = เป้าหมาย, reward ตามความยาก (★1-5)
const _Q=[];
function _mk(cat,s,icon,label,goals,rewards,diffs){goals.forEach((g,i)=>_Q.push({id:s+"_"+g,cat,s,icon,goal:g,reward:rewards[i],diff:diffs[i],name:label(g)}));}
_mk("ต่อสู้","kills","⚔️",g=>`นักล่ามอนสเตอร์ ${g} ตัว`,[1,10,25,50,100,250,500,1000],[15,60,150,320,700,1800,4000,9000],[1,1,2,2,3,4,5,5]);
_mk("ต่อสู้","bosses","👑",g=>`ผู้พิชิตบอส ${g} ตัว`,[1,3,5,10,25,50],[120,400,800,2000,6000,15000],[2,3,3,4,5,5]);
_mk("สำรวจ","mined","⛏️",g=>`นักเก็บของ ${g} ชิ้น`,[10,30,75,150,300,600,1200],[20,60,150,350,800,2000,5000],[1,1,2,3,3,4,5]);
_mk("สำรวจ","elem","🧪",g=>`นักสะสมธาตุ ${g} ชนิด`,[3,8,15,25,40,60,80],[30,100,250,600,1500,3500,8000],[1,1,2,3,4,5,5]);
_mk("สำรวจ","maps","🗺️",g=>`นักเดินทาง ไปครบ ${g} แมพ`,[2,3,4,6],[50,200,600,2500],[1,2,3,5]);
_mk("การค้า","sold","💱",g=>`พ่อค้า ขายของ ${g} ชิ้น`,[20,60,150,400,1000],[30,100,300,900,2800],[1,2,2,3,4]);
_mk("การค้า","earned","💰",g=>`ยอดขายรวม ${g} เหรียญ`,[200,1000,3000,10000,30000],[40,150,450,1500,5000],[1,2,3,4,5]);
_mk("การค้า","peak","🏦",g=>`เศรษฐี มีเงินถึง ${g}`,[500,2000,8000,25000],[50,200,800,3000],[1,2,3,5]);
_mk("อัพเกรด","upg","🔧",g=>`ช่างประกอบ อัพเกรดรวม ${g} เลเวล`,[1,3,6,10,18,30,45],[25,80,200,450,1100,3000,7000],[1,1,2,3,4,5,5]);
_mk("แต่งตัว","owned","🛍️",g=>`แฟชั่นนิสต้า ซื้อของแต่งตัว ${g} ชิ้น`,[1,3,6,10,20,35,55],[20,70,180,400,1000,2600,6000],[1,1,2,2,3,4,5]);
_mk("แต่งตัว","slots","🎽",g=>`แต่งครบ ${g} ช่อง`,[1,3,5,7,9],[25,90,250,700,2000],[1,2,3,4,5]);
_mk("ท้าทาย","deaths","💀",g=>`ล้มแล้วลุก แพ้ ${g} ครั้ง`,[1,10,30],[10,80,300],[1,2,3]);
const QUESTS=_Q;
