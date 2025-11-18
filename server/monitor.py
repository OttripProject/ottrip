#!/usr/bin/env python3
"""
Render 서버 상태 모니터링 스크립트
서버가 다운되거나 다시 살아날 때 Slack으로 알림을 보냅니다.
"""

import os
import time
from datetime import datetime, timedelta
from typing import Literal

import httpx


class ServerMonitor:
    """서버 상태를 모니터링하고 Slack으로 알림을 보냅니다."""

    def __init__(
        self,
        server_url: str,
        slack_webhook_url: str,
        check_interval: int = 60,
        timeout: int = 10,
    ):
        """
        Args:
            server_url: 모니터링할 서버 URL (예: https://ottrip.onrender.com)
            slack_webhook_url: Slack Incoming Webhook URL
            check_interval: 체크 간격 (초 단위, 기본값: 60초)
            timeout: HTTP 요청 타임아웃 (초 단위, 기본값: 10초)
        """
        self.server_url = server_url.rstrip("/")
        self.slack_webhook_url = slack_webhook_url
        self.check_interval = check_interval
        self.timeout = timeout

        # 상태 추적
        self.last_status: Literal["up", "down", None] = None
        self.down_since: datetime | None = None

    def check_server_status(self) -> tuple[bool, str]:
        """
        서버 상태를 체크합니다.

        Returns:
            (is_up: bool, message: str) 튜플
        """
        try:
            response = httpx.get(
                f"{self.server_url}/",
                timeout=self.timeout,
                follow_redirects=True,
            )
            if response.status_code == 200:
                return True, f"서버 응답 성공 (Status: {response.status_code})"
            else:
                return False, f"서버 응답 실패 (Status: {response.status_code})"
        except httpx.TimeoutException:
            return False, "요청 타임아웃"
        except httpx.ConnectError:
            return False, "연결 실패 (서버가 다운되었거나 접근 불가)"
        except Exception as e:
            return False, f"오류 발생: {str(e)}"

    def send_slack_notification(self, is_up: bool, message: str):
        """Slack으로 알림을 보냅니다."""

        if is_up:
            if self.last_status == "down":
                # 서버가 다시 살아남
                title = "✅ 서버 복구됨"
                status_text = "서버가 다시 정상 작동합니다"
                if self.down_since:
                    down_duration = datetime.now() - self.down_since
                    duration_text = self._format_duration(down_duration)
                    status_text += f"\n다운 시간: {duration_text}"
            else:
                # 정상 상태 (첫 체크 또는 계속 정상)
                if self.last_status is None:
                    # 첫 체크일 때는 알림 보내지 않음
                    return
                # 계속 정상 상태면 알림 보내지 않음 (너무 많은 알림 방지)
                return
        else:
            # 서버 다운
            if self.last_status != "down":
                # 처음 다운된 경우
                self.down_since = datetime.now()
                title = "❌ 서버 다운됨"
                status_text = "서버에 연결할 수 없습니다"
            else:
                # 계속 다운 상태 (주기적으로 알림)
                title = "⚠️ 서버 여전히 다운됨"
                if self.down_since:
                    down_duration = datetime.now() - self.down_since
                    duration_text = self._format_duration(down_duration)
                    status_text = f"서버가 {duration_text} 동안 다운 상태입니다"
                else:
                    status_text = "서버가 계속 다운 상태입니다"

        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        payload = {
            "text": title,
            "blocks": [
                {
                    "type": "header",
                    "text": {
                        "type": "plain_text",
                        "text": title,
                    },
                },
                {
                    "type": "section",
                    "fields": [
                        {
                            "type": "mrkdwn",
                            "text": f"*서버 URL:*\n{self.server_url}",
                        },
                        {
                            "type": "mrkdwn",
                            "text": f"*상태:*\n{status_text}",
                        },
                        {
                            "type": "mrkdwn",
                            "text": f"*메시지:*\n{message}",
                        },
                        {
                            "type": "mrkdwn",
                            "text": f"*체크 시간:*\n{now}",
                        },
                    ],
                },
            ],
        }

        try:
            httpx.post(
                self.slack_webhook_url,
                json=payload,
                timeout=self.timeout,
            )
            print(f"[{now}] Slack 알림 전송: {title}")
        except Exception as e:
            print(f"[{now}] Slack 알림 전송 실패: {e}")

    def _format_duration(self, duration: timedelta) -> str:
        """다운 시간을 포맷팅합니다."""
        total_seconds = int(duration.total_seconds())
        hours = total_seconds // 3600
        minutes = (total_seconds % 3600) // 60
        seconds = total_seconds % 60

        if hours > 0:
            return f"{hours}시간 {minutes}분 {seconds}초"
        elif minutes > 0:
            return f"{minutes}분 {seconds}초"
        else:
            return f"{seconds}초"

    def run(self):
        """모니터링을 시작합니다."""
        print(f"서버 모니터링 시작: {self.server_url}")
        print(f"체크 간격: {self.check_interval}초")
        print(f"Slack 웹훅: {'설정됨' if self.slack_webhook_url else '설정되지 않음'}")
        print("-" * 50)

        try:
            while True:
                is_up, message = self.check_server_status()
                now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                status_emoji = "✅" if is_up else "❌"

                print(f"[{now}] {status_emoji} 서버 상태: {'UP' if is_up else 'DOWN'} - {message}")

                # 상태가 변경되었거나 다운 상태일 때만 Slack 알림
                if is_up:
                    new_status = "up"
                else:
                    new_status = "down"

                if new_status != self.last_status or new_status == "down":
                    self.send_slack_notification(is_up, message)

                self.last_status = new_status

                time.sleep(self.check_interval)

        except KeyboardInterrupt:
            print("\n모니터링을 중지합니다.")
        except Exception as e:
            print(f"오류 발생: {e}")
            raise


def main():
    """메인 함수"""
    # 환경 변수에서 설정 읽기
    server_url = os.getenv("MONITOR_SERVER_URL", "https://ottrip.onrender.com")
    slack_webhook_url = os.getenv("SLACK_WEBHOOK_URL", "")
    check_interval = int(os.getenv("MONITOR_CHECK_INTERVAL", "60"))
    timeout = int(os.getenv("MONITOR_TIMEOUT", "10"))

    if not slack_webhook_url:
        print("오류: SLACK_WEBHOOK_URL 환경 변수가 설정되지 않았습니다.")
        print("Slack Incoming Webhook URL을 설정해주세요:")
        print("1. https://api.slack.com/apps 에서 앱 생성")
        print("2. Incoming Webhooks 활성화")
        print("3. Webhook URL 복사")
        print("4. 환경 변수로 설정: export SLACK_WEBHOOK_URL='your_webhook_url'")
        return

    monitor = ServerMonitor(
        server_url=server_url,
        slack_webhook_url=slack_webhook_url,
        check_interval=check_interval,
        timeout=timeout,
    )

    monitor.run()


if __name__ == "__main__":
    main()

