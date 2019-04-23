var createPhaser = function(destination) {
  var merger = context.createChannelMerger(2);
  merger.connect(destination);

  var filterL = context.createGain();
  var filterR = context.createGain();

  filterL.gain.value = 0.0;
  filterR.gain.value = 0.0;

  filterL.connect(merger, 0, 0);
  filterR.connect(merger, 0, 1);

  var splitter = context.createChannelSplitter(2);
  splitter.connect(filterL, 0, 0);
  splitter.connect(filterR, 1, 0);

  return {
    l: filterL.gain,
    r: filterR.gain,
    i: splitter
  };

};

var scale = function(destination, base, top) {
  var a, b;
  a = (top - base)/2;
  b = base + a;

  var gain = context.createGain();
  var c = context.createConstantSource();

  gain.gain.value = a;
  c.offset.value = b;

  gain.connect(destination);
  c.connect(destination);

  c.start();

  return gain;
};

// setup webaudio
window.AudioContext = window.AudioContext || window.webkitAudioContext;
var context = new AudioContext();

var gainNode = context.createGain();
gainNode.gain.value = 1.0;
gainNode.connect(context.destination);

var phaser1 = createPhaser(gainNode);
var pitchShift1 = PitchShift(context);
pitchShift1.connect(phaser1.i)

var phaser2 = createPhaser(gainNode);
var pitchShift2 = PitchShift(context);
pitchShift2.connect(phaser2.i);


var transposeSetting = {
  tr1: -10,
  tr2: -5
};

pitchShift1.transpose = transposeSetting.tr1;
pitchShift1.wet.value = 1;
pitchShift1.dry.value = 0;

pitchShift2.transpose = transposeSetting.tr2;
pitchShift2.wet.value = 0.6;
pitchShift2.dry.value = 0;

var osc = context.createOscillator();
var x = 0.0;
var y = 1.0;

osc.type = "sine";
osc.frequency.value = 0.4;
osc.connect(
  scale(phaser1.r, x, y)
);
osc.connect(
  scale(phaser1.l, y, x)
);
osc.connect(
  scale(phaser2.r, y, x)
);
osc.connect(
  scale(phaser2.l, x, y)
);
osc.start();

var input = context.createGain();
input.gain.value = 1.0;

input.connect(pitchShift1);
input.connect(pitchShift2);

compressor = context.createDynamicsCompressor();
compressor.threshold.value = -50;
compressor.knee.value = 40;
compressor.ratio.value = 12;
compressor.reduction.value = -20;
compressor.attack.value = 0;
compressor.release.value = 0.25;

filter = context.createBiquadFilter();
filter.Q.value = 8.30;
filter.frequency.value = 355;
filter.gain.value = 3.0;
filter.type = 'bandpass';
filter.connect(compressor);

compressor.connect(input);

var recording = false;
function ensureRecording() {
  if (recording) return;
  recording = true;
  return navigator.mediaDevices.getUserMedia({ audio: true, video: false})
    .then(function(stream) {
        var source = context.createMediaStreamSource(stream);
        source.connect(filter);
    });
};


var currentRecorder;

window.record = function() {
  context.resume()
    .then(ensureRecording)
    .then(function() {
      if (currentRecorder) {
        currentRecorder.finishRecording();
        document.getElementById("record_button").innerHTML = "<b>\u25CF</b>RECORD";

        currentRecorder = null;

      } else {
        currentRecorder = new WebAudioRecorder(gainNode, {
          workerDir: "lib/recorder/worker/",
          encoding: 'wav',
          numChannels: 2
        });

        currentRecorder.onComplete = function(recorder, blob) {
          var a = document.createElement("a");
          document.body.appendChild(a);
          a.style = "display: none";

          var url  = window.URL.createObjectURL(blob);
          a.href = url;
          a.download = 'saw.wav';
          a.click();
          window.URL.revokeObjectURL(url);
        };

        currentRecorder.startRecording();
        document.getElementById("record_button").innerText = "STOP RECORDING";
      }

    });
};

var bind = function(elementId, recv, propertyName, onChange) {
  var el = document.getElementById(elementId);
  el.value = recv[propertyName];
  onChange(recv[propertyName]);
  el.onchange = function() {
    recv[propertyName] = parseFloat(el.value);
    onChange(recv[propertyName]);
  };
};

var u = function(id, onChange) {
  var el = document.getElementById(id);
  return function(newVal) {
    el.innerText = newVal.toFixed(2);
    if (onChange) onChange(newVal);
  };
};

var setPitch1 = function(newVal) {
  pitchShift1.transpose = newVal;
};

var setPitch2 = function(newVal) {
  pitchShift2.transpose = newVal;
};

// data bindings
window.onload = function() {
  bind("pitch1-transpose", transposeSetting, "tr1", u("pitch1-transpose-display", setPitch1));
  bind("pitch1-wet", pitchShift1.wet, "value", u("pitch1-wet-display"));
  bind("pitch1-dry", pitchShift1.dry, "value", u("pitch1-dry-display"));

  bind("pitch2-transpose", transposeSetting, "tr2", u("pitch2-transpose-display", setPitch2));
  bind("pitch2-wet", pitchShift2.wet, "value", u("pitch2-wet-display"));
  bind("pitch2-dry", pitchShift2.dry, "value", u("pitch2-dry-display"));

  bind("phaser-freq", osc.frequency, "value", u("phaser-freq-display"));
};
