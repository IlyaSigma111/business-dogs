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
var self=this;
this.net.on('update',function(room,me){
self.state=room;
self.me=me;
if(room.started){
document.getElementById('d-code').textContent=self.net.roomCode||'';
self.showScreen('scr-game');
}else{
document.getElementById('d-code').textContent=self.net.roomCode||'';
self.showScreen('scr-wait');
}
self.renderWait(room);
self.renderGame();
});
}

async doCreate(){
var name=genName();
var role=Math.random()<0.4?ROLE_S:ROLE_N;
this.toast('Создаём комнату ('+name+')...');
var r=await this.net.createRoom(name,role,true);
if(r&&r.err)return this.toast(r.err,1);
}

async doJoin(){
var code=document.getElementById('inp-code').value.trim();
if(!code)return this.toast('Введи код!',1);
var name=genName();
this.toast('Входим ('+name+')...');
var r=await this.net.joinRoom(code,name);
if(r&&r.err)return this.toast(r.err,1);
}

showScreen(id){
document.querySelectorAll('.scr').forEach(function(s){s.classList.remove('active')});
document.getElementById(id).classList.add('active');
}

copyCode(){
if(navigator.clipboard){navigator.clipboard.writeText(this.net.roomCode).then(()=>this.toast('Скопировано!'))}
}

toast(msg,sec){
sec=sec||2;
var el=document.getElementById('toast');
if(!el)return;
el.textContent=msg;el.classList.add('show');
var self=this;
clearTimeout(this._tout);
this._tout=setTimeout(function(){el.classList.remove('show')},sec*1000);
}

closeModal(){document.getElementById('modal').classList.remove('show')}

leaveRoom(){
this.net.leaveRoom();
this.state=null;this.me=null;
this.showScreen('scr-lobby');
this.toast('Покинули комнату');
}

renderWait(room){
var listEl=document.getElementById('wait-players');
var btnStart=document.getElementById('btn-start');
var chkReady=document.getElementById('chk-ready');
var cntEl=document.getElementById('r-cnt');
var totEl=document.getElementById('r-tot');
var hostCtrl=document.getElementById('host-controls');
var hcList=document.getElementById('hc-list');
if(!room||!room.players){
if(listEl)listEl.innerHTML='<p>Загрузка...</p>';
return;
}
var players=room.players;
var keys=Object.keys(players);
var readyCount=0;
var total=keys.length;
var html='';
var hcHtml='';
var self=this;
keys.forEach(function(k){
var p=players[k];
if(!p)return;
var pName=p.name||'Игрок';
var pRole=p.role||ROLE_N;
var isReady=p.ready===true;
var isHost=p.isHost===true;
var balance=p.balance||0;
var bankrupt=p.bankrupt===true;
if(isReady)readyCount++;
var roleIcon=pRole===ROLE_S?'💰':'🏠';
var readyClass=isReady?'r-on':'r-off';
var hostBadge=isHost?'<span class="h-badge">👑</span>':'';
var bankBadge=bankrupt?'<span class="b-badge">💀 Банкрот</span>':'';
html+='<div class="w-card">';
html+='<div class="w-main"><div class="w-avatar">'+roleIcon+' '+pName+'</div>'+hostBadge+bankBadge+'</div>';
html+='<div class="w-meta"><span class="'+readyClass+'">Готов</span><span>💰 '+balance+'</span></div>';
html+='</div>';
hcHtml+='<div class="hc-row"><span>'+pName+'</span><span class="role-toggle" data-pid="'+k+'">Сменить</span></div>';
});
if(listEl)listEl.innerHTML=html;
if(cntEl)cntEl.textContent=readyCount;
if(totEl)totEl.textContent=total;
if(hostCtrl){
var me=players[self.net.myId];
hostCtrl.style.display=(me&&me.isHost)?'block':'none';
}
if(hcList)hcList.innerHTML=hcHtml;
document.querySelectorAll('.role-toggle').forEach(function(el){
el.onclick=function(){
var pid=this.getAttribute('data-pid');
var cur=players[pid];
var newRole=cur.role===ROLE_S?ROLE_N:ROLE_S;
self.net.setRole(pid,newRole);
};
});
if(btnStart){
var me=players[this.net.myId];
btnStart.style.display=(me&&me.isHost&&!room.started)?'block':'none';
btnStart.disabled=readyCount<2;
}
if(chkReady){
var me=players[this.net.myId];
chkReady.checked=me?me.ready===true:false;
}
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
if(!left||!main)return;
var demand=room.demand||[];
var demHtml=demand.map(function(d){
return'<div class="d-card"><b>'+d.breed+'</b><br>'+d.price+'💰<br>x'+d.count+'</div>';
}).join('');
left.innerHTML='<h3>Спрос</h3>'+demHtml;
if(me.role===ROLE_S){
main.innerHTML='<h3>Магазин</h3><p>Купите дом для витрины.</p><button class="l-btn primary" onclick="ui.actBuyHouse()">🏠 Купить дом (100💰)</button>';
this.renderShopVitrine(main,me);
}else{
main.innerHTML='<h3>Питомник</h3><p>Покупайте собак, продавайте в город.</p><button class="l-btn primary" onclick="ui.actBuyDog()">🐶 Купить щенка</button>';
this.renderMyDogs(main,me);
}
var vit=me.vitrine||{};
var vitKeys=Object.keys(vit);
var vitHtml=vitKeys.length===0?'<p class="hint">Пусто</p>':vitKeys.map(function(k){
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
var breed=prompt('Порода ('+Object.keys(BREED_MAP).join(', ')+')?');
if(!breed||!BREED_MAP[breed])return self.toast('Нет породы',1);
var age=prompt('Возраст (0=щенок, 1=взрослый)?');
age=parseInt(age)||0;
var b=BREED_MAP[breed];
var cost=age===AGE_P?Math.round(b.base*0.5):b.base;
if(me.balance<cost)return self.toast('Не хватает монет ('+cost+')',1);
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
html+='<div class="d-card"><b>'+d.breed+'</b><br>Возраст: '+(d.age===AGE_P?'Щенок':'Взрослый')+'<br>Характер: '+d.temper+'<br><button class="l-btn s" onclick="ui.actSellDog(\''+k+'\')">Продать</button></div>';
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
if(k!==self.net.myId)others.push(players[k]);
});
if(others.length===0){el.innerHTML='<h3>Торговля</h3><p class="hint">Нет других игроков</p>';return}
var html='<h3>Торговля</h3>';
others.forEach(function(p){
html+='<div class="t-row"><span>'+p.name+'</span><button class="l-btn s" onclick="ui.sendTrade(\''+self.net.myId+'\',\''+p.id+'\')">Предложить сделку</button></div>';
});
el.innerHTML=html;
}

sendTrade(fromId,toId){
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
el.innerHTML='<h3>Банк</h3><p>В разработке</p>';
}
}
