import datetime as dt

from app.models.academic import DayOfWeek

# Mapea nuestro enum (lunes..sabado) al índice que usa Python en date.weekday()
# (lunes=0 ... domingo=6). No incluimos domingo porque no hay cursada ese día.
_DAY_INDEX = {
    DayOfWeek.LUNES: 0,
    DayOfWeek.MARTES: 1,
    DayOfWeek.MIERCOLES: 2,
    DayOfWeek.JUEVES: 3,
    DayOfWeek.VIERNES: 4,
    DayOfWeek.SABADO: 5,
}

_INDEX_TO_DAY = {v: k for k, v in _DAY_INDEX.items()}


def today_as_dayofweek(now: dt.datetime) -> DayOfWeek | None:
    """Devuelve el DayOfWeek de hoy, o None si es domingo (no hay cursada)."""
    return _INDEX_TO_DAY.get(now.weekday())


def next_occurrence(dia: DayOfWeek, hora_inicio: dt.time, now: dt.datetime) -> dt.datetime:
    """Calcula la próxima fecha/hora en que ocurre una clase semanal recurrente,
    a partir de 'now'. Si la clase es hoy pero ya empezó, salta a la semana que viene."""
    target_index = _DAY_INDEX[dia]
    delta_days = (target_index - now.weekday()) % 7

    if delta_days == 0 and hora_inicio <= now.time():
        delta_days = 7

    target_date = now.date() + dt.timedelta(days=delta_days)
    return dt.datetime.combine(target_date, hora_inicio)
