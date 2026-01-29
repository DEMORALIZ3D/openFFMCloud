// --- Customizer Variables ---

// Change seed for totally new flakes
seed = 135; 

// Total diameter in mm (Recommended: 90mm for Ornament, 100mm for Coaster)
diameter = 100; 

// Thickness in mm (Recommended: 2.4mm for Ornament, 3-4mm for Coaster)
thickness = 4;

// Set to true for a hanging ornament, false for a coaster
add_loop = false; 

/* [Render Settings] */
$fn = 100; 

// --- Calculations ---
radius = diameter / 2;
ring_thick = 3;
max_grow_radius = radius - ring_thick - 1; 

// --- DNA & Randomization ---
dna = rands(0, 100, 10, seed);

// 1. Branch Count: Range 3 to 8
branch_count = floor(map(dna[0], 0, 100, 3, 9)); 

// 2. Fatness: 0.8 to 2.0 (Drastic thickness changes)
fat_factor = map(dna[1], 0, 100, 0.8, 2.0);

// 3. Shape Profile: Determines how branch length changes
// 0-33: Triangle (Classic), 33-66: Parallel (Comb), 66-100: Diamond
profile_type = dna[2]; 

// 4. Position Shift: Does the pattern start near center or further out?
start_pos_jitter = map(dna[3], 0, 100, 0.15, 0.35);


// --- Helper Functions ---
function map(val, in_min, in_max, out_min, out_max) = 
    (val - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;

// --- Modules ---

module ice_finger(len, base_diam, tip_diam) {
    hull() {
        translate([-base_diam/3, 0, 0])
            circle(d = base_diam);
        translate([len - tip_diam/2, 0, 0])
            circle(d = tip_diam);
    }
}

module main_arm() {
    // Main Spine
    base_w = 3.0 * fat_factor;
    tip_w = 1.2 * fat_factor;
    ice_finger(max_grow_radius, base_w, tip_w);
    
    // Sub-Branches
    // Calculate effective space
    start_pct = start_pos_jitter; 
    end_pct = 0.85;
    total_len = max_grow_radius * (end_pct - start_pct);
    step = total_len / (branch_count > 1 ? branch_count - 1 : 1);
    
    for(i = [0 : branch_count-1]) {
        // Linear position calculation
        current_pos = (max_grow_radius * start_pct) + (i * step);
        
        // Calculate "Remaining Space" to the ring
        dist_to_edge = max_grow_radius - current_pos;
        
        // --- SHAPE PROFILE LOGIC ---
        // We determine length multiplier based on where we are (i / total)
        progress = i / (branch_count - 1);
        
        // Default max length
        max_possible = dist_to_edge * 0.9;
        
        // Apply Profile
        profile_mult = 
            (profile_type < 33) ? 1.0 : // Triangle (Natural limit applies)
            (profile_type < 66) ? (0.5 + (0.5 * (1-progress))) : // Tapered Comb
            (sin(progress * 180)); // Diamond (Sine wave)

        // Final Length Calculation
        sub_len = max_possible * ((profile_type > 66) ? profile_mult : 1.0);
        
        // Prevent tiny stubs
        final_len = max(sub_len, 4);

        // Widths
        sub_base_w = base_w * 0.65;
        sub_tip_w = tip_w * 0.65;

        // Only render if it fits
        if (final_len > 3 && current_pos < max_grow_radius - 2) {
            translate([current_pos, 0, 0]) {
                rotate([0,0,60]) ice_finger(final_len, sub_base_w, sub_tip_w);
                rotate([0,0,-60]) ice_finger(final_len, sub_base_w, sub_tip_w);
            }
        }
    }
}


module full_assembly() {
    // Center Hub
    circle(d = 4.5 * fat_factor);
    
    // 6 Arms
    for (k = [0 : 60 : 359]) {
        rotate([0, 0, k])
            main_arm();
    }
        
    // Ring
    difference() {
        circle(r = radius);
        circle(r = radius - ring_thick);
    }
    
    // Hoop (Conditional)
    if (add_loop) {
        hoop_outer = 6;
        hoop_inner = 3;
        translate([0, radius - (ring_thick/2), 0])
            difference() {
                circle(r = hoop_outer);
                circle(r = hoop_inner);
                translate([-hoop_outer, -hoop_outer*2]) 
                    square([hoop_outer*2, hoop_outer*2]);
            }
    }
        
    // Safety Bridges
    for (k = [0 : 60 : 359]) {
       rotate([0,0,k])
       translate([max_grow_radius - 1, -0.4])
       hull() {
           circle(d=1);
           translate([ring_thick+1.5,0]) circle(d=1);
       }
    }
}

// --- Render ---
linear_extrude(thickness) {
    full_assembly();
}