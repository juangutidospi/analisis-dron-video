// Oleaje del agua en el visor 3D: parche del shader del terreno (MeshStandardMaterial)
// que anima el brillo y la rugosidad SOLO donde la máscara de agua (roughnessMap,
// canal G bajo) marca agua. Dos octavas de senos que se desplazan: el destello del
// sol chispea y la lámina de agua ondula, sin geometría ni texturas extra.

const WAVELEN = 45; // longitud de onda aproximada del oleaje (m)

/**
 * @param {object} mat MeshStandardMaterial del terreno, con roughnessMap = máscara de agua
 * @param {number} spanX ancho del terreno (m)  @param {number} spanZ fondo del terreno (m)
 * @returns {{value:number}} uniform de tiempo (s): avanzarlo cada frame anima el oleaje
 */
export function applyWaterWaves(mat, spanX, spanZ) {
  const time = { value: 0 };
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uWaveTime = time;
    shader.uniforms.uWaveScale = { value: [spanX / WAVELEN, spanZ / WAVELEN] };
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uWaveTime;\nuniform vec2 uWaveScale;')
      // tras muestrear la máscara (texelRoughness): la onda solo actúa en el agua
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
float wWave = 0.0;
#ifdef USE_ROUGHNESSMAP
{
  float wWater = 1.0 - smoothstep(0.5, 0.85, texelRoughness.g);
  if (wWater > 0.0) {
    vec2 wp = vUv * uWaveScale;
    float wA = sin(wp.x * 6.2832 + uWaveTime * 1.1) * sin(wp.y * 8.9 - uWaveTime * 0.8);
    float wB = sin(wp.x * 3.7 - wp.y * 5.2 + uWaveTime * 1.7);
    wWave = (wA * 0.6 + wB * 0.4) * wWater;
    // crestas más lisas y valles más rugosos: el destello del sol chispea
    roughnessFactor = clamp(roughnessFactor - wWave * 0.10, 0.04, 1.0);
    diffuseColor.rgb *= 1.0 + wWave * 0.05;
  }
}
#endif`)
      // el terreno es sobre todo emisivo: la onda también modula el autobrillo
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
totalEmissiveRadiance *= 1.0 + wWave * 0.06;`);
  };
  return time;
}
