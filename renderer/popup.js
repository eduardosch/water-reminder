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

if (new URLSearchParams(window.location.search).get("sound") === "1") playSound();
