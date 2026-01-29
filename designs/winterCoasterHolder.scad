// ==========================================
//      WINTER COASTER HOLDER V3 (WRAP-AROUND)
// ==========================================

// --- Dimensions (Must match your Coasters) ---
coaster_diameter = 100; // The size of the coasters you generated
coaster_thickness = 4;  // Thickness of one coaster
coaster_count = 6;      // How many to hold

// --- Holder Settings ---
wall_thickness = 2.4;
base_thickness = 2.0;
tolerance = 1.5; // Extra wiggle room so coasters don't get stuck

// Width of the finger slot in mm
slot_width = 35; 

/* [Render Settings] */
$fn = 80; // High resolution for smooth walls

// ==========================================
//              LOGIC
// ==========================================

inner_r = (coaster_diameter / 2) + tolerance;
outer_r = inner_r + wall_thickness;
// Calculate total height needed plus a 5mm lip at the top
total_height = (coaster_thickness * coaster_count) + 5;

// --- Helper Module for Sharp Crystals ---
module sharp_diamond(h, w, depth) {
    // Rotate to stand up, then extrude a 2D polygon to create a sharp diamond shape
    rotate([90, 0, 90])
    linear_extrude(depth, center=true)
    polygon([
        [0, h/2],  // Top
        [w/2, 0],  // Right
        [0, -h/2], // Bottom
        [-w/2, 0]  // Left
    ]);
}

module ice_pattern() {
    // Settings for the crystal cuts
    d_height = 12; 
    d_width = 14; // Slightly wider for better wrap-around look
    angle_step = 18; // Density of the pattern around the circle
    
    rows = 2; // Will fit nicely in the available height

    // Define how much space to leave clear around the front opening (angle 0)
    front_gap_angle = 70; // 35 degrees on each side
    start_angle = front_gap_angle / 2;
    end_angle = 360 - (front_gap_angle / 2);
    
    // Calculate vertical spacing to center the pattern
    usable_height = total_height - base_thickness;
    z_step = usable_height / (rows + 1);
    z_start = base_thickness + z_step;

    for (r = [0 : rows-1]) {
        // Calculate the shift for this row to create the lattice effect
        row_shift = (r % 2 == 0) ? 0 : (angle_step / 2);
        
        // Loop around the cylinder from start to end angles
        for (a = [start_angle : angle_step : end_angle - 1]) {
             current_angle = a + row_shift;
             
             // Ensure the shifted angle doesn't push into the forbidden end zone
             if (current_angle < end_angle) {
                z_pos = z_start + (r * z_step);
                
                rotate([0, 0, current_angle]) 
                translate([inner_r, 0, z_pos])
                // Push it halfway into the wall to cut through
                translate([wall_thickness/2, 0, 0]) 
                sharp_diamond(d_height, d_width, wall_thickness * 3);
             }
        }
    }
}

module holder_body() {
    difference() {
        // 1. The Main Cup base cylinder
        cylinder(r = outer_r, h = total_height + base_thickness);
        
        // 2. The Hollow Inside
        translate([0, 0, base_thickness])
            cylinder(r = inner_r, h = total_height + base_thickness + 1);
            
        // 3. The Finger Slot (Front)
        // Creates a rounded slot cut out of the front
        translate([outer_r, 0, total_height/2 + base_thickness + 5])
            rotate([0, 90, 0])
            hull() {
                // Top part extending out
                translate([total_height/2, 0, -outer_r])
                    cylinder(d=slot_width, h=outer_r*2);
                // Bottom part stopping near the base
                translate([-(total_height/2) + 2, 0, -outer_r])
                    cylinder(d=slot_width, h=outer_r*2);
            }
            
        // 4. The Wrap-Around Ice Pattern
        ice_pattern();
    }
}

// --- Render ---
holder_body();