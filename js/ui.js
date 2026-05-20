class UI{
constructor(net){this.net=net;this.state=null;this.me=null;this.tab='main'}
init(){
document.getElementById('btn-create').onclick=()=>this.doCreate();
document.getElementById('btn-join').onclick=()=>this.doJoin();
document.getElementById('btn-copy').onclick=()=>this.copyCode();
document.getElementById('btn-start').onclick=()=>this.net.startGame();
document.getElementById('btn-leave').onclick=()=>{this.net.leaveRoom();this.showScreen('scr-lobby')};
document.getElementById('btn-end-season').onclick=()=>this.net.endSeason();
document.getElementById('m-x').onclick=()=>this.closeModal();
document.getElementById('btn-restart').onclick=()=>this.showScreen('scr-lobby');
document.getElementById('chk-ready').onchange=e=>this.net.setReady(e.target.checked);
document.getElementById('chk-host-play').onchange=e=>this.net.setHostPlay(e.target.checked);
document.querySelectorAll('.bnav').forEach(b=>b.onclick=()=>{document.querySelectorAll('.bnav').forEach(x=>x.classList.remove('active'));b.classList.add('active');this.tab=b.dataset.tab;this.renderGame()});
this.net.on('wait',room=>this.renderWait(room));
this.net.on('state',(room,me)=>{this.state=room;this.me=me;this.renderGame()});
this.net.on('joined',code=>{document.getElementById('d-code').textContent=code;this.showScreen('scr-wait')});
this.net.on('tick',t=>{document.getElementById('tb-timer').textContent=fmtT(t)});
this.net.on('seasonEnd',()=>this.net.endSeason());
}
showScreen(id){document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));document.getElementById(id).classList.add('active')}
toast(msg,err){const t=document.getElementById('toast');t.textContent=msg;t.className='toast'+(err?' te':'');setTimeout(()=>t.className='toast hidden',2500)}
openModal(title,body){document.getElementById('m-title').textContent=title;document.getElementById('m-body').innerHTML=body;document.getElementById('modal').classList.remove('hidden')}
closeModal(){document.getElementById('modal').classList.add('hidden')}

_pickRole(){
const room=this.state;
const players=room?.players||{};
const shopCount=Object.values(players).filter(p=>p.role===ROLE_S).length;
if(shopCount>=4)return ROLE_N;
return Math.random()<0.4?ROLE_S:ROLE_N;
}

async doCreate(){
const name=document.getElementById('inp-name').value.trim();
if(!name)return this.toast('Введи имя!',1);
const role=this._pickRole();
this.toast('Создаём комнату...');
await this.net.createRoom(name,role,true);
}
async doJoin(){
const code=document.getElementById('inp-code').value.trim().toUpperCase();
const name=document.getElementById('inp-name').value.trim();
if(!code)return this.toast('Введи код!',1);
if(!name)return this.toast('Введи имя!',1);
const role=this._pickRole();
this.toast('Заходим...');
await this.net.joinRoom(code,name,role);
}
copyCode(){
const code=document.getElementById('d-code').textContent;
navigator.clipboard?.writeText(code).then(()=>this.toast('Код скопирован!'));
}

renderWait(room){
const grid=document.getElementById('wait-players');
const players=Object.entries(room.players||{});
const shopCount=players.filter(([,p])=>p.role===ROLE_S).length;
const info=document.getElementById('role-info');
if(info)info.textContent='Зоомагазинов: '+shopCount+'/4';
grid.innerHTML=players.map(([id,p])=>`<div class="wp${p.ready?' wr':''}">${p.ready?'✅':'⏳'} ${p.name} (${p.role===ROLE_N?'🐕 Питомник':'🏪 Зоомагазин'})${p.isHost?' 👑':''}</div>`).join('');
const rCount=players.filter(([,p])=>p.ready).length;
document.getElementById('r-cnt').textContent=rCount;
document.getElementById('r-tot').textContent=players.length;
document.getElementById('btn-start').disabled=rCount<1||!room.players?.[this.net.myId]?.isHost;
const me=room.players?.[this.net.myId];
if(me){
document.getElementById('chk-ready').checked=me.ready;
document.getElementById('chk-host-play').checked=me.hostPlay!==false;
document.getElementById('chk-host-play').closest('.chk').style.display=me.isHost?'flex':'none';
}
const hc=document.getElementById('host-controls');
if(me?.isHost){
hc.classList.remove('hidden');
const list=document.getElementById('hc-list');
list.innerHTML=players.map(([id,p])=>`<div class="hc-row"><span class="hc-name">${p.name}</span><button class="hc-rbtn${p.role===ROLE_N?' active':''}" onclick="UI._changeRole('${id}','${ROLE_N}')">🐕</button><button class="hc-rbtn${p.role===ROLE_S?' active':''}" onclick="UI._changeRole('${id}','${ROLE_S}')">🏪</button></div>`).join('');
}else{
hc.classList.add('hidden');
}
if(room.started)this.showScreen('scr-game');
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
document.getElementById('tb-name').textContent=this.me.name;
document.getElementById('tb-role').textContent=this.me.role===ROLE_N?'🐕 Питомник':'🏪 Зоомагазин';
document.getElementById('tb-avatar').textContent=this.me.role===ROLE_N?'🐕':'🏪';
document.getElementById('tb-balance').textContent=this.me.balance;
document.getElementById('tb-season').textContent=this.state.season;
document.getElementById('tb-max').textContent='/'+MAX_SEASONS;
}

renderDashboard(el){
const dogCount=Object.keys(this.me.dogs||{}).length;
const houseCount=(this.me.houses||[]).length;
const vitCount=Object.keys(this.me.vitrine||{}).length;
el.innerHTML=`
<div class="dash">
<div class="dash-card"><div class="dc-icon">🪙</div><div class="dc-val">${this.me.balance}</div><div class="dc-lbl">Монеты</div></div>
<div class="dash-card"><div class="dc-icon">🐕</div><div class="dc-val">${dogCount}</div><div class="dc-lbl">Собаки</div></div>
<div class="dash-card"><div class="dc-icon">🏠</div><div class="dc-val">${houseCount}</div><div class="dc-lbl">Дома</div></div>
<div class="dash-card"><div class="dc-icon">📦</div><div class="dc-val">${vitCount}</div><div class="dc-lbl">Витрина</div></div>
<div class="dash-card"><div class="dc-icon">📈</div><div class="dc-val">${this.me.totalE}</div><div class="dc-lbl">Всего заработано</div></div>
<div class="dash-card"><div class="dc-icon">🏆</div><div class="dc-val">${this.me.seasonE}</div><div class="dc-lbl">За сезон</div></div>
</div>
<div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;justify-content:center">
${this.me.role===ROLE_N?`<button class="btn btn-green" onclick="UI._addHouse()">🏠 Купить дом (100)</button>`:''}
<button class="btn btn-blue" onclick="UI._buyDog()">🐕 Купить щенка</button>
<button class="btn btn-orange" onclick="UI._sellDog()">🏚 Продать городу</button>
</div>`;
}

renderMyDogs(el){
const dogs=Object.values(this.me.dogs||{});
const vit=Object.entries(this.me.vitrine||{});
let h='<div class="city-board"><div class="city-title">🐕 Мои собаки</div>';
if(!dogs.length)h+='<div style="text-align:center;color:#888;padding:16px">Пусто — купи щенка!</div>';
dogs.forEach(d=>{
h+=`<div class="dog-card"><span class="dog-emoji">${d.emoji}</span><div class="dog-info"><div class="dog-name">${d.name}</div><div class="dog-meta">${d.age==='puppy'?'Щенок':'Взрослая'} · Ур.${d.level}</div></div><span class="dog-price">${d.price}🪙</span></div>`;
});
h+='</div>';
if(vit.length){
h+='<div class="vitrine" style="margin-top:12px"><div class="vitrine-title">📦 На витрине</div>';
vit.forEach(([k,d])=>{h+=`<div class="vitrine-row"><span>${d.emoji}</span><span>${d.name}</span><span>${d.price}🪙</span><button class="btn btn-sm btn-red" onclick="UI._rmVit('${k}')">Убрать</button></div>`});
h+='</div>';
}
el.innerHTML=h;
}

renderCity(el){
const dem=this.state.demand||[];
let h='<div class="city-board"><div class="city-title">🏚 Спрос города</div>';
dem.forEach(d=>{
const b=BREED_MAP[d.breed];
h+=`<div class="demand-row"><span class="demand-emoji">${b?.icon||'🐕'}</span><div class="demand-info"><div class="demand-name">${b?.name||d.breed}</div><div class="demand-qty">Нужно: ${d.count}</div></div><span class="demand-price">${d.price}🪙</span></div>`;
});
h+='</div>';
const myDogs=Object.entries(this.me.dogs||{}).filter(([,d])=>{const dm=dem.find(x=>x.breed===d.breed);return dm&&dm.count>0});
if(myDogs.length){
h+='<div style="margin-top:12px"><b style="color:#2d5016">Продать городу:</b>';
myDogs.forEach(([k,d])=>{h+=`<div class="dog-card"><span>${d.emoji}</span><span>${d.name}</span><button class="btn btn-green btn-sm" onclick="UI._sellOne('${k}')">Продать</button></div>`});
h+='</div>';
}
el.innerHTML=h;
}

renderTrade(el){
const allPlayers=Object.entries(this.state.players||{}).filter(([k])=>k!==this.net.myId);
const myDogs=Object.entries(this.me.dogs||{});
let h='<div class="city-board"><div class="city-title">🤝 Торговля</div>';
h+='<div style="margin-bottom:8px"><b>Отправить предложение:</b>';
if(!myDogs.length)h+='<div style="color:#888;padding:8px">Нет собак</div>';
myDogs.forEach(([k,d])=>{
h+=`<div class="dog-card"><span>${d.emoji}</span><span>${d.name} (${d.price}🪙)</span><select id="sel-${k}" style="padding:4px;border-radius:4px">${allPlayers.map(([id,p])=>`<option value="${id}">${p.name}</option>`).join('')}</select><button class="btn btn-blue btn-sm" onclick="UI._sendTrade('${k}')">Отправить</button></div>`;
});
h+='</div>';
const trades=Object.entries(this.state.trades||{});
if(trades.length){
h+='<div style="margin-top:8px"><b>Входящие:</b>';
trades.forEach(([k,t])=>{
if(t.to!==this.net.myId&&t.status==='pending')return;
if(t.to&&t.to!==this.net.myId)return;
h+=`<div class="deal-item">${t.fromName} → ${t.dog.name} (${t.price}🪙) [${t.status}]`;
if(t.to===this.net.myId&&t.status==='pending')h+=` <button class="btn btn-green btn-sm" onclick="UI._respTrade('${k}',true)">✅</button> <button class="btn btn-red btn-sm" onclick="UI._respTrade('${k}',false)">❌</button>`;
h+='</div>';
});
h+='</div>';
}
h+='</div>';
el.innerHTML=h;
}

renderBreed(el){
if(this.me.role!==ROLE_N){el.innerHTML='<div class="city-board"><div class="city-title">💘 Разведение</div><div style="text-align:center;color:#888;padding:16px">Только для питомников!</div></div>';return}
const houses=this.me.houses||[];
let h='<div class="city-board"><div class="city-title">💘 Разведение</div>';
if(!houses.length)h+='<div style="color:#888;padding:8px">Купите дом сначала</div>';
houses.forEach((house,i)=>{
const aCount=Object.keys(house.adults||{}).length;
const pCount=Object.keys(house.puppies||{}).length;
h+=`<div class="house"><div class="house-roof">Дом #${i+1}</div>
<div class="house-windows">${Array(HOUSE_ADULT_WIN).fill(0).map((_,j)=>{const a=Object.values(house.adults||{})[j];return`<div class="house-win${a?'':' empty'}">${a?a.emoji:'🔲'}</div>`}).join('')}</div>
<div class="house-puppies">${Array(HOUSE_PUPPY_WIN).fill(0).map((_,j)=>{const p=Object.values(house.puppies||{})[j];return`<span class="house-puppy">${p?p.emoji:'·'}</span>`}).join('')}</div>
<div class="house-actions">
<button class="btn btn-green btn-sm" onclick="UI._putDogHouse(${i},'adults')">Поселить взрослых</button>
<button class="btn btn-green btn-sm" onclick="UI._putDogHouse(${i},'puppies')">Поселить щенков</button>
<button class="btn btn-orange btn-sm" onclick="UI._breed(${i})" ${aCount<2?'disabled':''}>Развести (2+ взрослых)</button>
</div></div>`;
});
h+='</div>';
const dogs=Object.entries(this.me.dogs||{});
if(dogs.length){
h+='<div style="margin-top:12px"><b>Мои собаки (кликни чтобы поселить в дом):</b>';
dogs.forEach(([k,d])=>{h+=`<div class="dog-card"><span>${d.emoji}</span><span>${d.name} (${d.age==='puppy'?'Щенок':'Взрослая'})</span><button class="btn btn-blue btn-sm" onclick="UI._quickPut('${k}')">В дом</button></div>`});
h+='</div>';
}
el.innerHTML=h;
}

renderBank(el){
const credits=this.me.credits||{};
let h='<div class="city-board"><div class="city-title">🏦 Банк</div>';
h+=`<div class="dash-card" style="margin-bottom:12px"><div class="dc-icon">🪙</div><div class="dc-val">${this.me.balance}</div><div class="dc-lbl">На руках</div></div>`;
h+='<div style="margin-bottom:12px"><button class="btn btn-green" onclick="UI._takeCredit(100)">Взять кредит 100 (вернуть 130)</button>';
h+='<button class="btn btn-orange" onclick="UI._takeCredit(500)">Взять кредит 500 (вернуть 650)</button></div>';
const activeCredits=Object.entries(credits).filter(([,c])=>!c.paid);
if(activeCredits.length){
h+='<div><b>Активные кредиты:</b>';
activeCredits.forEach(([k,c])=>{h+=`<div class="deal-item">Кредит: ${c.amount} → Вернуть: ${c.payback} <button class="btn btn-green btn-sm" onclick="UI._payCredit('${k}')">Вернуть</button></div>`});
h+='</div>';
}
h+='</div>';
el.innerHTML=h;
}

renderPanels(){
const left=document.getElementById('panel-left');
const right=document.getElementById('panel-right');
if(this.me.role===ROLE_N)this.renderHousesPanel(left);
else this.renderShopPanel(left);
this.renderRequests(right);
}

renderHousesPanel(el){
const houses=this.me.houses||[];
let h='<div class="panel-header">🏠 Мои дома</div>';
houses.forEach((house,i)=>{
const aCount=Object.keys(house.adults||{}).length;
const pCount=Object.keys(house.puppies||{}).length;
h+=`<div class="house"><div class="house-roof">Дом #${i+1}</div><div style="font-size:.75rem;padding:4px">Взрослых: ${aCount}/${HOUSE_ADULT_WIN} · Щенков: ${pCount}/${HOUSE_PUPPY_WIN}</div></div>`;
});
if(!houses.length)h+='<div style="color:#888;font-size:.75rem;padding:8px">Нет домов</div>';
el.innerHTML=h;
}

renderShopPanel(el){
const vit=Object.values(this.me.vitrine||{});
let h='<div class="panel-header">🏪 Витрина</div>';
vit.forEach(d=>{h+=`<div class="dog-card" style="font-size:.8rem"><span>${d.emoji}</span><span>${d.name}</span><span>${d.price}🪙</span></div>`});
if(!vit.length)h+='<div style="color:#888;font-size:.75rem;padding:8px">Витрина пуста</div>';
el.innerHTML=h;
}

renderRequests(el){
const players=Object.entries(this.state.players||{}).filter(([k])=>k!==this.net.myId);
let h='';
players.forEach(([id,p])=>{
h+=`<div class="req-item"><span class="req-icon">${p.role===ROLE_N?'🐕':'🏪'}</span><span>${p.name} (${p.balance}🪙)</span></div>`;
});
if(!players.length)h='<div style="color:#888;font-size:.75rem">Нет других игроков</div>';
el.innerHTML=h;
}

static _changeRole(pid,role){
if(!window._ui?.state?.players) return;
const me=window._ui.state.players[window._ui.net.myId];
if(!me?.isHost)return window._ui.toast('Только хост!',1);
if(role===ROLE_S){
const sc=Object.values(window._ui.state.players).filter(p=>p.role===ROLE_S).length;
if(sc>=4&&window._ui.state.players[pid].role!==ROLE_S)return window._ui.toast('Макс 4 зоомагазина!',1);
}
window._ui.net.roomRef.child('players/'+pid+'/role').set(role);
}

static _addHouse(){if(window._ui)window._ui.net.addHouse().catch(e=>window._ui.toast(e.message||e,1))}
static _buyDog(){
const el=document.createElement('div');
el.innerHTML=`<div><b>Выбери щенка:</b>${BREEDS.map(b=>`<button class="btn btn-green" style="margin:4px" onclick="UI._doBuy('${b.id}','puppy')">${b.icon} ${b.name} (${Math.round(b.base*.5)}🪙)</button>`).join('')}<br><br><b>Выбери взрослую:</b>${BREEDS.map(b=>`<button class="btn btn-blue" style="margin:4px" onclick="UI._doBuy('${b.id}','adult')">${b.icon} ${b.name} (${b.base}🪙)</button>`).join('')}</div>`;
window._ui.openModal('Купить собаку',el.innerHTML);
}
static _doBuy(breed,age){window._ui.net.buyDog(breed,age).then(r=>{window._ui.closeModal();if(r?.ok)window._ui.toast('Куплено! '+r.dog.name);else window._ui.toast(r?.err||'Ошибка',1)})}
static _sellDog(){
const dogs=Object.entries(window._ui.me.dogs||{});
if(!dogs.length)return window._ui.toast('Нет собак!',1);
const el=document.createElement('div');
el.innerHTML=`<div>${dogs.map(([k,d])=>`<div class="dog-card"><span>${d.emoji}</span><span>${d.name}</span><button class="btn btn-green btn-sm" onclick="UI._doSell('${k}')">Продать</button></div>`).join('')}</div>`;
window._ui.openModal('Продать городу',el.innerHTML);
}
static _doSell(id){window._ui.net.sellDogToCity(id).then(r=>{window._ui.closeModal();if(r?.ok)window._ui.toast('Продано за '+r.price+'🪙!');else window._ui.toast(r?.err||'Ошибка',1)})}
static _sellOne(id){window._ui.net.sellDogToCity(id).then(r=>{if(r?.ok)window._ui.toast('Продано за '+r.price+'🪙!');else window._ui.toast(r?.err||'Ошибка',1)})}
static _rmVit(id){window._ui.net.removeVitrine(id)}
static _putDogHouse(houseIdx,slot){
const dogs=Object.entries(window._ui.me.dogs||{});
const filtered=dogs.filter(([,d])=>d.age===(slot==='puppies'?'puppy':'adult'));
if(!filtered.length)return window._ui.toast('Нет подходящих собак!',1);
const el=document.createElement('div');
el.innerHTML=`<div>${filtered.map(([k,d])=>`<div class="dog-card"><span>${d.emoji}</span><span>${d.name}</span><button class="btn btn-green btn-sm" onclick="UI._doPutHouse('${k}',${houseIdx},'${slot}')">Поселить</button></div>`).join('')}</div>`;
window._ui.openModal('Поселить в дом #'+(houseIdx+1),el.innerHTML);
}
static _doPutHouse(dogId,houseIdx,slot){window._ui.net.putHouse(dogId,houseIdx,slot).then(r=>{window._ui.closeModal();if(r?.ok)window._ui.toast('Поселено!');else window._ui.toast(r?.err||'Ошибка',1)})}
static _quickPut(dogId){
const dogs=window._ui.me.dogs||{};
const dog=dogs[dogId];if(!dog)return;
const houses=window._ui.me.houses||[];
if(!houses.length)return window._ui.toast('Нет домов!',1);
const slot=dog.age==='puppy'?'puppies':'adults';
const el=document.createElement('div');
el.innerHTML=`<div>${houses.map((h,i)=>`<button class="btn btn-green" style="margin:4px" onclick="UI._doPutHouse('${dogId}',${i},'${slot}')">Дом #${i+1}</button>`).join('')}</div>`;
window._ui.openModal('Выбери дом',el.innerHTML);
}
static _breed(houseIdx){window._ui.net.breedDogs(houseIdx).then(r=>{if(r?.ok)window._ui.toast('Получено '+r.count+' щенков!');else window._ui.toast(r?.err||'Ошибка',1)})}
static _takeCredit(amount){
const payback=Math.round(amount*1.3);
window._ui.net.roomRef?.child('players/'+window._ui.net.myId+'/credits/c'+Date.now().toString(36)).set({amount,payback,paid:false});
window._ui.net.roomRef?.child('players/'+window._ui.net.myId+'/balance').set(window._ui.me.balance+amount);
window._ui.toast('Кредит '+amount+'🪙 взят!');
}
static _payCredit(id){
const credits=window._ui.me.credits||{};
const c=credits[id];if(!c)return;
if(window._ui.me.balance<c.payback)return window._ui.toast('Не хватает монет!',1);
window._ui.net.roomRef?.child('players/'+window._ui.net.myId).update({balance:window._ui.me.balance-c.payback,['credits/'+id+'/paid']:true});
window._ui.toast('Кредит возвращён!');
}
static _sendTrade(dogId){
const sel=document.getElementById('sel-'+dogId);
const toId=sel?.value;
if(!toId)return window._ui.toast('Выбери игрока!',1);
const dog=window._ui.me.dogs?.[dogId];
window._ui.net.sendTrade(toId,dogId,dog?.price).then(r=>{if(r?.ok)window._ui.toast('Предложение отправлено!');else window._ui.toast(r?.err||'Ошибка',1)});
}
static _respTrade(tradeId,accept){
window._ui.net.respondTrade(tradeId,accept).then(r=>{if(r?.ok)window._ui.toast(accept?'Сделка совершена!':'Сделка отклонена');else window._ui.toast(r?.err||'Ошибка',1)});
}
}
