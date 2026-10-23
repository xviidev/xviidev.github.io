import { Resvg } from '@resvg/resvg-js'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import jsQR from 'jsqr'
import { payload, createMatrix, rasterGeometry, svgCode, validateAppearance, EMPTY_CONTENT, DEFAULT_APPEARANCE } from './qr.ts'
function decode(text: string) {
  const options = DEFAULT_APPEARANCE, matrix = createMatrix(text, options), side = options.size
  const pixels = new Uint8ClampedArray(side * side * 4).fill(255)
  const {scale, offset} = rasterGeometry(matrix, side)
  for (let y=0; y<matrix.size; y++) for (let x=0; x<matrix.size; x++) if(matrix.data[y*matrix.size+x]) for(let py=0;py<scale;py++) for(let px=0;px<scale;px++) {
    const i=((offset+y*scale+py)*side+offset+x*scale+px)*4
    pixels[i]=17;pixels[i+1]=17;pixels[i+2]=17
  }
  assert(offset >= scale*4)
  assert(side-offset-matrix.size*scale >= scale*4)
  return jsQR(pixels,side,side)?.data
}
test('QR raster round trips a URL and Unicode text with exact whitespace',()=>{
  for(const text of ['https://xvii.dev/utilities/qr-code/','Seni rupa • 日本語 🌱\nbaris kedua  ']) assert.equal(decode(payload({...EMPTY_CONTENT,text})),text)
})
test('Wi-Fi payload escapes reserved characters and preserves password characters',()=>{
  const encoded=payload({...EMPTY_CONTENT,mode:'wifi',ssid:'Studio; A:B',password:'a\\b;,:"',hidden:true})
  assert.equal(encoded, 'WIFI:T:WPA;S:Studio\\; A\\:B;P:a\\\\b\\;\\,\\:\\";H:true;;')
  assert.equal(decode(encoded),encoded)
  assert(!payload({...EMPTY_CONTENT,mode:'wifi',ssid:'Tamu',security:'nopass',password:'unused'}).includes('unused'))
  assert.throws(()=>payload({...EMPTY_CONTENT,mode:'wifi',ssid:'Studio'}),/kata sandi/)
})
test('WhatsApp normalizes Indonesian numbers and safely encodes a message',()=>{
  for(const phone of ['0812 3456 7890','+62 (812) 3456-7890']) {
    const encoded=payload({...EMPTY_CONTENT,mode:'whatsapp',phone,message:'Halo & terima kasih 🌱'})
    assert.equal(encoded,'https://wa.me/6281234567890?text='+encodeURIComponent('Halo & terima kasih 🌱'))
    assert.equal(decode(encoded),encoded)
  }
  assert.throws(()=>payload({...EMPTY_CONTENT,mode:'whatsapp',phone:'08abc1234567'}),/nomor WhatsApp/)
})
test('empty content, oversized input and full correction capacity fail clearly',()=>{
  assert.equal(payload(EMPTY_CONTENT),'')
  assert.throws(()=>createMatrix(' ',DEFAULT_APPEARANCE),/terlebih dahulu/)
  assert.throws(()=>createMatrix('🌱'.repeat(800),DEFAULT_APPEARANCE),/terlalu panjang/)
  assert.throws(()=>createMatrix('x'.repeat(2000),{...DEFAULT_APPEARANCE,level:'H'}),/tidak muat/)
})
test('unsafe colors and low contrast cannot produce a downloadable code',()=>{
  for(const foreground of ['#ffffff','#bbbbbb','red','"/><script>']) assert.throws(()=>validateAppearance({...DEFAULT_APPEARANCE,foreground}))
  assert.throws(()=>validateAppearance({...DEFAULT_APPEARANCE,size:12}))
})
test('SVG exports a square with an opaque quiet zone and correct module bounds',()=>{
  const matrix=createMatrix('https://xvii.dev/',DEFAULT_APPEARANCE)
  const svg=svgCode(matrix,DEFAULT_APPEARANCE)
  assert(svg.includes(`viewBox="0 0 ${matrix.size+8} ${matrix.size+8}"`))
  assert(svg.includes('fill="#ffffff"'))
  const coordinates=[...svg.matchAll(/M(\d+) (\d+)h1v1h-1z/g)]
  assert.equal(coordinates.length,matrix.data.filter(Boolean).length)
  for(const [,x,y] of coordinates) {assert(Number(x)>=4&&Number(x)<matrix.size+4);assert(Number(y)>=4&&Number(y)<matrix.size+4)}
})

test('all styled SVG patterns and embedded logos decode independently at small and large sizes',()=>{
  const logo = 'data:image/png;base64,' + new Resvg('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="#111"/><circle cx="16" cy="16" r="8" fill="white"/></svg>',{font:{loadSystemFonts:false}}).render().asPng().toString('base64')
  for(const shape of ['square','rounded','dots'] as const) for(const size of [256,1024]) for(const image of [undefined,logo]) {
    for(const text of ['https://xvii.dev/', 'Seni rupa 🌱', 'WIFI:T:WPA;S:Studio;P:contoh123;;', 'https://example.com/?q=' + 'example'.repeat(35)]) {
      const options={...DEFAULT_APPEARANCE,shape,size,logo:image}
      const matrix=createMatrix(text,options)
      const raster=new Resvg(svgCode(matrix,options),{font:{loadSystemFonts:false}}).render()
      assert.equal(jsQR(new Uint8ClampedArray(raster.pixels),raster.width,raster.height)?.data,text,`${shape} / ${size} / logo=${!!image} / ${text}`)
    }
  }
})
test('logo data rejects SVG and external links; enabled logos force H correction',()=>{
  for(const logo of ['https://example.com/icon.png','data:image/svg+xml;base64,PHN2Zz4=','data:image/png;base64,abc"/>']) assert.throws(()=>validateAppearance({...DEFAULT_APPEARANCE,logo}))
  assert.throws(()=>validateAppearance({...DEFAULT_APPEARANCE,logoScale:50}))
  const logo='data:image/png;base64,iVBORw0KGgo='
  assert.deepEqual(createMatrix('https://xvii.dev/',{...DEFAULT_APPEARANCE,logo}),createMatrix('https://xvii.dev/',{...DEFAULT_APPEARANCE,level:'H'}))
})

test('rounded junctions soften both outer and re-entrant corners without filling white module centers',()=>{
  const size=21,data=new Uint8Array(size*size)
  for(const [x,y] of [[9,9],[10,9],[9,10]])data[y*size+x]=1
  const options={...DEFAULT_APPEARANCE,shape:'rounded' as const}
  const rendered=new Resvg(svgCode({size,data},options),{font:{loadSystemFonts:false}}).render()
  const sample=(x:number,y:number)=>rendered.pixels[(Math.floor(y/29*rendered.height)*rendered.width+Math.floor(x/29*rendered.width))*4]
  assert(sample(13.03,13.03)>240,'outside corner should be rounded away')
  assert(sample(14.03,14.03)<40,'inside corner should have a curved dark fill')
  assert(sample(14.5,14.5)>240,'white module center must remain white')
  assert(sample(13.5,13.5)<40,'dark module center must remain dark')
})

test('dot mode renders separate full circles even for protected consecutive modules',()=>{
  const size=21,data=new Uint8Array(size*size),reserved=new Uint8Array(size*size)
  for(const x of [9,10,11]){data[10*size+x]=1;reserved[10*size+x]=1}
  for(const protectedBits of [undefined,reserved]) {
    const rendered=new Resvg(svgCode({size,data,protected:protectedBits},{...DEFAULT_APPEARANCE,shape:'dots'}),{font:{loadSystemFonts:false}}).render()
    const sample=(x:number,y:number)=>rendered.pixels[(Math.floor(y/29*rendered.height)*rendered.width+Math.floor(x/29*rendered.width))*4]
    assert(sample(14.5,14.5)<40,'each circle center should be dark')
    assert(sample(14,14.1)>240,'adjacent dots must not form a capsule')
    assert(sample(14.03,14.03)>240,'circle corners must remain empty')
  }
})
