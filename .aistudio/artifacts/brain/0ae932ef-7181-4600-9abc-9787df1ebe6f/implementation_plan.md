# Auditoría Funcional, Persistencia v3 y Sincronización Integral en Familia+

Este plan consolida las correcciones detectadas durante la auditoría integral del sistema clínico **Familia+**, garantizando que las 8 Fichas Clínicas MSP persistan sin pérdida de datos al recargar, que las reglas de seguridad de Firestore acepten todas las propiedades del perfil médico y que las visitas domiciliarias y el maletín de terreno UNAP se sincronicen en tiempo real entre médicos, manteniendo el sistema en blanco y libre de datos personales.

## User Review & Critical Decisions

> [!IMPORTANT]
> Se han confirmado las siguientes decisiones para la remediación técnica y verificación del sistema:

- **Persistencia v3 de las 8 Fichas MSP**: Unificar el prefijo de almacenamiento local del expediente de 8 fichas bajo la versión `v3` para que el limpiador automático de caché antiguo (`v2`) no elimine las fichas guardadas al recargar la aplicación.
- **Esquema Firestore de Perfiles Médicos**: Actualizar las reglas de validación de la colección `doctors` y el plano de datos para admitir campos visuales (`initials`, `avatarBg`, `photoURL`) y correos institucionales opcionales sin rechazar escrituras legítimas.
- **Sincronización en la Nube de Visitas y Maletín UNAP**: Incorporar las visitas domiciliarias y el inventario del maletín médico de terreno dentro del estado compartido multi-médico en tiempo real y suscribir la colección de visitas domiciliarias cuando el médico inicia sesión.
- **Estado Inicial en Blanco**: Conservar todas las listas clínicas vacías y el perfil predeterminado genérico (`Médico(a) Familiar de Guardia`) listos para uso clínico real inmediato.

---

## 1. Overview & Core Concept

- **What It Does**: Asegura que todos los flujos clínicos de **Familia+** (Panel del Día, 8 Fichas MSP, Consulta a Domicilio, Práctica Integral, Citas, Pediatría, Vacunas, Recetas Ley 42-01 y Configuración Multi-Médico) operen sin errores de permisos, sin pérdida de sesión local y con sincronización bidireccional en la nube.
- **Target Audience / Persona**: Médicos familiares y equipos de Unidades de Atención Primaria (UNAP / CPN) en República Dominicana que requieren confiabilidad tanto en modo local/offline como en modo sincronizado en la nube.
- **Key Value**: Elimina discrepancias de versión en el almacenamiento local y previene rechazos silenciosos en Firestore al registrar o actualizar médicos y visitas domiciliarias.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Inicio Limpio y Guardia Médica**: Al abrir la aplicación, el médico ingresa con el perfil institucional genérico o registra sus credenciales profesionales sin que ningún dato personal previo reaparezca.
  2. **Autoguardado Persistente en las 8 Fichas MSP**: Cada cambio en Historia Clínica, Consulta SOAP, Ficha Familiar, Crónicos, Prevención, Ciclo de Vida, Referencias o Visita Domiciliaria se guarda automáticamente bajo la clave `v3` local y en Firestore.
  3. **Sincronización Multi-Médico en Terreno**: Al programar o actualizar una visita domiciliaria o verificar ítems del maletín médico UNAP, los cambios se reflejan en tiempo real para el equipo del centro y persisten al recargar.
- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Interfaz clínica de alta precisión inspirada en macOS con jerarquía limpia de una sola elevación (`border border-slate-200/80`) y cero ruido visual.
  - *Color Palette & Mood*: Lienzo neutro (`#F8FAFC` / `#FFFFFF`), acento institucional esmeralda (`#0D9488`) y semántica clínica accesible para alertas (`#DC2626` urgente, `#D97706` preventivo, `#16A34A` controlado).
  - *Typography & Hierarchy*: `Plus Jakarta Sans` para encabezados y navegación, acompañada de `JetBrains Mono` (`tabular-nums`) para signos vitales, códigos CIE-10, Exequátur, NSS y calculadoras médicas.
- **Interactive Feedback & Motion**: Indicadores discretos de estado de guardado (`Guardado local` / `Sincronizado en Firebase`) y notificaciones emergentes silenciosas para hallazgos clínicos en segundo plano.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Unificación de Claves de Almacenamiento en Versión `v3`**
  - *Chosen Approach*: Migrar el prefijo de las 8 fichas clínicas y la eliminación de expedientes a la nomenclatura `v3`, manteniendo la purga exclusiva de claves `v2` obsoletas.
  - *Why*: Garantiza que ninguna ficha clínica recién creada se pierda al refrescar el navegador, mientras se asegura que los datos antiguos de `v2` nunca reaparezcan.
  - *Alternatives Considered*: Desactivar la limpieza de `v2`, descartado porque podría dejar residuos de sesiones anteriores en navegadores ya utilizados.
- **Decision 2: Validación Flexible pero Segura de `DoctorProfile` en Firestore**
  - *Chosen Approach*: Permitir explícitamente las claves `initials`, `avatarBg` y `photoURL` en las reglas de seguridad de `doctors/{doctorId}`, permitiendo `email` vacío o de hasta 140 caracteres cuando el médico se registra localmente.
  - *Why*: Evita errores de permisos (`PERMISSION_DENIED`) cuando un médico guarda su perfil completo en memoria y lo sincroniza con Firestore.
  - *Alternatives Considered*: Recortar propiedades antes de enviar a Firestore, descartado porque haría perder las iniciales y el color de avatar al sincronizar entre dispositivos.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

### Architecture & Component Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                     FAMILIA+ · ESTADO CENTRAL Y NUBE                     │
│  ┌────────────────────────────────┐   ┌───────────────────────────────┐  │
│  │ Almacenamiento Local (v3)      │   │ Firebase Firestore            │  │
│  │ · Colecciones Clínicas (v3)    │◄─►│ · /clinicState/shared_unap    │  │
│  │ · Expedientes 8 Fichas (v3)    │   │ · /clinicalRecords/{patId}    │  │
│  │ · Familiograma & Ecomapa       │   │ · /homeVisits/{visitId}       │  │
│  │ · Purga automática de v2       │   │ · /doctors/{doctorId}         │  │
│  └───────────────┬────────────────┘   └───────────────┬───────────────┘  │
└──────────────────┼────────────────────────────────────┼──────────────────┘
                   │                                    │
       ┌───────────┴────────────┬───────────────────────┴──────────┐
       ▼                        ▼                                  ▼
┌──────────────┐      ┌─────────────────────┐           ┌────────────────────┐
│ 8 Fichas MSP │      │ Consulta Domicilio  │           │ Práctica Integral  │
│ · Autoguarda │      │ · Barthel / Zarit   │           │ · Certificados Ley │
│   en v3      │      │ · Maletín UNAP sync │           │ · ARS / SIMON      │
│ · CIE-10 bg  │      │ · Acta MSP impresa  │           │ · Curvas / ASIS    │
└──────────────┘      └─────────────────────┘           └────────────────────┘
```

### Data Model & State

- **Perfil Médico (`DoctorProfile`)**: Incluye `id`, `name`, `initials`, `email`, `photoURL` (opcional), `exequatur`, `cmd`, `specialty`, `consultorio`, `unapCenter`, `shift`, `avatarBg` y `updatedAt`.
- **Estado Compartido del Centro (`clinicState/shared_unap_bundle`)**: Sincroniza `patients`, `appointments`, `pediatricList`, `vaccines`, `alerts`, `homeVisits`, `medicalBag`, `certificates`, `arsClaims` y `labTrends`.
- **Expediente de 8 Fichas (`clinicalRecords/{patientId}`)**: Almacena el paquete integral de 8 fichas MSP por paciente bajo clave local `v3` y documento remoto homólogo.

### Interactive Component & State Mapping

- **Guardado de 8 Fichas MSP**: Al editar cualquier campo en el módulo de fichas clínicas, el temporizador de autoguardado persiste el estado en la clave local `v3` y, si hay sesión activa en Firebase, actualiza `clinicalRecords/{patientId}`.
- **Eliminación y Reinicio Limpio**: Al eliminar un paciente o ejecutar el reinicio del sistema en Configuración, se limpian tanto las claves `v3` correspondientes como los documentos remotos en Firestore, conservando el sistema en blanco listo para uso real.
- **Sincronización de Visitas Domiciliarias y Maletín**: Al crear, editar o eliminar una visita domiciliaria o marcar insumos del maletín médico UNAP, se actualiza inmediatamente el estado local `v3`, el paquete compartido `shared_unap_bundle` y la colección `homeVisits`.
