let bugsheet;
let bugAnimation;
let spritesheet;
let initTone = true;

let spriteSheets = [];
let animations = [];

let connectButton;
let port;
let writer, reader;
let joySwitch;
let sensorData = {};

const encoder = new TextEncoder();
const decoder = new TextDecoder();


const GameState = {
  Start: "Start",
  Playing: "Playing",
  GameOver: "GameOver"
};

let game = { score: 0, maxScore: 0, maxTime: 30, elapsedTime: 0, totalSprites: 40, state: GameState.Start};
function preload() {
  bugsheet = loadImage("assets/bugsheet.png");
  sounds = new Tone.Players({

    "gameover": "assets/gameover.mp3",
    "stage1": "assets/stage1.mp3",
    "stage2": "assets/stage2.mp3",
    "hit": "assets/hit.mp3",
    "miss": "assets/miss.mp3"
  
  })
}

function setup() {
  createCanvas(400, 400);
  imageMode(CENTER);
  angleMode(DEGREES);
  sounds.toDestination();

  reset();

  if ("serial" in navigator) {
    // The Web Serial API is supported
    connectButton = createButton("connect");
    connectButton.position(10, 10);
    connectButton.mousePressed(connect);
   }
}

function reset() {
  game.elapsedTime = 0;
  game.score = 0;
  game.totalSprites = random(20,40);

  animations = [];
  for(let i=0; i < game.totalSprites; i++) {
    animations [i] = new BugAnimation (bugsheet,32,32,random(100,300),random(100,300),4,random(0.5,1),6,random([0,1]));
  }
}

function draw () {
  switch(game.state) {
    case GameState.Playing:
      background(220);
      if (sensorData.Switch == 0) {
        joyPressed();
       }
      

     
      
      for(let i=0; i < animations.length; i++) {
        animations[i].draw();
  }
  fill(0);
  textSize(40);
  text(game.score,20,40);
  let currentTime = game.maxTime - game.elapsedTime;
  text(ceil(currentTime), 300, 40);
  game.elapsedTime += deltaTime / 1300;
  if(game.score <= 0) {
    sounds.player("stage2").stop();
    sounds.player("stage1").start();
  }
  if(30 <= game.score) {
    sounds.player("stage1").stop();
    sounds.player("stage2").start();
  }
  if(currentTime < 0) {
  game.state = GameState.GameOver;
  }

  text("Joystick Switch: " + sensorData.Switch, 10, 150);

  break;
  case GameState.GameOver:
    game.maxScore = max(game.score, game.maxScore);

    background(0);
    fill(255);
      textSize(40);
      textAlign(CENTER);
      text("Game Over!",200,200);
      textSize(35);
      text("Score: " + game.score,200,270);
      text("Max Score: " + game.maxScore,200,320);
      break;
      case GameState.Start:
      background(0);
      fill(255);
      textSize(50);
      textAlign(CENTER);
      text("Bug Game",200,200);
      textSize(30);
      text("Press Space to Start",200,300);
      break;
}
if (reader) {
  serialRead();
}

if (writer) {
  writer.write(encoder.encode(joySwitch + "\n"))
}

joySwitch = sensorData.Switch;

push();
noFill();
circle(map(sensorData.Xaxis, 0, 400, 0, width), map(sensorData.Yaxis, 0, 400, 0, height), 10);
pop();
}

function keyPressed() {
  if (keyCode === 32 && initTone === true) {
  console.log('spacebar pressed');
  Tone.start();
  initTone = false;
}
  switch(game.state) {
    case GameState.Start:
      game.state = GameState.Playing;
      break;
    case GameState.GameOver:
      reset();
      game.state = GameState.Playing;
      break;
  }
}


function mousePressed() {
  switch(game.state) {
    case GameState.Playing:
      for (let i=0; i < animations.length; i++) {
        let contains = animations[i].contains(mouseX,mouseY);
        if (contains) {
          if (animations[i].moving != 0) {
            animations[i].stop();
            game.score+= 1;
            sounds.player("hit").stop();
            sounds.player("hit").start();
          }
          else if(animations[1].stop != 0) {
            animations[i].stop();
            sounds.player("miss").stop();
            sounds.player("miss").start();
          }
          else {
            if (animations[i].xDirection === 1)
              animations[i].moveRight();
            else
              animations[i].moveLeft();
          }
        }
      }
      break;
  }
  
}



function joyPressed() {
  for (let i=0; i < animations.length; i++) {
    let contains = animations[i].contains(sensorData.Xaxis,sensorData.Yaxis);
    if (contains) {
      if (animations[i].moving != 0) {
        animations[i].stop();
        game.score+= 1;
        sounds.player("hit").stop();
        sounds.player("hit").start();
      }
      else if(animations[1].stop != 0) {
        animations[i].stop();
        sounds.player("miss").stop();
        sounds.player("miss").start();
      }
      else {
        if (animations[i].xDirection === 1)
          animations[i].moveRight();
        else
          animations[i].moveLeft();
      }
    }
  }
}


  

class BugAnimation {
  constructor(spritesheet, sw, sh, dx, dy, animationLength, speed, framerate, vertical = false, offsetX = 0, offsetY = 0) {
    this.spritesheet = spritesheet;
    this.sw = sw;
    this.sh = sh;
    this.dx = dx;
    this.dy = dy;
    this.u = 0;
    this.v = 0;
    this.animationLength = animationLength;
    this.currentFrame = 0;
    this.moving = 1;
    this.xDirection = 1;
    this.offsetX = offsetX;
    this.offsetY = offsetY;
    this.speed = speed;
    this.framerate = framerate*speed;
    this.vertical = vertical;
  }
  draw() {
    this.speed = this.speed + game.score/1000;
    this.u = (this.moving != 0) ? this.currentFrame % this.animationLength : this.u;
    push();
    translate(this.dx,this.dy);
    if (this.vertical)
      rotate(90);
    scale(this.xDirection,1);

    image(this.spritesheet,0,0,this.sw,this.sh,this.u*this.sw+this.offsetX,this.v*this.sh+this.offsetY,this.sw,this.sh);
    pop();
    let proportionalFramerate = round(frameRate() / this.framerate);
    if (frameCount % proportionalFramerate == 0) {
      this.currentFrame++;
    }
  
    if (this.vertical) {
      this.dy += this.moving*this.speed;
      this.move(this.dy,this.sw / 4,height - this.sw / 4);
    }
    else {
      this.dx += this.moving*this.speed;
      this.move(this.dx,this.sw / 4,width - this.sw / 4);
    }

    
  }

  move(position,lowerBounds,upperBounds) {
    if (position > upperBounds) {
      this.moveLeft();
    } else if (position < lowerBounds) {
      this.moveRight();
    }
  }

  moveRight() {
    this.moving = 1;
    this.xDirection = 1;
    this.v = 0;
  }

  moveLeft() {
    this.moving = -1;
    this.xDirection = -1;
    this.v = 0;
  }

  contains(x,y) {
    let insideX = x >= this.dx - 26 && x <= this.dx + 25;
    let insideY = y >= this.dy - 35 && y <= this.dy + 35;
    return insideX && insideY;
  }

  stop() {
    this.moving = 0;
    this.u = 4;
    this.v = 0;
  }

}

async function serialRead() {
  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      reader.releaseLock();
      break;
    }
   //  console.log(value);
    sensorData = JSON.parse(value);
  }
 }
 
 async function connect() {
  port = await navigator.serial.requestPort();
 
 
  await port.open({ baudRate: 9600 });
 
 
  writer = port.writable.getWriter();
 
 
  reader = port.readable
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(new TransformStream(new LineBreakTransformer()))
    .getReader();
 }
 
 
 class LineBreakTransformer {
  constructor() {
    // A container for holding stream data until a new line.
    this.chunks = "";
  }
 
  transform(chunk, controller) {
    // Append new chunks to existing chunks.
    this.chunks += chunk;
    // For each line breaks in chunks, send the parsed lines out.
    const lines = this.chunks.split("\n");
    this.chunks = lines.pop();
    lines.forEach((line) => controller.enqueue(line));
  }
 
  flush(controller) {
    // When the stream is closed, flush any remaining chunks out.
    controller.enqueue(this.chunks);
  }
 }
 