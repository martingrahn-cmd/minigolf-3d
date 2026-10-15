"""Render a quick preview image of every exported model (for review).
    python blender/preview.py   or   blender -b -P blender/preview.py
Images go to blender/previews/<world>-<asset>.png (not committed)."""
import glob
import math
import os
import sys

import bpy  # noqa: F401
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'previews')
os.makedirs(OUT, exist_ok=True)
models = sorted(glob.glob(os.path.join(HERE, '..', 'public', 'assets', 'models', '*', '*.glb')))
only = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
for path in models:
    name = '-'.join(path.split(os.sep)[-2:]).replace('.glb', '')
    if only and not any(o in name for o in only):
        continue
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=path)
    objs = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    pts = [o.matrix_world @ Vector(c) for o in objs for c in o.bound_box]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    centre, size = (lo + hi) / 2, max((hi - lo).length, .1)
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
    bpy.context.scene.collection.objects.link(cam)
    cam.location = centre + Vector((size * .9, -size * 1.25, size * .55))
    cam.rotation_euler = (centre - cam.location).to_track_quat('-Z', 'Y').to_euler()
    bpy.context.scene.camera = cam
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN'))
    sun.data.energy = 3.5
    sun.rotation_euler = (math.radians(50), math.radians(10), math.radians(30))
    bpy.context.scene.collection.objects.link(sun)
    world = bpy.data.worlds.new('w')
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs[0].default_value = (.25, .2, .4, 1)
    world.node_tree.nodes['Background'].inputs[1].default_value = .8
    bpy.context.scene.world = world
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 24
    scene.cycles.device = 'CPU'
    scene.render.resolution_x = scene.render.resolution_y = 520
    scene.render.filepath = os.path.join(OUT, name + '.png')
    bpy.ops.render.render(write_still=True)
    print('preview', name)
