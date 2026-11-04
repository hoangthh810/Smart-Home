# Chạy: python test_logic.py (không cần cài thư viện)
from logic import AUTO_ACTOR, Room, clean_cmd, clean_emails, node_config


def state(alarm=False, mode='auto', light=False, fan=False):
    return {'nodeId': 2, 'mode': mode, 'devices': {'light': light, 'fan': fan, 'buzzer': alarm}, 'alarm': alarm}


def test_gas_alert_start_end_with_peak():
    r = Room()
    assert r.on_state(state(), 400) == (None, None)
    r.on_sensors({'gas': 900})
    alert, _ = r.on_state(state(alarm=True), 400)
    assert alert == {'event': 'start', 'type': 'gas', 'value': 900, 'threshold': 400}
    r.on_sensors({'gas': 2300})
    r.on_sensors({'gas': 1200})
    assert r.on_state(state(alarm=True), 400) == (None, None)  # vẫn đang báo → không tạo cảnh báo mới
    alert, _ = r.on_state(state(), 400)
    assert alert == {'event': 'end', 'type': 'gas', 'peak': 2300}


def test_alarm_already_on_when_gateway_starts():
    r = Room()
    r.on_sensors({'gas': 700})
    alert, event = r.on_state(state(alarm=True), 400)
    assert alert['event'] == 'start' and event is None


def test_auto_event_only_in_auto_mode():
    r = Room()
    r.on_state(state(), 400)
    _, event = r.on_state(state(light=True, fan=True), 400)
    assert event == {'actor': AUTO_ACTOR, 'action': 'Bật Đèn LED, Bật Quạt'}
    r.on_state(state(mode='manual', light=True, fan=True), 400)
    _, event = r.on_state(state(mode='manual', light=False, fan=True), 400)
    assert event is None  # thủ công: web đã ghi nhật ký


def test_clean_cmd():
    assert clean_cmd({'mode': 'manual', 'ts': 1}) == {'mode': 'manual'}
    assert clean_cmd({'device': 'fan', 'value': True}) == {'device': 'fan', 'value': True}
    assert clean_cmd({'device': 'buzzer', 'value': True}) is None  # buzzer do hệ thống điều khiển
    assert clean_cmd({'device': 'fan', 'value': 'yes'}) is None
    assert clean_cmd({'simulate': 'gasLeak'}) is None
    assert clean_cmd('abc') is None


def test_node_config_and_emails():
    assert node_config({'gasThreshold': 400, 'offDelayMin': 5}) == {'gasThreshold': 400, 'offDelaySec': 300}
    assert node_config({'gasThreshold': 99999, 'offDelayMin': 'x'}) == {'gasThreshold': 400, 'offDelaySec': 300}
    assert node_config({'gasThreshold': 99999, 'offDelayMin': 0}) == {'gasThreshold': 4095, 'offDelaySec': 6}
    assert node_config(None) == {'gasThreshold': 400, 'offDelaySec': 300}
    assert clean_emails({'alertEmails': [' a@b.vn ', 'sai', 3]}) == ['a@b.vn']


if __name__ == '__main__':
    for name, fn in list(globals().items()):
        if name.startswith('test_'):
            fn()
            print('OK ', name)
