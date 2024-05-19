const videoElement = document.getElementById("video");
const startButton = document.getElementById("start");
const stopButton = document.getElementById("stop");
const roomIdInput = document.getElementById("roomId");
const log = document.getElementById("log");

let ws = null;

const configuration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};
function initializePc(params) {
  const peerConnection = new RTCPeerConnection(configuration);

  peerConnection.addEventListener("icecandidate", (event) => {
    console.log(event);
    if (event.candidate) {
      ws.send(JSON.stringify({ "new-ice-candidate": event.candidate }));
    }
  });

  peerConnection.addEventListener("connectionstatechange", (event) => {
    console.log(event);
    if (peerConnection.connectionState === "connected") {
      console.log("Connected");
    }
    if (peerConnection.connectionState === "disconnected") {
      console.log("Disconnected");
    }
  });
  return peerConnection;
}
let peerConnection = initializePc();

startButton.addEventListener("click", async () => {
  if (!ws) {
    alert("Please enter a room ID");
    return;
  }
  const stream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true,
  });
  videoElement.srcObject = stream;
  stream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, stream);
  });

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  ws.send(JSON.stringify({ offer }));
});

stopButton.addEventListener("click", async () => {
  peerConnection.close();
  peerConnection = initializePc();
  const stream = videoElement.srcObject;
  const tracks = stream.getTracks();

  tracks.forEach((track) => {
    track.stop();
  });

  videoElement.srcObject = null;
});

roomIdInput.addEventListener("change", () => {
  if (ws) {
    ws.close();
  }

  ws = new WebSocket(`ws://localhost:8000/ws/${roomIdInput.value}`);
  ws.onmessage = async (event) => {
    console.log(event.data);
    log.innerHTML += `<p>${event.data}</p>`;
    const message = JSON.parse(event.data);
    if (message.answer) {
      await peerConnection.setRemoteDescription(
        new RTCSessionDescription(message.answer)
      );
      console.log(peerConnection);
    }
    if (message["new-ice-candidate"]) {
      try {
        await peerConnection.addIceCandidate(
          new RTCIceCandidate(message["new-ice-candidate"])
        );
      } catch (e) {
        console.error(e);
      }
    }
  };
});
