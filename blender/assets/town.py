"""Urverkets stad as a room: a miniature clockwork town built on the floor of a
watchmaker's workshop. Townhouses, a clock tower, a wind-up toy train, wind-up
townsfolk, pigeons, a carousel and a fountain, plus the giant household things
of the room itself: a sleeping cat, a stack of books, a teacup, a clockwork
mouse, a houseplant and pendant lamps.

Origins at the foot of each model. The front (game +z) is Blender -y. Parts the
game animates are separate objects with documented names and pivots."""
import math
import bmesh
from mathutils import Vector
from lib import material, mesh_object, empty, lathe, sphere, cylinder, torus, box, export, reset

BRASS, GOLD, COPPER, IRON = 0xc99a4c, 0xf0ca7e, 0x986342, 0x263d40


def _at(obj, loc, rot=None):
    """box() bakes its location; build at the origin and place it here instead."""
    obj.location = loc
    if rot:
        obj.rotation_euler = rot
    return obj


def mats():
    return dict(
        wall=material('Wall', 0xe9d3ad, rough=.85), roof=material('Roof', 0x3f6f6a, rough=.6),
        trim=material('Trim', 0x5a3a2c, rough=.7), stone=material('Stone', 0x8f8173, rough=.95),
        glow=material('Window', 0xffd88a, rough=.3, emit=0xffc566, strength=2.4),
        door=material('Door', 0x6f3f2c, rough=.6), shutter=material('Shutter', 0x356966, rough=.6),
        brass=material('Brass', BRASS, rough=.3, metal=.8), gold=material('Gold', GOLD, rough=.28, metal=.75),
        iron=material('Iron', IRON, rough=.45, metal=.6), copper=material('Copper', COPPER, rough=.4, metal=.6),
    )


def prism(name, profile, length, along, mat, parent=None):
    """Extrude a closed (u, z) outline along Blender x or y, centred on 0."""
    bm = bmesh.new()
    rings = []
    for s in (-length / 2, length / 2):
        rings.append([bm.verts.new((s, u, z) if along == 'x' else (u, s, z)) for u, z in profile])
    n = len(profile)
    bm.faces.new(rings[0])
    bm.faces.new(list(reversed(rings[1])))
    for i in range(n):
        bm.faces.new((rings[0][i], rings[0][(i + 1) % n], rings[1][(i + 1) % n], rings[1][i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return mesh_object(name, bm, mat, parent)


def window(m, name, x, y, z, face, w=.55, h=.8):
    """A glowing window with frame, sill and shutters on a wall facing +x, -x or -y."""
    if face == '-y':
        size, off, side = (w, .08, h), (0, -.04, 0), lambda d: (d, 0, 0)
    else:
        sgn = 1 if face == '+x' else -1
        size, off, side = (.08, w, h), (sgn * .04, 0, 0), lambda d: (0, d, 0)
    _at(box(f'{name}-glass', size, (0, 0, 0), m['glow']), (x + off[0], y + off[1], z))
    frame = tuple(s + .1 if s > .1 else s for s in size)
    _at(box(f'{name}-head', (frame[0], frame[1], .1), (0, 0, 0), m['trim']), (x + off[0] * 1.5, y + off[1] * 1.5, z + h / 2 + .05))
    _at(box(f'{name}-sill', (frame[0] + .06 if face == '-y' else .2, .2 if face == '-y' else frame[1] + .06, .08), (0, 0, 0), m['trim']),
        (x + off[0] * 2.5, y + off[1] * 2.5, z - h / 2 - .04))
    for d in (-1, 1):
        dx, dy, _ = side(d * (w / 2 + .14))
        shutter = (.24, .05, h) if face == '-y' else (.05, .24, h)
        _at(box(f'{name}-shutter-{d}', shutter, (0, 0, 0), m['shutter']), (x + dx + off[0] * 1.5, y + dy + off[1] * 1.5, z))


def townhouse(variant):
    """Narrow clockwork-town houses facing the street (game +z). About 3.2 m wide
    and 3 m deep. Variant 0: tall gable-front house with a brass gear on the
    gable. Variant 1: eaves-front shop with a striped awning and a sign.
    Variant 2: a slim tower house with a little clock on the gable.
    Chimney tops (game units, for smoke): 0 -> (0.9, 7.6, -0.6),
    1 -> (-1.0, 6.5, 0.6), 2 -> (-0.6, 8.6, -0.5)."""
    reset()
    m = mats()
    W, D = 3.2, 3.0
    H, R = ((5.0, 2.0), (4.2, 1.4), (6.0, 2.2))[variant]
    _at(box('plinth', (W + .2, D + .2, .5), (0, 0, 0), m['stone']), (0, 0, .25))
    if variant == 1:
        prism('body', [(-D / 2, .5), (D / 2, .5), (D / 2, H), (0, H + R), (-D / 2, H)], W, 'x', m['wall'])
    else:
        prism('body', [(-W / 2, .5), (W / 2, .5), (W / 2, H), (0, H + R), (-W / 2, H)], D, 'y', m['wall'])
    # Timber corner posts and floor bands.
    for x in (-W / 2, W / 2):
        for y in (-D / 2, D / 2):
            _at(box(f'post-{x}-{y}', (.16, .16, H - .5), (0, 0, 0), m['trim']), (x, y, (H + .5) / 2))
    floors = [1.0 + k * 1.55 for k in range(int((H - 1.0) / 1.55) + 1)]
    for k, z in enumerate(floors[1:]):
        _at(box(f'band-front-{k}', (W + .1, .1, .12), (0, 0, 0), m['trim']), (0, -D / 2 - .03, z - .25))
    # Roof slabs.
    if variant == 1:
        a, L = math.atan2(R, D / 2), math.hypot(R, D / 2) + .35
        for s in (-1, 1):
            _at(box(f'roof-{s}', (W + .5, L, .14), (0, 0, 0), m['roof']), (0, s * (D / 4 + .05), H + R / 2 + .05), (-s * a, 0, 0))
        # A dormer window on the front slope.
        _at(box('dormer', (.9, .9, .9), (0, 0, 0), m['wall']), (0, -.55, H + .7))
        _at(box('dormer-roof', (1.1, 1.1, .1), (0, 0, 0), m['roof']), (0, -.55, H + 1.2))
        window(m, 'dormer-w', 0, -1.0, H + .65, '-y', .45, .5)
    else:
        a, L = math.atan2(R, W / 2), math.hypot(R, W / 2) + .35
        for s in (-1, 1):
            _at(box(f'roof-{s}', (L, D + .5, .14), (0, 0, 0), m['roof']), (s * (W / 4 + .05), 0, H + R / 2 + .05), (0, s * a, 0))
        _at(box('ridge', (.16, D + .55, .16), (0, 0, 0), m['trim']), (0, 0, H + R + .06))
    # Chimney.
    cx, cy = ((.9, .6), (-1.0, -.6), (-.6, .5))[variant]
    top = (H + R + .9, H + R + .9, H + R + .4)[variant]
    _at(box('chimney', (.5, .5, top - H), (0, 0, 0), m['stone']), (cx, cy, (top + H) / 2))
    _at(box('chimney-cap', (.62, .62, .12), (0, 0, 0), m['trim']), (cx, cy, top))
    # Door with step and lamp.
    _at(box('step', (1.1, .5, .15), (0, 0, 0), m['stone']), (0, -D / 2 - .3, .55))
    _at(box('door', (.8, .1, 1.45), (0, 0, 0), m['door']), (0, -D / 2 - .04, 1.3))
    _at(box('door-head', (1.0, .14, .12), (0, 0, 0), m['trim']), (0, -D / 2 - .06, 2.08))
    sphere('knob', .05, (.28, -D / 2 - .12, 1.25), m['brass'], None, 8, 6)
    # Windows: front ground floor beside the door, upper floors in pairs, both sides.
    for x in (-1.05, 1.05):
        window(m, f'g-{x}', x, -D / 2, 1.5, '-y', .5, .75)
    for k, z in enumerate(floors[1:]):
        if z + .9 > H + (R * .6 if variant != 1 else 0):
            break
        for x in (-.7, .7):
            window(m, f'f{k}-{x}', x, -D / 2, z + .55, '-y')
        for s, face in ((-1, '-x'), (1, '+x')):
            window(m, f's{k}-{s}', s * W / 2, 0, z + .55, face)
    if variant == 0:
        # A brass gear on the gable.
        torus('gable-gear', .38, .07, (0, -D / 2 - .06, H + .75), m['brass'], None, 24, 6, rotation=(math.pi / 2, 0, 0))
        for k in range(10):
            t = k / 10 * math.tau
            _at(box(f'tooth-{k}', (.13, .08, .13), (0, 0, 0), m['brass']), (math.cos(t) * .48, -D / 2 - .06, H + .75 + math.sin(t) * .48), (0, -t, 0))
        sphere('gable-hub', .1, (0, -D / 2 - .08, H + .75), m['gold'], None, 8, 6)
    if variant == 1:
        stripe = (material('AwningA', 0xd85b4a, rough=.7), material('AwningB', 0xfff1d8, rough=.7))
        for k in range(8):
            _at(box(f'awning-{k}', (.42, 1.1, .05), (0, 0, 0), stripe[k % 2]), (-1.47 + k * .42, -D / 2 - .5, 2.45), (math.radians(22), 0, 0))
        _at(box('sign', (1.6, .08, .4), (0, 0, 0), m['trim']), (0, -D / 2 - .05, 3.0))
        _at(box('sign-face', (1.4, .06, .28), (0, 0, 0), m['gold']), (0, -D / 2 - .1, 3.0))
    if variant == 2:
        cylinder('gable-clock', .42, .1, (0, -D / 2 - .05, H + .8), material('Dial', 0xf6e7c4, rough=.8), None, 24, rotation=(math.pi / 2, 0, 0))
        torus('gable-clock-rim', .43, .05, (0, -D / 2 - .1, H + .8), m['brass'], None, 24, 6, rotation=(math.pi / 2, 0, 0))
        _at(box('clock-hand-a', (.05, .04, .3), (0, 0, 0), m['iron']), (0, -D / 2 - .13, H + .9))
        _at(box('clock-hand-b', (.22, .04, .05), (0, 0, 0), m['iron']), (.1, -D / 2 - .13, H + .8))
        # A balcony on the first floor.
        _at(box('balcony', (2.0, .7, .1), (0, 0, 0), m['trim']), (0, -D / 2 - .35, floors[1] - .2))
        for k in range(9):
            cylinder(f'baluster-{k}', .03, .5, (-.95 + k * .2375, -D / 2 - .66, floors[1] + .05), m['iron'], None, 6)
        _at(box('rail', (2.0, .06, .06), (0, 0, 0), m['iron']), (0, -D / 2 - .66, floors[1] + .3))
    export(f'clockwork/townhouse-{variant}.glb', join=f'townhouse-{variant}')


def clock_tower():
    """The town clock tower, 13.5 m tall with a 2.8 m square shaft. The front clock
    face (game +z) is centred at (0, 9.6, 1.62) with radius 1.05; the game adds
    moving hands there. A bell hangs in the open belfry at (0, 11.4, 0)."""
    reset()
    m = mats()
    _at(box('base', (3.6, 3.6, 1.2), (0, 0, 0), m['stone']), (0, 0, .6))
    _at(box('shaft', (2.8, 2.8, 7.6), (0, 0, 0), m['wall']), (0, 0, 4.9))
    for x in (-1.4, 1.4):
        for y in (-1.4, 1.4):
            _at(box(f'pier-{x}-{y}', (.35, .35, 9.2), (0, 0, 0), m['trim']), (x, y, 5.4))
    for z in (1.25, 4.0, 8.65):
        _at(box(f'band-{z}', (3.1, 3.1, .22), (0, 0, 0), m['brass']), (0, 0, z))
    _at(box('door', (1.0, .1, 1.9), (0, 0, 0), m['door']), (0, -1.43, 2.15))
    for z in (5.4, 7.0):
        window(m, f'tw-{z}', 0, -1.4, z, '-y', .45, .8)
        for s, face in ((-1, '-x'), (1, '+x')):
            window(m, f'tw-{z}-{s}', s * 1.4, 0, z, face, .45, .8)
    # Clock stage: a slightly wider block with a dial on every side.
    _at(box('clock-stage', (3.2, 3.2, 2.4), (0, 0, 0), m['wall']), (0, 0, 9.85))
    dial = material('Dial', 0xf6e7c4, rough=.8)
    for k, (dx, dy, rot) in enumerate(((0, -1.62, (math.pi / 2, 0, 0)), (0, 1.62, (math.pi / 2, 0, 0)), (-1.62, 0, (0, math.pi / 2, 0)), (1.62, 0, (0, math.pi / 2, 0)))):
        cylinder(f'dial-{k}', 1.05, .06, (dx, dy, 9.6), dial, None, 32, rotation=rot)
        torus(f'dial-rim-{k}', 1.08, .08, (dx * 1.02, dy * 1.02, 9.6), m['brass'], None, 32, 6, rotation=rot)
        for h in range(12):
            t = h / 12 * math.tau
            u, z = math.cos(t) * .85, 9.6 + math.sin(t) * .85
            tick = (.08, .06, .16) if dx == 0 else (.06, .08, .16)
            _at(box(f'tick-{k}-{h}', tick, (0, 0, 0), m['iron']), (u if dx == 0 else dx * 1.03, dy * 1.03 if dx == 0 else u, z), (0, -t, 0) if dx == 0 else (t, 0, 0))
        if k:
            # The back and side dials get fixed hands; the front ones move in the game.
            hand = (.06, .04, .65) if dx == 0 else (.04, .06, .65)
            _at(box(f'hand-{k}', hand, (0, 0, 0), m['iron']), (dx * 1.05, dy * 1.05, 9.85))
    _at(box('cornice', (3.6, 3.6, .25), (0, 0, 0), m['trim']), (0, 0, 11.1))
    # Open belfry on four piers, with a bell.
    for x in (-1.3, 1.3):
        for y in (-1.3, 1.3):
            _at(box(f'belfry-{x}-{y}', (.3, .3, 1.5), (0, 0, 0), m['trim']), (x, y, 12.0))
    lathe('bell', [(.0, 11.95), (.45, 11.95), (.5, 12.05), (.38, 12.4), (.3, 12.75), (0, 12.85)], 16, m['gold'])
    _at(box('belfry-floor', (3.0, 3.0, .15), (0, 0, 0), m['trim']), (0, 0, 11.3))
    roof = lathe('spire', [(2.35, 12.7), (2.2, 12.8), (.25, 15.6), (0, 15.8)], 4, m['roof'], smooth=False)
    roof.rotation_euler = (0, 0, math.pi / 4)
    cylinder('finial', .05, 1.0, (0, 0, 16.2), m['gold'], None, 6)
    sphere('finial-ball', .16, (0, 0, 15.9), m['gold'], None, 10, 6)
    export('clockwork/clock-tower.glb', join='clock-tower')


def locomotive():
    """A wind-up toy locomotive, 2.8 m long, facing game +x. Funnel top at
    game (0.95, 2.05, 0). The wind-up key is a separate object named 'key'
    on the cab roof, turning about game y."""
    reset()
    red, black = material('Paint', 0xc9483c, rough=.45), material('Iron', IRON, rough=.45, metal=.6)
    brass, gold = material('Brass', BRASS, rough=.3, metal=.8), material('Gold', GOLD, rough=.28, metal=.75)
    root = empty('locomotive')
    _at(box('chassis', (2.7, 1.0, .25), (0, 0, 0), black, root), (0, 0, .45))
    cylinder('boiler', .5, 1.6, (.35, 0, 1.05), red, root, 20, rotation=(0, math.pi / 2, 0))
    cylinder('smokebox', .52, .3, (1.2, 0, 1.05), black, root, 20, rotation=(0, math.pi / 2, 0))
    for x in (-.1, .5, 1.0):
        torus(f'boiler-band-{x}', .51, .035, (x, 0, 1.05), brass, root, 24, 6, rotation=(0, math.pi / 2, 0))
    lathe('funnel', [(.16, 1.45), (.14, 1.75), (.26, 2.0), (.24, 2.05)], 12, black, root)
    lathe('dome', [(.2, 1.5), (.18, 1.62), (0, 1.72)], 12, brass, root)
    _at(box('cab', (.95, 1.05, 1.15), (0, 0, 0), red, root), (-.85, 0, 1.15))
    _at(box('cab-roof', (1.15, 1.25, .1), (0, 0, 0), black, root), (-.85, 0, 1.78))
    for s in (-1, 1):
        _at(box(f'cab-window-{s}', (.45, .06, .4), (0, 0, 0), material('Window', 0xffd88a, rough=.3, emit=0xffc566, strength=1.6), root), (-.8, s * .53, 1.35))
    for x in (-.85, -.1, .65):
        for s in (-1, 1):
            cylinder(f'wheel-{x}-{s}', .32 if x > -.5 else .26, .1, (x, s * .52, .4), brass, root, 16, rotation=(math.pi / 2, 0, 0))
    _at(box('cowcatcher', (.35, .9, .3), (0, 0, 0), black, root), (1.45, 0, .35), (0, math.radians(25), 0))
    sphere('lamp', .12, (1.38, 0, 1.45), material('Window', 0xffd88a, rough=.3, emit=0xffc566, strength=1.6), root, 10, 6)
    key = empty('key', root, (-.85, 0, 1.83))
    cylinder('key-shaft', .05, .4, (0, 0, .2), gold, key, 8)
    for s in (-1, 1):
        torus(f'key-loop-{s}', .17, .045, (s * .2, 0, .45), gold, key, 16, 6, rotation=(math.pi / 2, 0, 0))
    export('clockwork/locomotive.glb')


def wagon(variant):
    """Toy train wagons, 2.2 m long, facing game +x. Variant 0 is a passenger
    coach with glowing windows; variant 1 an open truck carrying gears."""
    reset()
    black, brass = material('Iron', IRON, rough=.45, metal=.6), material('Brass', BRASS, rough=.3, metal=.8)
    paint = material('Paint', (0x356966, 0x986342)[variant], rough=.45)
    _at(box('chassis', (2.1, .95, .2), (0, 0, 0), black), (0, 0, .45))
    for x in (-.65, .65):
        for s in (-1, 1):
            cylinder(f'wheel-{x}-{s}', .24, .1, (x, s * .5, .3), brass, None, 14, rotation=(math.pi / 2, 0, 0))
    if variant == 0:
        _at(box('body', (2.0, 1.0, 1.0), (0, 0, 0), paint), (0, 0, 1.05))
        _at(box('roof', (2.2, 1.15, .12), (0, 0, 0), material('Roof', 0xf0e2c0, rough=.6)), (0, 0, 1.62))
        for x in (-.6, 0, .6):
            for s in (-1, 1):
                _at(box(f'w-{x}-{s}', (.38, .06, .38), (0, 0, 0), material('Window', 0xffd88a, rough=.3, emit=0xffc566, strength=1.8)), (x, s * .51, 1.15))
    else:
        _at(box('floor', (2.0, 1.0, .1), (0, 0, 0), paint), (0, 0, .6))
        for s in (-1, 1):
            _at(box(f'side-{s}', (2.0, .08, .5), (0, 0, 0), paint), (0, s * .48, .85))
        for s in (-1, 1):
            _at(box(f'end-{s}', (.08, 1.0, .5), (0, 0, 0), paint), (s * .98, 0, .85))
        gold = material('Gold', GOLD, rough=.28, metal=.75)
        for k, (x, r) in enumerate(((-.5, .38), (.15, .3), (.6, .25))):
            torus(f'cargo-{k}', r, .09, (x, 0, .85 + r * .4), gold, None, 16, 6, rotation=(math.radians(70), 0, k))
    export(f'clockwork/wagon-{variant}.glb', join=f'wagon-{variant}')


def townsfolk():
    """A wind-up townsperson, 1.35 m tall, facing game +z. The coat ('Coat')
    and hat ('Hat') materials are tinted per person. The wind-up key is a
    separate object named 'key' at the back (game -z), turning about game z."""
    reset()
    coat, hat = material('Coat', 0x356966, rough=.6), material('Hat', 0x2a2a2a, rough=.6)
    skin, dark = material('Skin', 0xf2c9a0, rough=.7), material('Iron', IRON, rough=.45, metal=.6)
    gold = material('Gold', GOLD, rough=.28, metal=.75)
    root = empty('townsfolk')
    lathe('coat', [(.34, 0), (.36, .08), (.3, .45), (.22, .78), (.16, .86), (0, .88)], 16, coat, root)
    sphere('head', .2, (0, 0, 1.03), skin, root, 14, 10)
    for s in (-1, 1):
        sphere(f'eye-{s}', .025, (s * .07, -.18, 1.07), dark, root, 6, 4)
        arm = sphere(f'arm-{s}', .08, (s * .27, 0, .62), coat, root, 8, 6)
        arm.scale = (.8, .8, 2.0)
        sphere(f'hand-{s}', .06, (s * .29, -.03, .45), skin, root, 8, 6)
    sphere('nose', .035, (0, -.2, 1.02), material('Cheek', 0xe8a084, rough=.7), root, 6, 4)
    for k in range(3):
        sphere(f'button-{k}', .03, (0, -.3 + k * .04, .3 + k * .15), gold, root, 6, 4)
    cylinder('hat-brim', .25, .04, (0, 0, 1.18), hat, root, 16)
    cylinder('hat-top', .15, .3, (0, 0, 1.34), hat, root, 16)
    key = empty('key', root, (0, .3, .55))
    cylinder('key-shaft', .03, .22, (0, .1, 0), gold, key, 8, rotation=(math.pi / 2, 0, 0))
    for s in (-1, 1):
        torus(f'key-loop-{s}', .09, .025, (s * .1, .22, 0), gold, key, 14, 5, rotation=(math.pi / 2, 0, 0))
    export('clockwork/townsfolk.glb')


def pigeon():
    """A town pigeon, 0.45 m long, facing game +z."""
    reset()
    grey, neck = material('Feather', 0x8d93a1, rough=.7), material('Neck', 0x5f8a85, rough=.4, metal=.2)
    body = sphere('body', .18, (0, 0, .2), grey, None, 12, 8)
    body.scale = (.85, 1.3, .9)
    sphere('head', .09, (0, -.2, .35), neck, None, 10, 8)
    beak = cylinder('beak', .02, .08, (0, -.3, .34), material('Beak', 0xe8b04a), None, 6, rotation=(math.pi / 2, 0, 0))
    tail = box('tail', (.14, .2, .03), (0, 0, 0), material('Dark', 0x5d6270, rough=.7))
    _at(tail, (0, .25, .2), (math.radians(-15), 0, 0))
    for s in (-1, 1):
        sphere(f'eye-{s}', .015, (s * .06, -.26, .38), material('Black', 0x111111), None, 6, 4)
        cylinder(f'leg-{s}', .012, .1, (s * .05, 0, .05), material('Beak', 0xe8b04a), None, 4)
    export('clockwork/pigeon.glb', join='pigeon')


def zeppelin():
    """A little brass-and-canvas airship, 7.6 m long along game x. Its origin is
    the envelope's centre. The propeller is a separate object named 'prop' at
    game (-3.9, -1.55, 0), spinning about game x."""
    reset()
    canvas, brass = material('Canvas', 0xe9d7b0, rough=.7), material('Brass', BRASS, rough=.3, metal=.8)
    stripe = material('Stripe', 0xc9483c, rough=.6)
    root = empty('zeppelin')
    env = lathe('envelope', [(0, -3.8), (.6, -3.5), (1.15, -2.6), (1.35, -1.2), (1.35, .8), (1.15, 2.4), (.6, 3.4), (0, 3.8)], 24, canvas, root)
    env.rotation_euler = (0, math.pi / 2, 0)
    for x in (-2.0, 0, 2.0):
        torus(f'band-{x}', 1.33 if abs(x) < 1 else 1.28, .05, (x, 0, 0), stripe if x == 0 else brass, root, 32, 6, rotation=(0, math.pi / 2, 0))
    for k in range(4):
        a = k * math.pi / 2
        fin = box(f'fin-{k}', (1.1, .06, .8), (0, 0, 0), stripe, root)
        fin.location = (-3.2, math.cos(a) * .9, math.sin(a) * .9)
        fin.rotation_euler = (a, 0, 0)
    _at(box('gondola', (2.0, .7, .6), (0, 0, 0), material('Timber', 0x76503a, rough=.7), root), (.2, 0, -1.65))
    for x in (-.4, .2, .8):
        for s in (-1, 1):
            _at(box(f'gw-{x}-{s}', (.3, .05, .22), (0, 0, 0), material('Window', 0xffd88a, rough=.3, emit=0xffc566, strength=1.8), root), (x, s * .36, -1.6))
    for x in (-.6, 1.0):
        cylinder(f'strut-{x}', .03, .5, (x, 0, -1.2), brass, root, 6)
    cylinder('shaft', .04, 1.0, (-3.4, 0, -1.55), brass, root, 6, rotation=(0, math.pi / 2, 0))
    # The glTF exporter maps Blender (x, y, z) to game (x, z, -y).
    prop = empty('prop', root, (-3.9, 0, -1.55))
    sphere('prop-hub', .1, (0, 0, 0), brass, prop, 8, 6)
    for k in range(3):
        a = k * math.tau / 3
        blade = box(f'blade-{k}', (.04, .14, .6), (0, 0, 0), material('Timber', 0x76503a, rough=.7), prop)
        blade.location = (0, math.sin(a) * .3, math.cos(a) * .3)
        blade.rotation_euler = (-a, 0, 0)
    export('clockwork/zeppelin.glb')


def cat():
    """A big ginger cat curled up asleep, about 4.6 m across (it is a real cat in
    the room). The tail is a separate object named 'tail', pivoting about game y
    at its base (game (-1.5, 0.3, 0.9)); the game sways it. The body is named
    'body' so the game can make it breathe."""
    reset()
    fur, cream = material('Fur', 0xe39a52, rough=.9), material('FurLight', 0xf6dfbf, rough=.9)
    stripe, pink, dark = material('FurStripe', 0xb86a34, rough=.9), material('Pink', 0xe89a9a, rough=.7), material('Black', 0x2a2020, rough=.5)
    root = empty('cat')
    body = empty('body', root, (0, 0, 0))
    b = sphere('torso', 1.0, (0, 0, .95), fur, body, 24, 16)
    b.scale = (2.0, 1.6, .95)
    for k, x in enumerate((-1.25, -.6, .05, .7)):
        # Thin ellipsoid slices a few percent proud of the torso read as stripes.
        f = math.sqrt(1 - (x / 2.0) ** 2)
        band = sphere(f'stripe-{k}', 1.0, (x, 0, .95), stripe, body, 20, 12)
        band.scale = (.16, 1.6 * f * 1.035, .95 * f * 1.05)
    # The head rests on the front paws, facing the viewer (game +z).
    head = sphere('head', .82, (1.25, -1.1, .9), fur, body, 20, 14)
    head.scale = (1.05, .95, .85)
    muzzle = sphere('muzzle', .38, (1.35, -1.78, .72), cream, body, 14, 10)
    muzzle.scale = (1.2, .8, .7)
    sphere('nose', .09, (1.35, -2.03, .82), pink, body, 8, 6)
    for s in (-1, 1):
        ear = lathe(f'ear-{s}', [(.3, 0), (0, .55)], 4, fur, body, smooth=False)
        ear.location = (1.25 + s * .48, -1.05, 1.5)
        ear.rotation_euler = (math.radians(-10), s * math.radians(-22), math.radians(45))
        inner = lathe(f'ear-in-{s}', [(.18, 0), (0, .38)], 4, pink, body, smooth=False)
        inner.location = (1.25 + s * .48, -1.15, 1.52)
        inner.rotation_euler = (math.radians(-10), s * math.radians(-22), math.radians(45))
        # Closed, sleepy eyes.
        lid = torus(f'eye-{s}', .13, .03, (1.35 + s * .32, -1.84, 1.02), dark, body, 12, 4, rotation=(math.pi / 2, 0, 0))
        lid.scale = (1, .5, 1)
        for k in range(3):
            w = cylinder(f'whisker-{s}-{k}', .012, .7, (1.35 + s * .62, -1.95, .72 + (k - 1) * .07), cream, body, 4, rotation=(0, math.pi / 2, s * (k - 1) * .15))
        paw = sphere(f'paw-{s}', .32, (1.35 + s * .45, -1.85, .25), cream, body, 12, 8)
        paw.scale = (1.0, 1.4, .7)
    hind = sphere('hind', .5, (-1.3, -1.25, .35), fur, body, 12, 8)
    hind.scale = (1.4, 1.0, .7)
    # The tail wraps round the front, from the back of the body.
    tail = empty('tail', root, (-1.5, -.9, .3))
    for k in range(14):
        t = k / 13
        a = math.pi * (.9 + t * .8)
        r = 1.0 + t * .6
        sphere(f'tail-{k}', .3 - t * .08, (math.cos(a) * r + 1.0, math.sin(a) * r * .9 + .8 - 1.8 * t, 0), stripe if k % 3 == 2 else (cream if k == 13 else fur), tail, 10, 8)
    export('clockwork/cat.glb')


def carousel():
    """A small carousel, 4.6 m across and 4.4 m tall. The turning part (platform,
    horses and roof) is a separate object named 'spin' with its origin on the
    centre axis; it turns about game y."""
    reset()
    brass, gold = material('Brass', BRASS, rough=.3, metal=.8), material('Gold', GOLD, rough=.28, metal=.75)
    root = empty('carousel')
    lathe('base', [(2.4, 0), (2.4, .3), (2.2, .35)], 24, material('Stone', 0x8f8173, rough=.95), root, smooth=False)
    spin = empty('spin', root, (0, 0, 0))
    lathe('platform', [(2.2, .35), (2.2, .55), (0, .55)], 24, material('Timber', 0x76503a, rough=.7), spin, smooth=False)
    cylinder('pole', .2, 3.6, (0, 0, 2.3), brass, spin, 12)
    colors = (0xc9483c, 0xfff1d8)
    bm = bmesh.new()
    seg = 16
    prof = [(2.5, 3.6), (2.45, 3.75), (1.2, 4.15), (0, 4.4)]
    rings = [[bm.verts.new((r * math.cos(i / seg * math.tau), r * math.sin(i / seg * math.tau), h)) for r, h in prof] for i in range(seg)]
    for i in range(seg):
        a, b = rings[i], rings[(i + 1) % seg]
        for j in range(len(prof) - 1):
            unique = list(dict.fromkeys((a[j], b[j], b[j + 1], a[j + 1])))
            if len(unique) >= 3:
                try:
                    f = bm.faces.new(unique)
                    f.material_index = i % 2
                except ValueError:
                    pass
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    mesh_object('canopy', bm, [material(f'Canopy{i}', c, rough=.6) for i, c in enumerate(colors)], spin, smooth=False)
    for k in range(16):
        a = k / 16 * math.tau
        sphere(f'bulb-{k}', .07, (math.cos(a) * 2.45, math.sin(a) * 2.45, 3.55), material('Bulb', 0xfff0c0, emit=0xffd27a, strength=3), spin, 6, 4)
    sphere('top', .2, (0, 0, 4.5), gold, spin, 10, 6)
    horse_colors = (0xfff1d8, 0x8fb8d8, 0xe8a0b0, 0xf0ca7e)
    for k in range(4):
        a = k / 4 * math.tau
        x, y = math.cos(a) * 1.55, math.sin(a) * 1.55
        cylinder(f'horse-pole-{k}', .04, 3.05, (x, y, 2.05), gold, spin, 6)
        hm = material(f'Horse{k}', horse_colors[k], rough=.5)
        horse = empty(f'horse-{k}', spin, (x, y, 1.55))
        horse.rotation_euler = (0, 0, a + math.pi / 2)
        body = sphere(f'hb-{k}', .3, (0, 0, 0), hm, horse, 12, 8)
        body.scale = (2.0, .8, .9)
        head = sphere(f'hh-{k}', .2, (.55, 0, .4), hm, horse, 10, 6)
        head.scale = (1.4, .7, .9)
        for lx in (-.35, .35):
            cylinder(f'hl-{k}-{lx}', .05, .55, (lx, 0, -.4), hm, horse, 6)
        _at(box(f'saddle-{k}', (.35, .62, .08), (0, 0, 0), material('Saddle', 0xc9483c, rough=.5), horse), (0, 0, .27))
    export('clockwork/carousel.glb')


def fountain():
    """A two-tier town fountain, 3.4 m across and 2.6 m tall. Water surfaces use
    the 'Water' material."""
    reset()
    stone, water = material('Stone', 0xb9ab98, rough=.9), material('Water', 0x6fb8c8, rough=.08, metal=.1)
    lathe('basin', [(1.7, 0), (1.72, .55), (1.55, .6), (1.5, .2), (0, .2)], 24, stone, None, smooth=False)
    cylinder('pool', 1.5, .05, (0, 0, .45), water, None, 24)
    lathe('column', [(.3, .2), (.22, 1.3), (.3, 1.4)], 12, stone, None)
    lathe('bowl', [(0, 1.35), (.8, 1.45), (.85, 1.6), (.75, 1.6)], 18, stone, None, smooth=False)
    cylinder('bowl-water', .75, .04, (0, 0, 1.56), water, None, 18)
    lathe('top', [(.12, 1.6), (.08, 2.2), (.18, 2.3), (0, 2.6)], 10, material('Brass', BRASS, rough=.3, metal=.8), None)
    export('clockwork/fountain.glb', join='fountain')


def books():
    """A stack of three giant books lying on the floor, 1.5 m high in all."""
    reset()
    pages = material('Pages', 0xf3e6c8, rough=.9)
    gold = material('Gold', GOLD, rough=.28, metal=.75)
    specs = (((4.2, 3.0, .6), 0xb0473c, .05), ((3.8, 2.7, .5), 0x356966, -.18), ((3.4, 2.5, .42), 0x6b4a8a, .12))
    z = 0
    for k, (size, color, rot) in enumerate(specs):
        cover = material(f'Cover{k}', color, rough=.6)
        g = empty(f'book-{k}', None, (0, 0, z))
        g.rotation_euler = (0, 0, rot)
        _at(box(f'cover-{k}', size, (0, 0, 0), cover, g), (0, 0, size[2] / 2))
        _at(box(f'pages-{k}', (size[0] - .15, size[1] - .1, size[2] - .1), (0, 0, 0), pages, g), (.08, 0, size[2] / 2))
        for x in (-.6, .6):
            _at(box(f'band-{k}-{x}', (.08, size[1] + .02, size[2] + .02), (0, 0, 0), gold, g), (-size[0] / 2 + .25 + x * .2, 0, size[2] / 2))
        z += size[2]
    export('clockwork/books.glb', join='books')


def teacup():
    """A giant teacup on its saucer, 1.6 m tall. Steam rises from (0, 1.5, 0)."""
    reset()
    china, band = material('China', 0xf8f1e4, rough=.3), material('ChinaBand', 0x3f6f9a, rough=.35)
    tea = material('Tea', 0x8a4a22, rough=.1)
    lathe('saucer', [(0, 0), (1.0, 0), (1.6, .12), (1.65, .2), (1.1, .1), (0, .1)], 32, china, None)
    lathe('cup', [(.55, .1), (.6, .2), (1.0, .7), (1.15, 1.45), (1.1, 1.5), (.98, 1.45), (.85, .7), (0, .3)], 32, china, None)
    torus('cup-band', 1.1, .05, (0, 0, 1.25), band, None, 40, 6)
    cylinder('tea', 1.05, .05, (0, 0, 1.3), tea, None, 32)
    torus('handle', .38, .09, (1.25, 0, .95), china, None, 20, 8, rotation=(math.pi / 2, 0, 0))
    export('clockwork/teacup.glb', join='teacup')


def mouse():
    """A clockwork mouse, 1.1 m long, facing game +z. The key is a separate
    object named 'key' at its back, turning about game z."""
    reset()
    tin, pink = material('Tin', 0xa8adb5, rough=.35, metal=.6), material('Pink', 0xe89a9a, rough=.6)
    root = empty('mouse')
    body = sphere('body', .3, (0, 0, .3), tin, root, 16, 10)
    body.scale = (1.0, 1.7, .9)
    for s in (-1, 1):
        ear = cylinder(f'ear-{s}', .15, .04, (s * .18, -.35, .62), pink, root, 12, rotation=(math.pi / 2, 0, 0))
        sphere(f'eye-{s}', .04, (s * .12, -.47, .42), material('Black', 0x111111), root, 6, 4)
        cylinder(f'wheel-{s}', .08, .04, (s * .22, 0, .08), material('Brass', BRASS, rough=.3, metal=.8), root, 10, rotation=(0, math.pi / 2, 0))
    sphere('nose', .05, (0, -.62, .28), pink, root, 6, 4)
    for k in range(6):
        sphere(f'tail-{k}', .03, (math.sin(k * .7) * .12, .5 + k * .12, .15 + k * .015), pink, root, 6, 4)
    key = empty('key', root, (0, .1, .58))
    cylinder('key-shaft', .03, .18, (0, 0, .09), material('Gold', GOLD, rough=.28, metal=.75), key, 8)
    for s in (-1, 1):
        torus(f'key-loop-{s}', .08, .022, (s * .09, 0, .2), material('Gold', GOLD, rough=.28, metal=.75), key, 12, 5, rotation=(math.pi / 2, 0, 0))
    export('clockwork/mouse.glb')


def houseplant():
    """A giant potted houseplant, 7 m tall: terracotta pot and broad leaves."""
    reset()
    pot, soil = material('Terracotta', 0xb8643e, rough=.85), material('Soil', 0x3a2a20, rough=1)
    leaf, leaf_light = material('Leaf', 0x3f7f3a, rough=.6), material('LeafLight', 0x5f9a48, rough=.6)
    lathe('pot', [(1.3, 0), (1.6, 2.2), (1.75, 2.3), (1.75, 2.6), (1.55, 2.6), (1.45, 2.35)], 24, pot, None, smooth=False, cap=True)
    cylinder('soil', 1.5, .1, (0, 0, 2.35), soil, None, 24)
    for k in range(11):
        a = k * 2.4
        tilt = .35 + (k % 4) * .17
        L = 2.6 + (k % 3) * .7
        stem = cylinder(f'stem-{k}', .06, L, (0, 0, 0), leaf, None, 6)
        dx, dy = math.cos(a) * math.sin(tilt), math.sin(a) * math.sin(tilt)
        stem.location = (dx * L / 2, dy * L / 2, 2.4 + math.cos(tilt) * L / 2)
        stem.rotation_euler = (-math.sin(a) * tilt, math.cos(a) * tilt, 0)
        tip = Vector((dx * L, dy * L, 2.4 + math.cos(tilt) * L))
        blade = sphere(f'leaf-{k}', 1.0, tip, leaf_light if k % 2 else leaf, None, 12, 8)
        blade.scale = (1.1, .45, .08)
        blade.rotation_euler = (math.radians(20) * math.cos(a), -tilt - .3, a)
    export('clockwork/houseplant.glb', join='houseplant')


def pendant():
    """A hanging enamel lamp: shade and glowing bulb at the origin, cord rising
    40 m so its top is never seen."""
    reset()
    enamel, brass = material('Enamel', 0x2f5a55, rough=.4), material('Brass', BRASS, rough=.3, metal=.8)
    lathe('shade', [(1.6, -.1), (1.55, 0), (.9, .7), (.35, 1.1), (.3, 1.4)], 24, enamel, None)
    lathe('shade-in', [(1.5, -.05), (.85, .65), (.3, 1.05)], 24, material('ShadeIn', 0xfff0d0, emit=0xffd090, strength=.8), None)
    sphere('bulb', .45, (0, 0, .2), material('Bulb', 0xfff0c0, emit=0xffd27a, strength=6), None, 14, 10)
    cylinder('cap', .35, .4, (0, 0, 1.5), brass, None, 12)
    cylinder('cord', .05, 40, (0, 0, 21.6), material('Cord', 0x222222), None, 6)
    export('clockwork/pendant.glb', join='pendant')


def build():
    for v in range(3):
        townhouse(v)
    clock_tower()
    locomotive()
    wagon(0)
    wagon(1)
    townsfolk()
    pigeon()
    zeppelin()
    cat()
    carousel()
    fountain()
    books()
    teacup()
    mouse()
    houseplant()
    pendant()
