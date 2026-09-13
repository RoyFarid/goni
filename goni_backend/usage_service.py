from database import get_db

def log_usage(
    action_type: str,
    user_id: str = None,
    guest_id: str = None,
    template_id: int = None,
    user_agent: str = None,
    ip_address: str = None
):
    """
    Registra una acción en la tabla usage_logs de la base de datos.
    """
    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO usage_logs (user_id, guest_id, action_type, template_id, user_agent, ip_address)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    """,
                    (user_id, guest_id, action_type, template_id, user_agent, ip_address)
                )
    except Exception as e:
        # Error silencioso en el log para no interrumpir el flujo principal
        print(f"ERROR: log_usage failed: {e}")

def get_usage_count(action_type: str, guest_id: str = None, user_id: str = None, ip_address: str = None) -> int:
    """
    Cuenta cuántas veces se ha realizado una acción específica *en el mes en curso*
    (los planes son cuotas mensuales, no de por vida).

    Para invitados (sin cuenta) se cuenta lo que sea mayor entre el conteo por
    guest_id y por ip_address, para que borrar el localStorage del navegador no
    sea una forma trivial de resetear el límite gratuito.
    """
    try:
        from database import get_db, dict_cursor
        with get_db() as conn:
            cur = dict_cursor(conn)
            if user_id:
                cur.execute(
                    """
                    SELECT COUNT(*) AS count FROM usage_logs
                    WHERE user_id = %s AND action_type = %s
                      AND created_at >= date_trunc('month', now())
                    """,
                    (user_id, action_type)
                )
                row = cur.fetchone()
                return row["count"] if row else 0

            counts = [0]
            if guest_id:
                cur.execute(
                    """
                    SELECT COUNT(*) AS count FROM usage_logs
                    WHERE guest_id = %s AND action_type = %s
                      AND created_at >= date_trunc('month', now())
                    """,
                    (guest_id, action_type)
                )
                row = cur.fetchone()
                counts.append(row["count"] if row else 0)

            if ip_address:
                cur.execute(
                    """
                    SELECT COUNT(*) AS count FROM usage_logs
                    WHERE ip_address = %s AND action_type = %s
                      AND created_at >= date_trunc('month', now())
                    """,
                    (ip_address, action_type)
                )
                row = cur.fetchone()
                counts.append(row["count"] if row else 0)

            return max(counts)
    except Exception as e:
        print(f"ERROR: get_usage_count failed: {e}")
        return 0

def get_plan_limits(plan_id: str) -> dict:
    """
    Retorna los límites configurados para un plan específico.
    """
    try:
        from database import get_db, dict_cursor
        with get_db() as conn:
            cur = dict_cursor(conn)
            cur.execute(
                "SELECT max_profiles, max_downloads_month, max_prints_month FROM membership_plans WHERE plan_id = %s",
                (plan_id,)
            )
            return cur.fetchone()
    except Exception as e:
        print(f"ERROR: get_plan_limits failed: {e}")
        return None
