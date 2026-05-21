const BREEDS=[
{id:'corgi',name:'Корги',emoji:'🐕',base:15,icon:'🐕'},
{id:'husky',name:'Хаски',emoji:'🐺',base:25,icon:'🐺'},
{id:'poodle',name:'Пудель',emoji:'🐩',base:35,icon:'🐩'},
{id:'bulldog',name:'Бульдог',emoji:'🐶',base:50,icon:'🐶'}
];
const BREED_MAP={};BREEDS.forEach(b=>BREED_MAP[b.id]=b);
const ROLE_N='nursery';const ROLE_S='shop';
const AGE_P='puppy';const AGE_A='adult';
const START_BAL=200;const SEASON_SEC=300;const MAX_SEASONS=12;const MAX_PLAYERS=10;
const HOUSE_ADULT_WIN=4;const HOUSE_PUPPY_WIN=6;
const UTIL_NURSERY=['🏠','🐕','🔨'];const UTIL_SHOP=['🏪','📦','🚚'];
const DEMAND_POOL=[
{breed:'corgi',count:3,price:20,icon:'🐕'},
{breed:'husky',count:2,price:30,icon:'🐺'},
{breed:'poodle',count:2,price:40,icon:'🐩'},
{breed:'bulldog',count:1,price:55,icon:'🐶'}
];
const DOG_NAMES=['Бобик','Шарик','Рекс','Тузик','Мухтар','Жучка','Барон','Бим','Каспер','Лорд','Тимка','Гром','Арчи','Чарли','Спарк','Бакс','Джек','Тоби','Макс','Бадди','Дейзи','Луна','Белла','Рокси','Молли','Сэди','Грейс','Зося','Боня','Тесса','Барни','Фрэд','Гектор','Зевс','Тор','Один','Лoki','Бруно','Дюк','Ричи'];
function genName(){return DOG_NAMES[Math.floor(Math.random()*DOG_NAMES.length)]}
function makeDog(breed,age,id){
const b=BREED_MAP[breed];const mult=age===AGE_P?.5:1;
return{id:id||Date.now().toString(36)+Math.random().toString(36).slice(2,6),breed,name:b.name,emoji:b.icon,age,price:Math.round(b.base*mult),level:1};
}
function makeHouse(id){return{adults:{},puppies:{},id:id||'h'+Date.now().toString(36)}}
function genCode(){return String(Math.floor(100000+Math.random()*900000))}
function fmtT(s){const m=Math.floor(s/60);const sec=s%60;return m+':'+(sec<10?'0':'')+sec}
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
