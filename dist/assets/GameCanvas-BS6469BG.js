var jt=Object.defineProperty;var zt=(s,a,r)=>a in s?jt(s,a,{enumerable:!0,configurable:!0,writable:!0,value:r}):s[a]=r;var le=(s,a,r)=>zt(s,typeof a!="symbol"?a+"":a,r);import{r as x,j as c}from"./vendor-CRMCsctL.js";import{u as T,a as pe,b as it,E as St,N as Pt,B as kt,T as Tt,c as Ft,H as At,V as Ct,d as Et,e as It,C as Rt}from"./r3f-CshtBLtJ.js";import{ab as B,h as w,c as P,z as ge,x as Gt,ac as ne,a3 as _t,aa as Dt,ad as ct,ae as lt,af as ut,ag as se,ah as Wt,ai as Fe,aj as K,y as ae,K as Be,d as Te,Z as Lt,g as Bt,U as Nt,ak as Ot,r as Ne,al as ft,m as Ut,am as mt,J as Y,an as U,f as xe,ao as qt,a9 as Me,a7 as Oe,ap as Le,a2 as we,aq as Vt,X as Ue,w as ht,G as $t,ar as Xt,as as qe,at as Ht,au as dt,a1 as Ge,a as Zt,av as Yt,W as Qt}from"./three-yAJUXzuc.js";import{S as _,R as _e,u as L,i as Ve,Q as Kt}from"./index-D4Z3rOjs.js";import{r as b,m as ce,n as Jt,C as z,M as eo,P as ee,T as te,G as $e,F as Pe,a as to,b as ue,l as C,d as oo,c as me,w as no,g as so,t as ao,e as je,f as Z,p as ro,s as io,D as co,h as lo,i as uo}from"./GameShell-D_86IwKW.js";const $={uTime:{value:0},uWind:{value:1}};let Ce=null;function pt(){if(Ce)return Ce;const s=new B({vertexColors:!0,roughness:.86,metalness:0});return s.onBeforeCompile=a=>{a.uniforms.uTime=$.uTime,a.uniforms.uWind=$.uWind,a.vertexShader=a.vertexShader.replace("#include <common>",`#include <common>
attribute float aSway;
attribute float aEmissive;
uniform float uTime;
uniform float uWind;
varying float vEmissive;
varying float vSway;
varying vec3 vWorldPos;
varying vec3 vWorldN;`).replace("#include <begin_vertex>",`#include <begin_vertex>
vEmissive = aEmissive;
vSway = aSway;
vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
vWorldN = normalize(mat3(modelMatrix) * objectNormal);
if (aSway > 0.0) {
  vec4 wp = modelMatrix * vec4(transformed, 1.0);
  float ph = wp.x * 0.07 + wp.z * 0.05;
  float s = aSway * uWind;
  transformed.x += (sin(uTime * 1.6 + ph) * 0.55 + sin(uTime * 3.3 + ph * 2.7) * 0.18) * s;
  transformed.z += (cos(uTime * 1.25 + ph * 1.3) * 0.4) * s;
}`),a.fragmentShader=a.fragmentShader.replace("#include <common>",`#include <common>
varying float vEmissive;
varying float vSway;
varying vec3 vWorldPos;
varying vec3 vWorldN;
float gHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float gNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(gHash(i), gHash(i + vec2(1.0, 0.0)), u.x), mix(gHash(i + vec2(0.0, 1.0)), gHash(i + vec2(1.0, 1.0)), u.x), u.y);
}`).replace("#include <color_fragment>",`#include <color_fragment>
{
  // Grass texture: only on green, level ground that isn't foliage.
  vec3 c = diffuseColor.rgb;
  float green = smoothstep(1.02, 1.18, c.g / max(c.r, 1e-3)) * smoothstep(1.1, 1.35, c.g / max(c.b, 1e-3));
  float level = smoothstep(0.45, 0.75, vWorldN.y);
  float g = green * level * (1.0 - step(0.001, vSway));
  if (g > 0.0) {
    vec2 w = vWorldPos.xz;
    float dist = length(vViewPosition);
    // Broad patches of light and dark green, then smaller clumps.
    float big = gNoise(w * 0.045) * 0.6 + gNoise(w * 0.11 + 7.0) * 0.4;
    float mid = gNoise(w * 0.42 + 3.0);
    vec3 tint = mix(vec3(0.78, 0.88, 0.78), vec3(1.18, 1.14, 0.86), smoothstep(0.2, 0.8, big));
    tint *= mix(0.88, 1.1, mid);
    // Fine blade grain: streaks, faded out with distance so it never shimmers.
    float grain = gNoise(vec2(w.x * 6.0, w.y * 1.6)) * 0.5 + gNoise(vec2(w.x * 1.7, w.y * 5.5) + 11.0) * 0.5;
    tint *= 1.0 + (grain - 0.5) * 0.3 * (1.0 - smoothstep(30.0, 110.0, dist));
    diffuseColor.rgb = mix(c, c * tint, g);
  }
}`).replace("#include <normal_fragment_begin>",`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
// Faceted low-poly look up close. Far away, triangles shrink below a 2x2 pixel
// quad and derivative normals become noise that sparkles as the camera moves,
// so blend to the interpolated vertex normal with distance.
vec3 flatN = normalize( cross( dFdx( vViewPosition ), dFdy( vViewPosition ) ) );
vec3 smoothN = normalize( vNormal );
// Mostly soft, painted shading with just a hint of facets; fully smooth far away.
vec3 normal = normalize( mix( flatN, smoothN, max( 0.62, smoothstep( 140.0, 460.0, length( vViewPosition ) ) ) ) );
vec3 nonPerturbedNormal = normal;`).replace("#include <emissivemap_fragment>",`#include <emissivemap_fragment>
// Fade small lights with distance so sub-pixel windows/edge lights never twinkle.
totalEmissiveRadiance += vColor.rgb * vEmissive * 1.5 * (1.0 - smoothstep(220.0, 650.0, length(vViewPosition)));`)},s.customProgramCacheKey=()=>"skybound-world-v5",Ce=s,s}const R={sunDir:new P(-.5,.72,.48).normalize(),zenith:new w("#1290e6"),skyMid:new w("#3fb0f2"),horizon:new w("#b9e4f8"),haze:new w("#e6f4fb"),below:new w("#2a6cc0"),sunGlow:new w("#fff4e2"),fog:new w("#9fd0f2"),sunLight:new w("#fff3e4"),hemiSky:new w("#cbe8ff"),hemiGround:new w("#3f7fca"),cloudLit:new w("#fffaf7"),cloudShadow:new w("#a9c3ee"),cloudRim:new w("#ffffff"),cloudWarm:new w("#ffdfe3"),ocean:{deep:new w("#143f92"),open:new w("#1c58b0"),mid:new w("#2468bd"),shallow:new w("#259fd0"),lagoon:new w("#69cfe0"),foam:new w("#f7fbff"),shade:new w("#123a85"),far:new w("#4f98d8")}},fo=`
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww;
}`,mo=`
uniform vec3 uSunDir;
uniform vec3 uZenith;
uniform vec3 uMid;
uniform vec3 uHorizon;
uniform vec3 uHaze;
uniform vec3 uBelow;
uniform vec3 uGlow;
varying vec3 vDir;
float h21(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
float vn(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y);
}
void main() {
  vec3 d = normalize(vDir);
  float h = d.y;
  // Wide, soft brush strokes break up the gradient a little.
  float az = atan(d.z, d.x);
  float stroke = vn(vec2(az * 3.0, h * 9.0)) * 0.5 + vn(vec2(az * 7.0, h * 22.0)) * 0.5;
  float hh = h + (stroke - 0.5) * 0.025;
  vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.22, hh));
  col = mix(col, uZenith, smoothstep(0.18, 0.85, hh));
  // Warm haze hugging the horizon line.
  col = mix(col, uHaze, (1.0 - smoothstep(0.0, 0.07, abs(hh))) * 0.35);
  col = mix(col, uBelow, smoothstep(0.0, -0.25, h));
  float sd = max(dot(d, uSunDir), 0.0);
  col = mix(col, uGlow, pow(sd, 8.0) * 0.35 + pow(sd, 90.0) * 0.5);
  col = mix(col, vec3(1.0, 0.98, 0.93), smoothstep(0.9986, 0.9993, sd) * 0.9);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;function ho(){const s=x.useRef(null),a=x.useMemo(()=>new ge({vertexShader:fo,fragmentShader:mo,side:Gt,depthWrite:!1,fog:!1,uniforms:{uSunDir:{value:R.sunDir},uZenith:{value:R.zenith},uMid:{value:R.skyMid},uHorizon:{value:R.horizon},uHaze:{value:R.haze},uBelow:{value:R.below},uGlow:{value:R.sunGlow}}}),[]);return T(({camera:r})=>{var i;return(i=s.current)==null?void 0:i.position.copy(r.position)}),c.jsx("mesh",{ref:s,material:a,frustumCulled:!1,renderOrder:-10,children:c.jsx("sphereGeometry",{args:[4e3,48,24]})})}function po({preset:s}){const a=x.useRef(null),r=9;return x.useEffect(()=>{var e;const i=a.current;if(!i)return;i.shadow.mapSize.set(s.shadowMapSize,s.shadowMapSize),(e=i.shadow.map)==null||e.dispose(),i.shadow.map=null;const t=i.shadow.camera;t.left=-r,t.right=r,t.top=r,t.bottom=-r,t.near=1,t.far=1800,t.updateProjectionMatrix()},[s.shadowMapSize]),T(()=>{const i=a.current;if(!i)return;const t=b.pose;i.target.position.set(t.x,t.y,t.z),i.position.set(t.x+R.sunDir.x*400,t.y+R.sunDir.y*400,t.z+R.sunDir.z*400),i.target.updateMatrixWorld()}),c.jsxs(c.Fragment,{children:[c.jsx("hemisphereLight",{args:[R.hemiSky,R.hemiGround,1.25]}),c.jsx("ambientLight",{intensity:.22,color:"#fff4e6"}),c.jsx("directionalLight",{ref:a,color:R.sunLight,intensity:2.2,castShadow:s.shadows,"shadow-bias":-2e-4,"shadow-normalBias":.02}),c.jsx("directionalLight",{color:"#b9dcff",intensity:.45,position:[400,200,-300]})]})}const gt=1.6,xt=2600,De=40,go=[[-860,-820,70],[260,-210,60]];function Xe(s,a,r){for(const i of _e)if(Math.hypot(s-i.center[0],a-i.center[2])<i.radius*.75+r)return!1;for(const[i,t,e]of go)if(Math.hypot(s-i,a-t)<e+r)return!1;return!0}function vt(s){const a=ce(4242),r=[],i=Math.round(16+12*s);for(let n=0,o=0;n<i&&o<3e3;o++){const l=a()*Math.PI*2,m=120+Math.sqrt(a())*1900,f=Math.cos(l)*m,u=Math.sin(l)*m;if(!Xe(f,u,20)&&a()>.35||r.some(d=>Math.hypot(d.x-f,d.z-u)<260))continue;const h=42+a()*52;r.push({x:f,y:285+a()*70,z:u,sx:h*(1.25+a()*.5),sy:h*(.55+a()*.25),sz:h*(.85+a()*.3),ry:a()*Math.PI*2,variant:n%3,shadow:!0}),n++}const t=Math.round(6+8*s);for(let n=0,o=0;n<t&&o<3e3;o++){const l=a()*Math.PI*2,m=200+Math.sqrt(a())*1600,f=Math.cos(l)*m,u=Math.sin(l)*m;if(!Xe(f,u,110)||r.some(d=>Math.hypot(d.x-f,d.z-u)<200))continue;const h=16+a()*18;r.push({x:f,y:_+70+a()*70,z:u,sx:h*1.4,sy:h*.62,sz:h,ry:a()*Math.PI*2,variant:3+n%2,shadow:!0}),n++}const e=18;for(let n=0;n<e;n++){const o=n/e*Math.PI*2+a()*.25,l=2350+a()*650,m=130+a()*120;r.push({x:Math.cos(o)*l,y:_+25+a()*60,z:Math.sin(o)*l,sx:m*1.7,sy:m*(.5+a()*.3),sz:m,ry:a()*Math.PI*2,variant:n%3,shadow:!1})}return r}const xo=`
uniform float uTime;
uniform float uDrift;
uniform float uWrap;
varying vec3 vN;
varying vec3 vWorld;
varying vec3 vLocal;
varying float vFade;
#include <fog_pars_vertex>
void main() {
  vec3 ip = instanceMatrix[3].xyz;
  float nx = mod(ip.x + uTime * uDrift + uWrap, uWrap * 2.0) - uWrap;
  vec3 p = position;
  p += normal * sin(uTime * 0.25 + position.x * 1.3 + position.z * 1.1 + ip.x * 0.01) * 0.02;
  vec4 wp = instanceMatrix * vec4(p, 1.0);
  wp.x += nx - ip.x;
  vWorld = wp.xyz;
  vLocal = position;
  vN = normalize(mat3(instanceMatrix) * normal);
  vec4 mvPosition = viewMatrix * wp;
  vFade = smoothstep(14.0, 60.0, -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`,vo=`
uniform vec3 uSunDir;
uniform vec3 uLit;
uniform vec3 uShadow;
uniform vec3 uRim;
uniform vec3 uWarm;
varying vec3 vN;
varying vec3 vWorld;
varying vec3 vLocal;
varying float vFade;
#include <fog_pars_fragment>
float h31(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.zyx + 31.32);
  return fract((p.x + p.y) * p.z);
}
float vnoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(h31(i), h31(i + vec3(1, 0, 0)), f.x), mix(h31(i + vec3(0, 1, 0)), h31(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(h31(i + vec3(0, 0, 1)), h31(i + vec3(1, 0, 1)), f.x), mix(h31(i + vec3(0, 1, 1)), h31(i + vec3(1, 1, 1)), f.x), f.y),
    f.z);
}
void main() {
  vec3 n = normalize(vN);
  vec3 v = normalize(cameraPosition - vWorld);
  float brush = vnoise(vLocal * 6.0) * 0.6 + vnoise(vLocal * 15.0) * 0.4;
  // Dissolve near the camera in world-anchored wisps.
  if (vFade < 0.999 && vFade < vnoise(vWorld * 0.35) * 0.6 + brush * 0.4) discard;
  // Ragged, brushy silhouette.
  float edge = 1.0 - abs(dot(n, v));
  if (edge * 1.35 - brush * 0.55 > 0.86) discard;
  // Two soft tones: lit cream and pale-blue shade, with a painted transition.
  float ndl = dot(n, uSunDir) + (brush - 0.5) * 0.35;
  float lit = smoothstep(-0.18, 0.32, ndl);
  vec3 col = mix(uShadow, uLit, lit);
  // Sunlit tops take a warm pink blush; flat undersides sit in lavender-blue shade.
  col = mix(col, uWarm, lit * smoothstep(0.15, 0.85, n.y + (brush - 0.5) * 0.3) * 0.55);
  col = mix(col, uShadow * 0.96, smoothstep(0.12, -0.25, vLocal.y) * 0.7);
  // Soft bright rim and gentle paper texture.
  col = mix(col, uRim, pow(edge, 3.0) * 0.35 * lit);
  col *= 0.97 + brush * 0.06;
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;function He(s){return new ge({vertexShader:xo,fragmentShader:vo,fog:!0,uniforms:{...lt.clone(ut.fog),uTime:$.uTime,uDrift:{value:s},uWrap:{value:xt},uSunDir:{value:R.sunDir},uLit:{value:R.cloudLit},uShadow:{value:R.cloudShadow},uRim:{value:R.cloudRim},uWarm:{value:R.cloudWarm}}})}function ye(s,a){const r=ce(s),i=[],t=3+Math.floor(r()*2);for(let p=0;p<t;p++){const g=t===1?0:p/(t-1)-.5,v=.55+r()*.2;i.push({c:new P(g*1.9,.18,(r()-.5)*.5),r:new P(v*1.25,v*.7,v)})}const e=1+Math.floor(r()*2+a);for(let p=0;p<e;p++){const g=e===1?0:p/(e-1)-.5,v=.5+r()*.2+a*.08;i.push({c:new P(g*1.1+(r()-.5)*.3,.5+r()*.15*a,(r()-.5)*.3),r:new P(v,v*(.85+a*.15),v*.9)})}const n=new P;i.forEach(p=>n.add(p.c)),n.divideScalar(i.length);const o=i.map((p,g)=>{const v=new _t(1,3);v.deleteAttribute("uv"),v.deleteAttribute("normal");const j=Dt(v),y=j.getAttribute("position"),M=new P;for(let k=0;k<y.count;k++){M.fromBufferAttribute(y,k);const S=1+Jt(M.x*1.6+g*5.3,M.y*1.6+M.z*1.3,s)*.07;M.multiply(p.r).multiplyScalar(S).add(p.c),M.y<.02&&(M.y=.02+(M.y-.02)*.12),y.setXYZ(k,M.x,M.y,M.z)}return j}),l=ct(o);l.computeVertexNormals();const m=l.getAttribute("position"),f=l.getAttribute("normal"),u=new P,h=new P,d=new P;for(let p=0;p<m.count;p++)u.fromBufferAttribute(m,p),h.fromBufferAttribute(f,p),d.copy(u).sub(n).multiply(new P(.6,1,.8)).normalize(),h.lerp(d,.55).normalize(),f.setXYZ(p,h.x,h.y,h.z);return l}function yo({density:s}){const a=x.useMemo(()=>{const r=[ye(11,.9),ye(23,.5),ye(37,1.3),ye(41,.6),ye(59,1)],i=r.map(n=>({geo:n,mat:He(gt),matrices:[]})),t=r.map(n=>({geo:n,mat:He(0),matrices:[]})),e=new ne;for(const n of vt(s))e.position.set(n.x,n.y,n.z),e.rotation.set(0,n.ry,0),e.scale.set(n.sx/1.5,n.sy,n.sz),e.updateMatrix(),(n.shadow?i:t)[n.variant%r.length].matrices.push(e.matrix.clone());return[...i,...t].filter(n=>n.matrices.length)},[s]);return c.jsx(c.Fragment,{children:a.map((r,i)=>c.jsx(wo,{layer:r},i))})}function wo({layer:s}){const a=x.useMemo(()=>{const r=new se(s.geo,s.mat,s.matrices.length);return s.matrices.forEach((i,t)=>r.setMatrixAt(t,i)),r.instanceMatrix.needsUpdate=!0,r.frustumCulled=!1,r},[s]);return c.jsx("primitive",{object:a})}function Mo(s,a){const r=[],i=s.regions.flatMap(t=>t.islands.map(e=>e.terrain));for(const t of i){const e=t.p,n=ce(e.seed*17+3),o=e.y+t.maxTop;if(e.profile==="shore"){const l=2*Math.PI*(t.meanRadius+t.flare*t.meanScale),m=Math.max(5,Math.min(44,Math.round(l/34*a)));for(let f=0;f<m;f++){if(n()<.3)continue;const u=(f+n()*.7)/m*Math.PI*2,[h,d]=t.coastPoint(u),p=Math.hypot(h,d)||1,g=4+n()*18;r.push({x:e.x+h+h/p*g,y:_+3+n()*8,z:e.z+d+d/p*g,w:40+n()*45,h:13+n()*10})}if(o-_>45){const f=Math.round(m/4*(.6+n()*.6));for(let u=0;u<f;u++){const h=n()*Math.PI*2,[d,p,g]=t.slopePoint(h,.3+n()*.4,!1),v=Math.hypot(d,g)||1;r.push({x:e.x+d+d/v*(22+n()*14),y:e.y+p+6,z:e.z+g+g/v*(22+n()*14),w:30+n()*25,h:9+n()*6})}}}else if(e.profile==="column"&&e.y-e.depth<_){const l=o-_;for(let m=0;m<Math.round(6*a)+2;m++){const f=n()*Math.PI*2,u=t.boundRadius*(.6+n()*.4)+4;r.push({x:e.x+Math.cos(f)*u,y:_+5+n()*l*.25,z:e.z+Math.sin(f)*u,w:34+n()*28,h:11+n()*8,a:1.3})}if(l>40){const m=l>75?[.45,.75]:[.6];for(const f of m){const u=_+l*f,h=Math.max(5,Math.round(9*a));for(let d=0;d<h;d++){if(n()<.15)continue;const p=(d+n()*.5)/h*Math.PI*2,g=t.boundRadius*.65+4+n()*8;r.push({x:e.x+Math.cos(p)*g,y:u+(n()-.5)*6,z:e.z+Math.sin(p)*g,w:34+n()*26,h:11+n()*7,a:1.8})}}}}else if(e.profile==="taper"&&e.y>_){const l=t.boundRadius,m=l>12,f=m?Math.max(8,Math.round(12*a)):3;for(let u=0;u<f;u++){const h=(u+n()*.6)/f*Math.PI*2,d=l*(m?.85:.9)+3+n()*7,p=m?1:.55;r.push({x:e.x+Math.cos(h)*d,y:e.y-3-n()*5,z:e.z+Math.sin(h)*d,w:(36+n()*28)*p,h:(11+n()*7)*p,a:1.8})}if(m){const u=Math.max(4,Math.round(7*a));for(let h=0;h<u;h++){const d=n()*Math.PI*2,p=.25+n()*.45,g=l*(1-p)*.7+4;r.push({x:e.x+Math.cos(d)*g,y:e.y-e.depth*p,z:e.z+Math.sin(d)*g,w:30+n()*24,h:10+n()*6,a:1.4})}r.push({x:e.x,y:e.y-e.depth*.95,z:e.z,w:40,h:14,a:1.2})}}else if(e.profile==="taper"&&e.y<_&&o>_+60){const l=o-_,m=[[.04,16,1.2],[.28,14,1.9],[.5,14,2.1],[.7,12,2.1],[.86,9,1.9]];for(const[f,u,h]of m){const d=_+l*f,p=Math.round(u*a);for(let g=0;g<p;g++){if(n()<.15)continue;const v=(g+n()*.6)/p*Math.PI*2,j=bo(t,v,d-e.y)+4+n()*14,y=f>.2?1.35:1;r.push({x:e.x+Math.cos(v)*j*e.sx,y:d+n()*8,z:e.z+Math.sin(v)*j*e.sz,w:(55+n()*50)*y,h:(16+n()*12)*y,a:h})}}for(let f=0;f<4;f++){const u=n()*Math.PI*2;r.push({x:e.x+Math.cos(u)*12,y:o+4+n()*8,z:e.z+Math.sin(u)*12,w:70+n()*30,h:22+n()*8,a:1.6})}}}return r}function bo(s,a,r){const i=s.p.radius;for(let t=0;t<i*1.2;t+=4)if(s.heightLocal(Math.cos(a)*t*s.p.sx,Math.sin(a)*t*s.p.sz)<r)return t;return i}const jo=`
attribute vec3 iCenter;
attribute vec2 iSize;
attribute float iPhase;
attribute float iAlpha;
uniform float uTime;
varying vec2 vUv;
varying float vFade;
varying float vDepth;
varying float vPhase;
varying float vAlpha;
void main() {
  vec3 c = iCenter;
  vAlpha = iAlpha;
  // Slow drift and breathing.
  c.x += sin(uTime * 0.045 + iPhase) * 7.0;
  c.z += cos(uTime * 0.037 + iPhase * 1.3) * 7.0;
  float breathe = 1.0 + 0.07 * sin(uTime * 0.18 + iPhase * 3.0);
  // Seen from above, a bank reads as a patch rather than a horizontal streak.
  vec3 toC = normalize(c - cameraPosition);
  float steep = smoothstep(0.35, 0.9, abs(toC.y));
  vec2 size = vec2(iSize.x, mix(iSize.y, iSize.x * 0.75, steep)) * breathe;
  vec4 mv = modelViewMatrix * vec4(c, 1.0);
  mv.xy += position.xy * size;
  vUv = position.xy + 0.5;
  vPhase = iPhase;
  vDepth = -mv.z;
  // Thins out as you fly into it, so it never whites out the view.
  vFade = smoothstep(30.0, 110.0, vDepth);
  gl_Position = projectionMatrix * mv;
}`,zo=`
uniform float uTime;
uniform float uOpacity;
uniform vec3 uLit;
uniform vec3 uShade;
uniform vec3 fogColor;
uniform float fogNear;
uniform float fogFar;
varying vec2 vUv;
varying float vFade;
varying float vDepth;
varying float vPhase;
varying float vAlpha;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  // Billowy edge: soft ellipse broken up by drifting noise.
  float n = noise(vUv * vec2(4.0, 2.5) + vec2(uTime * 0.02 + vPhase, vPhase * 1.7)) * 0.65
          + noise(vUv * vec2(9.0, 6.0) + vec2(vPhase * 3.1 - uTime * 0.03, 0.0)) * 0.35;
  float r = length(p);
  float a = smoothstep(1.0, 0.2, r + (n - 0.5) * 0.7);
  // Denser toward the bottom, wispy on top.
  a *= mix(1.0, 0.65, vUv.y);
  a = min(a * uOpacity * vAlpha, 0.92) * vFade;
  float fog = smoothstep(fogNear, fogFar, vDepth);
  vec3 col = mix(uShade, uLit, smoothstep(0.0, 1.0, vUv.y * 0.8 + n * 0.3));
  col = mix(col, fogColor, fog);
  a *= 1.0 - fog * 0.6;
  if (a < 0.004) discard;
  gl_FragColor = vec4(col, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;function So({world:s,density:a}){const r=pe(e=>e.scene),{geometry:i,material:t}=x.useMemo(()=>{const e=Mo(s,a),n=new Wt,o=new Fe(1,1);n.index=o.index,n.setAttribute("position",o.getAttribute("position"));const l=new Float32Array(e.length*3),m=new Float32Array(e.length*2),f=new Float32Array(e.length),u=new Float32Array(e.length);e.forEach((d,p)=>{l.set([d.x,d.y,d.z],p*3),m.set([d.w,d.h],p*2),f[p]=p*2.399%(Math.PI*2),u[p]=d.a??1}),n.setAttribute("iCenter",new K(l,3)),n.setAttribute("iSize",new K(m,2)),n.setAttribute("iPhase",new K(f,1)),n.setAttribute("iAlpha",new K(u,1)),n.instanceCount=e.length;const h=new ge({vertexShader:jo,fragmentShader:zo,transparent:!0,depthWrite:!1,side:ae,uniforms:{uTime:{value:0},uOpacity:{value:.4},uLit:{value:new w("#fbfaf6")},uShade:{value:new w("#d3e5ec")},fogColor:{value:new w("#cfe6ee")},fogNear:{value:420},fogFar:{value:3e3}}});return{geometry:n,material:h}},[s,a]);return T((e,n)=>{L.getState().settings.reducedMotion||(t.uniforms.uTime.value+=n);const o=r.fog;o&&(t.uniforms.fogColor.value.copy(o.color),t.uniforms.fogNear.value=o.near,t.uniforms.fogFar.value=o.far)}),c.jsx("mesh",{geometry:i,material:t,frustumCulled:!1,renderOrder:2})}const ke=1450,Po=1536,We=200;function ko(s){const a=s.p,r=160,i=[];if(a.profile==="taper"&&a.y>_||a.profile==="taper"&&a.y+s.maxTop<_)return null;for(let t=0;t<r;t++){const e=t/r*Math.PI*2,n=a.radius*s.edge(e),o=Math.cos(e)*n*a.sx,l=Math.sin(e)*n*a.sz;let m=1;if(a.profile==="shore")m=1+s.coastExtra(e)/n;else if(a.profile==="column"){if(a.y-a.depth>_)return null;const f=Math.min(1,Math.max(0,(a.y-a.rimDrop-2.5-_)/Math.max(1,a.depth-2.5)));m=s.profileAt(f,s.thetaOf(o,l))}else{let f=1;for(;f>0&&a.y+s.heightLocal(o*f,l*f)<_;)f-=.01;if(m=f,f<=.01)continue}i.push([a.x+o*m,a.z+l*m])}return i.length>2?i:null}function To(s){const a=Po,r=a/(ke*2),i=document.createElement("canvas");i.width=i.height=a;const t=i.getContext("2d");t.fillStyle="#000",t.fillRect(0,0,a,a),t.fillStyle="#fff";for(const h of s.regions)for(const d of h.islands){const p=ko(d.terrain);p&&(t.beginPath(),p.forEach(([g,v],j)=>{const y=(g+ke)*r,M=(v+ke)*r;j?t.lineTo(y,M):t.moveTo(y,M)}),t.closePath(),t.fill())}const e=t.getImageData(0,0,a,a).data,n=1e9,o=new Float32Array(a*a);for(let h=0;h<a*a;h++)o[h]=e[h*4]>127?0:n;const l=Math.SQRT2;for(let h=0;h<a;h++)for(let d=0;d<a;d++){const p=h*a+d;let g=o[p];g!==0&&(d>0&&(g=Math.min(g,o[p-1]+1)),h>0&&(g=Math.min(g,o[p-a]+1),d>0&&(g=Math.min(g,o[p-a-1]+l)),d<a-1&&(g=Math.min(g,o[p-a+1]+l))),o[p]=g)}for(let h=a-1;h>=0;h--)for(let d=a-1;d>=0;d--){const p=h*a+d;let g=o[p];g!==0&&(d<a-1&&(g=Math.min(g,o[p+1]+1)),h<a-1&&(g=Math.min(g,o[p+a]+1),d<a-1&&(g=Math.min(g,o[p+a+1]+l)),d>0&&(g=Math.min(g,o[p+a-1]+l))),o[p]=g)}const m=new Uint8Array(a*a*4),f=1/r;for(let h=0;h<a*a;h++){const d=Math.min(We,o[h]*f);m[h*4]=Math.round(d/We*255),m[h*4+3]=255}const u=new Lt(m,a,a,Bt,Nt);return u.wrapS=u.wrapT=Ot,u.magFilter=Ne,u.minFilter=Ne,u.generateMipmaps=!1,u.needsUpdate=!0,u}const Fo=`
varying vec3 vWorld;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`,Ao=`
#define CLOUDS ${De}
uniform float uTime;
uniform sampler2D uCoast;
uniform float uExtent;
uniform float uMaxDist;
uniform vec3 uDeep;
uniform vec3 uOpen;
uniform vec3 uMid;
uniform vec3 uShallow;
uniform vec3 uLagoon;
uniform vec3 uFoam;
uniform vec3 uShade;
uniform vec3 uFar;
uniform vec3 uSunDir;
uniform vec3 uGlow;
uniform vec4 uClouds[CLOUDS];
uniform int uCloudCount;
uniform float uDrift;
uniform float uWrap;
uniform vec4 uPlane;     // shadow x, z, heading, roll
uniform vec2 uPlaneInfo; // height above sea, visibility
varying vec3 vWorld;

float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), u.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0; float a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * vn(p); p = p * 2.03 + 17.1; a *= 0.5; }
  return v;
}
float box(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

void main() {
  vec2 p = vWorld.xz;
  float dist = length(cameraPosition.xz - p);
  float aa = 0.35 + dist * 0.0025;

  // Distance to land (m); far from the map counts as open ocean.
  vec2 cuv = (p + uExtent) / (2.0 * uExtent);
  float d = uMaxDist;
  if (cuv.x > 0.0 && cuv.x < 1.0 && cuv.y > 0.0 && cuv.y < 1.0) d = texture2D(uCoast, cuv).r * uMaxDist;

  // Broad painted depth: big flat darker shapes with crisp, brushy edges over open blue.
  float n1 = fbm(p * 0.0011 + 4.2);
  float n2 = fbm(p * 0.0045 - 1.7);
  float n3 = vn(p * 0.05);
  float edgeJ = (vn(p * 0.012) - 0.5) * 0.04;
  vec3 col = mix(uOpen, uDeep, smoothstep(0.49, 0.52, n1 + edgeJ) * 0.85);
  col = mix(col, uMid, smoothstep(0.6, 0.63, n2 + edgeJ) * 0.25);

  // Shallows: turquoise rings with irregular painted edges.
  float dn = d + (n2 - 0.5) * 26.0 + (n3 - 0.5) * 3.0;
  col = mix(col, uMid, 1.0 - smoothstep(55.0, 130.0, dn));
  col = mix(col, uShallow, 1.0 - smoothstep(12.0, 52.0, dn));
  col = mix(col, uLagoon, (1.0 - smoothstep(1.0, 14.0, dn)) * 0.75);

  // Foam: a bright line at the beach plus a slow second swell line.
  float df = d + (n3 - 0.5) * 2.2;
  float foam = 1.0 - smoothstep(0.6, 2.6 + aa, df);
  float swell = 5.5 + sin(uTime * 0.7 + n2 * 9.0) * 1.6;
  foam = max(foam, (1.0 - smoothstep(0.0, 0.7 + aa, abs(df - swell))) * 0.55 * smoothstep(0.3, 0.6, n3));
  col = mix(col, uFoam, foam * (1.0 - smoothstep(500.0, 1100.0, dist)));

  // Wave dashes: short white strokes that fade in and out, aligned with the wind.
  vec2 wdir = normalize(vec2(0.85, 0.53));
  vec2 q = vec2(dot(p, wdir), dot(p, vec2(-wdir.y, wdir.x)));
  q.x += uTime * 0.6;
  vec2 cellSize = vec2(17.0, 9.0);
  vec2 cell = floor(q / cellSize);
  vec2 f = q - cell * cellSize;
  float rid = h21(cell);
  vec2 c = vec2(0.25 + 0.5 * h21(cell + 7.3), 0.3 + 0.4 * h21(cell + 3.1)) * cellSize;
  vec2 dd = f - c;
  float len = 1.4 + 2.4 * h21(cell + 11.7);
  float seg = length(vec2(max(abs(dd.x) - len, 0.0), dd.y));
  float dash = 1.0 - smoothstep(0.16, 0.16 + aa * 0.5, seg);
  float life = smoothstep(0.1, 0.7, sin(uTime * 0.55 + rid * 40.0));
  dash *= life * step(0.55, rid) * (1.0 - smoothstep(260.0, 900.0, dist)) * smoothstep(8.0, 30.0, d);
  col = mix(col, uFoam, dash * 0.85);

  // Cloud shadows drift with the clouds.
  float sh = 0.0;
  for (int i = 0; i < CLOUDS; i++) {
    if (i >= uCloudCount) break;
    vec4 cl = uClouds[i];
    float cx = mod(cl.x + uTime * uDrift + uWrap, uWrap * 2.0) - uWrap;
    vec2 rel = (p - vec2(cx, cl.y)) / cl.zw;
    float r = length(rel) + (vn(p * 0.02 + float(i) * 7.0) - 0.5) * 0.35;
    sh = max(sh, 1.0 - smoothstep(0.82, 0.92, r));
  }
  // Painted cloud shadows: flat, darker patches with a fairly crisp edge.
  col = mix(col, uShade, sh * 0.5);

  // The plane's soft silhouette, projected along the sun.
  if (uPlaneInfo.y > 0.0) {
    vec2 rp = p - uPlane.xy;
    float ch = cos(uPlane.z), sn = sin(uPlane.z);
    vec2 lp = vec2(rp.x * ch - rp.y * sn, rp.x * sn + rp.y * ch);
    float span = 4.7 * max(0.25, abs(cos(uPlane.w)));
    float sdf = box(lp - vec2(0.0, -0.2), vec2(span, 0.95), 0.6);
    sdf = min(sdf, box(lp - vec2(0.0, 0.3), vec2(0.75, 3.1), 0.7));
    sdf = min(sdf, box(lp - vec2(0.0, 3.0), vec2(2.0 * max(0.3, abs(cos(uPlane.w))), 0.5), 0.35));
    float soft = 0.25 + uPlaneInfo.x * 0.006;
    float a = 1.0 - smoothstep(-soft, soft, sdf);
    col = mix(col, uShade, a * uPlaneInfo.y);
  }

  // A broad, gentle sheen toward the sun; no sharp glints.
  vec3 vd = normalize(vWorld - cameraPosition);
  float sun = pow(max(dot(normalize(vec3(vd.x, 0.0, vd.z)), normalize(vec3(uSunDir.x, 0.0, uSunDir.z))), 0.0), 4.0);
  col = mix(col, uGlow, sun * smoothstep(300.0, 2500.0, dist) * 0.18);

  // Paper grain and distance haze.
  col *= 0.985 + vn(p * 0.9) * 0.03;
  // Lighter blue toward the horizon, never milky.
  col = mix(col, uFar, smoothstep(800.0, 3800.0, dist) * 0.8);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;function Co({world:s,density:a}){const r=x.useRef(null),{geo:i,mat:t}=x.useMemo(()=>{const e=new Fe(9e3,9e3,1,1);e.rotateX(-Math.PI/2);const n=Array.from({length:De},()=>new Be),o=R.sunDir;let l=0;for(const u of vt(a)){if(!u.shadow||l>=De)continue;const h=u.y-_;n[l++].set(u.x-o.x/o.y*h,u.z-o.z/o.y*h,u.sx*.9,u.sz*.9)}const m=R.ocean,f=new ge({vertexShader:Fo,fragmentShader:Ao,uniforms:{uTime:$.uTime,uCoast:{value:To(s)},uExtent:{value:ke},uMaxDist:{value:We},uDeep:{value:m.deep},uOpen:{value:m.open},uMid:{value:m.mid},uShallow:{value:m.shallow},uLagoon:{value:m.lagoon},uFoam:{value:m.foam},uShade:{value:m.shade},uFar:{value:m.far},uSunDir:{value:R.sunDir},uGlow:{value:R.sunGlow},uClouds:{value:n},uCloudCount:{value:l},uDrift:{value:gt},uWrap:{value:xt},uPlane:{value:new Be},uPlaneInfo:{value:new Te}}});return{geo:e,mat:f}},[s,a]);return T(({camera:e})=>{r.current&&r.current.position.set(Math.round(e.position.x/50)*50,_,Math.round(e.position.z/50)*50);const n=b.pose,o=Math.max(0,n.y-_),l=R.sunDir;t.uniforms.uPlane.value.set(n.x-l.x/l.y*o,n.z-l.z/l.y*o,n.heading,n.roll),t.uniforms.uPlaneInfo.value.set(o,.6*(1-Math.min(1,Math.max(0,(o-40)/600))))}),c.jsx("mesh",{ref:r,geometry:i,material:t,frustumCulled:!1,renderOrder:-5})}const Ze=new Map;function Eo(s,a,r,i,t,e){s.beginPath(),s.moveTo(a+e,r),s.arcTo(a+i,r,a+i,r+t,e),s.arcTo(a+i,r+t,a,r+t,e),s.arcTo(a,r+t,a,r,e),s.arcTo(a,r,a+i,r,e),s.closePath()}function Io(s){const a=JSON.stringify(s),r=Ze.get(a);if(r)return r;const i=Math.min(96,1024/Math.max(s.w,s.h)),t=Math.round(s.w*i),e=Math.round(s.h*i),n=document.createElement("canvas");n.width=t,n.height=e;const o=n.getContext("2d"),l=s.bg??"#fbf3e2",m=s.fg??"#1f3552",f=s.accent??"#f2735a";if(o.clearRect(0,0,t,e),s.arrow){const h=e*.5;o.beginPath(),s.flip?(o.moveTo(0,e/2),o.lineTo(h,0),o.lineTo(t,0),o.lineTo(t,e),o.lineTo(h,e)):(o.moveTo(0,0),o.lineTo(t-h,0),o.lineTo(t,e/2),o.lineTo(t-h,e),o.lineTo(0,e)),o.closePath(),o.fillStyle=l,o.fill(),o.lineWidth=e*.08,o.strokeStyle="#6b4428",o.stroke(),o.fillStyle=m,o.font=`800 ${Math.round(e*.42)}px 'Nunito', sans-serif`,o.textBaseline="middle",o.textAlign="center";const d=s.flip?(t+h)/2:(t-h)/2;let p=s.lines[0];for(;o.measureText(p).width>t-h-e*.3&&p.length>3;)p=p.slice(0,-2)+"…";o.fillText(p,d,e/2+e*.03)}else if(o.fillStyle=l,Eo(o,0,0,t,e,Math.min(t,e)*.08),o.fill(),s.style!=="screen"&&(o.fillStyle=f,o.fillRect(0,e-e*.06,t,e*.06)),o.textAlign="center",o.textBaseline="middle",o.fillStyle=m,s.style==="welcome")o.font=`700 ${Math.round(e*.11)}px 'Nunito', sans-serif`,o.fillText(s.lines[0],t/2,e*.2),o.font=`800 ${Math.round(e*.34)}px 'Zain', 'Nunito', sans-serif`,o.fillStyle=f,o.fillText(s.lines[1],t/2,e*.5),o.fillStyle=m,o.font=`800 ${Math.round(e*.1)}px 'Nunito', sans-serif`,o.fillText(s.lines[2]??"",t/2,e*.78);else if(s.style==="board")o.textAlign="left",o.font=`700 ${Math.round(e*.15)}px 'Nunito', sans-serif`,o.fillText(s.lines[0],t*.08,e*.18),o.fillStyle=f,o.fillRect(t*.08,e*.3,t*.84,e*.025),o.fillStyle=m,o.font=`700 ${Math.round(e*.105)}px 'Nunito', sans-serif`,s.lines.slice(1).forEach((h,d)=>o.fillText(`▪ ${h}`,t*.08,e*(.45+d*.16)));else{const h=s.lines.length,d=s.font?s.font/100*e:e/(h*1.55);s.lines.forEach((p,g)=>{const v=g===0;o.font=`${v?800:700} ${Math.round(d*(v?1:.78))}px 'Nunito', sans-serif`;let j=p;for(;o.measureText(j).width>t*.92&&j.length>3;)j=j.slice(0,-2)+"…";o.fillText(j,t/2,e*(g+.5)/h)})}const u=new ft(n);return u.colorSpace=Ut,u.anisotropy=8,Ze.set(a,u),u}const oe=(s,a={})=>Object.assign(new B({color:s,flatShading:!0,roughness:.8}),a);function Ro({anchors:s}){return c.jsx(c.Fragment,{children:s.map((a,r)=>c.jsx(Go,{a},r))})}function Go({a:s}){const a=s.data,{front:r,back:i}=x.useMemo(()=>{const t=e=>new U({map:Io({...a,flip:e}),transparent:!!a.arrow,alphaTest:a.arrow?.5:0,toneMapped:!0});return{front:t(!1),back:a.doubleSided?t(!!a.arrow):null}},[a]);return c.jsxs("group",{position:[s.x,s.y,s.z],rotation:[a.rx??0,s.ry??0,0],"rotation-order":"YXZ",children:[c.jsx("mesh",{material:r,children:c.jsx("planeGeometry",{args:[a.w,a.h]})}),i&&c.jsx("mesh",{material:i,rotation:[0,Math.PI,0],position:[0,0,-.02],children:c.jsx("planeGeometry",{args:[a.w,a.h]})})]})}function _o(s){const a=new B({color:s,side:ae,roughness:.7,flatShading:!0});return a.onBeforeCompile=r=>{r.uniforms.uTime=$.uTime,r.vertexShader=r.vertexShader.replace("#include <common>",`#include <common>
uniform float uTime;`).replace("#include <begin_vertex>",`#include <begin_vertex>
float k = (position.x + 1.5) / 3.0;
transformed.z += sin(position.x * 2.2 - uTime * 7.0 + position.y) * 0.32 * k;
transformed.y += sin(position.x * 1.4 - uTime * 5.0) * 0.08 * k;`)},a}function Do({anchors:s}){const a=x.useMemo(()=>new Fe(3,1.9,12,4).translate(1.5,0,0),[]),r=x.useMemo(()=>s.map(i=>{var t;return _o(((t=i.data)==null?void 0:t.color)??z.coral)}),[s]);return c.jsx(c.Fragment,{children:s.map((i,t)=>c.jsx("mesh",{geometry:a,material:r[t],position:[i.x,i.y,i.z],rotation:[0,.9+(i.ry??0),0]},t))})}function Wo({anchors:s}){const a=x.useRef([]),r=x.useMemo(()=>{const e=new mt([new Te(.55,0),new Te(.25,3.2)],10);return e.rotateZ(-Math.PI/2),e},[]),i=x.useMemo(()=>{const e=r.clone().toNonIndexed(),n=e.getAttribute("position"),o=new Float32Array(n.count*3),l=new w(z.coral),m=new w(z.white);for(let f=0;f<n.count;f+=3){const u=(n.getX(f)+n.getX(f+1)+n.getX(f+2))/3,h=Math.floor(u/.64)%2?m:l;for(let d=0;d<3;d++)o.set([h.r,h.g,h.b],(f+d)*3)}return e.setAttribute("color",new Y(o,3)),e},[r]),t=x.useMemo(()=>new B({vertexColors:!0,side:ae,flatShading:!0}),[]);return T(({clock:e})=>{const n=e.elapsedTime;a.current.forEach((o,l)=>{o&&(o.rotation.y=.9+Math.sin(n*.7+l)*.25,o.rotation.z=-.15+Math.sin(n*3.1+l)*.06)})}),c.jsx(c.Fragment,{children:s.map((e,n)=>c.jsx("group",{ref:o=>a.current[n]=o,position:[e.x,e.y,e.z],children:c.jsx("mesh",{geometry:i,material:t})},n))})}function Ye({anchors:s,dishes:a=!1}){const r=x.useRef([]),i=x.useMemo(()=>({white:oe(z.white),dark:oe(z.metalDark),accent:oe(z.coral)}),[]);return T((t,e)=>{r.current.forEach((n,o)=>{n&&(n.rotation.y+=e*(a?.25+o%3*.08:1.1))})}),c.jsx(c.Fragment,{children:s.map((t,e)=>c.jsxs("group",{position:[t.x,t.y,t.z],scale:t.s??1,children:[c.jsx("mesh",{material:i.dark,position:[0,-.6,0],children:c.jsx("cylinderGeometry",{args:[.25,.4,1.2,6]})}),c.jsxs("group",{ref:n=>r.current[e]=n,children:[c.jsx("mesh",{material:i.white,rotation:[a?-.9:-1.25,0,0],position:[0,.5,0],children:c.jsx("sphereGeometry",{args:[a?2.2:1.6,14,6,0,Math.PI*2,0,.9]})}),c.jsx("mesh",{material:i.accent,position:[0,.5,a?1.2:.9],children:c.jsx("boxGeometry",{args:[.15,.15,a?2.2:1.6]})})]})]},e))})}function Lo({anchors:s}){const a=x.useMemo(()=>s.map(r=>{var i;return new U({color:new w(((i=r.data)==null?void 0:i.color)??"#ff4b3e").multiplyScalar(1.15),toneMapped:!1})}),[s]);return c.jsx(c.Fragment,{children:s.map((r,i)=>c.jsx("mesh",{position:[r.x,r.y,r.z],material:a[i],children:c.jsx("sphereGeometry",{args:[.45*(r.s??1),10,8]})},i))})}function Qe({anchors:s,turbine:a=!1}){const r=x.useRef([]),i=x.useMemo(()=>({sail:oe(z.cream),frame:oe(z.woodDark),white:oe(z.white),hub:oe(z.coral)}),[]);return T((t,e)=>{r.current.forEach((n,o)=>{n&&(n.rotation.z+=e*(a?.9+o%3*.15:.55))})}),c.jsx(c.Fragment,{children:s.map((t,e)=>c.jsx("group",{position:[t.x,t.y,t.z],rotation:[0,t.ry??0,0],scale:t.s??1,children:c.jsxs("group",{ref:n=>r.current[e]=n,position:[0,0,.4],children:[c.jsx("mesh",{material:i.hub,children:c.jsx("cylinderGeometry",{args:[.45,.45,.6,8]})}),(a?[0,1,2]:[0,1,2,3]).map(n=>c.jsx("group",{rotation:[0,0,n*Math.PI*2/(a?3:4)],children:a?c.jsx("mesh",{material:i.white,position:[0,6.5,0],children:c.jsx("boxGeometry",{args:[.7,13,.18]})}):c.jsxs(c.Fragment,{children:[c.jsx("mesh",{material:i.frame,position:[0,4,0],children:c.jsx("boxGeometry",{args:[.25,8,.2]})}),c.jsx("mesh",{material:i.sail,position:[.75,4.6,.05],children:c.jsx("boxGeometry",{args:[1.3,6.4,.08]})})]})},n))]})},e))})}function Bo({anchors:s}){const a=x.useMemo(()=>{const r=new B({color:z.water,roughness:.08,metalness:.25,emissive:new w("#1d6f8a"),emissiveIntensity:.25});return r.onBeforeCompile=i=>{i.uniforms.uTime=$.uTime,i.vertexShader=i.vertexShader.replace("#include <common>",`#include <common>
varying vec2 vWp;`).replace("#include <begin_vertex>",`#include <begin_vertex>
vWp = (modelMatrix * vec4(transformed, 1.0)).xz;`),i.fragmentShader=i.fragmentShader.replace("#include <common>",`#include <common>
uniform float uTime;
varying vec2 vWp;`).replace("#include <emissivemap_fragment>",`#include <emissivemap_fragment>
float sp = sin(vWp.x * 1.3 + uTime * 1.1) * sin(vWp.y * 1.7 - uTime * 0.9);
totalEmissiveRadiance += vec3(0.9, 0.95, 1.0) * smoothstep(0.9, 1.0, sp) * 0.35 * (1.0 - smoothstep(60.0, 180.0, length(vViewPosition)));`)},r.customProgramCacheKey=()=>"skybound-pond-v2",r},[]);return c.jsx(c.Fragment,{children:s.map((r,i)=>{var t;return(t=r.data)!=null&&t.w?c.jsx("mesh",{material:a,position:[r.x,r.y,r.z],rotation:[-Math.PI/2,0,r.ry??0],receiveShadow:!0,children:c.jsx("planeGeometry",{args:[r.data.w,r.data.l]})},i):c.jsx("mesh",{material:a,position:[r.x,r.y,r.z],rotation:[-Math.PI/2,0,0],receiveShadow:!0,children:c.jsx("circleGeometry",{args:[r.s??6,28]})},i)})})}const No=`
varying vec2 vUv;
#include <fog_pars_vertex>
void main() {
  vUv = uv;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`,Oo=`
uniform float uTime;
varying vec2 vUv;
#include <fog_pars_fragment>
float hash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5); }
float n1(vec2 p) { vec2 i = floor(p); vec2 f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
void main() {
  float y = vUv.y;
  float streak = n1(vec2(vUv.x * 14.0, y * 3.0 + uTime * 2.6)) * 0.6 + n1(vec2(vUv.x * 30.0, y * 7.0 + uTime * 4.0)) * 0.4;
  vec3 col = mix(vec3(0.33, 0.72, 0.84), vec3(0.95, 0.99, 1.0), smoothstep(0.45, 0.85, streak));
  col = mix(col, vec3(1.0), smoothstep(0.92, 1.0, y) * 0.8);
  float edge = smoothstep(0.0, 0.12, vUv.x) * smoothstep(1.0, 0.88, vUv.x);
  float alpha = edge * smoothstep(0.0, 0.45, y) * (0.72 + streak * 0.28);
  gl_FragColor = vec4(col, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;function Uo({anchors:s}){const a=x.useMemo(()=>new ge({vertexShader:No,fragmentShader:Oo,transparent:!0,depthWrite:!1,side:ae,fog:!0,uniforms:{...lt.clone(ut.fog),uTime:$.uTime}}),[]),r=x.useMemo(()=>s.map(i=>{var u,h,d;const t=((u=i.data)==null?void 0:u.width)??5,e=((h=i.data)==null?void 0:h.height)??60,[n,,o]=((d=i.data)==null?void 0:d.dir)??[1,0,0],l=18,m=new Fe(t,e,1,l),f=m.getAttribute("position");for(let p=0;p<f.count;p++){const g=f.getX(p),v=1-(f.getY(p)+e/2)/e,j=Math.sqrt(Math.max(0,v))*7+.6,y=g;f.setXYZ(p,n*j-o*y,-v*e,o*j+n*y)}return m.computeBoundingSphere(),m}),[s]);return c.jsx(c.Fragment,{children:s.map((i,t)=>c.jsx("mesh",{geometry:r[t],material:a,position:[i.x,i.y,i.z],renderOrder:2},t))})}function qo(s){const a=[];for(let o=0;o<=14;o++){const l=o/14,m=l*9,f=Math.sin(Math.PI*Math.pow(l,.75))*4*(l<.15?.6+l*2.6:1)+(l<.05?.6:0);a.push(new Te(Math.max(.6,f),m))}const r=new mt(a,16).toNonIndexed(),i=r.getAttribute("position"),t=new Float32Array(i.count*3),e=new w(s[0]),n=new w(s[1]);for(let o=0;o<i.count;o+=3){const l=Math.atan2((i.getZ(o)+i.getZ(o+1)+i.getZ(o+2))/3,(i.getX(o)+i.getX(o+1)+i.getX(o+2))/3),m=Math.floor((l+Math.PI)/(Math.PI*2)*8)%2?e:n;for(let f=0;f<3;f++)t.set([m.r,m.g,m.b],(o+f)*3)}return r.setAttribute("color",new Y(t,3)),r}function Vo({anchors:s}){const a=x.useRef([]),r=x.useMemo(()=>s.map(e=>{var n;return qo(((n=e.data)==null?void 0:n.colors)??[z.coral,z.cream])}),[s]),i=x.useMemo(()=>({env:new B({vertexColors:!0,flatShading:!0,roughness:.65}),basket:oe(z.wood),rope:oe(z.woodDark)}),[]),t=x.useMemo(()=>s.map(e=>{var o;if(!((o=e.data)!=null&&o.tether))return null;const n=new xe;return n.setAttribute("position",new Y(new Float32Array([0,0,0,0,e.data.groundY-e.y,0]),3)),n}),[s]);return T(({clock:e})=>{const n=e.elapsedTime;a.current.forEach((o,l)=>{var u;if(!o)return;const m=s[l],f=(u=m.data)==null?void 0:u.path;if(f){const h=n*f.speed+l;o.position.set(f.cx+Math.cos(h)*f.r,m.y+Math.sin(n*.3+l)*3,f.cz+Math.sin(h)*f.r)}else o.position.set(m.x+Math.sin(n*.4+l)*.8,m.y+Math.sin(n*.6+l)*1.2,m.z);o.rotation.y=n*.05+l})}),c.jsx(c.Fragment,{children:s.map((e,n)=>c.jsxs("group",{ref:o=>a.current[n]=o,position:[e.x,e.y,e.z],scale:e.s??1,children:[c.jsx("mesh",{geometry:r[n],material:i.env,position:[0,2.2,0]}),c.jsx("mesh",{material:i.basket,position:[0,-.6,0],children:c.jsx("boxGeometry",{args:[1.5,1.2,1.5]})}),[-.6,.6].map(o=>[-.6,.6].map(l=>c.jsx("mesh",{material:i.rope,position:[o,1.1,l],children:c.jsx("boxGeometry",{args:[.05,2.4,.05]})},`${o}${l}`))),t[n]&&c.jsx("lineSegments",{geometry:t[n],children:c.jsx("lineBasicMaterial",{color:z.woodDark})})]},n))})}const O=(s,a={})=>Object.assign(new B({color:s,flatShading:!0,roughness:.7}),a),Ae=(s,a=3)=>new U({color:new w(s).multiplyScalar(a),toneMapped:!1});function $o(s,a,r){const i=[new Oe(s,s,r,24)];for(let e=0;e<a;e++){const n=e/a*Math.PI*2,o=new Me(s*.28,r,s*.32);o.translate(0,0,s+s*.12),o.rotateY(n),i.push(o)}const t=new Oe(s*.3,s*.3,r*1.4,12);i.push(t);for(const e of i)e.deleteAttribute("uv");return ct(i.map(e=>e.toNonIndexed()))}const Xo=s=>s==="x"?[0,0,Math.PI/2]:s==="z"?[Math.PI/2,0,0]:[0,0,0];function Ho({anchors:s}){const a=x.useRef([]),r=x.useMemo(()=>s.map(t=>{var e,n,o;return $o(((e=t.data)==null?void 0:e.r)??3,((n=t.data)==null?void 0:n.teeth)??12,((o=t.data)==null?void 0:o.w)??.8)}),[s]),i=x.useMemo(()=>s.map(t=>{var e;return O(((e=t.data)==null?void 0:e.color)??z.metal,{metalness:.4,roughness:.45})}),[s]);return T((t,e)=>a.current.forEach((n,o)=>{var l;return n&&(n.rotation.y+=e*(((l=s[o].data)==null?void 0:l.speed)??.4))})),c.jsx(c.Fragment,{children:s.map((t,e)=>{var n;return c.jsx("group",{position:[t.x,t.y,t.z],rotation:[0,t.ry??0,0],children:c.jsx("group",{rotation:Xo(((n=t.data)==null?void 0:n.axis)??"z"),children:c.jsx("mesh",{ref:o=>a.current[e]=o,geometry:r[e],material:i[e]})})},e)})})}function yt({body:s,accent:a,scale:r=1}){const i=x.useMemo(()=>O("#26272c"),[]),t=x.useMemo(()=>O("#9fd6ea",{roughness:.1,metalness:.5}),[]);return c.jsxs("group",{scale:r,children:[c.jsx("mesh",{material:s,position:[0,.7,0],children:c.jsx("boxGeometry",{args:[2.2,.8,4.6]})}),c.jsx("mesh",{material:a,position:[0,.72,0],children:c.jsx("boxGeometry",{args:[2.24,.25,4.64]})}),c.jsx("mesh",{material:t,position:[0,1.35,.2],children:c.jsx("boxGeometry",{args:[1.8,.6,2.2]})}),c.jsx("mesh",{material:s,position:[0,1.68,.25],children:c.jsx("boxGeometry",{args:[1.7,.08,1.9]})}),[-1,1].map(e=>[-1.45,1.45].map(n=>c.jsx("mesh",{material:i,position:[e*1.1,.42,n],rotation:[0,0,Math.PI/2],children:c.jsx("cylinderGeometry",{args:[.45,.45,.35,12]})},`${e}${n}`)))]})}function Zo({anchors:s}){const a=x.useRef([]),r=x.useMemo(()=>s.map(i=>{var t,e,n,o,l;return{plate:O(z.metalDark),ring:Ae(((t=i.data)==null?void 0:t.glow)??"#7fd8ff",2),body:O(((n=(e=i.data)==null?void 0:e.colors)==null?void 0:n[0])??"#2f5bff",{roughness:.25,metalness:.5}),accent:O(((l=(o=i.data)==null?void 0:o.colors)==null?void 0:l[1])??"#f2735a",{roughness:.3,metalness:.3})}}),[s]);return T(({clock:i},t)=>{a.current.forEach((e,n)=>{var l,m,f,u;if(!e)return;e.rotation.y+=t*.35;const o=(Math.sin(i.elapsedTime*.4+n)+1)/2;r[n].body.color.lerpColors(new w(((m=(l=s[n].data)==null?void 0:l.colors)==null?void 0:m[0])??"#2f5bff"),new w(((u=(f=s[n].data)==null?void 0:f.colors)==null?void 0:u[2])??"#3fb8af"),o)})}),c.jsx(c.Fragment,{children:s.map((i,t)=>c.jsxs("group",{position:[i.x,i.y,i.z],scale:i.s??1,children:[c.jsx("mesh",{material:r[t].plate,position:[0,.15,0],receiveShadow:!0,children:c.jsx("cylinderGeometry",{args:[4,4.2,.3,28]})}),c.jsx("mesh",{material:r[t].ring,position:[0,.31,0],rotation:[-Math.PI/2,0,0],children:c.jsx("ringGeometry",{args:[3.7,3.9,32]})}),c.jsx("group",{ref:e=>a.current[t]=e,position:[0,.3,0],children:c.jsx(yt,{body:r[t].body,accent:r[t].accent})})]},t))})}function Yo({anchors:s}){const a=x.useRef([]),r=x.useMemo(()=>s.map(i=>{var t;return{body:O(((t=i.data)==null?void 0:t.color)??z.red,{roughness:.25,metalness:.4}),accent:O(z.yellow)}}),[s]);return T(({clock:i})=>{const t=i.elapsedTime;a.current.forEach((e,n)=>{if(!e)return;const o=s[n].data,l=t*((o==null?void 0:o.speed)??.5)+((o==null?void 0:o.phase)??0),m=Math.cos(l)*o.rx,f=Math.sin(l)*o.rz;e.position.set(s[n].x+m,s[n].y,s[n].z+f),e.rotation.y=Math.atan2(-Math.sin(l)*o.rx,Math.cos(l)*o.rz)+Math.PI})}),c.jsx(c.Fragment,{children:s.map((i,t)=>c.jsx("group",{ref:e=>a.current[t]=e,children:c.jsx(yt,{body:r[t].body,accent:r[t].accent,scale:i.s??.8})},t))})}function Qo({anchors:s}){const a=x.useMemo(()=>s.flatMap(i=>{const t=i.data.points.filter(l=>l.every(Number.isFinite)).map(l=>new P(...l)).filter((l,m,f)=>m===0||l.distanceTo(f[m-1])>.05);if(t.length<2)return[];const e=new qt(t,!!i.data.closed,"catmullrom",.1);if(!Number.isFinite(e.getLength())||e.getLength()<.1)return[];const n=i.data.count??6,o=new se(new Me(1,1,1),Ae(i.data.color??"#7fe3ff",1.25),n);return o.frustumCulled=!1,[{curve:e,count:n,mesh:o,speed:i.data.speed??.12,size:i.data.size??.7}]}),[s]),r=x.useMemo(()=>new ne,[]);return T(({clock:i})=>{const t=i.elapsedTime;for(const e of a){for(let n=0;n<e.count;n++){const o=(t*e.speed+n/e.count)%1;e.curve.getPointAt(o,r.position),r.scale.setScalar(e.size*(.7+.3*Math.sin(o*Math.PI))),r.rotation.set(t+n,t*.7+n,0),r.updateMatrix(),e.mesh.setMatrixAt(n,r.matrix)}e.mesh.instanceMatrix.needsUpdate=!0}}),c.jsx(c.Fragment,{children:a.map((i,t)=>c.jsx("primitive",{object:i.mesh},t))})}function Ko({anchors:s}){const a=x.useRef([]),r=x.useMemo(()=>({dome:O(z.white,{roughness:.4,metalness:.2}),slit:O(z.navy),tube:O(z.metal,{metalness:.5})}),[]);return T((i,t)=>a.current.forEach(e=>e&&(e.rotation.y+=t*.12))),c.jsx(c.Fragment,{children:s.map((i,t)=>c.jsx("group",{position:[i.x,i.y,i.z],scale:i.s??1,children:c.jsxs("group",{ref:e=>a.current[t]=e,children:[c.jsx("mesh",{material:r.dome,children:c.jsx("sphereGeometry",{args:[6,20,10,0,Math.PI*2,0,Math.PI/2]})}),c.jsx("mesh",{material:r.slit,position:[0,3.2,3.6],rotation:[-.75,0,0],children:c.jsx("boxGeometry",{args:[1.6,5.8,.4]})}),c.jsx("mesh",{material:r.tube,position:[0,4.6,4.2],rotation:[-.85,0,0],children:c.jsx("cylinderGeometry",{args:[.55,.7,4.5,10]})})]})},t))})}function Jo({anchors:s}){const a=x.useRef([]),r=x.useMemo(()=>({tire:O("#2a2b30"),rim:O(z.metal,{metalness:.6,roughness:.3}),hub:O(z.coral)}),[]);return T((i,t)=>a.current.forEach((e,n)=>{var o;return e&&(e.rotation.x-=t*(((o=s[n].data)==null?void 0:o.speed)??.8))})),c.jsx(c.Fragment,{children:s.map((i,t)=>{var n;const e=((n=i.data)==null?void 0:n.r)??4;return c.jsx("group",{position:[i.x,i.y,i.z],rotation:[0,i.ry??0,0],children:c.jsxs("group",{ref:o=>a.current[t]=o,children:[c.jsx("mesh",{material:r.tire,rotation:[0,Math.PI/2,0],children:c.jsx("torusGeometry",{args:[e,e*.09,8,32]})}),c.jsx("mesh",{material:r.rim,rotation:[0,Math.PI/2,0],children:c.jsx("torusGeometry",{args:[e*.88,e*.03,4,32]})}),Array.from({length:12},(o,l)=>c.jsx("mesh",{material:r.rim,rotation:[l*Math.PI/12,0,0],children:c.jsx("boxGeometry",{args:[.06,e*1.76,.06]})},l)),c.jsx("mesh",{material:r.hub,rotation:[0,0,Math.PI/2],children:c.jsx("cylinderGeometry",{args:[e*.1,e*.1,e*.25,10]})})]})},t)})})}function en({anchors:s}){const a=x.useRef([]),r=x.useMemo(()=>s.map(i=>{var t,e;return(t=i.data)!=null&&t.glow?Ae(i.data.color??z.turquoise,i.data.glow):O(((e=i.data)==null?void 0:e.color)??z.coral,{roughness:.35,metalness:.2})}),[s]);return T(({clock:i},t)=>a.current.forEach((e,n)=>{if(!e)return;const o=s[n].data??{};e.rotation.y+=t*(o.speed??.5),e.rotation.x+=t*(o.tumble??0),e.position.y=Math.sin(i.elapsedTime*.8+n)*(o.bob??0)})),c.jsx(c.Fragment,{children:s.map((i,t)=>{var o,l;const e=((o=i.data)==null?void 0:o.size)??2,n=((l=i.data)==null?void 0:l.kind)??"octa";return c.jsx("group",{position:[i.x,i.y,i.z],children:c.jsxs("mesh",{ref:m=>a.current[t]=m,material:r[t],children:[n==="torus"&&c.jsx("torusGeometry",{args:[e,e*.32,10,28]}),n==="cube"&&c.jsx("boxGeometry",{args:[e*1.4,e*1.4,e*1.4]}),n==="sphere"&&c.jsx("icosahedronGeometry",{args:[e,1]}),n==="octa"&&c.jsx("octahedronGeometry",{args:[e,0]}),n==="cone"&&c.jsx("coneGeometry",{args:[e,e*2,6]}),n==="ring"&&c.jsx("torusGeometry",{args:[e,e*.08,6,40]}),n==="knot"&&c.jsx("torusKnotGeometry",{args:[e,e*.28,64,8]})]})},t)})})}function tn({anchors:s}){const a=x.useRef([]),r=x.useMemo(()=>s.map(i=>{var t,e;return(t=i.data)!=null&&t.glow?Ae(i.data.color,i.data.glow):O(((e=i.data)==null?void 0:e.color)??z.turquoise)}),[s]);return T(({clock:i})=>{const t=i.elapsedTime;a.current.forEach((e,n)=>{if(!e)return;const o=s[n].data??{};e.position.y=Math.sin(t*(o.speed??1)+n*1.3)*(o.amp??.8),e.rotation.y=t*.3+n})}),c.jsx(c.Fragment,{children:s.map((i,t)=>{var n,o;const e=((n=i.data)==null?void 0:n.size)??1;return c.jsx("group",{position:[i.x,i.y,i.z],children:c.jsx("mesh",{ref:l=>a.current[t]=l,material:r[t],children:((o=i.data)==null?void 0:o.kind)==="cyl"?c.jsx("cylinderGeometry",{args:[e,e,e*.7,16]}):c.jsx("boxGeometry",{args:[e,e,e]})})},t)})})}function on({anchors:s}){const a=x.useMemo(()=>s.map(i=>{const t=i.data.points,e=new se(new Me(.28,.12,.08),new U({toneMapped:!1}),t.length),n=new ne;t.forEach((l,m)=>{var f;n.position.set(l[0],l[1],l[2]),n.rotation.set(0,((f=i.data.ry)==null?void 0:f[m])??i.ry??0,0),n.updateMatrix(),e.setMatrixAt(m,n.matrix)});const o=[new w("#7fe3ff"),new w("#7dffb0")];return{mesh:e,n:t.length,palette:o}}),[s]),r=x.useMemo(()=>new w,[]);return T(({clock:i})=>{const t=i.elapsedTime;for(const e of a){for(let n=0;n<e.n;n++){const o=.75+.25*Math.sin(t*.8+n*.7);e.mesh.setColorAt(n,r.copy(e.palette[n%2]).multiplyScalar(1.15*o))}e.mesh.instanceColor&&(e.mesh.instanceColor.needsUpdate=!0)}}),c.jsx(c.Fragment,{children:a.map((i,t)=>c.jsx("primitive",{object:i.mesh},t))})}function nn({anchors:s}){const a=x.useRef([]),r=x.useMemo(()=>new B({color:"#f3efe8",transparent:!0,opacity:.6,roughness:1,depthWrite:!1}),[]);return T(({clock:i})=>{const t=i.elapsedTime;a.current.forEach(e=>e.forEach((n,o)=>{if(!n)return;const l=(t*.18+o/e.length)%1;n.position.set(Math.sin(l*4+o)*.6+l*2,l*9,Math.cos(l*3)*.5),n.scale.setScalar(.6+l*2.2)}))}),c.jsx(c.Fragment,{children:s.map((i,t)=>c.jsx("group",{position:[i.x,i.y,i.z],children:Array.from({length:5},(e,n)=>c.jsx("mesh",{ref:o=>{var l;return((l=a.current)[t]??(l[t]=[]))[n]=o},material:r,children:c.jsx("icosahedronGeometry",{args:[1,0]})},n))},t))})}function sn({anchors:s}){const a=x.useMemo(()=>s.map(()=>{const i=new se(new Me(.25,.25,.25),new U({color:new w(1.2,1.6,1.9),toneMapped:!1}),40);return i.frustumCulled=!1,i}),[s]),r=x.useMemo(()=>new ne,[]);return T(({clock:i})=>{const t=i.elapsedTime;a.forEach((e,n)=>{const o=s[n];for(let l=0;l<40;l++){const m=(t*.6+l/40)%1,f=l*2.4,u=m*2.2;r.position.set(o.x+Math.cos(f)*u,o.y+4*m*(1-m)*3.2,o.z+Math.sin(f)*u),r.scale.setScalar(1-m*.6),r.updateMatrix(),e.setMatrixAt(l,r.matrix)}e.instanceMatrix.needsUpdate=!0})}),c.jsx(c.Fragment,{children:a.map((i,t)=>c.jsx("primitive",{object:i},t))})}function an({world:s,shadows:a}){const r=pt(),i=x.useMemo(()=>{const e=new Map;for(const n of s.regions)for(const o of n.anchors)e.set(o.type,[...e.get(o.type)??[],o]);return e},[s]),t=e=>i.get(e)??[];return c.jsxs(c.Fragment,{children:[s.regions.map(e=>{var n;return c.jsxs("group",{children:[e.islands.map(o=>c.jsx("mesh",{geometry:o.geometry,material:r,position:o.position,receiveShadow:a},o.id)),e.world&&c.jsx("mesh",{geometry:e.world,material:r,receiveShadow:a})]},e.def.id+((n=e.islands[0])==null?void 0:n.id))}),c.jsx(Ro,{anchors:t("sign")}),c.jsx(Do,{anchors:t("flag")}),c.jsx(Wo,{anchors:t("windsock")}),c.jsx(Ye,{anchors:t("radar")}),c.jsx(Ye,{anchors:t("dish"),dishes:!0}),c.jsx(Lo,{anchors:t("beacon")}),c.jsx(Qe,{anchors:t("windmill")}),c.jsx(Qe,{anchors:t("turbine"),turbine:!0}),c.jsx(Bo,{anchors:t("pond")}),c.jsx(Uo,{anchors:t("waterfall")}),c.jsx(Vo,{anchors:t("balloon")}),c.jsx(Ho,{anchors:t("gear")}),c.jsx(Zo,{anchors:t("turntable")}),c.jsx(Yo,{anchors:t("orbitCar")}),c.jsx(Qo,{anchors:t("pulses")}),c.jsx(Ko,{anchors:t("dome")}),c.jsx(Jo,{anchors:t("wheel")}),c.jsx(en,{anchors:t("spinner")}),c.jsx(tn,{anchors:t("bob")}),c.jsx(on,{anchors:t("blinkers")}),c.jsx(nn,{anchors:t("smoke")}),c.jsx(sn,{anchors:t("fountain")})]})}const rn=new P(0,0,1);function Ke(s){return new we().setFromUnitVectors(rn,new P(...s.dir))}const ie=(s,a,r=1)=>new B({color:new w(s),emissive:new w(s),emissiveIntensity:Math.min(.85,a*.3),roughness:.6,metalness:0,transparent:r<1,opacity:r,depthWrite:r>=1});function cn({world:s}){const a=L(e=>e.course),r=L(e=>e.progress.tutorialDone),i=x.useRef({}),t=x.useMemo(()=>({next:ie("#ef7f5c",2.4),upcoming:ie("#fff4db",1.6,.6),start:ie("#3fbcc0",2.2),band:ie("#fff7ea",2.6),disc:new U({color:new w("#fff4db"),transparent:!0,opacity:.1,blending:Le,depthWrite:!1,side:ae}),chevron:ie("#fff7ea",2.6)}),[]);return T(({clock:e})=>{const n=e.elapsedTime;for(const[o,l]of Object.entries(i.current))l.forEach((m,f)=>{if(!m)return;const u=(a==null?void 0:a.id)===o&&a.next===f,h=u?1+Math.sin(n*5)*.05+Math.max(0,.25-(b.simTime-b.ringFlashAt)):1;m.scale.setScalar(h);const d=m.children[1];d&&(d.rotation.z=n*(u?1.4:.3))})}),c.jsx(c.Fragment,{children:s.courses.map(e=>{const n=(a==null?void 0:a.id)===e.id;return!e.timed&&(r||!n)?null:e.rings.map((o,l)=>{if(n&&l<a.next)return null;const f=n&&a.next===l,u=!n&&l===0;return!n&&!u?c.jsx("group",{position:o.pos,quaternion:Ke(o),ref:h=>{var d,p;return((d=i.current)[p=e.id]??(d[p]=[]))[l]=h},children:c.jsx("mesh",{material:t.upcoming,children:c.jsx("torusGeometry",{args:[o.radius,.22,6,40]})})},`${e.id}${l}`):c.jsxs("group",{position:o.pos,quaternion:Ke(o),ref:h=>{var d,p;return((d=i.current)[p=e.id]??(d[p]=[]))[l]=h},children:[c.jsx("mesh",{material:u?t.start:f?t.next:t.upcoming,children:c.jsx("torusGeometry",{args:[o.radius,f||u?.7:.36,10,56]})}),c.jsxs("group",{children:[(f||u)&&Array.from({length:8},(h,d)=>c.jsx("mesh",{rotation:[0,0,d/8*Math.PI*2],material:t.band,children:c.jsx("torusGeometry",{args:[o.radius,.76,10,4,.16]})},`b${d}`)),(f||u)&&Array.from({length:8},(h,d)=>c.jsx("group",{rotation:[0,0,d/8*Math.PI*2],children:c.jsx("mesh",{material:t.chevron,position:[0,o.radius+1.6,0],rotation:[0,0,Math.PI],children:c.jsx("coneGeometry",{args:[.45,.9,3]})})},d))]}),(f||u)&&c.jsx("mesh",{material:t.disc,children:c.jsx("circleGeometry",{args:[o.radius*.95,40]})})]},`${e.id}${l}`)})})})}function ln({world:s}){const a=L(t=>t.progress.collectibles),r=x.useRef([]),i=x.useMemo(()=>({core:ie("#f6c55a",2.8),halo:ie("#fff4db",2.6,.85),beam:ie("#ffe2a0",2.4,.2)}),[]);return T(({clock:t})=>{const e=t.elapsedTime;r.current.forEach((n,o)=>{n&&(n.children[0].rotation.y=e*1.6,n.children[1].rotation.x=e*1.1,n.children[1].rotation.y=e*.7,n.position.y=s.collectibles[o].pos[1]+Math.sin(e*2+o)*.6)})}),c.jsx(c.Fragment,{children:s.collectibles.map((t,e)=>a.includes(t.id)?null:c.jsxs("group",{ref:n=>r.current[e]=n,position:t.pos,children:[c.jsx("mesh",{material:i.core,children:c.jsx("octahedronGeometry",{args:[1.3,0]})}),c.jsx("mesh",{material:i.halo,children:c.jsx("torusGeometry",{args:[2.2,.08,4,32]})}),c.jsx("mesh",{material:i.beam,position:[0,18,0],children:c.jsx("cylinderGeometry",{args:[.25,.6,36,6,1,!0]})})]},t.id))})}function un({world:s}){return c.jsxs(c.Fragment,{children:[c.jsx(cn,{world:s}),c.jsx(ln,{world:s})]})}const Je=9;function fn(){const s=x.useRef(null),a=x.useMemo(()=>new B({color:"#efe3cf",roughness:1,transparent:!0,opacity:0,depthWrite:!1,flatShading:!0}),[]),r=x.useMemo(()=>Array.from({length:Je},(i,t)=>({a:t/Je*Math.PI*2+Math.random()*.5,s:.7+Math.random()*.6})),[]);return T(()=>{const i=s.current,t=b.dust;if(!i)return;const e=t?b.simTime-t.at:99,n=1.4;if(i.visible=e<n,!i.visible||!t)return;const o=e/n;i.position.set(t.x,t.y+.6,t.z),a.opacity=.55*(1-o)*(1-o),i.children.forEach((l,m)=>{const f=l,u=1.5+o*7*r[m].s;f.position.set(Math.cos(r[m].a)*u,o*1.6,Math.sin(r[m].a)*u),f.scale.setScalar((.9+o*2.6)*r[m].s)})}),c.jsx("group",{ref:s,visible:!1,children:r.map((i,t)=>c.jsx("mesh",{material:a,children:c.jsx("icosahedronGeometry",{args:[1,0]})},t))})}function mn(){const s=[0,0,-.6,.12,0,.5,-.12,0,.5,0,0,-.2,0,0,.3,1.4,0,.1,0,0,-.2,-1.4,0,.1,0,0,.3],a=[0,0,0,0,0,1,0,-1,0],r=new xe;return r.setAttribute("position",new Y(new Float32Array(s),3)),r.setAttribute("aWing",new Y(new Float32Array(a),1)),r}function hn({count:s}){const{mesh:a,flocks:r}=x.useMemo(()=>{const t=mn(),e=new Float32Array(s),n=ce(99);for(let u=0;u<s;u++)e[u]=n()*6.28;t.setAttribute("aPhase",new K(e,1));const o=new B({color:"#fbf6ea",emissive:"#fbf6ea",emissiveIntensity:.25,side:2,flatShading:!0});o.onBeforeCompile=u=>{u.uniforms.uTime=$.uTime,u.vertexShader=u.vertexShader.replace("#include <common>",`#include <common>
attribute float aWing;
attribute float aPhase;
uniform float uTime;`).replace("#include <begin_vertex>",`#include <begin_vertex>
transformed.y += abs(aWing) * sin(uTime * 9.0 + aPhase) * 0.9;`)};const l=new se(t,o,s);l.frustumCulled=!1;const m=[],f=7;for(let u=0;u<Math.ceil(s/f);u++){const h=_e[u%_e.length],d=[];for(let p=0;p<f;p++)d.push([(n()-.5)*10,(n()-.5)*4,(n()-.5)*10]);m.push({cx:h.center[0]+(n()-.5)*80,cy:Math.max(60,h.center[1])+30+n()*40,cz:h.center[2]+(n()-.5)*80,r:60+n()*60,speed:(.08+n()*.05)*(n()>.5?1:-1),members:d})}return{mesh:l,flocks:m}},[s]),i=x.useMemo(()=>new ne,[]);return T(({clock:t})=>{const e=t.elapsedTime;let n=0;for(const o of r){const l=e*o.speed,m=o.cx+Math.cos(l)*o.r,f=o.cz+Math.sin(l)*o.r,u=Math.atan2(-Math.sin(l)*o.speed,Math.cos(l)*o.speed);for(const[h,d,p]of o.members){if(n>=a.count)break;i.position.set(m+h,o.cy+d+Math.sin(e+h)*.8,f+p),i.rotation.set(0,-u+Math.PI,Math.sin(e*.5+p)*.2),i.scale.setScalar(1.4),i.updateMatrix(),a.setMatrixAt(n++,i.matrix)}}a.instanceMatrix.needsUpdate=!0}),c.jsx("primitive",{object:a})}function dn({count:s}){const a=x.useRef(null),{geo:r,base:i}=x.useMemo(()=>{const e=ce(5),n=new Float32Array(s*3);for(let l=0;l<s*3;l++)n[l]=(e()-.5)*160;const o=new xe;return o.setAttribute("position",new Y(new Float32Array(s*3),3)),{geo:o,base:n}},[s]),t=x.useMemo(()=>new Vt({color:new w("#fff1d6"),size:.35,transparent:!0,opacity:.7,depthWrite:!1,sizeAttenuation:!0}),[]);return T(({camera:e,clock:n})=>{const o=r.getAttribute("position"),l=n.elapsedTime,m=160;for(let f=0;f<s;f++){const u=i[f*3]+Math.sin(l*.3+f)*2,h=i[f*3+1]+Math.sin(l*.21+f*1.3)*1.5,d=i[f*3+2]+l*1.2,p=(g,v)=>v+((g-v)%m+m*1.5)%m-m/2;o.setXYZ(f,p(u,e.position.x),p(h,e.position.y),p(d,e.position.z))}o.needsUpdate=!0}),c.jsx("points",{ref:a,geometry:r,material:t,frustumCulled:!1})}function pn(){const s=x.useRef(null),a=48,{mesh:r,seeds:i}=x.useMemo(()=>{const n=new U({color:"#ffffff",transparent:!0,opacity:0,blending:Le,depthWrite:!1}),o=new se(new Me(.03,.03,6),n,a);o.frustumCulled=!1;const l=ce(17),m=Array.from({length:a},()=>({a:l()*Math.PI*2,r:4+l()*9,z:l()*60,s:50+l()*40}));return{mesh:o,seeds:m}},[]),t=x.useMemo(()=>new ne,[]),e=x.useRef(0);return T(({camera:n},o)=>{const l=s.current;if(!l)return;l.position.copy(n.position),l.quaternion.copy(n.quaternion);const m=L.getState().settings.reducedMotion,f=b.flight.boosting&&b.phase==="flying"&&!m?1:0;e.current+=(f-e.current)*(1-Math.exp(-5*o));const u=e.current;r.material.opacity=u*.35,r.visible=u>.02,i.forEach((h,d)=>{h.z+=h.s*o,h.z>60&&(h.z-=60),t.position.set(Math.cos(h.a)*h.r,Math.sin(h.a)*h.r,-60+h.z),t.updateMatrix(),r.setMatrixAt(d,t.matrix)}),r.instanceMatrix.needsUpdate=!0}),c.jsx("group",{ref:s,children:c.jsx("primitive",{object:r})})}function gn(){const s=x.useRef(null),a=x.useMemo(()=>({env:new B({color:z.cream,roughness:.6,flatShading:!0}),band:new B({color:z.coral,roughness:.6,flatShading:!0}),gondola:new B({color:z.woodDark,flatShading:!0}),fin:new B({color:z.teal,flatShading:!0})}),[]);return T(({clock:r})=>{const i=s.current;if(!i)return;const t=r.elapsedTime*.012;i.position.set(Math.cos(t)*900,300+Math.sin(t*3)*10,Math.sin(t)*900),i.rotation.y=-t+Math.PI}),c.jsxs("group",{ref:s,scale:3,children:[c.jsx("mesh",{material:a.env,scale:[1,1,3.2],children:c.jsx("sphereGeometry",{args:[4,16,10]})}),c.jsx("mesh",{material:a.band,scale:[1.02,1.02,.5],children:c.jsx("sphereGeometry",{args:[4,16,10]})}),c.jsx("mesh",{material:a.gondola,position:[0,-4.6,0],children:c.jsx("boxGeometry",{args:[2,1.2,5]})}),[0,Math.PI/2,Math.PI,-Math.PI/2].map(r=>c.jsx("group",{rotation:[0,0,r],position:[0,0,11],children:c.jsx("mesh",{material:a.fin,position:[0,3,0],children:c.jsx("boxGeometry",{args:[.3,3,3]})})},r))]})}function xn(){const s=x.useRef(null),a=x.useMemo(()=>({body:new B({color:z.turquoise,flatShading:!0,roughness:.5}),wing:new B({color:z.white,flatShading:!0}),smoke:new U({color:"#ffffff",transparent:!0,opacity:.5,depthWrite:!1})}),[]),r=x.useMemo(()=>new P,[]);return T(({clock:i})=>{const t=s.current;if(!t)return;const e=i.elapsedTime*.045;r.set(Math.sin(e)*620,175+Math.sin(e*2)*25,Math.sin(e*2)*380);const n=Math.cos(e)*620,o=Math.cos(e*2)*760;t.position.copy(r),t.rotation.set(0,Math.atan2(-n,-o),-Math.cos(e*2)*.4,"YXZ")}),c.jsxs("group",{ref:s,scale:1.1,children:[c.jsx("mesh",{material:a.body,scale:[.7,.7,3],children:c.jsx("sphereGeometry",{args:[1,10,8]})}),c.jsx("mesh",{material:a.wing,position:[0,0,-.4],children:c.jsx("boxGeometry",{args:[9,.18,1.6]})}),c.jsx("mesh",{material:a.wing,position:[0,.3,2.6],children:c.jsx("boxGeometry",{args:[3.4,.12,.9]})}),c.jsx("mesh",{material:a.body,position:[0,1,2.6],children:c.jsx("boxGeometry",{args:[.15,1.6,1]})})]})}function vn({preset:s}){return c.jsxs(c.Fragment,{children:[c.jsx(hn,{count:Math.round(42*s.propDensity)}),c.jsx(dn,{count:Math.round(s.particles*.35)}),c.jsx(pn,{}),c.jsx(gn,{}),c.jsx(xn,{}),c.jsx(fn,{})]})}function yn(){const s=new eo;return s.add(ee.box(),te(0,.45,.4,2.2,.9,4.6),z.white),s.add(ee.wedge(),te(0,.45,-2.6,2.2,.9,1.6,Math.PI),z.white),s.add(ee.box(),te(0,.2,.4,2.26,.3,4.66),z.coral),s.add(ee.box(),te(0,1.15,.9,1.4,.6,1.8),z.cream),s.add(ee.cyl(6),te(0,4.2,-.3,.14,7,.14),z.woodDark),s.add(ee.prism(),te(0,4.6,.75,.08,6.2,2,Math.PI/2),z.cream),s.add(ee.prism(),te(0,3.6,-1.5,.06,4.6,1.6,Math.PI/2),z.white),s.add(ee.box(),te(0,7.6,-.3,.05,.5,.8),z.coral),s.add(ee.cone(3),te(0,.05,6.5,2.6,7,.05,0,-Math.PI/2),"#f4fbf8",{ao:!1}),s.build()}function wn(s,a,r,i){for(const t of r){const e=t.p,n=s-e.x,o=a-e.z,l=t.thetaOf(n,o),m=e.radius*t.edge(l),f=m*(1+(e.profile==="shore"?t.coastExtra(l)/m:.1));if(Math.hypot(n/e.sx,o/e.sz)<f+i)return!1}return!0}function Mn({world:s,count:a}){const{mesh:r,routes:i}=x.useMemo(()=>{const e=ce(3131),o=s.regions.flatMap(u=>u.islands.map(h=>h.terrain)).filter(u=>u.p.profile==="shore"||u.p.y<_&&u.p.y+u.maxTop>_),l=o.filter(u=>u.meanRadius>25),m=[];for(let u=0;m.length<a&&u<a*40;u++){const h=l[Math.floor(e()*l.length)];if(!h)break;const p=h.meanRadius*(1+h.p.irregularity)+(h.p.profile==="shore"?h.flare:0)+30+e()*70;let g=!0;for(let v=0;v<36&&g;v++){const j=v/36*Math.PI*2;g=wn(h.p.x+Math.cos(j)*p,h.p.z+Math.sin(j)*p,o,14)}g&&m.push({cx:h.p.x,cz:h.p.z,r:p,speed:(e()>.5?1:-1)*(3+e()*3),phase:e()*Math.PI*2})}const f=new se(yn(),pt(),Math.max(1,m.length));return f.count=m.length,f.frustumCulled=!1,{mesh:f,routes:m}},[s,a]),t=x.useMemo(()=>new ne,[]);return T(({clock:e})=>{const n=e.elapsedTime;i.forEach((o,l)=>{const m=o.phase+n*o.speed/o.r,f=o.cx+Math.cos(m)*o.r,u=o.cz+Math.sin(m)*o.r,h=-Math.sin(m)*Math.sign(o.speed),d=Math.cos(m)*Math.sign(o.speed);t.position.set(f,_+Math.sin(n*1.4+l)*.12,u),t.rotation.set(Math.sin(n*1.1+l*2)*.03,Math.atan2(-h,-d),Math.sin(n*.9+l)*.05-.08*Math.sign(o.speed),"YXZ"),t.updateMatrix(),r.setMatrixAt(l,t.matrix)}),r.instanceMatrix.needsUpdate=!0}),c.jsx("primitive",{object:r})}function et(s){const a=[];for(const i of[1,-1])for(let t=0;t<s.length;t+=3)a.push(s[t]*i,s[t+1],s[t+2]);const r=new xe;return r.setAttribute("position",new Y(new Float32Array(a),3)),r}const bn=[0,0,.2,1,0,.55,.95,0,-.1,0,0,.05,.8,0,-.15,.35,0,-.65,-.04,0,.35,.04,0,.35,0,0,-.45],jn=[0,0,.5,.12,0,-.1,0,0,-.1,.05,0,.15,1.5,0,-.55,.1,0,-.15,0,0,-.1,.35,0,-.75,.05,0,-.3],tt=["#ffb347","#ffe066","#fffaf0","#9fd3ff","#ff9ec4","#ff8a5c","#c9a7ff"],ot=["#3d4a5c","#4a4f63","#2f3b4d"];function ze(s,a,r){return s.rho(a,r)>.88?null:s.heightLocal(a,r)}function zn(s,a){const r=[],i=[],t=s.regions.flatMap(e=>e.islands.map(n=>n.terrain));for(const e of t){const n=e.p;if(n.y+e.maxTop<_+2)continue;const o=ce(n.seed*29+11),l=n.radius*Math.max(n.sx,n.sz),m=Math.PI*l*l,f=Math.max(1,Math.min(10,Math.round(m/2600*a)));for(let h=0;h<f;h++){const d=o()*Math.PI*2,p=Math.sqrt(o())*l*.8,g=Math.cos(d)*p,v=Math.sin(d)*p;if(ze(e,g,v)===null)continue;const j=3+Math.floor(o()*4);for(let y=0;y<j;y++){const M=g+(o()-.5)*14,k=v+(o()-.5)*14,S=2+o()*4;let A=-1/0;for(let F=0;F<6;F++){const G=ze(e,M+Math.cos(F)*S,k+Math.sin(F)*S);G!==null&&(A=Math.max(A,G))}ze(e,M,k)===null||!isFinite(A)||n.y+A<_+.5||r.push({x:n.x+M,y:n.y+A+1.6+o()*2.2,z:n.z+k,radius:S,speed:(.35+o()*.35)*(o()<.5?1:-1),flap:13+o()*6,scale:.55+o()*.45,color:new w(tt[Math.floor(o()*tt.length)])})}}const u=Math.max(2,Math.min(12,Math.round(l/14*a)));for(let h=0;h<u;h++){const d=o()*Math.PI*2,p=Math.sqrt(o())*l*.6,g=Math.cos(d)*p,v=Math.sin(d)*p,j=ze(e,g,v)??0,y=14+o()*26;i.push({x:n.x+g,y:n.y+Math.max(j,e.maxTop*.6)+12+o()*18,z:n.z+v,radius:y,speed:(.5+o()*.4)*(o()<.5?1:-1),flap:9+o()*5,scale:1+o()*.5,color:new w(ot[Math.floor(o()*ot.length)])})}}return{butterflies:r,swifts:i}}function nt(s,a,r){const i=a.length,t=new Float32Array(i*3),e=new Float32Array(i*4);a.forEach((u,h)=>{t.set([u.x,u.y,u.z],h*3),e.set([u.radius,u.speed,u.flap,u.scale],h*4)});const n=s.clone();n.setAttribute("aAnchor",new K(t,3)),n.setAttribute("aMotion",new K(e,4));const o=new Float32Array(i);for(let u=0;u<i;u++)o[u]=u*2.399%6.283;n.setAttribute("aPhase",new K(o,1));const l=new U({side:ae}),m=r==="flutter"?`vec3 off = vec3(cos(t) * r, sin(t * 2.3) * 0.6 + sin(uTime * 3.1 + aPhase) * 0.35, sin(t * 2.0) * r * 0.6);
         vec3 vel = vec3(-sin(t), 0.0, cos(t * 2.0) * 1.2);
         float fold = 0.15 + 0.95 * (0.5 + 0.5 * flap);`:`vec3 off = vec3(cos(t) * r, sin(t * 0.7) * 4.0, sin(t) * r * 0.8);
         vec3 vel = vec3(-sin(t), 0.0, cos(t) * 0.8) * sign(aMotion.y);
         float fold = 0.35 * flap;`;l.onBeforeCompile=u=>{u.uniforms.uTime=$.uTime,u.vertexShader=u.vertexShader.replace("#include <common>",`#include <common>
attribute vec3 aAnchor;
attribute vec4 aMotion;
attribute float aPhase;
uniform float uTime;`).replace("#include <begin_vertex>",`float r = aMotion.x;
         float t = uTime * aMotion.y + aPhase;
         float flap = sin(uTime * aMotion.z + aPhase * 7.0);
         ${m}
         vec3 p = position * aMotion.w;
         // Wingbeat: each wing hinges up about the body.
         float side = p.x;
         float ang = fold;
         p.x = side * cos(ang);
         p.y += abs(side) * sin(ang);
         // Face along the path.
         float yaw = atan(vel.x, vel.z);
         float c = cos(yaw), sn = sin(yaw);
         p = vec3(c * p.x + sn * p.z, p.y, -sn * p.x + c * p.z);
         vec3 transformed = aAnchor + off + p;`)};const f=new se(n,l,i);return a.forEach((u,h)=>f.setColorAt(h,u.color)),f.frustumCulled=!1,f}function Sn({world:s,density:a}){const r=x.useMemo(()=>{const{butterflies:i,swifts:t}=zn(s,a),e=[];return i.length&&e.push(nt(et(bn),i,"flutter")),t.length&&e.push(nt(et(jn),t,"sweep")),e},[s,a]);return c.jsx(c.Fragment,{children:r.map((i,t)=>c.jsx("primitive",{object:i},t))})}const Pn=150,wt=260;function kn(){const s=[],a=[],r=[[0,0,0,1.35],[1.9,.2,.1,1.05],[3.6,-.17,.15,1.2],[5.2,.06,-.19,.95],[.9,-.08,-.22,.8]];for(const[t,e,n,o]of r){const l=Math.cos(t),m=Math.sin(t),f=.13;s.push(e-l*f,0,n+m*f,e+l*f,0,n-m*f,e+m*.18,o,n+l*.18),a.push(0,0,1)}const i=new xe;return i.setAttribute("position",new Y(new Float32Array(s),3)),i.setAttribute("aTip",new Y(new Float32Array(a),1)),i}function Tn(){const s=new B({roughness:.9,metalness:0,side:ae});return s.onBeforeCompile=a=>{a.uniforms.uTime=$.uTime,a.uniforms.uWind=$.uWind,a.vertexShader=a.vertexShader.replace("#include <common>",`#include <common>
attribute vec3 aPos;
attribute vec3 aCol;
attribute float aTip;
uniform float uTime;
uniform float uWind;
varying vec3 vGrass;
float gHash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }`).replace("#include <beginnormal_vertex>","vec3 objectNormal = vec3(0.0, 1.0, 0.0);").replace("#include <begin_vertex>",`float h1 = gHash(aPos.xz);
float h2 = gHash(aPos.zx + 3.1);
float yaw = h1 * 6.2832;
float cy = cos(yaw), sy = sin(yaw);
vec3 p = position;
p = vec3(cy * p.x + sy * p.z, p.y, -sy * p.x + cy * p.z);
float dist = distance(aPos, cameraPosition);
float size = (0.75 + h2 * 0.7) * (1.0 - smoothstep(${Pn.toFixed(1)}, ${wt.toFixed(1)}, dist));
p *= size;
// Wind: tips sway in slow gusts that roll across the islands.
float gust = sin(uTime * 1.7 + aPos.x * 0.11 + aPos.z * 0.07) * 0.6 + sin(uTime * 3.1 + aPos.x * 0.37) * 0.2;
p.x += gust * aTip * 0.22 * uWind * size;
p.z += cos(uTime * 1.3 + aPos.z * 0.09) * aTip * 0.12 * uWind * size;
vec3 transformed = aPos + p;
// Root matches the ground beneath; tips catch the light, some a touch yellower.
vec3 tipCol = aCol * vec3(1.22, 1.28, 1.05) + vec3(0.02, 0.03, 0.0);
tipCol = mix(tipCol, tipCol * vec3(1.18, 1.05, 0.7), step(0.82, h2) * 0.6);
vGrass = mix(aCol * 0.92, tipCol, aTip);`),a.fragmentShader=a.fragmentShader.replace("#include <common>",`#include <common>
varying vec3 vGrass;`).replace("#include <color_fragment>",`#include <color_fragment>
diffuseColor.rgb *= vGrass;`).replace("#include <normal_fragment_begin>",`float faceDirection = 1.0;
vec3 normal = normalize( vNormal );
vec3 nonPerturbedNormal = normal;`)},s.customProgramCacheKey=()=>"skybound-grass-v1",s}function Fn({world:s,density:a}){const r=x.useMemo(()=>{const i=kn(),t=Tn(),e=[];for(const n of s.regions)for(const o of n.islands){const l=o.grass,m=Math.floor(l.length/$e*a);if(m<1)continue;const f=new Float32Array(m*3),u=new Float32Array(m*3),h=new P(1/0,1/0,1/0),d=new P(-1/0,-1/0,-1/0);for(let y=0;y<m;y++){const M=y*$e;f[y*3]=l[M],f[y*3+1]=l[M+1],f[y*3+2]=l[M+2],u.set([l[M+3],l[M+4],l[M+5]],y*3),h.min(new P(l[M],l[M+1],l[M+2])),d.max(new P(l[M],l[M+1],l[M+2]))}const p=i.clone();p.setAttribute("aPos",new K(f,3)),p.setAttribute("aCol",new K(u,3));const g=new se(p,t,m),v=h.clone().add(d).multiplyScalar(.5),j=h.distanceTo(d)/2+2;p.boundingSphere=new Ue(v,j),g.boundingSphere=new Ue(v,j),e.push({mesh:g,center:v,radius:j})}return e},[s,a]);return T(({camera:i})=>{for(const t of r)t.mesh.visible=i.position.distanceTo(t.center)-t.radius<wt}),c.jsx(c.Fragment,{children:r.map((i,t)=>c.jsx("primitive",{object:i.mesh},t))})}const de=46,An=`
attribute float aAlpha;
varying float vAlpha;
void main() {
  vAlpha = aAlpha;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,Cn=`
uniform float uIntensity;
varying float vAlpha;
void main() {
  gl_FragColor = vec4(vec3(1.0, 0.98, 0.95), vAlpha * uIntensity);
}`;class En{constructor(){le(this,"pts",[]);le(this,"geo",new xe);le(this,"pos",new Float32Array(de*2*3));le(this,"alpha",new Float32Array(de*2));le(this,"mat");le(this,"mesh");this.geo.setAttribute("position",new Y(this.pos,3)),this.geo.setAttribute("aAlpha",new Y(this.alpha,1));const a=[];for(let r=0;r<de-1;r++){const i=r*2;a.push(i,i+1,i+2,i+1,i+3,i+2)}this.geo.setIndex(a),this.mat=new ge({vertexShader:An,fragmentShader:Cn,transparent:!0,depthWrite:!1,blending:Le,uniforms:{uIntensity:{value:0}}}),this.mesh=new ht(this.geo,this.mat),this.mesh.frustumCulled=!1}}const V=new P,Ee=new P,Se=new P,st=new P;function In({tips:s}){const a=x.useMemo(()=>s.map(()=>new En),[s]),r=x.useRef(0);return T(({camera:i},t)=>{const e=b.flight,n=b.phase==="flying",o=Math.abs(b.flight.yawRate)*1.2+Math.abs(b.flight.pitchRate)*1.4,l=Math.max(0,(e.speed-Pe.baseSpeed*1.25)/(Pe.maxSpeed-Pe.baseSpeed*1.25)),m=n?Math.min(1,l*1.2+Math.max(0,o-.75)*.9):0;r.current+=(m-r.current)*(1-Math.exp(-4*t));const f=r.current;a.forEach((u,h)=>{s[h].getWorldPosition(V);const d=u.pts[0];!d||d.distanceToSquared(V)>.5?(u.pts.unshift(V.clone()),u.pts.length>de&&u.pts.pop()):d.copy(V),n||(u.pts.length=Math.min(u.pts.length,1));const p=u.pts.length;for(let g=0;g<de;g++){const v=u.pts[Math.min(g,p-1)],j=u.pts[Math.min(g+1,p-1)];Se.subVectors(v,j),Se.lengthSq()<1e-6&&Se.set(0,0,1),st.subVectors(i.position,v),Ee.crossVectors(Se,st).normalize();const y=g/(de-1),M=.12+y*.55;V.copy(v).addScaledVector(Ee,M),u.pos.set([V.x,V.y,V.z],g*6),V.copy(v).addScaledVector(Ee,-M),u.pos.set([V.x,V.y,V.z],g*6+3);const k=g<p?(1-y)*(1-y)*.55:0;u.alpha[g*2]=k,u.alpha[g*2+1]=k}u.geo.attributes.position.needsUpdate=!0,u.geo.attributes.aAlpha.needsUpdate=!0,u.mat.uniforms.uIntensity.value=f,u.mesh.visible=f>.01})}),c.jsx(c.Fragment,{children:a.map((i,t)=>c.jsx("primitive",{object:i.mesh},t))})}const Mt="/models/plane.glb";it.preload(dt,Mt);const Rn=8.6;function Gn(){const s=document.createElement("canvas");s.width=s.height=128;const a=s.getContext("2d"),r=a.createRadialGradient(64,64,6,64,64,64);return r.addColorStop(0,"rgba(52,58,69,0.0)"),r.addColorStop(.3,"rgba(52,58,69,0.26)"),r.addColorStop(.8,"rgba(52,58,69,0.16)"),r.addColorStop(.9,"rgba(240,236,226,0.3)"),r.addColorStop(1,"rgba(240,236,226,0)"),a.fillStyle=r,a.fillRect(0,0,128,128),new ft(s)}function _n(s){const a=new B({map:s,emissive:new w(.28,.28,.28),roughness:.72,metalness:0,side:ae});return a.livery={uniforms:{uLivery:{value:0},uWing:{value:new w},uBody:{value:new w}}},a.onBeforeCompile=r=>{Object.assign(r.uniforms,a.livery.uniforms),r.fragmentShader=r.fragmentShader.replace("#include <common>",`#include <common>
uniform float uLivery;
uniform vec3 uWing;
uniform vec3 uBody;`).replace("#include <map_fragment>",`#include <map_fragment>
        if (uLivery > 0.5) {
          vec3 c = diffuseColor.rgb;
          float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
          // Hue tests as ratios, so dark, shadowed brush strokes still classify.
          float red = smoothstep(0.3, 0.55, (c.r - max(c.g, c.b)) / (c.r + 1e-3));
          float teal = smoothstep(0.25, 0.5, (min(c.g, c.b) - c.r) / (max(c.g, c.b) + 1e-3));
          // Brush shading relative to each paint's measured mean luminance (red ≈ 0.03,
          // teal ≈ 0.10 linear), compressed so the livery reads clean, not blotchy.
          // Wings are big: a touch quieter than the accent, with more of the brushwork kept.
          vec3 wing = uWing * 0.86 * clamp(pow(lum / 0.03, 0.8), 0.5, 1.15);
          vec3 body = uBody * clamp(pow(lum / 0.10, 0.7), 0.55, 1.12);
          diffuseColor.rgb = mix(mix(c, wing, red), body, teal * (1.0 - red));
        }`).replace("#include <emissivemap_fragment>","totalEmissiveRadiance = diffuseColor.rgb * emissive;")},a.customProgramCacheKey=()=>"plane-livery",a}function Dn(s,a){s.livery.uniforms.uLivery.value=1,s.livery.uniforms.uWing.value.set(a.accent),s.livery.uniforms.uBody.value.set(a.body)}function Wn(s,a){const r=s.clone(!0);let i=null,t=null;const e=new U({color:"#1d2430",side:$t});if(r.traverse(S=>{/^(Wind|pasted__)/.test(S.name)&&(S.visible=!1);const A=S;if(!A.isMesh)return;const q=A.material;q.name==="Outline"?(A.material=e,A.castShadow=!1):(i??(i=_n(q.map)),A.material=i,A.castShadow=!0),S.name==="Plane_lambert1_0"&&(t=A)}),!i||!t)throw new Error("plane.glb: unexpected structure");r.updateMatrixWorld(!0);const n=new Xt().setFromObject(t),o=n.getSize(new P),l=n.getCenter(new P),m=Rn/o.x,f=new qe;f.add(r),r.position.set(-l.x,-n.min.y,-l.z);const u=new qe;u.add(f),u.scale.setScalar(m),u.rotation.y=Math.PI,u.position.y=-to,u.updateMatrixWorld(!0);const h=t.geometry.getAttribute("position"),d=new P,p=new P;let g=-1/0;for(let S=0;S<h.count;S++)d.fromBufferAttribute(h,S),d.x>g&&(g=d.x,p.copy(d));p.applyMatrix4(t.matrixWorld),p.x=Math.abs(p.x);const v=r.getObjectByName("Propellor")??null,j=v?v.children.slice():[],y=j.find(S=>S.isMesh);y==null||y.geometry.computeBoundingBox();const M=y!=null&&y.geometry.boundingBox?Math.max(y.geometry.boundingBox.max.y,y.geometry.boundingBox.max.x):3,k=new ht(new Ht(M*1.06,40),new U({map:a,transparent:!0,opacity:0,depthWrite:!1,side:ae}));return k.position.z=.45,v==null||v.add(k),{root:u,prop:v,blades:j,disc:k,paint:i,tip:p}}const Ie=new we,Re=new we,at=new Ge(0,0,0,"YXZ");function Ln(){const s=it(dt,Mt),a=x.useRef(null),r=x.useRef(null),i=x.useRef(0),t=x.useRef({x:0,y:0,z:0,init:!1}),e=L(g=>g.progress.skin),n=L(g=>g.cameraMode),o=L(g=>g.settings.reducedMotion),l=Ve.find(g=>g.id===e)??Ve[0],m=x.useMemo(()=>Gn(),[]),f=x.useMemo(()=>Wn(s.scene,m),[s,m]),u=x.useMemo(()=>({red:new U({color:new w(1.5,.35,.3),toneMapped:!1}),green:new U({color:new w(.35,1.4,.6),toneMapped:!1})}),[]),h=x.useMemo(()=>new ne,[]),d=x.useMemo(()=>new ne,[]);x.useEffect(()=>Dn(f.paint,l),[f,l]),T((g,v)=>{var be;const j=a.current;if(!j)return;const y=b.pose,M=b.flight,k=g.clock.elapsedTime;j.position.set(y.x,y.y,y.z),at.set(y.pitch,y.heading,-y.roll,"YXZ"),Re.setFromEuler(at);const S=t.current;!S.init||Math.hypot(y.x-S.x,y.y-S.y,y.z-S.z)>40||n==="cockpit"?Ie.copy(Re):Ie.slerp(Re,1-Math.exp(-22*Math.min(v,.1))),Object.assign(S,{x:y.x,y:y.y,z:y.z,init:!0}),j.quaternion.copy(Ie);const q=(be=b.visit)==null?void 0:be.stage,F=b.phase==="parked"||q==="landed"||q==="turn",G=F?.18:Math.min(1,.45+M.speed/Pe.maxSpeed*.55+(M.boosting?.15:0));if(r.current){const X=F||o?0:1,ve=b.ctl;r.current.position.set(0,Math.sin(k*1.3)*.05*X,0),r.current.rotation.set(Math.sin(k*1.1+.6)*.012*X+ve.pitch*.03*X,-ve.turn*.035*X,Math.sin(k*.9)*.02*X)}const N=F?0:34+G*46;i.current+=(N-i.current)*(1-Math.exp(-(F?1.2:2.5)*v));const J=i.current;f.prop&&(f.prop.rotation.z+=J*v);const re=Math.min(1,Math.max(0,(J-14)/22));for(const X of f.blades)X!==f.disc&&(X.visible=re<.95);f.disc.material.opacity=re*.8,f.disc.visible=re>.02,f.root.visible=n!=="cockpit"||L.getState().mode!=="flying"});const{tip:p}=f;return c.jsxs(c.Fragment,{children:[c.jsx("group",{ref:a,children:c.jsxs("group",{ref:r,children:[c.jsx("primitive",{object:f.root}),c.jsx("mesh",{position:[-p.x,p.y,p.z],material:u.red,children:c.jsx("sphereGeometry",{args:[.09,8,6]})}),c.jsx("mesh",{position:[p.x,p.y,p.z],material:u.green,children:c.jsx("sphereGeometry",{args:[.09,8,6]})}),c.jsx("primitive",{object:h,position:[-p.x,p.y,p.z+.25]}),c.jsx("primitive",{object:d,position:[p.x,p.y,p.z+.25]})]})}),c.jsx(In,{tips:[h,d]})]})}const he=new P(0,1,0);function Bn(){const s=pe(i=>i.camera),a=pe(i=>i.gl),r=x.useMemo(()=>({offset:new P(0,6,22),look:new P,lookRel:new P,lookInit:!1,lift:0,pos:new P,fov:ue.fovBase,roll:0,orbit:.8,lastMode:"",viewShift:0,blendT:1,blendDur:1,q:new we,e:new Ge,tmp:new P,desired:new P,lookDesired:new P,lookPlane:new P,lookQ:new we,lookE:new Ge}),[]);return x.useEffect(()=>{const i=a.domElement;let t=null,e=0,n=0;const o=d=>{const p=L.getState();if(p.mode==="flying"&&d.pointerType==="mouse"){if(!(p.settings.controlMode==="mouse"?d.button===2:d.button===0||d.button===2))return;t="look",C.dragging=!0}else return;e=d.clientX,n=d.clientY,i.setPointerCapture(d.pointerId)},l=d=>{if(!t)return;const p=d.clientX-e,g=d.clientY-n;e=d.clientX,n=d.clientY,C.yaw-=p*.006,C.pitch=Math.max(-.6,Math.min(1,C.pitch+g*.004)),C.lastInput=performance.now()/1e3},m=()=>{t==="look"&&(C.dragging=!1,C.lastInput=performance.now()/1e3),t=null},f=d=>{const p=L.getState(),g=1+Math.sign(d.deltaY)*.08;p.mode==="flying"&&(C.zoom=Math.max(.55,Math.min(2.4,C.zoom*g)))},u=d=>{L.getState().mode==="flying"&&d.preventDefault()},h=()=>{C.yaw=0,C.pitch=0,C.zoom=1};return i.addEventListener("pointerdown",o),i.addEventListener("pointermove",l),i.addEventListener("pointerup",m),i.addEventListener("pointercancel",m),i.addEventListener("wheel",f,{passive:!0}),i.addEventListener("contextmenu",u),i.addEventListener("dblclick",h),()=>{i.removeEventListener("pointerdown",o),i.removeEventListener("pointermove",l),i.removeEventListener("pointerup",m),i.removeEventListener("pointercancel",m),i.removeEventListener("wheel",f),i.removeEventListener("contextmenu",u),i.removeEventListener("dblclick",h)}},[a]),T((i,t)=>{var X,ve;const e=Math.min(t,.1),n=L.getState(),o=b.pose,l=b.flight,m=n.settings.reducedMotion,f=ao(),u=Math.max(0,Math.min(1,(l.speed-f.baseSpeed)/(f.maxSpeed-f.baseSpeed))),h=Math.max(0,Math.min(1,(f.baseSpeed-l.speed)/(f.baseSpeed-f.minSpeed))),d=ue.chase,p=r.tmp.set(-Math.sin(o.heading),0,-Math.cos(o.heading)),g=new P(Math.cos(o.heading),0,-Math.sin(o.heading));let v=n.cameraMode;const j=(X=b.visit)==null?void 0:X.stage;n.mode==="title"||n.mode==="loading"?v="title":j==="landed"?v="parked":n.panel?v="showcase":j==="final"||j==="rollout"||j==="turn"?v="landing":j==="takeoff"&&(v="departure"),v!==r.lastMode&&(r.blendDur=v==="cockpit"||r.lastMode==="cockpit"?.2:r.lastMode==="title"?2.4:v==="landing"||v==="parked"||r.lastMode==="departure"?1.8:.9,r.blendT=0,r.lastMode=v),r.blendT=Math.min(r.blendDur,r.blendT+e);const y=r.blendT/r.blendDur,M=y*y*(3-2*y);let k=ue.fovBase,S=d.posDamping,A=d.lookDamping,q=0;const F=r.desired,G=r.lookDesired;switch(v){case"title":case"showcase":{r.orbit+=e*(v==="title"?.045:.08)*(m?.4:1);const I=v==="title"?21:24,E=r.orbit;F.set(Math.sin(E)*I,v==="title"?5.5:7,Math.cos(E)*I);const D=new P(Math.cos(E),0,-Math.sin(E)).multiplyScalar(v==="title"?-5.5:-3);G.set(D.x,1.6,D.z),S=2,A=3,k=v==="title"?50:55;break}case"landing":case"departure":{const I=b.visit,[E,D]=v==="departure"?[-I.plan.dir[0],-I.plan.dir[1]]:I.plan.dir,W=v==="departure"?-1:1;F.set(-E*17-D*9*W,5.5,-D*17+E*9*W),G.set(E*9,1.2,D*9),S=3,A=5,k=55;break}case"parked":{const I=b.visit,E=oo(I.destId);r.orbit+=e*.06*(m?.4:1);const D=E?(E.pos[0]-o.x)*.3:0,W=E?(E.pos[2]-o.z)*.3:0,H=E?Math.min(10,Math.max(2,(E.pos[1]-o.y)*.25)):2,Q=40+Math.hypot(D,W)*.6;F.set(D+Math.sin(r.orbit)*Q,H+24,W+Math.cos(r.orbit)*Q),G.set(D,H,W),S=1.6,A=2.2,k=52;break}case"side":{F.copy(g).multiplyScalar(17).addScaledVector(p,-4).addScaledVector(he,2.5),G.copy(p).multiplyScalar(3).addScaledVector(he,1),S=5,A=9,k=55+u*5;break}case"overhead":{F.copy(p).multiplyScalar(-14).addScaledVector(he,38),G.copy(p).multiplyScalar(10),S=4,A=8,k=58;break}case"front":{F.copy(p).multiplyScalar(18).addScaledVector(he,3).addScaledVector(g,-3),G.set(0,1,0),S=6,A=10,k=52;break}case"cinematic":{const I=ue.cinematic;F.copy(p).multiplyScalar(-30).addScaledVector(he,I.height).addScaledVector(g,I.lateral*(Math.sin(i.clock.elapsedTime*.07)>0?1:-1)),G.copy(p).multiplyScalar(14),S=I.posDamping,A=I.lookDamping,k=52+u*6;break}case"cockpit":break;default:{const I=o.pitch*d.pitchFollow,E=Math.min(1,Math.max(0,(1-i.size.width/i.size.height)/.55)),D=v==="far"?2.1:1,W=(d.distance+u*d.boostPullback-h*2.5)*(1+.45*E)*D;F.set(Math.sin(o.heading)*Math.cos(I)*W,-Math.sin(I)*W+d.height*(1+.3*E)*(D>1?2.2:1),Math.cos(o.heading)*Math.cos(I)*W).addScaledVector(g,-Math.sin(o.roll)*d.lateralShift),G.set(-Math.sin(o.heading)*Math.cos(o.pitch)*d.lookAhead,Math.sin(o.pitch)*d.lookAhead+1.4,-Math.cos(o.heading)*Math.cos(o.pitch)*d.lookAhead),q=-o.roll*d.rollFollow*(m?.4:1),k=ue.fovBase+u*(m?4:ue.fovBoost)+(l.boosting&&!m?3:0)}}const N=performance.now()/1e3;if(!C.dragging&&N-C.lastInput>1.4&&(C.yaw=me(C.yaw,0,2.2,e),C.pitch=me(C.pitch,0,2.2,e)),v!=="title"&&v!=="cockpit"){if(Math.abs(C.yaw)>1e-4||Math.abs(C.pitch)>1e-4||C.zoom!==1){const I=Math.cos(C.yaw),E=Math.sin(C.yaw),D=F.x,W=F.z;F.x=D*I+W*E,F.z=-D*E+W*I;const H=Math.hypot(F.x,F.z)||1,Q=F.length(),fe=Math.max(-.35,Math.min(1.35,Math.atan2(F.y,H)+C.pitch));F.set(F.x/H*Math.cos(fe)*Q,Math.sin(fe)*Q,F.z/H*Math.cos(fe)*Q).multiplyScalar(C.zoom);const bt=Math.min(1,(Math.abs(C.yaw)+Math.abs(C.pitch))*1.8);G.lerp(r.lookPlane.set(0,1.2,0),bt)}C.dragging&&(S=Math.max(S,10),A=Math.max(A,12))}let J=0;if(b.glance&&v==="chase"){const I=b.glance;J=Math.sin(Math.min(1,I.t/I.dur)*Math.PI)*.4,k+=J*10}if(v==="cockpit"){const[I,E,D]=ue.cockpit.offset;r.e.set(o.pitch,o.heading,-o.roll*(m?.5:1),"YXZ"),r.q.setFromEuler(r.e);const W=new P(I,E,D).applyQuaternion(r.q);r.q.multiply(r.lookQ.setFromEuler(r.lookE.set(-C.pitch*.8,C.yaw,0,"YXZ"))),s.position.set(o.x+W.x,o.y+W.y,o.z+W.z),s.quaternion.slerp(r.q,y<1?.35+M*.65:1),r.offset.copy(W),k=68+u*8}else{const I=1-Math.exp(-(1.2+(S-1.2)*M)*e);r.offset.lerp(F,I),r.pos.set(o.x+r.offset.x,o.y+r.offset.y,o.z+r.offset.z);let E=0;if(no()&&v!=="title"){const fe=so().collision.groundAt(r.pos.x,r.pos.z,r.pos.y+30);fe!==-1/0&&(E=Math.max(0,fe+3-r.pos.y))}r.lift=me(r.lift,E,E>r.lift?16:3,e),r.pos.y+=Math.max(r.lift,E-1.5);const D=r.desired.copy(G);J>0&&b.glance&&D.lerp(r.lookPlane.set(b.glance.x-o.x,b.glance.y-o.y,b.glance.z-o.z),J),r.lookInit||(r.lookRel.copy(D),r.lookInit=!0),r.lookRel.lerp(D,1-Math.exp(-(1.5+(A-1.5)*M)*e)),r.look.set(o.x+r.lookRel.x,o.y+r.lookRel.y,o.z+r.lookRel.z);const W=n.settings.cameraShake&&!m?b.shake:0,H=i.clock.elapsedTime,Q=n.settings.cameraShake&&!m&&l.boosting?.04:0;s.position.set(r.pos.x+(Math.sin(H*47)*.35+Math.sin(H*23)*.2)*(W+Q),r.pos.y+Math.sin(H*39)*.3*(W+Q),r.pos.z+Math.cos(H*41)*.3*(W+Q)),s.up.copy(he),s.lookAt(r.look),r.roll=me(r.roll,q,4,e),s.rotateZ(r.roll)}const re=i.size.width,be=n.panel&&re>=640?Math.min(620,re*.46):0;r.viewShift=me(r.viewShift,be/2,4,e),r.viewShift>.5?s.setViewOffset(re,i.size.height,r.viewShift,0,re,i.size.height):(ve=s.view)!=null&&ve.enabled&&s.clearViewOffset(),r.fov=me(r.fov,k,3,e),Math.abs(s.fov-r.fov)>.01&&(s.fov=r.fov,s.updateProjectionMatrix())},-1),null}const Nn=`
float pg_hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float pg_noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(pg_hash(i), pg_hash(i + vec2(1, 0)), f.x), mix(pg_hash(i + vec2(0, 1)), pg_hash(i + vec2(1, 1)), f.x), f.y);
}
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 c = inputColor.rgb;
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  // Split tone: cool, slightly blue shadows; warm, creamy highlights.
  c += mix(vec3(-0.01, 0.004, 0.03), vec3(0.025, 0.012, -0.018), smoothstep(0.15, 0.85, l));
  // Lifted blacks: nothing goes inky.
  c = c * 0.96 + 0.025;
  // Paper: fine tooth plus soft fibre blotches, fixed to the screen like a print.
  vec2 px = uv * resolution;
  float tooth = pg_hash(floor(px * 0.75)) - 0.5;
  float fibre = pg_noise(px * 0.035) * 0.6 + pg_noise(px * 0.11) * 0.4 - 0.5;
  c *= 1.0 + tooth * 0.045 + fibre * 0.035;
  outputColor = vec4(clamp(c, 0.0, 1.0), inputColor.a);
}`;class On extends Et{constructor(){super("PaintEffect",Nn,{blendFunction:It.NORMAL})}}function Un({preset:s}){const a=x.useMemo(()=>new On,[]);return s.postprocessing?c.jsxs(St,{multisampling:s.msaa,enableNormalPass:!1,children:[s.ao?c.jsx(Pt,{aoRadius:4,intensity:1,distanceFalloff:1.2,halfRes:!0,quality:"performance",color:"#2e5a7a"}):c.jsx(c.Fragment,{}),s.bloom?c.jsx(kt,{mipmapBlur:!0,intensity:.22,luminanceThreshold:1.5,luminanceSmoothing:.3,radius:.55}):c.jsx(c.Fragment,{}),c.jsx(Tt,{mode:Ft.NEUTRAL}),c.jsx(At,{saturation:.04}),c.jsx("primitive",{object:a}),c.jsx(Ct,{offset:.38,darkness:.22,eskil:!1})]}):null}const qn=s=>Number.isFinite(s.x)&&Number.isFinite(s.y)&&Number.isFinite(s.z);function Vn(){const s=pe(t=>t.gl),a=pe(t=>t.camera),r=x.useRef({last:0,w:0,h:0,dpr:0,phase:"",stage:"",median:0,flashing:!1}),i=x.useMemo(()=>{const t=document.createElement("canvas");return t.width=5,t.height=1,t.getContext("2d",{willReadFrequently:!0})},[]);return x.useMemo(()=>R.horizon.clone().convertLinearToSRGB(),[]),x.useEffect(()=>{const t=s.info.autoReset;s.info.autoReset=!1;const e=s.getContext(),n=e.getExtension("WEBGL_debug_renderer_info"),o=e.getContextAttributes();je.env={renderer:n?String(e.getParameter(n.UNMASKED_RENDERER_WEBGL)):"unknown",contextAlpha:o==null?void 0:o.alpha,antialias:o==null?void 0:o.antialias,dpr:window.devicePixelRatio,viewport:[window.innerWidth,window.innerHeight],quality:L.getState().quality,settings:L.getState().settings},Z("probe-start",je.env);const l=s.domElement,m=u=>Z("webgl-context-lost",{type:u.type},"warn"),f=()=>Z("webgl-context-restored",{},"warn");return l.addEventListener("webglcontextlost",m),l.addEventListener("webglcontextrestored",f),()=>{s.info.autoReset=t,l.removeEventListener("webglcontextlost",m),l.removeEventListener("webglcontextrestored",f)}},[s]),T(()=>{je.frame++,s.info.reset()},-100),T(()=>{var F;const t=r.current,e=performance.now(),n=t.last?e-t.last:0;t.last=e;const o=s.domElement;(o.width!==t.w||o.height!==t.h||window.devicePixelRatio!==t.dpr)&&(t.w&&Z("canvas-resize",{from:[t.w,t.h,t.dpr],to:[o.width,o.height,window.devicePixelRatio]},"warn"),t.w=o.width,t.h=o.height,t.dpr=window.devicePixelRatio),[[.5,.5],[.25,.3],[.75,.3],[.3,.75],[.7,.75]].forEach(([G,N],J)=>i.drawImage(o,Math.floor(G*o.width),Math.floor(N*o.height),1,1,J,0,1,1));const m=i.getImageData(0,0,5,1).data;let f=[255,255,255],u=[0,0,0],h=!1;for(let G=0;G<5;G++){for(let N=0;N<3;N++)f[N]=Math.min(f[N],m[G*4+N]),u[N]=Math.max(u[N],m[G*4+N]);m[G*4+3]<10&&(h=!0)}const d=u[0]-f[0]<=6&&u[1]-f[1]<=6&&u[2]-f[2]<=6,p=h||d;f=u=[];const g=s.info.render.calls,v=s.info.render.triangles;t.median=t.median?t.median*.97+g*.03:g;const j=qn(a.position)&&a.projectionMatrix.elements.every(Number.isFinite)&&a.matrixWorldInverse.elements.every(Number.isFinite),y=b.pose,M=[y.x,y.y,y.z,y.heading,y.pitch,y.roll].every(Number.isFinite),k=((F=b.visit)==null?void 0:F.stage)??null;ro({f:je.frame,t:+(e/1e3).toFixed(3),gapMs:+n.toFixed(1),calls:g,tris:v,blank:p,phase:b.phase,stage:k,cam:[+a.position.x.toFixed(1),+a.position.y.toFixed(1),+a.position.z.toFixed(1)]});const S=L.getState(),A=()=>{var G;return{calls:g,tris:v,medianCalls:Math.round(t.median),pixels:Array.from(m),camera:{pos:a.position.toArray().map(N=>+N.toFixed(2)),near:a.near,far:a.far,fov:a.fov},pose:{x:+y.x.toFixed(2),y:+y.y.toFixed(2),z:+y.z.toFixed(2),heading:+y.heading.toFixed(3),pitch:+y.pitch.toFixed(3),roll:+y.roll.toFixed(3)},phase:b.phase,stage:k,flash:+b.flash.toFixed(3),respawnT:+b.respawnT.toFixed(3),mode:S.mode,overlay:S.overlay,panel:((G=S.panel)==null?void 0:G.kind)??null,quality:S.quality,cameraMode:S.cameraMode,hidden:document.hidden,onScreen:io()}};p?Z("blank-frame",A(),"warn"):t.median>20&&g<t.median*.25&&Z("draw-calls-collapsed",A(),"warn"),j||Z("camera-non-finite",A(),"warn"),M||Z("pose-non-finite",A(),"warn"),n>120&&!document.hidden&&Z("long-frame",{gapMs:Math.round(n),calls:g,phase:b.phase,stage:k}),(b.phase!==t.phase||k!==t.stage)&&(Z("phase",{phase:b.phase,stage:k}),t.phase=b.phase,t.stage=k);const q=b.flash>.5||b.phase==="respawning";q&&!t.flashing&&Z("fade-overlay",{flash:+b.flash.toFixed(2),phase:b.phase}),t.flashing=q},100),null}function $n(){return T((s,a)=>{$.uTime.value+=Math.min(a,.1),lo(a)},-2),T(({camera:s},a)=>{b.fps=b.fps*.95+1/Math.max(a,.001)*.05,uo(s,a)}),null}function Xn(){const s=pe(a=>a.get);return x.useEffect(()=>{},[s]),null}const rt=["low","medium","high"];function Hn({onDecline:s,onIncline:a}){const r=x.useRef({t:0,frames:0,slow:0,fast:0,ups:0,warm:0});return T((i,t)=>{const e=r.current;if(document.hidden||t>.25||(e.warm+=t,e.warm<4)||(e.t+=t,e.frames++,e.t<3))return;const n=e.frames/e.t;e.t=0,e.frames=0,n<40?(e.slow++,e.fast=0,e.slow>=2&&(e.slow=0,s())):n>72?(e.fast++,e.slow=0,e.fast>=4&&e.ups<2&&(e.fast=0,e.ups++,a())):(e.slow=0,e.fast=0)}),null}function ts({world:s}){const a=L(n=>n.quality),r=L(n=>n.settings.quality==="auto"),i=L(n=>n.setQuality),t=Kt[a],e=n=>{if(!r||n>0&&L.getState().isTouch)return;const o=rt.indexOf(L.getState().quality),l=rt[Math.max(0,Math.min(2,o+n))];l!==L.getState().quality&&i(l)};return c.jsxs(Rt,{className:"!fixed inset-0",shadows:t.shadows?{type:Zt}:!1,dpr:t.dpr,gl:n=>{const o={alpha:!1,antialias:!t.postprocessing,powerPreference:"high-performance",stencil:!1,depth:!0,preserveDrawingBuffer:!1},l=n,m=l.getContext("webgl2",o)??void 0;return new Qt({canvas:l,context:m,...o})},camera:{fov:50,near:.5,far:6e3,position:[20,110,90]},onCreated:({gl:n})=>{n.toneMapping=Yt,n.setClearColor(R.horizon,1),n.toneMappingExposure=1},"aria-label":"3D flight world",children:[c.jsx("color",{attach:"background",args:[R.horizon]}),c.jsx("fog",{attach:"fog",args:[R.fog,700,t.drawDistance*1.3]}),c.jsx(Hn,{onDecline:()=>e(-1),onIncline:()=>e(1)}),c.jsxs(x.Suspense,{fallback:null,children:[c.jsx(ho,{}),c.jsx(po,{preset:t}),c.jsx(Co,{world:s,density:t.cloudDensity}),c.jsx(yo,{density:t.cloudDensity}),c.jsx(an,{world:s,shadows:t.shadows}),c.jsx(Fn,{world:s,density:t.propDensity}),c.jsx(So,{world:s,density:t.cloudDensity}),c.jsx(un,{world:s}),c.jsx(vn,{preset:t}),c.jsx(Sn,{world:s,density:t.propDensity}),c.jsx(Mn,{world:s,count:Math.round(16*t.propDensity)}),c.jsx(x.Suspense,{fallback:null,children:c.jsx(Ln,{})}),c.jsx(Bn,{}),c.jsx($n,{}),c.jsx(Xn,{}),co&&c.jsx(Vn,{}),c.jsx(Un,{preset:t})]})]})}export{ts as default};
