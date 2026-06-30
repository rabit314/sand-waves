  // ============ Terrain Height Function ============
  function getTerrainHeightExact(x, z) {
    let h = 0;
    h += Math.sin(x * 0.045) * Math.cos(z * 0.05) * 4.2;
    h += Math.sin(x * 0.09 + 1.0) * Math.cos(z * 0.075 + 0.5) * 1.9;
    h += Math.sin(x * 0.18) * Math.cos(z * 0.21) * 0.7;
    h += Math.sin(x * 0.4 + z * 0.32) * 0.25;
    const d = Math.sqrt(x * x + z * z);
    if (d < 18) {
      const t = d / 18;
      h *= t * t;
    }
    return h;
  }

  const terrainGridSize = 128;
  const terrainHeightData = [];
  for (let x = 0; x < terrainGridSize; x++) {
    terrainHeightData[x] = [];
    for (let z = 0; z < terrainGridSize; z++) {
      const worldX = (x / terrainGridSize) * 400 - 200;
      const worldZ = (z / terrainGridSize) * 400 - 200;
      terrainHeightData[x][z] = getTerrainHeightExact(worldX, worldZ);
    }
  }

  function getTerrainHeight(x, z) {
    const gx = Math.floor((x + 200) / 400 * terrainGridSize);
    const gz = Math.floor((z + 200) / 400 * terrainGridSize);
    const cx = Math.max(0, Math.min(terrainGridSize - 1, gx));
    const cz = Math.max(0, Math.min(terrainGridSize - 1, gz));
    return terrainHeightData[cx][cz];
  }

  // ============ Geometry Merger Utility ============
  function mergeBufferGeometries(geometries) {
    let totalVertices = 0;
    let totalIndices = 0;
    const groups = [];

    let hasNormals = false;
    let hasUVs = false;
    let hasColors = false;
    let hasIndices = false;

    for (let i = 0; i < geometries.length; i++) {
      const g = geometries[i];
      const posAttr = g.attributes.position;
      const indexAttr = g.index;
      
      const vertexCount = posAttr.count;
      const indexCount = indexAttr ? indexAttr.count : vertexCount;
      
      groups.push({
        start: totalIndices,
        count: indexCount,
        materialIndex: g.userData.materialIndex !== undefined ? g.userData.materialIndex : 0
      });
      
      totalVertices += vertexCount;
      totalIndices += indexCount;

      if (g.attributes.normal) hasNormals = true;
      if (g.attributes.uv) hasUVs = true;
      if (g.attributes.color) hasColors = true;
      if (g.index) hasIndices = true;
    }

    const mergedPos = new Float32Array(totalVertices * 3);
    const mergedNorm = hasNormals ? new Float32Array(totalVertices * 3) : null;
    const mergedUV = hasUVs ? new Float32Array(totalVertices * 2) : null;
    const mergedColor = hasColors ? new Float32Array(totalVertices * 3) : null;
    const mergedIndices = new (totalVertices > 65535 ? Uint32Array : Uint16Array)(totalIndices);

    let vertexOffset = 0;
    let indexOffset = 0;

    for (let i = 0; i < geometries.length; i++) {
      const g = geometries[i];
      const posAttr = g.attributes.position;
      const normAttr = g.attributes.normal;
      const uvAttr = g.attributes.uv;
      const colorAttr = g.attributes.color;
      const indexAttr = g.index;

      const vertexCount = posAttr.count;

      mergedPos.set(posAttr.array, vertexOffset * 3);

      if (mergedNorm) {
        if (normAttr) {
          mergedNorm.set(normAttr.array, vertexOffset * 3);
        } else {
          for (let j = 0; j < vertexCount; j++) {
            mergedNorm[(vertexOffset + j) * 3] = 0;
            mergedNorm[(vertexOffset + j) * 3 + 1] = 1;
            mergedNorm[(vertexOffset + j) * 3 + 2] = 0;
          }
        }
      }

      if (mergedUV) {
        if (uvAttr) {
          mergedUV.set(uvAttr.array, vertexOffset * 2);
        }
      }

      if (mergedColor) {
        if (colorAttr) {
          mergedColor.set(colorAttr.array, vertexOffset * 3);
        } else {
          for (let j = 0; j < vertexCount; j++) {
            mergedColor[(vertexOffset + j) * 3] = 1;
            mergedColor[(vertexOffset + j) * 3 + 1] = 1;
            mergedColor[(vertexOffset + j) * 3 + 2] = 1;
          }
        }
      }

      if (indexAttr) {
        for (let j = 0; j < indexAttr.count; j++) {
          mergedIndices[indexOffset + j] = indexAttr.array[j] + vertexOffset;
        }
        indexOffset += indexAttr.count;
      } else {
        for (let j = 0; j < vertexCount; j++) {
          mergedIndices[indexOffset + j] = j + vertexOffset;
        }
        indexOffset += vertexCount;
      }

      vertexOffset += vertexCount;
    }

    const mergedGeo = new THREE.BufferGeometry();
    mergedGeo.setAttribute('position', new THREE.BufferAttribute(mergedPos, 3));
    if (mergedNorm) mergedGeo.setAttribute('normal', new THREE.BufferAttribute(mergedNorm, 3));
    if (mergedUV) mergedGeo.setAttribute('uv', new THREE.BufferAttribute(mergedUV, 2));
    if (mergedColor) mergedGeo.setAttribute('color', new THREE.BufferAttribute(mergedColor, 3));
    mergedGeo.setIndex(new THREE.BufferAttribute(mergedIndices, 1));

    for (let i = 0; i < groups.length; i++) {
      const grp = groups[i];
      mergedGeo.addGroup(grp.start, grp.count, grp.materialIndex);
    }

    return mergedGeo;
  }
