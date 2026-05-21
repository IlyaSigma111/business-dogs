class UI{
constructor(net){this.net=net;this.state=null;this.me=null;this.tab='main'}
init(){
var self=this;
var el;

el=document.getElementById('btn-create');
if(el)el.onclick=function(){self.doCreate()};

el=document.getElementById('btn-join');
if(el)el.onclick=function(){self.doJoin()};

el=document.getElementById('btn-copy');
if(el)el.onclick=function(){self.copyCode()};

el=document.getElementById('btn-start');
if(el)el.onclick=function(){self.net.startGame()};

el=document.getElementById('btn-leave');
if(el)el.onclick=function(){self.leaveRoom()};

el=document.getElementById('btn-end-season');
if(el)el.onclick=function(){self.net.endSeason()};

el=document.getElementById('m-x');
if(el)el.onclick=function(){self.closeModal()};

el=document.getElementById('btn-restart');
if(el)el.onclick=function(){self.leaveRoom()};

el=document.getElementById('chk-ready');
if(el)el.onchange=function(e){self.net.setReady(e.target.checked)};

el=document.getElementById('chk-host-play');
if(el)el.onchange=function(e){self.net.setHostPlay(e.target.checked)};

document.querySelectorAll('.bnav').forEach(function(b){
b.onclick=function(){
document.querySelectorAll('.bnav').forEach(function(x){x.classList.remove('active')});
b.classList.add('active');
self.tab=b.dataset.tab;
self.renderGame();
};
});

this.net.on('update',function(room,me){
try{
console.log('UI update event, started:',room?room.started:'no room');
self.state=room;
self.me=me;
if(!room){console.log('No room data');return}
var codeEl=document.getElementById('d-code');
if(codeEl&&self.net.roomCode)codeEl.textContent=self.net.roomCode;
console.log('Before showScreen, roomCode:',self.net.roomCode);
if(room.started){
self.showScreen('scr-game');
}else{
self.showScreen('scr-wait');
}
console.log('After showScreen');
console.log('Calling renderWait...');
try{self.renderWait(room)}catch(e){console.error('renderWait error:',e.message,e.stack)}
console.log('Calling renderGame...');
try{self.renderGame()}catch(e){console.error('renderGame error:',e.message,e.stack)}
}catch(e){
console.error('update handler error:',e.message,e.stack);
}
});
console.log('UI init done');
}

async doCreate(){
var name=genName();
var role=Math.random()<0.4?ROLE_S:ROLE_N;
console.log('doCreate called, name:',name);
this.toast('Создаём комнату ('+name+')...');
try{
var r=await this.net.createRoom(name,role,true);
console.log('createRoom result:',r);
if(r&&r.err){this.toast(r.err,3);return}
if(!r){this.toast('Ошибка создания комнаты',3);return}
}catch(e){
console.error('doCreate error:',e);
this.toast('Ошибка: '+e.message,3);
}
}

async doJoin(){
var code=document.getElementById('inp-code').value.trim();
if(!code)return this.toast('Введи код!',1);
var name=genName();
console.log('doJoin called, code:',code,'name:',name);
this.toast('Входим ('+name+')...');
try{
var r=await this.net.joinRoom(code,name);
console.log('joinRoom result:',r);
if(r&&r.err){this.toast(r.err,3);return}
if(!r){this.toast('Ошибка входа',3);return}
}catch(e){
console.error('doJoin error:',e);
this.toast('Ошибка: '+e.message,3);
}
}

showScreen(id){
try{
console.log('showScreen:',id);
var screens=document.querySelectorAll('.screen');
console.log('Found',screens.length,'screens');
screens.forEach(function(s,i){
console.log('Screen',i,':',s.id,s.className);
s.classList.remove('active');
});
var el=document.getElementById(id);
console.log('Target screen:',el?el.id:'NOT FOUND');
if(el)el.classList.add('active');
else console.error('Screen not found:',id);
}catch(e){
console.error('showScreen error:',e.message,e.stack);
}
}

copyCode(){
var self=this;
if(navigator.clipboard){
navigator.clipboard.writeText(this.net.roomCode).then(function(){self.toast('Скопировано!')});
}
}

toast(msg,sec){
sec=sec||2;
var el=document.getElementById('toast');
if(!el)return;
el.textContent=msg;el.classList.remove('hidden');el.classList.add('show');
var self=this;
clearTimeout(this._tout);
this._tout=setTimeout(function(){el.classList.remove('show');el.classList.add('hidden')},sec*1000);
}

closeModal(){
var el=document.getElementById('modal');
if(el)el.classList.add('hidden');
}

leaveRoom(){
this.net.leaveRoom();
this.state=null;this.me=null;
this.showScreen('scr-lobby');
this.toast('Покинули комнату');
}

renderWait(room){
console.log('=== renderWait START ===');
if(!room){console.log('no room');return}
var players=room.players||{};
var keys=Object.keys(players);
console.log('players:',keys.length);
var listEl=document.getElementById('wait-players');
var cntEl=document.getElementById('r-cnt');
var totEl=document.getElementById('r-tot');
var btnStart=document.getElementById('btn-start');
var chkReady=document.getElementById('chk-ready');
var myId=this.net.myId;
console.log('myId:',myId);
var html='';
var readyCount=0;
keys.forEach(function(k){
var p=players[k];
if(!p)return;
var n=p.name||'Игрок';
var r=p.role||'nursery';
var isR=p.ready===true;
var isH=p.isHost===true;
var bal=p.balance||0;
if(isR)readyCount++;
html+='<div class="w-card"><div class="w-main">'+(r==='shop'?'💰':'🏠')+' '+n+'</div>';
if(isH)html+='<span class="h-badge">👑</span>';
html+='<div class="w-meta"><span style="color:'+(isR?'green':'gray')+'">'+(isR?'✓':'✗')+'</span><span>'+bal+'</span></div></div>';
});
console.log('generated html len:',html.length);
if(listEl)listEl.innerHTML=html;
else console.error('wait-players not found');
if(cntEl)cntEl.textContent=readyCount;
if(totEl)totEl.textContent=keys.length;
if(btnStart){
var me=players[myId];
btnStart.style.display=(me&&me.isHost)?'block':'none';
btnStart.disabled=readyCount<2;
}
if(chkReady){
var me=players[myId];
chkReady.checked=me?me.ready===true:false;
}
console.log('=== renderWait END ===');
}

renderGame(){
if(!this.state)return;
var room=this.state;
var me=room.players?.[this.net.myId]||{};
var nameEl=document.getElementById('tb-name');
var roleEl=document.getElementById('tb-role');
var balEl=document.getElementById('tb-balance');
var seaEl=document.getElementById('tb-season');
if(nameEl)nameEl.textContent=me.name||'Игрок';
if(roleEl)roleEl.textContent=me.role===ROLE_S?'Магазин':'Питомник';
if(balEl)balEl.textContent=me.balance||0;
if(seaEl)seaEl.textContent=room.season||1;
if(this.tab==='main')this.renderMain(room,me);
if(this.tab==='mydogs')this.renderDogs(room,me);
if(this.tab==='city')this.renderCity(room,me);
if(this.tab==='trade')this.renderTrade(room,me);
if(this.tab==='breed')this.renderBreed(room,me);
if(this.tab==='bank')this.renderBank(room,me);
}

renderMain(room,me){
var left=document.getElementById('left-content');
var main=document.getElementById('main-view');
var right=document.getElementById('right-content');
if(!main)return;
var demand=room.demand||[];
var demHtml='<h3>Спрос</h3>'+demand.map(function(d){
return'<div class="d-card"><b>'+d.breed+'</b><br>'+d.price+'💰<br>x'+d.count+'</div>';
}).join('');
if(left)left.innerHTML=demHtml;
if(me.role===ROLE_S){
main.innerHTML='<h3>Магазин</h3><p>Купите дом для витрины.</p><button class="l-btn primary" onclick="ui.actBuyHouse()">🏠 Купить дом (100💰)</button>';
this.renderShopVitrine(main,me);
}else{
main.innerHTML='<h3>Питомник</h3><p>Покупайте собак, продавайте в город.</p><button class="l-btn primary" onclick="ui.actBuyDog()">🐶 Купить щенка</button>';
this.renderMyDogs(main,me);
}
var vit=me.vitrine||{};
var vitKeys=Object.keys(vit);
var vitHtml=vitKeys.length===0?'<p class="hint">Витрина пуста</p>':vitKeys.map(function(k){
var d=vit[k];
return'<div class="d-row"><b>'+d.breed+'</b> - '+d.price+'💰 <button class="l-btn s" onclick="ui.removeVitrine(\''+k+'\')">Снять</button></div>';
}).join('');
if(right)right.innerHTML='<h3>Витрина</h3>'+vitHtml;
}

renderShopVitrine(parent,me){
var vit=me.vitrine||{};
var vitKeys=Object.keys(vit);
if(vitKeys.length===0)return;
var html='<h4>Витрина</h4>';
vitKeys.forEach(function(k){
var d=vit[k];
html+='<div class="d-row"><b>'+d.breed+'</b> - '+d.price+'💰 <button class="l-btn s" onclick="ui.removeVitrine(\''+k+'\')">Снять</button></div>';
});
parent.innerHTML+=html;
}

renderMyDogs(parent,me){
var dogs=me.dogs||{};
var keys=Object.keys(dogs);
if(keys.length===0)return;
var html='<h4>Мои собаки</h4>';
keys.forEach(function(k){
var d=dogs[k];
var ageLbl=d.age===AGE_P?'Щенок':'Взрослый';
html+='<div class="d-row"><b>'+d.breed+'</b> '+ageLbl+' <button class="l-btn s" onclick="ui.actSellDog(\''+k+'\')">Продать</button></div>';
});
parent.innerHTML+=html;
}

actBuyDog(){
var self=this;
var room=self.state;
if(!room)return;
var me=room.players?.[self.net.myId]||{};
var breed=prompt('Порода ('+Object.keys(BREED_MAP).join(', ')+')?');
if(!breed||!BREED_MAP[breed])return self.toast('Нет породы',1);
var age=prompt('Возраст (0=щенок, 1=взрослый)?');
age=parseInt(age)||0;
var b=BREED_MAP[breed];
var cost=age===AGE_P?Math.round(b.base*0.5):b.base;
if((me.balance||0)<cost)return self.toast('Не хватает монет ('+cost+')',1);
self.net.buyDog(breed,age).then(function(r){if(r&&r.err)self.toast(r.err,2)});
}

actSellDog(dogId){
var self=this;
self.net.sellDogToCity(dogId).then(function(r){
if(r&&r.ok)self.toast('Продано за '+r.price+'💰');
else if(r&&r.err)self.toast(r.err,2);
});
}

actBuyHouse(){
var self=this;
self.net.addHouse().then(function(r){if(r&&r.err)self.toast(r.err,2)});
}

removeVitrine(dogId){
this.net.removeVitrine(dogId);
}

renderDogs(room,me){
var el=document.getElementById('main-view');
if(!el)return;
var dogs=me.dogs||{};
var keys=Object.keys(dogs);
if(keys.length===0){el.innerHTML='<h3>Мои собаки</h3><p class="hint">Нет собак</p>';return}
var html='<h3>Мои собаки</h3>';
keys.forEach(function(k){
var d=dogs[k];
html+='<div class="d-card"><b>'+d.breed+'</b><br>Возраст: '+(d.age===AGE_P?'Щенок':'Взрослый')+'<br>Характер: '+(d.temper||'-')+'<br><button class="l-btn s" onclick="ui.actSellDog(\''+k+'\')">Продать</button></div>';
});
el.innerHTML=html;
}

renderCity(room,me){
var el=document.getElementById('main-view');
if(!el)return;
var demand=room.demand||[];
var html='<h3>Городской спрос</h3>';
html+='<div class="d-grid">'+demand.map(function(d){
return'<div class="d-card"><b>'+d.breed+'</b><br>'+d.price+'💰<br>x'+d.count+'</div>';
}).join('')+'</div>';
el.innerHTML=html;
}

renderTrade(room,me){
var el=document.getElementById('main-view');
if(!el)return;
var players=room.players||{};
var others=[];
var self=this;
Object.keys(players).forEach(function(k){
if(k!==self.net.myId)others.push({id:k,name:players[k].name});
});
if(others.length===0){el.innerHTML='<h3>Торговля</h3><p class="hint">Нет других игроков</p>';return}
var html='<h3>Торговля</h3>';
others.forEach(function(p){
html+='<div class="t-row"><span>'+p.name+'</span><button class="l-btn s" onclick="ui.sendTrade(\''+p.id+'\')">Предложить сделку</button></div>';
});
el.innerHTML=html;
}

sendTrade(toId){
var self=this;
var dogId=prompt('ID собаки?');
if(!dogId)return;
var price=prompt('Цена?');
price=parseInt(price)||0;
self.net.sendTrade(toId,dogId,price).then(function(r){
if(r&&r.ok)self.toast('Предложение отправлено');
else if(r&&r.err)self.toast(r.err,2);
});
}

renderBreed(room,me){
var el=document.getElementById('main-view');
if(!el)return;
if(me.role!==ROLE_N){el.innerHTML='<h3>Разведение</h3><p class="hint">Только питомник</p>';return}
var houses=me.houses||[];
if(houses.length===0){el.innerHTML='<h3>Разведение</h3><p class="hint">Нет домов</p>';return}
var html='<h3>Разведение</h3>';
houses.forEach(function(h,i){
var adults=Object.keys(h.adults||{}).length;
var pups=Object.keys(h.puppies||{}).length;
html+='<div class="h-card"><b>Дом '+(i+1)+'</b><br>Взрослых: '+adults+', Щенков: '+pups;
html+='<br><button class="l-btn s" onclick="ui.actBreed('+i+')">🐾 Развести</button></div>';
});
el.innerHTML=html;
}

actBreed(houseIdx){
var self=this;
self.net.breedDogs(houseIdx).then(function(r){
if(r&&r.ok)self.toast('Родилось '+r.count+' щенков!');
else if(r&&r.err)self.toast(r.err,2);
});
}

renderBank(room,me){
var el=document.getElementById('main-view');
if(!el)return;
el.innerHTML='<h3>Банк</h3><p class="hint">В разработке</p>';
}
}
