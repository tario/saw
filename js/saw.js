function loadSound(url) {
  return new Promise(function(resolve, reject) {
    var request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.responseType = 'arraybuffer';

    request.onload = function() {
      context.decodeAudioData(request.response, function(buffer) {
        resolve(buffer);
      });
    }
    request.send();
  });

}

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

var phaser1 = createPhaser(context.destination)
var pitchShift1 = PitchShift(context)
pitchShift1.connect(phaser1.i)

var phaser2 = createPhaser(context.destination)
var pitchShift2 = PitchShift(context)
pitchShift2.connect(phaser2.i)

pitchShift1.transpose = -12;
pitchShift1.wet.value = 1;
pitchShift1.dry.value = 0;

pitchShift2.transpose = -3;
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

function setupBuffer(buffer) {
  window.playAudio = function() {
    var source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(pitchShift1);
    source.connect(pitchShift2);
    source.start(0);  
  };

};

navigator.mediaDevices.getUserMedia({ audio: true, video: false})
  .then(function(stream) {
      var source = context.createMediaStreamSource(stream);
      source.connect(pitchShift1);
      source.connect(pitchShift2);

  })
