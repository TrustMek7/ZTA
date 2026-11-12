# Plataforma de Donaciones Seguras

Prototipo académico para la fundación peruana ficticia **AQP-SOLIDARIA**, desarrollado como parte del curso **Tópicos Avanzados en Ingeniería de Software — EPIS, UNSA**.

El proyecto permitirá publicar proyectos sociales y registrar donaciones simuladas, con una arquitectura serverless en AWS y controles de seguridad basados en Zero Trust.

## Estado actual

El proyecto se encuentra en etapa de planificación. Por ahora, el repositorio contiene únicamente la documentación de requisitos y diseño; la implementación aún no ha comenzado.

## Funcionalidades previstas

- Consultar el catálogo, detalle y avance de los proyectos publicados.
- Iniciar y cerrar sesión mediante Amazon Cognito.
- Registrar y simular donaciones, evitando duplicados.
- Consultar el historial propio de donaciones.
- Crear y publicar proyectos con el rol de gestor.
- Aplicar permisos por rol y propietario, MFA para roles privilegiados y registros de auditoría.

La consulta de auditoría para el rol auditor y la autorización con Amazon Verified Permissions se contemplan como extensiones.

## Tecnologías previstas

| Área | Tecnologías |
|---|---|
| Frontend | React, TypeScript, Vite y Tailwind CSS |
| Backend | Node.js, TypeScript, AWS Lambda y API Gateway HTTP API |
| Identidad | Amazon Cognito |
| Base de datos | Amazon DynamoDB |
| Alojamiento | Amazon S3 y CloudFront |
| Infraestructura | AWS SAM / CloudFormation |
| Pruebas y CI | Vitest, Testing Library y GitHub Actions |

Las versiones y la configuración se definirán al iniciar la implementación, tomando como referencia el diseño técnico.

## Alcance académico

Las donaciones serán exclusivamente simuladas, expresadas en soles (PEN). No se realizarán cobros ni se solicitarán datos de tarjetas o cuentas bancarias. Se utilizarán usuarios y proyectos de prueba.

El despliegue está previsto en una cuenta AWS Free plan, en una sola región, con control de presupuesto y eliminación de recursos al finalizar la evaluación.

## Documentación

- [Requisitos](./requirements.md): alcance, roles, historias de usuario y criterios de aceptación.
- [Diseño técnico](./design.md): arquitectura, tecnologías, seguridad y estrategia de implementación.

Las instrucciones de instalación, ejecución, despliegue y limpieza se agregarán cuando exista una implementación.
