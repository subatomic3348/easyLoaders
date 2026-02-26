const {spawn} = require('node:child_process')

async function extractor(url,args){
    let stream="";
    let killTimeout
    return new Promise((resolve,reject)=>{
        console.log('process starting');
         let settled = false
        const videoProcess = spawn('yt-dlp',args)
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
module.exports = extractor