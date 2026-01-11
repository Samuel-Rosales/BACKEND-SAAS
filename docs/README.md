# Documentación API - BACKEND-SAAS

Documentación completa de la API REST del sistema SaaS.

## 📚 Índice

### Autenticación
- [Autenticación y Middleware](./authentication.md)

### Módulo AIM (Authentication, Identity & Management)
- [Autenticación (Auth)](./modules/aim/auth.md)
- [Usuarios (User)](./modules/aim/user.md)
- [Roles (Role)](./modules/aim/role.md)
- [Miembros de Negocio (Business Member)](./modules/aim/business-member.md)

### Módulo Platform
- [Negocios (Business)](./modules/platform/business.md)
- [Categorías de Negocio (Business Category)](./modules/platform/business-category.md)
- [Suscripciones (Subscription)](./modules/platform/subscription.md)

## 🔗 Base URL

```
http://localhost:3000/api/v1
```

## 🔐 Autenticación

La mayoría de los endpoints requieren autenticación mediante JWT. Incluye el token en el header:

```
Authorization: Bearer <tu_token_jwt>
```

## 📝 Convenciones

- **Métodos HTTP**: GET, POST, PATCH, DELETE
- **Formato de Respuesta**: JSON
- **Códigos de Estado**: HTTP estándar (200, 201, 400, 401, 403, 404, 500)

## 📦 Estructura de Respuestas

Todas las respuestas siguen este formato:

```json
{
  "message": "Mensaje descriptivo",
  "data": {} | [] | null,
  "status": 200
}
```

## 🚀 Inicio Rápido

1. **Autenticarse**: `POST /api/v1/aim/auth/login`
2. **Obtener token**: Guarda el token del response
3. **Usar token**: Inclúyelo en el header `Authorization` de las siguientes peticiones
