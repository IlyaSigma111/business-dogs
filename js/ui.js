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
this.net.on('update',function(room,me){
self.state=room;self.me=me;
if(!room)return;
var codeEl=document.getElementById('d-code');
if(codeEl&&self.net.roomCode)codeEl.textContent=self.net.roomCode;
if(room.started){
self.showScreen('scr-game');
self.buildStreet();
}else{
self.showScreen('scr-wait');
}
self.renderWait();
self.renderInside();
self._updateBalance(me);
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
this._initConnStatus();
};

UI.prototype._initConnStatus=function(){
var self=this;
var el=document.getElementById('conn-status');
if(!el)return;
var update=function(){
if(self.net.connected){
el.className='conn-status online';
el.textContent='Online';
}else{
el.className='conn-status offline';
el.textContent='Offline';
}
};
update();
setInterval(update,2000);
};

UI.prototype._updateBalance=function(me){
var el=document.getElementById('tb-balance');
if(!el||!me)return;
var newVal=fmtN(me.balance||0);
if(el.textContent!==newVal){
el.textContent=newVal;
el.classList.remove('balance-pulse');
void el.offsetWidth;
el.classList.add('balance-pulse');
}
};

UI.prototype.goStreet=function(){
var self=this;
var sv=document.getElementById('street-view');
var ivs=document.querySelectorAll('.inside-view');
sv.classList.add('fade-out');
setTimeout(function(){
for(var i=0;i<ivs.length;i++)ivs[i].classList.remove('active');
sv.style.display='';
sv.classList.remove('fade-out');
self.view='street';
document.getElementById('btn-home').classList.add('hidden');
self.buildStreet();
},300);
};

UI.prototype.enterBldg=function(uuid,role){
var sv=document.getElementById('street-view');
var ivs=document.querySelectorAll('.inside-view');
var target=role===ROLE_S?'inside-shop':'inside-nursery';
var el=document.getElementById(target);
sv.classList.add('fade-out');
var self=this;
setTimeout(function(){
sv.style.display='none';
sv.classList.remove('fade-out');
for(var i=0;i<ivs.length;i++)ivs[i].classList.remove('active');
if(el)el.classList.add('active');
self.view=uuid;
document.getElementById('btn-home').classList.remove('hidden');
self.renderInside();
},300);
};

UI.prototype.buildStreet=function(){
var room=this.state;if(!room||!room.players)return;
var players=room.players;
var pids=Object.keys(players);
var nurRow=document.getElementById('nurseries-row');
var shpRow=document.getElementById('shops-row');
var nurHtml='';
var shpHtml='';
var myId=this.net.myId;
for(var i=0;i<pids.length;i++){
var p=players[pids[i]];if(!p)continue;
var isN=p.role===ROLE_N;
var emoji=isN?'🏠':'🏪';
var cls='bldg'+(isN?' bldg--nursery':' bldg--shop');
if(pids[i]===myId)cls+=' bldg--own';
if(!p.active)cls+=' bldg--bankrupt';
var onclick="ui.enterBldg('"+pids[i]+"','"+p.role+"')";
var bldg='<div class="'+cls+'" onclick="'+onclick+'"><div class="bldg__inner"><div class="bldg__img">'+emoji+'</div><div class="bldg__name">'+(p.name||'Кот')+'</div></div></div>';
if(isN)nurHtml+=bldg;
else shpHtml+=bldg;
}
if(nurRow)nurRow.innerHTML=nurHtml;
if(shpRow)shpRow.innerHTML=shpHtml;
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
html+='<div class="p-card" style="animation:cardIn .3s ease '+(.05*i)+'s both">';
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

UI.prototype.renderInside=function(){
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
if(me.role===ROLE_N)this.renderNursery(me,room);
else this.renderShop(me,room);
this.renderCity(me,room);
this.renderBank(me,room);
};

UI.prototype.renderNursery=function(me,room){
var housesEl=document.getElementById('nur-houses');
var catsEl=document.getElementById('nur-cats');
var actionsEl=document.getElementById('nur-actions');
var houses=me.houses||[];
var cats=me.cats||{};
var catKeys=Object.keys(cats);
var bal=me.balance||0;
var hHtml='<div style="display:flex;flex-wrap:wrap;gap:8px;width:100%">';
if(houses.length===0){
hHtml+='<div style="width:100%;text-align:center;padding:16px;background:rgba(253,246,238,.15);border-radius:10px"><div style="color:#fdf6ee;font-size:.85rem">Нет домов</div><button class="text_button text_button--color-green" style="margin-top:8px;font-size:10px;padding:4px 12px" onclick="ui.actAddHouse()">🏠 Купить дом ('+fmtN(HOUSE_PRICE)+'🪙)</button></div>';
}else{
for(var i=0;i<houses.length;i++){
var h=houses[i];
var aKeys=Object.keys(h.adults||{});
var kCount=Object.keys(h.kittens||{}).length;
var free=HOUSE_SLOTS-aKeys.length;
hHtml+='<div class="house-card" style="flex:1;min-width:200px;max-width:300px"><div style="font-weight:700;font-size:.8rem;color:#fdf6ee;text-transform:uppercase;margin-bottom:6px">🏠 Дом '+(i+1)+' <span style="font-weight:400;font-size:.7rem">('+aKeys.length+'/'+HOUSE_SLOTS+')</span>';
if(kCount>0)hHtml+=' · <span style="color:#ffd700">Котята: '+kCount+'</span>';
hHtml+='</div>';
hHtml+='<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin-bottom:6px">';
for(var j=0;j<HOUSE_SLOTS;j++){
if(j<aKeys.length){
hHtml+='<div style="background:#fdf6ee;border-radius:6px;min-height:44px;display:flex;align-items:center;justify-content:center;font-size:1.4rem;box-shadow:inset 0 1px 3px rgba(0,0,0,.1)">'+h.adults[aKeys[j]].emoji+'</div>';
}else{
hHtml+='<div style="background:rgba(253,246,238,.2);border-radius:6px;min-height:44px;display:flex;align-items:center;justify-content:center;font-size:1.2rem;color:rgba(253,246,238,.3);border:1px dashed rgba(253,246,238,.3)">·</div>';
}
}
hHtml+='</div>';
if(kCount>0){
hHtml+='<button class="text_button text_button--color-green" style="width:100%;font-size:10px;padding:6px" onclick="ui.actBreed('+i+')">💘 Разведение</button>';
}
if(free>0&&catKeys.length>0){
hHtml+='<div style="margin-top:4px;font-size:.7rem;color:rgba(253,246,238,.7);text-align:center">'+free+' мест свободно</div>';
}
hHtml+='</div>';
}
}
hHtml+='</div>';
if(housesEl)housesEl.innerHTML=hHtml;
var cHtml='<div style="font-weight:700;font-size:.85rem;color:#fdf6ee;text-transform:uppercase;padding:6px 0;margin-bottom:4px">🐱 Коты без дома ('+catKeys.length+')</div><div style="display:flex;flex-wrap:wrap;gap:8px;width:100%">';
if(catKeys.length===0){
cHtml+='<div style="width:100%;text-align:center;padding:16px;background:rgba(253,246,238,.1);border-radius:10px;color:rgba(253,246,238,.5);font-size:.85rem">Нет котов. Купите кота!</div>';
}else{
for(var i=0;i<catKeys.length;i++){
var cat=cats[catKeys[i]];
var ageLabel=cat.age===AGE_K?'Щенок':'Взрослый';
cHtml+='<div class="cat" onclick="ui.selectCat(\''+cat.id+'\')">';
cHtml+='<div class="cat__image" style="font-size:2.2rem">'+cat.emoji+'</div>';
cHtml+='<div style="text-align:center"><div class="cat__count">'+fmtN(cat.price)+' 🪙</div><div class="cat__description">'+ageLabel+' · '+cat.temper+'</div></div>';
cHtml+='<div class="cat__actions">';
cHtml+='<button class="text_button text_button--color-green" style="font-size:9px;padding:4px 8px" onclick="event.stopPropagation();ui.actSellCat(\''+cat.id+'\')">Продать</button>';
if(houses.length>0){
cHtml+='<button class="text_button text_button--color-purple" style="font-size:9px;padding:4px 8px" onclick="event.stopPropagation();ui.actPutHouse(\''+cat.id+'\')">В дом</button>';
}
cHtml+='<button class="text_button text_button--color-blue" style="font-size:9px;padding:4px 8px" onclick="event.stopPropagation();ui.actVitrine(\''+cat.id+'\')">Витрина</button>';
cHtml+='</div></div>';
}
}
cHtml+='</div>';
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
var bal=me.balance||0;
var cHtml='<div style="display:flex;flex-wrap:wrap;gap:8px;width:100%">';
if(catKeys.length===0){
cHtml+='<div style="width:100%;text-align:center;padding:20px;background:#fdf6ee;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.08)"><div style="color:#666;font-size:.9rem;margin-bottom:8px">У вас пока нет котов</div><button class="text_button text_button--color-green" style="font-size:11px;padding:6px 14px" onclick="ui.actBuyCat(\'adult\')">🐱 Купить кота</button></div>';
}else{
for(var i=0;i<catKeys.length;i++){
var cat=cats[catKeys[i]];
var ageLabel=cat.age===AGE_K?'Щенок':'Взрослый';
cHtml+='<div class="cat" onclick="ui.selectCat(\''+cat.id+'\')">';
cHtml+='<div class="cat__image" style="font-size:2.2rem">'+cat.emoji+'</div>';
cHtml+='<div style="text-align:center"><div class="cat__count">'+fmtN(cat.price)+' 🪙</div><div class="cat__description">'+ageLabel+' · '+cat.temper+'</div></div>';
cHtml+='<div class="cat__actions">';
cHtml+='<button class="text_button text_button--color-green" style="font-size:9px;padding:4px 8px" onclick="event.stopPropagation();ui.actSellCat(\''+cat.id+'\')">Продать</button>';
cHtml+='<button class="text_button text_button--color-blue" style="font-size:9px;padding:4px 8px" onclick="event.stopPropagation();ui.actVitrine(\''+cat.id+'\')">Витрина</button>';
cHtml+='</div></div>';
}
}
cHtml+='</div>';
if(catsEl)catsEl.innerHTML=cHtml;
var aHtml='<button class="own-nurseries__actions-item" onclick="ui.actBuyCat(\'adult\')" title="Купить кота">🐱</button>';
if(actionsEl)actionsEl.innerHTML=aHtml;
};

UI.prototype.renderCity=function(me,room){
var demEl=document.getElementById('city-demand');
var tradeEl=document.getElementById('city-trade');
var dem=room.demand||[];
var dHtml='<div style="display:flex;flex-direction:column;gap:4px">';
for(var i=0;i<dem.length;i++){
var d=dem[i];
var b=BREED_MAP[d.breed];
var canSell=me.cats&&Object.keys(me.cats).some(function(k){return me.cats[k].breed===d.breed});
dHtml+='<div class="demand-row" style="border-radius:8px;margin-bottom:2px">';
dHtml+='<span class="demand-emoji">'+(b?b.emoji:'🐱')+'</span>';
dHtml+='<div style="flex:1"><span class="demand-breed">'+(b?b.name:d.breed)+'</span><span class="demand-count" style="margin-left:6px">x'+d.count+'</span></div>';
dHtml+='<span class="demand-price">'+fmtN(d.price)+' 🪙</span>';
if(canSell&&d.count>0){
dHtml+='<button class="text_button text_button--color-green" style="padding:4px 10px;font-size:9px;width:auto" onclick="ui._sellToDemand(\''+d.breed+'\')">Продать</button>';
}
dHtml+='</div>';
}
dHtml+='</div>';
if(demEl)demEl.innerHTML=dHtml;
var vitAll=[];
var players=room.players||{};
var self=this;
Object.keys(players).forEach(function(k){
if(k!==ui.net.myId){
var p=players[k];
if(!p||!p.active)return;
var vit=p.vitrine||{};
Object.keys(vit).forEach(function(vk){
var vc=vit[vk];
vitAll.push({id:vc.id,sellerId:k,sellerName:p.name,emoji:vc.emoji,name:vc.breed,price:vc.price});
});
}
});
var tHtml='<div style="display:flex;flex-direction:column;gap:4px">';
if(vitAll.length===0){
tHtml+='<div style="color:#666;font-size:.85rem;padding:12px;text-align:center">Пусто — никто ничего не продаёт</div>';
}else{
for(var i=0;i<vitAll.length;i++){
var v=vitAll[i];
var canBuy=(me.balance||0)>=v.price;
tHtml+='<div class="demand-row" style="border-radius:8px;margin-bottom:2px"><span class="demand-emoji">'+v.emoji+'</span>';
tHtml+='<div style="flex:1"><span class="demand-breed">'+v.name+'</span><span style="color:#666;font-size:.7rem;margin-left:4px">('+v.sellerName+')</span></div>';
tHtml+='<span class="demand-price">'+fmtN(v.price)+' 🪙</span>';
tHtml+='<button class="text_button text_button--color-green" style="padding:4px 10px;font-size:9px;width:auto'+(canBuy?'':' own-nurseries__actions-item--disabled')+'" onclick="'+(canBuy?'ui.actBuyVitrine(\''+v.sellerId+'\',\''+v.id+'\')':'')+'">Купить</button></div>';
}
}
tHtml+='</div>';
if(tradeEl)tradeEl.innerHTML=tHtml;
};

UI.prototype._sellToDemand=function(breed){
var self=this;
var cats=this.me?this.me.cats||{}:{};
var catId=null;
Object.keys(cats).forEach(function(k){if(!catId&&cats[k].breed===breed)catId=k});
if(!catId)return this.toast('Нет кота породы '+breed,2);
this.actSellCat(catId);
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
var self=this;
var breeds=Object.keys(BREED_MAP);
var breedList=breeds.map(function(b){return BREED_MAP[b].emoji+' '+BREED_MAP[b].name}).join(', ');
this.showModal('Купить кота','<p style="margin-bottom:12px"><b>Возраст:</b> '+((age==='kitten')?'Щенок':'Взрослый')+'</p><p style="margin-bottom:8px"><b>Доступные породы:</b></p><div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-bottom:12px">'+breeds.map(function(b){var br=BREED_MAP[b];return '<button class="text_button text_button--color-purple" style="padding:6px 10px;font-size:11px" onclick="ui._confirmBreed=\''+b+'\';ui.hideModal();ui._doBuyCat(\''+age+'\')">'+br.emoji+' '+br.name+'</button>'}).join('')+'</div>',null);
};

UI.prototype._doBuyCat=function(age){
if(!this._confirmBreed)return;
var breed=this._confirmBreed;
if(!BREED_MAP[breed])return this.toast('Нет породы',2);
var self=this;
this.net.buyCat(breed,age).then(function(r){if(r&&r.err)self.toast(r.err,2);else if(r&&r.ok)self.toast('Куплен!')});
this._confirmBreed=null;
};

UI.prototype.actSellCat=function(catId){
var self=this;
var cat=(this.me&&this.me.cats)?this.me.cats[catId]:null;
if(!cat)return this.toast('Кот не найден',2);
var dem=(this.state&&this.state.demand)?this.state.demand.find(function(d){return d.breed===cat.breed}):null;
if(!dem||dem.count<=0)return this.toast('Нет спроса на '+cat.name,2);
var price=cat.age===AGE_K?Math.round(dem.price*0.6):dem.price;
this.showModal('Продать кота','<p>'+cat.emoji+' <b>'+cat.name+'</b></p><p style="margin:8px 0">Цена: <b>'+fmtN(price)+' 🪙</b></p>',function(){
self.net.sellCat(catId).then(function(r){if(r&&r.ok)self.toast('Продано за '+fmtN(r.price)+'🪙');else if(r&&r.err)self.toast(r.err,2)});
});
};

UI.prototype.actVitrine=function(catId){
var self=this;
var cat=(this.me&&this.me.cats)?this.me.cats[catId]:null;
if(!cat)return this.toast('Кот не найден',2);
this.showModal('На витрину','<p>'+cat.emoji+' <b>'+cat.name+'</b></p><div style="margin:12px 0;display:flex;align-items:center;justify-content:center;gap:8px"><label style="color:#1a1a1a;font-weight:700">Цена:</label><div class="number-input-wrapper"><input id="vit-price" class="number-input" style="font-size:16px;min-height:28px" value="'+cat.price+'" inputmode="numeric"></div></div>',function(){
var priceEl=document.getElementById('vit-price');
var price=priceEl?parseInt(priceEl.value):0;
if(price<=0)return self.toast('Укажи цену',1);
self.net.putVitrine(catId,price).then(function(r){if(r&&r.ok)self.toast('На витрину');else if(r&&r.err)self.toast(r.err,2)});
});
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
var bal=this.me?this.me.balance||0:0;
if(bal<HOUSE_PRICE)return this.toast('Нужно '+HOUSE_PRICE+' монет',2);
this.showModal('Купить дом','<p>Стоимость: <b>'+fmtN(HOUSE_PRICE)+' 🪙</b></p><p style="color:#666;font-size:.85rem;margin-top:8px">В доме '+HOUSE_SLOTS+' мест для котов</p>',function(){
self.net.addHouse().then(function(r){if(r&&r.ok)self.toast('Дом куплен!');else if(r&&r.err)self.toast(r.err,2)});
});
};

UI.prototype.actPutHouse=function(catId){
var self=this;
var houses=this.me?this.me.houses||[]:[];
if(houses.length===0)return this.toast('Нет домов',1);
var cat=(this.me&&this.me.cats)?this.me.cats[catId]:null;
if(!cat)return this.toast('Кот не найден',2);
var html='<p>'+cat.emoji+' <b>'+cat.name+'</b></p><p style="margin:10px 0;font-size:.85rem">Выбери дом:</p><div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center">';
for(var i=0;i<houses.length;i++){
var h=houses[i];
var aCount=Object.keys(h.adults||{}).length;
var kCount=Object.keys(h.kittens||{}).length;
var free=HOUSE_SLOTS-aCount;
var disabled=free<=0?'own-nurseries__actions-item--disabled':'';
html+='<button class="own-nurseries__actions-item '+disabled+'" onclick="'+(free>0?'ui._doPutHouse(\''+catId+'\','+i+');ui.hideModal()':'')+'" title="Дом '+(i+1)+': '+aCount+'/'+HOUSE_SLOTS+' · '+free+' мест">'+(i+1)+'</button>';
}
html+='</div>';
this.showModal('Поселить кота',html,null);
};

UI.prototype._doPutHouse=function(catId,houseIdx){
var self=this;
this.net.putInHouse(catId,houseIdx).then(function(r){if(r&&r.ok)self.toast('Кот в доме');else if(r&&r.err)self.toast(r.err,2)});
};

UI.prototype.actBreed=function(houseIdx){
var self=this;
this.net.breedCats(houseIdx).then(function(r){if(r&&r.ok)self.toast('Родилось '+r.count+' котят! 🎉');else if(r&&r.err)self.toast(r.err,2)});
};

UI.prototype.tabBreed=function(){
var self=this;
var houses=this.me?this.me.houses||[]:[];
if(houses.length===0)return this.toast('Нет домов',1);
var html='<p style="margin-bottom:10px;font-size:.85rem">Выбери дом для разведения:</p><div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center">';
for(var i=0;i<houses.length;i++){
var h=houses[i];
var aCount=Object.keys(h.adults||{}).length;
var aKeys=Object.keys(h.adults||{});
var canBreed=aCount>=2;
var disabled=canBreed?'':'own-nurseries__actions-item--disabled';
var adults=aKeys.slice(0,2).map(function(k){return h.adults[k].emoji}).join('');
html+='<button class="own-nurseries__actions-item '+disabled+'" onclick="'+(canBreed?'ui._doBreed('+i+');ui.hideModal()':'')+'" title="Дом '+(i+1)+': '+aCount+' взрослых">'+(canBreed?adults:'🚫')+'</button>';
}
html+='</div>';
this.showModal('Разведение',html,null);
};

UI.prototype._doBreed=function(houseIdx){
var self=this;
this.net.breedCats(houseIdx).then(function(r){if(r&&r.ok)self.toast('Родилось '+r.count+' котят! 🎉');else if(r&&r.err)self.toast(r.err,2)});
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
