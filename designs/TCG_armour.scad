// ==========================================
// TCG VAULT - HYBRID EDITION (Modern Look / Classic Feel)
// ==========================================

/* [Global Print Settings] */
part = "frame"; // [preview_all:Assembly Preview, frame:Frame, cap:Cap, stand:Display Stand]

/* [Display Stand Design] */
stand_style = "stadium"; // [terrain:Low Poly Landscape, low_poly:Geometric, stadium:Stadium Oval, basic:Basic Block]
stand_tilt_angle = 15; // [0:30]
stand_slots = 1; 
stand_spacing = 15; 
// Controls rock density (0-100)
terrain_density = 60; 
terrain_seed = 42;

/* [Mechanics - RESTORED FROM OLD VERSION] */
// The "Good" Snap feel
snap_tension = 0.30; 
// The "Good" Stand fit (Tighter than previous)
stand_slot_tolerance = 0.5; 
// Standard fit for the lid
cap_tolerance = 0.20; 

/* [Lid Mechanics - IMPROVED] */
enable_cap_snap = true; 
// Increased to 0.5mm for much stronger grip
cap_snap_tension = 0.5; 

/* [Structural Settings] */
// INCREASED: 4.0mm walls prevent the "Explosion" issue
wall = 4.0; 
slab_thickness = 7.5;
bottom_base_h = 12.0; 
// Keeping the shorter aesthetic (8mm)
top_clearance = 12; 

// Maximize this for strength (Larger fillet = less snapping)
window_corner_radius = 5.0;
external_corner_radius = 4.0; 

/* [Card Dimensions] */
sleeve_w = 67.5; 
sleeve_h = 92.0; 
sleeve_slot = 1.7; 
internal_padding = 1.0;

/* [Hidden] */
$fn = 60;
side_bezel = 3; 
bottom_bezel = 1.5; 

// Auto-Calculations
total_internal_h = sleeve_h + internal_padding + top_clearance;
total_h = bottom_base_h + total_internal_h + wall; 
total_w = sleeve_w + (wall * 2);
total_d = slab_thickness;

lock_zone_h = 12; 
cap_wall_target = 1.8;
rail_indent = cap_wall_target + 0.20;
rail_y_start = -wall + rail_indent;
rail_depth_len = total_d - (2 * rail_indent);
slot_z = bottom_base_h + wall;

// ==========================================
// MODULES
// ==========================================

module slab_frame() {
    union() {
        difference() {
            // 1. MAIN BODY (Rounded)
            hull() {
                translate([-wall + external_corner_radius, -wall, external_corner_radius]) 
                    rotate([-90,0,0]) cylinder(r=external_corner_radius, h=total_d);
                translate([total_w - wall - external_corner_radius, -wall, external_corner_radius]) 
                    rotate([-90,0,0]) cylinder(r=external_corner_radius, h=total_d);
                translate([-wall, -wall, total_h - lock_zone_h - 5])
                    cube([total_w, total_d, lock_zone_h + 5]);
            }
            // 2. SLOT
            translate([0, (total_d/2) - (sleeve_slot/2) - wall, slot_z]) 
                cube([sleeve_w, sleeve_slot, total_h]); 
            // 3. WINDOW (Rounded for Strength)
            translate([side_bezel, -5, slot_z + bottom_bezel]) {
                rounded_window_cutout(w = sleeve_w - (side_bezel*2), d = total_d + 10, h = sleeve_h - (side_bezel + bottom_bezel), r = window_corner_radius);
            }
            // 4. TOP RAILS
            translate([-wall - 0.1, -wall - 0.1, total_h - lock_zone_h]) cube([rail_indent + 0.1, total_d + 0.2, lock_zone_h + 5]);
            translate([total_w - wall - rail_indent, -wall - 0.1, total_h - lock_zone_h]) cube([rail_indent + 0.1, total_d + 0.2, lock_zone_h + 5]);
            translate([-wall, -wall - 0.1, total_h - lock_zone_h]) cube([total_w, rail_indent + 0.1, lock_zone_h + 5]); 
            translate([-wall, total_d - wall - rail_indent, total_h - lock_zone_h]) cube([total_w, rail_indent + 0.1, lock_zone_h + 5]); 
            // 5. CHAMFERS
            translate([-wall + rail_indent, rail_y_start - 1, total_h]) chamfer_wedge("left", rail_depth_len + 2);
            translate([total_w - wall - rail_indent, rail_y_start - 1, total_h]) chamfer_wedge("right", rail_depth_len + 2);
            // 6. DETENT GROOVE
            translate([(total_w / 2) - wall, -wall, bottom_base_h / 2]) 
                rotate([0, 90, 0]) cylinder(h=total_w + 20, r=snap_tension + 0.3, center=true, $fn=30);
            translate([(total_w / 2) - wall, total_d - wall, bottom_base_h / 2]) 
                rotate([0, 90, 0]) cylinder(h=total_w + 20, r=snap_tension + 0.3, center=true, $fn=30);
        }
        // 7. FILLETS (Anti-Snap)
        translate([-wall + rail_indent, rail_y_start, total_h - lock_zone_h]) rotate([0, 45, 0]) cube([2, rail_depth_len, 2]);
        translate([total_w - wall - rail_indent, rail_y_start, total_h - lock_zone_h]) mirror([1,0,0]) rotate([0, 45, 0]) cube([2, rail_depth_len, 2]);
        
        // 8. CAP SNAP BUMPS (Aligned)
        if (enable_cap_snap) {
            y_center = (total_d / 2) - wall;
            // Left Bump
            translate([-wall + rail_indent, y_center, total_h - (lock_zone_h/2)])
                resize([cap_snap_tension*2, 4, 6]) sphere(r=1);
            // Right Bump
            translate([total_w - wall - rail_indent, y_center, total_h - (lock_zone_h/2)])
                resize([cap_snap_tension*2, 4, 6]) sphere(r=1);
        }
    }
}

module enclosed_cap() {
    cap_ext_w = total_w; cap_ext_d = total_d; cap_h = lock_zone_h + 2.5; 
    hole_w = total_w - (cap_wall_target * 2); hole_d = total_d - (cap_wall_target * 2);
    difference() {
        hull() {
            translate([-wall, -wall, 0]) cube([cap_ext_w, cap_ext_d, 2]); 
            translate([-wall + external_corner_radius, -wall, cap_h - external_corner_radius]) 
                rotate([-90,0,0]) cylinder(r=external_corner_radius, h=cap_ext_d);
            translate([cap_ext_w - wall - external_corner_radius, -wall, cap_h - external_corner_radius]) 
                rotate([-90,0,0]) cylinder(r=external_corner_radius, h=cap_ext_d);
        }
        translate([-wall + cap_wall_target, -wall + cap_wall_target, -1]) 
            cube([hole_w, hole_d, lock_zone_h + 1]);
            
        // CAP SNAP DIVOTS
        if (enable_cap_snap) {
            y_center = (total_d / 2) - wall;
            translate([-wall + cap_wall_target, y_center, lock_zone_h/2])
                 resize([cap_snap_tension*2, 4, 6]) sphere(r=1);
            translate([cap_ext_w - wall - cap_wall_target, y_center, lock_zone_h/2])
                 resize([cap_snap_tension*2, 4, 6]) sphere(r=1);
        }
    }
}

module display_stand() {
    slot_w = total_w + stand_slot_tolerance;
    slot_d = total_d + stand_slot_tolerance;
    
    // TILT & DEPTH LOGIC
    base_add = (stand_tilt_angle * 1.2); 
    stand_base_depth = 60 + base_add; 
    stand_top_depth = slot_d + 15; 
    
    // Height matched to frame base
    stand_height = 16; 
    
    total_stand_w = (slot_w * stand_slots) + (stand_spacing * (stand_slots + 1));
    bump_z = (bottom_base_h / 2); 
    floor_thick = 4;
    finger_hole_r = 8;
    peaks_per_bank = round((total_stand_w / 3.5) * (terrain_density / 50)); 
    safe_zone_y = (stand_top_depth / 2) + 2; 

    difference() { 
        union() { 
            difference() { 
                union() { 
                    // A. Stand Body & Terrain
                    if (stand_style == "terrain") {
                        translate([0, -stand_base_depth/2, 0]) cube([total_stand_w, stand_base_depth, stand_height]);
                    } else if (stand_style == "low_poly") {
                        hull() {
                            translate([0, -(stand_base_depth - stand_top_depth)/2, 0]) cube([total_stand_w, stand_base_depth, 1]);
                            translate([5, 0, stand_height - 1]) cube([total_stand_w - 10, stand_top_depth, 1]);
                        }
                    } else if (stand_style == "stadium") {
                        hull() {
                             translate([stand_base_depth/2, 0, 0]) cylinder(h=stand_height, r=stand_base_depth/2);
                             translate([total_stand_w - stand_base_depth/2, 0, 0]) cylinder(h=stand_height, r=stand_base_depth/2);
                        }
                    } else {
                         translate([0, -(stand_base_depth - stand_top_depth)/2, 0]) cube([total_stand_w, stand_base_depth, stand_height]);
                    }
                    if (stand_style == "terrain" && terrain_density > 0) {
                        generate_terrain_strip(terrain_seed, total_stand_w, -stand_base_depth/2, -safe_zone_y, peaks_per_bank);
                        generate_terrain_strip(terrain_seed + 100, total_stand_w, safe_zone_y, stand_base_depth/2, peaks_per_bank);
                    }
                }
                
                // B. The GUILLOTINE Slot Cut (Cuts Rocks & Body)
                for(i=[0:stand_slots-1]) {
                    translate([stand_spacing + (i * (slot_w + stand_spacing)), (stand_top_depth - slot_d) / 2, floor_thick]) {
                        translate([slot_w/2, slot_d/2, 0]) 
                        rotate([stand_tilt_angle, 0, 0]) 
                        translate([-slot_w/2, -slot_d/2, 0]) 
                        cube([slot_w, slot_d, stand_height + 50]); 
                    }
                }
            }

            // C. Add Bumps Back In
            for(i=[0:stand_slots-1]) {
                translate([stand_spacing + (i * (slot_w + stand_spacing)), (stand_top_depth - slot_d) / 2, floor_thick]) {
                    translate([slot_w/2, slot_d/2, 0]) 
                    rotate([stand_tilt_angle, 0, 0]) 
                    translate([-slot_w/2, -slot_d/2, 0]) 
                    translate([slot_w / 2, 0, bump_z]) {
                        translate([0, 0, 0]) resize([slot_w - 4, snap_tension * 2, snap_tension * 4]) sphere(r=1); 
                        translate([0, slot_d, 0]) resize([slot_w - 4, snap_tension * 2, snap_tension * 4]) sphere(r=1); 
                    }
                }
            }
        }
        
        // D. Finger Holes (Drills through everything)
        for(i=[0:stand_slots-1]) {
            translate([stand_spacing + (i * (slot_w + stand_spacing)), (stand_top_depth - slot_d) / 2, floor_thick]) {
                 translate([slot_w/2, slot_d/2, 0]) 
                 rotate([stand_tilt_angle, 0, 0]) 
                 translate([-slot_w/2, -slot_d/2, 0]) 
                 translate([slot_w/2, slot_d/2, -10]) cylinder(h=100, r=finger_hole_r); 
            }
        }
    }
}

module generate_terrain_strip(seed, width_max, depth_start, depth_end, count) {
    rx = rands(0, width_max, count, seed);
    ry = rands(depth_start, depth_end, count, seed+1); 
    rz_rot = rands(0, 360, count, seed+2);
    r_scale_xy = rands(1.5, 4.0, count, seed+3); 
    r_scale_z = rands(1.0, 5.0, count, seed+4);
    r_fn = rands(5, 7, count, seed+5); 
    for(k=[0:count-1]) {
        translate([rx[k], ry[k], 2]) rotate([0, 0, rz_rot[k]]) scale([r_scale_xy[k], r_scale_xy[k], r_scale_z[k]]) cylinder(h=10, r1=5, r2=2, $fn=round(r_fn[k]));
    }
}

module rounded_window_cutout(w, d, h, r) {
    hull() {
        translate([r, 0, r]) rotate([-90,0,0]) cylinder(r=r, h=d);
        translate([w-r, 0, r]) rotate([-90,0,0]) cylinder(r=r, h=d);
        translate([r, 0, h-r]) rotate([-90,0,0]) cylinder(r=r, h=d);
        translate([w-r, 0, h-r]) rotate([-90,0,0]) cylinder(r=r, h=d);
    }
}

module chamfer_wedge(side, length) {
    size = 10;
    if (side == "left") { rotate([0, 45, 0]) translate([-size, 0, 0]) cube([size, length, size]); } 
    else { rotate([0, -45, 0]) cube([size, length, size]); }
}

if (part == "frame") {
    slab_frame();
} else if (part == "cap") {
    rotate([180, 0, 0]) enclosed_cap();
} else if (part == "stand") {
    display_stand();
} else if (part == "preview_all") {
    translate([0, 0, 4]) 
    rotate([stand_tilt_angle, 0, 0]) {
        color("DimGray") slab_frame();
        color("Gold") translate([0, 0, total_h - lock_zone_h]) enclosed_cap();
    }
    color("Cyan") translate([-stand_spacing, -(60 + (stand_tilt_angle * 1.2) - 5), -20]) display_stand();
}