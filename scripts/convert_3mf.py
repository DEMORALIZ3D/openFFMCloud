import trimesh
import sys
import os
import subprocess
import shutil

def convert_3mf_to_glb(input_path, output_path):
    temp_obj = input_path + ".temp.obj"
    temp_mtl = input_path + ".temp.mtl"
    
    try:
        # 1. Use OpenSCAD to convert 3MF to OBJ (OpenSCAD's 3MF parser is very good with colors)
        # OpenSCAD will output materials to a .mtl file automatically
        print(f"Step 1: OpenSCAD conversion to OBJ...")
        cmd = [
            "openscad",
            "-o", temp_obj,
            input_path
        ]
        # Run with a timeout and capture output
        process = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        
        if process.returncode != 0:
            print(f"OpenSCAD Error: {process.stderr}", file=sys.stderr)
            # Fallback: Try loading directly with trimesh if OpenSCAD fails
            scene = trimesh.load(input_path, file_type='3mf')
        else:
            # 2. Load the OBJ with Trimesh (it will automatically pick up the MTL)
            print(f"Step 2: Trimesh OBJ to GLB...")
            scene = trimesh.load(temp_obj)

        # 3. Export as GLB
        glb_data = scene.export(file_type='glb')
        
        with open(output_path, 'wb') as f:
            f.write(glb_data)
            
        print(f"Successfully converted {input_path} to {output_path}")
        
    except Exception as e:
        print(f"Error during conversion: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        # Cleanup temp files
        if os.path.exists(temp_obj):
            os.remove(temp_obj)
        if os.path.exists(temp_mtl):
            os.remove(temp_mtl)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 convert_3mf.py <input.3mf> <output.glb>")
        sys.exit(1)
    
    convert_3mf_to_glb(sys.argv[1], sys.argv[2])