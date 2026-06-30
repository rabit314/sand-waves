  // ============ Terrain Mesh ============
  const terrainSize = 400;
  const terrainSegs = 100;
  const terrainGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, terrainSegs, terrainSegs);
  terrainGeo.rotateX(-Math.PI / 2);

  const tPos = terrainGeo.attributes.position;
  const tColors = [];
  const cSand = new THREE.Color(0xd4a878);
  const cDarkSand = new THREE.Color(0x9a7448);
  const cLightSand = new THREE.Color(0xecca9c);

  for (let i = 0; i < tPos.count; i++) {
    const x = tPos.getX(i);
    const z = tPos.getZ(i);
    const h = getTerrainHeightExact(x, z);
    tPos.setY(i, h);

    const t = THREE.MathUtils.clamp((h + 5) / 10, 0, 1);
    const color = cDarkSand.clone().lerp(cLightSand, t);
    const v = (Math.sin(x * 1.3) * Math.cos(z * 1.7) + 1) * 0.5;
    color.multiplyScalar(0.88 + v * 0.24);
    tColors.push(color.r, color.g, color.b);
  }
  terrainGeo.setAttribute('color', new THREE.Float32BufferAttribute(tColors, 3));
  terrainGeo.computeVertexNormals();

  const terrainMat = new THREE.MeshLambertMaterial({
    vertexColors: true
  });
  const terrain = new THREE.Mesh(terrainGeo, terrainMat);
  terrain.receiveShadow = true;
  scene.add(terrain);

  // ============ Helper for positioning merged parts ============
  function addPart(geom, x, y, z, rx, ry, rz, materialIndex, targetList) {
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3(x, y, z);
    const rotation = new THREE.Euler(rx || 0, ry || 0, rz || 0);
    const scale = new THREE.Vector3(1, 1, 1);
    matrix.compose(position, new THREE.Quaternion().setFromEuler(rotation), scale);
    geom.applyMatrix4(matrix);
    geom.userData.materialIndex = materialIndex;
    targetList.push(geom);
  }

  // ============ Rocks and Debris ============
  function makeRockGeometry(size) {
    const geo = new THREE.DodecahedronGeometry(size, 0);
    const pos = geo.attributes.position;
    for (let j = 0; j < pos.count; j++) {
      pos.setXYZ(j,
        pos.getX(j) + (Math.random() - 0.5) * 0.35 * size,
        pos.getY(j) + (Math.random() - 0.5) * 0.35 * size,
        pos.getZ(j) + (Math.random() - 0.5) * 0.35 * size
      );
    }
    geo.computeVertexNormals();
    return geo;
  }

  const rockGeos = [];

  for (let i = 0; i < 140; i++) {
    const size = 0.35 + Math.pow(Math.random(), 2.4) * 3.2;
    const angle = Math.random() * Math.PI * 2;
    const dist = 16 + Math.random() * 175;
    const posX = Math.cos(angle) * dist;
    const posZ = Math.sin(angle) * dist;
    const posY = getTerrainHeight(posX, posZ) + size * 0.3;
    const rotX = Math.random() * Math.PI;
    const rotY = Math.random() * Math.PI;
    const rotZ = Math.random() * Math.PI;
    const scaleY = 0.5 + Math.random() * 0.4;

    const rockGeo = makeRockGeometry(size);
    const mat = new THREE.Matrix4().compose(
      new THREE.Vector3(posX, posY, posZ),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(rotX, rotY, rotZ)),
      new THREE.Vector3(1, scaleY, 1)
    );
    rockGeo.applyMatrix4(mat);

    const color = new THREE.Color().setHSL(0.07, 0.18 + Math.random() * 0.15, 0.22 + Math.random() * 0.22);
    const colors = [];
    for (let j = 0; j < rockGeo.attributes.position.count; j++) {
      colors.push(color.r, color.g, color.b);
    }
    rockGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    rockGeos.push(rockGeo);

    if (Math.random() < 0.5) {
      const debrisCount = 2 + Math.floor(Math.random() * 3);
      for (let j = 0; j < debrisCount; j++) {
        const dSize = size * (0.15 + Math.random() * 0.2);
        const a2 = Math.random() * Math.PI * 2;
        const d2 = size + Math.random() * size * 1.8;
        const dpX = posX + Math.cos(a2) * d2;
        const dpZ = posZ + Math.sin(a2) * d2;
        const dpY = getTerrainHeight(dpX, dpZ) + dSize * 0.3;
        const drX = Math.random() * Math.PI;
        const drY = Math.random() * Math.PI;
        const drZ = Math.random() * Math.PI;

        const debrisGeo = makeRockGeometry(dSize);
        const dMat = new THREE.Matrix4().compose(
          new THREE.Vector3(dpX, dpY, dpZ),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(drX, drY, drZ)),
          new THREE.Vector3(1, 0.5 + Math.random() * 0.4, 1)
        );
        debrisGeo.applyMatrix4(dMat);

        const dColors = [];
        for (let k = 0; k < debrisGeo.attributes.position.count; k++) {
          dColors.push(color.r, color.g, color.b);
        }
        debrisGeo.setAttribute('color', new THREE.Float32BufferAttribute(dColors, 3));
        rockGeos.push(debrisGeo);
      }
    }
  }

  const mergedRocksGeo = mergeBufferGeometries(rockGeos);
  for (const g of rockGeos) g.dispose();

  const sharedRockMat = new THREE.MeshLambertMaterial({
    vertexColors: true,
    flatShading: true
  });
  const mergedRocksMesh = new THREE.Mesh(mergedRocksGeo, sharedRockMat);
  mergedRocksMesh.castShadow = true;
  mergedRocksMesh.receiveShadow = true;
  scene.add(mergedRocksMesh);

  // ============ Distant Rock Mesas ============
  const mesaGeos = [];
  for (let i = 0; i < 7; i++) {
    const angle = (i / 7) * Math.PI * 2 + 0.4 + Math.random() * 0.3;
    const dist = 200 + Math.random() * 40;
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;

    const height = 22 + Math.random() * 18;
    const radius = 14 + Math.random() * 10;

    const mesaGeo = new THREE.CylinderGeometry(radius * 0.7, radius, height, 6);
    const pos = mesaGeo.attributes.position;
    for (let j = 0; j < pos.count; j++) {
      pos.setX(j, pos.getX(j) + (Math.random() - 0.5) * 3);
      pos.setZ(j, pos.getZ(j) + (Math.random() - 0.5) * 3);
    }
    mesaGeo.computeVertexNormals();

    const mat = new THREE.Matrix4().makeTranslation(x, getTerrainHeight(x, z) + height / 2 - 4, z);
    mesaGeo.applyMatrix4(mat);
    mesaGeos.push(mesaGeo);
  }

  const mergedMesasGeo = mergeBufferGeometries(mesaGeos);
  for (const g of mesaGeos) g.dispose();

  const mesaMat = new THREE.MeshLambertMaterial({
    color: 0x8a6c46,
    roughness: 0.96,
    flatShading: true
  });
  const mergedMesasMesh = new THREE.Mesh(mergedMesasGeo, mesaMat);
  mergedMesasMesh.receiveShadow = true;
  scene.add(mergedMesasMesh);
