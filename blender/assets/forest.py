"""Molnskogen kit: trees, mushrooms, ferns and crystals.
Matches the procedural stand-ins in src/forest.js: a tree is about 6.6 m tall at
scale 1 and its crowns are separate objects named canopy-0..2, with their origin
at the crown centre, so the game can sway them and fade them when they hide
the ball."""
import math
import bmesh
import bpy
from mathutils import Vector, noise
from lib import material, mesh_object, empty, lathe, sphere, export, reset, join_meshes

BARK, BARK_LIT, LEAF_DARK, LEAF, LEAF_LIGHT = 0x76503a, 0xa07349, 0x426d2a, 0x69a72c, 0x92c83b


def branch(bm, points, r0, r1, sides=8, flare=0):
    """A tapered tube through points (x, y, z in Blender space), optional root flare."""
    rings = []
    n = len(points)
    for i, p in enumerate(points):
        p = Vector(p)
        t = i / (n - 1)
        a = Vector(points[min(i + 1, n - 1)]) - Vector(points[max(i - 1, 0)])
        axis = a.normalized()
        side = axis.cross(Vector((0, 0, 1)) if abs(axis.z) < .95 else Vector((1, 0, 0))).normalized()
        up = side.cross(axis).normalized()
        r = r0 + (r1 - r0) * t
        ring = []
        for k in range(sides):
            ang = k / sides * math.tau
            bump = 1 + (flare * (1 - t) ** 6 * (.5 + .5 * math.cos(ang * 5))) + .06 * noise.noise(p * 3 + Vector((ang, 0, 0)))
            ring.append(bm.verts.new(p + (side * math.cos(ang) + up * math.sin(ang)) * r * bump))
        rings.append(ring)
    for i in range(n - 1):
        for k in range(sides):
            bm.faces.new((rings[i][k], rings[i][(k + 1) % sides], rings[i + 1][(k + 1) % sides], rings[i + 1][k]))
    bm.faces.new(list(reversed(rings[0])))
    bm.faces.new(rings[-1])


def bezier(a, b, c, steps):
    return [tuple(Vector(a) * (1 - t) ** 2 + Vector(b) * 2 * t * (1 - t) + Vector(c) * t * t) for t in (i / steps for i in range(steps + 1))]


def blob(bm, centre, radius, squash, seed, detail=2, rough=.18):
    """A faceted leaf cluster: displaced, flattened icosphere."""
    geom = bmesh.ops.create_icosphere(bm, subdivisions=detail, radius=1)
    verts = geom['verts']
    off = Vector((seed * 3.1, seed * 1.7, seed * .7))
    for v in verts:
        n = v.co.normalized()
        d = 1 + noise.fractal(n * 1.8 + off, 1, 2, 3) * rough
        v.co = Vector((n.x * radius * squash[0] * d, n.y * radius * squash[1] * d, n.z * radius * squash[2] * d)) + Vector(centre)
    return verts


def tree(variant):
    reset()
    lean, side_a, side_b = [(.6, (-1.6, 4.7, .1, 1.5), (1.8, 5.2, .4, 1.65)),
                            (1.1, (-1.4, 4.3, -.5, 1.4), (1.6, 5.6, .6, 1.5)),
                            (.35, (-1.9, 5.1, .4, 1.6), (1.4, 4.4, -.4, 1.3))][variant]
    bark, lit = material('Bark', BARK, rough=.95), material('BarkLit', BARK_LIT, rough=.9)
    dark, mid, light = material('LeafDark', LEAF_DARK, rough=.9), material('Leaf', LEAF, rough=.85), material('LeafLight', LEAF_LIGHT, rough=.8)
    # Game (x, y, z) = Blender (x, -z, y): heights go to Blender z.
    g = lambda x, y, z: (x, -z, y)
    bm = bmesh.new()
    branch(bm, bezier(g(0, 0, 0), g(.15, 3, .05), g(lean, 6.6, .1), 9), .36, .14, 10, flare=.9)
    for cx, cy, cz, _ in (side_a, side_b):
        branch(bm, bezier(g(lean * .45, 2.6, 0), g(cx * .55, cy - 1.2, cz * .5), g(cx * .9, cy - .2, cz * .9), 5), .14, .06, 7)
    for i in range(5):
        a = i * math.tau / 5 + .3
        branch(bm, bezier(g(math.cos(a) * .95, -.05, math.sin(a) * .8), g(math.cos(a) * .45, .35, math.sin(a) * .35), g(0, .9, 0), 4), .12, .2, 6)
    trunk = mesh_object('trunk', bm, bark)
    for poly in trunk.data.polygons:
        if poly.center.z > 1.2 and poly.center.z < 3.2:
            poly.material_index = 1
    trunk.data.materials.append(lit)
    crowns = [(lean, 6.7, .1, 2.5), side_a, side_b]
    for k, (cx, cy, cz, r) in enumerate(crowns):
        bm = bmesh.new()
        layers = [((0, -.15, 0), r, (1, .8, .28), dark, 1), ((0, .12, 0), r * .95, (1, .77, .33), mid, 2),
                  ((-.12, .45, -.05), r * .74, (1, .83, .24), light, 2)]
        for idx, ((dx, dy, dz), rr, sq, mat, det) in enumerate(layers):
            before = set(bm.faces)
            blob(bm, g(dx, dy, dz), rr, (sq[0], sq[1], sq[2]), variant * 10 + k * 3 + idx, det, .2)
            for f in set(bm.faces) - before:
                f.material_index = idx
        # A few small tufts break the silhouette.
        for t in range(4):
            a = t * 1.7 + k
            before = set(bm.faces)
            blob(bm, g(math.cos(a) * r * .75, .05 + (t % 2) * .25, math.sin(a) * r * .55), r * .32, (1, 1, .55), 50 + t + k * 5 + variant, 1, .15)
            for f in set(bm.faces) - before:
                f.material_index = 1 + t % 2
        canopy = mesh_object(f'canopy-{k}', bm, [dark, mid, light])
        # Origin at the crown centre so the game can sway it in place.
        canopy.location = g(cx, cy, cz)
    export(f'forest/tree-{variant}.glb')


def mushroom():
    """Mushroom of size 1 (stem 0.6 m, cap radius 0.46 m). The cap material 'Cap'
    is tinted per mushroom in the game."""
    reset()
    stem, cap, gill, dot = (material('Stem', 0xf1d8aa, rough=.8), material('Cap', 0xdd8256, rough=.55),
                            material('Gills', 0xf6dca6, rough=.9), material('Spots', 0xffebc6, rough=.6))
    lathe('stem', [(.15, 0), (.13, .2), (.1, .45), (.11, .58)], 16, stem)
    lathe('gills', [(.11, .57), (.44, .58), (.46, .6)], 24, gill, cap=False)
    lathe('cap', [(.47, .58), (.48, .63), (.42, .74), (.3, .82), (.15, .86), (0, .87)], 28, cap)
    for i in range(7):
        a, r = i * 2.4, .14 + (i % 3) * .09
        # Sit the spot on the cap surface (interpolated from the cap profile).
        prof = [(0, .87), (.15, .86), (.3, .82), (.42, .74)]
        z = next(z0 + (z1 - z0) * (r - r0) / (r1 - r0) for (r0, z0), (r1, z1) in zip(prof, prof[1:]) if r0 <= r <= r1)
        s = sphere(f'spot-{i}', .05, (math.cos(a) * r, math.sin(a) * r, z + .005), dot, None, 8, 5)
        s.scale = (1, 1, .3)
    export('forest/mushroom.glb', join='mushroom')


def fern():
    """A fern clump of scale 1 (fronds about 1 m long)."""
    reset()
    leaf = material('Fern', 0x609630, rough=.8, double=True)
    vein = material('FernLight', 0x86b94a, rough=.8, double=True)
    bm = bmesh.new()
    for i in range(8):
        a = i * math.tau / 8 + (i % 2) * .2
        length = .75 + (i % 3) * .18
        d = Vector((math.cos(a), math.sin(a), 0))
        side = Vector((-d.y, d.x, 0))
        spine = []
        for j in range(9):
            t = j / 8
            spine.append(d * t * length + Vector((0, 0, math.sin(t * math.pi * .85) * .6)))
        for j in range(1, 8):
            t = j / 8
            width = (1 - t) * .3 + .03
            for s in (1, -1):
                p = spine[j]
                tip = p + side * width * s + d * .1 - Vector((0, 0, .08))
                f = bm.faces.new((bm.verts.new(p), bm.verts.new(spine[j + 1]), bm.verts.new(tip)))
                f.material_index = j % 2
    mesh_object('fern', bm, [leaf, vein], smooth=True)
    export('forest/fern.glb', join='fern')


def crystal():
    """A crystal cluster of size 1 (main spire 1 m high). Material 'Crystal' glows."""
    reset()
    glass = material('Crystal', 0xb9f4ff, rough=.08, emit=0x7fd8ff, strength=.8)
    rock = material('CrystalRock', 0x8b7a8f, rough=.95)
    bm = bmesh.new()
    for k, (x, y, h, r, tilt) in enumerate([(0, 0, 1, .2, 0), (.22, .1, .62, .13, .35), (-.18, .14, .5, .11, -.4), (.05, -.2, .4, .1, .5)]):
        base = [bm.verts.new((x + math.cos(a) * r, y + math.sin(a) * r, 0)) for a in (i * math.tau / 6 for i in range(6))]
        mid = [bm.verts.new((x + math.cos(a) * r + tilt * h * .6, y + math.sin(a) * r, h * .75)) for a in (i * math.tau / 6 for i in range(6))]
        tip = bm.verts.new((x + tilt * h, y, h))
        for i in range(6):
            bm.faces.new((base[i], base[(i + 1) % 6], mid[(i + 1) % 6], mid[i]))
            bm.faces.new((mid[i], mid[(i + 1) % 6], tip))
        bm.faces.new(list(reversed(base)))
    mesh_object('crystal', bm, glass)
    bm = bmesh.new()
    blob(bm, (0, 0, 0), .38, (1, 1, .35), 7, 1, .25)
    mesh_object('crystal-base', bm, rock)
    export('forest/crystal.glb', join='crystal')


def build():
    for v in range(3):
        tree(v)
    mushroom()
    fern()
