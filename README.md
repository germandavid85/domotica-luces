# Domótica Luces

App estática para controlar las luces de un panel INL8 desde una red local.

## Uso

Abre `index.html` en el navegador. En el primer uso la app pide la IP o URL base del panel.

Valor típico:

```text
192.168.1.100
```

La app lo normaliza a:

```text
http://192.168.1.100
```

## Zonas

1. Sala principal
2. Habitación auxiliar
3. Pasillo
4. Estudio
5. Cocina
6. Comedor
7. Sala
8. Balcón

## Endpoints usados

```text
GET /api/v2/turn-on/{zone}
GET /api/v2/turn-off/{zone}
GET /api/v2/switch/{zone}
GET /api/v2/status/relays
GET /api/v2/status
```

Ejemplo:

```text
http://<IP_DEL_PANEL>/api/v2/turn-off/1
```

La vista de botones grandes usa el estado actual para alternar: si una zona esta encendida, el toque grande la apaga; si esta apagada, la prende. Si el navegador no puede leer el estado por CORS, usa `switch/{zone}` como respaldo.

## Nota sobre GitHub Pages

La app puede publicarse como código, pero no conviene depender de GitHub Pages para usarla: una página HTTPS pública suele bloquear llamadas a un panel local HTTP por reglas de mixed content. El uso recomendado es abrir el HTML localmente o servirlo desde la misma red local.
