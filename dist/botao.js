import { Gpio } from "onoff";
import axios from "axios";
import fs from "node:fs";
import path from "node:path";
const LOG_DIR = path.resolve(process.cwd(), "logs");
if (!fs.existsSync(LOG_DIR))
    fs.mkdirSync(LOG_DIR, { recursive: true });
function logLine(filename, line) {
    fs.appendFileSync(path.join(LOG_DIR, filename), line, { encoding: "utf8" });
}
function logPress(name) {
    const line = `${new Date().toISOString()} - ${name}\n`;
    logLine("button_presses_details.txt", line);
}
// ========================== CONFIG ==========================
const SITE = {
    apiKey: "BfXF0LOk10eFqltdZtlu3VslrttTyL",
    groupKey: "ElMirador",
};
const BUTTONS = {
    6: { monitorSlugs: ["cancha04_camera01", "cancha04_camera02"] },
    26: { monitorSlugs: ["cancha01_camera01"] },
    19: { monitorSlugs: ["cancha02_camera01"] },
    13: { monitorSlugs: ["cancha03_camera01"] },
};
const SHINOBI_BASE_URL = "http://127.0.0.1:8080";
const MOTION_DATA = "{plug:Quadra1,name:stairs,reason:motion,confidence:197.4755859375}";
const DEBOUNCE_MS = 200;
const COOLDOWN_MS = 5000;
const HTTP_TIMEOUT_MS = 3000;
// ============================================================
const cooldownExpire = {};
const gpios = {};
function buildUrl(site, monitorSlug) {
    // mantém o padrão; encode no data pra não quebrar query
    return `${SHINOBI_BASE_URL}/${site.apiKey}/motion/${site.groupKey}/${monitorSlug}?data=${encodeURIComponent(MOTION_DATA)}`;
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
        // dispara para todos os slugs desse pin
        for (const monitorSlug of cfg.monitorSlugs) {
            const name = monitorSlug;
            const url = buildUrl(SITE, monitorSlug);
            console.log(`🔘 Aperto registrado na ${name} (${pin})`);
            logPress(name);
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
