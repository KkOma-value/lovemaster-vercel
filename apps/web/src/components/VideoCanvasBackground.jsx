import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';

/**
 * Fragment shader: cover-fit + light warm overlay.
 * Preserves original video quality — no color grading, no noise.
 */
const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const fragmentShader = `
  precision highp float;

  uniform sampler2D uVideo;
  uniform vec2 uResolution;
  uniform vec2 uVideoSize;
  uniform float uOpacity;

  varying vec2 vUv;

  void main() {
    // ── Cover-fit UV mapping ──
    float screenAspect = uResolution.x / uResolution.y;
    float videoAspect  = uVideoSize.x  / uVideoSize.y;

    vec2 coverUv = vUv;
    if (screenAspect > videoAspect) {
      float scale = screenAspect / videoAspect;
      coverUv.y = (coverUv.y - 0.5) / scale + 0.5;
    } else {
      float scale = videoAspect / screenAspect;
      coverUv.x = (coverUv.x - 0.5) / scale + 0.5;
    }

    vec4 texColor = texture2D(uVideo, coverUv);

    // ── Light warm overlay for readability (matching original design) ──
    float t = vUv.y;
    vec3 overlayTop    = vec3(1.0, 0.98, 0.96);
    vec3 overlayBottom = vec3(1.0, 0.957, 0.925);
    float alphaTop     = 0.18;
    float alphaBottom  = 0.34;
    vec3 overlayColor  = mix(overlayBottom, overlayTop, t);
    float overlayAlpha = mix(alphaBottom, alphaTop, t);
    texColor.rgb = mix(texColor.rgb, overlayColor, overlayAlpha);

    texColor.a = uOpacity;
    gl_FragColor = texColor;
  }
`;

const HOME_VIDEO_BREAKPOINT = 768;

// WebM first (VP9, much smaller + better Chrome perf), MP4 as fallback
const VIDEO_SOURCES = [
    { src: '/bg-video-pingpong.webm', type: 'video/webm' },
    { src: '/bg-video-pingpong.mp4',  type: 'video/mp4' },
];

function shouldEnable() {
    if (typeof window === 'undefined') return false;
    const wide = window.innerWidth > HOME_VIDEO_BREAKPOINT;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const saveData = navigator.connection?.saveData === true;
    return wide && !reducedMotion && !saveData;
}

export default function VideoCanvasBackground() {
    const containerRef = useRef(null);
    const stateRef = useRef({
        renderer: null,
        scene: null,
        camera: null,
        material: null,
        video: null,
        videoTexture: null,
        animationId: null,
        active: false,
        clock: new THREE.Clock(),
    });

    const cleanup = useCallback(() => {
        const s = stateRef.current;
        if (s.animationId) {
            cancelAnimationFrame(s.animationId);
            s.animationId = null;
        }
        if (s.video) {
            s.video.pause();
            s.video.removeAttribute('src');
            s.video.load();
        }
        if (s.videoTexture) s.videoTexture.dispose();
        if (s.material) s.material.dispose();
        if (s.renderer) {
            s.renderer.dispose();
            s.renderer.forceContextLoss();
            if (s.renderer.domElement?.parentNode) {
                s.renderer.domElement.parentNode.removeChild(s.renderer.domElement);
            }
        }
        s.active = false;
    }, []);

    useEffect(() => {
        if (!shouldEnable()) return undefined;

        const container = containerRef.current;
        if (!container) return undefined;

        const s = stateRef.current;

        // ── Video element (hidden, used as texture source) ──
        // Uses <source> elements for format negotiation: browser picks
        // the first format it supports (WebM VP9 > MP4 H.264)
        const video = document.createElement('video');
        video.crossOrigin = 'anonymous';
        video.loop = true;
        video.muted = true;
        video.playsInline = true;
        video.preload = 'auto';
        for (const { src, type } of VIDEO_SOURCES) {
            const source = document.createElement('source');
            source.src = src;
            source.type = type;
            video.appendChild(source);
        }
        s.video = video;

        // ── Three.js setup ──
        const renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: false,
            powerPreference: 'low-power',
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.domElement.style.cssText =
            'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:-2;pointer-events:none;';
        container.appendChild(renderer.domElement);
        s.renderer = renderer;

        const scene = new THREE.Scene();
        const camera = new THREE.Camera(); // NDC full-screen quad, no projection needed
        s.scene = scene;
        s.camera = camera;

        // ── Video texture ──
        const videoTexture = new THREE.VideoTexture(video);
        videoTexture.minFilter = THREE.LinearFilter;
        videoTexture.magFilter = THREE.LinearFilter;
        videoTexture.format = THREE.RGBAFormat;
        videoTexture.colorSpace = THREE.SRGBColorSpace;
        s.videoTexture = videoTexture;

        // ── Shader material ──
        const material = new THREE.ShaderMaterial({
            uniforms: {
                uVideo: { value: videoTexture },
                uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
                uVideoSize: { value: new THREE.Vector2(1, 1) }, // updated after metadata loads
                uOpacity: { value: 0 },
            },
            vertexShader,
            fragmentShader,
            transparent: true,
            depthTest: false,
        });
        s.material = material;

        // Full-screen triangle (more efficient than quad)
        const geometry = new THREE.PlaneGeometry(2, 2);
        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);

        // ── Resize handler ──
        const onResize = () => {
            const w = window.innerWidth;
            const h = window.innerHeight;
            renderer.setSize(w, h);
            material.uniforms.uResolution.value.set(w, h);
        };
        window.addEventListener('resize', onResize);

        // ── Animation loop ──
        let fadeStart = null;
        const FADE_DURATION = 0.32; // seconds, matches original CSS transition

        const animate = () => {
            s.animationId = requestAnimationFrame(animate);

            const elapsed = s.clock.getElapsedTime();

            // Fade-in after video starts playing
            if (fadeStart !== null) {
                const progress = Math.min((elapsed - fadeStart) / FADE_DURATION, 1);
                material.uniforms.uOpacity.value = progress;
            }

            // Only update texture when video is actually playing
            if (!video.paused && !video.ended && video.readyState >= 2) {
                videoTexture.needsUpdate = true;
            }

            renderer.render(scene, camera);
        };

        s.active = true;
        animate();

        // ── Video events ──
        const onMetadata = () => {
            material.uniforms.uVideoSize.value.set(video.videoWidth, video.videoHeight);
        };
        video.addEventListener('loadedmetadata', onMetadata);

        const onCanPlay = () => {
            video.play().then(() => {
                fadeStart = s.clock.getElapsedTime();
            }).catch(() => {});
        };
        video.addEventListener('canplay', onCanPlay, { once: true });

        // ── Visibility handling ──
        const onVisibility = () => {
            if (document.visibilityState === 'hidden') {
                video.pause();
            } else if (s.active) {
                video.play().catch(() => {});
            }
        };
        document.addEventListener('visibilitychange', onVisibility);

        // ── Responsive: disable if window shrinks below breakpoint ──
        const onBreakpoint = () => {
            if (!shouldEnable() && s.active) {
                cleanup();
            }
        };
        window.addEventListener('resize', onBreakpoint);

        return () => {
            window.removeEventListener('resize', onResize);
            window.removeEventListener('resize', onBreakpoint);
            document.removeEventListener('visibilitychange', onVisibility);
            video.removeEventListener('loadedmetadata', onMetadata);
            cleanup();
        };
    }, [cleanup]);

    return <div ref={containerRef} aria-hidden="true" />;
}
