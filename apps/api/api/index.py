from pathlib import Path
import sys

api_root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(api_root))

from lovemaster_api.main import app  # noqa: E402
