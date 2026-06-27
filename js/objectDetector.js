import { APP } from "./config.js";

const MATERIAL_TO_FORM = {
  PLASTIC: "Plastico PET",
  METAL: "Metal",
  CARDBOARD: "Papel/carton",
  PAPER: "Papel/carton",
  GLASS: "Vidrio",
  ALUMINUM: "Metal",
  OTROS: "Otros"
};

const OBJECT_TO_CATEGORY = {
  KEYBOARD: "Computadoras",
  MOUSE: "Computadoras",
  LAPTOP: "Computadoras",
  MONITOR: "Computadoras",
  MOTHERBOARD: "Computadoras",
  GPU: "Computadoras",
  RAM: "Computadoras",
  HARD_DRIVE: "Computadoras",
  POWER_SUPPLY: "Computadoras",
  VEHICLE: "Otros",
  PERSON: "Otros"
};

export function detectorEndpoint() {
  return localStorage.getItem("ecored_detector_url") || APP.detectorApiUrl;
}

export async function analyzeObjectImage(file) {
  if (!file) throw new Error("Selecciona una imagen para analizar.");
  const formData = new FormData();
  formData.append("file", file);
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 18000);

  try {
    const response = await fetch(detectorEndpoint(), {
      method: "POST",
      body: formData,
      signal: controller.signal
    });

    if (!response.ok) throw new Error(`Detector no disponible (${response.status}).`);
    const result = await response.json();
    if (result.status !== "success") throw new Error(result.message || "No se pudo analizar la imagen.");
    return normalizeDetectorResult(result);
  } catch (error) {
    if (error.name === "AbortError") throw new Error("El detector tardo demasiado en responder. Revisa que el servidor IA este activo.");
    if (error.message === "Failed to fetch") throw new Error(`No se encontro el detector en ${detectorEndpoint()}. Levanta uvicorn en el puerto 8000 o configura ecored_detector_url.`);
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export function normalizeDetectorResult(result) {
  const detections = Array.isArray(result.datos) ? result.datos : [];
  const materialTotals = new Map();
  detections.forEach((item) => {
    const key = item.material || "OTROS";
    materialTotals.set(key, (materialTotals.get(key) || 0) + Number(item.peso_g || 0));
  });
  const sorted = [...materialTotals.entries()].sort((a, b) => b[1] - a[1]);
  const primary = sorted[0]?.[0] || "OTROS";

  return {
    raw: result,
    detections,
    count: Number(result.conteo_total || detections.length || 0),
    totalGrams: Number(result.peso_total_g || 0),
    totalKg: Number(result.peso_total_g || 0) / 1000,
    primaryMaterial: primary,
    recyclingMaterial: MATERIAL_TO_FORM[primary] || "Otros",
    productCategory: OBJECT_TO_CATEGORY[primary] || "Otros",
    renderedImage: result.imagen_renderizada || ""
  };
}

export function renderDetectorResult(result, mode = "reciclaje") {
  const title = mode === "producto" ? "Detector de objetos" : "Detector de material";
  const detected = result.detections.length
    ? result.detections.slice(0, 6).map((item) => `<li>${escapeHtml(item.material)} · ${Number(item.confianza || 0).toFixed(2)} · ${Number(item.peso_g || 0).toFixed(1)} g</li>`).join("")
    : "<li>No se encontraron objetos claros.</li>";

  return `
    <h3>${title}</h3>
    ${result.renderedImage ? `<img class="detector-image" src="${result.renderedImage}" alt="Imagen analizada por IA">` : ""}
    <div class="detector-summary">
      <span><strong>${result.count}</strong> objetos</span>
      <span><strong>${result.totalGrams.toFixed(1)} g</strong> estimados</span>
    </div>
    <ul class="detected-list">${detected}</ul>
    <small>Analisis referencial por vision artificial. Puedes ajustar los datos antes de publicar.</small>
  `;
}

export function detectorUnavailableMessage(error) {
  return `
    <h3>Detector IA</h3>
    <p>No se pudo conectar con el detector. Puedes publicar igual con la estimacion local.</p>
    <small>${escapeHtml(error.message || "Servicio no disponible")}</small>
  `;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
}
