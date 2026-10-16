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
    build_more()


# --- More life for the islands: farm, market, pond and apiary pieces. ---

def _at(obj, loc, rot=None):
    """box() bakes its location; build at the origin and place it here instead."""
    obj.location = loc
    if rot:
        obj.rotation_euler = rot
    return obj


def stall():
    """A market stall with a striped awning, crates of produce and a sign, 2.6 m tall."""
    reset()
    m = mats()
    stripe_a, stripe_b = material('AwningA', 0xff8fb8, rough=.7), material('AwningB', 0xfff3e6, rough=.7)
    _at(box('counter', (2.2, .8, .9), (0, 0, 0), m['timber'], None, .03), (0, 0, .45))
    for x in (-1.05, 1.05):
        for y in (-.35, .35):
            _at(box(f'post-{x}-{y}', (.08, .08, 2.4), (0, 0, 0), m['timber'], None), (x, y, 1.2))
    for k in range(8):
        _at(box(f'awning-{k}', (.28, 1.1, .05), (0, 0, 0), stripe_a if k % 2 else stripe_b, None), (-.98 + k * .28, -.15, 2.35), (math.radians(-12), 0, 0))
    produce = [material('Apples', 0xd6453c, rough=.5), material('Pears', 0xc8d84a, rough=.5), material('Carrots', 0xff9f3a, rough=.6)]
    for k, mat in enumerate(produce):
        x = -.7 + k * .7
        _at(box(f'crate-{k}', (.6, .5, .22), (0, 0, 0), m['timber'], None, .02), (x, -.1, 1.0))
        for j in range(6):
            sphere(f'fruit-{k}-{j}', .08, (x - .2 + (j % 3) * .2, -.2 + (j // 3) * .2, 1.15), mat, None, 8, 6)
    _at(box('sign', (1.2, .05, .3), (0, 0, 0), m['plaster'], None), (0, -.42, 2.0))
    export('forest/stall.glb', join='stall')


def beehive():
    """A stacked straw beehive (skep) on a little stand, 1.3 m tall."""
    reset()
    m = mats()
    _at(box('stand', (.7, .7, .08), (0, 0, 0), m['timber'], None), (0, 0, .55))
    for x in (-.28, .28):
        for y in (-.28, .28):
            _at(box(f'leg-{x}-{y}', (.06, .06, .55), (0, 0, 0), m['timber'], None), (x, y, .27))
    lathe('skep', [(.34, .6), (.36, .75), (.33, .95), (.26, 1.12), (.14, 1.24), (0, 1.28)], 14, m['thatch'], None)
    for h in (.72, .86, 1.0, 1.12):
        torus(f'coil-{h}', .35 - (h - .72) * .45, .025, (0, 0, h), material('Straw', 0xc8913f, rough=.9), None, 16, 4)
    _at(box('entrance', (.14, .06, .08), (0, 0, 0), material('Dark', 0x2a1c12), None), (0, -.35, .66))
    export('forest/beehive.glb', join='beehive')


def produce():
    """A pumpkin (radius ~0.3 m) and a cabbage for the vegetable patch."""
    reset()
    orange, stalk = material('Pumpkin', 0xf08a2c, rough=.55), material('Stalk', 0x5f7a2a, rough=.7)
    for k in range(8):
        a = k / 8 * math.tau
        s = sphere(f'lobe-{k}', .16, (math.cos(a) * .14, math.sin(a) * .14, .2), orange, None, 10, 8)
        s.scale = (1, 1, 1.15)
    cylinder('stalk', .03, .12, (0, 0, .4), stalk, None, 6)
    export('forest/pumpkin.glb', join='pumpkin')
    reset()
    leaf_a, leaf_b = material('Cabbage', 0x8fc95a, rough=.7), material('CabbageLight', 0xc6e6a0, rough=.7)
    sphere('heart', .16, (0, 0, .17), leaf_b, None, 10, 8)
    for k in range(7):
        a = k / 7 * math.tau
        s = sphere(f'leaf-{k}', .17, (math.cos(a) * .14, math.sin(a) * .14, .12), leaf_a, None, 8, 6)
        s.scale = (1, .6, .45)
        s.rotation_euler = (0, .5, a)
    export('forest/cabbage.glb', join='cabbage')


def haybale():
    """A round hay bale, 1.1 m across, lying on its side."""
    reset()
    hay, band = material('Hay', 0xe5c26a, rough=.95), material('Twine', 0xb07a3a, rough=.8)
    cylinder('bale', .55, 1.0, (0, 0, .55), hay, None, 20, rotation=(0, math.pi / 2, 0))
    for x in (-.25, .25):
        torus(f'band-{x}', .56, .02, (x, 0, .55), band, None, 24, 4, rotation=(0, math.pi / 2, 0))
    export('forest/haybale.glb', join='haybale')


def woodpile():
    """Stacked firewood logs with an axe in the chopping block."""
    reset()
    bark, cut = material('LogBark', 0x6a4630, rough=.9), material('LogCut', 0xe3bb7c, rough=.8)
    for row in range(3):
        for k in range(5 - row):
            x = -.48 + k * .24 + row * .12
            cylinder(f'log-{row}-{k}', .11, .9, (x, 0, .11 + row * .2), bark, None, 8, rotation=(math.pi / 2, 0, 0))
            for y in (-.451, .451):
                cylinder(f'end-{row}-{k}-{y}', .1, .01, (x, y, .11 + row * .2), cut, None, 8, rotation=(math.pi / 2, 0, 0))
    cylinder('block', .25, .4, (.9, 0, .2), bark, None, 10)
    cylinder('block-top', .24, .01, (.9, 0, .405), cut, None, 10)
    _at(box('axe-handle', (.04, .04, .6), (0, 0, 0), cut, None), (.9, 0, .65), (0, .35, 0))
    _at(box('axe-head', (.18, .03, .1), (0, 0, 0), material('Steel', 0x9aa0a8, rough=.3, metal=.8), None), (.82, 0, .48), (0, .35, 0))
    export('forest/woodpile.glb', join='woodpile')


def bench():
    """A garden bench, 1.4 m long."""
    reset()
    m = mats()
    for k in range(3):
        _at(box(f'seat-{k}', (1.4, .12, .05), (0, 0, 0), m['timber'], None, .01), (0, -.12 + k * .13, .45))
    for k in range(2):
        _at(box(f'back-{k}', (1.4, .05, .1), (0, 0, 0), m['timber'], None, .01), (0, .2, .62 + k * .18), (math.radians(-12), 0, 0))
    for x in (-.6, .6):
        _at(box(f'leg-{x}', (.07, .4, .45), (0, 0, 0), m['door'], None), (x, 0, .22))
    export('forest/bench.glb', join='bench')


def signpost():
    """A wooden signpost with three arrows, 2 m tall."""
    reset()
    m = mats()
    cylinder('post', .06, 2.0, (0, 0, 1.0), m['timber'], None, 8)
    for k, (rot, h) in enumerate(((.3, 1.75), (-.9, 1.5), (2.2, 1.25))):
        arrow = _at(box(f'arrow-{k}', (.7, .04, .16), (0, 0, 0), m['plaster'], None, .01), (math.cos(rot) * .3, math.sin(rot) * .3, h), (0, 0, rot))
    sphere('cap', .08, (0, 0, 2.02), m['timber'], None, 8, 6)
    export('forest/signpost.glb', join='signpost')


def sheep():
    """A fluffy sheep, 0.9 m tall, facing the game's +x. The head is part of the
    body; the game bobs and walks the whole sheep."""
    reset()
    wool, face = material('Wool', 0xfaf6ee, rough=.95), material('SheepFace', 0x3a3030, rough=.7)
    for k, (x, y, z, r) in enumerate([(0, 0, .55, .32), (.22, .1, .58, .26), (-.22, -.1, .58, .27), (.15, -.15, .62, .24), (-.15, .15, .62, .25), (0, 0, .78, .22)]):
        sphere(f'fluff-{k}', r, (x, y, z), wool, None, 10, 8)
    head = sphere('head', .16, (.42, 0, .7), face, None, 10, 8)
    head.scale = (1.2, .85, .9)
    for s in (-1, 1):
        e = sphere(f'ear-{s}', .07, (.38, s * .15, .78), face, None, 6, 4)
        e.scale = (1, .4, .6)
        sphere(f'eye-{s}', .025, (.55, s * .07, .74), material('Eye', 0xffffff), None, 6, 4)
    for x in (-.18, .18):
        for y in (-.12, .12):
            cylinder(f'leg-{x}-{y}', .045, .35, (x, y, .17), face, None, 6)
    export('forest/sheep.glb', join='sheep')


def chicken():
    """A little hen, 0.45 m tall, facing the game's +x."""
    reset()
    white, red, beak = material('Feathers', 0xfff4e0, rough=.8), material('Comb', 0xe0473c, rough=.6), material('ChickenBeak', 0xf0a43a, rough=.5)
    body = sphere('body', .17, (0, 0, .22), white, None, 10, 8)
    body.scale = (1.25, .9, .9)
    sphere('head', .09, (.17, 0, .37), white, None, 8, 6)
    sphere('comb', .04, (.18, 0, .46), red, None, 6, 4)
    lathe('beak', [(.025, 0), (0, .07)], 4, beak, None, smooth=False).location = (.26, 0, .36)
    bpy_tail = sphere('tail', .1, (-.2, 0, .3), white, None, 8, 6)
    bpy_tail.scale = (.6, .4, 1)
    for y in (-.05, .05):
        cylinder(f'leg-{y}', .015, .12, (0, y, .06), beak, None, 4)
    export('forest/chicken.glb', join='chicken')


def duck():
    """A floating duck, 0.35 m long, facing the game's +x."""
    reset()
    body_mat, head_mat, beak = material('Duck', 0xfff1c8, rough=.7), material('DuckHead', 0x3f8f5a, rough=.6), material('DuckBeak', 0xf0a43a, rough=.5)
    b = sphere('body', .15, (0, 0, .08), body_mat, None, 10, 8)
    b.scale = (1.3, .9, .7)
    sphere('head', .08, (.14, 0, .2), head_mat, None, 8, 6)
    bk = sphere('beak', .04, (.22, 0, .19), beak, None, 6, 4)
    bk.scale = (1.4, .8, .5)
    export('forest/duck.glb', join='duck')


def build_more():
    stall()
    beehive()
    produce()
    haybale()
    woodpile()
    bench()
    signpost()
    sheep()
    chicken()
    duck()
