'use strict';
const fs=require('node:fs'),zlib=require('node:zlib');
function readPNG(file){
 const f=fs.readFileSync(file);let w,h,depth,type,interlace,idat=[];
 for(let p=8;p<f.length;){const n=f.readUInt32BE(p),t=f.toString('ascii',p+4,p+8),v=f.subarray(p+8,p+8+n);if(t==='IHDR'){w=v.readUInt32BE(0);h=v.readUInt32BE(4);depth=v[8];type=v[9];interlace=v[12];}if(t==='IDAT')idat.push(v);p+=n+12;}
 if(depth!==8||type!==6||interlace)throw Error('Only non-interlaced RGBA8 PNG supported');
 const packed=zlib.inflateSync(Buffer.concat(idat)),data=Buffer.alloc(w*h*4),stride=w*4;
 const paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
 for(let y=0;y<h;y++){const filter=packed[y*(stride+1)],offset=y*stride;for(let x=0;x<stride;x++){const raw=packed[y*(stride+1)+1+x],a=x>=4?data[offset+x-4]:0,b=y?data[offset+x-stride]:0,c=y&&x>=4?data[offset+x-stride-4]:0;let add=filter===0?0:filter===1?a:filter===2?b:filter===3?Math.floor((a+b)/2):filter===4?paeth(a,b,c):NaN;if(!Number.isFinite(add))throw Error('Bad PNG filter');data[offset+x]=(raw+add)&255;}}
 return{width:w,height:h,data};
}
const table=Array.from({length:256},(_,i)=>{let c=i;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
function crc(buf){let c=0xffffffff;for(const v of buf)c=table[(c^v)&255]^(c>>>8);return(c^0xffffffff)>>>0;}
function chunk(type,data){const name=Buffer.from(type),n=Buffer.alloc(4),check=Buffer.alloc(4);n.writeUInt32BE(data.length);check.writeUInt32BE(crc(Buffer.concat([name,data])));return Buffer.concat([n,name,data,check]);}
function writePNG(file,im){const ih=Buffer.alloc(13);ih.writeUInt32BE(im.width);ih.writeUInt32BE(im.height,4);ih[8]=8;ih[9]=6;const stride=im.width*4,raw=Buffer.alloc((stride+1)*im.height);for(let y=0;y<im.height;y++)im.data.copy(raw,y*(stride+1)+1,y*stride,(y+1)*stride);fs.mkdirSync(require('node:path').dirname(file),{recursive:true});fs.writeFileSync(file,Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ih),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]));}
function canvas(w,h,color=[0,0,0,0]){const data=Buffer.alloc(w*h*4);for(let p=0;p<data.length;p+=4)for(let c=0;c<4;c++)data[p+c]=color[c];return{width:w,height:h,data};}
function crop(im,r){const[x,y,w,h]=r,out=canvas(w,h);for(let yy=0;yy<h;yy++)im.data.copy(out.data,yy*w*4,((y+yy)*im.width+x)*4,((y+yy)*im.width+x+w)*4);return out;}
function paste(out,im,x,y,scale=1,onlyNonzero=false){for(let yy=0;yy<im.height;yy++)for(let xx=0;xx<im.width;xx++){const a=(yy*im.width+xx)*4;if(onlyNonzero&&!im.data[a+3])continue;for(let sy=0;sy<scale;sy++)for(let sx=0;sx<scale;sx++){const dx=x+xx*scale+sx,dy=y+yy*scale+sy;if(dx<0||dy<0||dx>=out.width||dy>=out.height)continue;im.data.copy(out.data,(dy*out.width+dx)*4,a,a+4);}}}
module.exports={readPNG,writePNG,canvas,crop,paste};
