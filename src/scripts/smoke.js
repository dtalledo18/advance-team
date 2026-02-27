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

    const vsSource = `
    attribute vec2 a_pos;
    varying   vec2 v_uv;
    void main() {
      v_uv = a_pos * 0.5 + 0.5;
      gl_Position = vec4(a_pos, 0.0, 1.0);
    }
  `;

    const fsSource = `
    precision highp float;

    varying vec2  v_uv;
    uniform float u_time;
    uniform vec2  u_resolution;

    uniform vec2  u_mouse;
    uniform float u_speed;
    uniform float u_hue;
    uniform float u_fade;     /* 0 = invisible, 1 = full — controlado por JS */

    uniform int   u_count;
    uniform vec2  u_points[60];
    uniform float u_hues[60];
    uniform float u_ages[60]; /* 0..1: qué tan "viejo" es el punto (1=recién añadido) */

    vec3 hash3(vec3 p) {
      p = fract(p * vec3(443.897, 441.423, 437.195));
      p += dot(p, p.yxz + 19.19);
      return fract((p.xxy + p.yzz) * p.zyx);
    }
    float gnoise(vec3 p) {
      vec3 i=floor(p); vec3 f=fract(p); vec3 u=f*f*(3.-2.*f);
      float a=dot(hash3(i            )*2.-1.,f            );
      float b=dot(hash3(i+vec3(1,0,0))*2.-1.,f-vec3(1,0,0));
      float c=dot(hash3(i+vec3(0,1,0))*2.-1.,f-vec3(0,1,0));
      float d=dot(hash3(i+vec3(1,1,0))*2.-1.,f-vec3(1,1,0));
      float e=dot(hash3(i+vec3(0,0,1))*2.-1.,f-vec3(0,0,1));
      float g=dot(hash3(i+vec3(1,0,1))*2.-1.,f-vec3(1,0,1));
      float h=dot(hash3(i+vec3(0,1,1))*2.-1.,f-vec3(0,1,1));
      float k=dot(hash3(i+vec3(1,1,1))*2.-1.,f-vec3(1,1,1));
      return mix(mix(mix(a,b,u.x),mix(c,d,u.x),u.y),
                 mix(mix(e,g,u.x),mix(h,k,u.x),u.y),u.z);
    }
    float fbm(vec3 p) {
      float v=0.,amp=0.52,frq=1.;
      for(int i=0;i<5;i++){v+=amp*gnoise(p*frq);frq*=2.01;amp*=0.48;}
      return v*0.5+0.5;
    }
    float h2r(float p2,float q2,float t){
      if(t<0.)t+=1.; if(t>1.)t-=1.;
      if(t<1./6.)return p2+(q2-p2)*6.*t;
      if(t<.5)return q2;
      if(t<2./3.)return p2+(q2-p2)*(2./3.-t)*6.;
      return p2;
    }
    vec3 hsl(float h,float s,float l){
      h=mod(h,360.)/360.;
      float q2=l<.5?l*(1.+s):l+s-l*s; float p2=2.*l-q2;
      return vec3(h2r(p2,q2,h+1./3.),h2r(p2,q2,h),h2r(p2,q2,h-1./3.));
    }

    vec4 smokeBlob(vec2 uv, vec2 mpos, float hue, float radius,
                   float warp, float n1, float n2, float alphaScale) {
      float dist  = distance(uv, mpos);
      float blob  = 1.0 - smoothstep(0.0, radius, dist);
      float shape = pow(blob * (0.4 + warp * 0.85), 1.4);

      vec3 cA = hsl(hue,        1.0, 0.62);
      vec3 cB = hsl(hue + 45.0, 1.0, 0.55);
      vec3 cC = hsl(hue + 95.0, 1.0, 0.42);
      vec3 col = mix(cA, cB, n1);
           col = mix(col, cC, n2 * 0.55);

      float alpha = shape * 0.92 * alphaScale;
      float inner = 1.0 - smoothstep(0.0, radius * 0.35, dist);
      alpha = clamp(alpha + inner * 0.25 * alphaScale, 0.0, 0.95);

      return vec4(col, alpha);
    }

    void main() {
      /* Si u_fade es 0, descartar todo el pixel directamente */
      if (u_fade < 0.001) discard;

      vec2  aspect = vec2(u_resolution.x / u_resolution.y, 1.0);
      vec2  uv     = v_uv * aspect;
      float t      = u_time * 0.18;

      vec3 p = vec3(uv * 2.5, t);
      vec3 q = vec3(fbm(p),
                    fbm(p + vec3(5.2, 1.3, 0.0)),
                    fbm(p + vec3(1.7, 9.2, 0.0)));
      vec3 r = vec3(fbm(p + 4.0*q + vec3(1.7, 9.2, t*0.5)),
                    fbm(p + 4.0*q + vec3(8.3, 2.8, t*0.3)),
                    fbm(p + 4.0*q + vec3(0.0, 0.0, t*0.2)));
      float warp = fbm(p + 4.0 * r);
      float n1   = fbm(vec3(uv * 1.2, t * 0.6));
      float n2   = fbm(vec3(uv * 1.8 + 3.0, t * 0.4));

      /* ── Trail ── */
      float trailAlpha = 0.0;
      vec3  trailColor = vec3(0.0);
      float trailW     = 0.0;

      for (int i = 0; i < 60; i++) {
        if (i >= u_count) break;

        float progress = float(i) / float(u_count);
        /* u_ages[i]: 1.0 = recién añadido, va bajando → el punto se desvanece con el tiempo */
        float age = u_ages[i];

        vec2  mpos = u_points[i] * aspect;
        float rad  = (0.04 + progress * 0.11 + u_speed * 0.04);

        vec4 blob = smokeBlob(uv, mpos, u_hues[i], rad,
                              warp, n1, n2,
                              pow(progress, 1.3) * 0.72 * age);

        trailAlpha += blob.a;
        trailColor += blob.rgb * blob.a;
        trailW     += blob.a;
      }

      /* ── Smoke principal: solo aparece si hay movimiento (u_fade) ── */
      float mainRadius = 0.22 + u_speed * 0.18;
      vec4  mainBlob   = smokeBlob(uv, u_mouse * aspect, u_hue,
                                   mainRadius, warp, n1, n2, u_fade);

      vec3  tColor = trailW > 0.0 ? trailColor / trailW : vec3(0.0);
      float tAlpha = clamp(trailAlpha * 0.85, 0.0, 0.92);

      float outA = mainBlob.a + tAlpha * (1.0 - mainBlob.a);
      vec3  outC = outA > 0.0
        ? (mainBlob.rgb * mainBlob.a + tColor * tAlpha * (1.0 - mainBlob.a)) / outA
        : vec3(0.0);

      if (outA < 0.005) discard;

      gl_FragColor = vec4(outC, outA);
    }
  `;

    function compile(type, src) {
        const sh = gl.createShader(type);
        gl.shaderSource(sh, src);
        gl.compileShader(sh);
        if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
            console.error('Smoke shader error:', gl.getShaderInfoLog(sh));
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

    const aPos    = gl.getAttribLocation(prog,  'a_pos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uTime   = gl.getUniformLocation(prog, 'u_time');
    const uRes    = gl.getUniformLocation(prog, 'u_resolution');
    const uMouse  = gl.getUniformLocation(prog, 'u_mouse');
    const uSpeed  = gl.getUniformLocation(prog, 'u_speed');
    const uHue    = gl.getUniformLocation(prog, 'u_hue');
    const uFade   = gl.getUniformLocation(prog, 'u_fade');
    const uCount  = gl.getUniformLocation(prog, 'u_count');
    const uPoints = gl.getUniformLocation(prog, 'u_points[0]');
    const uHues   = gl.getUniformLocation(prog, 'u_hues[0]');
    const uAges   = gl.getUniformLocation(prog, 'u_ages[0]');

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    /* ── Historial con timestamps para expirar puntos viejos ─────────────── */
    const MAX_PTS      = 60;
    const SAMPLE_MS    = 16;
    const POINT_LIFE   = 1200; // ms que vive un punto antes de desvanecerse
    const IDLE_TIMEOUT = 80;   // ms sin mover para considerar "idle"

    let lastSample  = 0;
    let lastMoveTs  = 0;   // timestamp del último mousemove real
    let fade        = 0;   // 0..1 — se anima suavemente en JS

    const history = []; // [{ nx, ny, hue, ts }]

    const flatPoints = new Float32Array(MAX_PTS * 2);
    const flatHues   = new Float32Array(MAX_PTS);
    const flatAges   = new Float32Array(MAX_PTS);

    /* Detectar movimiento real del mouse */
    window.addEventListener('mousemove', () => {
        lastMoveTs = performance.now();
    });

    function render(ts) {
        const now = performance.now();

        /* ── ¿Hay movimiento? ── */
        const isMoving = (now - lastMoveTs) < IDLE_TIMEOUT;

        /* Fade suave: sube rápido al mover, baja lento al parar */
        const fadeTarget = isMoving ? 1.0 : 0.0;
        const fadeSpeed  = isMoving ? 0.18 : 0.04; // sube rápido, baja despacio
        fade += (fadeTarget - fade) * fadeSpeed;

        /* ── Muestrear posición solo si hay movimiento ── */
        if (isMoving && ts - lastSample > SAMPLE_MS) {
            history.push({ nx: mouse.nx, ny: mouse.ny, hue: mouse.hue, ts: now });
            if (history.length > MAX_PTS) history.shift();
            lastSample = ts;
        }

        /* ── Eliminar puntos expirados (más viejos que POINT_LIFE) ── */
        const cutoff = now - POINT_LIFE;
        while (history.length > 0 && history[0].ts < cutoff) {
            history.shift();
        }

        /* ── Calcular age de cada punto (1=nuevo, 0=por expirar) ── */
        history.forEach((pt, i) => {
            const age = Math.max(0, (pt.ts - cutoff) / POINT_LIFE);
            flatPoints[i * 2]     = pt.nx;
            flatPoints[i * 2 + 1] = pt.ny;
            flatHues[i]           = pt.hue;
            flatAges[i]           = age;
        });

        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        /* Si fade es casi 0 y no hay historial, no dibujar nada */
        if (fade < 0.005 && history.length === 0) {
            requestAnimationFrame(render);
            return;
        }

        gl.uniform1f(uTime,  ts * 0.001);
        gl.uniform2f(uRes,   canvas.width, canvas.height);
        gl.uniform2f(uMouse, mouse.nx, mouse.ny);
        gl.uniform1f(uSpeed, Math.min(mouse.speed, 1.0));
        gl.uniform1f(uHue,   mouse.hue);
        gl.uniform1f(uFade,  fade);
        gl.uniform1i(uCount, history.length);
        gl.uniform2fv(uPoints, flatPoints);
        gl.uniform1fv(uHues,   flatHues);
        gl.uniform1fv(uAges,   flatAges);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
        requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
}