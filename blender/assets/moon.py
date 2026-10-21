"""Månkarnevalen kit: the moon rocket, asteroids, lanterns and the circus tent.
Dimensions match the procedural stand-ins in src/moon.js so code that places,
scales or decorates them keeps working."""
import math
import bmesh
import bpy
from mathutils import Vector
from lib import (material, mesh_object, empty, cylinder, torus, lathe, sphere, box, join_parts,
                 rock, bevel, export, reset)

IVORY, RED, GOLD, TEAL, DEEP, ROCK = 0xf4e8d2, 0xd5485b, 0xf2c25c, 0x3fbfb2, 0x2c2250, 0x6f6690


def rocket():
    """The fair's moon rocket: 4.75 m tall at scale 1, body radius 0.86 m.
    The porthole faces the game's +z (Blender -y)."""
    reset()
    root = empty('moon-rocket')
    ivory = material('Ivory', IVORY, rough=.35, metal=.05)
    panel = material('Panel', 0xd9ccb5, rough=.45, metal=.05)
    red = material('RocketRed', RED, rough=.4)
    gold = material('Brass', GOLD, rough=.25, metal=.85)
    glass = material('Porthole', 0x9ff3ff, rough=.05, emit=0x9ff3ff, strength=1.2)
    steel = material('Steel', 0x5b5774, rough=.35, metal=.8)
    body = [(0, 0), (.5, .02), (.62, .18), (.78, .6), (.86, 1.4), (.87, 1.8), (.84, 2.6), (.8, 3), (.7, 3.5), (.62, 3.8), (.45, 4.2), (.34, 4.4), (0, 4.62)]
    lathe('rocket-body', body, 48, ivory, root)
    # Panel bands give the hull its riveted plates.
    for h, r in ((1.2, .865), (2.4, .855), (3.3, .76)):
        torus(f'panel-seam-{h}', r, .018, (0, 0, h), panel, root, 64, 6)
    for i in range(24):
        a = i / 24 * math.tau
        for h, r in ((1.25, .87), (2.45, .86)):
            sphere(f'rivet-{h}-{i}', .022, (math.cos(a) * r, math.sin(a) * r, h), panel, root, 6, 4)
    # Red nose cone with a brass tip and a red belly band.
    lathe('nose', [(.36, 4.36), (.3, 4.55), (.2, 4.75), (.08, 4.9), (0, 4.95)], 32, red, root)
    sphere('nose-tip', .05, (0, 0, 4.96), gold, root, 10, 6)
    torus('belly-band', .87, .07, (0, 0, 1.8), red, root, 64, 10)
    # Engine bell under the hull.
    lathe('engine', [(.38, -.25), (.42, -.2), (.3, .02), (.22, .06)], 32, steel, root, cap=False)
    torus('engine-lip', .4, .03, (0, 0, -.23), steel, root, 32, 6)
    # Three swept fins with brass edge caps.
    for i in range(3):
        a = i / 3 * math.tau + math.pi / 2
        bm = bmesh.new()
        pts = [(.55, .1), (1.35, -.4), (1.32, .35), (.9, .75), (.72, 1.35)]
        top = [bm.verts.new((r, .045, z)) for r, z in pts]
        bot = [bm.verts.new((r, -.045, z)) for r, z in pts]
        bm.faces.new(top)
        bm.faces.new(list(reversed(bot)))
        n = len(pts)
        for k in range(n):
            bm.faces.new((top[k], top[(k + 1) % n], bot[(k + 1) % n], bot[k]))
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        fin = mesh_object(f'fin-{i}', bm, red, root)
        bevel(fin, .02, 2)
        fin.rotation_euler = (0, 0, a)
        cylinder(f'fin-cap-{i}', .035, .78, (math.cos(a) * 1.335, math.sin(a) * 1.335, -.02), gold, root, 10,
                 rotation=(0, 0, 0))
    # The porthole: brass frame, bolts and glowing glass, facing game +z.
    frame = torus('porthole-frame', .27, .06, (0, -.8, 2.9), gold, root, 32, 8, rotation=(math.pi / 2, 0, 0))
    disc = cylinder('porthole-glass', .23, .04, (0, -.8, 2.9), glass, root, 24, rotation=(math.pi / 2, 0, 0))
    for i in range(8):
        a = i / 8 * math.tau
        sphere(f'bolt-{i}', .025, (math.cos(a) * .33, -.84, 2.9 + math.sin(a) * .33), gold, root, 6, 4)
    # Small antenna.
    cylinder('antenna', .015, .5, (.14, 0, 4.75), steel, root, 6, rotation=(0, math.radians(18), 0))
    sphere('antenna-ball', .035, (.22, 0, 4.98), red, root, 8, 6)
    export('moon/rocket.glb', join='moon-rocket')


def asteroids():
    """Three asteroid shapes, radius 1. The game scales and tints them."""
    for k in range(3):
        reset()
        rock(f'asteroid-{k}', 1.0, 11 + k * 7, material('Rock', ROCK, rough=.95), None, detail=4, roughness=.2, craters=4 + k)
        export(f'moon/asteroid-{k}.glb', join='asteroid')


def lantern():
    """A fair lantern 2.2 m high to the bulb's centre (matches lantern(h=2.2))."""
    reset()
    root = empty('moon-lantern')
    deep = material('LanternIron', DEEP, rough=.4, metal=.6)
    gold = material('Brass', GOLD, rough=.25, metal=.85)
    ivory = material('Ivory', IVORY, rough=.35)
    glow = material('LanternGlow', TEAL, rough=.2, emit=TEAL, strength=3)
    lathe('lantern-base', [(.22, 0), (.2, .08), (.1, .16), (.07, .3)], 16, deep, root)
    cylinder('lantern-post', .045, 1.9, (0, 0, 1.2), deep, root, 10)
    for h in (.5, 1.6):
        torus(f'post-ring-{h}', .06, .018, (0, 0, h), gold, root, 16, 6)
    lathe('lantern-cup', [(.06, 2.0), (.16, 2.05), (.18, 2.1)], 16, gold, root, cap=False)
    sphere('lantern-bulb', .22, (0, 0, 2.28), glow, root, 16, 10)
    for i in range(4):
        a = i / 4 * math.tau
        cylinder(f'cage-{i}', .012, .5, (math.cos(a) * .22, math.sin(a) * .22, 2.3), gold, root, 6)
    lathe('lantern-roof', [(.3, 2.5), (.24, 2.6), (.1, 2.72), (0, 2.78)], 16, ivory, root)
    sphere('lantern-finial', .04, (0, 0, 2.8), gold, root, 8, 6)
    export('moon/lantern.glb', join='moon-lantern')


def tent():
    """A striped circus tent normalised to radius 1 and height 1 (the game scales
    x/z by the radius and y by the height). Origin at the centre of the floor."""
    reset()
    root = empty('circus-tent')
    red = material('TentRed', RED, rough=.75)
    ivory = material('TentIvory', IVORY, rough=.75)
    gold = material('Brass', GOLD, rough=.25, metal=.85)
    teal = material('Pennant', TEAL, rough=.6, double=True)
    dark = material('Doorway', DEEP, rough=.9)
    segments = 16
    bm = bmesh.new()
    wall_top, roof_peak = .45, 1.0
    rings = []
    profile = [(1.04, 0), (1.0, wall_top), (1.12, wall_top + .02), (.55, .78), (.08, roof_peak - .02)]
    for i in range(segments * 2):
        a = i / (segments * 2) * math.tau
        rings.append([bm.verts.new((r * math.cos(a), r * math.sin(a), h)) for r, h in profile])
    top = bm.verts.new((0, 0, roof_peak))
    for i in range(segments * 2):
        a, b = rings[i], rings[(i + 1) % (segments * 2)]
        for j in range(len(profile) - 1):
            f = bm.faces.new((a[j], b[j], b[j + 1], a[j + 1]))
            f.material_index = (i // 2) % 2
        f = bm.faces.new((a[-1], b[-1], top))
        f.material_index = (i // 2) % 2
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    canvas = mesh_object('tent-canvas', bm, [red, ivory], root)
    # Scalloped valance around the eaves.
    for i in range(segments):
        a = (i + .5) / segments * math.tau
        s = sphere(f'valance-{i}', .12, (math.cos(a) * 1.1, math.sin(a) * 1.1, wall_top - .02), red if i % 2 else ivory, root, 10, 6)
        s.scale = (1.2, 1.2, .55)
    # Pole, finial and pennant.
    cylinder('tent-pole', .025, .25, (0, 0, roof_peak + .1), gold, root, 8)
    sphere('tent-finial', .04, (0, 0, roof_peak + .24), gold, root, 8, 6)
    bm = bmesh.new()
    v = [bm.verts.new(p) for p in ((0, 0, roof_peak + .2), (.22, 0, roof_peak + .16), (0, 0, roof_peak + .12))]
    bm.faces.new(v)
    mesh_object('tent-pennant', bm, teal, root)
    # Doorway at the game's +z (Blender -y).
    box('tent-door', (.42, .02, .38), (0, -1.03, .19), dark, root)
    export('moon/tent.glb', join='circus-tent')


def ferris_wheel():
    """The fair's big wheel at radius 1 (the game scales it to the wheel's radius,
    4.6 m in the fair and 7.5 m behind the course). The A-frame stands on z = 0
    with the hub at 1.25; `wheel` turns about the game's z (Blender -y) and
    carries 24 bulbs (material `Bulb`) and eight gondolas `gondola-0`…`gondola-7`,
    each with its origin at its pivot on the rim, so the game can keep them level."""
    reset()
    root = empty('ferris-wheel')
    steel = material('Steel', IVORY, rough=.4, metal=.3)
    red = material('WheelRed', RED, rough=.45)
    teal = material('Teal', TEAL, rough=.45)
    bulb = material('Bulb', GOLD, rough=.3, emit=GOLD, strength=2.2)
    hub = 1.25

    def strut(name, a, b, r, mat, parent):
        a, b = Vector(a), Vector(b)
        c = cylinder(name, r, (b - a).length, (a + b) / 2, mat, parent, 6, False)
        c.rotation_euler = (b - a).to_track_quat('Z', 'Y').to_euler()
        return c
    # The A-frame, front and back, with cross braces and a small ticket base.
    for y in (-.12, .12):
        for side in (-1, 1):
            strut(f'leg-{y}-{side}', (side * .58, y * 1.5, 0), (0, y, hub), .022, steel, root)
        strut(f'brace-{y}', (-.29, y * 1.25, hub * .5), (.29, y * 1.25, hub * .5), .012, steel, root)
    strut('axle', (0, -.16, hub), (0, .16, hub), .035, steel, root)
    box('base', (.7, .22, .03), (0, 0, .015), red, root)
    wheel = empty('wheel', root, (0, 0, hub))
    for y in (-.09, .09):
        torus(f'rim-{y}', 1, .014, (0, y, 0), red, wheel, 72, 6, (math.pi / 2, 0, 0))
        torus(f'inner-rim-{y}', .55, .008, (0, y, 0), steel, wheel, 48, 5, (math.pi / 2, 0, 0))
    for k in range(12):
        a = k / 12 * math.tau
        for y in (-.09, .09):
            strut(f'spoke-{k}-{y}', (0, y, 0), (math.cos(a), y, math.sin(a)), .007, steel, wheel)
        strut(f'rung-{k}', (math.cos(a), -.09, math.sin(a)), (math.cos(a), .09, math.sin(a)), .008, steel, wheel)
    cylinder('hub', .08, .22, (0, 0, 0), red, wheel, 12, False, (math.pi / 2, 0, 0))
    for k in range(24):
        a = k / 24 * math.tau
        sphere(f'bulb-{k}', .016, (math.cos(a) * 1.0, -.11, math.sin(a) * 1.0), bulb, wheel, 6, 4)
    # Gondolas: a little tub with a canopy, hanging under its pivot.
    for k in range(8):
        a = k / 8 * math.tau
        g = empty(f'gondola-{k}', wheel, (math.cos(a), 0, math.sin(a)))
        colour = red if k % 2 else teal
        strut(f'hanger-{k}', (0, 0, 0), (0, 0, -.055), .006, steel, g)
        lathe(f'canopy-{k}', [(0, -.035), (.085, -.06), (.08, -.072), (0, -.07)], 12, steel, g, False)
        lathe(f'tub-{k}', [(.075, -.075), (.07, -.15), (.055, -.175), (0, -.178)], 12, colour, g, False)
        for j in range(4):
            b = j / 4 * math.tau + math.pi / 4
            strut(f'post-{k}-{j}', (math.cos(b) * .065, math.sin(b) * .065, -.07), (math.cos(b) * .065, math.sin(b) * .065, -.11), .004, steel, g)
    # One mesh each for the frame, the turning wheel and every gondola.
    names = [f'gondola-{k}' for k in range(8)]
    for k, name in enumerate(names):
        join_parts(bpy.data.objects[name], f'cabin-{k}')
    join_parts(wheel, 'wheel-body', exclude=names)
    join_parts(root, 'frame', exclude=('wheel',))
    export('moon/ferris-wheel.glb')


def build():
    rocket()
    asteroids()
    lantern()
    tent()
    ferris_wheel()
