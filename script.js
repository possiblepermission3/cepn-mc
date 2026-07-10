/**
 * Estado de la simulación
 */
const state = {
    m: 1,           // Masa (kg)
    hMax: 2,        // Altura inicial (m)
    g: 9.81,        // Gravedad (m/s^2)
    L: 5,           // Longitud del hilo (m)
    time: 0,        // Tiempo transcurrido (s)
    isRunning: false,
    oscillations: 0,
    hasCrossedZero: false,
    
    // Variables dinámicas calculadas en cada frame
    currentTheta: 0,
    currentH: 0,
    v: 0,
    Ep: 0,
    Ec: 0,
    Em: 0
};

// Referencias al DOM
const canvas = document.getElementById('simulationCanvas');
const ctx = canvas.getContext('2d');

// Elementos de UI
const ui = {
    epLeft: document.getElementById('rt-ep'),
    ecLeft: document.getElementById('rt-ec'),
    emLeft: document.getElementById('rt-em'),
    valMass: document.getElementById('val-mass'),
    valG: document.getElementById('val-g'),
    valH: document.getElementById('val-h'),
    valV: document.getElementById('val-v'),
    valAngle: document.getElementById('val-angle'),
    barEp: document.getElementById('bar-ep'),
    barEc: document.getElementById('bar-ec'),
    indEp: document.getElementById('ind-max-ep'),
    indEc: document.getElementById('ind-max-ec'),
    displayTime: document.getElementById('display-time'),
    displayOsc: document.getElementById('display-osc')
};

let lastTimestamp = 0;
let animationFrameId;

/**
 * Lógica Física Central
 */
function updatePhysics(dt) {
    if (state.isRunning) {
        state.time += dt;
    }

    // 1. Validaciones previas para evitar inconsistencias matemáticas
    // La altura máxima no puede ser mayor al doble de la longitud de la cuerda
    if (state.hMax > state.L * 2) state.hMax = state.L * 2; 

    // 2. Parámetros del péndulo
    const omega = Math.sqrt(state.g / state.L); // Velocidad angular
    
    // theta_max calculada a partir de la altura (Geometría: h = L - L*cos(theta))
    const cosThetaMax = 1 - (state.hMax / state.L);
    const thetaMax = Math.acos(cosThetaMax);

    // 3. Ecuación de movimiento armónico simple (apropiada para esta simulación)
    state.currentTheta = thetaMax * Math.cos(omega * state.time);

    // 4. Conteo de oscilaciones
    if (state.currentTheta < 0 && !state.hasCrossedZero) {
        state.hasCrossedZero = true;
    } else if (state.currentTheta > 0 && state.hasCrossedZero) {
        state.hasCrossedZero = false;
        state.oscillations++;
    }

    // 5. Cálculos energéticos
    state.currentH = state.L * (1 - Math.cos(state.currentTheta));
    
    state.Em = state.m * state.g * state.hMax;
    state.Ep = state.m * state.g * state.currentH;
    state.Ec = state.Em - state.Ep;

    // Prevención de precisión de coma flotante que pueda dar valores negativos
    if (state.Ec < 0) state.Ec = 0;
    
    // Velocidad calculada por conservación de energía: v = sqrt(2*Ec/m)
    state.v = Math.sqrt((2 * state.Ec) / state.m);
}

/**
 * Motor de Renderizado en Canvas
 */
function drawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const pivotY = 30;
    const centerX = canvas.width / 2;
    const numBalls = 5;
    const radius = 20;
    const diameter = radius * 2;
    
    // Escala: Si L=5m, dibujamos a un tamaño razonable en píxeles. 
    // Usamos 300px como L máximo de referencia visual.
    const pixelsPerMeter = 300 / 10; // Max L = 10m
    const L_px = state.L * pixelsPerMeter;

    // Soporte superior
    ctx.fillStyle = '#30363d';
    ctx.fillRect(centerX - 120, pivotY - 10, 240, 20);

    for (let i = 0; i < numBalls; i++) {
        // Posiciones x base de los pivotes
        let pivotX = centerX + (i - 2) * diameter;
        let angle = 0;

        // Lógica de transferencia instantánea del Péndulo de Newton
        // Si el ángulo es positivo, se mueve la esfera derecha. Si es negativo, la izquierda.
        if (state.currentTheta < 0 && i === 0) {
            angle = state.currentTheta;
        } else if (state.currentTheta > 0 && i === numBalls - 1) {
            angle = state.currentTheta;
        }

        // Cinemática de la posición de la esfera
        let ballX = pivotX + L_px * Math.sin(angle);
        let ballY = pivotY + L_px * Math.cos(angle);

        // Dibujar hilo
        ctx.beginPath();
        ctx.moveTo(pivotX, pivotY);
        ctx.lineTo(ballX, ballY);
        ctx.strokeStyle = '#8b949e';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Dibujar esfera (Gradiente metálico)
        const gradient = ctx.createRadialGradient(
            ballX - radius/3, ballY - radius/3, radius/10, 
            ballX, ballY, radius
        );
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.3, '#8b949e');
        gradient.addColorStop(1, '#161b22');

        ctx.beginPath();
        ctx.arc(ballX, ballY, radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.strokeStyle = '#0d1117';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
}

/**
 * Actualización del DOM (UI)
 */
function updateUI() {
    // Formatear valores
    ui.epLeft.textContent = `${state.Ep.toFixed(2)} J`;
    ui.ecLeft.textContent = `${state.Ec.toFixed(2)} J`;
    ui.emLeft.textContent = `${state.Em.toFixed(2)} J`;

    ui.valMass.textContent = `${state.m.toFixed(2)} kg`;
    ui.valG.textContent = `${state.g.toFixed(2)} m/s²`;
    ui.valH.textContent = `${state.currentH.toFixed(2)} m`;
    ui.valV.textContent = `${state.v.toFixed(2)} m/s`;
    
    const angleDeg = state.currentTheta * (180 / Math.PI);
    ui.valAngle.textContent = `${Math.abs(angleDeg).toFixed(1)}°`;

    // Barras de porcentaje
    let epPercent = state.Em > 0 ? (state.Ep / state.Em) * 100 : 0;
    let ecPercent = state.Em > 0 ? (state.Ec / state.Em) * 100 : 0;
    
    ui.barEp.style.width = `${epPercent}%`;
    ui.barEc.style.width = `${ecPercent}%`;

    // Indicadores Max Ep / Max Ec (Tolerancia del 2%)
    if (epPercent > 98) {
        ui.indEp.classList.add('active-ep');
    } else {
        ui.indEp.classList.remove('active-ep');
    }

    if (ecPercent > 98 && state.Em > 0) {
        ui.indEc.classList.add('active-ec');
    } else {
        ui.indEc.classList.remove('active-ec');
    }

    // Cronómetro
    const ms = Math.floor((state.time % 1) * 100);
    const s = Math.floor(state.time) % 60;
    const m = Math.floor(state.time / 60);
    ui.displayTime.textContent = 
        `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    ui.displayOsc.textContent = state.oscillations;
}

/**
 * Loop Principal
 */
function loop(timestamp) {
    if (!lastTimestamp) lastTimestamp = timestamp;
    const dt = (timestamp - lastTimestamp) / 1000; // Segundos
    lastTimestamp = timestamp;

    updatePhysics(dt);
    drawCanvas();
    updateUI();

    animationFrameId = requestAnimationFrame(loop);
}

/**
 * Event Listeners y Sincronización de Inputs
 */
function syncInput(idNum, idRange, stateKey) {
    const num = document.getElementById(idNum);
    const range = document.getElementById(idRange);

    const updateVal = (val) => {
        let parsed = parseFloat(val);
        num.value = parsed;
        range.value = parsed;
        state[stateKey] = parsed;
        
        // Si se cambia una variable crítica durante la simulación, reiniciamos el tiempo para mantener coherencia
        if(stateKey === 'hMax' || stateKey === 'L') {
            state.time = 0;
            state.oscillations = 0;
            state.hasCrossedZero = false;
        }
    };

    num.addEventListener('input', (e) => updateVal(e.target.value));
    range.addEventListener('input', (e) => updateVal(e.target.value));
}

// Vinculación de controles
syncInput('num-mass', 'range-mass', 'm');
syncInput('num-h0', 'range-h0', 'hMax');
syncInput('num-g', 'range-g', 'g');
syncInput('num-l', 'range-l', 'L');

// Botones de control
document.getElementById('btn-play').addEventListener('click', () => {
    state.isRunning = true;
});

document.getElementById('btn-pause').addEventListener('click', () => {
    state.isRunning = false;
});

document.getElementById('btn-reset').addEventListener('click', () => {
    state.isRunning = false;
    state.time = 0;
    state.oscillations = 0;
    state.hasCrossedZero = false;
    // Forzamos un update para reflejar el estado cero
    updatePhysics(0); 
    drawCanvas();
    updateUI();
});

// Iniciar primer frame
requestAnimationFrame(loop);