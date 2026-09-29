// Paper geometry and lighting adapted from Canvas UI Peel by David Haz.
// https://canvasui.dev/docs/components/peel (MIT + Commons Clause)

export const SHEET_VERT = `precision highp float;
layout(location = 0) in vec2 aGrid;
uniform vec2 uRes;
uniform float uSide;
uniform float uPeel;
uniform float uReveal;
uniform float uCurl;
uniform float uBow;
uniform float uFocal;
uniform float uZone;
uniform float uBulge;
uniform vec2 uPointer;
out vec2 vUv;
out float vShade;
out vec2 vSide;

const float PI = 3.1415926;

void main () {
  vUv = aGrid;
  vec2 p = aGrid * uRes;
  float crossLen = (uSide < 1.5) ? uRes.y : uRes.x;
  float u; float v;
  if (uSide < 0.5) { u = p.x; v = p.y; }
  else if (uSide < 1.5) { u = uRes.x - p.x; v = p.y; }
  else if (uSide < 2.5) { u = p.y; v = p.x; }
  else { u = uRes.y - p.y; v = p.x; }

  float A = clamp(uPeel, 0.0, 1.0);
  float f = A * uReveal;
  float R = max(uCurl * A, 0.001);
  float c0 = f + R;

  float dvB = (uPointer.y - v) / max(crossLen * 0.28, 1.0);
  float prox = clamp(1.0 - uPointer.x / max(c0 + uZone, 1.0), 0.0, 1.0);
  float c = c0 + uBulge * A * prox * prox * exp(-dvB * dvB);

  float x = u;
  float z = 0.0;
  float sh = 0.0;
  if (A > 0.001 && u < c) {
    float theta = (c - u) / R;
    if (theta <= PI) {
      x = c - R * sin(theta);
      z = R * (1.0 - cos(theta));
    } else {
      x = c + (theta - PI) * R;
      z = 2.0 * R;
    }
    sh = sin(clamp(theta, 0.0, PI));
  }
  z += uBow * A * sin(PI * v / max(crossLen, 1.0)) * clamp(z / max(R, 1.0), 0.0, 1.5);
  z = clamp(z, -uFocal * 0.2, uFocal * 0.45);
  vShade = sh * smoothstep(0.0, 0.08, A);
  vSide = vec2(u, v);

  vec2 q;
  if (uSide < 0.5) q = vec2(x, v);
  else if (uSide < 1.5) q = vec2(uRes.x - x, v);
  else if (uSide < 2.5) q = vec2(v, x);
  else q = vec2(v, uRes.y - x);

  vec2 ndc = (q / uRes) * 2.0 - 1.0;
  ndc.y = -ndc.y;
  float w = (uFocal - z) / uFocal;
  gl_Position = vec4(ndc, -z / uFocal, w);
}`

export const SHEET_FRAG = `precision highp float;
in vec2 vUv;
in float vShade;
in vec2 vSide;
out vec4 outColor;
uniform sampler2D uContent;
uniform float uShade;
uniform float uMaxX;
uniform float uShine;
uniform vec3 uShineColor;
uniform float uCross;
uniform float uSpan;
uniform vec2 uPointer;

void main () {
  vec2 uv = clamp(vUv, vec2(0.001), vec2(uMaxX - 0.001, 0.999));
  vec4 tex = texture(uContent, uv);
  float sh = 1.0 - clamp(uShade, 0.0, 1.0) * 0.7 * pow(max(vShade, 0.0), 1.3);
  float du = max(vSide.x, 0.0);
  float line = exp(-du / 2.5) + exp(-du / 18.0) * 0.25;
  float dv = (vSide.y - uPointer.y) / max(uCross * 0.45, 1.0);
  float prox = clamp(1.0 - uPointer.x / max(uSpan, 1.0), 0.0, 1.0);
  float shine = uShine * line * exp(-dv * dv) * prox * prox;
  vec3 paper = !gl_FrontFacing ? tex.rgb : mix(vec3(0.961, 0.957, 0.937), tex.rgb, 0.12);
  vec3 rgb = mix(paper * sh, uShineColor, clamp(shine, 0.0, 1.0));
  outColor = vec4(rgb * tex.a, tex.a);
}`
