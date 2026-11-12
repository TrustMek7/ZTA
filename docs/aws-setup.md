# Cuenta AWS y preparación del entorno

No se han creado recursos ni invocado credenciales desde este repositorio. Los comandos de despliegue requieren ejecución supervisada por el titular de la cuenta.

## Plan sin cargos

Comprueba el nombre del plan, los créditos y la fecha de vencimiento en Facturación. Tener créditos no basta para distinguir Free plan de Paid plan. No cambies a Paid plan ni actives funciones avanzadas sin comprobar su efecto en el plan y la rúbrica. La duración y condiciones vigentes se consultan en las fuentes oficiales.

## Dos modalidades de cuenta

La documentación inicial del curso describe el acceso clásico. La nueva experiencia de AWS organiza las cuentas en proyectos y usa AWS Builder ID. En esta modalidad no se crea un usuario raíz; se invitan miembros del equipo desde AWS Settings. No debe confundirse este acceso con los usuarios DONANTE/GESTOR/AUDITOR de Cognito.

### Nueva experiencia / Builder ID

1. En AWS Settings, abre Perfil → Administrar perfil, o visita https://profile.aws.amazon.com/.
2. En Seguridad, selecciona Registrar dispositivo → Aplicación de autenticación.
3. Escanea el QR de forma privada, introduce el código TOTP actual y asigna MFA.
4. Si usaste Continuar con Google/GitHub/Apple/Amazon, revisa el segundo factor del proveedor correspondiente; AWS documenta este flujo por separado.
5. Desde Proyectos abre AWS Console para el proyecto elegido y comprueba su región y los servicios disponibles.

La nueva modalidad incorpora políticas administradas de acceso a recursos. Antes de desplegar, debe comprobarse si permite demostrar el aislamiento IAM por función que exige CA-NF03.1; no darlo por cumplido solo por definir los roles en SAM. La necesidad de cambiar modalidad o ajustar requisitos debe revisarse con el docente y el titular de la cuenta.

### Acceso clásico

1. Entra como usuario raíz para configurar MFA: nombre de cuenta → Credenciales de seguridad → MFA → Asignar dispositivo.
2. Para la aplicación no se trabaja diariamente como root. Configura las identidades del equipo y MFA según las instrucciones del curso.
3. Usa sesiones temporales para el despliegue; no compartas ni guardes claves permanentes.

## Antes del despliegue

### Confirmar la región real del proyecto (nueva experiencia)

En AWS Settings → Proyectos → el proyecto → Información general → Información adicional, consulta Región. No deducirla de la configuración del asistente, la región de CloudShell ni una recomendación del diseño. AWS asigna la región por el país de contacto; la documentación vigente incluye Perú en Ohio (`us-east-2`). Las políticas regionales de la organización pueden denegar CloudFormation en `us-east-1` aunque el servicio esté incluido en el plan.

Un `AccessDenied` con `explicit deny in a service control policy` al crear `aws-sam-cli-managed-default` no demuestra por sí solo que SAM esté prohibido o que haya que pagar. Primero confirmar región y contexto del proyecto. Si el error persiste en su región asignada, investigar la política aplicable; no intentar eludirla ni añadir AdministratorAccess para contrarrestar un Deny.

Al ejecutar `sam deploy --guided`, el prompt `SAM configuration file [samconfig.toml]` solicita un nombre de archivo: pulsa Enter para aceptar el valor. Responder `Y` ahí lo trata como nombre de archivo, no como confirmación.

- Confirmar servicios compatibles con el plan y modalidad de cuenta, región única y controles de consumo.
- Revisar con una persona distinta los permisos IAM, transacciones, código y plantilla.
- Crear alertas de consumo apropiadas al plan. Las alertas no son un interruptor de gasto.
- Ejecutar `npm run check`, `sam validate --lint -t infra/template.yaml` y `sam build -t infra/template.yaml`.
- Elegir un prefijo único para el dominio Cognito. No enviar secretos al asistente.
- La plantilla crea recursos reales al ejecutar `sam deploy`: no ejecutarlo solo para ver una vista previa local.

## Fuentes

- Comparación de modalidades: https://docs.aws.amazon.com/accounts/latest/reference/sign-up-for-aws.html
- MFA en AWS Settings: https://docs.aws.amazon.com/accounts/latest/reference/register-mfa-devices.html
- MFA raíz clásico: https://docs.aws.amazon.com/IAM/latest/UserGuide/enable-virt-mfa-for-root.html
- Planes y créditos: https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier-plans.html
- Región asignada y ubicación donde consultarla: https://docs.aws.amazon.com/accounts/latest/reference/project-regions.html
- Políticas administradas de proyectos: https://docs.aws.amazon.com/accounts/latest/reference/scps-and-rcps-for-projects.html
