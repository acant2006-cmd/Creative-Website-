import { defineConfig } from 'vite';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
export default defineConfig({base: './', build: {chunkSizeWarningLimit: 900,rollupOptions:{input:{studio:'index.html',viewer:'viewer.html'}}},plugins:[{
  name:'local-handoff-artifact',
  configureServer(server){server.middlewares.use('/__local_handoff',async(req,res)=>{
    if(req.method!=='POST'){res.statusCode=405;return res.end()}
    const chunks=[];let size=0;try{for await(const chunk of req){size+=chunk.length;if(size>100*1024*1024)throw Error('Handoff is too large');chunks.push(chunk)}
      const dir=path.resolve('confirmed');await mkdir(dir,{recursive:true});await writeFile(path.join(dir,'Venture_3D_Confirmed_Handoff.zip'),Buffer.concat(chunks));res.end('Saved');
    }catch(e){res.statusCode=500;res.end(e.message)}
  })}
}]} );
