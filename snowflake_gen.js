const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');

const execPromise = util.promisify(exec);

// =================CONFIG=================
// Your specific OpenSCAD path
const OPENSCAD_PATH = '"C:\\Program Files\\OpenSCAD (Nightly)\\openscad.exe"';

// The V5 Snowflake file
const SCAD_FILE = 'snowflake.scad'; 

// Where to save files
const OUTPUT_DIR = './snowflake_output/coaster';

// How many unique flakes to generate
const BATCH_SIZE = 15;

// SETTINGS
const SKIP_EXISTING = true; 
const GENERATE_PNG = true; // Set to true to create a thumbnail for each!

// Use Manifold for speed (OpenSCAD 2024+)
const RENDER_FLAGS = "--backend manifold"; 
// ========================================

// --- SETUP ---
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

// --- GENERATOR ---
async function generateSnowflakes() {

    console.log('------------------------------------------------');
    console.log(`❄️  Generating ${BATCH_SIZE} Snowflakes...`);
    console.log(`⏩ Skip Existing: ${SKIP_EXISTING}`);
    console.log(`🚀 Renderer: ${RENDER_FLAGS}`);
    console.log('------------------------------------------------');

    for (let i = 1; i <= BATCH_SIZE; i++) {
        
        // 1. Generate a random seed
        const seed = Math.floor(Math.random() * 100000);
        
        // 2. Define filenames
        const baseName = `snowflake_${String(i).padStart(2, '0')}_seed_${seed}`;
        const stlPath = path.join(OUTPUT_DIR, `${baseName}.stl`);
        const pngPath = path.join(OUTPUT_DIR, `${baseName}.png`);

        // --- RESUME LOGIC ---
        if (SKIP_EXISTING && fs.existsSync(stlPath)) {
            console.log(`⏭️  Skipped: ${baseName} (File exists)`);
            continue; 
        }

        // 3. Construct Command
        // We use -D to inject the seed and options directly
        const vars = `-D "seed=${seed}" -D "add_ring=true" -D "add_loop=false"`;
        
        // Command for STL
        const cmdSTL = `${OPENSCAD_PATH} -o "${stlPath}" ${RENDER_FLAGS} ${vars} --export-format binstl "${SCAD_FILE}"`;
        
        // Command for PNG (Optional but great for selling)
        // We set --colorscheme to 'Tomorrow Night' or 'Cornfield' for nice contrast
        const cmdPNG = `${OPENSCAD_PATH} -o "${pngPath}" --colorscheme "Tomorrow Night" --imgsize=1000,1000 --viewall --autocenter ${vars} "${SCAD_FILE}"`;

        process.stdout.write(`Rendering [${i}/${BATCH_SIZE}] Seed ${seed}... `);
        
        try {
            // Run STL Generation
            await execPromise(cmdSTL); 
            
            // Run PNG Generation (if enabled)
            if (GENERATE_PNG) {
                await execPromise(cmdPNG);
            }
            
            console.log(`✅ Done.`);
        } catch (error) {
            console.log(`❌ Failed.`);
            if(error.stderr) console.error(`   OpenSCAD Error: ${error.stderr.trim()}`);
            else console.error(error.message);
        }
    }

    console.log('------------------------------------------------');
    console.log('🎉 Winter Batch job finished!');
}

generateSnowflakes();