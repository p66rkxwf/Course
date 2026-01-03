"""Compatibility shim for `config` when code runs with `src/` on sys.path.

This module will load the real top-level `config` package `config/__init__.py`
by loading its file explicitly to avoid recursion and name collisions.
"""
from pathlib import Path
import importlib.util

# locate the package's __init__.py in project root
this_file = Path(__file__).resolve()
project_root = this_file.parent.parent
pkg_init = project_root / 'config' / '__init__.py'

spec = importlib.util.spec_from_file_location('_project_config', str(pkg_init))
_project_config = importlib.util.module_from_spec(spec)
spec.loader.exec_module(_project_config)

# export public names
for _k, _v in vars(_project_config).items():
    if not _k.startswith('_'):
        globals()[_k] = _v

# keep a reference
__all__ = [k for k in globals().keys() if not k.startswith('_')]
