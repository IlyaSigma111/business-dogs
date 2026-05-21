function UI(net){this.net=net;this.state=null;this.me=null;this.tab='home'}
UI.prototype.init=function(){
var self=this;
var el;
el=document.getElementById('btn-create');if(el)el.onclick=function(){console.log('btn-create clicked');self.doCreate()};
el=document.getElementById('btn-join');if(el)el.onclick=function(){self.doJoin()};
el=document.getElementById('btn-copy');if(el)el.onclick=function(){self.copyCode()};
el=document.getElementById('btn-start');if(el)el.onclick=function(){self.net.startGame()};
el=document.getElementById('btn-leave');if(el)el.onclick=function(){self.leave()};
el=document.getElementById('btn-restart');if(el)el.onclick=function(){self.leave()};
el=document.getElementById('chk-ready');if(el)el.onchange=function(e){self.net.setReady(e.target.checked)};
el=document.getElementById('chk-host-play');if(el)el.onchange=function(e){self.net.setHostPlay(e.target.checked)};
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
console.log('UI update event:',room?room.started:'no room');
try{
self.state=room;self.me=me;
if(!room){console.log('No room, returning');return}
var codeEl=document.getElementById('d-code');
if(codeEl&&self.net.roomCode)codeEl.textContent=self.net.roomCode;
console.log('Switching screen, started:',room.started);
if(room.started){
self.showScreen('scr-game');
}else{
self.showScreen('scr-wait');
}
console.log('Screen switched, calling renderWait');
self.renderWait();
console.log('Calling render');
self.render();
console.log('UI update done');
}catch(e){
console.error('UI update error:',e);
}
});
console.log('UI init done');
};

UI.prototype.doCreate=function(){
var name=genName();
var roles=[ROLE_N,ROLE_S,ROLE_S,ROLE_N];
var role=roles[Math.floor(Math.random()*roles.length)];
console.log('doCreate: name='+name+' role='+role);
this.toast('Создаём ('+name+')...');
var self=this;
this.net.createRoom(name,role,true).then(function(r){
console.log('createRoom result:',r);
if(r&&r.err)self.toast(r.err,3);
else if(r&&r.ok){self.toast('Комната '+r.code)}
else self.toast('Ошибка',2);
}).catch(function(e){
console.error('doCreate catch:',e);
self.toast('Ошибка: '+e.message,3);
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
}).catch(function(e){
self.toast('Ошибка: '+e.message,3);
});
};

UI.prototype.showScreen=function(id){
console.log('showScreen:',id);
var screens=document.querySelectorAll('.screen');
for(var i=0;i<screens.length;i++){
screens[i].classList.remove('active');
}
var el=document.getElementById(id);
if(el){
el.classList.add('active');
console.log('Screen active:',el.id);
}else{
console.error('Screen not found:',id);
}
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
html+='<div class="p-left"><span class="p-emoji">'+emoji+'</span>';
html+='<div><div class="p-name">'+(p.name||'Кот')+'</div>';
html+='<div class="p-role">'+roleLabel+(p.isHost?' 👑':'')+'</div></div></div>';
html+='<div class="p-right"><span class="p-ready '+(p.ready?'y':'n')+'"></span>';
html+='<span style="color:#fdcb6e;font-size:.8rem">'+fmtN(p.balance||0)+'</span>';
if(isHost&&pid!==myId){
html+='<button class="p-kick-btn" onclick="ui.kick(\''+pid+'\')" title="Кикнуть">❌</button>';
html+='<button class="p-role-btn" onclick="ui.cycleRole(\''+pid+'\')" title="Сменить роль">🔄</button>';
}
html+='</div></div>';
}
listEl.innerHTML=html;
var me=players[myId];
if(chkReady)chkReady.checked=me?me.ready:false;
if(hostSec)hostSec.style.display=(me&&me.isHost)?'block':'none';
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
else if(this.tab==='more')this.renderMore(content,room,me);
};

UI.prototype.renderHome=function(el,room,me){
var html='';
html+='<div class="card"><h3>📊 Статистика</h3>';
html+='<div class="dem-row"><span class="dem-emoji">🐱</span><span class="dem-breed">Котов</span><span class="dem-price">'+Object.keys(me.cats||{}).length+'</span></div>';
html+='<div class="dem-row"><span class="dem-emoji">🏠</span><span class="dem-breed">Домов</span><span class="dem-price">'+(me.houses||[]).length+'</span></div>';
if(me.loan>0)html+='<div class="dem-row"><span class="dem-emoji">💳</span><span class="dem-breed">Кредит</span><span class="dem-price">'+me.loan+'</span></div>';
html+='<div class="dem-row"><span class="dem-emoji">📦</span><span class="dem-breed">Витрина</span><span class="dem-price">'+Object.keys(me.vitrine||{}).length+'</span></div>';
html+='</div>';

if(me.role===ROLE_N){
html+='<div class="act-row">';
html+='<button class="act-btn act-buy" onclick="ui.actBuyCat(\'kitten\')">🐱 Щенок (-60%)</button>';
html+='<button class="act-btn act-buy" onclick="ui.actBuyCat(\'adult\')">😺 Взрослый</button>';
html+='</div>';
html+='<div class="act-row">';
html+='<button class="act-btn act-house" onclick="ui.actAddHouse()">🏠 Дом ('+HOUSE_PRICE+'🪙)</button>';
html+='<button class="act-btn act-breed" onclick="ui.tabBreed()">💘 Разведение</button>';
html+='</div>';
html+='<div class="act-row">';
html+='<button class="act-btn act-buy" onclick="ui.actLoan()">💳 Взять кредит</button>';
html+='<button class="act-btn act-sell" onclick="ui.actRepay()">💰 Вернуть кредит</button>';
html+='</div>';
}else if(me.role===ROLE_S){
html+='<div class="act-row">';
html+='<button class="act-btn act-house" onclick="ui.actAddHouse()">🏠 Дом ('+HOUSE_PRICE+'🪙)</button>';
html+='<button class="act-btn act-buy" onclick="ui.tabTrade()">🤝 Купить у игрока</button>';
html+='</div>';
html+='<div class="act-row">';
html+='<button class="act-btn act-buy" onclick="ui.actLoan()">💳 Взять кредит</button>';
html+='<button class="act-btn act-sell" onclick="ui.actRepay()">💰 Вернуть кредит</button>';
html+='</div>';
}
el.innerHTML=html;
};

UI.prototype.renderCats=function(el,room,me){
var html='<div class="card"><h3>🐱 Мои коты</h3>';
var cats=me.cats||{};
var keys=Object.keys(cats);
if(keys.length===0){html+='<p style="color:#888;font-size:.85rem">Нет котов</p>'}
else{
html+='<div class="card-grid">';
for(var i=0;i<keys.length;i++){
var cat=cats[keys[i]];
var ageLabel=cat.age===AGE_K?'Щенок':'Взрослый';
html+='<div class="cat-card">';
html+='<div class="cat-emoji">'+cat.emoji+'</div>';
html+='<div class="cat-name">'+cat.name+'</div>';
html+='<div class="cat-meta">'+ageLabel+' · '+cat.temper+'</div>';
html+='<div class="cat-price">'+fmtN(cat.price)+' 🪙</div>';
html+='<div style="display:flex;gap:4px;margin-top:6px">';
html+='<button class="btn btn-sm" onclick="ui.actSellCat(\''+cat.id+'\')" style="flex:1;background:#d63031;color:#fff">Продать</button>';
if(me.role===ROLE_S){
html+='<button class="btn btn-sm" onclick="ui.actPutVitrine(\''+cat.id+'\')" style="flex:1;background:#6c5ce7;color:#fff">На витрину</button>';
}
if(me.role===ROLE_N){
html+='<button class="btn btn-sm" onclick="ui.actPutHouse(\''+cat.id+'\')" style="flex:1;background:#00b894;color:#fff">В дом</button>';
}
html+='</div></div>';
}
html+='</div>';
}
html+='</div>';

var vit=me.vitrine||{};
var vitKeys=Object.keys(vit);
if(vitKeys.length>0){
html+='<div class="card"><h3>📦 Витрина</h3>';
for(var i=0;i<vitKeys.length;i++){
var vc=vit[vitKeys[i]];
html+='<div class="dem-row"><span class="dem-emoji">'+vc.emoji+'</span><span class="dem-breed">'+vc.breed+'</span><span class="dem-price">'+fmtN(vc.price)+'🪙</span>';
html+='<button class="btn btn-sm" onclick="ui.actRemoveVitrine(\''+vc.id+'\')" style="background:#d63031;color:#fff">Снять</button></div>';
}
html+='</div>';
}

var houses=me.houses||[];
if(houses.length>0){
html+='<div class="card"><h3>🏠 Дома</h3>';
for(var i=0;i<houses.length;i++){
var h=houses[i];
var aCount=Object.keys(h.adults||{}).length;
var kCount=Object.keys(h.kittens||{}).length;
html+='<div class="house-card"><h4>Дом '+fmtN(i+1)+' ('+aCount+'/'+HOUSE_SLOTS+')</h4>';
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
html+='<div style="margin-top:6px;font-size:.75rem;color:#888">Котята: '+kCount+'</div>';
html+='<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:4px">';
var kKeys=Object.keys(h.kittens||{});
for(var j=0;j<kKeys.length;j++){
var kc=h.kittens[kKeys[j]];
html+='<span style="font-size:1rem">'+kc.emoji+'</span>';
}
html+='</div>';
}
html+='</div>';
}
html+='</div>';
}
el.innerHTML=html;
};

UI.prototype.renderCity=function(el,room,me){
var html='<div class="card"><h3>🏙 Городской спрос</h3>';
var dem=room.demand||[];
for(var i=0;i<dem.length;i++){
var d=dem[i];
var b=BREED_MAP[d.breed];
var emoji=b?b.icon:'🐱';
html+='<div class="dem-row">';
html+='<span class="dem-emoji">'+emoji+'</span>';
html+='<div><div class="dem-breed">'+(b?b.name:d.breed)+'</div>';
html+='<div class="dem-count">Осталось: '+d.count+'</div></div>';
html+='<span class="dem-price">'+fmtN(d.price)+' 🪙</span>';
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
html+='<div class="card"><h3>🛒 Магазин игроков</h3>';
for(var i=0;i<vitAll.length;i++){
var v=vitAll[i];
html+='<div class="dem-row"><span class="dem-emoji">'+v.emoji+'</span>';
html+='<div><div class="dem-breed">'+v.name+'</div>';
html+='<div class="dem-count">'+v.sellerName+'</div></div>';
html+='<span class="dem-price">'+fmtN(v.price)+' 🪙</span>';
html+='<button class="btn btn-sm" onclick="ui.actBuyVitrine(\''+v.sellerId+'\',\''+v.id+'\')" style="background:#00b894;color:#fff">Купить</button></div>';
}
html+='</div>';
}
el.innerHTML=html;
};

UI.prototype.renderTrade=function(el,room,me){
var html='<div class="card"><h3>🤝 Торговля</h3>';
html+='<p style="color:#888;font-size:.85rem;margin-bottom:10px">Купите кота у другого игрока</p>';
html+='<div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap">';
html+='<input id="trade-seller" class="inp" style="text-align:left;letter-spacing:0;flex:1;min-width:120px" placeholder="ID продавца">';
html+='<input id="trade-cat" class="inp" style="text-align:left;letter-spacing:0;flex:1;min-width:120px" placeholder="ID кота">';
html+='</div>';
html+='<button class="act-btn act-buy" onclick="ui.actBuyDirect()">Купить</button>';
html+='</div>';
el.innerHTML=html;
};

UI.prototype.renderMore=function(el,room,me){
var html='<div class="card"><h3>⚙️ Действия</h3>';
html+='<div class="act-row"><button class="act-btn" onclick="ui.net.endSeason()" style="background:#fdcb6e;color:#000">⏭ Завершить сезон</button></div>';
html+='<div class="act-row"><button class="act-btn act-sell" onclick="ui.leave()" style="background:#d63031;color:#fff">🚪 Покинуть комнату</button></div>';
html+='</div>';
html+='<div class="card"><h3>ℹ️ Правила</h3>';
html+='<p style="color:#888;font-size:.8rem;line-height:1.5">';
html+='<b>🐱 Питомник</b> — покупает котов, разводит, продаёт в город<br>';
html+='<b>🏪 Магазин</b> — покупает котов, выставляет на витрину<br>';
html+='<b>🏦 Банк</b> — кредиты доступны всем игрокам автоматически<br>';
html+='Сезон длится 5 минут. Цель — заработать больше всех!';
html+='</p></div>';
el.innerHTML=html;
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
var amount=prompt('Сумма кредита?','200');
amount=parseInt(amount)||0;
if(amount<=0)return this.toast('Укажи сумму',1);
var self=this;
this.net.takeLoan(amount).then(function(r){if(r&&r.ok)self.toast('Кредит выдан');else if(r&&r.err)self.toast(r.err,2)});
};

UI.prototype.actRepay=function(){
var amount=prompt('Сумма возврата?','100');
amount=parseInt(amount)||0;
if(amount<=0)return this.toast('Укажи сумму',1);
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
