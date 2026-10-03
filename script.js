import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
import { createNoise2D } from 'https://cdn.jsdelivr.net/npm/simplex-noise@4.0.3/+esm';

// Combine WebGL project

// ============================================================
// SCENE
// ============================================================

const scene = new THREE.Scene();


// ============================================================
// CAMERA
// ============================================================

const camera = new THREE.PerspectiveCamera(
    55,
    window.innerWidth / window.innerHeight,
    0.1,
    100
);

camera.position.set(0, 0, 8);
camera.lookAt(0, 0, 0);


// ============================================================
// RENDERER
// ============================================================

const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false
});

renderer.setPixelRatio(
    Math.min(window.devicePixelRatio, 1.5)
);

renderer.setSize(
    window.innerWidth,
    window.innerHeight
);

renderer.setClearColor(0x111111, 1);

document.body.appendChild(renderer.domElement);


// ============================================================
// TERRAIN GEOMETRY
// ============================================================

const geometry = new THREE.PlaneGeometry(30, 30, 360, 360);

const positions = geometry.attributes.position;


// ============================================================
// TERRAIN NOISE
// ============================================================

const noise2D = createNoise2D();

function noise(x, y) {
    return noise2D(x, y);
}


// ============================================================
// TERRAIN MATERIAL
// ============================================================

const material = new THREE.ShaderMaterial({

    // ========================================================
    // VERTEX SHADER
    // ========================================================

    vertexShader: `

        varying float elevation;
        varying vec3 vNormal;
        varying vec2 vPosition;

        void main() {

            // Terrain height
            elevation = position.z;

            // Terrain XY position
            vPosition = position.xy;

            // Smooth terrain normal
            vNormal =
                normalize(
                    normalMatrix * normal
                );

            gl_Position =
                projectionMatrix *
                modelViewMatrix *
                vec4(position, 1.0);
        }

    `,


    // ========================================================
    // FRAGMENT SHADER
    // ========================================================

    fragmentShader: `

        varying float elevation;
        varying vec3 vNormal;
        varying vec2 vPosition;


        // ====================================================
        // PROCEDURAL HASH
        // ====================================================

        float hash(vec2 p) {

            p = fract(
                p *
                vec2(
                    123.34,
                    456.21
                )
            );

            p += dot(
                p,
                p + 45.32
            );

            return fract(
                p.x * p.y
            );
        }


        // ====================================================
        // SMOOTH PROCEDURAL NOISE
        // ====================================================

        float noise(vec2 p) {

            vec2 i = floor(p);
            vec2 f = fract(p);

            f =
                f * f *
                (
                    3.0 -
                    2.0 * f
                );

            float a = hash(i);

            float b =
                hash(
                    i +
                    vec2(1.0, 0.0)
                );

            float c =
                hash(
                    i +
                    vec2(0.0, 1.0)
                );

            float d =
                hash(
                    i +
                    vec2(1.0, 1.0)
                );

            return mix(
                mix(a, b, f.x),
                mix(c, d, f.x),
                f.y
            );
        }


        void main() {

            // ==================================================
            // DIRECTIONAL TERRAIN RELIEF
            // ==================================================

            vec3 lightDirection =
                normalize(
                    vec3(
                        -1.0,
                        0.5,
                        0.08
                    )
                );

            float diffuse =
                max(
                    dot(
                        vNormal,
                        lightDirection
                    ),
                    0.0
                );

            float relief =
                smoothstep(
                    0.35,
                    0.85,
                    diffuse
                ) * 0.06;


            // ==================================================
            // MINOR CONTOURS
            // ==================================================

            float minorLevel =
                elevation * 28.0;

            // ==================================================
// MINOR CONTOUR — ANTI-ALIASED
// ==================================================

// ==================================================
// MINOR CONTOUR — CONTINUOUS ANTI-ALIASED
// ==================================================

// Convert the contour level into a continuous
// repeating wave.

// ==================================================
// MINOR CONTOUR — SCREEN-SPACE ANTI-ALIASED
// ==================================================

// Continuous contour phase.
float minorPhase =
    minorLevel *
    3.14159265;


// Distance from the nearest contour center.
float minorSignal =
    abs(
        sin(
            minorPhase
        )
    );


// IMPORTANT:
// Calculate the pixel footprint from the original
// continuous phase, not from the compressed signal.
//
// This gives us a stable estimate of how much the
// contour moves across a screen pixel.

float minorWidth =
    fwidth(
        minorPhase
    );


// Give the contour a small minimum width so that
// extremely shallow regions don't disappear.

minorWidth =
    max(
        minorWidth,
        0.006
    );


// Anti-aliased contour.

float minorLine =
    1.0 -
    smoothstep(
        0.0,
        minorWidth * 1.0,
        minorSignal
    );


            // ==================================================
            // MAJOR CONTOURS
            // ==================================================

            float majorLevel =
                elevation * 8.0;

            float majorDistance =
                abs(
                    fract(majorLevel) -
                    0.5
                );


            // --------------------------------------------------
            // Crisp major contour core
            // --------------------------------------------------

            float majorCore =
                1.0 -
                smoothstep(
                    0.0,
                    0.018,
                    majorDistance
                );


            // --------------------------------------------------
            // Soft major contour feather
            // --------------------------------------------------

            float majorFeather =
                1.0 -
                smoothstep(
                    0.012,
                    0.075,
                    majorDistance
                );


            // ==================================================
            // BROAD FEATHER TEXTURE
            // ==================================================

            float featherTexture =
                noise(
                    vPosition * 12.0
                );

            majorFeather *=
                mix(
                    0.35,
                    1.0,
                    featherTexture
                );


            // ==================================================
            // PARTICULATE GRAIN
            // ==================================================
            //
            // This is the experiment we're currently testing.
            //
            // Unlike the previous smooth noise, this creates
            // individual random cells.
            //
            // The grain is deliberately exaggerated so we can
            // actually see what it looks like.
            //

            float fineGrain =
                hash(
                    floor(
                        vPosition * 180.0
                    )
                );


            // Only the brighter random grains are selected.

            float grainMask =
                step(
                    0.72,
                    fineGrain
                );


            // Restrict grain to the feather.

            float grain =
                grainMask *
                majorFeather *
                0.35;


            // ==================================================
            // MAJOR CONTOUR
            // ==================================================

            float majorLine =
                majorCore +
                majorFeather +
                grain;


            // ==================================================
            // CONTOUR BALANCE
            // ==================================================

            // Fine contours become more visible.

            float minorIntensity =
                minorLine * 0.24;


            // Major contours become more restrained.

            float majorIntensity =
                majorLine * 0.13;


            // Combine the two contour systems.

            float line =
                minorIntensity +
                majorIntensity;

            // ==================================================
            // FINAL INTENSITY
            // ==================================================

            float intensity =
                relief +
                line;


            // ==================================================
            // FINAL COLOR
            // ==================================================

            vec3 color =
                vec3(0.30) *
                intensity;


            gl_FragColor =
                vec4(
                    color,
                    1.0
                );
        }

    `,

    side: THREE.DoubleSide
});


// ============================================================
// TERRAIN MESH
// ============================================================

const terrain =
    new THREE.Mesh(
        geometry,
        material
    );

scene.add(terrain);


// ============================================================
// CURSOR
// ============================================================

let targetPointerX = 0;
let targetPointerY = 0;

let pointerX = 0;
let pointerY = 0;


window.addEventListener(
    "pointermove",
    (event) => {

        targetPointerX =
            (event.clientX /
            window.innerWidth) *
            12 -
            6;

        targetPointerY =
            -(event.clientY /
            window.innerHeight) *
            12 +
            6;
    }
);


// ============================================================
// ANIMATION
// ============================================================

function animate() {

    requestAnimationFrame(animate);

    const time =
        performance.now() * 0.001;


    // ========================================================
    // SMOOTH CURSOR
    // ========================================================

    pointerX +=
        (targetPointerX - pointerX) *
        0.06;

    pointerY +=
        (targetPointerY - pointerY) *
        0.06;


    // ========================================================
    // TERRAIN DEFORMATION
    // ========================================================

    for (
        let i = 0;
        i < positions.count;
        i++
    ) {

        const x =
            positions.getX(i);

        const y =
            positions.getY(i);


        // ----------------------------------------------------
        // Large geological forms
        // ----------------------------------------------------

        const angle =
            0.45;

        const rotatedX =
            x * Math.cos(angle) -
            y * Math.sin(angle);

        const rotatedY =
            x * Math.sin(angle) +
            y * Math.cos(angle);


        // Subtle domain warp to make the terrain less wave-like
const warpX = noise(x * 0.18, y * 0.18) * 0.25;
const warpY = noise(x * 0.18 + 100, y * 0.18 + 100) * 0.25;

const largeTerrain =
    noise(
        rotatedX * 0.12 + warpX + time * 0.008,
        rotatedY * 0.12 + warpY + time * 0.006
    ) * 0.75;


        // ----------------------------------------------------
        // Medium detail
        // ----------------------------------------------------

        const mediumTerrain =
            noise(
                x * 0.45,
                y * 0.45
            ) * 0.12;


        // ----------------------------------------------------
        // Fine detail
        // ----------------------------------------------------

        const fineTerrain =
            noise(
                x * 2.0,
                y * 2.0
            ) * 0.04;


        // ----------------------------------------------------
        // Combined terrain
        // ----------------------------------------------------

        const terrainHeight =
            largeTerrain +
            mediumTerrain +
            fineTerrain;


        // ====================================================
        // CURSOR
        // ====================================================

        const dx =
            x - pointerX;

        const dy =
            y - pointerY;

        const cursorDistance =
            Math.sqrt(
                dx * dx +
                dy * dy
            );


        const cursorInfluence =
            Math.exp(
                -cursorDistance *
                cursorDistance *
                0.45
            );


        const cursorWave =
            cursorInfluence * 0.06;


        // ====================================================
        // FINAL ELEVATION
        // ====================================================

        const z =
            terrainHeight * 0.30 +
            cursorWave;

        positions.setZ(
            i,
            z
        );
    }


    // ========================================================
    // UPDATE NORMALS
    // ========================================================

    positions.needsUpdate = true;

    geometry.computeVertexNormals();


    // ========================================================
    // RENDER
    // ========================================================

    renderer.render(
        scene,
        camera
    );
}


// ============================================================
// RESIZE
// ============================================================

window.addEventListener(
    "resize",
    () => {

        camera.aspect =
            window.innerWidth /
            window.innerHeight;

        camera.updateProjectionMatrix();

        renderer.setSize(
            window.innerWidth,
            window.innerHeight
        );

        renderer.setPixelRatio(
            Math.min(
                window.devicePixelRatio,
                1.5
            )
        );
    }
);


// ============================================================
// START
// ============================================================

animate();