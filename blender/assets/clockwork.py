"""Urverkets stad kit: gears, the brass lantern and the cuckoo-clock house shell.
Gears are normalised to radius 1 and depth 1 (the game scales them by r and by
the depth along the axle), one file per tooth count. The game's gear lies in its
x-y plane with the axle along z, which is Blender's x-z plane, axle along y."""
import math
import bmesh
import bpy
from mathutils import Vector
from lib import (material, mesh_object, empty, lathe, sphere, cylinder, torus, box, bevel,
                 export, reset, join_meshes)

BRASS, GOLD, COPPER, IRON, WOOD, WOOD_LIGHT, TEAL, DARK, GLOW = (
    0xc99a4c, 0xf0ca7e, 0x986342, 0x263d40, 0x51352e, 0x86533c, 0x356966, 0x242c2d, 0xffd78b)
TEETH = (12, 16, 18, 20, 24, 25, 28, 32, 34, 36, 44, 48)


def curve_shape(name, loops, depth, mat, bevel_depth=.02):
    """A flat curve object from closed polygons (holes by even-odd), extruded."""
    cu = bpy.data.curves.new(name, 'CURVE')
    cu.dimensions = '2D'
    cu.fill_mode = 'BOTH'
    cu.extrude = depth / 2 - bevel_depth
    cu.bevel_depth = bevel_depth
    cu.bevel_resolution = 1
    for loop in loops:
        sp = cu.splines.new('POLY')
        sp.points.add(len(loop) - 1)
        for p, (x, y) in zip(sp.points, loop):
            p.co = (x, y, 0, 1)
        sp.use_cyclic_u = True
    obj = bpy.data.objects.new(name, cu)
    bpy.context.scene.collection.objects.link(obj)
    cu.materials.append(mat)
    # Curve XY -> Blender XZ (the game's x-y), thickness along Blender y (game z).
    obj.rotation_euler = (math.pi / 2, 0, 0)
    bpy.context.view_layer.objects.active = obj
    with bpy.context.temp_override(active_object=obj, selected_editable_objects=[obj], object=obj):
        bpy.ops.object.convert(target='MESH')
    return bpy.context.scene.objects[name]


def arc(r, a0, a1, steps):
    return [(math.cos(a0 + (a1 - a0) * i / steps) * r, math.sin(a0 + (a1 - a0) * i / steps) * r) for i in range(steps + 1)]


def gear(teeth):
    reset()
    brass, gold, copper = material('Brass', BRASS, rough=.3, metal=.8), material('Gold', GOLD, rough=.28, metal=.75), material('Copper', COPPER, rough=.4, metal=.6)
    pitch = math.tau / teeth
    outline = []
    for i in range(teeth):
        a = i * pitch
        for da, r in ((-.5, .86), (-.3, .87), (-.17, 1.0), (.17, 1.0), (.3, .87)):
            outline.append((math.cos(a + da * pitch) * r, math.sin(a + da * pitch) * r))
    spokes = 6 if teeth >= 20 else 5
    loops = [outline]
    for k in range(spokes):
        a0, a1 = k * math.tau / spokes, (k + 1) * math.tau / spokes
        w_in, w_out = .2 / .34, .11 / .7  # spoke half-width as an angle at each radius
        window = arc(.7, a0 + w_out, a1 - w_out, 10) + list(reversed(arc(.34, a0 + w_in, a1 - w_in, 6)))
        loops.append(window)
    curve_shape('gear-wheel', loops, 1.0, brass, .025)
    # Raised rim, hub boss and bolts.
    torus('rim-front', .78, .035, (0, -.5, 0), gold, None, 64, 6, rotation=(math.pi / 2, 0, 0))
    torus('rim-back', .78, .035, (0, .5, 0), gold, None, 64, 6, rotation=(math.pi / 2, 0, 0))
    cylinder('hub', .3, 1.2, (0, 0, 0), brass, None, 32, rotation=(math.pi / 2, 0, 0))
    cylinder('axle', .15, 1.45, (0, 0, 0), copper, None, 24, rotation=(math.pi / 2, 0, 0))
    for k in range(6):
        a = k * math.tau / 6 + .26
        cylinder(f'bolt-{k}', .04, 1.28, (math.cos(a) * .23, 0, math.sin(a) * .23), gold, None, 6, rotation=(math.pi / 2, 0, 0))
    export(f'clockwork/gear-{teeth}.glb', join='gear')


def lantern():
    """Brass street lantern; post 1.5 m, glass centre at 1.7 m, cap to 2.3 m."""
    reset()
    root = empty('clock-lantern')
    iron, brass, gold = material('Iron', IRON, rough=.45, metal=.6), material('Brass', BRASS, rough=.3, metal=.8), material('Gold', GOLD, rough=.28, metal=.75)
    glass = material('LampGlow', GLOW, rough=.25, emit=0xffba58, strength=2.2)
    lathe('base', [(.26, 0), (.24, .06), (.14, .14), (.1, .3), (.08, .4)], 16, iron, root)
    lathe('post', [(.07, .38), (.06, .9), (.08, .95), (.06, 1.0), (.065, 1.42)], 16, iron, root, cap=False)
    torus('collar', .1, .03, (0, 0, .95), brass, root, 16, 6)
    lathe('cup', [(.08, 1.38), (.22, 1.43), (.24, 1.46)], 16, brass, root, cap=False)
    lathe('glass', [(.17, 1.44), (.21, 1.6), (.22, 1.75), (.2, 1.96)], 6, glass, root, smooth=False)
    for i in range(6):
        a = i * math.tau / 6
        cylinder(f'frame-{i}', .018, .56, (math.cos(a) * .215, math.sin(a) * .215, 1.7), gold, root, 6)
    lathe('roof', [(.32, 1.98), (.3, 2.03), (.16, 2.16), (.06, 2.26), (0, 2.28)], 6, brass, root, smooth=False)
    sphere('finial', .05, (0, 0, 2.31), gold, root, 10, 6)
    torus('hanger', .06, .012, (0, 0, 2.38), gold, root, 16, 6, rotation=(math.pi / 2, 0, 0))
    export('clockwork/lantern.glb', join='clock-lantern')


def cuckoo_house():
    """The fixed shell of the cuckoo-clock house, in the house's local frame
    (game units before its scale): body 5.4 x 9.8 x 2.5 m centred at y 3.9,
    front at z 1.3, clock face centre (0, 4.2, 1.48) radius 2, bird door at
    (0, 7.63) 1.35 x 1.6 m, pendulum window at (0, 0) 1.8 x 3.1 m. The hands,
    doors, bird and pendulum are separate objects in the game."""
    reset()
    root = empty('cuckoo-house')
    wood, light, teal = material('Wood', WOOD, rough=.7), material('WoodLight', WOOD_LIGHT, rough=.6), material('Roof', TEAL, rough=.55)
    brass, gold, copper, dark = (material('Brass', BRASS, rough=.3, metal=.8), material('Gold', GOLD, rough=.28, metal=.75),
                                 material('Copper', COPPER, rough=.4, metal=.6), material('Shadow', DARK, rough=.9))
    g = lambda x, y, z: (x, -z, y)  # game -> Blender
    def gbox(name, size, centre, mat, bw=.04):
        return box(name, (size[0], size[2], size[1]), g(*centre), mat, root, bw)
    gbox('body', (5.4, 9.8, 2.5), (0, 3.9, 0), wood, .08)
    gbox('front', (4.8, 8.9, .13), (0, 4, 1.3), light, .03)
    gbox('plinth', (5.9, .5, 2.9), (0, -.85, 0), wood, .06)
    gbox('cornice', (5.8, .3, 2.8), (0, 8.75, 0), light, .05)
    for side in (-1, 1):
        gbox(f'pilaster-{side}', (.32, 9.0, .22), (side * 2.35, 4, 1.47), brass, .03)
        for y in (0, 2.7, 6.3, 8.2):
            gbox(f'capital-{side}-{y}', (.48, .16, .26), (side * 2.35, y, 1.5), gold, .02)
        # Roof slab with rows of shingles, built in the slab's own frame:
        # u runs down the slope, v along the ridge, w out of the roof.
        pivot = empty(f'roof-pivot-{side}', root, g(side * 1.62, 9.5, 0))
        pivot.rotation_euler = (0, side * .6, 0)
        box(f'roof-{side}', (4.3, 4.3, .3), (0, 0, 0), teal, pivot, .03)
        for row in range(6):
            for col in range(7):
                u = side * (-1.85 + row * .72)
                v = -1.86 + col * .62 + (row % 2) * .31
                if abs(v) > 2.1:
                    continue
                tile = box(f'shingle-{side}-{row}-{col}', (.6, .56, .09), (u, v, .19 + row * .012), teal if (row + col) % 2 else copper, pivot)
                tile.rotation_euler = (0, -side * .08, 0)
        # Carved bargeboard along the roof edge.
        for k in range(8):
            u = .3 + k * .44
            sphere(f'scallop-{side}-{k}', .14, g(side * u, 10.55 - u * .68 - .18, 2.2), light, root, 10, 6).scale = (1, .5, 1)
    sphere('ridge-finial', .22, g(0, 10.95, 2.1), gold, root, 12, 8)
    # Arched frames around the clock face and the bird door; recesses in shadow.
    torus('dial-frame', 2.12, .1, g(0, 4.2, 1.42), light, root, 64, 8, rotation=(math.pi / 2, 0, 0))
    torus('dial-trim', 2.25, .04, g(0, 4.2, 1.42), gold, root, 64, 6, rotation=(math.pi / 2, 0, 0))
    gbox('door-recess', (1.35, 1.6, .16), (0, 7.63, 1.43), dark, .0)
    gbox('door-arch', (1.7, .18, .2), (0, 8.55, 1.48), light, .04)
    for side in (-1, 1):
        gbox(f'door-post-{side}', (.16, 1.8, .2), (side * .82, 7.63, 1.48), light, .03)
    gbox('pendulum-window', (1.8, 3.1, .12), (0, 0, 1.38), dark, .0)
    gbox('window-frame-top', (2.1, .16, .2), (0, 1.62, 1.46), light, .03)
    gbox('window-frame-bottom', (2.1, .16, .2), (0, -1.62, 1.46), light, .03)
    # Carved leaves on the cornice.
    for k in range(9):
        sphere(f'carving-{k}', .16, g(-2 + k * .5, 9.0, 1.4), light, root, 8, 6).scale = (1, .5, .6)
    export('clockwork/cuckoo-house.glb', join='cuckoo-house')


def build():
    for t in TEETH:
        gear(t)
    lantern()
    cuckoo_house()
