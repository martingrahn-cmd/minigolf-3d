"""Månkarnevalen as a living fair: rides, stalls and visitors for the ring of
carnival islands round each moon hole. Cute one-eyed aliens out for the
evening, a chair swing ride, a rocket ride, snack kiosks, game booths, a
drop tower, a coaster car and a hovering UFO.

Origins at the foot of each model; the front (game +z) is Blender -y. Parts the
game animates are separate objects with documented names and pivots. The
glTF exporter maps Blender (x, y, z) to game (x, z, -y)."""
import math
import bmesh
from lib import material, mesh_object, empty, lathe, sphere, cylinder, torus, box, export, reset

IVORY, RED, VIOLET, DEEP, TEAL, GOLD = 0xf4e8d2, 0xd5485b, 0x6c4bb0, 0x2c2250, 0x3fbfb2, 0xf2c25c


def _at(obj, loc, rot=None):
    """box() bakes its location; build at the origin and place it here instead."""
    obj.location = loc
    if rot:
        obj.rotation_euler = rot
    return obj


def mats():
    return dict(
        ivory=material('Ivory', IVORY, rough=.5), red=material('Red', RED, rough=.5),
        deep=material('Deep', DEEP, rough=.6), teal=material('Teal', TEAL, rough=.5),
        gold=material('Gold', GOLD, rough=.3, metal=.6), steel=material('Steel', 0xd8d2e8, rough=.35, metal=.5),
        bulb=material('Bulb', 0xfff0c0, emit=0xffd27a, strength=3),
    )


def striped_cone(name, prof, seg, colors, parent=None):
    """A lathe whose segments alternate between materials (tent and ride roofs)."""
    bm = bmesh.new()
    rings = [[bm.verts.new((r * math.cos(i / seg * math.tau), r * math.sin(i / seg * math.tau), h)) for r, h in prof] for i in range(seg)]
    for i in range(seg):
        a, b = rings[i], rings[(i + 1) % seg]
        for j in range(len(prof) - 1):
            unique = list(dict.fromkeys((a[j], b[j], b[j + 1], a[j + 1])))
            if len(unique) >= 3:
                try:
                    f = bm.faces.new(unique)
                    f.material_index = i % len(colors)
                except ValueError:
                    pass
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return mesh_object(name, bm, list(colors), parent, smooth=False)


def alien():
    """A carnival visitor: a round, one-eyed alien, 1.1 m tall, facing game +z.
    Its skin uses the 'Skin' material (tinted per visitor)."""
    reset()
    skin = material('Skin', 0x7fdc8a, rough=.5)
    white, dark = material('EyeWhite', 0xffffff, rough=.2), material('Pupil', 0x1a1430, rough=.2)
    glow = material('AntennaGlow', 0xff8fc8, emit=0xff6fb8, strength=2.5)
    body = sphere('body', .38, (0, 0, .5), skin, None, 16, 12)
    body.scale = (1, .95, 1.15)
    sphere('eye', .17, (0, -.3, .66), white, None, 14, 10)
    sphere('pupil', .085, (0, -.44, .67), dark, None, 10, 8)
    torus('smile', .08, .018, (0, -.36, .43), dark, None, 12, 4, rotation=(math.pi / 2, 0, 0)).scale = (1, .5, 1)
    for s in (-1, 1):
        cylinder(f'antenna-{s}', .015, .3, (s * .14, 0, 1.05), skin, None, 6, rotation=(0, s * .35, 0))
        sphere(f'antenna-ball-{s}', .055, (s * .2, 0, 1.19), glow, None, 8, 6)
        foot = sphere(f'foot-{s}', .12, (s * .17, -.06, .08), skin, None, 10, 6)
        foot.scale = (1, 1.4, .6)
        arm = sphere(f'arm-{s}', .07, (s * .38, 0, .5), skin, None, 8, 6)
        arm.scale = (1, 1, 2.2)
    export('moon/alien.glb', join='alien')


def swing_ride():
    """A chair swing ride, 6.4 m tall and 7 m across when flying. 'spin' turns
    about game y. Under it, eight pivots 'arm-0'..'arm-7' sit on the canopy rim
    with game local x pointing outward; turning a pivot about its local z swings
    its chair outward."""
    reset()
    m = mats()
    root = empty('swing-ride')
    lathe('base', [(1.6, 0), (1.6, .35), (1.3, .45), (0, .45)], 20, m['deep'], root, smooth=False)
    cylinder('column', .32, 5.2, (0, 0, 2.9), m['ivory'], root, 16)
    for z in (1.2, 2.6, 4.0):
        torus(f'band-{z}', .34, .05, (0, 0, z), m['gold'], root, 16, 6)
    spin = empty('spin', root, (0, 0, 5.5))
    striped_cone('canopy', [(2.3, -.2), (2.25, 0), (1.2, .7), (0, 1.1)], 16, (m['red'], m['ivory']), spin)
    torus('canopy-rim', 2.3, .08, (0, 0, -.2), m['gold'], spin, 32, 6)
    for k in range(16):
        a = k / 16 * math.tau
        sphere(f'bulb-{k}', .07, (math.cos(a) * 2.32, math.sin(a) * 2.32, -.3), m['bulb'], spin, 6, 4)
    sphere('top', .18, (0, 0, 1.2), m['gold'], spin, 10, 6)
    seat = (m['teal'], m['red'], material('Violet', VIOLET, rough=.5), m['gold'])
    for k in range(8):
        a = k / 8 * math.tau
        arm = empty(f'arm-{k}', spin, (math.cos(a) * 2.1, math.sin(a) * 2.1, -.25))
        arm.rotation_euler = (0, 0, a)
        for s in (-1, 1):
            cylinder(f'chain-{k}-{s}', .015, 2.2, (0, s * .16, -1.1), m['steel'], arm, 4)
        _at(box(f'seat-{k}', (.36, .42, .08), (0, 0, 0), seat[k % 4], arm), (0, 0, -2.2))
        _at(box(f'back-{k}', (.06, .42, .4), (0, 0, 0), seat[k % 4], arm), (-.18, 0, -2.0))
    export('moon/swing-ride.glb')


def rocket_ride():
    """A rocket ride: six little rockets on arms round a centre post, 4.2 m tall.
    'spin' turns about game y. Under it 'arm-0'..'arm-5' pivot at the hub with
    game local x pointing out along the arm; turning a pivot about its local z
    lifts its rocket."""
    reset()
    m = mats()
    root = empty('rocket-ride')
    lathe('base', [(2.0, 0), (2.0, .3), (1.8, .4), (0, .4)], 24, m['deep'], root, smooth=False)
    cylinder('post', .25, 3.2, (0, 0, 2.0), m['steel'], root, 12)
    spin = empty('spin', root, (0, 0, 2.4))
    lathe('hub', [(.5, -.3), (.55, 0), (.35, .5), (0, .7)], 16, m['gold'], spin)
    sphere('star', .22, (0, 0, 1.5), m['bulb'], spin, 10, 8)
    cylinder('star-post', .04, .8, (0, 0, 1.0), m['gold'], spin, 6)
    colors = (m['red'], m['teal'], material('Violet', VIOLET, rough=.5))
    for k in range(6):
        a = k / 6 * math.tau
        arm = empty(f'arm-{k}', spin, (0, 0, 0))
        arm.rotation_euler = (0, 0, a)
        cylinder(f'rod-{k}', .05, 2.2, (1.1, 0, 0), m['steel'], arm, 6, rotation=(0, math.pi / 2, 0))
        body = lathe(f'rocket-{k}', [(0, -.45), (.28, -.35), (.32, 0), (.26, .35), (0, .6)], 12, m['ivory'], arm)
        body.location = (2.3, 0, 0)
        body.rotation_euler = (0, math.pi / 2, 0)
        nose = lathe(f'nose-{k}', [(.2, .38), (0, .62)], 12, colors[k % 3], arm)
        nose.location = (2.3, 0, 0)
        nose.rotation_euler = (0, math.pi / 2, 0)
        for f in range(3):
            t = f / 3 * math.tau
            _at(box(f'fin-{k}-{f}', (.25, .05, .3), (0, 0, 0), colors[k % 3], arm), (1.95, math.cos(t) * .3, math.sin(t) * .3), (t, 0, 0))
        sphere(f'window-{k}', .1, (2.35, -.28, .1), material('Window', 0x9ff3ff, emit=0x7fe8ff, strength=1.5), arm, 8, 6)
    export('moon/rocket-ride.glb')


def kiosk():
    """A snack kiosk, 3.4 m tall: counter, striped awning and a giant popcorn
    tub on the roof. The awning stripes use 'Stripe' (tinted per kiosk)."""
    reset()
    m = mats()
    stripe = material('Stripe', RED, rough=.5)
    _at(box('booth', (2.4, 1.6, 1.6), (0, 0, 0), m['ivory']), (0, .1, .8))
    _at(box('counter', (2.6, .5, .12), (0, 0, 0), m['gold']), (0, -.8, 1.15))
    _at(box('opening', (1.9, .06, .8), (0, 0, 0), material('Inside', 0xffd78b, emit=0xffc566, strength=1.2)), (0, -.71, 1.6))
    for k in range(7):
        _at(box(f'awning-{k}', (.36, 1.0, .05), (0, 0, 0), stripe if k % 2 else m['ivory']), (-1.08 + k * .36, -.95, 2.25), (math.radians(-18), 0, 0))
    _at(box('roof', (2.6, 1.8, .14), (0, 0, 0), m['deep']), (0, .1, 2.45))
    lathe('tub', [(.35, 2.5), (.5, 3.2), (.52, 3.25)], 12, stripe, None, smooth=False)
    pop = material('Popcorn', 0xfff3c8, rough=.9)
    for k in range(9):
        a = k * 2.4
        r = .28 if k else 0
        sphere(f'pop-{k}', .16, (math.cos(a) * r, math.sin(a) * r, 3.32 + (0 if k else .1)), pop, None, 8, 6)
    for x in (-1.15, 1.15):
        sphere(f'lamp-{x}', .1, (x, -.95, 2.0), m['bulb'], None, 8, 6)
    export('moon/kiosk.glb', join='kiosk')


def booth():
    """A ring-toss game booth, 3 m tall, with bottles, prize plushies and lights.
    The stripes use 'Stripe' (tinted per booth)."""
    reset()
    m = mats()
    stripe = material('Stripe', TEAL, rough=.5)
    _at(box('back', (2.8, .2, 2.4), (0, 0, 0), m['deep']), (0, .7, 1.2))
    for s in (-1, 1):
        _at(box(f'side-{s}', (.15, 1.4, 2.4), (0, 0, 0), stripe), (s * 1.4, 0, 1.2))
    _at(box('table', (2.6, 1.0, .1), (0, 0, 0), m['gold']), (0, 0, .9))
    _at(box('table-front', (2.6, .08, .9), (0, 0, 0), stripe), (0, -.5, .45))
    for k in range(7):
        _at(box(f'roof-{k}', (.42, 1.6, .06), (0, 0, 0), stripe if k % 2 else m['ivory']), (-1.26 + k * .42, -.1, 2.55), (math.radians(-12), 0, 0))
    glass = material('Bottle', 0x7fe8c8, rough=.15)
    for row in range(3):
        for k in range(5 - row):
            x = (k - (4 - row) / 2) * .3
            lathe(f'bottle-{row}-{k}', [(.08, .95 + row * .02), (.09, 1.15), (.04, 1.3), (.03, 1.38)], 8, glass, None).location = (x, .1 + row * .1, row * .0)
    plush = (material('Plush0', 0xff8fc8, rough=.9), material('Plush1', 0x8fd3ff, rough=.9), material('Plush2', 0xffe066, rough=.9))
    for k, x in enumerate((-.9, 0, .9)):
        sphere(f'plush-body-{k}', .25, (x, .55, 1.95), plush[k], None, 10, 8)
        sphere(f'plush-head-{k}', .18, (x, .5, 2.3), plush[k], None, 10, 8)
    for k in range(8):
        sphere(f'bulb-{k}', .06, (-1.3 + k * .37, -.85, 2.42), m['bulb'], None, 6, 4)
    export('moon/booth.glb', join='booth')


def drop_tower():
    """A drop tower, 12 m tall. The seat ring is a separate object named 'seat'
    with its origin on the tower axis; the game moves it up and down
    (game y from 1 to 10)."""
    reset()
    m = mats()
    root = empty('drop-tower')
    lathe('base', [(1.5, 0), (1.5, .4), (1.2, .5), (0, .5)], 16, m['deep'], root, smooth=False)
    for k in range(4):
        a = k / 4 * math.tau + math.pi / 4
        cylinder(f'leg-{k}', .09, 11.6, (math.cos(a) * .45, math.sin(a) * .45, 6.2), m['steel'], root, 6)
    for z in range(1, 12):
        torus(f'hoop-{z}', .5, .035, (0, 0, z), m['red'] if z % 2 else m['ivory'], root, 12, 4)
    lathe('cap', [(.9, 12), (.85, 12.3), (.3, 12.9), (0, 13.1)], 12, m['red'], root, smooth=False)
    sphere('beacon', .2, (0, 0, 13.25), material('Beacon', 0xff8fc8, emit=0xff6fb8, strength=3), root, 10, 6)
    for k in range(10):
        sphere(f'light-{k}', .07, (.55, 0, 1.1 + k * 1.1), m['bulb'], root, 6, 4)
    seat = empty('seat', root, (0, 0, 1.0))
    lathe('seat-ring', [(.65, -.2), (1.1, -.15), (1.15, .15), (.65, .2)], 16, m['gold'], seat, smooth=False)
    for k in range(6):
        a = k / 6 * math.tau
        _at(box(f'chair-{k}', (.3, .3, .5), (0, 0, 0), m['teal'] if k % 2 else m['red'], seat), (math.cos(a) * 1.0, math.sin(a) * 1.0, .3), (0, 0, a))
    export('moon/drop-tower.glb')


def ufo():
    """A hovering flying saucer, 5 m across, with a glass dome, a little alien
    pilot and rim lights. Its origin is the saucer's centre."""
    reset()
    m = mats()
    hull = material('Hull', 0xc9c2e0, rough=.3, metal=.6)
    lathe('saucer', [(0, -.55), (1.0, -.5), (2.5, -.05), (2.5, .05), (1.2, .45), (0, .5)], 32, hull, None)
    torus('rim', 2.5, .09, (0, 0, 0), m['gold'], None, 48, 6)
    lathe('dome', [(1.0, .4), (.95, .8), (.6, 1.25), (0, 1.4)], 24, material('Dome', 0x9ff3ff, rough=.05, alpha=.55), None)
    sphere('pilot', .3, (0, 0, .75), material('Skin', 0x7fdc8a, rough=.5), None, 12, 8)
    sphere('pilot-eye', .13, (0, -.25, .82), material('EyeWhite', 0xffffff, rough=.2), None, 10, 8)
    for k in range(12):
        a = k / 12 * math.tau
        sphere(f'light-{k}', .12, (math.cos(a) * 2.2, math.sin(a) * 2.2, -.12), material('UfoLight', 0x7fffe0, emit=0x6fffd8, strength=3), None, 8, 6)
    lathe('belly', [(.6, -.5), (.5, -.75), (0, -.8)], 16, material('Belly', 0xff8fc8, emit=0xff6fb8, strength=2), None)
    export('moon/ufo.glb', join='ufo')


def coaster_car():
    """A little coaster car for two, 1.8 m long, facing game +x."""
    reset()
    m = mats()
    _at(box('chassis', (1.7, .9, .2), (0, 0, 0), m['deep']), (0, 0, .25))
    body = lathe('body', [(0, -.85), (.42, -.7), (.48, 0), (.42, .7), (0, .85)], 12, m['red'], None)
    body.rotation_euler = (0, math.pi / 2, 0)
    body.location = (0, 0, .6)
    body.scale = (1, 1.05, .8)
    for x in (-.3, .35):
        _at(box(f'seat-{x}', (.35, .6, .3), (0, 0, 0), m['deep']), (x, 0, .9))
        sphere(f'rider-{x}', .2, (x, 0, 1.25), material('Skin', 0x7fdc8a, rough=.5), None, 10, 8)
    lathe('nose-star', [(.15, 0), (0, .25)], 5, m['gold'], None).location = (.85, 0, .7)
    for x in (-.6, .6):
        for s in (-1, 1):
            cylinder(f'wheel-{x}-{s}', .14, .08, (x, s * .45, .15), m['steel'], None, 10, rotation=(math.pi / 2, 0, 0))
    export('moon/coaster-car.glb', join='coaster-car')


def build():
    alien()
    swing_ride()
    rocket_ride()
    kiosk()
    booth()
    drop_tower()
    ufo()
    coaster_car()
