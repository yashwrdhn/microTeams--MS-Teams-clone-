const express = require('express');
const app = express();
const server = require('http').createServer(app);
const Server = require('socket.io');
const io = Server(server);
const { v4:uuidV4 } = require('uuid');

var formidable = require('formidable');
var bodyParser = require('body-parser');

const fs = require('fs');
const database = require('./database');

app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
})); 



app.set('views','./views');
app.set('view engine','ejs');

app.use(express.static(__dirname+'/public'));
app.use('/js', express.static(__dirname + '/node_modules/bootstrap/dist/js')); 

app.use('/css', express.static(__dirname + '/node_modules/bootstrap/dist/css')); 
app.use('/icons', express.static(__dirname + '/node_modules/bootstrap-icons/icons')); 

app.get('/', (req, res) => {
	res.render('Home',{user:database.users[0],notes:database.notes});
});


// app.post('/signin', (req, res) => {
//   var found=false;
//   database.users.forEach(user => {
//     console.log(user);
//     const {email,password} = user;
//     if(req.body.email === email && req.body.password === password){
//       found = true;
//       res.json("success");
//   }
//   });
//   if(!found){
//     res.status(400).json('error logging in');
//   }
// });

// app.post('/signup', (req, res) => {
//   database.users.push(req.body);
//   res.json(database.users); 
// });



app.post('/', (req,res) => {
  console.log(req.body);
  var room = req.body.room;
  // res.send('request received');
  res.redirect(`/rooms/${room}`);
});

app.get('/rooms', (req, res) => {
  res.redirect(`/rooms/${uuidV4()}`);
});

app.get('/rooms/:room', (req,res) => {
  res.render('Room',{roomId:req.params.room});
  console.log(req.params.room);
});


app.get('/teams/:team',(req,res) => {
    var team = req.params.team;
    console.log(database.conversations);
    res.render("Team.ejs",{team:team,assignments:database.assignments,posts:database.conversations})
});

app.get('/teamWhiteboard', (req,res) => {
  console.log('whiteboard is on');
  // res.send('hi');
  res.render("WhiteboardforTeam");
});


app.get('archives/:meet', (req,res) => {
    var meet = req.params.meet;
    res.send(`Recording of ${meet} can be found here`);
});

app.post('/join-meet',(req, res) => {
  
  res.redirect(`/rooms/${req.body.room}`);
  
});

app.post('/join-team',(req, res) => {
  var found=false;
  database.teams.forEach( team => {
    if(team.name == req.body.team){
      found=true;
      res.redirect(`/teams/${req.body.team}`);
    }
  });
  if(!found){
    res.json('team doesnt exist');
  }
  
});

app.post('/create-team',(req, res) => {
  console.log(req.body)
  database.teams.push({id:database.teams.length+1,name:req.body.team,members:'anonymous'});
  res.redirect(`/teams/${req.body.team}`);
});



app.post('/contact',(req, res) => {
  console.log('/contact',req.body);
  res.send('got it');
});

app.post('/new-note',(req, res) => {
  console.log(req.body);
  var {title, text} = req.body;
  database.notes.push(req.body);
  res.redirect('/');
});


app.post('/teams/new-assignment',(req, res) => {
  console.log(req.body);
  const {team,name,tasks} = req.body;
  var assign = {
    id:1101 + database.assignments.length,
    team:team,
    tasks:tasks,
    name:name
  }
  database.assignments.push(assign);
  // res.json(database.assignments);
  
  
  res.redirect(`/teams/${team}`); 
});

app.post('/teams/new-discussion',(req, res) => {
  console.log(req.body);
  const {team,title,message} = req.body;
  var assign = {
    id:1201 + database.conversations.length,
    team:team,
    title:title,
    message:message
  }
  database.conversations.push(assign);
  res.redirect(`/teams/${team}`); 
});


app.post('/files', function (req, res){
    var form = new formidable.IncomingForm();
    form.parse(req);
    form.on('fileBegin', function (name, file){
      file.path = __dirname + '/uploads/' + file.name;
    });
    form.on('file', function (name, file){
      console.log('Uploaded ' + file.name);
    });
    res.send('file recieved');
});

//////////////////////////////////////////////////////////////


var messages = [];


///////////////////////////////////////////////////////////////

io.on('connection', (socket)=>{
    


    function log() {
        
        var array = ['Message from server:'];
        array.push.apply(array, arguments);
        socket.emit('log', array);
    }

  

    socket.on('message', function(message) {
      log('Client said: ', message);
      socket.broadcast.emit('message', message);
    });


    socket.on('create or join', function(room) {
      log('Received request to create or join room ' + room);

      
      let numClients = 0;
      if (io.sockets.adapter.rooms.has(room)) numClients = io.sockets.adapter.rooms.get(room).size;
      log('Room ' + room + ' now has ' + numClients + ' client(s)');

      if (numClients === 0) {
        socket.join(room);
        log('Client ID ' + socket.id + ' created room ' + room);
        socket.emit('created', room, socket.id);

      } else if (numClients == 1 ) {
        log('Client ID ' + socket.id + ' joined room ' + room);
        io.sockets.in(room).emit('join', room);
        socket.join(room);
        socket.emit('joined', room, socket.id);
        io.sockets.in(room).emit('ready');
      } else { // max two clients
        socket.emit('full', room);
      }
    });

    socket.on('disconnect', () => {
      console.log('1 user left ');
    });

    socket.on('camera-on',room => {
      console.log('remote camera is on');
      socket.to(room).emit('camera-on');
    });
    socket.on('camera-off',room => {
       console.log('remote camera is off');
      socket.to(room).emit('camera-off');
    });
    socket.on('mic-on', room => {
      console.log('remote user is  unmuted');
      socket.to(room).emit('mic-on');
    });
    socket.on('mic-off', room => {
      console.log('remote user is  muted');
      socket.to(room).emit('mic-off');
    });

    socket.on('drawing', (data) => socket.broadcast.emit('drawing', data));
    socket.on('ipaddr', function() {
      var ifaces = os.networkInterfaces();
      for (var dev in ifaces) {
        ifaces[dev].forEach(function(details) {
          if (details.family === 'IPv4' && details.address !== '127.0.0.1') {
            socket.emit('ipaddr', details.address);
          }
        });
      }
    });

    socket.on('bye', function(){
      console.log('received bye');
      // socket.to(room).emit('chat-msg','bot',`${user} has left the meeting`);
    });

    ////////////////////////////////////////////////////

    socket.on('Team-join',(Team,userName) => {
      socket.join(Team, (err) => console.log(err));
      io.to(Team).emit('team-join',userName,socket.id);
      log(`user ${userName} has joined the team ${Team} successfully`);
    });

    socket.on('Team-message', (message,Team,userName) => {
      console.log(message);
      io.to(Team).emit('Team-message',message,userName);
    });

    //////////////////////////////////////////////////////
    socket.on('join-room',(room,user) => {
      socket.join(room);
      io.to(room).emit('chat-msg','bot',`${user} has joined`);
      console.log('user joined',room);
    }); 

    socket.on('chat',(message,room,user) => {
      
      io.to(room).emit('chat-msg',user,message);
      console.log(user,':',message);
    }); 
       
   

});


let port = process.env.PORT;
if (port == null || port == "") {
  port = 8000;
}


server.listen(port, () => {console.log('listening on port ',port)});