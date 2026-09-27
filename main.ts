//% color="#0078D7" block="SBC-LCD01"
namespace SBC_LCD01 {
export enum Color { Red=0xF800, Green=0x07E0, Blue=0x001F, White=0xFFFF, Black=0x0000, Yellow=0xFFE0, Cyan=0x07FF, Magenta=0xF81F, Orange=0xFD20 }
const DC=DigitalPin.P8, RES=DigitalPin.P16, BLK=DigitalPin.P12
function cmd(c:number){pins.digitalWritePin(DC,0);pins.spiWrite(c)}
function dat(d:number){pins.digitalWritePin(DC,1);pins.spiWrite(d)}
function win(x0:number,y0:number,x1:number,y1:number){cmd(0x2A);dat(x0>>8);dat(x0&255);dat(x1>>8);dat(x1&255);cmd(0x2B);dat(y0>>8);dat(y0&255);dat(y1>>8);dat(y1&255);cmd(0x2C)}
//% block="initialize LCD"
export function init(){pins.spiPins(DigitalPin.P15,DigitalPin.P14,DigitalPin.P13);pins.spiFormat(8,3);pins.spiFrequency(8000000);pins.digitalWritePin(BLK,1);pins.digitalWritePin(RES,0);basic.pause(50);pins.digitalWritePin(RES,1);basic.pause(120);cmd(1);basic.pause(120);cmd(0x11);basic.pause(120);cmd(0x3A);dat(0x55);cmd(0x36);dat(0);cmd(0x21);cmd(0x29);clearScreen()}
//% block="clear LCD"
export function clearScreen(){win(0,0,239,239);for(let i=0;i<57600;i++){dat(0);dat(0)}}
//% block="draw pixel x $x y $y color $color"
export function drawPixel(x:number,y:number,color:Color){if(x<0||x>239||y<0||y>239)return;win(x,y,x,y);dat(color>>8);dat(color&255)}
//% block="show HELLO"
export function hello(){showString("HELLO",40,100,3,Color.White,Color.Black)}
//% block="show text $text x $x y $y size $size text color $color background $background"
export function showString(text:string,x:number,y:number,size:number,color:Color,background:Color){let xx=x;for(let n=0;n<text.length;n++){let c=text.charCodeAt(n);if(c>=97&&c<=122)c-=32;if(c==32)xx+=6*size;else{drawChar(c,xx,y,size,color,background);xx+=6*size}}}
function drawChar(c:number,x:number,y:number,s:number,fg:Color,bg:Color){let f=[0x7E,9,9,9,0x7E,0x7F,0x49,0x49,0x49,0x36,0x3E,0x41,0x41,0x41,0x22,0x7F,0x41,0x41,0x22,0x1C,0x7F,0x49,0x49,0x49,0x41,0x7F,9,9,9,1,0x3E,0x41,0x49,0x49,0x7A,0x7F,8,8,8,0x7F,0,0x41,0x7F,0x41,0,0x20,0x40,0x41,0x3F,1,0x7F,8,0x14,0x22,0x41,0x7F,0x40,0x40,0x40,0x40,0x7F,2,0x0C,2,0x7F,0x7F,4,8,0x10,0x7F,0x3E,0x41,0x41,0x41,0x3E,0x7F,9,9,9,6,0x3E,0x41,0x51,0x21,0x5E,0x7F,9,0x19,0x29,0x46,0x46,0x49,0x49,0x49,0x31,1,1,0x7F,1,1,0x3F,0x40,0x40,0x40,0x3F,0x1F,0x20,0x40,0x20,0x1F,0x7F,0x20,0x18,0x20,0x7F,0x63,0x14,8,0x14,0x63,7,8,0x70,8,7,0x61,0x51,0x49,0x45,0x43];if(c<65||c>90)return;let k=(c-65)*5;for(let a=0;a<5;a++)for(let b=0;b<7;b++)if((f[k+a]>>b)&1)for(let i=0;i<s;i++)for(let j=0;j<s;j++)drawPixel(x+a*s+i,y+b*s+j,fg);else for(let i=0;i<s;i++)for(let j=0;j<s;j++)drawPixel(x+a*s+i,y+b*s+j,bg)}
//% block="draw heart x $x y $y size $size color $color"
export function drawHeart(x:number,y:number,size:number,color:Color){let p=["01100110","11111111","11111111","01111110","00111100","00011000"];for(let r=0;r<p.length;r++)for(let c=0;c<8;c++)if(p[r].charAt(c)=="1")for(let i=0;i<size;i++)for(let j=0;j<size;j++)drawPixel(x+c*size+i,y+r*size+j,color)}
}