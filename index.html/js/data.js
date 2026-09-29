// ===== Robot Elemental, My Name — Game Data =====

// Colors per element category (for periodic-table styled tiles)
const CATEGORY_COLORS = {
  "อโลหะ": "#3ddc97",
  "ก๊าซมีตระกูล": "#9b6bff",
  "โลหะแอลคาไล": "#ff6b6b",
  "โลหะแอลคาไลน์เอิร์ท": "#ffa552",
  "เมทัลลอยด์": "#5ad1c9",
  "แฮโลเจน": "#d4e157",
  "โลหะทรานซิชัน": "#4f9dff",
  "โลหะหลังทรานซิชัน": "#7c8cff",
  "แลนทาไนด์": "#ff8fd6",
  "แอกทิไนด์": "#ff5fa2",
  "ไม่ทราบคุณสมบัติ": "#8a93a6"
};

// Non-elemental crafting/sellable materials
const MATERIALS = {
  wood:        { id:"wood",        name:"ไม้",              icon:"🌳", value:2,  weight:30, hardness:1.0 },
  stoneRock:   { id:"stoneRock",   name:"หิน",              icon:"🪨", value:2,  weight:30, hardness:1.0 },
  scrapMetal:  { id:"scrapMetal",  name:"เศษโลหะ",          icon:"🔩", value:4,  weight:22, hardness:1.2 },
  petroleum:   { id:"petroleum",   name:"ปิโตรเลียม",       icon:"🛢️", value:10, weight:16, hardness:1.4 },
  gemstone:    { id:"gemstone",    name:"อัญมณี",           icon:"💎", value:35, weight:6,  hardness:1.8 },
  moonRock:    { id:"moonRock",    name:"หินดวงจันทร์",     icon:"🌑", value:6,  weight:24, hardness:1.2 },
  basalt:      { id:"basalt",      name:"หินบะซอลต์",       icon:"⬛", value:5,  weight:26, hardness:1.1 },
  anorthosite: { id:"anorthosite", name:"หินแอนอร์โทไซต์",  icon:"⬜", value:7,  weight:20, hardness:1.3 },
  coal:        { id:"coal",        name:"ถ่านหิน",          icon:"⚫", value:5,  weight:26, hardness:1.1 },
  marsSoil:    { id:"marsSoil",    name:"ดินดาวอังคาร",     icon:"🟥", value:4,  weight:28, hardness:1.0 },
};

// Maps configuration. featured = element symbols/materials that spawn more often here (theme).
const MAPS = [
  {
    id: "ground", name: "พื้นดิน", emoji: "🌱", bg: "#16321f", ground: "#1d4429",
    accent: "#7ed957",
    description: "แมพเริ่มต้นบนพื้นดิน มีต้นไม้ หิน แร่ทองแดง และเศษโลหะ",
    materials: ["wood", "stoneRock", "scrapMetal"],
    featuredElements: ["Cu", "Fe", "C", "O", "Al"],
  },
  {
    id: "ocean", name: "ใต้มหาสมุทร", emoji: "🌊", bg: "#062233", ground: "#0a3a52",
    accent: "#3fd0ff",
    description: "สำรวจใต้ทะเลลึก พบปิโตรเลียม อัญมณี และแร่ไทเทเนียม",
    materials: ["petroleum", "gemstone"],
    featuredElements: ["Ti", "Na", "Cl", "Mg", "I"],
  },
  {
    id: "moon", name: "ดวงจันทร์", emoji: "🌕", bg: "#1b1b24", ground: "#2b2b38",
    accent: "#d8d8e8",
    description: "พื้นผิวดวงจันทร์ มีหิน หินบะซอลต์ และหินแอนอร์โทไซต์",
    materials: ["moonRock", "basalt", "anorthosite"],
    featuredElements: ["Si", "Ca", "Al", "Ti", "O"],
  },
  {
    id: "mine", name: "เหมืองแร่", emoji: "⛏️", bg: "#221607", ground: "#3a260f",
    accent: "#ffcf5c",
    description: "เหมืองใต้ดิน อุดมด้วยถ่านหิน เหล็ก เงิน และทองคำ",
    materials: ["coal"],
    featuredElements: ["Fe", "Ag", "Au", "C", "S"],
  },
  {
    id: "mars", name: "ดาวอังคาร", emoji: "🔴", bg: "#2b0f07", ground: "#4a1c0d",
    accent: "#ff7a45",
    description: "ดาวอังคารสีแดง อุดมด้วยแร่เหล็กแดงและแร่เหล็ก",
    materials: ["marsSoil"],
    featuredElements: ["Fe", "O", "Mg", "Si"],
  },
  {
    id: "venus", name: "ดาวศุกร์", emoji: "🟡", bg: "#2a230a", ground: "#463a12",
    accent: "#ffd93d",
    description: "ดาวศุกร์ร้อนระอุ มีกำมะถัน หินบะซอลต์ แร่เหล็ก และซิลิคอน",
    materials: ["basalt"],
    featuredElements: ["S", "Si", "Fe", "He"],
  },
];

// ===== Monsters =====
// แต่ละแมพมีมอนสเตอร์หลายชนิด แต่ละชนิดมี เลือด/ดาเมจ/ความเร็ว/สกิล ต่างกัน
// abilities: dash(พุ่งชน) ranged(ยิงระยะไกล) explode(ระเบิดพลีชีพ) teleport(วาร์ป)
//            poison(พิษ) slow(ทำให้เชื่องช้า) regen(ฟื้นเลือด) split(แตกตัวตอนตาย)
// armor: ลดดาเมจที่ได้รับ (0.25 = ลด 25%)   count: จำนวนที่เกิดในแมพ [ต่ำสุด, สูงสุด]
// pack: เกิดเป็นฝูง (จำนวนตัวต่อฝูง)          boss: บอสประจำแมพ (เกิดครั้งละ 1 ตัว)
const MONSTER_TYPES = {
  ground: [
    { id:"slime",  name:"สไลม์ป่า",   emoji:"🟢", color:"#7ed957", hp:32, damage:6,  speed:1.5, reward:[3,8],   count:[3,4], abilities:["split"], desc:"แตกตัวเป็นสไลม์เล็กเมื่อตาย" },
    { id:"wolf",   name:"หมาป่า",     emoji:"🐺", color:"#b0b8c4", hp:26, damage:8,  speed:2.0, reward:[5,10],  count:[2,3], abilities:["dash"], desc:"พุ่งกัดอย่างรวดเร็ว" },
    { id:"bee",    name:"ผึ้งยักษ์",   emoji:"🐝", color:"#ffd93d", hp:12, damage:4,  speed:2.9, reward:[2,5],   count:[2,2], pack:3, size:17, abilities:["poison"], desc:"บินเป็นฝูง เหล็กในมีพิษ" },
    { id:"bear",   name:"หมีป่า",     emoji:"🐻", color:"#a1785a", hp:95, damage:14, speed:1.0, reward:[10,18], count:[1,2], size:32, armor:0.25, attackInterval:1.5, desc:"อึดและตัวใหญ่ ตีแรง" },
    { id:"shroom", name:"เห็ดพิษ",    emoji:"🍄", color:"#ff6b9a", hp:30, damage:5,  speed:0.8, reward:[6,11],  count:[2,3], aggro:270, abilities:["ranged","poison"], desc:"พ่นสปอร์พิษระยะไกล" },
    { id:"treant", name:"ราชาต้นไม้", emoji:"🌳", color:"#3fae49", hp:260, damage:15, speed:1.1, reward:[60,90], boss:true, size:44, armor:0.15, attackInterval:1.3, abilities:["dash"], title:"ราชาแห่งป่า", skills:["roots","summon","enrage"], loot:{ common:["wood","stoneRock","scrapMetal","Cu","Fe","C","O","Al"], rare:["Ag","Au","Ti"], qty:[6,12], rareQty:[2,4] }, desc:"บอสประจำป่า: รากไม้พันธนาการ / เรียกหมาป่า / บ้าคลั่งเมื่อเลือดต่ำ" },
  ],
  ocean: [
    { id:"fish",   name:"ปลาปีศาจ",   emoji:"🐡", color:"#3fd0ff", hp:28, damage:5,  speed:2.0, reward:[3,8],   count:[3,4], desc:"ว่ายเร็ว โจมตีต่อเนื่อง" },
    { id:"squid",  name:"ปลาหมึกพ่นหมึก", emoji:"🦑", color:"#b57bff", hp:40, damage:7,  speed:1.2, reward:[7,13],  count:[2,3], aggro:280, abilities:["ranged","slow"], desc:"พ่นหมึกทำให้ช้าลง" },
    { id:"eel",    name:"ปลาไหลไฟฟ้า", emoji:"⚡", color:"#ffe066", hp:30, damage:9,  speed:1.9, reward:[6,12],  count:[2,3], abilities:["teleport","slow"], desc:"วาร์ปเข้าประชิด ช็อตทำให้ชา" },
    { id:"shark",  name:"ฉลามดุ",      emoji:"🦈", color:"#6f9bb5", hp:70, damage:13, speed:1.6, reward:[12,20], count:[1,2], size:30, abilities:["dash"], desc:"พุ่งชนรุนแรง" },
    { id:"crab",   name:"ปูเกราะเหล็ก", emoji:"🦀", color:"#ff7a5c", hp:85, damage:10, speed:0.9, reward:[10,17], count:[2,2], size:28, armor:0.35, desc:"เปลือกแข็ง ลดดาเมจ 35%" },
    { id:"shrimp", name:"กุ้งระเบิด",  emoji:"🦐", color:"#ff9f7a", hp:16, damage:16, speed:2.4, reward:[5,9],   count:[2,3], size:19, abilities:["explode"], desc:"วิ่งเข้าชนแล้วระเบิด" },
    { id:"kraken", name:"ราชาคราเคน",  emoji:"🐙", color:"#8a5cff", hp:300, damage:16, speed:1.1, reward:[70,100], boss:true, size:46, abilities:["slow"], aggro:300, title:"จ้าวแห่งท้องทะเลลึก", skills:["nova","whirlpool","tentacle"], loot:{ common:["petroleum","Na","Cl","Mg","I","Ti","stoneRock"], rare:["gemstone","Pt","Au"], qty:[6,12], rareQty:[2,4] }, desc:"บอสทะเล: ปล่อยหมึกวงแหวน / น้ำวนดูด / หนวดฟาด" },
  ],
  moon: [
    { id:"lunarbot", name:"หุ่นจันทร์ร้าง", emoji:"👾", color:"#d8d8e8", hp:42, damage:8,  speed:1.3, reward:[4,10],  count:[3,4], desc:"หุ่นเฝ้าพื้นผิวดวงจันทร์" },
    { id:"alien",    name:"เอเลี่ยนจันทร์", emoji:"👽", color:"#7cf29a", hp:36, damage:9,  speed:1.6, reward:[8,14],  count:[2,3], abilities:["teleport"], desc:"วาร์ปหลอกตาแล้วโจมตี" },
    { id:"meteor",   name:"ก้อนอุกกาบาต",   emoji:"☄️", color:"#ff9f5c", hp:20, damage:18, speed:2.2, reward:[5,10],  count:[2,3], size:20, abilities:["explode"], desc:"ระเบิดเมื่อเข้าใกล้" },
    { id:"ufo",      name:"ยานลาดตระเวน",   emoji:"🛸", color:"#66d9ff", hp:40, damage:8,  speed:1.1, reward:[9,15],  count:[2,2], aggro:290, abilities:["ranged"], desc:"ยิงเลเซอร์จากระยะไกล" },
    { id:"moongolem",name:"หุ่นเกราะจันทร์", emoji:"🤖", color:"#9aa3b8", hp:105, damage:15, speed:0.9, reward:[13,22], count:[1,2], size:32, armor:0.3, attackInterval:1.6, desc:"เกราะหนา ตีหนัก" },
    { id:"guardian", name:"ผู้พิทักษ์จันทร์", emoji:"🌚", color:"#c9c9ff", hp:320, damage:17, speed:1.2, reward:[80,110], boss:true, size:46, abilities:["ranged"], aggro:300, title:"ผู้พิทักษ์แห่งดวงจันทร์", skills:["laser","meteors","shield"], loot:{ common:["moonRock","basalt","anorthosite","Si","Ca","Al","Ti","O"], rare:["He","Au","Pt"], qty:[6,12], rareQty:[2,4] }, desc:"บอสจันทร์: เลเซอร์กวาด / ฝนอุกกาบาต / โล่พลังงาน" },
  ],
  mine: [
    { id:"bat",    name:"ค้างคาวเหมือง", emoji:"🦇", color:"#ffcf5c", hp:20, damage:6,  speed:2.6, reward:[3,7],   count:[2,2], pack:3, size:18, desc:"บินเป็นฝูง เร็วมาก" },
    { id:"snake",  name:"งูหินแร่",      emoji:"🐍", color:"#7ed957", hp:34, damage:7,  speed:1.7, reward:[6,11],  count:[2,3], abilities:["poison"], desc:"เขี้ยวพิษ" },
    { id:"spider", name:"แมงมุมถ้ำ",     emoji:"🕷️", color:"#8a6b5a", hp:38, damage:8,  speed:1.8, reward:[7,13],  count:[2,3], abilities:["dash","slow"], desc:"พุ่งกระโจน ใยแมงมุมทำให้ช้า" },
    { id:"golem",  name:"โกเลมหิน",      emoji:"🗿", color:"#a39b8b", hp:115, damage:16, speed:0.8, reward:[14,24], count:[1,2], size:34, armor:0.4, attackInterval:1.7, desc:"อึดที่สุดในเหมือง ลดดาเมจ 40%" },
    { id:"tnt",    name:"หุ่นไดนาไมต์",  emoji:"🧨", color:"#ff5c5c", hp:14, damage:20, speed:2.3, reward:[5,10],  count:[2,3], size:19, abilities:["explode"], desc:"วิ่งเข้าหาแล้วระเบิด" },
    { id:"drake",  name:"มังกรถ่านหิน",  emoji:"🐉", color:"#ff8c3a", hp:340, damage:18, speed:1.2, reward:[85,120], boss:true, size:48, abilities:["dash"], aggro:300, title:"มังกรแห่งเหมืองลึก", skills:["cone","slam"], loot:{ common:["coal","Fe","C","S","Cu","scrapMetal"], rare:["Ag","Au","Pt","W"], qty:[6,12], rareQty:[2,4] }, desc:"บอสเหมือง: พ่นไฟเป็นพัด / กระโดดทุบพื้น / พุ่งชน" },
  ],
  mars: [
    { id:"rustbot",  name:"หุ่นสนิมแดง",   emoji:"👹", color:"#ff7a45", hp:46, damage:9,  speed:1.4, reward:[5,11],  count:[3,3], desc:"หุ่นเก่าสนิมเขรอะ" },
    { id:"scorpion", name:"แมงป่องแดง",    emoji:"🦂", color:"#e0553a", hp:44, damage:10, speed:1.7, reward:[8,14],  count:[2,3], abilities:["dash","poison"], desc:"พุ่งต่อยด้วยหางพิษ" },
    { id:"dust",     name:"พายุฝุ่นแดง",   emoji:"🌪️", color:"#d99a7a", hp:36, damage:8,  speed:1.9, reward:[8,14],  count:[2,3], abilities:["teleport","slow"], desc:"พัดวาร์ปไปมา ทำให้ช้า" },
    { id:"martian",  name:"ทหารดาวอังคาร", emoji:"🪐", color:"#c7683f", hp:125, damage:17, speed:0.9, reward:[15,25], count:[1,2], size:33, armor:0.3, attackInterval:1.6, desc:"เกราะหนัก ตีแรง" },
    { id:"fireball", name:"ลูกไฟอังคาร",   emoji:"🔥", color:"#ff9d3a", hp:24, damage:19, speed:2.3, reward:[6,11],  count:[2,3], size:19, abilities:["explode"], desc:"ระเบิดพลีชีพ" },
    { id:"rexbot",   name:"ไดโนสนิมแดง",   emoji:"🦖", color:"#b5452a", hp:380, damage:20, speed:1.3, reward:[95,130], boss:true, size:48, armor:0.2, abilities:["dash"], title:"จักรกลดึกดำบรรพ์", skills:["stomp","summon","berserk"], loot:{ common:["marsSoil","Fe","O","Mg","Si","Ni"], rare:["Ti","Au","Ir"], qty:[6,12], rareQty:[2,4] }, desc:"บอสอังคาร: กระทืบคลื่นกระแทก / เรียกหุ่นสนิม / คลั่งเมื่อเลือดต่ำ" },
  ],
  venus: [
    { id:"acid",   name:"ปีศาจไอกรด",   emoji:"👺", color:"#ffd93d", hp:52, damage:10, speed:1.6, reward:[6,12],  count:[3,3], aggro:250, abilities:["ranged","poison"], desc:"พ่นไอกรดพิษ" },
    { id:"lava",   name:"ก้อนลาวาระเบิด", emoji:"🌋", color:"#ff6a2a", hp:28, damage:22, speed:2.2, reward:[7,12],  count:[2,3], size:21, abilities:["explode"], desc:"ระเบิดรุนแรงมาก" },
    { id:"ghost",  name:"วิญญาณกำมะถัน", emoji:"👻", color:"#e8e29a", hp:44, damage:11, speed:1.5, reward:[9,15],  count:[2,3], abilities:["teleport","slow"], desc:"หายตัว วาร์ปประชิด" },
    { id:"lizard", name:"จิ้งจกกรด",     emoji:"🦎", color:"#9be34f", hp:56, damage:12, speed:1.9, reward:[9,16],  count:[2,3], abilities:["dash","poison"], desc:"พุ่งกระโจน กัดมีพิษ" },
    { id:"lavagiant",name:"ยักษ์ลาวา",    emoji:"👿", color:"#e0402a", hp:150, damage:19, speed:0.8, reward:[18,30], count:[1,2], size:36, armor:0.3, attackInterval:1.7, abilities:["regen"], desc:"ตัวใหญ่ ฟื้นเลือดได้" },
    { id:"demon",  name:"ราชาปีศาจศุกร์", emoji:"😈", color:"#a020c0", hp:450, damage:22, speed:1.3, reward:[110,150], boss:true, size:50, armor:0.2, abilities:["poison"], aggro:320, title:"จอมมารแห่งเปลวกรด", skills:["acidrain","lifesteal","phase"], loot:{ common:["basalt","S","Si","Fe","He","coal"], rare:["Au","Pt","Ir","gemstone"], qty:[6,12], rareQty:[2,4] }, desc:"บอสศุกร์: ฝนกรด / ลูกไฟดูดเลือด / วาร์ประเบิด" },
  ],
};

// Upgrade tree (crafting). cost scales with level.
const UPGRADES = {
  bag: {
    id:"bag", name:"กระเป๋าเก็บของ", icon:"🎒", maxLevel: 8,
    base: 50, capacityPerLevel: 15,
    matCost: (lvl)=> ({ scrapMetal: 3 + lvl*2 }),
    desc: (lvl)=> `เพิ่มความจุกระเป๋า +${15} ช่อง`
  },
  collector: {
    id:"collector", name:"เครื่องมือเก็บของ", icon:"🧲", maxLevel: 6,
    base: 60, powerPerLevel: 1,
    matCost: (lvl)=> ({ Cu: 2 + lvl, Fe: 1 + lvl }),
    desc: (lvl)=> `เก็บของเร็วขึ้น และมีโอกาสได้ของเพิ่ม`
  },
  explorer: {
    id:"explorer", name:"เครื่องมือสำรวจ", icon:"🧭", maxLevel: 6,
    base: 60, speedPerLevel: 0.5,
    matCost: (lvl)=> ({ Ti: 1 + lvl, scrapMetal: 2 + lvl }),
    desc: (lvl)=> `เคลื่อนที่เร็วขึ้น และขยายระยะสแกน`
  },
  head: {
    id:"head", name:"หัวหุ่นยนต์", icon:"🤖", maxLevel: 3,
    base: 80, scanBonusPerLevel: 20,
    matCost: (lvl)=> ({ Si: 2*lvl, Au: lvl }),
    desc: (lvl)=> `ขยายระยะสแกนหาแร่`
  },
  body: {
    id:"body", name:"ลำตัว", icon:"🦾", maxLevel: 3,
    base: 80, capacityBonusPerLevel: 10,
    matCost: (lvl)=> ({ Fe: 3*lvl, Al: 2*lvl }),
    desc: (lvl)=> `เพิ่มความจุกระเป๋าเพิ่มเติม`
  },
  armL: {
    id:"armL", name:"แขนซ้าย", icon:"💪", maxLevel: 3,
    base: 70, powerBonusPerLevel: 1,
    matCost: (lvl)=> ({ Cu: 2*lvl, Ni: lvl }),
    desc: (lvl)=> `เพิ่มพลังเก็บของ`
  },
  armR: {
    id:"armR", name:"แขนขวา", icon:"💪", maxLevel: 3,
    base: 70, powerBonusPerLevel: 1,
    matCost: (lvl)=> ({ Cu: 2*lvl, Ni: lvl }),
    desc: (lvl)=> `เพิ่มพลังเก็บของ`
  },
  legL: {
    id:"legL", name:"ขาซ้าย", icon:"🦿", maxLevel: 3,
    base: 70, speedBonusPerLevel: 0.3,
    matCost: (lvl)=> ({ Ti: lvl, scrapMetal: 2*lvl }),
    desc: (lvl)=> `เพิ่มความเร็วเคลื่อนที่`
  },
  legR: {
    id:"legR", name:"ขาขวา", icon:"🦿", maxLevel: 3,
    base: 70, speedBonusPerLevel: 0.3,
    matCost: (lvl)=> ({ Ti: lvl, scrapMetal: 2*lvl }),
    desc: (lvl)=> `เพิ่มความเร็วเคลื่อนที่`
  },
};

const BODY_PARTS = ["head","body","armL","armR","legL","legR"];
const DEFAULT_COLORS = {
  head: "#7ed957", body: "#3fd0ff", armL: "#ffd93d", armR: "#ffd93d",
  legL: "#ff7a45", legR: "#ff7a45"
};

// ===== ของตกแต่งประจำแมพ =====
// solid = สิ่งกีดขวาง [ชนิด, จำนวน, รัศมีต่ำสุด, สูงสุด] (ชนแล้วเดินทะลุไม่ได้ / ของและมอนสเตอร์จะไม่เกิดทับ)
// deco  = ของตกแต่งพื้น [ชนิด, จำนวน] (เดินผ่านได้)
const MAP_DECOR = {
  ground:{ solid:[["tree",20,28,38],["boulder",10,22,32],["pond",3,44,58]], deco:[["grass",120],["flower",55],["mushroom",16],["pebble",40]] },
  ocean: { solid:[["coral",16,26,36],["reef",10,28,42]], deco:[["kelp",50],["bubble",45],["shell",26],["pebble",30]] },
  moon:  { solid:[["mrock",14,24,36],["spire",7,22,30],["dish",4,30,36]], deco:[["crater",30],["pebble",60]] },
  mine:  { solid:[["pillar",14,24,34],["crate",10,22,28],["support",8,30,36]], deco:[["rail",9],["gem",34],["pebble",50]] },
  mars:  { solid:[["mesa",14,28,42],["crystal",10,26,34]], deco:[["crater",18],["crack",24],["dust",14],["pebble",50]] },
  venus: { solid:[["basalt",14,24,36],["lava",8,34,48]], deco:[["crack",34],["steam",20],["gem",14],["pebble",30]] },
};
