'use strict';

var isChannelReady = false;
var isInitiator = false;
var isStarted = false;
var localStream;

var pc;
var remoteStream;
var turnReady;
var sender;
var track;
var pcConfig = {
  'iceServers': [{
    'urls': 'stun:stun.l.google.com:19302'
  }]
};

// Set up audio and video regardless of what devices are present.

var sdpConstraints = {
  offerToReceiveAudio: true,
  offerToReceiveVideo: true
};

/////////////////////////////////////////////

var room = ROOM_ID;
// Could prompt for room name:
// room = prompt('Enter room name:');

var socket = io.connect();

if (room !== '') {
  socket.emit('create or join', room);
  console.log('Attempted to create or  join room', room);
}

socket.on('created', function(room) {
  console.log('Created room ' + room);
  isInitiator = true;
});

socket.on('full', function(room) {
  console.log('Room ' + room + ' is full');
});

socket.on('join', function (room){
  console.log('Another peer made a request to join room ' + room);
  console.log('This peer is the initiator of room ' + room + '!');
  isChannelReady = true;
});

socket.on('joined', function(room) {
  console.log('joined: ' + room);
  isChannelReady = true;
});

socket.on('log', function(array) {
  console.log.apply(console, array);
});

////////////////////////////////////////////////

function sendMessage(message) {
  console.log('Client sending message: ', message);
  socket.emit('message', message);
  // socket.emit('chat-msg',room_name,user_name);
}

// This client receives a message
socket.on('message', function(message) {
  console.log('Client received message:', message);
  if (message === 'got user media') {
    maybeStart();
  } else if (message.type === 'offer') {
    if (!isInitiator && !isStarted) {
      maybeStart();
    }
    pc.setRemoteDescription(new RTCSessionDescription(message)); 
    doAnswer();
  } else if (message.type === 'answer' && isStarted) {
    pc.setRemoteDescription(new RTCSessionDescription(message));
  } else if (message.type === 'candidate' && isStarted) {
    var candidate = new RTCIceCandidate({
      sdpMLineIndex: message.label,
      candidate: message.candidate
    });
    pc.addIceCandidate(candidate);
  } else if (message === 'bye' && isStarted) {
    handleRemoteHangup();
  }
});

////////////////////////////////////////////////////


navigator.mediaDevices.getUserMedia({
  audio: true,
  video: true,
})
.then(gotStream)
.catch(function(e) {
  alert('getUserMedia() error: ' + e.name);
});

function gotStream(stream) {
  console.log('Adding local stream.');

  track = stream.getVideoTracks()[0];
  // sender = pc.addTrack(track, event.stream,)
  
  localStream = stream;
  localVideo.srcObject = stream;
  localVideo.muted = true;
  sendMessage('got user media');
  if (isInitiator) {
    maybeStart();
  }

}

var constraints = {
  video: true
};

console.log('Getting user media with constraints', constraints);

if (location.hostname !== 'localhost') {
  requestTurn(
    'https://computeengineondemand.appspot.com/turn?username=41784574&key=4080218913'
  );
}

function maybeStart() {
  console.log('>>>>>>> maybeStart() ', isStarted, localStream, isChannelReady);
  if (!isStarted && typeof localStream !== 'undefined' && isChannelReady) {
    console.log('>>>>>> creating peer connection');
    createPeerConnection();
    // sender = pc.addTrack(track,localStream);
    pc.addStream(localStream);
    isStarted = true;
    console.log('isInitiator', isInitiator);
    if (isInitiator) {
      doCall();
    }
  }
}

window.onbeforeunload = function() {
  sendMessage('bye');
};

/////////////////////////////////////////////////////////

function createPeerConnection() {
  try {
    pc = new RTCPeerConnection(null);
    pc.onicecandidate = handleIceCandidate;
    pc.onaddstream = handleRemoteStreamAdded;
    pc.onremovestream = handleRemoteStreamRemoved;
    console.log('Created RTCPeerConnnection');
    screenBtn.disabled = false;
    hangupBtn.disabled = false;
  } catch (e) {
    console.log('Failed to create PeerConnection, exception: ' + e.message);
    alert('Cannot create RTCPeerConnection object.');
    return;
  }
}

function handleIceCandidate(event) {
  console.log('icecandidate event: ', event);
  if (event.candidate) {
    sendMessage({
      type: 'candidate',
      label: event.candidate.sdpMLineIndex,
      id: event.candidate.sdpMid,
      candidate: event.candidate.candidate
    });
  } else {
    console.log('End of candidates.');
  }
}

function handleCreateOfferError(event) {
  console.log('createOffer() error: ', event);
}

function doCall() {
  console.log('Sending offer to peer');
  pc.createOffer(setLocalAndSendMessage, handleCreateOfferError);
}

function doAnswer() {
  console.log('Sending answer to peer.');
  pc.createAnswer().then(
    setLocalAndSendMessage,
    onCreateSessionDescriptionError
  );
}

function setLocalAndSendMessage(sessionDescription) {
  pc.setLocalDescription(sessionDescription);
  console.log('setLocalAndSendMessage sending message', sessionDescription);
  sendMessage(sessionDescription);
}

function onCreateSessionDescriptionError(error) {
  trace('Failed to create session description: ' + error.toString());
}

function requestTurn(turnURL) {
  var turnExists = false;
  for (var i in pcConfig.iceServers) {
    if (pcConfig.iceServers[i].urls.substr(0, 5) === 'turn:') {
      turnExists = true;
      turnReady = true;
      break;
    }
  }
  if (!turnExists) {
    console.log('Getting TURN server from ', turnURL);
    // No TURN server. Get one from computeengineondemand.appspot.com:
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4 && xhr.status === 200) {
        var turnServer = JSON.parse(xhr.responseText);
        console.log('Got TURN server: ', turnServer);
        pcConfig.iceServers.push({
          'urls': 'turn:' + turnServer.username + '@' + turnServer.turn,
          'credential': turnServer.password
        });
        turnReady = true;
      }
    };
    xhr.open('GET', turnURL, true);
    xhr.send();
  }
}



function handleRemoteStreamAdded(event) {
  console.log('Remote stream added.');
  if(remoteStream){
    console.log('adding upcoming screen');
    screen1.srcObject = event.stream;
  }
  else{ 
    
    remoteStream = event.stream;
    remoteVideo.srcObject = remoteStream;
    }
}

function handleRemoteStreamRemoved(event) {
  remoteVideo.srcObject = null;
  console.log('Remote stream removed. Event: ', event);
}

function hangup() {
  window.close();
  console.log('Hanging up.');
  stop();
  sendMessage('bye');
  // window.close();
}

function handleRemoteHangup() {
  console.log('Session terminated.');
  stop();
  isInitiator = false;
}

function stop() {
  isStarted = false;
  pc.close();
  pc = null;
}

socket.on('camera-on',() => {
  console.log('mic is on');
  remoteStream.getVideoTracks()[0].enabled = true;
});

socket.on('camera-off',() => {
  remoteStream.getVideoTracks()[0].enabled = false;
});

socket.on('mic-on',() => {
  console.log('mic is on');
  remoteStream.getAudioTracks()[0].enabled = true;
});

socket.on('mic-off',() => {
  remoteStream.getAudioTracks()[0].enabled = false;
});

//////////////////////////////////////////////////////////////////////////////


var localVideo = document.querySelector('#localVideo');
var remoteVideo = document.querySelector('#remoteVideo');

const micOnBtn = document.getElementById('micOn');
const micOffBtn = document.getElementById('micOff');
const cameraOnBtn = document.getElementById('cameraOn');
const cameraOffBtn = document.getElementById('cameraOff');
const screenBtn = document.getElementById('share');
const stopBtn = document.getElementById('stop');
const hangupBtn = document.getElementById('hangupButton');
const screen1 = document.querySelector('video#screen');
const recording = document.querySelector('video#recording');

const recordBtn = document.querySelector('#recordingOn');
const stopRecordBtn = document.querySelector('#recordingOff');
const downloadBtn = document.querySelector('#download');
var mediaRecorder; 
var recordingStream;

var screenSharingOptions = {
    video: {
        cursor: 'always' | 'motion' | 'never',
        displaySurface: 'application' | 'browser' | 'monitor' | 'window',
    },
    audio: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 44100
      }  
};


var isSharingScreen = false;
function handleScreen() {

    if(!isSharingScreen){
        navigator.mediaDevices.getDisplayMedia(screenSharingOptions).then((stream) => {
        screen1.srcObject = stream;
        // pc.onTrack();
        pc.addStream(stream);
        console.log('screen is being shared;');
        });
        isSharingScreen = true;
        screenBtn.classList.remove("btn-primary");
        screenBtn.classList.add("btn-danger");
    }  
    else{
      isSharingScreen = false;
      let tracks = screen1.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      screen.srcObject = null;
      screenBtn.classList.remove("btn-danger");
        screenBtn.classList.add("btn-primary");
    }
     
}


function handleRecording(){
    alert('you will be prompted to share a screen ; The screen won\'t be shared with others but is needed to record the meeting. Please enable the share audio option in the bottom left corner as well.')
    
    var options = { mimeType: "video/webm; codecs=vp9" };

    navigator.mediaDevices.getDisplayMedia(screenSharingOptions).then((stream) => {
        
        recordingStream = stream;  
        // recordingStream.addTrack(localstream.getAudioTracks()[0]);  
        // recordingStream = stream;
        mediaRecorder = new MediaRecorder(recordingStream,options);
            mediaRecorder.start();
    });
    
    
    
    recordBtn.disabled = true;
    stopRecordBtn.disabled = false;
};

function stopRecording(){

    recordBtn.disabled = false;
    stopRecordBtn.disabled = true;
    mediaRecorder.stop();
    let tracks = recordingStream.getTracks();
    tracks.forEach(track => track.stop());
    let chunks = [];

    mediaRecorder.ondataavailable = function(e) {
    chunks.push(e.data);
    }

    mediaRecorder.onstop = function(e)  {
        
        const blob = new Blob(chunks, { 'type' : 'video/webm; codecs=opus' });
        chunks = [];
        const url = window.URL.createObjectURL(blob);
        // recording.src = url;

        
        var a = document.createElement('a');
        document.body.appendChild(a);
        a.style = 'display: none';
        a.href = url;
        a.download = 'test.webm';
        a.click();
        window.URL.revokeObjectURL(url);
        
    };
};





///////////////////////////////////////////////////////////////

micOnBtn.addEventListener('click',() => {
  const audio = localStream.getAudioTracks()[0];
  audio.enabled = true;
  socket.emit('mic-on',ROOM_ID);
});
 

micOffBtn.addEventListener('click',() => {
  const audio = localStream.getAudioTracks()[0];
  audio.enabled = false;
  socket.emit('mic-off',ROOM_ID);
});


cameraOnBtn.addEventListener('click',() => {
  const camera = localStream.getVideoTracks()[0];
  camera.enabled = true;
socket.emit('camera-on',ROOM_ID);
});

cameraOffBtn.addEventListener('click',() => {
  const camera = localStream.getVideoTracks()[0];
  camera.enabled = false;
socket.emit('camera-off',ROOM_ID);
});


recordBtn.addEventListener('click',handleRecording);
stopRecordBtn.addEventListener('click',stopRecording);


screenBtn.addEventListener('click',handleScreen);
hangupBtn.addEventListener('click',hangup);





/////////////////////////////////////chat///////////////////



var input = document.getElementById('msginput');
var form = document.getElementById('message');
var messages = document.querySelector('ul#messages')
var room_name = ROOM_ID;
var user_name = 'anonymous user';


form.addEventListener('submit', (e) => {
    e.preventDefault();
    if(input.value){
      console.log(input.value)
        socket.emit('chat',input.value,room_name,user_name);
        input.value = '';
    }
});

console.log('joining room:',room_name);
socket.emit('join-room',room_name,user_name);    

socket.on('chat-msg',(user,message) => {
    
    console.log(user,message);
    var item = document.createElement('li');
    item.textContent = user + ' : '+ message;
    messages.appendChild(item);
    window.scrollTo(0, document.body.scrollHeight);
    

});
