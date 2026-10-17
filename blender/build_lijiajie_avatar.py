import bpy
import math
from mathutils import Vector


OUTPUT = "D:/手势交互/sen-3d-resume/web/public/models/me.glb"


def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


clear_scene()


def make_material(name, color, roughness=0.55, metallic=0.0):
    material = bpy.data.materials.new(name)
    material.diffuse_color = (*color, 1.0)
    material.use_nodes = True
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    return material


SKIN = make_material("Warm skin", (0.79, 0.44, 0.31), 0.65)
SKIN_LIGHT = make_material("Skin highlight", (0.94, 0.59, 0.42), 0.65)
HAIR = make_material("Blue black hair", (0.018, 0.025, 0.055), 0.55)
HAIR_LIGHT = make_material("Hair highlight", (0.045, 0.069, 0.12), 0.55)
BLUE = make_material("Cobalt blue shirt", (0.035, 0.13, 0.68), 0.7)
BLUE_DARK = make_material("Shirt trim", (0.018, 0.045, 0.22), 0.68)
PANTS = make_material("Charcoal pants", (0.035, 0.045, 0.09), 0.62)
WHITE = make_material("Eye white", (0.98, 0.98, 1.0), 0.32)
BLACK = make_material("Pupil and glasses", (0.012, 0.018, 0.035), 0.38, 0.05)
MOUTH = make_material("Mouth", (0.22, 0.035, 0.045), 0.7)
TEETH = make_material("Teeth", (1.0, 0.92, 0.72), 0.32)
YELLOW = make_material("Anime sparkle", (1.0, 0.66, 0.04), 0.35, 0.05)
CYAN = make_material("Technology accent", (0.20, 0.80, 0.88), 0.38, 0.05)
PAPER = make_material("Notebook paper", (0.96, 0.95, 0.89), 0.6)
PAPER_LINE = make_material("Notebook graphite", (0.38, 0.40, 0.44), 0.72)
PENCIL = make_material("Yellow pencil", (0.95, 0.65, 0.08), 0.42, 0.02)


def parent_to(obj, parent):
    obj.parent = parent
    return obj


def smooth_mesh(obj):
    """Keep curved parts smooth after GLB export, including procedural primitives."""
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    return obj


def uv_sphere(name, location, scale, material, parent):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=40, ring_count=24, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    obj.data.materials.append(material)
    smooth_mesh(obj)
    parent_to(obj, parent)
    return obj


def cube(name, location, scale, material, parent, bevel=0.04):
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        modifier = obj.modifiers.new("soft edges", "BEVEL")
        modifier.width = bevel
        modifier.segments = 5
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=modifier.name)
        normal_modifier = obj.modifiers.new("weighted normals", "WEIGHTED_NORMAL")
        normal_modifier.keep_sharp = True
        bpy.ops.object.modifier_apply(modifier=normal_modifier.name)
    obj.data.materials.append(material)
    parent_to(obj, parent)
    return obj


def cylinder_between(name, start, end, radius, material, parent, vertices=32):
    start_v = Vector(start)
    end_v = Vector(end)
    direction = end_v - start_v
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices,
        radius=radius,
        depth=direction.length,
        location=(start_v + end_v) * 0.5,
    )
    obj = bpy.context.object
    obj.name = name
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = direction.to_track_quat("Z", "Y")
    obj.data.materials.append(material)
    smooth_mesh(obj)
    parent_to(obj, parent)
    return obj


def text_label(name, body, location, size, material, parent):
    bpy.ops.object.text_add(location=location, rotation=(math.pi / 2.0, 0.0, 0.0))
    obj = bpy.context.object
    obj.name = name
    obj.data.body = body
    obj.data.align_x = "CENTER"
    obj.data.align_y = "CENTER"
    obj.data.size = size
    obj.data.extrude = 0.002
    obj.data.bevel_depth = 0.001
    obj.data.materials.append(material)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target="MESH")
    parent_to(obj, parent)
    return obj


def cone(name, location, radius, depth, material, parent, rotation=(0.0, 0.0, 0.0)):
    bpy.ops.mesh.primitive_cone_add(vertices=32, radius1=radius, radius2=0.0, depth=depth, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.rotation_euler = rotation
    obj.data.materials.append(material)
    smooth_mesh(obj)
    parent_to(obj, parent)
    return obj


def torus(name, location, major, minor, material, parent):
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major,
        minor_radius=minor,
        major_segments=48,
        minor_segments=16,
        location=location,
        rotation=(math.pi / 2.0, 0.0, 0.0),
    )
    obj = bpy.context.object
    obj.name = name
    obj.scale = (1.22, 1.0, 1.0)
    obj.data.materials.append(material)
    smooth_mesh(obj)
    parent_to(obj, parent)
    return obj


def sparkle(name, location, parent):
    # Two crossed diamonds create a small readable anime sparkle in 3D.
    a = cone(name + ".vertical", location, 0.055, 0.22, YELLOW, parent)
    a.rotation_euler[1] = math.pi / 2.0
    b = cone(name + ".horizontal", location, 0.055, 0.22, YELLOW, parent)
    b.rotation_euler[0] = math.pi / 2.0


def add_avatar():
    root = bpy.data.objects.new("LijiajieAnimeAvatar", None)
    bpy.context.collection.objects.link(root)

    # Compact anime proportions: oversized head, blue tech shirt, dark pants.
    torso = uv_sphere("man", (0.0, 0.0, 0.02), (0.40, 0.26, 0.50), BLUE, root)
    torso.scale.y *= 0.85
    cylinder_between("shirt-seam.L", (-0.30, -0.235, 0.28), (-0.07, -0.275, 0.07), 0.012, BLUE_DARK, root, 16)
    cylinder_between("shirt-seam.R", (0.30, -0.235, 0.28), (0.07, -0.275, 0.07), 0.012, BLUE_DARK, root, 16)
    uv_sphere("shirt-neck", (0.0, -0.235, 0.42), (0.17, 0.04, 0.055), BLUE_DARK, root)
    cylinder_between("collar.L", (-0.17, -0.245, 0.44), (0.0, -0.278, 0.35), 0.018, CYAN, root, 12)
    cylinder_between("collar.R", (0.17, -0.245, 0.44), (0.0, -0.278, 0.35), 0.018, CYAN, root, 12)
    # A small circuit emblem reads clearly without relying on a texture or tiny text.
    uv_sphere("chest-emblem", (0.0, -0.27, 0.12), (0.115, 0.035, 0.115), BLUE_DARK, root)
    uv_sphere("chest-emblem-core", (0.0, -0.31, 0.12), (0.038, 0.015, 0.038), CYAN, root)
    for side in (-1, 1):
        cylinder_between("emblem-trace-%s" % side, (side * 0.035, -0.31, 0.12), (side * 0.09, -0.31, 0.18), 0.009, CYAN, root, 8)

    # Pants and shoes.
    cube("pants.L", (-0.19, 0.0, -0.62), (0.18, 0.22, 0.38), PANTS, root, 0.09)
    cube("pants.R", (0.19, 0.0, -0.62), (0.18, 0.22, 0.38), PANTS, root, 0.09)
    cube("shoe.L", (-0.19, -0.06, -1.02), (0.20, 0.28, 0.10), BLACK, root, 0.07)
    cube("shoe.R", (0.19, -0.06, -1.02), (0.20, 0.28, 0.10), BLACK, root, 0.07)
    cube("sole.L", (-0.19, -0.075, -1.125), (0.205, 0.29, 0.028), BLUE_DARK, root, 0.022)
    cube("sole.R", (0.19, -0.075, -1.125), (0.205, 0.29, 0.028), BLUE_DARK, root, 0.022)

    # Head, ears, hair cap and playful hair spikes.
    uv_sphere("head", (0.0, 0.0, 0.76), (0.38, 0.30, 0.40), SKIN, root)
    uv_sphere("ear.L", (-0.36, 0.0, 0.76), (0.062, 0.08, 0.095), SKIN, root)
    uv_sphere("ear.R", (0.36, 0.0, 0.76), (0.062, 0.08, 0.095), SKIN, root)
    uv_sphere("ear-inner.L", (-0.365, -0.064, 0.76), (0.028, 0.018, 0.046), SKIN_LIGHT, root)
    uv_sphere("ear-inner.R", (0.365, -0.064, 0.76), (0.028, 0.018, 0.046), SKIN_LIGHT, root)
    uv_sphere("hair-back", (0.0, 0.025, 1.055), (0.395, 0.295, 0.18), HAIR, root)
    for i, (x, z, width, tilt) in enumerate(
        [(-0.27, 1.02, 0.105, -0.22), (-0.13, 1.035, 0.13, -0.13), (0.035, 1.045, 0.14, 0.10), (0.20, 1.025, 0.12, 0.18), (0.30, 1.00, 0.075, 0.24)]
    ):
        strand = uv_sphere("hair-bang-%02d" % i, (x, -0.195, z), (width, 0.10, 0.105), HAIR_LIGHT if i == 2 else HAIR, root)
        strand.rotation_euler[1] = tilt
    uv_sphere("sideburn.L", (-0.34, -0.12, 0.92), (0.055, 0.09, 0.14), HAIR, root)
    uv_sphere("sideburn.R", (0.34, -0.12, 0.92), (0.055, 0.09, 0.14), HAIR, root)

    # Eyes are deliberately named with "eye" because the React scene uses that contract.
    left_eye = uv_sphere("eye.L", (-0.14, -0.286, 0.79), (0.076, 0.047, 0.087), WHITE, root)
    right_eye = uv_sphere("eye.R", (0.14, -0.286, 0.79), (0.076, 0.047, 0.087), WHITE, root)
    uv_sphere("pupil.L", (0.0, -1.42, 0.0), (0.40, 0.26, 0.48), BLACK, left_eye)
    uv_sphere("pupil.R", (0.0, -1.42, 0.0), (0.40, 0.26, 0.48), BLACK, right_eye)
    uv_sphere("cheek.L", (-0.22, -0.278, 0.64), (0.055, 0.012, 0.022), SKIN_LIGHT, root)
    uv_sphere("cheek.R", (0.22, -0.278, 0.64), (0.055, 0.012, 0.022), SKIN_LIGHT, root)
    cylinder_between("brow.L", (-0.22, -0.315, 0.90), (-0.07, -0.325, 0.92), 0.022, HAIR, root, 20)
    cylinder_between("brow.R", (0.07, -0.325, 0.92), (0.22, -0.315, 0.90), 0.022, HAIR, root, 20)

    # Oversized round glasses, bridge, and nose.
    torus("glasses-frame.L", (-0.14, -0.323, 0.79), 0.095, 0.009, BLACK, root)
    torus("glasses-frame.R", (0.14, -0.323, 0.79), 0.095, 0.009, BLACK, root)
    cube("glasses-bridge", (0.0, -0.323, 0.80), (0.055, 0.012, 0.009), BLACK, root, 0.008)
    cylinder_between("glasses-arm.L", (-0.23, -0.315, 0.80), (-0.37, -0.11, 0.82), 0.009, BLACK, root, 8)
    cylinder_between("glasses-arm.R", (0.23, -0.315, 0.80), (0.37, -0.11, 0.82), 0.009, BLACK, root, 8)
    uv_sphere("nose", (0.0, -0.313, 0.70), (0.028, 0.027, 0.037), SKIN_LIGHT, root)
    uv_sphere("mouth", (0.0, -0.302, 0.60), (0.085, 0.014, 0.031), MOUTH, root)
    uv_sphere("smile-teeth", (0.0, -0.319, 0.61), (0.054, 0.009, 0.01), TEETH, root)

    # Raised, friendly arms: one thumbs-up and one pointing gesture.
    cylinder_between("sleeve.L", (-0.34, 0.0, 0.27), (-0.56, -0.02, 0.41), 0.12, BLUE, root)
    cylinder_between("arm.L", (-0.56, -0.02, 0.41), (-0.68, -0.15, 0.68), 0.09, SKIN, root)
    uv_sphere("hand.L", (-0.69, -0.16, 0.72), (0.13, 0.11, 0.14), SKIN_LIGHT, root)
    cylinder_between("thumb.L", (-0.70, -0.18, 0.77), (-0.72, -0.20, 0.94), 0.055, SKIN_LIGHT, root, 12)

    cylinder_between("sleeve.R", (0.34, 0.0, 0.27), (0.56, -0.02, 0.43), 0.12, BLUE, root)
    cylinder_between("arm.R", (0.56, -0.02, 0.43), (0.71, -0.22, 0.68), 0.09, SKIN, root)
    uv_sphere("hand.R", (0.75, -0.26, 0.71), (0.13, 0.11, 0.14), SKIN_LIGHT, root)
    cylinder_between("index.R", (0.76, -0.29, 0.74), (0.96, -0.42, 0.79), 0.045, SKIN_LIGHT, root, 12)

    sparkle("anime-sparkle", (-0.47, -0.32, 0.94), root)

    return root


def add_seated_avatar():
    root = bpy.data.objects.new("LijiajieAnimeAvatar", None)
    bpy.context.collection.objects.link(root)

    # Seated anime proportions based on the supplied drawing: blue shirt, crossed legs, paper and pencil.
    torso = uv_sphere("man", (0.0, 0.0, 0.18), (0.43, 0.27, 0.48), BLUE, root)
    torso.rotation_euler[1] = math.radians(-3)
    cylinder_between("shirt-seam.L", (-0.30, -0.235, 0.30), (-0.08, -0.275, 0.08), 0.012, BLUE_DARK, root, 16)
    cylinder_between("shirt-seam.R", (0.30, -0.235, 0.30), (0.08, -0.275, 0.08), 0.012, BLUE_DARK, root, 16)
    uv_sphere("shirt-neck", (0.0, -0.235, 0.56), (0.17, 0.04, 0.055), BLUE_DARK, root)
    cylinder_between("collar.L", (-0.17, -0.245, 0.56), (0.0, -0.278, 0.46), 0.018, CYAN, root, 12)
    cylinder_between("collar.R", (0.17, -0.245, 0.56), (0.0, -0.278, 0.46), 0.018, CYAN, root, 12)
    text_label("shirt-print", "PANGOLU", (0.0, -0.286, 0.23), 0.11, WHITE, root)

    # Crossed, seated legs with soft trouser volumes and layered shoes.
    cylinder_between("pants.thigh.L", (-0.17, 0.02, -0.10), (-0.43, -0.02, -0.40), 0.20, PANTS, root, 32)
    cylinder_between("pants.shin.L", (-0.43, -0.02, -0.40), (0.19, -0.23, -0.70), 0.17, PANTS, root, 32)
    cylinder_between("pants.thigh.R", (0.17, 0.02, -0.10), (0.43, -0.02, -0.40), 0.20, PANTS, root, 32)
    cylinder_between("pants.shin.R", (0.43, -0.02, -0.40), (-0.19, -0.23, -0.70), 0.17, PANTS, root, 32)
    cube("shoe.L", (-0.20, -0.30, -0.72), (0.22, 0.30, 0.10), BLACK, root, 0.07)
    cube("shoe.R", (0.20, -0.30, -0.72), (0.22, 0.30, 0.10), BLACK, root, 0.07)
    cube("sole.L", (-0.20, -0.32, -0.83), (0.225, 0.31, 0.028), BLUE_DARK, root, 0.022)
    cube("sole.R", (0.20, -0.32, -0.83), (0.225, 0.31, 0.028), BLUE_DARK, root, 0.022)

    # Head, ears, thick black hair and loose bangs.
    uv_sphere("head", (0.0, 0.0, 0.94), (0.38, 0.30, 0.40), SKIN, root)
    uv_sphere("ear.L", (-0.36, 0.0, 0.94), (0.062, 0.08, 0.095), SKIN, root)
    uv_sphere("ear.R", (0.36, 0.0, 0.94), (0.062, 0.08, 0.095), SKIN, root)
    uv_sphere("ear-inner.L", (-0.365, -0.064, 0.94), (0.028, 0.018, 0.046), SKIN_LIGHT, root)
    uv_sphere("ear-inner.R", (0.365, -0.064, 0.94), (0.028, 0.018, 0.046), SKIN_LIGHT, root)
    uv_sphere("hair-back", (0.0, 0.025, 1.23), (0.40, 0.30, 0.19), HAIR, root)
    for i, (x, z, width, tilt) in enumerate(
        [(-0.30, 1.19, 0.10, -0.32), (-0.22, 1.24, 0.12, -0.24), (-0.11, 1.27, 0.14, -0.12), (0.02, 1.26, 0.14, 0.04), (0.15, 1.24, 0.13, 0.15), (0.27, 1.20, 0.10, 0.28)]
    ):
        strand = uv_sphere("hair-bang-%02d" % i, (x, -0.195, z), (width, 0.10, 0.12), HAIR_LIGHT if i in (2, 4) else HAIR, root)
        strand.rotation_euler[1] = tilt
    uv_sphere("sideburn.L", (-0.34, -0.12, 1.10), (0.055, 0.09, 0.14), HAIR, root)
    uv_sphere("sideburn.R", (0.34, -0.12, 1.10), (0.055, 0.09, 0.14), HAIR, root)

    # Eyes are deliberately named with "eye" because the React scene uses that contract.
    left_eye = uv_sphere("eye.L", (-0.14, -0.286, 0.97), (0.076, 0.047, 0.087), WHITE, root)
    right_eye = uv_sphere("eye.R", (0.14, -0.286, 0.97), (0.076, 0.047, 0.087), WHITE, root)
    uv_sphere("pupil.L", (0.0, -1.42, 0.0), (0.40, 0.26, 0.48), BLACK, left_eye)
    uv_sphere("pupil.R", (0.0, -1.42, 0.0), (0.40, 0.26, 0.48), BLACK, right_eye)
    uv_sphere("cheek.L", (-0.22, -0.278, 0.82), (0.055, 0.012, 0.022), SKIN_LIGHT, root)
    uv_sphere("cheek.R", (0.22, -0.278, 0.82), (0.055, 0.012, 0.022), SKIN_LIGHT, root)
    cylinder_between("brow.L", (-0.22, -0.315, 1.08), (-0.07, -0.325, 1.10), 0.022, HAIR, root, 20)
    cylinder_between("brow.R", (0.07, -0.325, 1.10), (0.22, -0.315, 1.08), 0.022, HAIR, root, 20)
    torus("glasses-frame.L", (-0.14, -0.323, 0.97), 0.095, 0.009, BLACK, root)
    torus("glasses-frame.R", (0.14, -0.323, 0.97), 0.095, 0.009, BLACK, root)
    cube("glasses-bridge", (0.0, -0.323, 0.98), (0.055, 0.012, 0.009), BLACK, root, 0.008)
    cylinder_between("glasses-arm.L", (-0.23, -0.315, 0.98), (-0.37, -0.11, 1.00), 0.009, BLACK, root, 8)
    cylinder_between("glasses-arm.R", (0.23, -0.315, 0.98), (0.37, -0.11, 1.00), 0.009, BLACK, root, 8)
    uv_sphere("nose", (0.0, -0.313, 0.88), (0.028, 0.027, 0.037), SKIN_LIGHT, root)
    uv_sphere("mouth", (0.0, -0.302, 0.78), (0.085, 0.014, 0.031), MOUTH, root)
    uv_sphere("smile-teeth", (0.0, -0.319, 0.79), (0.054, 0.009, 0.01), TEETH, root)

    # Arms rest on the notebook; the right hand holds a pencil.
    cylinder_between("sleeve.L", (-0.34, 0.0, 0.38), (-0.45, -0.13, 0.12), 0.12, BLUE, root)
    cylinder_between("arm.L", (-0.45, -0.13, 0.12), (-0.28, -0.36, -0.02), 0.085, SKIN, root)
    uv_sphere("hand.L", (-0.24, -0.39, -0.03), (0.12, 0.09, 0.10), SKIN_LIGHT, root)
    cylinder_between("sleeve.R", (0.34, 0.0, 0.38), (0.45, -0.13, 0.12), 0.12, BLUE, root)
    cylinder_between("arm.R", (0.45, -0.13, 0.12), (0.25, -0.39, 0.02), 0.085, SKIN, root)
    uv_sphere("hand.R", (0.22, -0.42, 0.02), (0.12, 0.09, 0.10), SKIN_LIGHT, root)

    paper = cube("notebook", (0.0, -0.39, -0.02), (0.32, 0.022, 0.22), PAPER, root, 0.018)
    paper.rotation_euler = (math.radians(-10), 0.0, math.radians(-4))
    for i, z in enumerate((0.07, 0.01, -0.05)):
        line = cube("notebook-line-%02d" % i, (-0.04, -0.425, z), (0.19 if i != 2 else 0.13, 0.005, 0.006), PAPER_LINE, root, 0.004)
        line.rotation_euler = paper.rotation_euler
    cylinder_between("pencil", (0.14, -0.48, 0.08), (0.47, -0.46, 0.24), 0.012, PENCIL, root, 16)
    cone("pencil-tip", (0.48, -0.465, 0.245), 0.018, 0.06, PAPER_LINE, root, rotation=(0.0, math.radians(68), 0.0))

    return root


def add_focus(name, location, root):
    empty = bpy.data.objects.new(name, None)
    empty.empty_display_type = "SPHERE"
    empty.empty_display_size = 0.06
    empty.location = location
    parent_to(empty, root)
    bpy.context.collection.objects.link(empty)
    return empty


def look_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


def add_camera(root):
    camera_data = bpy.data.cameras.new("Camera")
    camera = bpy.data.objects.new("Camera", camera_data)
    bpy.context.collection.objects.link(camera)
    parent_to(camera, root)
    camera.location = (0.0, -6.2, 0.18)
    camera_data.lens = 48.0
    camera_data.sensor_width = 36.0
    camera_data.clip_start = 0.01
    camera_data.clip_end = 100.0

    camera.animation_data_create()
    camera.animation_data.action = bpy.data.actions.new("CameraAction")
    keyframes = [
        (1, (0.0, -6.2, 0.16), (0.0, 0.0, 0.30)),
        (50, (0.05, -5.8, 0.26), (0.0, 0.0, 0.92)),
        (100, (-0.10, -5.9, 0.08), (0.0, 0.0, -0.42)),
        (150, (0.16, -5.8, 0.24), (0.0, 0.0, 1.05)),
        (200, (-0.16, -6.0, 0.10), (0.0, 0.0, 0.22)),
        (250, (0.0, -6.2, 0.22), (0.0, 0.0, 0.35)),
    ]
    for frame, location, target in keyframes:
        camera.location = location
        look_at(camera, target)
        camera.keyframe_insert(data_path="location", frame=frame)
        camera.keyframe_insert(data_path="rotation_euler", frame=frame)
    return camera


def configure_scene(root):
    focus_specs = [
        ("focus-0", (0.0, -0.29, 0.92)),
        ("focus-1", (0.0, -0.38, 0.04)),
        ("focus-2", (0.0, -0.24, -0.42)),
        ("focus-3", (0.0, -0.29, 1.12)),
        ("focus-4", (0.0, -0.28, 0.34)),
        ("focus-5", (0.0, -0.39, -0.04)),
        ("focus-works", (0.0, -0.28, 0.34)),
    ]
    for name, location in focus_specs:
        add_focus(name, location, root)
    camera = add_camera(root)
    bpy.context.scene.camera = camera
    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = 250
    bpy.context.scene.render.fps = 24
    if bpy.context.scene.world is None:
        bpy.context.scene.world = bpy.data.worlds.new("World")
    bpy.context.scene.world.color = (0.03, 0.04, 0.08)


def export_glb():
    bpy.ops.wm.save_as_mainfile(filepath="D:/手势交互/sen-3d-resume/blender/lijiajie-avatar.blend")
    bpy.ops.export_scene.gltf(
        filepath=OUTPUT,
        export_format="GLB",
        export_cameras=True,
        export_animations=True,
        export_animation_mode="ACTIONS",
        export_frame_range=True,
        export_nla_strips=False,
        export_apply=False,
    )


root = add_seated_avatar()
configure_scene(root)
export_glb()
