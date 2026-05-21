function UI(net){this.net=net;this.state=null;this.me=null;this.view='street'}
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
el=document.getElementById('btn-take-loan');if(el)el.onclick=function(){self.actLoan()};
el=document.getElementById('btn-repay-loan');if(el)el.onclick=function(){self.actRepay()};
el=document.getElementById('btn-home');if(el)el.onclick=function(){self.goStreet()};
var bldgs=document.querySelectorAll('.street-building-item');
for(var i=0;i<bldgs.length;i++){
(function(b){b.onclick=function(){self.enterView(b.dataset.view)};})(bldgs[i]);
}
this.net.on('update',function(room,me){
self.state=room;self.me=me;
if(!room)return;
var codeEl=document.getElementById('d-code');
if(codeEl&&self.net.roomCode)codeEl.textContent=self.net.roomCode;
if(room.started){
self.showScreen('scr-game');
self.render();
}else{
self.showScreen('scr-wait');
}
self.renderWait();
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

UI.prototype.goStreet=function(){
this.view='street';
document.getElementById('street-view').classList.remove('hidden');
var ivs=document.querySelectorAll('.inside-view');
for(var i=0;i<ivs.length;i++)ivs[i].classList.remove('active');
document.getElementById('btn-home').classList.add('hidden');
};

UI.prototype.enterView=function(name){
this.view=name;
document.getElementById('street-view').classList.add('hidden');
var ivs=document.querySelectorAll('.inside-view');
for(var i=0;i<ivs.length;i++)ivs[i].classList.remove('active');
var el=document.getElementById('inside-'+name);
if(el)el.classList.add('active');
document.getElementById('btn-home').classList.remove('hidden');
this.render();
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
if(this.view==='nursery')this.renderNursery(me,room);
else if(this.view==='shop')this.renderShop(me,room);
else if(this.view==='city')this.renderCity(me,room);
else if(this.view==='bank')this.renderBank(me,room);
};

UI.prototype.renderNursery=function(me,room){
var housesEl=document.getElementById('nur-houses');
var catsEl=document.getElementById('nur-cats');
var actionsEl=document.getElementById('nur-actions');
var houses=me.houses||[];
var cats=me.cats||{};
var catKeys=Object.keys(cats);
var hHtml='<div class="demand-board__title">🏠 Дома</div>';
if(houses.length===0){
hHtml+='<div style="color:#666;font-size:.85rem;padding:10px;text-align:center">Нет домов. Купите дом!</div>';
}else{
for(var i=0;i<houses.length;i++){
var h=houses[i];
var aKeys=Object.keys(h.adults||{});
var kCount=Object.keys(h.kittens||{}).length;
hHtml+='<div class="house-card"><div class="house-card__title">Дом '+fmtN(i+1)+' ('+aKeys.length+'/'+HOUSE_SLOTS+')';
if(kCount>0)hHtml+=' · Котята: '+kCount;
hHtml+='</div><div class="house-card__slots">';
for(var j=0;j<HOUSE_SLOTS;j++){
if(j<aKeys.length){
hHtml+='<div class="house-card__slot">'+h.adults[aKeys[j]].emoji+'</div>';
}else{
hHtml+='<div class="house-card__slot empty">·</div>';
}
}
hHtml+='</div>';
if(kCount>0){
hHtml+='<button class="text_button text_button--color-green" style="margin-top:6px;font-size:10px;padding:4px 10px;width:auto" onclick="ui.actBreed('+i+')">💘 Разведение</button>';
}
hHtml+='</div>';
}
}
if(housesEl)housesEl.innerHTML=hHtml;
var cHtml='';
if(catKeys.length===0){
cHtml='<div style="color:#fdf6ee;font-size:.85rem;padding:20px;text-align:center;width:100%">Нет котов. Купите кота!</div>';
}else{
for(var i=0;i<catKeys.length;i++){
var cat=cats[catKeys[i]];
var ageLabel=cat.age===AGE_K?'Щенок':'Взрослый';
cHtml+='<div class="cat" onclick="ui.selectCat(\''+cat.id+'\')">';
cHtml+='<div class="cat__image">'+cat.emoji+'</div>';
cHtml+='<div class="cat__count">'+fmtN(cat.price)+' 🪙</div>';
cHtml+='<div class="cat__description">'+ageLabel+' · '+cat.temper+'</div>';
cHtml+='<div class="cat__actions">';
cHtml+='<button class="text_button text_button--color-green" style="font-size:8px;padding:3px 6px" onclick="event.stopPropagation();ui.actSellCat(\''+cat.id+'\')">Продать</button>';
if(houses.length>0&&me.role===ROLE_N){
cHtml+='<button class="text_button text_button--color-purple" style="font-size:8px;padding:3px 6px" onclick="event.stopPropagation();ui.actPutHouse(\''+cat.id+'\')">В дом</button>';
}
cHtml+='<button class="text_button text_button--color-blue" style="font-size:8px;padding:3px 6px" onclick="event.stopPropagation();ui.actVitrine(\''+cat.id+'\')">Витрина</button>';
cHtml+='</div></div>';
}
}
if(catsEl)catsEl.innerHTML=cHtml;
var aHtml='';
aHtml+='<button class="own-nurseries__actions-item" onclick="ui.actBuyCat(\'kitten\')" title="Купить щенка">🐱</button>';
aHtml+='<button class="own-nurseries__actions-item" onclick="ui.actBuyCat(\'adult\')" title="Купить взрослого">😺</button>';
aHtml+='<button class="own-nurseries__actions-item" onclick="ui.actAddHouse()" title="Купить дом">🏠</button>';
aHtml+='<button class="own-nurseries__actions-item" onclick="ui.tabBreed()" title="Разведение">💘</button>';
if(actionsEl)actionsEl.innerHTML=aHtml;
};

UI.prototype.renderShop=function(me,room){
var catsEl=document.getElementById('shp-cats');
var actionsEl=document.getElementById('shp-actions');
var cats=me.cats||{};
var catKeys=Object.keys(cats);
var cHtml='';
if(catKeys.length===0){
cHtml='<div style="color:#666;font-size:.85rem;padding:20px;text-align:center;width:100%">Нет котов. Купите кота!</div>';
}else{
for(var i=0;i<catKeys.length;i++){
var cat=cats[catKeys[i]];
var ageLabel=cat.age===AGE_K?'Щенок':'Взрослый';
cHtml+='<div class="cat">';
cHtml+='<div class="cat__image">'+cat.emoji+'</div>';
cHtml+='<div class="cat__count">'+fmtN(cat.price)+' 🪙</div>';
cHtml+='<div class="cat__description">'+ageLabel+' · '+cat.temper+'</div>';
cHtml+='<div class="cat__actions">';
cHtml+='<button class="text_button text_button--color-green" style="font-size:8px;padding:3px 6px" onclick="ui.actSellCat(\''+cat.id+'\')">Продать</button>';
cHtml+='<button class="text_button text_button--color-blue" style="font-size:8px;padding:3px 6px" onclick="ui.actVitrine(\''+cat.id+'\')">Витрина</button>';
cHtml+='</div></div>';
}
}
if(catsEl)catsEl.innerHTML=cHtml;
var aHtml='';
aHtml+='<button class="own-nurseries__actions-item" onclick="ui.actBuyCat(\'adult\')" title="Купить кота">🐱</button>';
if(actionsEl)actionsEl.innerHTML=aHtml;
};

UI.prototype.renderCity=function(me,room){
var demEl=document.getElementById('city-demand');
var tradeEl=document.getElementById('city-trade');
var dem=room.demand||[];
var dHtml='<div class="demand-board__title">🏙 Городской спрос</div>';
for(var i=0;i<dem.length;i++){
var d=dem[i];
var b=BREED_MAP[d.breed];
dHtml+='<div class="demand-row">';
dHtml+='<span class="demand-emoji">'+(b?b.emoji:'🐱')+'</span>';
dHtml+='<span class="demand-breed">'+(b?b.name:d.breed)+'</span>';
dHtml+='<span class="demand-price">'+fmtN(d.price)+' 🪙</span>';
dHtml+='<span class="demand-count">x'+d.count+'</span>';
dHtml+='</div>';
}
if(demEl)demEl.innerHTML=dHtml;
var vitAll=[];
var players=room.players||{};
var self=this;
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
var tHtml='<div class="demand-board__title">🛒 Магазин игроков</div>';
if(vitAll.length===0){
tHtml+='<div style="color:#666;font-size:.85rem;padding:10px;text-align:center">Пусто</div>';
}else{
for(var i=0;i<vitAll.length;i++){
var v=vitAll[i];
tHtml+='<div class="demand-row"><span class="demand-emoji">'+v.emoji+'</span>';
tHtml+='<span class="demand-breed">'+v.name+' <span style="color:#666;font-size:.7rem">('+v.sellerName+')</span></span>';
tHtml+='<span class="demand-price">'+fmtN(v.price)+' 🪙</span>';
tHtml+='<button class="text_button text_button--color-green" style="padding:4px 10px;font-size:.7rem;width:auto" onclick="ui.actBuyVitrine(\''+v.sellerId+'\',\''+v.id+'\')">Купить</button></div>';
}
}
if(tradeEl)tradeEl.innerHTML=tHtml;
};

UI.prototype.renderBank=function(me,room){
var infoEl=document.getElementById('bank-info');
if(infoEl){
var txt='🏦 <span class="ltd-bank_guarantee__text-bold">Банк</span>';
if(me.loan>0){
txt+='<br>Текущий кредит: <span class="ltd-bank_guarantee__text-bold">'+fmtN(me.loan)+' 🪙</span>';
}else{
txt+='<br>У вас нет кредита';
}
infoEl.innerHTML=txt;
}
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

UI.prototype.selectCat=function(catId){
this._selectedCat=catId;
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

UI.prototype.actVitrine=function(catId){
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

UI.prototype.actBreed=function(houseIdx){
var self=this;
this.net.breedCats(houseIdx).then(function(r){if(r&&r.ok)self.toast('Родилось '+r.count+' котят! 🎉');else if(r&&r.err)self.toast(r.err,2)});
};

UI.prototype.tabBreed=function(){
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
