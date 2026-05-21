class Net{
constructor(){this.roomRef=null;this.myId=null;this.roomCode=null;this.sync=null;this.timerInt=null;this.timerLeft=SEASON_SEC;this._listeners={}}
on(e,fn){(this._listeners[e]=this._listeners[e]||[]).push(fn)}
emit(e,...a){(this._listeners[e]||[]).forEach(f=>f(...a))}

async createRoom(name,role,hostPlay=true){
if(!name||!role)return;
const code=genCode();this.roomCode=code;this.myId='p'+Date.now().toString(36);
const pd={name,role,balance:START_BAL,dogs:{},houses:[],vitrine:{},credits:{},totalE:0,seasonE:0,ready:true,hostPlay,bankrupt:false,utilities:role===ROLE_N?UTIL_NURSERY:UTIL_SHOP,isHost:true};
await DB.ref('rooms/'+code).set({code,season:1,timer:SEASON_SEC,demand:shuffle([...DEMAND_POOL]).slice(0,3),players:{[this.myId]:pd},started:false,createdAt:Date.now()});
this.joinRoom(code,name,role);
}

async joinRoom(code,name,role){
this.roomCode=code;this.myId=this.myId||('p'+Date.now().toString(36));
this.roomRef=DB.ref('rooms/'+code);
const snap=await this.roomRef.get();
if(!snap.exists()){
const isCreator=snap.val()?.players?.[this.myId];
if(!isCreator){const pd={name:name||'Игрок',role:role||ROLE_N,balance:START_BAL,dogs:{},houses:[],vitrine:{},credits:{},totalE:0,seasonE:0,ready:false,hostPlay:false,bankrupt:false,utilities:role===ROLE_N?UTIL_NURSERY:UTIL_SHOP,isHost:false};await this.roomRef.child('players/'+this.myId).set(pd)}
}
this.sync=this.roomRef.on('value',snap=>{
if(!snap.exists())return;
const room=snap.val();
const me=room.players?.[this.myId];
this.emit('state',room,me);
if(room.started&&!this.timerInt){this.timerLeft=room.timer||SEASON_SEC;this.startTimer(room.timer)}
if(!room.started)this.emit('wait',room);
});
this.emit('joined',code);
}

startTimer(initial){
clearInterval(this.timerInt);
this.timerLeft=initial||SEASON_SEC;
this.timerInt=setInterval(()=>{
this.timerLeft--;
this.emit('tick',this.timerLeft);
if(this.timerLeft<=0){clearInterval(this.timerInt);this.emit('seasonEnd')}
},1000);
}

async setReady(v){if(!this.roomRef)return;await this.roomRef.child('players/'+this.myId+'/ready').set(v)}
async setHostPlay(v){if(!this.roomRef)return;await this.roomRef.child('players/'+this.myId+'/hostPlay').set(v)}
async startGame(){if(!this.roomRef)return;await this.roomRef.update({started:true,timer:SEASON_SEC})}

async addHouse(houseIdx){
if(!this.roomRef||!this.myId)return;
const snap=await this.roomRef.get();if(!snap.exists())return;
const room=snap.val();const p=room.players?.[this.myId];if(!p)return;
if(p.balance<100)return{err:'Нужно 100 монет'};
const houses=p.houses||[];
houses.push(makeHouse());
await this.roomRef.child('players/'+this.myId).update({houses,balance:p.balance-100});
return{ok:true};
}

async buyDog(breed,age){
if(!this.roomRef||!this.myId)return;
const snap=await this.roomRef.get();if(!snap.exists())return;
const p=snap.val().players?.[this.myId];if(!p)return;
const b=BREED_MAP[breed];if(!b)return{err:'Нет породы'};
const cost=age===AGE_P?Math.round(b.base*.5):b.base;
if(p.balance<cost)return{err:'Не хватает монет'};
const dog=makeDog(breed,age);
const dogs=p.dogs||{};dogs[dog.id]=dog;
await this.roomRef.child('players/'+this.myId).update({dogs,balance:p.balance-cost});
return{ok:true,dog};
}

async sellDogToCity(dogId){
if(!this.roomRef||!this.myId)return;
const snap=await this.roomRef.get();if(!snap.exists())return;
const room=snap.val();const p=room.players?.[this.myId];if(!p)return;
const dog=p.dogs?.[dogId];if(!dog)return{err:'Нет собаки'};
const dem=room.demand?.find(d=>d.breed===dog.breed);
if(!dem||dem.count<=0)return{err:'Нет спроса на эту породу'};
const price=dog.age===AGE_P?Math.round(dem.price*.5):dem.price;
delete p.dogs[dogId];
const newDem=room.demand.map(d=>d.breed===dog.breed?{...d,count:d.count-1}:d);
await this.roomRef.update({['players/'+this.myId+'/dogs']:p.dogs,['players/'+this.myId+'/balance']:p.balance+price,demand:newDem});
return{ok:true,price};
}

async putVitrine(dogId,price){
if(!this.roomRef||!this.myId)return;
const snap=await this.roomRef.get();if(!snap.exists())return;
const p=snap.val().players?.[this.myId];if(!p)return;
const dog=p.dogs?.[dogId];if(!dog)return{err:'Нет собаки'};
const vit=p.vitrine||{};vit[dogId]={...dog,price:price||dog.price};
delete p.dogs[dogId];
await this.roomRef.child('players/'+this.myId).update({dogs:p.dogs,vitrine:vit});
return{ok:true};
}

async buyFromVitrine(sellerId,dogId){
if(!this.roomRef||!this.myId)return;
const snap=await this.roomRef.get();if(!snap.exists())return;
const room=snap.val();const buyer=room.players?.[this.myId];if(!buyer)return;
const seller=room.players?.[sellerId];if(!seller)return{err:'Продавец не найден'};
const dog=seller.vitrine?.[dogId];if(!dog)return{err:'Собака не найдена'};
if(buyer.balance<dog.price)return{err:'Не хватает монет'};
const buyerDogs=buyer.dogs||{};buyerDogs[dogId]={...dog};
delete seller.vitrine[dogId];
await this.roomRef.update({
['players/'+this.myId+'/dogs']:buyerDogs,
['players/'+this.myId+'/balance']:buyer.balance-dog.price,
['players/'+sellerId+'/vitrine']:seller.vitrine,
['players/'+sellerId+'/balance']:seller.balance+dog.price
});
return{ok:true};
}

async removeVitrine(dogId){
if(!this.roomRef||!this.myId)return;
const snap=await this.roomRef.get();if(!snap.exists())return;
const p=snap.val().players?.[this.myId];if(!p)return;
const dog=p.vitrine?.[dogId];if(!dog)return;
const dogs=p.dogs||{};dogs[dogId]={...dog};delete p.vitrine[dogId];
await this.roomRef.child('players/'+this.myId).update({dogs,vitrine:p.vitrine});
}

async putHouse(dogId,houseIdx,slot){
if(!this.roomRef||!this.myId)return;
const snap=await this.roomRef.get();if(!snap.exists())return;
const room=snap.val();const p=room.players?.[this.myId];if(!p)return;
if(p.role!==ROLE_N)return{err:'Только питомник'};
const house=p.houses?.[houseIdx];if(!house)return{err:'Нет дома'};
const dog=p.vitrine?.[dogId]||p.dogs?.[dogId];if(!dog)return{err:'Нет собаки'};
const slotKey=dog.age===AGE_P?'puppies':'adults';
const target=slot||slotKey;
const maxSlots=target==='adults'?HOUSE_ADULT_WIN:HOUSE_PUPPY_WIN;
if(Object.keys(house[target]||{}).length>=maxSlots)return{err:'Дом полон'};
const hTarget=house[target]||{};hTarget['d'+Object.keys(hTarget).length+1]=dog;
if(p.vitrine?.[dogId])delete p.vitrine[dogId];
if(p.dogs?.[dogId])delete p.dogs[dogId];
await this.roomRef.child('players/'+this.myId).update({houses:p.houses,vitrine:p.vitrine,dogs:p.dogs});
return{ok:true};
}

async breedDogs(houseIdx){
if(!this.roomRef||!this.myId)return;
const snap=await this.roomRef.get();if(!snap.exists())return;
const room=snap.val();const p=room.players?.[this.myId];if(!p)return;
if(p.role!==ROLE_N)return{err:'Только питомник'};
const house=p.houses?.[houseIdx];if(!house)return;
const aCount=Object.keys(house.adults||{}).length;
if(aCount<2)return{err:'Нужно 2+ взрослых'};
const adults=Object.values(house.adults);
const breed=adults[0].breed;
const count=Math.min(3,aCount);
const puppies={};
for(let i=0;i<count;i++){
const pg=makeDog(breed,AGE_P);puppies[pg.id]=pg;
}
const emptyAdults={};
house.adults=emptyAdults;
house.puppies={...house.puppies,...puppies};
await this.roomRef.child('players/'+this.myId+'/houses').set(p.houses);
return{ok:true,count};
}

async endSeason(){
if(!this.roomRef||!this.myId)return;
const snap=await this.roomRef.get();if(!snap.exists())return;
const room=snap.val();
if(room.season>=MAX_SEASONS){await this.roomRef.update({started:false});return}
const next=room.season+1;
const nextDem=shuffle([...DEMAND_POOL]).slice(0,3+Math.floor(next/3));
const p=room.players?.[this.myId];
let seasonE=0;
if(p?.role===ROLE_S){
const vit=p.vitrine||{};
Object.keys(vit).forEach(k=>{seasonE+=vit[k].price||0;vit[k].price=Math.round(vit[k].price*1.1)});
}
await this.roomRef.update({season:next,timer:SEASON_SEC,demand:nextDem,['players/'+this.myId+'/seasonE']:seasonE,['players/'+this.myId+'/vitrine']:p?.vitrine||{}});
}

async sendTrade(toId,offerId,askPrice){
if(!this.roomRef||!this.myId)return;
const snap=await this.roomRef.get();if(!snap.exists())return;
const p=snap.val().players?.[this.myId];if(!p)return;
const dog=p.dogs?.[offerId]||p.vitrine?.[offerId];if(!dog)return;
const trade={id:'t'+Date.now().toString(36),from:this.myId,fromName:p.name,dog,price:askPrice||dog.price,status:'pending',ts:Date.now()};
await DB.ref('rooms/'+this.roomCode+'/trades/'+trade.id).set(trade);
return{ok:true};
}

async respondTrade(tradeId,accept){
if(!this.roomRef)return;
const tradeSnap=await DB.ref('rooms/'+this.roomCode+'/trades/'+tradeId).get();
const trade=tradeSnap.val();if(!trade)return;
if(accept){
const roomSnap=await this.roomRef.get();
const room=roomSnap.val();
const buyer=room.players?.[this.myId];
if(!buyer||buyer.balance<trade.price)return{err:'Не хватает'};
const seller=room.players?.[trade.from];if(!seller)return{err:'Продавец не найден'};
const buyerDogs=buyer.dogs||{};buyerDogs[trade.dog.id]={...trade.dog};
if(seller.vitrine?.[trade.dog.id])delete seller.vitrine[trade.dog.id];
if(seller.dogs?.[trade.dog.id])delete seller.dogs[trade.dog.id];
await this.roomRef.update({
['players/'+this.myId+'/dogs']:buyerDogs,
['players/'+this.myId+'/balance']:buyer.balance-trade.price,
['players/'+trade.from+'/balance']:seller.balance+trade.price,
['trades/'+tradeId+'/status']:'done'
});
}else{
await DB.ref('rooms/'+this.roomCode+'/trades/'+tradeId+'/status').set('rejected');
}
return{ok:true};
}

leaveRoom(){
if(this.roomRef&&this.myId){
this.roomRef.child('players/'+this.myId).remove();
}
if(this.sync)this.roomRef?.off('value',this.sync);
clearInterval(this.timerInt);this.timerInt=null;this.roomRef=null;this.myId=null;
}
}
