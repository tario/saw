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

// setup webaudio
window.AudioContext = window.AudioContext || window.webkitAudioContext;
var context = new AudioContext();

var pitchShift1 = PitchShift(context)
pitchShift1.connect(context.destination)

var pitchShift2 = PitchShift(context)
pitchShift2.connect(context.destination)

pitchShift1.transpose = -15;
pitchShift1.wet.value = 1;
pitchShift1.dry.value = 0;

pitchShift2.transpose = -4;
pitchShift2.wet.value = 0.3;
pitchShift2.dry.value = 0;

function setupBuffer(buffer) {
  window.playAudio = function() {
    var source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(pitchShift1);
    source.connect(pitchShift2);
    source.start(0);  
  };

};

loadSound("/audio.mp3").then(setupBuffer);
