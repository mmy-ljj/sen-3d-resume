import bpy
from mathutils import Vector

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath="D:/手势交互/sen-3d-resume/web/public/models/me.glb")
scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 700
scene.render.resolution_y = 700
scene.render.resolution_percentage = 100
scene.render.film_transparent = False
if scene.world is None:
    scene.world = bpy.data.worlds.new("World")
scene.world.color = (0.025, 0.035, 0.08)
scene.camera = bpy.data.objects.get("Camera")
scene.frame_set(1)

def light(name, location, energy, size, color):
    data = bpy.data.lights.new(name, "AREA")
    data.energy = energy
    data.shape = "DISK"
    data.size = size
    data.color = color
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    obj.rotation_euler = (Vector((0.0, 0.0, 0.2)) - obj.location).to_track_quat("-Z", "Y").to_euler()

light("key", (3.0, -4.0, 4.0), 800, 4.0, (1.0, 0.78, 0.68))
light("fill", (-3.0, -3.0, 1.0), 500, 4.0, (0.55, 0.70, 1.0))
light("rim", (0.0, 2.0, 3.0), 900, 3.0, (0.45, 0.60, 1.0))

scene.render.filepath = "D:/手势交互/sen-3d-resume/blender/lijiajie-avatar-preview.png"
bpy.ops.render.render(write_still=True)
