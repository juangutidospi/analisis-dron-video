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
float wCrest = 0.0;
#ifdef USE_ROUGHNESSMAP
{
  float wWater = 1.0 - smoothstep(0.5, 0.85, texelRoughness.g);
  if (wWater > 0.0) {
    vec2 wp = vUv * uWaveScale;
    // tres ondas VIAJERAS con rumbos parecidos (el oleaje avanza, no palpita)
    float w1 = sin(dot(wp, vec2(6.3, 2.1)) - uWaveTime * 1.6);
    float w2 = sin(dot(wp, vec2(4.1, 3.4)) - uWaveTime * 1.1 + 1.7);
    float w3 = sin(dot(wp, vec2(11.7, 5.9)) - uWaveTime * 2.6 + 4.0);
    wWave = (w1 * 0.5 + w2 * 0.3 + w3 * 0.2) * wWater;
    wCrest = pow(max(0.0, wWave), 3.0) * wWater;      // pico de la onda: espuma suave
    // crestas más lisas y valles más rugosos: el destello del sol chispea
    roughnessFactor = clamp(roughnessFactor - wWave * 0.16, 0.03, 1.0);
    diffuseColor.rgb *= 1.0 + wWave * 0.10;
    diffuseColor.rgb += wCrest * 0.10;
  }
}
#endif`)
      // el terreno es sobre todo emisivo: la onda también modula el autobrillo
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
totalEmissiveRadiance *= 1.0 + wWave * 0.14 + wCrest * 0.25;`);
  };
  return time;
}
