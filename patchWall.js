import fs from 'fs';

const content = fs.readFileSync('src/components/ThreeBuildingView.tsx', 'utf8');

const startMarker = "          if (wDef.isHorizontal) {";
const endMarker = "            }\n          }\n        });";

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker) + endMarker.length - 13; 
// we want to include "        });" but endMarker has "            }\n          }\n        });"
// Let's just do a string replacement.

const oldBlock = content.substring(startIndex, content.indexOf("        });", startIndex));

const newBlock = `          const wallGroup = new THREE.Group();
          wallGroup.position.set(wDef.x, 0, wDef.z);
          wallGroup.rotation.y = wDef.rotationY;
          floorGroup.add(wallGroup);

          const localW = wDef.length;
          
          if (isGroundFloor && isEntranceFacade) {
            const doorW = 2.4;
            const doorH = Math.min(2.4, roomHeight - 0.2);
            const sidePiersW = (localW - doorW) / 2;

            for (const sign of [-1, 1]) {
              const pMesh = new THREE.Mesh(new THREE.BoxGeometry(sidePiersW, roomHeight, wallThick), currentMat);
              pMesh.position.set(sign * (doorW / 2 + sidePiersW / 2), midY, 0);
              pMesh.castShadow = !isXRay; pMesh.receiveShadow = true;
              wallGroup.add(pMesh);
            }
            
            const lintelH = roomHeight - doorH;
            if (lintelH > 0.1) {
              const lintelMesh = new THREE.Mesh(new THREE.BoxGeometry(doorW, lintelH, wallThick), wallMaterial);
              lintelMesh.position.set(0, baseY + slabThickness + doorH + lintelH / 2, 0);
              wallGroup.add(lintelMesh);
            }

            const canopyMesh = new THREE.Mesh(new THREE.BoxGeometry(doorW + 1.2, 0.14, 1.4), frameMaterial);
            canopyMesh.position.set(0, baseY + slabThickness + doorH + 0.1, 0.7);
            canopyMesh.castShadow = true;
            wallGroup.add(canopyMesh);

            const signMesh = new THREE.Mesh(new THREE.BoxGeometry(doorW * 0.8, 0.3, 0.08), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
            signMesh.position.set(0, baseY + slabThickness + doorH + 0.35, 0.12);
            wallGroup.add(signMesh);

            const doorFrameMesh = new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH, 0.12), frameMaterial);
            doorFrameMesh.position.set(0, baseY + slabThickness + doorH / 2, 0);
            wallGroup.add(doorFrameMesh);

            const doorGlass = new THREE.Mesh(new THREE.BoxGeometry(doorW - 0.2, doorH - 0.2, 0.06), glassMaterial);
            doorGlass.position.copy(doorFrameMesh.position);
            wallGroup.add(doorGlass);
          } else if (winCount === 0) {
            const solidWall = new THREE.Mesh(new THREE.BoxGeometry(localW, roomHeight, wallThick), currentMat);
            solidWall.position.set(0, midY, 0);
            solidWall.castShadow = !isXRay; solidWall.receiveShadow = true;
            wallGroup.add(solidWall);
          } else {
            const winWidth = Math.min(1.8, (localW - 1) / (winCount + 1));
            const winHeight = 1.5;
            const winSill = 0.9;
            const pierW = (localW - winCount * winWidth) / (winCount + 1);

            for (let p = 0; p <= winCount; p++) {
              const px = -localW / 2 + pierW / 2 + p * (pierW + winWidth);
              const pierMesh = new THREE.Mesh(new THREE.BoxGeometry(pierW, roomHeight, wallThick), currentMat);
              pierMesh.position.set(px, midY, 0);
              pierMesh.castShadow = !isXRay; pierMesh.receiveShadow = true;
              wallGroup.add(pierMesh);

              if (p < winCount) {
                const wx = px + pierW / 2 + winWidth / 2;
                
                const sillMesh = new THREE.Mesh(new THREE.BoxGeometry(winWidth, winSill, wallThick), wallMaterial);
                sillMesh.position.set(wx, baseY + slabThickness + winSill / 2, 0);
                wallGroup.add(sillMesh);

                const lintelH = roomHeight - (winSill + winHeight);
                if (lintelH > 0.05) {
                  const lintelMesh = new THREE.Mesh(new THREE.BoxGeometry(winWidth, lintelH, wallThick), wallMaterial);
                  lintelMesh.position.set(wx, baseY + slabThickness + winSill + winHeight + lintelH / 2, 0);
                  wallGroup.add(lintelMesh);
                }

                const glassMesh = new THREE.Mesh(new THREE.BoxGeometry(winWidth, winHeight, 0.06), glassMaterial);
                glassMesh.position.set(wx, baseY + slabThickness + winSill + winHeight / 2, 0);
                wallGroup.add(glassMesh);

                const frameGeo = new THREE.BoxGeometry(winWidth + 0.04, winHeight + 0.04, 0.08);
                const line = new THREE.LineSegments(
                  new THREE.EdgesGeometry(frameGeo),
                  new THREE.LineBasicMaterial({ color: isLight ? 0x64748b : 0x27272a })
                );
                line.position.copy(glassMesh.position);
                wallGroup.add(line);
              }
            }
          }

          if (hasBalc && bD > 0.3) {
            const balcWidth = Math.min(localW * 0.4, 4.5);
            const balcOffsetZ = bD / 2 + wallThick / 2; // offset outside wall
            
            for (let b = 0; b < balcCount; b++) {
              const balcX = balcCount === 1 ? -localW * 0.22 : (b === 0 ? -localW * 0.25 : localW * 0.25);
              const balcSlab = new THREE.Mesh(new THREE.BoxGeometry(balcWidth, 0.2, bD), slabMaterial);
              balcSlab.position.set(balcX, baseY + 0.1, balcOffsetZ);
              balcSlab.castShadow = true;
              wallGroup.add(balcSlab);

              const railH = 1.05;
              const railZ = balcOffsetZ + bD / 2;
              const railMesh = new THREE.Mesh(new THREE.BoxGeometry(balcWidth, railH, 0.05), glassMaterial);
              railMesh.position.set(balcX, baseY + 0.2 + railH / 2, railZ);
              wallGroup.add(railMesh);

              const handrail = new THREE.Mesh(new THREE.BoxGeometry(balcWidth + 0.04, 0.06, 0.08), frameMaterial);
              handrail.position.set(balcX, baseY + 0.2 + railH, railZ);
              wallGroup.add(handrail);
            }
          }`;

if (startIndex === -1 || content.indexOf("        });", startIndex) === -1) {
  console.log("Could not find blocks");
} else {
  const newContent = content.replace(oldBlock, newBlock);
  fs.writeFileSync('src/components/ThreeBuildingView.tsx', newContent);
  console.log("Patched successfully");
}
