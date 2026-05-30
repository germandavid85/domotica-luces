# Domótica Luces

App estática, autocontenida en un solo `index.html`, para controlar las luces de un panel INL8 desde una red local.

## Uso

Abre `index.html` directamente en el navegador. En el primer uso la app pide la IP o URL base del panel.

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
```

Ejemplo:

```text
http://<IP_DEL_PANEL>/api/v2/turn-off/1
```

La vista de botones grandes usa `switch/{zone}` para alternar sin leer estado. Los botones Encender y Apagar usan endpoints explícitos.

## Nota de navegador

La app dispara los comandos cargando el endpoint en un `iframe` oculto para evitar depender de CORS. Eso permite usar el HTML como archivo local, pero no permite confirmar la respuesta real del panel desde JavaScript.
