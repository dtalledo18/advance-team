import { mouse } from './mouse.js';

export function initSmoke() {
    const canvas = document.getElementById('smoke-canvas');

    function resize() {
        canvas.width  = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false })
        || canvas.getContext('experimental-webgl', { alpha: true, premultipliedAlpha: false });

    if (!gl) { console.warn('WebGL no disponible.'); return; }

    // ── Vertex shader ─────────────────────────────────────────────────────
    const vsSource = `
    attribute vec2 a_pos;
    varying   vec2 v_uv;
    void main() {
      v_uv = a_pos * 0.5 + 0.5;
      gl_Position = vec4(a_pos, 0.0, 1.0);
    }
  `;

    // ── Fragment shader ───────────────────────────────────────────────────
    // Recibe u_hue (el arcoíris compartido) y construye colores dinámicamente
    const fsSource = `
    precision highp float;

    varying vec2  v_uv;
    uniform float u_time;
    uniform vec2  u_resolution;
    uniform vec2  u_mouse;
    uniform float u_speed;
    uniform float u_hue;

    vec3 hash3(vec3 p) {
      p = fract(p * vec3(443.897, 441.423, 437.195));
      p += dot(p, p.yxz + 19.19);
      return fract((p.xxy + p.yzz) * p.zyx);
    }

    float gnoise(vec3 p) {
      vec3 i = floor(p);
      vec3 f = fract(p);
      vec3 u = f * f * (3.0 - 2.0 * f);
      float a = dot(hash3(i              ) * 2.0 - 1.0, f              );
      float b = dot(hash3(i + vec3(1,0,0)) * 2.0 - 1.0, f - vec3(1,0,0));
      float c = dot(hash3(i + vec3(0,1,0)) * 2.0 - 1.0, f - vec3(0,1,0));
      float d = dot(hash3(i + vec3(1,1,0)) * 2.0 - 1.0, f - vec3(1,1,0));
      float e = dot(hash3(i + vec3(0,0,1)) * 2.0 - 1.0, f - vec3(0,0,1));
      float g = dot(hash3(i + vec3(1,0,1)) * 2.0 - 1.0, f - vec3(1,0,1));
      float h = dot(hash3(i + vec3(0,1,1)) * 2.0 - 1.0, f - vec3(0,1,1));
      float k = dot(hash3(i + vec3(1,1,1)) * 2.0 - 1.0, f - vec3(1,1,1));
      return mix(mix(mix(a,b,u.x),mix(c,d,u.x),u.y),
                 mix(mix(e,g,u.x),mix(h,k,u.x),u.y), u.z);
    }

    float fbm(vec3 p) {
      float v = 0.0, amp = 0.52, frq = 1.0;
      for (int i = 0; i < 5; i++) {
        v += amp * gnoise(p * frq);
        frq *= 2.01; amp *= 0.48;
      }
      return v * 0.5 + 0.5;
    }

    // HSL → RGB dentro del shader para usar el mismo hue que el trail
    float hue2rgb(float p2, float q2, float t) {
      if (t < 0.0) t += 1.0;
      if (t > 1.0) t -= 1.0;
      if (t < 1.0/6.0) return p2 + (q2 - p2) * 6.0 * t;
      if (t < 0.5)     return q2;
      if (t < 2.0/3.0) return p2 + (q2 - p2) * (2.0/3.0 - t) * 6.0;
      return p2;
    }
    vec3 hsl2rgb(float h, float s, float l) {
      h = mod(h, 360.0) / 360.0;
      float q2 = l < 0.5 ? l*(1.0+s) : l+s-l*s;
      float p2 = 2.0*l - q2;
      return vec3(
        hue2rgb(p2, q2, h + 1.0/3.0),
        hue2rgb(p2, q2, h),
        hue2rgb(p2, q2, h - 1.0/3.0)
      );
    }

    void main() {
      vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);
      vec2 uv     = v_uv * aspect;
      vec2 mpos   = u_mouse * aspect;
      float t     = u_time * 0.18;

      // Domain warping para humo orgánico
      vec3 p = vec3(uv * 2.5, t);
      vec3 q = vec3(fbm(p),
                    fbm(p + vec3(5.2, 1.3, 0.0)),
                    fbm(p + vec3(1.7, 9.2, 0.0)));
      vec3 r = vec3(fbm(p + 4.0*q + vec3(1.7, 9.2, t*0.5)),
                    fbm(p + 4.0*q + vec3(8.3, 2.8, t*0.3)),
                    fbm(p + 4.0*q + vec3(0.0, 0.0, t*0.2)));
      float warp = fbm(p + 4.0 * r);

      // Forma de la nube
      float dist   = distance(uv, mpos);
      float radius = 0.22 + u_speed * 0.18;
      float blob   = 1.0 - smoothstep(0.0, radius, dist);
      float shape  = pow(blob * (0.4 + warp * 0.85), 1.4);

      // Colores arcoíris usando el hue compartido con trail.js
      vec3 colorA = hsl2rgb(u_hue,        1.0, 0.62);
      vec3 colorB = hsl2rgb(u_hue + 45.0, 1.0, 0.55);
      vec3 colorC = hsl2rgb(u_hue + 95.0, 1.0, 0.42);

      float n1 = fbm(vec3(uv * 1.2, t * 0.6));
      float n2 = fbm(vec3(uv * 1.8 + 3.0, t * 0.4));

      vec3 color = mix(colorA, colorB, n1);
           color = mix(color,  colorC, n2 * 0.55);

      float alpha = shape * 0.92;
      float inner = 1.0 - smoothstep(0.0, radius * 0.35, dist);
      alpha = clamp(alpha + inner * 0.25, 0.0, 0.95);

      gl_FragColor = vec4(color, alpha);
    }
  `;

    function compile(type, src) {
        const sh = gl.createShader(type);
        gl.shaderSource(sh, src);
        gl.compileShader(sh);
        if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
            console.error('Shader error:', gl.getShaderInfoLog(sh));
            return null;
        }
        return sh;
    }

    const vs = compile(gl.VERTEX_SHADER,   vsSource);
    const fs = compile(gl.FRAGMENT_SHADER, fsSource);
    if (!vs || !fs) return;

    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const vbuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbuf);
    gl.bufferData(gl.ARRAY_BUFFER,
        new Float32Array([-1,-1, 1,-1, -1,1, 1,-1, 1,1, -1,1]),
        gl.STATIC_DRAW);

    const aPos   = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uTime  = gl.getUniformLocation(prog, 'u_time');
    const uRes   = gl.getUniformLocation(prog, 'u_resolution');
    const uMouse = gl.getUniformLocation(prog, 'u_mouse');
    const uSpeed = gl.getUniformLocation(prog, 'u_speed');
    const uHue   = gl.getUniformLocation(prog, 'u_hue');

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Render loop — solo lee de mouse.js, cero lógica propia de mouse
    function render(ts) {
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.uniform1f(uTime,  ts * 0.001);
        gl.uniform2f(uRes,   canvas.width, canvas.height);
        gl.uniform2f(uMouse, mouse.nx, mouse.ny);       // sin lag, posición real
        gl.uniform1f(uSpeed, Math.min(mouse.speed, 1.0));
        gl.uniform1f(uHue,   mouse.hue);                // arcoíris compartido

        gl.drawArrays(gl.TRIANGLES, 0, 6);
        requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
}