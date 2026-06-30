  // ============ Tank Class ============
  class Tank {
    constructor(color = 0x4a6b3a, isEnemy = false) {
      this.group = new THREE.Group();
      this.isEnemy = isEnemy;
      this.health = isEnemy ? 50 : 100;
      this.maxHealth = this.health;
      this.alive = true;
      this.speed = 0;
      this.maxSpeed = isEnemy ? 7 : 13;
      this.turnSpeed = 1.3;
      this.turretTurnSpeed = 2.2;
      this.lastFireTime = -10;
      this.fireRate = isEnemy ? 2.8 : 0.55;

      this.build(color);
      scene.add(this.group);
    }

    build(color) {
      const bodyMat = new THREE.MeshLambertMaterial({ color });
      const darkMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
      const barrelMat = new THREE.MeshLambertMaterial({
        color: new THREE.Color(color).multiplyScalar(0.55)
      });
      const detailMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
      const wheelMat = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
      const emissiveMat = new THREE.MeshLambertMaterial({ color: 0xff3a3a, emissive: 0xff3a3a, emissiveIntensity: 0.8 });

      const hullMaterials = [bodyMat, darkMat, detailMat, wheelMat];
      const turretMaterials = [bodyMat, darkMat, barrelMat, detailMat, emissiveMat];

      const hullGeos = [];
      const addHullPart = (geom, x, y, z, rx, ry, rz, matIdx) => {
        addPart(geom, x, y, z, rx, ry, rz, matIdx, hullGeos);
      };

      // Hull
      addHullPart(new THREE.BoxGeometry(3.0, 0.9, 4.4), 0, 1.15, 0, 0, 0, 0, 0);

      // Front Sloped Armor
      addHullPart(new THREE.BoxGeometry(2.9, 0.7, 0.9), 0, 0.9, 2.15, -0.45, 0, 0, 0);

      // Rear Armor
      addHullPart(new THREE.BoxGeometry(2.9, 0.6, 0.6), 0, 1.0, -2.3, 0.5, 0, 0, 0);

      // Fenders & Supports & Tracks
      for (const side of [-1, 1]) {
        addHullPart(new THREE.BoxGeometry(0.5, 0.12, 4.6), side * 1.65, 1.05, 0, 0, 0, 0, 0);

        for (let i = -1; i <= 1; i++) {
          addHullPart(new THREE.BoxGeometry(0.5, 0.4, 0.1), side * 1.65, 0.85, i * 1.5, 0, 0, 0, 1);
        }

        addHullPart(new THREE.BoxGeometry(0.7, 0.7, 4.8), side * 1.4, 0.55, 0, 0, 0, 0, 1);

        for (let i = -2.2; i <= 2.2; i += 0.4) {
          addHullPart(new THREE.BoxGeometry(0.75, 0.1, 0.15), side * 1.4, 0.25, i, 0, 0, 0, 1);
        }

        for (let i = -2; i <= 2; i++) {
          addHullPart(new THREE.CylinderGeometry(0.42, 0.42, 0.5, 8), side * 1.4, 0.5, i * 0.9, 0, 0, Math.PI / 2, 3);
        }

        for (const z of [-2.2, 2.2]) {
          addHullPart(new THREE.CylinderGeometry(0.5, 0.5, 0.5, 8), side * 1.4, 0.6, z, 0, 0, Math.PI / 2, 1);
        }
      }

      const mergedHullGeo = mergeBufferGeometries(hullGeos);
      for (const g of hullGeos) g.dispose();
      
      const hullMesh = new THREE.Mesh(mergedHullGeo, hullMaterials);
      hullMesh.castShadow = true;
      hullMesh.receiveShadow = true;
      this.group.add(hullMesh);

      // Turret Geometries
      const turretGeos = [];
      const addTurretPart = (geom, x, y, z, rx, ry, rz, matIdx) => {
        addPart(geom, x, y, z, rx, ry, rz, matIdx, turretGeos);
      };

      addTurretPart(new THREE.BoxGeometry(2.2, 0.6, 2.6), 0, 0.3, 0, 0, 0, 0, 0);
      addTurretPart(new THREE.BoxGeometry(1.9, 0.4, 2.2), 0, 0.8, 0, 0, 0, 0, 0);
      addTurretPart(new THREE.BoxGeometry(1.5, 0.7, 0.4), 0, 0.4, 1.4, -0.3, 0, 0, 0);
      addTurretPart(new THREE.CylinderGeometry(0.5, 0.5, 0.15, 8), 0, 1.05, -0.3, 0, 0, 0, 0);
      addTurretPart(new THREE.BoxGeometry(0.3, 0.05, 0.1), 0, 1.15, -0.3, 0, 0, 0, 3);
      addTurretPart(new THREE.BoxGeometry(0.9, 0.7, 0.5), 0, 0.4, 1.55, 0, 0, 0, 2);
      addTurretPart(new THREE.CylinderGeometry(0.13, 0.16, 3.8, 8), 0, 0.4, 3.3, Math.PI / 2, 0, 0, 2);
      addTurretPart(new THREE.CylinderGeometry(0.22, 0.22, 0.5, 8), 0, 0.4, 5.0, Math.PI / 2, 0, 0, 2);
      addTurretPart(new THREE.CylinderGeometry(0.022, 0.028, 1.9, 6), -0.75, 1.0, -0.8, 0, 0, 0, 3);
      addTurretPart(new THREE.SphereGeometry(0.045, 6, 6), -0.75, 1.95, -0.8, 0, 0, 0, 4);
      addTurretPart(new THREE.CylinderGeometry(0.35, 0.4, 0.3, 8), 0.5, 1.05, -0.4, 0, 0, 0, 0);

      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        addTurretPart(new THREE.SphereGeometry(0.06, 6, 6), Math.cos(a) * 0.95, 0.55, Math.sin(a) * 1.1, 0, 0, 0, 3);
      }

      for (const side of [-1, 1]) {
        addTurretPart(new THREE.BoxGeometry(0.3, 0.4, 0.8), side * 1.1, 0.4, -0.8, 0, 0, 0, 3);
      }

      const mergedTurretGeo = mergeBufferGeometries(turretGeos);
      for (const g of turretGeos) g.dispose();

      this.turretGroup = new THREE.Group();
      this.turretGroup.position.set(0, 1.65, 0);
      this.group.add(this.turretGroup);

      const turretMesh = new THREE.Mesh(mergedTurretGeo, turretMaterials);
      turretMesh.castShadow = true;
      turretMesh.receiveShadow = true;
      this.turretGroup.add(turretMesh);

      this.muzzlePoint = new THREE.Object3D();
      this.muzzlePoint.position.set(0, 0.4, 5.3);
      this.turretGroup.add(this.muzzlePoint);

      if (this.isEnemy) {
        const markerGeo = new THREE.RingGeometry(2.6, 3.1, 12);
        const markerMat = new THREE.MeshBasicMaterial({
          color: 0xff3a3a, transparent: true, opacity: 0.6, side: THREE.DoubleSide
        });
        this.marker = new THREE.Mesh(markerGeo, markerMat);
        this.marker.rotation.x = -Math.PI / 2;
        this.marker.position.y = 0.1;
        this.group.add(this.marker);
      }
    }

    reset() {
      this.group.visible = true;
      this.health = this.maxHealth;
      this.alive = true;
      this.speed = this.isEnemy ? 4.5 + Math.random() * 2.5 : 8.5;
      this.velocity = 0;
      this.lastFireTime = -10;
    }

    setPosition(x, z) {
      this.group.position.x = x;
      this.group.position.z = z;
      this.group.position.y = getTerrainHeight(x, z);
    }

    setRotation(angle) {
      this.group.rotation.y = angle;
    }

    getMuzzleWorldPosition() {
      const pos = new THREE.Vector3();
      this.muzzlePoint.getWorldPosition(pos);
      return pos;
    }

    getBodyDirection() {
      const dir = new THREE.Vector3(0, 0, 1);
      const quat = new THREE.Quaternion();
      this.group.getWorldQuaternion(quat);
      dir.applyQuaternion(quat);
      dir.y = 0;
      return dir.normalize();
    }

    update(dt) {

      if (this.marker) {
        this.marker.material.opacity = 0.4 + Math.sin(performance.now() * 0.005) * 0.25;
        const t = this.health / this.maxHealth;
        this.marker.material.color.setRGB(1, t * 0.5, t * 0.2);
      }
    }

    canFire(now) { return now - this.lastFireTime > this.fireRate; }

    fire(now) { this.lastFireTime = now; }

    takeDamage(dmg) {
      if (!this.alive) return false;
      this.health -= dmg;
      if (this.health <= 0) {
        this.health = 0;
        this.alive = false;
        return true;
      }
      return false;
    }
  }

  // ============ Player Tank ============
  const player = new Tank(0x4a6b3a, false);
  player.setPosition(0, 0);

  // ============ Enemy Management ============
  const enemies = [];
  const deadEnemies = [];

  function spawnEnemy() {
    const angle = Math.random() * Math.PI * 2;
    const dist = 55 + Math.random() * 70;
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;
    let enemy;
    if (deadEnemies.length > 0) {
      enemy = deadEnemies.pop();
      enemy.reset();
    } else {
      enemy = new Tank(0x9a7848, true);
    }
    enemy.setPosition(x, z);
    enemy.setRotation(Math.atan2(-x, -z));
    enemies.push(enemy);
    return enemy;
  }
