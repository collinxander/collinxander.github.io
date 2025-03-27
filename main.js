import * as THREE from "three"
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js"
import { RenderPass } from "three/addons/postprocessing/RenderPass.js"
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js"
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js"
import { RGBShiftShader } from "three/addons/shaders/RGBShiftShader.js"

// Scene variables
let composer,
  spaceship,
  starField,
  floatingCrystals = [],
  ring,
  thrusterParticles,
  burstParticles,
  energyWaves = [],
  visualizerBars = [],
  lightningEffects = [],
  skybox,
  wormhole,
  audioReactiveGeometry,
  particleSystem,
  laserBeams = [],
  nebulaClouds = [],
  asteroidField,
  galaxySpiral,
  soundWavePlane
let mouseX = 0,
  mouseY = 0
const clock = new THREE.Clock()

// Audio variables
let audioContext, audioAnalyser, audioSource
let audioData, bassData, midData, trebleData
let isPlaying = false
let visualizerCanvas, visualizerContext
let lastBeatTime = 0
const beatThreshold = 0.5
let beatDetected = false

// Renderer setup with optimized settings
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: "high-performance",
  alpha: true,
})
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setClearColor(0x000000, 0)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.2
document.body.appendChild(renderer.domElement)

// Scene setup
const scene = new THREE.Scene()
scene.fog = new THREE.FogExp2(0x000000, 0.002)

// Camera setup
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000)
camera.position.set(4, 5, 11)

// Orbit Controls
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.05
controls.enablePan = false
controls.minDistance = 5
controls.maxDistance = 20
controls.minPolarAngle = 0.5
controls.maxPolarAngle = 1.5
controls.autoRotate = false
controls.target = new THREE.Vector3(0, 1, 0)
controls.update()

// Audio setup
function setupAudio() {
  const audioElement = document.getElementById("audio-player")
  if (!audioElement) {
    console.error("Audio element not found")
    return
  }

  // Create audio context
  audioContext = new (window.AudioContext || window.webkitAudioContext)()

  // Create analyser
  audioAnalyser = audioContext.createAnalyser()
  audioAnalyser.fftSize = 2048
  audioAnalyser.smoothingTimeConstant = 0.85

  // Connect audio element to analyser
  audioSource = audioContext.createMediaElementSource(audioElement)
  audioSource.connect(audioAnalyser)
  audioAnalyser.connect(audioContext.destination)

  // Create data arrays
  const bufferLength = audioAnalyser.frequencyBinCount
  audioData = new Float32Array(bufferLength)

  // Create frequency band arrays (bass, mid, treble)
  const bandSize = Math.floor(bufferLength / 3)
  bassData = new Float32Array(bandSize)
  midData = new Float32Array(bandSize)
  trebleData = new Float32Array(bandSize)

  // Setup play button
  const playButton = document.getElementById("play-button")
  if (playButton) {
    playButton.style.display = "block"
    playButton.addEventListener("click", toggleAudio)
  }

  // Setup visualizer
  setupVisualizer()
}

function toggleAudio() {
  const audioElement = document.getElementById("audio-player")
  const playButton = document.getElementById("play-button")

  if (!audioElement || !playButton) return

  if (audioContext.state === "suspended") {
    audioContext.resume()
  }

  if (isPlaying) {
    audioElement.pause()
    playButton.textContent = "Play Music"
    isPlaying = false
  } else {
    audioElement.play()
    playButton.textContent = "Pause Music"
    isPlaying = true

    // Show heading when music starts
    const heading = document.getElementById("heading")
    if (heading) {
      heading.style.opacity = 0
      heading.style.transform = "translateY(-20px)"
      heading.style.display = "block"

      setTimeout(() => {
        heading.style.transition = "opacity 1s ease, transform 1s ease"
        heading.style.opacity = 1
        heading.style.transform = "translateY(0)"
      }, 100)
    }

    // Show visualizer
    const visualizerContainer = document.getElementById("visualizer-container")
    if (visualizerContainer) {
      visualizerContainer.style.display = "block"
    }
  }
}

function setupVisualizer() {
  visualizerCanvas = document.getElementById("visualizer")
  if (!visualizerCanvas) return

  visualizerContext = visualizerCanvas.getContext("2d")

  // Set canvas dimensions
  visualizerCanvas.width = visualizerCanvas.clientWidth
  visualizerCanvas.height = visualizerCanvas.clientHeight
}

function updateAudioData() {
  if (!audioAnalyser || !isPlaying) return

  // Initialize arrays if they don't exist
  if (!audioData) audioData = new Float32Array(audioAnalyser.frequencyBinCount)
  if (!bassData) bassData = new Float32Array(Math.floor(audioAnalyser.frequencyBinCount / 3))
  if (!midData) midData = new Float32Array(Math.floor(audioAnalyser.frequencyBinCount / 3))
  if (!trebleData) trebleData = new Float32Array(Math.floor(audioAnalyser.frequencyBinCount / 3))

  // Get frequency data
  audioAnalyser.getFloatFrequencyData(audioData)

  // Normalize the data to a range of 0-1 (from dB scale)
  for (let i = 0; i < audioData.length; i++) {
    // Convert from dB (-100 to 0 typical range) to 0-1
    audioData[i] = (audioData[i] + 100) / 100

    // Clamp values
    if (audioData[i] < 0) audioData[i] = 0
    if (audioData[i] > 1) audioData[i] = 1
  }

  // Split into frequency bands
  const bandSize = Math.floor(audioData.length / 3)

  // Bass (low frequencies)
  for (let i = 0; i < bandSize && i < bassData.length; i++) {
    bassData[i] = audioData[i]
  }

  // Mids (mid frequencies)
  for (let i = 0; i < bandSize && i < midData.length; i++) {
    midData[i] = audioData[i + bandSize]
  }

  // Treble (high frequencies)
  for (let i = 0; i < bandSize && i < trebleData.length; i++) {
    trebleData[i] = audioData[i + bandSize * 2]
  }

  // Beat detection
  const bassAvg = getAverageFrequency(bassData)
  const currentTime = clock.getElapsedTime()

  if (bassAvg > beatThreshold && currentTime - lastBeatTime > 0.3) {
    beatDetected = true
    lastBeatTime = currentTime

    // Create lightning effect on beat
    createLightningEffect()

    // Create laser beam on beat
    createLaserBeam()

    // Trigger wormhole pulse on beat
    if (wormhole) {
      pulsateWormhole()
    }
  } else {
    beatDetected = false
  }

  // Draw visualizer
  drawVisualizer()
}

function drawVisualizer() {
  if (!visualizerContext || !visualizerCanvas) return

  const width = visualizerCanvas.width
  const height = visualizerCanvas.height

  // Clear canvas
  visualizerContext.clearRect(0, 0, width, height)

  // Draw background
  visualizerContext.fillStyle = "rgba(0, 0, 0, 0.2)"
  visualizerContext.fillRect(0, 0, width, height)

  // Draw frequency bars
  const barWidth = width / audioData.length

  for (let i = 0; i < audioData.length; i++) {
    const barHeight = audioData[i] * height

    // Determine color based on frequency range
    let hue
    if (i < audioData.length / 3) {
      // Bass - red to orange
      hue = 0 + (i / (audioData.length / 3)) * 30
    } else if (i < (audioData.length * 2) / 3) {
      // Mid - yellow to green
      hue = 30 + ((i - audioData.length / 3) / (audioData.length / 3)) * 90
    } else {
      // Treble - cyan to blue
      hue = 180 + ((i - (audioData.length * 2) / 3) / (audioData.length / 3)) * 60
    }

    visualizerContext.fillStyle = `hsl(${hue}, 80%, 50%)`
    visualizerContext.fillRect(i * barWidth, height - barHeight, barWidth, barHeight)
  }
}

function getAverageFrequency(dataArray) {
  if (!dataArray || dataArray.length === 0) return 0

  let sum = 0
  for (let i = 0; i < dataArray.length; i++) {
    sum += dataArray[i]
  }
  return sum / dataArray.length
}

// Create Skybox
function createSkybox() {
  const geometry = new THREE.BoxGeometry(500, 500, 500)
  const materialArray = []

  const textureLoader = new THREE.TextureLoader()
  const texture = textureLoader.load("/placeholder.svg?height=1024&width=1024")

  for (let i = 0; i < 6; i++) {
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.3,
      color: 0x000000,
    })
    materialArray.push(material)
  }

  const skyboxMesh = new THREE.Mesh(geometry, materialArray)
  scene.add(skyboxMesh)
  return skyboxMesh
}

// Optimized Moving Starfield
function createStarField(count = 10000) {
  const geometry = new THREE.BufferGeometry()
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const velocities = new Float32Array(count * 3)

  for (let i = 0; i < count; i++) {
    const radius = 50 + Math.random() * 150
    const theta = Math.random() * Math.PI * 2
    const phi = Math.random() * Math.PI

    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
    positions[i * 3 + 2] = radius * Math.cos(phi)

    let r, g, b
    const colorType = Math.random()

    if (colorType < 0.25) {
      r = 0.5 + Math.random() * 0.2
      g = 0.7 + Math.random() * 0.3
      b = 0.9 + Math.random() * 0.1
    } else if (colorType < 0.5) {
      r = 0.9 + Math.random() * 0.1
      g = 0.9 + Math.random() * 0.1
      b = 0.9 + Math.random() * 0.1
    } else if (colorType < 0.75) {
      r = 0.9 + Math.random() * 0.1
      g = 0.9 + Math.random() * 0.1
      b = 0.5 + Math.random() * 0.2
    } else {
      r = 0.9 + Math.random() * 0.1
      g = 0.5 + Math.random() * 0.2
      b = 0.5 + Math.random() * 0.2
    }

    colors[i * 3] = r
    colors[i * 3 + 1] = g
    colors[i * 3 + 2] = b

    sizes[i] = Math.random() < 0.1 ? Math.random() * 4 + 2 : Math.random() * 2 + 1

    velocities[i * 3] = (Math.random() - 0.5) * 0.03
    velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.03
    velocities[i * 3 + 2] = -Math.random() * 0.1 - 0.05
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3))
  geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1))
  geometry.setAttribute("velocity", new THREE.BufferAttribute(velocities, 3))

  const starMaterial = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      pixelRatio: { value: renderer.getPixelRatio() },
      audioIntensity: { value: 0 },
    },
    vertexShader: `
      attribute float size;
      attribute vec3 color;
      attribute vec3 velocity;
      uniform float time;
      uniform float pixelRatio;
      uniform float audioIntensity;
      varying vec3 vColor;
      
      void main() {
        vColor = color;
        
        // Combine time-based pulse with audio reactivity
        float pulse = sin(time * 0.3 + position.x * 0.01 + position.y * 0.01 + position.z * 0.01) * 0.5 + 0.5;
        gl_PointSize = size * pixelRatio * (pulse * 0.5 + 0.5) * (1.0 + audioIntensity * 2.0);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      
      void main() {
        float distanceToCenter = length(gl_PointCoord - vec2(0.5));
        float strength = 1.0 - smoothstep(0.0, 0.5, distanceToCenter);
        gl_FragColor = vec4(vColor, strength);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })

  const stars = new THREE.Points(geometry, starMaterial)
  scene.add(stars)
  return stars
}

// Create 3D Visualizer Bars
function createVisualizerBars() {
  const bars = []
  const barCount = 64
  const barWidth = 0.2
  const barDepth = 0.2
  const spacing = 0.3
  const totalWidth = barCount * (barWidth + spacing)

  for (let i = 0; i < barCount; i++) {
    const geometry = new THREE.BoxGeometry(barWidth, 0.1, barDepth)

    // Calculate hue based on position
    const hue = (i / barCount) * 360
    const color = new THREE.Color().setHSL(hue / 360, 0.8, 0.5)

    const material = new THREE.MeshPhongMaterial({
      color: color,
      emissive: color.clone().multiplyScalar(0.3),
      shininess: 100,
      transparent: true,
      opacity: 0.8,
    })

    const bar = new THREE.Mesh(geometry, material)

    // Position bars in a circle
    const angle = (i / barCount) * Math.PI * 2
    const radius = 12
    bar.position.x = Math.sin(angle) * radius
    bar.position.z = Math.cos(angle) * radius
    bar.position.y = 0

    // Rotate bars to face center
    bar.lookAt(new THREE.Vector3(0, 0, 0))

    scene.add(bar)
    bars.push(bar)
  }

  return bars
}

// Create Energy Waves
function createEnergyWaves() {
  const waves = []
  const waveCount = 5

  for (let i = 0; i < waveCount; i++) {
    const geometry = new THREE.TorusGeometry(2 + i * 0.5, 0.05, 16, 100)
    const material = new THREE.MeshPhongMaterial({
      color: new THREE.Color().setHSL(i / waveCount, 0.8, 0.5),
      emissive: new THREE.Color().setHSL(i / waveCount, 0.9, 0.3),
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
    })

    const wave = new THREE.Mesh(geometry, material)
    wave.rotation.x = Math.PI / 2
    wave.position.y = 0.1
    wave.scale.set(0.1, 0.1, 0.1)
    wave.visible = false

    scene.add(wave)
    waves.push({
      mesh: wave,
      initialScale: 0.1,
      maxScale: 5 + i,
      speed: 0.5 + i * 0.1,
      active: false,
      progress: 0,
    })
  }

  return waves
}

// Create Lightning Effect
function createLightningEffect() {
  if (!isPlaying) return

  const points = []
  const segmentCount = 10
  const maxOffset = 2

  // Create a zigzag path
  for (let i = 0; i <= segmentCount; i++) {
    const t = i / segmentCount
    const x = (Math.random() - 0.5) * maxOffset * (1 - t)
    const y = 10 - t * 20
    const z = (Math.random() - 0.5) * maxOffset * (1 - t)
    points.push(new THREE.Vector3(x, y, z))
  }

  const curve = new THREE.CatmullRomCurve3(points)
  const geometry = new THREE.TubeGeometry(curve, 20, 0.05, 8, false)

  // Random color for the lightning
  const hue = Math.random()
  const color = new THREE.Color().setHSL(hue, 0.8, 0.8)

  const material = new THREE.MeshBasicMaterial({
    color: color,
    transparent: true,
    opacity: 1,
  })

  const lightning = new THREE.Mesh(geometry, material)
  scene.add(lightning)

  lightningEffects.push({
    mesh: lightning,
    life: 1.0,
    decay: 0.05,
  })
}

// Optimized Floating Crystals
function createFloatingCrystals() {
  const crystals = []
  const count = 15

  for (let i = 0; i < count; i++) {
    const geometry = new THREE.OctahedronGeometry(Math.random() * 0.5 + 0.2, 0)

    const material = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color().setHSL(Math.random(), 0.8, 0.6),
      metalness: 0.3,
      roughness: 0.4, // Adjusted to reduce reflection
      transmission: 0.6,
      thickness: 0.5,
      emissive: new THREE.Color().setHSL(Math.random(), 0.9, 0.4),
      emissiveIntensity: 0.6,
    })

    const crystal = new THREE.Mesh(geometry, material)

    const radius = 8 + Math.random() * 8
    const theta = Math.random() * Math.PI * 2
    const phi = Math.random() * Math.PI

    crystal.position.set(
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.sin(phi) * Math.sin(theta) + 2,
      radius * Math.cos(phi),
    )

    crystal.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI)

    crystal.userData = {
      rotationSpeed: {
        x: (Math.random() - 0.5) * 0.01,
        y: (Math.random() - 0.5) * 0.01,
        z: (Math.random() - 0.5) * 0.01,
      },
      floatSpeed: Math.random() * 0.01 + 0.005,
      floatOffset: Math.random() * Math.PI * 2,
      originalY: crystal.position.y,
      orbitRadius: radius,
      orbitSpeed: Math.random() * 0.0005 + 0.0002,
      orbitOffset: Math.random() * Math.PI * 2,
      orbitCenter: new THREE.Vector3(0, 2, 0),
    }

    crystal.castShadow = true
    crystal.receiveShadow = true
    scene.add(crystal)
    crystals.push(crystal)
  }
  return crystals
}

// Glowing Ring (static, no rotation)
function createGlowingRing() {
  const ringGroup = new THREE.Group()

  const ringGeometry = new THREE.TorusGeometry(5, 0.15, 32, 100)
  const ringMaterial = new THREE.MeshStandardMaterial({
    color: 0x000000,
    emissive: 0x00aaff,
    emissiveIntensity: 5,
    metalness: 0.9,
    roughness: 0.3, // Adjusted to reduce reflection
  })
  const ring = new THREE.Mesh(ringGeometry, ringMaterial)
  ring.position.y = 0.1
  ring.rotation.x = Math.PI / 2
  ringGroup.add(ring)

  const innerRingGeometry = new THREE.TorusGeometry(4.7, 0.08, 32, 100)
  const innerRingMaterial = new THREE.MeshStandardMaterial({
    color: 0x000000,
    emissive: 0xff5500,
    emissiveIntensity: 4,
    metalness: 0.9,
    roughness: 0.3, // Adjusted to reduce reflection
  })
  const innerRing = new THREE.Mesh(innerRingGeometry, innerRingMaterial)
  innerRing.position.y = 0.1
  innerRing.rotation.x = Math.PI / 2
  ringGroup.add(innerRing)

  const ringLight = new THREE.PointLight(0x00aaff, 5, 10)
  ringLight.position.set(0, 0.1, 0)
  ringGroup.add(ringLight)

  scene.add(ringGroup)
  return ringGroup
}

// NEW: Create Wormhole Effect
function createWormhole() {
  const wormholeGroup = new THREE.Group()

  // Create the main tunnel
  const tunnelGeometry = new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, -20),
      new THREE.Vector3(0, 0, -50),
      new THREE.Vector3(0, 0, -100),
    ]),
    64, // tubular segments
    5, // radius
    16, // radial segments
    false, // closed
  )

  // Create custom shader material for the wormhole
  const tunnelMaterial = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      color1: { value: new THREE.Color(0x0088ff) },
      color2: { value: new THREE.Color(0xff5500) },
      pulseIntensity: { value: 0.0 },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vPosition;
      
      void main() {
        vUv = uv;
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform vec3 color1;
      uniform vec3 color2;
      uniform float pulseIntensity;
      
      varying vec2 vUv;
      varying vec3 vPosition;
      
      void main() {
        // Create swirling pattern
        float pattern = sin(vUv.x * 20.0 + time * 2.0) * 0.5 + 0.5;
        pattern *= sin(vUv.y * 10.0 - time * 3.0) * 0.5 + 0.5;
        
        // Add radial waves
        float radial = length(vUv - vec2(0.5));
        pattern += sin(radial * 20.0 - time * 4.0) * 0.3;
        
        // Add pulse effect
        pattern += pulseIntensity * sin(time * 10.0) * 0.3;
        
        // Mix colors based on pattern
        vec3 finalColor = mix(color1, color2, pattern);
        
        // Add glow at the center
        float glow = 1.0 - smoothstep(0.0, 0.5, radial);
        finalColor += color1 * glow * 0.5;
        
        // Add transparency at edges
        float alpha = smoothstep(0.0, 0.2, 1.0 - radial) * 0.8;
        alpha += pulseIntensity * 0.2;
        
        gl_FragColor = vec4(finalColor, alpha);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })

  const tunnel = new THREE.Mesh(tunnelGeometry, tunnelMaterial)
  tunnel.rotation.x = Math.PI / 2
  wormholeGroup.add(tunnel)

  // Add particles inside the wormhole
  const particleCount = 1000
  const particleGeometry = new THREE.BufferGeometry()
  const particlePositions = new Float32Array(particleCount * 3)

  for (let i = 0; i < particleCount; i++) {
    const t = Math.random()
    const angle = Math.random() * Math.PI * 2
    const radius = Math.random() * 4

    particlePositions[i * 3] = Math.cos(angle) * radius
    particlePositions[i * 3 + 1] = Math.sin(angle) * radius
    particlePositions[i * 3 + 2] = -20 - t * 80
  }

  particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3))

  const particleMaterial = new THREE.PointsMaterial({
    size: 0.2,
    color: 0xffffff,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })

  const particles = new THREE.Points(particleGeometry, particleMaterial)
  wormholeGroup.add(particles)

  // Add light at the entrance
  const entranceLight = new THREE.PointLight(0x00aaff, 5, 20)
  entranceLight.position.set(0, 0, -20)
  wormholeGroup.add(entranceLight)

  // Position the wormhole behind the scene
  wormholeGroup.position.set(0, 5, -30)
  wormholeGroup.rotation.x = Math.PI / 10
  wormholeGroup.visible = true

  scene.add(wormholeGroup)
  return wormholeGroup
}

// NEW: Pulsate Wormhole on Beat
function pulsateWormhole() {
  if (!wormhole) return

  // Find the tunnel (first child)
  const tunnel = wormhole.children[0]
  if (tunnel && tunnel.material && tunnel.material.uniforms) {
    // Set pulse intensity
    tunnel.material.uniforms.pulseIntensity.value = 1.0

    // Reset pulse intensity after a short delay
    setTimeout(() => {
      if (tunnel && tunnel.material && tunnel.material.uniforms) {
        tunnel.material.uniforms.pulseIntensity.value = 0.0
      }
    }, 300)
  }

  // Also pulse the entrance light
  const entranceLight = wormhole.children[2]
  if (entranceLight && entranceLight.isLight) {
    const originalIntensity = entranceLight.intensity
    entranceLight.intensity = originalIntensity * 3

    setTimeout(() => {
      if (entranceLight) {
        entranceLight.intensity = originalIntensity
      }
    }, 300)
  }
}

// NEW: Create Audio-Reactive Geometric Shape
function createAudioReactiveGeometry() {
  const geometry = new THREE.IcosahedronGeometry(2, 1)

  // Create custom shader material
  const material = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      bassIntensity: { value: 0 },
      midIntensity: { value: 0 },
      trebleIntensity: { value: 0 },
    },
    vertexShader: `
      uniform float time;
      uniform float bassIntensity;
      uniform float midIntensity;
      uniform float trebleIntensity;
      
      varying vec3 vNormal;
      varying vec3 vPosition;
      
      void main() {
        vNormal = normal;
        
        // Create audio-reactive displacement
        vec3 newPosition = position;
        
        // Bass affects overall size
        newPosition *= 1.0 + bassIntensity * 0.5;
        
        // Mids create wave patterns
        float midDisplacement = sin(position.x * 5.0 + time * 2.0) * 
                               sin(position.y * 5.0 + time * 1.5) * 
                               sin(position.z * 5.0 + time);
        newPosition += normal * midDisplacement * midIntensity * 0.5;
        
        // Treble creates spiky effect
        float trebleDisplacement = sin(position.x * 20.0 + time * 5.0) * 
                                  sin(position.y * 20.0 + time * 4.0) * 
                                  sin(position.z * 20.0 + time * 6.0);
        newPosition += normal * trebleDisplacement * trebleIntensity * 0.3;
        
        vPosition = newPosition;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform float bassIntensity;
      uniform float midIntensity;
      uniform float trebleIntensity;
      
      varying vec3 vNormal;
      varying vec3 vPosition;
      
      void main() {
        // Create color based on position and audio
        vec3 baseColor = vec3(0.1, 0.5, 0.8); // Blue base
        
        // Add color variations based on audio
        vec3 bassColor = vec3(1.0, 0.2, 0.1); // Red for bass
        vec3 midColor = vec3(0.1, 0.8, 0.2);  // Green for mids
        vec3 trebleColor = vec3(0.8, 0.3, 0.8); // Purple for treble
        
        // Mix colors based on audio intensities
        vec3 finalColor = baseColor;
        finalColor = mix(finalColor, bassColor, bassIntensity * 0.7);
        finalColor = mix(finalColor, midColor, midIntensity * 0.5);
        finalColor = mix(finalColor, trebleColor, trebleIntensity * 0.3);
        
        // Add time-based color pulsing
        float pulse = sin(time * 2.0) * 0.5 + 0.5;
        finalColor *= 0.8 + pulse * 0.4;
        
        // Add edge glow
        vec3 viewDirection = normalize(-vPosition);
        float fresnel = pow(1.0 - dot(viewDirection, vNormal), 3.0);
        finalColor += vec3(1.0, 1.0, 1.0) * fresnel * 0.5;
        
        gl_FragColor = vec4(finalColor, 0.8);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.set(-8, 5, -5)
  scene.add(mesh)

  return mesh
}

// NEW: Create Particle System
function createParticleSystem() {
  const particleCount = 5000
  const geometry = new THREE.BufferGeometry()

  const positions = new Float32Array(particleCount * 3)
  const colors = new Float32Array(particleCount * 3)
  const sizes = new Float32Array(particleCount)
  const lifetimes = new Float32Array(particleCount)
  const velocities = new Float32Array(particleCount * 3)

  for (let i = 0; i < particleCount; i++) {
    // Random position in a sphere
    const radius = 20 + Math.random() * 10
    const theta = Math.random() * Math.PI * 2
    const phi = Math.random() * Math.PI

    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
    positions[i * 3 + 2] = radius * Math.cos(phi)

    // Random colors
    const hue = Math.random()
    const color = new THREE.Color().setHSL(hue, 0.9, 0.6)
    colors[i * 3] = color.r
    colors[i * 3 + 1] = color.g
    colors[i * 3 + 2] = color.b

    // Random sizes
    sizes[i] = Math.random() * 2 + 0.5

    // Random lifetimes
    lifetimes[i] = Math.random()

    // Random velocities (slow orbital movement)
    velocities[i * 3] = (Math.random() - 0.5) * 0.01
    velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.01
    velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.01
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3))
  geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1))
  geometry.setAttribute("lifetime", new THREE.BufferAttribute(lifetimes, 1))
  geometry.setAttribute("velocity", new THREE.BufferAttribute(velocities, 3))

  const material = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      audioIntensity: { value: 0 },
      pixelRatio: { value: renderer.getPixelRatio() },
    },
    vertexShader: `
      attribute float size;
      attribute vec3 color;
      attribute float lifetime;
      attribute vec3 velocity;
      
      uniform float time;
      uniform float audioIntensity;
      uniform float pixelRatio;
      
      varying vec3 vColor;
      varying float vLifetime;
      
      void main() {
        vColor = color;
        
        // Update lifetime based on time
        vLifetime = fract(lifetime + time * 0.1);
        
        // Size variation based on lifetime and audio
        float sizeScale = sin(vLifetime * 3.14159) * (1.0 + audioIntensity);
        gl_PointSize = size * pixelRatio * sizeScale;
        
        // Position with slight movement
        vec3 pos = position;
        pos.x += sin(time * 0.5 + position.z * 0.1) * 0.5;
        pos.y += cos(time * 0.4 + position.x * 0.1) * 0.5;
        pos.z += sin(time * 0.3 + position.y * 0.1) * 0.5;
        
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vLifetime;
      
      void main() {
        // Circular particles with soft edges
        float distanceToCenter = length(gl_PointCoord - vec2(0.5));
        float strength = 1.0 - smoothstep(0.0, 0.5, distanceToCenter);
        
        // Fade based on lifetime
        float alpha = strength * sin(vLifetime * 3.14159);
        
        gl_FragColor = vec4(vColor, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })

  const particles = new THREE.Points(geometry, material)
  scene.add(particles)

  return particles
}

// NEW: Create Laser Beam
function createLaserBeam() {
  if (!isPlaying) return

  // Random start position near the top
  const startX = (Math.random() - 0.5) * 20
  const startY = 10 + Math.random() * 5
  const startZ = (Math.random() - 0.5) * 20

  // Random end position near the bottom
  const endX = (Math.random() - 0.5) * 20
  const endY = -10 - Math.random() * 5
  const endZ = (Math.random() - 0.5) * 20

  // Create curve for the beam
  const points = [
    new THREE.Vector3(startX, startY, startZ),
    new THREE.Vector3(
      startX + (Math.random() - 0.5) * 5,
      (startY + endY) / 2 + (Math.random() - 0.5) * 5,
      startZ + (Math.random() - 0.5) * 5,
    ),
    new THREE.Vector3(endX, endY, endZ),
  ]

  const curve = new THREE.CatmullRomCurve3(points)
  const geometry = new THREE.TubeGeometry(curve, 20, 0.1, 8, false)

  // Random color for the laser
  const hue = Math.random()
  const color = new THREE.Color().setHSL(hue, 1.0, 0.7)

  const material = new THREE.MeshBasicMaterial({
    color: color,
    transparent: true,
    opacity: 1.0,
    side: THREE.DoubleSide,
  })

  const laser = new THREE.Mesh(geometry, material)
  scene.add(laser)

  // Add glow effect
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: color,
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide,
  })

  const glowGeometry = new THREE.TubeGeometry(curve, 20, 0.3, 8, false)
  const glow = new THREE.Mesh(glowGeometry, glowMaterial)
  scene.add(glow)

  // Add light along the path
  const light = new THREE.PointLight(color, 2, 5)
  light.position.copy(points[1])
  scene.add(light)

  // Store all elements for animation and cleanup
  laserBeams.push({
    elements: [laser, glow, light],
    life: 1.0,
    decay: 0.02,
  })
}

// NEW: Create Nebula Clouds
function createNebulaClouds() {
  const clouds = []
  const cloudCount = 8

  for (let i = 0; i < cloudCount; i++) {
    // Create cloud geometry
    const geometry = new THREE.SphereGeometry(3 + Math.random() * 2, 32, 32)

    // Create custom shader material for nebula effect
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        baseColor: { value: new THREE.Color().setHSL(Math.random(), 0.8, 0.5) },
        noiseScale: { value: 0.5 + Math.random() * 1.0 },
        audioIntensity: { value: 0 },
      },
      vertexShader: `
        varying vec3 vPosition;
        varying vec3 vNormal;
        
        void main() {
          vPosition = position;
          vNormal = normal;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 baseColor;
        uniform float noiseScale;
        uniform float audioIntensity;
        
        varying vec3 vPosition;
        varying vec3 vNormal;
        
        // Simple noise function
        float noise(vec3 p) {
          return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
        }
        
        void main() {
          // Create swirling nebula effect
          vec3 p = vPosition * noiseScale;
          
          float n = noise(p + time * 0.1);
          n += 0.5 * noise(p * 2.0 + time * 0.2);
          n += 0.25 * noise(p * 4.0 + time * 0.3);
          
          // Add audio reactivity
          n += audioIntensity * 0.2 * sin(time * 5.0 + vPosition.x + vPosition.y + vPosition.z);
          
          // Create color variations
          vec3 color1 = baseColor;
          vec3 color2 = vec3(1.0) - baseColor; // Complementary color
          
          vec3 finalColor = mix(color1, color2, n);
          
          // Add edge glow
          vec3 viewDirection = normalize(-vPosition);
          float fresnel = pow(1.0 - dot(viewDirection, vNormal), 3.0);
          finalColor += baseColor * fresnel * (1.0 + audioIntensity);
          
          // Vary opacity based on noise
          float alpha = smoothstep(0.1, 0.6, n) * 0.7;
          
          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    const cloud = new THREE.Mesh(geometry, material)

    // Position clouds around the scene
    const radius = 25 + Math.random() * 15
    const theta = Math.random() * Math.PI * 2
    const phi = Math.random() * Math.PI

    cloud.position.set(
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.sin(phi) * Math.sin(theta),
      radius * Math.cos(phi),
    )

    cloud.userData = {
      rotationSpeed: {
        x: (Math.random() - 0.5) * 0.001,
        y: (Math.random() - 0.5) * 0.001,
        z: (Math.random() - 0.5) * 0.001,
      },
      driftSpeed: {
        x: (Math.random() - 0.5) * 0.005,
        y: (Math.random() - 0.5) * 0.005,
        z: (Math.random() - 0.5) * 0.005,
      },
      originalPosition: cloud.position.clone(),
    }

    scene.add(cloud)
    clouds.push(cloud)
  }

  return clouds
}

// NEW: Create Asteroid Field
function createAsteroidField() {
  const asteroidGroup = new THREE.Group()
  const asteroidCount = 50

  for (let i = 0; i < asteroidCount; i++) {
    // Create random asteroid geometry
    const geometry = new THREE.DodecahedronGeometry(
      0.3 + Math.random() * 0.7, // radius
      0, // detail
    )

    // Distort geometry to make it more asteroid-like
    const positions = geometry.attributes.position.array
    for (let j = 0; j < positions.length; j += 3) {
      positions[j] += (Math.random() - 0.5) * 0.2
      positions[j + 1] += (Math.random() - 0.5) * 0.2
      positions[j + 2] += (Math.random() - 0.5) * 0.2
    }

    // Update normals after distortion
    geometry.computeVertexNormals()

    // Create material with random color
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(Math.random() * 0.1 + 0.05, 0.5, 0.3 + Math.random() * 0.2),
      roughness: 0.8,
      metalness: 0.2,
      emissive: new THREE.Color(0x331100),
      emissiveIntensity: Math.random() * 0.5,
    })

    const asteroid = new THREE.Mesh(geometry, material)

    // Position in a ring formation
    const radius = 15 + Math.random() * 10
    const angle = Math.random() * Math.PI * 2
    const height = (Math.random() - 0.5) * 5

    asteroid.position.set(Math.cos(angle) * radius, height, Math.sin(angle) * radius)

    // Random rotation
    asteroid.rotation.set(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2)

    // Random scale
    const scale = 0.5 + Math.random() * 1.5
    asteroid.scale.set(scale, scale, scale)

    // Store animation data
    asteroid.userData = {
      orbitSpeed: 0.0001 + Math.random() * 0.0005,
      orbitRadius: radius,
      orbitCenter: new THREE.Vector3(0, height, 0),
      orbitAngle: angle,
      rotationSpeed: {
        x: (Math.random() - 0.5) * 0.01,
        y: (Math.random() - 0.5) * 0.01,
        z: (Math.random() - 0.5) * 0.01,
      },
    }

    asteroid.castShadow = true
    asteroid.receiveShadow = true

    asteroidGroup.add(asteroid)
  }

  scene.add(asteroidGroup)
  return asteroidGroup
}

// NEW: Create Galaxy Spiral
function createGalaxySpiral() {
  const particleCount = 10000
  const geometry = new THREE.BufferGeometry()

  const positions = new Float32Array(particleCount * 3)
  const colors = new Float32Array(particleCount * 3)
  const sizes = new Float32Array(particleCount)
  const spiralData = new Float32Array(particleCount * 2) // angle and radius

  const arms = 3
  const armWidth = 0.3
  const innerRadius = 5
  const outerRadius = 20

  for (let i = 0; i < particleCount; i++) {
    // Calculate spiral position
    const t = i / particleCount
    const radius = innerRadius + t * (outerRadius - innerRadius)
    const armAngle = t * 5 * Math.PI + (Math.floor(Math.random() * arms) * Math.PI * 2) / arms
    const angle = armAngle + (Math.random() - 0.5) * armWidth * (1 - t)

    // Store spiral data for animation
    spiralData[i * 2] = angle
    spiralData[i * 2 + 1] = radius

    // Calculate position
    positions[i * 3] = Math.cos(angle) * radius
    positions[i * 3 + 1] = (Math.random() - 0.5) * 2 * t
    positions[i * 3 + 2] = Math.sin(angle) * radius

    // Color based on distance from center
    const hue = t * 0.3 + 0.6 // Blue to purple gradient
    const saturation = 0.8
    const lightness = 0.6 + t * 0.2

    const color = new THREE.Color().setHSL(hue, saturation, lightness)
    colors[i * 3] = color.r
    colors[i * 3 + 1] = color.g
    colors[i * 3 + 2] = color.b

    // Size based on distance from center (larger in center)
    sizes[i] = Math.max(0.5, 2 * (1 - t) + Math.random() * 0.5)
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3))
  geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1))
  geometry.setAttribute("spiralData", new THREE.BufferAttribute(spiralData, 2))

  const material = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      pixelRatio: { value: renderer.getPixelRatio() },
      audioIntensity: { value: 0 },
    },
    vertexShader: `
      attribute float size;
      attribute vec3 color;
      attribute vec2 spiralData;
      
      uniform float time;
      uniform float pixelRatio;
      uniform float audioIntensity;
      
      varying vec3 vColor;
      
      void main() {
        vColor = color;
        
        // Rotate the galaxy
        float angle = spiralData.x + time * 0.05;
        float radius = spiralData.y;
        
        // Apply audio reactivity to radius
        radius *= 1.0 + audioIntensity * 0.2 * sin(angle * 5.0);
        
        // Calculate new position
        vec3 newPosition = position;
        newPosition.x = cos(angle) * radius;
        newPosition.z = sin(angle) * radius;
        
        // Apply audio reactivity to y-position
        newPosition.y += audioIntensity * sin(time + angle) * 0.5;
        
        // Size variation with audio
        gl_PointSize = size * pixelRatio * (1.0 + audioIntensity * 0.5);
        
        gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      
      void main() {
        // Create circular particles with soft edges
        float distanceToCenter = length(gl_PointCoord - vec2(0.5));
        float strength = 1.0 - smoothstep(0.0, 0.5, distanceToCenter);
        
        gl_FragColor = vec4(vColor, strength);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })

  const galaxy = new THREE.Points(geometry, material)
  galaxy.position.set(0, -15, -20)
  galaxy.rotation.x = Math.PI / 4

  scene.add(galaxy)
  return galaxy
}

// NEW: Create Sound Wave Plane
function createSoundWavePlane() {
  const geometry = new THREE.PlaneGeometry(30, 30, 128, 128)

  const material = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      bassIntensity: { value: 0 },
      midIntensity: { value: 0 },
      trebleIntensity: { value: 0 },
      color1: { value: new THREE.Color(0x00aaff) },
      color2: { value: new THREE.Color(0xff5500) },
    },
    vertexShader: `
      uniform float time;
      uniform float bassIntensity;
      uniform float midIntensity;
      uniform float trebleIntensity;
      
      varying vec2 vUv;
      varying float vElevation;
      
      void main() {
        vUv = uv;
        
        // Create wave patterns based on audio frequencies
        float elevation = 0.0;
        
        // Bass creates large, slow waves
        elevation += sin(position.x * 0.5 + time * 0.5) * 
                    sin(position.y * 0.5 + time * 0.4) * 
                    bassIntensity * 2.0;
        
        // Mids create medium waves
        elevation += sin(position.x * 2.0 + time * 1.0) * 
                    sin(position.y * 2.0 + time * 0.8) * 
                    midIntensity * 1.0;
        
        // Treble creates small, fast waves
        elevation += sin(position.x * 8.0 + time * 2.0) * 
                    sin(position.y * 8.0 + time * 1.6) * 
                    trebleIntensity * 0.5;
        
        // Store elevation for fragment shader
        vElevation = elevation;
        
        // Apply elevation to vertex
        vec3 newPosition = position;
        newPosition.z += elevation;
        
        gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform vec3 color1;
      uniform vec3 color2;
      uniform float bassIntensity;
      
      varying vec2 vUv;
      varying float vElevation;
      
      void main() {
        // Mix colors based on elevation and time
        float mixFactor = (vElevation + 1.0) * 0.5; // Normalize to 0-1
        mixFactor = mixFactor * 0.8 + sin(time * 0.5) * 0.2; // Add time variation
        
        vec3 color = mix(color1, color2, mixFactor);
        
        // Add grid pattern
        float grid = 0.0;
        grid += smoothstep(0.95, 0.98, sin(vUv.x * 50.0) * 0.5 + 0.5);
        grid += smoothstep(0.95, 0.98, sin(vUv.y * 50.0) * 0.5 + 0.5);
        
        // Make grid intensity react to bass
        grid *= 1.0 + bassIntensity * 2.0;
        
        // Add grid to final color
        color += grid * 0.5;
        
        // Add edge fade
        float distanceToCenter = length(vUv - vec2(0.5));
        float alpha = 1.0 - smoothstep(0.4, 0.5, distanceToCenter);
        
        gl_FragColor = vec4(color, alpha * 0.7);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
  })

  const plane = new THREE.Mesh(geometry, material)
  plane.rotation.x = -Math.PI / 2
  plane.position.y = -10

  scene.add(plane)
  return plane
}

// Enhanced Lighting Setup
const ambientLight = new THREE.AmbientLight(0xffffff, 0.3) // Softens lighting
scene.add(ambientLight)

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5)
directionalLight.position.set(5, 10, 8)
directionalLight.castShadow = true
directionalLight.shadow.mapSize.set(1024, 1024)
directionalLight.shadow.camera.near = 1
directionalLight.shadow.camera.far = 50
directionalLight.shadow.camera.left = -10
directionalLight.shadow.camera.right = 10
directionalLight.shadow.camera.top = 10
directionalLight.shadow.camera.bottom = -10
directionalLight.shadow.bias = -0.0005
scene.add(directionalLight)

const fillLight = new THREE.DirectionalLight(0xffffee, 2)
fillLight.position.set(-5, 5, 15)
scene.add(fillLight)

const spotLight = new THREE.SpotLight(0xffffff, 30, 100, 0.3, 0.5)
spotLight.position.set(0, 15, 0)
spotLight.castShadow = true
spotLight.shadow.bias = -0.0001
scene.add(spotLight)

const rimLight1 = new THREE.PointLight(0xff3300, 8, 2)
rimLight1.position.set(-10, 5, 0)
scene.add(rimLight1)

const rimLight2 = new THREE.PointLight(0x00aaff, 8, 1)
rimLight2.position.set(10, 5, 0)
scene.add(rimLight2)

const movingLight1 = new THREE.PointLight(0xffffff, 0.5, 0.5, 0.5) // Lower intensity, higher distance
movingLight1.position.set(0, 0, 0)
scene.add(movingLight1)

const movingLight2 = new THREE.PointLight(0xffffff, 0.5, 0.5, 0.5)
movingLight2.position.set(0, 0, 0)
scene.add(movingLight2)

const helper1 = new THREE.PointLightHelper(movingLight1, 0.5)
scene.add(helper1)

const helper2 = new THREE.PointLightHelper(movingLight2, 0.5)
scene.add(helper2)

movingLight1.castShadow = true
movingLight1.shadow.mapSize.width = 1024
movingLight1.shadow.mapSize.height = 1024

movingLight2.castShadow = true
movingLight2.shadow.mapSize.width = 1024
movingLight2.shadow.mapSize.height = 1024

const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x404040, 0.6)
scene.add(hemiLight)

// Initialize scene elements
// starField = createStarField()
floatingCrystals = createFloatingCrystals()
ring = createGlowingRing()
// skybox = createSkybox()
visualizerBars = createVisualizerBars()
energyWaves = createEnergyWaves()

// Initialize new visual elements
wormhole = createWormhole()
audioReactiveGeometry = createAudioReactiveGeometry()
particleSystem = createParticleSystem()
nebulaClouds = createNebulaClouds()
asteroidField = createAsteroidField()
galaxySpiral = createGalaxySpiral()
soundWavePlane = createSoundWavePlane()

// Optimized Thruster Particles
function createThrusterParticles() {
  const thrusterGeometry = new THREE.BufferGeometry()
  const thrusterCount = 100
  const thrusterPositions = new Float32Array(thrusterCount * 3)
  const thrusterVelocities = new Float32Array(thrusterCount * 3)
  const thrusterColors = new Float32Array(thrusterCount * 3)

  for (let i = 0; i < thrusterCount; i++) {
    thrusterPositions[i * 3] = (Math.random() - 0.5) * 0.1
    thrusterPositions[i * 3 + 1] = (Math.random() - 0.5) * 0.1
    thrusterPositions[i * 3 + 2] = -Math.random() * 0.5

    thrusterVelocities[i * 3] = (Math.random() - 0.5) * 0.01
    thrusterVelocities[i * 3 + 1] = (Math.random() - 0.5) * 0.01
    thrusterVelocities[i * 3 + 2] = -Math.random() * 0.1 - 0.05

    const t = Math.random()
    thrusterColors[i * 3] = t * 1.0
    thrusterColors[i * 3 + 1] = 0.5 + t * 0.5
    thrusterColors[i * 3 + 2] = 1.0
  }

  thrusterGeometry.setAttribute("position", new THREE.BufferAttribute(thrusterPositions, 3))
  thrusterGeometry.setAttribute("velocity", new THREE.BufferAttribute(thrusterVelocities, 3))
  thrusterGeometry.setAttribute("color", new THREE.BufferAttribute(thrusterColors, 3))

  const thrusterMaterial = new THREE.PointsMaterial({
    size: 0.05,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })

  return new THREE.Points(thrusterGeometry, thrusterMaterial)
}

// Optimized Particle Burst
function createBurstParticles() {
  const burstGeometry = new THREE.BufferGeometry()
  const burstCount = 100
  const burstPositions = new Float32Array(burstCount * 3)
  const burstVelocities = new Float32Array(burstCount * 3)
  const burstColors = new Float32Array(burstCount * 3)

  for (let i = 0; i < burstCount; i++) {
    burstPositions[i * 3] = 0
    burstPositions[i * 3 + 1] = 1
    burstPositions[i * 3 + 2] = 0

    const theta = Math.random() * Math.PI * 2
    const phi = Math.random() * Math.PI
    const speed = Math.random() * 0.1 + 0.05

    burstVelocities[i * 3] = speed * Math.sin(phi) * Math.cos(theta)
    burstVelocities[i * 3 + 1] = speed * Math.cos(phi)
    burstVelocities[i * 3 + 2] = speed * Math.sin(phi) * Math.sin(theta)

    const hue = Math.random()
    const color = new THREE.Color().setHSL(hue, 0.9, 0.6)
    burstColors[i * 3] = color.r
    burstColors[i * 3 + 1] = color.g
    burstColors[i * 3 + 2] = color.b
  }

  burstGeometry.setAttribute("position", new THREE.BufferAttribute(burstPositions, 3))
  burstGeometry.setAttribute("velocity", new THREE.BufferAttribute(burstVelocities, 3))
  burstGeometry.setAttribute("color", new THREE.BufferAttribute(burstColors, 3))

  const burstMaterial = new THREE.PointsMaterial({
    size: 0.1,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })

  return new THREE.Points(burstGeometry, burstMaterial)
}

// Optimized Post-Processing Setup
function setupPostProcessing() {
  composer = new EffectComposer(renderer)

  const renderPass = new RenderPass(scene, camera)
  composer.addPass(renderPass)

  const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.5, 0.4, 0.85)
  composer.addPass(bloomPass)

  const rgbShiftPass = new ShaderPass(RGBShiftShader)
  rgbShiftPass.uniforms.amount.value = 0.0005
  composer.addPass(rgbShiftPass)
}

// Load GLTF Model
const loader = new GLTFLoader().setPath("public/millennium_falcon/")
loader.load(
  "scene.gltf",
  (gltf) => {
    console.log("Model loaded successfully")
    spaceship = gltf.scene

    spaceship.traverse((child) => {
      if (child.isMesh) {
        if (child.material) {
          child.material.metalness = 0.8
          child.material.roughness = 0.4 // Adjusted from 0.3 to reduce reflection
          child.material.envMapIntensity = 1.5
          child.material.emissive = new THREE.Color(0x333333)
          child.material.emissiveIntensity = 0.2
        }

        child.castShadow = true
        child.receiveShadow = true
      }
    })

    spaceship.position.set(0, 1.05, -1)
    spaceship.scale.set(0.5, 0.5, 0.5)
    scene.add(spaceship)

    const engineGlow = new THREE.PointLight(0x00aaff, 8, 4)
    engineGlow.position.set(0, 0.5, 2)
    spaceship.add(engineGlow)

    thrusterParticles = createThrusterParticles()
    spaceship.add(thrusterParticles)

    const modelSpotlight = new THREE.SpotLight(0xffffff, 20, 20, 0.5, 0.5)
    modelSpotlight.position.set(0, 10, 5)
    modelSpotlight.target = spaceship
    scene.add(modelSpotlight)

    const modelUplight = new THREE.SpotLight(0xffffee, 10, 15, 0.6, 0.5)
    modelUplight.position.set(0, -2, 5)
    modelUplight.target = spaceship
    scene.add(modelUplight)

    const progressContainer = document.getElementById("progress-container")
    if (progressContainer) {
      progressContainer.style.display = "none"
    }

    // Initialize audio after model loads
    setupAudio()

    // Show play button
    const playButton = document.getElementById("play-button")
    if (playButton) {
      playButton.style.display = "block"
    }
  },
  (xhr) => {
    const progressPercent = xhr.total > 0 ? ((xhr.loaded / xhr.total) * 100).toFixed(0) : 0
    console.log(`Loading Model: ${progressPercent}%`)

    const progressElement = document.getElementById("progress")
    if (progressElement) {
      progressElement.textContent = `Loading Model: ${progressPercent}%`
    }

    const progressBar = document.getElementById("progress-bar")
    if (progressBar) {
      progressBar.style.width = `${progressPercent}%`
    }
  },
  (error) => {
    console.error("Error Loading Model:", error)

    const progressElement = document.getElementById("progress")
    if (progressElement) {
      progressElement.textContent = "Error Loading Model. Please refresh."
    }
  },
)

// Event Listeners
document.addEventListener("mousemove", (event) => {
  mouseX = (event.clientX / window.innerWidth) * 2 - 1
  mouseY = -(event.clientY / window.innerHeight) * 2 + 1
})

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
  if (composer) composer.setSize(window.innerWidth, window.innerHeight)

  // Resize visualizer canvas if it exists
  if (visualizerCanvas) {
    visualizerCanvas.width = visualizerCanvas.clientWidth
    visualizerCanvas.height = visualizerCanvas.clientHeight
  }
})

document.addEventListener("click", () => {
  try {
    if (!burstParticles) {
      burstParticles = createBurstParticles()
      scene.add(burstParticles)
    }

    const positions = burstParticles.geometry.attributes.position.array
    const velocities = burstParticles.geometry.attributes.velocity.array
    const colors = burstParticles.geometry.attributes.color.array

    for (let i = 0; i < positions.length / 3; i++) {
      positions[i * 3] = 0
      positions[i * 3 + 1] = 1
      positions[i * 3 + 2] = 0

      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI
      const speed = Math.random() * 0.1 + 0.05

      velocities[i * 3] = speed * Math.sin(phi) * Math.cos(theta)
      velocities[i * 3 + 1] = speed * Math.cos(phi)
      velocities[i * 3 + 2] = speed * Math.sin(phi) * Math.sin(theta)

      const hue = Math.random()
      const color = new THREE.Color().setHSL(hue, 0.9, 0.6)
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b
    }

    burstParticles.geometry.attributes.position.needsUpdate = true
    burstParticles.geometry.attributes.color.needsUpdate = true

    // Trigger an energy wave on click
    triggerEnergyWave()
  } catch (error) {
    console.error("Error in click handler:", error)
  }
})

// Trigger Energy Wave
function triggerEnergyWave() {
  if (!energyWaves || energyWaves.length === 0) return

  // Find an inactive wave
  const inactiveWave = energyWaves.find((wave) => !wave.active)
  if (inactiveWave) {
    inactiveWave.active = true
    inactiveWave.progress = 0
    inactiveWave.mesh.visible = true
    inactiveWave.mesh.scale.set(inactiveWave.initialScale, inactiveWave.initialScale, inactiveWave.initialScale)

    // Set a random color
    const hue = Math.random()
    inactiveWave.mesh.material.color.setHSL(hue, 0.8, 0.5)
    inactiveWave.mesh.material.emissive.setHSL(hue, 0.9, 0.3)
  }
}

// Setup Post-Processing
setupPostProcessing()

// Optimized Animation Loop
function animate() {
  requestAnimationFrame(animate)

  try {
    const elapsedTime = clock.getElapsedTime()
    controls.update()

    // Update audio data
    updateAudioData()

    // Get average frequency values for different bands
    let bassAvg = 0,
      midAvg = 0,
      trebleAvg = 0

    if (isPlaying) {
      bassAvg = getAverageFrequency(bassData)
      midAvg = getAverageFrequency(midData)
      trebleAvg = getAverageFrequency(trebleData)
    }

    // Update skybox
    // if (skybox && skybox.material) {
    //   for (let i = 0; i < skybox.material.length; i++) {
    //     const material = skybox.material[i]
    //     // Pulse opacity with bass
    //     material.opacity = 0.3 + bassAvg * 0.3

    //     // Change color with time and audio
    //     const hue = (elapsedTime * 0.02 + bassAvg * 0.2) % 1
    //     material.color.setHSL(hue, 0.7, 0.1 + bassAvg * 0.2)
    //   }
    // }

    // Update visualizer bars
    if (visualizerBars && visualizerBars.length > 0 && audioData) {
      const barCount = visualizerBars.length
      const step = Math.floor(audioData.length / barCount)

      for (let i = 0; i < barCount; i++) {
        const bar = visualizerBars[i]
        if (!bar) continue

        // Get audio data for this bar
        const audioIndex = i * step
        const audioValue = audioData[audioIndex] || 0

        // Scale bar height based on audio
        const targetHeight = 0.1 + audioValue * 5
        bar.scale.y = targetHeight

        // Center the bar vertically
        bar.position.y = targetHeight / 2

        // Pulse color intensity with audio
        const hue = (i / barCount + elapsedTime * 0.05) % 1
        bar.material.color.setHSL(hue, 0.8, 0.5 + audioValue * 0.5)
        bar.material.emissive.setHSL(hue, 0.9, 0.3 + audioValue * 0.3)
      }
    }

    // Update energy waves
    if (energyWaves && energyWaves.length > 0) {
      energyWaves.forEach((wave) => {
        if (wave.active) {
          wave.progress += wave.speed * 0.01
          const scale = wave.initialScale + (wave.maxScale - wave.initialScale) * wave.progress
          wave.mesh.scale.set(scale, scale, scale)

          // Fade out as it expands
          wave.mesh.material.opacity = 0.7 * (1 - wave.progress)

          // Reset when complete
          if (wave.progress >= 1) {
            wave.active = false
            wave.mesh.visible = false
          }
        }
      })
    }

    // Update lightning effects
    if (lightningEffects && lightningEffects.length > 0) {
      for (let i = lightningEffects.length - 1; i >= 0; i--) {
        const lightning = lightningEffects[i]
        lightning.life -= lightning.decay

        if (lightning.life <= 0) {
          scene.remove(lightning.mesh)
          lightningEffects.splice(i, 1)
        } else {
          lightning.mesh.material.opacity = lightning.life
        }
      }
    }

    // Update laser beams
    if (laserBeams && laserBeams.length > 0) {
      for (let i = laserBeams.length - 1; i >= 0; i--) {
        const laser = laserBeams[i]
        laser.life -= laser.decay

        if (laser.life <= 0) {
          // Remove all elements
          laser.elements.forEach((element) => {
            scene.remove(element)
          })
          laserBeams.splice(i, 1)
        } else {
          // Update opacity
          laser.elements.forEach((element, index) => {
            if (element.material) {
              element.material.opacity = laser.life
            }
            if (element.isLight) {
              element.intensity = 2 * laser.life
            }
          })
        }
      }
    }

    // Update wormhole
    if (wormhole) {
      const tunnel = wormhole.children[0]
      if (tunnel && tunnel.material && tunnel.material.uniforms) {
        tunnel.material.uniforms.time.value = elapsedTime

        // Fade pulse intensity over time
        if (tunnel.material.uniforms.pulseIntensity.value > 0) {
          tunnel.material.uniforms.pulseIntensity.value *= 0.95
        }
      }

      // Update particles inside wormhole
      const particles = wormhole.children[1]
      if (particles && particles.geometry && particles.geometry.attributes.position) {
        const positions = particles.geometry.attributes.position.array

        for (let i = 0; i < positions.length / 3; i++) {
          // Move particles along the tunnel
          positions[i * 3 + 2] += 0.2 + bassAvg * 0.3

          // Reset particles that reach the end
          if (positions[i * 3 + 2] > -20) {
            const angle = Math.random() * Math.PI * 2
            const radius = Math.random() * 4

            positions[i * 3] = Math.cos(angle) * radius
            positions[i * 3 + 1] = Math.sin(angle) * radius
            positions[i * 3 + 2] = -100
          }
        }

        particles.geometry.attributes.position.needsUpdate = true
      }
    }

    // Update audio reactive geometry
    if (audioReactiveGeometry && audioReactiveGeometry.material && audioReactiveGeometry.material.uniforms) {
      audioReactiveGeometry.material.uniforms.time.value = elapsedTime
      audioReactiveGeometry.material.uniforms.bassIntensity.value = bassAvg
      audioReactiveGeometry.material.uniforms.midIntensity.value = midAvg
      audioReactiveGeometry.material.uniforms.trebleIntensity.value = trebleAvg

      // Rotate based on audio
      audioReactiveGeometry.rotation.x += 0.005 + bassAvg * 0.01
      audioReactiveGeometry.rotation.y += 0.01 + midAvg * 0.02
      audioReactiveGeometry.rotation.z += 0.007 + trebleAvg * 0.015
    }

    // Update particle system
    if (particleSystem && particleSystem.material && particleSystem.material.uniforms) {
      particleSystem.material.uniforms.time.value = elapsedTime
      particleSystem.material.uniforms.audioIntensity.value = (bassAvg + midAvg + trebleAvg) / 3

      // Slowly rotate the entire system
      particleSystem.rotation.y += 0.001
    }

    // Update nebula clouds
    if (nebulaClouds && nebulaClouds.length > 0) {
      nebulaClouds.forEach((cloud, index) => {
        if (!cloud || !cloud.material || !cloud.material.uniforms) return

        // Update time and audio intensity
        cloud.material.uniforms.time.value = elapsedTime

        // Use different frequency bands for different clouds
        const audioIndex = index % 3
        let audioValue = 0

        if (audioIndex === 0) audioValue = bassAvg
        else if (audioIndex === 1) audioValue = midAvg
        else audioValue = trebleAvg

        cloud.material.uniforms.audioIntensity.value = audioValue

        // Rotate and drift
        const data = cloud.userData
        if (data) {
          cloud.rotation.x += data.rotationSpeed.x
          cloud.rotation.y += data.rotationSpeed.y
          cloud.rotation.z += data.rotationSpeed.z

          // Drift with audio reactivity
          cloud.position.x =
            data.originalPosition.x + Math.sin(elapsedTime * 0.2 + index) * data.driftSpeed.x * (1 + audioValue * 5)
          cloud.position.y =
            data.originalPosition.y + Math.cos(elapsedTime * 0.3 + index) * data.driftSpeed.y * (1 + audioValue * 5)
          cloud.position.z =
            data.originalPosition.z + Math.sin(elapsedTime * 0.4 + index) * data.driftSpeed.z * (1 + audioValue * 5)
        }
      })
    }

    // Update asteroid field
    if (asteroidField && asteroidField.children) {
      asteroidField.children.forEach((asteroid) => {
        const data = asteroid.userData
        if (!data) return

        // Rotate asteroid
        asteroid.rotation.x += data.rotationSpeed.x
        asteroid.rotation.y += data.rotationSpeed.y
        asteroid.rotation.z += data.rotationSpeed.z

        // Orbit around center
        data.orbitAngle += data.orbitSpeed * (1 + bassAvg * 2)
        asteroid.position.x = data.orbitCenter.x + Math.cos(data.orbitAngle) * data.orbitRadius
        asteroid.position.z = data.orbitCenter.z + Math.sin(data.orbitAngle) * data.orbitRadius

        // Add slight bobbing with mid frequencies
        asteroid.position.y = data.orbitCenter.y + Math.sin(elapsedTime * 0.5 + data.orbitAngle * 5) * 0.2 * midAvg
      })
    }

    // Update galaxy spiral
    if (galaxySpiral && galaxySpiral.material && galaxySpiral.material.uniforms) {
      galaxySpiral.material.uniforms.time.value = elapsedTime
      galaxySpiral.material.uniforms.audioIntensity.value = bassAvg * 0.5 + midAvg * 0.3 + trebleAvg * 0.2

      // Rotate the entire galaxy
      galaxySpiral.rotation.z += 0.001
    }

    // Update sound wave plane
    if (soundWavePlane && soundWavePlane.material && soundWavePlane.material.uniforms) {
      soundWavePlane.material.uniforms.time.value = elapsedTime
      soundWavePlane.material.uniforms.bassIntensity.value = bassAvg
      soundWavePlane.material.uniforms.midIntensity.value = midAvg
      soundWavePlane.material.uniforms.trebleIntensity.value = trebleAvg

      // Change colors over time
      const hue1 = (elapsedTime * 0.05) % 1
      const hue2 = (elapsedTime * 0.05 + 0.5) % 1
      soundWavePlane.material.uniforms.color1.value.setHSL(hue1, 0.7, 0.5)
      soundWavePlane.material.uniforms.color2.value.setHSL(hue2, 0.7, 0.5)
    }

    if (spaceship) {
      // Make spaceship react to bass
      const bassIntensity = bassAvg * 0.2
      spaceship.rotation.y = Math.sin(elapsedTime * 0.1) * 0.05 + bassIntensity * 0.1
      spaceship.position.x += (mouseX * 0.5 - spaceship.position.x) * 0.02
      spaceship.rotation.z += (-mouseX * 0.2 - spaceship.rotation.z) * 0.02

      // Make spaceship bounce slightly with the beat
      spaceship.position.y = 1.05 + bassAvg * 0.2

      if (thrusterParticles && thrusterParticles.geometry.attributes.position) {
        const positions = thrusterParticles.geometry.attributes.position.array
        const velocities = thrusterParticles.geometry.attributes.velocity.array
        const colors = thrusterParticles.geometry.attributes.color.array

        for (let i = 0; i < positions.length / 3; i++) {
          positions[i * 3] += velocities[i * 3]
          positions[i * 3 + 1] += velocities[i * 3 + 1]
          positions[i * 3 + 2] += velocities[i * 3 + 2]

          if (positions[i * 3 + 2] < -2) {
            positions[i * 3] = (Math.random() - 0.5) * 0.1
            positions[i * 3 + 1] = (Math.random() - 0.5) * 0.1
            positions[i * 3 + 2] = -Math.random() * 0.5

            const t = Math.random()
            colors[i * 3] = t * 1.0
            colors[i * 3 + 1] = 0.5 + t * 0.5
            colors[i * 3 + 2] = 1.0
          }
        }

        thrusterParticles.geometry.attributes.position.needsUpdate = true
        thrusterParticles.geometry.attributes.color.needsUpdate = true
      }
    }

    // if (starField && starField.material.uniforms) {
    //   starField.material.uniforms.time.value = elapsedTime
    //   starField.material.uniforms.pixelRatio.value = renderer.getPixelRatio()

    //   // Update audio intensity in shader
    //   if (starField.material.uniforms.audioIntensity) {
    //     starField.material.uniforms.audioIntensity.value = trebleAvg
    //   }

    //   if (starField.geometry.attributes.position && starField.geometry.attributes.velocity) {
    //     const positions = starField.geometry.attributes.position.array
    //     const velocities = starField.geometry.attributes.velocity.array
    //     const count = positions.length / 3

    //     // Speed up star movement based on treble
    //     const speedMultiplier = 1 + trebleAvg * 2

    //     const updateCount = Math.min(count, 2000)
    //     const startIdx = Math.floor(Math.random() * (count - updateCount))

    //     for (let i = startIdx; i < startIdx + updateCount; i++) {
    //       positions[i * 3] += velocities[i * 3] * speedMultiplier
    //       positions[i * 3 + 1] += velocities[i * 3 + 1] * speedMultiplier
    //       positions[i * 3 + 2] += velocities[i * 3 + 2] * speedMultiplier

    //       if (positions[i * 3 + 2] < -150) {
    //         const radius = 150
    //         const theta = Math.random() * Math.PI * 2
    //         const phi = Math.random() * Math.PI

    //         positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
    //         positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
    //         positions[i * 3 + 2] = radius * Math.cos(phi)
    //       }
    //     }

    //     starField.geometry.attributes.position.needsUpdate = true
    //   }
    // }

    if (floatingCrystals && floatingCrystals.length > 0) {
      floatingCrystals.forEach((crystal, index) => {
        if (!crystal) return

        const data = crystal.userData
        if (!data) return

        // Make crystals react to mid frequencies
        const audioIndex = index % (midData ? midData.length : 1)
        const audioValue = isPlaying && midData ? midData[audioIndex] : 0
        const audioBoost = audioValue * 3

        crystal.rotation.x += data.rotationSpeed.x * (1 + audioBoost)
        crystal.rotation.y += data.rotationSpeed.y * (1 + audioBoost)
        crystal.rotation.z += data.rotationSpeed.z * (1 + audioBoost)

        const floatY = Math.sin(elapsedTime * data.floatSpeed + data.floatOffset) * 0.5 * (1 + audioBoost)

        if (data.orbitRadius) {
          const orbitAngle = elapsedTime * data.orbitSpeed + data.orbitOffset
          crystal.position.x = data.orbitCenter.x + Math.sin(orbitAngle) * data.orbitRadius * (1 + audioBoost * 0.2)
          crystal.position.z = data.orbitCenter.z + Math.cos(orbitAngle) * data.orbitRadius * (1 + audioBoost * 0.2)
          crystal.position.y = data.originalY + floatY
        }

        if (crystal.material && crystal.material.color) {
          const hue = (elapsedTime * 0.01 + data.floatOffset + audioBoost * 0.1) % 1
          crystal.material.color.setHSL(hue, 0.8, 0.6)

          if (crystal.material.emissive) {
            crystal.material.emissive.setHSL((hue + 0.5) % 1, 0.9, 0.4)
            crystal.material.emissiveIntensity = 0.6 + Math.sin(elapsedTime * 2 + data.floatOffset) * 0.2 + audioBoost
          }
        }
      })
    }

    if (ring && ring.children && ring.children.length > 0) {
      const mainRing = ring.children[0]
      if (mainRing && mainRing.material) {
        // Make ring pulse with bass
        const bassValue = bassAvg || 0
        mainRing.material.emissiveIntensity = 5 + Math.sin(elapsedTime * 2) * 2 + bassValue * 5
        const hue1 = (elapsedTime * 0.05 + bassValue * 0.1) % 1
        mainRing.material.emissive.setHSL(hue1, 0.7, 0.5)

        // Scale ring with bass
        mainRing.scale.set(1 + bassValue * 0.2, 1 + bassValue * 0.2, 1 + bassValue * 0.2)
      }

      if (ring.children.length > 1) {
        const innerRing = ring.children[1]
        if (innerRing && innerRing.material) {
          // Make inner ring pulse with mids
          const midValue = midAvg || 0
          innerRing.material.emissiveIntensity = 4 + Math.cos(elapsedTime * 2.5) * 1.5 + midValue * 4
          const hue2 = (elapsedTime * 0.07 + 0.5 + midValue * 0.1) % 1
          innerRing.material.emissive.setHSL(hue2, 0.7, 0.5)

          // Scale inner ring with mids
          innerRing.scale.set(1 + midValue * 0.15, 1 + midValue * 0.15, 1 + midValue * 0.15)
        }
      }

      if (ring.children.length > 2) {
        const ringLight = ring.children[2]
        if (ringLight) {
          const bassValue = bassAvg || 0
          ringLight.intensity = 5 + Math.sin(elapsedTime * 3) * 2 + bassValue * 10
          const hue3 = (elapsedTime * 0.05) % 1
          ringLight.color.setHSL(hue3, 0.7, 0.5)
        }
      }
    }

    // Make lights react to audio
    spotLight.intensity = 30 + Math.sin(elapsedTime) * 5 + trebleAvg * 20
    const spotHue = (elapsedTime * 0.02 + trebleAvg * 0.1) % 1
    spotLight.color.setHSL(spotHue, 0.5, 0.6)

    const movingAngle1 = elapsedTime * 0.5
    movingLight1.position.x = Math.sin(movingAngle1) * 10
    movingLight1.position.y = 5 + Math.sin(elapsedTime * 0.7) * 2 + midAvg * 3
    movingLight1.position.z = Math.cos(movingAngle1) * 10
    movingLight1.intensity = 0.5 + bassAvg * 2

    const movingAngle2 = elapsedTime * 0.5 + Math.PI
    movingLight2.position.x = Math.sin(movingAngle2) * 10
    movingLight2.position.y = 5 + Math.cos(elapsedTime * 0.7) * 2 + trebleAvg * 3
    movingLight2.position.z = Math.cos(movingAngle2) * 10
    movingLight2.intensity = 0.5 + trebleAvg * 2

    if (burstParticles && burstParticles.geometry.attributes.position) {
      const positions = burstParticles.geometry.attributes.position.array
      const velocities = burstParticles.geometry.attributes.velocity.array

      for (let i = 0; i < positions.length / 3; i++) {
        positions[i * 3] += velocities[i * 3]
        positions[i * 3 + 1] += velocities[i * 3 + 1]
        positions[i * 3 + 2] += velocities[i * 3 + 2]

        velocities[i * 3 + 1] -= 0.001

        if (positions[i * 3 + 1] < -5) {
          positions[i * 3] = 0
          positions[i * 3 + 1] = 1
          positions[i * 3 + 2] = 0

          const theta = Math.random() * Math.PI * 2
          const phi = Math.random() * Math.PI
          const speed = Math.random() * 0.1 + 0.05

          velocities[i * 3] = speed * Math.sin(phi) * Math.cos(theta)
          velocities[i * 3 + 1] = speed * Math.cos(phi)
          velocities[i * 3 + 2] = speed * Math.sin(phi) * Math.sin(theta)
        }
      }

      burstParticles.geometry.attributes.position.needsUpdate = true
    }

    if (composer) {
      composer.render()
    } else {
      renderer.render(scene, camera)
    }
  } catch (error) {
    console.error("Error in animation loop:", error)
    renderer.render(scene, camera)
  }
}

animate()

