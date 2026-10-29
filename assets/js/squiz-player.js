/* Squiz Today player: the ▶ button before each Full Transcript paragraph
 * (<button class="sq-seek" data-t="seconds">, written by squiz_daily_learning.py
 * format_transcript_sections) plays the episode from that paragraph.
 */
(function () {
  "use strict";

  var audio = document.querySelector("#sq-player audio");
  if (!audio) return;

  document.addEventListener("click", function (ev) {
    var btn = ev.target.closest && ev.target.closest(".sq-seek");
    if (!btn) return;
    ev.preventDefault();
    ev.stopPropagation();
    var t = parseFloat(btn.getAttribute("data-t"));
    if (isNaN(t)) return;

    function seek() {
      audio.currentTime = t;
      audio.play();
    }
    // preload="none": metadata must load before currentTime can be set
    if (audio.readyState >= 1) {
      seek();
    } else {
      audio.addEventListener("loadedmetadata", seek, { once: true });
      audio.load();
    }
  });
})();
