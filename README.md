# Goni – Guía de Inicio Rápido

## ¿Qué es Goni?

Goni es una herramienta para generar **moldes de costura básicos a partir de medidas corporales**. La idea es mantenerlo simple: el usuario ingresa sus medidas (busto, cintura, cadera, largo, etc.), elige el tipo de prenda, y la aplicación calcula automáticamente el trazado geométrico del molde y lo entrega listo para imprimir o exportar a un programa de CAD/costura industrial (DXF).

No busca reemplazar un sistema de patronaje profesional completo, sino resolver el primer paso — obtener un molde base correcto — de forma rápida y sin necesidad de conocimientos de patronaje o de dibujo técnico.

**Flujo actual:**
1. El usuario ingresa sus medidas corporales en un perfil.
2. Selecciona el tipo de prenda (plantilla) que quiere generar.
3. Goni calcula los puntos y trazos del molde con fórmulas de patronaje configuradas en la base de datos (holgura, costura, tipo de tela, etc.).
4. El molde se muestra en un lienzo interactivo (zoom, pan, medir distancias).
5. Se exporta como PDF (impresión a escala) o DXF (CAD industrial).

**Hacia dónde va (roadmap):** cuando un usuario tenga varios moldes guardados en su biblioteca, podrá seleccionarlos e imprimirlos todos juntos usando **nesting** (acomodo automático de piezas sobre la tela para aprovechar el material y reducir desperdicio). Este nesting ya aparece como sección "Próximamente" en la interfaz, pero todavía no está implementado.

## Estructura del Proyecto

```
goni/
├── goni_backend/            ← FastAPI (Python)
│   ├── main.py
│   ├── config.py
│   ├── database.py
│   ├── auth.py
│   ├── schemas.py
│   ├── drafting_engine.py   ← Evaluador de fórmulas geométricas
│   ├── dxf_generator.py     ← Generador DXF (basado en generator.py)
│   ├── routes/
│   │   ├── auth_routes.py
│   │   ├── profiles_routes.py
│   │   └── patterns_routes.py
│   ├── requirements.txt
│   └── .env                 ← ¡Configura esto!
│
└── goni_frontend/           ← React + Vite (Frontend)
    ├── src/
    │   ├── api/client.js    ← Capa de API centralizada
    │   ├── context/AuthContext.jsx
    │   ├── components/
    │   │   ├── LeftPanel.jsx    ← Medidas corporales
    │   │   ├── PatternCanvas.jsx ← Lienzo SVG del molde
    │   │   ├── RightPanel.jsx   ← Exportar PDF/DXF
    │   │   └── LoginPage.jsx    ← Modal login/registro
    │   ├── App.jsx
    │   └── index.css
    └── .env                 ← VITE_API_URL=http://localhost:8000

> **Renombra la carpeta raíz** `EasyPattern` → `goni` desde el Explorador de Windows.
```

---

## 1. Base de Datos (PostgreSQL)

```sql
-- Crea la DB primero:
CREATE DATABASE goni;

-- Luego ejecuta el script:
\i script_create_postgres.sql
```

> Actualiza el `DATABASE_URL` en `goni_backend/.env` con el nombre de DB `goni`.

## 2. Backend (Python / FastAPI)

```bash
cd goni_backend

# Instalar dependencias
pip install -r requirements.txt

# Configurar .env
copy .env.example .env
# Editar .env: DATABASE_URL=postgresql://user:pass@localhost:5432/goni y SECRET_KEY

# Iniciar servidor
uvicorn main:app --reload --port 8000
```

Documentación interactiva disponible en: http://localhost:8000/docs

---

## 3. Frontend (React / Vite)

```bash
cd goni_frontend

# Instalar dependencias (ya instaladas)
npm install

# Iniciar servidor de desarrollo
npm run dev
```

Abre: http://localhost:5173

---

## Flujo de uso

1. Registrarse / Iniciar sesión
2. Seleccionar tipo de prenda (template) en el navbar superior
3. Crear un perfil de medidas en el panel izquierdo
4. Ingresar las medidas corporales requeridas
5. Hacer clic en **"Generar Molde"**
6. Ver el molde en el lienzo central (zoom, pan, medir distancias)
7. Exportar como **PDF** (imprimir) o **DXF** (CAD industrial)
