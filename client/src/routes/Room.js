import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import Peer from "simple-peer";
import styled from "styled-components";

// Web Audio API
const audioCtx = new AudioContext();
const peerDestination = audioCtx.createMediaStreamDestination();
const panHardLeft = newPanner(-3,0,-1,3,0,1);
// const panSoftLeft = newPanner(-1,0,0,1,0,0);
// const panSoftRight = newPanner(1,0,0,1,0,0);
const panHardRight = newPanner(3,0,1,-3,0,-1);
const panners = [panHardRight, panHardLeft, panHardRight, panHardLeft];
const gain = audioCtx.createGain();

function newPanner(pX, pY, pZ, oX, oY, oZ) {
    return new PannerNode(audioCtx, {
        positionX: pX,
        positionY: pY,
        positionZ: pZ,
        orientationX: oX,
        orientationY: oY,
        orientationZ: oZ
    })
}

const Container = styled.div`
    padding: 20px;
    display: flex;
    height: 70vh;
    width: 90%;
    margin: auto;
    flex-wrap: wrap;
`;

const StyledVideo = styled.video`
    height: 40%;
    width: 50%;
`;

const BarButton = styled.button`
    border: 4px solid #95e;
    border-radius: 10px;
    background: #fff;
    height: 100%;
    width: 20%;
    cursor: pointer;
    float: left;
`;

const Video = (props) => {
    const ref = useRef();
    const hostDestination = audioCtx.createMediaStreamDestination();

    useEffect(() => {
        props.peer.on("stream", stream => {
            console.log(stream);
            let video = stream.getVideoTracks()[0];
            audioCtx.createMediaStreamSource(stream).connect(panners[props.position]).connect(hostDestination);
            hostDestination.stream.addTrack(video);
            ref.current.srcObject = hostDestination.stream;
        });
    }, []);

    return (
        <StyledVideo playsInline autoPlay ref={ref} />
    );
}


const videoConstraints = {
    height: window.innerHeight / 2,
    width: window.innerWidth / 2
};

const Room = (props) => {
    const [peers, setPeers] = useState([]);
    const socketRef = useRef();
    const userVideo = useRef();
    const peersRef = useRef([]);
    const roomID = props.match.params.roomID;

    useEffect(() => {
        socketRef.current = io.connect("/");
        navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: true }).then(stream => {
            userVideo.current.srcObject = stream;
            let videoTracks = stream.getVideoTracks();
            //console.log(videoTrack);
            gain.gain.setValueAtTime(1, audioCtx.currentTime);
            audioCtx.createMediaStreamSource(stream).connect(gain).connect(peerDestination);
            peerDestination.stream.addTrack(videoTracks[0]);
            //console.log(peerDestination.stream);
            socketRef.current.emit("join room", roomID);
            socketRef.current.on("all users", users => {
                const peers = [];
                console.log("Getting all users");
                console.log(users);
                users.forEach(userID => {
                    const peer = createPeer(userID, socketRef.current.id, peerDestination.stream);
                    peersRef.current.push({
                        peerID: userID,
                        peer,
                    });
                    peers.push(peer);
                });
                setPeers(peers);
            });

            socketRef.current.on("user joined", payload => {
                console.log("User has joined");
                const peer = addPeer(payload.signal, payload.callerID, peerDestination.stream);
                peersRef.current.push({
                    peerID: payload.callerID,
                    peer,
                });

                //setPeers(users => [...users, peer]);
                peers.push(peer);
                setPeers(peers);
                console.log(peers);
            });

            socketRef.current.on("receiving returned signal", payload => {
                console.log("Receiving returned signal");
                const item = peersRef.current.find(p => p.peerID === payload.id);
                item.peer.signal(payload.signal);
            });
        }).catch(function(err) {
            console.log(err.message);
        })
    }, []);

    function createPeer(userToSignal, callerID, stream) {
        const peer = new Peer({
            initiator: true,
            trickle: false,
            stream,
        });
        console.log("Peer created");

        peer.on("signal", signal => {
            console.log("created peer sending signal");
            socketRef.current.emit("sending signal", { userToSignal, callerID, signal })
        })

        return peer;
    }

    function addPeer(incomingSignal, callerID, stream) {
        const peer = new Peer({
            initiator: false,
            trickle: false,
            stream,
        });
        console.log("Peer added");

        peer.on("signal", signal => {
            console.log("Return signal");
            socketRef.current.emit("returning signal", { signal, callerID });
        });

        peer.signal(incomingSignal);
        console.log("Signaled added peer");

        return peer;
    }

    function toggleMic(){
        let b = document.getElementById("mic-button");
        if (b.innerHTML === 'Unmuted'){
            b.innerHTML = 'Muted';
            gain.gain.setValueAtTime(0, audioCtx.currentTime);
        } else {
            b.innerHTML = 'Unmuted';
            gain.gain.setValueAtTime(1, audioCtx.currentTime);
        }
    }

    return (
        <div>
            <h3>Room ID: {roomID}</h3><br/>
            <Container>
                <StyledVideo muted ref={userVideo} autoPlay playsInline />
                {peers.map((peer, index) => {
                    return (
                        <Video key={index} position={index} peer={peer} />
                    );
                })}
            </Container>
            <div style={{height: "10vh"}}>
                <BarButton id="mic-button" onClick={toggleMic}>Unmuted</BarButton>
            </div>
        </div>
    );
};

export default Room;
