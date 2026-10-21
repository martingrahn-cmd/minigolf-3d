"""Spökhamnen's set pieces round the course: crooked dead trees, the lighthouse
and the ghost ship lying off the harbour (the finale's ship is the course itself
and stays in code).

Sizes follow the code stand-ins in src/halloween.js (deadTree, lighthouse,
ghostShip), so the code places them the same way. Origins at the foot or the
waterline; the game's +z is Blender -y; the glTF exporter maps Blender
(x, y, z) to game (x, z, -y)."""
import math
import random
import bmesh
from mathutils import Vector, Matrix
from lib import material, empty, lathe, sphere, cylinder, box, torus, rock, export, reset, mesh_object, join_parts

BONE, IRON, BARK, STONE, STONE_DARK = 0xf1e3c4, 0x2b2734, 0x231a26, 0x5f5b70, 0x3d3a4c
AMBER, GHOST, RED, WHITE, HULL, TRIM = 0xffc24a, 0x9dffc2, 0x9c3a42, 0xe9e1d6, 0x2a2230, 0x4a3a3a


def _tube(bm, a, b, r1, r2, sides=6, twist=0.0):
    """A tapered prism from a to b, open at both ends (knobs hide the joints)."""
    a, b = Vector(a), Vector(b)
    axis = (b - a).normalized()
    side = axis.orthogonal().normalized()
    up = axis.cross(side)
    rings = []
    for end, r in ((a, r1), (b, r2)):
        ring = []
        for i in range(sides):
            t = i / sides * math.tau + twist
            ring.append(bm.verts.new(end + (side * math.cos(t) + up * math.sin(t)) * r))
        rings.append(ring)
    for i in range(sides):
        j = (i + 1) % sides
        bm.faces.new((rings[0][i], rings[0][j], rings[1][j], rings[1][i]))
    cap = bm.faces.new(rings[1][::-1])
    return cap


def _knob(bm, at, r):
    geom = bmesh.ops.create_icosphere(bm, subdivisions=1, radius=r)
    bmesh.ops.translate(bm, verts=geom['verts'], vec=Vector(at))


# --------------------------------------------------------------- dead trees
def dead_tree(variant=0):
    """A crooked dead tree, about 4 m tall at scale 1: a twisting trunk, gnarled
    branches that fork three times, roots splaying over the ground and a knot hole.
    One mesh, flat shaded."""
    reset()
    rnd = random.Random(17 + variant * 31)
    bark = material('Bark', BARK, rough=.9)
    hole = material('Knot', 0x0b070d, rough=1)
    bm = bmesh.new()

    def grow(start, direction, length, radius, depth):
        # Each limb bends once halfway, the way old wood grows.
        mid_dir = (direction + Vector((rnd.uniform(-.35, .35), rnd.uniform(-.35, .35), rnd.uniform(-.05, .15)))).normalized()
        mid = start + direction * length * .5
        end = mid + mid_dir * length * .5
        _tube(bm, start, mid, radius, radius * .82, 6, rnd.uniform(0, 1))
        _tube(bm, mid, end, radius * .82, radius * .62, 6, rnd.uniform(0, 1))
        _knob(bm, mid, radius * .86)
        if depth == 0:
            # A twig, ending in a point.
            tip = end + mid_dir * length * .35
            _tube(bm, end, tip, radius * .62, .004, 5)
            return
        _knob(bm, end, radius * .66)
        n = 2 if depth == 1 else rnd.choice((2, 3))
        for k in range(n):
            a = rnd.uniform(0, math.tau) if k == 0 else a + math.tau / n + rnd.uniform(-.5, .5)
            spread = rnd.uniform(.55, 1.05)
            d = (mid_dir + Vector((math.cos(a) * spread, math.sin(a) * spread, rnd.uniform(-.2, .25)))).normalized()
            grow(end, d, length * rnd.uniform(.55, .72), radius * .6, depth - 1)

    lean = Vector((rnd.uniform(-.15, .15), rnd.uniform(-.15, .15), 1)).normalized()
    grow(Vector((0, 0, 0)), lean, 2.1 + variant * .2, .26, 3)
    # Roots: short, thick and splayed, half sunk in the ground.
    for k in range(5):
        a = k / 5 * math.tau + rnd.uniform(-.3, .3)
        tip = Vector((math.cos(a) * rnd.uniform(.7, 1.1), math.sin(a) * rnd.uniform(.7, 1.1), -.12))
        _tube(bm, Vector((math.cos(a) * .12, math.sin(a) * .12, .25)), tip, .17, .03, 5)
    _knob(bm, (0, 0, .12), .3)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    root = empty('dead-tree')
    mesh_object('trunk', bm, bark, root)
    # A dark knot hole on the trunk's front.
    knot = cylinder('knot-hole', .085, .06, (0, -.22, 1.05), hole, root, 10, False, (math.pi / 2, 0, 0))
    knot.scale = (1, 1.5, 1)
    export(f'halloween/dead-tree-{variant}.glb', join='dead-tree')


# ---------------------------------------------------------------- lighthouse
def lighthouse():
    """The harbour's lighthouse, 19.4 m from the rocks to the vane: a rocky
    islet, a tapering tower in five red and white bands with windows and a door,
    an iron gallery with railings, the lamp room and a red cap.
    The lamp itself is its own object, `lamp` (material `Lamp`), at 16.8 m; the
    turning beam through the fog is drawn by the game."""
    reset()
    root = empty('lighthouse')
    stone = material('Stone', STONE_DARK, rough=.95)
    white = material('White', WHITE, rough=.55)
    red = material('Red', RED, rough=.5)
    iron = material('Iron', IRON, rough=.45, metal=.6)
    lamp = material('Lamp', AMBER, rough=.3, emit=AMBER, strength=4)
    # The islet: three rocks round a flat top at 2.7 m.
    for k, (x, y, r, s) in enumerate(((0, 0, 5.2, 1), (3.6, -2.2, 2.4, 3), (-3.4, 2.4, 2.1, 5))):
        rk = rock(f'rock-{k}', r, s, stone, root, 3, .18, 2)
        rk.location = (x, y, 1.2 if k == 0 else .4)
        rk.scale = (1, 1, .5 if k == 0 else .6)
    lathe('plinth', [(0, 2.6), (2.5, 2.6), (2.5, 3.1), (2.15, 3.2), (0, 3.2)], 20, stone, root, False)
    # The tower: five bands, a slight taper and a lip between each.
    for i in range(5):
        z0, z1 = 3.2 + i * 2.4, 3.2 + (i + 1) * 2.4
        r0, r1 = 1.95 - i * .17, 1.95 - (i + 1) * .17
        lathe(f'band-{i}', [(r0, z0), (r1, z1)], 24, red if i % 2 else white, root, True, False)
        torus(f'lip-{i}', r1 + .02, .05, (0, 0, z1), white if i % 2 else red, root, 32, 5)
    # Windows up the seaward side, and the door at the foot.
    for i, z in enumerate((5.6, 9.2, 12.6)):
        r = 1.95 - (z - 3.2) / 2.4 * .17
        w = box(f'window-{i}', (.42, .2, .7), (0, -r + .03, z), iron, root)
        box(f'sill-{i}', (.56, .26, .08), (0, -r - .02, z - .4), white, root)
    box('door', (.8, .24, 1.5), (0, -1.86, 3.95), iron, root)
    box('lintel', (1.0, .3, .14), (0, -1.88, 4.76), white, root)
    # The gallery: a deck, posts and two rails round the lamp room.
    cylinder('gallery', 1.65, .28, (0, 0, 15.35), iron, root, 24, False)
    for k in range(16):
        a = k / 16 * math.tau
        cylinder(f'rail-post-{k}', .035, .75, (math.cos(a) * 1.55, math.sin(a) * 1.55, 15.85), iron, root, 6, False)
    for h in (15.85, 16.2):
        torus(f'rail-{h}', 1.55, .03, (0, 0, h), iron, root, 32, 4)
    # The lamp room: an iron drum with tall openings, the lamp glowing inside.
    cylinder('lamp-floor', 1.2, .2, (0, 0, 15.6), iron, root, 16, False)
    for k in range(8):
        a = k / 8 * math.tau + math.pi / 8
        bar = box(f'mullion-{k}', (.09, .09, 1.5), (math.cos(a) * 1.15, math.sin(a) * 1.15, 16.45), iron, root)
        bar.rotation_euler = (0, 0, a)
    cylinder('lamp', .82, 1.3, (0, 0, 16.8), lamp, root, 16, True)
    cylinder('lamp-ceiling', 1.25, .18, (0, 0, 17.3), iron, root, 16, False)
    lathe('cap', [(1.32, 17.38), (1.1, 17.6), (.2, 18.9), (0, 19.0)], 16, red, root, False)
    sphere('finial', .14, (0, 0, 19.08), iron, root, 10, 6)
    # A weathervane on top.
    cylinder('vane-rod', .025, .5, (0, 0, 19.35), iron, root, 6, False)
    box('vane', (.55, .02, .14), (.15, 0, 19.52), iron, root)
    join_parts(root, 'tower', exclude=('lamp',))
    export('halloween/lighthouse.glb')


# ---------------------------------------------------------------- ghost ship
def _hull(name, mat, parent):
    """A lofted hull 16 m long: stations from stern (-7) to bow (9), each a
    U-shaped section; the sheer rises towards the stern and the bow."""
    bm = bmesh.new()
    stations = [(-7.0, .55, 1.7), (-6, .9, 1.75), (-4, 1.05, 1.8), (-1, 1.1, 1.8), (2, 1.05, 1.75), (5, .9, 1.55), (7, .6, 1.1), (8.4, .25, .45), (9.1, .05, .08)]
    sheer = lambda x: 2.7 + max(0, (-x - 3.5)) * .35 + max(0, (x - 5)) * .28
    rings = []
    for x, depth, half in stations:
        ring = []
        for k in range(9):
            t = k / 8                      # port deck edge → keel → starboard deck edge
            a = math.pi * t
            y = -math.cos(a) * half
            z = sheer(x) - math.sin(a) * (depth + 1.3) + (1 - math.sin(a)) * 0
            # Fuller at the waterline, narrow at the keel.
            y *= .6 + .4 * math.sin(a) ** .3
            ring.append(bm.verts.new((x, y, z - .8)))
        rings.append(ring)
    for i in range(len(rings) - 1):
        for k in range(8):
            bm.faces.new((rings[i][k], rings[i + 1][k], rings[i + 1][k + 1], rings[i][k + 1]))
    # The transom (flat stern) and the deck.
    bm.faces.new(rings[0][::-1])
    deck = [bm.verts.new((v.co.x, v.co.y * .96, v.co.z - .05)) for v in (r[0] for r in rings)] + \
           [bm.verts.new((v.co.x, v.co.y * .96, v.co.z - .05)) for v in (r[8] for r in rings[::-1])]
    bm.faces.new(deck)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return mesh_object(name, bm, mat, parent, False), sheer


def _sail(name, width, height, mat, parent, location, seed):
    """A tattered square sail: a billowing grid with torn holes and a ragged foot."""
    rnd = random.Random(seed)
    bm = bmesh.new()
    cols, rows = 8, 6
    grid = [[bm.verts.new((0, (i / cols - .5) * width, -j / rows * height)) for i in range(cols + 1)] for j in range(rows + 1)]
    for j, row in enumerate(grid):
        for i, v in enumerate(row):
            u, w = i / cols, j / rows
            v.co.x = math.sin(u * math.pi) * .5 * (.4 + w)          # billows forward, most at the foot
            if j == rows:
                v.co.z += rnd.uniform(0, .5) * height / rows        # a ragged lower edge
    torn = {(rnd.randrange(1, cols - 1), rnd.randrange(1, rows - 1)) for _ in range(6)}
    for j in range(rows):
        for i in range(cols):
            if (i, j) in torn:
                continue
            bm.faces.new((grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]))
    loose = [v for v in bm.verts if not v.link_faces]
    bmesh.ops.delete(bm, geom=loose, context='VERTS')
    obj = mesh_object(name, bm, mat, parent, True)
    obj.location = location
    return obj


def ghost_ship():
    """The ghost ship off the harbour: about 19 m from the stern lanterns to the
    bowsprit, the waterline at z = 0. A planked hull, a stern castle with lit
    windows, two masts with yards and tattered glowing sails (material `Sail`),
    rigging, a bowsprit and three lanterns `lantern-0`…`lantern-2` (material
    `Glow`) whose light the game makes flicker. The game rocks it on the swell."""
    reset()
    root = empty('ghost-ship')
    hull_mat = material('Hull', HULL, rough=.85)
    trim = material('Trim', TRIM, rough=.8)
    sail = material('Sail', GHOST, rough=.6, emit=GHOST, strength=.6, alpha=.6, double=True)
    glow = material('Glow', GHOST, rough=.4, emit=GHOST, strength=2.5)
    hull, sheer = _hull('hull', hull_mat, root)
    # Wales: dark planks running the length of the hull.
    for k, dz in enumerate((-.35, -1.0)):
        for side in (-1, 1):
            for x0, x1 in ((-6.8, -3), (-3, 1), (1, 5), (5, 7.6)):
                h0, h1 = sheer(x0) - .8 + dz, sheer(x1) - .8 + dz
                plank = box(f'wale-{k}-{side}-{x0}', ((x1 - x0) / 2 + .05, .06, .09), ((x0 + x1) / 2, side * 1.62 * (1 - max(0, x0 - 4) * .08), (h0 + h1) / 2), trim, root)
                plank.rotation_euler = (0, -math.atan2(h1 - h0, x1 - x0), 0)
    # The stern castle with two lit windows, and a rail along the deck.
    box('castle', (2.1, 1.65, .95), (-5.2, 0, sheer(-5.2) + .1), trim, root)
    box('castle-roof', (2.3, 1.8, .1), (-5.2, 0, sheer(-5.2) + 1.1), hull_mat, root)
    for side in (-1, 1):
        box(f'castle-window-{side}', (.35, .04, .28), (-4.4 + side * .9, -1.67, sheer(-5.2) + .3), glow, root)
    for x in range(-6, 8, 1):
        for side in (-1, 1):
            cylinder(f'rail-post-{x}-{side}', .04, .55, (x, side * 1.6 * (1 - max(0, x - 4) * .1), sheer(x) - .5), trim, root, 5, False)
    # Masts, yards and sails.
    for m, (mx, h) in enumerate(((-2, 11), (3, 9.5))):
        cylinder(f'mast-{m}', .17, h, (mx, 0, 1.9 + h / 2), trim, root, 8, False)
        cylinder(f'top-{m}', .5, .12, (mx, 0, 1.9 + h * .78), trim, root, 8, False)
        for k, (y, w) in enumerate(((h * .55, 4.6), (h * .85, 3.6))):
            z = 1.9 + y
            cylinder(f'yard-{m}-{k}', .08, w + .6, (mx, 0, z + 1.4), trim, root, 6, False, (math.pi / 2, 0, 0))
            _sail(f'sail-{m}-{k}', w, 2.6, sail, root, (mx + .25, 0, z + 1.3), 31 + m * 7 + k)
    # Rigging: thin lines from the mast tops down to the rails, and the bowsprit.
    def line(a, b, r=.025):
        a, b = Vector(a), Vector(b)
        c = cylinder('rigging', r, (b - a).length, (a + b) / 2, trim, root, 4, False)
        c.rotation_euler = (b - a).to_track_quat('Z', 'Y').to_euler()
    for mx, h in ((-2, 11), (3, 9.5)):
        for side in (-1, 1):
            line((mx, 0, 1.9 + h - .3), (mx - 1.6, side * 1.6, sheer(mx - 1.6) - .4))
            line((mx, 0, 1.9 + h - .3), (mx + 1.6, side * 1.5, sheer(mx + 1.6) - .4))
    line((-2, 0, 12.6), (3, 0, 11.1), .03)
    line((3, 0, 11.1), (12.2, 0, 4.5), .03)
    line((8.6, 0, 2.9), (12.5, 0, 4.6), .1)
    # Lanterns: two at the stern, one at the bow.
    for k, p in enumerate(((-6.4, 1.2, sheer(-6.4) + .6), (-6.4, -1.2, sheer(-6.4) + .6), (8.2, 0, sheer(8.2) + .4))):
        sphere(f'lantern-{k}', .28, p, glow, root, 10, 8)
        cylinder(f'lantern-cap-{k}', .2, .12, (p[0], p[1], p[2] + .3), trim, root, 8, False)
    join_parts(root, 'ship', exclude=('lantern-0', 'lantern-1', 'lantern-2'))
    export('halloween/ghost-ship.glb')


def build():
    for v in range(3):
        dead_tree(v)
    lighthouse()
    ghost_ship()
