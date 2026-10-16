"""The cup critters that pop up and eat the ball when a putt drops.
Molnskogen has a mole in a miner's helmet, Urverkets stad a cuckoo on a
spring (the spring is drawn in the game) and Månkarnevalen reuses the alien.

Origins at the foot; the front (game +z) is Blender -y. The glTF exporter maps
Blender (x, y, z) to game (x, z, -y). Moving parts are separate objects whose
names and pivots are documented below."""
import math
from lib import material, empty, lathe, sphere, cylinder, torus, box, export, reset


def mole():
    """A mole in a yellow miner's helmet, 1.15 m tall and 0.8 m wide, facing
    game +z. The paws are separate objects 'paw-l' and 'paw-r' pivoting at the
    shoulders (turn about game z to wave). Its mouth is at game (0, 0.56, 0.36)."""
    reset()
    fur, belly = material('Fur', 0x5e4a3c, rough=.95), material('Belly', 0x8a7262, rough=.95)
    pink, claw = material('Pink', 0xf29aa6, rough=.6), material('Claw', 0xf6ead2, rough=.5)
    dark, shine = material('Eye', 0x1a1210, rough=.2), material('Shine', 0xffffff, emit=0xffffff, strength=1)
    hat, lamp = material('Helmet', 0xf2c14a, rough=.35), material('Lamp', 0xfff0c0, emit=0xffd27a, strength=4)
    root = empty('mole')
    body = sphere('body', .4, (0, 0, .42), fur, root, 20, 14)
    body.scale = (1, .9, 1.25)
    tummy = sphere('tummy', .3, (0, -.17, .36), belly, root, 16, 10)
    tummy.scale = (1, .6, 1.2)
    snout = sphere('snout', .14, (0, -.36, .6), fur, root, 14, 10)
    snout.scale = (1, 1.4, .85)
    sphere('nose', .07, (0, -.55, .62), pink, root, 10, 8)
    for k in range(8):
        a = k / 8 * math.tau
        sphere(f'nose-star-{k}', .028, (math.cos(a) * .08, -.56, .62 + math.sin(a) * .08), pink, root, 6, 4)
    torus('mouth', .05, .012, (0, -.42, .5), dark, root, 12, 4, rotation=(math.pi / 2, 0, 0)).scale = (1.4, .6, 1)
    for s in (-1, 1):
        sphere(f'eye-{s}', .04, (s * .13, -.31, .74), dark, root, 8, 6)
        sphere(f'shine-{s}', .012, (s * .13 + .012, -.345, .755), shine, root, 6, 4)
        sphere(f'cheek-{s}', .07, (s * .2, -.3, .56), pink, root, 8, 6).scale = (1, .5, .7)
        sphere(f'foot-{s}', .12, (s * .17, -.12, .06), pink, root, 10, 6).scale = (1, 1.5, .5)
        paw = empty(f'paw-{"l" if s < 0 else "r"}', root, (s * .36, -.08, .5))
        arm = sphere(f'arm-{s}', .1, (s * .08, 0, -.05), fur, paw, 10, 8)
        arm.scale = (1, 1, 1.4)
        hand = sphere(f'hand-{s}', .16, (s * .16, -.06, -.14), pink, paw, 14, 10)
        hand.scale = (1, .45, 1.15)
        for c in range(5):
            x = s * .16 + (c - 2) * .055
            claw_obj = lathe(f'claw-{s}-{c}', [(.022, 0), (0, .09)], 6, claw, paw)
            claw_obj.location = (x, -.08, -.3)
            claw_obj.rotation_euler = (math.pi, 0, 0)
    # The miner's helmet with its lamp.
    lathe('helmet', [(.3, .86), (.29, .95), (.22, 1.05), (.1, 1.1), (0, 1.12)], 20, hat, root)
    torus('brim', .31, .03, (0, 0, .86), hat, root, 24, 6)
    cylinder('lamp-housing', .07, .06, (0, -.28, .96), hat, root, 12, rotation=(math.pi / 2, 0, 0))
    sphere('lamp', .055, (0, -.32, .96), lamp, root, 10, 8)
    export('forest/mole.glb')


def cuckoo_bird():
    """The cuckoo that springs out of the cup: 0.85 m tall, facing game +z.
    The lower beak is 'beak' (pivot at the hinge, turn about game x to open)
    and the wings are 'wing-l' and 'wing-r' (pivot at the shoulder, turn
    about game z to flap). Its mouth is at game (0, 0.52, 0.32)."""
    reset()
    teal, ivory = material('Feather', 0x356966, rough=.55), material('Face', 0xffe8bc, rough=.6)
    gold, red = material('Beak', 0xf0ca7e, rough=.3, metal=.4), material('Crest', 0xd5485b, rough=.5)
    dark, shine = material('Eye', 0x1a1210, rough=.2), material('Shine', 0xffffff, emit=0xffffff, strength=1)
    copper = material('Copper', 0x986342, rough=.4, metal=.5)
    root = empty('cuckoo')
    body = sphere('body', .3, (0, 0, .3), teal, root, 18, 12)
    body.scale = (.95, .9, 1.05)
    face = sphere('face', .22, (0, -.1, .55), ivory, root, 16, 12)
    face.scale = (1, .9, 1)
    top = lathe('beak-top', [(.07, 0), (0, .2)], 10, gold, root)
    top.location = (0, -.27, .56)
    top.rotation_euler = (math.pi / 2 + .15, 0, 0)
    beak = empty('beak', root, (0, -.27, .5))
    lathe('beak-low', [(.055, 0), (0, .15)], 10, gold, beak).rotation_euler = (math.pi / 2 - .1, 0, 0)
    for s in (-1, 1):
        sphere(f'eye-{s}', .045, (s * .09, -.27, .63), dark, root, 8, 6)
        sphere(f'shine-{s}', .014, (s * .09 + .014, -.31, .645), shine, root, 6, 4)
        wing = empty(f'wing-{"l" if s < 0 else "r"}', root, (s * .25, .02, .4))
        w = sphere(f'wing-feather-{s}', .17, (s * .08, 0, -.08), copper, wing, 12, 8)
        w.scale = (.35, .9, 1.2)
    for k, (x, h) in enumerate(((-.05, .2), (0, .26), (.05, .2))):
        c = lathe(f'crest-{k}', [(.03, 0), (0, h)], 6, red, root)
        c.location = (x, -.02, .74)
        c.rotation_euler = (-.3, x * 4, 0)
    tail = lathe('tail', [(.09, 0), (0, .3)], 8, teal, root)
    tail.location = (0, .28, .25)
    tail.rotation_euler = (-1.9, 0, 0)
    export('clockwork/cuckoo-bird.glb')


def house_cat():
    """A ginger house cat standing, 0.95 m to the ear tips and 1.1 m long,
    facing game +z. Legs are 'leg-fl', 'leg-fr', 'leg-bl', 'leg-br', each
    pivoting at the hip or shoulder (turn about game x to walk); 'leg-fr' also
    swats. 'head' pivots at the neck (turn about game y to look), 'tail' at
    its root (turn about game z to swish)."""
    reset()
    fur, cream = material('Fur', 0xe39a52, rough=.9), material('FurLight', 0xf6dfbf, rough=.9)
    stripe, pink = material('FurStripe', 0xb86a34, rough=.9), material('Pink', 0xe89a9a, rough=.7)
    dark, eye = material('Black', 0x2a2020, rough=.4), material('Eye', 0x9fd36a, rough=.2)
    shine = material('Shine', 0xffffff, emit=0xffffff, strength=1)
    root = empty('house-cat')
    body = sphere('body', .3, (0, .05, .48), fur, root, 18, 12)
    body.scale = (.85, 1.55, .85)
    chest = sphere('chest', .2, (0, -.3, .45), cream, root, 12, 10)
    chest.scale = (1, .8, 1.1)
    for k, y in enumerate((-.1, .12, .34)):
        band = sphere(f'stripe-{k}', .3, (0, y, .5), stripe, root, 14, 10)
        band.scale = (.87, .12, .87)
    for name, x, y in (('fl', -.15, -.3), ('fr', .15, -.3), ('bl', -.15, .38), ('br', .15, .38)):
        leg = empty(f'leg-{name}', root, (x, y, .42))
        cylinder(f'leg-{name}-bone', .07, .38, (0, 0, -.2), fur, leg, 10)
        paw = sphere(f'paw-{name}', .085, (0, -.03, -.4), cream, leg, 10, 8)
        paw.scale = (1, 1.3, .7)
    head = empty('head', root, (0, -.42, .7))
    sphere('skull', .22, (0, -.05, .1), fur, head, 18, 12).scale = (1.05, .95, .9)
    sphere('muzzle', .1, (0, -.24, .03), cream, head, 12, 8).scale = (1.3, .8, .7)
    sphere('nose', .03, (0, -.32, .08), pink, head, 8, 6)
    for s in (-1, 1):
        ear = lathe(f'ear-{s}', [(.09, 0), (0, .17)], 4, fur, head, smooth=False)
        ear.location = (s * .13, -.02, .26)
        ear.rotation_euler = (0, s * -.3, math.pi / 4)
        sphere(f'eye-{s}', .05, (s * .09, -.22, .14), eye, head, 10, 8)
        sphere(f'pupil-{s}', .028, (s * .09, -.265, .14), dark, head, 8, 6).scale = (.5, 1, 1.2)
        sphere(f'shine-{s}', .012, (s * .085 + .015, -.275, .16), shine, head, 6, 4)
        for k in range(3):
            cylinder(f'whisker-{s}-{k}', .006, .3, (s * .2, -.26, .02 + (k - 1) * .03), cream, head, 4, rotation=(0, math.pi / 2, s * (k - 1) * .2))
    tail = empty('tail', root, (0, .5, .55))
    for k in range(9):
        t = k / 8
        sphere(f'tail-{k}', .06 - t * .015, (0, .05 + t * .25, t * .55 + math.sin(t * 3) * .05), stripe if k % 3 == 1 else fur, tail, 8, 6)
    export('clockwork/house-cat.glb')


def build():
    mole()
    cuckoo_bird()
    house_cat()
