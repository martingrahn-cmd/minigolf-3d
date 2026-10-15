"""Assets shared by every world: the flag pin and the cup."""
import math
import bmesh
from mathutils import Vector
from lib import material, mesh_object, empty, cylinder, torus, lathe, sphere, export, reset

CREAM = 0xfbf3e6


def flag():
    """Cup, rim and a pin flag with a gentle wave. Origin = cup centre on the felt.
    The cloth uses the material 'Flag' so the game can tint it per world."""
    reset()
    root = empty('flag-pin')
    cream = material('Cream', CREAM, rough=.35, metal=.1)
    dark = material('CupDark', 0x0b1a26, rough=.9)
    pole_mat = material('Pole', 0xf4efe6, rough=.25, metal=.35)
    cloth = material('Flag', 0xed6655, rough=.7, double=True)
    # The cup: a dark liner below the felt and a rolled cream rim at the old height.
    lathe('cup-liner', [(.35, -.32), (.36, .02), (.47, .05), (.49, .06)], 40, dark, root, smooth=True, cap=True)
    torus('cup-rim', .47, .055, (0, 0, .085), cream, root, segments=48, sides=10)
    # The pole: slim, with a ferrule at the bottom and a ball on top.
    cylinder('pole', .032, 2.7, (0, 0, 1.38), pole_mat, root, segments=16)
    cylinder('ferrule', .05, .14, (0, 0, .12), cream, root, segments=16)
    sphere('pole-top', .065, (0, 0, 2.76), cream, root, 16, 10)
    # A waving pennant: a subdivided triangle bent with a travelling sine.
    bm = bmesh.new()
    cols, rows = 14, 6
    grid = []
    for i in range(cols + 1):
        u = i / cols
        col = []
        half = .3 * (1 - u)
        for j in range(rows + 1):
            v = (j / rows - .5) * 2
            x, z = u * .95, .3 + v * half
            y = math.sin(u * 4.2) * .09 * u
            col.append(bm.verts.new((x + .03, -y, 2.32 + z)))
        grid.append(col)
    for i in range(cols):
        for j in range(rows):
            quad = [grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]]
            if len({id(v) for v in quad}) == 4 and (grid[i][j].co - grid[i][j + 1].co).length > 1e-4:
                bm.faces.new(quad)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
    flag_obj = mesh_object('flag', bm, cloth, root, smooth=True)
    flag_obj.rotation_euler = (0, 0, math.radians(20))
    export('common/flag.glb')  # parts stay separate: the game tints 'Flag'


def build():
    flag()
