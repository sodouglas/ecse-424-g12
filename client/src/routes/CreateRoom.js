import React from "react";
import { v1 as uuid } from "uuid";

const CreateRoom = (props) => {
    let roomId;

    function create() {
        const id = uuid();
        props.history.push(`/room/${id}`);
    }

    function goToRoom() {
        props.history.push(`/room/${roomId}`);
    }

    function updateRoom(target) {
        roomId = document.getElementById("room-input").value;
        //console.log(roomId);
    }

    return (
        <div>
            <h1>Welcome to SPACE Video Conferencing!</h1>
            <input
                id="room-input"
                onChange={updateRoom}
                placeholder="Room ID"
                ></input>
            <button onClick={goToRoom}>Join room</button>
            <br/>
            <p>-------or-------</p>
            <button onClick={create}>Create room</button>
        </div>
    );
};

export default CreateRoom;
