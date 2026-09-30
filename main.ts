//% color="#0078D7" block="SBC-LCD01"
namespace SBC_LCD01 {
export enum Color {
    //% block="red"
    Red=0xF800, //% block="green"
    Green=0x07E0, //% block="blue"
    Blue=0x001F, //% block="white"
    White=0xFFFF, //% block="black"
    Black=0x0000, //% block="yellow"
    Yellow=0xFFE0, //% block="cyan"
    Cyan=0x07FF, //% block="magenta"
    Magenta=0xF81F, //% block="orange"
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
    Hazard=5
}

const DC=DigitalPin.P8, RES=DigitalPin.P16, BLK=DigitalPin.P12
let lcdReady=false

function cmd(c:number){pins.digitalWritePin(DC,0);pins.spiWrite(c)}
function dat(d:number){pins.digitalWritePin(DC,1);pins.spiWrite(d)}
function win(x0:number,y0:number,x1:number,y1:number){
    cmd(0x2A);dat(x0>>8);dat(x0&255);dat(x1>>8);dat(x1&255)
    cmd(0x2B);dat(y0>>8);dat(y0&255);dat(y1>>8);dat(y1&255)
    cmd(0x2C)
}

//% block="initialize LCD"
export function init(){
    pins.spiPins(DigitalPin.P15,DigitalPin.P14,DigitalPin.P13)
    pins.spiFormat(8,3);pins.spiFrequency(8000000)
    pins.digitalWritePin(BLK,1);pins.digitalWritePin(RES,0)
    basic.pause(50);pins.digitalWritePin(RES,1);basic.pause(120)
    cmd(0x01);basic.pause(120);cmd(0x11);basic.pause(120)
    cmd(0x3A);dat(0x55);cmd(0x36);dat(0);cmd(0x21);cmd(0x29)
    lcdReady=true;clearScreen(Color.Black)
}

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

export class Sprite {
    x:number;y:number;width:number;height:number;color:Color
    layer:Layer;vx:number;vy:number;gravity:number;direction:Direction
    visible:boolean;solid:boolean;grounded:boolean
    constructor(x:number,y:number,w:number,h:number,color:Color){
        this.x=x;this.y=y;this.width=w;this.height=h;this.color=color
        this.layer=Layer.Sprites;this.vx=0;this.vy=0;this.gravity=0
        this.direction=Direction.Right;this.visible=true;this.solid=false;this.grounded=false
    }
    draw(){if(this.visible)drawRect(Math.round(this.x),Math.round(this.y),this.width,this.height,this.color)}
}

let sprites:Sprite[]=[]
let player:Sprite=null
let running=false
let onBlockHandlers:{t:BlockType,f:()=>void}[]=[]
let onTouchHandlers:{a:Sprite,b:Sprite,f:()=>void}[]=[]
let finishHandlers:(()=>void)[]=[]
let blocks:{x:number,y:number,w:number,h:number,type:BlockType,color:Color}[]=[]

function overlap(a:Sprite,b:Sprite){
    return a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y
}

//% block="create player x $x y $y width $w height $h color $color"
export function createPlayer(x:number,y:number,w:number,h:number,color:Color):Sprite{
    player=new Sprite(x,y,w,h,color);player.solid=true;sprites.push(player);return player
}

//% block="create sprite x $x y $y width $w height $h color $color"
export function createSprite(x:number,y:number,w:number,h:number,color:Color):Sprite{
    let s=new Sprite(x,y,w,h,color);sprites.push(s);return s
}

//% block="set $s sprite layer to $layer"
export function setLayer(s:Sprite,layer:Layer){s.layer=layer}

//% block="set $s sprite visible $visible"
export function setVisible(s:Sprite,visible:boolean){s.visible=visible}

//% block="set $s sprite velocity x $vx y $vy"
export function setVelocity(s:Sprite,vx:number,vy:number){s.vx=vx;s.vy=vy}

//% block="set $s sprite gravity $g"
export function setGravity(s:Sprite,g:number){s.gravity=g}

//% block="move $s sprite by x $dx y $dy"
export function moveBy(s:Sprite,dx:number,dy:number){s.x+=dx;s.y+=dy}

//% block="set $s sprite facing $direction"
export function setFacing(s:Sprite,direction:Direction){s.direction=direction}

//% block="$s sprite facing direction"
export function facing(s:Sprite):Direction{return s.direction}

//% block="turn $s sprite around"
export function turnAround(s:Sprite){s.direction=s.direction==Direction.Left?Direction.Right:Direction.Left}

//% block="set $s sprite solid $solid"
export function setSolid(s:Sprite,solid:boolean){s.solid=solid}

//% block="jump $s sprite power $power"
export function jump(s:Sprite,power:number){s.vy=-Math.abs(power)}

//% block="add block x $x y $y width $w height $h type $type color $color"
export function addBlock(x:number,y:number,w:number,h:number,type:BlockType,color:Color){
    blocks.push({x:x,y:y,w:w,h:h,type:type,color:color})
}

//% block="clear all blocks"
export function clearBlocks(){blocks=[]}

//% block="play tone $frequency Hz for $duration ms"
export function playTone(frequency:number,duration:number){music.playTone(frequency,duration)}

//% block="play jump sound"
export function soundJump(){music.playTone(784,80);music.playTone(1047,80)}

//% block="play hit sound"
export function soundHit(){music.playTone(180,120)}

//% block="play finish sound"
export function soundFinish(){music.playTone(523,100);music.playTone(659,100);music.playTone(784,180)}

//% block="when button A pressed"
export function onButtonAPressed(handler:()=>void){input.onButtonPressed(Button.A,handler)}

//% block="when button B pressed"
export function onButtonBPressed(handler:()=>void){input.onButtonPressed(Button.B,handler)}

//% block="when buttons A+B pressed"
export function onButtonABPressed(handler:()=>void){input.onButtonPressed(Button.AB,handler)}

//% block="when player is on block $type"
export function whenOnBlock(type:BlockType,handler:()=>void){onBlockHandlers.push({t:type,f:handler})}

//% block="when $a sprite touches $b sprite"
export function whenSpritesTouch(a:Sprite,b:Sprite,handler:()=>void){onTouchHandlers.push({a:a,b:b,f:handler})}

//% block="when player reaches finish"
export function whenPlayerFinishes(handler:()=>void){finishHandlers.push(handler)}

//% block="start game engine"
export function startGame(){
    if(running)return
    running=true
    control.inBackground(function(){while(running){updateGame();basic.pause(40)}})
}

//% block="stop game engine"
export function stopGame(){running=false}

//% block="game running"
export function isGameRunning():boolean{return running}

//% block="is $s sprite on ground"
export function isGrounded(s:Sprite):boolean{return s.grounded}

//% block="$s sprite x position"
export function spriteX(s:Sprite):number{return Math.round(s.x)}

//% block="$s sprite y position"
export function spriteY(s:Sprite):number{return Math.round(s.y)}

//% block="screen width"
export function screenWidth():number{return 240}

//% block="screen height"
export function screenHeight():number{return 240}

function updateGame(){
    if(!lcdReady)return
    clearScreen(Color.Black)
    for(let b of blocks)drawRect(b.x,b.y,b.w,b.h,b.color)

    for(let s of sprites){
        if(!s.visible)continue
        if(s.gravity!=0){s.vy+=s.gravity;s.y+=s.vy}
        s.x+=s.vx
        if(s.y+s.height>=240){s.y=240-s.height;s.vy=0;s.grounded=true}
        else{s.grounded=false}

        for(let b of blocks){
            if(s.x+s.width>b.x&&s.x<b.x+b.w&&s.y+s.height>=b.y&&
               s.y+s.height<=b.y+12&&s.vy>=0){
                s.y=b.y-s.height;s.vy=0;s.grounded=true
                if(s==player){
                    for(let h of onBlockHandlers)if(h.t==b.type)h.f()
                    if(b.type==BlockType.Bounce)s.vy=-6
                    if(b.type==BlockType.Speed)s.vx=s.direction*3
                    if(b.type==BlockType.Finish)for(let h of finishHandlers)h()
                }
            }
        }
    }

    for(let layer=0;layer<=3;layer++)
        for(let s of sprites)if(s.layer==layer)s.draw()

    for(let h of onTouchHandlers)if(h.a&&h.b&&overlap(h.a,h.b))h.f()
}
}
