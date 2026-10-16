"""Build every Mini Mayhem model and export it to public/assets/models.

On a Mac with Blender installed:
    blender -b -P blender/build.py
Without the Blender app, the same script runs with the `bpy` Python module:
    python blender/build.py
"""
import os
import sys

import bpy  # noqa: F401  (loads bmesh and mathutils when run as a module)

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [HERE, os.path.join(HERE, 'assets')]

import clockwork  # noqa: E402
import common  # noqa: E402
import finale  # noqa: E402
import forest  # noqa: E402
import moon  # noqa: E402
import village  # noqa: E402

for module in (common, clockwork, forest, village, moon, finale):
    print(f'{module.__name__}:')
    module.build()
