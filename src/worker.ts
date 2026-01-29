import { Worker, Job } from 'bullmq';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { connection } from './queue';

const DESIGN_DIR = path.resolve(process.cwd(), 'designs');
const RENDER_DIR = path.resolve(process.cwd(), 'public/renders');
const ASSET_DIR = path.resolve(process.cwd(), 'assets');

// Ensure directories exist
const ensureDirs = async () => {
  await fs.mkdir(RENDER_DIR, { recursive: true });
  await fs.mkdir(ASSET_DIR, { recursive: true });
};
ensureDirs().catch(console.error);

const SLICER_PATH = path.resolve(process.cwd(), 'tools/squashfs-root/AppRun');
const SLICER_CONFIG = path.resolve(process.cwd(), 'tools/config.ini');

interface GCodeResult {
    filename: string;
    metadata: {
        filament_used: string;
        estimated_time: string;
    };
}

const generateGCode = async (stlPath: string, outputName: string, configPath?: string): Promise<GCodeResult> => {
    const outputPath = path.join(RENDER_DIR, outputName);
    const finalConfig = configPath || SLICER_CONFIG;
    
    return new Promise((resolve, reject) => {
        const args = [
            '--export-gcode',
            '--load', finalConfig,
            '-o', outputPath,
            stlPath
        ];
        
        console.log(`Executing Slicer: ${SLICER_PATH} ${args.join(' ')}`);

        const child = spawn(SLICER_PATH, args);
        let stdout = '';
        let stderr = '';

        child.stdout.on('data', d => stdout += d.toString());
        child.stderr.on('data', d => stderr += d.toString());

        child.on('close', async (code) => {
            if (code !== 0) {
                console.error('Slicer failed:', stderr);
                return reject(new Error(`Slicer failed with code ${code}`));
            }

            try {
                const gcodeContent = await fs.readFile(outputPath, 'utf8');
                
                // Parse metadata from G-code comments
                const filamentMatch = gcodeContent.match(/; filament used \[mm\] = ([\d\.]+)/) || gcodeContent.match(/; filament used = ([\d\.]+)/);
                const timeMatch = gcodeContent.match(/; estimated printing time = ([\d\w\s]+)/) || gcodeContent.match(/; estimated printing time \(normal mode\) = ([\d\w\s]+)/);

                resolve({
                    filename: outputName,
                    metadata: {
                        filament_used: filamentMatch ? `${filamentMatch[1]}mm` : 'Unknown',
                        estimated_time: timeMatch ? timeMatch[1].trim() : 'Unknown'
                    }
                });
            } catch (err) {
                console.error('Metadata extraction error:', err);
                // Return result even if metadata extraction fails, but with unknown values
                resolve({
                    filename: outputName,
                    metadata: {
                        filament_used: 'Unknown',
                        estimated_time: 'Unknown'
                    }
                });
            }
        });

        child.on('error', (err) => reject(err));
    });
};

const worker = new Worker('renderQueue', async (job: Job) => {
  const { fileId, scadContent, params = {}, options = {}, type } = job.data;
  
  // options.texture = 'knitted';  // 1. Consolidate Options
  const renderOptions = {
    camera: options.camera || params.camera,
    distance: options.distance || params.distance,
    colorScheme: options.colorScheme || params.colorScheme,
    texture: options.texture || params.texture
  };

  // Determine Input Path
  let originalInputPath: string;
  let isTempInput = false;

  if (scadContent) {
      originalInputPath = path.join(DESIGN_DIR, `temp-input-${job.id}.scad`);
      await fs.writeFile(originalInputPath, scadContent);
      isTempInput = true;
  } else {
      // It could be a SCAD file in DESIGN_DIR or an uploaded file in RENDER_DIR
      const designPath = path.join(DESIGN_DIR, `${fileId}.scad`);
      const renderPath = path.join(RENDER_DIR, fileId);
      
      try {
          await fs.access(designPath);
          originalInputPath = designPath;
      } catch {
          try {
              await fs.access(renderPath);
              originalInputPath = renderPath;
          } catch {
              // Fallback/Default
              originalInputPath = designPath;
          }
      }
  }

  let finalInputPath = originalInputPath;

  // Determine Output
  const isGCode = type === 'gcode';
  
  // If we are slicing an already uploaded file (non-SCAD), we bypass OpenSCAD
  const isDirectSlicing = isGCode && !scadContent && !originalInputPath.endsWith('.scad');
  
  if (isDirectSlicing) {
      const gcodeName = `${path.basename(originalInputPath).split('.')[0]}-${job.id}.gcode`;
      try {
          const gcodeResult = await generateGCode(originalInputPath, gcodeName, options.printerConfig ? await (async () => {
              const p = path.join(DESIGN_DIR, `temp-config-${job.id}.ini`);
              await fs.writeFile(p, options.printerConfig);
              return p;
          })() : undefined);
          return gcodeResult;
      } catch (e) {
          throw new Error(`Slicing failed: ${(e as Error).message}`);
      }
  }

  // If GCode, we first render to STL. The intermediate STL.
  const renderType = isGCode ? 'stl' : (type === 'preview' ? 'png' : (['obj', 'stl', '3mf'].includes(type) ? type : 'stl'));
  
  // For output, if it's SCAD-to-GCode, we produce a temp STL first
  const outputFilename = `job-${job.id}.${renderType}`;
  const outputPath = path.join(RENDER_DIR, outputFilename);

  // Track temp file for cleanup
  let tempWrapperPath: string | null = null;
  let tempConfigPath: string | null = null;

  try {
    // =========================================================
    // WRAPPER GENERATION
    // =========================================================
    // ... (texture logic remains the same)
    
    // Handle Custom Printer Config
    if (options.printerConfig) {
        tempConfigPath = path.join(DESIGN_DIR, `temp-config-${job.id}.ini`);
        await fs.writeFile(tempConfigPath, options.printerConfig);
    }
    
    // ... (wrapper generation code) ...

    // Construct Args
    const args: string[] = [
      '-o', outputPath,
      '--backend=manifold',
    ];

    if (type === 'preview') {
      args.push('--imgsize=800,600');
      // ... camera logic ...
      const CAMERA_PRESETS: Record<string, string> = {
        'top': '0,0,0,0,0,0',
        'bottom': '0,0,0,180,0,0',
        'front': '0,0,0,90,0,0',
        'back': '0,0,0,270,0,0',
        'left': '0,0,0,90,0,90',
        'right': '0,0,0,90,0,270',
        'iso': '0,0,0,60,0,45'
      };

      if (renderOptions.camera) {
        const preset = CAMERA_PRESETS[renderOptions.camera.toLowerCase()];
        const distance = renderOptions.distance || 500;
        if (preset) args.push(`--camera=${preset},${distance}`);
        else args.push(`--camera=${renderOptions.camera}`);
      } else {
        args.push('--autocenter');
        args.push('--viewall');
      }

      if (renderOptions.colorScheme) args.push(`--colorscheme=${renderOptions.colorScheme}`);
      else args.push('--colorscheme=Tomorrow Night');
    } else {
        // For 3D exports (STL/OBJ), ensure color is preserved if possible
        // OpenSCAD OBJ export includes materials by default
    }

    // Inject Variables
    // ...

    const SYSTEM_KEYS = ['camera', 'distance', 'colorScheme', 'renderSettings', 'texture'];
    Object.entries(params).forEach(([key, value]) => {
      if (value === null || value === undefined) return;
      if (SYSTEM_KEYS.includes(key)) return;

      let scadValue: string;
      if (typeof value === 'boolean' || typeof value === 'number') {
        scadValue = value.toString();
      } else if (typeof value === 'string') {
        scadValue = `"${value.replace(/"/g, '\\"')}"`;
      } else if (Array.isArray(value)) {
        scadValue = JSON.stringify(value);
      } else {
        return;
      }

      args.push('-D');
      args.push(`${key}=${scadValue}`);
    });

    args.push(finalInputPath);

    console.log(`[Job ${job.id}] Executing OpenSCAD...`);

    // WRAPPER CLEANUP HELPER
    const cleanup = async () => {
      if (tempWrapperPath) {
        try {
          await fs.unlink(tempWrapperPath);
        } catch (e) {}
      }
      if (tempConfigPath) {
          try {
              await fs.unlink(tempConfigPath);
          } catch(e) {}
      }
      if (isTempInput) {
          try {
              await fs.unlink(originalInputPath);
          } catch(e) {}
      }
    };

    return new Promise((resolve, reject) => {
      const child = spawn('openscad', args);
      let stderrData = '';

      child.stderr.on('data', (data) => stderrData += data.toString());

      child.on('close', async (code, signal) => {
        await cleanup();

        if (code === 0) {
          try {
              await fs.access(outputPath);
              
              if (isGCode) {
                  const gcodeName = `render-${job.id}.gcode`;
                  try {
                      // Pass tempConfigPath (or undefined)
                      const gcodeResult = await generateGCode(outputPath, gcodeName, tempConfigPath || undefined);
                      // Cleanup intermediate STL
                      await fs.unlink(outputPath).catch(() => {}); 
                      resolve(gcodeResult);
                  } catch (e) {
                      reject(new Error(`GCode generation failed: ${(e as Error).message}`));
                  }
              } else {
                  resolve({ filename: outputFilename });
              }
          } catch (e) {
              reject(new Error('OpenSCAD exited with 0 but file not found.'));
          }
        } else {
          // [NEW] Better Error Handling for Crashes
          const errorType = (signal === 'SIGKILL') ? 'Memory Limit Exceeded (OOM)' :
            (signal === 'SIGTERM') ? 'Process Terminated' :
              `Exit Code ${code}`;

          console.error(`[Job ${job.id}] OpenSCAD Crashed: ${errorType}`);
          console.error(`[Job ${job.id}] Stderr:`, stderrData);

          reject(new Error(`OpenSCAD failed: ${errorType}`));
        }
      });

      child.on('error', async (err) => {
        await cleanup();
        console.error(`[Job ${job.id}] Spawn Error:`, err);
        reject(new Error('Failed to spawn OpenSCAD.'));
      });
    });

  } catch (err) {
    // Fallback cleanup if something failed before spawn
    if (tempWrapperPath) await fs.unlink(tempWrapperPath).catch(() => { });
    if (isTempInput) await fs.unlink(originalInputPath).catch(() => { });
    throw err;
  }
}, {
  connection,
  concurrency: 2,
  limiter: {
      max: 5,
      duration: 1000
  }
});

export default worker;