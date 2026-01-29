// ==========================================
// CONFIGURATION
// ==========================================
$fn = 100;

// --- Dimensions ---
bauble_radius = 40;
wall_thickness = 2;
opening_radius = 28;

// --- Viewhole Rim ---
enable_rim = false; 
rim_thickness = 3; 

// --- Layout Mode ---
// Options: 
// "LINEAR"          - Left to Right (Supports 3 or 4 chars)
// "VERTICAL_LINEAR" - Top to Bottom (Supports 3 or 4 chars)
// "GRID_2x2"        - 4 Characters in a square
layout_mode = "GRID_2x2"; 

// --- Text Content ---
// GRID MAPPING: 1=TopLeft, 2=TopRight, 3=BotLeft, 4=BotRight
// LINEAR MAPPING: 1, 2, 3, 4 (Left to Right, or Top to Bottom)
// NOTE: If char_4 is empty (""), Linear/Vertical modes will center just the first 3.
char_1 = "N";
char_2 = "O";
char_3 = "E";
char_4 = "L"; 

// --- Text Styling ---
font_size = 30;         
font_style = "Poppins:style=Bold"; 
char_spacing = 25;      // Horizontal spacing
line_spacing = 25;      // Vertical spacing (for Grid and Vertical modes)

// --- Text Rotation / Tilt ---
// Adjusts the angle of the text. 
// 0 = Straight Up. Positive leans forward, Negative leans back.
text_tilt_x = 0; 

// Text Depth
depth_main = 8;      // Thickness for chars 1, 3, 4
depth_secondary = 8; // Thickness for char 2

// --- Offsets (Up/Down Position) ---
// Adjust these to center your text depending on the mode chosen
linear_height_offset = 10;   
vertical_height_offset = 25;
grid_height_offset = 26; 

// ==========================================
// GLOBAL FEATURES
// ==========================================
hook_height_offset = 0; 
loop_radius = 4;
loop_thickness = 1.5;

// Background Tree
enable_tree = false;        
tree_thickness = 3;        
tree_distance = 6;        
tree_scale = 1.2;          
tree_height_offset = 0;    

// ==========================================
// MODULES
// ==========================================

module tree_shape_2d() {
    translate([0, tree_height_offset]) scale([tree_scale, tree_scale]) {
        translate([0, 25]) polygon(points=[[-10, 0], [10, 0], [0, 15]]); 
        translate([0, 15]) polygon(points=[[-14, 0], [14, 0], [0, 15]]); 
        translate([0, 5])  polygon(points=[[-18, 0], [18, 0], [0, 15]]); 
        translate([-4, -2]) square([8, 8]); 
    }
}

// Helper module to render a single character
module render_char(c, d) {
    color("Red")
    linear_extrude(d, center=true)
        text(c, size = font_size, font = font_style, halign = "center", valign = "center");
}

// ==========================================
// MAIN RENDER
// ==========================================

union() {
    
    // 1. The Main Shell & Rim (With Lip Fix)
    difference() {
        // A. Combine the Shell and the Rim first
        union() {
            // The Basic Shell
            difference() {
                sphere(r = bauble_radius);
                sphere(r = bauble_radius - wall_thickness);
                
                // Cut the window
                rotate([90, 0, 0])
                    cylinder(h = bauble_radius * 3, r = opening_radius, center = true);
                
                // Flatten bottom
                translate([0, 0, -bauble_radius])
                    cube([bauble_radius*2, bauble_radius*2, 2], center=true);
            }

            // The Rim (Bezel)
            if (enable_rim) {
                intersection() {
                    rotate([90, 0, 0])
                    translate([0, 0, bauble_radius - (bauble_radius/3)]) 
                        difference() {
                            cylinder(r = opening_radius + (rim_thickness/2), h = bauble_radius, center=true);
                            cylinder(r = opening_radius - (rim_thickness/2), h = bauble_radius+1, center=true);
                        }
                    sphere(r = bauble_radius + 0.5); 
                }
            }
        }

        // B. THE CLEANUP CUT
        // Shaves off any internal protrusions from the rim
        sphere(r = bauble_radius - wall_thickness);
        
        // Ensure opening remains clear
        rotate([90, 0, 0])
             cylinder(h = bauble_radius * 3, r = opening_radius - (enable_rim ? (rim_thickness/2) : 0), center = true);
    }

    // 2. The Internal Floor (Standard Only)
    color("DodgerBlue")
    intersection() {
        sphere(r = bauble_radius - 0.1); 
        translate([0, 0, -bauble_radius + 10]) 
            cube([bauble_radius * 1.8, bauble_radius * 1.8, 2], center = true);
    }

    // 3. The Content
    intersection() {
        sphere(r = bauble_radius); // Clip to sphere
        
        union() {
            
            // --- DETERMINE HEIGHT OFFSET ---
            translate([0, 0, -bauble_radius + 11 + 
                (layout_mode == "GRID_2x2" ? grid_height_offset : 
                (layout_mode == "VERTICAL_LINEAR" ? vertical_height_offset : linear_height_offset))
            ]) 
            
            // --- APPLY ROTATION & TILT ---
            rotate([90 + text_tilt_x, 0, 0]) 
            
            union() {
                
                // === A. GRID 2x2 MODE ===
                if (layout_mode == "GRID_2x2") {
                    translate([-char_spacing/2, line_spacing/2, 0]) render_char(char_1, depth_main);
                    translate([char_spacing/2, line_spacing/2, 0])  render_char(char_2, depth_secondary);
                    translate([-char_spacing/2, -line_spacing/2, 0]) render_char(char_3, depth_main);
                    translate([char_spacing/2, -line_spacing/2, 0])  render_char(char_4, depth_main);
                } 
                
                // === B. LINEAR MODE (Left to Right) ===
                else if (layout_mode == "LINEAR") {
                    if (char_4 == "") {
                         translate([-char_spacing, 0, 0]) render_char(char_1, depth_main);
                         translate([0, 0, 0])             render_char(char_2, depth_secondary);
                         translate([char_spacing, 0, 0])  render_char(char_3, depth_main);
                    } else {
                         translate([-char_spacing * 1.5, 0, 0]) render_char(char_1, depth_main);
                         translate([-char_spacing * 0.5, 0, 0]) render_char(char_2, depth_secondary);
                         translate([char_spacing * 0.5, 0, 0])  render_char(char_3, depth_main);
                         translate([char_spacing * 1.5, 0, 0])  render_char(char_4, depth_main);
                    }
                }
                
                // === C. VERTICAL MODE (Top to Bottom) ===
                else if (layout_mode == "VERTICAL_LINEAR") {
                    if (char_4 == "") {
                         translate([0, line_spacing, 0])  render_char(char_1, depth_main);
                         translate([0, 0, 0])             render_char(char_2, depth_secondary);
                         translate([0, -line_spacing, 0]) render_char(char_3, depth_main);
                    } else {
                         translate([0, line_spacing * 1.5, 0])  render_char(char_1, depth_main);
                         translate([0, line_spacing * 0.5, 0])  render_char(char_2, depth_secondary);
                         translate([0, -line_spacing * 0.5, 0]) render_char(char_3, depth_main);
                         translate([0, -line_spacing * 1.5, 0]) render_char(char_4, depth_main);
                    }
                }

                // === TREE BACKGROUND ===
                if (enable_tree) {
                    translate([0, 0, -tree_distance])
                        color("ForestGreen")
                        linear_extrude(tree_thickness, center=true)
                            tree_shape_2d();
                }
            }
        }
    }

    // 4. The Hanging Loop
    translate([0, 0, bauble_radius + hook_height_offset])
        rotate([90, 0, 0])
            rotate_extrude()
                translate([loop_radius, 0, 0])
                    circle(r = loop_thickness);
}