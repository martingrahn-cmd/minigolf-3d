"""Spökhamnen's set pieces: crooked dead trees, the lighthouse and the ghost
ship lying off the harbour, and the dress on the course: graveyard gates, crypt
pillars, the scarecrow, shore lamp posts and lanterns, and the finale ship's
cannons, helm and skull figurehead (the finale's hull is the course itself and
stays in code).

Sizes follow the code stand-ins in src/halloween.js (deadTree, lighthouse,
ghostShip, createGraveGates, createCryptGates, createScarecrow,
createGhostShipScenery), so the code places them the same way. Origins at the foot or the
waterline; the game's +z is Blender -y; the glTF exporter maps Blender
(x, y, z) to game (x, z, -y)."""
import math
import random
import bmesh
import bpy
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


# ------------------------------------------------------------ course dress
def _polyline(bm, points, r, sides=6):
    points = [Vector(p) for p in points]
    for a, b in zip(points, points[1:]):
        _tube(bm, a, b, r, r, sides)
    for p in points[1:-1]:
        _knob(bm, p, r * 1.05)


def _ellipse(span, z0, rise, count=24):
    """Points of a half ellipse over the y axis, from -span to +span."""
    return [(0, -span * math.cos(k / count * math.pi), z0 + rise * math.sin(k / count * math.pi)) for k in range(count + 1)]


def lantern():
    """A small iron lantern, 0.64 m from the hook down: a ring, a pyramid roof,
    four corner posts round lit glass (material `Flame`) and a base. The origin
    is the hook, so it hangs from a bracket or stands on a post 0.64 m lower."""
    reset()
    root = empty('lantern')
    iron = material('Iron', IRON, rough=.45, metal=.6)
    flame = material('Flame', AMBER, rough=.3, emit=AMBER, strength=3)
    torus('ring', .045, .012, (0, 0, -.05), iron, root, 12, 4, (math.pi / 2, 0, 0))
    lathe('roof', [(.23, -.23), (.2, -.19), (.03, -.09), (0, -.08)], 4, iron, root, False).rotation_euler = (0, 0, math.pi / 4)
    box('top', (.3, .3, .03), (0, 0, -.235), iron, root)
    box('glass', (.24, .24, .32), (0, 0, -.41), flame, root)
    for x in (-.135, .135):
        for y in (-.135, .135):
            cylinder(f'post-{x}-{y}', .016, .36, (x, y, -.41), iron, root, 5, False)
    for y in (-.135, .135):
        box(f'bar-x-{y}', (.27, .018, .018), (0, y, -.41), iron, root)
        box(f'bar-y-{y}', (.018, .27, .018), (y, 0, -.41), iron, root)
    box('base', (.32, .32, .04), (0, 0, -.59), iron, root)
    sphere('drop', .04, (0, 0, -.63), iron, root, 8, 5, False)
    export('halloween/lantern.glb', join='lantern')


def grave_gate():
    """A graveyard gate over the lane: two stone pillars 3.6 m apart (their
    centres where the arch posts collide, 0.5 m square), ball finials, a double
    iron arch with bars and spikes, and a short chain at the top for a
    `halloween/lantern` (its hook at 2.05 m). Origin on the lane between them."""
    reset()
    root = empty('grave-gate')
    stone = material('Stone', STONE, rough=.95)
    dark = material('StoneDark', STONE_DARK, rough=1)
    moss = material('Moss', 0x3f5a3a, rough=1)
    iron = material('Iron', IRON, rough=.45, metal=.6)
    for side in (-1, 1):
        y = side * 1.8
        box(f'plinth-{side}', (.64, .64, .22), (0, y, .11), stone, root)
        box(f'shaft-{side}', (.5, .5, 1.14), (0, y, .79), stone, root)
        for face in (-1, 1):
            # A sunken panel with a cross on each face along the lane.
            box(f'panel-{side}-{face}', (.02, .3, .62), (face * .255, y, .82), dark, root)
            box(f'cross-v-{side}-{face}', (.03, .05, .34), (face * .262, y, .85), stone, root)
            box(f'cross-h-{side}-{face}', (.03, .2, .05), (face * .262, y, .94), stone, root)
        box(f'cornice-{side}', (.62, .62, .12), (0, y, 1.42), stone, root)
        box(f'cap-{side}', (.5, .5, .1), (0, y, 1.53), stone, root)
        sphere(f'ball-{side}', .23, (0, y, 1.8), stone, root, 12, 8, False)
        m = sphere(f'moss-{side}', .3, (.12, y - side * .1, 1.47), moss, root, 10, 6, False)
        m.scale = (1, .9, .22)
    bm = bmesh.new()
    outer, inner = _ellipse(1.55, 1.42, .9), _ellipse(1.55, 1.42, .62)
    _polyline(bm, outer, .045)
    _polyline(bm, inner, .035)
    # Bars between the arcs and spikes along the top.
    for k in range(2, 23, 2):
        _tube(bm, inner[k], outer[k], .022, .022, 5)
        top = Vector(outer[k])
        _tube(bm, top, top + Vector((0, 0, .16)), .03, .002, 5)
    # Curls where the arch meets the pillars, and a spike at the top.
    for side in (-1, 1):
        c = Vector((0, side * 1.2, 1.55))
        _polyline(bm, [c + Vector((0, side * .13 * math.cos(t), .13 * math.sin(t))) for t in [k / 8 * math.tau * .8 for k in range(9)]], .018, 5)
    _tube(bm, Vector(outer[12]), Vector(outer[12]) + Vector((0, 0, .32)), .04, .002, 6)
    mesh_object('arch', bm, iron, root)
    for k in range(3):
        torus(f'chain-{k}', .025, .007, (0, 0, 2.03 - k * .04 + .08), iron, root, 10, 4, (math.pi / 2, 0, k * math.pi / 2))
    export('halloween/grave-gate.glb', join='grave-gate')


def crypt_pillar():
    """One pillar of the crypt portcullis: 0.7 m square and 3.55 m to the top of
    its cap, built of slightly uneven blocks on a plinth, with three iron
    sconces on each face along the lane for the gate's witch-fire flames (at
    1.51, 1.93 and 2.35 m, 0.4 m out). A pumpkin sits on the flat cap."""
    reset()
    rnd = random.Random(5)
    root = empty('crypt-pillar')
    stone = material('Stone', STONE, rough=.95)
    dark = material('StoneDark', STONE_DARK, rough=1)
    moss = material('Moss', 0x3f5a3a, rough=1)
    iron = material('Iron', IRON, rough=.45, metal=.6)
    box('plinth', (.9, .9, .3), (0, 0, .15), dark, root, .02)
    z, k = .3, 0
    while z < 3.2:
        h = min(.34 + rnd.uniform(-.04, .04), 3.25 - z)
        w = .7 + rnd.uniform(-.03, .03)
        box(f'block-{k}', (w, w + rnd.uniform(-.02, .02), h - .02), (rnd.uniform(-.01, .01), rnd.uniform(-.01, .01), z + h / 2), stone if k % 3 else dark, root, .015)
        z += h
        k += 1
    box('mortar', (.66, .66, 2.95), (0, 0, 1.77), dark, root)
    box('cornice', (.85, .85, .18), (0, 0, 3.34), stone, root, .02)
    box('cap', (.78, .78, .12), (0, 0, 3.49), dark, root, .015)
    m = sphere('moss', .42, (.15, .2, 3.38), moss, root, 10, 6, False)
    m.scale = (1, .8, .2)
    for face in (-1, 1):
        for h in (1.51, 1.93, 2.35):
            # A cup held out on a bracket; the game's flame sits in it.
            x = face * .4
            torus(f'cup-{face}-{h}', .1, .018, (x, 0, h - .14), iron, root, 12, 4)
            cylinder(f'dish-{face}-{h}', .09, .03, (x, 0, h - .16), iron, root, 10, False)
            box(f'bracket-{face}-{h}', (.1, .03, .03), (face * .33, 0, h - .16), iron, root)
            brace = box(f'brace-{face}-{h}', (.02, .03, .16), (0, 0, 0), iron, root)
            brace.location = (face * .38, 0, h - .23)
            brace.rotation_euler = (0, -face * .75, 0)
    export('halloween/crypt-pillar.glb', join='crypt-pillar')


def scarecrow():
    """The scarecrow on the spinner's hub: a weathered post 2.2 m tall, a
    burlap shirt stuffed with straw (1.0–1.9 m) with a rope belt and a patch,
    and a crooked hat whose brim sits at 2.58 m over the game's pumpkin head.
    The sweeping arms are the spinner's and stay in code (material `Cloth`
    matches their sleeves)."""
    reset()
    rnd = random.Random(9)
    root = empty('scarecrow')
    wood = material('Wood', 0x6a4a30, rough=.95)
    cloth = material('Cloth', 0x7a3b4e, rough=1)
    patch = material('Patch', 0x8a6a3a, rough=1)
    straw = material('Straw', 0xd8b452, rough=.9)
    rope = material('Rope', 0xb39a6a, rough=1)
    hat = material('Hat', 0x2b1d3a, rough=.9)
    band = material('Band', 0xff8a2a, rough=.7)
    lathe('post', [(.2, 0), (.18, 1.1), (.16, 2.2), (0, 2.2)], 8, wood, root, False)
    for z in (.62, 2.05):
        torus(f'binding-{z}', .19, .025, (0, 0, z), rope, root, 12, 4)
    shirt = lathe('shirt', [(.12, 1.92), (.24, 1.84), (.33, 1.7), (.35, 1.45), (.31, 1.22), (.34, 1.06), (.3, .98), (.26, .96)], 12, cloth, root, False, False)
    shirt.rotation_euler = (0, 0, .2)
    torus('belt', .315, .03, (0, 0, 1.2), rope, root, 16, 4)
    torus('collar', .13, .03, (0, 0, 1.9), rope, root, 12, 4)
    p = box('patch', (.03, .16, .14), (0, 0, 0), patch, root)
    p.location = (-.335, .08, 1.5)
    p.rotation_euler = (0, .1, .2)
    for k in range(12):
        a = k / 12 * math.tau + rnd.uniform(-.2, .2)
        base = Vector((math.cos(a) * .27, math.sin(a) * .27, .99))
        tuft = cylinder(f'straw-{k}', .045, .26, base + Vector((0, 0, -.1)), straw, root, 4, False)
        tuft.rotation_euler = (math.sin(a) * .5, -math.cos(a) * .5, a)
        tuft.scale = (1, .5, 1)
    for k in range(7):
        a = k / 7 * math.tau
        tuft = cylinder(f'neck-straw-{k}', .03, .2, (math.cos(a) * .11, math.sin(a) * .11, 1.98), straw, root, 4, False)
        tuft.rotation_euler = (-math.sin(a) * .6, math.cos(a) * .6, a)
    cylinder('brim', .56, .035, (0, 0, 2.58), hat, root, 20, False)
    # The crown bends over as it rises, with a band round its foot.
    bm = bmesh.new()
    rings, steps = [], 7
    for k in range(steps + 1):
        t = k / steps
        r = .3 * (1 - t) ** 1.1 + .01
        c = Vector((.22 * t ** 2, 0, 2.6 + .72 * t - .1 * t ** 3))
        rings.append([bm.verts.new(c + Vector((math.cos(j / 12 * math.tau) * r, math.sin(j / 12 * math.tau) * r, 0))) for j in range(12)])
    for a, b in zip(rings, rings[1:]):
        for j in range(12):
            bm.faces.new((a[j], a[(j + 1) % 12], b[(j + 1) % 12], b[j]))
    mesh_object('crown', bm, hat, root)
    torus('hat-band', .29, .035, (0, 0, 2.66), band, root, 16, 4)
    export('halloween/scarecrow.glb', join='scarecrow')


def lamp_post():
    """A crooked shore lamp post: a wooden pile in the water (its top at
    -1.8 m, the waterline about -1.5 m lower) with rope lashings and barnacles,
    and a leaning iron post with a scrolled arm. A `halloween/lantern` hangs from
    the hook at (0.9, 0, 2.78). Origin at the post's foot on the waterline plan."""
    reset()
    rnd = random.Random(3)
    root = empty('lamp-post')
    wood = material('Pile', 0x2e2019, rough=1)
    rope = material('Rope', 0x6a5a40, rough=1)
    shell = material('Barnacle', 0x8a8478, rough=1)
    iron = material('Iron', IRON, rough=.45, metal=.6)
    lathe('pile', [(.8, -6.4), (.72, -3.4), (.62, -1.95), (.5, -1.8), (0, -1.78)], 10, wood, root, False)
    for z in (-2.3, -2.55):
        torus(f'lashing-{z}', .66, .04, (0, 0, z), rope, root, 16, 4)
    for k in range(9):
        a = rnd.uniform(0, math.tau)
        z = rnd.uniform(-3.4, -2.8)
        b = sphere(f'barnacle-{k}', rnd.uniform(.05, .09), (math.cos(a) * .7, math.sin(a) * .7, z), shell, root, 6, 4, False)
        b.scale = (1, 1, .6)
    bm = bmesh.new()
    _tube(bm, Vector((0, 0, -1.82)), Vector((.25, 0, 2.62)), .085, .06, 7)
    _polyline(bm, [(.25, 0, 2.6), (.6, 0, 2.74), (.92, 0, 2.8)], .045)
    # A scroll under the arm.
    pts = [(.22 + .3 * t, 0, 2.05 + .55 * t) for t in (0, .5)]
    curl = [(.52 + .1 * math.cos(a), 0, 2.4 + .1 * math.sin(a)) for a in [math.pi + k / 8 * math.tau * .85 for k in range(9)]]
    _polyline(bm, pts + curl, .022, 5)
    _tube(bm, Vector((.25, 0, 2.6)), Vector((.25, 0, 2.92)), .05, .002, 6)
    mesh_object('post', bm, iron, root)
    cylinder('collar', .13, .16, (0, 0, -1.74), iron, root, 8, False)
    torus('hook', .03, .008, (.9, 0, 2.78), iron, root, 8, 4, (math.pi / 2, 0, 0))
    export('halloween/lamp-post.glb', join='lamp-post')


def cannon():
    """A ship's cannon barrel, 1.6 m long, the muzzle towards the game's +z;
    a cascabel at the breech, reinforcing rings, trunnions and a dark bore.
    Origin at its middle."""
    reset()
    root = empty('cannon')
    iron = material('Iron', 0x34303c, rough=.4, metal=.7)
    bore = material('Bore', 0x08060a, rough=1)
    barrel = lathe('barrel', [(0, -.92), (.08, -.9), (.07, -.84), (.2, -.8), (.29, -.76), (.29, -.62), (.27, -.58), (.27, .05), (.25, .1), (.24, .66),
                              (.27, .7), (.27, .8), (.13, .8), (.13, .7)], 16, iron, root, True, False)
    barrel.rotation_euler = (math.pi / 2, 0, 0)
    for h in (-.45, .12):
        torus(f'ring-{h}', .275, .03, (0, -h, 0), iron, root, 16, 5, (math.pi / 2, 0, 0))
    sphere('cascabel', .1, (0, .97, 0), iron, root, 10, 6)
    cylinder('trunnions', .07, .7, (0, .1, 0), iron, root, 10, True, (0, math.pi / 2, 0))
    cylinder('bore', .13, .02, (0, -.72, 0), bore, root, 16, False, (math.pi / 2, 0, 0))
    export('halloween/cannon.glb', join='cannon')


def ship_wheel():
    """The helm on the finale's stern: a turned post 1.05 m tall and a wheel
    0.72 m to its handles with its centre at 1.15 m, in the plane across the
    game's z (the code turns it to face the bow). The wheel is its own object
    `wheel`, with its origin at the centre, so it can turn."""
    reset()
    root = empty('ship-wheel')
    wood = material('Wood', 0x6a5a3a, rough=.7)
    dark = material('WoodDark', 0x3a2c26, rough=.85)
    brass = material('Brass', 0xc9a44a, rough=.35, metal=.8)
    lathe('stand', [(.2, 0), (.2, .08), (.12, .12), (.09, .3), (.12, .5), (.08, .7), (.1, .95), (.13, 1.0), (.13, 1.05), (0, 1.06)], 12, dark, root, True)
    box('axle-block', (.16, .22, .16), (0, .1, 1.1), dark, root, .02)
    wheel = empty('wheel', root, (0, 0, 1.15))
    for r, m in ((.55, .05), (.42, .03)):
        torus(f'rim-{r}', r, m, (0, 0, 0), wood, wheel, 32, 6, (math.pi / 2, 0, 0))
    cylinder('hub', .1, .14, (0, 0, 0), brass, wheel, 14, True, (math.pi / 2, 0, 0))
    for k in range(8):
        a = k / 8 * math.tau
        d = Vector((math.cos(a), 0, math.sin(a)))
        spoke = cylinder(f'spoke-{k}', .03, .55, tuple(d * .3), wood, wheel, 6, True)
        spoke.rotation_euler = d.to_track_quat('Z', 'Y').to_euler()
        handle = lathe(f'handle-{k}', [(.03, .55), (.045, .6), (.03, .66), (.04, .7), (0, .73)], 8, wood, wheel, True)
        handle.rotation_euler = d.to_track_quat('Z', 'Y').to_euler()
    join_parts(wheel, 'wheel-body')
    join_parts(root, 'stand-body', exclude=('wheel',))
    export('halloween/ship-wheel.glb')


def skull():
    """The finale ship's figurehead: a skull of radius 0.5 facing the game's -x,
    with deep sockets, a nose cavity, a jaw with teeth and glowing eyes
    (material `Glow`) where the code had its two lights."""
    reset()
    root = empty('skull')
    bone = material('Bone', BONE, rough=.7)
    socket = material('Socket', 0x120a14, rough=1)
    glow = material('Glow', GHOST, rough=.4, emit=GHOST, strength=3)
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=40, v_segments=26, radius=.5)
    holes = [(Vector((-1, .4, .14)).normalized(), .3, .13), (Vector((-1, -.4, .14)).normalized(), .3, .13), (Vector((-1, 0, -.2)).normalized(), .15, .08)]
    inside = {}
    for v in bm.verts:
        # Sockets are measured on the round sphere, before it is shaped.
        d = v.co.normalized()
        depth, inside[v] = 0, 0
        for direction, size, deep in holes:
            t = (d - direction).length / size
            if t < 1:
                depth = max(depth, deep * (1 - t * t))
                inside[v] = max(inside[v], 1 - t)
        p = v.co
        p -= d * depth
        # A longer back, narrower temples and a flatter face.
        p.x *= 1.12 if p.x > 0 else .92
        p.y *= .88
        if p.z < -.1:
            p.y *= 1 - (-.1 - p.z) * .5
    for f in bm.faces:
        f.material_index = 1 if sum(inside[v] > .1 for v in f.verts) >= len(f.verts) - 1 else 0
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    head = mesh_object('cranium', bm, bone, root, True)
    head.data.materials.append(socket)
    # The jaw: a rounded block under the face, with a row of teeth above and below.
    jaw = box('jaw', (.36, .5, .2), (-.24, 0, -.36), bone, root, .06)
    jaw.scale = (1, .9, 1)
    for row, z in ((0, -.27), (1, -.3)):
        for k in range(6):
            y = (k - 2.5) * .065
            box(f'tooth-{row}-{k}', (.05, .055, .07), (-.43 + abs(y) * .35, y, z - row * .02), bone, root)
    box('gap', (.06, .4, .025), (-.4, 0, -.29), socket, root)
    for side in (-1, 1):
        sphere(f'eye-{side}', .055, (-.38, side * .19, .07), glow, root, 10, 6)
    export('halloween/skull.glb', join='skull')


def build():
    for v in range(3):
        dead_tree(v)
    lighthouse()
    ghost_ship()
    lantern()
    grave_gate()
    crypt_pillar()
    scarecrow()
    lamp_post()
    cannon()
    ship_wheel()
    skull()
