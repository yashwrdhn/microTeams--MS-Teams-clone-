
var socket = io();

var input = document.getElementById('input');
var form = document.getElementById('form');

var room_name = ROOM_ID;
var user_name = window.prompt('enter username');


form.addEventListener('submit', (e) => {
    e.preventDefault();
    if(input.value){
        socket.emit('chat',input.value,room_name,user_name);
        input.value = '';
    }
});

console.log('joining room:',room_name);
socket.emit('join-room',room_name,user_name);    

socket.on('hello',(greeting,chat) => {
    console.log(greeting);
    console.log(chat);
    chat.map( x => {
        console.log(x);
        var item = document.createElement('li');
        item.textContent =  x[0]+':'+x[1];
        messages.appendChild(item);
        window.scrollTo(0, document.body.scrollHeight);
    });

});


socket.on('chat', function(msg,user) {
var item = document.createElement('li');
item.textContent = user + ':' + msg;
messages.appendChild(item);
window.scrollTo(0, document.body.scrollHeight);
});



