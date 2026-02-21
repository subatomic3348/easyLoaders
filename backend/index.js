const express = require('express')
const app = express()
app.use(express.json())
const {spawn} = require('node:child_process')

app.use('/files',express.static('downloads'))
const fs = require('fs')



app.post("/api/v1/extract",async(req,res)=>{
    const url =  req.body.url

    const validUrl = new URL(url) 
    if(!validUrl){
        return res.status(400).json({
            message:"invalid url"
        })
    }
    const platform = returnPlatform(validUrl.hostname)

     if(platform=='unsupported'){
         res.status(400).json({
            message:"we dont supported this website"
        })
        return
      }
    try{
         const mocktest =  await mockRegistry[platform](url)
        return  res.json({
            test:mocktest
        })
    }
    catch(e){
        console.log(e);
        return res.status(500).json({
            message:'error while running the process'
        })
    }
   
    

})

function returnPlatform(hostname) {
  let platform = "";
   const host = hostname.toLowerCase()
    if(host=='youtu.be'){
        platform = 'youtube'
        return platform
    }
   const map = new Map()
  map.set('youtube','youtube.com')
  map.set('facebook','facebook.com')
  map.set('instagram','instagram.com')
  map.set('twitter','x.com')
  

   for(const [key,values] of map){
    if(values===host){
        platform = key
        return platform
    }
    
    else if(host.endsWith('.'+values)){
        platform = key
        return platform
        
    }
    
   }
   if(platform==""){
    return 'unsupported'
   }
}

async function YotubeExtractor(url){
    let stream="";
    let killTimeout
    return new Promise((resolve,reject)=>{
        console.log('process starting');
         let settled = false
        const videoProcess = spawn('yt-dlp',['-J','--force-ipv4',url])
        const timeout = setTimeout(()=>{
            if(settled) return
            settled = true
            videoProcess.kill('SIGTERM')

            reject(new Error("Timeout"))
            killTimeout = setTimeout(()=>{
                videoProcess.kill('SIGKILL')
                //gracefull Shutdown
            },5000)
        }, 60000)
        
        
        videoProcess.stdout.on('data',(data)=>{
            stream+=data.toString()
            console.log('hi from inside data add o');
            
        })
        videoProcess.on('close',(code)=>{  
           if(settled) return
           settled = true
           clearTimeout(timeout)
           clearTimeout(killTimeout)
            if(code!=0){
                reject(new Error('yt-dlp failed'))
                return
            }
            
            
            const output = JSON.parse(stream)
        
            
           
            
        
            
            const cleanFormat = output.formats.filter(f=>{
                return (
                    f.vcodec!=='none'&&
                    f.ext==='mp4'&&
                    !f.format_id.startsWith('sb')&&
                    f.url&&
                    f.fps&&
                    f.vcodec&&
                    f.acodec
                   
                )
            })
        
         
        
         
            const finalFormats = cleanFormat.map(f=>({
                id:f.format_id,
                quality:`${f.height}p`,
                mime:  `video/${f.ext}`,
                url:f.url,
                fps:f.fps,
                vcodec:f.vcodec,
                acodec:f.acodec,
                

            }))
            const AVC=1,VP9 =2,AV1=3
            for(let i =0;i<finalFormats.length;i++){
                const codec = finalFormats[i].vcodec
                if(codec.startsWith('vp')){
                    finalFormats[i].codecRank = VP9
                }
                else if(codec.startsWith('avc')){
                    finalFormats[i].codecRank = AVC
                }
                else if(codec.startsWith('av1')){
                    finalFormats[i].codecRank = AV1
                }
            }

            
            
           
            
            finalFormats.sort((a,b)=>{
                return parseInt(a.quality)-parseInt(b.quality)
            })
           
          const grp = groupFormats(finalFormats)

         const contractFormat = pickBest(grp)

           
           
           
           
           
           
            const contract = {
                platform:"youtube",
                title: output.title,
                formats:contractFormat
                
                
            }
           
          resolve(contract)
            console.log(`child process exited with code ${code} `);
            
        })
       videoProcess.stderr.on('data', (data) => {
  console.error('yt-dlp stderr:', data.toString())
})

    })
 
}
const mockRegistry = {
    'youtube': YotubeExtractor,    
}


app.post('/api/v1/download',async(req,res)=>{
    
    let output="";
    const url = req.body.url
     const formatId = req.body.id
    if(!url){
        return res.status(400).json({
            message:'url is required'
        })
    }
    const args = [
         '-f' , `${formatId}+ba/b`,
         
          '-o', 'downloads/%(title)s_%(format_id)s.%(ext)s',
         '--ffmpeg-location',
         '/usr/bin/ffmpeg',
          url
    ]
    const process = spawn('yt-dlp',args)
    process.stdout.on('data',(data)=>{
        output += data.toString()
    
        
        
        console.log(`stdout: ${data}`);
        
    })
    process.stderr.on('data',(data)=>{
        console.log(`stderr:${data.toString()}`);
        
    })
    process.on('close',async(code)=>{
        if(code!==0){
            return res.status(500).json({
                message:'download failed'
            })
        }
        console.log(output);
        
    const fileName = extractFileName(output)
    const stat = await fs.promises.stat(`downloads/${fileName}`)
    const fileSize = stat.size
    const TTL = 3
    setTimeout(()=>{
        fs.unlink(`downloads/${fileName}`,(err)=>{
            if(err){
                console.log(err);
                
                console.log("there is error file couldnot be deleted");
                
            }
            else{
                console.log(`deleted file is ${fileName}`);
                
            }
        })
    },TTL*60000)
  let date = new Date()
  date.setMinutes(date.getMinutes()+TTL)
  date = date.toString()
  


    const endCodedName = encodeURIComponent(fileName)
   
   
     

        
        
         
        const videoContract = {
            status:"ready",
            file:{
                "name":fileName,
                "size":`${(fileSize/1000000)}MB`,
                "expireAt": date,
                "url":`http://localhost:3000/files/${endCodedName}`


            }
        }
    
        res.json(
            videoContract
        )
        
    })

})

function extractFileName(data){
    const marker = `[Merger] Merging formats into "downloads/`
    const index = data.indexOf(marker)
    if(index==-1){
        return null
    }
    const start = index+marker.length
    const rest = data.slice(start)
    const lastIndex = rest.search(/[\n"]/)
   
    if(lastIndex==-1){
        return rest.trim()
    }
    const prevAns =  rest.slice(0,lastIndex)
    const Ans = prevAns.trim()
    return Ans


}
 function groupFormats(finalFormats){
            const groups = {}
            for(const format of finalFormats){
                const quality = format.quality
                if(!groups[quality]){
                    groups[quality] = []
                }
                groups[quality].push(format)
            }
            return groups
           }


function pickBest(groups){
    const result = []
    for(const quality  in groups){
        const candidate = groups[quality]
        let best = candidate[0]
        for(const c of candidate){  // --> diff in for in and for of loops in js ?? 
            if(isBetter(c,best)){
                best = c
            }
        }
         result.push(best)
    }
    return result
   

    
}
function isBetter(a,b){
    const Afps = a.fps || 0
    const Bfps = b.fps || 0
    if(Afps>Bfps){
       return true
    }
    else if(Afps==Bfps){
        if(a.codecRank>b.codecRank){
            return true
        }
        
    }
    return false
    
}


app.listen(3000,()=>{
    console.log("app is listening on port 3000");
    
})
