# Certificados para npm (Avast)

Si usas **Avast** con escaneo SSL/TLS activo, npm falla con `UNABLE_TO_VERIFY_LEAF_SIGNATURE` porque Node no confía en el certificado intermedio de Avast.

Este proyecto incluye `avast-root.pem` exportado del almacén de certificados de Windows para que `npm install` funcione con verificación SSL activa.

## Si el error persiste o no usas Avast

1. **Opción recomendada:** desactiva el escaneo HTTPS en tu antivirus  
   Avast → Menú → Configuración → Protección → Escudos principales → Escudo Web → activar **"Permitir escaneo HTTPS"** solo si quieres mantenerlo; para desarrollo suele bastar desmarcar escaneo SSL o excluir `node.exe`.

2. **Regenerar el certificado** (PowerShell como usuario):

```powershell
$t = (Get-ChildItem Cert:\CurrentUser\Root | Where-Object { $_.Subject -like '*Avast*' } | Select-Object -First 1).Thumbprint
$c = Get-ChildItem Cert:\CurrentUser\Root | Where-Object Thumbprint -eq $t | Select-Object -First 1
Export-Certificate -Cert $c -FilePath avast-root.cer
openssl x509 -inform der -in avast-root.cer -out avast-root.pem
```

Copia `avast-root.pem` a esta carpeta.
