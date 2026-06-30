  // ============ Point Light Pool ============
  const lightPool = [];
  const maxLights = 3;
  for (let i = 0; i < maxLights; i++) {
    const pl = new THREE.PointLight(0xff8800, 0, 10);
    pl.visible = false;
    scene.add(pl);
    lightPool.push({
      light: pl,
      life: 0,
      initialIntensity: 0
    });
  }

  function spawnPointLight(position, intensity, distance, life) {
    let pLight = lightPool.find(p => !p.light.visible);
    if (!pLight) {
      pLight = lightPool[0];
      let minLife = pLight.life;
      for (let i = 1; i < lightPool.length; i++) {
        if (lightPool[i].life < minLife) {
          minLife = lightPool[i].life;
          pLight = lightPool[i];
        }
      }
    }

    pLight.light.position.copy(position);
    pLight.light.intensity = intensity;
    pLight.light.distance = distance;
    pLight.light.color.setHex(0xff8800);
    pLight.light.visible = true;
    pLight.life = life;
    pLight.initialIntensity = intensity;
  }

  function updatePointLights(dt) {
    for (let i = 0; i < lightPool.length; i++) {
      const p = lightPool[i];
      if (p.light.visible) {
        p.life -= dt;
        if (p.life <= 0) {
          p.light.visible = false;
        } else {
          p.light.intensity *= 0.82;
        }
      }
    }
  }

  // ============ Audio Event Hooks ============
  // ============ Particle System ============
  class ParticleSystem {
    constructor() {
      this.maxAdditive = 1200;
      this.maxTransparent = 1500;
      this.maxDebris = 500;

      const sphereGeo = new THREE.SphereGeometry(1, 5, 5);
      const boxGeo = new THREE.BoxGeometry(1, 1, 1);

      this.additiveMat = new THREE.MeshBasicMaterial({
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      this.setupInstanceOpacity(this.additiveMat);

      this.transparentMat = new THREE.MeshBasicMaterial({
        transparent: true,
        depthWrite: false
      });
      this.setupInstanceOpacity(this.transparentMat);

      this.debrisMat = new THREE.MeshLambertMaterial({
        color: 0x242424,
        flatShading: true
      });

      this.additiveMesh = new THREE.InstancedMesh(sphereGeo, this.additiveMat, this.maxAdditive);
      this.transparentMesh = new THREE.InstancedMesh(sphereGeo, this.transparentMat, this.maxTransparent);
      this.debrisMesh = new THREE.InstancedMesh(boxGeo, this.debrisMat, this.maxDebris);

      this.debrisMesh.castShadow = false;
      this.debrisMesh.receiveShadow = true;

      this.additiveMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.transparentMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.debrisMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

      this.additiveMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(this.maxAdditive * 3), 3);
      this.additiveMesh.instanceColor.setUsage(THREE.DynamicDrawUsage);

      this.transparentMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(this.maxTransparent * 3), 3);
      this.transparentMesh.instanceColor.setUsage(THREE.DynamicDrawUsage);

      scene.add(this.additiveMesh);
      scene.add(this.transparentMesh);
      scene.add(this.debrisMesh);

      this.additiveOpacity = new Float32Array(this.maxAdditive);
      this.additiveMesh.geometry.setAttribute('instanceOpacity', new THREE.InstancedBufferAttribute(this.additiveOpacity, 1).setUsage(THREE.DynamicDrawUsage));

      this.transparentOpacity = new Float32Array(this.maxTransparent);
      this.transparentMesh.geometry.setAttribute('instanceOpacity', new THREE.InstancedBufferAttribute(this.transparentOpacity, 1).setUsage(THREE.DynamicDrawUsage));

      this.additivePool = [];
      this.transparentPool = [];
      this.debrisPool = [];
      
      this.additiveFree = [];
      this.transparentFree = [];
      this.debrisFree = [];

      this.tempMatrix = new THREE.Matrix4();
      this.tempPosition = new THREE.Vector3();
      this.tempRotation = new THREE.Quaternion();
      this.tempScale = new THREE.Vector3();
      this.tempEuler = new THREE.Euler();
    }

    setupInstanceOpacity(material) {
      material.onBeforeCompile = (shader) => {
        shader.vertexShader = `
          attribute float instanceOpacity;
          varying float vInstanceOpacity;
        ` + shader.vertexShader.replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
           vInstanceOpacity = instanceOpacity;`
        );
        shader.fragmentShader = `
          varying float vInstanceOpacity;
        ` + shader.fragmentShader.replace(
          'diffuseColor = vec4( diffuse, opacity );',
          'diffuseColor = vec4( diffuse, opacity * vInstanceOpacity );'
        );
      };
    }

    spawn(type, config) {
      let pool, freeList, maxCount;
      if (type === 'additive') {
        pool = this.additivePool;
        freeList = this.additiveFree;
        maxCount = this.maxAdditive;
      } else if (type === 'transparent') {
        pool = this.transparentPool;
        freeList = this.transparentFree;
        maxCount = this.maxTransparent;
      } else {
        pool = this.debrisPool;
        freeList = this.debrisFree;
        maxCount = this.maxDebris;
      }

      let p;
      if (pool.length >= maxCount) {
        p = pool.shift();
      } else if (freeList.length > 0) {
        p = freeList.pop();
      } else {
        p = {
          position: new THREE.Vector3(),
          velocity: new THREE.Vector3(),
          color: new THREE.Color(),
          rotation: new THREE.Vector3(),
          rotationSpeed: new THREE.Vector3()
        };
      }

      p.position.copy(config.position);
      p.velocity.copy(config.velocity);
      p.scale = config.scale !== undefined ? config.scale : 1.0;
      if (config.color) p.color.copy(config.color);
      else p.color.setHex(0xffffff);
      p.life = config.life;
      p.maxLife = config.life;
      p.gravity = config.gravity || 0;
      p.shrink = config.shrink || false;
      p.expand = config.expand || 0;
      p.rotate = config.rotate || false;
      p.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      p.rotationSpeed.set(
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8
      );
      p.fade = config.fade !== undefined ? config.fade : true;
      p.bounce = config.bounce || false;
      p.initialOpacity = config.opacity !== undefined ? config.opacity : 1.0;

      pool.push(p);
    }

    update(dt) {
      this.updatePool(this.additivePool, this.additiveMesh, this.additiveOpacity, dt, true);
      this.updatePool(this.transparentPool, this.transparentMesh, this.transparentOpacity, dt, true);
      this.updatePool(this.debrisPool, this.debrisMesh, null, dt, false);
    }

    updatePool(pool, instancedMesh, opacityArray, dt, supportsColorAndOpacity) {
      const zeroMatrix = new THREE.Matrix4().makeScale(0, 0, 0);

      let freeList;
      if (pool === this.additivePool) freeList = this.additiveFree;
      else if (pool === this.transparentPool) freeList = this.transparentFree;
      else freeList = this.debrisFree;

      let writeIndex = 0;
      for (let i = 0; i < pool.length; i++) {
        const p = pool[i];
        p.life -= dt;

        if (p.life > 0) {
          if (writeIndex !== i) pool[writeIndex] = p;
          writeIndex++;

          p.position.x += p.velocity.x * dt;
          p.position.y += p.velocity.y * dt;
          p.position.z += p.velocity.z * dt;

          if (p.gravity) p.velocity.y += p.gravity * dt;

          if (p.rotate) {
            p.rotation.x += p.rotationSpeed.x * dt;
            p.rotation.y += p.rotationSpeed.y * dt;
            p.rotation.z += p.rotationSpeed.z * dt;
          }

          if (p.bounce) {
            const groundY = getTerrainHeight(p.position.x, p.position.z) + 0.15;
            if (p.position.y < groundY) {
              p.position.y = groundY;
              p.velocity.y *= -0.35;
              p.velocity.x *= 0.6;
              p.velocity.z *= 0.6;
            }
          }
        } else {
          freeList.push(p);
        }
      }
      pool.length = writeIndex;

      const activeCount = pool.length;
      const maxCount = instancedMesh.count;

      for (let i = 0; i < maxCount; i++) {
        if (i < activeCount) {
          const p = pool[i];
          const r = p.life / p.maxLife;

          let currentScale = p.scale;
          if (p.shrink) currentScale *= Math.max(0.01, r);
          if (p.expand) currentScale *= (1 + (1 - r) * p.expand);

          this.tempPosition.copy(p.position);
          this.tempEuler.set(p.rotation.x, p.rotation.y, p.rotation.z);
          this.tempRotation.setFromEuler(this.tempEuler);
          this.tempScale.setScalar(currentScale);

          this.tempMatrix.compose(this.tempPosition, this.tempRotation, this.tempScale);
          instancedMesh.setMatrixAt(i, this.tempMatrix);

          if (supportsColorAndOpacity) {
            instancedMesh.setColorAt(i, p.color);
            let currentOpacity = p.initialOpacity;
            if (p.fade) currentOpacity *= r;
            opacityArray[i] = currentOpacity;
          }
        } else {
          instancedMesh.setMatrixAt(i, zeroMatrix);
          if (supportsColorAndOpacity) {
            opacityArray[i] = 0.0;
          }
        }
      }

      instancedMesh.instanceMatrix.needsUpdate = true;
      if (supportsColorAndOpacity) {
        if (instancedMesh.instanceColor) instancedMesh.instanceColor.needsUpdate = true;
        if (instancedMesh.geometry.attributes.instanceOpacity) instancedMesh.geometry.attributes.instanceOpacity.needsUpdate = true;
      }
    }

    clear() {
      this.additivePool.length = 0;
      this.transparentPool.length = 0;
      this.debrisPool.length = 0;
      this.update(0.01);
    }
  }

  const particleSystem = new ParticleSystem();

  const tempPos = new THREE.Vector3();
  const tempVel = new THREE.Vector3();
  const tempColor = new THREE.Color();

  function createExplosion(position, scale = 1) {
    const fireCount = Math.floor(22 * scale);
    for (let i = 0; i < fireCount; i++) {
      tempColor.setHSL(0.05 + Math.random() * 0.1, 1, 0.55);
      tempPos.copy(position);
      tempPos.x += (Math.random() - 0.5) * scale * 1.5;
      tempPos.y += Math.random() * scale * 0.5;
      tempPos.z += (Math.random() - 0.5) * scale * 1.5;
      tempVel.set(
        (Math.random() - 0.5) * 16 * scale,
        Math.random() * 11 * scale + 2,
        (Math.random() - 0.5) * 16 * scale
      );
      particleSystem.spawn('additive', {
        position: tempPos,
        velocity: tempVel,
        scale: 0.3 * scale,
        color: tempColor,
        life: 0.6 + Math.random() * 0.4,
        gravity: -22,
        shrink: true,
        fade: true,
        opacity: 1.0
      });
    }

    const smokeCount = Math.floor(28 * scale);
    for (let i = 0; i < smokeCount; i++) {
      tempColor.setHSL(0, 0, 0.12 + Math.random() * 0.18);
      tempVel.set(
        (Math.random() - 0.5) * 9 * scale,
        Math.random() * 9 * scale + 3,
        (Math.random() - 0.5) * 9 * scale
      );
      particleSystem.spawn('transparent', {
        position: position,
        velocity: tempVel,
        scale: 0.55 * scale,
        color: tempColor,
        life: 1.5 + Math.random() * 1.2,
        gravity: -3,
        expand: 3.5,
        fade: true,
        opacity: 0.75
      });
    }

    const debrisCount = Math.floor(16 * scale);
    for (let i = 0; i < debrisCount; i++) {
      tempVel.set(
        (Math.random() - 0.5) * 22 * scale,
        Math.random() * 16 * scale + 5,
        (Math.random() - 0.5) * 22 * scale
      );
      particleSystem.spawn('debris', {
        position: position,
        velocity: tempVel,
        scale: 0.2,
        life: 1.6,
        gravity: -32,
        rotate: true,
        fade: false,
        bounce: true
      });
    }

    const splashCount = Math.floor(12 * scale);
    const sandColor = new THREE.Color(0xd4a878);
    for (let i = 0; i < splashCount; i++) {
      tempPos.copy(position);
      tempPos.y = getTerrainHeight(position.x, position.z) + 0.1;
      tempVel.set(
        (Math.random() - 0.5) * 12,
        Math.random() * 6 + 2,
        (Math.random() - 0.5) * 12
      );
      particleSystem.spawn('transparent', {
        position: tempPos,
        velocity: tempVel,
        scale: 0.2 * scale,
        color: sandColor,
        life: 0.8 + Math.random() * 0.5,
        gravity: -18,
        fade: true,
        shrink: true,
        bounce: true,
        opacity: 0.8
      });
    }

    spawnPointLight(position, 10 * scale, 28 * scale, 0.22);
    addCameraShake(scale * 0.25);
  }

  function createMuzzleFlash(position, direction) {
    const muzzleColor = new THREE.Color(0xffd060);
    for (let i = 0; i < 10; i++) {
      tempPos.copy(position).addScaledVector(direction, Math.random() * 0.6);
      tempVel.copy(direction).multiplyScalar(9 + Math.random() * 6);
      tempVel.x += (Math.random() - 0.5) * 4;
      tempVel.y += (Math.random() - 0.5) * 4;
      tempVel.z += (Math.random() - 0.5) * 4;

      particleSystem.spawn('additive', {
        position: tempPos,
        velocity: tempVel,
        scale: 0.16 + Math.random() * 0.1,
        color: muzzleColor,
        life: 0.18,
        fade: true,
        shrink: true,
        opacity: 1.0
      });
    }

    const smokeColor = new THREE.Color(0x8a8a8a);
    for (let i = 0; i < 6; i++) {
      tempVel.copy(direction).multiplyScalar(3.5);
      tempVel.x += (Math.random() - 0.5) * 2.5;
      tempVel.y += (Math.random() - 0.5) * 2.5 + 1;
      tempVel.z += (Math.random() - 0.5) * 2.5;

      particleSystem.spawn('transparent', {
        position: position,
        velocity: tempVel,
        scale: 0.22,
        color: smokeColor,
        life: 0.9,
        fade: true,
        expand: 2.2,
        opacity: 0.55
      });
    }

    spawnPointLight(position, 6, 18, 0.12);
  }

  function createDust(position, intensity = 1) {
    const dustColor = new THREE.Color(0xd4a878);
    for (let i = 0; i < 2; i++) {
      tempPos.copy(position);
      tempPos.x += (Math.random() - 0.5) * 2.2;
      tempPos.z += (Math.random() - 0.5) * 2.2;
      tempPos.y += 0.2;
      
      tempVel.set(
        (Math.random() - 0.5) * 2.5 * intensity,
        Math.random() * 1.6 + 0.5,
        (Math.random() - 0.5) * 2.5 * intensity
      );

      particleSystem.spawn('transparent', {
        position: tempPos,
        velocity: tempVel,
        scale: 0.32,
        color: dustColor,
        life: 0.9 + Math.random() * 0.5,
        fade: true,
        expand: 2.2,
        opacity: 0.45
      });
    }
  }
