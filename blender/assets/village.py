"""Molnskogen village: cosy dressing for the islands around the course.
Origins at the foot of each model; game +z (the front) is Blender -y."""
import math
import bmesh
from mathutils import Vector
from lib import material, mesh_object, empty, lathe, sphere, cylinder, torus, box, export, reset


def mats():
    return dict(
        plaster=material('Plaster', 0xf3e2c2, rough=.85), timber=material('Timber', 0x76503a, rough=.8),
        thatch=material('Thatch', 0xd9a35a, rough=.95), roof=material('RoofRed', 0xc8574a, rough=.7),
        stone=material('Stone', 0xb9a58c, rough=.95), door=material('Door', 0x8f5a3a, rough=.6),
        glow=material('Window', 0xffd88a, rough=.3, emit=0xffc566, strength=2.2),
        brass=material('Brass', 0xe0b05a, rough=.3, metal=.8), green=material('Shutter', 0x5f9a5a, rough=.6),
        flower=material('Flowers', 0xff8fb8, rough=.6), leaf=material('Hedge', 0x5d9a34, rough=.85),
    )


def cottage():
    """A round, half-timbered cottage with a thatched roof, chimney, glowing
    windows and a flower box. About 4.2 m tall, footprint radius 1.6 m. The
    chimney top is at (0.75, 4.05, -0.2) in game units (smoke rises from it)."""
    reset()
    m = mats()
    lathe('walls', [(1.6, 0), (1.62, .15), (1.55, 2.1), (1.5, 2.2)], 20, m['plaster'], None, smooth=False)
    lathe('plinth', [(1.72, 0), (1.72, .3), (1.6, .34)], 20, m['stone'], None, smooth=False, cap=False)
    for i in range(10):
        a = i / 10 * math.tau
        cylinder(f'beam-{i}', .06, 2.1, (math.cos(a) * 1.58, math.sin(a) * 1.58, 1.15), m['timber'], None, 6)
    torus('wall-plate', 1.56, .08, (0, 0, 2.1), m['timber'], None, 24, 6)
    lathe('thatch', [(2.1, 1.95), (2.05, 2.2), (1.6, 2.9), (.9, 3.55), (.3, 3.9), (0, 3.98)], 24, m['thatch'], None)
    torus('thatch-lip', 2.04, .1, (0, 0, 2.0), m['thatch'], None, 32, 6)
    # Chimney through the thatch.
    box('chimney', (.45, .45, 1.6), (.75, .2, 3.25), m['stone'], None, .03)
    box('chimney-cap', (.55, .55, .1), (.75, .2, 4.05), m['timber'], None, .02)
    # Round door with a brass knob and a stone step, facing game +z.
    box('step', (1.0, .5, .12), (0, -1.75, .06), m['stone'], None, .03)
    door = cylinder('door', .48, .1, (0, -1.6, .9), m['door'], None, 20, rotation=(math.pi / 2, 0, 0))
    door.scale = (1, 1.35, 1)
    torus('door-frame', .5, .06, (0, -1.62, .95), m['timber'], None, 20, 6, rotation=(math.pi / 2, 0, 0)).scale = (1, 1.35, 1)
    sphere('knob', .05, (.28, -1.68, .85), m['brass'], None, 8, 6)
    # Windows with shutters and a flower box.
    for a in (-.9, .9, math.pi - .5, math.pi + .5):
        x, y = math.sin(a) * 1.57, -math.cos(a) * 1.57
        for name, size, loc, mat in ((f'window-{a}', (.5, .08, .55), (x, y, 1.35), m['glow']),
                                     (f'frame-{a}', (.62, .1, .07), (x, y, 1.66), m['timber']),
                                     (f'box-{a}', (.6, .2, .14), (x * 1.04, y * 1.04, 1.02), m['timber'])):
            part = box(name, size, (0, 0, 0), mat, None)
            part.location = loc
            part.rotation_euler = (0, 0, a)
        for k in range(4):
            b = sphere(f'bloom-{a}-{k}', .07, (x * 1.06 + math.cos(a) * (k - 1.5) * .13, y * 1.06 + math.sin(a) * (k - 1.5) * .13, 1.14), m['flower'], None, 6, 4)
    export('forest/cottage.glb', join='cottage')


def windmill():
    """A small post windmill, 6.5 m to the hub. The sails are a separate object
    named 'sails' with its origin on the hub axle (game +z), so the game can spin
    it around z."""
    reset()
    m = mats()
    root = empty('windmill')
    lathe('tower', [(1.3, 0), (1.25, .3), (.95, 5.4), (.9, 5.6)], 12, m['plaster'], root, smooth=False)
    lathe('cap', [(1.15, 5.5), (1.1, 5.8), (.8, 6.6), (.3, 7.1), (0, 7.2)], 12, m['roof'], root, smooth=False)
    box('door', (.6, .1, 1.1), (0, -1.27, .6), m['door'], root, .02)
    for z in (2.2, 3.8):
        box(f'window-{z}', (.4, .1, .45), (0, -1.08 - (z - 2.2) * .05, z), m['glow'], root)
    box('balcony', (2.6, 1.0, .1), (0, -1.0, 2.9), m['timber'], root)
    sails = empty('sails', root, (0, -1.15, 6.2))
    cylinder('hub', .22, .5, (0, 0, 0), m['timber'], sails, 12, rotation=(math.pi / 2, 0, 0))
    for k in range(4):
        a = k * math.pi / 2
        arm = box(f'arm-{k}', (.12, .08, 3.3), (math.cos(a) * 0, 0, 0), m['timber'], sails)
        arm.location = (math.sin(a) * 1.65, -.1, math.cos(a) * 1.65)
        arm.rotation_euler = (0, a, 0)
        cloth = box(f'cloth-{k}', (.85, .03, 2.5), (0, 0, 0), m['plaster'], sails)
        cloth.location = (math.sin(a) * 1.9 + math.cos(a) * .45, -.12, math.cos(a) * 1.9 - math.sin(a) * .45)
        cloth.rotation_euler = (0, a, 0)
    export('forest/windmill.glb')


def well():
    """A stone well with a little shingled roof and a bucket; 2.4 m tall."""
    reset()
    m = mats()
    lathe('well-wall', [(.75, 0), (.78, .7), (.7, .78), (.58, .78), (.58, .2)], 16, m['stone'], None, smooth=False, cap=False)
    cylinder('water', .58, .05, (0, 0, .55), material('Water', 0x5fb6c8, rough=.1, metal=.1), None, 16)
    for s in (-1, 1):
        box(f'post-{s}', (.1, .1, 1.7), (s * .66, 0, 1.55), m['timber'], None)
    for s in (-1, 1):
        # box() bakes its location into the vertices; build at the origin so
        # the rotation turns the slab about its own centre.
        r = box(f'roof-{s}', (.95, 1.3, .06), (0, 0, 0), m['roof'], None)
        r.location = (s * .36, 0, 2.62)
        r.rotation_euler = (0, s * .65, 0)
    cylinder('crank', .06, 1.5, (0, 0, 1.9), m['timber'], None, 8, rotation=(0, math.pi / 2, 0))
    lathe('bucket', [(.16, 1.05), (.19, 1.35)], 10, m['timber'], None, cap=True)
    export('forest/well.glb', join='well')


def balloon():
    """A patchwork hot-air balloon about 6 m tall; origin at the basket floor."""
    reset()
    colors = [0xff8fb8, 0xffe066, 0x8fd3ff, 0xffffff, 0xff9f5a, 0xb18cff]
    envelope = [(0, 6.2), (.9, 6.05), (1.8, 5.6), (2.3, 4.8), (2.35, 4.0), (2.0, 3.0), (1.3, 2.2), (.6, 1.75)]
    bm = bmesh.new()
    seg = 12
    rings = []
    for i in range(seg):
        a = i / seg * math.tau
        rings.append([bm.verts.new((r * math.cos(a), r * math.sin(a), h)) for r, h in envelope])
    for i in range(seg):
        a, b = rings[i], rings[(i + 1) % seg]
        for j in range(len(envelope) - 1):
            f = bm.faces.new((a[j], b[j], b[j + 1], a[j + 1]))
            f.material_index = i % len(colors)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    mesh_object('envelope', bm, [material(f'Panel{i}', c, rough=.6) for i, c in enumerate(colors)], None, smooth=True)
    for i in range(4):
        a = i / 4 * math.tau + .4
        cylinder(f'rope-{i}', .015, 1.4, (math.cos(a) * .45, math.sin(a) * .45, 1.15), material('Rope', 0xc6ab74), None, 4)
    lathe('basket', [(.42, 0), (.45, .1), (.5, .55), (.52, .6)], 12, material('Basket', 0xa0703f, rough=.9), None, smooth=False)
    torus('basket-rim', .5, .05, (0, 0, .6), material('Timber', 0x76503a), None, 16, 6)
    export('forest/balloon.glb', join='balloon')


def build():
    cottage()
    windmill()
    well()
    balloon()
