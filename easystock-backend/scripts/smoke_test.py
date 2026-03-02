import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from app.main import app


def main() -> None:
    route_count = len(app.routes)
    print(f"EasyStock app loaded with {route_count} routes")


if __name__ == "__main__":
    main()
