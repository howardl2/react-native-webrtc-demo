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

export default class App extends Component {
  static defaultProps = {
    socketURL: 'wss://push.aws-dev-rt.veritone.com/socket',
    jobId: '36039',
    sourceId: "Howard Dev Test",
    token: '39a47243-5c30-47bb-800d-de5d7328c827',
  };

  state = {
    isFront: true,
    videoURL: null,
    localStream: null,
    record: 'Start Recording',
    socket: null,
    peerConnection: null,
    connectionId: '',
    configuration: {},
  };

  componentWillMount() {
    // setup the local stream (phone's camera)
    const connectionId = this._makeId(6);
    const pc = new RTCPeerConnection(this.state.configuration);
    
    this.setState({
      peerConnection: pc,
      connectionId: connectionId
    });

    this.getLocalStream().then((stream) => {
      this.setState({
        videoURL: stream.toURL(),
        localStream: stream
      });
  
      this.state.peerConnection.addStream(stream);
      
      this.state.peerConnection.onicecandidate = (event) => {
        if (event && event.candidate) {
          const params = {
            "id": "onIceCandidate",
            "candidate": {
              "candidate": event.candidate.candidate,
              "sdpMid": event.candidate.sdpMid,
              "sdpMLineIndex": event.candidate.sdpMLineIndex
            }
          }
          console.log('WebRTC: sending onIceCandidate:', JSON.stringify(params));
          this.state.socket.send(JSON.stringify(params));
        }
      };
    });
  };

  componentWillUnmount() {
    this.state.peerConnection.close();
    this.setState({
      peerConnection: null,
      record: (this.state.record === 'Start Recording') ? 'Stop Recording' : 'Start Recording',
    });
    this.state.localStream.release();
  };

  getLocalStream = () => {
    return MediaStreamTrack.getSources().then((sourceInfos) => {
      console.log('Source Infos:', sourceInfos);
      let videoSourceId;
      for (let i = 0; i < sourceInfos.length; i++) {
        const sourceInfo = sourceInfos[i];
        if (sourceInfo.kind == 'video' && sourceInfo.facing == (this.state.isFront ? 'front' : 'back')) {
          videoSourceId = sourceInfo.id;
        }
      }
      return getUserMedia({
        audio: true,
        video: {
          mandatory: {
            minWidth: 500,
            minHeight: 300,
            minFrameRate: 30
          },
          facingMode: (this.state.isFront ? 'user' : 'environment'),
          optional: (videoSourceId ? [{sourceId: videoSourceId}] : [])
        }
      });
    });
  };


  setupWebSocket = () => {
    const socket = new WebSocket(this.props.socketURL);
    socket.onopen = (event) => {
      console.log('WebSocket: opened:', event);
      this._createOffer();
      console.log(this.state.peerConnection._localStreams);
      
    };
  
    socket.onerror = (error) => {
      console.log('WebSocket: error:', error);
      this.state.peerConnection.close();
      this.setState({
        peerConnection: null,
        record: (this.state.record === 'Start Recording') ? 'Stop Recording' : 'Start Recording',
      });
    };
  
    socket.onclose = (event) => {
      // const viewIndex = peerConnection.viewIndex;
      this.state.peerConnection.close();
      this.setState({
        peerConnection: null,
        record: (this.state.record === 'Start Recording') ? 'Stop Recording' : 'Start Recording',
      });
    };
  
    socket.onmessage = (event) => {
      let message;
      if (event && event.data) {
        message = JSON.parse(event.data);
      } else {
        console.warn('Websocket returned an empty message.');
        return;
      }
      switch (message.id) {
        case 'startResponse': {
          console.log('startResponse\n', message);
          if (message && message.sdpAnswer) {
            const sdpAnswer = message.sdpAnswer;

            var description = new RTCSessionDescription(message.sdpAnswer);
            description.type = 'answer';
            description.sdp = message.sdpAnswer;

            console.log('description:', description);
            console.log('WebRTC: before remote description state:', this.state.peerConnection.signalingState);
            this.state.peerConnection.setRemoteDescription(description).then(() => {
              console.log('Remote description set: state:', this.state.peerConnection);
              
            })
            .catch((error) => {
              console.warn('Remote Description ERROR:', error);
            });
          } else {
            console.warn('Start Response did not contain an sdpAnswer');
          }
          break;
        };
        case 'iceCandidate': {
          if (message && message.candidate) {
            const candidate = new RTCIceCandidate(candidate=message.candidate);
            console.log('WebRTC: adding iceCandidate:', candidate);
            this.state.peerConnection.addIceCandidate(candidate).then(() => {
              console.log('WebRTC: Successfully added iceCandidate to client: iceConnectionState:', this.state.peerConnection.iceConnectionState);
            }).catch((error) => {
              console.warn('WebRTC: Error adding iceCandidate:', error);
            });
          }
          break;
        };
        case 'chunk': {
          console.log('chunk', message);
          break;
        };
        case 'status': {
          console.log('status', message.chunk);
          console.log('component state:', this.state.peerConnection);
          break;
        };
        case 'error': {
          console.error('WEBSOCKET SERVER ERROR:', message);
          this.state.peerConnection.close();
          this.setState({
            peerConnection: null,
            record: (this.state.record === 'Start Recording') ? 'Stop Recording' : 'Start Recording',
          });
          break;
        };
        default: {
          console.warning('Unrecognized message from the web socket');
        }
      }
    };
    this.setState({socket});
  };

  _createOffer = () => {
    this.state.peerConnection.createOffer().then((offer) => {
      console.log('WebRTC: settinglocaldescription:', offer);
      this.state.peerConnection.setLocalDescription(offer).then(() => {
        console.log('WebRTC: local description set');
        // console.log('WebRTC: state:', this.state.peerConnection.signalingState);
        const params = {
          "id": "start", 
          "sdpOffer": offer.sdp,
          "jobId": this.props.jobId,
          "sourceId": this.props.sourceId,
          "authToken": this.props.token
        };
        console.log('WebSocket: sending to server:', params);
        this.state.socket.send(JSON.stringify(params));
      });
  
    }).then(() => {
      console.log('WebRTC: send to server');
    }).catch((error) => {
      console.error('WebRTC: error:', error);
    });
  };

  _makeId = (length) => {
    // generates a random string as the connectionId
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  
    for (var i = 0; i < length; i++)
      text += possible.charAt(Math.floor(Math.random() * possible.length));
  
    return text;
  };

  _switchVideoType = () => {
    const isFront = !this.state.isFront;
    this.setState({isFront});
    this._getLocalStream().then((stream) => {
      if (this.state.localStream) {
        this.state.peerConnection.removeStream(this.state.localStream);
        this.state.localStream.release();
      }
      
      this.setState({
        videoURL: stream.toURL(),
        localStream: stream
      });

      this.state.peerConnection.addStream(stream);
    });
  };

  _startRecording = () => {
    if (this.state.record === 'Start Recording') {
      this.setupWebSocket();
    } else {
      this.state.socket.close();
    }
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
