class Net{
constructor(){this.roomRef=null;this.myId=null;this.roomCode=null;this.timerInt=null;this.timerLeft=SEASON_SEC;this._listeners={}}
on(e,fn){(this._listeners[e]=this._listeners[e]||[]).push(fn)}
emit(e){(this._listeners[e]||[]).forEach(function(f){f.apply(null,Array.prototype.slice.call(arguments,1))})}

async createRoom(name,role,hostPlay){
if(!name)return{err:'Нет имени'};
var code=genCode();
this.roomCode=code;
this.myId='p'+Date.now().toString(36);
this.roomRef=DB.ref('rooms/'+code);
var pd={name:name,role:role||ROLE_N,balance:START_BAL,cats:{},houses:[],vitrine:{},loan:0,ready:true,hostPlay:hostPlay!==false,isHost:true,bankrupt:false};
try{
await this.roomRef.set({code:code,season:1,timer:SEASON_SEC,demand:shuffle(DEMAND_POOL).slice(0,4),players:{},started:false,createdAt:Date.now()});
await this.roomRef.child('players/'+this.myId).set(pd);
}catch(e){return{err:'Firebase: '+e.message}}
this._startListen(code);
var room={code:code,season:1,timer:SEASON_SEC,demand:shuffle(DEMAND_POOL).slice(0,4),players:{},started:false};
room.players[this.myId]=pd;
this.emit('update',room,room.players[this.myId]);
return{ok:true,code:code};
}

async joinRoom(code,name){
this.roomCode=code;
this.myId=this.myId||('p'+Date.now().toString(36));
this.roomRef=DB.ref('rooms/'+code);
try{
var snap=await this.roomRef.get();
if(!snap.exists())return{err:'Комната не найдена'};
var room=snap.val();
if(!room.players||!room.players[this.myId]){
var role=this._pickRole(room);
var pd={name:name||'Кот',role:role,balance:START_BAL,cats:{},houses:[],vitrine:{},loan:0,ready:false,hostPlay:false,isHost:false,bankrupt:false};
await this.roomRef.child('players/'+this.myId).set(pd);
room.players[this.myId]=pd;
}
}catch(e){return{err:'Ошибка: '+e.message}}
this._startListen(code);
var snap=await this.roomRef.get();
var room=snap.val();
var me=room.players?room.players[this.myId]:null;
this.emit('update',room,me);
return{ok:true,code:code};
}

_pickRole(room){
var players=room.players||{};
var roles={n:0,s:0,b:0};
Object.keys(players).forEach(function(k){
var r=players[k].role;
if(r===ROLE_N)roles.n++;
else if(r===ROLE_S)roles.s++;
else if(r===ROLE_B)roles.b++;
});
if(roles.n<=roles.s&&roles.n<=roles.b)return ROLE_N;
if(roles.s<=roles.b)return ROLE_S;
return ROLE_B;
}

_startListen(code){
var self=this;
this.roomRef.on('value',function(snap){
if(!snap||!snap.exists())return;
var room=snap.val();
if(!room)return;
var me=room.players?room.players[self.myId]:null;
self.emit('update',room,me);
if(room.started&&!self.timerInt){
self.timerLeft=room.timer||SEASON_SEC;
self._runTimer();
}
});
}

_runTimer(){
var self=this;
clearInterval(this.timerInt);
this.timerLeft=this.timerLeft||SEASON_SEC;
this.timerInt=setInterval(function(){
self.timerLeft--;
self.emit('tick',self.timerLeft);
if(self.timerLeft<=0){clearInterval(self.timerInt);self.emit('seasonEnd')}
},1000);
}

async setReady(v){if(!this.roomRef||!this.myId)return;await this.roomRef.child('players/'+this.myId+'/ready').set(v)}
async setHostPlay(v){if(!this.roomRef||!this.myId)return;await this.roomRef.child('players/'+this.myId+'/hostPlay').set(v)}
async startGame(){if(!this.roomRef)return;await this.roomRef.update({started:true,timer:SEASON_SEC})}

async buyCat(breed,age){
if(!this.roomRef||!this.myId)return;
var snap=await this.roomRef.get();if(!snap.exists())return;
var room=snap.val();var p=room.players?room.players[this.myId]:null;if(!p)return;
var b=BREED_MAP[breed];if(!b)return{err:'Нет породы'};
var cost=age===AGE_K?Math.round(b.base*0.6):b.base;
if((p.balance||0)<cost)return{err:'Нужно '+cost+' монет'};
var cat=makeCat(breed,age);
var cats=p.cats||{};cats[cat.id]=cat;
await this.roomRef.child('players/'+this.myId).update({cats:cats,balance:(p.balance||0)-cost});
return{ok:true};
}

async sellCat(catId){
if(!this.roomRef||!this.myId)return;
var snap=await this.roomRef.get();if(!snap.exists())return;
var room=snap.val();var p=room.players?room.players[this.myId]:null;if(!p)return;
var cat=p.cats?p.cats[catId]:null;if(!cat)return{err:'Нет кота'};
var dem=room.demand?room.demand.find(function(d){return d.breed===cat.breed}):null;
if(!dem||dem.count<=0)return{err:'Нет спроса на эту породу'};
var price=cat.age===AGE_K?Math.round(dem.price*0.6):dem.price;
delete p.cats[catId];
var newDem=room.demand.map(function(d){return d.breed===cat.breed?{breed:d.breed,price:d.price,count:d.count-1}:d});
var u={};
u['players/'+this.myId+'/cats']=p.cats;
u['players/'+this.myId+'/balance']=(p.balance||0)+price;
u.demand=newDem;
await this.roomRef.update(u);
return{ok:true,price:price};
}

async putVitrine(catId,price){
if(!this.roomRef||!this.myId)return;
var snap=await this.roomRef.get();if(!snap.exists())return;
var p=snap.val().players?snap.val().players[this.myId]:null;if(!p)return;
var cat=p.cats?p.cats[catId]:null;if(!cat)return{err:'Нет кота'};
var vit=p.vitrine||{};vit[catId]={id:cat.id,breed:cat.breed,emoji:cat.emoji,age:cat.age,temper:cat.temper,price:price||cat.price};
delete p.cats[catId];
await this.roomRef.child('players/'+this.myId).update({cats:p.cats,vitrine:vit});
return{ok:true};
}

async buyVitrine(sellerId,catId){
if(!this.roomRef||!this.myId)return;
var snap=await this.roomRef.get();if(!snap.exists())return;
var room=snap.val();
var buyer=room.players?room.players[this.myId]:null;if(!buyer)return;
var seller=room.players?room.players[sellerId]:null;if(!seller)return{err:'Продавец не найден'};
var cat=seller.vitrine?seller.vitrine[catId]:null;if(!cat)return{err:'Кот не найден'};
if((buyer.balance||0)<cat.price)return{err:'Не хватает монет'};
var bc=buyer.cats||{};bc[catId]={id:cat.id,breed:cat.breed,emoji:cat.emoji,age:cat.age,temper:cat.temper,price:cat.price};
delete seller.vitrine[catId];
var u={};
u['players/'+this.myId+'/cats']=bc;
u['players/'+this.myId+'/balance']=(buyer.balance||0)-cat.price;
u['players/'+sellerId+'/vitrine']=seller.vitrine;
u['players/'+sellerId+'/balance']=(seller.balance||0)+cat.price;
await this.roomRef.update(u);
return{ok:true};
}

async removeVitrine(catId){
if(!this.roomRef||!this.myId)return;
var snap=await this.roomRef.get();if(!snap.exists())return;
var p=snap.val().players?snap.val().players[this.myId]:null;if(!p)return;
var cat=p.vitrine?p.vitrine[catId]:null;if(!cat)return;
var cats=p.cats||{};cats[catId]={id:cat.id,breed:cat.breed,emoji:cat.emoji,age:cat.age,temper:cat.temper,price:cat.price};
delete p.vitrine[catId];
await this.roomRef.child('players/'+this.myId).update({cats:cats,vitrine:p.vitrine});
return{ok:true};
}

async addHouse(){
if(!this.roomRef||!this.myId)return;
var snap=await this.roomRef.get();if(!snap.exists())return;
var p=snap.val().players?snap.val().players[this.myId]:null;if(!p)return;
if((p.balance||0)<HOUSE_PRICE)return{err:'Нужно '+HOUSE_PRICE+' монет'};
var houses=p.houses||[];houses.push(makeHouse());
await this.roomRef.child('players/'+this.myId).update({houses:houses,balance:(p.balance||0)-HOUSE_PRICE});
return{ok:true};
}

async putInHouse(catId,houseIdx){
if(!this.roomRef||!this.myId)return;
var snap=await this.roomRef.get();if(!snap.exists())return;
var p=snap.val().players?snap.val().players[this.myId]:null;if(!p)return;
if(p.role!==ROLE_N)return{err:'Только питомник'};
var house=p.houses?p.houses[houseIdx]:null;if(!house)return{err:'Нет дома'};
var cat=p.cats?p.cats[catId]:null;if(!cat)return{err:'Нет кота'};
var key=cat.age===AGE_K?'kittens':'adults';
var slots=house[key]||{};
if(Object.keys(slots).length>=HOUSE_SLOTS)return{err:'Место полно'};
slots['s'+Object.keys(slots).length+1]=cat;
house[key]=slots;
delete p.cats[catId];
await this.roomRef.child('players/'+this.myId).update({cats:p.cats,houses:p.houses});
return{ok:true};
}

async breedCats(houseIdx){
if(!this.roomRef||!this.myId)return;
var snap=await this.roomRef.get();if(!snap.exists())return;
var p=snap.val().players?snap.val().players[this.myId]:null;if(!p)return;
if(p.role!==ROLE_N)return{err:'Только питомник'};
var house=p.houses?p.houses[houseIdx]:null;if(!house)return{err:'Нет дома'};
var adults=house.adults||{};
var aKeys=Object.keys(adults);
if(aKeys.length<2)return{err:'Нужно 2+ взрослых кота'};
var breed=adults[aKeys[0]].breed;
var count=Math.min(3,aKeys.length);
var kittens=house.kittens||{};
for(var i=0;i<count;i++){
var cat=makeCat(breed,AGE_K);kittens['k'+Date.now().toString(36)+i]=cat;
}
house.adults={};house.kittens=kittens;
await this.roomRef.child('players/'+this.myId+'/houses').set(p.houses);
return{ok:true,count:count};
}

async takeLoan(amount){
if(!this.roomRef||!this.myId)return;
var snap=await this.roomRef.get();if(!snap.exists())return;
var p=snap.val().players?snap.val().players[this.myId]:null;if(!p)return;
if(p.role!==ROLE_B)return{err:'Только банкир'};
if((p.loan||0)+amount>1000)return{err:'Лимит 1000'};
await this.roomRef.child('players/'+this.myId).update({loan:(p.loan||0)+amount,balance:(p.balance||0)+amount});
return{ok:true};
}

async repayLoan(amount){
if(!this.roomRef||!this.myId)return;
var snap=await this.roomRef.get();if(!snap.exists())return;
var p=snap.val().players?snap.val().players[this.myId]:null;if(!p)return;
if((p.loan||0)<=0)return{err:'Нет кредита'};
var repay=Math.min(amount,p.loan);
if((p.balance||0)<repay)return{err:'Не хватает монет'};
await this.roomRef.child('players/'+this.myId).update({loan:(p.loan||0)-repay,balance:(p.balance||0)-repay});
return{ok:true};
}

async endSeason(){
if(!this.roomRef||!this.myId)return;
var snap=await this.roomRef.get();if(!snap.exists())return;
var room=snap.val();
if(room.season>=MAX_SEASONS){await this.roomRef.update({started:false});return}
var next=room.season+1;
var nextDem=shuffle(DEMAND_POOL).slice(0,4+Math.floor(next/4));
var u={season:next,timer:SEASON_SEC,demand:nextDem};
await this.roomRef.update(u);
this.timerLeft=SEASON_SEC;
this._runTimer();
}

leaveRoom(){
var self=this;
if(self.roomRef&&self.myId){
try{self.roomRef.child('players/'+self.myId).remove()}catch(e){}
try{self.roomRef.off('value')}catch(e){}
}
clearInterval(self.timerInt);self.timerInt=null;self.roomRef=null;self.myId=null;self.roomCode=null;
}
}
