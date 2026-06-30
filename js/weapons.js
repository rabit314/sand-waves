  // ============ Shell Management & Pooling ============
  const shellPool = [];
  const maxPooledShells = 25;
  
  const shellGeo = new THREE.SphereGeometry(0.22, 8, 8);
  const shellMat = new THREE.MeshLambertMaterial({
    color: 0xffcc66, emissive: 0xff8800, emissiveIntensity: 2.5
  });
  const shellTrailGeo = new THREE.CylinderGeometry(0.08, 0.18, 2.4, 6);
  const shellTrailMat = new THREE.MeshBasicMaterial({
    color: 0xffaa44, transparent: true, opacity: 0.55,
    blending: THREE.AdditiveBlending, depthWrite: false
  });

  for (let i = 0; i < maxPooledShells; i++) {
    const mesh = new THREE.Mesh(shellGeo, shellMat);
    const light = new THREE.PointLight(0xff8800, 1.8, 10);
    mesh.add(light);

    const trail = new THREE.Mesh(shellTrailGeo, shellTrailMat);
    trail.rotation.x = Math.PI / 2;
    trail.position.z = 1.2;
    mesh.add(trail);

    mesh.visible = false;
    scene.add(mesh);

    shellPool.push({
      mesh,
      light,
      trail,
      active: false,
      velocity: new THREE.Vector3(),
      life: 0,
      owner: null,
      damage: 0
    });
  }

  function spawnShell(position, direction, owner, speed = 85) {
    let s = shellPool.find(item => !item.active);
    if (!s) {
      s = shellPool[0];
      let minLife = s.life;
      for (let i = 1; i < shellPool.length; i++) {
        if (shellPool[i].life < minLife) {
          minLife = shellPool[i].life;
          s = shellPool[i];
        }
      }
    }

    s.mesh.position.copy(position);
    s.velocity.copy(direction).multiplyScalar(speed);
    s.life = 3.5;
    s.owner = owner;
    s.damage = owner.isEnemy ? 18 : 28;
    s.mesh.visible = true;
    s.light.intensity = 1.8;
    s.active = true;

    const target = position.clone().add(direction);
    s.mesh.lookAt(target);
  }

  // ============ Aim Ray ============
  const raycaster = new THREE.Raycaster();
  const aimPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const aimTarget = new THREE.Vector3();

  function updateAimTarget() {
    raycaster.setFromCamera({ x: mouse.x, y: mouse.y }, camera);
    const hit = raycaster.ray.intersectPlane(aimPlane, aimTarget);
    if (hit) {
      mouse.worldX = aimTarget.x;
      mouse.worldZ = aimTarget.z;
    }
  }
