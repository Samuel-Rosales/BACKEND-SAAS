# Módulo AIM - Autenticación

## 📍 Endpoints

### Login

Autentica un usuario y genera un token JWT.

**Endpoint:** `POST /api/v1/aim/auth/login`

**Autenticación:** No requerida

#### Request Body

```json
{
  "email": "usuario@ejemplo.com",
  "password": "contraseña123"
}
```

#### Validaciones

- `email`: Obligatorio, debe ser un email válido
- `password`: Obligatorio, mínimo 6 caracteres

#### Response (200 OK)

```json
{
  "user": {
    "id": 1,
    "email": "usuario@ejemplo.com",
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

#### Response (400 Bad Request)

```json
{
  "message": "Credenciales inválidas"
}
```

#### Ejemplo con cURL

```bash
curl -X POST http://localhost:3000/api/v1/aim/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@ejemplo.com",
    "password": "contraseña123"
  }'
```

## 🔐 Seguridad

- Las contraseñas se comparan usando bcrypt
- No se revela si el usuario existe o no (mensaje genérico)
- El token incluye el ID y email del usuario
