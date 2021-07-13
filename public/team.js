var socket = io();


var length = document.getElementsByClassName('reply-chat').length;
var messages = document.getElementsByClassName("team-messages")[length-1];
var reply_msg = document.getElementsByClassName('reply-msg')[length-1]
var reply_form = document.getElementsByClassName('reply-chat')[length-1];
var tasks = document.querySelector('tasks');


socket.emit('Team-join',team_name,user_name);

reply_form.addEventListener('submit', (e) => {
	e.preventDefault();
	console.log(e);
    if(reply_msg.value){
    	console.log(reply_msg.value)
        socket.emit('Team-message',reply_msg.value,team_name,user_name);
        reply_msg.value = '';
        
    }
  // if(tasks.value){
  //   	console.log(tasks.value)
        // socket.emit('Team-message',tasks.value,team_name,user_name);
  //       tasks.value = '';
        
  //   }  
});


socket.on('Team-message',(message,user_name) => {
	
	var msg = document.createElement('li');
	msg.textContent = user_name+' : '+message;
	messages.appendChild(msg);
	window.scrollTo(0, document.body.scrollHeight);
});

socket.on('log', function(array) {
  console.log.apply(console, array);
});

socket.on('team-join', (userName,userId) => console.log('new user connected',userName,userId));


