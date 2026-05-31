# Configuración local

[← Volver al README](../README.md)

## Requisitos previos

- [Node.js](https://nodejs.org/) 20 o superior
- Cuenta en [GitHub](https://github.com)
- (Opcional) Cuenta en [Web3Forms](https://web3forms.com/) para el formulario de contacto

## Instalación y scripts

```bash
# Ya estás en la carpeta PortafolioWeb
npm install
cp .env.example .env
# Solo si usas Avast y npm falla con UNABLE_TO_VERIFY_LEAF_SIGNATURE:
cp .npmrc.example .npmrc
```

Edita `.env` con tus valores reales (ver [Variables de entorno](variables-entorno.md)).

```bash
# Desarrollo local
npm run dev

# Build de producción
npm run build

# Vista previa del build
npm run preview
```

## Comandos útiles

```bash
npm run dev      # http://localhost:4320/PortafolioWeb
npm run build    # Genera carpeta dist/
npm run preview  # Previsualiza dist/
```

Si `npm install` falla por certificados en Windows, consulta [Solución de problemas](solucion-problemas.md).
