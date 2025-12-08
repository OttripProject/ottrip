#!/usr/bin/env python3
"""
OTTRIP API 성능 테스트 스크립트

사용법:
    # 모든 엔드포인트 테스트
    python performance_test.py --base-url https://ottrip.onrender.com --auth-token TOKEN
    
    # 특정 엔드포인트만 테스트
    python performance_test.py --base-url https://ottrip.onrender.com --auth-token TOKEN --endpoint "/private/plans/me"
    
    # 여러 엔드포인트 테스트
    python performance_test.py --base-url https://ottrip.onrender.com --auth-token TOKEN --endpoints "/private/plans/me" "/private/users/me"
    
    # 동적 파라미터가 있는 엔드포인트 테스트
    python performance_test.py --base-url https://ottrip.onrender.com --auth-token TOKEN --endpoint "/private/flights/{plan_id}/plan" --params plan_id=1
"""

import asyncio
import argparse
import json
import os
import statistics
import time
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Any, cast

import httpx


@dataclass
class TestResult:
    """단일 요청 테스트 결과"""
    endpoint: str
    method: str
    status_code: int
    response_time: float
    success: bool
    error: str | None = None
    response_data: dict[str, Any] | None = None


@dataclass
class EndpointStats:
    """엔드포인트별 통계"""
    endpoint: str
    method: str
    total_requests: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    response_times: list[float] = field(default_factory=list)
    status_codes: dict[int, int] = field(default_factory=lambda: defaultdict(int))
    errors: list[str] = field(default_factory=list)

    @property
    def success_rate(self) -> float:
        if self.total_requests == 0:
            return 0.0
        return (self.successful_requests / self.total_requests) * 100

    @property
    def avg_response_time(self) -> float:
        if not self.response_times:
            return 0.0
        return statistics.mean(self.response_times)

    @property
    def min_response_time(self) -> float:
        return min(self.response_times) if self.response_times else 0.0

    @property
    def max_response_time(self) -> float:
        return max(self.response_times) if self.response_times else 0.0

    @property
    def median_response_time(self) -> float:
        if not self.response_times:
            return 0.0
        return statistics.median(self.response_times)

    @property
    def p95_response_time(self) -> float:
        """95번째 백분위수 응답 시간"""
        if not self.response_times:
            return 0.0
        sorted_times = sorted(self.response_times)
        index = int(len(sorted_times) * 0.95)
        return sorted_times[min(index, len(sorted_times) - 1)]

    @property
    def p99_response_time(self) -> float:
        """99번째 백분위수 응답 시간"""
        if not self.response_times:
            return 0.0
        sorted_times = sorted(self.response_times)
        index = int(len(sorted_times) * 0.99)
        return sorted_times[min(index, len(sorted_times) - 1)]


class PerformanceTester:
    """API 성능 테스트 클래스"""

    def __init__(
        self,
        base_url: str,
        auth_token: str | None = None,
        timeout: float = 30.0,
    ):
        self.base_url = base_url.rstrip("/")
        self.auth_token = auth_token
        self.timeout = timeout
        self.stats: dict[str, EndpointStats] = {}

    def _get_headers(self) -> dict[str, str]:
        """인증 헤더 생성"""
        headers = {"Content-Type": "application/json"}
        if self.auth_token:
            headers["X-Auth-Token"] = self.auth_token
        return headers

    def _replace_params(self, endpoint: str, params: dict[str, str]) -> str:
        """엔드포인트의 파라미터를 실제 값으로 치환"""
        result = endpoint
        for key, value in params.items():
            result = result.replace(f"{{{key}}}", str(value))
        return result

    async def _make_request(
        self,
        method: str,
        endpoint: str,
        **kwargs: Any,
    ) -> TestResult:
        """단일 요청 실행"""
        url = f"{self.base_url}{endpoint}"
        start_time = time.time()

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.request(
                    method=method,
                    url=url,
                    headers=self._get_headers(),
                    **kwargs,
                )
                response_time = time.time() - start_time
                
                # 응답 데이터 추출 (시퀀스 테스트용)
                response_data = None
                if 200 <= response.status_code < 300:
                    try:
                        response_data = response.json()
                    except:
                        pass

                return TestResult(
                    endpoint=endpoint,
                    method=method,
                    status_code=response.status_code,
                    response_time=response_time,
                    success=200 <= response.status_code < 300,
                    response_data=response_data,
                )
        except httpx.TimeoutException:
            response_time = time.time() - start_time
            return TestResult(
                endpoint=endpoint,
                method=method,
                status_code=0,
                response_time=response_time,
                success=False,
                error="Timeout",
            )
        except Exception as e:
            response_time = time.time() - start_time
            return TestResult(
                endpoint=endpoint,
                method=method,
                status_code=0,
                response_time=response_time,
                success=False,
                error=str(e),
            )

    def _update_stats(self, result: TestResult) -> None:
        """통계 업데이트"""
        key = f"{result.method} {result.endpoint}"
        if key not in self.stats:
            self.stats[key] = EndpointStats(
                endpoint=result.endpoint,
                method=result.method,
            )

        stats = self.stats[key]
        stats.total_requests += 1
        stats.response_times.append(result.response_time)
        stats.status_codes[result.status_code] += 1

        if result.success:
            stats.successful_requests += 1
        else:
            stats.failed_requests += 1
            if result.error:
                stats.errors.append(result.error)

    async def test_endpoint(
        self,
        method: str,
        endpoint: str,
        requests: int = 1,
        params: dict[str, str] | None = None,
        json_data: dict[str, Any] | None = None,
        **kwargs: Any,
    ) -> None:
        """특정 엔드포인트 테스트"""
        # 파라미터 치환
        if params:
            endpoint = self._replace_params(endpoint, params)

        # JSON 데이터가 있으면 kwargs에 추가
        request_kwargs = kwargs.copy()
        if json_data:
            request_kwargs["json"] = json_data

        tasks = [
            self._make_request(method, endpoint, **request_kwargs)
            for _ in range(requests)
        ]
        results = await asyncio.gather(*tasks)

        for result in results:
            self._update_stats(result)

    async def test_sequence(
        self,
        sequence: list[tuple[str, str, dict[str, Any] | None]],
        requests: int = 1,
    ) -> list[float]:
        """순차적 API 호출 시퀀스 테스트 (프론트엔드 플로우 시뮬레이션)"""
        sequence_times: list[float] = []
        
        for _ in range(requests):
            start_time = time.time()
            last_response_data: dict[str, Any] | None = None
            
            for method, endpoint, json_data in sequence:
                # 이전 응답에서 데이터 추출하여 파라미터 치환
                endpoint_with_params = endpoint
                if last_response_data:
                    # publicId 같은 동적 파라미터 치환
                    if "{publicId}" in endpoint:
                        # 여러 가능한 키 이름 확인
                        public_id = (
                            last_response_data.get("publicId") or 
                            last_response_data.get("public_id") or
                            (last_response_data.get("data", {}).get("publicId") if isinstance(last_response_data.get("data"), dict) else None) or
                            (last_response_data.get("data", {}).get("public_id") if isinstance(last_response_data.get("data"), dict) else None)
                        )
                        if public_id:
                            endpoint_with_params = endpoint_with_params.replace("{publicId}", str(public_id))
                        else:
                            print(f"Warning: publicId를 찾을 수 없습니다. 응답 데이터: {last_response_data}")
                    if "{planId}" in endpoint:
                        plan_id = (
                            last_response_data.get("id") or 
                            last_response_data.get("planId") or
                            last_response_data.get("plan_id") or
                            (last_response_data.get("data", {}).get("id") if isinstance(last_response_data.get("data"), dict) else None)
                        )
                        if plan_id:
                            endpoint_with_params = endpoint_with_params.replace("{planId}", str(plan_id))
                
                # 요청 실행
                result = await self._make_request(
                    method,
                    endpoint_with_params,
                    json=json_data,
                )
                self._update_stats(result)
                
                # 응답 데이터 저장 (다음 요청에서 사용)
                if result.success and result.status_code in (200, 201) and result.response_data:
                    last_response_data = result.response_data
                    # 디버깅: Plan 생성 응답 확인
                    if method == "POST" and "/private/plans" in endpoint:
                        print(f"Debug: Plan 생성 응답 - publicId: {last_response_data.get('publicId')}, public_id: {last_response_data.get('public_id')}, 전체 데이터: {list(last_response_data.keys())}")
            
            total_time = time.time() - start_time
            sequence_times.append(total_time)
        
        return sequence_times

    def get_all_endpoints(self) -> list[tuple[str, str]]:
        """모든 테스트 가능한 엔드포인트 목록 반환"""
        endpoints: list[tuple[str, str]] = []

        # Public 엔드포인트
        endpoints.extend([
            ("GET", "/"),
            ("GET", "/public/auth/time"),
            ("GET", "/public/auth/keys"),
        ])

        # Private 엔드포인트 (인증 필요)
        if self.auth_token:
            endpoints.extend([
                # Users
                ("GET", "/private/users/me"),
                # Plans
                ("GET", "/private/plans/me"),
                # Flights (동적 파라미터 필요)
                # ("GET", "/private/flights/{flight_id}"),
                # ("GET", "/private/flights/{plan_id}/plan"),
                # Itinerary (동적 파라미터 필요)
                # ("GET", "/private/itinerary/{itinerary_id}"),
                # ("GET", "/private/itinerary/{plan_id}/plan"),
                # Expenses (동적 파라미터 필요)
                # ("GET", "/private/expenses/{expense_id}"),
                # ("GET", "/private/expenses/{plan_id}/plan"),
                # Accommodations (동적 파라미터 필요)
                # ("GET", "/private/accommodations/{accommodation_id}"),
                # ("GET", "/private/accommodations/{plan_id}/plan"),
            ])

        return endpoints

    async def run_test_suite(
        self,
        endpoints: list[tuple[str, str]] | None = None,
        params: dict[str, str] | None = None,
        json_data: dict[str, Any] | None = None,
        concurrent: int = 1,
        requests_per_endpoint: int = 10,
    ) -> None:
        """전체 테스트 스위트 실행"""

        if endpoints is None:
            endpoints = self.get_all_endpoints()

        print(f"\n{'='*60}")
        print(f"성능 테스트 시작")
        print(f"{'='*60}")
        print(f"Base URL: {self.base_url}")
        print(f"동시 요청 수: {concurrent}")
        print(f"엔드포인트당 요청 수: {requests_per_endpoint}")
        print(f"총 엔드포인트 수: {len(endpoints)}")
        if params:
            print(f"파라미터: {params}")
        if json_data:
            print(f"JSON 데이터: {json_data}")
        print(f"{'='*60}\n")

        start_time = time.time()

        # 각 엔드포인트를 동시에 테스트
        tasks: list[asyncio.Task[None]] = []
        for method, endpoint in endpoints:
            # 동시 요청을 위해 여러 번 실행
            for _ in range(concurrent):
                task = asyncio.create_task(
                    self.test_endpoint(
                        method,
                        endpoint,
                        requests=requests_per_endpoint,
                        params=params,
                        json_data=json_data,
                    )
                )
                tasks.append(task)

        await asyncio.gather(*tasks)

        total_time = time.time() - start_time

        print(f"\n{'='*60}")
        print(f"테스트 완료 (총 소요 시간: {total_time:.2f}초)")
        print(f"{'='*60}\n")

    def print_report(self) -> None:
        """테스트 결과 리포트 출력"""
        if not self.stats:
            print("테스트 결과가 없습니다.")
            return

        print("\n" + "=" * 100)
        print("성능 테스트 결과 리포트")
        print("=" * 100)

        for _, stats in sorted(self.stats.items()):
            print(f"\n{stats.method} {stats.endpoint}")
            print("-" * 100)
            print(f"  총 요청 수:        {stats.total_requests}")
            print(f"  성공 요청 수:      {stats.successful_requests}")
            print(f"  실패 요청 수:      {stats.failed_requests}")
            print(f"  성공률:            {stats.success_rate:.2f}%")
            print(f"  평균 응답 시간:    {stats.avg_response_time*1000:.2f}ms")
            print(f"  최소 응답 시간:    {stats.min_response_time*1000:.2f}ms")
            print(f"  최대 응답 시간:    {stats.max_response_time*1000:.2f}ms")
            print(f"  중간값 응답 시간:  {stats.median_response_time*1000:.2f}ms")
            print(f"  P95 응답 시간:     {stats.p95_response_time*1000:.2f}ms")
            print(f"  P99 응답 시간:     {stats.p99_response_time*1000:.2f}ms")

            if stats.status_codes:
                print(f"  상태 코드 분포:")
                for code, count in sorted(stats.status_codes.items()):
                    print(f"    {code}: {count}회")

            if stats.errors:
                error_counts: defaultdict[str, int] = defaultdict(int)
                for error in stats.errors:
                    error_counts[error] += 1
                print(f"  에러:")
                for error, count in error_counts.items():
                    print(f"    {error}: {count}회")

        # 전체 요약
        print("\n" + "=" * 100)
        print("전체 요약")
        print("=" * 100)

        total_requests = sum(s.total_requests for s in self.stats.values())
        total_success = sum(s.successful_requests for s in self.stats.values())
        total_failed = sum(s.failed_requests for s in self.stats.values())
        all_response_times: list[float] = [
            rt for stats in self.stats.values() for rt in stats.response_times
        ]

        if all_response_times:
            print(f"총 요청 수:          {total_requests}")
            print(f"총 성공 수:          {total_success}")
            print(f"총 실패 수:          {total_failed}")
            print(f"전체 성공률:         {(total_success/total_requests*100):.2f}%")
            print(f"전체 평균 응답 시간: {statistics.mean(all_response_times)*1000:.2f}ms")
            print(f"전체 최소 응답 시간: {min(all_response_times)*1000:.2f}ms")
            print(f"전체 최대 응답 시간: {max(all_response_times)*1000:.2f}ms")
            print(f"전체 중간값 응답 시간: {statistics.median(all_response_times)*1000:.2f}ms")
            if len(all_response_times) > 1:
                sorted_times = sorted(all_response_times)
                p95_index = int(len(sorted_times) * 0.95)
                p99_index = int(len(sorted_times) * 0.99)
                print(f"전체 P95 응답 시간:   {sorted_times[min(p95_index, len(sorted_times)-1)]*1000:.2f}ms")
                print(f"전체 P99 응답 시간:   {sorted_times[min(p99_index, len(sorted_times)-1)]*1000:.2f}ms")

        print("=" * 100 + "\n")

    def save_report(self, filename: str = "performance_report.json") -> None:
        """테스트 결과를 JSON 파일로 저장"""
        report: dict[str, Any] = {
            "base_url": self.base_url,
            "timestamp": time.time(),
            "endpoints": {},
        }

        for key, stats in self.stats.items():
            cast(dict[str, Any], report["endpoints"])[key] = {
                "endpoint": stats.endpoint,
                "method": stats.method,
                "total_requests": stats.total_requests,
                "successful_requests": stats.successful_requests,
                "failed_requests": stats.failed_requests,
                "success_rate": stats.success_rate,
                "avg_response_time_ms": stats.avg_response_time * 1000,
                "min_response_time_ms": stats.min_response_time * 1000,
                "max_response_time_ms": stats.max_response_time * 1000,
                "median_response_time_ms": stats.median_response_time * 1000,
                "p95_response_time_ms": stats.p95_response_time * 1000,
                "p99_response_time_ms": stats.p99_response_time * 1000,
                "status_codes": dict(stats.status_codes),
                "errors": list(set(stats.errors)),
            }

        with open(filename, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2, ensure_ascii=False)

        print(f"리포트가 {filename}에 저장되었습니다.")


def parse_endpoint(endpoint_str: str) -> tuple[str, str]:
    """엔드포인트 문자열을 파싱 (예: "GET /api/users" 또는 "/api/users")"""
    parts = endpoint_str.strip().split(maxsplit=1)
    if len(parts) == 2:
        return (parts[0].upper(), parts[1])
    else:
        return ("GET", parts[0])


def parse_params(params_list: list[str]) -> dict[str, str]:
    """파라미터 리스트를 딕셔너리로 변환 (예: ["plan_id=1", "user_id=2"])"""
    params: dict[str, str] = {}
    for param_str in params_list:
        if "=" in param_str:
            key, value = param_str.split("=", 1)
            params[key.strip()] = value.strip()
    return params


async def main():
    """메인 함수"""
    parser = argparse.ArgumentParser(
        description="OTTRIP API 성능 테스트 스크립트",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
예시:
  # 모든 엔드포인트 테스트
  %(prog)s --base-url https://ottrip.onrender.com --auth-token TOKEN
  
  # 특정 엔드포인트만 테스트
  %(prog)s --base-url https://ottrip.onrender.com --auth-token TOKEN --endpoint "/private/plans/me"
  
  # 여러 엔드포인트 테스트
  %(prog)s --base-url https://ottrip.onrender.com --auth-token TOKEN --endpoints "/private/plans/me" "/private/users/me"
  
  # 동적 파라미터가 있는 엔드포인트 테스트
  %(prog)s --base-url https://ottrip.onrender.com --auth-token TOKEN \\
    --endpoint "/private/flights/{plan_id}/plan" --params plan_id=1
        """,
    )
    parser.add_argument(
        "--base-url",
        type=str,
        default=os.getenv("API_BASE_URL", "http://localhost:8080"),
        help="API 베이스 URL (기본값: http://localhost:8080)",
    )
    parser.add_argument(
        "--auth-token",
        type=str,
        default=os.getenv("AUTH_TOKEN"),
        help="인증 토큰 (환경변수 AUTH_TOKEN 사용 가능)",
    )
    parser.add_argument(
        "--endpoint",
        type=str,
        help="테스트할 단일 엔드포인트 (예: /private/plans/me)",
    )
    parser.add_argument(
        "--endpoints",
        type=str,
        nargs="+",
        help="테스트할 여러 엔드포인트 (예: /private/plans/me /private/users/me)",
    )
    parser.add_argument(
        "--params",
        type=str,
        nargs="+",
        help="엔드포인트 파라미터 (예: plan_id=1 flight_id=2)",
    )
    parser.add_argument(
        "--json",
        type=str,
        help="JSON 요청 본문 파일 경로 또는 JSON 문자열",
    )
    parser.add_argument(
        "--concurrent",
        type=int,
        default=1,
        help="동시 요청 수 (기본값: 1)",
    )
    parser.add_argument(
        "--requests",
        type=int,
        default=10,
        help="엔드포인트당 요청 수 (기본값: 10)",
    )
    parser.add_argument(
        "--timeout",
        type=float,
        default=30.0,
        help="요청 타임아웃 (초, 기본값: 30)",
    )
    parser.add_argument(
        "--output",
        type=str,
        default="performance_report.json",
        help="리포트 출력 파일명 (기본값: performance_report.json)",
    )
    parser.add_argument(
        "--sequence",
        action="store_true",
        help="프론트엔드 플로우 시뮬레이션: Plan 생성 후 상세 조회 시퀀스 테스트",
    )

    args = parser.parse_args()

    tester = PerformanceTester(
        base_url=args.base_url,
        auth_token=args.auth_token,
        timeout=args.timeout,
    )

    # 엔드포인트 설정
    endpoints: list[tuple[str, str]] | None = None
    if args.endpoint:
        endpoints = [parse_endpoint(args.endpoint)]
    elif args.endpoints:
        endpoints = [parse_endpoint(e) for e in args.endpoints]

    # 파라미터 설정
    params: dict[str, str] | None = None
    if args.params:
        params = parse_params(args.params)

    # 시퀀스 테스트 (프론트엔드 플로우 시뮬레이션)
    if args.sequence:
        # Plan 생성 후 상세 조회 시퀀스
        plan_create_data = {
            "title": "성능 테스트 여행",
            "start_date": "2025-01-15",
            "end_date": "2025-01-20",
            "memo": ""
        }
        if args.json:
            try:
                if os.path.exists(args.json):
                    with open(args.json, "r", encoding="utf-8") as f:
                        plan_create_data = json.load(f)
                else:
                    plan_create_data = json.loads(args.json)
            except Exception as e:
                print(f"JSON 파싱 오류: {e}")
                return
        
        sequence = [
            ("POST", "/private/plans", plan_create_data),
            ("GET", "/private/plans/{publicId}", None),
        ]
        
        print(f"\n{'='*60}")
        print(f"프론트엔드 플로우 시뮬레이션 테스트 시작")
        print(f"{'='*60}")
        print(f"Base URL: {args.base_url}")
        print(f"시퀀스: Plan 생성 → Plan 상세 조회")
        print(f"반복 횟수: {args.requests}")
        print(f"{'='*60}\n")
        
        start_time = time.time()
        sequence_times = await tester.test_sequence(sequence, requests=args.requests)
        total_time = time.time() - start_time
        
        print(f"\n{'='*60}")
        print(f"시퀀스 테스트 완료 (총 소요 시간: {total_time:.2f}초)")
        print(f"{'='*60}\n")
        
        if sequence_times:
            print(f"시퀀스 전체 시간 통계:")
            print(f"  평균: {statistics.mean(sequence_times)*1000:.2f}ms")
            print(f"  최소: {min(sequence_times)*1000:.2f}ms")
            print(f"  최대: {max(sequence_times)*1000:.2f}ms")
            print(f"  중간값: {statistics.median(sequence_times)*1000:.2f}ms")
            if len(sequence_times) > 1:
                sorted_times = sorted(sequence_times)
                p95_index = int(len(sorted_times) * 0.95)
                p99_index = int(len(sorted_times) * 0.99)
                print(f"  P95: {sorted_times[min(p95_index, len(sorted_times)-1)]*1000:.2f}ms")
                print(f"  P99: {sorted_times[min(p99_index, len(sorted_times)-1)]*1000:.2f}ms")
            print()
        
        tester.print_report()
        tester.save_report(args.output)
        return

    # JSON 데이터 설정
    json_data: dict[str, Any] | None = None
    if args.json:
        try:
            # 파일 경로인지 확인
            if os.path.exists(args.json):
                with open(args.json, "r", encoding="utf-8") as f:
                    json_data = json.load(f)
            else:
                # JSON 문자열로 파싱
                json_data = json.loads(args.json)
        except Exception as e:
            print(f"JSON 파싱 오류: {e}")
            return

    await tester.run_test_suite(
        endpoints=endpoints,
        params=params,
        json_data=json_data,
        concurrent=args.concurrent,
        requests_per_endpoint=args.requests,
    )

    tester.print_report()
    tester.save_report(args.output)


if __name__ == "__main__":
    asyncio.run(main())
