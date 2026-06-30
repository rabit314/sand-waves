// ============ Scene Initialization ============
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xd4b896, 100, 340);

  const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 800);
  camera.position.set(0, 10, -16);

  const isMobile = /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent);

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(isMobile ? Math.min(devicePixelRatio, 1.0) : Math.min(devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = !isMobile;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  document.body.appendChild(renderer.domElement);

  // ============ Sky: Shader Gradient ============
  const skyGeo = new THREE.SphereGeometry(500, 16, 8);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      topColor: { value: new THREE.Color(0x4a82b8) },
      midColor: { value: new THREE.Color(0xb8d4e8) },
      horizonColor: { value: new THREE.Color(0xe8c898) },
      bottomColor: { value: new THREE.Color(0xc8a878) }
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPosition = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 midColor;
      uniform vec3 horizonColor;
      uniform vec3 bottomColor;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition).y;
        vec3 color;
        if (h > 0.0) {
          float t1 = smoothstep(0.0, 0.15, h);
          float t2 = smoothstep(0.15, 0.6, h);
          color = mix(horizonColor, midColor, t1);
          color = mix(color, topColor, t2);
        } else {
          color = mix(horizonColor, bottomColor, smoothstep(0.0, -0.25, h));
        }
        gl_FragColor = vec4(color, 1.0);
      }
    `
  });
  scene.add(new THREE.Mesh(skyGeo, skyMat));

  // Sun
  const sunGeo = new THREE.SphereGeometry(8, 16, 16);
  const sunMat = new THREE.MeshBasicMaterial({ color: 0xfff4d0 });
  const sunMesh = new THREE.Mesh(sunGeo, sunMat);
  sunMesh.position.set(120, 100, 80);
  scene.add(sunMesh);
  // Sun Glow
  const sunGlowGeo = new THREE.SphereGeometry(20, 16, 16);
  const sunGlowMat = new THREE.MeshBasicMaterial({
    color: 0xfff4d0, transparent: true, opacity: 0.25, side: THREE.BackSide
  });
  const sunGlow = new THREE.Mesh(sunGlowGeo, sunGlowMat);
  sunGlow.position.copy(sunMesh.position);
  scene.add(sunGlow);

  // ============ Lighting ============
  const sunLight = new THREE.DirectionalLight(0xfff4d8, 1.7);
  sunLight.position.set(60, 90, 40);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(isMobile ? 512 : 1024, isMobile ? 512 : 1024);
  sunLight.shadow.camera.left = -90;
  sunLight.shadow.camera.right = 90;
  sunLight.shadow.camera.top = 90;
  sunLight.shadow.camera.bottom = -90;
  sunLight.shadow.camera.near = 1;
  sunLight.shadow.camera.far = 260;
  sunLight.shadow.bias = -0.0005;
  scene.add(sunLight);

  const ambient = new THREE.HemisphereLight(0x8ec0e8, 0xc8a878, 0.55);
  scene.add(ambient);

  const fillLight = new THREE.DirectionalLight(0xfdc880, 0.35);
  fillLight.position.set(-40, 25, -30);
  scene.add(fillLight);
