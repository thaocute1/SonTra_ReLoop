import json
import threading
import time

_condition = threading.Condition()
_version = 0
_latest_event = {
    'type': 'connected',
    'version': 0,
    'timestamp': 0,
}


def publish_flash_sale_event(event_type='slot_updated', payload=None):
    """Broadcast a lightweight Flash Sale state-change event to active SSE listeners."""
    global _version, _latest_event
    with _condition:
        _version += 1
        _latest_event = {
            'type': event_type,
            'version': _version,
            'timestamp': int(time.time() * 1000),
            **(payload or {}),
        }
        _condition.notify_all()
    return _latest_event


def get_stream_state():
    with _condition:
        return _version, dict(_latest_event)


def wait_for_next_event(last_seen_version, timeout=15.0):
    """Block until a newer version arrives or timeout elapses."""
    with _condition:
        if _version <= last_seen_version:
            _condition.wait(timeout=timeout)
        return _version, dict(_latest_event)


def format_sse(event_name, data_dict):
    return f"event: {event_name}\ndata: {json.dumps(data_dict, ensure_ascii=False)}\n\n"
