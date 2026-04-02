import matplotlib.pyplot as plt

# Datos extraídos de la tabla
cereal = [0, 5, 15]
vid = [40, 32, 15]
etiquetas = ['A', 'B', 'C']

# Crear figura con dos subgráficos
plt.figure(figsize=(14, 6))

# --- Gráfico 1: Frontera de Posibilidades de Producción ---
plt.subplot(1, 2, 1)
plt.plot(cereal, vid, marker='o', linestyle='-', color='#1f77b4', linewidth=3, markersize=10)
plt.fill_between(cereal, vid, alpha=0.1, color='#1f77b4') # Área sombreada estilo profesional

# Etiquetas de los puntos
for i, txt in enumerate(etiquetas):
    plt.annotate(f"{txt} ({cereal[i]}, {vid[i]})", 
                 (cereal[i], vid[i]), 
                 textcoords="offset points", 
                 xytext=(15, 5), 
                 ha='left', fontsize=11, fontweight='bold')

plt.title('Frontera de Posibilidades de Producción', fontsize=14, pad=15)
plt.xlabel('Cereal (Unidades)', fontsize=12)
plt.ylabel('Vid (Unidades)', fontsize=12)
plt.xlim(0, 18)
plt.ylim(0, 45)
plt.grid(True, linestyle='--', alpha=0.5)

# --- Gráfico 2: Costo de Oportunidad ---
# Costos unitarios calculados: 8/5 = 1.6  y  17/10 = 1.7
intervalos = ['De A hacia B', 'De B hacia C']
costos = [1.6, 1.7]

plt.subplot(1, 2, 2)
barras = plt.bar(intervalos, costos, color='#b22222', width=0.5)

# Poner el valor exacto sobre cada barra
for barra in barras:
    yval = barra.get_height()
    plt.text(barra.get_x() + barra.get_width()/2, yval + 0.03, 
             f'{yval} vides', ha='center', va='bottom', fontsize=12, fontweight='bold')

plt.title('Costo de Oportunidad (Vides por 1 Cereal)', fontsize=14, pad=15)
plt.ylabel('Costo (Unidades de Vid sacrificadas)', fontsize=12)
plt.ylim(0, 2.0)
plt.grid(axis='y', linestyle='--', alpha=0.5)

# Ajustar layout y mostrar
plt.tight_layout()
plt.show()