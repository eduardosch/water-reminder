if (new URLSearchParams(window.location.search).get("sound") === "1") {
  new Audio("assets/sounds/notification.wav").play().catch((err) => {
    console.error(`sound failed: ${err.name}: ${err.message}`);
  });
}
