import trimesh
import sys
import os

def convert_3mf_to_glb(input_path, output_path):
    try:
        # Load the 3mf file
        # trimesh uses lxml to parse 3mf
        scene = trimesh.load(input_path, file_type='3mf')
        
        # Export as glb
        # trimesh.Scene.export returns the bytes of the file
        glb_data = scene.export(file_type='glb')
        
        with open(output_path, 'wb') as f:
            f.write(glb_data)
            
        print(f"Successfully converted {input_path} to {output_path}")
    except Exception as e:
        print(f"Error during conversion: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 convert_3mf.py <input.3mf> <output.glb>")
        sys.exit(1)
    
    convert_3mf_to_glb(sys.argv[1], sys.argv[2])
