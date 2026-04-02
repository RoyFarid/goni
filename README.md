# Goni – Guía de Inicio Rápido

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
```

### Datos de ejemplo para probar

```sql
-- 1. Insertar template
INSERT INTO pattern_templates (template_name, description, garment_category)
VALUES ('Falda Recta Básica', 'Bloque base de falda recta', 'Bottoms');

-- 2. Insertar lógica de trazado (fórmulas)
-- Variables técnicas
INSERT INTO drafting_logic (template_id, variable_name, formula, calculation_order, object_type)
VALUES
  (1, 'WAIST_HALF',   'waist_circ / 4',            1, 'TECHNICAL'),
  (1, 'HIP_HALF',     'hip_circ / 4',              1, 'TECHNICAL'),
  (1, 'HIP_LEVEL',    'waist_to_hip',              1, 'TECHNICAL');

-- Puntos del molde (P1...P5)
INSERT INTO drafting_logic (template_id, variable_name, formula, calculation_order, object_type)
VALUES
  (1, 'P1_X', '0',               2, 'NODE_X'),
  (1, 'P1_Y', '0',               2, 'NODE_Y'),
  (1, 'P2_X', 'WAIST_HALF',      2, 'NODE_X'),
  (1, 'P2_Y', '0',               2, 'NODE_Y'),
  (1, 'P3_X', 'HIP_HALF + 1',    2, 'NODE_X'),
  (1, 'P3_Y', 'HIP_LEVEL',       2, 'NODE_Y'),
  (1, 'P4_X', 'HIP_HALF + 1',    2, 'NODE_X'),
  (1, 'P4_Y', 'garment_length',  2, 'NODE_Y'),
  (1, 'P5_X', '0',               2, 'NODE_X'),
  (1, 'P5_Y', 'garment_length',  2, 'NODE_Y');

-- 3. Definir trazos (paths)
INSERT INTO path_definitions (template_id, path_name, node_sequence, is_curve, stroke_color)
VALUES
  (1, 'Cintura',   '["P1","P2"]',         false, '#0f172a'),
  (1, 'Costado',   '["P2","P3","P4"]',    true,  '#f43f5e'),
  (1, 'Ruedo',     '["P4","P5"]',         false, '#0f172a'),
  (1, 'Centro',    '["P5","P1"]',         false, '#0f172a');
```

---

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
