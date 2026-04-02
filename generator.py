import ezdxf

def generar_dxf_maestro():
    doc = ezdxf.new('R2010')
    msp = doc.modelspace()

    # 1. Definición de Puntos (Coordenadas en cm)
    p = {
        1: (0, 0),
        2: (17, 0),
        3: (19, 11),
        4: (17, 22),
        5: (0, 22)
    }

    # 2. Definición de Trazos (Tu lógica)
    trazos = [
        {"puntos": [p[1], p[2]], "tipo": "recta"},
        {"puntos": [p[4], p[5]], "tipo": "recta"},
        {"puntos": [p[2], p[3], p[4]], "tipo": "curva"},
        {"puntos": [p[1], p[5]], "tipo": "recta"}
    ]

    for t in trazos:
        if t["tipo"] == "recta":
            # add_lwpolyline es ideal para unir múltiples puntos con rectas
            msp.add_lwpolyline(t["puntos"], dxfattribs={'color': 7})
        else:
            # add_spline crea la curva técnica que pasa por los 3 puntos
            msp.add_spline(t["puntos"], dxfattribs={'color': 1})

    doc.saveas("molde_propotipo.dxf")
    print("Archivo DXF generado: molde_propotipo.dxf")

if __name__ == "__main__":
    generar_dxf_maestro()