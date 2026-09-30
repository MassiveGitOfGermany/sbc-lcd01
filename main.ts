//% color="#0078D7" block="SBC-LCD01 Game"
namespace SBC_LCD01 {

export enum Color {
    //% block="red"
    Red=0xF800,
    //% block="green"
    Green=0x07E0,
    //% block="blue"
    Blue=0x001F,
    //% block="white"
    White=0xFFFF,
    //% block="black"
    Black=0x0000,
    //% block="yellow"
    Yellow=0xFFE0,
    //% block="cyan"
    Cyan=0x07FF,
    //% block="magenta"
    Magenta=0xF81F,
    //% block="orange"
    Orange=0xFD20
}

export enum Layer {
    //% block="background"
    Background=0,
    //% block="platforms"
    Platforms=1,
    //% block="sprites"
    Sprites=2,
    //% block="foreground"
    Foreground=3
}

export enum Direction {
    //% block="left"
    Left=-1,
    //% block="right"
    Right=1
}

export enum BlockType {
    //% block="normal"
    Normal=0,
    //% block="bounce"
    Bounce=1,
    //% block="speed"
    Speed=2,
    //% block="ice"
    Ice=3,
    //% block="finish"
    Finish=4,
    //% block="hazard"
    Hazard=5,
    //% block="one way"
    OneWay=6,
    //% block="ladder"
    Ladder=7,
    //% block="water"
    Water=8,
    //% block="lava"
    Lava=9,
    //% block="breakable"
    Breakable=10,
    //% block="switch"
    Switch=11,
    //% block="door"
    Door=12,
    //% block="checkpoint"
    Checkpoint=13
}

export enum AIType {
    //% block="wander"
    Wander=0,
    //% block="patrol"
    Patrol=1,
    //% block="chase player"
    Chase=2,
    //% block="flee player"
    Flee=3
}

const DC=DigitalPin.P8, RES=DigitalPin.P16, BLK=DigitalPin.P12
let lcdReady=false
let backgroundColor=Color.Black
let cameraX=0, cameraY=0
let running=false
let gameTime=0
let gamePaused=false
let score=0
let keys=0
let lives=3
let checkpointX=0, checkpointY=0
let checkpointSet=false
let shake=0

function cmd(c:number){pins.digitalWritePin(DC,0);pins.spiWrite(c)}
function dat(d:number){pins.digitalWritePin(DC,1);pins.spiWrite(d)}
function win(x0:number,y0:number,x1:number,y1:number){
    cmd(0x2A);dat(x0>>8);dat(x0&255);dat(x1>>8);dat(x1&255)
    cmd(0x2B);dat(y0>>8);dat(y0&255);dat(y1>>8);dat(y1&255);cmd(0x2C)
}

//% block="initialize LCD"
export function init(){
    pins.spiPins(DigitalPin.P15,DigitalPin.P14,DigitalPin.P13)
    pins.spiFormat(8,3);pins.spiFrequency(8000000)
    pins.digitalWritePin(BLK,1);pins.digitalWritePin(RES,0)
    basic.pause(50);pins.digitalWritePin(RES,1);basic.pause(120)
    cmd(0x01);basic.pause(120);cmd(0x11);basic.pause(120)
    cmd(0x3A);dat(0x55);cmd(0x36);dat(0);cmd(0x21);cmd(0x29)
    lcdReady=true;clearScreen(backgroundColor)
}

//% block="set background color $color"
export function setBackground(color:Color){backgroundColor=color}

//% block="clear LCD with color $color"
export function clearScreen(color:Color=Color.Black){
    if(!lcdReady)return
    win(0,0,239,239);let hi=color>>8,lo=color&255
    for(let i=0;i<57600;i++){dat(hi);dat(lo)}
}

//% block="draw pixel x $x y $y color $color"
export function drawPixel(x:number,y:number,color:Color){
    if(!lcdReady||x<0||x>239||y<0||y>239)return
    win(x,y,x,y);dat(color>>8);dat(color&255)
}

//% block="draw rectangle x $x y $y width $w height $h color $color"
export function drawRect(x:number,y:number,w:number,h:number,color:Color){
    if(!lcdReady||w<=0||h<=0)return
    let x1=Math.min(239,x+w-1),y1=Math.min(239,y+h-1)
    x=Math.max(0,x);y=Math.max(0,y);win(x,y,x1,y1)
    let n=(x1-x+1)*(y1-y+1),hi=color>>8,lo=color&255
    for(let i=0;i<n;i++){dat(hi);dat(lo)}
}

//% block="draw line x1 $x1 y1 $y1 x2 $x2 y2 $y2 color $color"
export function drawLine(x1:number,y1:number,x2:number,y2:number,color:Color){
    let dx=Math.abs(x2-x1),sx=x1<x2?1:-1,dy=-Math.abs(y2-y1),sy=y1<y2?1:-1,err=dx+dy
    while(true){drawPixel(x1,y1,color);if(x1==x2&&y1==y2)break
        let e2=2*err;if(e2>=dy){err+=dy;x1+=sx}if(e2<=dx){err+=dx;y1+=sy}}
}

//% block="draw heart x $x y $y size $size color $color"
export function drawHeart(x:number,y:number,size:number,color:Color){
    let p=["01100110","11111111","11111111","01111110","00111100","00011000"]
    for(let r=0;r<p.length;r++)for(let c=0;c<8;c++)if(p[r].charAt(c)=="1")
        drawRect(x+c*size,y+r*size,size,size,color)
}

// -------- TEXT --------

const FONT:number[]=[
126,9,9,9,126,127,73,73,73,54,62,65,65,65,34,127,65,65,34,28,
127,73,73,73,65,127,9,9,9,1,62,65,73,73,122,127,8,8,8,127,
0,65,127,65,0,32,64,65,63,1,127,8,20,34,65,127,64,64,64,64,
127,2,12,2,127,127,4,8,16,127,62,65,65,65,62,127,9,9,9,6,
62,65,81,33,94,127,9,25,41,70,70,73,73,73,49,1,1,127,1,1,
63,64,64,64,63,31,32,64,32,31,127,32,24,32,127,99,20,8,20,99,
7,8,112,8,7,97,81,73,69,67]

function charCode(c:number):number{
    if(c>=97&&c<=122)c-=32
    return c>=65&&c<=90?c-65:-1
}
function charPixel(c:number,col:number,row:number):boolean{
    let k=charCode(c);if(k<0)return false
    return ((FONT[k*5+col]>>row)&1)!=0
}

//% block="draw text $text x $x y $y size $size color $color"
export function text(text:string,x:number,y:number,size:number,color:Color){
    let xx=x, yy=y, max=235
    for(let n=0;n<text.length;n++){
        let c=text.charCodeAt(n)
        if(c==10){xx=x;yy+=8*size;continue}
        if(c==32){xx+=6*size;continue}
        if(xx+5*size>max){xx=x;yy+=8*size}
        for(let a=0;a<5;a++)for(let b=0;b<7;b++)
            if(charPixel(c,a,b))drawRect(xx+a*size,yy+b*size,size,size,color)
        xx+=6*size
    }
}

//% block="draw text centered $text y $y size $size color $color"
export function centeredText(text:string,y:number,size:number,color:Color){
    let width=text.length*6*size
    textDraw(text,Math.max(0,120-width/2),y,size,color)
}
function textDraw(s:string,x:number,y:number,size:number,c:Color){text(s,x,y,size,c)}

// -------- GRID / CUSTOM PICTURES --------

//% block="draw grid picture $pattern x $x y $y cell size $cell color $color"
export function drawGrid(pattern:string,x:number,y:number,cell:number,color:Color){
    let rows=pattern.split("/")
    for(let r=0;r<rows.length;r++)for(let c=0;c<rows[r].length;c++)
        if(rows[r].charAt(c)=="1")drawRect(x+c*cell,y+r*cell,cell,cell,color)
}

//% block="draw grid outline x $x y $y columns $columns rows $rows cell size $cell color $color"
export function drawGridOutline(x:number,y:number,columns:number,rows:number,cell:number,color:Color){
    for(let c=0;c<=columns;c++)drawLine(x+c*cell,y,x+c*cell,y+rows*cell,color)
    for(let r=0;r<=rows;r++)drawLine(x,y+r*cell,x+columns*cell,y+r*cell,color)
}

// -------- SPRITES --------

export class Sprite {
    x:number;y:number;width:number;height:number;color:Color
    layer:Layer;vx:number;vy:number;gravity:number;direction:Direction
    visible:boolean;solid:boolean;grounded:boolean
    health:number;maxHealth:number;speed:number
    frame:string;frameW:number;frameH:number;frameCell:number
    ai:AIType;aiLeft:number;aiRight:number;aiSpeed:number
    constructor(x:number,y:number,w:number,h:number,color:Color){
        this.x=x;this.y=y;this.width=w;this.height=h;this.color=color
        this.layer=Layer.Sprites;this.vx=0;this.vy=0;this.gravity=0
        this.direction=Direction.Right;this.visible=true;this.solid=false
        this.grounded=false;this.health=1;this.maxHealth=1;this.speed=1
        this.frame="";this.frameW=0;this.frameH=0;this.frameCell=1
        this.ai=AIType.Wander;this.aiLeft=x-30;this.aiRight=x+30;this.aiSpeed=1
    }
    draw(){
        if(!this.visible)return
        let sx=Math.round(this.x-cameraX),sy=Math.round(this.y-cameraY)
        if(this.frame!=""){
            let rows=this.frame.split("/")
            for(let r=0;r<rows.length;r++)for(let c=0;c<rows[r].length;c++)
                if(rows[r].charAt(c)=="1")drawRect(sx+c*this.frameCell,sy+r*this.frameCell,
                    this.frameCell,this.frameCell,this.color)
        }else drawRect(sx,sy,this.width,this.height,this.color)
    }
}

let sprites:Sprite[]=[]
let player:Sprite=null
let blocks:{x:number,y:number,w:number,h:number,type:BlockType,color:Color,solid:boolean,enabled:boolean}[]=[]
let doors:{x:number,y:number,w:number,h:number,open:boolean}[]=[]
let keysItems:{x:number,y:number,taken:boolean}[]=[]
let collectibles:{x:number,y:number,value:number,taken:boolean,color:Color}[]=[]
let teleports:{x:number,y:number,w:number,h:number,tx:number,ty:number}[]=[]
let particles:{x:number,y:number,vx:number,vy:number,life:number,color:Color}[]=[]

function overlap(a:Sprite,b:Sprite){
    return a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y
}
function hitBlock(s:Sprite,b:any):boolean{
    return s.x+s.width>b.x&&s.x<b.x+b.w&&s.y+s.height>b.y&&s.y<b.y+b.h
}

//% block="create player x $x y $y width $w height $h color $color"
export function createPlayer(x:number,y:number,w:number,h:number,color:Color):Sprite{
    player=new Sprite(x,y,w,h,color);player.solid=true;sprites.push(player);return player
}

//% block="create sprite x $x y $y width $w height $h color $color"
export function createSprite(x:number,y:number,w:number,h:number,color:Color):Sprite{
    let s=new Sprite(x,y,w,h,color);sprites.push(s);return s
}

//% block="delete sprite $s"
export function deleteSprite(s:Sprite){
    s.visible=false
}

//% block="set $s sprite layer to $layer"
export function setLayer(s:Sprite,layer:Layer){s.layer=layer}

//% block="set $s sprite visible $visible"
export function setVisible(s:Sprite,visible:boolean){s.visible=visible}

//% block="set $s sprite velocity x $vx y $vy"
export function setVelocity(s:Sprite,vx:number,vy:number){s.vx=vx;s.vy=vy}

//% block="set $s sprite gravity $g"
export function setGravity(s:Sprite,g:number){s.gravity=g}

//% block="set gravity direction for $s x $gx y $gy"
export function setGravityDirection(s:Sprite,gx:number,gy:number){s.gravity=gy;s.vx+=gx}

//% block="move $s sprite by x $dx y $dy"
export function moveBy(s:Sprite,dx:number,dy:number){s.x+=dx;s.y+=dy}

//% block="set $s sprite facing $direction"
export function setFacing(s:Sprite,direction:Direction){s.direction=direction}

//% block="$s sprite facing direction"
export function facing(s:Sprite):Direction{return s.direction}

//% block="turn $s sprite around"
export function turnAround(s:Sprite){s.direction=s.direction==Direction.Left?Direction.Right:Direction.Left}

//% block="set $s sprite speed $speed"
export function setSpeed(s:Sprite,speed:number){s.speed=speed}

//% block="move $s sprite forward"
export function moveForward(s:Sprite){s.x+=s.direction*s.speed}

//% block="set $s sprite solid $solid"
export function setSolid(s:Sprite,solid:boolean){s.solid=solid}

//% block="jump $s sprite power $power"
export function jump(s:Sprite,power:number){if(s.grounded||Math.abs(s.vy)<0.1)s.vy=-Math.abs(power)}

//% block="set $s sprite health $health"
export function setHealth(s:Sprite,health:number){s.health=health;s.maxHealth=health}

//% block="$s sprite health"
export function health(s:Sprite):number{return s.health}

//% block="damage $s sprite by $amount"
export function damage(s:Sprite,amount:number){s.health=Math.max(0,s.health-amount);soundHit()}

//% block="heal $s sprite by $amount"
export function heal(s:Sprite,amount:number){s.health=Math.min(s.maxHealth,s.health+amount)}

//% block="set animation frame for $s pattern $pattern width $w height $h cell size $cell"
export function setFrame(s:Sprite,pattern:string,w:number,h:number,cell:number){
    s.frame=pattern;s.frameW=w;s.frameH=h;s.frameCell=cell
}

//% block="clear animation frame for $s"
export function clearFrame(s:Sprite){s.frame=""}

// -------- PLATFORMS / WORLD --------

//% block="add block x $x y $y width $w height $h type $type color $color"
export function addBlock(x:number,y:number,w:number,h:number,type:BlockType,color:Color){
    blocks.push({x:x,y:y,w:w,h:h,type:type,color:color,solid:true,enabled:true})
}

//% block="set block at x $x y $y enabled $enabled"
export function setBlockEnabled(x:number,y:number,enabled:boolean){
    for(let b of blocks)if(b.x==x&&b.y==y)b.enabled=enabled
}

//% block="clear all blocks"
export function clearBlocks(){blocks=[]}

//% block="add moving platform x $x y $y width $w height $h color $color move x $dx y $dy speed $speed"
export function addMovingPlatform(x:number,y:number,w:number,h:number,color:Color,dx:number,dy:number,speed:number){
    blocks.push({x:x,y:y,w:w,h:h,type:BlockType.Normal,color:color,solid:true,enabled:true})
    // encode movement using particles is avoided; simple platform movement handled below
    moving.push({b:blocks[blocks.length-1],ox:x,oy:y,dx:dx,dy:dy,s:speed,t:0})
}
let moving:{b:any,ox:number,oy:number,dx:number,dy:number,s:number,t:number}[]=[]

//% block="add one way platform x $x y $y width $w height $h color $color"
export function addOneWayPlatform(x:number,y:number,w:number,h:number,color:Color){
    addBlock(x,y,w,h,BlockType.OneWay,color)
}

//% block="add door x $x y $y width $w height $h color $color"
export function addDoor(x:number,y:number,w:number,h:number,color:Color){
    doors.push({x:x,y:y,w:w,h:h,open:false})
}

//% block="open all doors"
export function openDoors(){for(let d of doors)d.open=true}

//% block="close all doors"
export function closeDoors(){for(let d of doors)d.open=false}

//% block="give player $amount key"
export function giveKey(amount:number){keys+=amount}

//% block="player has key"
export function hasKey():boolean{return keys>0}

//% block="add collectible x $x y $y value $value color $color"
export function addCollectible(x:number,y:number,value:number,color:Color){
    collectibles.push({x:x,y:y,value:value,taken:false,color:color})
}

//% block="score"
export function getScore():number{return score}

//% block="add score $amount"
export function addScore(amount:number){score+=amount}

//% block="add teleport x $x y $y width $w height $h to x $tx y $ty"
export function addTeleport(x:number,y:number,w:number,h:number,tx:number,ty:number){
    teleports.push({x:x,y:y,w:w,h:h,tx:tx,ty:ty})
}

//% block="set checkpoint x $x y $y"
export function setCheckpoint(x:number,y:number){checkpointX=x;checkpointY=y;checkpointSet=true}

//% block="respawn player at checkpoint"
export function respawn(){
    if(player){player.x=checkpointSet?checkpointX:player.x;player.y=checkpointSet?checkpointY:player.y
        player.vx=0;player.vy=0}
}

//% block="lives"
export function getLives():number{return lives}

//% block="set lives $n"
export function setLives(n:number){lives=Math.max(0,n)}

//% block="lose one life"
export function loseLife(){lives=Math.max(0,lives-1);respawn()}

// -------- AI --------

//% block="set $s NPC AI to $ai"
export function setAI(s:Sprite,ai:AIType){s.ai=ai}

//% block="set $s NPC patrol from $left to $right speed $speed"
export function setPatrol(s:Sprite,left:number,right:number,speed:number){
    s.ai=AIType.Patrol;s.aiLeft=left;s.aiRight=right;s.aiSpeed=Math.abs(speed)
}

// -------- SOUND --------

//% block="play tone $frequency Hz for $duration ms"
export function playTone(frequency:number,duration:number){music.playTone(frequency,duration)}

//% block="play jump sound"
export function soundJump(){music.playTone(784,70);music.playTone(1047,70)}

//% block="play hit sound"
export function soundHit(){music.playTone(180,100)}

//% block="play coin sound"
export function soundCoin(){music.playTone(988,50);music.playTone(1319,70)}

//% block="play finish sound"
export function soundFinish(){music.playTone(523,80);music.playTone(659,80);music.playTone(784,160)}

// -------- BUTTON / EVENTS --------

//% block="when button A pressed"
export function onButtonAPressed(handler:()=>void){input.onButtonPressed(Button.A,handler)}

//% block="when button B pressed"
export function onButtonBPressed(handler:()=>void){input.onButtonPressed(Button.B,handler)}

//% block="when buttons A+B pressed"
export function onButtonABPressed(handler:()=>void){input.onButtonPressed(Button.AB,handler)}

//% block="when button A pressed while player is on block $type"
export function onAOnBlock(type:BlockType,handler:()=>void){
    input.onButtonPressed(Button.A,function(){if(player&&currentBlock()==type)handler()})
}

//% block="when button B pressed while player is on block $type"
export function onBOnBlock(type:BlockType,handler:()=>void){
    input.onButtonPressed(Button.B,function(){if(player&&currentBlock()==type)handler()})
}

//% block="when player is on block $type"
export function whenOnBlock(type:BlockType,handler:()=>void){onBlockHandlers.push({t:type,f:handler})}
let onBlockHandlers:{t:BlockType,f:()=>void}[]=[]

//% block="when $a sprite touches $b sprite"
export function whenSpritesTouch(a:Sprite,b:Sprite,handler:()=>void){onTouchHandlers.push({a:a,b:b,f:handler})}
let onTouchHandlers:{a:Sprite,b:Sprite,f:()=>void}[]=[]

//% block="when player reaches finish"
export function whenPlayerFinishes(handler:()=>void){finishHandlers.push(handler)}
let finishHandlers:(()=>void)[]=[]

//% block="when player collects something"
export function whenCollected(handler:()=>void){collectHandlers.push(handler)}
let collectHandlers:(()=>void)[]=[]

//% block="when player health changes"
export function whenHealthChanges(handler:()=>void){healthHandlers.push(handler)}
let healthHandlers:(()=>void)[]=[]

// -------- CAMERA / GAME --------

//% block="camera follow $s sprite"
export function cameraFollow(s:Sprite){follow=s}

//% block="set camera x $x y $y"
export function setCamera(x:number,y:number){cameraX=x;cameraY=y}

//% block="camera x"
export function cameraXValue():number{return cameraX}

//% block="camera y"
export function cameraYValue():number{return cameraY}

//% block="screen shake $amount"
export function screenShake(amount:number){shake=Math.max(shake,amount)}

//% block="pause game"
export function pauseGame(){gamePaused=true}

//% block="resume game"
export function resumeGame(){gamePaused=false}

//% block="game time"
export function getGameTime():number{return gameTime}

//% block="reset game time"
export function resetGameTime(){gameTime=0}

//% block="start game engine"
export function startGame(){
    if(running)return
    running=true
    control.inBackground(function(){while(running){if(!gamePaused){updateGame();gameTime++}basic.pause(40)}})
}

//% block="stop game engine"
export function stopGame(){running=false}

//% block="game running"
export function isGameRunning():boolean{return running}

let follow:Sprite=null

function currentBlock():BlockType{
    if(!player)return BlockType.Normal
    for(let b of blocks)
        if(player.x+player.width>b.x&&player.x<b.x+b.w&&
           Math.abs(player.y+player.height-b.y)<=8&&b.enabled)return b.type
    return BlockType.Normal
}

function updateAI(s:Sprite){
    if(s==player||!s.visible)return
    if(s.ai==AIType.Patrol||s.ai==AIType.Wander){
        s.x+=s.direction*s.aiSpeed
        if(s.x<=s.aiLeft)s.direction=Direction.Right
        if(s.x>=s.aiRight)s.direction=Direction.Left
    }else if(s.ai==AIType.Chase&&player){
        s.direction=player.x<s.x?Direction.Left:Direction.Right
        s.x+=s.direction*s.aiSpeed
    }else if(s.ai==AIType.Flee&&player){
        s.direction=player.x<s.x?Direction.Right:Direction.Left
        s.x+=s.direction*s.aiSpeed
    }
}

function updateGame(){
    if(!lcdReady)return

    for(let m of moving){
        m.t+=m.s
        m.b.x=m.ox+Math.round(Math.sin(m.t/20)*m.dx)
        m.b.y=m.oy+Math.round(Math.sin(m.t/20)*m.dy)
    }

    if(player)for(let s of sprites)updateAI(s)

    for(let s of sprites){
        if(!s.visible)continue
        if(s.gravity!=0)s.vy+=s.gravity
        s.x+=s.vx;s.y+=s.vy

        if(s.y+s.height>=240+cameraY){s.y=240+cameraY-s.height;s.vy=0;s.grounded=true}
        else s.grounded=false

        for(let b of blocks){
            if(!b.enabled)continue
            if(b.type==BlockType.OneWay && s.vy<0)continue
            if(s.x+s.width>b.x&&s.x<b.x+b.w&&s.y+s.height>=b.y&&
               s.y+s.height<=b.y+14&&s.vy>=0){
                s.y=b.y-s.height;s.vy=0;s.grounded=true
                if(s==player){
                    for(let h of onBlockHandlers)if(h.t==b.type)h.f()
                    if(b.type==BlockType.Bounce)s.vy=-7
                    if(b.type==BlockType.Speed)s.vx=s.direction*3
                    if(b.type==BlockType.Ice)s.vx+=s.direction
                    if(b.type==BlockType.Hazard||b.type==BlockType.Lava){damage(s,1);loseLife()}
                    if(b.type==BlockType.Finish)for(let h of finishHandlers)h()
                    if(b.type==BlockType.Checkpoint)setCheckpoint(b.x,b.y-s.height)
                    if(b.type==BlockType.Breakable)b.enabled=false
                }
            }
        }

        for(let d of doors)if(!d.open&&s.x+s.width>d.x&&s.x<d.x+d.w&&
            s.y+s.height>d.y&&s.y<d.y+d.h){
                s.x-=s.vx;s.y-=s.vy;s.vx=0
            }

        if(s==player){
            for(let c of collectibles)if(!c.taken&&s.x+s.width>c.x&&s.x<c.x+8&&
                s.y+s.height>c.y&&s.y<c.y+8){
                c.taken=true;score+=c.value;soundCoin()
                for(let h of collectHandlers)h()
            }
            for(let t of teleports)if(s.x+s.width>t.x&&s.x<t.x+t.w&&s.y+s.height>t.y&&s.y<t.y+t.h){
                s.x=t.tx;s.y=t.ty
            }
        }
    }

    for(let p of particles){
        p.x+=p.vx;p.y+=p.vy;p.life--
    }
    particles=particles.filter(p=>p.life>0)

    if(follow){
        cameraX=follow.x-108;cameraY=follow.y-108
        cameraX=Math.max(0,cameraX);cameraY=Math.max(0,cameraY)
    }
    if(shake>0)shake--

    clearScreen(backgroundColor)

    // world blocks
    for(let b of blocks)if(b.enabled){
        let sx=b.x-cameraX+(shake>0?(Math.randomRange(-shake,shake)):0)
        let sy=b.y-cameraY+(shake>0?(Math.randomRange(-shake,shake)):0)
        drawRect(sx,sy,b.w,b.h,b.color)
    }
    for(let d of doors)if(!d.open)drawRect(d.x-cameraX,d.y-cameraY,d.w,d.h,Color.Red)
    for(let c of collectibles)if(!c.taken)drawRect(c.x-cameraX,c.y-cameraY,7,7,c.color)
    for(let t of teleports)drawRect(t.x-cameraX,t.y-cameraY,t.w,t.h,Color.Magenta)
    for(let p of particles)drawRect(p.x-cameraX,p.y-cameraY,2,2,p.color)

    for(let layer=0;layer<=3;layer++)
        for(let s of sprites)if(s.layer==layer)s.draw()

    for(let h of onTouchHandlers)if(h.a&&h.b&&h.a.visible&&h.b.visible&&overlap(h.a,h.b))h.f()
}

// -------- PARTICLES / UTILITY --------

//% block="create particle x $x y $y velocity x $vx y $vy life $life color $color"
export function createParticle(x:number,y:number,vx:number,vy:number,life:number,color:Color){
    particles.push({x:x,y:y,vx:vx,vy:vy,life:life,color:color})
}

//% block="screen width"
export function screenWidth():number{return 240}

//% block="screen height"
export function screenHeight():number{return 240}

//% block="$s sprite x position"
export function spriteX(s:Sprite):number{return Math.round(s.x)}

//% block="$s sprite y position"
export function spriteY(s:Sprite):number{return Math.round(s.y)}

//% block="is $s sprite on ground"
export function isGrounded(s:Sprite):boolean{return s.grounded}

//% block="$s sprite is facing left"
export function isFacingLeft(s:Sprite):boolean{return s.direction==Direction.Left}

//% block="$s sprite is facing right"
export function isFacingRight(s:Sprite):boolean{return s.direction==Direction.Right}

//% block="player x position"
export function playerX():number{return player?Math.round(player.x):0}

//% block="player y position"
export function playerY():number{return player?Math.round(player.y):0}
}
