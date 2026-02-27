import { mouse } from './mouse.js';

export function initTrail() {

    // ── Canvas WebGL propio (debajo del smoke) ─────────────────────────────
    const canvas = document.createElement('canvas');
    canvas.id = 'trail-canvas';
    canvas.style.cssText = `
    position: fixed;
    top: 0; left: 0;
    width: 100vw; height: 100vh;
    pointer-events: none;
    z-index: 48;
  `;
    document.body.appendChild(canvas);

    function resize() {
        canvas.width  = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false })
        || canvas.getContext('experimental-webgl', { alpha: true, premultipliedAlpha: false });

    if (!gl) { console.warn('Trail WebGL no disponible.'); return; }

    const vsSource = `
    attribute vec2 a_pos;
    varying   vec2 v_uv;
    void main() {
      v_uv = a_pos * 0.5 + 0.5;
      gl_Position = vec4(a_pos, 0.0, 1.0);
    }
  `;

    const fsSource = `
    precision mediump float; // Cambiado a mediump para mejor rendimiento

    varying vec2  v_uv;
    uniform float u_time;
    uniform vec2  u_resolution;
    uniform int   u_count;
    uniform vec2  u_points[60];
    uniform float u_hues[60];
    uniform float u_speed;

    // Ruido más ligero
    float hash(vec2 p) {
        return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }

    float noise(vec2 p) {
        vec2 i = floor(p); vec2 f = fract(p);
        f = f*f*(3.0-2.0*f);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        return mix(a, b, f.x) + (c - a)*f.y*(1.0 - f.x) + (d - b)*f.x*f.y;
    }

    float fbm(vec2 p) {
        float v = 0.0; float a = 0.5;
        for (int i = 0; i < 3; i++) { // Bajamos de 5 a 3 octavas
            v += a * noise(p); p *= 2.0; a *= 0.5;
        }
        return v;
    }

    vec3 hue2rgb(float h) {
        vec3 rgb = clamp(abs(mod(h*6.0+vec3(0,4,2),6.0)-3.0)-1.0, 0.0, 1.0);
        return rgb;
    }

    void main() {
        vec2 aspect = vec2(u_resolution.x/u_resolution.y, 1.0);
        vec2 uv = v_uv * aspect;
        
        // CALCULAMOS EL RUIDO UNA SOLA VEZ AQUÍ (Optimización clave)
        float t = u_time * 0.2;
        float n = fbm(uv * 2.0 + t);
        
        float intensity = 0.0;
        vec3 accumulatedColor = vec3(0.0);

        // Bucle optimizado: solo cálculos de distancia y mezcla
        for (int i = 0; i < 60; i++) {
            if (i >= u_count) break;

            float progress = float(i) / 60.0;
            vec2 mpos = u_points[i] * aspect;
            
            // Distorsión del radio con el ruido calculado arriba
            float dist = distance(uv, mpos);
            float radius = (0.04 + progress * 0.08 + u_speed * 0.05) * (0.6 + n);

            float blob = smoothstep(radius, 0.0, dist);
            float pAlpha = blob * pow(progress, 1.5);

            intensity += pAlpha;
            accumulatedColor += hue2rgb(u_hues[i]/360.0) * pAlpha;
        }

        if (intensity < 0.01) discard; // No procesar píxeles vacíos

        vec3 finalColor = accumulatedColor / max(intensity, 0.001);
        // El ruido FBM final le da el aspecto de "humo" a la máscara total
        float finalAlpha = clamp(intensity * (0.5 + n), 0.0, 0.9);

        gl_FragColor = vec4(finalColor, finalAlpha);
    }
  `;

    function compile(type, src) {
        const sh = gl.createShader(type);
        gl.shaderSource(sh, src);
        gl.compileShader(sh);
        if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
            console.error('Trail shader error:', gl.getShaderInfoLog(sh));
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

    const uTime   = gl.getUniformLocation(prog, 'u_time');
    const uRes    = gl.getUniformLocation(prog, 'u_resolution');
    const uCount  = gl.getUniformLocation(prog, 'u_count');
    const uSpeed  = gl.getUniformLocation(prog, 'u_speed');
    const uPoints = gl.getUniformLocation(prog, 'u_points[0]');
    const uHues   = gl.getUniformLocation(prog, 'u_hues[0]');

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const MAX_PTS   = 60;
    const SAMPLE_MS = 16;
    let   lastTime  = 0;
    const history   = [];

    const flatPoints = new Float32Array(MAX_PTS * 2);
    const flatHues   = new Float32Array(MAX_PTS);

    function render(ts) {
        if (ts - lastTime > SAMPLE_MS) {
            history.push({ nx: mouse.nx, ny: mouse.ny, hue: mouse.hue });
            if (history.length > MAX_PTS) history.shift();
            lastTime = ts;
        }

        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        if (history.length > 1) {
            history.forEach((pt, i) => {
                flatPoints[i * 2]     = pt.nx;
                flatPoints[i * 2 + 1] = pt.ny;
                flatHues[i]           = pt.hue;
            });

            gl.uniform1f(uTime,  ts * 0.001);
            gl.uniform2f(uRes,   canvas.width, canvas.height);
            gl.uniform1i(uCount, history.length);
            gl.uniform1f(uSpeed, Math.min(mouse.speed, 1.0));
            gl.uniform2fv(uPoints, flatPoints);
            gl.uniform1fv(uHues,   flatHues);

            gl.drawArrays(gl.TRIANGLES, 0, 6);
        }

        requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
}