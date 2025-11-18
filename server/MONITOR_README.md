# Render 서버 모니터링 스크립트

Render 무료 버전 서버의 셧다운 상태를 실시간으로 모니터링하고 Slack으로 알림을 보내는 스크립트입니다.

## 기능

- ✅ 서버 상태를 주기적으로 체크 (기본 60초마다)
- 📱 서버가 다운되면 Slack으로 즉시 알림
- 🔄 서버가 다시 살아나면 복구 알림
- ⏱️ 다운 시간 추적 및 표시

## 설정 방법

### 1. Slack Incoming Webhook 설정

1. [Slack API 웹사이트](https://api.slack.com/apps)에 접속
2. "Create New App" 클릭 → "From scratch" 선택
3. 앱 이름과 워크스페이스 선택 후 생성
4. 왼쪽 메뉴에서 "Incoming Webhooks" 선택
5. "Activate Incoming Webhooks" 토글 활성화
6. "Add New Webhook to Workspace" 클릭
7. 알림을 받을 채널 선택 (예: #server-monitoring)
8. 생성된 Webhook URL 복사

### 2. 환경 변수 설정

로컬에서 실행하는 경우:

```bash
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
export MONITOR_SERVER_URL="https://ottrip.onrender.com"  # 기본값
export MONITOR_CHECK_INTERVAL="60"  # 기본값: 60초
export MONITOR_TIMEOUT="10"  # 기본값: 10초
```

또는 `.env` 파일 사용:

```bash
# .env 파일 생성
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
MONITOR_SERVER_URL=https://ottrip.onrender.com
MONITOR_CHECK_INTERVAL=60
MONITOR_TIMEOUT=10
```

### 3. 스크립트 실행

#### 로컬에서 실행

```bash
cd server
python monitor.py
```

또는:

```bash
uv run python monitor.py
```

#### 백그라운드에서 실행 (리눅스/macOS)

```bash
nohup python monitor.py > monitor.log 2>&1 &
```

#### systemd 서비스로 실행 (리눅스)

`/etc/systemd/system/server-monitor.service` 파일 생성:

```ini
[Unit]
Description=Render Server Monitor
After=network.target

[Service]
Type=simple
User=your_user
WorkingDirectory=/path/to/ottrip/server
Environment="SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
Environment="MONITOR_SERVER_URL=https://ottrip.onrender.com"
Environment="MONITOR_CHECK_INTERVAL=60"
ExecStart=/usr/bin/python3 /path/to/ottrip/server/monitor.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

서비스 시작:

```bash
sudo systemctl daemon-reload
sudo systemctl enable server-monitor
sudo systemctl start server-monitor
```

#### Render나 다른 클라우드 서비스에서 실행

Render에 별도의 웹 서비스로 배포하거나, 다른 클라우드 서비스(UptimeRobot, Better Uptime 등)를 사용할 수 있습니다.

또는 Render의 Background Worker로 실행:

`render.yaml`에 추가:

```yaml
services:
  # 기존 서비스...
  
  - type: worker
    name: server-monitor
    env: docker
    rootDir: server
    branch: dev
    buildCommand: "uv sync --frozen"
    startCommand: "python monitor.py"
    envVars:
      - key: SLACK_WEBHOOK_URL
        fromSecret: SLACK_WEBHOOK_URL
      - key: MONITOR_SERVER_URL
        value: "https://ottrip.onrender.com"
      - key: MONITOR_CHECK_INTERVAL
        value: "60"
```

## 환경 변수 설명

| 변수명 | 설명 | 기본값 | 필수 |
|--------|------|--------|------|
| `SLACK_WEBHOOK_URL` | Slack Incoming Webhook URL | - | ✅ |
| `MONITOR_SERVER_URL` | 모니터링할 서버 URL | `https://ottrip.onrender.com` | ❌ |
| `MONITOR_CHECK_INTERVAL` | 체크 간격 (초) | `60` | ❌ |
| `MONITOR_TIMEOUT` | HTTP 요청 타임아웃 (초) | `10` | ❌ |

## 알림 예시

### 서버 다운 알림
```
❌ 서버 다운됨
서버 URL: https://ottrip.onrender.com
상태: 서버에 연결할 수 없습니다
메시지: 연결 실패 (서버가 다운되었거나 접근 불가)
체크 시간: 2024-01-15 14:30:00
```

### 서버 복구 알림
```
✅ 서버 복구됨
서버 URL: https://ottrip.onrender.com
상태: 서버가 다시 정상 작동합니다
다운 시간: 5분 23초
메시지: 서버 응답 성공 (Status: 200)
체크 시간: 2024-01-15 14:35:23
```

## 주의사항

- 이 스크립트는 서버 외부에서 실행되어야 합니다 (같은 서버에서 실행하면 서버가 다운되었을 때 스크립트도 멈춥니다)
- 무료 서비스에서 실행할 경우, 체크 간격을 너무 짧게 설정하지 마세요 (무료 서비스의 rate limit에 걸릴 수 있습니다)
- 서버가 계속 다운 상태일 때는 주기적으로 알림을 보냅니다 (너무 많은 알림 방지를 위해)

## 문제 해결

### Slack 알림이 오지 않는 경우
- `SLACK_WEBHOOK_URL`이 올바른지 확인
- Slack 앱의 Incoming Webhooks가 활성화되어 있는지 확인
- 채널에 권한이 있는지 확인

### 서버 상태가 잘못 표시되는 경우
- `MONITOR_TIMEOUT` 값을 늘려보세요
- 서버 URL이 올바른지 확인하세요
- 네트워크 연결 상태를 확인하세요

