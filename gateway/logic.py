# Logic thuần của gateway (không MQTT/Firebase) – tách riêng để test bằng test_logic.py
ROOMS = ('living', 'kitchen')
DEVICE_LABELS = {'light': 'Đèn LED', 'fan': 'Quạt'}
AUTO_ACTOR = 'Tự động (Auto)'


class Room:
    """Theo dõi 1 phòng: nhận sensors/state từ ESP32, sinh cảnh báo gas và nhật ký Auto."""

    def __init__(self):
        self.state = None
        self.gas = 0
        self.peak = 0

    def on_sensors(self, sensors):
        gas = sensors.get('gas')
        if isinstance(gas, (int, float)):
            self.gas = gas
            if self.state and self.state.get('alarm'):
                self.peak = max(self.peak, gas)

    def on_state(self, state, threshold):
        """Trả về (alert | None, event | None) để ghi lên Firebase."""
        prev, self.state = self.state, state
        was, now = bool(prev and prev.get('alarm')), bool(state.get('alarm'))

        alert = None
        if now and not was:
            self.peak = self.gas
            alert = {'event': 'start', 'type': 'gas', 'value': self.gas, 'threshold': threshold}
        elif was and not now:
            alert = {'event': 'end', 'type': 'gas', 'peak': self.peak}

        # Thiết bị đổi khi đang Auto = do PIR (thao tác của người dùng đã được web ghi nhật ký)
        event = None
        if prev and prev.get('mode') == 'auto' and state.get('mode') == 'auto':
            old, new = prev.get('devices') or {}, state.get('devices') or {}
            actions = [f"{'Bật' if new[d] else 'Tắt'} {label}" for d, label in DEVICE_LABELS.items()
                       if d in old and d in new and old[d] != new[d]]
            if actions:
                event = {'actor': AUTO_ACTOR, 'action': ', '.join(actions)}
        return alert, event


def clean_cmd(payload):
    """Lệnh từ web (Realtime Database) → payload MQTT hợp lệ, hoặc None nếu sai định dạng."""
    if not isinstance(payload, dict):
        return None
    if payload.get('mode') in ('auto', 'manual'):
        return {'mode': payload['mode']}
    if payload.get('device') in DEVICE_LABELS and isinstance(payload.get('value'), bool):
        return {'device': payload['device'], 'value': payload['value']}
    return None


def node_config(settings):
    """Cài đặt nhà (web) → cấu hình gửi xuống ESP32."""
    settings = settings or {}
    try:
        gas = int(settings.get('gasThreshold', 400))
        off_min = float(settings.get('offDelayMin', 5))
    except (TypeError, ValueError):
        gas, off_min = 400, 5
    return {'gasThreshold': min(4095, max(100, gas)), 'offDelaySec': int(min(120, max(0.1, off_min)) * 60)}


def clean_emails(settings):
    emails = (settings or {}).get('alertEmails') or []
    return [e.strip() for e in emails if isinstance(e, str) and '@' in e][:10]
