'use strict';

import React, { Component } from 'react';
import {
  AppRegistry,
  StyleSheet,
  Text,
  TouchableHighlight,
  View,
  TextInput,
  ListView,
  Platform,
} from 'react-native';

import {
  RTCPeerConnection,
  RTCMediaStream,
  RTCIceCandidate,
  RTCSessionDescription,
  RTCView,
  MediaStreamTrack,
  getUserMedia,
} from 'react-native-webrtc';


let peerConnection;
const url = 'wss://push.aws-stage-rt.veritone.com/socket';
const connectionId = makeId(6);

function makeId(length) {
  // generates a random string as the connectionId
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (var i = 0; i < length; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
};

function getLocalStream(isFront, callback) {
  // TLDR: makes the video appear
  let videoSourceId;

  // on android, you don't have to specify sourceId manually, just use facingMode
  if (Platform.OS === 'ios') {
    MediaStreamTrack.getSources(sourceInfos => {
      console.log("sourceInfos: ", sourceInfos);

      for (const i = 0; i < sourceInfos.length; i++) {
        const sourceInfo = sourceInfos[i];
        if(sourceInfo.kind == "video" && sourceInfo.facing == (isFront ? "front" : "back")) {
          videoSourceId = sourceInfo.id;
        }
      }
    });
  }
  getUserMedia({
    audio: true,
    video: {
      mandatory: {
        minWidth: 640, // Provide your own width, height and frame rate here
        minHeight: 360,
        minFrameRate: 30,
      },
      facingMode: (isFront ? "user" : "environment"),
      optional: (videoSourceId ? [{sourceId: videoSourceId}] : []),
    }
  }, function (stream) {
    console.log('getUserMedia success', stream);
    callback(stream);
  }, logError);
};


// function createPC(socketId, isOffer, localStream) {
//   // TLDR: creates the WebRTC peer connection
//   // TODO: pc functions we need:
//   //    didGenerateOffer (probably createOffer)
//   //    hasICECandidate (probably onICECandidate)
//   const configuration = {};
//   const pc = new RTCPeerConnection(configuration);
//   pcPeers[socketId] = pc;

//   pc.onicecandidate = function (event) {
//     console.log('onicecandidate', event.candidate);
//     // if (event.candidate) {
//     //   socket.emit('exchange', {'to': socketId, 'candidate': event.candidate });
//     // }
//   };


//   function createOffer(socketId) {
//     pc.createOffer(function(desc) {
//       console.log('createOffer', desc);
//       pc.setLocalDescription(desc, function () {
//         console.log('setLocalDescription', pc.localDescription);
//         socket.emit('exchange', {'to': socketId, 'sdp': pc.localDescription });
//       }, logError);
//     }, logError);
//   }

//   pc.onnegotiationneeded = function () {
//     console.log('onnegotiationneeded');
//     if (isOffer) {
//       createOffer(socketId);
//     }
//   }



//   pc.oniceconnectionstatechange = function(event) {
//     console.log('oniceconnectionstatechange', event.target.iceConnectionState);
//     if (event.target.iceConnectionState === 'completed') {
//       setTimeout(() => {
//         getStats();
//       }, 1000);
//     }
//     if (event.target.iceConnectionState === 'connected') {
//       createDataChannel();
//     }
//   };
//   pc.onsignalingstatechange = function(event) {
//     console.log('onsignalingstatechange', event.target.signalingState);
//   };


//   pc.onaddstream = function (event) {
//     console.log('onaddstream', event.stream);
//     container.setState({info: 'One peer join!'});

//     const remoteList = container.state.remoteList;
//     remoteList[socketId] = event.stream.toURL();
//     container.setState({ remoteList: remoteList });
//   };
//   pc.onremovestream = function (event) {
//     console.log('onremovestream', event.stream);
//   };

//   pc.addStream(localStream);
//   function createDataChannel() {
//     if (pc.textDataChannel) {
//       return;
//     }
//     const dataChannel = pc.createDataChannel("text");

//     dataChannel.onerror = function (error) {
//       console.log("dataChannel.onerror", error);
//     };

//     dataChannel.onmessage = function (event) {
//       console.log("dataChannel.onmessage:", event.data);
//       container.receiveTextData({user: socketId, message: event.data});
//     };

//     dataChannel.onopen = function () {
//       console.log('dataChannel.onopen');
//       container.setState({textRoomConnected: true});
//     };

//     dataChannel.onclose = function () {
//       console.log("dataChannel.onclose");
//     };

//     pc.textDataChannel = dataChannel;
//   }
//   return pc;
// }

// function exchange(data) {
//   const fromId = data.from;
//   let pc;
//   if (fromId in pcPeers) {
//     pc = pcPeers[fromId];
//   } else {
//     pc = createPC(fromId, false);
//   }

//   if (data.sdp) {
//     console.log('exchange sdp', data);
//     pc.setRemoteDescription(new RTCSessionDescription(data.sdp), function () {
//       if (pc.remoteDescription.type == "offer")
//         pc.createAnswer(function(desc) {
//           console.log('createAnswer', desc);
//           pc.setLocalDescription(desc, function () {
//             console.log('setLocalDescription', pc.localDescription);
//             socket.emit('exchange', {'to': fromId, 'sdp': pc.localDescription });
//           }, logError);
//         }, logError);
//     }, logError);
//   } else {
//     console.log('exchange candidate', data);
//     // TODO: this line should be after on record
//     // pc.addIceCandidate(new RTCIceCandidate(data.candidate));
//   }
// }


function logError(error) {
  console.log("logError", error);
};


function getStats() {
  const pc = pcPeers[Object.keys(pcPeers)[0]];
  if (pc.getRemoteStreams()[0] && pc.getRemoteStreams()[0].getAudioTracks()[0]) {
    const track = pc.getRemoteStreams()[0].getAudioTracks()[0];
    console.log('track', track);
    pc.getStats(track, function(report) {
      console.log('getStats report', report);
    }, logError);
  }
}


function createPeerConnection(localStream) {
  const configuration = {};
  const pc = new RTCPeerConnection(configuration);
  // pc.createOffer
  // pcPeers[connectionId] = pc;
  peerConnection = pc;
  peerConnection.addStream(localStream);

};


function setupWebRTCSession(component) {
  getLocalStream(component.state.isFront, (stream) => {
    // localStream = stream;
    // should see video feed on screen after this
    component.setState({
      videoURL: stream.toURL(),
      localStream: stream
    });

    createPeerConnection(stream);

  });
};


const socket = new WebSocket(url);
socket.onopen = (event) => {
  console.log('open', event);
  peerConnection.createOffer(connectionId).then((offer) => {
    console.log('settinglocaldescription:', offer);
    const params = {
      "id": "start", 
      "sdpOffer": offer.sdp,
      "jobId": "",
      "sourceId": "",
      "authToken": ""
    };
    console.log('sending to server:', params);
    socket.send(JSON.stringify(params));
    return peerConnection.setLocalDescription(offer);
  })
  .then(() => {
    console.log('send to server');
  })
  .catch((error) => {
    console.log('error:', error);
  });
};

socket.onerror = (error) => {
  console.log('error:', error);

  //TODO: stop recording
};

socket.onclose = (event) => {
  // const viewIndex = peerConnection.viewIndex;
  peerConnection.close();
  peerConnection = null;
  //TODO: stop recording
};

socket.onmessage = (event) => {
  console.log('message', event);
  console.log(event.data);
};





export default class App extends Component {
  state = {
    isFront: false,
    videoURL: null,
    localStream: null,
    record: 'Start Recording',
    socket: null
  };

  componentWillMount() {
    // setup the local stream (phone's camera)
    setupWebRTCSession(this);
    
    // createPC(connectionId, true, this.state.localStream);
    
  };

  componentWillUnmount() {
    peerConnection.close();
    peerConnection = null;
    // pcPeers[connectionId].close();
    // delete pcPeers[connectionId];
    this.state.localStream.release();
    //socket.close();
  };


  setupWebSocket = () => {
    const socket = new WebSocket(url);
    socket.onopen = (event) => {
      console.log('open', event);
      peerConnection.createOffer(connectionId);
    };

    socket.onerror = (error) => {
      console.log('error:', error);

      //TODO: stop recording
    };

    socket.onclose = (event) => {
      // const viewIndex = peerConnection.viewIndex;
      peerConnection.close();
      peerConnection = null;
      //TODO: stop recording
    };

    socket.onmessage = (event) => {
      console.log('message', event);
    };

    this.setState({
      socket: socket
    });
  };






  _switchVideoType = () => {
    const isFront = !this.state.isFront;
    this.setState({isFront});
    getLocalStream(isFront, (stream) => {
      if (this.state.localStream) {
        for (const id in pcPeers) {
          const pc = pcPeers[id];
          pc && pc.removeStream(localStream);
        }
        this.state.localStream.release();
      }
      // localStream = stream;
      this.setState({
        videoURL: stream.toURL(),
        localStream: stream
      });

      for (const id in pcPeers) {
        const pc = pcPeers[id];
        pc && pc.addStream(this.state.localStream);
      }
    });
  };

  _startRecording = () => {
    // setupWebSocket(connectionId, this.state.localStream);
    this.setState({
      record: (this.state.record === 'Start Recording') ? 'Stop Recording' : 'Start Recording'
    });
  };

  render() {
    return (
      <View style={styles.container}>
        <View style={{flexDirection: 'row'}}>
          <Text>
            {this.state.isFront ? "Using front camera" : "Using back camera"}
          </Text>
          <TouchableHighlight
            style={{borderWidth: 1, borderColor: 'black'}}
            onPress={this._switchVideoType}>
            <Text>Switch camera</Text>
          </TouchableHighlight>
        </View>
        <RTCView streamURL={this.state.videoURL} style={styles.selfView}/>
        <TouchableHighlight
            style={{borderWidth: 1, borderColor: 'black', marginTop: 20}}
            onPress={this._startRecording}>
            <Text>{this.state.record}</Text>
          </TouchableHighlight>
      </View>
    );
  }
}


const styles = StyleSheet.create({
  selfView: {
    width: 400,
    height: 300,
  },
  remoteView: {
    width: 200,
    height: 150,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#F5FCFF',
  },
  welcome: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10,
  },
  listViewContainer: {
    height: 150,
  },
});
