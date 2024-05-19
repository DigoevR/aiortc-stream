const videoElement = document.getElementById("video");
const roomIdInput = document.getElementById("roomId");
const log = document.getElementById("log");

let ws = null;

const configuration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};
function initializePc(params) {
  const _peerConnection = new RTCPeerConnection(configuration);
  _peerConnection.addEventListener("icecandidate", (event) => {
    console.log(event);
    if (event.candidate) {
      ws.send(JSON.stringify({ "new-ice-candidate": event.candidate }));
    }
  });

  _peerConnection.addEventListener("connectionstatechange", (event) => {
    console.log(event);
    if (_peerConnection.connectionState === "connected") {
      console.log("Connected");
    }
    if (_peerConnection.connectionState === "disconnected") {
      console.log("Disconnected");
      const stream = videoElement.srcObject;
      const tracks = stream.getTracks();
      tracks.forEach((track) => {
        track.stop();
      });
      videoElement.srcObject = null;

      _peerConnection.close();
      peerConnection = initializePc();
    }
  });

  _peerConnection.addEventListener("track", (event) => {
    console.log(event);
    const [remoteStream] = event.streams;
    videoElement.srcObject = remoteStream;
  });
  return _peerConnection;
}
let peerConnection = initializePc();

roomIdInput.addEventListener("change", () => {
  if (ws) {
    ws.close();
  }

  ws = new WebSocket(`ws://localhost:8000/ws/${roomIdInput.value}`);
  ws.onmessage = async (event) => {
    console.log(event.data);
    log.innerHTML += `<p>${event.data}</p>`;
    const message = JSON.parse(event.data);
    if (message.offer) {
      await peerConnection.setRemoteDescription(
        new RTCSessionDescription(message.offer)
      );
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      console.log(peerConnection);
      ws.send(JSON.stringify({ answer }));
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
