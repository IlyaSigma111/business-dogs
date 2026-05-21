class Net{
constructor(){this.roomRef=null;this.myId=null;this.roomCode=null;this.sync=null;this.timerInt=null;this.timerLeft=SEASON_SEC;this._listeners={};this._authReady=false}
on(e,fn){(this._listeners[e]=this._listeners[e]||[]).push(fn)}
emit(e,...a){(this._listeners[e]||[]).forEach(f=>f(...a))}

async _ensureAuth(){
if(this._authReady)return true;
try{
if(firebase.auth&&typeof firebase.auth==='function'){
await firebase.auth().signInAnonymously();
}
this._authReady=true;
return true;
}catch(e){
console.log('Auth skip:',e.message);
this._authReady=true;
return true;
}
}

async createRoom(name,role,hostPlay){
if(!name)return{err:'Нет имени'};
await this._ensureAuth();
var code=genCode();
this.roomCode=code;
this.myId='p'+Date.now().toString(36);
this.roomRef=DB.ref('rooms/'+code);
var pd={name:name,role:role||ROLE_N,balance:START_BAL,dogs:{},houses:[],vitrine:{},credits:{},totalE:0,seasonE:0,ready:true,hostPlay:hostPlay!==false,bankrupt:false,utilities:role===ROLE_N?UTIL_NURSERY:UTIL_SHOP,isHost:true};
try{
console.log('Creating room:',code);
var roomData={code:code,season:1,timer:SEASON_SEC,demand:shuffle([...DEMAND_POOL]).slice(0,3),players:{},started:false,createdAt:Date.now()};
await this.roomRef.set(roomData);
console.log('Room data set');
await this.roomRef.child('players/'+this.myId).set(pd);
console.log('Player data set');
}catch(e){
console.error('Create error:',e);
return{err:'Firebase: '+e.message};
}
this._startListen(code);
var room=roomData;
room.players={};room.players[this.myId]=pd;
this.emit('update',room,pd);
return{ok:true,code:code};
}

async joinRoom(code,name,role){
await this._ensureAuth();
this.roomCode=code;
this.myId=this.myId||('p'+Date.now().toString(36));
this.roomRef=DB.ref('rooms/'+code);
try{
console.log('Joining room:',code);
var snap=await this.roomRef.get();
if(!snap.exists()){
return{err:'Комната не найдена'};
}
var room=snap.val();
if(!room.players?.[this.myId]){
var pd={name:name||'Игрок',role:role||ROLE_N,balance:START_BAL,dogs:{},houses:[],vitrine:{},credits:{},totalE:0,seasonE:0,ready:false,hostPlay:false,bankrupt:false,utilities:role===ROLE_N?UTIL_NURSERY:UTIL_SHOP,isHost:false};
await this.roomRef.child('players/'+this.myId).set(pd);
room.players[this.myId]=pd;
}
}catch(e){
console.error('Join error:',e);
return{err:'Ошибка: '+e.message};
}
this._startListen(code);
var roomSnap=await this.roomRef.get();
var room=roomSnap.val();
var me=room.players?.[this.myId]||null;
this.emit('update',room,me);
return{ok:true,code:code};
}

_startListen(code){
if(!this.roomRef)return;
var self=this;
self.roomRef.on('value',function(snap){
if(!snap||!snap.exists())return;
var room=snap.val();
if(!room)return;
var me=room.players?.[self.myId]||null;
console.log('Listener fired, started:',room.started);
self.emit('update',room,me);
if(room.started&&!self.timerInt){
self.timerLeft=room.timer||SEASON_SEC;
self.startTimer(room.timer);
}
});
}

startTimer(initial){
var self=this;
clearInterval(this.timerInt);
this.timerLeft=initial||SEASON_SEC;
this.timerInt=setInterval(function(){
self.timerLeft--;
self.emit('tick',self.timerLeft);
if(self.timerLeft<=0){clearInterval(self.timerInt);self.emit('seasonEnd')}
},1000);
}

async setReady(v){if(!this.roomRef)return;await this.roomRef.child('players/'+this.myId+'/ready').set(v)}
async setHostPlay(v){if(!this.roomRef)return;await this.roomRef.child('players/'+this.myId+'/hostPlay').set(v)}
async setRole(pid,role){if(!this.roomRef)return;await this.roomRef.child('players/'+pid+'/role').set(role)}
async startGame(){if(!this.roomRef)return;await this.roomRef.update({started:true,timer:SEASON_SEC})}

async addHouse(){
if(!this.roomRef||!this.myId)return;
var snap=await this.roomRef.get();if(!snap.exists())return;
var room=snap.val();var p=room.players?.[this.myId];if(!p)return;
if((p.balance||0)<100)return{err:'Нужно 100 монет'};
var houses=p.houses||[];
houses.push(makeHouse());
await this.roomRef.child('players/'+this.myId).update({houses:houses,balance:(p.balance||0)-100});
return{ok:true};
}

async buyDog(breed,age){
if(!this.roomRef||!this.myId)return;
var snap=await this.roomRef.get();if(!snap.exists())return;
var p=snap.val().players?.[this.myId];if(!p)return;
var b=BREED_MAP[breed];if(!b)return{err:'Нет породы'};
var cost=age===AGE_P?Math.round(b.base*.5):b.base;
if((p.balance||0)<cost)return{err:'Не хватает монет'};
var dog=makeDog(breed,age);
var dogs=p.dogs||{};dogs[dog.id]=dog;
await this.roomRef.child('players/'+this.myId).update({dogs:dogs,balance:(p.balance||0)-cost});
return{ok:true,dog:dog};
}

async sellDogToCity(dogId){
if(!this.roomRef||!this.myId)return;
var snap=await this.roomRef.get();if(!snap.exists())return;
var room=snap.val();var p=room.players?.[this.myId];if(!p)return;
var dog=p.dogs?.[dogId];if(!dog)return{err:'Нет собаки'};
var dem=room.demand?.find(function(d){return d.breed===dog.breed});
if(!dem||dem.count<=0)return{err:'Нет спроса'};
var price=dog.age===AGE_P?Math.round(dem.price*.5):dem.price;
delete p.dogs[dogId];
var newDem=room.demand.map(function(d){return d.breed===dog.breed?{...d,count:d.count-1}:d});
var u={};
u['players/'+this.myId+'/dogs']=p.dogs;
u['players/'+this.myId+'/balance']=(p.balance||0)+price;
u.demand=newDem;
await this.roomRef.update(u);
return{ok:true,price:price};
}

async putVitrine(dogId,price){
if(!this.roomRef||!this.myId)return;
var snap=await this.roomRef.get();if(!snap.exists())return;
var p=snap.val().players?.[this.myId];if(!p)return;
var dog=p.dogs?.[dogId];if(!dog)return{err:'Нет собаки'};
var vit=p.vitrine||{};vit[dogId]={...dog,price:price||dog.price};
delete p.dogs[dogId];
await this.roomRef.child('players/'+this.myId).update({dogs:p.dogs,vitrine:vit});
return{ok:true};
}

async buyFromVitrine(sellerId,dogId){
if(!this.roomRef||!this.myId)return;
var snap=await this.roomRef.get();if(!snap.exists())return;
var room=snap.val();var buyer=room.players?.[this.myId];if(!buyer)return;
var seller=room.players?.[sellerId];if(!seller)return{err:'Продавец не найден'};
var dog=seller.vitrine?.[dogId];if(!dog)return{err:'Собака не найдена'};
if((buyer.balance||0)<dog.price)return{err:'Не хватает монет'};
var buyerDogs=buyer.dogs||{};buyerDogs[dogId]={...dog};
delete seller.vitrine[dogId];
var u={};
u['players/'+this.myId+'/dogs']=buyerDogs;
u['players/'+this.myId+'/balance']=(buyer.balance||0)-dog.price;
u['players/'+sellerId+'/vitrine']=seller.vitrine;
u['players/'+sellerId+'/balance']=(seller.balance||0)+dog.price;
await this.roomRef.update(u);
return{ok:true};
}

async removeVitrine(dogId){
if(!this.roomRef||!this.myId)return;
var snap=await this.roomRef.get();if(!snap.exists())return;
var p=snap.val().players?.[this.myId];if(!p)return;
var dog=p.vitrine?.[dogId];if(!dog)return;
var dogs=p.dogs||{};dogs[dogId]={...dog};delete p.vitrine[dogId];
await this.roomRef.child('players/'+this.myId).update({dogs:dogs,vitrine:p.vitrine});
}

async putHouse(dogId,houseIdx,slot){
if(!this.roomRef||!this.myId)return;
var snap=await this.roomRef.get();if(!snap.exists())return;
var room=snap.val();var p=room.players?.[this.myId];if(!p)return;
if(p.role!==ROLE_N)return{err:'Только питомник'};
var house=p.houses?.[houseIdx];if(!house)return{err:'Нет дома'};
var dog=p.vitrine?.[dogId]||p.dogs?.[dogId];if(!dog)return{err:'Нет собаки'};
var slotKey=dog.age===AGE_P?'puppies':'adults';
var target=slot||slotKey;
var maxSlots=target==='adults'?HOUSE_ADULT_WIN:HOUSE_PUPPY_WIN;
if(Object.keys(house[target]||{}).length>=maxSlots)return{err:'Дом полон'};
var hTarget=house[target]||{};hTarget['d'+Object.keys(hTarget).length+1]=dog;
if(p.vitrine?.[dogId])delete p.vitrine[dogId];
if(p.dogs?.[dogId])delete p.dogs[dogId];
await this.roomRef.child('players/'+this.myId).update({houses:p.houses,vitrine:p.vitrine,dogs:p.dogs});
return{ok:true};
}

async breedDogs(houseIdx){
if(!this.roomRef||!this.myId)return;
var snap=await this.roomRef.get();if(!snap.exists())return;
var room=snap.val();var p=room.players?.[this.myId];if(!p)return;
if(p.role!==ROLE_N)return{err:'Только питомник'};
var house=p.houses?.[houseIdx];if(!house)return;
var aCount=Object.keys(house.adults||{}).length;
if(aCount<2)return{err:'Нужно 2+ взрослых'};
var adults=Object.values(house.adults);
var breed=adults[0].breed;
var count=Math.min(3,aCount);
var puppies={};
for(var i=0;i<count;i++){
var pg=makeDog(breed,AGE_P);puppies[pg.id]=pg;
}
house.adults={};
house.puppies={...house.puppies,...puppies};
await this.roomRef.child('players/'+this.myId+'/houses').set(p.houses);
return{ok:true,count:count};
}

async endSeason(){
if(!this.roomRef||!this.myId)return;
var snap=await this.roomRef.get();if(!snap.exists())return;
var room=snap.val();
if(room.season>=MAX_SEASONS){await this.roomRef.update({started:false});return}
var next=room.season+1;
var nextDem=shuffle([...DEMAND_POOL]).slice(0,3+Math.floor(next/3));
var p=room.players?.[this.myId];
var seasonE=0;
if(p?.role===ROLE_S){
var vit=p.vitrine||{};
Object.keys(vit).forEach(function(k){seasonE+=vit[k].price||0;vit[k].price=Math.round(vit[k].price*1.1)});
}
var u={};
u.season=next;
u.timer=SEASON_SEC;
u.demand=nextDem;
u['players/'+this.myId+'/seasonE']=seasonE;
u['players/'+this.myId+'/vitrine']=p?.vitrine||{};
await this.roomRef.update(u);
}

async sendTrade(toId,offerId,askPrice){
if(!this.roomRef||!this.myId)return;
var snap=await this.roomRef.get();if(!snap.exists())return;
var p=snap.val().players?.[this.myId];if(!p)return;
var dog=p.dogs?.[offerId]||p.vitrine?.[offerId];if(!dog)return;
var trade={id:'t'+Date.now().toString(36),from:this.myId,fromName:p.name,dog:dog,price:askPrice||dog.price,status:'pending',to:toId,ts:Date.now()};
await DB.ref('rooms/'+this.roomCode+'/trades/'+trade.id).set(trade);
return{ok:true};
}

async respondTrade(tradeId,accept){
if(!this.roomRef)return;
var tradeSnap=await DB.ref('rooms/'+this.roomCode+'/trades/'+tradeId).get();
var trade=tradeSnap.val();if(!trade)return;
if(accept){
var roomSnap=await this.roomRef.get();
var room=roomSnap.val();
var buyer=room.players?.[this.myId];
if(!buyer||(buyer.balance||0)<trade.price)return{err:'Не хватает'};
var seller=room.players?.[trade.from];if(!seller)return{err:'Продавец не найден'};
var buyerDogs=buyer.dogs||{};buyerDogs[trade.dog.id]={...trade.dog};
if(seller.vitrine?.[trade.dog.id])delete seller.vitrine[trade.dog.id];
if(seller.dogs?.[trade.dog.id])delete seller.dogs[trade.dog.id];
var u={};
u['players/'+this.myId+'/dogs']=buyerDogs;
u['players/'+this.myId+'/balance']=(buyer.balance||0)-trade.price;
u['players/'+trade.from+'/balance']=(seller.balance||0)+trade.price;
u['trades/'+tradeId+'/status']='done';
await this.roomRef.update(u);
}else{
await DB.ref('rooms/'+this.roomCode+'/trades/'+tradeId+'/status').set('rejected');
}
return{ok:true};
}

leaveRoom(){
var self=this;
if(self.roomRef&&self.myId){
try{self.roomRef.child('players/'+self.myId).remove()}catch(e){}
}
if(self.sync&&self.roomRef){try{self.roomRef.off('value',self.sync)}catch(e){}}
clearInterval(self.timerInt);self.timerInt=null;self.roomRef=null;self.myId=null;self.roomCode=null;
}
}
