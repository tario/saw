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

pitchShift1.transpose = -10;
pitchShift1.wet.value = 1;
pitchShift1.dry.value = 0;

pitchShift2.transpose = -5;
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

navigator.mediaDevices.getUserMedia({ audio: true, video: false})
  .then(function(stream) {
      var source = context.createMediaStreamSource(stream);
      source.connect(pitchShift1);
      source.connect(pitchShift2);

  })


var currentRecorder;

window.record = function() {

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
};