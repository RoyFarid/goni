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

def get_usage_count(action_type: str, guest_id: str = None, user_id: str = None) -> int:
    """
    Cuenta cuántas veces se ha realizado una acción específica.
    """
    try:
        from database import get_db
        with get_db() as conn:
            with conn.cursor() as cur:
                if user_id:
                    cur.execute(
                        "SELECT COUNT(*) FROM usage_logs WHERE user_id = %s AND action_type = %s",
                        (user_id, action_type)
                    )
                else:
                    cur.execute(
                        "SELECT COUNT(*) FROM usage_logs WHERE guest_id = %s AND action_type = %s",
                        (guest_id, action_type)
                    )
                row = cur.fetchone()
                return row[0] if row else 0
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
