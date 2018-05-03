
import React, { Component } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  View
} from 'react-native';

import { 
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  RTCView,
  MediaStream,
  MediaStreamTrack,
  getUserMedia 
} from 'react-native-webrtc';


export default class App extends Component {

  state = {
    videoURL: null,
    isFront: true
  };

  componentDidMount() {
    const configuration = {"iceServers": [{"url": "stun:stun.l.google.com:19302"}]};
    const pc = new RTCPeerConnection(configuration);
    const { isFront } = this.state;
    MediaStreamTrack
    .getSources()
    .then(sourceInfos => {
      console.log(sourceInfos);
      let videoSourceId;
      for (let i = 0; i < sourceInfos.length; i++) {
        const sourceInfo = sourceInfos[i];
        if(sourceInfo.kind === "video" && sourceInfo.facing === (isFront ? "front" : "back")) {
          videoSourceId = sourceInfo.id;
        }
      }
      return getUserMedia({
        audio: true,
        video: {
          mandatory: {
            minWidth: 500, // Provide your own width, height and frame rate here
            minHeight: 300,
            minFrameRate: 30
          },
          facingMode: (isFront ? "user" : "environment"),
          optional: (videoSourceId ? [{sourceId: videoSourceId}] : [])
        }
      });
    })
    .then(stream => {
      console.log('Stream:', stream);
      // return stream
      this.setState({
        videoURL: stream.toURL()
      });
    })
    .catch((error) => {
      console.log('There is an error', error.message);
      throw error;
    });

    pc.createOffer()
      .then(pc.setLocalDescription)
      .then(() => {
        // Send pc.localDescription to peer
        console.log('pc.setLocalDescription');
      })
      .catch((error) => {
        console.log('There is an error', error.message);
        throw error;
      });

    pc.onicecandidate = function (event) {
      // send event.candidate to peer
      console.log('onIceCandidate', event);
    };
  }

  render() {
    return (
      <View>
        <RTCView streamURL={this.state.videoURL} style={styles.container} />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // justifyContent: 'center',
    // alignItems: 'center',
    backgroundColor: '#F5FCFF',
    borderWidth: 1,
    borderColor: '#000',
  },
});
