# botao-gpio → Shinobi (Raspberry Pi)

Serviço em **TypeScript/Node.js** para Raspberry Pi que monitora botões físicos via **GPIO** e dispara o endpoint de **motion trigger** do **Shinobi** (em `localhost:8080`) para um ou mais monitores.

Repo: https://github.com/Gravae-Tecnologia/botao-gpio

## O que ele faz

- Monitora GPIOs com detecção de borda **falling** (botão em pull-up)
- Aplica **debounce** (anti-ruído) e **cooldown** por pino (anti-spam)
- Ao pressionar um botão, dispara 1 ou mais `monitorSlugs` no Shinobi via HTTP GET
- Loga cada disparo em `logs/button_presses_details.txt`
- Fecha GPIO corretamente em SIGINT/SIGTERM
- Requests HTTP não bloqueiam o loop (fire-and-forget)

---

## Requisitos

- Raspberry Pi OS / Debian
- **Node.js 18+**
- Shinobi rodando localmente em `http://127.0.0.1:8080`
- PM2 instalado globalmente (`npm i -g pm2`)
- Acesso a GPIO (pode exigir permissões/grupo dependendo do OS)

---

## Instalação

```bash
git clone https://github.com/Gravae-Tecnologia/botao-gpio
cd botao-gpio
yarn
yarn build
```

---

## Configuração

Edite `src/botao.ts`.

### 1) Config do site (global)

Se `apiKey` e `groupKey` são iguais para todos os monitores, deixe em uma config única:

```ts
const SITE = {
  apiKey: "SEU_API_KEY",
  groupKey: "SEU_GROUP_KEY",
};
```

### 2) Botões (GPIO → lista de `monitorSlugs`)

**Não dá** para repetir a chave `6` em um objeto. Se um pino deve disparar 2 monitores, use lista:

```ts
const BUTTONS: Partial<Record<GPIO, { monitorSlugs: string[] }>> = {
  26: { monitorSlugs: ["cancha01_camera01"] },
  19: { monitorSlugs: ["cancha02_camera01"] },
  13: { monitorSlugs: ["cancha03_camera01"] },
  6: { monitorSlugs: ["cancha04_camera01", "cancha04_camera02"] },
};
```

### 3) Parâmetros

```ts
const DEBOUNCE_MS = 200; // anti-ruído do botão
const COOLDOWN_MS = 5000; // trava repetição por pino
const HTTP_TIMEOUT_MS = 3000; // timeout do request
```

### 4) Payload `data=...`

```ts
const MOTION_DATA =
  "{plug:Quadra1,name:stairs,reason:motion,confidence:197.4755859375}";
```

O código aplica `encodeURIComponent(MOTION_DATA)` para evitar quebrar a URL.

---

## Rodar (teste rápido)

```bash
node dist/botao.js
```

Saída esperada:

- `🟢 Iniciando botões GPIO...`
- `✅ Botões ativos`

Ao apertar um botão:

- `🔘 Aperto registrado na <monitorSlug> (<pin>)`
- `✔ <monitorSlug> → 200`

---

## Rodar com PM2 (produção)

### Start

```bash
pm2 start "npm run start" --name botao-gpio
pm2 save
pm2 list
```

### Logs

```bash
pm2 logs botao-gpio
```

### Restart / Stop

```bash
pm2 restart botao-gpio
pm2 stop botao-gpio
```

### Auto-start no boot

No Raspberry, rode **uma vez**:

```bash
pm2 startup
# copie e rode o comando que o PM2 imprimir (com sudo)
pm2 save
```

---

## Logs (arquivo)

- Arquivo: `logs/button_presses_details.txt`
- Formato:
  ```
  2025-12-16T13:10:00.123Z - cancha04_camera01
  ```

---

## Troubleshooting

### 1) Nada acontece ao apertar o botão

- Confirme pino correto em `BUTTONS`
- Confirme wiring (GPIO + GND)
- Confirme se o Shinobi responde:
  ```bash
  curl -I http://127.0.0.1:8080/
  ```

### 2) Permission denied / erro de GPIO

- Teste rodando como root (apenas para diagnosticar)
- Ajuste permissões/grupo do usuário dependendo do OS

### 3) Request falha (timeout/ECONNREFUSED)

- Shinobi caiu
- Porta diferente de 8080
- apiKey / groupKey errados
- monitorSlug errado

---

## Segurança

Esse projeto chama `localhost`. Não exponha o Shinobi publicamente sem proteção (auth + reverse proxy + firewall).

---

## Licença

Defina a licença do repositório (MIT/Apache-2.0/etc) ou remova esta seção.
