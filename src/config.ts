export type GPIO = 26 | 19 | 13 | 6 | 5 | 21 | 20 | 16;
 
export const SHINOBI_BASE_URL = "http://127.0.0.1:8080";
 
export const DEBOUNCE_MS = 200;
export const COOLDOWN_MS = 5000;
export const HTTP_TIMEOUT_MS = 3000;
 
export const REGION_NAME = "gpio_button";
export const CONFIDENCE = 197.4755859375;
 
export type SiteConfig = {
  apiKey: string;
  groupKey: string;
};
 
export type ButtonConfig = string[];
 

export const SITE: SiteConfig = {
  apiKey: "123456",
  groupKey: "ArenaVarandas",
 };
 
export const BUTTONS: Partial<Record<GPIO, ButtonConfig>> = {
  "19": [
    "quada02_camea01",
    "quada02_camea02"
  ],
  "26": [
    "quada01_camea01",
    "quada01_camea02"
  ]
};
