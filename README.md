# Volkern Appointment Booking App

Una aplicación de agendamiento de citas premium, moderna y robusta, integrada con el CRM de Volkern. Diseñada para ofrecer una experiencia de usuario de alto nivel con un enfoque en la velocidad de conversión y diseño impecable.

## 🚀 Características

- **Diseño Premium**: Interfaz moderna con efectos de Glassmorphism, animaciones fluidas (`framer-motion`) y modo oscuro integrado.
- **Flujo de Reserva Inteligente**: Selección de servicios, selector de fecha/hora con disponibilidad en tiempo real y captura de leads.
- **Integración con Volkern CRM**: Sincronización automática de leads y citas.
- **Resiliencia de API**: Sistema de proxy interno para manejar autenticación y fallbacks automáticos para el catálogo de servicios.
- **Notificaciones**: Confirmaciones por email automáticas vía Resend.

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS v4
- **Iconografía**: Lucide React
- **Animaciones**: Framer Motion
- **Email**: Resend
- **API**: Volkern CRM

## ⚙️ Configuración (Vercel / Local)

Para desplegar la aplicación, utiliza las siguientes variables de entorno:

| Variable | Descripción |
| :--- | :--- |
| `VOLKERN_API_KEY` | Tu API Key de Volkern. |
| `VOLKERN_BASE_URL` | `https://volkern.app/api` |
| `RESEND_API_KEY` | API Key de Resend para notificaciones por email. |
| `CONSULTANT_EMAIL` | Email del consultor que recibe las notificaciones. |
| `NEXT_PUBLIC_APP_URL` | URL base de la aplicación (producción). |

## 📦 Instalación Local

1. Clonar el repositorio.
2. Crear un archivo `.env.local` con las variables mencionadas.
3. Instalar dependencias: `npm install`
4. Ejecutar en desarrollo: `npm run dev`

---
Desarrollado con ❤️ por **Antigravity** para **DeXpertmx**.
