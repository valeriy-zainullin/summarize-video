#!/usr/bin/env python3
"""
Запуск Video Summarizer (API + Frontend).

Запускает FastAPI сервер и одновременно сервер разработки React frontend'а.
Для production режима frontend предварительно собирается (npm run build)
и раздаётся через FastAPI как статика.

Использование:
    python start_app.py              # Запуск в dev режиме
    python start_app.py --prod       # Запуск в production режиме
    python start_app.py --port 8080  # Смена порта API
"""

import argparse
import os
import subprocess
import sys
import signal
import time
import webbrowser
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(
        description="Запуск Video Summarizer (API + Frontend)"
    )
    parser.add_argument(
        "--host",
        default="0.0.0.0",
        help="Хост для API сервера (default: 0.0.0.0)",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=8000,
        help="Порт для API сервера (default: 8000)",
    )
    parser.add_argument(
        "--frontend-port",
        type=int,
        default=5173,
        help="Порт для frontend dev server (default: 5173)",
    )
    parser.add_argument(
        "--prod",
        action="store_true",
        help="Production режим: собрать frontend и раздавать через FastAPI",
    )
    parser.add_argument(
        "--no-browser",
        action="store_true",
        help="Не открывать браузер автоматически",
    )
    args = parser.parse_args()

    # Определяем корневую директорию проекта
    base_dir = Path(__file__).parent.resolve()
    frontend_dir = base_dir / "frontend"

    if not frontend_dir.exists():
        print(f"Ошибка: директория frontend не найдена: {frontend_dir}")
        print("Убедитесь, что frontend создан в директории проекта.")
        sys.exit(1)

    if not (frontend_dir / "package.json").exists():
        print(f"Ошибка: package.json не найден в {frontend_dir}")
        print("Убедитесь, что зависимости frontend установлены (npm install).")
        sys.exit(1)

    processes = []

    def cleanup(signum=None, frame=None):
        print("\nЗавершение процессов...")
        for proc in processes:
            if proc.poll() is None:
                proc.terminate()
                try:
                    proc.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    proc.kill()
        print("Все процессы завершены.")
        sys.exit(0)

    signal.signal(signal.SIGINT, cleanup)
    signal.signal(signal.SIGTERM, cleanup)

    # Определяем базовый URL для отображения (используем localhost для вывода в консоль)
    display_host = "localhost"

    # Устанавливаем переменную окружения для frontend, чтобы он знал адрес API
    api_url = f"http://{args.host}:{args.port}"
    env = os.environ.copy()
    env["VITE_API_URL"] = api_url

    if args.prod:
        # Production режим
        print("=" * 60)
        print("  Video Summarizer — Production режим")
        print("=" * 60)
        print()
        print("Сборка frontend...")

        build_result = subprocess.run(
            ["npm", "run", "build"],
            cwd=str(frontend_dir),
            capture_output=True,
            text=True,
        )

        if build_result.returncode != 0:
            print("Ошибка сборки frontend:")
            print(build_result.stderr)
            sys.exit(1)

        print("Frontend собран успешно.")
        print()

        # Запускаем API сервер (он будет раздавать статику)
        print(f"Запуск API сервера на http://{args.host}:{args.port}...")
        api_proc = subprocess.Popen(
            [sys.executable, "-m", "uvicorn", "api:app", "--host", args.host, "--port", str(args.port)],
            cwd=str(base_dir / "src"),
            env=env,
        )
        processes.append(api_proc)

        # В prod режиме frontend раздаётся через API, поэтому URL тот же
        frontend_url = f"http://{display_host}:{args.port}"
        api_url_display = f"http://{display_host}:{args.port}"
    else:
        # Dev режим
        print("=" * 60)
        print("  Video Summarizer — Development режим")
        print("=" * 60)
        print()

        # Запускаем API сервер
        print(f"Запуск API сервера на http://{args.host}:{args.port}...")
        api_proc = subprocess.Popen(
            [sys.executable, "-m", "uvicorn", "api:app", "--host", args.host, "--port", str(args.port), "--reload"],
            cwd=str(base_dir / "src"),
            env=env,
        )
        processes.append(api_proc)

        # Запускаем frontend dev server
        print(f"Запуск frontend dev server на порту {args.frontend_port}...")
        frontend_proc = subprocess.Popen(
            ["npm", "run", "dev", "--", "--port", str(args.frontend_port)],
            cwd=str(frontend_dir),
            env=env,
        )
        processes.append(frontend_proc)

        frontend_url = f"http://{display_host}:{args.frontend_port}"
        api_url_display = f"http://{display_host}:{args.port}"

    print()
    print("=" * 60)
    print(f"  Frontend:  {frontend_url}")
    print(f"  API:       {api_url_display}")
    print(f"  API docs:  {api_url_display}/docs")
    print("=" * 60)
    print("  Нажмите Ctrl+C для остановки")
    print("=" * 60)

    # Открываем браузер
    if not args.no_browser:
        time.sleep(2)
        webbrowser.open(frontend_url)

    # Ожидаем завершения процессов
    try:
        for proc in processes:
            proc.wait()
    except KeyboardInterrupt:
        cleanup()


if __name__ == "__main__":
    main()