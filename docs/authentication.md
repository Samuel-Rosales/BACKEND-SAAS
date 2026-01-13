# Autenticación y Middleware

## 🔐 Sistema de Autenticación

El sistema utiliza **JWT (JSON Web Tokens)** para la autenticación de usuarios.

## 📋 Flujo de Autenticación

1. El usuario se autentica con ci y contraseña
2. El servidor genera un token JWT
3. El cliente guarda el token
4. El cliente incluye el token en cada petición posterior

## 🔑 Obtener Token

### Endpoint
```
POST /api/v1/aim/auth/login
```

### Request Body
```json
{
  "ci": "123456789",
  "password": "contraseña123"
}
```

### Response (200 OK)
```json
{
  "user": {
    "id": 1,
    "name": "Juan Pérez",
    "ci": "12345678",
    "memberships": [
      {
        "businessId": 1,
        "businessName": "Mi Negocio",
        "role": "Administrador",
        "roleCode": "OWNER"
      }
    ]
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "availableBusinesses": [
    {
      "businessId": 1,
      "businessName": "Mi Negocio",
      "role": "Administrador",
      "roleCode": "OWNER"
    }
  ]
}
```

## 🛡️ Middleware de Autenticación

### Uso en Rutas

El middleware `authMiddleware` se aplica a las rutas que requieren autenticación:

```typescript
import { authMiddleware } from '@/middlewares/auth.middleware';

router.use(authMiddleware); // Protege todas las rutas
```

### Headers Requeridos

```
Authorization: Bearer <token_jwt>
```

### Headers Opcionales

```
x-business-id: <business_id>  // Para operaciones multi-tenant
```

### Comportamiento

1. **Verifica el token**: Valida que el token sea válido y no esté expirado
2. **Verifica el usuario**: Confirma que el usuario existe en la base de datos (consulta adicional por seguridad)
3. **Inyecta datos**: Agrega `req.user` con los datos del usuario autenticado:
   ```typescript
   {
     id: number;           // ID del usuario
     businessId?: number;  // ID del negocio (si está presente en el header x-business-id)
     // ... otros campos del usuario
   }
   ```
4. **Valida businessId**: Si se proporciona el header `x-business-id`, se valida que el usuario tenga acceso a ese negocio

### Respuestas de Error

#### 401 - Token Faltante
```json
{
  "message": "No autorizado. Token faltante."
}
```

#### 401 - Token Inválido
```json
{
  "message": "Token inválido o expirado."
}
```

#### 401 - Usuario No Encontrado
```json
{
  "message": "Usuario no encontrado."
}
```

## 🔒 Rutas Protegidas

Las siguientes rutas requieren autenticación mediante `authMiddleware`:

### Módulo AIM
- ✅ `/api/v1/aim/business-member/*` - Todas las rutas de miembros de negocio
- ✅ `/api/v1/aim/contact/*` - Todas las rutas de contactos
- ✅ `/api/v1/aim/user/*` - Rutas de lectura, actualización y eliminación (POST no requiere autenticación)
- ❌ `/api/v1/aim/role/*` - No requiere autenticación (configurable)
- ❌ `/api/v1/aim/auth/login` - No requiere autenticación (endpoint público)

### Módulo Platform
- ✅ `/api/v1/platform/business/*` - Todas las rutas de negocios
- ✅ `/api/v1/platform/business-category/*` - Todas las rutas de categorías de negocio
- ✅ `/api/v1/platform/subscription/*` - Todas las rutas de suscripciones

### Módulo Inventory
- ✅ Todas las rutas requieren autenticación

### Módulo Finance
- ✅ Todas las rutas requieren autenticación

### Módulo Procurement
- ✅ Todas las rutas requieren autenticación

## 📝 Notas

- El token tiene una expiración configurada (por defecto: 1 día)
- El token debe renovarse cuando expire
- El middleware verifica la existencia del usuario en cada petición para mayor seguridad
