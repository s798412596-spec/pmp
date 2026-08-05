#!/usr/bin/env python3
"""Compatibility entrypoint for the generic profile-isolated runtime."""

from persona_runtime import main


if __name__ == "__main__":
    raise SystemExit(main())
