function UI(net){this.net=net;this.state=null;this.me=null;this.tab='home'}
UI.prototype.init=function(){
var self=this;
var el;
el=document.getElementById('btn-create');if(el)el.onclick=function(){self.doCreate()};
el=document.getElementById('btn-join');if(el)el.onclick=function(){self.doJoin()};
el=document.getElementById('btn-copy');if(el)el.onclick=function(){self.copyCode()};
el=document.getElementById('btn-start');if(el)el.onclick=function(){self.net.startGame()};
el=document.getElementById('btn-leave');if(el)el.onclick=function(){self.leave()};
el=document.getElementById('btn-restart');if(el)el.onclick=function(){self.leave()};
el=document.getElementById('chk-ready');if(el)el.onchange=function(e){self.net.setReady(e.target.checked)};
el=document.getElementById('chk-host-play');if(el)el.onchange=function(e){self.net.setHostPlay(e.target.checked)};
el=document.getElementById('modal-cancel');if(el)el.onclick=function(){self.hideModal()};
el=document.getElementById('modal-confirm');if(el)el.onclick=function(){self.modalConfirm()};
var navBtns=document.querySelectorAll('.nav-btn');
for(var i=0;i<navBtns.length;i++){
(function(b){b.onclick=function(){
for(var j=0;j<navBtns.length;j++)navBtns[j].classList.remove('active');
b.classList.add('active');
self.tab=b.dataset.tab;
self.render();
};})(navBtns[i]);
}
this.net.on('update',function(room,me){
self.state=room;self.me=me;
if(!room)return;
var codeEl=document.getElementById('d-code');
if(codeEl&&self.net.roomCode)codeEl.textContent=self.net.roomCode;
if(room.started){
self.showScreen('scr-game');
}else{
self.showScreen('scr-wait');
}
self.renderWait();
self.render();
});
this.net.on('tick',function(sec){
var el=document.getElementById('tb-timer');
if(el)el.textContent=fmtT(sec);
});
this.net.on('seasonEnd',function(){
self.showModal('Сезон завершён!','<p>Подводим итоги...</p>',function(){
self.net.endSeason();
});
});
};

UI.prototype.doCreate=function(){
var name=genName();
var roles=[ROLE_N,ROLE_S,ROLE_S,ROLE_N];
var role=roles[Math.floor(Math.random()*roles.length)];
this.toast('Создаём ('+name+')...');
var self=this;
this.net.createRoom(name,role,true).then(function(r){
if(r&&r.err)self.toast(r.err,3);
else if(r&&r.ok)self.toast('Комната '+r.code);
});
};

UI.prototype.doJoin=function(){
var code=document.getElementById('inp-code').value.trim();
if(!code)return this.toast('Введи код!',1);
var name=genName();
this.toast('Входим ('+name+')...');
var self=this;
this.net.joinRoom(code,name).then(function(r){
if(r&&r.err)self.toast(r.err,3);
});
};

UI.prototype.showScreen=function(id){
var screens=document.querySelectorAll('.screen');
for(var i=0;i<screens.length;i++){screens[i].classList.remove('active')}
var el=document.getElementById(id);
if(el)el.classList.add('active');
};

UI.prototype.copyCode=function(){
var self=this;
if(navigator.clipboard){
navigator.clipboard.writeText(this.net.roomCode).then(function(){self.toast('Код скопирован!')});
}
};

UI.prototype.toast=function(msg,sec){
sec=sec||2;
var el=document.getElementById('toast');
if(!el)return;
el.textContent=msg;el.classList.remove('hidden');
var self=this;
clearTimeout(this._tout);
this._tout=setTimeout(function(){el.classList.add('hidden')},sec*1000);
};

UI.prototype.leave=function(){
this.net.leaveRoom();
this.state=null;this.me=null;
this.showScreen('scr-lobby');
this.toast('Покинули комнату');
};

UI.prototype.renderWait=function(){
var listEl=document.getElementById('w-list');
var btnStart=document.getElementById('btn-start');
var chkReady=document.getElementById('chk-ready');
var hostSec=document.getElementById('host-sec');
if(!listEl)return;
var room=this.state;if(!room||!room.players){listEl.innerHTML='<div class="p-card">Загрузка...</div>';return}
var players=room.players;
var keys=Object.keys(players);
var readyCount=0;
var html='';
var myId=this.net.myId;
var me=players[myId];
var isHost=me&&me.isHost;
for(var i=0;i<keys.length;i++){
var pid=keys[i];
var p=players[pid];if(!p)continue;
if(p.ready)readyCount++;
var emoji=p.role===ROLE_S?'🏪':'🐱';
var roleLabel=p.role===ROLE_S?'Магазин':'Питомник';
html+='<div class="p-card">';
html+='<div class="p-left"><span style="font-size:1.3rem">'+emoji+'</span>';
html+='<div><div class="p-name">'+(p.name||'Кот')+'</div>';
html+='<div class="p-role">'+roleLabel+(p.isHost?' 👑':'')+'</div></div></div>';
html+='<div class="p-right"><span class="p-ready '+(p.ready?'y':'n')+'"></span>';
html+='<span style="color:#02516c;font-size:.8rem">'+fmtN(p.balance||0)+'</span>';
if(isHost&&pid!==myId){
html+='<button class="p-kick-btn" onclick="ui.kick(\''+pid+'\')">❌</button>';
html+='<button class="p-role-btn" onclick="ui.cycleRole(\''+pid+'\')">🔄</button>';
}
html+='</div></div>';
}
listEl.innerHTML=html;
if(chkReady)chkReady.checked=me?me.ready:false;
if(hostSec){
if(me&&me.isHost){hostSec.classList.remove('hidden')}
else{hostSec.classList.add('hidden')}
}
if(btnStart){
btnStart.style.display=(me&&me.isHost&&!room.started)?'block':'none';
btnStart.disabled=readyCount<1;
}
};

UI.prototype.render=function(){
if(!this.state)return;
var room=this.state;
var me=room.players?room.players[this.net.myId]:null;
if(!me)return;
var nameEl=document.getElementById('tb-name');
var roleEl=document.getElementById('tb-role');
var balEl=document.getElementById('tb-balance');
var seaEl=document.getElementById('tb-season');
var emojiEl=document.getElementById('tb-emoji');
if(nameEl)nameEl.textContent=me.name||'Кот';
if(roleEl)roleEl.textContent=me.role===ROLE_S?'Магазин':'Питомник';
if(balEl)balEl.textContent=fmtN(me.balance||0);
if(seaEl)seaEl.textContent=room.season||1;
if(emojiEl)emojiEl.textContent=me.role===ROLE_S?'🏪':'🐱';
var content=document.getElementById('game-content');
if(!content)return;
if(this.tab==='home')this.renderHome(content,room,me);
else if(this.tab==='cats')this.renderCats(content,room,me);
else if(this.tab==='city')this.renderCity(content,room,me);
else if(this.tab==='trade')this.renderTrade(content,room,me);
else if(this.tab==='bank')this.renderBank(content,room,me);
};

UI.prototype.renderHome=function(el,room,me){
var html='';
// Lot area - own field
html+='<div class="lot-area lot-area--own-field">';
html+='<div class="lot-area__name">🐱 '+me.name+'</div>';
html+='<div class="lot-area__cats">';
var cats=me.cats||{};
var catKeys=Object.keys(cats);
if(catKeys.length===0){
html+='<div style="color:#666;font-size:.85rem;padding:20px;text-align:center">Нет котов</div>';
}else{
for(var i=0;i<catKeys.length;i++){
var cat=cats[catKeys[i]];
var ageLabel=cat.age===AGE_K?'Щенок':'Взрослый';
html+='<div class="cat cat--default">';
html+='<div style="font-size:2rem;text-align:center">'+cat.emoji+'</div>';
html+='<div class="cat__count">'+fmtN(cat.price)+'</div>';
html+='<div class="cat__description"><span style="font-size:.7rem;color:#666">'+ageLabel+' '+cat.temper+'</span></div>';
html+='<div class="cat__home-icon" onclick="ui.actSellCat(\''+cat.id+'\')" style="cursor:pointer;font-size:.8rem;color:#02516c;text-align:center;margin-top:2px">Продать</div>';
html+='</div>';
}
}
html+='</div></div>';

// Demand board
html+='<div class="demand-board">';
html+='<div class="demand-board__title">🏙 Городской спрос</div>';
var dem=room.demand||[];
for(var i=0;i<dem.length;i++){
var d=dem[i];
var b=BREED_MAP[d.breed];
html+='<div class="demand-row">';
html+='<span class="demand-emoji">'+(b?b.emoji:'🐱')+'</span>';
html+='<span class="demand-breed">'+(b?b.name:d.breed)+'</span>';
html+='<span class="demand-price">'+fmtN(d.price)+' 🪙</span>';
html+='<span class="demand-count">x'+d.count+'</span>';
html+='</div>';
}
html+='</div>';

// Actions
html+='<div class="btn-group">';
if(me.role===ROLE_N){
html+='<button class="text_button text_button--green" onclick="ui.actBuyCat(\'kitten\')">🐱 Щенок (-60%)</button>';
html+='<button class="text_button text_button--green" onclick="ui.actBuyCat(\'adult\')">😺 Взрослый</button>';
}else{
html+='<button class="text_button text_button--green" onclick="ui.actBuyCat(\'kitten\')">🐱 Купить кота</button>';
}
html+='</div>';
html+='<div class="btn-group">';
html+='<button class="text_button text_button--purple" onclick="ui.actAddHouse()">🏠 Дом ('+HOUSE_PRICE+'🪙)</button>';
html+='<button class="text_button" onclick="ui.tabBreed()">💘 Разведение</button>';
html+='</div>';

// Houses
var houses=me.houses||[];
if(houses.length>0){
html+='<div class="demand-board"><div class="demand-board__title">🏠 Дома</div>';
for(var i=0;i<houses.length;i++){
var h=houses[i];
var aCount=Object.keys(h.adults||{}).length;
var kCount=Object.keys(h.kittens||{}).length;
html+='<div class="house-card"><div class="house-card__title">Дом '+fmtN(i+1)+' ('+aCount+'/'+HOUSE_SLOTS+')</div>';
html+='<div class="house-slots">';
var adultKeys=Object.keys(h.adults||{});
for(var j=0;j<HOUSE_SLOTS;j++){
if(j<adultKeys.length){
var ac=h.adults[adultKeys[j]];
html+='<div class="house-slot">'+ac.emoji+'</div>';
}else{
html+='<div class="house-slot empty">·</div>';
}
}
html+='</div>';
if(kCount>0){
html+='<div style="margin-top:6px;font-size:.75rem;color:#666">Котята: '+kCount+'</div>';
}
html+='</div>';
}
html+='</div>';
}

// Vitrine
var vit=me.vitrine||{};
var vitKeys=Object.keys(vit);
if(vitKeys.length>0){
html+='<div class="demand-board"><div class="demand-board__title">📦 Витрина</div>';
for(var i=0;i<vitKeys.length;i++){
var vc=vit[vitKeys[i]];
html+='<div class="demand-row"><span class="demand-emoji">'+vc.emoji+'</span><span class="demand-breed">'+vc.breed+'</span><span class="demand-price">'+fmtN(vc.price)+'🪙</span>';
html+='<button class="text_button" style="padding:4px 10px;font-size:.7rem;width:auto;background:#666" onclick="ui.actRemoveVitrine(\''+vc.id+'\')">Снять</button></div>';
}
html+='</div>';
}

el.innerHTML=html;
};

UI.prototype.renderCats=function(el,room,me){
var html='<div class="lot-area lot-area--own-field"><div class="lot-area__name">🐱 Мои коты</div><div class="lot-area__cats">';
var cats=me.cats||{};
var keys=Object.keys(cats);
if(keys.length===0){html+='<div style="color:#666;font-size:.85rem;padding:20px">Нет котов</div>'}
else{
for(var i=0;i<keys.length;i++){
var cat=cats[keys[i]];
var ageLabel=cat.age===AGE_K?'Щенок':'Взрослый';
html+='<div class="cat cat--default">';
html+='<div style="font-size:2rem;text-align:center">'+cat.emoji+'</div>';
html+='<div class="cat__count">'+fmtN(cat.price)+'</div>';
html+='<div class="cat__description"><span style="font-size:.7rem;color:#666">'+ageLabel+' '+cat.temper+'</span></div>';
html+='<div style="display:flex;gap:4px;margin-top:4px">';
html+='<button class="text_button" style="padding:4px 8px;font-size:.7rem;width:auto;background:#d63031" onclick="ui.actSellCat(\''+cat.id+'\')">Продать</button>';
if(me.role===ROLE_N){
html+='<button class="text_button" style="padding:4px 8px;font-size:.7rem;width:auto;background:#b3c79b" onclick="ui.actPutHouse(\''+cat.id+'\')">В дом</button>';
}
html+='</div></div>';
}
}
html+='</div></div>';
el.innerHTML=html;
};

UI.prototype.renderCity=function(el,room,me){
var html='<div class="demand-board"><div class="demand-board__title">🏙 Городской спрос</div>';
var dem=room.demand||[];
for(var i=0;i<dem.length;i++){
var d=dem[i];
var b=BREED_MAP[d.breed];
html+='<div class="demand-row">';
html+='<span class="demand-emoji">'+(b?b.emoji:'🐱')+'</span>';
html+='<span class="demand-breed">'+(b?b.name:d.breed)+'</span>';
html+='<span class="demand-price">'+fmtN(d.price)+' 🪙</span>';
html+='<span class="demand-count">x'+d.count+'</span>';
html+='</div>';
}
html+='</div>';

var vitAll=[];
var players=room.players||{};
Object.keys(players).forEach(function(k){
if(k!==ui.net.myId){
var p=players[k];
var vit=p.vitrine||{};
Object.keys(vit).forEach(function(vk){
var vc=vit[vk];
vitAll.push({id:vc.id,sellerId:k,sellerName:p.name,emoji:vc.emoji,name:vc.breed,price:vc.price});
});
}
});
if(vitAll.length>0){
html+='<div class="demand-board"><div class="demand-board__title">🛒 Магазин игроков</div>';
for(var i=0;i<vitAll.length;i++){
var v=vitAll[i];
html+='<div class="demand-row"><span class="demand-emoji">'+v.emoji+'</span>';
html+='<span class="demand-breed">'+v.name+'</span>';
html+='<span class="demand-price">'+fmtN(v.price)+' 🪙</span>';
html+='<button class="text_button text_button--green" style="padding:4px 10px;font-size:.7rem;width:auto" onclick="ui.actBuyVitrine(\''+v.sellerId+'\',\''+v.id+'\')">Купить</button></div>';
}
html+='</div>';
}
el.innerHTML=html;
};

UI.prototype.renderTrade=function(el,room,me){
var html='<div class="demand-board"><div class="demand-board__title">🤝 Торговля</div>';
html+='<p style="color:#666;font-size:.85rem;margin-bottom:10px">Купите кота у другого игрока</p>';
html+='<div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap">';
html+='<input id="trade-seller" class="inp" style="text-align:left;letter-spacing:0;flex:1;min-width:120px;font-size:.9rem" placeholder="ID продавца">';
html+='<input id="trade-cat" class="inp" style="text-align:left;letter-spacing:0;flex:1;min-width:120px;font-size:.9rem" placeholder="ID кота">';
html+='</div>';
html+='<button class="text_button text_button--green" onclick="ui.actBuyDirect()">Купить</button>';
html+='</div>';
el.innerHTML=html;
};

UI.prototype.renderBank=function(el,room,me){
var html='<div class="demand-board"><div class="demand-board__title">🏦 Банк</div>';
if(me.loan>0){
html+='<div class="demand-row"><span class="demand-emoji">💳</span><span class="demand-breed">Текущий кредит</span><span class="demand-price">'+fmtN(me.loan)+' 🪙</span></div>';
}
html+='<div style="margin-top:10px">';
html+='<label style="font-size:.85rem;color:#666">Сумма:</label>';
html+='<input id="loan-amount" class="inp" style="text-align:center;letter-spacing:0;font-size:1rem" value="200" inputmode="numeric">';
html+='</div>';
html+='<div class="btn-group" style="margin-top:10px">';
html+='<button class="text_button text_button--green" onclick="ui.actLoan()">💳 Взять кредит</button>';
html+='<button class="text_button" onclick="ui.actRepay()">💰 Вернуть</button>';
html+='</div>';
html+='<p style="color:#666;font-size:.75rem;margin-top:10px">Лимит кредита: 1000 монет</p>';
html+='</div>';
el.innerHTML=html;
};

UI.prototype.kick=function(pid){
if(!confirm('Кикнуть игрока?'))return;
this.net.kickPlayer(pid).then(()=>this.toast('Игрок кикнут'));
};

UI.prototype.cycleRole=function(pid){
var players=this.state.players;
if(!players||!players[pid])return;
var cur=players[pid].role;
var next=cur===ROLE_N?ROLE_S:ROLE_N;
this.net.changeRole(pid,next);
};

UI.prototype.actBuyCat=function(age){
var breeds=Object.keys(BREED_MAP);
var breed=prompt('Порода ('+breeds.join(', ')+')?','british');
if(!breed||!BREED_MAP[breed])return this.toast('Нет породы',2);
var self=this;
this.net.buyCat(breed,age).then(function(r){if(r&&r.err)self.toast(r.err,2);else if(r&&r.ok)self.toast('Куплен!')});
};

UI.prototype.actSellCat=function(catId){
var self=this;
this.net.sellCat(catId).then(function(r){if(r&&r.ok)self.toast('Продано за '+fmtN(r.price)+'🪙');else if(r&&r.err)self.toast(r.err,2)});
};

UI.prototype.actPutVitrine=function(catId){
var price=prompt('Цена?');
price=parseInt(price)||0;
if(price<=0)return this.toast('Укажи цену',1);
var self=this;
this.net.putVitrine(catId,price).then(function(r){if(r&&r.ok)self.toast('На витрину');else if(r&&r.err)self.toast(r.err,2)});
};

UI.prototype.actRemoveVitrine=function(catId){
var self=this;
this.net.removeVitrine(catId).then(function(r){if(r&&r.ok)self.toast('Снято с витрины')});
};

UI.prototype.actBuyVitrine=function(sellerId,catId){
var self=this;
this.net.buyVitrine(sellerId,catId).then(function(r){if(r&&r.ok)self.toast('Куплено!');else if(r&&r.err)self.toast(r.err,2)});
};

UI.prototype.actBuyDirect=function(){
var sellerId=document.getElementById('trade-seller').value.trim();
var catId=document.getElementById('trade-cat').value.trim();
if(!sellerId||!catId)return this.toast('Заполни оба поля',1);
var self=this;
this.net.buyVitrine(sellerId,catId).then(function(r){if(r&&r.ok)self.toast('Куплено!');else if(r&&r.err)self.toast(r.err,2)});
};

UI.prototype.actAddHouse=function(){
var self=this;
this.net.addHouse().then(function(r){if(r&&r.ok)self.toast('Дом куплен!');else if(r&&r.err)self.toast(r.err,2)});
};

UI.prototype.actPutHouse=function(catId){
var houses=this.me?this.me.houses||[]:[];
if(houses.length===0)return this.toast('Нет домов',1);
var idx=prompt('Номер дома (0-'+(houses.length-1)+')?','0');
idx=parseInt(idx)||0;
var self=this;
this.net.putInHouse(catId,idx).then(function(r){if(r&&r.ok)self.toast('Кот в доме');else if(r&&r.err)self.toast(r.err,2)});
};

UI.prototype.tabBreed=function(){
this.tab='cats';
var navBtns=document.querySelectorAll('.nav-btn');
for(var i=0;i<navBtns.length;i++){
if(navBtns[i].dataset.tab==='cats'){navBtns[i].classList.add('active')}
else{navBtns[i].classList.remove('active')}
}
var houses=this.me?this.me.houses||[]:[];
if(houses.length===0)return this.toast('Нет домов',1);
var idx=prompt('Номер дома для разведения (0-'+(houses.length-1)+')?','0');
idx=parseInt(idx)||0;
var self=this;
this.net.breedCats(idx).then(function(r){if(r&&r.ok)self.toast('Родилось '+r.count+' котят! 🎉');else if(r&&r.err)self.toast(r.err,2)});
};

UI.prototype.actLoan=function(){
var el=document.getElementById('loan-amount');
var amount=el?parseInt(el.value):200;
if(!amount||amount<=0)return this.toast('Укажи сумму',1);
var self=this;
this.net.takeLoan(amount).then(function(r){if(r&&r.ok)self.toast('Кредит выдан');else if(r&&r.err)self.toast(r.err,2)});
};

UI.prototype.actRepay=function(){
var el=document.getElementById('loan-amount');
var amount=el?parseInt(el.value):100;
if(!amount||amount<=0)return this.toast('Укажи сумму',1);
var self=this;
this.net.repayLoan(amount).then(function(r){if(r&&r.ok)self.toast('Кредит возвращён');else if(r&&r.err)self.toast(r.err,2)});
};

UI.prototype.tabTrade=function(){
this.tab='trade';
var navBtns=document.querySelectorAll('.nav-btn');
for(var i=0;i<navBtns.length;i++){
if(navBtns[i].dataset.tab==='trade'){navBtns[i].classList.add('active')}
else{navBtns[i].classList.remove('active')}
}
this.render();
};

UI.prototype.hideModal=function(){
document.getElementById('modal-overlay').classList.add('hidden');
};

UI.prototype.showModal=function(title,body,onConfirm){
document.getElementById('modal-title').textContent=title;
document.getElementById('modal-body').innerHTML=body;
this._modalConfirm=onConfirm;
document.getElementById('modal-overlay').classList.remove('hidden');
};

UI.prototype.modalConfirm=function(){
if(this._modalConfirm)this._modalConfirm();
this.hideModal();
};
