class UI{
constructor(net){this.net=net;this.state=null;this.me=null;this.tab='main'}
init(){
document.getElementById('btn-create').onclick=()=>this.doCreate();
document.getElementById('btn-join').onclick=()=>this.doJoin();
document.getElementById('btn-copy').onclick=()=>this.copyCode();
document.getElementById('btn-start').onclick=()=>this.net.startGame();
document.getElementById('btn-leave').onclick=()=>this.leaveRoom();
document.getElementById('btn-end-season').onclick=()=>this.net.endSeason();
document.getElementById('m-x').onclick=()=>this.closeModal();
document.getElementById('btn-restart').onclick=()=>this.leaveRoom();
document.getElementById('chk-ready').onchange=e=>this.net.setReady(e.target.checked);
document.getElementById('chk-host-play').onchange=e=>this.net.setHostPlay(e.target.checked);
document.querySelectorAll('.bnav').forEach(b=>b.onclick=()=>{
document.querySelectorAll('.bnav').forEach(x=>x.classList.remove('active'));
b.classList.add('active');
this.tab=b.dataset.tab;
this.renderGame();
});
this.net.on('wait',room=>this.renderWait(room));
this.net.on('state',(room,me)=>{
this.state=room;
this.me=me;
if(room&&room.started){
this.showScreen('scr-game');
}
this.renderGame();
});
this.net.on('joined',code=>{
document.getElementById('d-code').textContent=code;
this.showScreen('scr-wait');
});
this.net.on('tick',t=>{
const el=document.getElementById('tb-timer');
if(el)el.textContent=fmtT(t);
});
this.net.on('seasonEnd',()=>this.net.endSeason());
}

leaveRoom(){
this.net.leaveRoom();
this.state=null;
this.me=null;
this.showScreen('scr-lobby');
}

showScreen(id){
document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
const el=document.getElementById(id);
if(el)el.classList.add('active');
}

toast(msg,err){
const t=document.getElementById('toast');
if(!t)return;
t.textContent=msg;
t.className='toast'+(err?' te':'');
setTimeout(()=>t.className='toast hidden',2500);
}

openModal(title,body){
document.getElementById('m-title').textContent=title;
document.getElementById('m-body').innerHTML=body;
document.getElementById('modal').classList.remove('hidden');
}

closeModal(){
document.getElementById('modal').classList.add('hidden');
}

async _getRoleForJoin(code){
try{
const snap=await DB.ref('rooms/'+code).get();
if(snap.exists()){
const room=snap.val();
const players=room.players||{};
const shopCount=Object.values(players).filter(p=>p&&p.role===ROLE_S).length;
if(shopCount>=4)return ROLE_N;
return Math.random()<0.4?ROLE_S:ROLE_N;
}
}catch(e){}
return Math.random()<0.4?ROLE_S:ROLE_N;
}

async doCreate(){
const name=document.getElementById('inp-name').value.trim();
if(!name)return this.toast('Введи имя!',1);
const role=Math.random()<0.4?ROLE_S:ROLE_N;
this.toast('Создаём комнату...');
const r=await this.net.createRoom(name,role,true);
if(r&&r.err)return this.toast(r.err,1);
}

async doJoin(){
const code=document.getElementById('inp-code').value.trim();
const name=document.getElementById('inp-name').value.trim();
if(!code)return this.toast('Введи код!',1);
if(!name)return this.toast('Введи имя!',1);
this.toast('Заходим...');
const role=await this._getRoleForJoin(code);
const r=await this.net.joinRoom(code,name,role);
if(r&&r.err)return this.toast(r.err,1);
}

copyCode(){
const code=document.getElementById('d-code').textContent;
if(!code||code==='------')return;
navigator.clipboard?.writeText(code).then(()=>this.toast('Код скопирован!'));
}

renderWait(room){
if(!room)return;
const grid=document.getElementById('wait-players');
const entries=Object.entries(room.players||{});
const players=entries.map(([id,p])=>({id,...(p||{})}));

grid.innerHTML=players.map(p=>{
const name=(p.name||'Игрок');
const role=(p.role===ROLE_N?'🐕 Питомник':'🏪 Зоомагазин');
const ready=(p.ready?'✓':'○');
const host=(p.isHost?' 👑':'');
return `<div class="wp-item${p.ready?' ready':''}">
<span class="wp-status">${ready}</span>
<span class="wp-name">${name}${host}</span>
<span class="wp-role">${role}</span>
</div>`;
}).join('');

const rCount=players.filter(p=>p.ready).length;
document.getElementById('r-cnt').textContent=rCount;
document.getElementById('r-tot').textContent=players.length;

const me=room.players?.[this.net.myId];
const isHost=me&&me.isHost;
document.getElementById('btn-start').disabled=rCount<1||!isHost;

if(me){
document.getElementById('chk-ready').checked=!!me.ready;
document.getElementById('chk-host-play').checked=me.hostPlay!==false;
document.getElementById('chk-host-play').closest('.chk').style.display=isHost?'flex':'none';
}

const hc=document.getElementById('host-controls');
if(me&&me.isHost){
hc.classList.remove('hidden');
const list=document.getElementById('hc-list');
list.innerHTML=players.map(p=>{
const name=(p.name||'Игрок');
const isN=p.role===ROLE_N;
return `<div class="hc-row">
<span class="hc-name">${name}</span>
<button class="hc-rbtn${isN?' active':''}" onclick="UI._changeRole('${p.id}','${ROLE_N}')">🐕</button>
<button class="hc-rbtn${!isN?' active':''}" onclick="UI._changeRole('${p.id}','${ROLE_S}')">🏪</button>
</div>`;
}).join('');
}else{
hc.classList.add('hidden');
}
}

renderGame(){
if(!this.state||!this.me)return;
this.renderTopBar();
const area=document.getElementById('main-view');
if(this.tab==='main')this.renderDashboard(area);
else if(this.tab==='mydogs')this.renderMyDogs(area);
else if(this.tab==='city')this.renderCity(area);
else if(this.tab==='trade')this.renderTrade(area);
else if(this.tab==='breed')this.renderBreed(area);
else if(this.tab==='bank')this.renderBank(area);
this.renderPanels();
}

renderTopBar(){
const me=this.me;
if(!me)return;
const tbName=document.getElementById('tb-name');
if(tbName)tbName.textContent=me.name||'Игрок';
const tbRole=document.getElementById('tb-role');
if(tbRole)tbRole.textContent=me.role===ROLE_N?'Питомник':'Зоомагазин';
const tbAvatar=document.getElementById('tb-avatar');
if(tbAvatar)tbAvatar.textContent=me.role===ROLE_N?'🐕':'🏪';
const tbBal=document.getElementById('tb-balance');
if(tbBal)tbBal.textContent=me.balance||0;
const tbSeason=document.getElementById('tb-season');
if(tbSeason)tbSeason.textContent=this.state.season||1;
}

renderDashboard(el){
const me=this.me;
if(!me)return;
const dogCount=Object.keys(me.dogs||{}).length;
const houseCount=(me.houses||[]).length;
const vitCount=Object.keys(me.vitrine||{}).length;
el.innerHTML=`
<div class="dash">
<div class="dash-card"><div class="dc-icon">🪙</div><div class="dc-val">${me.balance||0}</div><div class="dc-lbl">Монеты</div></div>
<div class="dash-card"><div class="dc-icon">🐕</div><div class="dc-val">${dogCount}</div><div class="dc-lbl">Собаки</div></div>
<div class="dash-card"><div class="dc-icon">🏠</div><div class="dc-val">${houseCount}</div><div class="dc-lbl">Дома</div></div>
<div class="dash-card"><div class="dc-icon">📦</div><div class="dc-val">${vitCount}</div><div class="dc-lbl">Витрина</div></div>
<div class="dash-card"><div class="dc-icon">📈</div><div class="dc-val">${me.totalE||0}</div><div class="dc-lbl">Всего</div></div>
<div class="dash-card"><div class="dc-icon">🏆</div><div class="dc-val">${me.seasonE||0}</div><div class="dc-lbl">Сезон</div></div>
</div>
<div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap;justify-content:center">
${me.role===ROLE_N?'<button class="btn btn-green" onclick="UI._addHouse()">🏠 Дом (100🪙)</button>':''}
<button class="btn btn-blue" onclick="UI._buyDog()">🐕 Купить</button>
<button class="btn btn-orange" onclick="UI._sellDog()">🏚 Продать</button>
</div>`;
}

renderMyDogs(el){
const me=this.me;
if(!me)return;
const dogs=Object.entries(me.dogs||{});
const vit=Object.entries(me.vitrine||{});
let h='<div class="city-board"><div class="city-title">🐕 Мои собаки</div>';
if(!dogs.length)h+='<div style="text-align:center;color:#888;padding:16px">Пусто — купи щенка!</div>';
dogs.forEach(([k,d])=>{
h+=`<div class="dog-card"><span class="dog-emoji">${d.emoji||'🐕'}</span><div class="dog-info"><div class="dog-name">${d.name||'Собака'}</div><div class="dog-meta">${d.age==='puppy'?'Щенок':'Взрослая'}</div></div><span class="dog-price">${d.price||0}🪙</span></div>`;
});
h+='</div>';
if(vit.length){
h+='<div class="city-board" style="margin-top:10px"><div class="city-title">📦 Витрина</div>';
vit.forEach(([k,d])=>{
h+=`<div class="dog-card"><span>${d.emoji||'🐕'}</span><div class="dog-info"><div class="dog-name">${d.name||'Собака'}</div></div><span class="dog-price">${d.price||0}🪙</span><button class="btn btn-red btn-sm" onclick="UI._rmVit('${k}')">✕</button></div>`;
});
h+='</div>';
}
el.innerHTML=h;
}

renderCity(el){
const me=this.me;
if(!me)return;
const dem=this.state.demand||[];
let h='<div class="city-board"><div class="city-title">🏚 Спрос города</div>';
dem.forEach(d=>{
const b=BREED_MAP[d.breed];
h+=`<div class="demand-row"><span class="demand-emoji">${b?.icon||'🐕'}</span><div class="demand-info"><div class="demand-name">${b?.name||d.breed}</div><div class="demand-qty">Нужно: ${d.count||0}</div></div><span class="demand-price">${d.price||0}🪙</span></div>`;
});
h+='</div>';
const myDogs=Object.entries(me.dogs||{}).filter(([,d])=>{const dm=dem.find(x=>x.breed===d.breed);return dm&&dm.count>0});
if(myDogs.length){
h+='<div class="city-board" style="margin-top:10px"><div class="city-title">Продать</div>';
myDogs.forEach(([k,d])=>{
h+=`<div class="dog-card"><span>${d.emoji||'🐕'}</span><span>${d.name||'Собака'}</span><button class="btn btn-green btn-sm" onclick="UI._sellOne('${k}')">Продать</button></div>`;
});
h+='</div>';
}
el.innerHTML=h;
}

renderTrade(el){
const me=this.me;
if(!me)return;
const allPlayers=Object.entries(this.state.players||{}).filter(([k])=>k!==this.net.myId);
const myDogs=Object.entries(me.dogs||{});
let h='<div class="city-board"><div class="city-title">🤝 Торговля</div>';
h+='<div style="margin-bottom:10px;font-weight:600;font-size:.85rem">Отправить предложение:</div>';
if(!myDogs.length)h+='<div style="color:#888;padding:8px">Нет собак</div>';
myDogs.forEach(([k,d])=>{
const opts=allPlayers.map(([id,p])=>`<option value="${id}">${p.name||'Игрок'}</option>`).join('');
h+=`<div class="dog-card"><span>${d.emoji||'🐕'}</span><span>${d.name||'Собака'}</span><span>${d.price||0}🪙</span><select class="trade-sel" data-dog="${k}" style="padding:4px;border-radius:6px;border:1px solid #ddd;font-size:.75rem">${opts}</select><button class="btn btn-blue btn-sm" onclick="UI._sendTrade('${k}')">→</button></div>`;
});
const trades=Object.entries(this.state.trades||{});
const incoming=trades.filter(([k,t])=>t.status==='pending'&&t.to===this.net.myId);
if(incoming.length){
h+='<div style="margin-top:12px;font-weight:600;font-size:.85rem">Входящие:</div>';
incoming.forEach(([k,t])=>{
h+=`<div class="dog-card"><span>${t.dog?.emoji||'🐕'}</span><span>${t.fromName||''}</span><span>${t.price||0}🪙</span><button class="btn btn-green btn-sm" onclick="UI._respTrade('${k}',true)">✓</button><button class="btn btn-red btn-sm" onclick="UI._respTrade('${k}',false)">✕</button></div>`;
});
}
h+='</div>';
el.innerHTML=h;
}

renderBreed(el){
const me=this.me;
if(!me)return;
if(me.role!==ROLE_N){
el.innerHTML='<div class="city-board"><div class="city-title">💘 Разведение</div><div style="text-align:center;color:#888;padding:20px">Только для питомников!</div></div>';
return;
}
const houses=me.houses||[];
let h='<div class="city-board"><div class="city-title">💘 Разведение</div>';
if(!houses.length)h+='<div style="color:#888;padding:8px">Купите дом сначала</div>';
houses.forEach((house,i)=>{
const aCount=Object.keys(house.adults||{}).length;
const pCount=Object.keys(house.puppies||{}).length;
let wins='';
for(let j=0;j<HOUSE_ADULT_WIN;j++){
const a=Object.values(house.adults||{})[j];
wins+=`<div class="house-win${a?'':' empty'}">${a?a.emoji||'🐕':'🔲'}</div>`;
}
let pups='';
for(let j=0;j<HOUSE_PUPPY_WIN;j++){
const p=Object.values(house.puppies||{})[j];
pups+=`<span class="house-puppy">${p?p.emoji||'🐕':'·'}</span>`;
}
h+=`<div class="house"><div class="house-roof">Дом #${i+1}</div>
<div class="house-windows">${wins}</div>
<div class="house-puppies">${pups}</div>
<div class="house-actions">
<button class="btn btn-green btn-sm" onclick="UI._putDogHouse(${i},'adults')">Взрослые</button>
<button class="btn btn-green btn-sm" onclick="UI._putDogHouse(${i},'puppies')">Щенки</button>
<button class="btn btn-orange btn-sm" onclick="UI._breed(${i})" ${aCount<2?'disabled':''}>Развести</button>
</div></div>`;
});
h+='</div>';
const dogs=Object.entries(me.dogs||{});
if(dogs.length){
h+='<div class="city-board" style="margin-top:10px"><div class="city-title">Мои собаки</div>';
dogs.forEach(([k,d])=>{
h+=`<div class="dog-card"><span>${d.emoji||'🐕'}</span><span>${d.name||'Собака'}</span><span class="dog-meta">${d.age==='puppy'?'Щенок':'Взрослая'}</span><button class="btn btn-blue btn-sm" onclick="UI._quickPut('${k}')">В дом</button></div>`;
});
h+='</div>';
}
el.innerHTML=h;
}

renderBank(el){
const me=this.me;
if(!me)return;
const credits=me.credits||{};
let h='<div class="city-board"><div class="city-title">🏦 Банк</div>';
h+=`<div class="dash-card" style="margin-bottom:14px"><div class="dc-icon">🪙</div><div class="dc-val">${me.balance||0}</div><div class="dc-lbl">На руках</div></div>`;
h+='<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px"><button class="btn btn-green" onclick="UI._takeCredit(100)">Кредит 100→130</button><button class="btn btn-orange" onclick="UI._takeCredit(500)">Кредит 500→650</button></div>';
const activeCredits=Object.entries(credits).filter(([,c])=>c&&!c.paid);
if(activeCredits.length){
h+='<div style="font-weight:600;font-size:.85rem;margin-bottom:8px">Активные кредиты:</div>';
activeCredits.forEach(([k,c])=>{
h+=`<div class="dog-card"><span>💳</span><span>${c.amount}→${c.payback}</span><button class="btn btn-green btn-sm" onclick="UI._payCredit('${k}')">Вернуть</button></div>`;
});
}
h+='</div>';
el.innerHTML=h;
}

renderPanels(){
const left=document.getElementById('left-content');
const right=document.getElementById('right-content');
if(!left||!right)return;
const me=this.me;
if(!me)return;

if(me.role===ROLE_N){
const houses=me.houses||[];
let h='<div class="panel-title">🏠 Дома</div>';
if(!houses.length)h+='<div style="color:#888;font-size:.78rem;padding:8px">Нет домов</div>';
houses.forEach((house,i)=>{
const aCount=Object.keys(house.adults||{}).length;
const pCount=Object.keys(house.puppies||{}).length;
h+=`<div class="card" style="font-size:.78rem"><b>Дом #${i+1}</b><br>Взр: ${aCount}/${HOUSE_ADULT_WIN} · Щен: ${pCount}/${HOUSE_PUPPY_WIN}</div>`;
});
left.innerHTML=h;
}else{
const vit=Object.values(me.vitrine||{});
let h='<div class="panel-title">🏪 Витрина</div>';
if(!vit.length)h+='<div style="color:#888;font-size:.78rem;padding:8px">Пуста</div>';
vit.forEach(d=>{
h+=`<div class="card" style="font-size:.78rem;display:flex;align-items:center;gap:6px"><span>${d.emoji||'🐕'}</span><span>${d.name||''}</span><span style="margin-left:auto;font-weight:700;color:#2e7d32">${d.price||0}🪙</span></div>`;
});
left.innerHTML=h;
}

const players=Object.entries(this.state.players||{}).filter(([k])=>k!==this.net.myId);
let rh='<div class="panel-title">👥 Игроки</div>';
if(!players.length)rh+='<div style="color:#888;font-size:.78rem;padding:8px">Нет других</div>';
players.forEach(([id,p])=>{
rh+=`<div class="card" style="font-size:.78rem;display:flex;align-items:center;gap:6px"><span>${p.role===ROLE_N?'🐕':'🏪'}</span><span style="flex:1">${p.name||'Игрок'}</span><span style="font-weight:700">${p.balance||0}🪙</span></div>`;
});
right.innerHTML=rh;
}

static _changeRole(pid,role){
if(!window._ui?.state?.players)return;
const me=window._ui.state.players[window._ui.net.myId];
if(!me||!me.isHost)return window._ui.toast('Только хост!',1);
if(role===ROLE_S){
const sc=Object.values(window._ui.state.players).filter(p=>p&&p.role===ROLE_S).length;
const current=window._ui.state.players[pid];
if(sc>=4&&current&&current.role!==ROLE_S)return window._ui.toast('Макс 4 зоомагазина!',1);
}
window._ui.net.roomRef.child('players/'+pid+'/role').set(role);
}

static _addHouse(){
if(!window._ui)return;
window._ui.net.addHouse().then(r=>{
if(r?.ok)window._ui.toast('Дом куплен!');
else if(r?.err)window._ui.toast(r.err,1);
}).catch(e=>window._ui.toast('Ошибка',1));
}

static _buyDog(){
const breeds= BREEDS.map(b=>`<button class="btn btn-green" style="margin:4px" onclick="UI._doBuy('${b.id}','puppy')">${b.icon} ${b.name} (${Math.round(b.base*.5)}🪙)</button>`).join('');
const breedsA= BREEDS.map(b=>`<button class="btn btn-blue" style="margin:4px" onclick="UI._doBuy('${b.id}','adult')">${b.icon} ${b.name} (${b.base}🪙)</button>`).join('');
const html=`<div style="text-align:center"><div style="font-weight:700;margin-bottom:8px">Щенки</div>${breeds}<div style="font-weight:700;margin:12px 0 8px">Взрослые</div>${breedsA}</div>`;
window._ui.openModal('Купить собаку',html);
}

static _doBuy(breed,age){
window._ui.net.buyDog(breed,age).then(r=>{
window._ui.closeModal();
if(r?.ok)window._ui.toast('Куплено! '+(r.dog?.name||''));
else window._ui.toast(r?.err||'Ошибка',1);
}).catch(()=>window._ui.toast('Ошибка',1));
}

static _sellDog(){
if(!window._ui?.me)return;
const dogs=Object.entries(window._ui.me.dogs||{});
if(!dogs.length)return window._ui.toast('Нет собак!',1);
const list=dogs.map(([k,d])=>`<div class="dog-card"><span>${d.emoji||'🐕'}</span><span>${d.name||''}</span><button class="btn btn-green btn-sm" onclick="UI._doSell('${k}')">Продать</button></div>`).join('');
window._ui.openModal('Продать городу',list);
}

static _doSell(id){
window._ui.net.sellDogToCity(id).then(r=>{
window._ui.closeModal();
if(r?.ok)window._ui.toast('+'+r.price+'🪙');
else window._ui.toast(r?.err||'Нет спроса',1);
}).catch(()=>window._ui.toast('Ошибка',1));
}

static _sellOne(id){
window._ui.net.sellDogToCity(id).then(r=>{
if(r?.ok)window._ui.toast('+'+r.price+'🪙');
else window._ui.toast(r?.err||'Нет спроса',1);
}).catch(()=>window._ui.toast('Ошибка',1));
}

static _rmVit(id){
if(window._ui)window._ui.net.removeVitrine(id);
}

static _putDogHouse(houseIdx,slot){
if(!window._ui?.me)return;
const dogs=Object.entries(window._ui.me.dogs||{}).filter(([,d])=>d.age===(slot==='puppies'?'puppy':'adult'));
if(!dogs.length)return window._ui.toast('Нет '+(slot==='puppies'?'щенков':'взрослых')+'!',1);
const list=dogs.map(([k,d])=>`<div class="dog-card"><span>${d.emoji||'🐕'}</span><span>${d.name||''}</span><button class="btn btn-green btn-sm" onclick="UI._doPutHouse('${k}',${houseIdx},'${slot}')">✓</button></div>`).join('');
window._ui.openModal('Дом #'+(houseIdx+1),list);
}

static _doPutHouse(dogId,houseIdx,slot){
window._ui.net.putHouse(dogId,houseIdx,slot).then(r=>{
window._ui.closeModal();
if(r?.ok)window._ui.toast('Поселено!');
else window._ui.toast(r?.err||'Ошибка',1);
}).catch(()=>window._ui.toast('Ошибка',1));
}

static _quickPut(dogId){
if(!window._ui?.me)return;
const dog=window._ui.me.dogs?.[dogId];
if(!dog)return;
const houses=window._ui.me.houses||[];
if(!houses.length)return window._ui.toast('Нет домов!',1);
const slot=dog.age==='puppy'?'puppies':'adults';
const btns=houses.map((_,i)=>`<button class="btn btn-green" style="margin:4px" onclick="UI._doPutHouse('${dogId}',${i},'${slot}')">Дом #${i+1}</button>`).join('');
window._ui.openModal('Выбери дом',btns);
}

static _breed(houseIdx){
window._ui.net.breedDogs(houseIdx).then(r=>{
if(r?.ok)window._ui.toast('+'+r.count+' щенков!');
else window._ui.toast(r?.err||'Нужно 2+ взрослых',1);
}).catch(()=>window._ui.toast('Ошибка',1));
}

static _takeCredit(amount){
if(!window._ui?.net?.roomRef)return;
const payback=Math.round(amount*1.3);
const id='c'+Date.now().toString(36);
window._ui.net.roomRef.child('players/'+window._ui.net.myId+'/credits/'+id).set({amount,payback,paid:false});
const bal=(window._ui.me.balance||0)+amount;
window._ui.net.roomRef.child('players/'+window._ui.net.myId+'/balance').set(bal);
window._ui.toast('+'+amount+'🪙');
}

static _payCredit(id){
if(!window._ui?.me)return;
const c=window._ui.me.credits?.[id];
if(!c)return;
if((window._ui.me.balance||0)<c.payback)return window._ui.toast('Не хватает!',1);
window._ui.net.roomRef.child('players/'+window._ui.net.myId).update({balance:(window._ui.me.balance||0)-c.payback,['credits/'+id+'/paid']:true});
window._ui.toast('Кредит закрыт!');
}

static _sendTrade(dogId){
if(!window._ui?.me)return;
const sel=document.querySelector(`.trade-sel[data-dog="${dogId}"]`);
const toId=sel?.value;
if(!toId)return window._ui.toast('Выбери игрока!',1);
const dog=window._ui.me.dogs?.[dogId];
window._ui.net.sendTrade(toId,dogId,dog?.price).then(r=>{
if(r?.ok)window._ui.toast('Отправлено!');
else window._ui.toast(r?.err||'Ошибка',1);
}).catch(()=>window._ui.toast('Ошибка',1));
}

static _respTrade(tradeId,accept){
window._ui.net.respondTrade(tradeId,accept).then(r=>{
if(r?.ok)window._ui.toast(accept?'Сделка!':'Отклонено');
else window._ui.toast(r?.err||'Ошибка',1);
}).catch(()=>window._ui.toast('Ошибка',1));
}
}
