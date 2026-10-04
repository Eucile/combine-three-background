import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

import { createNoise2D } from 'https://cdn.jsdelivr.net/npm/simplex-noise@4.0.3/+esm';


// ============================================================
// COMBINE WEBGL PROJECT
// ============================================================



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

const geometry = new THREE.PlaneGeometry(
    30,
    30,
    500,
    500
);

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

    uniforms: {

        uTime: {
            value: 0
        }

    },


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

        uniform float uTime;


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
            // SMOOTH CONTOUR ELEVATION
            //
            // The contour field is calculated directly from
            // the fragment position rather than interpolated
            // mesh elevation. This keeps the contours smooth.
            // ==================================================

            float angle = 0.45;


            float rotatedX =
                vPosition.x * cos(angle) -
                vPosition.y * sin(angle);


            float rotatedY =
                vPosition.x * sin(angle) +
                vPosition.y * cos(angle);



            // --------------------------------------------------
            // Large-scale domain warp
            // --------------------------------------------------

            float warpX =
                (
                    noise(
                        vPosition * 0.18
                    ) * 2.0 - 1.0
                ) * 0.25;


            float warpY =
                (
                    noise(
                        vPosition * 0.18 +
                        vec2(100.0)
                    ) * 2.0 - 1.0
                ) * 0.25;



            // --------------------------------------------------
            // Large geological forms
            // --------------------------------------------------

            float smoothLarge =
                (
                    noise(
                        vec2(
                            rotatedX * 0.12 +
                            warpX +
                            uTime * 0.008,

                            rotatedY * 0.12 +
                            warpY +
                            uTime * 0.006
                        )
                    ) * 2.0 - 1.0
                ) * 0.75;



            // --------------------------------------------------
            // Medium detail
            // --------------------------------------------------

            float smoothMedium =
                (
                    noise(
                        vPosition * 0.45
                    ) * 2.0 - 1.0
                ) * 0.12;



            // --------------------------------------------------
            // Fine detail
            // --------------------------------------------------

            float smoothFine =
                (
                    noise(
                        vPosition * 2.0
                    ) * 2.0 - 1.0
                ) * 0.04;



            // --------------------------------------------------
            // Combined smooth elevation
            // --------------------------------------------------

            float contourElevation =
                smoothLarge +
                smoothMedium +
                smoothFine;



            // ==================================================
            // MINOR CONTOURS
            // ==================================================

            float minorLevel =
                contourElevation * 28.0;



            // --------------------------------------------------
            // Continuous contour phase
            // --------------------------------------------------

            float minorPhase =
                minorLevel *
                3.14159265;



            // --------------------------------------------------
            // Distance from nearest contour center
            // --------------------------------------------------

            float minorSignal =
                abs(
                    sin(
                        minorPhase
                    )
                );



            // --------------------------------------------------
            // Screen-space anti-aliasing
            // --------------------------------------------------

            float minorWidth =
                fwidth(
                    minorPhase
                );


            minorWidth =
                max(
                    minorWidth,
                    0.006
                );



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
                contourElevation * 5.0;


            float majorDistance =
                abs(
                    fract(
                        majorLevel
                    ) -
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
                    0.025,
                    majorDistance
                );



            // ==================================================
            // BROAD FEATHER TEXTURE
            // ==================================================

            float featherTexture =
                noise(
                    vPosition * 12.0
                );


           majorFeather *= 0.75;



            // ==================================================
            // PARTICULATE GRAIN
            // ==================================================

            float fineGrain =
                hash(
                    floor(
                        vPosition * 180.0
                    )
                );


            float grainMask =
                step(
                    0.55,
                    fineGrain
                );


            float grain =
                grainMask *
                majorFeather *
                0.25;



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

            float minorIntensity =
                minorLine * 0.24;


            float majorIntensity =
                majorLine * 0.13;



            // ==================================================
            // COMBINE CONTOURS
            // ==================================================

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

            vec3 baseColor =
                vec3(0.30) *
                relief;


            vec3 minorColor =
                vec3(0.35) *
                minorIntensity;


            vec3 majorColor =
                vec3(0.84, 0.89, 0.24) *
                majorIntensity;


            vec3 color =
                baseColor +
                minorColor +
                majorColor;



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

    requestAnimationFrame(
        animate
    );


    const time =
        performance.now() * 0.001;



    // ========================================================
    // UPDATE SHADER TIME
    // ========================================================

    material.uniforms.uTime.value =
        time;



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



        // ----------------------------------------------------
        // Subtle domain warp
        // ----------------------------------------------------

        const warpX =
            noise(
                x * 0.18,
                y * 0.18
            ) * 0.25;


        const warpY =
            noise(
                x * 0.18 + 100,
                y * 0.18 + 100
            ) * 0.25;



        const largeTerrain =
            noise(
                rotatedX * 0.12 +
                warpX +
                time * 0.008,

                rotatedY * 0.12 +
                warpY +
                time * 0.006
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