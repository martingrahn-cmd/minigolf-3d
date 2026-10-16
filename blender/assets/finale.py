"""Set-piece decor for the world finales. Only scenery is built here: the
playable deck of Tolvslaget, the Mother Tree's tunnel and the moon rocket's
loading path stay exact code geometry that the physics tests check."""
import math
import bmesh
import bpy
from mathutils import Vector, noise
from lib import material, mesh_object, empty, lathe, sphere, cylinder, torus, box, export, reset

BRASS, GOLD, COPPER, IRON = 0xc99a4c, 0xf0ca7e, 0x986342, 0x263d40


def pocket_watch():
    """Tolvslaget's open pocket-watch case for a well of radius 6.5 m, in the
    watch's frame (origin at the well centre on the felt). The case spans
    y -1.42..-0.66 between radius 6.68 and 8.03; the crown and bow point to
    the game's -z (Blender +y)."""
    reset()
    root = empty('pocket-watch')
    brass, gold, copper, iron = (material('Brass', BRASS, rough=.28, metal=.85), material('Gold', GOLD, rough=.22, metal=.85),
                                 material('Copper', COPPER, rough=.35, metal=.7), material('Iron', IRON, rough=.45, metal=.6))
    profile = [(6.68, -1.42), (6.62, -1.0), (6.7, -.74), (6.92, -.66), (7.72, -.66), (7.96, -.76), (8.03, -1.0), (7.96, -1.32), (7.8, -1.42)]
    lathe('case', profile + [profile[0]], 160, brass, root, cap=False)
    torus('bead-outer', 7.82, .06, (0, 0, -.64), gold, root, 160, 8)
    torus('bead-inner', 6.82, .05, (0, 0, -.68), copper, root, 160, 8)
    torus('foot-ring', 7.9, .12, (0, 0, -1.42), iron, root, 160, 8)
    # Milled edge: fine ridges round the outside of the case.
    for i in range(144):
        a = i / 144 * math.tau
        r = box(f'knurl-{i}', (.07, .09, .5), (math.cos(a) * 8.02, math.sin(a) * 8.02, -1.04), gold, root)
        r.rotation_euler = (0, 0, a)
    # Pendant, knurled crown and the bow ring.
    cylinder('pendant', .36, .9, (0, 8.35, -1.0), brass, root, 24, rotation=(math.pi / 2, 0, 0))
    torus('pendant-collar', .4, .07, (0, 8.0, -1.0), gold, root, 24, 6, rotation=(math.pi / 2, 0, 0))
    lathe_crown = cylinder('crown', .6, 1.4, (0, 9.25, -1.0), gold, root, 32, rotation=(math.pi / 2, 0, 0))
    for i in range(20):
        a = i / 20 * math.tau
        cylinder(f'crown-ridge-{i}', .045, 1.36, (math.cos(a) * .6, 9.25, -1.0 + math.sin(a) * .6), copper, root, 6, rotation=(math.pi / 2, 0, 0))
    sphere('crown-cap', .32, (0, 9.98, -1.0), gold, root, 16, 10).scale = (1, .35, 1)
    torus('bow', 1.32, .17, (0, 10.9, -1.0), brass, root, 64, 12)
    torus('bow-shine', 1.32, .05, (0, 10.9, -.84), gold, root, 64, 6)
    export('clockwork/pocket-watch.glb', join='pocket-watch')


def blossom_crown(variant):
    """A flowering crown cluster of radius 1 for the Mother Tree; the game scales
    it by the old crown radius. 'leaf' has a green base, 'bloom' a pink one."""
    reset()
    leaf, blossom, deep, petal = (material('Leaf', 0x6aa22f, rough=.85), material('Blossom', 0xf2a4c4, rough=.7),
                                  material('BlossomDeep', 0xd8739d, rough=.7), material('Petal', 0xffd6e6, rough=.6))
    base_mat, cap_mat = (leaf, blossom) if variant == 'leaf' else (blossom, deep)
    def blob(name, centre, radius, squash, seed, mat, detail=2):
        bm = bmesh.new()
        bmesh.ops.create_icosphere(bm, subdivisions=detail, radius=1)
        off = Vector((seed, seed * 1.3, seed * .7))
        for v in bm.verts:
            n = v.co.normalized()
            d = 1 + noise.fractal(n * 1.7 + off, 1, 2, 3) * .22
            v.co = Vector((n.x * radius * squash[0] * d, n.y * radius * squash[1] * d, n.z * radius * squash[2] * d)) + Vector(centre)
        return mesh_object(name, bm, mat)
    blob('base', (0, 0, 0), 1.0, (1, 1, .42), 3 if variant == 'leaf' else 9, base_mat)
    blob('cap', (0, 0, .32), .72, (1, 1, .4), 5 if variant == 'leaf' else 11, cap_mat)
    for k in range(9):
        a = k * 2.4
        r = .35 + (k % 3) * .22
        blob(f'tuft-{k}', (math.cos(a) * r, math.sin(a) * r, .38 + (k % 2) * .08), .2, (1, 1, .6), 20 + k, cap_mat if k % 2 else base_mat, 1)
    # Five-petal flowers scattered over the top.
    for k in range(14):
        a, r = k * 2.39996, .25 + (k * .618 % 1) * .6
        cx, cy = math.cos(a) * r, math.sin(a) * r
        cz = .46 + .08 * math.cos(r * 3)
        for p in range(5):
            b = p / 5 * math.tau
            s = sphere(f'petal-{k}-{p}', .055, (cx + math.cos(b) * .06, cy + math.sin(b) * .06, cz), petal, None, 6, 4)
            s.scale = (1, 1, .35)
        sphere(f'centre-{k}', .03, (cx, cy, cz + .01), material('Pollen', 0xffd36c, rough=.5), None, 6, 4)
    export(f'forest/blossom-crown-{variant}.glb', join='blossom-crown')


def owl():
    """A carved owl guardian of size 1, about 2.6 m tall on its stump."""
    reset()
    bark, wood, lit = material('Bark', 0x76503a, rough=.9), material('OwlWood', 0x9c6b45, rough=.8), material('OwlLight', 0xc8955f, rough=.75)
    face, pupil, beak = (material('OwlFace', 0xf2d9a6, rough=.7), material('OwlEye', 0x2f4630, rough=.2, emit=0x1d4a2a, strength=.6),
                         material('Beak', 0xd6a14a, rough=.5))
    lathe('stump', [(.72, 0), (.62, .12), (.56, .7), (.6, .8), (.5, .82)], 14, bark, None, smooth=False)
    lathe('body', [(.2, .78), (.62, .95), (.72, 1.4), (.62, 1.95), (.44, 2.25), (.0, 2.42)], 20, wood, None)
    lathe('chest', [(.0, 1.05), (.36, 1.15), (.44, 1.5), (.3, 1.8), (0, 1.86)], 16, lit, None).location = (0, -.3, 0)
    for row in range(4):
        for k in range(5 - row % 2):
            x = (k - (4 - row % 2) / 2) * .16
            s = sphere(f'feather-{row}-{k}', .09, (x, -.56 - row * .02, 1.25 + row * .14), wood, None, 8, 5)
            s.scale = (1, .45, 1.2)
    for side in (-1, 1):
        sphere(f'eye-disc-{side}', .27, (side * .24, -.5, 1.98), face, None, 16, 10).scale = (1, .4, 1)
        sphere(f'pupil-{side}', .12, (side * .24, -.6, 1.98), pupil, None, 12, 8)
        sphere(f'brow-{side}', .2, (side * .2, -.48, 2.2), lit, None, 10, 6).scale = (1.3, .4, .45)
        ear = lathe(f'ear-{side}', [(.14, 0), (.0, .4)], 6, wood, None, smooth=False)
        ear.location = (side * .36, 0, 2.18)
        ear.rotation_euler = (0, side * .35, 0)
        wing = sphere(f'wing-{side}', .5, (side * .62, -.05, 1.5), lit, None, 14, 10)
        wing.scale = (.32, .7, 1.2)
        for t in range(3):
            sphere(f'talon-{side}-{t}', .06, (side * .18 + (t - 1) * .07, -.52, .82), beak, None, 6, 4)
    b = lathe('beak', [(.1, 0), (.0, .26)], 6, beak, None, smooth=False)
    b.location = (0, -.58, 1.86)
    b.rotation_euler = (math.radians(150), 0, 0)
    export('forest/owl.glb', join='owl')


def gantry():
    """Launch gantry beside the moon rocket: a 10 m lattice tower 1.4 m square,
    origin at the foot of its centre, with platforms, a ladder and a beacon."""
    reset()
    ivory, red, steel = material('GantryIvory', 0xf4e8d2, rough=.4, metal=.3), material('GantryRed', 0xd5485b, rough=.45), material('GantrySteel', 0x5b5774, rough=.35, metal=.8)
    glow = material('Beacon', 0xff5d6c, rough=.2, emit=0xff5d6c, strength=3)
    def strut(name, a, b, r, mat):
        a, b = Vector(a), Vector(b)
        c = cylinder(name, r, (b - a).length, tuple((a + b) / 2), mat, None, 8)
        c.rotation_euler = (b - a).to_track_quat('Z', 'Y').to_euler()
        return c
    corners = [(-.7, -.7), (.7, -.7), (.7, .7), (-.7, .7)]
    for i, (x, y) in enumerate(corners):
        strut(f'post-{i}', (x, y, 0), (x, y, 10), .08, ivory)
    for level in range(6):
        z0, z1 = level * 1.6, level * 1.6 + 1.6
        for i in range(4):
            (x0, y0), (x1, y1) = corners[i], corners[(i + 1) % 4]
            strut(f'brace-{level}-{i}', (x0, y0, z0), (x1, y1, min(z1, 10)), .035, red)
            strut(f'ring-{level}-{i}', (x0, y0, z0), (x1, y1, z0), .04, ivory)
    for z in (4.8, 9.6):
        box(f'platform-{z}', (1.9, 1.9, .08), (0, 0, z), steel, None)
        for i in range(4):
            (x0, y0), (x1, y1) = corners[i], corners[(i + 1) % 4]
            strut(f'rail-{z}-{i}', (x0 * 1.3, y0 * 1.3, z + .55), (x1 * 1.3, y1 * 1.3, z + .55), .025, ivory)
    for side in (-1, 1):
        strut(f'ladder-{side}', (.95, side * .22, 0), (.95, side * .22, 9.6), .025, steel)
    for k in range(32):
        strut(f'rung-{k}', (.95, -.22, .3 * k + .2), (.95, .22, .3 * k + .2), .015, steel)
    strut('arm', (0, .7, 8.5), (0, 2.2, 8.5), .07, ivory)
    strut('arm-brace', (0, .7, 7.4), (0, 2.0, 8.45), .04, red)
    cylinder('beacon-base', .14, .2, (0, 0, 10.1), steel, None, 12)
    sphere('beacon', .2, (0, 0, 10.35), glow, None, 12, 8)
    export('moon/gantry.glb', join='gantry')


def build():
    pocket_watch()
    blossom_crown('leaf')
    blossom_crown('bloom')
    owl()
    gantry()
