/**
 * Folk music player: renders the page's ABC notation as sheet music with
 * abcjs, wires up Web Audio playback, a playback cursor, note highlighting,
 * and looping over a chosen range of bars. Clicking the sheet music seeks
 * to that bar and resumes playback; double-clicking starts an 8-bar loop
 * from that bar.
 *
 * Expects the folk layout markup:
 *   #folk-paper        - container the sheet music SVG is rendered into
 *   #folk-audio        - container for the abcjs audio control widget
 *   #folk-abc          - <pre> holding the ABC notation source
 *   #folk-loop-toggle  - checkbox enabling the bar loop
 *   #folk-loop-start   - number input: first bar of the loop
 *   #folk-loop-end     - number input: last bar of the loop
 */
(function () {
  "use strict";

  var paperEl = document.getElementById("folk-paper");
  var abcEl = document.getElementById("folk-abc");
  var loopToggle = document.getElementById("folk-loop-toggle");
  var loopStartInput = document.getElementById("folk-loop-start");
  var loopEndInput = document.getElementById("folk-loop-end");

  if (!paperEl || !abcEl || typeof ABCJS === "undefined") return;

  var abcString = abcEl.textContent.trim();
  if (!abcString) return;

  var visualObj = ABCJS.renderAbc(paperEl, abcString, {
    responsive: "resize",
    add_classes: true,
    clickListener: sheetMusicClick
  })[0];

  // getTotalBeats() is only populated once timings are computed, which the
  // synth does lazily - so compute them up front the same way TimingCallbacks
  // does, in order to bound the loop inputs before playback starts.
  var bpm = visualObj.getBpm(visualObj.metaText ? visualObj.metaText.tempo : null);
  visualObj.setTiming(bpm, 0);
  var beatsPerMeasure = visualObj.getBeatsPerMeasure() || 4;
  var totalBars = Math.max(
    1,
    Math.round((visualObj.getTotalBeats() || 0) / beatsPerMeasure)
  );

  loopStartInput.max = totalBars;
  loopEndInput.max = totalBars;
  loopEndInput.value = Math.min(parseInt(loopEndInput.value, 10) || totalBars, totalBars);

  var synthControl = null;
  var cursor = null;

  // Convert the playback time stamped on a clicked element (by
  // setUpAudio) into a 1-based bar number in playback order, repeats
  // included. Returns 0 for elements with no timing, such as clefs and
  // bar lines.
  function barAtClick(abcelem) {
    if (!abcelem) return 0;
    var ms = abcelem.currentTrackMilliseconds;
    if (ms === undefined) return 0;
    // An element inside a repeat is stamped once per pass; use its first
    // occurrence.
    if (typeof ms !== "number") ms = ms[0];
    var bar = Math.floor(ms * bpm / 60000 / beatsPerMeasure) + 1;
    return Math.min(bar, totalBars);
  }

  var pendingSeekBeat = null;

  // Seek to the start of a bar and make sure playback is running. Before
  // the first play there is no audio buffer to seek, so the seek is queued
  // and applied by the first beat callback once playback starts.
  function playFromBar(bar) {
    if (!synthControl) return;
    var beat = (bar - 1) * beatsPerMeasure;
    if (synthControl.isLoaded) {
      synthControl.seek(beat, "beats");
      if (!synthControl.isStarted) synthControl.play();
    } else {
      pendingSeekBeat = beat;
      synthControl.play();
    }
  }

  function seekToBar(bar) {
    // A click outside the active loop means "leave the loop".
    if (loopToggle.checked) {
      var range = loopRangeBeats();
      var beat = (bar - 1) * beatsPerMeasure;
      if (beat < range.startBeat || beat >= range.endBeat) {
        loopToggle.checked = false;
      }
    }
    playFromBar(bar);
  }

  function startLoopAt(bar) {
    loopStartInput.value = bar;
    loopEndInput.value = Math.min(bar + 7, totalBars);
    loopToggle.checked = true;
    playFromBar(bar);
  }

  // abcjs reports every mouseup on the sheet music, so a double click
  // arrives as two callbacks; a short delay tells them apart.
  var CLICK_DELAY = 350;
  var lastClickTime = 0;
  var clickTimer = null;

  function sheetMusicClick(abcelem, tuneNumber, classes, analysis, drag) {
    if (drag && drag.step !== 0) return; // a vertical drag, not a click
    if (!synthControl) return;
    var bar = barAtClick(abcelem);
    if (!bar) return;
    var now = Date.now();
    if (clickTimer && now - lastClickTime < CLICK_DELAY) {
      clearTimeout(clickTimer);
      clickTimer = null;
      lastClickTime = 0;
      startLoopAt(bar);
    } else {
      lastClickTime = now;
      clickTimer = setTimeout(function () {
        clickTimer = null;
        seekToBar(bar);
      }, CLICK_DELAY);
    }
  }

  // Bar numbers are 1-based and count measures in playback order (repeats
  // included), which maps directly onto beats.
  function loopRangeBeats() {
    var startBar = parseInt(loopStartInput.value, 10);
    var endBar = parseInt(loopEndInput.value, 10);
    if (isNaN(startBar) || startBar < 1) startBar = 1;
    if (startBar > totalBars) startBar = totalBars;
    if (isNaN(endBar) || endBar > totalBars) endBar = totalBars;
    if (endBar < startBar) endBar = startBar;
    return {
      startBeat: (startBar - 1) * beatsPerMeasure,
      endBeat: endBar * beatsPerMeasure
    };
  }

  function ensureCursor() {
    // The SVG is replaced whenever the responsive renderer redraws, so the
    // cursor is (re)created against the current SVG.
    var svg = paperEl.querySelector("svg");
    if (svg && (!cursor || cursor.parentNode !== svg)) {
      cursor = document.createElementNS("http://www.w3.org/2000/svg", "line");
      cursor.setAttribute("class", "folk-cursor");
      cursor.setAttribute("x1", 0);
      cursor.setAttribute("x2", 0);
      cursor.setAttribute("y1", 0);
      cursor.setAttribute("y2", 0);
      svg.appendChild(cursor);
    }
  }

  function clearHighlight() {
    var els = paperEl.querySelectorAll(".folk-highlight");
    for (var i = 0; i < els.length; i++) els[i].classList.remove("folk-highlight");
  }

  var cursorControl = {
    beatSubdivisions: 1,
    onStart: function () {
      ensureCursor();
    },
    onBeat: function (beatNumber) {
      // Seeking here (rather than in onStart) keeps the beat timer and the
      // audio buffer in sync; seeking during onStart is overridden by
      // SynthController starting its timer at the previous position.
      if (pendingSeekBeat !== null && synthControl) {
        synthControl.seek(pendingSeekBeat, "beats");
        pendingSeekBeat = null;
      }
      if (loopToggle.checked && synthControl) {
        var range = loopRangeBeats();
        if (beatNumber < range.startBeat || beatNumber >= range.endBeat) {
          synthControl.seek(range.startBeat, "beats");
        }
      }
    },
    onEvent: function (ev) {
      if (!ev) return; // the tune finished
      ensureCursor();
      clearHighlight();
      cursor.setAttribute("x1", ev.left - 2);
      cursor.setAttribute("x2", ev.left - 2);
      cursor.setAttribute("y1", ev.top);
      cursor.setAttribute("y2", ev.top + ev.height);
      for (var i = 0; i < ev.elements.length; i++) {
        var note = ev.elements[i];
        for (var j = 0; j < note.length; j++) {
          note[j].classList.add("folk-highlight");
        }
      }
    },
    onFinished: function () {
      clearHighlight();
      if (cursor) {
        cursor.setAttribute("x1", 0);
        cursor.setAttribute("x2", 0);
        cursor.setAttribute("y1", 0);
        cursor.setAttribute("y2", 0);
      }
    }
  };

  if (ABCJS.synth.supportsAudio()) {
    synthControl = new ABCJS.synth.SynthController();
    synthControl.load("#folk-audio", cursorControl, {
      displayLoop: true,
      displayRestart: true,
      displayPlay: true,
      displayProgress: true,
      displayWarp: true
    });
    synthControl
      .setTune(visualObj, false, { chordsOff: true, program: 0 })
      .catch(function (error) {
        console.warn("Audio problem:", error);
      });
    // setTune flattens the audio lazily on the first play; do it up front
    // so each note is stamped with the playback time used for
    // click-to-seek.
    visualObj.setUpAudio({ chordsOff: true, program: 0 });
  } else {
    document.getElementById("folk-audio").textContent =
      "Audio playback is not supported in this browser.";
    loopToggle.disabled = true;
  }
})();
