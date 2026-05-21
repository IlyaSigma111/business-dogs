console.log('App starting...');
var net=new Net();
var ui=new UI(net);
window._ui=ui;window._net=net;
ui.init();
console.log('App ready, Firebase:',firebase?firebase.apps.length:'no firebase');
