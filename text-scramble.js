
(() => {
  const TRIGGER_SELECTOR = ".scramble-trigger";
  const TEXT_SELECTOR = ".text-scramble";
  const HOVER_DELAY = 120;
  const SCRAMBLE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/+=:";
  const FRAME_INTERVAL = 30;

  function initTextScramble() {
    document.querySelectorAll(TRIGGER_SELECTOR).forEach((trigger) => {
      if (trigger.dataset.scrambleReady === "true") return;

      const textElement = trigger.querySelector(TEXT_SELECTOR);
      if (!textElement) return;

      const originalText = textElement.textContent;
      let hoverTimer;
      let animationFrame;
      let isScrambling = false;

      trigger.dataset.scrambleReady = "true";

      function stopAnimation() {
        clearTimeout(hoverTimer);
        cancelAnimationFrame(animationFrame);
        isScrambling = false;
        textElement.textContent = originalText;
      }

      function startScramble() {
        if (isScrambling) return;

        isScrambling = true;
        const startTime = performance.now();
        const duration = Math.max(300, originalText.length * 35);
        let lastFrame = 0;

        function animate(now) {
          if (!isScrambling) return;

          if (now - lastFrame >= FRAME_INTERVAL) {
            lastFrame = now;
            const progress = Math.min((now - startTime) / duration, 1);
            const resolvedCount = Math.floor(
              progress * originalText.length
            );

            textElement.textContent = [...originalText]
              .map((char, index) => {
                if (char === " " || index < resolvedCount) return char;

                return SCRAMBLE_CHARS[
                  Math.floor(Math.random() * SCRAMBLE_CHARS.length)
                ];
              })
              .join("");
          }

          if (now - startTime < duration) {
            animationFrame = requestAnimationFrame(animate);
          } else {
            isScrambling = false;
            textElement.textContent = originalText;
          }
        }

        animationFrame = requestAnimationFrame(animate);
      }

      trigger.addEventListener("mouseenter", () => {
        clearTimeout(hoverTimer);
        hoverTimer = setTimeout(startScramble, HOVER_DELAY);
      });

      trigger.addEventListener("mouseleave", stopAnimation);

      trigger.addEventListener("focusin", () => {
        hoverTimer = setTimeout(startScramble, HOVER_DELAY);
      });

      trigger.addEventListener("focusout", stopAnimation);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTextScramble);
  } else {
    initTextScramble();
  }
})();
