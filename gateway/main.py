# Gateway trên Raspberry Pi: cầu nối MQTT (ESP32) <-> Firebase (web)
#   ESP32 -> MQTT sensors/state -> Realtime Database live/{homeId}/{room}/...  (+ cảnh báo gas, nhật ký Auto, Gmail)
#   Web -> Realtime Database cmd/{homeId}/{room}      -> MQTT .../cmd
#   Web -> Realtime Database settings/{homeId}        -> MQTT .../config (retained)
#   Firestore users -> Realtime Database members/{homeId}/{uid} (luật bảo mật dùng để chỉ cho thành viên xem nhà mình)
# Cấu hình bằng biến môi trường – xem .env.example
import json
import logging
import os
import smtplib
import threading
from email.message import EmailMessage

import firebase_admin
import paho.mqtt.client as mqtt
from firebase_admin import credentials, db, firestore

from logic import ROOMS, Room, clean_cmd, clean_emails, node_config

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
log = logging.getLogger('gateway')
env = os.environ

firebase_admin.initialize_app(credentials.Certificate(env['FIREBASE_CREDENTIALS']), {'databaseURL': env['FIREBASE_DB_URL']})
fs = firestore.client()

rooms = {}     # (homeId, room) -> Room
settings = {}  # homeId -> cài đặt nhà (web ghi lên)
SERVER_TS = {'.sv': 'timestamp'}


def live(home, room, kind):
    return db.reference(f'live/{home}/{room}/{kind}')


# ---------- MQTT -> Firebase ----------
def on_message(client, _userdata, msg):
    try:
        _, home, room, kind = msg.topic.split('/')
        payload = json.loads(msg.payload)
        if room not in ROOMS or not isinstance(payload, dict):
            return
    except ValueError:
        log.warning('Bỏ qua bản tin sai định dạng: %s', msg.topic)
        return

    try:
        r = rooms.setdefault((home, room), Room())
        if kind == 'sensors':
            r.on_sensors(payload)
            live(home, room, 'sensors').set({**payload, 'ts': SERVER_TS})
        elif kind == 'state':
            threshold = node_config(settings.get(home))['gasThreshold']
            alert, event = r.on_state(payload, threshold)
            live(home, room, 'state').set({**payload, 'ts': SERVER_TS})
            if event:
                live(home, room, 'event').set({**event, 'ts': SERVER_TS})
            if alert:
                log.warning('Gas %s %s/%s: %s', alert['event'], home, room, alert)
                live(home, room, 'alert').set({**alert, 'ts': SERVER_TS})
                if alert['event'] == 'start':
                    threading.Thread(target=send_gas_mail, args=(home, room, alert), daemon=True).start()
    except Exception:
        log.exception('Lỗi ghi Firebase (%s)', msg.topic)


def send_gas_mail(home, room, alert):
    to = clean_emails(settings.get(home))
    user, password = env.get('GMAIL_USER'), env.get('GMAIL_APP_PASSWORD')
    if not to or not user or not password:
        log.warning('Không gửi email cảnh báo: chưa có email nhận hoặc chưa cấu hình Gmail')
        return
    try:
        home_name = (fs.collection('homes').document(home).get().to_dict() or {}).get('name', home)
        room_name = 'Phòng bếp' if room == 'kitchen' else 'Phòng khách'
        msg = EmailMessage()
        msg['Subject'] = f'[Nhà thông minh] CẢNH BÁO RÒ RỈ KHÍ GAS – {home_name}'
        msg['From'] = user
        msg['To'] = ', '.join(to)
        msg.set_content(
            f'Phát hiện khí gas tại {room_name} ({home_name}).\n'
            f'Chỉ số gas: {alert["value"]} (ngưỡng cảnh báo {alert["threshold"]}).\n\n'
            'Còi báo đang kêu, đèn và quạt được giữ nguyên trạng thái để tránh phát tia lửa điện.\n'
            'Hãy khoá van bình gas, mở cửa để thông gió tự nhiên, KHÔNG bật/tắt thiết bị điện.\n'
        )
        with smtplib.SMTP_SSL('smtp.gmail.com', 465, timeout=20) as smtp:
            smtp.login(user, password)
            smtp.send_message(msg)
        log.info('Đã gửi email cảnh báo tới %s', to)
    except Exception:
        log.exception('Gửi email cảnh báo thất bại')


# ---------- Firebase -> MQTT ----------
def publish_config(home):
    payload = json.dumps(node_config(settings.get(home)))
    for room in ROOMS:
        mq.publish(f'smarthome/{home}/{room}/config', payload, qos=1, retain=True)


def on_cmd(event):
    # Lần đầu nhận cả nhánh cmd (lệnh cũ) → bỏ qua, chỉ chuyển lệnh mới
    if event.path == '/':
        return
    parts = event.path.strip('/').split('/')
    if len(parts) != 2 or parts[1] not in ROOMS:
        return
    payload = clean_cmd(event.data)
    if payload:
        log.info('Lệnh %s: %s', event.path, payload)
        mq.publish(f'smarthome/{parts[0]}/{parts[1]}/cmd', json.dumps(payload), qos=1)


def on_settings(event):
    homes = (event.data or {}) if event.path == '/' else {event.path.strip('/').split('/')[0]: None}
    for home in homes:
        settings[home] = db.reference(f'settings/{home}').get() or {}
        log.info('Cài đặt nhà %s: %s', home, node_config(settings[home]))
        publish_config(home)


def on_users(docs, _changes, _read_time):
    members = {}
    for d in docs:
        u = d.to_dict()
        if u.get('status') == 'active' and u.get('homeId'):
            members.setdefault(u['homeId'], {})[d.id] = True
    try:
        db.reference('members').set(members)
        log.info('Đồng bộ thành viên: %d nhà', len(members))
    except Exception:
        log.exception('Lỗi đồng bộ thành viên')


def on_connect(client, _userdata, _flags, reason_code, _props):
    if reason_code.is_failure:
        log.error('MQTT từ chối kết nối: %s (kiểm tra MQTT_USER / MQTT_PASS)', reason_code)
        return
    log.info('Đã kết nối MQTT broker')
    client.subscribe([('smarthome/+/+/sensors', 0), ('smarthome/+/+/state', 1)])
    for home in settings:
        publish_config(home)


mq = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id='smarthome-gateway')
if env.get('MQTT_USER'):
    mq.username_pw_set(env['MQTT_USER'], env.get('MQTT_PASS'))
mq.on_connect = on_connect
mq.on_message = on_message

if __name__ == '__main__':
    mq.connect(env.get('MQTT_HOST', 'localhost'), int(env.get('MQTT_PORT', 1883)))
    mq.loop_start()
    db.reference('settings').listen(on_settings)
    db.reference('cmd').listen(on_cmd)
    fs.collection('users').on_snapshot(on_users)
    log.info('Gateway đang chạy')
    threading.Event().wait()
