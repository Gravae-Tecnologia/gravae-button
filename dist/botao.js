import { Gpio } from "onoff";
import axios from "axios";
import fs from "node:fs";
import path from "node:path";
import { SITE, BUTTONS, SHINOBI_BASE_URL, DEBOUNCE_MS, COOLDOWN_MS, HTTP_TIMEOUT_MS, REGION_NAME, CONFIDENCE, } from "./config.js";
const LOG_DIR = path.resolve(process.cwd(), "logs");
if (!fs.existsSync(LOG_DIR))
    fs.mkdirSync(LOG_DIR, { recursive: true });
function logLine(filename, line) {
    fs.appendFileSync(path.join(LOG_DIR, filename), line, { encoding: "utf8" });
}
function logPress(name, pin) {
    const line = `${new Date().toISOString()} - pin:${pin} - ${name}\n`;
    logLine("button_presses_details.txt", line);
}
const cooldownExpire = {};
const gpios = {};
function buildMotionData(monitorSlug) {
    // payload JSON esperado pelo Shinobi
    return JSON.stringify({
        plug: monitorSlug,
        name: REGION_NAME,
        reason: "motion",
        confidence: CONFIDENCE,
    });
}
function buildUrl(site, monitorSlug) {
    const data = buildMotionData(monitorSlug);
    return `${SHINOBI_BASE_URL}/${site.apiKey}/motion/${site.groupKey}/${monitorSlug}?data=${encodeURIComponent(data)}`;
}
async function sendRequest(url, name) {
    try {
        const res = await axios.get(url, { timeout: HTTP_TIMEOUT_MS });
        console.log(`✔ ${name} → ${res.status}`);
    }
    catch (err) {
        console.error(`✖ ${name} → ${err?.message ?? String(err)}`);
    }
}
function setupPin(pin, cfg) {
    const gpio = new Gpio(pin, "in", "falling", { debounceTimeout: DEBOUNCE_MS });
    cooldownExpire[pin] = 0;
    gpios[pin] = gpio;
    gpio.watch((err) => {
        if (err) {
            console.error(`GPIO ${pin} error`, err);
            process.exit(1);
        }
        const now = Date.now();
        if (now < cooldownExpire[pin])
            return;
        cooldownExpire[pin] = now + COOLDOWN_MS;
        // cfg agora é um array de monitor slugs
        for (const monitorSlug of cfg) {
            const name = monitorSlug;
            const url = buildUrl(SITE, monitorSlug);
            console.log(`🔘 Aperto registrado na ${name} (${pin})`);
            logPress(name, pin);
            void sendRequest(url, name);
        }
    });
}
function shutdown(code = 0) {
    console.log("🛑 Encerrando botões...");
    for (const pin of Object.keys(gpios)) {
        try {
            gpios[Number(pin)].unexport();
        }
        catch { }
    }
    process.exit(code);
}
process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
process.on("uncaughtException", (e) => {
    console.error("uncaughtException", e);
    shutdown(1);
});
process.on("unhandledRejection", (e) => {
    console.error("unhandledRejection", e);
    shutdown(1);
});
console.log("🟢 Iniciando botões GPIO...");
for (const [pinStr, cfg] of Object.entries(BUTTONS)) {
    if (!cfg)
        continue;
    setupPin(Number(pinStr), cfg);
}
console.log("✅ Botões ativos");
