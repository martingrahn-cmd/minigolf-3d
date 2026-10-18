"""Spökhamnen, the Halloween harbour: jack-o'-lanterns, gravestones, a ghost,
a bat, the skeleton hand that lives in the cup and a witch's hat for the black
cat that helps balls over the lip.

Origins at the foot; the front (game +z) is Blender -y. The glTF exporter maps
Blender (x, y, z) to game (x, z, -y). Moving parts are separate objects whose
names and pivots are documented on each function."""
import math
import bmesh
from mathutils import Vector
from lib import material, empty, lathe, sphere, cylinder, box, export, reset, mesh_object, bevel


def _groove(a, ribs=8):
    return 1 - .1 * (1 - abs(math.sin(ribs / 2 * a))) ** 3


def _pumpkin_body(name, radius, height, mat):
    """A ribbed pumpkin: a sphere squashed to `height` with grooves between lobes."""
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=40, v_segments=18, radius=1)
    for v in bm.verts:
        groove = _groove(math.atan2(v.co.y, v.co.x))
        # A dimple at the top and bottom, as on a real pumpkin.
        z = v.co.z * (1 - .18 * (abs(v.co.z) ** 6))
        v.co = Vector((v.co.x * radius * groove, v.co.y * radius * groove, (z + 1) * height / 2))
    return mesh_object(name, bm, mat, None, True)


def _face_on(name, shapes, radius, height, centre, mat):
    """Flat cut-out shapes laid onto the front of the pumpkin (Blender -y).
    Each shape is a list of (x, z) points; they are pushed out to the surface."""
    bm = bmesh.new()
    for shape in shapes:
        verts = []
        for x, z in shape:
            dz = (z - centre) / (height / 2)
            r = radius * math.sqrt(max(.05, 1 - dz * dz))
            # Find the ribbed surface along this line of sight, then sit just outside it.
            y = -r
            for _ in range(4):
                g = r * _groove(math.atan2(y, x))
                y = -math.sqrt(max(.0001, g * g - x * x))
            verts.append(bm.verts.new((x, y - .028, z)))
        bm.faces.new(verts)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for f in bm.faces:
        if f.normal.y > 0:
            f.normal_flip()
    return mesh_object(name, bm, mat, None, False)


def jack_o_lantern(variant=0):
    """A carved pumpkin with a glowing face, about 0.9 m wide. Variant 1 is
    taller and grins with fangs. The glow is material 'Glow' (emissive)."""
    reset()
    orange = material('Pumpkin', 0xe8731f, rough=.5)
    stalk = material('Stalk', 0x4f5a24, rough=.8)
    glow = material('Glow', 0xffc24a, emit=0xffa22a, strength=6)
    r, h = (.45, .62) if variant == 0 else (.38, .74)
    _pumpkin_body('pumpkin', r, h, orange)
    c = h * .52
    eye = lambda s: [(s * .07, c + .03), (s * .22, c + .05), (s * .15, c + .17)]
    nose = [(-.04, c - .03), (.04, c - .03), (0, c + .04)]
    # The mouth is cut as convex strips between a jagged top edge and a curved
    # bottom edge, so it triangulates cleanly.
    if variant == 0:
        top = [(-.24, -.1), (-.16, -.16), (-.08, -.12), (0, -.19), (.08, -.12), (.16, -.16), (.24, -.1)]
        bottom = [-.1, -.21, -.24, -.25, -.24, -.21, -.1]
    else:
        top = [(-.22, -.08), (-.1, -.1), (-.07, -.17), (-.04, -.11), (.04, -.11), (.07, -.17), (.1, -.1), (.22, -.08)]
        bottom = [-.08, -.2, -.22, -.23, -.23, -.22, -.2, -.08]
    mouth = []
    for i in range(len(top) - 1):
        (x0, t0), (x1, t1), b0, b1 = top[i], top[i + 1], bottom[i], bottom[i + 1]
        strip = [(x0, c + t0), (x0, c + b0), (x1, c + b1), (x1, c + t1)]
        mouth.append([p for k, p in enumerate(strip) if p not in strip[:k]])
    _face_on('face', [eye(-1), eye(1)[::-1], nose] + mouth, r, h, h / 2, glow)
    stem = cylinder('stem', .045, .16, (0, 0, h + .04), stalk, None, 7)
    stem.rotation_euler = (.25, .15, 0)
    export(f'halloween/jack-o-lantern-{variant}.glb', join='jack-o-lantern')


def gravestone(variant=0):
    """A weathered gravestone, ~0.75 m wide and up to 1.3 m tall: 0 a rounded
    slab, 1 a stone cross, 2 a pointed slab leaning a little."""
    reset()
    stone = material('Stone', 0x6b6878, rough=.9)
    dark = material('StoneDark', 0x3c3a48, rough=.95)
    moss = material('Moss', 0x51703c, rough=1)
    box('mound', (.95, .55, .16), (0, 0, .04), moss, bevel_width=.06)
    if variant == 1:
        box('upright', (.18, .16, 1.15), (0, 0, .62), stone, bevel_width=.03)
        box('arm', (.62, .2, .18), (0, 0, .9), stone, bevel_width=.03)
        box('base', (.42, .3, .2), (0, 0, .12), dark, bevel_width=.03)
    else:
        bm = bmesh.new()
        if variant == 0:
            # A slab with a rounded top.
            outline = [(-.33, 0), (.33, 0)] + [(.33 * math.cos(k / 10 * math.pi), .72 + .33 * math.sin(k / 10 * math.pi)) for k in range(11)]
        else:
            outline = [(-.3, 0), (.3, 0), (.3, .7), (0, 1.05), (-.3, .7)]
        front = [bm.verts.new((x, -.08, z)) for x, z in outline]
        back = [bm.verts.new((x, .08, z)) for x, z in outline]
        bm.faces.new(front[::-1])
        bm.faces.new(back)
        for i in range(len(outline)):
            j = (i + 1) % len(outline)
            bm.faces.new((front[i], front[j], back[j], back[i]))
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        slab = mesh_object('slab', bm, stone)
        bevel(slab, .025, 2)
        lean = .12 if variant == 2 else 0
        slab.rotation_euler = (0, lean, 0)
        plaque = box('plaque', (.4 if variant == 0 else .36, .02, .28), (lean * .4, -.09, .55 if variant == 0 else .5), dark)
        plaque.rotation_euler = (0, lean, 0)
        if variant == 0:
            for k in range(3):
                box(f'line-{k}', (.26 - k * .06, .012, .025), (0, -.1, .62 - k * .07), stone)
    export(f'halloween/gravestone-{variant}.glb', join='gravestone')


def ghost():
    """A friendly sheet ghost, 1.4 m tall, facing game +z. Material 'Ghost' is
    pale and glowing; the game makes it see-through. Arms are 'arm-l' and
    'arm-r', pivoting at the shoulder (turn about game z to wave)."""
    reset()
    sheet = material('Ghost', 0xf2f0ff, rough=.6, emit=0xcfe0ff, strength=.8)
    dark = material('Eye', 0x1a1426, rough=.4)
    root = empty('ghost')
    profile = [(0, 1.42), (.2, 1.38), (.36, 1.24), (.44, 1.02), (.47, .76), (.52, .46), (.58, .2), (.62, .02)]
    body = lathe('sheet', profile, 32, sheet, root, cap=False)
    # A wavy hem.
    for v in body.data.vertices:
        if v.co.z < .05:
            a = math.atan2(v.co.y, v.co.x)
            v.co.z = .02 + .09 * math.sin(a * 6)
    for s in (-1, 1):
        e = sphere(f'eye-{s}', .07, (s * .14, -.42, 1.05), dark, root, 12, 8)
        e.scale = (.8, .4, 1.35)
        arm = empty(f'arm-{"l" if s < 0 else "r"}', root, (s * .44, 0, .86))
        a = lathe(f'arm-sheet-{s}', [(.12, 0), (.1, .2), (.05, .34), (0, .38)], 12, sheet, arm)
        a.rotation_euler = (0, s * 1.9, 0)
    m = sphere('mouth', .07, (0, -.43, .84), dark, root, 12, 8)
    m.scale = (1, .4, 1.2)
    export('halloween/ghost.glb')


def bat():
    """A bat with a 0.9 m wingspan, facing game +z. The wings are 'wing-l' and
    'wing-r', pivoting at the shoulders (turn about game z to flap)."""
    reset()
    fur = material('BatFur', 0x2a2033, rough=.8)
    skin = material('BatWing', 0x3d2c4a, rough=.7, double=True)
    eye = material('BatEye', 0xffd34a, emit=0xffb020, strength=4)
    root = empty('bat')
    body = sphere('body', .1, (0, 0, 0), fur, root, 12, 8)
    body.scale = (.9, 1.3, 1)
    sphere('head', .08, (0, -.12, .04), fur, root, 12, 8)
    for s in (-1, 1):
        ear = lathe(f'ear-{s}', [(.03, 0), (0, .08)], 6, fur, root)
        ear.location = (s * .045, -.13, .1)
        sphere(f'eye-{s}', .016, (s * .035, -.19, .06), eye, root, 8, 6)
        wing = empty(f'wing-{"l" if s < 0 else "r"}', root, (s * .07, 0, .02))
        bm = bmesh.new()
        pts = [(0, -.06), (.12, -.1), (.3, -.12), (.45, -.04), (.42, .04), (.33, .02), (.28, .1), (.19, .05), (.12, .12), (.05, .06), (0, .08)]
        verts = [bm.verts.new((s * x, y, 0)) for x, y in pts]
        bm.faces.new(verts if s > 0 else verts[::-1])
        mesh_object(f'wing-skin-{s}', bm, skin, wing)
    export('halloween/bat.glb')


def skeleton_hand():
    """The skeleton hand that lives in Spökhamnen's cups: a forearm with two
    bones rising out of a tattered sleeve, and the palm held flat like a tray
    with the ball resting on it. The fingers point at game +z (towards the
    camera); they are 'finger-0' (thumb) to 'finger-4', pivoting at the
    knuckles. Turn them about game x (negative is up) to curl them round the
    ball. The ball rests at game (0, 0.63, 0.1)."""
    reset()
    bone = material('Bone', 0xefe4c6, rough=.55)
    sleeve = material('Sleeve', 0x3b2550, rough=.9)
    root = empty('skeleton-hand')
    lathe('sleeve', [(.16, -1.3), (.17, -.55), (.19, -.42), (.15, -.36), (0, -.36)], 14, sleeve, root)
    for x in (-.045, .045):
        cylinder(f'forearm-{x}', .035, .66, (x, 0, -.05), bone, root, 8)
        sphere(f'wrist-{x}', .05, (x, 0, .3), bone, root, 8, 6)
    box('palm', (.28, .26, .08), (0, -.1, .36), bone, root, bevel_width=.025)
    lengths = (.1, .08, .06)
    for i, (x, y, spread) in enumerate(((.17, -.02, -.5), (-.105, -.23, .12), (-.035, -.24, .04), (.035, -.24, -.04), (.105, -.23, -.12))):
        finger = empty(f'finger-{i}', root, (x, y, .37))
        finger.rotation_euler = (0, 0, spread)
        d = 0
        for k, length in enumerate(lengths if i else lengths[:2]):
            sphere(f'knuckle-{i}-{k}', .03 - k * .004, (0, -d, 0), bone, finger, 8, 6)
            cylinder(f'phalanx-{i}-{k}', .024 - k * .003, length, (0, -d - length / 2, 0), bone, finger, 7, rotation=(math.pi / 2, 0, 0))
            d += length
        sphere(f'tip-{i}', .022, (0, -d, 0), bone, finger, 8, 6)
    export('halloween/skeleton-hand.glb')


def witch_hat():
    """A crooked witch's hat for the black cat, 0.45 m tall, brim radius 0.24."""
    reset()
    felt = material('HatFelt', 0x2b1d3a, rough=.85)
    band = material('HatBand', 0x8a4fd1, rough=.6)
    buckle = material('Buckle', 0xf2c25c, rough=.3, metal=.6)
    lathe('brim', [(.24, 0), (.24, .015), (.11, .025), (0, .025)], 24, felt)
    cone = lathe('cone', [(.12, .02), (.1, .12), (.07, .24), (.035, .36), (0, .45)], 18, felt)
    for v in cone.data.vertices:
        v.co.x += .12 * (v.co.z / .45) ** 2.5
    lathe('band', [(.125, .02), (.118, .07), (0, .07)], 18, band)
    box('buckle', (.05, .01, .04), (0, -.12, .045), buckle)
    export('halloween/witch-hat.glb', join='witch-hat')


def build():
    jack_o_lantern(0)
    jack_o_lantern(1)
    for v in range(3):
        gravestone(v)
    ghost()
    bat()
    skeleton_hand()
    witch_hat()
