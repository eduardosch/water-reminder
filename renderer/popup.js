const SOUND_URL = "assets/sounds/notification.wav";
// Bluetooth headphones sleep when idle and drop the first second or two of audio while the
// link wakes up, which is longer than the chime. Open the output stream with silence first,
// then play the chime through that same (now awake) stream.
const OUTPUT_WAKE_MS = 1500;

function playSound() {
  const context = new AudioContext();
  const silence = context.createConstantSource();
  silence.offset.value = 0;
  silence.connect(context.destination);
  silence.start();

  const audio = new Audio(SOUND_URL);
  context.createMediaElementSource(audio).connect(context.destination);

  setTimeout(() => {
    audio.play().catch((err) => {
      console.error(`sound failed: ${err.name}: ${err.message}`);
    });
  }, OUTPUT_WAKE_MS);
}

const params = new URLSearchParams(window.location.search);

// The main process passes the message already translated (the popup has no preload).
const message = params.get("message");
if (message) {
  document.getElementById("message").textContent = message;
  document.getElementById("reminder-gif").alt = message;
}

if (params.get("sound") === "1") playSound();
