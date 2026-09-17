import { defineConfig } from 'vite';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

export default defineConfig({
  plugins: [{
    name: 'local-trailer-export',
    configureServer(server) {
      server.middlewares.use('/__trailer-export', (req, res, next) => {
        if (req.method !== 'POST') return next();
        if (req.headers['x-backbone-export'] !== '1') { res.statusCode=403;res.end();return; }
        const chunks=[];let size=0;
        req.on('data', chunk=>{size+=chunk.length;if(size>100*1024*1024)req.destroy();else chunks.push(chunk);});
        req.on('end',async()=>{
          try {
            const folder=path.resolve('artifacts');await mkdir(folder,{recursive:true});
            const extension=req.headers['content-type']?.startsWith('video/mp4')?'mp4':'webm';
            await writeFile(path.join(folder,`backbone-rally-trailer.${extension}`),Buffer.concat(chunks));
            res.setHeader('Content-Type','application/json');res.end(JSON.stringify({file:`artifacts/backbone-rally-trailer.${extension}`}));
          } catch {res.statusCode=500;res.end('Export failed');}
        });
      });
    }
  }]
});
