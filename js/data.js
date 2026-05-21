const BREEDS=[
{id:'british',name:'Британец',emoji:'🐱',base:30},
{id:'mainecoon',name:'Мейн-кун',emoji:'🐈',base:50},
{id:'siamese',name:'Сиамский',emoji:'😺',base:40},
{id:'sphynx',name:'Сфинкс',emoji:'🐈‍⬛',base:60},
{id:'persian',name:'Персидский',emoji:'🐾',base:45},
{id:'scottish',name:'Шотландский',emoji:'😸',base:35}
];
const BREED_MAP={};BREEDS.forEach(function(b){BREED_MAP[b.id]=b});
const ROLE_N='nursery';const ROLE_S='shop';
const AGE_K='kitten';const AGE_A='adult';
const START_BAL=300;const SEASON_SEC=300;const MAX_SEASONS=12;
const HOUSE_SLOTS=4;const HOUSE_PRICE=150;
const DEMAND_POOL=[
{breed:'british',price:35,count:4},
{breed:'mainecoon',price:55,count:2},
{breed:'siamese',price:45,count:3},
{breed:'sphynx',price:65,count:2},
{breed:'persian',price:50,count:2},
{breed:'scottish',price:40,count:3}
];
const CAT_NAMES=['Бонифаций','Полосатый','Любимец','Мурзик','Леопольд','Том','Матильда','Гарфилд','Симба','Матроскин','Феликс','Котофей','Мурка','Барсик','Рыжик','Пушок','Снежок','Кузя','Васька','Масик','Тишка','Бублик','Зефир','Пират','Граф','Лорд','Султан','Барон','Шарик','Тимоша'];
function genName(){return CAT_NAMES[Math.floor(Math.random()*CAT_NAMES.length)]}
function makeCat(breed,age){
var b=BREED_MAP[breed];if(!b)return null;
var mult=age===AGE_K?0.6:1;
var temps=['Ласковый','Игривый','Спокойный','Гордый','Шаловливый','Нежный'];
return{id:Date.now().toString(36)+Math.random().toString(36).slice(2,6),breed:breed,name:b.name,emoji:b.emoji,age:age,temper:temps[Math.floor(Math.random()*temps.length)],price:Math.round(b.base*mult)};
}
function makeHouse(){return{adults:{},kittens:{},id:'h'+Date.now().toString(36)}}
function genCode(){return String(Math.floor(100000+Math.random()*900000))}
function fmtT(s){var m=Math.floor(s/60);var sec=s%60;return m+':'+(sec<10?'0':'')+sec}
function shuffle(a){var arr=a.slice();for(var i=arr.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=arr[i];arr[i]=arr[j];arr[j]=t}return arr}
function fmtN(n){return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g,' ')}
