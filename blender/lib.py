"""Shared helpers for the Mini Mayhem Blender asset scripts.

Every asset is built from code so it can be regenerated, reviewed in git and
opened in Blender for hand tuning. Units: 1 Blender unit = 1 metre = 1 game
unit. Blender is Z-up; the glTF exporter converts to the game's Y-up, so a
height in Blender's Z becomes the game's Y.
"""
import math
import os
import bpy
import bmesh
from mathutils import Vector, noise

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'assets', 'models')


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for block in (bpy.data.meshes, bpy.data.materials, bpy.data.objects):
        for item in list(block):
            block.remove(item)


def material(name, color, rough=.6, metal=0., emit=None, strength=1.5, alpha=1., double=False):
    """A Principled material that exports cleanly to glTF (colour in sRGB hex)."""
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes['Principled BSDF']
    rgb = srgb(color)
    bsdf.inputs['Base Color'].default_value = (*rgb, 1)
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Metallic'].default_value = metal
    if emit is not None:
        bsdf.inputs['Emission Color'].default_value = (*srgb(emit), 1)
        bsdf.inputs['Emission Strength'].default_value = strength
    mat.use_backface_culling = not double
    if alpha < 1:
        bsdf.inputs['Alpha'].default_value = alpha
        mat.blend_method = 'BLEND' if hasattr(mat, 'blend_method') else None
    return mat


def srgb(hex_color):
    def channel(c):
        c /= 255
        return c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4
    return tuple(channel((hex_color >> s) & 255) for s in (16, 8, 0))


def link(obj, parent=None):
    bpy.context.scene.collection.objects.link(obj)
    if parent is not None:
        obj.parent = parent
    return obj


def mesh_object(name, bm, mat=None, parent=None, smooth=False):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    obj = bpy.data.objects.new(name, me)
    if mat is not None:
        if isinstance(mat, (list, tuple)):
            for m in mat:
                me.materials.append(m)
        else:
            me.materials.append(mat)
    for poly in me.polygons:
        poly.use_smooth = smooth
    return link(obj, parent)


def empty(name, parent=None, location=(0, 0, 0)):
    obj = bpy.data.objects.new(name, None)
    obj.location = location
    return link(obj, parent)


def bevel(obj, width=.03, segments=2, angle=40):
    mod = obj.modifiers.new('bevel', 'BEVEL')
    mod.width = width
    mod.segments = segments
    mod.limit_method = 'ANGLE'
    mod.angle_limit = math.radians(angle)
    mod.harden_normals = False
    return obj


def subdivide(obj, levels=1):
    mod = obj.modifiers.new('subsurf', 'SUBSURF')
    mod.levels = levels
    mod.render_levels = levels
    return obj


def weighted_normals(obj):
    if bpy.app.version < (4, 1, 0):
        obj.data.use_auto_smooth = True
    mod = obj.modifiers.new('weighted', 'WEIGHTED_NORMAL')
    mod.keep_sharp = True
    return obj


def lathe(name, profile, segments=32, mat=None, parent=None, smooth=True, cap=True):
    """Spin a (radius, height) profile around Z."""
    bm = bmesh.new()
    rings = []
    for i in range(segments):
        a = i / segments * math.tau
        rings.append([bm.verts.new((r * math.cos(a), r * math.sin(a), h)) for r, h in profile])
    for i in range(segments):
        a, b = rings[i], rings[(i + 1) % segments]
        for j in range(len(profile) - 1):
            if profile[j][0] == 0 and profile[j + 1][0] == 0:
                continue
            verts = [a[j], b[j], b[j + 1], a[j + 1]]
            unique = list(dict.fromkeys(verts))
            if len(unique) >= 3:
                try:
                    bm.faces.new(unique)
                except ValueError:
                    pass
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    if cap and profile[0][0] > 0:
        edges = [e for e in bm.edges if e.is_boundary and all(abs(v.co.z - profile[0][1]) < 1e-6 for v in e.verts)]
        if edges:
            bmesh.ops.edgeloop_fill(bm, edges=edges)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return mesh_object(name, bm, mat, parent, smooth)


def box(name, size, location=(0, 0, 0), mat=None, parent=None, bevel_width=0):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1)
    for v in bm.verts:
        v.co = Vector((v.co.x * size[0] + location[0], v.co.y * size[1] + location[1], v.co.z * size[2] + location[2]))
    obj = mesh_object(name, bm, mat, parent)
    if bevel_width:
        bevel(obj, bevel_width, 2)
    return obj


def cylinder(name, radius, depth, location=(0, 0, 0), mat=None, parent=None, segments=24, smooth=True, rotation=None):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=segments, radius1=radius, radius2=radius, depth=depth)
    obj = mesh_object(name, bm, mat, parent, smooth)
    obj.location = location
    if rotation:
        obj.rotation_euler = rotation
    return obj


def sphere(name, radius, location=(0, 0, 0), mat=None, parent=None, segments=16, rings=10, smooth=True):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=segments, v_segments=rings, radius=radius)
    obj = mesh_object(name, bm, mat, parent, smooth)
    obj.location = location
    return obj


def torus(name, major, minor, location=(0, 0, 0), mat=None, parent=None, segments=32, sides=8, rotation=None):
    bm = bmesh.new()
    rings = []
    for i in range(segments):
        a = i / segments * math.tau
        ring = []
        for j in range(sides):
            b = j / sides * math.tau
            r = major + minor * math.cos(b)
            ring.append(bm.verts.new((r * math.cos(a), r * math.sin(a), minor * math.sin(b))))
        rings.append(ring)
    for i in range(segments):
        for j in range(sides):
            a, b = rings[i], rings[(i + 1) % segments]
            bm.faces.new((a[j], b[j], b[(j + 1) % sides], a[(j + 1) % sides]))
    obj = mesh_object(name, bm, mat, parent, True)
    obj.location = location
    if rotation:
        obj.rotation_euler = rotation
    return obj


def rock(name, radius, seed, mat, parent=None, detail=3, roughness=.22, craters=4):
    """A faceted asteroid: displaced icosphere with a few bowl-shaped craters."""
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=detail, radius=radius)
    offset = Vector((seed * 1.7, seed * 2.3, seed * .9))
    centres = []
    for k in range(craters):
        v = noise.random_unit_vector() if hasattr(noise, 'random_unit_vector') else None
        a, b = (seed * 7.1 + k * 2.39) % math.tau, math.acos(1 - 2 * (((seed * .37 + k * .618) % 1)))
        centres.append((Vector((math.sin(b) * math.cos(a), math.sin(b) * math.sin(a), math.cos(b))), .22 + (k % 3) * .08))
    for v in bm.verts:
        n = v.co.normalized()
        d = noise.fractal(n * 1.6 + offset, 1.0, 2.0, 4) * roughness
        for c, size in centres:
            t = (n - c).length / size
            if t < 1:
                d -= .16 * (1 - t * t)
            elif t < 1.35:
                d += .05 * (1 - (t - 1) / .35)
        v.co = n * radius * (1 + d)
    return mesh_object(name, bm, mat, parent, False)


def join_meshes(name):
    """Join every mesh into one object (one draw call per material in the game).
    Modifiers are applied first; the empty root is removed."""
    depsgraph = bpy.context.evaluated_depsgraph_get()
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    for o in meshes:
        world = o.matrix_world.copy()
        evaluated = o.evaluated_get(depsgraph)
        data = bpy.data.meshes.new_from_object(evaluated)
        o.modifiers.clear()
        o.data = data
        o.parent = None
        o.matrix_world = world
    if len(meshes) > 1:
        with bpy.context.temp_override(active_object=meshes[0], selected_editable_objects=meshes, object=meshes[0]):
            bpy.ops.object.join()
    joined = meshes[0]
    joined.name = name
    for o in list(bpy.context.scene.objects):
        if o.type == 'EMPTY':
            bpy.data.objects.remove(o)
    return joined


def join_parts(owner, name, exclude=()):
    """Join the meshes under `owner` into one child mesh called `name`, leaving
    the subtrees of the objects named in `exclude` (the moving parts) alone."""
    depsgraph = bpy.context.evaluated_depsgraph_get()

    def under(o):
        while o is not None:
            if o.name in exclude:
                return False
            if o.parent is owner or o is owner:
                return o is not owner
            o = o.parent
        return False
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH' and under(o)]
    if not meshes:
        return None
    for o in meshes:
        world = o.matrix_world.copy()
        data = bpy.data.meshes.new_from_object(o.evaluated_get(depsgraph))
        o.modifiers.clear()
        o.data = data
        o.matrix_world = world
    # Keep anything the joined meshes carried (other than meshes being joined) on the owner.
    for o in bpy.context.scene.objects:
        if o.parent in meshes and o not in meshes:
            world = o.matrix_world.copy()
            o.parent = owner
            o.matrix_world = world
    if len(meshes) > 1:
        with bpy.context.temp_override(active_object=meshes[0], selected_editable_objects=meshes, object=meshes[0]):
            bpy.ops.object.join()
    joined = meshes[0]
    world = joined.matrix_world.copy()
    joined.parent = owner
    joined.matrix_world = world
    joined.name = name
    return joined


def export(path, selection=None, join=None):
    if join:
        join_meshes(join)
    full = os.path.join(OUT, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    for obj in bpy.context.scene.objects:
        obj.select_set(selection is None or obj in selection)
    import logging
    logging.disable(logging.INFO)
    bpy.ops.export_scene.gltf(
        filepath=full, export_format='GLB', use_selection=selection is not None,
        export_apply=True, export_yup=True, export_texcoords=False, export_normals=True,
        export_materials='EXPORT', export_extras=False, export_cameras=False, export_lights=False,
    )
    depsgraph = bpy.context.evaluated_depsgraph_get()
    tris = 0
    for o in bpy.context.scene.objects:
        if o.type == 'MESH' and (selection is None or o in selection):
            me = o.evaluated_get(depsgraph).to_mesh()
            tris += sum(len(p.vertices) - 2 for p in me.polygons)
            o.evaluated_get(depsgraph).to_mesh_clear()
    print(f'  {path}: {os.path.getsize(full) // 1024} kB, ~{tris} triangles')


def save_blend(path):
    full = os.path.join(ROOT, 'blender', 'blend', path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=full, compress=True)
