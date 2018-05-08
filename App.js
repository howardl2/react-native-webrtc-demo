
import React, { Component } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableHighlight,
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

const pcPeers = {};

const connectionId = makeId();

function makeId() {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (var i = 0; i < 5; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
};

function getLocalStream(isFront, callback) {
  // TLDR: makes the video appear
  // let videoSourceId;

  // // on android, you don't have to specify sourceId manually, just use facingMode
  // // uncomment it if you want to specify
  // if (Platform.OS === 'ios') {
  //   MediaStreamTrack.getSources(sourceInfos => {
  //     console.log("sourceInfos: ", sourceInfos);

  //     for (const i = 0; i < sourceInfos.length; i++) {
  //       const sourceInfo = sourceInfos[i];
  //       if(sourceInfo.kind == "video" && sourceInfo.facing == (isFront ? "front" : "back")) {
  //         videoSourceId = sourceInfo.id;
  //       }
  //     }
  //   });
  // }
  // getUserMedia({
  //   audio: true,
  //   video: {
  //     mandatory: {
  //       minWidth: 640, // Provide your own width, height and frame rate here
  //       minHeight: 360,
  //       minFrameRate: 30,
  //     },
  //     facingMode: (isFront ? "user" : "environment"),
  //     optional: (videoSourceId ? [{sourceId: videoSourceId}] : []),
  //   }
  // }, function (stream) {
  //   console.log('getUserMedia success', stream);
  //   callback(stream);
  // }, logError);

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
    callback(stream);
  })
  .catch((error) => {
    logError(error);
  });

};




function logError(error) {
  console.log("logError", error);
}

export default class App extends Component {

  state = {
    videoURL: null,
    isFront: false,
    localStream: null
  };

  componentWillMount() {
    getLocalStream(this.state.isFront, (stream) => {
      this.setState({
        localStream: stream,
        videoURL: stream.toURL()
      });
    });
  };

  componentWillUnmount() {
    this.state.localStream.release();
    this.setState({
      localStream: null,
      videoURL: null
    });
  };

  _switchVideoType = () => {
    const isFront = !this.state.isFront;
    this.setState({isFront});
    getLocalStream(isFront, (stream) => {
      if (this.state.localStream) {
        for (const id in pcPeers) {
          const pc = pcPeers[id];
          pc && pc.removeStream(this.state.localStream);
        }
        this.state.localStream.release();
      }
      
      this.setState({
        localStream: stream,
        videoURL: stream.toURL()
      });

      for (const id in pcPeers) {
        const pc = pcPeers[id];
        pc && pc.addStream(this.state.localStream);
      }
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
      </View>
    );
  }
}

const styles = StyleSheet.create({
  selfView: {
    width: 500,
    height: 400,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#F5FCFF',
  },

});
